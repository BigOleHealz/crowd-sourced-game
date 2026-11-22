import {hotelShaft} from './hotel-lifts.js';
import {fanHall,arcade,supper,tower,bridge,fanDecks,arcadeDecks,supperDeck,bridgeDeck,atriumVoid,levelY,floorNames,rect,inside,pool,poolTerrace,doors,falls} from './palma-site.js';

export const grandStoryY=n=>levelY[n]??100.8;
export const grandTop=100.8, GRAND_STORIES=levelY.length;
export const floorIndex=y=>levelY.findLastIndex(floor=>floor<=y+.015);
export const grandShaft=hotelShaft(-83.1,54.85,Math.PI);
export const lifts=[
  {id:25,name:'Palma de Sal',shaft:grandShaft,stops:levelY},
  {id:141,name:'Palma de Sal · Guest lift II',shaft:hotelShaft(-80.3,54.85,Math.PI),stops:levelY},
  {id:142,name:'Palma de Sal · Service lift',shaft:hotelShaft(-76.1,59.35,Math.PI),stops:levelY},
  {id:143,name:'Salt Arcade',shaft:hotelShaft(-53.7,72.95,0),stops:[.8,6.8,11.8]},
];
export const penthousePool={...pool,water:96.30};
const poolDepth=z=>Math.min(1.3,.18+.18*Math.floor(Math.max(0,pool.z+pool.d/2-z)/.5));
export function poolSurface(x,y,z){if(inside(pool,x,z) && y>94.7)return penthousePool.water;}
export const resortLevels=levelY.map((y,n)=>({n,y,name:floorNames[n],parts:[],decks:[],stairs:[]}));
export const finishes={stone:0xe3d2b6,bronze:0xb68b50,green:0x477567,glass:0x86c2bd,oak:0xa67a54,
  cream:0xf4e8cb,rose:0xac776b,dark:0x344844,water:0x6dcac4,light:0xffde99};
const C=finishes;
function cut(r,hole){
  const x=r.x-r.w/2,X=x+r.w,z=r.z-r.d/2,Z=z+r.d;
  const a=Math.max(x,hole.x-hole.w/2),b=Math.min(X,hole.x+hole.w/2),c=Math.max(z,hole.z-hole.d/2),d=Math.min(Z,hole.z+hole.d/2);
  if(a>=b || c>=d)return [r];
  return [rect(x,z,a,Z),rect(b,z,X,Z),rect(a,z,b,c),rect(a,d,b,Z)].filter(i=>i.w>.001 && i.d>.001);
}
export const deskPosition={x:-83.1,z:50.05};
export function suiteDoors(n){
  if(n>=5 && n<=20)return [39.5,49.5].map((z,i)=>({x:-77,z,axis:'z',width:1.6,label:'Suite '+((n+1)*100+i+1)}));
  if(n>=21 && n<23)return [{x:-79.2,z:51.7,axis:'x',width:2,label:'Penthouse vestibule'}];
  return [];
}
function layout(l){
  const {y,n}=l,ceiling=grandStoryY(n+1),height=ceiling-y;
  function put(kind,x,z,w,d,base,h,color){
    if(kind!=='glass'){l.parts.push({kind,x,z,w,d,base,h,color});return;}
    // Solid reveals, spandrels and independent inset lights of glass share one collision layout.
    const horizontal=w>d,length=horizontal?w:d;
    const hall=n<5 && z<=62 && x<=-69;
    const suite=n>=5;
    const clear=hall && (x===-69 || z===35.5 || z===52) || (!suite && z>76 && z<91 && x<-58);
    const solidCore=suite && x===-74 && z>48 || hall && (z===32 || z===62);
    const band=(type,u,length,y,height,depth,tint)=>{
      if(length<.002 || height<.002)return;
      const part={kind:type,x:x+(horizontal?u:0),z:z+(horizontal?0:u),w:horizontal?length:depth,d:horizontal?depth:length,base:y,h:height,color:tint,facade:true};
      if(type==='glass')part.paneId='palma-'+n+'-'+l.parts.length;
      l.parts.push(part);
    };
    if(solidCore || h<1.15){band('stoneBand',0,length,base,h,.28,C.stone);return;}
    const sill=clear?.09:suite?.87:.63,head=clear?.20:suite?.60:.76;
    band('stoneBand',0,length,base,sill,.35,C.stone);
    band('stoneBand',0,length,base+h-head,head,.39,C.stone);
    const count=Math.max(1,Math.ceil(length/(suite?4.65:3.8))),bay=length/count;
    const post=Math.min(bay*.3,clear?.085:suite?.73:.48);
    for(let i=0;i<count;i++){
      const u=(i+.5)*bay-length/2,y=base+sill,height=h-sill-head;
      band('jamb',u-bay/2+post/4,post/2,y,height,clear?.15:.38,clear?C.bronze:C.stone);
      band('glass',u,bay-post,y,height,.045,C.glass);
      band('jamb',u+bay/2-post/4,post/2,y,height,clear?.15:.38,clear?C.bronze:C.stone);
    }
  }
  const item=(kind,x,z,w,d,h,color,dy=0)=>put(kind,x,z,w,d,y+dy,h,color);
  function wall(a,b,base,top,openings=[],kind='glass'){
    const along=a[1]===b[1],fixed=along?a[1]:a[0],axis=along?'x':'z',low=Math.min(a[along?0:1],b[along?0:1]),high=Math.max(a[along?0:1],b[along?0:1]);
    const gaps=openings.filter(g=>g.axis===axis && Math.abs((along?g.z:g.x)-fixed)<.01 && (along?g.x:g.z)>low && (along?g.x:g.z)<high).sort((a,b)=>a[axis]-b[axis]);
    function segment(start,end,lo,hi){
      if(end-start<.001 || hi<=lo)return;
      put(kind,along?(start+end)/2:fixed,along?fixed:(start+end)/2,along?end-start:.16,along?.16:end-start,lo,hi-lo,kind==='glass'?C.glass:C.stone);
    }
    let pos=low;
    for(const g of gaps){
      const half=g.width/2,mid=g[axis];segment(pos,mid-half,base,top);
      segment(mid-half,mid+half,Math.min(top,base+(g.head??2.8)),top);pos=mid+half;
    }
    segment(pos,high,base,top);
  }
  function shell(vertices,base,top,openings){vertices.forEach((p,i)=>wall(p,vertices[(i+1)%vertices.length],base,top,openings));}
  function slabs(rects,holes,base,role){
    for(const r of holes.reduce((arr,h)=>arr.flatMap(p=>cut(p,h)),rects)){
      l.decks.push({...r,y:base,role});
      put('slab',r.x,r.z,r.w,r.d,base-.22,.22,C.cream);
    }
  }
  // Two returning flights meet on a full-width landing. Floor support samples
  // the stepped deck under the feet; the camera sees the same tread elevations.
  function staircase(x,z,w,d,lo,hi){
    const midX=x+w/2,run=d-2.4,steps=Math.ceil((hi-lo)/.36);
    function tread(x0,z0,x1,z1,top){
      const r=rect(x0,z0,x1,z1);
      l.stairs.push({...r,y:top});put('tread',r.x,r.z,r.w,r.d,top-.12,.12,C.stone);
    }
    tread(x,z,x+w,z+1.2,lo);tread(x,z+d-1.2,x+w,z+d,(lo+hi)/2);
    for(let i=0;i<steps;i++){
      const near=z+1.2+i*run/steps,far=near+run/steps,dy=(hi-lo)/(steps*2);
      tread(x,near,midX,far,lo+(i+1)*dy);
      tread(midX,near,x+w,far,hi-i*dy);
    }
  }
  const westStair=rect(-88.45,54,-85.05,62),saltStair=rect(-52,70,-48.5,75.9);
  if(n<23)staircase(-88.45,54,3.4,8,y,ceiling);
  if(n>0)l.stairs.push({...rect(-88.45,54,-85.05,55.2),y});
  if(n<2)staircase(-52,70,3.5,5.9,n?y:.8,ceiling);
  if(n===2)l.stairs.push({...rect(-52,70,-48.5,71.2),y});
  const holes=lifts.slice(0,3).map(({shaft:s})=>rect(s.x-1,s.z-1,s.x+1,s.z+1));
  const upper=n>=5,gal=n>0 && n<5;
  const galleryDoor={x:-71.35,z:52,axis:'x',width:3.3};
  slabs(upper?[fanDecks[0]]:fanDecks,[...holes,...(n?[westStair]:[]),...(gal?[atriumVoid]:[]),...(n===23?[pool]:[])],y,'hall');
  shell(upper?tower:fanHall,y,ceiling,!n?[doors.lobby,doors.quay,{x:-74,z:57,width:2.4,axis:'z'}]:n<3?[galleryDoor]:n===23?[{x:-74,z:42.5,width:4.8,axis:'z',head:3.5}]:[]);
  if(gal){
    const v=atriumVoid;for(const sign of [-1,1]){
      item('rail',v.x,v.z+sign*v.d/2,v.w,.10,1.1,C.bronze);
      item('rail',v.x+sign*v.w/2,v.z,.10,v.d,1.1,C.bronze);
    }
    if(n===1)for(let i=0;i<5;i++)item('slot',-86.4+i,35.9,.76,.78,1.65,C.dark);
    if(n===2)item('bar',-85.3,34.6,4.6,1,1.1,C.oak);
    if(n>=3)item('sofa',-84.6,34.4,4.2,.85,.92,C.green);
  }
  if(n<3){
    const base=n?y:.8,roof=n===2?16.8:grandStoryY(n+1);
    slabs(arcadeDecks,[rect(-54.7,71.95,-52.7,73.95),...(n?[saltStair]:[])],base,'arcade');
    shell(arcade,base,roof,n?[{...galleryDoor,z:70}]:[doors.arcadeWest,doors.arcadeNorth,doors.arcadeEast,doors.arcadeBay,{x:-62.4,z:70,width:2.1,axis:'x'}]);
    if(n){
      slabs([bridgeDeck],[],y,'bridge');
      for(const x of [-73,-69.7])put('glass',x,61,.12,18,y,3.3,C.glass);
      put('slab',-71.35,61,3.3,18,y+3.3,.2,C.cream);
    }
    if(!n){
      slabs([supperDeck],[],.8,'supper');shell(supper,.8,5.2,[doors.dining,doors.diningBay,{x:-11.8,z:66.5,axis:'x',width:1.8}]);
      put('slab',-18.5,71.875,19,10.75,5,.2,C.cream);
      for(const x of [-25,-20,-15,-11])put('dining',x,74.7,1.3,1.3,.8,.78,C.oak);
      put('bar',-22.5,68.2,6.3,.85,.8,1.05,C.green);
      wall([-15,66.5],[-15,71.7],.8,4.2,[],'wall');
      wall([-15,71.7],[-9,71.7],.8,4.2,[{x:-12,z:71.7,axis:'x',width:1.4}],'wall');
    }
    if(n===2){
      const pokerDoor={x:-58.3,z:83,axis:'z',width:2.4};
      wall([-72.7,76.1],[-58.3,76.1],y,y+3.4);
      wall([-58.3,76.1],[-58.3,90.8],y,y+3.4,[pokerDoor]);
      wall([-58.3,90.8],[-72.7,90.8],y,y+3.4);
      for(const x of [-69.3,-62])for(const z of [79.5,86])put('poker',x,z,2.9,1.8,base,.86,C.green);
      for(const r of arcadeDecks)put('slab',r.x,r.z,r.w,r.d,16.6,.2,C.cream);
    }else{
      for(const x of n?[-44]:[-68,-59.6,-51.2])for(const z of [80.2,86.2]){
        if(!n && x===-68 && z===80.2)continue; // The live table has its own detailed mesh.
        put('table',x,z,2.5,1.5,base,.91,C.green);
      }
      for(const x of n?[-68.5,-62.4,-56.3]:[-46.8,-43.08])for(const z of [79,85])
        for(let i=0;i<4;i++)put('slot',x+i*.93,z,.72,.8,base,1.68,C.dark);
    }
    put('bar',-64.4,90.1,7,.86,base,1.12,C.oak);
    for(const x of [-69,-61,-53,-45])put('sofa',x,93.4,2.8,.8,base,.94,C.green);
  }
  if(!n){
    put('stage',-86.35,43.975,3.8,7.15,y,.55,C.oak);
    for(const z of falls)put('basin',-87.05,z,2.3,2,y,.24,C.green);
    for(const z of [39.625,48.675])put('basin',-74.725,z,3.15,.65,y,.18,C.green);
    for(const x of [-81.7,-80.45,-79.2,-77.95])for(const z of [41,41.85,42.7,43.55,44.85,45.7,46.55,47.4])
      item('chair',x,z,.62,.58,.86,C.green);
    item('desk',-83.1,51.05,3.4,.68,1.08,C.oak);
  }
  if(n===0){
    wall([-88.5,36.2],[-81.9,36.2],y,5.15,[{x:-84,z:36.2,axis:'x',width:1.6}],'wall');
    wall([-81.9,32],[-81.9,36.2],y,5.15,[],'wall');
  }
  if(n>=5 && n<=20){
    for(const z of [32,42]){
      wall([-77,z],[-77,z+10],y,ceiling,suiteDoors(n),'wall');
      wall([-88.5,z+10],[-77,z+10],y,ceiling,[],'wall');
      wall([-82.95,z],[-82.95,z+5.3],y,ceiling,[{x:-82.95,z:z+4,axis:'z',width:1.5}],'wall');
      wall([-82.95,z+5.3],[-77,z+5.3],y,ceiling,[{x:-80.3,z:z+5.3,axis:'x',width:1.5}],'wall');
      item('bed',-86.4,z+2.5,2.05,2.15,.62,C.cream);
      item('sofa',-86.3,z+8.35,2.65,1,.93,C.green);
      item('dining',-82.6,z+7.2,1.5,1.5,.76,C.oak);
      item('bath',-82.1,z+1.65,1,1.95,.62,C.glass);
      item('basin',-80.8,z+4.55,1.4,.58,.84,C.cream);
      item('wardrobe',-77.55,z+9.0,.8,1.45,2.32,C.oak);
    }
  }
  if(n>=21){
    const entrance=n===23?[{x:-80.2,z:51.7,width:8.5,axis:'x',head:3.7}]:suiteDoors(n);
    wall([-88.5,51.7],[-74,51.7],y,ceiling,entrance,'wall');
    if(n===21){
      item('bar',-85.2,33.1,5.5,.95,1.06,C.oak);
      item('banquet',-83.5,38,3.7,1.30,.8,C.oak);
      item('cocktail',-85.1,45.7,2.1,1.05,.42,C.cream);
      item('sofa',-87.3,44.3,1.0,2.7,.90,C.green);
      item('chaise',-76.6,36.6,1.05,2,.8,C.rose);
      item('console',-75.01,46.9,.63,3.6,1.04,C.oak);
    }
    if(n===22){
      item('bed',-86,43.4,2.35,2.25,.68,C.cream);item('bath',-86.6,34.5,1.5,2.35,.66,C.glass);
      wall([-88.5,39.2],[-81,39.2],y,ceiling,[{x:-84.5,z:39.2,axis:'x',width:1.5}],'wall');
      wall([-81,32],[-81,39.2],y,ceiling,[{x:-81,z:36.8,width:1.65,axis:'z'}],'wall');
      wall([-78.5,39.2],[-74,39.2],y,ceiling,[{x:-76.35,z:39.2,width:1.55,axis:'x'}],'wall');
      item('wardrobe',-74.7,35.8,.90,5.3,2.57,C.oak);
      item('wardrobe',-79.7,33.0,2.4,.82,2.57,C.oak);
      item('basin',-83.6,32.65,2.7,.8,.89,C.stone);
      item('console',-76.7,44.7,2.1,.63,.85,C.oak);
      for(const x of [-87.78,-84.18])item('cocktail',x,42.65,.67,.62,.64,C.oak);
    }
    item('sofa',-85.5,47.8,3.1,1,.92,C.green);
    if(n===23){
      slabs([poolTerrace],[pool],y,'terrace');
      for(const [ax,az,bx,bz] of [[-74,30.25,-64.6,30.25],[-64.6,30.25,-64.6,45.3],[-74,45.3,-64.6,45.3],[-74,30.25,-74,32]]){
        const along=az===bz;
        put('balustrade',(ax+bx)/2,(az+bz)/2,along?bx-ax:.2,along?.2:bz-az,y,1.08,C.stone);
      }
      item('daybed',-77.4,35.8,2.8,2.3,2.7,C.cream);
      item('bar',-84.9,34.1,4.5,.84,1.05,C.oak);
      for(const x of [-71.3,-68.5])item('chaise',x,43.3,.92,2.0,.75,C.cream);
      item('cocktail',-69.92,43.45,.70,.70,.44,C.green);
      for(let i=0;i<14;i++){
        const z=pool.z-pool.d/2+(i+.5)*.5;put('poolBed',pool.x,z,pool.w,.5,y-poolDepth(z)-.12,.12,C.glass);
      }
      put('slab',-81.25,47,14.5,30,100.6,.2,C.cream);
    }
  }
}
resortLevels.forEach(layout);
const machines=resortLevels.slice(0,3).flatMap(l=>l.parts.filter(p=>p.kind==='slot'));
export function slotAt(feet){
  if(feet.x< -89 || feet.x> -35 || feet.z<32 || feet.z>92 || feet.y>12.3)return;
  let best,range=1.22;
  for(const [i,m] of machines.entries()){
    if(Math.abs(feet.y-m.base)>.45 || feet.z<m.z+.2)continue;
    const d=Math.hypot(feet.x-m.x,feet.z-(m.z+.87));if(d<range){range=d;best=i;}
  }
  return best;
}
export function resortLevelAt(x,y,z){
  if(y<.48 || y>=grandTop)return;
  const n=Math.max(0,floorIndex(y+.2)),level=resortLevels[n];
  if(n>=22 && inside(pool,x,z) && y>=94.8)return resortLevels[23];
  if(level.decks.some(r=>inside(r,x,z) && y>=r.y-.32 && (r.role!=='supper'||y<5.2)))return level;
  if(n<5 && inside(atriumVoid,x,z))return resortLevels[0];
}
export function resortRoofAbove(x,z,n){
  if(n===23 && inside(poolTerrace,x,z))return Infinity;
  if(inside(supperDeck,x,z))return 5;
  if(inside(bridgeDeck,x,z))return grandStoryY(n)+3.3;
  if(arcadeDecks.some(r=>inside(r,x,z)))return n===2?16.6:grandStoryY(n+1)-.22;
  return n<5 && inside(atriumVoid,x,z)?26.58:grandStoryY(n+1)-.22;
}
export function resortSupport(x,z,probe){
  if(!Number.isFinite(probe)||x< -89||x> -9||z<30.25||z>95)return;
  const n=Math.max(0,floorIndex(probe+.01));
  if(n===23 && inside(pool,x,z))return levelY[n]-poolDepth(z);
  let tread;
  for(let j=Math.max(0,n-1);j<=n;j++)for(const r of resortLevels[j].stairs)
    if(r.y<=probe+.01 && inside(r,x,z))tread=Math.max(tread??-Infinity,r.y);
  if(tread!==undefined)return tread;
  for(let j=n;j>=0;j--){
    const r=resortLevels[j].decks.find(r=>r.y<=probe+.03 && inside(r,x,z));
    if(r)return r.y;
  }
}
const cells=new Map(),key=(x,z)=>x*128+z;
for(const l of resortLevels)for(const p of l.parts){
  for(let i=Math.floor((p.x-p.w/2)/6);i<=Math.floor((p.x+p.w/2)/6);i++)
    for(let j=Math.floor((p.z-p.d/2)/6);j<=Math.floor((p.z+p.d/2)/6);j++){
      const k=key(i,j);if(!cells.has(k))cells.set(k,[]);cells.get(k).push(p);
    }
}
// Walking and sight rays ask for the highest reachable surface at one point.
// Floor bases exclude everything upstairs; the cumulative tops let a hit
// exclude lower floors even when a tall part spans several storeys.
const heightCells=new Map();
for(const [k,parts] of cells){
  const byBase=[...parts].sort((a,b)=>a.base-b.base);
  const highest=new Float64Array(byBase.length);
  let top=-Infinity;
  for(let i=0;i<byBase.length;i++)highest[i]=top=Math.max(top,byBase[i].base+byBase[i].h);
  heightCells.set(k,{byBase,highest});
}
// Bounds limit a sweep to the affected structural bays, including raised hotel windows.
export function visitResortSolids(a,d,broken,visit){
  if(Math.max(a.x,a.x+d.x)<-90 || Math.min(a.x,a.x+d.x)>-8 ||
     Math.max(a.z,a.z+d.z)<30 || Math.min(a.z,a.z+d.z)>96)return;
  const lo=Math.min(a.y,a.y+d.y),hi=Math.max(a.y,a.y+d.y);
  const seen=new Set();
  for(let i=Math.floor(Math.max(-90,Math.min(a.x,a.x+d.x))/6);i<=Math.floor(Math.min(-8,Math.max(a.x,a.x+d.x))/6);i++)
    for(let j=Math.floor(Math.max(30,Math.min(a.z,a.z+d.z))/6);j<=Math.floor(Math.min(96,Math.max(a.z,a.z+d.z))/6);j++)
      for(const p of cells.get(key(i,j))??[]){
        if(p.base+p.h<lo || p.base>hi || broken?.[p.paneId] || seen.has(p))continue;
        seen.add(p);visit(p);
      }
}
export function grandTopAt(x,z,pad,probe,doors){
  let top=-Infinity;
  for(let i=Math.floor((x-pad)/6);i<=Math.floor((x+pad)/6);i++)
    for(let j=Math.floor((z-pad)/6);j<=Math.floor((z+pad)/6);j++){
      const cell=heightCells.get(key(i,j));
      if(!cell)continue;
      const {byBase,highest}=cell;
      let lo=0,hi=byBase.length;
      while(lo<hi){
        const mid=(lo+hi)>>>1;
        if(probe>=byBase[mid].base-.001)lo=mid+1;else hi=mid;
      }
      for(let k=lo-1;k>=0 && highest[k]>top;k--){
        const p=byBase[k];
        if(doors?.brokenPanes?.[p.paneId])continue;
        if(inside(p,x,z,p.kind==='slab'||p.kind==='tread'||p.kind==='poolBed'?0:pad))top=Math.max(top,p.base+p.h);
      }
    }
  return top;
}
