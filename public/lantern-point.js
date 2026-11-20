import {causewayArch} from './causeway-arch.js';
import {berthing} from './lantern-buildings-layout.js';
import {contains} from './waterfront-roads.js';

const rect=(west,east,north,south)=>({west,east,north,south});
// Non-overlapping survey strips describe the headland, the marina basin and
// the broad ferry apron. They also drive the chart, quay walls and promenades.
export const lanternLand=[
  rect(-46,45,-481,-474),rect(-62,61,-474,-461),rect(-70,67,-461,-446),
  rect(-57,67,-446,-428),rect(-70,67,-428,-411),rect(-70,62,-411,-390),
  rect(-70,67,-390,-368),rect(-58,56,-368,-358),rect(-34,38,-358,-352),
];
export const lanternBridge=causewayArch(-6,6,-352,-280);
export const lanternRoads=[
  rect(-5.1,5.1,-470.5,-352),
  ...[-49,49].map(x=>rect(x-4.5,x+4.5,-470.5,-365.5)),
  ...[-466,-419,-370].map(z=>rect(-53.5,53.5,z-4.5,z+4.5)),
];
// The slipway continues below tide level, so disembarking swimmers can walk
// back onto the quay and an approaching hull meets the visible sloped ramp.
export const marketPiers=[rect(-68,-57,-443,-441),rect(-69,-57,-433,-431)];
export const pierDeck=.58;
export const onMarketPier=(x,z)=>marketPiers.some(r=>contains(r,x,z));
export const ferrySlip=rect(62,78,-405,-395);
export const slipHeight=x=>.80-(x-ferrySlip.west)*.19;
export const onLantern=(x,z)=>lanternLand.some(r=>contains(r,x,z));
export const onLanternRoad=(x,z)=>lanternRoads.some(r=>contains(r,x,z));
export const lanternPalms=[
  ...[-42,42].flatMap(x=>[-383,-400,-433,-453].map(z=>({x,z}))),
  ...[-37,-26,-15,15,26,37].map(x=>({x,z:-473})),
  ...[[-39,-378],[-11,-378],[-39,-412],[-11,-412],[10.5,-457.4],[39.4,-456.2],[40.4,-436.1],
    [10.4,-398.8],[40.3,-398.8],[39.7,-380.9],[-35,-449.3],[-15,-436.7],[-60,-417.3]].map(([x,z])=>({x,z})),
].map(({x,z})=>({x,z,height:5.9+Math.abs(Math.sin(x+z))*1.7,radius:.22}));
export const lanternSigns=[
  {x:7.8,z:-264,label:'LANTERN POINT',sub:'NORTH VIA LANTERN BRIDGE'},
  {x:7.9,z:-358,label:'LANTERN POINT',sub:'RESIDENCES  /  YACHT CLUB'},
  {x:39.4,z:-377.2,label:'LANTERN YACHT CLUB',sub:'SOLANA BERTH   →'},
  {x:62.9,z:-379.5,label:'SOLANA',sub:'HOME BERTH   /   EAST QUAY'},
];
export const signBarriers=lanternSigns.flatMap(({x,z})=>[-1,1].map(s=>({x:x+s*1.4,z,w:.14,d:.14,h:3.35})));

export const bollards=[-455,-447,-425,-414,-403,-392,-381].map(z=>({x:-68.2,z,w:.35,d:.35,h:.74}));
export const benches=[-31,-15,16,32].map(x=>({x,z:-475.5,w:2.2,d:.52,h:.82}));
export const gardens=[
  rect(-43,43,-479,-472),rect(-66,-56,-415,-375),rect(55,60,-413,-379),
  rect(-42,-8,-459,-425),rect(8,42,-458,-425),rect(-42,-8,-411,-377),rect(8,42,-411,-378),
];
export function lanternLocation(x,z) {
  if(z>lanternBridge.south)return;
  if(contains(lanternBridge,x,z))return 'Lantern Bridge';
  if(onLantern(x,z) || contains(berthing.lip,x,z) || onMarketPier(x,z) || contains(ferrySlip,x,z))return 'Lantern Point';
  return 'Biscayne Bay';
}

export const quayLamps=[
  ...[-8,8].flatMap(x=>[-376,-395,-412,-429,-450,-459].map(z=>({x,z}))),
  ...[-457,-445,-429,-415,-401,-384,-373].map(z=>({x:-55,z})),
  ...[-37,-17,17,37].map(x=>({x,z:-472})),
].map(p=>({...p,w:.28,d:.28,h:3.85}));
