import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {civilianScanLooks} from './civilian-style.js';
import {loadCharacterScan} from './player-scan.js';

export function createCivilianScans(loader=new GLTFLoader()){
  const scans=new Map();
  return function nearbyCivilianScan(state){
    const number=civilianScanLooks[state.id]?.model;
    if(!number || state.officer || state.venue || (state.lostParts && Object.keys(state.lostParts).length))return;
    if(!scans.has(number)){
      // A pending or unavailable scan keeps the existing dressed rig in the scene.
      scans.set(number,undefined);
      loadCharacterScan(loader,'./civilians/civilian-'+number+'.glb').then(meshes=>{
        scans.set(number,meshes);
      }).catch(error=>console.warn('Civilian scan '+number+' unavailable; showing street clothes.',error));
    }
    return scans.get(number);
  };
}
