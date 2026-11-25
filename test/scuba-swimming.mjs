import assert from 'node:assert/strict';
import {swimColumn,breathSeconds,tankSeconds} from '../public/scuba.js';
import {touchLayout} from '../public/touch-controls.js';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {stepPlayer,groundHeight,MAP}=await import('../public/world.js');
const dt=1/30, surface=MAP.waterY-.72;
const advance=(s,input,n)=>{for(let i=0;i<n;i++)s=stepPlayer(s,input,dt);return s;};
const atSurface={x:95,z:-211,y:surface,swimming:true};
const bottom=groundHeight(atSurface.x,atSurface.z)+.1;
let swimmer=advance(atSurface,{swimY:-1},45);
assert(swimmer.y>=bottom);
assert.equal(swimColumn({...atSurface,swimDepth:1.9},{swimY:-1},-2.76,MAP.waterY,-2.8,.2).y,-2.8+.1);
assert(swimmer.swimDepth>1 && swimmer.swimAir<breathSeconds);
assert(!advance(swimmer,{toggleScuba:true},1).scuba);
const held=advance(swimmer,{z:-1},30);
assert.equal(held.y,swimmer.y);assert(held.z < swimmer.z-2.5);
const surfaced=advance(held,{swimY:1},60);
assert.equal(surfaced.y,surface);assert(!surfaced.swimDepth);
swimmer=advance(swimmer,{swimY:-1},30*28);
assert(swimmer.y>bottom,'an exhausted swimmer rises despite holding Dive');
const tank=advance(atSurface,{toggleScuba:true},1);
assert(tank.scuba);assert.equal(tank.swimAir,tankSeconds);
const expedition=advance(tank,{swimY:-1},30*40);
assert(expedition.scuba && expedition.swimDepth>1 && expedition.swimAir>100);
assert(!advance(tank,{toggleScuba:true},1).scuba);
const buttons=touchLayout({role:'swimming',active:true,scuba:true}).quick;
assert.deepEqual(buttons,[['KeyC','Dive'],['Space','Rise / climb'],['KeyG','Stow scuba']]);
assert(!touchLayout({role:'swimming',active:true,submerged:true}).quick.some(([key])=>key==='KeyG'));
console.log('PASS intentional descent/ascent, depth hold, floor clearance, steering, breath recovery, longer scuba dive and touch controls.');

const {yachtWalkBlocked,yachtCeilingAt,yachtKeelY}=await import('../public/yacht-layout.js');
const yacht={x:0,y:-.14,z:0,yaw:0};
assert(yachtWalkBlocked(yacht,0,-1,0,1.12));
assert(!yachtWalkBlocked(yacht,0,-3,0,1.12));
const ceiling=yachtCeilingAt(yacht,0,-3,0)-1.12;
const rising=swimColumn({...tank,swimDepth:2},{swimY:1},-2.86,-.14,-5,2,ceiling);
assert(Math.abs(rising.y-(yacht.y+yachtKeelY-1.12))<.001,'ascent stops below the keel');
const {createSharks}=await import('../public/shark-swim.js');
const sharks=createSharks(), diver={id:7,state:{x:85,y:-3.15,z:-214,swimming:true,swimDepth:2.29},life:{hp:100}};
let bites=0;
for(let n=0;n<1600;n++)sharks.step(dt,new Map([[7,diver]]),n,()=>{bites++;return false;});
assert.equal(bites,0,'surface patrols only bite a swimmer within vertical reach');

const {newExpedition}=await import('../public/expedition.js');
const world=newExpedition();
let exiting={...tank,x:43.45,z:32,y:surface-.75,swimDepth:.75,swimAir:80};
for(let tick=0;tick<70;tick++){
  exiting=stepPlayer(exiting,{swimY:1,x:-1,z:0},dt,world.hp,world);
  assert(exiting.scuba && exiting.swimAir>=79);
}
assert(exiting.grounded && !exiting.swimming,'hold Rise toward the quay to surface and pull up');
const {marinaPlatform}=await import('../public/marina-platform.js');
const {berthDeckY}=await import('../public/marina-docks.js');
let onLadder={...tank,swimming:false,grounded:true,x:marinaPlatform.x,y:berthDeckY,z:marinaPlatform.near+.60,swimAir:85};
onLadder=stepPlayer(onLadder,{jump:true},dt,world.hp,world);
assert.equal(onLadder.climb?.kind,'platformLadder');
for(let tick=0;tick<185 && onLadder.climb;tick++){
  assert(onLadder.scuba);
  onLadder=stepPlayer(onLadder,{},dt,world.hp,world);
}
assert(onLadder.grounded && onLadder.scuba && onLadder.swimAir>85,'gear retained on the top platform');
console.log('PASS continuously held ascent, shore pull-up, dry walk and full 10-m ladder with the same tank.');
