// World-space metres, from the East Quay slip to the far side of Lantern Bridge.
export const reefTrail = [
  [81,-401],[85,-391],[81,-381],[77,-371],[70,-360],[61,-351],
  [51,-343],[41,-335],[30,-328],[19,-322],[8,-317],[-4,-315],[-16,-313],[-27,-311],
];
export const reefDiveSite = {name:'Coral Reef', x:reefTrail[0][0], z:reefTrail[0][1]};
const spacing = 2;
export const reefTileSize = 32;
const west = -256, north = -544, columns = 193, rows = 337;
const heights = new Float32Array(columns * rows);
const clamp01 = value => Math.max(0, Math.min(1, value));

function survey(x,z) {
  const offshore = clamp01((Math.abs(x) - 38) / 52);
  const channel = Math.exp(-(((z+316)/24)**2)) + Math.exp(-(((z+106)/25)**2));
  let floor = -3.7 - 2.9*offshore - 2.3*channel +
    .47*Math.sin(x*.082+z*.046) + .34*Math.cos(z*.091-x*.068);
  // Raised limestone ridges form solid, progressively different silhouettes on the trail.
  if (x>=-36 && x<=98 && z>=-415 && z<=-300) {
    for (const [i,[cx,cz]] of reefTrail.entries()) {
      const dx=(x-cx)/(3+i%3), dz=(z-cz)/(2.2+i%2);
      floor += Math.max(0,1-dx*dx-dz*dz)*(1.2+i%3*.45);
    }
  }
  return Math.min(-2.8, floor);
}
for(let j=0;j<rows;j++)for(let i=0;i<columns;i++)
  heights[j*columns+i]=survey(west+i*spacing,north+j*spacing);

export function seabedHeight(x,z) {
  const u=Math.min(columns-1,Math.max(0,(x-west)/spacing));
  const v=Math.min(rows-1,Math.max(0,(z-north)/spacing));
  const i=Math.min(columns-2,Math.floor(u)), j=Math.min(rows-2,Math.floor(v));
  const a=j*columns+i, dx=u-i, dz=v-j;
  // These are the same two planar triangles used by the renderer.
  if(dx+dz<=1)return heights[a]+dx*(heights[a+1]-heights[a])+dz*(heights[a+columns]-heights[a]);
  const c=a+columns+1;
  return heights[c]+(1-dx)*(heights[c-1]-heights[c])+(1-dz)*(heights[c-columns]-heights[c]);
}
export const reefGridSpacing=spacing;

// The anchor rests on its side. The diver can swim past its thin stock and over its flukes.
export const reefAnchor={x:-4,z:-315,yaw:.55};
export function reefAnchorTop(x,z){
  const dx=x-reefAnchor.x,dz=z-reefAnchor.z;
  if(Math.abs(dx)>2.8 || Math.abs(dz)>2.8)return -Infinity;
  const a=reefAnchor.yaw, localX=dx*Math.cos(a)-dz*Math.sin(a), localZ=dx*Math.sin(a)+dz*Math.cos(a);
  const shank=Math.abs(localX)<.17 && Math.abs(localZ)<1.85;
  const stock=Math.abs(localZ-.75)<.14 && Math.abs(localX)<1.12;
  const fluke=Math.abs(localX)<1.55 && Math.abs(localZ-(-1.46+Math.abs(localX)*.48))<.24;
  return shank || stock || fluke ? seabedHeight(x,z)+.27 : -Infinity;
}
