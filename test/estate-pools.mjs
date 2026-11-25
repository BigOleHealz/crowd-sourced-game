import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {stepPlayer,groundHeight,waterBlend,waterSurfaceAt}=await import('../public/world.js');
const {estatePools}=await import('../public/swimming-pools.js');
for(const p of estatePools){
  const west=p.entry==='west',dx=west?1:0,dz=west?0:-1;
  const edgeX=west?p.x-p.w/2:p.x,edgeZ=west?p.z:p.z+p.d/2;
  const testWorld={doors:{},hp:{}};
  // A pair can pass each other on the steps and swim alongside the garden sculpture.
  const players=[-.9,.9].map(offset=>{
    const x=edgeX-dx*.7+(west?0:offset),z=edgeZ-dz*.7+(west?offset:0);
    return {x,z,y:groundHeight(x,z),vy:0,grounded:true};
  });
  function move(player,sign,frames){
    let swam=false,waded=false;
    for(let i=0;i<frames;i++){
      const state=stepPlayer(player,{x:sign*dx,z:sign*dz},1/30,testWorld.hp,testWorld);
      Object.assign(player,{swimming:false},state);
      swam ||= !!state.swimming;
      waded ||= state.grounded && waterBlend(state)>.15;
    }
    return {swam,waded};
  }
  for(const player of players){
    assert.equal(player.grounded,true);
    const entered=move(player,1,47);
    assert(entered.waded && entered.swam,p.name+' steps should lead to swimming '+JSON.stringify(player));
    assert(player.swimming && Math.abs(player.y-(p.waterY-.72))<.045,p.name+' floats at its own water surface');
    assert.equal(waterSurfaceAt(player.x,player.z,player.y),p.waterY);
    const exited=move(player,-1,64);
    assert(exited.waded && !player.swimming && player.grounded,p.name+' exit');
    assert((player.x-edgeX)*dx+(player.z-edgeZ)*dz<-.6,'back on deck');
  }
}
assert.equal(waterSurfaceAt(-70,-485,-.86),-.14,'ocean swimmers retain the original waterline');
console.log('PASS paired stair entry, wading, swimming at the correct surface and a dry exit in all three Lantern pools.');
