import {galleryRoomAt,galleryDoorWidth} from './gallery-lobbies.js';
import {doorX,storefrontDoors} from './storefront-layout.js';
import {retailRoom} from './frontage-glass.js';

// A chase boom still intersects a doorway when the player's feet are outside.
// Include the approach on either side, bounded by the actual opening width.
export function doorwayProximity(x,y,z){
  if(y<.45 || y>3.0)return 0;
  const reach=1.95;
  let best=0;
  function opening(along,across,width){
    if(Math.abs(across)>width/2+.32)return;
    best=Math.max(best,1-Math.abs(along)/reach);
  }
  for(const sign of [-1,1]){
    const lobby=galleryRoomAt(x,y,z+sign*reach);
    if(lobby)for(const entry of lobby.entries)opening(z-entry,x-lobby.x,galleryDoorWidth);
    const shop=retailRoom(x+sign*reach,y,z);
    if(shop?.entry)opening(x-shop.x,z-shop.entry.z,shop.entry.width);
  }
  if(Math.abs(x-doorX)<reach)for(const d of storefrontDoors)opening(x-doorX,z-d.z,d.width);
  return best;
}
