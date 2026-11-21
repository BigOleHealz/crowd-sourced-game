import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {harborTrade,newWallet}=await import('../harbor-trade.js');
const {newExpedition}=await import('../public/expedition.js');
const {estateSafes}=await import('../public/estate-safes.js');
const {blocked}=await import('../public/world.js');
for(const s of estateSafes){
  const w=newExpedition(), notices=[],trade=harborTrade(w,(...args)=>notices.push(args));
  const player=id=>({id,life:{hp:100},wallet:newWallet(),state:{x:s.x,z:s.z+s.side*.95,y:s.y,grounded:true}});
  const a=player(1),b=player(2);
  assert(!blocked(a.state.x,s.y,a.state.z,w.hp,w.doors),'walkable console approach '+s.id);
  const request=(p,seq)=>trade.request(p,{seq,action:'safe',safe:s.id},100);
  a.state.y+=4;request(a,1);assert.equal(a.wallet.cash,0);
  a.state.y=s.y;request(a,2);request(a,2);request(b,3);
  assert.equal(a.wallet.cash,s.cash);assert.equal(b.wallet.cash,0);
  assert.equal(notices.filter(n=>n[2].startsWith('Estate safe +')).length,1);
  assert.equal(w.doors.estateSafes,s.bit);
}
console.log('PASS estate safe positions, floor checks, simultaneous claims and one wallet credit');
