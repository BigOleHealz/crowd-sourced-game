import {goods} from './market-goods.js';

export function marketPanel(panel,badge,{send,enter,leave}){
  const heading=panel.querySelector('h2'),funds=panel.querySelector('[data-funds]'),
    list=panel.querySelector('[data-stock]'),inventory=panel.querySelector('[data-inventory]'),
    status=panel.querySelector('[data-market-status]'),takeAll=panel.querySelector('[data-take-all]');
  let shop=null,wallet=null,market=null,viewKey='',seq=0,pending=0,badgeText='';
  function button(label,action,item){
    const el=document.createElement('button');el.type='button';el.textContent=label;
    el.onclick=()=>transact(action,item);
    return el;
  }
  function transact(action,item){
    if(pending)return;
    pending=++seq;
    if(!send({type:'market',seq,action,item,shop:shop?.id})){
      pending=0;status.textContent='Disconnected.';
    }
    refresh();
  }
  function row(item,count,label,action,disabled){
    const g=goods[item],el=document.createElement('div'),detail=document.createElement('div'),
      title=document.createElement('strong'),description=document.createElement('small'),control=button(label,action,item);
    title.textContent=g.name+' × '+count;description.textContent=g.description;detail.append(title,description);
    control.disabled=disabled || !!pending;el.append(detail,control);return el;
  }
  function refresh(){
    if(wallet){
      const label='$'+wallet.cash+' · Bag';
      if(label!==badgeText){badgeText=label;badge.textContent=label;}
    }
    if(!panel.open || !wallet || !market)return;
    const stock=shop && market.shops[shop.id];
    const key=JSON.stringify([wallet,stock,pending]);
    if(key===viewKey)return;
    viewKey=key;
    heading.textContent=shop?shop.name:'Your inventory';
    funds.textContent='$'+wallet.cash+' on hand'+(wallet.chart?' · Salvage chart active':'');
    list.hidden=!stock;takeAll.hidden=!stock?.down;
    if(stock){
      const keeper=shop.owner.slice(6);panel.querySelector('[data-keeper]').textContent=
        stock.down?'Counter unattended · Remaining stock is free.':'Shopkeeper · '+keeper[0].toUpperCase()+keeper.slice(1);
      list.replaceChildren(...Object.entries(stock.stock).map(([item,n])=>
        row(item,n,stock.down?'Take one':'Buy $'+goods[item].price,stock.down?'take':'buy',!n || !stock.down && goods[item].price>wallet.cash)));
      takeAll.disabled=!!pending || !Object.values(stock.stock).some(n=>n);
    }else panel.querySelector('[data-keeper]').textContent='';
    const items=Object.entries(wallet.items);
    inventory.replaceChildren(...items.map(([item,n])=>row(item,n,'Use','use',false)));
    if(!items.length)inventory.textContent='Your bag is empty.';
  }
  function close(){if(panel.open)panel.close();}
  function open(target=null){
    if(!wallet || !market || panel.open)return;
    enter();shop=target;status.textContent='';viewKey='';panel.showModal();refresh();
    panel.querySelector('[data-done]').focus({preventScroll:true});
  }
  panel.querySelector('[data-done]').onclick=close;takeAll.onclick=()=>transact('takeAll');
  panel.addEventListener('close',()=>{shop=null;leave();});
  return {
    open,close,get current(){return panel.open;},get chart(){return !!wallet?.chart;},
    update(world,near,available){
      market=world?.market??null;badge.hidden=!market || !wallet;badge.disabled=!available;
      if(panel.open && (!market || !available || shop && near?.id!==shop.id)){close();return;}
      refresh();
    },
    receive(data){
      wallet=data?.wallet??null;badge.hidden=!wallet;
      if(data?.seq===pending)pending=0;
      if(data?.message){status.textContent=data.message;badge.title=data.message;}
      refresh();
    },
    reset(){close();wallet=market=null;pending=seq=0;badge.hidden=true;},
  };
}
