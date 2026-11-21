import {safeInReach} from './public/estate-safes.js';
import {goods,marketStores,atMarketCounter} from './public/market-goods.js';
import {groundHeight,MAP} from './public/world.js';
import {seatVehicle} from './public/seat-selection.js';
import {drivenRoad} from './public/rover.js';

const shopRecovery=45*30,stockDelivery=4*60*30,chartDuration=90*30,dropLifetime=3*60*30;
const maxDrops=160;
export const newWallet=()=>({cash:0,items:{},chartUntil:0});
export function walletView(player,tick){
  return {cash:player.wallet.cash,items:player.wallet.items,chart:player.wallet.chartUntil>tick};
}
function addGoods(bag,items){
  for(const [sku,count] of Object.entries(items))bag[sku]=(bag[sku]??0)+count;
}
export function canUseInventory(world,p){
  return p.clubSince==null && p.life.hp>0 && !p.life.fall && p.state.grounded && !p.state.climb && !p.state.swimming &&
    !p.state.parachute && world.jet.pilot!==p.id && world.tank?.driver!==p.id &&
    world.yacht?.driver!==p.id && world.yacht?.gunner!==p.id && !seatVehicle(world,p.id) && !drivenRoad(world,p.id);
}
export function harborTrade(world,notify){
  const state={shops:{},drops:[],revision:0};
  const keepers=new Map(),observed=new WeakSet(),expiry=new Map();
  let nextDrop=1,nextDelivery=stockDelivery;
  for(const shop of marketStores)state.shops[shop.id]={stock:{...shop.stock},down:false};
  function assign(residents){
    for(const store of marketStores){
      const npc=residents.find(n=>n.id===store.owner);
      if(!npc)continue;
      const point=[store.x+store.side,store.z];
      npc.route={...npc.route,points:[point,point]};
      Object.assign(npc.state,{x:point[0],y:store.y,z:point[1]});
      npc.yaw=-store.side*Math.PI/2;
      keepers.set(store.id,npc);
    }
  }
  function defeat(actor,tick){
    if(actor.life.hp>0 || observed.has(actor.life))return;
    observed.add(actor.life);
    const wallet=actor.wallet;
    const cash=wallet?wallet.cash:12+Math.floor(Math.random()*25);
    const items=wallet?wallet.items:{};
    if(wallet){
      actor.wallet=newWallet();
      if(cash || Object.keys(items).length || wallet.chartUntil)notify(actor,tick,'You dropped your cash and supplies.');
    }
    if(!cash && !Object.keys(items).length)return;
    const {x,y,z}=actor.state;
    const floor=groundHeight(x,z,y+.25,world.doors);
    const drop={id:nextDrop++,x,y:Math.max(MAP.waterY,floor),z,cash,...(Object.keys(items).length && {items})};
    if(state.drops.length===maxDrops)expiry.delete(state.drops.shift().id);
    state.drops.push(drop);
    expiry.set(drop.id,tick+dropLifetime);
    state.revision++;
  }
  function step(players,npcs,tick){
    for(const npc of npcs)defeat(npc,tick);
    for(const player of players.values()){
      defeat(player,tick);
      if(player.wallet.chartUntil && player.wallet.chartUntil<=tick){
        player.wallet.chartUntil=0;notify(player,tick,'Salvage chart expired.');
      }
    }
    for(const store of marketStores){
      const owner=keepers.get(store.id),shop=state.shops[store.id];
      const down=!owner?.life.hp;
      if(shop.down!==down){
        shop.down=down;
        if(down && owner)owner.life.returnAt=Math.max(owner.life.returnAt,tick+shopRecovery);
        else if(!down)shop.stock={...store.stock};
        state.revision++;
      }
      if(tick>=nextDelivery && !down){shop.stock={...store.stock};state.revision++;}
    }
    if(tick>=nextDelivery)nextDelivery=tick+stockDelivery;
    if(!state.drops.length)return;
    const buyers=[...players.values()].filter(p=>canUseInventory(world,p) || (p.life.hp && !p.life.fall && p.state.swimming));
    for(let i=state.drops.length-1;i>=0;i--){
      const d=state.drops[i];
      let buyer=null,nearest=1.22;
      if(tick<expiry.get(d.id)){
        for(const p of buyers){
          if(Math.abs(p.state.y-d.y)>1.35)continue;
          const distance=Math.hypot(p.state.x-d.x,p.state.z-d.z);
          if(distance<nearest || buyer && distance===nearest && p.id<buyer.id){buyer=p;nearest=distance;}
        }
        if(!buyer)continue;
        buyer.wallet.cash+=d.cash;addGoods(buyer.wallet.items,d.items??{});
        notify(buyer,tick,'Picked up '+(d.cash?'$'+d.cash:'supplies')+(d.cash && d.items?' and supplies':'')+'.');
      }
      state.drops.splice(i,1);expiry.delete(d.id);state.revision++;
    }
  }
  function use(player,item,tick){
    const wallet=player.wallet;
    if(!wallet.items[item])return 'You do not have that item.';
    if(item==='tape'){
      const {x,y,z}=player.state;
      const target=[world.rover,world.supercar,...world.traffic].filter(c=>c && !c.wrecked && c.hp>0 && c.hp<c.maxHp &&
        c.driver==null && c.gunner==null && !c.npcDriver && Math.abs(c.speed??0)<.35 && Math.abs(c.y-y)<2.1)
        .map(car=>({car,distance:Math.hypot(car.x-x,car.z-z)})).filter(v=>v.distance<3.8)
        .sort((a,b)=>a.distance-b.distance)[0]?.car;
      if(!target)return 'Stand beside a damaged, parked road vehicle.';
      target.hp=Math.min(target.maxHp,target.hp+60);
    }else if(item==='chart'){
      if(wallet.chartUntil>tick)return 'Your chart is already active.';
      wallet.chartUntil=tick+chartDuration;
    }else{
      if(player.life.hp>=100)return 'You already have full health.';
      player.life.hp=Math.min(100,player.life.hp+(item==='wrap'?40:18));
    }
    if(--wallet.items[item]===0)delete wallet.items[item];
    return 'Used '+goods[item].name+'.';
  }
  function request(player,input,tick){
    if(!Number.isSafeInteger(input.seq) || input.seq<1 || input.seq<=(player.tradeSeq??0))return;
    player.tradeSeq=input.seq;
    const reply=message=>notify(player,tick,message,input.seq);
    if(!canUseInventory(world,player))return reply('Stand on foot to use your inventory.');
    const {action,item}=input;
    if(action==='safe'){
      const safe=safeInReach(player.state,world.doors);
      if(!safe || safe.id!==input.safe)return;
      if((world.doors.estateSafes??0)&safe.bit)return reply('Safe already empty.');
      world.doors.estateSafes=(world.doors.estateSafes??0)|safe.bit;
      return award(player,safe.cash,tick,'Estate safe +$'+safe.cash+'.');
    }
    if(action!=='takeAll' && (typeof item!=='string' || !Object.hasOwn(goods,item)))return reply('Unknown item.');
    if(action==='use')return reply(use(player,item,tick));
    const store=atMarketCounter(player.state);
    if(!store || store.id!==input.shop)return reply('Walk up to the checkout counter.');
    const owner=keepers.get(store.id),shop=state.shops[store.id];
    const down=owner && owner.life.hp===0;
    if(!owner || (!down && (owner.life.fall || Math.hypot(owner.state.x-store.x,owner.state.z-store.z)>3.2)))return reply('The shopkeeper is away from the counter.');
    if((action==='take' || action==='takeAll') && !down)return reply('The shopkeeper is serving customers.');
    if(action==='buy' && down)return reply('The counter is unattended.');
    if(action!=='buy' && action!=='take' && action!=='takeAll')return reply('Unknown transaction.');
    const entries=action==='takeAll'?Object.entries(shop.stock).filter(([,n])=>n>0):[[item,1]];
    if(!entries.length || !shop.stock[entries[0][0]])return reply('Sold out.');
    const price=action==='buy'?goods[item].price:0;
    if(player.wallet.cash<price)return reply('You need $'+price+' for this item.');
    player.wallet.cash-=price;
    for(const [sku,count] of entries){
      shop.stock[sku]-=count;
      player.wallet.items[sku]=(player.wallet.items[sku]??0)+count;
    }
    state.revision++;
    reply(action==='takeAll'?'Collected the remaining stock.':(price?'Bought ':'Collected ')+goods[item].name+'.');
  }
  function award(player,amount,tick,message){
    player.wallet.cash+=amount;notify(player,tick,message);
  }
  return {state,assign,step,request,award};
}
