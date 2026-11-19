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
};
