import * as THREE from 'three';

const cloth=0x36465f,trousers=0x242e3c,leather=0x27292c,stitch=0x4d5052,brass=0xc4a773;
const ball=new THREE.SphereGeometry(1,14,10),box=new THREE.BoxGeometry();
const taper=new THREE.CylinderGeometry(1,.91,1,18);
const faces=[
  [0xc3977c,0x3e302a,'bun'],[0x855f4e,0x302a28,'crop'],[0xba8a71,0x322826,'crop'],
  [0xb78468,0x382b28,'bun'],[0xc39583,0x736b63,'crop'],[0xb28067,0x322b2a,'bun'],
];
export function patrolProfile(id){
  const index=Number(id.split('-').at(-1))||0,face=index%faces.length;
  const [skin,hair,cut]=faces[face];
  return {face,skin,hair,cut,officer:true,top:cloth,pants:trousers,bottom:'slacks',shirt:'uniform'};
}
// These are sewn into the same batches as the head, torso, arms and hips.
// No separate draw calls are needed for cap hardware, shoulder flashes or belt kit.
export function patrolCap(b){
  b.add(taper,0x263344,0,.218,.011,.112,.046,.109,.035);
  b.add(ball,cloth,0,.248,.005,.124,.051,.117,-.10);
  b.add(ball,leather,0,.207,-.091,.099,.010,.080,-.10);
  b.beam(brass,[-.067,.214,-.095],[0,.216,-.106],.005,.005);
  b.beam(brass,[0,.216,-.106],[.067,.214,-.095],.005,.005);
  b.add(ball,brass,0,.239,-.108,.019,.025,.005,-.14);
  b.add(ball,0x776149,0,.240,-.114,.009,.012,.002);
}
export function patrolBelt(b){
  b.add(taper,leather,0,1.014,0,.187,.052,.134);
  b.add(box,brass,0,1.013,-.133,.054,.032,.010);
  b.add(box,leather,0,1.013,-.140,.039,.022,.006);
  for(const side of [-1,1]){
    b.add(box,0x343a40,side*.155,.983,-.064,.057,.095,.058,0,side*.4,side*.04);
    b.add(box,stitch,side*.157,1.008,-.074,.059,.026,.059,0,side*.4);
    b.add(ball,leather,side*.114,.973,.100,.057,.067,.043);
  }
  b.add(box,0x373c3e,-.177,1.014,.020,.047,.118,.051,0,-.10,-.04);
  b.beam(0x303638,[-.182,1.063,.038],[-.192,1.133,.044],.010);
}
export function patrolShoulder(b,side){
  b.add(ball,0xbca477,side*.075,-.087,.002,.010,.040,.032,0,0,side*.08);
  b.add(ball,0x25374a,side*.083,-.087,.002,.005,.034,.026);
  b.add(ball,brass,side*.088,-.084,.001,.002,.016,.012);
}
export function patrolShirtTrim(b){
  for(const side of [-1,1]){
    b.beam(0x304054,[side*.043,1.481,-.071],[side*.068,1.423,-.129],.033,.013);
    b.beam(0x425571,[side*.094,1.471,.005],[side*.182,1.448,.004],.032,.010);
  }
  // Relief keeps the shield and name plate readable when the shirt is in shade.
  b.add(ball,brass,.092,1.364,-.129,.022,.027,.007,.08,-.36,-.05);
  b.add(ball,0x927648,.092,1.365,-.136,.013,.016,.003,.08,-.36);
  b.add(box,brass,-.077,1.348,-.142,.043,.008,.006,.08,.24);
  b.add(box,0x252c30,-.094,1.392,-.130,.041,.055,.026,.13,-.18);
  b.add(box,0x485256,-.095,1.402,-.147,.027,.014,.005,.13,-.18);
}
