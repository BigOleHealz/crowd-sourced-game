import * as THREE from 'three';

import {chamferedOutline,guardHeight,hasApartmentBalconies,railGeometry,towerBays,towerStories} from './tower-glass.js';
import {paneBatch} from './pane-damage-view.js';
import {paneKey} from './pane-damage.js';
export {hasApartmentBalconies};

// Crops of the glazing above the painted railings in the two residential atlas tiles.
const windowCrops = [
  [[43, 69, 222, 150], [275, 65, 512, 151], [49, 274, 221, 337], [277, 627, 507, 690]],
  [[806, 833, 923, 908], [1004, 833, 1120, 908], [1186, 833, 1303, 908], [806, 1027, 924, 1100]],
];
const atlasSize = 1536;
const picketDistance = 48;

function windowGeometry([left, top, right, bottom]) {
  const pane = new THREE.PlaneGeometry();
  const uv = pane.attributes.uv.clone();
  for (let i = 0; i < uv.count; i++) {
    uv.setXY(i, (left + (right - left) * uv.getX(i)) / atlasSize,
      1 - (bottom - (bottom - top) * uv.getY(i)) / atlasSize);
  }
  pane.setAttribute('batchUv', uv);
  return pane;
}

function wrapSlab(x, z) {
  const outline = new THREE.Shape(chamferedOutline(x, z, .65).map(([u, v]) => new THREE.Vector2(u, -v)));
  const slab = new THREE.ExtrudeGeometry(outline, {depth: 1, bevelEnabled: false});
  return slab.rotateX(-Math.PI / 2);
}

function addGuard(masonry, cube, infill, start, end, floor, metal, closeEnd = false) {
  const [ax, az] = start, [bx, bz] = end;
  const {dx,dz,length,yaw,bays,span}=railGeometry(ax,az,bx,bz);
  const x = (ax + bx) / 2, z = (az + bz) / 2;
  masonry.add(cube, metal, x, floor + guardHeight, z, length + .046, .047, .053, 0, yaw);
  masonry.add(cube, metal, x, floor + .12, z, length, .035, .035, 0, yaw);
  for (let i = 0; i < bays + Number(closeEnd); i++) {
    masonry.add(cube, metal, ax + dx * i / bays, floor + guardHeight / 2, az + dz * i / bays,
      .044, guardHeight, .044, 0, yaw);
    if (i === bays) continue;
    const center = (i + .5) / bays;
    infill(ax + center * dx, floor + (guardHeight + .12) / 2, az + center * dz, yaw, span);
  }
}

function addPicketLOD(scene, shape, material, pickets, x, y, z) {
  if (!pickets.length) return;
  const lod = new THREE.LOD();
  lod.position.set(x, y, z);
  const detail = new THREE.InstancedMesh(shape, material, pickets.length);
  const matrix = new THREE.Matrix4().makeScale(1, guardHeight - .12, 1);
  for (let i = 0; i < pickets.length; i++) {
    const [px, py, pz] = pickets[i];
    detail.setMatrixAt(i, matrix.setPosition(px - x, py - y, pz - z));
  }
  detail.computeBoundingSphere();
  // The handrails, slab edges and structural posts stay in the static mesh.
  // Cull the closely spaced infill before it becomes subpixel from the road.
  lod.addLevel(detail, 0);
  lod.addLevel(new THREE.Group(), picketDistance, .12);
  scene.add(lod);
}

export function addApartmentBalconies(scene, Batch, atlas, buildings, base, podium) {
  const cube = new THREE.BoxGeometry(), leaves = new THREE.IcosahedronGeometry(1, 1);
  const guardPane = new THREE.PlaneGeometry();
  // The narrow, open prism needs only six triangles with its ends covered by the rails.
  const picketShape = new THREE.CylinderGeometry(.017, .017, 1, 3, 1, true);
  const windows = windowCrops.map(crops => crops.map(windowGeometry));
  const stoneMaterial = new THREE.MeshLambertMaterial({vertexColors: true});
  const glassMaterial = new THREE.MeshStandardMaterial({map: atlas, vertexColors: true, roughness: .48, metalness: .04});
  const panelMaterial = new THREE.MeshLambertMaterial({
    color: 0x77a49e, transparent: true, opacity: .20, depthWrite: false,
    side: THREE.DoubleSide, forceSinglePass: true,
  });
  const picketMaterial = new THREE.MeshLambertMaterial({color: 0x3e4b4a});

  const updates=[];
  buildings.forEach(({x, z, w, d, eave, facade}, tower) => {
    if (!hasApartmentBalconies(facade)) return;
    const wrap = facade === 0, type = wrap ? 0 : 1;
    const height = eave - podium;
    const {floors,story}=towerStories({eave,facade},podium),start=base+podium;
    const masonry = new Batch(), glazing = new Batch(true), panels = new Batch(), pickets = [];
    const sheets=paneBatch(glazing),guards=paneBatch(panels);
    const cladding = wrap ? 0xd1cfc3 : 0xcfc3ae;
    const concrete = wrap ? 0xcac9bc : 0xb3a58f;
    const frame = wrap ? 0x4e625e : 0x4c5149;
    const metal = wrap ? 0x627973 : 0x3e4b4a;
    const projection = 1.45;
    const slab = wrap ? wrapSlab(w / 2 + projection, d / 2 + projection) : null;
    const outline = wrap ? chamferedOutline(w / 2 + projection - .10, d / 2 + projection - .10, .60) : null;

    const infill = wrap
      ? (px, y, pz, yaw, span) => {
        guards.add(paneKey(px,y,pz),()=>panels.add(guardPane, 0xffffff, px,y,pz,span-.039,guardHeight-.12,1,0,yaw));
      }
      : (px, y, pz, yaw, span) => {
        const subdivisions = Math.ceil(span / .155);
        const cos = Math.cos(yaw), sin = Math.sin(yaw);
        for (let j = 1; j < subdivisions; j++) {
          const offset = span * (j / subdivisions - .5);
          pickets.push([px + offset * cos, y, pz - offset * sin]);
        }
      };

    for (let floor = 0; floor < floors; floor++) {
      const level = start + floor * story;
      if (wrap) {
        masonry.add(slab, concrete, x, level - .17, z, 1, .21, 1);
        outline.forEach(([u, v], i) => {
          const [nextU, nextV] = outline[(i + 1) % outline.length];
          addGuard(masonry, cube, infill, [x + u, z + v], [x + nextU, z + nextV], level + .04, metal);
        });
      }

      for (let side = 0; side < 4; side++) {
        const yaw = side * Math.PI / 2, cos = Math.cos(yaw), sin = Math.sin(yaw);
        const length = side % 2 ? d : w;
        const edge = (side % 2 ? w : d) / 2;
        const position = (along, offset) => [x + cos * along + sin * (edge + offset), z - sin * along + cos * (edge + offset)];
        const solid = (tint, along, y, offset, width, h, depth, shape = cube) => {
          const [px, pz] = position(along, offset);
          masonry.add(shape, tint, px, y, pz, width, h, depth, 0, yaw);
        };

        const {bays,bay,pier}=towerBays(length,wrap);
        const opening = bay - pier;
        const sill = level + .12, head = level + Math.min(2.61, story - .36);
        const panelHeight = head - sill;
        solid(cladding, 0, (head + level + story) / 2, -.21, length, level + story - head, .42);
        solid(cladding, 0, level + .06, -.21, length, .12, .42);

        for (let j = 0; j <= bays; j++) {
          const edgePier = j === 0 || j === bays;
          const adjustment = edgePier ? (j === 0 ? pier / 4 : -pier / 4) : 0;
          solid(cladding, -length / 2 + j * bay + adjustment, (head + sill) / 2, -.21,
            edgePier ? pier / 2 : pier, panelHeight, .42);
        }

        for (let j = 0; j < bays; j++) {
          const center = -length / 2 + (j + .5) * bay;
          const seed = tower * 37 + floor * 13 + side * 19 + j * 7;
          const [gx, gz] = position(center, -.375);
          const glassTint = [0xc1d0cd, 0xd3ded7, 0xabbbb8, 0x9fb4af][seed % 4];
          const glassPattern = (seed ^ (seed >>> 3)) % 4;
          const y=(sill+head)/2;
          sheets.add(paneKey(gx,y,gz),()=>glazing.add(windows[type][glassPattern],glassTint,
            gx,y,gz,opening,panelHeight,1,0,yaw));

          for (const edge of [-.5, 0, .5]) {
            solid(frame, center + edge * (opening - .065), (head + sill) / 2, -.34,
              edge === 0 ? .047 : .069, panelHeight, .066);
          }
          for (const line of [head - .035, sill + .035]) {
            solid(frame, center, line, -.34, opening, .069, .066);
          }

          if (!wrap) {
            // Private balconies are narrower than the structural bay. The
            // terracotta fascia faces out, above a shaded concrete soffit.
            const depth = 1.22, width = opening + .13;
            const left = center - width / 2 + .06, right = center + width / 2 - .06;
            const front = depth - .085;
            solid(concrete, center, level - .065, depth / 2 - .10, width, .21, depth + .20);
            solid(0xa6654a, center, level - .032, depth - .02, width + .014, .143, .082);
            const corners = [[left, .04], [left, front], [right, front], [right, .04]];
            for (let k = 0; k < corners.length - 1; k++) {
              addGuard(masonry, cube, infill, position(...corners[k]), position(...corners[k + 1]),
                level + .04, metal, k === corners.length - 2);
            }
          }

          if (seed % 11 === 3) {
            const planter = center + (seed % 2 ? .30 : -.30) * opening;
            const offset = wrap ? .89 : .77;
            solid(wrap ? 0xa99e88 : 0x885e4c, planter, level + .17, offset, .55, .26, .30);
            solid(0x526044, planter - .13, level + .35, offset, .23, .15, .18, leaves);
            solid(0x687858, planter + .11, level + .38, offset, .22, .18, .16, leaves);
          }
        }
      }
    }

    masonry.mesh(scene, stoneMaterial).userData.impactSurface = 'solid';
    const windowsMesh=glazing.mesh(scene,glassMaterial,false);
    windowsMesh.userData.impactSurface='solid';
    updates.push(sheets.bind(windowsMesh));
    if(wrap)updates.push(guards.bind(panels.mesh(scene,panelMaterial,false)));
    addPicketLOD(scene, picketShape, picketMaterial, pickets, x, start + height / 2, z);
    slab?.dispose();
  });
  for (const geometry of [cube, leaves, guardPane, ...windows.flat()]) geometry.dispose();
  let lastRevision;
  return doors=>{
    const revision=doors?.glassSeq??0;
    if(revision===lastRevision)return;
    lastRevision=revision;
    for(const update of updates)update(doors?.brokenPanes);
  };
}
