import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition,fire,advanceRounds}=await import('../public/expedition.js');
const {driveRover}=await import('../public/rover.js');
const {groundHeight}=await import('../public/world.js');
for(const [x,z,dx,dz] of [[-18.75,-409,0,1],[39.5,-443.84,-1,0]]){
  for(const kind of ['rover','supercar']){
    const w=newExpedition(),v=w[kind],yaw=Math.atan2(dx,-dz);
    const s={id:6,state:{x:x-4*dx,y:1.1,z:z-4*dz},life:{hp:100},weapon:1,fireReady:0};
    fire(w,s,{aimPitch:0,aimYaw:yaw},0,new Map(),[]);
    for(let i=0;i<6;i++)advanceRounds(w,new Map(),[],i);
    assert.equal(w.doors.glassSeq,1,'a single shot breaks one pane at '+[x,z]);
    const previous=JSON.stringify(w.doors.brokenPanes);
    fire(w,s,{aimPitch:0,aimYaw:yaw},12,new Map(),[]);
    for(let i=12;i<16;i++)advanceRounds(w,new Map(),[],i);
    for(const id of Object.keys(JSON.parse(previous)))assert(w.doors.brokenPanes[id],id+' stays broken');
    const untouched=newExpedition();Object.assign(v,{x:x-6*dx,z:z-6*dz,y:.8,yaw,driver:1,speed:10});
    untouched[kind]=v;let crossed=false;
    for(let i=0;i<55;i++){
      driveRover(untouched,{throttle:1},1/30,undefined,kind);
      if((v.x-x)*dx+(v.z-z)*dz>.65){crossed=true;break;}
    }
    assert(crossed && !v.wrecked && v.y<2,kind+' crossing '+[x,z]+' stopped at '+JSON.stringify([v.x,v.y,v.z,v.hp,v.contactSound]));
    assert(untouched.doors.glassSeq>0);
  }
}
console.log('PASS bullets, pickup and GT break windows at both mansions; cars enter on the ground floor.');
