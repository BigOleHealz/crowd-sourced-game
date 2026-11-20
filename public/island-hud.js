import * as THREE from 'three';
import {auction,closestCase,goal,lotHeight,lotWidth,minTeam,modes,teamColors,teamNames,teams} from './island-rules.js';
import {groundHeight} from './world.js';

const money=new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const byId=id=>document.getElementById(id);

export function drawMatchMap(ctx,sx,sy,match,team){
  for(const lot of match.lots){
    if(!lot.hp || (lot.jewel && lot.owner!==team))continue;
    ctx.fillStyle=lot.jewel?'#ffe085':teamColors[lot.owner];
    ctx.fillRect(sx(lot.x)-2,sy(lot.z)-2,5,5);
  }
  if(modes[match.mode].auction){
    ctx.fillStyle='#ffe085';ctx.fillText('A',sx(auction.x),sy(auction.z));
  }
}
export function updateMatchHud(match,team,local){
  const rule=modes[match.mode], carried=match.lots.find(l=>l.carrier===local.id), near=closestCase(match,local);
  byId('match-card').hidden=false;
  byId('supply-card').hidden=true;
  byId('mode-title').textContent=rule.name+' · '+teamNames[team];
  for(const key of teams){
    byId(key+'-players').textContent=match.counts[key]+' players';
    byId(key+'-bill').textContent=money.format(match.scores[key]);
  }
  let objective=rule.objective;
  if(match.phase==='waiting' || match.phase==='paused'){
    objective=(match.phase==='paused'?'Match paused. ':'')+'Waiting for '+minTeam+' players on each island.';
  }else if(match.phase==='finished'){
    objective=teamNames[match.winner]+' wins. Next round in '+match.remaining+'s.';
  }else if(match.phase==='setup'){
    objective=match.remaining+'s to hide your gold case. '+(carried?'Press G to set it down.':'Press G beside it to pick it up.');
  }else if(carried){
    const distance=Math.round(Math.hypot(local.x-auction.x,local.z-auction.z));
    objective='Deliver to Harbor Key auction · '+distance+' m. G drops the case.';
  }else if(rule.auction && near && near.owner!==team){
    objective='Press G to take this '+money.format(near.value)+' case to the Harbor Key auction.';
  }else if(near && match.phase==='active'){
    objective=(near.owner===team?'Defend':'Enemy property')+' · '+money.format(near.value*rule.wreckRate)+' · '+(near.jewel?'Crown jewel':'Insured cargo');
  }
  byId('mode-objective').textContent=objective;
  byId('mode-target').textContent='First to '+money.format(goal);
  const receipt=match.phase==='finished'?match.biggest:match.last;
  byId('mode-receipt').textContent=receipt ? teamNames[receipt.team]+' +'+money.format(receipt.value)+' · '+receipt.label : '';
}

export function createCaseView(scene){
  const geometry=new THREE.BoxGeometry(lotWidth,lotHeight,lotWidth);
  const strap=new THREE.BoxGeometry(.10,lotHeight+.02,lotWidth+.02);
  const materials=Object.fromEntries(Object.entries({...teamColors,gold:'#d9ad56',metal:'#41494c'}).map(([key,color])=>[key,new THREE.MeshStandardMaterial({color,roughness:.63})]));
  const models=new Map();
  let ring;
  return match=>{
    for(const lot of match.lots){
      let group=models.get(lot.id);
      if(!group){
        group=new THREE.Group();
        group.add(new THREE.Mesh(geometry,materials[lot.jewel?'gold':lot.owner]));
        for(const x of [-.47,.47]){
          const band=new THREE.Mesh(strap,materials.metal);
          band.position.x=x;group.add(band);
        }
        scene.add(group);models.set(lot.id,group);
      }
      group.visible=lot.hp>0;
      const carried=lot.carrier!=null;
      group.scale.setScalar(carried?.45:1);
      group.position.set(lot.x,lot.y+(carried?1.1:lotHeight/2),lot.z+(carried?.4:0));
    }
    if(modes[match.mode].auction && !ring){
      ring=new THREE.Mesh(new THREE.RingGeometry(4.6,5,48),new THREE.MeshBasicMaterial({color:0xf0c471,side:THREE.DoubleSide}));
      ring.rotation.x=-Math.PI/2;ring.position.set(auction.x,groundHeight(auction.x,auction.z)+.04,auction.z);
      scene.add(ring);
    }
  };
}
