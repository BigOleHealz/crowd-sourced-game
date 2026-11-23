// Whole cycles in a one-second buffer keep the idle and track loops seamless.
export function tankDriveLoop(context, tracks) {
  const rate = context.sampleRate;
  const buffer = context.createBuffer(1, rate, rate);
  const samples = buffer.getChannelData(0);
  for (let i = 0; i < rate; i++) {
    const t = i / rate;
    const phase = 2 * Math.PI * t;
    if (tracks) {
      const link = (t * 12) % 1;
      const strike = Math.exp(-link * 10) * Math.min(1, link * 70);
      const ring = Math.sin(phase * 247) + .46 * Math.sin(phase * 513) + .29 * Math.sin(phase * 871);
      samples[i] = .50 * strike * ring * (.83 + .17 * Math.cos(phase * 3));
    } else {
      const crank = phase * 29 + .16 * Math.sin(phase * 2);
      const rumble = .29 * Math.sin(crank) + .26 * Math.sin(crank * 2) + .12 * Math.sin(crank * 4);
      const exhaust = (.5 + .5 * Math.cos(crank)) ** 4;
      samples[i] = rumble + exhaust * (.15 * Math.sin(crank * 7) + .08 * Math.sin(crank * 11));
    }
  }
  return buffer;
}

export function tankDriveMix(tank, listener) {
  if (!tank || tank.driver == null || tank.wrecked || tank.sinking ||
      Math.hypot(tank.x - listener.x, tank.y - listener.y, tank.z - listener.z) > 80) return null;
  const drive = Math.min(1, Math.abs(tank.speed) / 7);
  const pivot = Math.min(1, Math.abs(tank.turnRate));
  const tracks = Math.max(drive, .32 * pivot);
  return {
    engineGain: tank.fuel === 0 ? 0 : .36 + .12 * drive + .05 * pivot,
    engineRate: .95 + .62 * drive + .18 * pivot,
    trackGain: tracks < .015 ? 0 : .40 * Math.sqrt(tracks),
    trackRate: .50 + 1.65 * tracks
  };
}
