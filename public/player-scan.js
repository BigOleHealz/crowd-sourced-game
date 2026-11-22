import {Skeleton, SkinnedMesh, Sphere, Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

let template, pending;
export function preloadPlayerScan() {
  if (new URLSearchParams(location.search).get('avatar') === 'classic' || pending) return;
  pending = new GLTFLoader().loadAsync('./mike-alger.glb').then(({scene}) => {
    const model = scene.getObjectByProperty('isSkinnedMesh', true);
    if (!model) throw new Error('Missing player skin');
    template = model;
    template.geometry.userData.sharedFieldKit = true;
  }).catch(error => console.warn('Player scan unavailable; showing field kit.', error));
}
export function usePlayerScan(state) {
  return !!template && typeof state.id === 'number' && (!state.lostParts || !Object.keys(state.lostParts).length);
}
export function fitPlayerScan(rig) {
  const byName = {body:rig.body, spine:rig.spine, upper:rig.upper, head:rig.head};
  for (const limb of rig.limbs) {
    const side = limb.side < 0 ? 'Left' : 'Right';
    for (const part of ['leg','knee','ankle','arm','forearm']) byName[side+part] = limb[part];
  }
  const source = template.skeleton;
  const skin = new SkinnedMesh(template.geometry, template.material);
  skin.name = 'Mike Alger scan';
  skin.bind(new Skeleton(source.bones.map(bone => byName[bone.name]), source.boneInverses), template.bindMatrix);
  // Covers seated, prone, and outstretched limbs without recomputing a bound from every vertex.
  skin.boundingSphere = new Sphere(new Vector3(0,.85,0), 2.1);
  rig.root.add(skin);
  rig.scanned = true;
}
