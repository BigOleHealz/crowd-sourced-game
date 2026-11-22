// Short circuits beside the valet stand and in the lounge, clear of both doors.
export const resortGuests=[
  {id:'rival-mateus',name:'Mateus Costa',points:[[-59.45,56.05],[-58.47,56.17],[-59.15,56.65]]},
  {id:'rival-simone',name:'Simone Baptiste',points:[[-51.8,56.35],[-51.35,57.65],[-52.27,57.61]]},
  {id:'rival-lucia',name:'Lucía Navarro',points:[[-65.90,46.18],[-65.95,47.55],[-66.55,47.03]]},
  {id:'rival-adele',name:'Adèle Laurent',points:[[-59.5,49.4],[-60.32,50.26],[-59.54,50.99]]},
  {id:'rival-kenji',name:'Kenji Sato',points:[[-65.85,49.29],[-66.12,50.04],[-66.05,48.46]]},
  {id:'rival-victor',name:'Victor Nwosu',points:[[-50.0,48.0],[-48.97,48.15],[-48.58,48.99]]},
];

export const resortConversations={
  'rival-mateus':{
    name:'Mateus Costa',age:34,
    greeting:'Evening. I’m Mateus, on valet tonight. You can take either of the display cars for a spin.',
    topics:[
      ['Which one would you drive?','The green Lamborghini. You sit so low you see your own reflection in the puddles. The red Ferrari sounds better off the line, though.'],
      ['Where’s the lounge?','Through the doors and to your left. There’s a sofa along the west wall if you need a break from the floor.'],
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
