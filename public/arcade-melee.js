// Arcade distances are in world units; all timing uses 30 Hz simulation ticks.
export const meleeItems={
  7:{name:'Baseball bat',range:1.85,damage:28,windup:5,cooldown:20,halfArc:.95},
};
const slots=[1,2,3,4,5,6,...Object.keys(meleeItems).map(Number)];
export const equipmentKeys=slots.map(slot=>'Digit'+slot);
export const validEquipment=slot=>slots.includes(slot);
export const nextEquipment=slot=>slots[(slots.indexOf(slot)+1)%slots.length];
