import {auction,caseSites,closestCase,goal,maxTeam,modes,teams} from './public/island-rules.js';
import {coast,within} from './public/brickell-map.js';
import {onLantern} from './public/lantern-point.js';
import {blocked,groundHeight} from './public/world.js';

const caseValues=[2_000_000,2_500_000,1_750_000,2_250_000,1_500_000];
const vehicles={
  rover:{owner:'brickell',name:'Crew pickup',value:350_000},
  heli:{owner:'brickell',name:'Helicopter',value:1_250_000},
  supercar:{owner:'lantern',name:'Vesper GT',value:650_000},
  yacht:{owner:'lantern',name:'Solana yacht',value:1_500_000},
};
export function propertyTeam(x,z){
  if(onLantern(x,z))return 'lantern';
  if(within(coast,x,z))return 'brickell';
  return null;
}
export function teamSpawn(team,slot){
  // Leave room beside the enlarged Humvee at the Brickell team spawn.
  const x=(slot%4-1.5)*1.1+(team==='brickell'?.75:0),z=(team==='brickell'?17:-371)-Math.floor(slot/4)*1.3;
  return {x,z,y:groundHeight(x,z),vy:0,grounded:true};
}
export function assignTeam(players){
  const used=Object.fromEntries(teams.map(t=>[t,new Set()]));
  for(const p of players.values())used[p.team].add(p.slot);
  const team=used.brickell.size<=used.lantern.size?'brickell':'lantern';
  for(let slot=0;slot<maxTeam;slot++)if(!used[team].has(slot))return {team,slot};
  return null;
}
export function createMatch(mode){
  const rules=modes[mode], paid=new Set();
  const lots=teams.flatMap(owner=>caseSites[owner].map(([x,z],i)=>({
    id:owner+'-'+i,owner,x,z,y:groundHeight(x,z),value:rules.jewel && i>0 ? 1_500_000 : caseValues[i],
    jewel:Boolean(rules.jewel && i===0),hp:120,carrier:null,
  })));
  const state={mode,phase:'waiting',remaining:0,counts:{brickell:0,lantern:0},scores:{brickell:0,lantern:0},winner:null,last:null,biggest:null,lots};
  let remainingTicks=0, resumePhase;
  function award(team,owner,id,label,value){
    if(state.phase!=='active' || !teams.includes(team) || !owner || owner===team || paid.has(id))return false;
    paid.add(id);
    state.scores[team]+=value;
    state.last={team,label,value};
    if(!state.biggest || value>state.biggest.value)state.biggest=state.last;
    if(state.scores[team]>=goal){
      state.winner=team;state.phase='finished';remainingTicks=15*30;state.remaining=15;
    }
    return true;
  }
  function updateRoster(players){
    for(const team of teams)state.counts[team]=0;
    for(const p of players.values())state.counts[p.team]++;
    const ready=teams.every(t=>state.counts[t]>=rules.minTeam);
    if(!ready && (state.phase==='active' || state.phase==='setup')){
      resumePhase=state.phase;state.phase='paused';
    }else if(ready && state.phase==='paused'){
      state.phase=resumePhase;
    }else if(state.phase==='waiting' && ready){
      state.phase=rules.setup?'setup':'active';
      remainingTicks=rules.setup*30;state.remaining=rules.setup;
    }
  }
  function drop(lot){
    if(!lot)return;
    lot.carrier=null;
    lot.y=groundHeight(lot.x,lot.z,lot.y+1);
    if(lot.y<0 || blocked(lot.x,lot.y,lot.z,{},undefined)){
      const [x,z]=caseSites[lot.owner][Number(lot.id.split('-')[1])];
      Object.assign(lot,{x,z,y:groundHeight(x,z)});
    }
  }
  function release(player){
    drop(lots.find(l=>l.carrier===player.id));
  }
  function interact(player){
    if(!player.life.hp || !['active','setup'].includes(state.phase))return;
    const held=lots.find(l=>l.carrier===player.id);
    if(held){drop(held);return;}
    const lot=closestCase(state,player.state);
    if(!lot)return;
    const hiding=state.phase==='setup' && lot.jewel && player.team===lot.owner;
    const stealing=state.phase==='active' && rules.auction && player.team!==lot.owner;
    if(hiding || stealing)lot.carrier=player.id;
  }
  function step(players,world){
    if(state.phase==='finished') {
      state.remaining=Math.ceil(--remainingTicks/30);
      return remainingTicks<=0;
    }
    for(const lot of lots){
      if(lot.carrier==null)continue;
      const p=players.get(lot.carrier);
      if(!p?.life.hp){drop(lot);continue;}
      const {x,y,z}=p.state;
      if(state.phase==='setup' && propertyTeam(x,z)!==lot.owner){drop(lot);continue;}
      Object.assign(lot,{x,y,z});
      if(rules.auction && Math.hypot(x-auction.x,z-auction.z)<5 && Math.abs(y-groundHeight(x,z))<3){
        if(award(p.team,lot.owner,lot.id,'Auction delivery',lot.value)){lot.hp=0;lot.carrier=null;}
      }
    }
    if(rules.auction && world && state.phase==='active'){
      for(const key of ['rover','supercar','heli']){
        const vehicle=world[key], asset=vehicles[key];
        const driver=players.get(vehicle.driver??vehicle.pilot);
        if(!driver || !driver.life.hp || driver.team===asset.owner || vehicle.wrecked)continue;
        if(Math.hypot(vehicle.x-auction.x,vehicle.z-auction.z)>5 || Math.abs(vehicle.speed??0)>1)continue;
        if(key==='heli' && !vehicle.grounded)continue;
        award(driver.team,asset.owner,'vehicle:'+key,asset.name+' auction',asset.value);
      }
    }
    if(state.phase==='setup'){
      state.remaining=Math.ceil(--remainingTicks/30);
      if(!remainingTicks){
        for(const lot of lots)if(lot.carrier!=null)drop(lot);
        state.phase='active';
      }
    }
    return false;
  }
  function damageLot(team,lot,damage){
    if(state.phase!=='active' || !teams.includes(team) || team===lot.owner || !lot.hp)return;
    lot.hp=Math.max(0,lot.hp-damage);
    if(!lot.hp){
      lot.carrier=null;
      award(team,lot.owner,lot.id,lot.jewel?'Crown jewel':'Insured cargo',lot.value*rules.wreckRate);
    }
  }
  function wreckVehicle(team,key){
    const asset=vehicles[key];
    if(asset)award(team,asset.owner,'vehicle:'+key,asset.name,asset.value*rules.wreckRate);
  }
  function damageProperty(team,point,id,label,value){
    return award(team,propertyTeam(point.x,point.z),id,label,value*rules.wreckRate);
  }
  function brokenPane(team,point,id){
    return damageProperty(team,point,'glass:'+id,'Broken glazing',45_000);
  }
  function brokenPost(team,point){
    return damageProperty(team,point,'post:'+(point.postId??point.lamp),'Street fixture',25_000);
  }
  return {state,brokenPane,brokenPost,spawn:p=>teamSpawn(p.team,p.slot),updateRoster,step,release,interact,damageLot,damageProperty,wreckVehicle};
}
