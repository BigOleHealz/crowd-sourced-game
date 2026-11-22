import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {groundHeight,stepPlayer,waterSurfaceAt}=await import('../public/world.js');
const {divingBoards,takeoffBoard,entryBeat}=await import('../public/estate-diving.js');
const {touchLayout}=await import('../public/touch-controls.js');
const world={doors:{},hp:{}};
const move=(state,cmd)=>stepPlayer(state,cmd,1/30,world.hp,world);
for(const board of divingBoards){
  const {edge,z}=board;
  let p={x:edge+1.48,y:groundHeight(edge+1.48,z),z,grounded:true,vy:0};
  for(let i=0;i<22 && !takeoffBoard(p);i++)p=move(p,{x:-1,z:0});
  assert.ok(takeoffBoard(p),'can walk up the steps at '+z);
  const underneath=move({x:edge-1.2,z,y:board.water-.72,swimming:true,grounded:false},{});
  assert.ok(underneath.swimming,'swimmers stay below the board');
  const start=p;
  function attempt(flip,open,steer){
    let p=move(start,flip?{flipDive:true}:{jump:true});
    assert.ok(p.dive);
    let peaked=false,opened=false;
    for(let i=0;i<65 && p.dive;i++){
      peaked ||= p.vy<0;
      const jump=!opened && p.dive.time/p.dive.duration>=open;
      opened ||= jump;
      p=move(p,{jump,z:steer});
    }
    assert.ok(peaked && p.swimming,'physical flight yields to swimming');
    assert.equal(p.y,waterSurfaceAt(p.x,p.z,p.y)-.72);
    return p;
  }
  for(const flip of [false,true]){
    const clean=attempt(flip,entryBeat,1),early=attempt(flip,.3,-1),miss=attempt(flip,2,0);
    assert.ok(clean.entryMark.score>=9,'well aligned dive');
    assert.ok(early.entryMark.score<clean.entryMark.score && miss.entryMark.score<clean.entryMark.score);
    assert.ok(clean.entryMark.splash<early.entryMark.splash && clean.z>early.z+1.6);
    assert.equal(clean.entryMark.note,'Clean entry');
    assert.equal(miss.entryMark.note,'Missed entry');
    assert.equal(clean.entryMark.flip,flip);
  }
}
assert.deepEqual(touchLayout({role:'diving',onBoard:true,active:true}).quick.map(a=>a[1]),['Straight dive','Front flip']);
assert.deepEqual(touchLayout({role:'diving',canOpen:true,active:true}).quick,[['Space','Open for entry']]);
console.log('PASS both walk-on boards, two choices, timed and missed entry, steering, scored splash, transition to swimming and touch actions.');
