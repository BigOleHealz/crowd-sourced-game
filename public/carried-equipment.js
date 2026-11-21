// Exterior display meshes. The local actor, remote actors and aim camera clone
// the same five templates. Nothing in this module participates in simulation.
import * as THREE from 'three';
import {carriedFinish,equipmentPlate} from './equipment-finish.js';

const metal=0x606b72, edge=0x9ca39e, black=0x242c30, rubber=0x343739;
const clay=0x8c775d, darkEarth=0x686357, walnut=0x91674a;
const shapesByScene=new WeakMap();
const box=new THREE.BoxGeometry(), cylinder=new THREE.CylinderGeometry(1,1,1,14);

function panel(b,color,outline,width,bevel=.004,cutouts=[]){
  const points=outline.map(([z,y])=>new THREE.Vector2(z,y));
  const shape=new THREE.Shape(points);
  for(const hole of cutouts)shape.holes.push(new THREE.Path(hole.map(([z,y])=>new THREE.Vector2(z,y))));
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelSegments:1,bevelThickness:bevel,bevelSize:bevel});
  geometry.rotateY(-Math.PI/2);
  b.add(geometry,color,width/2,0,0);
  geometry.dispose();
}
function axial(b,color,z,y,r,length,x=0){
  b.add(cylinder,color,x,y,z,r,length,r,Math.PI/2);
}
// Open-sided optic trim. The front and back contours leave the actual scene
// visible through the sight, even when it fills the portrait viewport.
function optic(b,color,profile,y,x=0){
  const lathe=new THREE.LatheGeometry(profile.map(([z,r])=>new THREE.Vector2(r,-z)),32);
  b.add(lathe,color,x,y,0,1,1,1,-Math.PI/2);
  lathe.dispose();
}
function guard(b,zBack,zFront,y){
  const far=[0,y-.045,zFront+.012],near=[0,y-.05,zBack];
  b.beam(metal,[0,y,zFront],far,.012);
  b.beam(metal,far,near,.012);
  b.beam(metal,near,[0,y,zBack+.012],.012);
}
function inset(b,side,x,y,z,w,h,shade=black,angle=0){
  b.add(box,shade,side*x,y,z,.004,h,w,angle);
}

function carbine(b){
  // Open stock, separate upper and curved magazine give this prop its profile
  // when seen at multiplayer distances; small contrast bands survive dusk.
  axial(b,metal,.150,.093,.030,.18);
  panel(b,darkEarth,[[.318,.127],[.277,.140],[.122,.132],[.119,.085],[.200,.070],[.270,-.008],[.313,-.012]],.063,.004,
    [[[.267,.075],[.217,.075],[.270,.028]]]);
  panel(b,rubber,[[.318,.130],[.339,.118],[.332,-.031],[.302,-.028]],.073);
  panel(b,black,[[.086,.104],[-.126,.102],[-.155,.071],[-.137,.018],[-.060,.006],[-.040,.031],[.055,.038],[.088,.062]],.064);
  panel(b,metal,[[.094,.106],[.077,.143],[-.184,.144],[-.200,.120],[-.177,.086],[.076,.086]],.071);
  panel(b,darkEarth,[[.052,.042],[.002,.031],[.020,-.022],[.047,-.117],[.101,-.099],[.073,-.012]],.045);
  guard(b,.025,-.061,.028);
  panel(b,0x454b4b,[[-.065,.037],[-.136,.035],[-.142,-.044],[-.184,-.126],[-.160,-.154],[-.112,-.133],[-.073,-.060]],.050);
  panel(b,rubber,[[-.108,-.130],[-.180,-.143],[-.190,-.164],[-.151,-.166]],.058);
  panel(b,clay,[[-.154,.129],[-.188,.148],[-.417,.138],[-.446,.117],[-.436,.070],[-.401,.053],[-.191,.049],[-.156,.071]],.075,.008);
  for(const side of [-1,1]){
    for(let i=0;i<5;i++)inset(b,side,.046,.110,-.205-i*.047,.031,.012,black,-.08);
    for(let i=0;i<4;i++)inset(b,side,.046,.078,-.228-i*.049,.028,.013,0x595448);
    inset(b,side,.036,.113,-.015,.102,.016,black);
    inset(b,side,.041,.115,-.024,.060,.006,edge);
    b.beam(metal,[side*.030,-.012,-.090],[side*.030,-.109,-.129],.006);
    b.beam(metal,[side*.030,-.012,-.114],[side*.030,-.113,-.153],.006);
    equipmentPlate(b,0,side,side*.036,.057,.012,.071,.018);
  }
  axial(b,metal,-.500,.099,.018,.161);
  axial(b,black,-.601,.099,.024,.049);
  axial(b,0x464d51,-.626,.099,.015,.004);
  // Upright silhouette at the nose, with daylight inside its shoulders.
  for(const side of [-1,1]){
    b.beam(black,[side*.018,.112,-.450],[side*.011,.189,-.459],.009);
    b.beam(black,[side*.010,.173,-.459],[side*.018,.112,-.493],.009);
  }
  b.add(box,metal,0,.180,-.458,.024,.008,.014);
  b.add(box,black,0,.188,-.458,.006,.014,.009);
  panel(b,darkEarth,[[-.172,.057],[-.271,.057],[-.261,.037],[-.203,.030],[-.171,.042]],.076,.004);
  b.add(box,black,0,.147,-.150,.048,.013,.49);
  for(let i=0;i<15;i++)b.add(box,metal,0,.157,.067-i*.032,.055,.010,.011);
  // A low rectangular reflex hood with an unobstructed window.
  b.add(box,black,0,.171,-.059,.087,.025,.080);
  for(const side of [-1,1]){
    b.add(box,metal,side*.045,.209,-.058,.008,.067,.058);
    b.beam(edge,[side*.045,.241,-.037],[side*.032,.254,-.037],.008);
  }
  b.add(box,metal,0,.250,-.059,.076,.009,.056);
  // Continuous shoulders join the brow to the two protective side walls.
  for(const side of [-1,1])b.add(box,metal,side*.039,.246,-.059,.016,.010,.056,0,0,side*.55);
  b.add(box,0xef8851,0,.214,-.085,.0027,.0027,.002);
}

function pistol(b){
  const frame=0x474d50, slide=0x718089;
  // Short dust cover and exposed guard leave daylight below the nose. The
  // upswept tail, angled walnut panels and heel remain visible around a glove.
  panel(b,frame,[[.111,.077],[.091,.084],[.061,.077],[-.146,.075],[-.139,.056],[-.080,.055],[-.060,.043],[.004,.045],[.021,.029],[.032,-.022],[.066,-.141],[.110,-.123],[.081,.016],[.076,.047],[.115,.059]],.035,.003);
  panel(b,slide,[[.072,.078],[.068,.103],[.042,.116],[-.156,.114],[-.188,.104],[-.198,.095],[-.197,.078],[-.170,.073],[.051,.072]],.041,.0035);
  panel(b,0x6d4c37,[[.068,.030],[.034,.023],[.039,-.016],[.064,-.119],[.095,-.109],[.086,-.056]],.044,.004);
  panel(b,black,[[.063,-.130],[.105,-.116],[.114,-.127],[.063,-.148],[.055,-.142]],.049,.003);
  b.beam(frame,[0,.054,-.075],[0,.024,-.082],.010);
  b.beam(frame,[0,.024,-.082],[0,-.000,-.065],.010);
  b.beam(frame,[0,-.000,-.065],[0,-.009,.027],.010);
  b.beam(frame,[0,-.009,.027],[0,.018,.034],.009);
  for(const side of [-1,1]){
    for(let i=0;i<5;i++)inset(b,side,.025,.092,.048-i*.009,.003,.017,black,-.24);
    for(let i=0;i<5;i++)inset(b,side,.026,-.024-i*.015,.057+i*.005,.022,.003,0x99785a,-.17);
    equipmentPlate(b,1,side,side*.0255,.092,-.023,.056,.011);
  }
  axial(b,black,-.194,.091,.014,.015);
  b.add(box,black,0,.117,.045,.044,.007,.020);
  for(const side of [-1,1]){
    b.add(box,black,side*.015,.123,.046,.010,.010,.019);
    b.add(box,0xe4dbba,side*.015,.124,.056,.004,.004,.002);
  }
  b.add(box,black,0,.120,-.161,.007,.011,.016);
  b.add(box,0xedb077,0,.122,-.152,.004,.004,.002);
  b.add(box,0x41505a,.025,.092,-.070,.003,.012,.047);
}

function meridian(b){
  const timber=walnut, blued=0x485667, trim=0x879294;
  // A single sweeping warm stock contrasts with the narrow dark forebody and
  // the broad flared glass. This outline reads differently from the carbine.
  panel(b,timber,[[.337,.125],[.297,.142],[.170,.140],[.116,.118],[.048,.081],[-.445,.094],[-.482,.068],[-.410,.043],[-.155,.022],[-.058,.018],[.010,.032],[.025,-.040],[.069,-.074],[.109,-.035],[.143,.030],[.236,.003],[.320,-.029]],.061,.008);
  panel(b,rubber,[[.334,.126],[.354,.118],[.342,-.038],[.317,-.033]],.070);
  panel(b,0x67482e,[[.300,.143],[.268,.164],[.159,.157],[.122,.132],[.211,.116],[.290,.118]],.065);
  axial(b,blued,-.054,.124,.031,.342);
  axial(b,blued,-.449,.120,.021,.52);
  axial(b,metal,-.716,.120,.025,.047);
  axial(b,black,-.741,.120,.016,.005);
  guard(b,.023,-.065,.027);
  for(const side of [-1,1]){
    inset(b,side,.038,.061,-.222,.17,.010,0x72492f,-.025);
    equipmentPlate(b,2,side,side*.037,.083,.188,.069,.018);
  }
  b.beam(blued,[.020,.124,.011],[.056,.088,.038],.013);
  b.add(cylinder,black,.055,.087,.039,.017,.025,.017,0,0,.5);
  for(const z of [-.136,.017])b.add(box,black,0,.166,z,.040,.080,.032);
  const h=.222;
  optic(b,blued,[[.075,.054],[.035,.054],[.010,.043],[-.031,.031],[-.172,.031],[-.228,.047],[-.288,.061],[-.309,.061],[-.309,.053],[-.20,.024],[.01,.026],[.075,.044],[.075,.054]],h);
  optic(b,black,[[.077,.044],[.077,.054],[.057,.056]],h);
  optic(b,trim,[[-.300,.062],[-.312,.062],[-.313,.053]],h);
  for(const z of [-.126,.015])optic(b,metal,[[z+.011,.032],[z+.012,.040],[z-.012,.040],[z-.013,.032]],h);
  b.add(cylinder,black,0,.269,-.075,.022,.034,.022);
  for(const side of [-1,1]){
    b.add(box,black,.019*side,h,-.075,.033,.0014,.001);
    b.add(box,black,0,h+.019*side,-.075,.0014,.033,.001);
  }
  b.add(box,0xf3bb75,0,h,-.075,.0025,.0025,.0015);
}

function launcher(b){
  const olive=0x76806a, bands=0x3e494a;
  axial(b,olive,-.125,.139,.092,.77);
  optic(b,olive,[[-.385,.091],[-.437,.103],[-.510,.105],[-.530,.116]],.139);
  optic(b,bands,[[-.512,.109],[-.532,.119],[-.550,.119],[-.550,.087],[-.530,.084]],.139);
  axial(b,black,-.512,.139,.086,.006);
  optic(b,bands,[[.19,.094],[.225,.103],[.265,.106],[.277,.094]],.139);
  axial(b,0x444e49,.264,.139,.084,.008);
  for(const z of [-.320,.102])axial(b,0x363d39,z,.139,.099,.036);
  axial(b,0xb9a16b,-.366,.139,.093,.024);
  panel(b,0x505a4b,[[.186,.073],[.180,.034],[.112,-.005],[.031,.003],[.007,.064]],.116,.009);
  panel(b,black,[[.069,.031],[-.003,.023],[.016,-.109],[.071,-.095]],.049);
  b.add(box,bands,0,.219,-.068,.049,.035,.255);
  b.beam(bands,[0,.233,.065],[0,.290,.032],.026);
  b.beam(bands,[0,.290,.032],[0,.290,-.156],.028);
  b.beam(bands,[0,.290,-.156],[0,.225,-.188],.026);
  // Offset sight housing with a real open frame for the first-person camera.
  const x=-.136,y=.240;
  b.add(box,bands,-.074,.198,-.073,.126,.031,.125);
  for(const side of [-1,1]){
    b.add(box,metal,x+side*.045,y,-.059,.010,.072,.106);
    b.add(box,bands,x,y+side*.034,-.059,.088,.009,.106);
    equipmentPlate(b,3,side,side*.096,.145,-.125,.130,.029);
  }
  for(const z of [-.461,-.476,-.491])axial(b,0x515a51,z,.139,.107,.006);
}

function ember(b){
  const paint=0xab5738, brass=0xb89a66;
  panel(b,black,[[.078,.060],[.009,.051],[.020,-.109],[.077,-.098]],.055);
  panel(b,paint,[[.123,.046],[.137,.107],[.103,.155],[-.055,.167],[-.232,.132],[-.260,.096],[-.224,.045],[-.085,.025]],.115,.012);
  for(const side of [-1,1]){
    axial(b,0x657176,-.138,.099,.042,.260,side*.066);
    axial(b,brass,-.226,.099,.045,.023,side*.066);
    axial(b,black,-.032,.099,.045,.019,side*.066);
    b.beam(black,[side*.070,.078,.059],[side*.084,-.025,-.030],.019);
    b.beam(black,[side*.084,-.025,-.030],[side*.075,.026,-.175],.019);
  }
  axial(b,metal,-.288,.095,.048,.160);
  optic(b,black,[[-.304,.053],[-.354,.065],[-.427,.079],[-.440,.067]],.095);
  for(const z of [-.344,-.365,-.391])axial(b,0x837a62,z,.095,.063,.008);
  axial(b,0x825237,-.430,.095,.061,.004);
  axial(b,0xe2a65d,-.433,.095,.031,.005);
  b.add(box,black,0,.188,.009,.054,.016,.139);
  for(const z of [.061,-.051])b.add(box,metal,0,.170,z,.036,.036,.023);
}
// In the eye-relief view the scene already uses the scoped camera FOV. Render
// the near eyepiece around that image; the tube and mount belong to the carried view.
export function scopedEyepiece(camera,Batch){
  const b=new Batch(true);
  optic(b,black,[[.012,.073],[.010,.080],[-.008,.081],[-.020,.077],[-.020,.060],[-.012,.060],[.006,.063],[.012,.066],[.012,.073]],0);
  optic(b,metal,[[.012,.072],[.0125,.0735],[.010,.075]],0);
  optic(b,0x667c79,[[.005,.063],[.004,.064],[-.001,.063]],0);
  for(const side of [-1,1]){
    b.add(box,black,side*.040,0,-.014,.041,.0008,.001);
    b.add(box,black,0,side*.040,-.014,.0008,.041,.001);
    b.add(box,metal,side*.009,0,-.014,.017,.00036,.001);
    b.add(box,metal,0,side*.009,-.014,.00036,.017,.001);
  }
  b.add(box,0xe39b67,0,0,-.014,.00082,.00082,.0006);
  const mesh=b.mesh(camera,carriedFinish(),false);
  mesh.name='Meridian eye relief';mesh.position.set(0,0,-.52);mesh.visible=false;
  return mesh;
}

const models=[
  ['Field carbine',carbine],['Patrol sidearm',pistol],['Meridian scoped rifle',meridian],
  ['Heat-seeking launcher',launcher],['Ember projector',ember]
];
export function carriedEquipment(parent,scene,Batch){
  let templates=shapesByScene.get(scene);
  if(!templates){
    templates=models.map(([name,build])=>{
      const batch=new Batch(true);build(batch);
      const mesh=new THREE.Mesh(batch.geometry(),carriedFinish());
      mesh.name=name;mesh.receiveShadow=true;mesh.geometry.userData.sharedFieldKit=true;
      mesh.position.set(.12,1.33,-.20);
      return mesh;
    });
    shapesByScene.set(scene,templates);
  }
  const copies=templates.map(mesh=>mesh.clone());
  parent.add(...copies);
  return copies;
}
