import {fuelStop} from './fire-sites.js';
import {avenues,streets,harbor,streetPlan} from './brickell-map.js';
import {MAP,CITY} from './world.js';
import {roadGarages} from './road-garages.js';
import {churchPath} from './ridge-church.js';

export const destinations=CITY?new Map([
  [fuelStop.name,[fuelStop.x,fuelStop.roadZ]],['Lantern Point Marina',[49,-377]],['Mangle Café',[0,14]],['Biscayne Mutual Bank',[-20,-45]],['Hotel Maravela',[-16,-45]],['Harbor Key Beach',[32,-205]],['Harbor Key Market',[19.1,-205]],['Lantern Point Estates',[-49,-419]],
]):new Map([['Meadow Church',[0,-53]],['Ridge Lookout',[5,-80]],['Creek Lookout',[-4,-24]],['Trailhead',[0,15]]]);

for(const garage of roadGarages)destinations.set(garage.name,[garage.x,garage.z]);

// Use the intersecting road centrelines, with the island links limited to the
// two drivable causeways. A destination may split an existing avenue segment.
const points=new Map(),edges=[];
const key=p=>p.join(',');
const length=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function path(coords){
  for(const [i,p] of coords.entries()){
    const id=key(p);if(!points.has(id))points.set(id,{p,links:new Map()});
    if(!i)continue;
    const a=points.get(key(coords[i-1])),b=points.get(id);
    if(a===b || a.links.has(b))continue;
    const d=length(a.p,b.p);
    edges.push([a,b,d]);a.links.set(b,d);b.links.set(a,d);
  }
}
if(CITY){
  for(const z of streets)path([-71,...avenues,...(z===-45?[-20,-16]:[]),40].sort((a,b)=>a-b).map(x=>[x,z]));
  for(const x of avenues)path([x===0?-60:-55,...streets,...(x===0?[14]:[]),...(x===32?[roadGarages[0].z]:[]),71].sort((a,b)=>a-b).map(z=>[x,z]));
  const outer=[streetPlan.westStreet,0,streetPlan.eastStreet];
  for(const z of [harbor.crossing,streetPlan.northStreet])path((z===harbor.crossing?[...outer,19.1].sort((a,b)=>a-b):[...outer,fuelStop.x].sort((a,b)=>a-b)).map(x=>[x,z]));
  for(const x of outer)path([[x,harbor.crossing],[x,streetPlan.northStreet]]);
  path([[0,-60],[0,harbor.crossing]]);path([[0,streetPlan.northStreet],[0,-370]]);
  for(const z of [-466,-419,-370])path([-49,0,49].map(x=>[x,z]));
  for(const x of [-49,0,49])path([-466,-419,...(x===49?[-377]:[]),-370].map(z=>[x,z]));
  path([[49,-370],destinations.get(roadGarages[1].name)]);
}else{
  path(MAP.trail);path(MAP.northTrail);path(churchPath);
  path([[0,15],[-3,19.5],[-8,20.5],destinations.get(roadGarages[0].name)]);
}

function project(p,a,b){
  const x=b[0]-a[0],z=b[1]-a[1];
  const t=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*z)/(x*x+z*z)));
  return [a[0]+x*t,a[1]+z*t];
}

export function landmarkGuide(name){
  const goal=points.get(key(destinations.get(name)??[]));
  if(!goal)return null;
  const pending=new Set(points.values()),dist=new Map([[goal,0]]),toward=new Map();
  while(pending.size){
    let current,best=Infinity;
    for(const node of pending)if(dist.get(node)<best){current=node;best=dist.get(node);}
    if(!current)break;
    pending.delete(current);
    for(const [neighbor,cost] of current.links)if(best+cost<(dist.get(neighbor)??Infinity)){
      dist.set(neighbor,best+cost);toward.set(neighbor,current);
    }
  }
  return (x,z,yaw)=>{
    const here=[x,z];let chosen,join,nearest=Infinity;
    for(const [a,b] of edges){
      const foot=project(here,a.p,b.p),d=length(here,foot);
      if(d>=nearest)continue;
      chosen=dist.get(a)+length(a.p,foot)<dist.get(b)+length(b.p,foot)?a:b;
      join=foot;nearest=d;
    }
    const line=[join];
    for(let n=chosen;n;n=toward.get(n))if(length(line.at(-1),n.p)>.02)line.push(n.p);
    const distance=nearest+length(join,chosen.p)+dist.get(chosen);
    let cue='Continue',meters=distance;
    if(length(here,goal.p)<(CITY?6:3))cue='Arrived';
    else if(nearest>(CITY?10:5)){cue=CITY?'Join the road':'Join the trail';meters=nearest;}
    else if(line.length>1){
      const heading=(a,b)=>Math.atan2(b[0]-a[0],a[1]-b[1]);
      const angle=(a,b)=>Math.atan2(Math.sin(b-a),Math.cos(b-a));
      if(Math.abs(angle(yaw,heading(line[0],line[1])))>2.35){cue='Turn around';meters=0;}
      else{
        let ahead=0;
        for(let i=1;i<line.length-1;i++){
          ahead+=length(line[i-1],line[i]);
          const turn=angle(heading(line[i-1],line[i]),heading(line[i],line[i+1]));
          if(Math.abs(turn)>.66){cue=turn>0?'Turn right':'Turn left';meters=ahead;break;}
        }
      }
    }
    return {line,goal:goal.p,cue,meters:Math.round(meters),distance:Math.round(distance)};
  };
}
