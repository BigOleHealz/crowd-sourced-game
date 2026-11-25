import {leafLength} from './drawbridges.js';
// Transverse sections shared by the concrete mesh and the two traffic levels.
export function causewayArch(west, east, north, south) {
  const length = south - north, middle = (north + south) / 2;
  // A level pair of steel leaves meets without a ridge. Ease the concrete
  // approaches into both the shore and the hinges, using the same sections
  // for tyre contact, the painted surface, and the vault underneath.
  const approach=length/2-leafLength, ease=Math.min(8,approach/3);
  const count=Math.ceil(length);
  const sections=Array.from({length:count+1},(_,i)=>{
    const z=north+length*i/count;
    const fromShore=Math.min(z-north,south-z);
    let rise=1;
    if(fromShore<approach){
      const remaining=approach-fromShore;
      const distance=fromShore<ease ? fromShore*fromShore/(2*ease)
        : remaining<ease ? approach-ease-remaining*remaining/(2*ease) : fromShore-ease/2;
      rise=distance/(approach-ease);
    }
    const road=.70+5.80*rise;
    const soffit=fromShore>=approach ? road-.65 :
      Math.min(road-.65,Math.max(-2.80,5.72-8.52*((z-middle)/24)**2));
    return {z,road,soffit};
  });
  function height(z, surface) {
    const t = Math.max(0, Math.min(count, (z - north) * count / length));
    const i = Math.min(count - 1, Math.floor(t));
    return sections[i][surface] + (sections[i+1][surface] - sections[i][surface]) * (t-i);
  }
  const sidewalkWidth=4.4,sidewalkRise=.116;
  return {west, east, walkWest:west-sidewalkWidth, walkEast:east+sidewalkWidth,
    sidewalkWidth,sidewalkRise,north,south,sections,height,parapetWidth:.32,parapetHeight:.82};
}
