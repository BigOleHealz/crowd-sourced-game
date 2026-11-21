import {paneKey} from './pane-damage.js';
const cached=new WeakMap();
// Exact rectangular openings used both by the office facade and projectile queries.
export function officeWindows(b){
  if(!b.housing || b.facade!==1)return [];
  if(cached.has(b))return cached.get(b);
  const floors=Math.max(1,Math.round((b.eave-3.9)/3.14)),story=(b.eave-3.9)/floors;
  const panes=[];
  for(let floor=0;floor<floors;floor++)for(let side=0;side<4;side++){
    const yaw=side*Math.PI/2,c=Math.round(Math.cos(yaw)),s=Math.round(Math.sin(yaw));
    const span=side%2?b.d:b.w,edge=(side%2?b.w:b.d)/2;
    const bays=Math.max(2,Math.round(span/2.8)),bay=span/bays;
    const bottom=4.70+floor*story+.64,top=4.70+(floor+1)*story-.38;
    for(let k=0;k<bays;k++){
      const u=-span/2+(k+.5)*bay,x=b.x+c*u+s*(edge-.06),z=b.z-s*u+c*(edge-.06);
      panes.push({id:paneKey(x,(top+bottom)/2,z),x,z,width:bay-.26,bottom,top,yaw,side,floor,story,bay,
        at:{x,y:bottom,z}});
    }
  }
  cached.set(b,panes);return panes;
}
