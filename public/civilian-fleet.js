// Dimensions match the civilian bodies. Force divided by mass determines how
// quickly each model gains or sheds speed under either AI or player control.
export const civilianProfiles={
  sedan:{mass:1460,driveForce:10300,brakeForce:19300,topSpeed:18,reverseSpeed:4.5,cruise:5.6,turnRate:1.62,
    halfWidth:.87,halfLength:1.88,roof:1.45,corner:.19},
  hatchback:{mass:1090,driveForce:8800,brakeForce:16800,topSpeed:16.8,reverseSpeed:4.8,cruise:6.3,turnRate:1.85,
    halfWidth:.79,halfLength:1.58,roof:1.48,corner:.18},
  van:{mass:2230,driveForce:12200,brakeForce:24500,topSpeed:14.6,reverseSpeed:3.8,cruise:4.8,turnRate:1.23,
    halfWidth:.96,halfLength:2.16,roof:1.88,corner:.16},
};
