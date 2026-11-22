// The branch occupies the north frontage of the former midtown tower parcel.
export const bankParcelTowerId=5;
export const bankSite={name:'Biscayne Mutual Bank',x:-19,z:37.5,w:12.8,d:8,eave:4.0,rise:0,towerId:14};
export const bankFront=bankSite.z-bankSite.d/2;
export const bankRoadZ=27;
export const bankDesk={x:bankSite.x,y:.824,z:bankFront+3.3};
export const bankDoor={x:bankSite.x,z:bankFront-1.1};

// The staffed public hall remains a separate encounter area. Side doors admit
// players to two offices connected by a service corridor behind the teller.
export const bankServiceParts=[],bankServiceDoors=[];
function servicePart(kind,u,v,w,d,h=2.946,bottom=.824){
  bankServiceParts.push({kind,x:bankSite.x+u,z:bankFront+v,w,d,bottom,h});
}
const half=bankSite.w/2,lobbyHalf=2.66,wing=half-lobbyHalf,officeDepth=6.25;
for(const side of [-1,1]){
  const center=side*(half-wing/2),v=2.25;
  bankServiceDoors.push({x:bankSite.x+side*(half-.12),z:bankFront+v,axis:'z',width:1.50,label:side<0?'Branch office':'Member services'});
  bankServiceDoors.push({x:bankSite.x+center,z:bankFront+officeDepth,axis:'x',width:1.40,label:'Service corridor'});
  for(const [low,high] of [[0,v-.75],[v+.75,bankSite.d]])servicePart('exterior',side*(half-.13),(low+high)/2,.26,high-low);
  servicePart('lintel',side*(half-.13),v,.26,1.50,.79,2.98);
  servicePart('exterior',center,.12,wing,.24);
  const strip=(wing-1.40)/2;
  for(const sign of [-1,1])servicePart('partition',center+sign*(strip+1.40)/2,officeDepth,strip,.12);
  servicePart('lintel',center,officeDepth,1.40,.12,.79,2.98);
  servicePart('desk',center,4.65,1.62,.64,.76);
  servicePart('cabinet',side*(half-.55),5.55,.52,.66,1.23);
}
servicePart('exterior',0,bankSite.d-.12,bankSite.w,.24);
