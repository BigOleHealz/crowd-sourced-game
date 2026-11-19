import assert from 'node:assert/strict';
process.env.PINEWATCH_MAP='brickell';
const {hotel,hotelPanels,stepHotelDoors}=await import('../public/maravela-hotel.js');
const {galleryDoorWidth,galleryRoomAt,galleryPlans,galleryFloor}=await import('../public/gallery-lobbies.js');
const {stepPlayer,buildingTopAt,groundHeight}=await import('../public/world.js');
const plan=galleryPlans.find(p=>p.hotel);
assert.equal(plan.rooms.length,1);assert.deepEqual(plan.rooms[0].entries,[-57,-49]);
assert.equal(galleryPlans.filter(p=>p.hotel).length,1);
for(const f of hotel.fronts){
 const start=f.z+f.side*1.55,doors={};
 assert(buildingTopAt(hotel.x,f.z,.2,2.3,doors)>2.3,'closed door');
 let p={x:hotel.x,y:groundHeight(hotel.x,start),z:start,grounded:true,vy:0};
 let crossed=0;
 for(let t=0;t<125;t++){
  stepHotelDoors(doors,[p],1/30);
  p=stepPlayer(p,{x:0,z:-f.side},1/30,{}, {doors});
  if(galleryRoomAt(p.x,p.y,p.z)?.name===hotel.name)crossed++;
 }
 assert(crossed>36 && (p.z-hotel.z)*-f.side>5.2,'continuous street to waterfront crossing');
 for(let t=0;t<35;t++)stepHotelDoors(doors,[],1/30);
 assert.deepEqual(doors.hotel,{});
 const [left,right]=hotelPanels(f,1,galleryDoorWidth);
 assert(right.x-left.x-right.w>1.30,'open double slider clears human and camera');
}
assert(buildingTopAt(hotel.desk.x,hotel.desk.z,0,1.95,{})>=galleryFloor+1);
assert(buildingTopAt(hotel.cart.x,hotel.cart.z,0,1.95,{})>=galleryFloor+1);
console.log('PASS one named mainland through-hotel, solid furnishings, double sliders open and close, continuous walk from both exterior streets');
