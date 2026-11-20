import {mareBase,mareUpper,mareBarriers,mareLoggiaRoof} from './palazzo-mare.js';
// Lantern Point's three properties share their geometry with the collision and chart.
const volume=(id,x,z,w,d,h,bottom=0)=>({id,x,z,w,d,h,bottom});
export const villaWings=[
  volume('villa-gallery',-25,-405,30,8,7.4),
  volume('villa-west-wing',-36.3,-392.5,7.4,17,4.1),
  volume('villa-east-wing',-13.7,-392.5,7.4,17,4.1),
];
export const limestoneBase=mareBase;
export const clubSalon=volume('club-salon',25,-395,24,10,4.4);
export const lanternBuildings=[...villaWings,limestoneBase,clubSalon];
export const upperFloors=mareUpper;
export const pools=[
  {x:-25,z:-392.6,w:10.3,d:13.6,color:0x9bdfdb},
  {x:26.4,z:-429.8,w:17.7,d:5.6,color:0xabddd5},
  {x:-25,z:-443,w:5.4,d:16.4,color:0x397774,reflecting:true},
];
export const clubColumns=[-13.0,-6.5,0,6.5,13.0].map(u=>({x:25+u,z:-385.1,w:.48,d:.48,h:3.88}));
export const loggiaColumns=[-12.8,-6.4,0,6.4,12.8].map(u=>({x:25+u,z:-433.8,w:.54,d:.54,h:3.86}));
export const shadeColumns=[[-37.1,-381.6],[-12.9,-381.6]].map(([x,z])=>({x,z,w:.27,d:.27,h:3.9}));
export const hedges=[
  ...[-38,-12].map(x=>({x,z:-443,w:1.05,d:23,h:.86})),
  ...[-33.4,-16.6].flatMap(x=>[-454.1,-431.9].map(z=>({x,z,w:7.8,d:1.1,h:.86}))),
  {x:-13.1,z:-380.0,w:6.8,d:1.12,h:.76},{x:-36.9,z:-380.0,w:6.8,d:1.12,h:.76},
  {x:10.5,z:-443.8,w:.95,d:15.2,h:.75},
];
export const planters=[[-40,-386],[-10,-386],[-40,-398],[-10,-398],[11,-382.5],[39,-382.5],
  [40.4,-431],[9.5,-430],[12.5,-453.6],[35.6,-454.8],[-60.8,-448],[-60.8,-424]]
  .map(([x,z])=>({x,z,w:1.35,d:1.35,h:1.05}));
export const berthing={landing:{west:62.2,east:67,north:-382,south:-370},lip:{west:67,east:68.05,north:-376.8,south:-372.2},gangway:{x:66.38,z:-374.5}};
export const clubRoof=volume('club-loggia',25,-390.3,26.7,11.1,4.18,3.88);
export const loggiaRoof=mareLoggiaRoof;
export const estateBarriers=[...mareBarriers,...clubColumns,...loggiaColumns,...shadeColumns,...hedges,...planters,clubRoof,
  volume('luma-tablet',-12.9,-378.9,3.12,.58,1.34),volume('mare-tablet',37.5,-425.3,3.12,.58,1.34),
  ...pools.map(p=>({...p,h:.18})),volume('garden-sculpture',-25,-443,1.6,2.4,3.7),
  // Bathymetry here is −2.8 m. These colliders stop swimmers and approaching RHIBs at the two visible hulls.
  volume('west-sloop',-63,-439.15,6.1,1.9,3.29),volume('west-launch',-63.4,-429.9,6.1,1.9,3.29)];
