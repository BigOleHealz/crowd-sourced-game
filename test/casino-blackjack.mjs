import assert from 'node:assert/strict';
import {harborTrade} from '../harbor-trade.js';
import {blackjack} from '../casino-blackjack.js';
import {casinoSeat,handValue} from '../public/casino-layout.js';

const makePlayer=id=>({id,state:{...casinoSeat,grounded:true},wallet:{cash:50},life:{hp:100}});
const a=makePlayer(1),b=makePlayer(2),ledger=[];
const world={};
let lastBalance=50;
world.trading=harborTrade(world,p=>{ledger.push(p.wallet.cash-lastBalance);lastBalance=p.wallet.cash;});
const deck=(...values)=>()=>[...values].reverse();
assert.equal(handValue([0,13,8]),21);
function setup(shoe){
  a.wallet.cash=50;lastBalance=50;ledger.length=0;
  const t=blackjack(shoe);
  const act=(action,extra={},p=a)=>t.request(world,p,{action,revision:t.state.revision,...extra},1,true);
  act('sit');
  return {t,act};
}
{
  const {t,act}=setup(deck(9,5,6,9,8));
  act('sit',{},b);assert.equal(t.state.player,a.id);
  act('deal',{stake:-10});act('deal',{stake:1000});assert.equal(t.state.phase,'bet');
  const rev=t.state.revision;act('deal',{stake:10});act('deal',{stake:10,revision:rev});
  assert.deepEqual(ledger,[-10]);assert.deepEqual(t.state.dealer,[5,-1]);
  act('stand',{},b);assert.equal(t.state.phase,'play');
  act('stand');act('stand');assert.equal(t.state.phase,'result');assert.equal(a.wallet.cash,60);
  assert.deepEqual(ledger,[-10,20]);assert.deepEqual(t.state.dealer,[5,9,8]);
  assert.deepEqual(t.state.record,{wins:1,losses:0,pushes:0});
  act('leave');act('sit',{},b);assert.equal(t.state.player,2);
  assert.deepEqual(t.state.record,{wins:0,losses:0,pushes:0},'Records belong to the person sitting');
  act('leave',{},b);act('sit');assert.equal(t.state.record.wins,1);
}
for(const [cards,expected] of [[[0,9,12,8],65],[[0,9,12,13],50],[[9,0,7,12],40]]){
  const {act,t}=setup(deck(...cards));act('deal',{stake:10});assert.equal(t.state.phase,'result');assert.equal(a.wallet.cash,expected);
  assert.equal(t.state.record[expected>50?'wins':expected===50?'pushes':'losses'],1);
}
{
  const {act,t}=setup(deck(9,0,8,5,9));act('deal',{stake:0});act('stand');
  assert.equal(t.state.dealer.length,2);assert.equal(a.wallet.cash,50);
}
{
  const {act,t}=setup(deck(9,4,8,7,9));act('deal',{stake:20});act('hit');
  assert.match(t.state.result,/Bust/);assert.equal(a.wallet.cash,30);act('hit');assert.equal(a.wallet.cash,30);
}
{
  const {act,t}=setup(deck(9,4,8,7));act('deal',{stake:50});
  assert.equal(a.wallet.cash,0);assert(t.step(a,100));assert(!t.step(a,4000));
  assert.equal(t.state.player,null);t.leave(a);assert.equal(a.wallet.cash,0);
  act('sit');assert.equal(t.state.record.losses,1,'An unfinished hand counts as a forfeit once');act('leave');
  a.state.x=0;act('sit');assert.equal(t.state.player,null);
}
console.log('PASS one blackjack seat, shuffled-hand rules, private hole card, practice, wagers, payouts, retries and timeout');
