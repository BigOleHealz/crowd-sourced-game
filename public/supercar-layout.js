// Metres in chassis coordinates. The body and the collision hull share these
// outer dimensions, with two exhaust tips aft of the rear lamps.
export const supercarLayout = {
  name:'Cheetah', pad:{x:-4,z:-385},
  // Ferrari 296 GTB-sized footprint, shared by all three Cheetah variants.
  halfWidth:.979,halfLength:2.283,corner:.17,roof:1.19,
  wheels:[-1.208,1.312],wheelTrack:[.771,.810],axle:.892,tire:.342,archRadius:.39,bumpTravel:.06,
  exhaust:[[-.394,.43,2.283],[.394,.43,2.283]],
  mass:1450,driveForce:24000,brakeForce:43500,
  maxSpeed:30,reverseSpeed:5.8,maxHp:190,
};
export const supercarModelScale={x:.89*(1.958/2.3366),y:.89,z:.89*(4.565/4.8349)};

export const isCheetahCar = car => car?.kind === 'supercar' || car?.model === 'falco' || car?.model === 'veloce';
