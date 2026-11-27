import assert from 'node:assert/strict';
process.env.GOY_THEFT_AUTO_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {homes}=await import('../public/residential-sites.js');
const {stepTank}=await import('../public/tank.js');
const {groundHeight,MAP,solidTopAt}=await import('../public/world.js');
const {cutGrid,inTankOpening}=await import('../public/tank-wall-cuts.js');

function ram(b,dir){
  const world=newExpedition(),tank=world.tank,z=b.z;
  const x=b.x-dir*(b.w/2+4.5);
  const roof=()=>solidTopAt(b.x,z,world.hp,0,Infinity,world.doors);
  const originalRoof=roof();
  const occupant={id:1,team:1,life:{hp:100},state:{x,z,y:.8}};
  Object.assign(tank,{x,z,y:groundHeight(x,z,1),yaw:dir*Math.PI/2,driver:1});
  let firstCuts;
  for(let tick=0;tick<480;tick++){
    world.simTick=tick;
    stepTank(world,{throttle:1},1/30,new Map([[1,occupant]]));
    if(!firstCuts && world.doors.tankWallCuts?.length){
      firstCuts=[...world.doors.tankWallCuts];
      assert.equal(roof(),originalRoof,'first impact preserves the roof');
      const far=b.x+dir*b.w/2;
      for(const cell of firstCuts){
        const cx=cutGrid.west+(cell%cutGrid.width+.5)*cutGrid.size;
        assert((cx-far)*dir< -1.2,'far wall remains after first impact');
      }
    }
  }
  assert.equal(occupant.life.hp,100);
  assert.equal(tank.hp,750);
  return {world,tank,roof:roof(),originalRoof,firstCuts};
}

for(const home of homes)for(const dir of home.id==='club-salon'?[-1]:[-1,1]){
  const {world,tank,roof,originalRoof,firstCuts}=ram(home.parts[0],dir);
  assert(firstCuts?.length,home.id+' opens local wall cells');
  assert.equal(world.doors.houseRuins?.[home.id],undefined,home.id+' remains standing');
  assert.equal(world.doors.structureFalls,undefined,'tank impact starts no structural collapse');
  assert.equal(roof,originalRoof,home.id+' roof remains standing');
  if(home.id==='casa' || home.id==='mare')
    assert((tank.x-home.parts[0].x)*dir>home.parts[0].w/2,
      home.id+' tank passes the visible breach after the contact cells are removed');
  const late=JSON.parse(JSON.stringify(world.doors));
  for(const cell of firstCuts){
    const cx=cutGrid.west+(cell%cutGrid.width+.5)*cutGrid.size;
    const cz=cutGrid.north+(Math.floor(cell/cutGrid.width)+.5)*cutGrid.size;
    assert(inTankOpening(late,cx,2,cz),'late joiners receive the opening');
    assert(!inTankOpening(late,cx,5,cz),'the upper wall remains');
  }
}

// A near-corner touch must remove less wall than a broadside impact. The
// one-metre cut cells are shared by the tank collision and the visible mask.
for(const home of homes.slice(0,2)){
  const b=home.parts[0],contacts=[];
  for(const z of [b.z,b.z+b.d/2+1.3]){
    const world=newExpedition(),tank=world.tank,x=b.x-b.w/2-4.5;
    const occupant={id:1,team:1,life:{hp:100},state:{x,z,y:.8}};
    Object.assign(tank,{x,z,y:groundHeight(x,z,1),yaw:Math.PI/2,driver:1});
    let first;
    for(let tick=0;tick<240 && !first;tick++){
      world.simTick=tick;
      stepTank(world,{throttle:1},1/30,new Map([[1,occupant]]));
      if(world.doors.tankWallCuts?.length)first=[...world.doors.tankWallCuts];
    }
    assert(first?.length,home.id+' records a contact at '+z);
    contacts.push(first);
  }
  assert(contacts[1].length<contacts[0].length,home.id+' glancing contact removes fewer cells');
}

const tower=MAP.buildings.find(b=>b.towerId!=null);
for(const dir of [-1,1]){
  const {world,tank,roof,originalRoof}=ram(tower,dir);
  assert.equal(tank.speed,0,'skyscraper concrete stops the tank');
  assert.equal(roof,originalRoof,'skyscraper roof and structure stay intact');
  assert(world.doors.glassSeq>0,'skyscraper glass shatters on contact');
  assert(!world.doors.tankWallCuts?.length,'concrete wall is never cut');
  assert(!world.doors.collapsedTowers?.length);
}
console.log('PASS tank opens local house wall cells without collapsing the building, shatters tower glazing, and stops at structural concrete.');
