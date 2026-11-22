// Dimensions match the civilian bodies. Force divided by mass determines how
// quickly each model gains or sheds speed under either AI or player control.
export const civilianProfiles={
  falco:{name:'Lamborghini',nose:-2.28,tail:2.28,skinHeight:1.12,bodyWidth:1.02,axles:[-1.47,1.48],tire:.337,halfTread:.122,mass:1460,driveForce:21900,brakeForce:40880,topSpeed:32,reverseSpeed:5.9,turnRate:1.76,
    halfWidth:1.03,halfLength:2.29,roof:1.12,corner:.19,belt:.70,cabin:[-.98,.93]},
  veloce:{name:'Ferrari',nose:-2.27,tail:2.25,skinHeight:1.19,bodyWidth:.99,axles:[-1.37,1.39],tire:.343,halfTread:.116,mass:1540,driveForce:21600,brakeForce:40040,topSpeed:30.5,reverseSpeed:5.4,turnRate:1.82,
    halfWidth:1.01,halfLength:2.28,roof:1.19,corner:.23,belt:.74,cabin:[-.94,1.12]},
  engine:{nose:-3.50,tail:3.49,skinHeight:2.32,bodyWidth:1.03,axles:[-2.65,2.29],tire:.408,halfTread:.13,mass:7400,driveForce:26200,brakeForce:45600,topSpeed:13.3,reverseSpeed:3.2,cruise:6.5,
    halfWidth:1.05,halfLength:3.50,roof:2.32,corner:.20,belt:1.23,cabin:[-3.30,3.46]},
  sedan:{nose:-2.08,tail:2.12,skinHeight:1.52,bodyWidth:.86,axles:[-1.34,1.30],tire:.317,halfTread:.10,mass:1460,driveForce:10300,brakeForce:19300,topSpeed:18,reverseSpeed:4.5,cruise:5.6,turnRate:1.62,
    halfWidth:.87,halfLength:1.88,roof:1.45,corner:.19},
  hatchback:{nose:-1.82,tail:1.71,skinHeight:1.55,bodyWidth:.82,axles:[-1.14,1.13],tire:.301,halfTread:.10,mass:1090,driveForce:8800,brakeForce:16800,topSpeed:16.8,reverseSpeed:4.8,cruise:6.3,turnRate:1.85,
    halfWidth:.79,halfLength:1.58,roof:1.48,corner:.18},
  van:{nose:-2.04,tail:2.27,skinHeight:2.10,bodyWidth:.95,axles:[-1.28,1.49],tire:.355,halfTread:.111,mass:2230,driveForce:12200,brakeForce:24500,topSpeed:14.6,reverseSpeed:3.8,cruise:4.8,turnRate:1.23,
    halfWidth:.96,halfLength:2.16,roof:1.88,corner:.16},
};
