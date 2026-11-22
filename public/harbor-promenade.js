import * as THREE from 'three';

// Pavement, inlaid bands and palm grates share the existing street batches.
export function addHarborPromenade(solids,box,ground,harbor,streetPlan,palms) {
  const blocks=[
    [harbor.north,streetPlan.northStreet-4.5],
    [streetPlan.northStreet+4.5,harbor.crossing-4.5],
    [harbor.crossing+4.5,harbor.south]
  ];
  const paving=[];
  const tile=(color,x,z,width,length,y=.826,angle=0)=>
    solids.add(box,color,x,y,z,width,.009,length,0,angle);
  for(const side of [-1,1])for(const [north,south] of blocks){
    const z=(north+south)/2,length=south-north;
    paving.push([side*8.2,.816,z,4.4,length]);
    tile(0x689c98,side*6.30,z,.22,length);
    tile(0xe8c3a2,side*6.54,z,.14,length);
    tile(0x689c98,side*10.24,z,.10,length);
    for(let joint=north+3;joint<south-.1;joint+=3.4)
      tile(0xb6aa96,side*8.32,joint,3.52,.024);
    // A fan in the paving marks each junction, seen from either approach.
    for(const end of [-1,1]){
      const center=end<0?north+2.9:south-2.9;
      for(let i=-3;i<=3;i++){
        const a=i*Math.PI/9,span=1.42;
        tile(i%2===0?0x327f7c:0xbb725a,side*8.23+Math.sin(a)*span/2,
          center+end*Math.cos(a)*span/2,.065,span,.838,end*a);
      }
    }
  }
  // Continue the avenue walks around the corner to the market entrances.
  for(const [west,east] of [[streetPlan.westStreet+4.5,-10.4],[10.4,streetPlan.eastStreet-4.5]]){
    const x=(west+east)/2,width=east-west,z=harbor.crossing-5.93;
    paving.push([x,.816,z,width,2.86]);
    tile(0x689c98,x,harbor.crossing-4.77,width,.15);
    tile(0xe8c3a2,x,harbor.crossing-4.99,width,.10);
    for(let seam=west+2;seam<east;seam+=3.4)tile(0xb6aa96,seam,z-.23,.024,2.31);
  }
  ground('pavers',paving,2.6);
  const ring=new THREE.RingGeometry(.39,.69,16).rotateX(-Math.PI/2);
  for(const p of palms){
    if(Math.abs(p.x)!==9 || p.z<harbor.north || p.z>harbor.south)continue;
    solids.add(ring,0x63796d,p.x,.846,p.z);
  }
  ring.dispose();
}

export function addArrivalMarker(scene,solids,box,x,z) {
  const sea=0x388681,shell=0xf2dfbd,flamingo=0xd98c7d;
  const slab=(t,dx,y,dz,w,h,d)=>solids.add(box,t,x+dx,y,z+dz,w,h,d);
  // Stepped pylons sit behind the enamel nameplate. Their reverse is finished
  // as well, since the same monument is visible on the ride back to Brickell.
  for(const side of [-1,1]){
    slab(shell,side*1.22,2.03,0,.44,2.46,.38);
    slab(sea,side*1.22,2.04,.20,.13,2.42,.035);
    for(let i=0;i<3;i++)slab(i===1?flamingo:shell,side*(1.80+i*.24),3.39+i*.13,0,1.15-i*.19,.09,.22);
  }
  slab(sea,0,3.60,0,3.9,1.06,.29);
  slab(shell,0,4.14,0,3.50,.12,.28);
  slab(shell,0,4.26,0,2.15,.12,.26);
  slab(flamingo,0,4.37,0,.88,.12,.23);
  const face=document.createElement('canvas');face.width=768;face.height=192;
  const ink=face.getContext('2d');
  ink.fillStyle='#146465';ink.fillRect(0,0,768,192);
  ink.strokeStyle='#efba97';ink.lineWidth=3;ink.strokeRect(10,10,748,172);
  ink.textAlign='center';ink.textBaseline='middle';
  ink.fillStyle='#fff1d2';ink.font='500 89px Georgia, serif';ink.fillText('Harbor Key',384,100);
  for(const y of [73,85,97])for(const dx of [0,615])ink.fillRect(44+dx,y,65-(y-73)*1.3,3);
  const texture=new THREE.CanvasTexture(face);texture.colorSpace=THREE.SRGBColorSpace;
  const sign=new THREE.Mesh(new THREE.PlaneGeometry(3.79,.95),new THREE.MeshBasicMaterial({map:texture}));
  sign.position.set(x,3.60,z+.151);scene.add(sign);
  return sign;
}
