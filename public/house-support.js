import {MAP} from './world.js';
import {visitRoadPodium} from './frontage-glass.js';
import {cutGrid} from './tank-wall-cuts.js';
import {homeById} from './residential-sites.js';

const cache=new Map();
const cell=(x,z)=>{
  const i=Math.floor((x-cutGrid.west)/cutGrid.size),j=Math.floor((z-cutGrid.north)/cutGrid.size);
  return i>=0 && i<cutGrid.width && j>=0 && j<cutGrid.height ? j*cutGrid.width+i : null;
};

// Count only lower-storey solids. Storefront and window panes have their own
// collision rectangles, but a pane can never hold the floors above it.
export function houseSupportCells(id){
  if(cache.has(id))return cache.get(id);
  const home=homeById(id),cells=new Set();
  if(!home)return cells;
  const inside=(x,z)=>home.parts.some(p=>Math.abs(x-p.x)<p.w/2+.35 && Math.abs(z-p.z)<p.d/2+.35);
  function add(box){
    if(box.face || box.paneId || box.sillPaneId || box.kind==='glass' || box.piece || box.fixedFixture)return;
    if(box.bottom!=null && box.bottom>cutGrid.high-.8)return;
    const size=cutGrid.size;
    for(let x=Math.floor((box.x-box.w/2-cutGrid.west)/size);x<=Math.floor((box.x+box.w/2-cutGrid.west)/size);x++)
      for(let z=Math.floor((box.z-box.d/2-cutGrid.north)/size);z<=Math.floor((box.z+box.d/2-cutGrid.north)/size);z++){
        const cx=cutGrid.west+(x+.5)*size,cz=cutGrid.north+(z+.5)*size;
        if(inside(cx,cz) && cx+size/2>box.x-box.w/2 && cx-size/2<box.x+box.w/2 && cz+size/2>box.z-box.d/2 && cz-size/2<box.z+box.d/2){
          const id=cell(cx,cz);if(id!=null)cells.add(id);
        }
      }
  }
  for(const p of home.parts){
    const b=MAP.buildings.find(b=>b.x===p.x && b.z===p.z && b.finish);
    if(b)for(const x of [b.x-b.w/2,b.x+b.w/2])visitRoadPodium(b,x,b.z,{},add,b.w+b.d);
  }
  for(const box of MAP.barriers)if(box.kind && box.kind!=='glass' && inside(box.x,box.z))add(box);
  if(!cells.size)for(const p of home.parts){
    for(const x of [p.x-p.w/2,p.x+p.w/2])add({x,z:p.z,w:.18,d:p.d});
    for(const z of [p.z-p.d/2,p.z+p.d/2])add({x:p.x,z,w:p.w,d:.18});
  }
  if(id.startsWith('harbor-')){
    // Storefront and furnishing solids fill the middle of a Harbor plot, but
    // the roof is carried by its shell. Count only perimeter supports so
    // repeated hits along the reachable facades can finish demolition.
    for(const p of home.parts){
      for(const x of [p.x-p.w/2,p.x+p.w/2])add({x,z:p.z,w:.18,d:p.d});
      for(const z of [p.z-p.d/2,p.z+p.d/2])add({x:p.x,z,w:p.w,d:.18});
    }
    for(const id of cells){
      const x=cutGrid.west+(id%cutGrid.width+.5)*cutGrid.size;
      const z=cutGrid.north+(Math.floor(id/cutGrid.width)+.5)*cutGrid.size;
      if(!home.parts.some(p=>Math.abs(Math.abs(x-p.x)-p.w/2)<cutGrid.size*1.4 ||
        Math.abs(Math.abs(z-p.z)-p.d/2)<cutGrid.size*1.4))cells.delete(id);
    }
  }
  cache.set(id,cells);
  return cells;
}

export function houseLostSupport(doors,id){
  const cells=houseSupportCells(id);
  if(!cells.size)return false;
  const cut=new Set(doors.tankWallCuts??[]);
  let standing=0;
  for(const cell of cells)if(!cut.has(cell))standing++;
  if(id.startsWith('harbor-')){
    // Several complete track lanes can shear the core while corner piers
    // still stand. Count that lower-storey damage as well as shell support.
    const p=homeById(id).parts[0];
    const limit=Math.ceil(p.w*p.d*.4/cutGrid.size**2);
    let damaged=0;
    for(const cell of cut){
      const x=cutGrid.west+(cell%cutGrid.width+.5)*cutGrid.size;
      const z=cutGrid.north+(Math.floor(cell/cutGrid.width)+.5)*cutGrid.size;
      if(Math.abs(x-p.x)<p.w/2 && Math.abs(z-p.z)<p.d/2 && ++damaged>=limit)return true;
    }
  }
  // The upper floor cannot balance on a few isolated posts after most of its
  // perimeter has been sheared away by the tracks.
  return standing/cells.size<=.35;
}
