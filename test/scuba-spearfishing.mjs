import assert from 'node:assert/strict';
import {fishPose,fishSchools,fishSpecies} from '../public/reef-fish.js';
import {reefFishKey,spearOrigin,spearCast,spearRange,clearReturnedFish} from '../public/spearfishing.js';

const sea=-.14,deep=()=>-8,tick=34,school=fishSchools[2],spec=fishSpecies[school.species];
const pose=fishPose(school,3,tick/30),key=reefFishKey(2,3);
const state={swimming:true,scuba:true,swimDepth:pose.depth-.27,swimAir:149,
  x:pose.x,y:sea-pose.depth-.45,z:pose.z+1.15};
const diver=()=>({state:{...state},life:{hp:100}});
const world={},a=diver(),b=diver(),aim={seq:1,aimYaw:0,aimPitch:0};
assert(spearCast(world,a,{...aim,score:10000,species:'invented'},tick,sea,deep));
assert.equal(a.spearfishing.count,1);
assert.equal(a.spearfishing.last.catch?.species,school.species);
assert.equal(a.spearfishing.score,Math.round(spec.length*pose.scale*100));
assert.equal(a.spearfishing.log[0],a.spearfishing.last.catch);
assert.equal(world.spearedFish[key],tick+45*30);
assert(!spearCast(world,a,aim,tick+31,sea,deep),'replay rejected after cooldown');
assert(!spearCast(world,a,{...aim,seq:2},tick+1,sea,deep),'rapid repeat rejected');
assert(!spearCast(world,a,{...aim,seq:2},tick+40,sea,deep),'cooldown attempts cannot be replayed');
assert(spearCast(world,b,aim,tick,sea,deep),'simultaneous second diver can cast');
assert(!b.spearfishing.count || b.spearfishing.last.catch?.tick===tick && Object.keys(world.spearedFish).length===2,
  'a diver can only catch another actual fish behind the first');
assert.equal(world.spearedFish[key],tick+45*30);
clearReturnedFish(world,tick+45*30-1);assert(world.spearedFish[key]);
clearReturnedFish(world,tick+45*30);assert.equal(world.spearedFish,undefined);
const later=tick+45*30,p=fishPose(school,3,later/30),c=diver();
Object.assign(c.state,{x:p.x,y:sea-p.depth-.45,z:p.z+.45});
assert(spearCast(world,c,aim,later,sea,deep));assert(world.spearedFish[key]>later,'same fish returns');

for(const change of [{swimming:false},{scuba:false},{swimDepth:0},{swimAir:0},{outOfAir:true},{fall:true},{dead:true}]){
 const excluded=diver();Object.assign(excluded.state,change);
 assert.equal(spearCast({},excluded,aim,tick,sea,deep),false);
}
for(const invalid of [{seq:0},{aimPitch:Math.PI},{aimYaw:null},{aimYaw:Infinity}]){
 assert.equal(spearCast({},diver(),{...aim,...invalid},tick,sea,deep),false);
}
const wall=diver();assert(spearCast({},wall,aim,tick,sea,()=>0));
assert.equal(wall.spearfishing.count,0);assert.deepEqual(wall.spearfishing.last.to,spearOrigin(wall.state));
const outer=diver();outer.state.x=3;outer.state.z=35;
assert(spearCast({},outer,aim,tick,sea,deep));assert(!outer.spearfishing.last.catch);
assert.equal(outer.state.z-outer.spearfishing.last.to.z,spearRange);
assert.equal(outer.life.hp,100);assert.equal(outer.weapon,undefined);
console.log('PASS scored diver catches, competing divers and stock return, cooldown/replay, invalid aim, dry/surface eligibility and misses.');
