// Movable pieces use the same pivot in the visual mesh and the collision model.
export function furnitureId(face,x,z){
  return face+'_'+Math.round(1000*x)+'_'+Math.round(1000*z);
}

export function tipFurniture(doors,piece,vx,vz){
  if(!doors || !piece || doors.furniture?.[piece.id])return false;
  let alongX=Math.abs(vx)>Math.abs(vz);
  // Wide trestles topple across their feet rather than balanced on an end.
  if(piece.w>1.65*piece.d)alongX=false;
  if(piece.d>1.65*piece.w)alongX=true;
  const dx=alongX?(Math.sign(vx)||1):0,dz=alongX?0:(Math.sign(vz)||1);
  const speed=Math.hypot(vx,vz), radius=(alongX?piece.w:piece.d)/2;
  // Keep the fallen outline within the room when it is pushed towards a wall.
  const [x0,x1,z0,z1]=piece.room;
  const clear=dx===1?x1-piece.x:dx===-1?piece.x-x0:dz===1?z1-piece.z:piece.z-z0;
  const shift=Math.min(radius+.09+Math.min(.48,speed*.033),clear-piece.height-.025);
  (doors.furniture??={})[piece.id]={dx,dz,shift,phase:0};
  return true;
}

export function stepFurniture(doors,dt){
  if(!doors.furniture)return;
  for(const f of Object.values(doors.furniture)){
    if(f.phase<1)f.phase=Math.min(1,f.phase+dt/.57);
  }
}

export function fallenTop(p,f,x,z,pad){
  const cx=p.x+f.dx*(f.shift+p.height/2),cz=p.z+f.dz*(f.shift+p.height/2);
  const w=f.dx?p.height:p.w,d=f.dz?p.height:p.d;
  if(Math.abs(x-cx)<w/2+pad && Math.abs(z-cz)<d/2+pad)
    return p.floor+(f.dx?p.w:p.d)*.88;
  return -Infinity;
}
