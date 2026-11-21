import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
if(!process.argv[2]){
  for(const map of ['outpost','brickell'])execFileSync(process.execPath,[fileURLToPath(import.meta.url),map],
    {env:{...process.env,PINEWATCH_MAP:map},stdio:'inherit'});
}else{
  const {CITY,MAP,groundHeight,stepPlayer,waterBlend}=await import('../public/world.js');
  const {createRangerRig,poseRig}=await import('../public/ranger-pose.js');
  const rig=createRangerRig(),start=CITY?{x:60,z:-211}:{x:12,z:31};
  let s={...start,y:groundHeight(start.x,start.z),grounded:true};
  let changes=0,ascending=0,descending=0,last=0,largest=0;
  for(let i=0;i<175;i++){
    const dir=i<85?1:-1;
    const next=stepPlayer(s,{x:CITY?dir:0,z:CITY?0:dir,sprint:true},1/30);
    if(!!next.swimming!==!!s.swimming)changes++;
    poseRig(rig,{...next,yaw:0,moving:true},1/30);
    const mix=rig.waterMix;largest=Math.max(largest,Math.abs(mix-last));
    if(mix>last+.001)ascending++;if(mix<last-.001)descending++;
    if(i===82){assert(next.swimming && mix===1);assert(Math.abs(next.y-(MAP.waterY-.72))<.002);}
    last=mix;s=next;
  }
  assert(changes===2 && ascending>=7 && descending>=7 && largest<.13);
  assert(s.grounded && waterBlend(s)===0 && !s.swimming);
  console.log(process.argv[2],'PASS reversible transition, continuous pose in',ascending,descending,'steps, full buoyancy and dry footing');
}
