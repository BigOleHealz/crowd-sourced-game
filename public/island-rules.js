// Shared by the HUD and the authoritative match. Amounts are whole dollars.
export const teams = ['brickell', 'lantern'];
export const teamNames = {brickell:'Brickell Avenue', lantern:'Lantern Point'};
export const teamColors = {brickell:'#79d5ed', lantern:'#f3ab67'};
export const auction = {x:0,z:-205};
export const maxTeam = 8, goal = 5_000_000;
export const lotWidth = 1.5, lotHeight = 1.65;
export const modes = {
  'total-loss': {name:'Total Loss', minTeam:1, wreckRate:1, setup:0,
    objective:'Damage enemy property. Each insured loss pays once.'},
  'repo-wars': {name:'Repo Wars', minTeam:5, wreckRate:.5, setup:0, auction:true,
    objective:'Auction enemy cars, helicopters or cases on Harbor Key for full value. Wreck property for half.'},
  'moving-day': {name:'Moving Day', minTeam:5, wreckRate:1, setup:60, jewel:true,
    objective:'Find the enemy’s hidden $2M gold case or damage other insured property.'},
};
export const caseSites = {
  brickell:[[2,11],[-3,-9],[4,-44],[-37,27],[31,60]],
  lantern:[[2,-365],[-3,-390],[4,-419],[-48,-416],[49,-462]],
};
export function closestCase(match, player) {
  let nearest=null, range=3.4;
  for(const lot of match.lots){
    if(!lot.hp || lot.carrier!=null)continue;
    const distance=Math.hypot(lot.x-player.x,lot.y-player.y,lot.z-player.z);
    if(distance<range){nearest=lot;range=distance;}
  }
  return nearest;
}

export const frozenPhase = phase => phase==='waiting' || phase==='paused' || phase==='finished';
