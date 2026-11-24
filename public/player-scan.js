import {Skeleton, SkinnedMesh, Sphere, Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const templates = new Map(), pending = new Map();
const files = {mike:'./mike-alger.glb',pink:'./pink-girl.glb'};
export function preloadPlayerScan() {
  for(const [kind,file] of Object.entries(files)) {
    if(pending.has(kind))continue;
    pending.set(kind,new GLTFLoader().loadAsync(file).then(({scene}) => {
      const models=[];
      scene.traverse(node=>{if(node.isSkinnedMesh){
        node.geometry.userData.sharedFieldKit=true;
        models.push(node);
      }});
      if (!models.length) throw new Error('Missing player skin');
      templates.set(kind,models);
    }).catch(error => console.warn(kind+' player skin unavailable; showing field kit.', error)));
  }
}
export function usePlayerScan(state) {
  if(typeof state.id !== 'number' || state.lostParts && Object.keys(state.lostParts).length)return null;
  const override=new URLSearchParams(location.search).get('avatar');
  const kind=Object.hasOwn(files,override) || override==='classic' ? override : state.character ?? 'mike';
  return templates.has(kind) ? kind : null;
}
export function fitPlayerScan(rig,kind) {
  const byName = {body:rig.body, spine:rig.spine, upper:rig.upper, head:rig.head};
  for (const limb of rig.limbs) {
    const side = limb.side < 0 ? 'Left' : 'Right';
    for (const part of ['leg','knee','ankle','arm','forearm']) byName[side+part] = limb[part];
  }
  for(const template of templates.get(kind)) {
    const source = template.skeleton;
    const skin = new SkinnedMesh(template.geometry, template.material);
    skin.name = kind+' player skin';
    skin.bind(new Skeleton(source.bones.map(bone => byName[bone.name]), source.boneInverses), template.bindMatrix);
    // Covers seated, prone, and outstretched limbs without recomputing a bound from every vertex.
    skin.boundingSphere = new Sphere(new Vector3(0,.85,0), 2.1);
    rig.root.add(skin);
  }
  rig.scanned = kind;
}
