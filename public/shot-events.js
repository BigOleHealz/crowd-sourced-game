// Welcome snapshots include a short history. A new connection starts after it.
// The server appends shots in ID order; retain the high-water mark across gaps.
export function liveShots(history) {
  let last=history.at(-1)?.id ?? 0;
  return function read(shots) {
    const fresh=[];
    for(const shot of shots) {
      if(shot.id<=last)continue;
      fresh.push(shot);
      last=shot.id;
    }
    return fresh;
  };
}

export function expireShots(shots,tick){
  // An occupied room can skip snapshots while its output queue drains.
  // Keep the one-off wreck cue long enough to survive a brief network stall.
  for(let i=shots.length-1;i>=0;i--){
    if(tick-shots[i].tick>((shots[i].weapon==='vehicleWreck' || shots[i].weapon==='waterHit')?60:7))shots.splice(i,1);
  }
}
