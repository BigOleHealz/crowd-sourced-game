import assert from 'node:assert/strict';
import * as THREE from 'three';
import {addCarrierRamp} from '../public/eisenhower-carrier.js';

const scene=new THREE.Scene();
addCarrierRamp(scene);
const ramp=scene.getObjectByName('Carrier shore ramp');
assert(ramp,'carrier ramp builds before the game starts rendering');
assert(ramp.children.length>0,'carrier ramp has visible panels and rails');
console.log('PASS carrier ramp scene builds without WebGL');
