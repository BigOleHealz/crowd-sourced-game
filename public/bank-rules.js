import {galleryRoomAt} from './gallery-lobbies.js';
import {towerCollapsed} from './tower-damage.js';
import {bankSite,bankDesk} from './bank-site.js';
export {bankDesk};

export const bankPayout=150,bankAlarmSeconds=8,bankHandoffSeconds=25,bankCooldownSeconds=90;
export const bankStanding=world=>!towerCollapsed(bankSite,world.doors);

export function inBankLobby(feet){
  return !!feet && galleryRoomAt(feet.x,feet.y,feet.z)?.name===bankSite.name;
}
export function atBankDesk(feet){
  return !!feet?.grounded && !feet.swimming && !feet.climb && !feet.parachute && Math.abs(feet.y-bankDesk.y)<.42 &&
    Math.hypot(feet.x-bankDesk.x,feet.z-bankDesk.z)<=1.05 && inBankLobby(feet);
}
export function bankPrompt(state,id){
  switch(state.phase){
    case 'ready':
      return {action:'talk',label:'Talk to teller',detail:'Biscayne Mutual Bank · Talk to the teller'};
    case 'alarm':
      return {action:null,label:null,detail:'Alarm sounding · Teller preparing the cash'};
    case 'handoff':
      return state.claimant===id
        ? {action:'collect',label:'Collect $'+bankPayout,detail:'Teller · Collect the cash at the counter'}
        : {action:null,label:null,detail:'Teller handing over the cash'};
    case 'cooldown':
      return {action:null,label:null,detail:(state.outcome==='aborted'?'Robbery interrupted':'Cash collected')+' · Branch reopens in '+state.seconds+'s'};
    default:
      return {action:null,label:null,detail:'Branch closed'};
  }
}
