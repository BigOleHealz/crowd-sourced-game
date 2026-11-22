import {bridges,brickellMap,cityGround} from './brickell-map.js';

const water=brickellMap.waterY,shoulder=13;
export const bridgeTossNotice=70;

// Only a swimming dog thrown in a bridge's water corridor opens this route.
// Check the actual surface beneath the road. Dry abutments, shore and the
// physical depth of other water bodies are unchanged.
export function bridgeDogWater(bridge,x,z){
  return x>=bridge.west-shoulder && x<=bridge.east+shoulder && z>=bridge.north && z<=bridge.south &&
    cityGround(x,z,water-.02)<water-.33;
}

export function bridgeDogSplash(dog){
  return bridges.find(bridge=>bridgeDogWater(bridge,dog.x,dog.z));
}

export function dogTossBridge(dog){
  return dog.tossBridge==null ? undefined : bridges.find(bridge=>bridge.north===dog.tossBridge);
}
