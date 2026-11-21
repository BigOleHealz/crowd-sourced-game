import {atBankDesk,inBankLobby,bankStanding,bankAlarmSeconds,bankHandoffSeconds,bankCooldownSeconds,bankPayout} from './public/bank-rules.js';
import {canUseInventory} from './harbor-trade.js';

// One encounter per free-roam district. Public state survives an empty room.
// Owner and wanted-session references stay private, so a reused player id or a
// fresh Police opt-in cannot inherit somebody else's handoff or dispatch.
export function createBank(){
  const state={phase:'ready',since:0,seconds:0,serial:0,claimant:null,pursuit:false,outcome:null};
  let owner=null,dispatch=null,deadline=0,reopens=0;

  function phase(name,tick,seconds=0){
    state.phase=name;state.since=tick;state.seconds=seconds;deadline=tick+seconds*30;
  }
  function end(tick,outcome){
    owner=null;dispatch=null;state.claimant=null;state.pursuit=false;state.outcome=outcome;
    const seconds=outcome==='collected'?bankCooldownSeconds:12;
    reopens=tick+seconds*30;
    phase('cooldown',tick,seconds);
  }
  function canUseDesk(world,p){
    return !!p.wallet && canUseInventory(world,p) && bankStanding(world) && atBankDesk(p.state);
  }
  function request(world,p,input,tick){
    if(!Number.isSafeInteger(input.seq) || input.seq<1 || input.seq<=(p.bankSeq??0))return;
    p.bankSeq=input.seq;
    if(input.serial!==state.serial || !canUseDesk(world,p))return;
    if(input.action==='rob' && state.phase==='ready' && tick>=reopens){
      owner=p;state.serial++;state.claimant=p.id;state.outcome=null;
      // Only this explicit client choice may turn Police on.
      if(input.pursuit===true)world.wanted?.set(p,true);
      dispatch=world.wanted?.session(p);
      state.pursuit=!!dispatch;
      world.wanted?.record(dispatch,'bank',tick);
      phase('alarm',tick,bankAlarmSeconds);
    }else if(input.action==='collect' && owner===p && state.phase==='handoff' && tick<deadline){
      end(tick,'collected');
      world.trading.award(p,bankPayout,tick,'Bank payout +$'+bankPayout+'.');
    }
  }
  function step(world,players,tick){
    if(!bankStanding(world)){
      if(owner)end(tick,'aborted');
      if(state.phase!=='closed')phase('closed',tick);
      return;
    }
    if(owner){
      if(players.get(owner.id)!==owner || !owner.life.hp || owner.life.fall || !inBankLobby(owner.state)){
        end(tick,'aborted');return;
      }
      state.pursuit=!!dispatch && world.wanted?.session(owner)===dispatch;
      if(state.pursuit)world.wanted.holdBankResponse(dispatch,tick);
      if(tick>=deadline){
        if(state.phase==='handoff')end(tick,'aborted');
        else phase('handoff',tick,bankHandoffSeconds);
      }else state.seconds=Math.ceil((deadline-tick)/30);
      return;
    }
    if(tick<reopens){
      if(state.phase!=='cooldown')phase('cooldown',tick);
      state.seconds=Math.ceil((reopens-tick)/30);
    }else if(state.phase!=='ready'){
      phase('ready',tick);state.outcome=null;
    }
  }
  return {state,request,step,leave(p,tick){if(owner===p)end(tick,'aborted');}};
}
