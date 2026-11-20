// Yacht-local metres, with the bow toward negative Z. The open centerline
// connects the landing deck, main salon and forward helm.
export const mainSole=2.55, upperSole=4.92, cabinTop=7.19;
export const companionway={left:1.46,right:3.26,aft:-2.2,fore:-6.62,count:13};
const ivory=0xece8db,teak=0x99714e,oak=0xb48a64,cream=0xe7dbc4,
  petrol=0x406867,brass=0xae976d,frame=0x354b50,glass=0x68959b;
export const cabinPieces=[];
function piece(x,y,z,w,h,d,tint,finish='solid'){
  cabinPieces.push({x,y,z,w,h,d,tint,finish});
}
function panel(x,y,z,w,h,d,tint){piece(x,y,z,w,h,d,tint,'trim');}
function deck(x,z,w,d,top){
  piece(x,top-.09,z,w,.18,d,ivory,'deck');

}
const stair=companionway;
// Split the upper sole around a full-height opening. Trim and parquet follow
// the same pieces so no hidden face spans the companionway.
deck((-4.2+stair.left)/2,-5.5,4.2+stair.left,13,upperSole);
deck((4.2+stair.right)/2,-5.5,4.2-stair.right,13,upperSole);
for(const [a,b] of [[-12,stair.fore],[stair.aft,1]])
  deck((stair.left+stair.right)/2,(a+b)/2,stair.right-stair.left,b-a,upperSole);
deck(0,-5.45,7.14,9.5,cabinTop);

function saloon(half,fore,aft,floor,top){
  const mid=(fore+aft)/2, length=aft-fore,head=top-.18, sill=floor+.70;
  for(const sign of [-1,1]){
    const side=sign*(half-.09);
    piece(side,(floor+sill)/2,mid,.18,sill-floor,length,ivory);
    piece(side,(sill+head)/2,mid,.14,head-sill,length,glass,'glass');
    panel(side,sill,mid,.21,.065,length,teak);
    for(let z=fore+.1;z<aft;z+=2)
      panel(side,(sill+head)/2,z,.19,head-sill,.09,frame);
    for(const z of [fore,aft]){
      // A pair of fixed glazed leaves flank each permanently open doorway.
      const edge=1.46, width=half-edge,x=sign*(edge+width/2);
      piece(x,(floor+sill)/2,z,width,sill-floor,.17,ivory);
      piece(x,(sill+head)/2,z,width,head-sill,.15,glass,'glass');
      piece(sign*edge,(floor+head)/2,z,.09,head-floor,.21,teak);
      panel(x,sill,z,width,.06,.20,brass);
    }
  }
  for(const z of [fore,aft])piece(0,head-.04,z,2*half,.08,.21,ivory);
}
saloon(4.04,-11.85,.88,mainSole,upperSole);
saloon(3.44,-10.05,-.88,upperSole,cabinTop);

const tread=(stair.aft-stair.fore)/stair.count;
for(let i=0;i<stair.count;i++){
  const h=(upperSole-mainSole)*(i+1)/stair.count,z=stair.aft-(i+.5)*tread;
  piece((stair.left+stair.right)/2,mainSole+h/2,z,stair.right-stair.left,h,tread,teak,'step');
  panel((stair.left+stair.right)/2,mainSole+h,z+tread*.44,stair.right-stair.left,.015,.029,brass);
}
// Guard the open upper stairwell on the inboard edge, leaving the forward
// landing and lower approach free.
piece(stair.left-.045,upperSole+.45,(stair.fore+stair.aft)/2,.09,.90,tread*stair.count,glass,'glass');
panel(stair.left-.045,upperSole+.92,(stair.fore+stair.aft)/2,.12,.07,tread*stair.count,teak);
piece((stair.left+stair.right)/2,upperSole+.45,stair.aft+.04,stair.right-stair.left,.90,.08,glass,'glass');
panel((stair.left+stair.right)/2,upperSole+.92,stair.aft+.04,stair.right-stair.left,.07,.11,teak);

function settee(x,floor,z,length,side){
  piece(x,floor+.20,z,.92,.40,length,teak);
  piece(x,floor+.45,z,.97,.22,length,cream);
  piece(x+side*.41,floor+.72,z,.18,.68,length,petrol);
  for(const end of [-1,1])piece(x,floor+.58,z+end*(length/2-.09),.94,.32,.18,cream);
  for(let at=-length/2+.74;at<length/2-.3;at+=.89){
    panel(x,floor+.561,z+at,.70,.012,.018,oak);
    piece(x+side*.28,floor+.73,z+at,.29,.43,.49,petrol,'pillow');
  }
}
function table(x,floor,z,w,d){
  piece(x,floor+.40,z,.24,.78,.36,brass);
  piece(x,floor+.80,z,w,.10,d,oak);
}
settee(-3.24,mainSole,-3.65,4.05,-1);
table(-2.08,mainSole,-3.65,.83,1.85);
// Forward galley with a stone worktop, under-counter drawers and inset sink.
piece(-3.36,mainSole+.47,-9.2,1.03,.94,3.52,teak);
piece(-3.36,mainSole+.99,-9.2,1.12,.10,3.61,cream);
panel(-3.36,mainSole+1.05,-9.84,.68,.025,.84,frame);
panel(-3.36,mainSole+1.07,-9.84,.56,.014,.71,0x869394);
for(const z of [-10.4,-9.2,-8])panel(-2.83,mainSole+.78,z,.05,.034,.32,brass);
settee(-2.72,upperSole,-5.65,3.8,-1);
table(-1.72,upperSole,-5.65,.67,1.50);
piece(-2.78,upperSole+.42,-9.26,.86,.84,1.11,teak);
panel(-2.77,upperSole+.86,-9.25,.75,.045,.97,cream);
for(const [floor,ceiling] of [[mainSole,upperSole-.18],[upperSole,cabinTop-.18]]){
  for(const z of [-8.9,-5.7,-2.55]){
    panel(-.52,ceiling-.026,z,.14,.05,1.18,brass);
    piece(-.52,ceiling-.058,z,.09,.018,1.09,0xffedc6,'light');
  }
  panel(0,floor+.012,-5.62,1.80,.018,6.44,0x517577);
  for(const x of [-.84,.84])panel(x,floor+.024,-5.62,.025,.008,6.33,cream);
}

const solids=cabinPieces.filter(b=>b.finish!=='trim' && b.finish!=='pillow' && b.finish!=='light');
function footprint(b,x,z,r){
  return Math.abs(x-b.x)<=b.w/2+r && Math.abs(z-b.z)<=b.d/2+r;
}
export function cabinSupport(x,y,z,r=0){
  let floor=-Infinity;
  for(const b of solids){
    const top=b.y+b.h/2;
    if(top<=y+.30 && top>floor && footprint(b,x,z,r))floor=top;
  }
  return floor;
}
export function cabinCeiling(x,y,z){
  let bottom=Infinity;
  for(const b of solids){
    const base=b.y-b.h/2;
    if(base>y+.30 && base<bottom && footprint(b,x,z,.20))bottom=base;
  }
  return bottom;
}
export function cabinIntersects(x,bottom,z,top,r=0,walking=false){
  for(const b of solids){
    // Tread support uses the feet center so a capsule does not catch the
    // next riser while ascending. Upper slabs still block at head height.
    if(b.y+b.h/2>bottom && b.y-b.h/2<top && footprint(b,x,z,walking && b.finish==='step'?0:r))return true;
  }
  return false;
}
export function cabinDepth(x,y,z){
  const upper=y>=upperSole-.03, half=upper?3.44:4.04,fore=upper?-10.05:-11.85,aft=upper?-.88:.88;
  return y>=mainSole-.08 && y<cabinTop-.25 ? Math.min(half-Math.abs(x),z-fore,aft-z) : -1;
}
