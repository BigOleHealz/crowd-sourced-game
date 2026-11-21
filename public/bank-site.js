// The branch fronts the cross street just north of the helicopter pad. Its
// footprint is appended after older properties to preserve their network IDs.
export const bankSite={name:'Biscayne Mutual Bank',x:18,z:1.4,w:12.8,d:8,eave:4.0,rise:0,towerId:14};
export const bankFront=bankSite.z-bankSite.d/2;
export const bankRoadZ=-9;
export const bankDesk={x:bankSite.x,y:.824,z:bankFront+3.3};
export const bankDoor={x:bankSite.x,z:bankFront-1.1};
