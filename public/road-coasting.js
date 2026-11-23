// Rolling resistance at low speed, with a little more drag at road speed.
// Preserve the sign so an empty vehicle can also coast backwards to a pump.
export function coastSpeed(speed,dt){
  const pace=Math.abs(speed);
  return Math.sign(speed)*Math.max(0,pace-(.75+pace*.065)*dt);
}
