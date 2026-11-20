import * as THREE from 'three';

// Keep intact posts in one draw call. Only rewrite vertices when a post falls.
export function breakablePostView(scene,Batch){
  const parts=new Batch(),ranges=[];
  return {
    add(id,x,y,z,build){
      const start=parts.positions.length, label=build(parts);
      ranges.push({id,x,y,z,start,end:parts.positions.length,label,angle:0});
    },
    finish(){
      const mesh=parts.mesh(scene,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));
      const pos=mesh.geometry.attributes.position,normal=mesh.geometry.attributes.normal;
      const original=pos.array.slice(),normals=normal.array.slice();
      let initial=true;
      return (state,dt)=>{
        for(const r of ranges){
          const down=state?.posts?.[r.id]===0;
          const angle=down?(initial?Math.PI/2:Math.min(Math.PI/2,r.angle+3.6*dt)):0;
          if(angle===r.angle)continue;
          const c=Math.cos(angle),s=Math.sin(angle);
          for(let i=r.start;i<r.end;i+=3){
            const dy=original[i+1]-r.y,dz=original[i+2]-r.z;
            pos.array[i+1]=r.y+dy*c-dz*s;pos.array[i+2]=r.z+dy*s+dz*c;
            normal.array[i+1]=normals[i+1]*c-normals[i+2]*s;normal.array[i+2]=normals[i+1]*s+normals[i+2]*c;
          }
          if(r.label)r.label.visible=!down;
          pos.needsUpdate=normal.needsUpdate=true;r.angle=angle;
        }
        if(state)initial=false;
      };
    }
  };
}
