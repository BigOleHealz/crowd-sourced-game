// All dimensions are metres in the hull's coordinate frame. Positive Z is aft.
const wheel={radius:.132,tilt:-.48};
const seatScale=.85;
const makeModel=({length,beam,deck,keel,helmX,helmZ,roof,...model})=>{
  const halfWidth=beam*.5,halfLength=length*.5;
  const cushion={x:helmX,y:deck+.554,z:helmZ};
  return {...model,length,beam,halfWidth,halfLength,deck,keel,roof,
    helm:{
      scale:seatScale,cushion,offset:[helmX,cushion.y-.893*seatScale,helmZ],
      wheel:{...wheel,x:helmX,y:cushion.y+.197,z:helmZ-.355},
    },
    wake:{ahead:halfLength*.94,astern:-halfLength*.72,beam:halfWidth*.78,power:model.hydrodynamics.ahead*.75},
    shapes:[
      [halfWidth*.43,-halfLength,-halfLength*.70,keel+.18,deck+.17],
      [halfWidth*.82,-halfLength*.70,-halfLength*.36,keel+.08,deck+.115],
      [halfWidth,-halfLength*.36,halfLength*.76,keel,deck],
      [halfWidth*.74,halfLength*.76,halfLength,keel+.16,deck-.20],
      ...(roof?[ [halfWidth*.68,-halfLength*.42,halfLength*.23,deck,roof] ]:[]),
    ],
  };
};

export const marinaModels={
  launch:makeModel({
    title:'Launch',length:5.28,beam:2.18,deck:.56,keel:-.43,helmX:.36,helmZ:.14,roof:0,maxHp:260,
    hydrodynamics:{ahead:10.6,astern:2.7,thrust:3.9,brake:5.4,drag:1.12,dragSpeed:.065,
      rudder:1.04,flow:2.1,response:3.1,grip:5.4},
    wave:{rise:.036,roll:.95,trim:.059},motorPitch:1.06,
  }),
  cruiser:makeModel({
    title:'Cabin cruiser',length:7.48,beam:2.78,deck:.71,keel:-.62,helmX:.43,helmZ:.08,roof:2.05,maxHp:355,
    hydrodynamics:{ahead:8.35,astern:2.35,thrust:2.65,brake:3.70,drag:.78,dragSpeed:.078,
      rudder:.69,flow:2.5,response:2.28,grip:4.1},
    wave:{rise:.031,roll:.73,trim:.039},motorPitch:.88,
  }),
  motorYacht:makeModel({
    title:'Motor yacht',length:10.18,beam:3.44,deck:.88,keel:-.80,helmX:.48,helmZ:.19,roof:2.45,maxHp:465,
    hydrodynamics:{ahead:6.65,astern:1.95,thrust:1.58,brake:2.48,drag:.55,dragSpeed:.086,
      rudder:.49,flow:2.84,response:1.68,grip:3.10},
    wave:{rise:.022,roll:.52,trim:.025},motorPitch:.74,
  }),
};
const partyModel=makeModel({
  title:'Party yacht',length:19,beam:5.5,deck:1.32,keel:-.99,helmX:-.8,helmZ:-1.7,roof:4.2,maxHp:780,
  hydrodynamics:{ahead:6.2,astern:2.1,thrust:1.32,brake:2.7,drag:.55,dragSpeed:.067,
    rudder:.60,flow:2.7,response:1.8,grip:4},
  wave:{rise:.035,roll:.50,trim:.029},motorPitch:.70,
});
// Paloma keeps the cruiser handling, but the model's helm is on the flybridge.
const minnowModel={...marinaModels.cruiser,roof:2.75,helm:{
  ...marinaModels.cruiser.helm,
  cushion:{x:.43,y:2.14,z:.4},
  offset:[.43,2.14-.893*.85,.4],
  wheel:{...marinaModels.cruiser.helm.wheel,y:2.337,z:.05},
}};
export const marinaModel=boat=>boat?.partyYacht?partyModel:boat?.id==='marina-paloma'?minnowModel:marinaModels[boat?.boatModel];

function east(id,name,boatModel,hull,z,side){
  const besidePier=1.1+marinaModels[boatModel].halfWidth+.28;
  return {id:'marina-'+id,name,boatModel,hull,x:82,z:z+side*besidePier,yaw:Math.PI/2};
}

export const marinaBerths=[
  east('aria','Aria','launch',0x25495c,-446,-1),
  east('paloma','Paloma','cruiser',0x376d70,-446,1),
  east('caldera','Caldera','motorYacht',0x303e59,-433,-1),
  east('mistral','Mistral','launch',0x616e58,-433,1),
  east('sable','Sable','cruiser',0x624955,-419,-1),
  east('aurelia','Aurelia','motorYacht',0x254e58,-419,1),
  {id:'marina-terrazza',name:'Terrazza',boatModel:'cruiser',hull:0x436c71,x:-63,z:-439.15,yaw:-Math.PI/2},
  {id:'marina-brisa',name:'Brisa',boatModel:'launch',hull:0x8b594d,x:-63.4,z:-429.58,yaw:-Math.PI/2},
];

const patrolSize={halfWidth:1.10,halfLength:2.75};
export const hullSize=boat=>marinaModel(boat)??patrolSize;

export function marinaHullContains(boat,x,y,z,padding=0){
  const {shapes,halfLength,halfWidth}=marinaModel(boat);
  const dx=x-boat.x,dz=z-boat.z,up=y-boat.y;
  if(Math.hypot(dx,dz)>Math.hypot(halfLength,halfWidth)+padding*2)return false;
  const c=Math.cos(boat.yaw),s=Math.sin(boat.yaw);
  const side=Math.abs(dx*c+dz*s),along=-dx*s+dz*c;
  return shapes.some(([half,fore,aft,bottom,top])=>
    side<=half+padding && along>=fore-padding && along<=aft+padding && up>=bottom-padding && up<=top+padding);
}
