import assert from 'node:assert/strict';

process.env.PINEWATCH_MAP='brickell';
const {fire,advanceRounds,newExpedition}=await import('../public/expedition.js');
const {newLife}=await import('../public/rivals.js');
const {aimGlassPoint}=await import('../public/rounds.js');
const {hotel,hotelGlass}=await import('../public/maravela-hotel.js');
const {paneCenter,paneShattered,storefrontFaces}=await import('../public/frontage-glass.js');
const {galleryPanes,galleryDoorPanes,galleryFloor,galleryDoorWidth}=await import('../public/gallery-lobbies.js');

function fireAt(world,from,to) {
  const player={id:1,weapon:1,life:newLife(0,false),fireReady:0,
    state:{x:from.x,y:from.y-1.3,z:from.z,grounded:true}};
  const actors=new Map([[1,player]]);
  const x=to.x-from.x,y=to.y-from.y,z=to.z-from.z;
  world.shots.length=0;
  fire(world,player,{aimYaw:Math.atan2(x,-z),aimPitch:Math.atan2(y,Math.hypot(x,z))},0,actors,[]);
  for(let tick=1;world.bullets.length && tick<100;tick++)advanceRounds(world,actors,[],tick);
  return world.shots.at(-1);
}

function fireAcross(world,pane,side=1,height=2.24,range=1.75) {
  const isX=pane.widthAxis==='x';
  const aim={x:pane.x,y:height,z:paneCenter(pane,world.doors)};
  return fireAt(world,{x:aim.x+(isX?0:side*range),y:height,z:aim.z+(isX?side*range:0)},aim);
}

const showcase=storefrontFaces[9];
for(const i of [0,5,6]){
  const scene=newExpedition(), pane=showcase.glass.bays[i].all;
  assert.equal(fireAcross(scene,pane).hitKind,'glass');
  assert.equal(scene.doors.broken[showcase.id],1<<i);
  const after=fireAcross(scene,pane);
  assert.equal(after.hitKind,'scenery');
  assert(after.to.x<pane.x-1,'the next round passes the opening and hits the room beyond');
}
for(const door of ['cafe','lobby']){
  const scene=newExpedition(), panes=showcase.glass.extra.filter(p=>p.slide?.door.id===door);
  assert.equal(fireAcross(scene,panes[0]).hitKind,'glass');
  assert(paneShattered(panes[0],scene.doors));
  assert(!paneShattered(panes[1],scene.doors));
  assert.equal(scene.doors.broken,undefined);
  scene.doors[door]=.92;
  assert.equal(fireAcross(scene,panes[1],-1,2.02,1.05).hitKind,'glass','moved door leaf follows its own glass');
  assert(paneShattered(panes[1],scene.doors));
}
const shop=storefrontFaces.find(f=>f.name==='Ciruela');
{
  const scene=newExpedition(), bay=shop.glass.bays[shop.entry.bayIndex];
  const [left,right,transom,leaf]=bay.panes;
  const shot=fireAcross(scene,leaf,-1,2.24,1.20);
  assert.equal(shot.hitKind,'glass');
  assert(paneShattered(leaf,scene.doors));
  for(const pane of [left,right,transom])assert(!paneShattered(pane,scene.doors));
  assert.equal(scene.doors.broken,undefined);
  assert.equal(fireAcross(scene,right,-1,2.24,1.20).hitKind,'glass');
  assert(paneShattered(right,scene.doors));
  assert(!paneShattered(left,scene.doors));
}
{
  const scene=newExpedition(), pane=galleryPanes.find(p=>p.id==='gallery-4-south-west');
  assert.equal(fireAcross(scene,pane,1).hitKind,'glass');
  assert.deepEqual(scene.doors.brokenPanes,{[pane.id]:true});
  assert.equal(fireAcross(scene,pane,1).hitKind,'scenery');
}
{
  const scene=newExpedition(), leaf=galleryDoorPanes.find(p=>p.id==='gallery-4-south-west-leaf');
  const from={x:leaf.x+.25,y:2.24,z:leaf.z};
  assert.equal(fireAt(scene,from,{...from,x:leaf.x}).hitKind,'glass');
  assert.deepEqual(scene.doors.brokenPanes,{[leaf.id]:true});
}
{
  const scene=newExpedition(), leaf=galleryDoorPanes.find(p=>p.id==='gallery-4-south-west-leaf');
  const camera={x:-17.70,y:2.70,z:13.43};
  const delta={x:leaf.x-camera.x,y:2.23-camera.y,z:leaf.z-camera.z};
  const width=Math.hypot(delta.x,delta.y,delta.z);
  const direction={x:delta.x/width,y:delta.y/width,z:delta.z/width};
  const contact=aimGlassPoint(scene,camera,direction,width+.26);
  assert(contact && Math.abs(contact.x-leaf.x)<.014,'centered chase-camera depth finds a thin open leaf');
}
{
  const scene=newExpedition(), pane=showcase.glass.bays[7].all;
  assert.equal(fireAcross(scene,pane,1,1.48).hitKind,'glass');
  const stopped=fireAcross(scene,pane,1,1.48);
  assert.equal(stopped.hitKind,'scenery');
  assert(stopped.to.x<-12.9 && stopped.to.x>-13.28,'the café counter stops the following round');
}
{
  const scene=newExpedition(), from={x:showcase.x+1.8,y:2.24,z:2.36};
  const hit=fireAt(scene,from,{...from,x:showcase.x});
  assert.equal(hit.hitKind,'scenery','masonry stayed solid');
  assert.equal(scene.doors.broken,undefined);
  assert.equal(scene.doors.brokenPanes,undefined);
}
for(const front of hotel.fronts){
  const scene=newExpedition();
  const [left,right]=hotelGlass(front,0,galleryDoorWidth,galleryFloor);
  assert.equal(fireAcross(scene,left,front.side).hitKind,'glass');
  assert(paneShattered(left,scene.doors));
  assert(!paneShattered(right,scene.doors));
  scene.doors.hotel={[front.id]:.8};
  const moved=hotelGlass(front,.8,galleryDoorWidth,galleryFloor)[1];
  assert.equal(fireAcross(scene,moved,-front.side).hitKind,'glass','glass tracks the hotel slider');
}
console.log('PASS exact café and 810 windows and moving leaves, retail sidelight and leaf, gallery window and open leaf, hotel sliders, and solid masonry and interiors.');
