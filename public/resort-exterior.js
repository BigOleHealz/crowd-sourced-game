import {addPalaceArrival} from './palace-arrival-view.js';
import {centaurFountain} from './centaur-fountain-view.js';
import * as THREE from 'three';
import {grandResortTower,grandRooms} from './grand-resort-view.js';
import {grandLobbyOpening} from './grand-resort-layout.js';

const stone = 0xd5bf9d, ivory = 0xf3dfb7, shadowStone = 0x9b7e61;
const bronze = 0xb99051, darkBronze = 0x73583b, gold = 0xf9bf6c;
const black = 0x18292c, enamel = 0x25424a, jade = 0x2e6062, coral = 0xd97564;
const neon = 0xffd894, seafoam = 0x80e5d1;
const floor = .80, ceiling = 5.60;
const front = 55, east = -46, west = -72, north = 39;
const entryX = -55, sideEntryZ = 46, hotelEntryX = -61;
const doorHead = 3.85;

const signs = {
  casino: 0, valet: 1, eastEntry: 2, hotel: 3, oasis: 4,
  duskGlass: 5, litGlass: 6, lamp: 7,
};

function signAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = 2048;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const w = 1024, h = 256;

  function tile(index, draw) {
    ctx.save();
    ctx.translate((index % 2) * w, Math.floor(index / 2) * h);
    ctx.beginPath();
    ctx.rect(0, 0, w, h);
    ctx.clip();
    draw();
    ctx.restore();
  }

  function label(words, size, y, color, spacing = 5) {
    ctx.font = `800 ${size}px Arial, sans-serif`;
    ctx.textBaseline = 'alphabetic';
    const letters = Array.from(words, char => [char, ctx.measureText(char).width + spacing]);
    let x = (w + spacing - letters.reduce((length, [, width]) => length + width, 0)) / 2;
    ctx.fillStyle = color;
    for (const [char, width] of letters) {
      ctx.fillText(char, x, y);
      x += width;
    }
  }

  function frame(accent, center = '#243e43') {
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, '#102025');
    gradient.addColorStop(.5, center);
    gradient.addColorStop(1, '#102025');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    for (const [inset, lineWidth, color] of [[16, 4, accent], [28, 2, '#9d7b51']]) {
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = color;
      ctx.strokeRect(inset, inset, w - 2 * inset, h - 2 * inset);
    }
    for (const x of [69, w - 69]) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, 88);
      ctx.lineTo(x + 20, 128);
      ctx.lineTo(x, 168);
      ctx.lineTo(x - 20, 128);
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = accent;
      ctx.fillRect(x - 3, 125, 6, 6);
    }
  }

  tile(signs.casino, () => {
    frame('#eab875');
    ctx.strokeStyle = '#b17b51';
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      for (let i = 0; i < 5; i++) {
        const x = 512 + side * (236 + i * 15);
        ctx.beginPath();
        ctx.moveTo(x, 90);
        ctx.lineTo(512 + side * (318 + i * 20), 41);
        ctx.stroke();
      }
    }
    label('LANTERN CLUB', 39, 82, '#f5c18b', 12);
    ctx.shadowColor = '#f2895d';
    ctx.shadowBlur = 16;
    label('CASINO', 142, 207, '#fff0b9', 15);
  });

  for (const [tileIndex, heading, title, accent] of [
    [signs.valet, '', 'VALET', '#fcc483'],
    [signs.eastEntry, 'CASINO', 'EAST ENTRANCE', '#eab875'],
    [signs.hotel, 'LANTERN CLUB', 'HOTEL & SUITES', '#ffb987'],
    [signs.oasis, 'LANTERN CLUB', 'OASIS TOWER', '#a4dcce'],
  ]) {
    tile(tileIndex, () => {
      frame(accent);
      if (heading) label(heading, 39, 91, accent, 11);
      label(title, title === 'VALET' ? 111 : 77, heading ? 190 : 169, '#fff0c8', 6);
    });
  }

  for (const [i, lit] of [[signs.duskGlass, false], [signs.litGlass, true]]) {
    tile(i, () => {
      const tint = ctx.createLinearGradient(0, 0, w * .63, h);
      tint.addColorStop(0, lit ? '#73553f' : '#3f6a6f');
      tint.addColorStop(.46, lit ? '#c59966' : '#1c393d');
      tint.addColorStop(1, '#122427');
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#f5e7bb12';
      for (let x = 120; x < w; x += 151) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 173, 0);
        ctx.lineTo(x + 240, h);
        ctx.lineTo(x + 166, h);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#121b2355';
      ctx.fillRect(0, 209, w, 47);
    });
  }
  tile(signs.lamp, () => {
    const lamp = ctx.createLinearGradient(20, 0, w - 20, 0);
    lamp.addColorStop(0, '#c98856');
    lamp.addColorStop(.25, '#ffe7a8');
    lamp.addColorStop(.75, '#fff4c4');
    lamp.addColorStop(1, '#a35a3a');
    ctx.fillStyle = lamp;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#a35a3a66';
    for (let i = 24; i < w; i += 63) ctx.fillRect(i, 0, 4, h);
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function partBuilder(Batch, cube, plane, round, group, materials) {
  const masonry = new Batch(), metal = new Batch(), glow = new Batch(), artwork = new Batch(true);
  const box = (batch, color, x, y, z, w, h, d, yaw = 0) => batch.add(cube, color, x, y, z, w, h, d, 0, yaw);
  const slab = (...args) => box(masonry, ...args);
  const trim = (...args) => box(metal, ...args);
  const light = (...args) => box(glow, ...args);
  const cylinder = (batch, color, x, y, z, d, h) => batch.add(round, color, x, y, z, d, h, d);

  function panel(index, x, y, z, width, height, yaw = 0) {
    const uv = plane.attributes.uv.clone();
    for (let i = 0; i < uv.count; i++) {
      const u = (index % 2 + .008 + uv.getX(i) * .984) / 2;
      const v = 1 - (Math.floor(index / 2) + .009 + (1 - uv.getY(i)) * .982) / 4;
      uv.setXY(i, u, v);
    }
    plane.setAttribute('batchUv', uv);
    artwork.add(plane, 0xffffff, x, y, z, width, height, 1, 0, yaw);
  }

  function face(x, z, yaw) {
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    const on = (u, y, v) => [x + cos * u + sin * v, y, z - sin * u + cos * v];
    return {
      slab: (color, u, y, v, w, h, d) => slab(color, ...on(u, y, v), w, h, d, yaw),
      trim: (color, u, y, v, w, h, d) => trim(color, ...on(u, y, v), w, h, d, yaw),
      light: (color, u, y, v, w, h, d) => light(color, ...on(u, y, v), w, h, d, yaw),
      panel: (index, u, y, v, w, h) => panel(index, ...on(u, y, v), w, h, yaw),
      beam: (color, a, b, w, d) => metal.beam(color, on(...a), on(...b), w, d),
    };
  }

  function build() {
    masonry.mesh(group, materials.stone).userData.impactSurface = 'solid';
    const hardware = metal.mesh(group, materials.metal, false);
    if (hardware) hardware.userData.impactSurface = 'metal';
    glow.mesh(group, materials.glow, false);
    artwork.mesh(group, materials.sign, false);
  }

  return {masonry, metal, glow, slab, trim, light, cylinder, face, build};
}

function archway(face, along, width) {
  const head = doorHead + .24;
  for (const sign of [-1, 1]) {
    const edge = along + sign * (width / 2 + .20);
    face.slab(shadowStone, edge, 1.01, .27, .40, .42, .47);
    face.slab(enamel, edge, 2.44, .23, .40, 2.5, .38);
    face.slab(stone, edge, head - .23, .23, .40, .65, .38);
    face.trim(bronze, along + sign * (width / 2 + .043), 2.39, .32, .086, 3.18, .244);
    face.trim(darkBronze, edge, 1.02, .54, .32, .08, .08);
    face.trim(bronze, edge, 3.61, .48, .30, .10, .19);
  }
  face.slab(shadowStone, along, head, .32, width + .80, .44, .61);
  face.trim(bronze, along, head - .17, .64, width + .82, .075, .09);
  face.light(neon, along, head - .23, .60, width + .05, .028, .035);
}

function displayBay(face, along, width, lit) {
  face.slab(shadowStone, along, 1.13, .17, width + .12, .66, .24);
  face.slab(black, along, 2.66, .19, width, 2.49, .23);
  face.panel(lit ? signs.litGlass : signs.duskGlass, along, 2.71, .319, width - .16, 2.16);
  for (const offset of [-.48, -.16, .16, .48]) {
    face.trim(bronze, along + width * offset, 2.70, .345, .047, 2.23, .047);
  }
  for (const y of [1.56, 3.13, 3.83]) face.trim(darkBronze, along, y, .345, width, .069, .07);
  face.trim(bronze, along, 1.52, .363, width + .17, .10, .13);
  face.slab(stone, along, 4.14, .24, width + .22, .27, .39);
}

function flutedPier(face, along) {
  face.slab(shadowStone, along, 1.05, .26, .58, .50, .40);
  face.slab(stone, along, 3.03, .21, .47, 3.64, .33);
  for (const line of [-.16, 0, .16]) face.slab(ivory, along + line, 3.04, .397, .062, 3.32, .066);
  face.slab(ivory, along, 4.58, .34, .61, .30, .36);
  face.trim(bronze, along, 4.73, .40, .64, .065, .31);
}

function lantern(face, along, y, v) {
  face.trim(darkBronze, along, y, v, .40, 1.11, .15);
  face.panel(signs.lamp, along, y, v + .08, .23, .80);
  for (const s of [-1, 1]) {
    face.trim(bronze, along + s * .143, y, v + .10, .042, .93, .10);
    face.trim(bronze, along, y + s * .46, v + .095, .36, .084, .13);
  }
  face.light(neon, along, y, v + .116, .022, .71, .019);
}

function rail(face, span, y, depth, tint) {
  face.trim(darkBronze, 0, y, depth, span + .10, .11, .12);
  face.light(tint, 0, y, depth + .07, span, .038, .014);
}

function mainHall(parts) {
  const {slab, trim, face} = parts;
  const wallHeight = ceiling - floor;
  const wallY = floor + wallHeight / 2;
  function wallX(z, lo, hi) {
    const h=z===north?3.45:wallHeight;
    slab(stone,(lo+hi)/2,floor+h/2,z,hi-lo,h,.26);
  }
  function wallZ(x, lo, hi) {
    slab(stone, x, wallY, (lo + hi) / 2, .26, wallHeight, hi - lo);
  }
  wallX(north, west, hotelEntryX - 1.8);
  wallX(north, hotelEntryX + 1.8, east);
  wallX(front, west, entryX - 2);
  wallX(front, entryX + 2, east);
  wallZ(west,north,grandLobbyOpening.z-grandLobbyOpening.width/2);
  wallZ(west,grandLobbyOpening.z+grandLobbyOpening.width/2,front);
  wallZ(east, north, sideEntryZ - 1.5);
  wallZ(east, sideEntryZ + 1.5, front);
  const aboveDoors = (doorHead + ceiling) / 2;
  slab(stone, entryX, aboveDoors, front, 4, ceiling - doorHead, .26);
  slab(stone, east, aboveDoors, sideEntryZ, .26, ceiling - doorHead, 3);
  slab(stone, hotelEntryX, aboveDoors, north, 3.6, ceiling - doorHead, .26);
  slab(stone, west, aboveDoors, grandLobbyOpening.z,.26,ceiling-doorHead,grandLobbyOpening.width);

  const southFace = face(-59, front, 0);
  const eastFace = face(east, 47, Math.PI / 2);
  const westFace = face(west, 47, -Math.PI / 2);
  const northFace = face(-59, north, Math.PI);
  for (const [wall, width] of [[southFace, 26.84], [eastFace, 16.18], [westFace, 16.18], [northFace, 26.84]]) {
    wall.slab(shadowStone, 0, 4.91, .17, width, .28, .35);
    wall.slab(enamel, 0, 5.34, .24, width, .62, .47);
    wall.slab(ivory, 0, 5.74, .33, width + .08, .18, .57);
    wall.slab(stone, 0, 6.06, .31, width - .12, .20, .45);
    wall.trim(bronze, 0, 5.54, .50, width, .052, .061);
    rail(wall, width - .08, 5.16, .50, seafoam);
  }

  archway(southFace, 4, 4);
  archway(eastFace, 1, 3);
  archway(northFace, 2, 3.6);
  for (const along of [-11.05, -7.89, -4.73, 7.48, 10.61]) {
    displayBay(southFace, along, 2.49, along === -7.89 || along === 10.61);
  }
  for (const along of [-12.76, -9.47, -6.31, -3.15, 1.12, 6.36, 9.07, 12.48]) flutedPier(southFace, along);
  for (const along of [-3.15, 1.12, 6.25, 12.48]) lantern(southFace, along, 3.43, .47);

  for (const [wall, bays] of [[eastFace, [-6.02, -3.1, 4.1, 6.65]], [westFace, [-5.7, 2.76, 5.7]]]) {
    for (const [i, along] of bays.entries()) displayBay(wall, along, 2.02, i % 2 === 0);
    for (const along of [-7.56, -4.62, -1.70, 3.14, 5.35, 7.63]) {
      if (wall === westFace ? Math.abs(along + .5)>1.7 : Math.abs(along - 1)>1.80) flutedPier(wall, along);
    }
  }
  for (const along of [-12.40, -8, -4, -.2, 4.2, 8, 12.40]) flutedPier(northFace, along);
  for (const along of [-10, -6, -2, 6, 10]) displayBay(northFace, along, 2.82, false);

  eastFace.trim(darkBronze, 1, 4.51, .38, 4.28, .54, .53);
  eastFace.panel(signs.eastEntry, 1, 4.51, .651, 4.17, .50);

  // The central finial is raised over the door on a bank of setbacks. Its
  // blade and backing give the lettering a silhouette against the hotel.
  for (const [w, low, high, depth] of [
    [15.8, 5.87, 6.63, 2.10],
    [13.8, 6.60, 8.64, 1.75],
    [11.92, 8.59, 9.27, 1.46],
    [6.70, 9.21, 9.73, 1.26],
    [3.38, 9.66, 10.14, 1.06],
    [1.62, 10.10, 10.51, .82],
  ]) {
    const z = 54.64 + depth * .17;
    slab(stone, entryX, (low + high) / 2, z, w, high - low, depth);
    slab(ivory, entryX, high, z, w + .19, .135, depth + .14);
    trim(bronze, entryX, high - .013, z + depth / 2 + .079, w + .14, .035, .04);
  }

  const crown = face(entryX, 55.90, 0);
  crown.trim(darkBronze, 0, 7.55, .14, 12.77, 3.12, .48);
  crown.trim(enamel, 0, 7.55, .38, 12.50, 2.94, .20);
  crown.panel(signs.casino, 0, 7.55, .486, 12.44, 2.89);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 3; i++) {
      const x = side * (6.51 + i * .23);
      crown.trim(bronze, x, 7.39, .08, .093, 2.65 - .40 * i, .27);
      crown.light(neon, x, 7.43, .226, .026, 2.47 - .40 * i, .033);
    }
    for (let i = 0; i < 3; i++) {
      crown.beam(bronze, [0, 9.56, -.49], [side * (1.00 + .25 * i), 9.91 - i * .17, -.49], .054, .04);
    }
  }
  crown.trim(darkBronze, 0, 10.28, -.52, .61, .61, .16);
  crown.panel(signs.lamp, 0, 10.28, -.432, .46, .43);

  const arrival = face(east + .31, 51.14, Math.PI / 2);
  arrival.slab(stone, 0, 6.82, -.40, 7.64, 1.89, 1.06);
  arrival.trim(darkBronze, 0, 6.90, .16, 7.37, 1.96, .31);
  arrival.panel(signs.casino, 0, 6.90, .324, 7.27, 1.85);
  rail(arrival, 7.46, 7.94, .24, neon);
  rail(arrival, 7.46, 5.91, .24, seafoam);

  const shoreline = face(west - .28, 47, -Math.PI / 2);
  shoreline.slab(stone, 0, 6.26, .04, 8.8, .66, .72);
  shoreline.trim(darkBronze, 0, 6.73, .12, 8.16, 2.17, .46);
  shoreline.panel(signs.casino, 0, 6.73, .361, 8.02, 2.07);
}

function porteCochere(parts) {
  const {masonry, metal, glow, slab, trim, cylinder, face} = parts;
  const extent = 6.70;
  const point = (fraction, reach) => {
    const x = extent * fraction;
    return [x, reach * (1.13 + 2.45 * Math.sqrt(1 - fraction * fraction))];
  };
  const steps = 32;

  function deck(color, y, h, span, reach) {
    const shape = new THREE.Shape();
    shape.moveTo(-extent * span, .06);
    shape.lineTo(extent * span, .06);
    for (let i = steps; i >= 0; i--) {
      const [x, z] = point(2 * i / steps - 1, reach);
      shape.lineTo(x * span, -z);
    }
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {depth: h, bevelEnabled: false}).rotateX(-Math.PI / 2);
    masonry.add(geo, color, entryX, y, front);
    geo.dispose();
  }

  deck(black, 3.89, .31, 1, 1);
  deck(stone, 4.20, .20, .979, .984);
  deck(enamel, 4.40, .12, .924, .906);
  for (let i = 0; i < steps; i++) {
    const [ax, az] = point(2 * i / steps - 1, 1);
    const [bx, bz] = point(2 * (i + 1) / steps - 1, 1);
    const edge = (x, z, y) => [entryX + x, y, front + z + .017];
    metal.beam(bronze, edge(ax, az, 4.20), edge(bx, bz, 4.20), .086, .11);
    metal.beam(bronze, edge(ax, az, 3.986), edge(bx, bz, 3.986), .061, .080);
    glow.beam(neon, edge(ax, az + .033, 4.135), edge(bx, bz + .033, 4.135), .033, .037);
    glow.beam(seafoam, edge(ax, az + .034, 4.080), edge(bx, bz + .034, 4.080), .019, .019);
  }

  const marquee = face(entryX, front + 3.58, 0);
  marquee.trim(bronze, 0, 4.17, -.06, 3.51, .66, .32);
  marquee.trim(darkBronze, 0, 4.17, .11, 3.37, .54, .09);
  marquee.panel(signs.valet, 0, 4.17, .159, 3.31, .50);

  for (const x of [-60.35, -49.65]) {
    const z = 56.35;
    slab(shadowStone, x, .913, z, .35, .225, .38);
    slab(enamel, x, 2.36, z, .30, 2.77, .32);
    for (const offset of [-.10, .10]) trim(bronze, x + offset, 2.35, z + .162, .039, 2.67, .043);
    slab(ivory, x, 3.77, z, .35, .24, .38);
    trim(darkBronze, x, 3.88, z, .35, .048, .38);
  }

  for (let ix = -12; ix <= 12; ix++) {
    const x = ix * .47;
    const depth = point(x / extent, 1)[1];
    const bulbZ = front + depth - .24;
    cylinder(metal, darkBronze, entryX + x, 3.873, bulbZ, .123, .040);
    cylinder(glow, neon, entryX + x, 3.848, bulbZ, .071, .028);
  }
  for (const z of [55.66, 56.53, 57.40]) {
    for (let ix = -5; ix <= 5; ix++) {
      const x = entryX + ix * .82;
      cylinder(metal, bronze, x, 3.879, z, .20, .046);
      cylinder(glow, 0xffe7b7, x, 3.851, z, .15, .03);
    }
  }
}

const resortWings = [
  {name: 'Lantern Hotel & Suites', x: -56, z: 69, w: 13, d: 7, roof: 28.80, sign: signs.hotel, accent: coral},
  {name: 'Lantern Oasis Tower', x: -18, z: 69, w: 15, d: 7, roof: 22.80, sign: signs.oasis, accent: seafoam},
];

function wing(parts, {x, z, w, d, roof, sign, accent}) {
  const {slab, trim, light, face} = parts;
  const frontFace = face(x, z - d / 2, Math.PI);

  // Retain the working ground-level entrances beneath a cantilevered header.
  frontFace.slab(black, 0, 4.57, .44, w + .12, .59, .91);
  frontFace.slab(ivory, 0, 4.94, .43, w + .19, .14, .93);
  frontFace.trim(bronze, 0, 4.26, .46, w + .21, .075, .96);
  frontFace.panel(sign, 0, 4.56, .906, 6.42, .51);
  for (const side of [-1, 1]) {
    frontFace.slab(jade, side * (w / 2 - .76), 2.31, .16, .49, 2.94, .24);
    lantern(frontFace, side * (w / 2 - .76), 2.69, .318);
  }

  for (let side = 0; side < 4; side++) {
    const yaw = side * Math.PI / 2;
    const span = side % 2 === 0 ? w : d;
    const inset = (side % 2 === 0 ? d : w) / 2;
    const wall = face(x + Math.sin(yaw) * inset, z + Math.cos(yaw) * inset, yaw);

    // Ribbed corner pilasters carry the resort's limestone and bronze from
    // the podium to its stepped roofline while retaining the tower's glazing.
    for (const direction of [-1, 1]) {
      const along = direction * (span / 2 - .30);
      wall.slab(stone, along, (roof + 4.80) / 2, .11, .56, roof - 4.8, .35);
      for (const offset of [-.15, 0, .15]) {
        wall.slab(ivory, along + offset, (roof + 4.96) / 2, .314, .058, roof - 4.96, .074);
      }
      wall.trim(bronze, along, roof - 1.44, .337, .61, .14, .13);
      wall.slab(ivory, along, roof - .87, .226, .67, .26, .37);
      wall.light(accent, along, roof - 2.18, .356, .034, 1.28, .024);
    }

    wall.slab(enamel, 0, roof + .38, .20, span + .44, .86, .56);
    wall.slab(ivory, 0, roof + .86, .248, span + .57, .15, .64);
    rail(wall, span + .39, roof + .57, .49, accent);
    wall.trim(bronze, 0, roof + .02, .41, span + .51, .066, .17);

    if (side % 2 === 0) {
      wall.slab(stone, 0, roof + 1.55, -.17, span - 1.38, 1.52, .60);
      wall.slab(ivory, 0, roof + 2.32, -.19, span - 1.64, .17, .69);
      wall.slab(stone, 0, roof + 2.55, -.29, span * .43, .34, .38);
      wall.trim(bronze, 0, roof + 2.73, -.29, span * .45, .058, .40);
      wall.trim(darkBronze, 0, roof + 1.54, .16, span - 2.35, 1.55, .20);
      wall.panel(sign, 0, roof + 1.54, .267, span - 2.49, 1.42);
      for (const edge of [-1, 1]) {
        for (let i = 0; i < 3; i++) {
          const along = edge * (span / 2 - .38 - .22 * i);
          wall.trim(bronze, along, roof + .99, .05, .087, .75 + i * .31, .19);
          wall.light(accent, along, roof + .99, .154, .025, .66 + i * .30, .036);
        }
      }
    }
  }

  // A small lantern at either end of the crown echoes the central marquee.
  for (const zOffset of [-2.90, 2.90]) {
    slab(enamel, x, roof + 2.39, z + zOffset, 1.20, .78, .58);
    trim(bronze, x, roof + 2.79, z + zOffset, 1.35, .14, .66);
    light(accent, x, roof + 2.52, z + zOffset, 1.11, .13, .64);
  }
}

export function resortExterior(scene, Batch) {
  addPalaceArrival(scene,Batch);
  const cube = new THREE.BoxGeometry(), plane = new THREE.PlaneGeometry();
  const round = new THREE.CylinderGeometry(.5, .5, 1, 16);
  const materials = {
    stone: new THREE.MeshStandardMaterial({vertexColors: true, roughness: .84}),
    metal: new THREE.MeshStandardMaterial({vertexColors: true, roughness: .43, metalness: .24}),
    glow: new THREE.MeshBasicMaterial({vertexColors: true, toneMapped: false}),
    sign: new THREE.MeshBasicMaterial({vertexColors: true, map: signAtlas(), toneMapped: false}),
    water: new THREE.MeshStandardMaterial({vertexColors: true, roughness: .23, metalness: .18}),
    spray: new THREE.MeshBasicMaterial({color: 0xc7faff}),
  };
  const group = (name) => {
    const region = new THREE.Group();
    region.name = name;
    scene.add(region);
    return region;
  };

  const frontCourt = group('Lantern Club Casino forecourt');
  const hall = group('Lantern Club Casino');
  const casino = partBuilder(Batch, cube, plane, round, hall, materials);
  const court = partBuilder(Batch, cube, plane, round, frontCourt, materials);
  mainHall(casino);
  const updateCrown=grandResortTower(scene,Batch,casino,cube,materials);
  const updateRooms=grandRooms(scene,Batch);
  casino.build();
  porteCochere(court);
  const updateFountain = centaurFountain(court, frontCourt, Batch, materials);
  court.build();

  for (const plan of resortWings) {
    const parts = partBuilder(Batch, cube, plane, round, group(plan.name), materials);
    wing(parts, plan);
    parts.build();
  }
  for (const geometry of [cube, plane, round]) geometry.dispose();

  return (dt,local)=>{
    updateFountain(dt,local);updateCrown(dt,local);updateRooms(local,dt);
  };
}
