import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
if(!process.env.GLASS_TEST_MAP){
  for(const map of ['outpost','brickell']){
    const run=spawnSync(process.execPath,[new URL(import.meta.url).pathname],{env:{...process.env,GLASS_TEST_MAP:map,PINEWATCH_MAP:map},stdio:'inherit'});
    assert.equal(run.status,0);
  }
  process.exit(0);
}
const {fire,advanceRounds,newExpedition}=await import('../public/expedition.js');
const {MAP,CITY}=await import('../public/world.js');
const {towerGlassIndex}=await import('../public/tower-glass.js');
function shatter(id,x,y,z,dx,dz,dy=0){
  const world=newExpedition();
  const s={id:1,state:{x:x-2.25*dx,y:y-1.30-2.25*dy,z:z-2.25*dz},life:{hp:100},weapon:1,fireReady:0};
  fire(world,s,{aimPitch:Math.atan2(dy,Math.hypot(dx,dz)),aimYaw:Math.atan2(dx,-dz)},0,new Map(),[]);
  for(let i=0;i<8;i++)advanceRounds(world,new Map(),[],i);
  assert(world.doors.brokenPanes?.[id],id+' at '+[x,y,z]+' struck '+world.shots.at(-1)?.hitKind);
  assert.equal(world.doors.glassSeq,1);
  assert.equal(Object.keys(world.doors.brokenPanes).length,1);
}
if(!CITY){
  const {church,churchParts,rose}=await import('../public/ridge-church.js');
  for(const p of churchParts.filter(p=>p.paneId)){
    shatter(p.paneId,p.x,church.base+(p.bottom+p.h)/2,p.z,p===rose?0:-Math.sign(p.x),p===rose?-1:0);
  }
  console.log('PASS all eight stained-glass bays and rose window');
}else{
  const {skylights,clubPanes,terracePanes}=await import('../public/estate-exterior-glass.js');
  for(const p of skylights)shatter(p.paneId,p.x,.8+(p.h+p.bottom)/2,p.z,0,0,-1);
  const club=clubPanes.find(p=>p.alongX && p.side<0 && p.index===2);
  shatter(club.paneId,club.x,2.4,club.z,0,1);
  const rail=terracePanes(-36.3,4.10,-384.14,7.05,true)[2];
  shatter(rail.paneId,rail.x,5.40,rail.z,0,-1);
  const towers=towerGlassIndex(MAP.buildings);
  const apartment=towers.find(t=>t.b.facade===0);
  const band=apartment.levels[apartment.levels.length-2];
  const guard=band.find(p=>p.yaw===0 && p.z<apartment.b.z && Math.abs(p.x-apartment.b.x)<2);
  shatter(guard.id,guard.x,(guard.bottom+guard.top)/2,guard.z,0,1);
  const window=band.find(p=>p.yaw===0 && p.z>apartment.b.z && Math.abs(p.x-apartment.b.x)<2.2 && p.width>2);
  shatter(window.id,window.x,window.top-.15,window.z,0,-1);
  const home=towers.find(t=>t.b.finish);
  const dormer=home.levels[0].at(-1);
  shatter(dormer.id,dormer.x,dormer.y,dormer.z,-1,0);
  console.log('PASS skylights, terrace guard, club facade, upper apartment glazing, balcony panels and Harbor Key dormer');
}
