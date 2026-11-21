import {bankDesk} from './bank-rules.js';

export function bankConversation(dialog,{enter,leave,confirm}){
  const choice=dialog.querySelector('[data-police-choice]');
  const checkbox=choice.querySelector('input');
  const info=dialog.querySelector('[data-police-info]');
  const dismiss=dialog.querySelector('[data-leave]');
  let serial;
  function close(){
    if(!dialog.open)return;
    dialog.close();
    leave();
  }
  dismiss.onclick=close;
  dialog.oncancel=e=>{e.preventDefault();close();};
  dialog.querySelector('[data-rob]').onclick=()=>{
    if(!dialog.open)return;
    const optIn=!choice.hidden && checkbox.checked;
    close();
    confirm(serial,optIn);
  };
  return {
    get open(){return dialog.open;},
    show(currentSerial,police){
      if(dialog.open)return;
      serial=currentSerial;
      enter();
      checkbox.checked=false;
      choice.hidden=police;
      info.textContent=police?'Police on. Starting a robbery will bring a patrol to the branch.':'Police off. The branch alarm will sound. You can choose a police chase below.';
      dialog.showModal();
      dismiss.focus({preventScroll:true});
    },
    close
  };
}

export function bankBulletin(bank,feet,id){
  if(!bank || !feet || (bank.phase!=='alarm' && bank.phase!=='handoff'))return '';
  const owner=bank.claimant===id;
  if(!owner && Math.hypot(feet.x-bankDesk.x,feet.y-bankDesk.y,feet.z-bankDesk.z)>24)return '';
  if(bank.phase==='handoff')return owner?'Cash ready · Collect the parcel at the teller window.':'Branch alarm · The teller has set a parcel on the counter.';
  if(owner)return bank.pursuit?'Branch alarm · Patrol dispatched. The teller is preparing the cash.':'Branch alarm · The teller is preparing the cash.';
  return bank.pursuit?'Branch alarm · Patrol dispatched to Biscayne Mutual.':'Branch alarm · Customers are taking cover.';
}
