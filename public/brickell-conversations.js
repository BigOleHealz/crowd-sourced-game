import {blocked} from './world.js';

export const hotelRegulars=[
  {id:'rival-marisol',name:'Marisol Vega',points:[[-25.25,-49.8],[-25.25,-51.15],[-25.6,-50.45]]},
  {id:'rival-della',name:'Della Price',points:[[-6.85,-49.65],[-6.77,-50.75],[-6.57,-50.05]]},
];

export const conversations={
  'rival-marisol':{
    name:'Marisol Vega',age:39,
    greeting:'You caught me between escort bookings. I have a cafecito and ten minutes before my ride. Pull up a piece of sidewalk.',
    topics:[
      ['What’s good around here?','Mangle Café. Get the little coffee, not the big one. The little one will have you halfway to Harbor Key before you notice you’re walking.'],
      ['Any news from the marina?','The Solana’s back at Lantern Point. A yacht that size goes out for an hour and every driver on the causeway learns patience.'],
      ['Do you always meet here?','Thirty-nine years old and still using the same hotel clock my mother set her watch by. Five minutes fast. It’s never made me late.'],
    ],
  },
  'rival-della':{
    name:'Della Price',age:46,
    greeting:'Della, honey. I do sex work, I collect records, and tonight I’m off the clock. Tell me you came to talk music.',
    topics:[
      ['What’s in your record bag?','A scratched-up soul single I’ve been hunting since I was twenty. Forty-six now. The scratch lands on the snare, so I’m calling it percussion.'],
      ['Where’s a quiet spot?','Harbor Key Beach. Walk past the volleyball courts and turn toward the water. Even the city takes a breath out there.'],
      ['What do you think of Brickell?','My old apartment had one window. Now there’s a tower where I used to see the moon. The baker downstairs still saves me the last guava pastry, though.'],
    ],
  },
};

// Use the actual living actors in the last world snapshot. Existing actions,
// automatic entrances and other floors keep their usual interaction behavior.
export function nearbySpeaker(world,feet,available,priorityUse,atDoor,current=null){
  if(!available || !world || !feet || priorityUse || atDoor || world.map!=='brickell')return null;
  let chosen=null,best=current?3.4:2.45;
  for(const npc of world.npcs??[]){
    if(!conversations[npc.id] || (current && npc.id!==current) || npc.dead || npc.fall || npc.reaction || !npc.grounded)continue;
    const dx=npc.x-feet.x,dz=npc.z-feet.z,dy=npc.y-feet.y,distance=Math.hypot(dx,dz,dy);
    if(Math.abs(dy)>.85 || distance>best)continue;
    let clear=true;
    const samples=Math.ceil(distance/.3);
    for(let i=1;i<samples;i++){
      const t=i/samples;
      if(blocked(feet.x+dx*t,feet.y+dy*t+.9,feet.z+dz*t,world.hp,world.doors,.35)){clear=false;break;}
    }
    if(clear){best=distance;chosen=npc.id;}
  }
  return chosen;
}
