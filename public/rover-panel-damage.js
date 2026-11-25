import * as THREE from 'three';

const smooth=THREE.MathUtils.smoothstep;
const regions=['front','rear','left','right'];

// The body mesh uses vehicle-local coordinates even while the suspension and
// wheels travel independently. Keep the cabin, axle mounts and crew space rigid.
function offset(region,x,y,z) {
  const skin=smooth(y,.32,.56)*(1-smooth(y,1.06,1.48));
  if(region<2){
    const sign=region===0 ? -1 : 1;
    const end=z*sign, crush=smooth(end,.55,1.65)*skin;
    const corner=.61+.38*smooth(x*sign,-.60,.60);
    const seam=Math.sin(end*12.2+x*3.8);
    const lip=smooth(y,.66,.97);
    return [sign*.058*crush*seam, crush*((.22*lip+.055)*seam-.045),-sign*crush*corner*.46];
  }
  const side=region===2 ? -1 : 1;
  const sideSkin=smooth(side*x,.43,.69)*skin;
  const door=Math.exp(-((z+.05)**2)/.30), bed=Math.exp(-((z-.80)**2)/.35);
  const crease=.56+.44*Math.cos(z*8+y*11.5);
  return [-side*sideSkin*(.10+.22*door+.15*bed)*crease,sideSkin*.065*Math.sin(6*z+3*y),sideSkin*.034*Math.sin(5*z-10*y)];
}

// Precompute sparse per-region offsets once. On a new snapshot only changed
// regions bend the existing paint, trim and glass; the draw-call count is fixed.
export function roverPanelDamage(meshes,paint) {
  const strengths=new THREE.Vector4(0,0,0,0), last=[0,0,0,0];
  const pieces=meshes.map(mesh=>{
    const geometry=mesh.geometry, position=geometry.getAttribute('position');
    const initial=new Float32Array(position.array),restNormals=new Float32Array(geometry.getAttribute('normal').array);
    const shapes=regions.map((_,region)=>{
      const indices=[],displacements=[];
      for(let i=0;i<position.count;i++){
        const d=offset(region,initial[i*3],initial[i*3+1],initial[i*3+2]);
        if(Math.max(Math.abs(d[0]),Math.abs(d[1]),Math.abs(d[2]))>.00005){indices.push(i*3);displacements.push(...d);}
      }
      return {indices,displacements:new Float32Array(displacements)};
    });
    return {geometry,position,initial,restNormals,shapes};
  });
  // Sample the existing wear texture in panel-local space. Exposed primer,
  // chipped bare metal and long rub marks grow only on the impacted section.
  const originalCompile=paint.onBeforeCompile;
  paint.onBeforeCompile=shader=>{
    originalCompile.call(paint,shader);
    shader.uniforms.panelDamage={value:strengths};
    shader.fragmentShader='uniform vec4 panelDamage;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',`
      float front=panelDamage.x*smoothstep(.6,1.45,-p.z);
      float back=panelDamage.y*smoothstep(.6,1.45,p.z);
      float side=max(panelDamage.z*smoothstep(.52,.70,-p.x),panelDamage.w*smoothstep(.52,.70,p.x));
      float wear=sqrt(max(max(front,back),side))*smoothstep(.28,.54,p.y)*(1.-smoothstep(1.04,1.40,p.y));
      vec2 scratchUV=n.y>.55?p.xz:vec2(n.x>n.z?p.z:p.x,p.y);
      float fleck=texture2D(wearMap,scratchUV*vec2(3.1,8.7)).g;
      float line=sin(scratchUV.y*124.+scratchUV.x*13.+sin(scratchUV.x*8.)*2.9);
      float contact=.55+.45*cos(scratchUV.x*4.9+scratchUV.y*7.);
      float scar=smoothstep(.18,.55,wear*(.68+.32*contact)+.28*fleck+.13*line-.26);
      vec3 exposed=mix(vec3(.095,.089,.075),vec3(.37,.37,.34),smoothstep(.30,.72,fleck+.15*line));
      diffuseColor.rgb=mix(diffuseColor.rgb,exposed,.85*scar);
      #include <alphamap_fragment>`);
  };
  paint.customProgramCacheKey=()=> 'goy-theft-auto-crumpled-paint';
  return damage=>{
    let changed=false;
    for(let i=0;i<4;i++){
      const value=THREE.MathUtils.clamp(damage?.[regions[i]] || 0,0,1);
      if(value!==last[i]){last[i]=value;changed=true;}
    }
    if(!changed)return;
    strengths.fromArray(last);
    const pristine=last.every(value=>value===0);
    for(const {geometry,position,initial,restNormals,shapes} of pieces){
      const points=position.array;points.set(initial);
      for(let r=0;r<4;r++){
        if(!last[r])continue;
        const amount=Math.sqrt(last[r]),{indices,displacements}=shapes[r];
        for(let i=0;i<indices.length;i++) {
          const j=indices[i],k=i*3;
          points[j]+=amount*displacements[k];points[j+1]+=amount*displacements[k+1];points[j+2]+=amount*displacements[k+2];
        }
      }
      position.needsUpdate=true;
      if(pristine){
        const normal=geometry.getAttribute('normal');normal.array.set(restNormals);normal.needsUpdate=true;
      } else geometry.computeVertexNormals();
      geometry.computeBoundingSphere();
    }
    return true;
  };
}
