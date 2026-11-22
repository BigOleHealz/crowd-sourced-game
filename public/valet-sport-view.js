import * as THREE from 'three';
import {civilianProfiles} from './civilian-fleet.js';
import {roadCabin} from './road-cabin.js';

export const valetPaints={falco:0xa4c91c,veloce:0xce2337};

const carbon=0x1c2227, black=0x12181c, bright=0xd7eaff, metal=0xb1aeb0;
const sides=[-1,1], lens=new THREE.CylinderGeometry(1,1,1,24);
const rounded=new THREE.SphereGeometry(1,14,9), ring=new THREE.TorusGeometry(1,.18,8,24);
const interpolate=THREE.MathUtils.lerp;

const bodies={
  falco:{
    sections:[[-2.28,.73,.34,.40],[-2.11,.86,.39,.47],[-1.80,.96,.49,.61],
      [-1.47,1.01,.53,.77],[-1.11,.96,.60,.67],[-.73,.92,.665,.66],
      [-.15,.91,.656,.62],[.43,.955,.675,.66],[.91,1.00,.69,.74],
      [1.48,1.02,.75,.814],[1.96,.99,.733,.75],[2.20,.92,.663,.685],[2.28,.84,.607,.626]],
    canopy:[[-.99,.70,.669],[-.47,.581,1.079],[-.25,.555,1.12],[.35,.55,1.105],
      [.61,.58,.989],[1.00,.69,.715]],
  },
  veloce:{
    sections:[[-2.27,.62,.375,.413],[-2.12,.80,.405,.50],[-1.87,.91,.47,.62],
      [-1.37,.983,.565,.793],[-1.08,.953,.595,.68],[-.70,.912,.653,.629],
      [-.14,.894,.673,.621],[.44,.929,.693,.65],[.89,.974,.72,.746],
      [1.39,.99,.733,.817],[1.79,.978,.714,.794],[2.05,.907,.672,.717],[2.25,.78,.617,.632]],
    canopy:[[-.97,.698,.693],[-.59,.68,.943],[-.32,.60,1.151],[-.08,.566,1.19],
      [.30,.551,1.168],[.60,.588,1.052],[.86,.652,.908],[1.15,.697,.752]],
  },
};

function dimensions(stations,z,faceted){
  const i=stations.findIndex((p,i)=>i>0 && z<=p[0]);
  if(i===-1)return stations.at(-1).slice(1);
  const a=stations[i-1],b=stations[i],t=THREE.MathUtils.clamp((z-a[0])/(b[0]-a[0]),0,1);
  if(faceted)return a.slice(1).map((v,k)=>interpolate(v,b[k+1],t));
  const before=stations[Math.max(0,i-2)],after=stations[Math.min(stations.length-1,i+1)];
  return a.slice(1).map((v,k)=>{
    const n=k+1,w=b[n],p=before[n],q=after[n];
    const curve=v+.5*t*((w-p)+t*(2*p-5*v+4*w-q+t*(3*v-p-3*w+q)));
    return THREE.MathUtils.clamp(curve,Math.min(v,w),Math.max(v,w));
  });
}

export function valetSportBody(Batch,type,{skin,pane,run,box}){
  const wedge=type==='falco', paint=valetPaints[type], accent=wedge?0xd5e59b:0xf5aa81;
  const {nose,tail,axles,tire,bodyWidth:w}=civilianProfiles[type];
  const {sections,canopy}=bodies[type];
  const {hinge:[pivot,front],wheel:[wheelX,wheelY,wheelZ],handle}=roadCabin({model:type});
  const rear=wedge?.64:.70, arch=tire+.054;
  const root=new THREE.Group(),chassis=new THREE.Group(),door=new THREE.Group();
  root.add(chassis);chassis.add(door);door.name='Driver door';door.position.set(pivot,0,front);
  const body=new Batch(),leaf=new Batch(),glass=new Batch(),doorGlass=new Batch(),head=new Batch(),lamps=new Batch();
  const stations=sections.map(p=>p[0]);
  for(let z=nose+.065;z<tail;z+=.065)stations.push(z);
  for(const axle of axles)for(let i=0;i<=20;i++)stations.push(axle-arch*Math.cos(i*Math.PI/20));
  const all=[...new Set(stations)].sort((a,b)=>a-b);
  const span=(a,b)=>[a,...all.filter(z=>z>a && z<b),b];
  const dims=z=>dimensions(sections,z,wedge);
  const shoulderAt=z=>{
    const [width,deck,raise]=dims(z), distance=Math.min(...axles.map(x=>Math.abs(x-z)));
    const well=distance>=arch?0:tire+Math.sqrt(arch*arch-distance*distance);
    return [width,deck,Math.max(raise,well+.057),Math.max(.17,well)];
  };
  const factors=[-1,-.94,-.82,-.63,-.39,0,.39,.63,.82,.94,1];
  const hood=(z,f)=>{
    const [width,deck,shoulder]=shoulderAt(z),u=Math.abs(f);
    return [f*width,interpolate(deck,shoulder,wedge?Math.max(0,(u-.39)/.61):u**2.85),z];
  };
  skin(body,paint,all.map(z=>factors.map(f=>hood(z,f))));
  const sideRow=(s,z,map)=>{
    const [width,,shoulder,bottom]=shoulderAt(z);
    return [[s*width,shoulder,z],[s*(width+.008),Math.max(bottom+.023,shoulder-(wedge?.104:.069)),z],
      [s*(width-.018),Math.max(bottom+.013,shoulder-.245),z],[s*(width-.086),bottom,z]].map(map);
  };
  for(const s of sides){
    const mirrored=arr=>arr.map(([x,y,z])=>[s*x,y,z]);
    const moving=([x,y,z])=>[x-pivot,y,z-front];
    for(const [a,b,isDoor] of [[nose,front,false],[front+.012,rear-.01,true],[rear,tail,false]]){
      const hinged=s<0&&isDoor;
      skin(hinged?leaf:body,paint,span(a,b).map(z=>sideRow(s,z,hinged?moving:p=>p)));
    }
    for(const axle of axles){
      const rows=[];
      for(let i=0;i<=22;i++){
        const angle=i*Math.PI/22,z=axle-arch*Math.cos(angle),y=tire+arch*Math.sin(angle);
        const [width]=dims(z),outer=width-.085,inner=width-.22;
        const outerY=Math.min(y,hood(z,outer/width)[1]-.012);
        const innerY=Math.min(y-.027,hood(z,inner/width)[1]-.018);
        rows.push([[s*outer,outerY,z],[s*inner,innerY,z]]);
      }
      skin(body,carbon,rows);
    }
    const topEdge=canopy.map(([z,x,y])=>[s*x,y-.027,z]);
    const sill=canopy.map(([z],i)=>[s*(.74-.013*Math.sin(Math.PI*i/(canopy.length-1))),dims(z)[1]+.022,z]);
    for(let i=1;i<canopy.length;i++){
      const useDoor=s<0 && canopy[i-1][0]>=front && canopy[i][0]<=rear;
      pane(useDoor?doorGlass:glass,wedge?0x536e80:0x637a82,
        ...[sill[i-1],sill[i],topEdge[i],topEdge[i-1]].map(useDoor?moving:p=>p));
    }
    run(body,wedge?carbon:paint,topEdge,.046);
    const [handleX,handleY,handleZ]=handle;
    const grip=s<0?leaf:body;
    const localGrip=s<0?moving([handleX+.014,handleY,handleZ]):[-handleX-.014,handleY,handleZ];
    box(grip,carbon,...localGrip,.030,.027,.119);
    const mirrorZ=front+.145,mirrorY=.80,mirrorX=s*(w-.027);
    body.beam(carbon,[s*.76,mirrorY-.06,mirrorZ],[mirrorX,mirrorY,mirrorZ+.028],.039);
    body.add(rounded,paint,mirrorX+s*.046,mirrorY+.022,mirrorZ+.019,.102,.043,.087);
    body.add(rounded,0x8ba1a6,mirrorX+s*.046,mirrorY+.018,mirrorZ+.083,.076,.030,.019);

    const onDeck=(f,z,above)=>{
      const [x,y]=hood(z,f);return [s*x,y+above,z];
    };
    if(wedge){
      pane(body,black,onDeck(.49,-2.20,.015),onDeck(.91,-2.13,.014),
        onDeck(.86,-1.91,.014),onDeck(.65,-2.00,.016));
      const fork=onDeck(.71,-2.07,.024);
      for(const end of [[.52,-2.176],[.864,-2.12],[.82,-1.967]])
        head.beam(bright,fork,onDeck(...end,.026),.022,.013);
      pane(body,black,...mirrored([[.15,.27,nose-.007],[.68,.22,nose-.008],[.68,.329,nose-.007],[.18,.344,nose-.007]]));
      const scoop=mirrored([[.90,.275,.62],[.99,.35,.98],[.957,.63,.864],[.928,.57,.57]]);
      pane(body,black,...scoop);
      run(body,accent,[scoop[3],scoop[2],scoop[1]],.015);
      run(body,carbon,mirrored([[.806,.174,-2.10],[.977,.13,-1.85],[1.018,.145,-.92],[1.035,.16,.98],[.969,.19,1.98]]),.065,.046);
      run(head,0x8b2330,mirrored([[.29,.557,tail+.012],[.57,.557,tail+.012],[.76,.594,tail+.012]]),.037,.027);
      run(lamps,0xff4131,mirrored([[.29,.565,tail+.029],[.57,.565,tail+.029],[.76,.598,tail+.029]]),.028,.017);
      run(lamps,0xff4131,mirrored([[.57,.565,tail+.029],[.65,.522,tail+.029]]),.021);
      body.beam(carbon,[s*.47,.72,1.85],[s*.57,1.035,2.03],.077,.091);
      box(body,carbon,s*.86,1.052,2.015,.036,.116,.36,-.14);
    }else{
      const lamp=[onDeck(.50,-2.235,.017),onDeck(.84,-2.086,.014),onDeck(.91,-1.657,.018),onDeck(.75,-1.958,.018)];
      pane(body,black,...lamp);
      run(head,bright,[onDeck(.53,-2.221,.031),onDeck(.815,-2.063,.028),onDeck(.887,-1.719,.032)],.021,.014);
      for(const t of [.26,.50,.72]){
        const at=onDeck(.76+.115*t,-2.118+.42*t,.033);
        head.add(rounded,0xb0c7d1,...at,.028,.012,.024);
      }
      pane(body,black,...mirrored([[.27,.235,nose-.012],[.61,.235,nose-.012],[.595,.344,nose-.012],[.33,.335,nose-.012]]));
      pane(body,black,...mirrored([[.889,.469,.55],[.971,.502,.95],[.982,.643,.93],[.929,.604,.68]]));
      run(body,metal,mirrored([[.893,.478,.576],[.951,.5,.817],[.975,.535,.945]]),.014);
      const rearFace=tail+.018;
      for(const [x,y,r] of [[.46,.535,.10],[.65,.53,.081]]){
        body.add(lens,carbon,s*x,y,rearFace,r*1.17,.043,r*1.17,Math.PI/2);
        head.add(lens,0x692c35,s*x,y,rearFace+.024,r,.022,r,Math.PI/2);
        lamps.add(ring,0xff4a45,s*x,y,rearFace+.043,r,r,r);
      }
      run(body,carbon,mirrored([[.54,.166,nose-.024],[.77,.167,-2.15],[.918,.204,-1.97]]),.059,.071);
    }
  }
  for(const end of [nose,tail]){
    const lower=factors.map(f=>[f*dims(end)[0]*.92,.176,end]);
    skin(body,paint,[lower,factors.map(f=>hood(end,f))]);
  }
  for(let i=1;i<canopy.length;i++){
    const [z0,w0,y0]=canopy[i-1],[z1,w1,y1]=canopy[i];
    const roof=wedge?i===2 || i===3:i===3 || i===4;
    skin(roof?body:glass,roof?(wedge?carbon:paint):0x5c7682,
      [[[-w0,y0-.022,z0],[0,y0,z0],[w0,y0-.022,z0]],[[-w1,y1-.022,z1],[0,y1,z1],[w1,y1-.022,z1]]]);
  }
  box(body,carbon,0,.305,0,1.52,.15,2.78);
  for(const s of sides){
    body.add(rounded,0x393539,s*.387,.49,-.105,.228,.08,.26);
    body.add(rounded,0x393539,s*.387,.643,.125,.192,.187,.112,-.18);
    body.add(rounded,0x4d474a,s*.387,.839,.158,.105,.087,.068,-.18);
  }
  body.add(ring,black,wheelX,wheelY,wheelZ,.143,.143,.143,-.40);
  box(body,carbon,0,.694,-.55,1.35,.09,.17);
  const rearZ=tail+.021;
  box(body,carbon,0,.268,rearZ,1.38,.182,.069);
  box(body,0xd9d1bd,0,.398,rearZ+.012,.288,.092,.017);
  for(const x of (wedge?[-.265,.265]:[-.163,0,.163])){
    body.add(lens,metal,x,.293,rearZ+.035,.069,.069,.069,Math.PI/2);
    body.add(lens,black,x,.293,rearZ+.072,.051,.012,.051,Math.PI/2);
  }
  for(const x of [-.67,-.49,.49,.67])box(body,carbon,x,.195,tail-.03,.044,.141,.35,-.22);
  if(wedge){
    box(body,carbon,0,1.048,2.03,1.74,.060,.326,-.14);
    for(let i=0;i<6;i++){
      const z=1.13+i*.103;
      box(body,carbon,0,dims(z)[1]+.013,z,1.21-i*.064,.025,.058);
    }
  }else{
    for(const s of sides)run(body,0x6f1a2c,[[s*.48,.714,1.21],[s*.54,.738,1.39],[s*.59,.733,1.62],[s*.56,.706,1.83]],.014);
  }
  box(body,0xeac279,0,hood(nose+.12,0)[1]+.021,nose+.12,.061,.014,.069,.23);
  return {root,chassis,door,body,leaf,glass,doorGlass,lamps,head};
}
