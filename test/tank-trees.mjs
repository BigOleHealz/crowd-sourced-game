import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {stepTank}=await import('../public/tank.js');
const {MAP,blocked}=await import('../public/world.js');
const {treeFallAngle}=await import('../public/tree-fall.js');
const {treeCrackBuffer}=await import('../public/tree-crack-audio.js');

const tree=MAP.trees.find(t=>t.x===7.7 && t.z===21);
const world=newExpedition(),tank=world.tank;
Object.assign(tank,{x:tree.x,z:tree.z+7,y:.8,yaw:0,driver:1});
assert(blocked(tree.x,.8,tree.z,world.hp,world.doors),'standing trunk is solid');
for(let tick=0;tick<150;tick++){
  world.simTick=tick;
  stepTank(world,{throttle:1},1/30);
}
const fall=world.doors.fallenTrees?.[tree.treeId];
assert(fall && fall.z<0,'tank pushes palm in its travel direction');
assert(tank.z<tree.z-5,'tank can continue beyond the fallen trunk');
assert(!blocked(tree.x,.8,tree.z,world.hp,world.doors),'fallen trunk no longer blocks travel');
assert(world.doors.treeSounds?.some(e=>e.x===tree.x && e.z===tree.z));
assert.equal(treeFallAngle(fall,fall.tick),0);
assert(Math.abs(treeFallAngle(fall,fall.tick+21)-Math.PI/2)<1e-8);
const late=JSON.parse(JSON.stringify(world.doors));
assert.deepEqual(late.fallenTrees[tree.treeId],fall,'late joiner sees the same fallen tree');

const context={sampleRate:24000,createBuffer:(_,n)=>{const samples=new Float32Array(n);return {getChannelData:()=>samples};}};
const sound=treeCrackBuffer(context).getChannelData(0);
const rms=Math.sqrt(sound.reduce((sum,x)=>sum+x*x,0)/sound.length);
assert(rms>.02 && rms<.6,'wood cracking cue is audible without clipping');
assert(sound.every(x=>Math.abs(x)<=1));
console.log('PASS tank knocks down palms, passes through them, syncs the fall, and emits a bounded crack.');
