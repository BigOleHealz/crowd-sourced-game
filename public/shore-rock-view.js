import * as THREE from 'three';

export function addShoreBoulders(parent,field,name){
  const stones=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1,0),
    new THREE.MeshStandardMaterial({roughness:1,flatShading:true}),field.rocks.length);
  const dummy=new THREE.Object3D(),palette=[0x9d9b90,0xb2ab9b,0x858c87,0xa7a598];
  for(const [count,rock] of field.rocks.entries()){
    dummy.position.set(rock.x,rock.centerY,rock.z);
    dummy.rotation.set(rock.rotation*.14,rock.rotation*Math.PI*2,rock.rotation*.17);
    dummy.scale.set(rock.radius,rock.height,rock.zRadius);dummy.updateMatrix();
    stones.setMatrixAt(count,dummy.matrix);
    const color=new THREE.Color(palette[rock.palette]);
    if(rock.floor<.15)color.multiplyScalar(.72);
    stones.setColorAt(count,color);
  }
  stones.instanceMatrix.needsUpdate=true;
  if(stones.instanceColor)stones.instanceColor.needsUpdate=true;
  stones.name=name;stones.userData.impactSurface='solid';parent.add(stones);
  return stones;
}
