// Yacht-local metres, with the bow toward negative Z. The open centerline
// connects the aft deck, main salon and forward helm.
export const lowerSole=.27, mainSole=2.55, upperSole=4.92, cabinTop=7.19;
export const companionway={left:1.46,right:3.26,aft:-2.2,fore:-6.62,count:13};
// A port-side flight descends aft from the forward salon passage to the guest suite.
export const lowerStair={left:-2.55,right:-.94,fore:-10.45,aft:-5.65,count:13};
export const guestSuite={left:-3.67,right:3.67,fore:-11.45,aft:.56};
export function inGuestSuite(x,z){
  return x>=guestSuite.left && x<=guestSuite.right && z>=guestSuite.fore && z<=guestSuite.aft;
}
export function inLowerHatch(x,z){
  return x>=lowerStair.left && x<=lowerStair.right && z>=lowerStair.fore && z<=lowerStair.aft;
}
const ivory=0xece8db,teak=0x99714e,oak=0xb48a64,cream=0xe7dbc4,
  petrol=0x406867,brass=0xae976d,frame=0x354b50,glass=0x68959b;
export const cabinPieces=[];
function piece(x,y,z,w,h,d,tint,finish='solid'){
  const p={x,y,z,w,h,d,tint,finish};
  if(finish==='glass')p.paneId='cabin-'+cabinPieces.length;
  cabinPieces.push(p);
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
    const count=Math.ceil(length/2);
    for(let i=0;i<count;i++)piece(side,(sill+head)/2,fore+(i+.5)*length/count,.14,head-sill,length/count,glass,'glass');
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

// The lower suite stays above the waterline. Its headliner is split around the
// hatch so the same opening works for a walking passenger, shots and the camera.
const suite=guestSuite, lower=lowerStair;
const suiteMid=(suite.fore+suite.aft)/2, suiteLength=suite.aft-suite.fore;
deck(0,suiteMid,suite.right-suite.left,suiteLength,lowerSole);
for(const [left,right,fore,aft] of [
  [suite.left,lower.left,suite.fore,suite.aft],[lower.right,suite.right,suite.fore,suite.aft],
  [lower.left,lower.right,suite.fore,lower.fore],[lower.left,lower.right,lower.aft,suite.aft],
])deck((left+right)/2,(fore+aft)/2,right-left,aft-fore,mainSole);
const wallHigh=mainSole-.18, wallY=(lowerSole+wallHigh)/2;
for(const x of [suite.left,suite.right])piece(x,wallY,suiteMid,.14,wallHigh-lowerSole,suiteLength,cream);
for(const z of [suite.fore,suite.aft])piece(0,wallY,z,suite.right-suite.left,wallHigh-lowerSole,.14,oak);
const lowerRun=(lower.aft-lower.fore)/lower.count, stairX=(lower.left+lower.right)/2;
for(let i=0;i<lower.count;i++){
  const top=mainSole-(mainSole-lowerSole)*(i+1)/lower.count;
  const z=lower.fore+(i+.5)*lowerRun;
  piece(stairX,top-.085,z,lower.right-lower.left,.17,lowerRun,teak,'step');
  panel(stairX,top+.003,z-lowerRun*.45,lower.right-lower.left,.012,.032,brass);
}
// Brass rails, open at the forward end where guests enter the stairs.
for(const x of [lower.left-.045,lower.right+.045]){
  for(const z of [lower.fore+.08,lower.aft-.08])piece(x,mainSole+.43,z,.055,.86,.055,brass);
  piece(x,mainSole+.86,(lower.fore+lower.aft)/2,.064,.075,lower.aft-lower.fore,teak);
}
piece(stairX,mainSole+.86,lower.aft+.04,lower.right-lower.left,.075,.07,teak);
// A double berth across the end of the suite, a writing desk and a built-in wardrobe.
piece(1.20,lowerSole+.22,-1.12,2.28,.44,2.26,teak);
piece(1.20,lowerSole+.52,-1.12,2.20,.20,2.2,cream);
piece(1.20,lowerSole+.635,-1.79,2.21,.035,.56,petrol);
piece(1.20,lowerSole+.75,.13,2.45,1.17,.14,petrol);
for(const x of [.65,1.72])piece(x,lowerSole+.73,-.43,.87,.24,.51,cream,'pillow');
for(const x of [-.40,2.82]){
  piece(x,lowerSole+.30,-.19,.58,.60,.63,teak);
  panel(x,lowerSole+.46,-.515,.23,.026,.022,brass);
}
piece(2.94,lowerSole+.40,-7.00,.78,.80,2.8,teak);
piece(2.85,lowerSole+.84,-7.00,1.03,.085,2.86,oak);
piece(2.02,lowerSole+.22,-7.07,.59,.44,.62,petrol);
piece(2.94,lowerSole+.96,-10.35,1.12,1.92,1.40,teak);
for(const z of [-10.55,-10.18])panel(2.372,lowerSole+1.04,z,.035,.22,.034,brass);
for(const z of [-2.75,-6.25,-9.85]){
  piece(.53,wallHigh-.039,z,.12,.035,.89,0xffe1a2,'light');
}
panel(.14,lowerSole+.009,-4.39,3.66,.012,2.02,0x68807f);
const solids=cabinPieces.filter(b=>b.finish!=='trim' && b.finish!=='pillow' && b.finish!=='light');
function footprint(b,x,z,r){
  return Math.abs(x-b.x)<=b.w/2+r && Math.abs(z-b.z)<=b.d/2+r;
}
export function cabinSupport(x,y,z,r=0,broken){
  let floor=-Infinity;
  for(const b of solids){
    if(b.paneId && broken?.[b.paneId])continue;
    const top=b.y+b.h/2;
    if(top<=y+.30 && top>floor && footprint(b,x,z,r))floor=top;
  }
  return floor;
}
export function cabinCeiling(x,y,z,broken){
  let bottom=Infinity;
  for(const b of solids){
    if(b.paneId && broken?.[b.paneId])continue;
    const base=b.y-b.h/2;
    if(base>y+.30 && base<bottom && footprint(b,x,z,.20))bottom=base;
  }
  return bottom;
}
export function cabinIntersects(x,bottom,z,top,r=0,walking=false,broken){
  for(const b of solids){
    if(b.paneId && broken?.[b.paneId])continue;
    // Tread support uses the feet center so a capsule does not catch the
    // next riser while ascending. Upper slabs still block at head height.
    if(b.y+b.h/2>bottom && b.y-b.h/2<top && footprint(b,x,z,walking && b.finish==='step'?0:r))return true;
  }
  return false;
}
export function cabinDepth(x,y,z){
  if(y<mainSole-.08 && y>=lowerSole-.18 && inGuestSuite(x,z))
    return Math.min(x-suite.left,suite.right-x,z-suite.fore,suite.aft-z);
  const upper=y>=upperSole-.03, half=upper?3.44:4.04,fore=upper?-10.05:-11.85,aft=upper?-.88:.88;
  return y>=mainSole-.08 && y<cabinTop-.25 ? Math.min(half-Math.abs(x),z-fore,aft-z) : -1;
}
