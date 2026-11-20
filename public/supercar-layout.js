// Metres in chassis coordinates. The body and the collision hull share these
// outer dimensions, with two exhaust tips aft of the rear lamps.
export const supercarLayout = {
  name:'Vesper GT', pad:{x:-4,z:-385},
  halfWidth:1.02,halfLength:2.32,corner:.20,roof:1.23,
  wheels:[-1.47,1.47],axle:.855,tire:.35,
  exhaust:[[-.47,.43,2.29],[.47,.43,2.29]],
  maxSpeed:33,reverseSpeed:6.2,maxHp:190,
};
