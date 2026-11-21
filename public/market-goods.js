import {storefrontFaces,retailRoom} from './frontage-glass.js';
import {shopFloor} from './street-shop-layout.js';

export const goods={
  tape:{name:'Marine repair kit',price:35,description:'Restores 60 HP to a damaged, unoccupied road vehicle within reach.'},
  chart:{name:'Salvage chart',price:18,description:'Marks unclaimed cash and supply bags on your district map for 90 seconds.'},
  snack:{name:'Guava snack',price:8,description:'Restores 18 health.'},
  wrap:{name:'First-aid wrap',price:20,description:'Restores 40 health.'},
};
const counters=[
  ['rival-isabel',{tape:3,wrap:2}],
  ['rival-ana',{chart:4,snack:2}],
  ['rival-nora',{snack:6,wrap:3}],
  ['rival-mei',{wrap:4,tape:2}],
];
export const marketStores=storefrontFaces.filter(f=>f.building.market).map((face,j)=>{
  const [owner,stock]=counters[j];
  const {building:b,side,buildingIndex,depth}=face;
  const cells=Math.floor((b.d-.8)/3.5),bay=(buildingIndex+1)%cells;
  const variant=(buildingIndex*3+bay+side+1)%7;
  const x=b.x+side*(b.w/2-depth*(.69+.05*(variant%2)));
  const z=b.z-side*(bay+.5-cells/2)*(b.d-.85)/cells;
  return {id:face.id,name:face.name,owner,stock,x,y:shopFloor,z,side};
});
const byFace=new Map(marketStores.map(s=>[s.id,s]));
export function atMarketCounter(feet){
  if(!feet?.grounded || feet.swimming || feet.climb || feet.parachute)return null;
  const store=byFace.get(retailRoom(feet.x,feet.y,feet.z)?.id);
  return store && Math.abs(feet.y-store.y)<.6 && Math.hypot(feet.x-store.x,feet.z-store.z)<2.65 ? store : null;
}
