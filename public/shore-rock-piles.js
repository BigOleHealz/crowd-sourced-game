// Keep the outer row visible above the tidal surface while its base remains
// embedded in the surveyed bank. Both natural islands share this profile.
export function shoreRockPile(floor,waterY,variation) {
  const radius=.95+variation*.78;
  const height=.68+variation*.42+Math.max(0,waterY+.10-floor)*.52;
  return {radius,height,centerY:floor+height*.42};
}
