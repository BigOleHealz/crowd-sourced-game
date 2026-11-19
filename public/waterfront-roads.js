// Each footprint is shared by terrain, street surfaces and the dashboard map.
const rect=(west,east,north,south)=>({west,east,north,south});
export const contains=(r,x,z)=>x>=r.west && x<=r.east && z>=r.north && z<=r.south;

export function waterfrontRoads(avenues,streets,coast,harbor) {
  const mainland=[],island=[],ends=[],curbs=[];
  function terminal(x,z,dx,dz,depth,span) {
    const ax=Math.abs(dx),az=Math.abs(dz);
    const cx=x-dx*depth/2,cz=z-dz*depth/2;
    const halfX=ax ? depth/2 : span,halfZ=az ? depth/2 : span;
    const apron=rect(cx-halfX,cx+halfX,cz-halfZ,cz+halfZ);
    mainland.push(apron);
    ends.push({x,z,dx,dz,span,apron});
    // Two gaps maintain pedestrian access to the shore beyond the turning head.
    const length=(span*2-2.4)/3;
    for(let i=0;i<3;i++) {
      const offset=-span+length/2+i*(length+1.2);
      curbs.push({x:x+.15*dx+az*offset,z:z+.15*dz+ax*offset,w:ax ? .30 : length,d:az ? .30 : length,h:.53});
    }
  }
  const west=-71.5,east=40.5,north=-56,south=71.5;
  for(const x of avenues) {
    mainland.push(rect(x-5.7,x+5.7,x===0?coast.north:north,south));
    if(x!==0)terminal(x,north,0,-1,5.1,8.2);
    terminal(x,south,0,1,5.3,8.2);
  }
  for(const z of streets) {
    mainland.push(rect(west,east,z-4.1,z+4.1));
    terminal(west,z,-1,0,6.5,7.3);
    terminal(east,z,1,0,5.1,7.3);
  }

  const northStreet=-262,westStreet=-49,eastStreet=32,half=4.5;
  island.push(rect(-6,6,northStreet-half,harbor.south));
  for(const z of [northStreet,harbor.crossing])island.push(rect(westStreet-half,eastStreet+half,z-half,z+half));
  for(const x of [westStreet,eastStreet])island.push(rect(x-half,x+half,northStreet-half,harbor.crossing+half));
  // Low reflectors frame the three northbound turns on the landward side of the coast.
  for(const x of [westStreet,0,eastStreet])
    curbs.push({x,z:northStreet-half-.15,w:7.3,d:.30,h:.38});
  return {roads:[...mainland,...island],mainland,island,ends,curbs,northStreet,westStreet,eastStreet};
}

// Carve adjoining grass and sidewalk slabs out of the area's original land rectangle.
export function verges(land,roads) {
  let lots=[land];
  for(const road of roads) {
    const next=[];
    for(const lot of lots) {
      const w=Math.max(lot.west,road.west),e=Math.min(lot.east,road.east);
      const n=Math.max(lot.north,road.north),s=Math.min(lot.south,road.south);
      if(w>=e || n>=s){next.push(lot);continue;}
      if(lot.west<w)next.push(rect(lot.west,w,lot.north,lot.south));
      if(e<lot.east)next.push(rect(e,lot.east,lot.north,lot.south));
      if(lot.north<n)next.push(rect(w,e,lot.north,n));
      if(s<lot.south)next.push(rect(w,e,s,lot.south));
    }
    lots=next;
  }
  return lots;
}
