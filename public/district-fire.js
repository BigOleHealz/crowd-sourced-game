import {fuelStop} from './fire-sites.js';
import {homeById} from './residential-sites.js';
import {ramHouse} from './residential-falls.js';
import {shadeSpots,stations} from './beach-layout.js';
import {beachHut} from './harbor-key-structures.js';
import {beachClubFixtures,clubDeck,loungeDeck} from './beach-club.js';
import {dockHeight,marinaDecks} from './marina-docks.js';
import {MAP} from './world.js';
import {fellTree} from './tree-fall.js';
import {beachSigns,trailMarkers} from './scenery-layout.js';

const sites=new Map([[fuelStop.id,{...fuelStop,kind:'station',duration:450}]]);
for(const id of ['harbor-0','harbor-2','harbor-3']){
  const b=homeById(id).parts[0];
  sites.set(id,{id,kind:'house',x:b.x,z:b.z,w:b.w,d:b.d,duration:330});
}
for(const {number:id,x,z} of stations)sites.set(id,{id,x,z,kind:'wood',duration:180});
for(const [i,{x,z}] of shadeSpots.entries()){
  const id='parasol-'+i;
  sites.set(id,{id,x,z,kind:'wood',duration:165});
  for(const side of [-1,1]){
    const chair='lounger-'+i+'-'+side;
    sites.set(chair,{id:chair,x:x+.85,z:z+side*.86,kind:'wood',duration:120});
  }
}
for(const [i,post] of beachHut.posts.entries()){
  const id='hut-post-'+i;
  sites.set(id,{id,x:post.x,z:post.z,kind:'timber',duration:180});
}
for(const [i,bench] of beachHut.benches.entries()){
  const id='hut-bench-'+i;
  sites.set(id,{id,x:bench.x,z:bench.z,kind:'timber',duration:150});
}
for(const fixture of beachClubFixtures)if(fixture.fireSite)
  sites.set(fixture.fireSite,{id:fixture.fireSite,x:fixture.x,z:fixture.z,kind:'timber',duration:150});
const decks=[
  ...[clubDeck,loungeDeck].map((r,i)=>({id:'club-deck-'+i,x:r.x,z:r.z,w:r.w,d:r.d,y:r.y})),
  {id:'hut-deck',x:beachHut.x,z:beachHut.z,w:beachHut.w,d:beachHut.d,y:beachHut.deckY},
  ...marinaDecks.map((r,i)=>({id:'marina-deck-'+i,x:(r.west+r.east)/2,z:(r.north+r.south)/2,
    w:r.east-r.west,d:r.south-r.north,y:null})),
  ...(MAP.bridge?[{id:'timber-bridge',x:MAP.bridge.x,z:MAP.bridge.z,
    w:MAP.bridge.width,d:MAP.bridge.length,y:MAP.bridge.y}]:[]),
];
for(const deck of decks)sites.set(deck.id,{...deck,kind:'timber',duration:210});
for(const tree of MAP.trees)sites.set('tree-'+tree.treeId,{id:'tree-'+tree.treeId,
  kind:'tree',x:tree.x,z:tree.z,tree,duration:240});
for(const [i,[x,z]] of beachSigns.entries()){
  const id='sign-'+i;
  sites.set(id,{id,x,z,kind:'wood',duration:135});
}
for(const {x,z,postId:id} of trailMarkers)sites.set(id,{id,x,z,kind:'sign',duration:135});
export const fireSite=id=>sites.get(id);

export function burnableContact(hit,at){
  if(hit.target?.woodMaterial===false)return;
  if(hit.target?.treeId!=null)return 'tree-'+hit.target.treeId;
  const tagged=hit.target?.fireSite??hit.target?.woodId??hit.target?.postId;
  if(sites.has(tagged))return tagged;
  // The wood-clad face begins above the house's stone foundation.
  if(hit.hitKind==='scenery' && at.y>1.18 && hit.target?.fireHome)return hit.target.fireHome;
  if(hit.hitKind==='scenery' && !hit.target)for(const deck of decks){
    if(Math.abs(at.x-deck.x)>deck.w/2 || Math.abs(at.z-deck.z)>deck.d/2)continue;
    const height=deck.y??dockHeight(at.x,at.z);
    if(height!=null && Math.abs(at.y-height)<.16)return deck.id;
  }
}
export function hitFireSite(doors,id,at,tick,projector,team){
  const site=sites.get(id);
  if(!site || doors.houseRuins?.[id] || doors.beachWood?.[id]!=null || doors.posts?.[id]===0 ||
    (site.kind==='tree' && doors.fallenTrees?.[site.tree.treeId]) || doors.fires?.[id])return false;
  if(site.kind==='station'){
    doors.fuelHits=Math.min(4,(doors.fuelHits??0)+1);
    if(doors.fuelHits<4)return false;
  }else if(!projector)return false;
  (doors.fires??={})[id]={stage:'burning',team,start:tick,level:1,x:+at.x.toFixed(2),y:+at.y.toFixed(2),z:+at.z.toFixed(2)};
  return true;
}

export function stepDistrictFires(doors,tick,rules){
  if(!doors.fires)return;
  for(const [id,f] of Object.entries(doors.fires)){
    if(f.stage!=='burning')continue;
    const s=sites.get(id),age=tick-f.start;
    if(age<s.duration && !doors.houseRuins?.[id] && doors.beachWood?.[id]==null && doors.posts?.[id]!==0 &&
      !(s.kind==='tree' && doors.fallenTrees?.[s.tree.treeId])){
      f.level=Math.max(1,Math.min(3,1+Math.floor(age*3/s.duration)));
      continue;
    }
    if(s.kind==='house' && ramHouse(doors,id,f.x,f.z,s.x-f.x,s.z-f.z))
      rules?.damageProperty(f.team,f,'house:'+id,'House facade',250_000);
    if(s.kind==='sign')(doors.posts??={})[id]=0;
    if(s.kind==='wood')(doors.beachWood??={})[id]??=1571;
    if(s.kind==='tree')fellTree(doors,s.tree,f.x-s.x+.4,f.z-s.z+.7,tick);
    doors.fires[id]={stage:'burned'};
  }
}
