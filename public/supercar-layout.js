// Metres in chassis coordinates. The body and the collision hull share these
// outer dimensions, with two exhaust tips aft of the rear lamps.
export const supercarLayout = {
  name:'Cheetah', pad:{x:-4,z:-385},
  halfWidth:1.17,halfLength:2.45,corner:.20,roof:1.20,
  wheels:[-1.28,1.39],wheelTrack:[.92,.967],axle:.945,tire:.342,archRadius:.41,bumpTravel:.06,
  exhaust:[[-.47,.43,2.42],[.47,.43,2.42]],
  mass:1450,driveForce:24000,brakeForce:43500,
  maxSpeed:30,reverseSpeed:5.8,maxHp:190,
};

export const isCheetahCar = car => car?.kind === 'supercar' || car?.model === 'falco' || car?.model === 'veloce';
