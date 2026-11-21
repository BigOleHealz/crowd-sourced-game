// Lobby patrons are local render actors. All clients derive their reactions from
// the same authoritative encounter tick, including observers arriving mid-event.
import {bankSite,bankFront,bankDesk} from './bank-site.js';
import {civilianLooks} from './civilian-style.js';
import {holdWorld} from './ranger-pose.js';

export const bankLooks={
  'bank-elena':{...civilianLooks['rival-ines'],face:18,outfit:11,skin:0xdd9f84,hair:0x342a29,cut:'bun',extra:'staff',top:0x3a505c},
  'bank-marta':{...civilianLooks['rival-rosa'],extra:'tote'},
  'bank-andre':{...civilianLooks['rival-omar'],face:1,outfit:3,skin:0xa26c52,cut:'curls',extra:'watch'},
};
const people=[
  {id:'bank-elena',name:'Elena Cruz · Teller',bankRole:'teller',x:bankSite.x-.47,z:bankFront+4.71,yaw:0},
  {id:'bank-marta',name:'Marta',bankRole:'waiting',x:bankSite.x+1.20,z:bankFront+2.12,yaw:-.34},
  {id:'bank-andre',name:'André',bankRole:'customer',x:bankSite.x-1.43,z:bankFront+2.96,yaw:2.45},
];
const empty=[];
const clamp=x=>Math.max(0,Math.min(1,x));
const ease=n=>clamp(n)**2*(3-2*clamp(n));

export function bankCast(local,world,visual){
  if(!world.bank || visual.phase==='closed' || Math.abs(local.y-.824)>8 || Math.hypot(local.x-bankDesk.x,local.z-bankDesk.z)>18)return empty;
  const {phase,elapsed,threat,reducedMotion}=visual;
  const retreat=phase==='alarm'
    ? (reducedMotion?1:ease((elapsed-.58)/1.40))
    : phase==='handoff' || phase==='cooldown'?threat:0;
  return people.map(person=>({...person,y:.824,hp:100,grounded:true,
    ...(person.bankRole==='customer'?{
      x:person.x-.91*retreat,z:person.z-.72*retreat,yaw:person.yaw-.66*retreat,
      moving:retreat>0 && retreat<1
    }:null)}));
}

export function poseBankGuest(actor,state,visual,t){
  const {phase,active,elapsed,threat,parcel,offering,cashGrip,reducedMotion}=visual;
  const drift=reducedMotion?0:Math.sin(t*2.3);
  const teller=state.bankRole==='teller',seated=state.bankRole==='waiting';
  const startled=phase==='alarm'?(reducedMotion?0:threat*(1-ease((elapsed-1.4)/.72))):0;
  const preparing=phase==='alarm' && !offering;
  const lean=offering?.32+.16*cashGrip:preparing?.32*(threat-startled):.48*cashGrip;
  const tuck=threat*(state.moving?.35:1);
  actor.body.position.y=seated?-.44-.10*threat:teller?-.10*lean+.04*startled:-.19*tuck;
  if(teller)actor.body.position.z=-.06*cashGrip;
  actor.head.rotation.y=teller?.10*drift*(1-threat):seated?-.08-.48*threat+.07*drift:.17*drift+.25*tuck;
  actor.head.rotation.x=seated?-.08-.29*threat:teller?.15*startled-.54*lean:.03-.02*tuck;
  actor.spine.rotation.x=seated?-.12-.57*threat:teller?.16*startled-lean:-.37*tuck;
  actor.spine.rotation.z=seated?.21*threat:teller?-.09*lean:.12*tuck;
  for(const {side,arm,forearm,leg,knee} of actor.limbs){
    if(seated){
      leg.rotation.set(1.44,0,side*.09);knee.rotation.set(-1.54,0,0);
      const cover=side<0?threat:.45*threat;
      arm.rotation.set(.41+.63*cover,0,side*(.06+.20*cover));
      forearm.rotation.set(.58+1.28*cover,0,-side*.44*cover);
    }else if(teller){
      const raise=startled+threat*Number(phase==='handoff')*.38;
      const sort=preparing && !reducedMotion?.18*Math.sin(t*6+side)*(threat-startled):0;
      arm.rotation.set(.18+1.20*raise+.37*lean+sort,0,side*(.10+.36*raise));
      forearm.rotation.set(.55+.88*raise+sort,0,0);
      if(cashGrip){
        holdWorld(actor,arm,forearm,side,{
          x:bankSite.x+parcel.x+side*.167,y:parcel.y+.01,z:bankFront+parcel.z+.066
        },cashGrip);
      }
    }else{
      arm.rotation.set(.15+(side<0?1.23:.89)*threat,0,side*(.10+.29*threat));
      forearm.rotation.set(.38+(side<0?1.18:.73)*threat,0,-side*.18*threat);
      if(!state.moving && (active || threat>0)){leg.rotation.x=.58*tuck;knee.rotation.x=-1.04*tuck;}
    }
  }
}
