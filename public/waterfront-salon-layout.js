// Absolute elevations. These same pieces populate the walkable Aurora Salon.
export const salonTables=[
  {x:-85.75,z:35.2,y:.80,n:1},
  {x:-75.95,z:36.3,y:.80,n:2},
  {x:-75.95,z:41.9,y:.80,n:3},
  {x:-86.15,z:56.25,y:.80,n:4},
  {x:-75.65,z:54.9,y:.80,n:5},
];
export const salonSeats=salonTables.flatMap(({x,z,y,n})=>[-1.7,0,1.7].map(dx=>({
  x:x+dx,z:z+(dx?1.03:1.62),y,yaw:dx*.345,n,
})));
export const salonBanquettes=[
  {x:-87.0,z:40.4,y:.80,w:4.45,facing:-1},
  {x:-86.4,z:32.15,y:4.75,w:5.48,facing:1},
  {x:-76.05,z:32.15,y:4.75,w:5.18,facing:1},
];
export const salonLowTables=salonBanquettes.map(({x,z,y,facing})=>({x,z:z+facing*1.54,y}));
export const salonBar={x:-75.8,z:38.6,y:4.75,w:4.85};
export const salonBarSeats=[-1.34,0,1.34].map(dx=>({x:salonBar.x+dx,z:salonBar.z+1.10,y:salonBar.y}));
export const salonChandeliers=[
  {x:-85.5,z:55.7,top:8.92,r:2.0,drop:2.66},
  {x:-76.1,z:46.65,top:8.92,r:1.52,drop:2.42},
  {x:-85.7,z:36.3,top:4.54,r:1.27,drop:1.05},
  {x:-75.95,z:36.3,top:4.54,r:1.27,drop:1.05},
];
const box=(p,w,d,h)=>({x:p.x,z:p.z,w,d,bottom:p.y-.8,h:p.y-.8+h});
export const salonFurniture=[
  ...salonTables.map(p=>box(p,3.64,1.74,1.02)),
  ...salonSeats.map(p=>box(p,.62,.66,1.06)),
  ...salonBanquettes.map(p=>box(p,p.w,1.0,1.21)),
  ...salonLowTables.map(p=>box(p,1.32,.65,.54)),
  box(salonBar,salonBar.w,1.08,1.05),
  ...salonBarSeats.map(p=>box(p,.54,.54,.78)),
];
