// Air is measured in seconds underwater. Everyone can surface even after exhausting their air.
export const breathSeconds = 25;
export const tankSeconds = 150;

export function swimColumn(state,input,y,surface,floor,dt) {
  const resting=surface-.72;
  const depth=state.swimDepth??0;
  const atAir=depth<=.06;
  const toggle=state.swimming && atAir && input.toggleScuba;
  const scuba=toggle ? !state.scuba : !!state.scuba;
  const capacity=scuba?tankSeconds:breathSeconds;
  const previousAir=Math.min(capacity,toggle?capacity:state.swimAir??capacity);
  let surfacing=!!state.outOfAir;
  if(atAir && previousAir>=4 && input.swimY!==-1)surfacing=false;
  const swimY=state.swimming ? (surfacing ? 1 : input.swimY??0) : 0;
  const maxDepth=Math.max(0,resting-floor-.10);
  let nextDepth=Math.max(0,Math.min(maxDepth,depth-swimY*2.25*dt));
  if(nextDepth<.001)nextDepth=0;
  const air=nextDepth>.06 ? Math.max(0,previousAir-dt) : Math.min(capacity,previousAir+5*dt);
  if(air===0)surfacing=true;
  const floating=Math.max(resting-.16,y+(resting-y)*-Math.expm1(-9*dt));
  return {y:depth || nextDepth ? resting-nextDepth : floating,
    ...(nextDepth>0 && {swimDepth:nextDepth}),
    ...(scuba && {scuba:true}),
    ...((air<capacity || scuba) && {swimAir:air}),
    ...(surfacing && {outOfAir:true})};
}
