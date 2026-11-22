import * as THREE from 'three';

function sheet(batch,tint,rows){
  const positions=rows.flat(2),indices=[],width=rows[0].length;
  for(let j=1;j<rows.length;j++)for(let i=0;i<width-1;i++){
    const a=(j-1)*width+i;
    indices.push(a,a+width,a+width+1,a,a+width+1,a+1);
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  g.setIndex(indices);g.computeVertexNormals();
  // The lower lips, wheel liners and aprons are visible from both sides.
  // Give their back faces their own normals so the sheet remains lit at seams.
  const normals=Array.from(g.attributes.normal.array),count=positions.length/3,back=[];
  for(let i=0;i<indices.length;i+=3)back.push(indices[i]+count,indices[i+2]+count,indices[i+1]+count);
  g.setAttribute('position',new THREE.Float32BufferAttribute([...positions,...positions],3));
  g.setAttribute('normal',new THREE.Float32BufferAttribute([...normals,...normals.map(n=>-n)],3));
  g.setIndex([...indices,...back]);batch.add(g,tint,0,0,0);g.dispose();
}

function hood(batch,pickup,paint){
  // The pickup has a subtly raised hood center, twin swages and falling shoulders.
  // The field jeep has a narrower stamped cover and exposed flat fender tops.
  const top=pickup ? [[-1.67,.63,.87],[-1.55,.705,.975],[-1.10,.713,1.005],[-.70,.684,1.055],[-.579,.666,1.055]] :
    [[-1.50,.485,.871],[-1.43,.498,.957],[-1.0,.511,.998],[-.61,.542,1.031]];
  const profile=pickup ? [[0,.055],[.44,.049],[.60,.025],[.67,.041],[.80,.022],[.94,.008],[1,-.039]]:
    [[0,.018],[.78,.012],[.94,.001],[1,-.052]];
  const rows=top.map(([z,w,h])=>{
    const right=profile.map(([x,y])=>[x*w,h+y,z]);
    return [...right.slice(1).reverse().map(([x,y,z])=>[-x,y,z]),...right];
  });
  sheet(batch,paint,rows);
  const first=rows[0],lip=first.map(([x,y,z])=>[x*.992,y-.092,z+.013]);
  sheet(batch,paint,[lip,first]);
}

function wheelArch(batch,pickup,side,z,paint,dark){
  const center=.368,n=22,inner=.393,outer=pickup?.451:.455;
  const under=[],edge=[],returnEdge=[],skirt=[];
  for(let i=0;i<=n;i++){
    const a=Math.PI*(1-i/n),sa=Math.sin(a),ca=Math.cos(a);
    const p=(r,x)=>[side*x,center+sa*r,z+ca*r];
    under.push([p(inner-.004,.605),p(inner,.796)]);
    edge.push([p(inner,.796),p(outer-.012,.817),p(outer,.804)]);
    returnEdge.push([p(outer,.804),p(outer+.009,.745)]);
    if(pickup){
      const aft=z>0,top=aft?1.065:.91+.026*(1+ca),pt=p(outer+.009,.745);
      skirt.push([pt,[side*.741,Math.max(pt[1]+.008,top-.087),pt[2]],[side*.714,top,pt[2]]]);
    }
  }
  if(side>0){under.reverse();edge.reverse();returnEdge.reverse();skirt.reverse();}
  sheet(batch,0x393e3d,under);sheet(batch,pickup?paint:dark,edge);
  sheet(batch,pickup?paint:dark,returnEdge);if(skirt.length)sheet(batch,paint,skirt);
}

function frontApron(chassis,pickup,paint,dark,cube){
  const sections=pickup ? [[-.77,-1.54,.555,.71],[-.66,-1.655,.519,.683],[-.46,-1.698,.475,.649],
    [0,-1.708,.477,.647],[.46,-1.698,.475,.649],[.66,-1.655,.519,.683],[.77,-1.54,.555,.71]] :
    [[-.77,-1.44,.455,.535],[-.7,-1.556,.449,.563],[-.44,-1.592,.448,.569],[0,-1.592,.448,.569],
    [.44,-1.592,.448,.569],[.7,-1.556,.449,.563],[.77,-1.44,.455,.535]];
  const rows=sections.map(([x,z,lo,hi])=>[[x,lo,z+.040],[x,lo+.025,z],[x,hi-.019,z-.013],[x,hi,z+.018],[x,hi,z+.13]]);
  sheet(chassis,pickup?0x818d90:dark,rows.reverse());
  if(pickup){
    chassis.add(cube,0x333c3d,0,.536,-1.714,.68,.085,.025);
    for(const x of [-.56,.56])chassis.add(cube,0x3e4749,x,.584,-1.669,.115,.053,.048);
  }
  chassis.add(cube,0x575b57,0,pickup?.65:.48,pickup?-1.720:-1.611,.267,.088,.014);
  chassis.add(cube,0xd7c8a3,0,pickup?.65:.48,pickup?-1.73:-1.621,.237,.069,.008);
}

export function shapedBodywork(chassis,pickup,paint,dark,cube){
  hood(chassis,pickup,paint);
  frontApron(chassis,pickup,paint,dark,cube);
  for(const side of [-1,1]){
    const x=v=>side*v;
    for(const axle of [-.94,.95])wheelArch(chassis,pickup,side,axle,paint,dark);
    if(pickup){
      for(const [front,rear,bottomFront,bottomRear,top] of [
          [-1.63,-1.395,.595,.394,.885],[-.485,-.30,.394,.51,.955],
          [.32,.495,.525,.394,1.059],[1.405,1.66,.394,.584,1.06]]){
        const stage=(z,h)=>[[x(.692),h,z],[x(.736),h+.026,z],[x(.746),top-.086,z],[x(.715),top,z]];
        sheet(chassis,paint,[stage(front,bottomFront),stage((front+rear)*.5,(bottomRear+bottomFront)*.5),stage(rear,bottomRear)]);
      }
      // A shoulder crease carries from the front wheel over the door into the bed.
      for(const [z0,z1,top] of [[-1.55,-.60,.94],[-.567,.296,.996],[.388,1.61,1.06]]){
        const rows=[z0,(z0+z1)*.5,z1].map(z=>[[x(.726),top-.101,z],[x(.753),top-.068,z],[x(.740),top-.041,z]]);
        sheet(chassis,paint,side<0?rows:rows.reverse());
      }
      chassis.add(cube,0x485251,x(.709),1.045,-.105,.04,.036,.902);
      // Deep door jamb at the back of the cab; the pickup bed is a separate pressed box.
      chassis.add(cube,0x394141,x(.70),.836,.344,.051,.34,.028);
      for(let i=0;i<4;i++)chassis.add(cube,dark,x(.698),1.009,.554+i*.225,.105,.024,.106);
    }else{
      for(const [z0,z1,h] of [[-1.43,-1.12,.804],[-1.12,-.68,.853],[-.68,-.47,.856]]){
        const rows=[z0,z1].map(z=>[[x(.541),h+.018,z],[x(.762),h,z],[x(.79),h-.036,z],[x(.79),h-.058,z]]);
        sheet(chassis,paint,side<0?rows:rows.reverse());
      }
      chassis.beam(dark,[x(.75),.55,-.48],[x(.75),.55,.41],.036);
      chassis.beam(dark,[x(.749),.56,-.43],[x(.68),.68,-.37],.033);
      chassis.beam(dark,[x(.748),.56,.36],[x(.68),.68,.31],.033);
      for(const z of [-1.23,-.85]){
        chassis.add(cube,0x4c5048,x(.518),.909,z,.020,.113,.033);
        chassis.add(cube,0xa1a398,x(.529),.942,z,.025,.027,.051);
      }
      for(const z of [-.32,.09])chassis.add(cube,0x898e77,x(.726),.794,z,.018,.058,.092);
    }
  }
}
