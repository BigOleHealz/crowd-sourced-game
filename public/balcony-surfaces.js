import {chamferedOutline,guardHeight,hasApartmentBalconies,towerBays,towerStories} from './tower-glass.js';
import {breachedFloor,towerCollapsed} from './tower-damage.js';

export const balconyBase=.80,balconyPodium=3.9,wrapDepth=1.45,privateDepth=1.22,cornerCut=.65;
export const privateWidth=opening=>opening+.13;
const slabThickness=.21,start=balconyBase+balconyPodium+.04;
function segmentDistance(x,z,[ax,az],[bx,bz]){
  const dx=bx-ax,dz=bz-az,t=Math.max(0,Math.min(1,((x-ax)*dx+(z-az)*dz)/(dx*dx+dz*dz)));
  return Math.hypot(x-ax-t*dx,z-az-t*dz);
}
export function balconySurfaces(buildings){
  const towers=buildings.filter(b=>b.housing && hasApartmentBalconies(b.facade)).map(b=>{
    const wrap=b.facade===0,hw=b.w/2,hd=b.d/2;
    const slabs=[];
    if(wrap){
      const edge=chamferedOutline(hw+wrapDepth-.1,hd+wrapDepth-.1,.60);
      const a=hw+wrapDepth,d=hd+wrapDepth;
      slabs.push({x:0,z:0,a,d,cut:cornerCut,rails:edge.map((p,i)=>[p,edge[(i+1)%edge.length]])});
    }else for(let side=0;side<4;side++){
      const alongX=side%2===0,sign=side<2?1:-1,length=alongX?b.w:b.d;
      const {bays,bay,pier}=towerBays(length,false);
      for(let j=0;j<bays;j++){
        const along=-length/2+(j+.5)*bay,half=privateWidth(bay-pier)/2;
        const point=(u,v)=>alongX?[u,sign*(hd+v)]:[sign*(hw+v),u];
        const [x,z]=point(along,privateDepth/2-.1);
        const edge=[[along-half+.06,.04],[along-half+.06,privateDepth-.085],[along+half-.06,privateDepth-.085],[along+half-.06,.04]].map(([u,v])=>point(u,v));
        slabs.push({x,z,a:alongX?half:privateDepth/2+.1,d:alongX?privateDepth/2+.1:half,cut:0,
          rails:edge.slice(1).map((p,i)=>[edge[i],p])});
      }
    }
    return {b,slabs,...towerStories(b,balconyPodium)};
  });
  // maxY is the top of the body for side contact and the old foot height for
  // landings. Selecting by story prevents snapping up to a higher balcony.
  return function query(x,z,r,maxY,doors,ceiling=false,round=false){
    let result=ceiling?Infinity:-Infinity;
    for(const {b,slabs,story,floors} of towers){
      const u=x-b.x,v=z-b.z;
      if(Math.abs(u)>b.w/2+wrapDepth+r || Math.abs(v)>b.d/2+wrapDepth+r || towerCollapsed(b,doors))continue;
      if(Math.abs(u)<b.w/2-.21-r && Math.abs(v)<b.d/2-.21-r)continue;
      const first=ceiling?Math.max(0,Math.ceil((maxY-start+slabThickness-.0001)/story)):
        Math.min(floors-1,Math.floor((maxY-start+slabThickness+.0001)/story));
      for(let i=first;i>=0 && i<floors;i+=ceiling?1:-1){
        const top=start+i*story-(b.towerId===9?.04:0);
        if(breachedFloor(b,x,z,top-.002,doors)!=null)continue;
        let found=false;
        for(const s of slabs){
          const dx=Math.abs(u-s.x),dz=Math.abs(v-s.z);
          if(dx>s.a+r || dz>s.d+r || dx+dz>s.a+s.d-s.cut+r*Math.SQRT2)continue;
          if(ceiling)result=Math.min(result,top-slabThickness);
          else{
            result=Math.max(result,top);
            if(maxY>=top)for(const [a,end] of s.rails){
              if(segmentDistance(u,v,a,end)>r+.028)continue;
              if(round){
                const dx=end[0]-a[0],dz=end[1]-a[1],len=Math.hypot(dx,dz);
                const along=((u-a[0])*dx+(v-a[1])*dz)/len;
                const railHeight=maxY-top;
                const spacing=len/Math.ceil(len/(b.facade===0?1.55:.155));
                if(Math.abs(railHeight-guardHeight)>.028 && Math.abs(railHeight-.12)>.025 &&
                   Math.abs(along-Math.round(along/spacing)*spacing)>.028)continue;
              }
              result=Math.max(result,top+guardHeight+(b.towerId===9?.04:0));
            }
          }
          found=true;
        }
        if(found)break;
        // All stories use the same floor plan.
        break;
      }
    }
    return result;
  };
}
