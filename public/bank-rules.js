import {galleryFloor,galleryRoomAt} from './gallery-lobbies.js';
import {towerCollapsed} from './tower-damage.js';
import {MAP} from './world.js';

export const bankDesk={x:-20,y:galleryFloor,z:-35.7,tower:3};
export const bankPayout=150,bankClaimSeconds=6,bankCooldownSeconds=90;
export const bankStanding=world=>!towerCollapsed(MAP.buildings[bankDesk.tower],world.doors);

export function atBankDesk(feet){
  return !!feet?.grounded && !feet.swimming && !feet.climb && !feet.parachute && Math.abs(feet.y-bankDesk.y)<.42 &&
    Math.hypot(feet.x-bankDesk.x,feet.z-bankDesk.z)<=1.05 && galleryRoomAt(feet.x,feet.y,feet.z)?.index===bankDesk.tower;
}
export function bankPrompt(state,id){
  if(state.phase==='ready')return {action:'start',label:'Claim $'+bankPayout,detail:'Biscayne Mutual Bank · E to claim $'+bankPayout};
  if(state.phase==='claiming'){
    const own=state.claimant===id;
    return {action:own?'cancel':null,label:own?'Cancel claim':null,detail:(own?'Stay at the teller':'Teller in use')+' · '+state.seconds+'s'};
  }
  return {action:null,label:null,detail:state.phase==='cooldown'?'Vault resets in '+state.seconds+'s':'Bank closed'};
}
