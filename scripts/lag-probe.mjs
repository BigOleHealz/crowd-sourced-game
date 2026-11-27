// A real WebSocket/prediction probe; no GPU claims. See docs/movement-lag.md.
import WebSocket from 'ws';
import {inflateSync} from 'node:zlib';
import {writeFile} from 'node:fs/promises';
import {get} from 'node:http';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {stepPlayer}=await import('../public/world.js');
const {driverPrediction}=await import('../public/driver-prediction.js');
const url=process.env.LAG_URL??'ws://127.0.0.1:4187/world';
for(let attempt=0;;attempt++){
  const ready=await new Promise(resolve=>{const request=get(url.replace(/^ws/,'http').replace(/\/world.*$/,'/'),response=>{response.resume();resolve(response.statusCode===200);});request.setTimeout(2000,()=>request.destroy());request.on('error',()=>resolve(false));});
  if(ready)break;
  if(attempt>=480)throw new Error('Local game did not start within 120 seconds');
  await new Promise(r=>setTimeout(r,250));
}
const duration=Number(process.env.LAG_SECONDS??30)*1000;
const fire=process.env.LAG_FIRE==='1';
const rows=[],peers=[];const start=performance.now();
const pose=p=>p && {x:p.x,y:p.y,z:p.z};
const latency=Number(process.env.LAG_DELAY_MS??0),jitter=Number(process.env.LAG_JITTER_MS??0);
async function join(gunner=false){
  return new Promise((resolve,reject)=>{
    const g={ws:new WebSocket(url),seq:0,pending:[],gunner,last:performance.now()};peers.push(g);
    g.ws.on('error',reject);
    g.ws.on('open',()=>{g.ws.send(JSON.stringify({type:'diagnostics',enabled:true}));if(process.env.LAG_PACKED==='1')g.ws.send(JSON.stringify({type:'snapshotEncoding',encoding:'deflate'}));});
    let deliveryAt=0;
    g.ws.on('message',(raw,binary)=>{
      const now=performance.now();
      deliveryAt=Math.max(deliveryAt,now+latency+jitter*(.5+.5*Math.sin(now*.007)));
      setTimeout(()=>receive(raw,binary),Math.max(0,deliveryAt-now));
    });
    function receive(raw,binary){
      const now=performance.now(),m=JSON.parse(binary?inflateSync(raw):raw);
      if(m.type==='welcome'){g.id=m.id;g.self=m.state;g.world=m.world;resolve(g);}
      if(m.type==='diagnostics')rows.push({at:now-start,type:'server',gunner,...m});
      if(m.type==='diagnosticPong')rows.push({at:now-start,type:'rtt',ms:now-m.at,tick:m.tick});
      if(m.type!=='snapshot')return;
      const a=m.players.find(p=>p.id===g.id);if(!a)return;
      const before=pose(g.driver?.pose(1)??g.self);
      const oldPending=g.pending.length;
      g.pending=g.pending.filter(c=>c.seq>a.ack);g.world=m.world;
      g.driver=driverPrediction(m.world,g.id);
      if(g.driver)for(const c of g.pending.slice(-30))g.driver.step(c,1/30);
      g.self=gunner||g.driver?a:g.pending.reduce((s,c)=>stepPlayer(s,c,1/30,g.world.hp,g.world),a);
      const after=pose(g.driver?.pose(1)??g.self);
      rows.push({at:now-start,type:'snapshot',gunner,tick:m.simTick,ack:a.ack,seq:g.seq,
        gap:now-g.last,bytes:raw.length,pending:g.pending.length,oldPending,
        before,after,authoritative:pose(a),correction:before?Math.hypot(after.x-before.x,after.y-before.y,after.z-before.z):0,
        backward:before?after.z-before.z:0,bullets:m.world.bullets.length});g.last=now;
    }
    let previous=performance.now(),acc=0,sendAt=0;
    g.timer=setInterval(()=>{
      const now=performance.now();acc+=Math.min(.14,(now-previous)/1000);previous=now;
      while(acc>=1/30){acc-=1/30;if(!g.self)continue;
        // Short forward/reverse legs remain on the empty runway. Gunner fires skyward.
        const direction=Math.floor((now-start)/4000)%2?1:-1;
        const c={type:'input',seq:++g.seq,x:0,z:gunner?0:direction,yaw:0,
          sprint:false,throttle:gunner?0:-direction,steer:0,fire:gunner&&fire,aimYaw:0,aimPitch:.7};
        if(g.ws.readyState!==WebSocket.OPEN)continue;
        sendAt=Math.max(sendAt,now+latency+jitter*(.5+.5*Math.cos(now*.009)));
        setTimeout(()=>{if(g.ws.readyState===WebSocket.OPEN)g.ws.send(JSON.stringify(c));},Math.max(0,sendAt-now));
        g.pending.push(c);
        if(g.pending.length>150){rows.push({type:'prediction-limit',at:now-start,gunner});g.ws.close();clearInterval(g.timer);return;}
        if(g.driver)g.driver.step(c,1/30);else if(!gunner)g.self=stepPlayer(g.self,c,1/30,g.world.hp,g.world);
      }
    },8);
  });
}
try{
  const walker=await join();await join(true);
  const ping=setInterval(()=>{if(walker.ws.readyState===WebSocket.OPEN)walker.ws.send(JSON.stringify({type:'diagnosticPing',at:performance.now()}));},1000);
  await new Promise(r=>setTimeout(r,duration));clearInterval(ping);
}finally{for(const g of peers){clearInterval(g.timer);g.ws.close();}}
const file=process.env.LAG_OUTPUT??'output/lag/probe.json';await writeFile(file,JSON.stringify(rows));
const stats=(type,key)=>{const a=rows.filter(r=>r.type===type&&!r.gunner && r.at>3000).map(r=>r[key]).filter(Number.isFinite).sort((a,b)=>a-b);return {p50:a[Math.floor(a.length*.5)],p95:a[Math.floor(a.length*.95)],max:a.at(-1)};};
console.log(JSON.stringify({file,fire,tick:stats('diagnostics','tickMs'),loop:stats('diagnostics','loopGapMs'),round:stats('diagnostics','roundMs'),rounds:stats('diagnostics','rounds'),debt:stats('diagnostics','debtMs'),dropped:stats('diagnostics','dropped'),correction:stats('snapshot','correction'),gap:stats('snapshot','gap'),rtt:stats('rtt','ms')},null,2));
