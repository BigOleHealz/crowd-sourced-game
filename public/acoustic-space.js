import {CITY,MAP} from './world.js';
import {bridges,within} from './brickell-map.js';
import {leafSurface} from './drawbridges.js';
import {galleryRoomAt} from './gallery-lobbies.js';
import {hotel} from './maravela-hotel.js';
import {doorX,storefrontRoom} from './storefront-layout.js';
import {retailRoom} from './frontage-glass.js';
import {casaRoomAt} from './casa-luma.js';
import {inPalazzoMare} from './palazzo-mare.js';
import {churchRoom} from './ridge-church.js';
import {yachtRoomDepth} from './yacht-layout.js';
const outside={id:null,opening:1,reflection:0},underDeck={id:null,opening:1,reflection:.29};
const opening=(x,z,dx,dz,amount)=>amount/(1+Math.hypot(x-dx,z-dz)*.24);
const room=(id,opening)=>({id,opening,reflection:.175-.08*opening});

export function acousticSpace(point,world){
  if(!point || !world)return outside;
  const {x,y,z}=point,doors=world.doors;
  if(CITY){
    if(world.yacht && yachtRoomDepth(world.yacht,x,y,z)>=0)return room('yacht',.12);
    const lobby=galleryRoomAt(x,y,z);
    if(lobby){
      const leak=lobby.name===hotel.name ? Math.max(...hotel.fronts.map(f=>opening(x,z,hotel.x,f.z,doors?.hotel?.[f.id]??0))) :
        Math.max(...lobby.entries.map(entry=>opening(x,z,lobby.x,entry,1)));
      return room(lobby,leak);
    }
    const cafe=storefrontRoom(x,y,z);
    if(cafe)return room(cafe,opening(x,z,doorX,cafe.z,doors?.[cafe.id]??0));
    const shop=retailRoom(x,y,z);
    if(shop)return room(shop,opening(x,z,shop.x,shop.entry.z,doors?.retail?.[shop.id]??0));
    if(casaRoomAt(x,y,z))return room('casa',.14);
    if(inPalazzoMare(x,y,z))return room('palazzo',.14);
    for(const b of bridges){
      if(!within(b,x,z))continue;
      const deck=leafSurface(b,z,doors?.bridgeLifts?.[b.north]??0)??b.height(z,'road');
      if(Number.isFinite(deck) && y+.55<deck)return underDeck;
    }
  }else{
    if(churchRoom(x,y,z))return room('church',.16);
    const b=MAP.bridge;
    if(Math.abs(x-b.x)<b.width/2 && Math.abs(z-b.z)<b.length/2 && y+.55<b.y)return underDeck;
  }
  return outside;
}

export function transmission(listener,source){
  if(listener.id===source.id)return 1;
  if(listener.id && source.id)return .12+.44*Math.min(listener.opening,source.opening);
  return .18+.82*(listener.id?listener.opening:source.opening);
}
