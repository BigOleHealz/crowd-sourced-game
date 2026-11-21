import {atBankDesk,bankStanding,bankClaimSeconds,bankCooldownSeconds,bankPayout} from './public/bank-rules.js';
import {canUseInventory} from './harbor-trade.js';

// The bank belongs to the district worker. Its cooldown survives an empty room.
export function createBank(){
  const state={phase:'ready',seconds:0,claimant:null};
  let owner=null,finish=0,reopens=0;
  function clear(){
    owner=null;finish=0;
    state.claimant=null;state.seconds=0;state.phase='ready';
  }
  function canClaim(world,p){
    return p.wallet && canUseInventory(world,p) && atBankDesk(p.state) && bankStanding(world);
  }
  function request(world,p,input,tick){
    if(!Number.isSafeInteger(input.seq) || input.seq<1 || input.seq<=(p.bankSeq??0))return;
    p.bankSeq=input.seq;
    if(input.action==='cancel' && p===owner){clear();return;}
    if(input.action!=='start' || owner || tick<reopens || !canClaim(world,p))return;
    owner=p;finish=tick+30*bankClaimSeconds;
    state.claimant=p.id;state.phase='claiming';state.seconds=bankClaimSeconds;
  }
  function step(world,players,tick){
    if(!bankStanding(world)){
      if(owner)clear();
      state.phase='closed';state.seconds=0;return;
    }
    if(owner){
      if(players.get(owner.id)!==owner || !canClaim(world,owner)){clear();return;}
      if(tick<finish){state.seconds=Math.ceil((finish-tick)/30);return;}
      const recipient=owner;
      clear();reopens=tick+30*bankCooldownSeconds;
      world.trading.award(recipient,bankPayout,tick,'Bank payout +$'+bankPayout+'.');
      // record() accepts a live, opted-in session only.
      world.wanted?.record(world.wanted.session(recipient),'bank',tick);
    }
    state.phase=tick<reopens?'cooldown':'ready';
    state.seconds=Math.max(0,Math.ceil((reopens-tick)/30));
  }
  return {state,request,step,leave(p){if(owner===p)clear();}};
}
