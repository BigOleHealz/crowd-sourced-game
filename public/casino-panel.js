import {cardName,handValue,stakes} from './casino-layout.js';

export function casinoPanel(dialog,send,enter,exit){
  const find=s=>dialog.querySelector(s);
  const bets=find('[data-bets]'),moves=find('[data-moves]'),status=find('output');
  let table,stamp='';
  function act(action,stake){if(table)send({type:'blackjack',action,stake,revision:table.revision});}
  for(const stake of stakes){
    const button=document.createElement('button');
    button.textContent=stake?'Bet $'+stake:'Deal practice hand';
    button.onclick=()=>act('deal',stake);bets.append(button);
  }
  for(const b of dialog.querySelectorAll('[data-action]'))b.onclick=()=>act(b.dataset.action);
  dialog.oncancel=e=>{e.preventDefault();act('leave');};
  function close(){if(dialog.open){dialog.close();exit();}stamp='';table=null;}
  function update(next,id,cash){
    if(!next || next.player!==id || id==null){close();return;}
    table=next;
    if(!dialog.open){enter();dialog.showModal();}
    const key=next.revision+'/'+cash;if(key===stamp)return;stamp=key;
    bets.hidden=next.phase==='play';moves.hidden=!bets.hidden;
    [...bets.children].forEach((b,i)=>{b.disabled=stakes[i]>cash;});
    for(const [selector,cards] of [['[data-dealer]',next.dealer],['[data-hand]',next.hand]]){
      const row=find(selector);row.replaceChildren();
      const shown=cards.filter(card=>card>=0);
      const total=find(selector.replace(']', '-total]'));
      total.textContent=shown.length?String(handValue(shown))+(shown.length<cards.length?' showing':''):'—';
      for(const card of cards){
        const tile=document.createElement('span');tile.textContent=cardName(card);
        tile.className=card<0?'back':[1,2].includes(Math.floor(card/13))?'red':'';row.append(tile);
      }
    }
    for(const field of ['wins','losses','pushes'])find('[data-'+field+']').textContent=next.record?.[field]??0;
    find('[data-funds]').textContent='Wallet $'+cash;
    status.textContent=next.result || (next.phase==='play'?(next.wager?'$'+next.wager+' wager':'Practice hand')+' · Hit or stand.':'Choose a wager or play a free hand.');
  }
  return {update,close};
}
