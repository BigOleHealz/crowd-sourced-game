// Metres in the Brickell district. Door centers and travel are shared by the
// visual panels, authoritative room simulation and predicting client.
export const storefrontFloor=.824, storefrontCeiling=3.74, doorX=-9.64;
export const storefrontDoors=[
  {id:'cafe',name:'Mangle Café',z:14.46,width:1.88,head:3.13,travel:[-.96,-1.90]},
  {id:'lobby',name:'810 Brickell Lobby',z:.17,width:1.90,head:3.04,travel:[-.97,.97]},
];
export const diningTables=[[-11.18,4.10],[-11.66,6.56],[-11.00,9.05]];
export const benchTables=[[-14.62,4.37],[-14.62,6.27]];
export const planters=[[-10.76,2.97,1.20],[-15.71,15.19,1.54],[-10.89,1.61,.93],[-14.92,1.94,1.06]];

export const facadePiers=[-1.83,2.35,15.79].map(z=>({x:-9.98,z,w:1.30,d:.51,h:3.0}));
export function hasStorefrontRooms(building) {return building.x===-17 && building.z===7;}

export function storefrontRoom(x,y,z) {
  if(x< -16.57 || x>doorX || y<.5 || y>=storefrontCeiling || z< -1.95 || z>15.95)return null;
  return storefrontDoors[z>2.41 ? 0 : 1];
}

export function newStorefrontDoors() {return {cafe:0,lobby:0};}

export function stepStorefrontDoors(doors,players,dt) {
  for(const door of storefrontDoors) {
    const open=players.some(p=>p.y<door.head && p.y>.45 && Math.abs(p.x-doorX)<2.50 &&
      Math.abs(p.z-door.z)<door.width/2+.40);
    doors[door.id]=open ? Math.min(1,doors[door.id]+dt*3.4) : Math.max(0,doors[door.id]-dt*1.45);
  }
}

export function panelCenter(door,side,fraction) {
  return door.z+(side===0 ? -.25 : .25)*door.width+door.travel[side]*fraction;
}

const furniture=[];
const rect=(x,z,w,d,top)=>furniture.push({x,z,hw:w/2,hd:d/2,top});
const round=(x,z,r,top)=>furniture.push({x,z,r,top});
for(const [x,z] of diningTables) {
  round(x,z,.398,1.59);
  for(const s of [-1,1])round(x,z+s*.545,.221,1.61);
}
for(const [x,z] of benchTables){round(x,z,.398,1.59);round(x+.445,z+.19,.221,1.61);}
rect(-16.09,5.32,.84,4.70,1.79);                  // banquette
rect(-13.67,11.54,1.30,5.96,1.86);                // service counter
rect(-13.39,12.77,.65,2.26,2.39);                 // pastry case
rect(-13.66,9.91,.54,.86,2.32);                   // espresso machine
rect(-16.07,11.48,.86,6.95,1.77);                 // back bar
rect(-13.72,.68,1.01,2.05,1.81);                  // concierge desk
rect(-13.92,1.05,.05,.32,2.07);                   // monitor
for(const z of [-1.27,-.22])rect(-14.98,z,.72,.80,1.69);
for(const [x,z,size] of planters)round(x,z,.235*size,storefrontFloor+.45*size);

// The original tower still owns the upper storeys, west core and roof.
// Only the approximately seven-metre east recess has pedestrian headroom.
export function storefrontTopAt(x,z,pad,probe,roof,doors) {
  if(x< -16.515+pad || z< -1.81+pad || z>15.81-pad || probe>storefrontCeiling+.001) return roof;
  if(Math.abs(z-2.41)<.085+pad) return storefrontCeiling;
  let top=-Infinity;
  if(Math.abs(x-doorX)<.15+pad) {
    const door=storefrontDoors[z>2.41 ? 0 : 1];
    if(Math.abs(z-door.z)>door.width/2-pad || probe>door.head+.001)return storefrontCeiling;
    for(let side=0;side<2;side++){
      if(Math.abs(z-panelCenter(door,side,doors?.[door.id] ?? 0))<door.width/4+.018+pad) return door.head;
    }
  }
  for(const p of furniture) {
    const dx=Math.abs(x-p.x),dz=Math.abs(z-p.z);
    if(p.r ? dx*dx+dz*dz<(p.r+pad)**2 : dx<p.hw+pad && dz<p.hd+pad)top=Math.max(top,p.top);
  }
  return top;
}

export function storefrontHeadroom(x,z,pad) {
  if(x< -16.62-pad || x> -9.5+pad || z< -2-pad || z>16+pad)return Infinity;
  if(Math.abs(x-doorX)<.15+pad) {
    const door=storefrontDoors[z>2.41?0:1];
    if(Math.abs(z-door.z)<door.width/2+pad)return door.head;
  }
  return storefrontCeiling;
}
