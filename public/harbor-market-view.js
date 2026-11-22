import * as THREE from 'three';
import {marketHalls} from './harbor-market.js';
import {roundedBrow,marketSunburst} from './harbor-deco-view.js';

export function furnishMarketStreet(solids){
  const box=new THREE.BoxGeometry(),tube=new THREE.CylinderGeometry(1,1,1,12);
  for(const [index,h] of marketHalls.entries()){
    const {x,z,w,d}=h,blue=index?0x467f83:0x367476;
    const c=index?0xe69889:0x95cdc4,cream=0xffebce,brass=0xc9a873,front=z+d/2;
    const add=(color,dx,y,dz,ww,hh,dd)=>solids.add(box,color,x+dx,.8+y,z+dz,ww,hh,dd);
    // Wide walkable porches under ribbed metal fascias. Roof piers are at the
    // four corners, leaving every shop and gallery entrance exposed.
    add(0xc8bca6,0,3.79,0,w+.90,.24,d+.90);
    add(c,0,3.976,0,w+.67,.22,d+.66);
    add(blue,0,4.13,0,w+.76,.10,d+.75);
    for(let u=-w/2+.6;u<w/2;u+=.44)add(0xa1aaa0,u,4.196,0,.035,.037,d+.51);
    for(const side of [-1,1]){
      const xside=side*(w/2-.25);
      for(const end of [-1,1]){
        add(0xe1d5c1,xside,1.42,end*(d/2-.17),.18,2.84,.18);
        add(blue,xside,.18,end*(d/2-.17),.29,.36,.29);
      }
      add(blue,side*(w/2+.47),2.815,0,1.19,.1,d-.52);
      for(let t=-d/2+.77;t<d/2-.63;t+=.60)
        add(index?0xc5ad8d:0xd6ccc0,side*(w/2+.42),2.90,t,1.28,.07,.09);
      for(const start of [-1,1]){
        const u=side*(w/2-.64),v=start*(d/2-.64);
        add(0x887665,u,3.48,v,.44,.94,.32);
        for(let j=0;j<6;j++)add(0xbba486,u,3.07+j*.16,v+.04,.48,.056,.37);
      }
    }
    // The faceted sunrise sits above the north and south portals. All support
    // is overhead so both arcades keep their full approach and turning space.
    for(const end of [-1,1]){
      const face=z+end*(d/2+.30);
      roundedBrow(solids,blue,x,.8+3.10,face,6.0,1.85,.13);
      roundedBrow(solids,cream,x,.8+3.21,face,6.18,1.92,.11);
      roundedBrow(solids,c,x,.8+3.37,face,5.84,1.65,.20);
      for(const [width,height] of [[6.6,.39],[4.6,.69],[2.8,1.07]]){
        add(c,0,4.10+height/2,end*(d/2-.08),width,height,.36);
        add(cream,0,4.10+height,end*(d/2-.08),width+.10,.071,.46);
      }
      marketSunburst(solids,box,tube,x,.8+4.60,z+end*(d/2+.15),end,blue,brass);
    }
    // Ocean Drive's long horizontal shade ledges curl around a vertical blade.
    // The two street fronts answer one another across the central avenue.
    const avenueSide=Math.sign(-x),avenueFace=x+avenueSide*w/2;
    for(const [y,width,depth,tint] of [[4.26,d+.54,.83,cream],[4.46,d-.46,.70,blue]]){
      roundedBrow(solids,tint,avenueFace,.8+y,z,width,depth,.13,Math.PI/2);
    }
    for(let i=-1;i<=1;i++){
      const tall=(i===0?2.74:2.11)*(index?.88:1);
      add(cream,avenueSide*(w/2-.08),4.15+tall/2,i*.37,.53,tall,.34);
      add(blue,avenueSide*(w/2+.20),4.20+(tall-.22)/2,i*.37,.044,tall-.22,.082);
    }
    // A band of flush terracotta and limestone guides the walk from the road
    // to the arcade. These inlays sit on the existing walkable surface.
    for(let k=0;k<6;k++){
      solids.add(box,k%2?0xb9aba0:0xb9a18e,x,.808,front+1.02+k*.41,4.00,.012,.395);
      for(const side of [-1,1])solids.add(box,0xd4cabc,x+side*2.10,.808,front+1.02+k*.41,.14,.013,.40);
    }
    // Roof-mounted ventilation and a high, louvred mechanical screen.
    add(blue,-2.3,4.39,-1.4,2.70,.47,1.10);
    for(let k=0;k<11;k++)add(0x293d3c,-3.45+k*.22,4.43,-.842,.073,.27,.038);
    for(const dx of [1.24,2.40]){
      solids.add(tube,0x8d9490,x+dx,.8+4.32,z-2.13,.40,.21,.4);
      solids.add(tube,0x626c6e,x+dx,.8+4.44,z-2.13,.45,.055,.45);
    }
  }
  box.dispose();tube.dispose();
}
