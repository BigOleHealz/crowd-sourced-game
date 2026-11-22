// Roster IDs survive respawns and are the same for every client. Texture cells
// run left to right in the five rows of the shared face atlas.
function look(face, skin, hair, cut, shirt, top, bottom, pants, extra, width, height, swing) {
  return { face, skin, hair, cut, shirt, top, bottom, pants, extra, width, height, swing };
}

export const civilianLooks = {
  'rival-fern':   look(0, 0xe3a593,0x35251f,'bun',   'linen', 0x8eb8ad,'jeans',  0x414e5a,'tote',   .96,.97,.71),
  'rival-rowan':  look(1, 0xa26c52,0x312a27,'curls', 'camp',  0xbe7855,'chinos', 0xd2c4a0,'shades', 1.09,1.03,.98),
  'rival-ines':   look(2, 0xdc987d,0x493729,'bob',   'jacket',0xd7c5af,'slacks', 0x404752,'satchel',.98,1.01,.65),
  'rival-omar':   look(3, 0xca8474,0x61574e,'crop',  'polo',  0x476c80,'chinos', 0xa58d71,'watch',  1.12,1.01,.82),
  'rival-maia':   look(4, 0xb38673,0x453027,'pony',  'tank',  0xa44847,'shorts', 0x555c66,'shades', .91,.98,1.1),
  'rival-diego':  look(5, 0xd5957e,0x332820,'crop',  'tee',   0xaab9bf,'jeans',  0x485765,'cap',    1.01,1.05,1.0),
  'rival-rosa':   look(6, 0xdd9985,0xb9b3a7,'bob',   'dress', 0x657d85,'skirt',  0x657d85,'tote',   1.08,.95,.61),
  'rival-jules':  look(7, 0x9e7160,0x9a7659,'wave',  'stripe',0xe0cfb8,'shorts', 0x718379,'satchel',.94,1.01,.94),
  'rival-iman':   look(8, 0xc98865,0x342922,'coils', 'jacket',0x788a80,'slacks', 0xd2c5af,'hoops',  1.01,1.03,.80),
  'rival-leo':    look(9, 0xd28f7a,0x73503a,'wave',  'camp',  0x6e918f,'shorts', 0xcbbda4,'watch',  1.06,1.02,1.05),
  'rival-elena':  look(10, 0xe2a090,0x453328,'bun',   'linen', 0xd5c1aa,'skirt',  0x945d48,'shades', 1.04,.99,.74),
  'rival-mateo':  look(11, 0xd69983,0x3c3028,'crop',  'jacket',0x485768,'slacks', 0x4c535b,'satchel',1.04,1.04,.81),
  'rival-isabel': look(12, 0xd38d71,0x726155,'wave',  'dress', 0xb77774,'skirt',  0xb77774,'straw',  1.02,.97,.62),
  'rival-wes':    look(13, 0xbf7866,0x817c72,'crop',  'linen', 0xe3d9be,'shorts', 0x77878a,'straw',  1.14,1.02,.70),
  'rival-ana':    look(14, 0xdda092,0x49332b,'pony',  'stripe',0xe6d9c2,'jeans',  0x7794a4,'tote',   .94,1.01,.98),
  'rival-rafi':   look(15, 0x43342b,0x382c24,'curls', 'tank',  0x4c7874,'shorts', 0x9e614d,'cap',    1.13,1.04,1.13),
  'rival-nora':   look(16, 0xd59280,0xa49483,'bob',   'linen', 0x8496b4,'slacks', 0xd8cfb8,'satchel',1.06,.96,.66),
  'rival-santi':  look(17, 0xdda18e,0x453329,'wave',  'camp',  0x426975,'shorts', 0xbd956b,'shades', 1.07,.99,1.03),
  'rival-mei':    look(18, 0xdd9f84,0x302a28,'bun',   'tank',  0x806687,'skirt',  0x464e54,'hoops',  .93,.96,.83),
  'rival-amir':   look(19, 0xd78b7f,0x3e352f,'crop',  'polo',  0xa28258,'chinos', 0x4b5a64,'watch',  1.10,1.04,.77),
  'rival-mateus': {...look(5,0xd5957e,0x31251d,'crop','jacket',0x702b42,'slacks',0x252632,'staff',1.05,1.02,.58),evening:true},
  'rival-simone': {...look(15,0x49352b,0x242229,'coils','dress',0x9c315d,'skirt',0x9c315d,'hoops',.98,1.04,.72),evening:true},
  'rival-lucia':  {...look(14,0xdda092,0x382621,'wave','dress',0x138680,'skirt',0x138680,'hoops',.98,1.02,.67),evening:true},
  'rival-adele':  {...look(12,0xd38d71,0x6a3d30,'bun','dress',0xae7133,'skirt',0xae7133,'hoops',1.04,.99,.63),evening:true},
  'rival-kenji':  {...look(18,0xdd9f84,0x1d2022,'crop','jacket',0xd9d7c9,'slacks',0x283141,'watch',1.04,1.04,.71),evening:true},
  'rival-victor': {...look(8,0x985c43,0x242324,'curls','jacket',0x323c65,'slacks',0x303345,'watch',1.13,1.06,.73),evening:true},
  'rival-marisol': {...look(20,0xc48b70,0x553227,'bun','tank',0x806687,'slacks',0x343b42,'hoops',1.02,.99,.73),outfit:18},
  'rival-della': {...look(21,0x905f49,0x454040,'coils','jacket',0x788a80,'skirt',0x765749,'satchel',1.04,1.02,.78),outfit:8},
};

// Each group shares one close-up mesh. Its distant silhouette uses the same clothes,
// complexion and hair, while individual residents retain their own build and gait.
const streetModels=[
  {residents:['maia','ana','mei'],top:0xa63a90,pants:0x292627,shirt:'tank',bottom:'slacks',cut:'bob',hair:0x272124,shoe:0x272528},
  {residents:['rowan','diego','jules','leo','santi'],top:0x353337,pants:0x85989e,shirt:'tee',bottom:'jeans',cut:'pony',hair:0x41382e,shoe:0x5d564b},
  {residents:['ines','iman','nora'],top:0x30312e,pants:0x2c2c2a,shirt:'jacket',bottom:'slacks',cut:'bun',hair:0x4a352d,shoe:0x222320},
  {residents:['omar','mateo','wes','rafi','amir'],top:0xc1ad85,pants:0x544437,shirt:'jacket',sleeve:0x49543c,bottom:'slacks',cut:'crop',hair:0x463328,shoe:0x927a53},
  {residents:['fern','rosa','elena','isabel'],top:0x49352f,pants:0x49352f,shirt:'jacket',bottom:'skirt',cut:'bun',hair:0x302725,shoe:0x3b2823,boots:true},
];

export const civilianScanLooks={};
for(const [index,{residents,...clothing}] of streetModels.entries()){
  for(const resident of residents){
    const id='rival-'+resident;
    civilianScanLooks[id]={...civilianLooks[id],extra:null,skin:0xd8b697,...clothing,model:index+1};
  }
}

export const beachStaffLooks={
  'beach-marisol': {...look(2,0xdc987d,0x493729,'bun','linen',0x42948a,'slacks',0x384e50,'hoops',.98,1.01,.65),outfit:0,bartender:true},
};

export const cabaretLooks={
  'lucero-luz': {...look(10,0xc68b74,0x35242b,'wave','dress',0xa24565,'skirt',0xa24565,'hoops',1.0,1.03,.75),outfit:6},
  'lucero-daniel': {...look(9,0xb68262,0x302522,'crop','jacket',0x695986,'slacks',0x343041,'watch',1.06,1.02,.8),outfit:11},
};
