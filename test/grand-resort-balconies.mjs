import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
newExpedition();
const {resortLevels,suiteBalconyDoors,resortSupport,grandTopAt}=await import('../public/grand-resort-layout.js');
const {buildingAction,doorIsOpen,setDoorOpen,roomDoorTop}=await import('../public/building-interiors.js');

for(let n=5;n<=20;n++){
  const level=resortLevels[n];
  assert.equal(level.decks.filter(d=>d.role==='balcony').length,2);
  for(const door of suiteBalconyDoors(n)){
    const {x,z}=door,feet={x:x+.45,y:level.y,z,grounded:true};
    assert.equal(resortSupport(x-.65,z,level.y+.1),level.y,'balcony has a floor');
    assert.equal(level.parts.some(p=>p.facade && Math.abs(p.x-x)<.02 && Math.abs(p.z-z)<.3 &&
      p.base<level.y+2.1 && p.base+p.h>level.y+.3),false,'facade opening is clear');
    assert(grandTopAt(-90.24,z,.1,level.y+.5,{})>=level.y+1,'outer guard is solid');
    const state={},action=buildingAction(feet,state);
    assert.equal(action?.kind,'door');
    assert.equal(action.d.label,door.label);
    assert.equal(doorIsOpen(action.d,state),false);
    assert(roomDoorTop(x,z,.2,level.y+.5,state)>=level.y+2,'closed slider blocks passage');
    setDoorOpen(action.d,state,true);
    assert.equal(doorIsOpen(action.d,state),true);
    assert.equal(roomDoorTop(x,z,.2,level.y+.5,state),-Infinity,'open slider clears passage');
  }
}
console.log('PASS all 32 suite balconies have supported, guarded, operable exits.');
