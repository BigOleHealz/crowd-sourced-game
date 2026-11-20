// Pane IDs also travel in the shared door state, so late joiners see the same openings.
export const paneKey=(x,y,z)=>'pane:'+Math.round(x*1000)+','+Math.round(y*1000)+','+Math.round(z*1000);
export function identifyPane(p,base){
  p.paneId=paneKey(p.x,base+(p.bottom+p.h)/2,p.z);
  return p;
}
export function noteGlass(doors,point){
  if(!doors || !point)return;
  const seq=(doors.glassSeq||0)+1;
  doors.glassSeq=seq;
  const events=doors.glassSounds??=[];
  events.push({seq,x:point.x,y:point.y,z:point.z});
  if(events.length>12)events.shift();
}
