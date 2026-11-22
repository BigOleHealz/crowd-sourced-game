import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
if(!process.env.INTERIOR_TEST_MAP){
  for(const map of ['brickell','outpost']){
    const run=spawnSync(process.execPath,[process.argv[1]],{stdio:'inherit',env:{...process.env,INTERIOR_TEST_MAP:map,PINEWATCH_MAP:map}});
    assert.equal(run.status,0);
  }
}else{
  const {MAP,blocked,groundHeight,stepPlayer}=await import('../public/world.js');
  const {newExpedition}=await import('../public/expedition.js');
  const {interiorPlans,buildingAction,doorIsOpen,setDoorOpen,roomAtFeet}=await import('../public/building-interiors.js');
  const {requestInterior,advanceElevator}=await import('../interior-actions.js');
  const w=newExpedition(),p={id:1,inputs:[],lastSeq:0,life:{hp:100},state:{}},other={id:2,life:{hp:100},state:{x:80,y:0,z:0}},players=new Map([[1,p],[2,other]]);
  const feet=(x,y,z)=>({x,y,z,vy:0,grounded:true});
  let seq=0,t=0,rooms=0,trips=0;
  const send=data=>requestInterior(w,players,p,{...data,seq:++seq},t);
  function go(from,to){
    p.resortStay={key:0,floor:Math.max(from.index,to.index),penthouse:true};
    p.state=feet(from.exitX,from.y,from.exitZ);
    assert(!blocked(p.state.x,p.state.y,p.state.z,w.hp,w.doors),'clear boarding area '+from.p.name);
    assert.equal(buildingAction(p.state,w.doors)?.s,from,'reachable panel '+from.p.name);
    send({building:from.p.id,floor:to.index});
    assert(p.trip);assert.equal(p.state.liftTravel,to.index+1);
    for(let i=0;p.trip && i<650;i++)advanceElevator(w,p,++t);
    assert.equal(p.trip,undefined);assert(p.state.grounded);
    assert.equal(p.state.y,to.y);assert(Math.abs(groundHeight(p.state.x,p.state.z,p.state.y+1.6,w.doors)-to.y)<.00001);
    assert(!blocked(p.state.x,p.state.y,p.state.z,w.hp,w.doors),'clear destination '+to.p.name);
    trips++;
  }
  function cross(d,side=1){
    const dx=d.axis==='x'?0:side,dz=d.axis==='x'?side:0;
    p.state=feet(d.x-dx*.88,d.y,d.z-dz*.88);
    for(let i=0;i<17;i++)p.state=stepPlayer(p.state,{x:dx,z:dz},1/30,w.hp,w);
    return (p.state.x-d.x)*dx+(p.state.z-d.z)*dz;
  }
  if(process.env.INTERIOR_TEST_MAP==='brickell'){
    for(const b of interiorPlans.filter(p=>p.panels.length || p.levels.length)){
      const [lobby,...upper]=b.panels;
      for(const dest of upper){go(lobby,dest);go(dest,lobby);}
      for(const l of b.levels)for(const d of l.doors){
        assert.equal(doorIsOpen(d,w.doors),false);
        const dir=d.x>b.x?1:-1;
        assert(cross(d,dir)<-.15,'closed '+d.label);
        p.state=feet(d.x-dir*.66,d.y,d.z);send({door:d.id,open:true});
        assert(doorIsOpen(d,w.doors),'open '+d.label);
        assert(cross(d,dir)>.35,'walk in '+d.label+' in '+b.name);
        assert.equal(roomAtFeet(p.state,w.doors).label,Number(d.label.split(' ')[1]));
        assert(cross(d,-dir)>.35,'walk out '+d.label+' in '+b.name);
        other.state=feet(d.x,d.y,d.z);send({door:d.id,open:false});assert(doorIsOpen(d,w.doors),'other player in doorway');other.state=feet(80,0,0);
        p.state=feet(d.x-dir*.72,d.y,d.z);send({door:d.id,open:false});assert(!doorIsOpen(d,w.doors));rooms++;
      }
    }
    assert.equal(rooms,292);assert.equal(trips,306);

    for(const building of interiorPlans)for(const d of building.entrances){
      const doors={};setDoorOpen(d,doors,true);
      assert(!blocked(d.x,d.y,d.z,{},doors),'open entrance '+building.name+' '+d.label);
      setDoorOpen(d,doors,false);
      assert(blocked(d.x,d.y,d.z,{},doors),'shut entrance '+building.name+' '+d.label);
    }
    const {galleryPlans}=await import('../public/gallery-lobbies.js');
    const {stepHotelDoors}=await import('../public/maravela-hotel.js');
    for(const g of galleryPlans.filter(g=>g.passage)){
      const [near,far]=g.ends;
      p.state=feet(g.x,.824,near.z+.75);
      for(let i=0;i<(far.z-near.z+2)*9;i++){
        stepHotelDoors(w.doors,[p.state],1/30);
        p.state=stepPlayer(p.state,{x:0,z:1},1/30,w.hp,w);
      }
      assert(p.state.z>far.z+.3,'through both gallery passage doors '+g.index);
    }
    const bank=interiorPlans.find(p=>p.type==='bank');
    for(const d of bank.doors.filter(d=>!d.initial)){
      assert(blocked(d.x,d.y,d.z,w.hp,w.doors));setDoorOpen(d,w.doors,true);
      assert(!blocked(d.x,d.y,d.z,w.hp,w.doors),'open bank '+d.label);
    }
    const hotel=interiorPlans.find(p=>p.name==='Hotel Maravela');
    p.state=feet(0,0,15);send({building:hotel.id,floor:1});assert(!p.trip);
    p.state=feet(hotel.panels[0].exitX,.824,hotel.panels[0].exitZ);send({building:hotel.id,floor:999});assert(!p.trip);
    send({building:hotel.id,floor:1});assert(p.trip);
    w.doors.collapsedTowers=[hotel.b.towerId];advanceElevator(w,p,++t);assert(!p.trip && !p.state.liftTravel);
    const {yachtPoint,yachtDoorAction,yachtWalkBlocked}=await import('../public/yacht-layout.js');
    const {yachtRoomDoors}=await import('../public/yacht-room-doors.js');
    for(const d of yachtRoomDoors){
      p.state={...yachtPoint(w.yacht,d.x,d.y,d.z+.72),grounded:true};const coord=yachtPoint(w.yacht,d.x,d.y,d.z);
      assert.equal(yachtDoorAction(w.yacht,p.state)?.d,d);send({cabin:d.id,open:false});assert(w.yacht.closedCabins);
      assert(yachtWalkBlocked(w.yacht,coord.x,coord.y,coord.z,1.70));
      send({cabin:d.id,open:true});assert.equal(w.yacht.closedCabins,undefined);
      assert(!yachtWalkBlocked(w.yacht,coord.x,coord.y,coord.z,1.70));
    }
  }else{
    for(const b of interiorPlans.filter(p=>p.type==='outpost')){
      const d=b.doors[0];assert(doorIsOpen(d,w.doors));
      const z=d.z+2.3;p.state=feet(d.x,groundHeight(d.x,z,Infinity,w.doors),z);
      for(let i=0;i<32;i++)p.state=stepPlayer(p.state,{x:0,z:-1},1/30,w.hp,w);
      assert(p.state.z<d.z-.4,b.name+' approach from terrain '+JSON.stringify(p.state));
      assert.equal(roomAtFeet(p.state,w.doors).label,b.name);
      assert(cross(d,1)>.35,b.name+' exit');
      p.state=feet(d.x,d.y,d.z+.6);send({door:d.id,open:false});assert(!doorIsOpen(d,w.doors));
      assert(cross(d,-1)<-.15,b.name+' closed door');
      for(const g of b.entrances.filter(d=>d.shutter)){
        assert(cross(g,-1)<-.15,'closed shutter');
        p.state=feet(g.x,g.y,g.z+.61);send({door:g.id,open:true});
        assert(doorIsOpen(g,w.doors),'shutter control');
        assert(cross(g,-1)>.35,'walk under shutter');assert(cross(g,1)>.35,'exit shutter');
      }
      for(const pane of b.glazing){
        const {buildingTopAt}=await import('../public/world.js');
        const y=(pane.sill+pane.head)/2;
        assert(buildingTopAt(pane.x,pane.z,0,y,w.doors)>=pane.head-.001);
        (w.doors.brokenPanes??={})[pane.paneId]=true;
        assert(buildingTopAt(pane.x,pane.z,0,y,w.doors)<y,'rural pane opens actual wall');
        assert(buildingTopAt(pane.x,pane.z,0,pane.sill-.1,w.doors)>=pane.sill-.01);
      }
    }
  }
  console.log('PASS interior entry, exit and operable doors',process.env.INTERIOR_TEST_MAP,rooms,'rooms',trips,'lift rides');
}
