import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

if(!process.env.RESIDENTIAL_TEST_MAP){
  for(const map of ['brickell','outpost']){
    const child=spawnSync(process.execPath,[process.argv[1]],{stdio:'inherit',
      env:{...process.env,RESIDENTIAL_TEST_MAP:map,PINEWATCH_MAP:map}});
    assert.equal(child.status,0);
  }
}else{
  const {CITY,blocked}=await import('../public/world.js');
  const {interiorPlans,furnishedFloorTop,setDoorOpen}=await import('../public/building-interiors.js');
  const overlap=(a,b)=>Math.abs(a.x-b.x)<(a.w+b.w)/2-.005 && Math.abs(a.z-b.z)<(a.d+b.d)/2-.005;
  const fits=(r,p)=>Math.abs(r.x-p.x)+p.w/2<=r.w/2+.00001 && Math.abs(r.z-p.z)+p.d/2<=r.d/2+.00001;
  let layouts=0;
  function verify(model,p,bounds,floor){
    for(const [i,item] of model.collisions.entries()){
      assert(bounds.some(r=>fits(r,item)),p.name+' '+item.kind+' fits its room');
      assert(!model.collisions.slice(i+1).some(other=>overlap(item,other)),p.name+' '+item.kind+' clears other furniture');
      const top=furnishedFloorTop(p.b,item.x,item.z,0,floor+.1,{});
      assert(Math.abs(top-floor-item.h)<.00001,p.name+' '+item.kind+' uses visible collision dimensions');
    }
    assert(model.furnishings.some(item=>item.kind==='art'));
    assert(model.furnishings.some(item=>item.kind==='pendant'));
    layouts++;
  }
  if(CITY){
    const residential=interiorPlans.filter(p=>p.levels[0]?.residential);
    assert.equal(residential.filter(p=>p.home?.startsWith('harbor-')).length,4);
    assert.equal(residential.filter(p=>!p.home).length,8);
    assert(!interiorPlans.find(p=>p.name==='Hotel Maravela').levels[0].residential);
    assert.equal(new Set(residential.filter(p=>p.home).map(p=>p.levels[0].residential.profile)).size,4);
    for(const p of residential)for(const l of p.levels){
      const roles=new Set(l.residential.furnishings.map(item=>item.kind));
      for(const role of ['sofa','dining','bed'])assert(roles.has(role),p.name+' '+role);
      verify(l.residential,p,l.rooms,l.y);
      const doors={};
      for(const door of l.doors){
        setDoorOpen(door,doors,true);
        const side=Math.sign(door.x-p.x);
        for(const depth of [0,.35,.70,.95]){
          assert(!blocked(door.x+side*depth,l.y,door.z,{},doors),p.name+' clear furnished doorway');
        }
      }
    }
  }else{
    const homes=interiorPlans.filter(p=>p.residential);
    assert.equal(homes.length,2);
    for(const p of homes){
      verify(p.residential,p,[p.b],p.b.base);
      for(const z of [p.z+p.d/2-.6,p.z,p.z-p.d/2+.65])
        assert(!blocked(p.x,p.b.base,z,{},{}),p.name+' clear central aisle');
    }
    assert(interiorPlans.filter(p=>p.b.garage).every(p=>!p.residential));
  }
  console.log('PASS',layouts,CITY?'Brickell residential floors':'Outpost residential buildings','with fitted furnishings and clear doors');
}
