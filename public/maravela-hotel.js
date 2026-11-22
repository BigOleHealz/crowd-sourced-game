import {paneSupportLost} from './glass-support.js';

// The existing mainland corner block keeps its two independent side shops.
export const hotel={name:'Hotel Maravela',x:-16,z:-53,fronts:[
  {id:'quay',z:-57,side:-1},{id:'city',z:-49,side:1},
],desk:{x:-14.34,z:-53.07,w:.83,d:1.84},cart:{x:-17.91,z:-52.91,w:.61,d:.83}};
export function hotelPanels(front,fraction,width){
  return [-1,1].map(s=>({x:hotel.x+s*width*(.25+.51*fraction),z:front.z-.045*front.side,w:width/2,d:.035}));
}
export function hotelGlass(front,fraction,width,floor){
  return hotelPanels(front,fraction,width).map((p,i)=>({
    id:'hotel-'+front.id+'-leaf-'+i,x:p.x,supportX:hotel.x+(i===0?-1:1)*width*.25,z:p.z,width:p.w-.056,widthAxis:'x',
    bottom:floor+.080,top:floor+2.173,edge:false,hotelSlider:true,
  }));
}
export function hotelEntrance(p){
  return p.y>.45 && p.y<3.1 && Math.abs(p.x-hotel.x)<1.03 && hotel.fronts.find(f=>Math.abs(p.z-f.z)<2.1);
}
export function stepHotelDoors(doors,players,dt){
  for(const f of hotel.fronts){
    const old=doors.hotel?.[f.id]??0;
    const open=players.some(p=>hotelEntrance(p)===f);
    const amount=open?Math.min(1,old+dt*3.5):Math.max(0,old-dt*1.3);
    if(amount===old)continue;
    if(amount)(doors.hotel??={})[f.id]=amount;
    else delete doors.hotel[f.id];
  }
}
export function hotelDoorTop(x,z,pad,doors,width,floor,probe,round=false,building){
  for(const f of hotel.fronts){
    if(Math.abs(z-f.z)>.10+pad)continue;
    for(const pane of hotelGlass(f,doors?.hotel?.[f.id]??0,width,floor)){
      if(paneSupportLost(pane,doors,building))continue;
      if(Math.abs(z-pane.z)>.018+pad || Math.abs(x-pane.x)>width*.25+pad)continue;
      const inside=Math.abs(x-pane.x)+pad<pane.width/2 && probe>=pane.bottom &&
        probe<=pane.top && Math.abs(probe-(floor+1.01))>.018;
      if(!inside || (!round && !doors?.brokenPanes?.[pane.id]))return 3.1;
    }
  }
  return -Infinity;
}
