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
