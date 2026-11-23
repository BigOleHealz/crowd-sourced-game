import assert from 'node:assert/strict';
import {MeshBasicMaterial, Mesh, Raycaster, Vector3} from 'three';
import {aircraftBody} from '../public/aircraft-body.js';
import {skinPoint} from '../public/vehicle-glass-layout.js';

// The production body builder adds one non-indexed skin before adding the seals.
const hull={colors:[],add(g){this.skin=g.clone();},beam(){}};
const panes=new Map(), glazing={colors:[],add(g){this.current=g.clone();}};
aircraftBody(hull,glazing,{add(id,draw){draw();panes.set(id,glazing.current);}});
const material=new MeshBasicMaterial();
function distanceTo(mesh,from,to){
  const direction=to.clone().sub(from).normalize();
  return new Raycaster(from,direction).intersectObject(mesh)[0]?.distance ?? Infinity;
}
assert.equal(panes.size,10);
const shell=new Mesh(hull.skin,material);
for(const side of [-1,1]){
  const center=new Vector3(0,1.12,-1.10);
  const roof=new Vector3(...skinPoint(5.15,side*.35));
  assert(distanceTo(shell,center,roof)<center.distanceTo(roof),'inside sees roof lining');
  const pane=new Mesh(panes.get(side===1?'Rpilot':'Lpilot'),material);
  const glass=new Vector3(...skinPoint(5.15,side*1.11));
  const outside=glass.clone().sub(center).multiplyScalar(2.5).add(center);
  assert(distanceTo(pane,outside,center)<outside.distanceTo(center));
  assert(distanceTo(shell,outside,center)>outside.distanceTo(center),'broken window opening is clear');
}
