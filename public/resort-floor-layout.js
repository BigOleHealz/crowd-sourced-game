import {casinoHall} from './casino-layout.js';

export const resortFloor = {
  west: casinoHall.x-casinoHall.w/2, east: casinoHall.x+casinoHall.w/2,
  north: casinoHall.z-casinoHall.d/2, south: casinoHall.z+casinoHall.d/2,
  y: casinoHall.floor, ceiling: casinoHall.ceiling,
};

export const resortChandeliers = [
  {x: -55, z: 49.85, radius: 1.56},
  {x: -55, z: 42.01, radius: .94},
  {x: -62.67, z: 47.25, radius: 1.16},
  {x: -68.25, z: 43.65, radius: .90},
  {x: -68.25, z: 51.48, radius: .90},
  {x: -49.4, z: 51.64, radius: .94},
];

const banks = [
  {x: -65.13, z: 40.10, count: 4, face: 1, theme: 'sun'},
  {x: -62.6, z: 46.83, count: 4, face: -1, theme: 'lotus'},
  {x: -62.6, z: 47.86, count: 4, face: 1, theme: 'moon'},
  {x: -62.9, z: 53.12, count: 4, face: -1, theme: 'oasis'},
  {x: -49.42, z: 40.7, count: 3, face: 1, theme: 'moon'},
  {x: -49.46, z: 50.48, count: 4, face: 1, theme: 'sun'},
];

export const resortMachines = banks.flatMap(({x,z,count,face,theme}) =>
  Array.from({length: count}, (_,i) => ({
    x: x + (i - (count - 1) / 2) * 1.06,
    z,
    face,
    theme,
    stoolZ: z + face * 1.12,
  }))
);

export const resortLounges = [
  {kind: 'sofa', x: -70.02, z: 43.65, span: 3.4, depth: 1.05, yaw: Math.PI / 2, fabric: 'jade'},
  {kind: 'chair', x: -67.12, z: 42.2, span: .91, depth: .87, yaw: -.76, fabric: 'wine'},
  {kind: 'chair', x: -67.12, z: 45.10, span: .91, depth: .87, yaw: -2.28, fabric: 'wine'},
  {kind: 'coffee', x: -68.34, z: 43.65, w: .95, d: .95},
  {kind: 'sofa', x: -70.02, z: 51.45, span: 3.4, depth: 1.05, yaw: Math.PI / 2, fabric: 'wine'},
  {kind: 'chair', x: -67.12, z: 50.0, span: .91, depth: .87, yaw: -.76, fabric: 'jade'},
  {kind: 'chair', x: -67.12, z: 52.9, span: .91, depth: .87, yaw: -2.28, fabric: 'jade'},
  {kind: 'coffee', x: -68.34, z: 51.45, w: .95, d: .95},
  {kind: 'console', x: -71.38, z: 47.55, w: .60, d: 1.94},
  {kind: 'planter', x: -70.68, z: 40.1, w: .65, d: .65},
  {kind: 'planter', x: -70.68, z: 54.04, w: .65, d: .65},
  {kind: 'planter', x: -47.02, z: 53.83, w: .65, d: .65},
  {kind: 'planter', x: -52.11, z: 54.04, w: .65, d: .65},
];

function loungeSolid(piece) {
  const {x,z,kind} = piece;
  if (kind === 'sofa' || kind === 'chair') {
    const {span,depth,yaw} = piece;
    const sin = Math.abs(Math.sin(yaw)), cos = Math.abs(Math.cos(yaw));
    return {x,z,w: span * cos + depth * sin,d: span * sin + depth * cos,h: kind === 'sofa' ? 1.12 : 1.02};
  }
  return {x,z,w: piece.w,d: piece.d,h: {coffee: .48,console: .97,planter: .70}[kind]};
}

// Height is relative to the interior floor, like the Brickell building barriers.
export const resortFurniture = [
  ...resortMachines.flatMap(({x,z,stoolZ,face}) => [
    {x,z: z + face*.04,w: .90,d: 1.04,h: 2.30},
    {x,z: stoolZ,w: .55,d: .55,h: .77},
  ]),
  ...resortLounges.map(loungeSolid),
];
