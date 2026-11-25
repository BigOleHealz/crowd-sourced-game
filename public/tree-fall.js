// Tree IDs are stable map indices. The compact state survives snapshots and
// lets late joiners reconstruct the same fallen trunk and impact direction.
export function fellTree(doors,tree,vx,vz,tick=0){
  if(!doors || tree?.treeId==null || doors.fallenTrees?.[tree.treeId])return false;
  const length=Math.hypot(vx,vz)||1;
  (doors.fallenTrees??={})[tree.treeId]={x:vx/length,z:vz/length,tick};
  const seq=doors.treeSeq=(doors.treeSeq??0)+1;
  const sounds=doors.treeSounds??=[];
  sounds.push({seq,x:tree.x,y:.9,z:tree.z});
  if(sounds.length>12)sounds.shift();
  return true;
}

export function treeFallAngle(fall,tick){
  if(!fall)return 0;
  const t=Math.max(0,Math.min(1,(tick-fall.tick)/21));
  return Math.PI*.5*t*t*(3-2*t);
}
