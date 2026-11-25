import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Box3,Matrix4,Quaternion,Vector3} from 'three';
import {humveeScale,humveeHull} from '../public/humvee-layout.js';
import {helicopterAirframeScale,littleBirdModelScale} from '../public/helicopter-layout.js';
import {tankScale,tankHull} from '../public/tank-layout.js';
import {supercarLayout,supercarModelScale} from '../public/supercar-layout.js';
import {wheelStations} from '../public/road-wheel-layout.js';

function glbBounds(file,exclude=()=>false){
  const bytes=readFileSync(new URL(`../public/${file}`,import.meta.url));
  assert.equal(bytes.toString('ascii',0,4),'glTF');
  const gltf=JSON.parse(bytes.toString('utf8',20,20+bytes.readUInt32LE(12)));
  const parents=new Map(gltf.nodes.flatMap((node,i)=>(node.children??[]).map(child=>[child,i])));
  const matrix=i=>{
    const node=gltf.nodes[i];
    const local=node.matrix?new Matrix4().fromArray(node.matrix):new Matrix4().compose(
      new Vector3(...(node.translation??[0,0,0])),new Quaternion(...(node.rotation??[0,0,0,1])),
      new Vector3(...(node.scale??[1,1,1])));
    return parents.has(i)?matrix(parents.get(i)).multiply(local):local;
  };
  const bounds=new Box3();
  for(const [i,node] of gltf.nodes.entries()){
    if(node.mesh==null || exclude(node))continue;
    const transform=matrix(i);
    for(const primitive of gltf.meshes[node.mesh].primitives){
      const {min,max}=gltf.accessors[primitive.attributes.POSITION];
      for(const x of [min[0],max[0]])for(const y of [min[1],max[1]])for(const z of [min[2],max[2]])
        bounds.expandByPoint(new Vector3(x,y,z).applyMatrix4(transform));
    }
  }
  return bounds.getSize(new Vector3());
}
const close=(actual,wanted,label,tolerance=.025)=>
  assert(Math.abs(actual-wanted)<tolerance,`${label}: ${actual.toFixed(3)} m versus ${wanted.toFixed(3)} m`);

const humvee=glbBounds('low-poly-humvee.glb');
close(humvee.x*humveeScale.x,2.31,'Humvee width');
close(humvee.z*humveeScale.z,4.93,'Humvee length');
close(humveeHull.halfWidth*2,2.31,'Humvee collision width');
close(humveeHull.halfLength*2,4.93,'Humvee collision length');
close(Math.abs(wheelStations[0][0]),.78,'Humvee wheel track',.01);
close(Math.abs(wheelStations[0][1]),1.76,'Humvee axle station',.01);

const littleBird=glbBounds('mh-6-little-bird.glb');
close(littleBird.x*helicopterAirframeScale*littleBirdModelScale,8.38,'Little Bird rotor diameter');

const tank=glbBounds('simple-tank.glb');
close(tank.x*.005*tankScale,3.70,'Tank width',.08);
assert(tank.z*.005*tankScale>8.5 && tank.z*.005*tankScale<9.8,'Tank gun-forward length');
close(tankHull.halfWidth*2,3.76,'Tank collision width');

const cheetah=glbBounds('cheetah-supercar.glb',node=>node.name?.includes('Shadow'));
close(cheetah.x*supercarModelScale.x,1.958,'Cheetah width');
close(cheetah.z*supercarModelScale.z,4.565,'Cheetah length');
close(cheetah.y*supercarModelScale.y,1.187,'Cheetah height');
close(supercarLayout.halfWidth*2,1.958,'Cheetah collision width');
close(supercarLayout.halfLength*2,4.565,'Cheetah collision length');
console.log('PASS imported vehicle geometry and gameplay hulls match real-world dimensions.');
