import {seabedHeight} from '../public/reef-channel.js';
import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {bridges}=await import('../public/brickell-map.js');
const {stepDrawbridges,maxLift,bridgeMiddle,leafGeometry}=await import('../public/drawbridges.js');
const {newExpedition}=await import('../public/expedition.js');
const {stepYacht}=await import('../public/superyacht.js');
const {driveRover}=await import('../public/rover.js');
const {groundHeight,MAP}=await import('../public/world.js');
const dt=1/30;
for(const bridge of bridges){
  const mid=bridgeMiddle(bridge);
  for(const sign of [-1,1]){
    const w=newExpedition(),y=w.yacht;
    Object.assign(y,{x:-sign*68,z:mid,yaw:sign*Math.PI/2,driver:1,gangway:false});
    const startingHP=y.hp;
    let raised=false,cleared=false;
    for(let n=0;n<1600;n++){
      stepDrawbridges(w,bridges,dt);stepYacht(w,{throttle:1},dt);
      const angle=w.doors.bridgeLifts[bridge.north];
      if(angle===maxLift)raised=true;
      if(Math.abs(y.x)<25)assert.equal(angle,maxLift,'whole yacht and mast pass at full clearance');
      if(sign*y.x>60){cleared=true;break;}
    }
    assert(raised && cleared && y.hp===startingHP,JSON.stringify({bridge:bridge.north,sign,x:y.x,z:y.z,hp:y.hp,raised,cleared}));
    y.z=mid+80;
    for(let n=0;n<160;n++)stepDrawbridges(w,bridges,dt);
    assert.equal(w.doors.bridgeLifts[bridge.north],0);
    for(const kind of ['rover','supercar']){
      const world=newExpedition(),v=world[kind];
      Object.assign(world.yacht,{x:0,z:mid});
      for(let n=0;n<155;n++)stepDrawbridges(world,bridges,dt);
      // Keep an aircraft hovering over the yacht directly under the approach lip.
      Object.assign(world.heli,{x:sign*2,z:mid-sign,y:world.yacht.y+3,grounded:false});
      const gap=leafGeometry(bridge,maxLift).gap;
      assert.equal(groundHeight(0,mid,Infinity,world.doors),seabedHeight(0,mid));
      Object.assign(v,{x:sign*2,z:mid-sign*45,yaw:sign>0?Math.PI:0,driver:2});
      v.y=groundHeight(v.x,v.z,Infinity,world.doors);
      let launch,landing,lastY=v.y;
      for(let n=0;n<400;n++){
        driveRover(world,{throttle:1},dt,undefined,kind);
        if(v.bridgeFlight && launch==null)launch=v.z;
        if(launch!=null && !v.bridgeFlight){landing=v.z;break;}
        assert(v.y>MAP.waterY && Math.abs(v.y-lastY)<1.1,'continuous above-water trajectory');
        lastY=v.y;
      }
      assert(launch!=null && sign*(launch-mid)<0 && landing!=null && sign*(landing-mid)>gap/2);
      assert.equal(v.hp,v.maxHp);
      console.log(kind,bridge.north,sign,'gap',gap.toFixed(1),'landed',Math.abs(landing-mid).toFixed(1),'m beyond center');
    }
  }
}

// A creep off the lip cannot teleport back onto the far leaf. A short fall
// into the channel releases the crew without impact damage.
{
  const w=newExpedition(),b=bridges[0],mid=bridgeMiddle(b),r=w.rover;
  w.doors.bridgeLifts={[b.north]:maxLift};
  const leaf=leafGeometry(b,maxLift);
  Object.assign(r,{driver:1,x:2,z:mid-leaf.gap/2-.015,yaw:Math.PI,speed:1.6});
  r.y=groundHeight(r.x,r.z,Infinity,w.doors);
  for(let i=0;i<180 && !r.sinking;i++)driveRover(w,{throttle:0},dt);
  assert(r.sinking && !r.wrecked && r.driver===1 && r.hp===r.maxHp);
  console.log('PASS slow entry falls through the gap');
}
