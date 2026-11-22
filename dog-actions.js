import {nearDog,carriedDog,takeDog,kickDog,throwDog} from './public/dog-walkers.js';

export function requestDogAction(world,player,input,ticks){
  if(ticks<(player.nextDogAction??0))return;
  let success=false;
  const held=carriedDog(world,player.id);
  if(input.action==='toss' && held && held.id===input.target && Number.isFinite(input.yaw) && Number.isFinite(input.pitch)){
    success=throwDog(world,player,{yaw:input.yaw%(2*Math.PI),pitch:Math.max(-Math.PI/2,Math.min(Math.PI/2,input.pitch))});
  }else if(!held && (input.action==='take' || input.action==='kick')){
    const dog=nearDog(world,player);
    if(dog && dog.id===input.target)success=input.action==='take'?takeDog(world,player,dog):kickDog(world,player,dog,ticks);
  }
  if(success)player.nextDogAction=ticks+9;
}
