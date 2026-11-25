import {Skeleton, SkinnedMesh, Sphere, Vector3} from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {CITY} from './world.js';

export async function loadCharacterScan(loader,url) {
  const {scene}=await loader.loadAsync(url);
  const meshes=[];
  scene.traverse(node=>{
    if(!node.isSkinnedMesh)return;
    node.geometry.userData.sharedFieldKit=true;
    meshes.push(node);
  });
  if(!meshes.length)throw new Error('Missing character skin in '+url);
  return meshes;
}

export function fitCharacterScan(rig,meshes,name,receiveShadow=false) {
  const byName={body:rig.body,spine:rig.spine,upper:rig.upper,head:rig.head};
  for(const limb of rig.limbs){
    const side=limb.side<0?'Left':'Right';
    for(const part of ['leg','knee','ankle','arm','forearm'])byName[side+part]=limb[part];
  }
  const skeletons=new Map();
  for(const template of meshes){
    const source=template.skeleton;
    if(!skeletons.has(source))skeletons.set(source,new Skeleton(source.bones.map(bone=>byName[bone.name]),source.boneInverses));
    const skin=new SkinnedMesh(template.geometry,template.material);
    skin.name=name;skin.receiveShadow=receiveShadow;
    skin.bind(skeletons.get(source),template.bindMatrix);
    skin.boundingSphere=new Sphere(new Vector3(0,.85,0),2.1);
    rig.root.add(skin);
  }
}

const templates = new Map(), pending = new Map();
const files = {mike:'./mike-alger.glb',pink:'./pink-girl.glb',army:'./army-man-fitted.glb'};
export function preloadPlayerScan() {
  for(const [kind,file] of Object.entries(files)) {
    if(kind==='army' && !CITY)continue;
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
export function usePlayerScan(state, available=templates) {
  if(typeof state.id !== 'number')return typeof state.id === 'string' && state.id.startsWith('military-guard-') && available.has('army') ? 'army' : null;
  const override=new URLSearchParams(location.search).get('avatar');
  const kind=Object.hasOwn(files,override) || override==='classic' ? override : state.character ?? 'mike';
  return available.has(kind) ? kind : null;
}
export function fitPlayerScan(rig,kind) {
  fitCharacterScan(rig,templates.get(kind),kind+' player skin');
  rig.scanned = kind;
}
