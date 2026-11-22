// A stepped elliptical basin anchors the raised processional carriage court.
export const fountainSite={x:-54.6,z:44,radiusX:6.05,radiusZ:6.05,base:.80,lip:.63};

// Match the stepped collision to the oval coping instead of blocking its four corners.
export const fountainWalls=Array.from({length:13},(_,i)=>{
  const {x,z,radiusX,radiusZ,lip}=fountainSite;
  const dt=2/13,t=(i+.5)*dt-1;
  return {x,z:z+t*radiusZ,w:2*radiusX*Math.sqrt(1-t*t),d:dt*radiusZ,h:lip};
});
