import assert from 'node:assert/strict';
import {fireEngineCameraContains,fireEngineCameraClearance} from '../public/fire-engine-camera.js';

for(const yaw of [0,Math.PI/2,Math.PI,3*Math.PI/2]){
  const car={x:7,y:.8,z:-12,yaw};
  const c=Math.cos(yaw),s=Math.sin(yaw);
  const point=(side,along)=>({x:car.x+side*c-along*s,y:car.y+1.45,z:car.z+side*s+along*c});
  const exit=point(-1.57,.55),shoulder=point(-.91,.55);
  assert(!fireEngineCameraContains([car],exit.x,exit.y,exit.z),'driver is outside the engine');
  assert(fireEngineCameraContains([car],shoulder.x,shoulder.y,shoulder.z),
    'the usual shoulder camera would start inside the engine');
  const toward={x:c,y:0,z:s},away={x:-c,y:0,z:-s};
  assert(fireEngineCameraClearance([car],exit,toward,4)<.5,
    'camera boom stops before the engine body');
  assert.equal(fireEngineCameraClearance([car],exit,away,4),4,
    'camera boom has its usual reach on the clear side');
}
process.env.GOY_THEFT_AUTO_MAP='brickell';
const [{newExpedition},{fireEngine},{clearRoadExit}]=await Promise.all([
  import('../public/expedition.js'),import('../public/fire-engine.js'),import('../public/rover.js')]);
const world=newExpedition(),engine=fireEngine();world.traffic=[engine];
const exit=clearRoadExit(world,engine);
assert(exit,'reserve engine has a safe exit at its Brickell bay');
assert(!fireEngineCameraContains([engine],exit.x,exit.y+1.46,exit.z));
assert(fireEngineCameraContains([engine],exit.x+.66,exit.y+1.46,exit.z),
  'the pre-fix shoulder camera sits inside the parked reserve engine');
console.log('PASS fire engine camera clearance at four headings');
