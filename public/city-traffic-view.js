import {frontWheelAngle} from './road-steering.js';
import {roadEngineIdle} from './road-engine-idle.js';
import {poseRoadBoarding} from './ranger-pose.js';
import {roadCabin,boardingDoorAngle} from './road-cabin.js';
import {markPatrolSedan} from './patrol-livery.js';
import {damagedFittings} from './road-fittings.js';
import {crushedScale,roadWreckFinish} from './vehicle-wreck-view.js';
import * as THREE from 'three';
import {civilianProfiles} from './civilian-fleet.js';
import {wheelsFor,flatWheelDrop,isFlat} from './road-wheel-layout.js';
import {tireContactPatch} from './tire-contact-patch.js';
import {mountPosition} from './mounts.js';

import {alpineGlass} from './landscape.js';

const fleet={
  sedan:{paint:0x56748b,roofEnd:.55,cabinEnd:1.29,topFront:-.42},
  hatchback:{paint:0x287f76,roofEnd:.84,cabinEnd:1.47,topFront:-.40},
  van:{paint:0xdacfb8,roofEnd:1.91,cabinEnd:2.16,topFront:-.64},
};
const cube=new THREE.BoxGeometry(), roller=new THREE.CylinderGeometry(1,1,1,20),bore=new THREE.CylinderGeometry(1,1,1,10);
const seatPad=new THREE.SphereGeometry(1,10,6),ring=new THREE.TorusGeometry(.145,.018,7,20);
const rubber=0x22262a,trim=0x323a40,alloy=0xaeb7b9;
const smooth=THREE.MathUtils.smoothstep, mix=THREE.MathUtils.lerp;
const box=(b,c,x,y,z,sx,sy,sz,...rotation)=>b.add(cube,c,x,y,z,sx,sy,sz,...rotation);

// Skin a set of longitudinal contours with continuous normals across each face.
function skin(batch,tint,rows){
  const positions=rows.flat(2),indices=[],stride=rows[0].length;
  for(let row=1;row<rows.length;row++)for(let j=0;j<stride-1;j++){
    const i=(row-1)*stride+j;
    indices.push(i,i+stride,i+stride+1,i,i+stride+1,i+1);
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setIndex(indices);g.computeVertexNormals();
  batch.add(g,tint,0,0,0);g.dispose();
}
function pane(batch,tint,a,b,c,d){skin(batch,tint,[[a,b],[d,c]]);}
function run(batch,color,points,width,depth=width){
  for(let i=1;i<points.length;i++)batch.beam(color,points[i-1],points[i],width,depth);
}
function wheelModel(Batch,tire,depth,van){
  const b=new Batch();
  const profile=[[.62,-.68],[.72,-1],[.91,-.96],[.99,-.72],[1,-.40],[1,.40],[.99,.72],[.91,.96],[.72,1],[.62,.68]];
  const rubberSkin=new THREE.LatheGeometry(profile.map(([r,x])=>new THREE.Vector2(r*tire,x*depth)),24).rotateZ(Math.PI/2);
  b.add(rubberSkin,rubber,0,0,0);rubberSkin.dispose();
  // The shared wheel is mirrored per side. Only its outward face needs spokes.
  b.add(roller,0xa9b0b2,depth*.87,0,0,tire*.68,.018,tire*.68,0,0,Math.PI/2);
  b.add(roller,0x2d3237,depth,0,0,tire*.56,.017,tire*.56,0,0,Math.PI/2);
  const disc=(depth+.014);
  if(van){
    b.add(roller,0x92999a,disc,0,0,tire*.43,.024,tire*.43,0,0,Math.PI/2);
    for(let j=0;j<8;j++){
      const a=j*Math.PI/4;
      b.add(bore,0x252b30,disc+.013,tire*.33*Math.cos(a),tire*.33*Math.sin(a),.025,.004,.025,0,0,Math.PI/2);
    }
  }else for(let j=0;j<5;j++){
    const a=j*Math.PI*2/5;
    for(const fork of [-.16,.16]){
      b.beam(alloy,[disc,tire*.16*Math.cos(a),tire*.16*Math.sin(a)],
        [disc,tire*.625*Math.cos(a+fork),tire*.625*Math.sin(a+fork)],.019,.029);
    }
  }
  b.add(roller,0xa6acc0,disc+.015,0,0,tire*.215,.022,tire*.215,0,0,Math.PI/2);
  return b.geometry();
}

function model(Batch,type,materials,patrol=false){
  const {roofEnd,cabinEnd,topFront}=fleet[type];
  const paint=patrol?0x253747:fleet[type].paint;
  const {nose,tail,skinHeight:roof,bodyWidth:w,axles,tire,halfTread}=civilianProfiles[type];
  const van=type==='van',hatch=type==='hatchback',lift=roadCabin({model:type}).lift;
  const root=new THREE.Group(),chassis=new THREE.Group(),door=new THREE.Group();
  door.name='Driver door';root.add(chassis);chassis.add(door);
  const body=new Batch(),leaf=new Batch(),glass=new Batch(),lamps=new Batch();
  const front=van?-1.07:-1.02,post=van?.28:.26,hinge=-w+.025;
  const belt=van?1.025:.965,bottom=van?.325:.27,topW=w-(van?.075:.185);
  const sideGlassBottom=van?1.033:.964,topRear=roofEnd;
  door.position.set(hinge,0,front);
  // Samples include every fender edge, door seam and bumper taper.
  const stations=[nose,nose+.10,nose+.25,front,post,cabinEnd,tail-.26,tail-.12,tail];
  const archRadius=tire+.052;
  for(const axle of axles)for(let j=0;j<=16;j++)stations.push(axle+archRadius*Math.cos(j*Math.PI/16));
  const slices=[...new Set(stations.filter(z=>z>=nose && z<=tail))].sort((a,b)=>a-b);
  function level(z){
    const head=smooth(z,nose,front),rear=smooth(z,cabinEnd,tail);
    return belt-(van?.19:.21)*(1-head)-(van?.08:hatch?.07:.115)*rear;
  }
  function width(z){
    return w-(van?.12:.14)*(1-smooth(z,nose,nose+.48))-(van?.085:.13)*smooth(z,tail-.42,tail);
  }
  function rail(z){
    const d=Math.min(...axles.map(a=>Math.abs(z-a)));
    if(d<archRadius-.000001)return tire+Math.sqrt(archRadius*archRadius-d*d);
    return bottom;
  }
  function sideRow(side,z,dx=0,dz=0){
    const sz=z+dz,span=width(z),low=rail(z),high=level(z);
    return [[dx+side*(span-.062),low,sz],[dx+side*(span-.013),Math.max(low+.013,bottom+.07),sz],
      [dx+side*(span-.034),Math.max(low+.02,high-.29),sz],[dx+side*span,high-.108,sz],
      [dx+side*(span-.018),high-.060,sz],[dx+side*(span-.065),high,sz]];
  }
  for(const side of [-1,1]){
    for(const [a,b] of [[nose,front],[front+.008,post-.008],[post,tail]]){
      const zs=[a,...slices.filter(z=>z>a && z<b),b];
      const moving=a===front+.008 && side===-1,part=moving?leaf:body;
      skin(part,patrol && a===front+.008?0xe3e6e1:paint,zs.map(z=>sideRow(side,z,moving?-hinge:0,moving?-front:0)));
    }
    // Rolled wheel lips have a shaded liner inside the actual body opening.
    for(const axle of axles){
      const liners=[],lips=[];
      for(let j=0;j<=20;j++){
        const angle=j*Math.PI/20,z=axle+archRadius*Math.cos(angle),y=tire+archRadius*Math.sin(angle);
        const sx=side*(width(z)-.016);
        liners.push([[sx,y,z],[side*(w-.22),y-.009,z]]);
        lips.push([[sx,y,z],[side*width(z),y+.023,z]]);
      }
      skin(body,0x252a2d,liners);skin(body,paint,lips);
    }
    const sillStart=axles[0]+archRadius,sillEnd=axles[1]-archRadius;
    box(body,trim,side*(w-.046),bottom+.02,(sillStart+sillEnd)/2,.078,.049,sillEnd-sillStart);
    for(const z of [post-.15,...(van?[]:[cabinEnd-.25])]){
      const moving=side===-1 && z<post,b=moving?leaf:body;
      const x=side*(w-.006)-(moving?hinge:0),along=z-(moving?front:0);
      b.add(seatPad,0x384248,x,.839+lift,along,.020,.030,.116);
      b.add(seatPad,van?trim:alloy,x+side*.014,.85+lift,along,.022,.022,.088);
    }
    // Door mirror, painted shell and reflective inset on an angled stalk.
    const moving=side===-1,b=moving?leaf:body,x=moving?0:side*(w-.025),z=front+.18-(moving?front:0);
    b.beam(trim,[x,.965,z],[x+side*.135,1.015,z+.025],.048,.058);
    b.add(seatPad,paint,x+side*.15,1.036,z,.106,.059,.088);
    b.add(seatPad,0x869ca8,x+side*.15,1.033,z+.047,.089,.043,.040);
    // Recessed shoulder, rubber belt seal and a distinct inset rear door seam.
    const beltline=[[side*(w-.054),belt-.021,front+.014],[side*(w-.053),belt-.012,post-.012]];
    run(moving?leaf:body,trim,beltline.map(([x,y,z])=>[x-(moving?hinge:0),y,z-(moving?front:0)]),.020,.034);
    run(body,trim,[[side*(w-.048),belt-.012,post],[side*(w-.049),belt-.015,cabinEnd-.04]],.019,.028);
    if(!van)run(body,0x38434a,[[side*(w-.017),belt-.06,cabinEnd-.06],[side*(w-.003),belt-.114,cabinEnd-.08],
      [side*(w-.029),.74,axles[1]-.25]],.009);
    const darkPillar=0x263036;
    body.beam(paint,[side*(w-.052),belt,front],[side*topW,roof-.075,topFront],van?.079:.055);
    body.beam(darkPillar,[side*(w-.055),sideGlassBottom,post],[side*topW,roof-.069,post+.065],.068);
    body.beam(paint,[side*(w-.059),belt,cabinEnd],[side*topW,roof-.075,topRear],van?.094:.085);
    if(!van)pane(body,paint,[side*(w-.061),belt+.012,cabinEnd-.14],[side*topW,roof-.076,topRear-.075],
      [side*topW,roof-.073,topRear+.021],[side*(w-.068),belt+.006,cabinEnd+.052]);
    const forward=[side*(w-.059),sideGlassBottom,front+.07],forwardTop=[side*topW,roof-.083,topFront+.034];
    const backTop=[side*topW,roof-.083,post+.025],back=[side*(w-.058),sideGlassBottom,post-.047];
    // The driver's window is down. A fixed quarter light and the far-side glass
    // retain reflections while leaving the moving driver unobstructed.
    if(side===1)pane(glass,0x8099a6,forward,forwardTop,backTop,back);
    else{
      const quarterBase=[side*(w-.060),sideGlassBottom,front+.22];
      const quarterTop=[mix(forward[0],forwardTop[0],.31),mix(forward[1],forwardTop[1],.31),mix(forward[2],forwardTop[2],.31)];
      pane(glass,0x738c98,forward,quarterTop,quarterTop,quarterBase);
      body.beam(trim,quarterTop,quarterBase,.018);
      // Trim remains on the moving door. Its glass is rolled down so both the
      // seated occupant and the pull-out are visible from the street.
      const outerX=-w-hinge+.082;
      box(leaf,0x353c41,outerX,.681,(post-front)*.5,.065,.39,post-front-.06);
      box(leaf,0x50595e,outerX+.049,.744,(post-front)*.53,.099,.062,.44);
      box(leaf,alloy,outerX+.054,.842,(post-front)*.42,.031,.027,.099);
      leaf.beam(trim,[outerX-.029,belt,post-front-.022],[side*topW-hinge,roof-.097,post-front+.037],.027,.036);
      leaf.beam(trim,[side*topW-hinge,roof-.097,post-front+.037],[side*topW-hinge,roof-.089,topFront-front+.045],.024,.029);
    }
    if(!van)pane(glass,0x536a78,[side*(w-.055),belt+.012,post+.042],[side*topW,roof-.09,post+.11],
      [side*topW,roof-.09,topRear-.032],[side*(w-.061),belt+.012,cabinEnd-.065]);
  }
  // Narrow the ends of the deck and roll the bonnet down to the headlamps.
  function deck(a,b,rear){
    const zs=[a,...slices.filter(z=>z>a && z<b),b];
    skin(body,paint,zs.map(z=>{
      const span=width(z)-.065,H=level(z),crown=(van?.065:.052)*(rear?.75:1);
      return [-1,-.83,-.56,0,.56,.83,1].map(f=>[span*f,H+crown*(1-f*f)+.012*(Math.abs(f)===.83),z]);
    }));
  }
  deck(nose,front,false);deck(cabinEnd,tail,true);
  for(const side of [-1,1]){
    const line=[nose+.15,nose+.37,(nose+front)*.5,front-.07].map(z=>{
      const u=smooth(z,nose,front),f=.74-.16*u,span=width(z)-.065;
      return [side*span*f,level(z)+(van?.065:.052)*(1-f*f)+.007,z];
    });
    run(body,van?0xbbbaaa:0x46585d,line,.009);
  }
  for(const z of [nose,tail]){
    const rows=sideRow(1,z),out=z===nose?-1:1;
    const depth=[.01,.035,.055,.058,.043,0], crown=van?.065:z===tail?.039:.052;
    skin(body,paint,rows.map(([x,y],i)=>[-1,-.83,-.56,0,.56,.83,1].map(f=>
      [f*x,y+(1-f*f)*(i===5?crown:0)+(i===5 && Math.abs(f)===.83?.012:0),z+out*depth[i]*(1-f*f)])));
  }
  box(body,rubber,0,bottom+.077,(tail+nose)*.5,(w-.19)*2,.10,tail-nose-.27);
  // Shaped lower intake, two body-coloured bumper cheeks, and inset plate.
  const grille=van?.55:hatch?.49:.59;
  // Every intake and rib follows the bumper's changing depth across its face.
  function fasciaPoint(x,y){
    const mid=width(nose)-.016;
    return [x,y,nose-.058*(1-(x/mid)**2)-.003];
  }
  function fasciaLine(width,y){
    return [-1,-.75,-.40,0,.40,.75,1].map(f=>fasciaPoint(f*width,y));
  }
  skin(body,0x202a30,[fasciaLine(grille*.77,.438),fasciaLine(grille*.88,.484),fasciaLine(grille,.594)]);
  for(const y of [.463,.501,.538,.573]){
    const width=grille*mix(.76,.96,(y-.438)/.156);
    run(body,0x53616a,fasciaLine(width,y).map(([x,y,z])=>[x,y,z-.006]),.011,.010);
  }
  box(body,0x222b30,0,.592,nose-.065,.316,.111,.017);
  box(body,0xc9c9bc,0,.592,nose-.076,.283,.083,.006);
  box(body,0x293138,0,.615,tail+.049,.314,.12,.021);
  const signals=[];
  box(body,0xd2cfb8,0,.615,tail+.064,.28,.083,.010);
  for(const side of [-1,1]){
    const x=side*(w-.10);
    const lampY=level(nose)-.071;
    // Swept pockets wrap from the front fascia onto the fenders, with a clear
    // reflector, amber corner and a thin daylight-running strip.
    const faceW=width(nose),corner=side*(faceW-.026);
    const frontZ=(x)=>nose-.063*(1-(x/faceW)**2)-.006;
    const ix=side*faceW*.42,mid=side*faceW*.78;
    const a=[ix,lampY-.061,frontZ(ix)],b=[ix,lampY+.027,frontZ(ix)];
    const innerBend=[mid,lampY+.031,frontZ(mid)],lowerBend=[mid,lampY-.056,frontZ(mid)];
    const topEdge=[corner,lampY+.027,nose-.008],baseEdge=[corner,lampY-.047,nose-.005];
    const z=nose+.19,c=[side*(width(z)-.013),level(z)-.062,z],d=[side*(width(z)+.003),level(z)-.121,z-.012];
    pane(body,0x4d5b64,a,b,innerBend,lowerBend);pane(body,0x526069,lowerBend,innerBend,topEdge,baseEdge);
    pane(body,0x606c73,baseEdge,topEdge,c,d);
    const projector=side*faceW*.60;
    body.add(roller,0x929fa3,projector,lampY-.012,frontZ(projector)-.007,.040,.014,.040,Math.PI/2);
    body.add(roller,0xcdd1c8,projector,lampY-.012,frontZ(projector)-.014,.026,.013,.026,Math.PI/2);
    run(body,0xcbd7d6,[b,innerBend,topEdge,c],.017);
    run(body,0xb97e4c,[d,[c[0],c[1]-.018,c[2]]],.021);
    const pocket=side*(w-.23);
    pane(body,0x344148,fasciaPoint(pocket-side*.09,.444),fasciaPoint(pocket-side*.06,.532),
      fasciaPoint(pocket+side*.068,.516),fasciaPoint(pocket+side*.064,.446));
    run(body,0x839297,[fasciaPoint(pocket-side*.033,.456),fasciaPoint(pocket+side*.052,.461)],.012);
    const rearY=level(tail)-.076,rw=width(tail),rx=side*rw*.49,outerX=side*(rw-.029);
    const rearA=[rx,rearY-.045,tail+.058],rearB=[rx,rearY+.044,tail+.058];
    const rearC=[outerX,rearY+.040,tail+.008],rearD=[outerX,rearY-.046,tail+.012];
    const rearZ=tail-.19,q=[side*(width(rearZ)-.012),level(rearZ)-.068,rearZ],r=[side*width(rearZ),level(rearZ)-.14,rearZ];
    pane(body,0x72282b,rearA,rearB,rearC,rearD);pane(body,0x802d30,rearD,rearC,q,r);
    run(body,0xc05a50,[rearB,rearC,q],.019);
    const indicator=new Batch();
    run(indicator,0xffa415,[[mid,lampY+.025,frontZ(mid)-.015],[corner,lampY+.024,nose-.022],c],.045);
    run(indicator,0xffa415,[[rx,rearY+.049,tail+.070],[outerX,rearY+.048,tail+.021],q],.045);
    const mesh=indicator.mesh(chassis,materials.lights,false);
    mesh.name=side<0?'Left turn signal':'Right turn signal';mesh.visible=false;signals.push(mesh);
    run(lamps,0xff554d,[rearA,rearD,r],.032);
    body.beam(0x41494d,[side*(w-.20),.41,tail-.024],[side*(w-.34),.405,tail+.032],.046,.063);
  }
  // A transverse crown and a raked windscreen give each roof a continuous drip rail.
  const roofStations=[[topFront-.035,topW-.063,roof-.072],[topFront+.075,topW,roof-.042],
    [topFront+(topRear-topFront)*.38,topW+.014,roof-.019],[topRear-.14,topW,roof-.033],[topRear+.042,topW-.044,roof-.072]];
  skin(body,paint,roofStations.map(([z,width,y])=>[-1,-.88,-.54,0,.54,.88,1].map(f=>[width*f,y+.049*(1-f*f),z])));
  for(const side of [-1,1])run(body,van?paint:alloy,roofStations.map(([z,width,y])=>[width*side,y-.006,z]),.022,.030);
  // Compound windscreen and its bonded ceramic perimeter; central glass bows forward.
  const frontGlassPoints=[],upper=[],lower=[];
  for(const f of [-1,-.68,-.30,0,.30,.68,1]){
    const u=Math.abs(f),bottomPoint=[f*(w-.066),belt+.012+.026*(1-u*u),front-.053*(1-u*u)];
    const topPoint=[f*(topW-.026),roof-.086+.043*(1-u*u),topFront-.017*(1-u*u)];
    lower.push(bottomPoint);upper.push(topPoint);frontGlassPoints.push([bottomPoint,topPoint]);
  }
  skin(glass,0x718997,frontGlassPoints);
  run(body,0x333c40,lower,.030,.030);run(body,0x333c40,upper,.021);
  for(const x of [-.40,.20]){
    body.beam(rubber,[x,belt+.065,front-.017],[x+.30,belt+.099,front+.016],.014,.018);
  }
  if(van){
    pane(body,0x53565a,[-w+.09,belt,.256],[w-.09,belt,.256],[topW-.03,roof-.099,.256],[-topW+.03,roof-.099,.256]);
    // Raised cargo flanks curve inward across the roof and carry a recessed
    // sliding-door panel, steel rail, rear-door shutline and loading step.
    const zs=[.25,.34,1.55,1.84,2.06,cabinEnd];
    for(const side of [-1,1]){
      skin(body,paint,zs.map(z=>{
        const end=smooth(z,1.91,cabinEnd),span=w-.045-end*.050;
        return [[side*(w-.069),belt,z],[side*span,belt+.065,z],[side*(span+.014),1.64,z],
          [side*(span-.008),roof-.15,z],[side*(topW-.02),roof-.072-end*.070,z]];
      }));
      const x=side*(w-.024);
      run(body,0x89908b,[[x,1.10,.38],[x,1.81,.38],[x,1.87,.45],[x,1.86,1.55],[x,1.78,1.66],[x,1.10,1.66]],.016);
      box(body,0x555f64,side*(w-.013),1.13,.99,.017,.024,1.34);
      box(body,0x39726e,x,1.36,1.11,.021,.050,1.40);
      box(body,0xb28450,x,1.312,1.11,.023,.018,1.40);
      box(body,trim,x,1.04,.48,.025,.068,.117);
      const zx=cabinEnd+.009;
      pane(body,paint,[side*.012,.93,zx],[side*(w-.10),.93,zx],[side*(w-.11),1.84,zx],[side*.012,1.89,zx]);
      pane(glass,0x29404e,[side*.075,1.39,zx+.012],[side*(w-.158),1.39,zx+.012],[side*(w-.171),1.82,zx+.012],[side*.075,1.84,zx+.012]);
      box(body,trim,side*.116,1.20,zx+.02,.105,.032,.026);
    }
    box(body,rubber,0,.39,tail+.075,1.55,.115,.17);
  }else{
    pane(glass,0x54717f,[-topW+.025,roof-.082,topRear],[topW-.025,roof-.082,topRear],
      [w-.061,belt+.022,cabinEnd],[-w+.061,belt+.022,cabinEnd]);
    if(hatch){
      box(body,paint,0,roof-.09,topRear+.08,topW*1.86,.059,.17);
      box(body,0x9d3631,0,roof-.109,topRear+.17,.32,.020,.017);
    }
  }
  box(body,trim,0,.61,.04,1.32,.14,2.01);
  for(const side of [-1,1])for(const z of (van?[-.28]:[-.28,.62])){
    const x=side*.42,cloth=van?0x4b5157:0x444b52;
    body.add(seatPad,cloth,x,.63+lift,z,.249,.093,.245);
    body.add(seatPad,cloth,x,.83+lift,z+.19,.229,.22,.13,-.11);
    for(const edge of [-1,1])body.add(seatPad,0x545b60,x+edge*.17,.83+lift,z+.12,.058,.19,.076,-.12);
    body.add(seatPad,cloth,x,1.096+lift,z+.218,.14,.105,.089,-.10);
  }
  box(body,trim,0,.91,front+.125,w*1.72,.11,.35);
  box(body,0x23292d,-.41,.965,front+.19,.38,.087,.14);
  box(body,0x53666e,-.41,.97,front+.269,.235,.053,.01);
  box(body,0x606c6f,0,.905,front+.314,.21,.069,.016);
  box(body,trim,0,.715,-.24,.24,.15,.65);
  body.add(ring,rubber,-.43,1.05+lift,-.65,1,1,1,-.42);
  for(const x of [-.52,-.34])body.beam(trim,[-.43,1.027+lift,-.65],[x,1.064+lift,-.65],.022);
  const beacon=patrol && markPatrolSedan(chassis,door,body,box);
  const sheet=body.mesh(chassis,materials.paint,false);leaf.mesh(door,materials.paint,false);glass.mesh(chassis,materials.glass,false);
  const brake=lamps.mesh(chassis,materials.lights,false);
  const wheelGeometry=wheelModel(Batch,tire,halfTread,van),wheels=[];
  for(const [x,z] of wheelsFor({model:type})){
    const finish=materials.wheel.clone(),patch=tireContactPatch(finish,tire);
    const wheel=new THREE.Mesh(wheelGeometry,finish);
    wheel.position.set(x,tire,z);wheel.rotation.order='YXZ';
    wheel.scale.x=Math.sign(x);root.add(wheel);wheels.push({wheel,patch});
  }
  const shadow=new THREE.Mesh(materials.shadowGeometry,materials.shadow);
  shadow.scale.set(w*1.37,(tail-nose)*.62,1);shadow.rotation.x=-Math.PI/2;shadow.position.y=.021;root.add(shadow);
  return {root,chassis,door,brake,signals,wheels,tire,beacon,fittings:damagedFittings([sheet,brake,...signals],nose,tail,w),wreckFinish:roadWreckFinish(chassis)};
}
export function cityTrafficView(scene,Batch,shadowMap,panorama){
  const paint=new THREE.MeshPhongMaterial({vertexColors:true,shininess:92,specular:0x6f777f,side:THREE.DoubleSide});
  if(panorama)paint.onBeforeCompile=shader=>{
    shader.uniforms.bodySky={value:panorama};
    shader.uniforms.fleetPaint={value:Object.values(fleet).map(({paint})=>new THREE.Color(paint))};
    shader.fragmentShader='uniform sampler2D bodySky; uniform vec3 fleetPaint[3];\n'+shader.fragmentShader.replace('#include <specularmap_fragment>',`
      #include <specularmap_fragment>
      float painted=1.-step(.006,min(distance(vColor,fleetPaint[0]),min(distance(vColor,fleetPaint[1]),distance(vColor,fleetPaint[2]))));
      specularStrength*=mix(.12,1.,max(painted,smoothstep(.23,.56,max(vColor.r,max(vColor.g,vColor.b)))));
    `).replace('#include <opaque_fragment>',`
      float paintDistance=min(distance(vColor,fleetPaint[0]),min(distance(vColor,fleetPaint[1]),distance(vColor,fleetPaint[2])));
      if(paintDistance<.006){
        vec3 eye=normalize(vViewPosition), ray=inverseTransformDirection(reflect(-eye,normal),viewMatrix);
        vec2 skyUV=vec2(atan(ray.x,-ray.z)*.46+.17,clamp((asin(clamp(ray.y,-1.,1.))+.44)/.98,0.,1.));
        float edge=pow(1.-clamp(dot(normal,eye),0.,1.),2.);
        float horizon=exp(-pow((ray.y-.09)*5.5,2.));
        outgoingLight+=texture2D(bodySky,skyUV).rgb*(.028+.14*edge+.095*horizon);
      }
      #include <opaque_fragment>`);
  };
  const materials={
    paint,
    wheel:new THREE.MeshPhongMaterial({vertexColors:true,shininess:32,specular:0x52585b,side:THREE.DoubleSide}),
    glass:panorama ? alpineGlass(panorama,{transparent:true,opacity:.64,depthWrite:false,side:THREE.DoubleSide}) :
      new THREE.MeshPhongMaterial({vertexColors:true,transparent:true,opacity:.64,depthWrite:false,side:THREE.DoubleSide,shininess:100}),
    lights:new THREE.MeshBasicMaterial({vertexColors:true}),
    shadowGeometry:new THREE.PlaneGeometry(2,2),
    shadow:new THREE.MeshBasicMaterial({map:shadowMap,color:0x1c2d31,opacity:.68,transparent:true,depthWrite:false}),
  };
  const views=new Map();
  // Reuse a bounded set of meshes across dispatches; serial officer IDs are ephemeral.
  const patrolViews=[];
  return (cars,dt,local,patrolCars=[])=>{
    for(const view of patrolViews)if(view)view.root.visible=false;
    let slot=0;
    for(const car of patrolCars.length?[...cars,...patrolCars]:cars){
      const index=car.patrol?slot++:-1;
      let view=car.patrol?patrolViews[index]:views.get(car.id);
      if(Math.hypot(car.x-local.x,car.z-local.z)>185){
        if(view)view.root.visible=false;
        continue;
      }
      if(!view){
        view=model(Batch,car.model,materials,car.patrol);
        if(car.patrol)patrolViews[index]=view;else views.set(car.id,view);
        view.idle=roadEngineIdle(car.model,car.id);
        view.root.name='Traffic '+car.id;scene.add(view.root);
      }
      const {root,chassis,wheels,door,brake}=view;
      root.scale.y=crushedScale(car);root.visible=root.scale.y>0;root.position.set(car.x,car.y,car.z);root.rotation.y=-car.yaw;
      if(view.beacon)view.beacon(car,performance.now()*.001);
      const sag=view.wreckFinish(car);view.fittings(car);
      chassis.rotation.set((car.suspension?.pitch??0)-.10*sag,0,(car.suspension?.roll??0)-.12*sag);
      chassis.position.y=(car.suspension?.heave??0)-.17*sag;
      view.idle(chassis,car,dt);
      for(const [i,{wheel,patch}] of wheels.entries()){
        const drop=isFlat(car,i)?flatWheelDrop:0;
        wheel.rotation.x-=car.speed*dt/view.tire;
        wheel.rotation.y=wheel.position.z<0?-frontWheelAngle(car):0;
        wheel.position.y=view.tire+(car.suspension?.wheels[i]??-drop);
        patch.value.set(drop,Math.cos(wheel.rotation.x),Math.sin(wheel.rotation.x));
      }
      const t=car.takeover?.progress??car.boarding?.progress??0;
      door.rotation.y=boardingDoorAngle(t);
      view.signals.forEach((lamp,i)=>{lamp.visible=!!car.npcDriver && car.blink && car.turnSignal===(i?1:-1);});
      brake.visible=!car.wrecked && (!!car.takeover || (car.npcDriver!=null && (car.braking || Math.abs(car.speed)<1)));
    }
  };
}

// The server owns both participants and the progress. A late observer sees
// the corresponding instant of the same door, reach, extraction and entry.
export function poseTakeover(avatar,car,id){
  const action=car.takeover,t=action.progress;
  if(id===action.playerId){poseRoadBoarding(avatar,car,action);return;}
  const seat=mountPosition(car,roadCabin(car).seat);
  const exit=smooth(t,.18,.76),inSeat=1-exit,stumble=Math.sin(Math.PI*exit);
  const {root,body,spine,limbs}=avatar;
  avatar.gait=null;
  root.scale.setScalar(mix(1,.91,inSeat));
  if(avatar.civilian){root.scale.x*=avatar.civilian.width;root.scale.y*=avatar.civilian.height;}
  root.position.set(mix(seat.x,action.endX,exit),mix(seat.y,car.y,exit)+.20*stumble,mix(seat.z,action.endZ,exit));
  root.rotation.set(.12*stumble,-car.yaw-.96*exit,.69*stumble,'YXZ');
  body.position.set(0,-.18*stumble,0);spine.rotation.set(-.21*stumble,.20*stumble,0);
  for(const {arm,forearm,knee,leg,ankle,side} of limbs){
    arm.rotation.set(.96*inSeat+.67*stumble,0,side*.42*stumble);
    forearm.rotation.set(.22+.28*inSeat,0,0);
    leg.rotation.set(1.36*inSeat+.35*side*stumble,0,side*.10*stumble);
    knee.rotation.set(-1.30*inSeat-.34*stumble,0,0);ankle.rotation.set(0,0,0);
  }
  for(const tool of avatar.tools)tool.visible=false;
}
