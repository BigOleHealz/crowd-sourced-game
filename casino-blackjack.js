import {randomInt} from 'node:crypto';
import {casinoSeat,handValue,nearBlackjack,stakes} from './public/casino-layout.js';

function shuffledDeck(){
  const cards=Array.from({length:52},(_,i)=>i);
  for(let i=cards.length-1;i>0;i--){
    const j=randomInt(i+1);
    [cards[i],cards[j]]=[cards[j],cards[i]];
  }
  return cards;
}
export function blackjack(makeDeck=shuffledDeck){
  const state={player:null,phase:'idle',revision:0,wager:0,hand:[],dealer:[],result:''};
  let deck=[],dealer=[],lastAction=0;
  function settle(world,p,tick,message,multiplier){
    if(state.phase!=='play')return;
    state.phase='result';state.dealer=dealer.slice();
    const payout=state.wager*multiplier;
    state.result=message+(state.wager?(payout?' · $'+payout+' returned':' · wager lost'):' · practice');
    if(payout)world.trading.award(p,payout,tick,state.result);
  }
  function leave(p){
    if(!p || state.player!==p.id)return;
    Object.assign(state,{player:null,phase:'idle',wager:0,hand:[],dealer:[],result:'',revision:state.revision+1});
    deck=[];dealer=[];
  }
  function request(world,p,msg,tick,eligible){
    if(msg.revision!==state.revision)return;
    if(msg.action==='sit'){
      if(state.player!==null || !eligible || !nearBlackjack(p.state))return;
      Object.assign(p.state,casinoSeat,{vx:0,vy:0,vz:0,grounded:true,stance:'stand'});
      p.moving=p.sprint=false;p.yaw=0;
      state.player=p.id;state.phase='bet';
    }else{
      if(state.player!==p.id)return;
      if(msg.action==='leave'){leave(p);return;}
      if(!eligible || !nearBlackjack(p.state)){leave(p);return;}
      if(msg.action==='deal'){
        if(!['bet','result'].includes(state.phase) || !stakes.includes(msg.stake) || p.wallet.cash<msg.stake)return;
        deck=makeDeck();state.wager=msg.stake;state.result='';state.phase='play';
        const first=deck.pop(),up=deck.pop(),second=deck.pop(),hole=deck.pop();
        state.hand=[first,second];dealer=[up,hole];state.dealer=[up,-1];
        if(state.wager)world.trading.award(p,-state.wager,tick,'Blackjack wager placed.');
        const playerNatural=handValue(state.hand)===21,houseNatural=handValue(dealer)===21;
        if(playerNatural || houseNatural)settle(world,p,tick,playerNatural?(houseNatural?'Push':'Blackjack'):'Dealer blackjack',playerNatural?(houseNatural?1:2.5):0);
      }else{
        if(state.phase!=='play' || !['hit','stand'].includes(msg.action))return;
        if(msg.action==='hit')state.hand.push(deck.pop());
        const value=handValue(state.hand);
        if(value>21)settle(world,p,tick,'Bust',0);
        else if(msg.action==='stand' || value===21){
          while(handValue(dealer)<17)dealer.push(deck.pop());
          const house=handValue(dealer);
          if(house>21 || value>house)settle(world,p,tick,house>21?'Dealer busts':'You win',2);
          else if(house===value)settle(world,p,tick,'Push',1);
          else settle(world,p,tick,'Dealer wins',0);
        }
      }
    }
    lastAction=tick;state.revision++;
  }
  function step(p,tick){
    if(p?.id!==state.player)return false;
    if(!p.life.hp || p.life.fall || !nearBlackjack(p.state) || tick-lastAction>=30*120){leave(p);return false;}
    return true;
  }
  return {state,request,leave,step};
}
