import * as THREE from 'three';

// A quilted parade bustle with a striped sash. It follows the player's costume
// rig and has no world collider or entries in the hit-region definitions.
let cloth;
export function fitParadeBreeches(body,Batch){
  const batch=new Batch(),puff=new THREE.SphereGeometry(1,16,10),clasp=new THREE.BoxGeometry();
  const velvet=0x632d55,gold=0xc5a263;
  for(const side of [-1,1]){
    batch.add(puff,velvet,side*.13,.956,-.04,.171,.17,.197);
    batch.add(puff,0x8e496a,side*.112,.968,-.247,.146,.13,.265);
  }
  batch.add(puff,velvet,0,.973,-.316,.16,.129,.294);
  for(const side of [-1,1]){
    batch.beam(gold,[side*.124,1.040,-.128],[side*.080,1.055,-.47],.014,.014);
    batch.beam(gold,[side*.080,1.055,-.47],[0,1.003,-.59],.013,.013);
  }
  batch.add(puff,0x324956,0,1.069,-.013,.234,.064,.164);
  batch.add(clasp,gold,0,1.083,-.164,.085,.044,.018);
  cloth??=new THREE.MeshLambertMaterial({vertexColors:true});
  const costume=batch.mesh(body,cloth,false);
  puff.dispose();clasp.dispose();return costume;
}
