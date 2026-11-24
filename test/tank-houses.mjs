import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {newExpedition}=await import('../public/expedition.js');
const {homes}=await import('../public/residential-sites.js');
const {stepTank}=await import('../public/tank.js');
const {groundHeight,MAP,blocked,solidTopAt}=await import('../public/world.js');
const {cutGrid,inTankOpening}=await import('../public/tank-wall-cuts.js');
const tower=MAP.buildings.find(b=>b.towerId!=null);
const sites=[...homes.map(h=>({id:h.id,b:h.parts[0]})),{id:'storefront tower',b:tower}];
for(const {id,b} of sites)for(const dir of [-1,1]){
  const world=newExpedition(),tank=world.tank,z=b.z;
  const near=b.x-dir*b.w/2,far=b.x+dir*b.w/2,x=near-dir*4.5;
  const roofAt=()=>solidTopAt(b.x,z,world.hp,0,Infinity,world.doors);
  const originalRoof=roofAt(),events=new Set();
  world.rules={brokenPane(){},damageProperty(team,point,key){assert(!events.has(key));events.add(key);}};
  const occupant={id:1,team:1,life:{hp:100},state:{x,z,y:.8}};
  Object.assign(tank,{x,z,y:groundHeight(x,z,1),yaw:dir*Math.PI/2,driver:1});
  let first,entered=false,exited=false;
  for(let tick=0;tick<480;tick++){
    stepTank(world,{throttle:1},1/30,new Map([[1,occupant]]));
    const cuts=world.doors.tankWallCuts;
    if(cuts && !first){
      first=[...cuts];
      for(const key of first){
        const cx=cutGrid.west+(key%cutGrid.width+.5)*cutGrid.size;
        assert((cx-far)*dir < -1.2,id+' far wall intact after first contact');
      }
      assert.equal(roofAt(),originalRoof);
    }
    if(Math.abs(tank.x-b.x)<1)entered=true;
    if((tank.x-far)*dir>2.5){exited=true;break;}
  }
  if(!first?.length){
    assert.equal(tank.speed,0,id+' solid structure stops the enlarged hull');
    assert(!entered && !exited);continue;
  }
  assert(events.size && (entered || !exited),id+' tank cuts only reached walls');
  assert.equal(world.doors.structureFalls,undefined);assert.equal(world.doors.houseRuins,undefined);
  assert.equal(world.doors.collapsedTowers,undefined);assert.equal(originalRoof,roofAt());
  assert.equal(occupant.life.hp,100);assert.equal(tank.hp,750);
  const late=JSON.parse(JSON.stringify(world.doors));
  assert.deepEqual(late.tankWallCuts,world.doors.tankWallCuts);
  for(const key of late.tankWallCuts){
    const cx=cutGrid.west+(key%cutGrid.width+.5)*cutGrid.size,cz=cutGrid.north+(Math.floor(key/cutGrid.width)+.5)*cutGrid.size;
    assert(inTankOpening(late,cx,2,cz));assert(!inTankOpening(late,cx+cutGrid.width*cutGrid.size,2,cz-cutGrid.size));assert(!inTankOpening(late,cx,5,cz));
  }
  for(const wall of exited?[near,far]:[]){
    const y=groundHeight(wall,z,1.5,late);
    assert(!blocked(wall,y,z,world.hp,late),id+' late join walks through cleared facade');
  }
  assert(!inTankOpening(late,near,2,z+b.d*.45),id+' side of facade survives');
}
console.log('PASS enlarged tank breaches reachable facades, stops at narrow structures, preserves roofs and synchronizes every wall cut.');
