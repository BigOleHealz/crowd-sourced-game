// Keep the two fountain bowls clear of the entrance-to-table sightline.
export const pools=[{x:-59.2,z:51.8},{x:-50.15,z:51.8}];
export const waterfall={x:-60.57,z:51.25,width:3.15,bottom:1.28,top:15.75};
export const pokerTables=[{x:-64.4,z:43.5},{x:-55.3,z:43.5}];
export const pokerFloor=8;
export const atriumFixtures=[
  ...pools.map(p=>({...p,w:2.05,d:2.05,h:.52})),
  {x:waterfall.x,z:waterfall.z,w:.40,d:waterfall.width,h:waterfall.top-.8},
  ...pokerTables.flatMap(p=>[
    {...p,w:3.18,d:1.62,bottom:pokerFloor-.8,h:pokerFloor+.82-.8},
    ...Array.from({length:6},(_,i)=>{const a=i*Math.PI/3;
      return {x:p.x+1.94*Math.cos(a),z:p.z+1.25*Math.sin(a),w:.48,d:.48,bottom:pokerFloor-.8,h:pokerFloor+.86-.8};
    })
  ])
];
