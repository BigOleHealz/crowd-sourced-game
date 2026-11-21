import {marinaModel} from './marina-fleet-layout.js';

// Samples stay in world space
// after the stern passes, including during a turn or a stop.
export const wakeCapacity=28,wakeLife=3.3,wakeInterval=.125;
export class WakeTrail{
  constructor(){
    this.pool=Array.from({length:wakeCapacity},()=>({}));
    this.head=0;this.count=0;this.time=0;this.stamp=-1;
  }
  at(i){return this.pool[(this.head-1-i+wakeCapacity)%wakeCapacity];}
  step(b,dt){
    this.time+=dt;
    while(this.count && this.time-this.at(this.count-1).time>=wakeLife)this.count--;
    if(!b || b.wrecked || Math.abs(b.speed)<.8 || this.time-this.stamp<wakeInterval-1e-6)return;
    const yacht=b.id==='superyacht',wake=marinaModel(b)?.wake;
    const stern=wake?(b.speed>0?wake.ahead:wake.astern):yacht?(b.speed>0?20:-16):(b.speed>0?2.05:-2.1);
    const c=Math.cos(b.yaw),s=Math.sin(b.yaw),x=b.x-stern*s,z=b.z+stern*c;
    if(this.count && Math.hypot(x-this.at(0).x,z-this.at(0).z)>10)this.count=0;
    const q=this.pool[this.head];
    q.x=x;q.z=z;q.y=b.y+.038;q.time=this.time;q.c=c;q.s=s;q.beam=wake?.beam??(yacht?3.5:.70);
    q.power=Math.min(1,Math.abs(b.speed)/(wake?.power??(yacht?3.8:8)));
    this.stamp=this.time;this.head=(this.head+1)%wakeCapacity;this.count=Math.min(wakeCapacity,this.count+1);
  }
}
export const crestSpread=(sample,age)=>sample.beam+age*(.68+.51*sample.power);

const histories=new WeakMap();
export function stepWakeCrossings(world,dt){
  if(!world.boats?.length)return;
  let trails=histories.get(world);
  if(!trails){trails=new Map();histories.set(world,trails);}
  const vessels=world.yacht?[...world.boats,world.yacht]:world.boats;
  for(const b of vessels){
    if(!trails.has(b.id))trails.set(b.id,new WakeTrail());
    trails.get(b.id).step(b,dt);
  }
  for(const b of vessels){
    let strongest=0;
    for(const [id,trail] of trails){
      if(id===b.id || !trail.count || b.wrecked || Math.hypot(b.x-trail.at(0).x,b.z-trail.at(0).z)>65)continue;
      for(let i=0;i<trail.count;i++){
        const q=trail.at(i),dx=b.x-q.x,dz=b.z-q.z;
        if(Math.abs(dx*q.s-dz*q.c)>1.4)continue;
        const across=dx*q.c+dz*q.s,age=trail.time-q.time,d=Math.abs(across)-crestSpread(q,age);
        if(Math.abs(d)>1.15)continue;
        const incidence=Math.cos(b.yaw)*q.c+Math.sin(b.yaw)*q.s;
        const roll=.07*q.power*(1-age/wakeLife)*Math.sin(d/1.15*Math.PI)*Math.sign(across)*incidence;
        if(Math.abs(roll)>Math.abs(strongest))strongest=roll;
      }
    }
    const value=(b.wakeRoll??0)+(strongest*(b.id==='superyacht'?.25:1)-(b.wakeRoll??0))*Math.min(1,dt*7);
    if(Math.abs(value)>.00035)b.wakeRoll=Math.round(value*10000)/10000;else delete b.wakeRoll;
  }
}
