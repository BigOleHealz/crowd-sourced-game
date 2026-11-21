// Lobby patrons are local render actors. All clients derive their reactions from
// the same authoritative encounter tick, including observers arriving mid-event.
import {bankSite,bankFront,bankDesk} from './bank-site.js';
import {civilianLooks} from './civilian-style.js';

export const bankLooks={
  'bank-elena':{...civilianLooks['rival-ines'],face:18,outfit:11,skin:0xdd9f84,hair:0x342a29,cut:'bun',extra:'staff',top:0x3a505c},
  'bank-marta':{...civilianLooks['rival-rosa'],extra:'tote'},
  'bank-andre':{...civilianLooks['rival-omar'],face:1,outfit:3,skin:0xa26c52,cut:'curls',extra:'watch'},
};
const people=[
  {id:'bank-elena',name:'Elena Cruz · Teller',bankRole:'teller',x:bankSite.x-.47,z:bankFront+4.71,yaw:0},
  {id:'bank-marta',name:'Marta',bankRole:'waiting',x:bankSite.x+1.76,z:bankFront+2.12,yaw:.29},
  {id:'bank-andre',name:'André',bankRole:'customer',x:bankSite.x-1.43,z:bankFront+2.83,yaw:2.45},
];
const empty=[];
const clamp=x=>Math.max(0,Math.min(1,x));
export function bankCast(local,world){
  const bank=world.bank;
  if(!bank || bank.phase==='closed' || Math.abs(local.y-.824)>8 || Math.hypot(local.x-bankDesk.x,local.z-bankDesk.z)>18)return empty;
  const elapsed=Math.max(0,(world.simTick-(bank.since??world.simTick))/30);
  const active=bank.phase==='alarm'||bank.phase==='handoff';
  // The seated customer shelters at her bench. The standing customer backs
  // away along his own aisle, leaving the public door and counter clear.
  let retreat=bank.phase==='alarm'?clamp((elapsed-.45)/1.45):bank.phase==='handoff'?1:0;
  if(bank.phase==='cooldown')retreat=clamp(1-elapsed/2.1);
  retreat=retreat*retreat*(3-2*retreat);
  return people.map(p=>({...p,y:.824,hp:100,grounded:true,alarm:active,elapsed,handoff:bank.phase==='handoff',
    ...(p.bankRole==='customer'?{x:p.x-.15*retreat,z:p.z-.80*retreat,yaw:p.yaw-.62*retreat,moving:retreat>0 && retreat<1}:null)}));
}

export function poseBankGuest(actor,state,t){
  const wave=Math.sin(t*2.3),active=state.alarm;
  const teller=state.bankRole==='teller',seated=state.bankRole==='waiting';
  const start=state.handoff?1:clamp(state.elapsed*3);
  const flinch=active?start:0;
  const preparing=teller && active && !state.handoff && state.elapsed>2;
  actor.body.position.y=seated?-.44:teller?-.055*flinch:-.17*flinch;
  actor.head.rotation.y=teller?.10*Math.sin(t*.85):seated?-.30+.09*wave:.23*Math.sin(t*.8);
  actor.head.rotation.x=seated?-.09+.27*flinch:preparing?.31:.06*wave;
  actor.spine.rotation.x=seated?.09+.28*flinch:preparing?.27:.10*flinch;
  for(const {side,arm,forearm,leg,knee} of actor.limbs){
    if(seated){
      leg.rotation.set(1.44,0,side*.09);knee.rotation.set(-1.54,0,0);
      arm.rotation.set(.47+.60*flinch,0,side*(.055+.13*flinch));forearm.rotation.set(.67+.88*flinch,0,0);
    }else if(teller){
      const reaching=state.handoff && side<0;
      const hands=preparing?.69+.16*Math.sin(t*4+side):reaching?1.20:active?.93*flinch:.12;
      arm.rotation.set(hands,side*(preparing?.14:.04),side*(active && !preparing && !state.handoff?.27:.07));
      forearm.rotation.set(preparing?.82+.20*Math.cos(t*4+side):reaching?.19:active?1.04:.43,0,0);
    }else if(active){
      arm.rotation.set(.28+.60*flinch,0,side*(.14+.28*flinch));forearm.rotation.set(.48+.94*flinch,side*.07,0);
      if(!state.moving){leg.rotation.x=.36*flinch;knee.rotation.x=-.62*flinch;}
    }else{
      arm.rotation.set(.10+.04*wave,0,side*.07);forearm.rotation.set(side>0?.75:.28,0,0);
    }
  }
}
