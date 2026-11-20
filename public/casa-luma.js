// All local elevations are measured from the original limestone court.
const base=.80, ground=.27, upper=3.97, terrace=4.10;
export const villaWings=[
  {id:'villa-gallery',x:-25,z:-405,w:30,d:8,h:7.4,bottom:0},
  {id:'villa-west-wing',x:-36.3,z:-392.5,w:7.4,d:17,h:terrace,bottom:0},
  {id:'villa-east-wing',x:-13.7,z:-392.5,w:7.4,d:17,h:terrace,bottom:0},
];
const [gallery,west,east]=villaWings;
export const casaStair={start:-29,end:-21,z:-407.1,width:1.85,count:20,ground,upper};
export const casaTreads=Array.from({length:casaStair.count},(_,i)=>{
  const run=(casaStair.end-casaStair.start)/casaStair.count;
  return {x:casaStair.start+(i+.5)*run,z:casaStair.z,w:run,d:casaStair.width,
    bottom:ground,h:ground+(i+1)*(upper-ground)/casaStair.count};
});
export const casaBarriers=[],casaSlabs=[],casaWalls=[],casaRails=[],casaFurniture=[],casaRoofGarden=[];
function part(list,p){list.push(p);casaBarriers.push(p);}
function slab(x,z,w,d,bottom,h,level){
  part(casaSlabs,{x,z,w,d,bottom,h,level});
}
for(const wing of villaWings){
  slab(wing.x,wing.z,wing.w+.22,wing.d+.22,0,ground,'ground');
  const roof=wing.h;
  slab(wing.x,wing.z,wing.w+(wing===gallery?-.50:.30),wing.d+(wing===gallery?-.30:.30),roof-.24,roof,wing===gallery?'roof':'terrace');
}
// Keep the north fascia continuous around the open stairwell.
const slotNorth=-409.15,slotSouth=-405.88,slotWest=-29.55,slotEast=-20.45;
function upperPlate(left,right,north,south){
  slab((left+right)/2,(north+south)/2,right-left,south-north,3.45,upper,'upper');
}
upperPlate(-40.15,-9.85,slotSouth,-400.85);
upperPlate(slotWest,slotEast,slotNorth,-408.78);
upperPlate(-40.15,slotWest,slotNorth,slotSouth);
upperPlate(slotEast,-9.85,slotNorth,slotSouth);
// A landing bridges the last half metre between the stair and the main floor.
upperPlate(casaStair.end,slotEast,casaStair.z-casaStair.width/2,casaStair.z+casaStair.width/2);
function rail(x,z,w,d,bottom,h){part(casaRails,{x,z,w,d,bottom,h});}
rail((slotWest+slotEast)/2,slotSouth,slotEast-slotWest,.07,upper,upper+.98);
rail(slotWest,(slotNorth+slotSouth)/2,.07,slotSouth-slotNorth,upper,upper+.98);
for(const end of [-1,1]){
  const z=casaStair.z+end*casaStair.width/2;
  for(const p of casaTreads)casaBarriers.push({...p,z,w:p.w,d:.06,bottom:ground,h:p.h+.88});
  const edge=end<0?slotNorth:slotSouth;
  rail(slotEast,(edge+z)/2,.07,Math.abs(edge-z),upper,upper+.98);
}
for(const wing of [west,east]){
  for(const dx of [-2.4,2.4])part(casaRoofGarden,{kind:'trough',x:wing.x+dx,z:-399.5,w:1.55,d:.72,bottom:terrace,h:terrace+.60});
  for(const dx of [0,1.5])part(casaRoofGarden,{kind:'lounger',x:wing.x+dx,z:-388.1,w:.87,d:1.86,bottom:terrace,h:terrace+.75});
  rail(wing.x,-384.14,7.05,.06,terrace,terrace+.98);
  for(const dx of [-3.53,3.53])rail(wing.x+dx,-392.45,.06,16.6,terrace,terrace+.98);
}
// Wall runs stop at the open sliding bays. Each remaining run is divided into
// glass panes by the renderer, with a single continuous collider for the run.
function facade(alongX,fixed,low,high,bottom,h,doors=[],finish='glass',side=1){
  let start=low;
  for(const [end,next] of [...doors,[high,high]]){
    if(end>start){
      const length=end-start,mid=(start+end)/2,thick=finish==='stone'?.32:.12;
      part(casaWalls,{x:alongX?mid:fixed,z:alongX?fixed:mid,w:alongX?length:thick,
        d:alongX?thick:length,bottom,h,alongX,side,finish});
    }
    start=next;
  }
}
const wingDoors=[[-37.65,-35.25],[-14.95,-12.55]];
for(const [i,b] of [west,east].entries()){
  const side=i? -1:1;
  facade(true,-384.34,b.x-b.w/2,b.x+b.w/2,ground,terrace,[],'stone');
  facade(false,b.x-side*b.w/2,-401,-384,ground,terrace,[],'glass',-side);
  facade(false,b.x+side*b.w/2,-401,-384,ground,terrace,[[-398.4,-396.1],[-388.2,-385.9]],'glass',side);
}
for(const upstairs of [false,true]){
  const bottom=upstairs?upper:ground, h=upstairs?7.4:3.7;
  const left=upstairs?-39.6:-40,right=upstairs?-10.4:-10;
  const north=upstairs?-408.7:-409,south=upstairs?-401.3:-401;
  facade(false,left,north,south,bottom,h,[],'glass',-1);
  facade(false,right,north,south,bottom,h);
  for(const [line,side] of [[north,-1],[south,1]]){
    const doors=side<0?[]:upstairs?wingDoors:[wingDoors[0],[-26.55,-23.45],wingDoors[1]];
    facade(true,line,left,right,bottom,h,doors,'glass',side);
  }
}
// The original deep stone spine is expressed as facade panels around the west passage.
for(const [z,from,to] of [[-409,-37.15,-33.05],[-401,-35.25,-33.05]]){
  facade(true,z,from,to,0,7.28,[],'stone');
}
function furnish(kind,x,z,w,d,bottom,height,facing=-1){
  part(casaFurniture,{kind,x,z,w,d,bottom,h:bottom+height,facing});
}
for(const [kind,x,z,w,d,height,facing] of [
  ['bed',-37.95,-388.8,2.12,2.55,1.18],['nightstand',-39.32,-389.65,.52,.57,.64],
  ['nightstand',-36.54,-389.65,.52,.57,.64],['wardrobe',-38.98,-395.4,1.34,3.1,2.23],
  ['desk',-39.14,-398.83,.76,2.57,.80],['chair',-38.17,-399.14,.66,.67,.94],
  ['kitchen',-11.05,-393.35,.90,8.9,.99],['island',-14,-394.3,1.35,3.12,1.00],
  ['dining',-13.75,-388.4,2.02,1.18,.80],
  ...[-14.4,-13.1].flatMap(x=>[-389.38,-387.42].map(z=>['chair',x,z,.56,.59,.88,Math.sign(z+388.4)])),
  ['sofa',-31.6,-404.9,3.05,.95,.92],['lowTable',-31.6,-403.35,1.85,.74,.43],
  ['console',-15.7,-408.1,3.46,.58,.88],
])furnish(kind,x,z,w,d,ground,height,facing);
for(const [kind,x,z,w,d,height,facing] of [
  ['books',-35.2,-408.05,6.35,.52,2.33],['sofa',-34.1,-405.55,3.05,.95,.92],
  ['lowTable',-34.1,-404,1.85,.74,.43],['desk',-15.25,-406.9,3.4,.92,.82],
  ['chair',-15.7,-408,.65,.65,.95],['console',-24.3,-402.1,3.45,.54,.88],
])furnish(kind,x,z,w,d,upper,height,facing);
export const artScreen={x:-24.3,z:-401.75,w:3.56,d:.12,bottom:upper,h:6.83};
casaBarriers.push(artScreen);
function covers(p,x,z,pad=0){return Math.abs(p.x-x)<=p.w/2+pad && Math.abs(p.z-z)<=p.d/2+pad;}
const nearCasa=(x,z)=>x>=-40.6 && x<=-9.4 && z>=-409.6 && z<=-383.3;
export function casaFloor(x,z,probe){
  if(!nearCasa(x,z))return;
  const stair=casaStair;
  if(Math.abs(z-stair.z)<stair.width/2 && x>=stair.start && x<=stair.end){
    const i=Math.min(stair.count-1,Math.floor((x-stair.start)*stair.count/(stair.end-stair.start)));
    return base+casaTreads[i].h;
  }
  // The walking capsule first touches the rim of a slab a radius before
  // its centre reaches the visible edge, including the patio threshold.
  let top;
  for(const p of casaSlabs){
    if(covers(p,x,z,.32) && (p.level==='ground' || (Number.isFinite(probe) && probe>=base+p.h+.25))){
      top=Math.max(top??0,base+p.h);
    }
  }
  return top;
}
export function casaCeiling(x,y,z){
  if(!nearCasa(x,z))return Infinity;
  let ceiling=Infinity;
  for(const p of casaSlabs)if(p.level!=='ground' && y<base+p.bottom && covers(p,x,z,.32))ceiling=Math.min(ceiling,base+p.bottom);
  return ceiling;
}
export function casaRoomAt(x,y,z){
  if(!nearCasa(x,z) || y<base-.05)return;
  return villaWings.find(b=>covers(b,x,z) && y<base+b.h-.02);
}
