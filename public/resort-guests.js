// Short circuits beside the valet stand and in the lounge, clear of both doors.
export const resortGuests=[
  {id:'rival-mateus',name:'Mateus Costa',points:[[-66.8,42.2],[-67.2,41.4],[-66.75,40.6]]},
  {id:'rival-simone',name:'Simone Baptiste',points:[[-70.2,92.05],[-68.9,91.8],[-69.5,92.25]]},
  {id:'rival-lucia',name:'Lucía Navarro',points:[[-84.2,47.9],[-84,49.0],[-83.5,48.5]]},
  {id:'rival-adele',name:'Adèle Laurent',points:[[-75.75,49.8],[-76.6,50.35],[-75.8,50.75]]},
  {id:'rival-kenji',name:'Kenji Sato',points:[[-56.0,96.35],[-56.8,96.4],[-56.5,96.84]]},
  {id:'rival-victor',name:'Victor Nwosu',points:[[-22.7,76.3],[-22.0,76.5],[-22.4,76.0]]},
];

export const resortConversations={
  'rival-mateus':{
    name:'Mateus Costa',age:34,
    greeting:'Evening. I’m Mateus, on valet tonight. You can take either of the display cars for a spin.',
    topics:[
      ['Which one would you drive?','The green Lamborghini. You sit so low you see your own reflection in the puddles. The red Ferrari sounds better off the line, though.'],
      ['Where are the cars?','Take the avenue south to the raised fountain court. The Lamborghini and Ferrari are in the two display bays on the city side of the fountain.'],
      ['Where’s the lounge?','The south arcade has sofas facing the bay. Take either guest lift up to Overture and walk across the glass bridge.'],
    ],
  },
  'rival-lucia':{
    name:'Lucía Navarro',age:33,
    greeting:'I’m Lucía. I work as an escort. My client called it a night, so I finally get the sofa to myself.',
    topics:[
      ['How’s your night going?','Pretty good. I talked him into leaving while he was ahead, and now I have time to catch the last song at Lucero.'],
      ['Do you come here often?','Sometimes. I mostly come for the people. You can tell who just won without looking at the table. They start offering to carry things.'],
    ],
  },
  'rival-adele':{
    name:'Adèle Laurent',age:42,
    greeting:'Adèle. I’m between escort bookings and trying to decide whether the evening calls for coffee or a walk.',
    topics:[
      ['Where would you go for a walk?','Down to the water. From the seawall you can see the old causeway lights come on one at a time.'],
      ['Is the casino your usual spot?','I’m more of a card player at home. My aunt taught me gin rummy and still calls every Sunday to ask if I’ve gotten better.'],
    ],
  },
};
