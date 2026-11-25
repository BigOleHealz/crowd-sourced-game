import assert from 'node:assert/strict';

process.env.GOY_THEFT_AUTO_MAP = 'brickell';
const {zombieSurvival} = await import('../zombie-survival.js');
const {newExpedition} = await import('../public/expedition.js');
const {healthView} = await import('../public/rivals.js');
const {shotDamageVignette} = await import('../public/shot-damage-vignette.js');

const survivor = {id:1, inputs:[], lastSeq:0};
const observer = {id:2, inputs:[], lastSeq:0};
const players = new Map([[1,survivor],[2,observer]]);
const run = zombieSurvival(), world = newExpedition(), infected = [];
run.start(players,0);
run.advance(players,infected,90,world);
infected[0].state = {...survivor.state};
survivor.life.immuneUntil = 110;
let flashes = 0;
const edges = shotDamageVignette({classList:{
  contains:()=>false, add:()=>flashes++, toggle:(_name,on)=>assert.equal(on,false), remove:()=>{}
},getAnimations:()=>[]});
let previous = healthView(survivor,90);
for (const tick of [108,134,135,160]) {
  run.advance(players,infected,tick,world);
  const current = healthView(survivor,tick);
  edges.update(previous,current,0);
  edges.update(current,current,0);
  const expectedHits = tick===108 ? 0 : tick===160 ? 2 : 1;
  assert.equal(flashes,expectedHits);
  assert.equal(current.hp,100-11*expectedHits);
  assert.equal(healthView(observer,tick).lastBiteTick,undefined);
  previous = current;
}
edges.reset();
