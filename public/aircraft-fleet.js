import {carrierDeckTop} from './eisenhower-carrier-layout.js';

export const jetKinds=['jet','jet2','jet3'];
export const helicopterKinds=['heli','heli2','heli3','heli4'];
export const carrierJetPads={
  jet2:{x:-321,z:-245,y:carrierDeckTop,yaw:0},
  jet3:{x:-301,z:-245,y:carrierDeckTop,yaw:0},
};
export const carrierHelipads={
  heli3:{x:-320,z:-165,y:carrierDeckTop},
  heli4:{x:-310,z:-120,y:carrierDeckTop},
};
export const isJetKind=kind=>jetKinds.includes(kind);
export const isHelicopterKind=kind=>helicopterKinds.includes(kind);
export const pilotJetKind=(world,id)=>jetKinds.find(kind=>world?.[kind]?.pilot===id);
export const pilotHelicopterKind=(world,id)=>helicopterKinds.find(kind=>world?.[kind]?.pilot===id);
export const crewHelicopterKind=(world,id)=>helicopterKinds.find(kind=>world?.[kind]?.pilot===id || world?.[kind]?.gunner===id);
