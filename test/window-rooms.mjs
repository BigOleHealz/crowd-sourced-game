import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {MAP}=await import('../public/world.js');
const {interiorPlans}=await import('../public/building-interiors.js');
const {towerGlassIndex}=await import('../public/tower-glass.js');
const {windowRoomView}=await import('../public/window-room-view.js');
const {fire,advanceRounds,newExpedition}=await import('../public/expedition.js');

// Record the boxes actually submitted by the view, including the hide/restore
// index ranges used when a visitor enters and leaves the detailed floor.
class BoxBatch{
  indices=[];boxes=[];
  add(shape,color,x,y,z,w,h,d,rx=0,yaw=0){
    const turned=Math.abs(Math.sin(yaw))>.5;
    this.boxes.push({x,y,z,w:turned?d:w,h,d:turned?w:d});
    const base=this.indices.length;
    this.indices.push(base,base+1,base+2);
  }
  mesh(scene){
    const index={array:Uint32Array.from(this.indices)};
    const mesh={geometry:{index},boxes:this.boxes,userData:{},visible:true};
    scene.push(mesh);return mesh;
  }
}
const scene=[],update=windowRoomView(scene,BoxBatch,interiorPlans),doors={};
const drawn=(m,i)=>m.geometry.index.array[3*i]!==m.geometry.index.array[3*i+1];
const covers=(q,x,z)=>Math.abs(x-q.x)<q.w/2 && Math.abs(z-q.z)<q.d/2;
update(undefined,doors);
assert.equal(scene.filter(m=>m.visible).length,4,'only four clear office shells need unbroken-window room draws');
let panes=0,levels=0;
for(const tower of towerGlassIndex(MAP.buildings)){
  const {b}=tower,p=interiorPlans.find(p=>p.b===b);
  const m=scene.find(m=>m.name.startsWith(p.name+' ·'));
  assert(m,p.name+' exterior rooms');
  const upper=tower.levels.flat().filter(s=>s.facade || b.finish);
  for(const s of upper){
    const level=p.levels[b.finish?0:Math.floor(((s.top+s.bottom)/2-tower.start)/tower.story)];
    const floor=b.finish && s.bottom>b.base+b.eave ? b.base+b.eave+.05 : level.y;
    const dx=s.axis==='x'?-s.side:0,dz=s.axis==='z'?-s.side:0;
    const slab=m.boxes.some(q=>q.w>1 && q.d>1 && Math.abs(q.y+q.h/2-floor)<.09 &&
      [1,1.8,2.8,3.8].some(step=>covers(q,s.x+dx*step,s.z+dz*step)));
    assert(slab,p.name+' floor behind '+s.id);
    panes++;
  }
  levels+=p.levels.length;
  const s=upper.find(s=>s.axis==='x' && s.side===1),world=newExpedition();
  const dx=-1,y=b.finish ? s.bottom+(s.top-s.bottom)*.70 : s.top-.19;
  const shooter={id:1,state:{x:s.x-2.25*dx,y:y-1.30,z:s.z+.12},life:{hp:100},weapon:1,fireReady:0};
  fire(world,shooter,{aimPitch:0,aimYaw:-Math.PI/2},0,new Map(),[]);
  for(let i=0;i<8;i++)advanceRounds(world,new Map(),[],i);
  assert(world.doors.brokenPanes?.[s.id],p.name+' normal shot breaks selected window '+s.id);
  update(undefined,world.doors);
  assert(m.visible,p.name+' is visible to an outdoor observer after break');
  const level=p.levels[0],wall=level.parts.find(q=>q.kind==='wall');
  const part=m.boxes.findIndex(q=>q.x===wall.x && q.z===wall.z && q.h===wall.h && q.y===wall.bottom+wall.h/2);
  assert(part>=0 && drawn(m,part));
  update(level,world.doors);
  assert(!drawn(m,part),p.name+' detail takes over the occupied floor');
  update(undefined,world.doors);
  assert(drawn(m,part),'exiting restores remote geometry even after pane loss');
  update(undefined,doors);
}
console.log('PASS',panes,'upper facade panes backed by 3D floors across',scene.length,'buildings and',levels,'levels. Normal shots and interior/exterior swaps passed for every building.');
