import {hotelShaft} from './hotel-lifts.js';
// Dimensions in world metres. Changing a storey affects simulation, landmark and architecture together.
export const GRAND_STORIES=20, GRAND_STEP=3.60, GRAND_BASE=.80;
export const grandStoryY=n=>GRAND_BASE+n*GRAND_STEP;
const lobbyBounds={x:-59,z:47,w:26,d:16};
// The north hotel has 1.45 m wrap balconies beyond its z=38.35 facade.
export const upperNorth=40.58;
export const hallBounds={x:-59,z:(upperNorth+55)/2,w:26,d:55-upperNorth};
export const bridgeBounds={x:-56,z:63.65,w:12,d:17.30};
export const grandShaft=hotelShaft(-59,41.56,0);
export const grandLift={x:grandShaft.frontX,z:grandShaft.frontZ,exitX:grandShaft.exitX,exitZ:grandShaft.exitZ};
export const atrium={west:-61.25,east:-49.10,north:46.45,south:55};
export const grandLobbyOpening={x:-72,z:46.5,width:2.60};
export const grandTop=grandStoryY(GRAND_STORIES);
export function inRect(b,x,z,pad=0){return Math.abs(x-b.x)<=b.w/2+pad && Math.abs(z-b.z)<=b.d/2+pad;}
const rect=(x,z,w,d)=>({x,z,w,d});
const frontLeft=(atrium.west+72)/2, frontRight=(-46+atrium.east)/2;
const balconyDecks=[
  rect(-59,(upperNorth+atrium.north)/2,26,atrium.north-upperNorth),
  rect(frontLeft,(55+atrium.north)/2,72+atrium.west,55-atrium.north),
  rect(frontRight,(55+atrium.north)/2,-46-atrium.east,55-atrium.north),
];
export const resortLevels=Array.from({length:GRAND_STORIES},(_,n)=>{
  const gallery=n>0 && n<5, joined=n>=9;
  const y=grandStoryY(n);
  const name=({17:'Penthouse · Grand Salon',18:'Penthouse · Private Suites',19:'Penthouse · Pool Terrace'})[n]??['Gaming floor','Crystal Slots','Poker Gallery','Sapphire Promenade','Orchid Lounge'][n]??(n===19?'Crown Penthouses':'Hotel Suites');
  const decks=!n?[lobbyBounds]:gallery?balconyDecks:joined?[hallBounds,bridgeBounds]:[hallBounds];
  return {n,y,name,decks,gallery,joined};
});
export function resortLevelAt(x,y,z,tolerance=.16){
  const n=Math.floor((y-GRAND_BASE+tolerance)/GRAND_STEP),l=resortLevels[n];
  if(l?.decks.some(deck=>inRect(deck,x,z)))return l;
  // An airborne player can be above the first floor inside the uninterrupted atrium.
  if(n>=0 && n<5 && inRect(lobbyBounds,x,z))return resortLevels[0];
}
export function resortRoofAbove(x,z,n){
  if(n===18 && inRect(penthousePool,x,z))return grandStoryY(19)-1.63;
  return !n && x>atrium.west && x<atrium.east && z>atrium.north?grandStoryY(5):grandStoryY(n+1);
}
export const skyRooms=n=>n<5?[]:[
  {x:-66.45,z:47,w:10.55,d:15.60,doorX:-60.95,doorZ:47,side:-1},
  {x:-51.50,z:47,w:10.36,d:15.60,doorX:-57.05,doorZ:47,side:1},
  ...(n>=9?[{x:-54.7,z:67.20,w:8.8,d:9.80,doorX:-56,doorZ:62.15,side:0}]:[]),
];
export function piecesForResortLevel(level){
  const {n,gallery}=level;
  const parts=[];
  const add=(x,z,w,d,bottom,h,kind,color)=>parts.push({x,z,w,d,bottom,h,kind,color});
  const wall=(x,z,w,d)=>add(x,z,w,d,0,GRAND_STEP-.12,'wall',0xd2bb9e);
  if(n===0)return parts;
  if(gallery){
    // The balcony edges have continuous rails; the lower hall remains open to the chandelier.
    add((atrium.west+atrium.east)/2,atrium.north,atrium.east-atrium.west,.10,0,1.12,'rail',0xd5a659);
    for(const x of [atrium.west,atrium.east])add(x,(atrium.north+55)/2,.10,55-atrium.north,0,1.12,'rail',0xd5a659);
    if(n===1){
      for(const x of [-69.4,-67.9,-66.4,-64.9,-53.5,-52,-50.5,-49]){
        add(x,41.22,.90,1.04,0,2.30,'slot',0x41cecf);
        add(x,42.34,.55,.55,0,.77,'stool',0x7d434e);
      }
    }
    if(n>2)for(const z of [49.1,52.6])add(-69.6,z,2.55,.88,0,.90,'sofa',n===1?0x65384f:0x417078);
    return parts;
  }
  if(n>=17){
    // The three top levels share a lift and open into a living floor, a private
    // sleeping floor and a pool terrace. Keep the entire entry axis clear.
    if(n===17){
      for(const x of [-66,-52]){
        add(x,48.5,3.2,.95,0,1.00,'sofa',0x92a99f);
        add(x,46.8,1.9,.75,0,.48,'coffee',0xab8260);
        add(x,42.2,1.55,.65,0,.93,'writing',0x986d46);
      }
      add(-54.9,66.5,3.1,1.38,0,.9,'dining',0xb39872);
    }else if(n===18){
      for(const x of [-67,-51]){
        add(x,44.3,2.7,2.55,0,.73,'bed',0xc1ab90);
        for(const side of [-1,1])add(x+side*1.78,43.7,.72,.71,0,.77,'nightstand',0x9d7d4d);
        add(x,50.6,2.2,.83,0,.96,'sofa',0x87686e);
      }
      for(const r of skyRooms(n).filter(r=>r.side)){
        wall(r.doorX,(upperNorth+46.30)/2,.13,46.30-upperNorth);
      wall(r.doorX,51.34,.13,7.30);
        add(r.doorX,47,.13,1.38,2.12,GRAND_STEP-2.24,'wall',0xc5b59d);
      }
      add(-54.6,66.2,3.1,.9,0,1,'sofa',0x816458);
    }else{
      for(const z of [43,50.6]){
        add(-67,z,2.9,.94,0,.99,'sofa',0x426864);
        add(-67,z+1.35,1.6,.67,0,.48,'coffee',0xc3a57b);
      }
      add(-51.2,44.1,2.56,1.08,0,.95,'dining',0xb78d5d);
      for(const x of [-60.8,-51.25])for(const z of [64.5,69.4])add(x,z,.69,1.69,0,.44,'chaise',0xe6d9bb);
    }
    return parts;
  }
  const gold=0xb99355;
  for(const r of skyRooms(n)){
    if(r.side){
      wall(r.doorX,(upperNorth+46.30)/2,.13,46.30-upperNorth);
      wall(r.doorX,51.34,.13,7.30);
      add(r.doorX,47,.13,1.38,2.12,GRAND_STEP-2.24,'wall',0xc5b59d);
    }else{
      wall(-59.65,r.doorZ,4.70,.14);wall(-52.35,r.doorZ,4.70,.14);
      add(-56,r.doorZ,2.60,.14,2.12,GRAND_STEP-2.24,'wall',0xc5b59d);
    }
    const x=r.x,z=r.z;
    if(r.side)add(x,z-3.54,4.56,.155,0,2.51,'headwall',0x705042);
    add(x,z-2.25,2.03,2.23,0,.62,'bed',n%3?0x9cb4a1:0x9daebe);
    for(const side of [-1,1])add(x+side*1.41,z-2.84,.58,.62,0,.70,'nightstand',gold);
    add(x-1.3,z+2.8,2.4,.83,0,.94,'sofa',r.side===1?0x5a737c:0x935b54);
    add(x-1.30,z+1.34,1.27,.62,0,.45,'coffee',0x936a51);
    add(x+2.05,z+2.37,1.20,.55,0,.84,'writing',0xad8357);
  }
  return parts;
}
export const grandFurniture=resortLevels.map(piecesForResortLevel);

export const penthousePool={x:-55.9,z:66.35,w:7.2,d:6.2,water:grandStoryY(19)-.10};
export const poolDepthAt=(z)=>Math.min(1.42,.22*(1+Math.floor(Math.max(0,z-(penthousePool.z-penthousePool.d/2))/.46)));
export function poolSurface(x,y,z){
  return y>=penthousePool.water-1.9 && inRect(penthousePool,x,z)?penthousePool.water:undefined;
}
export const deckAt=(level,x,z)=>level.decks.some(b=>inRect(b,x,z));
export function resortSupport(x,z,probe){
  if(!Number.isFinite(probe) || x<-72 || x>-46 || z<39 || z>72.30)return;
  const n=Math.min(GRAND_STORIES-1,Math.floor((probe-GRAND_BASE+.01)/GRAND_STEP));
  if(n<1 || probe>=grandTop-.001)return;
  const level=resortLevels[n];
  if(!deckAt(level,x,z))return;
  return n===19 && inRect(penthousePool,x,z)?level.y-poolDepthAt(z):level.y;
}

function shellForLevel(level){
  const {n,gallery,joined}=level;
  if(!n)return [];
  const shell=[];
  const put=(x,z,w,d,bottom=0,h=GRAND_STEP,kind='window')=>shell.push({x,z,w,d,bottom,h,kind});
  put(-72,hallBounds.z,.17,hallBounds.d);put(-46,hallBounds.z,.17,hallBounds.d);put(-59,upperNorth,26,.17);
  if(joined){
    put(-67,55,10,.17);put(-48,55,4,.17);
    const fence=n===19;
    for(const x of [-62,-50])put(x,63.65,.17,17.3,0,fence?1.05:GRAND_STEP,fence?'rail':'window');
    put(-56,72.3,12,.17,0,fence?1.05:GRAND_STEP,fence?'rail':'window');
  }else{
    put(-59,55,26,.17);
  }
  return shell;
}
export const grandShells=resortLevels.map(shellForLevel);
const grandSolids=grandShells.map((shell,i)=>[...shell,...grandFurniture[i]]);
// Walkable surfaces and furniture share the same metre-height inputs as the renderer.
// Check the occupied floor and its neighbours rather than walking twenty stories of furniture.
export function grandTopAt(x,z,pad,probe){
  const pier=hotelPiers.find(p=>inRect(p,x,z,pad));
  const pierTop=pier && probe>=.68 ? pier.h : -Infinity;
  if(x<-72.25-pad || x>-45.75+pad || z<38.75-pad || z>72.55+pad)return pierTop;
  const n=Number.isFinite(probe)?Math.min(20,Math.floor((probe-GRAND_BASE+.001)/GRAND_STEP)):20;
  let top=-Infinity;
  for(let i=Math.max(1,n-1);i<=Math.min(19,n+1);i++){
    const level=resortLevels[i];
    if(probe>=level.y-.15 && deckAt(level,x,z)){
      top=level.y;
      if(i===19 && inRect(penthousePool,x,z))top-=poolDepthAt(z);
    }
    for(const p of grandSolids[i]){
      if(probe>=level.y+p.bottom-.001 && inRect(p,x,z,pad))top=Math.max(top,level.y+p.bottom+p.h);
    }
  }
  if(probe>=grandTop-.24 && inRect(hallBounds,x,z))top=Math.max(top,grandTop);
  return Math.max(top,pierTop);
}

// The casino addition straddles the older hotel's footprint on four
// independent piers; its occupied span stays supported if the infill falls.
export const hotelPiers=[-63.45,-48.55].flatMap(x=>[65.30,72.80].map(z=>({x,z,w:.66,d:.72,h:32.78})));
