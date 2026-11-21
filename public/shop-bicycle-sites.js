export function shopBicycles(faces){
  return faces.flatMap(face=>(face.cycleDisplays || []).map((at,i)=>({
    ...at,id:'shop-bike-'+face.id+'-'+i,kind:'bike',label:'bicycle',shop:face.name,rider:null
  })));
}

