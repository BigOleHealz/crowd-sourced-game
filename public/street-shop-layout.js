import {marketTenants} from './harbor-market.js';
import {furnitureId} from './shop-furniture.js';
// Tenant identities and fixture placement are shared by rendering, aiming and
// the authoritative simulator. The renderer supplies primitives and finishes;
// the simulator consumes the same metre-scale placements as collision shapes.
export const tenants = [
  [['Río Papel','Books & independent press','books'],['Bromelia','Flowers & stems','florist']],
  [['Azul Discos','Records · listening room','records'],['Forma Sur','Contemporary ceramics','pottery']],
  [['Gulf Stream','Paddle & surf','surf'],['Mercado Coral','Produce & provisions','market']],
  [['Dársena','Contemporary art','gallery'],['Cadencia','Bicycles & repair','cycles']],
  [['Casa Lino','Linen & cotton','apparel'],null],
  [['Tinta y Mar','Bookshop','books'],['Sombra','Botanical studio','florist']],
  [['Ciruela','Fruit & grocery','market'],['Biscayne Sound','Vinyl & hi-fi','records']],
  [['Vela','Coastal outfitter','surf'],['Luz del Sur','Prints & photography','gallery']],
  [['Marea Baja','Board workshop','surf'],['Terracota','Wheel-thrown stoneware','pottery']],
  [['Ojiva','Print gallery','gallery'],['Rueda Libre','City bicycles','cycles']],
  [['Tallo','Cut flower market','florist'],['Alba','Resort wear','apparel']],
  [['Isla Wax','Soul · jazz · salsa','records'],['Sal y Sol','Neighborhood market','market']],
  [['El Torno','Pottery studio','pottery'],['Papel de Palma','Art & design books','books']],
  [['Pórtico','Linen atelier','apparel'],['Garza','Fine art editions','gallery']],
  [['Tidal Supply','Paddleboard supply','surf'],['Harbor Wheel','Marine district cycles','cycles']],
  [['Muelle','Canvas & cotton','apparel'],['Channel Press','Charts & books','books']],
  [['Palmetto Clay','Studio ceramics','pottery'],['Palm Exchange','Flowers & plants','florist']],
  [['Bayline Records','Records & tapes','records'],['Pier Market','Fruit & provisions','market']],
  ...marketTenants,
];
export const palettes = {
  firstaid: [0x3c716c,0xf2eee1,0xada389,0xa3b0a0],
  books:   [0x384e4d,0xebe3c9,0x98754d,0xb89160],
  florist: [0x485c43,0xece0ca,0x8f7b5e,0xad8061],
  records: [0x7c4236,0xe3cfaa,0x644939,0x9e774f],
  pottery: [0x895440,0xe7d6bc,0xb08864,0xc59268],
  surf:    [0x396967,0xe1e0c9,0x967952,0xd6bb88],
  market:  [0x5a6648,0xf0dfba,0x967551,0xb29a65],
  gallery: [0x52535a,0xf1eee3,0x7e7061,0xa59072],
  cycles:  [0x375363,0xdadfd7,0x89765a,0x9c9d89],
  apparel: [0x965f4a,0xebe2d2,0xa28c72,0xbca07d],
};
const paint=[0x42655f,0xc3805a,0xe2b765,0x866159,0x799093,0xe3d3b5,0x546371];
export const dark=0x353b36, brass=0xb0996c;


export const shopFloor=.841,shopCeiling=4.03;

export function retailDepths(b){
  const east=b.x===-17&&b.z===7?7.13:Math.min(5.8,(b.w-5.32)/2);
  return {east,west:Math.min(5.8,b.w-east-5.32)};
}

export function furnishShop(index,side,width,depth,draw){
  const {shape,beam,sign,detail,floorShadow}=draw;
  const begin=(x,z)=>draw.beginPiece?.(furnitureId(index*2+(side+1)/2,x,z),x,z);
  const end=()=>draw.endPiece?.();
  const box='box',drum='drum',bulb='bulb',pot='pot',hoop='hoop';
  const [, ,type]=tenants[index][side>0?1:0];
  const [accent,cream,wood,edge]=palettes[type],half=width/2;
  const shadeColor=paint[(index+(side+1)*2)%paint.length];
  const rear=-depth+.16,stockZ=rear+.36;
  const rect=(c,x,y,z,w,h,d,mode=2)=>shape(box,c,x,y,z,w,h,d,mode);
  const timber=(c,x,y,z,w,h,d)=>rect(c,x,y,z,w,h,d,3);
  const ball=(c,x,y,z,w,h,d)=>shape(bulb,c,x,y,z,w,h,d);
  const round=(c,x,y,z,r,h)=>shape(drum,c,x,y,z,r,h,r);
  function table(x,z,w,d,top=.82) {
    floorShadow(x,z,w,d);timber(wood,x,top,z,w,.085,d);
    for(const sx of [-1,1])for(const sz of [-1,1])
      rect(dark,x+sx*(w/2-.10),top/2,z+sz*(d/2-.09),.045,top,.045);
  }
  function shelf(x,w){
    floorShadow(x,stockZ+.09,w,.52);timber(wood,x,1.30,stockZ-.12,w,2.51,.115);
    for(const sx of [-1,1])timber(edge,x+sx*(w/2-.04),1.34,stockZ+.04,.078,2.54,.41);
    for(const y of [.31,.93,1.55,2.17])timber(edge,x,y,stockZ+.055,w,.065,.49);
  }
  function vase(x,y,z,c,r,h){
    detail(true);
    shape(pot,c,x,y+h*.27,z,r,h*.54,r);
    ball(c,x,y+h*.53,z,r*1.03,h*.28,r*1.03);
    round(c,x,y+h*.80,z,r*.55,h*.36);
    round(c,x,y+h*.98,z,r*.63,h*.04);
    round(dark,x,y+h*1.005,z,r*.45,.008);detail(false);
  }
  function bouquet(x,y,z,c,s){
    detail(true);
    shape(pot,0xb6a597,x,y+.14*s,z,.14*s,.28*s,.14*s);
    for(let k=0;k<7;k++){
      const a=k*2.4,reach=(.11+.07*Math.sin(k))*s;
      const xx=x+Math.sin(a)*reach,zz=z+Math.cos(a)*reach,yy=y+(.47+.12*Math.sin(2*k))*s;
      beam(0x566849,x,y+.24*s,z,xx,yy,zz,.013*s);
      shape(bulb,0x6e835a,(x+xx)/2,(yy+y+.20*s)/2,(zz+z)/2,.06*s,.11*s,.029*s,2,.3,a,.50);
      ball(c,xx,yy,zz,.072*s,.055*s,.071*s);
      ball(0xd6b069,xx,yy+.048*s,zz,.029*s,.014*s,.029*s);
    }
    detail(false);
  }
  function bicycle(x,z,c){
    for(const dx of [-.55,.55]){
      shape(hoop,dark,x+dx,.39,z,.34,.34,.34);
      detail(true);
      for(let k=0;k<5;k++){
        const a=k*Math.PI/5,xx=.302*Math.cos(a),yy=.302*Math.sin(a);
        beam(0xa5aaa2,x+dx-xx,.39-yy,z,x+dx+xx,.39+yy,z,.012);
      }
      detail(false);
    }
    const pts=[[-.55,.39],[-.21,.86],[.01,.39],[.39,.82],[.55,.39]];
    for(const [a,b] of [[0,1],[0,2],[1,2],[1,3],[2,3],[3,4]])
      beam(c,x+pts[a][0],pts[a][1],z,x+pts[b][0],pts[b][1],z,.042);
    rect(dark,x-.24,.926,z,.24,.07,.13);
    beam(dark,x+.39,.82,z,x+.34,1.00,z,.037);rect(dark,x+.34,1,z,.095,.045,.38);
  }
  function art(x,y,z,w,h,variant){
    timber(wood,x,y,z,w+.09,h+.09,.095);rect(0xeee4cb,x,y,z+.058,w,h,.024);
    const artZ=z+.074;
    rect(paint[variant%7],x,y,artZ,w*.84,h*.79,.012);
    // Screen prints with large clipped-looking colour fields, sun and skyline.
    shape(drum,paint[(variant+2)%7],x-.12*w,y+.10*h,artZ+.015,.16*w,.012,.16*w,2,Math.PI/2);
    for(let k=0;k<4;k++){
      const bh=h*(.14+.17*(.5+.5*Math.cos(variant+k*2)));
      rect(paint[(variant+k+3)%7],x+w*(-.30+k*.15),y-h*.30+bh/2,artZ+.022+k*.002,w*.14,bh,.008);
    }
  }
  function checkout(x,w,variant){
    const z=-depth*(.69+.05*(variant%2)), counterW=Math.min(2.35,w*.91);
    floorShadow(x,z,counterW,.80);
    // A timber cashwrap with recessed plinth, countertop, scanner and small
    // receipt roll. The wall behind it carries the shopkeeper's own name.
    timber(dark,x,.115,z,counterW-.12,.14,.68);
    timber(wood,x,.574,z,counterW,.80,.78);
    rect(cream,x,.997,z,counterW+.10,.060,.86,4);
    for(let j=0;j<11;j++)timber(edge,x+counterW*(j-5)/12,.55,z+.406,.046,.72,.035);
    rect(dark,x+.19,1.07,z,.12,.095,.19);
    shape(box,dark,x+.19,1.22,z,.32,.23,.032,2,-.17);
    rect(0xaaa99a,x-.18,1.055,z+.08,.16,.062,.17);
    rect(accent,x,2.02,rear+.051,w*.90,1.61,.07);
    sign(x,2.11,rear+.094,w*.79,.46);
    for(const sx of [-1,1]){
      round(brass,x+sx*w*.41,2.10,rear+.18,.059,.33);
      shape(drum,0xffdda1,x+sx*w*.41,2.10,rear+.18,.052,.46,.052,6);
    }
  }
  function loungeChair(x,z,color){
    begin(x,z);
    timber(wood,x,.19,z,.53,.32,.50);
    rect(color,x,.38,z,.62,.17,.60);
    shape(box,color,x,.66,z-.24,.63,.48,.12,2,-.12);
    end();
  }
  function featureBay(x,w,variant,c){
    const z=-Math.max(1.67,depth*.65);
    floorShadow(x,z,w*.67,.73);
    switch(type){
      case 'firstaid':{
        shelf(x,w*.86);
        for(let row=0;row<3;row++)for(let k=0;k<6;k++){
          const xx=x+(k-2.5)*w*.117,y=.36+row*.62;
          if((k+row)%2){
            round(0xd4b88c,xx,y+.117,stockZ+.16,.064,.234);
            round(0xece7dc,xx,y+.256,stockZ+.16,.049,.042);
          }else{
            rect(cream,xx,y+.122,stockZ+.17,.206,.24,.138);
            rect(accent,xx,y+.122,stockZ+.244,.184,.062,.009);
          }
        }
        break;
      }
      case 'cycles':{
        // Mechanic's workbench, toolbox and a spare wheel hung from a stand.
        timber(wood,x,.96,stockZ+.31,w*.85,.10,.97);
        for(const dx of [-.31,.31])rect(dark,x+w*dx,.50,stockZ+.33,.12,.90,.65);
        rect(0x9a4e3e,x-w*.20,1.17,stockZ+.29,.54,.31,.31);
        for(let j=0;j<3;j++)rect(brass,x-w*.20,1.08+j*.08,stockZ+.46,.42,.013,.022);
        shape(hoop,dark,x+w*.22,1.80,stockZ+.09,.36,.36,.36);
        shape(hoop,0xa5aca3,x+w*.22,1.80,stockZ+.09,.32,.32,.32);break;
      }
      case 'gallery':
        art(x-.24*w,1.81,rear+.10,.78,1.10,variant);
        art(x+.18*w,1.59,rear+.10,.64,.82,(variant+4)%7);
        begin(x,z);table(x,z,w*.73,.46,.45);end();break;
      case 'florist':
        // Lattice supports climbing foliage behind a tiered plant stand.
        for(let k=0;k<7;k++)timber(wood,x+(k-3)*w*.11,1.49,stockZ,.027,2.34,.034);
        for(let k=0;k<6;k++)timber(wood,x,1.00+k*.24,stockZ,w*.82,.024,.034);
        for(let k=0;k<3;k++){
          const xx=x+(k-1)*w*.24,h=.22+k*.19;
          timber(edge,xx,h/2,z,.50,h,.53);
          bouquet(xx,h,z,paint[(variant+k)%7],1.37);
        }break;
      case 'market':{
        // Refrigerated case with insulated sides, a dark back, lit shelves,
        // and milk bottles. Each tier has a fine shelf lip.
        rect(0x565c55,x,1.19,stockZ,w*.79,2.36,.73);
        rect(0x9ca9a0,x,1.34,stockZ+.38,w*.71,1.86,.045);
        for(const sx of [-1,1])rect(cream,x+sx*w*.365,1.34,stockZ+.51,.055,1.91,.30);
        for(let j=0;j<3;j++){
          const y=.48+j*.54;
          rect(cream,x,y,stockZ+.50,w*.72,.035,.32);
          for(let k=0;k<6;k++){
            const xx=x+(k-2.5)*w*.11;
            round([cream,0xb8b594,c][(j+k)%3],xx,y+.14,stockZ+.53,.085,.24);
            round(dark,xx,y+.28,stockZ+.53,.049,.042);
          }
        }
        rect(0xffedcf,x,2.27,stockZ+.49,w*.68,.022,.15,6);
        break;
      }
      case 'pottery':
        // Potter's wheel, seat and tools, with blue-green glaze samples.
        shape(pot,0xa29a87,x,.34,z,.32,.63,.32);
        round(0x6e756e,x,.70,z,.43,.15);round(0xc2beab,x,.79,z,.30,.05);
        vase(x,.82,z,c,.13,.28);
        begin(x+.65,z);round(wood,x+.65,.51,z,.23,.085);round(dark,x+.65,.28,z,.06,.44);end();
        for(let j=0;j<5;j++)rect(paint[(variant+j)%7],x+(j-2)*.27,1.90,rear+.09,.23,.41,.07);
        break;
      case 'records':
        // Listening station: speakers with recessed cones and a turntable.
        begin(x,z);timber(wood,x,.77,z,w*.79,.80,.64);rect(dark,x,1.19,z,.69,.076,.46);
        round(0x323333,x,1.24,z,.19,.025);round(c,x,1.26,z,.057,.013);
        for(const sx of [-1,1]){
          const xx=x+sx*w*.32;
          timber(wood,xx,1.43,z,.31,.53,.30);
          shape(drum,dark,xx,1.40,z+.17,.115,.025,.115,2,Math.PI/2);
          shape(drum,0x8b9588,xx,1.59,z+.17,.044,.025,.044,2,Math.PI/2);
        }end();break;
      case 'apparel':
        timber(wood,x,1.54,stockZ,w*.73,2.31,.42);
        for(const sx of [-1,1])timber(edge,x+sx*w*.35,1.55,stockZ+.26,.067,2.31,.48);
        for(let j=0;j<3;j++) {
          const yy=.62+j*.67;timber(edge,x,yy,stockZ+.21,w*.76,.058,.55);
          for(let k=0;k<3;k++)for(let l=0;l<3;l++)
            rect(paint[(variant+j+k)%7],x+(k-1)*w*.21,yy+.061+l*.052,stockZ+.29,.39,.047,.32);
        }break;
      case 'books':
        art(x,1.91,rear+.10,1.12,.81,variant);
        loungeChair(x-.27*w,z,c);loungeChair(x+.25*w,z,accent);
        begin(x,z+.19);round(wood,x,.52,z+.19,.26,.058);round(brass,x,.28,z+.19,.055,.45);end();break;
      case 'surf':
        begin(x,z);timber(wood,x,.84,z,w*.88,.10,.75);
        for(const sx of [-1,1])rect(dark,x+sx*w*.32,.42,z,.12,.78,.55);
        shape(bulb,cream,x,1,z,w*.43,.065,.26);end();
        for(let j=0;j<3;j++){
          const xx=x+(j-1)*.47;
          beam(wood,xx-.15,.54,stockZ,xx+.13,2.32,stockZ,.043);
          shape(bulb,paint[(variant+j)%7],xx-.13,.79,stockZ,.12,.29,.035,2,0,0,-.18);
        }break;
    }
  }
  const count=Math.max(1,Math.floor((width-.8)/3.5)),cell=(width-.85)/count;
  for(let i=0;i<count;i++){
    const x=(i+.5-count/2)*cell, w=Math.min(cell-.26,3.3);
    const variant=(index*3+i+(side+1))%7, c=paint[variant];
    const middle=-Math.max(1.68,depth*(.42+.15*((index+i)%3)/2));
    if(count>=2 && i===(index+1)%count){
      checkout(x,w,variant);continue;
    }
    if(count>=3 && i===(index+2)%count){
      featureBay(x,w,variant,c);continue;
    }
    floorShadow(x,middle,w*.71,.75);
    // Back-wall inventory, working fixtures in the middle and a foreground
    // merchandise silhouette occupy distinct depths even in the small bays.
    switch(type){
      case 'books':
        shelf(x,w);
        detail(true);
        for(const y of [.349,.969,1.589,2.209]){
          for(let k=0;k<9;k++){
            const h=.26+.12*(.5+.5*Math.sin(i*3+k*4.7+y));
            rect(paint[(k+i+Math.round(y*2))%7],x+w*(k-4)/11,y+h/2,stockZ+.09,w/13,h,.22);
          }
        }
        detail(false);begin(x,middle);table(x,middle,w*.71,.85);detail(true);
        for(let k=0;k<5;k++){
          const xx=x+(k%3-1)*w*.20,yy=.892+Math.floor(k/3)*.060;
          rect(paint[(variant+k)%7],xx,yy,middle,.36,.048,.48);
          rect(0xdccfaf,xx,yy+.011,middle+.235,.33,.024,.018);
        }end();break;
      case 'florist':
        timber(wood,x,.70,stockZ+.12,w,1.25,.63);
        for(let k=0;k<4;k++)bouquet(x+(k-1.5)*w*.24,1.334,stockZ+.16,paint[(variant+2*k)%7],.94);
        for(let k=0;k<3;k++){
          const xx=x+(k-1)*w*.26, zz=(k===1?-1.61:middle);
          begin(xx,zz);shape(pot,0x828b79,xx,.25,zz,.23,.46,.23);
          bouquet(xx,.46,zz,[0xc37a74,0xe8d4a0,0x9c7190][k],1.25);end();
        }break;
      case 'firstaid':
        shelf(x,w*.88);
        for(let row=0;row<3;row++)for(let k=0;k<5;k++){
          const xx=x+(k-2)*w*.135,y=.52+.62*row;
          rect(row%2?0xdcc592:cream,xx,y,stockZ+.09,.24,.29,.18);
          rect(accent,xx,y+.045,stockZ+.184,.19,.032,.012);
        }
        loungeChair(x,middle,0x71978b);break;
      case 'records':
        for(let k=0;k<3;k++)art(x+(k-1)*w*.28,1.93,rear+.085,.66,.67,(variant+k)%7);
        begin(x,middle);table(x,middle,w*.83,.88,.77);
        for(let k=0;k<3;k++){
          const xx=x+(k-1)*w*.25;
          timber(wood,xx,.94,middle,w*.23,.26,.67);
          detail(true);
          for(let j=0;j<5;j++)shape(box,paint[(variant+j+k)%7],xx,1.12,middle+.22-j*.084,.43,.42,.028,2,-.15);
          shape(drum,0x302f2d,xx,1.19,middle+.253,.115,.018,.115,2,Math.PI/2);
          shape(drum,c,xx,1.19,middle+.269,.041,.008,.041,2,Math.PI/2);detail(false);
        }end();break;
      case 'pottery':
        shelf(x,w);
        for(let j=0;j<3;j++)for(let k=0;k<4;k++)
          vase(x+(k-1.5)*w*.22,.35+.62*j,stockZ+.11,[cream,shadeColor,0xb87959,0x7c9088][(j+k)%4],.11+.017*(k%3),.28+.07*((k+j)%3));
        begin(x,middle);table(x,middle,w*.66,.77);
        vase(x-.24,.865,middle,c,.17,.47);vase(x+.23,.865,middle+.08,cream,.12,.30);end();
        break;
      case 'surf':
        for(let k=0;k<3;k++){
          const xx=x+(k-1)*w*.24, h=1.12-.075*((k+i)%3);
          const board=paint[(variant+k)%7];
          shape(bulb,board,xx,1.30,stockZ+.08,.31,h,.078,2,0,0,.075*(k-1));
          rect(0xe4d4ae,xx,1.30,stockZ+.160,.036,1.72,.015);
        }
        begin(x,middle);
        for(const sx of [-1,1]){
          timber(wood,x+sx*w*.29,.51,middle,.12,.94,.5);
          timber(edge,x+sx*w*.29,.76,middle,.14,.10,.91);
        }
        shape(bulb,shadeColor,x,.87,middle,w*.46,.11,.34);
        shape(bulb,cream,x,1.12,middle-.085,w*.44,.082,.30);end();
        break;
      case 'market':
        shelf(x,w);
        detail(true);
        for(const y of [.35,.97,1.59])for(let k=0;k<6;k++){
          const xx=x+(k-2.5)*w*.145;
          round(0xc9ad78,xx,y+.115,stockZ+.10,.092,.23);
          round(paint[(variant+k)%7],xx,y+.116,stockZ+.10,.094,.117);
        }
        detail(false);
        for(let k=0;k<3;k++){
          const xx=x+(k-1)*w*.26,z=middle+(k%2)*.32;
          begin(xx,z);timber(wood,xx,.51,z,w*.24,.76,.70);
          for(let j=0;j<3;j++)timber(edge,xx,.45+j*.16,z+.37,w*.24,.096,.036);
          detail(true);
          for(let j=0;j<8;j++)ball([0xbf6540,0x8caa52,0xd7a339][k],xx+((j%4)-1.5)*.13,.944,z+(Math.floor(j/4)-.5)*.19,.08,.083,.083);detail(false);end();
        }break;
      case 'gallery':
        art(x,1.68,rear+.09,w*.64,1.42,variant);
        begin(x,middle);rect(cream,x,.45,middle,.66,.86,.66,4);
        shape(hoop,c,x,1.25,middle,.42,.50,.42,2,.03,.37,.21);end();
        break;
      case 'cycles':
        rect(0x65746a,x,1.83,rear+.09,w*.81,1.04,.10);
        for(let k=0;k<5;k++){
          const xx=x+(k-2)*w*.14;
          beam(0xbcc1aa,xx,1.58,stockZ,xx+.08,2.06,stockZ,.026);
          shape(hoop,0xb0b6ae,xx+.082,2.10,stockZ,.06,.06,.06);
        }
        timber(wood,x,.95,stockZ+.04,w*.86,.09,.61);
        begin(x,middle);bicycle(x,middle,c);
        rect(dark,x,.079,middle,1.48,.085,.43);end();
        break;
      case 'apparel':
        art(x,1.78,rear+.09,w*.48,1.18,(variant+2)%7);
        begin(x,middle);
        for(const sx of [-1,1]){
          rect(brass,x+sx*w*.38,.86,middle,.037,1.63,.037);
          rect(dark,x+sx*w*.38,.09,middle,.10,.07,.59);
        }
        rect(brass,x,1.68,middle,w*.80,.04,.04);
        for(let k=0;k<5;k++){
          const xx=x+(k-2)*w*.15, cc=paint[(k+variant)%7];
          beam(wood,xx-.11,1.51,middle,xx,1.63,middle,.025);
          beam(wood,xx,1.63,middle,xx+.12,1.51,middle,.025);
          shape(pot,cc,xx,1.08,middle,.17,.79,.088);
          shape(bulb,cc,xx-.109,1.36,middle,.084,.17,.088,2,0,0,-.40);
          shape(bulb,cc,xx+.109,1.36,middle,.084,.17,.088,2,0,0,.40);
        }end();break;
    }
    detail(false);
  }
  // A single window display punctuates the more regularly spaced rear bays.
  // Set the merchandise at three actual distances from the pavement.
  const windowX=half-.66, near=-1.16;
  begin(windowX,near);
  floorShadow(windowX,near,.61,.49);
  if(type==='books'||type==='gallery'||type==='records'){
    timber(wood,windowX,.30,near,.67,.55,.50);
    art(windowX,.96,near,.49,.66,index%7);
  }else if(type==='pottery'||type==='florist'){
    rect(edge,windowX,.31,near,.63,.57,.63,4);
    if(type==='pottery')vase(windowX,.605,near,shadeColor,.19,.61);
    else bouquet(windowX,.605,near,0xedca84,1.18);
  }else if(type==='cycles'){
    shape(hoop,dark,windowX,.63,near,.40,.40,.40,2,0,.38);
    rect(brass,windowX,.18,near,.10,.29,.20);
  }else if(type==='apparel'){
    round(dark,windowX,.06,near,.22,.10);round(brass,windowX,.58,near,.035,1.0);
    ball(cream,windowX,1.34,near,.213,.36,.12);
    shape(pot,shadeColor,windowX,1.03,near,.195,.34,.13);
    round(wood,windowX,1.71,near,.085,.10);
  }else if(type==='firstaid'){
    rect(cream,windowX,.46,near,.75,.87,.36);rect(accent,windowX,.92,near,.81,.09,.43);
    for(let k=0;k<3;k++)rect(0xe5d5bb,windowX+(k-1)*.19,1.07,near,.15,.23,.11);
  }else if(type==='market'){
    timber(wood,windowX,.24,near,.74,.42,.52);
    for(let k=0;k<5;k++)ball(0xc29b50,windowX+(k-2)*.114,.51,near,.088,.074,.10);
  }else{
    shape(bulb,0xd7ad6e,windowX,1.14,near,.27,1.02,.085,2,-.12,0,.17);
    shape(box,cream,windowX,1.14,near+.083,.027,1.69,.013,2,-.12,0,.17);
  }
  end();
}

// Small pieces on top of a stand are included, so a standing body or ray can
// encounter them at the appropriate elevation. Rigid mounts and rims also
// survive a broken display window. Bounds are precomputed once, in world space.
export function retailFixtures(index,face){
  const fixtures=[], b=face.building,s=face.side,origin=b.x+s*b.w/2;
  const rear=face.x-s*(face.depth-.30),outer=face.x;
  const room=[Math.min(rear,outer),Math.max(rear,outer),b.z-b.d/2+.18,b.z+b.d/2-.18];
  face.pieces=new Map();
  let piece=null;
  function beginPiece(id,x,z){
    piece={id,x:origin+s*z,z:b.z-s*x,w:0,d:0,height:0,floor:shopFloor,room};
    face.pieces.set(id,piece);
  }
  function add(x,y,z,hw,hh,hd){
    if(y+hh<.05)return;
    const box={x:origin+s*z,z:b.z-s*x,w:hd*2,d:hw*2,bottom:.80+y-hh,top:.80+y+hh};
    if(piece){
      piece.w=Math.max(piece.w,2*Math.abs(piece.x-box.x)+box.w);
      piece.d=Math.max(piece.d,2*Math.abs(piece.z-box.z)+box.d);
      piece.height=Math.max(piece.height,box.top-piece.floor);
      box.piece=piece;
    }
    fixtures.push(box);
  }
  function shape(id,c,x,y,z,w,h,d,mode,rx=0,ry=0,rz=0){
    let hw=w/2,hh=h/2,hd=d/2;
    if(id==='pot'||id==='drum'){hw=w;hd=d;}
    if(id==='bulb'){hw=w;hh=h;hd=d;}
    if(id==='hoop'){hw=w*1.064;hh=h*1.064;hd=d*.064;}
    const cx=Math.cos(rx),sx=Math.sin(rx),cy=Math.cos(ry),sy=Math.sin(ry),cz=Math.cos(rz),sz=Math.sin(rz);
    // Absolute rows of the same XYZ rotation used by Three.Batch.
    add(x,y,z,Math.abs(cy*cz)*hw+Math.abs(cy*sz)*hh+Math.abs(sy)*hd,
      Math.abs(cx*sz+sx*cz*sy)*hw+Math.abs(cx*cz-sx*sz*sy)*hh+Math.abs(sx*cy)*hd,
      Math.abs(sx*sz-cx*cz*sy)*hw+Math.abs(sx*cz+cx*sz*sy)*hh+Math.abs(cx*cy)*hd);
  }
  function beam(c,x,y,z,xx,yy,zz,t){
    add((x+xx)/2,(y+yy)/2,(z+zz)/2,(Math.abs(x-xx)+t)/2,(Math.abs(y-yy)+t)/2,(Math.abs(z-zz)+t)/2);
  }
  const noop=()=>{};
  furnishShop(index,s,b.d,face.depth,{shape,beam,sign:noop,detail:noop,floorShadow:noop,beginPiece,endPiece:()=>{piece=null;}});
  return fixtures;
}
