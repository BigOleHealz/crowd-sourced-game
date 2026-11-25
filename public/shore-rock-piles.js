// Keep the outer row visible above the tidal surface while its base remains
// embedded in the surveyed bank. Both natural islands share this profile.
export function shoreRockPile(floor,waterY,variation) {
  const radius=.95+variation*.78;
  const height=.68+variation*.42+Math.max(0,waterY+.10-floor)*.52;
  return {radius,height,centerY:floor+height*.42};
}

// A pile's center can be on the shore while its visible stone crosses a
// bridge's outer pedestrian wall. Check the full horizontal footprint.
export function rockPileOverlapsBridge(x,z,radius,bridge) {
  const west=bridge.walkWest??bridge.west,east=bridge.walkEast??bridge.east;
  const nearestX=Math.max(west,Math.min(east,x));
  const nearestZ=Math.max(bridge.north,Math.min(bridge.south,z));
  return Math.hypot(x-nearestX,z-nearestZ)<radius;
}
