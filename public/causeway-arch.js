import {leafLength} from './drawbridges.js';
// Transverse sections shared by the concrete mesh and the two traffic levels.
export function causewayArch(west, east, north, south) {
  const length = south - north, middle = (north + south) / 2;
  const count = Math.ceil(length / 2);
  const sections = Array.from({length: count + 1}, (_, i) => {
    const z = north + length * i / count;
    const crown = Math.sin(Math.PI * i / count);
    const offset=leafLength-Math.abs(z-middle);
    if(offset>=0){
      const base=.70+5.80*Math.cos(Math.PI*leafLength/length)**2;
      const road=base+(6.5-base)*offset/leafLength;
      return {z,road,soffit:road-.65};
    }
    return {
      z, road: .70 + 5.80 * crown ** 2,
      soffit: Math.max(-2.80, 5.72 - 8.52 * ((z - middle) / 24) ** 2),
    };
  });
  function height(z, surface) {
    const t = Math.max(0, Math.min(count, (z - north) * count / length));
    const i = Math.min(count - 1, Math.floor(t));
    return sections[i][surface] + (sections[i+1][surface] - sections[i][surface]) * (t-i);
  }
  return {west, east, north, south, sections, height, parapetWidth: .32, parapetHeight: .82};
}
