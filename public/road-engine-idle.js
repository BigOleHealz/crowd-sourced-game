// Low-frequency movement transmitted through the motor mounts. Units are metres
// and radians. The caller restores the chassis suspension pose before each call.
const engines={
  pickup:[5.7,.0046,.0022],jeep:[6.8,.0041,.0028],supercar:[8.3,.0025,.0013],
  engine:[4.2,.0057,.0026],sedan:[7.1,.0025,.0015],hatchback:[7.8,.0035,.0021],van:[5.1,.0052,.0027],
};
export function roadEngineIdle(model,id=model){
  const [hz,travel,rock]=engines[model];
  let phase=0,strength=0;
  for(const c of String(id))phase=(phase*13+c.charCodeAt(0)*.32)%(2*Math.PI);
  return (body,car,dt)=>{
    const running=!car.wrecked && !car.bridgeFlight && (car.driver!=null || car.npcDriver!=null);
    const target=running?Math.max(0,1-Math.abs(car.speed??0)/3.5):0;
    const step=Math.max(0,Math.min(.1,dt||0));
    strength+=(target-strength)*(1-Math.exp(-step*12));
    if(strength<.001)return;
    phase=(phase+2*Math.PI*hz*step)%(2*Math.PI);
    const pulse=Math.sin(phase),harmonic=Math.sin(2*phase+.70);
    body.position.y+=strength*travel*(.74*pulse+.26*harmonic);
    body.rotation.z+=strength*rock*(.66*Math.cos(phase)+.34*harmonic);
    body.rotation.x+=strength*rock*.36*Math.sin(phase-.55);
  };
}
