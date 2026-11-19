// A snapshot can repeat an impact for many frames. A new life or socket
// establishes its own baseline, so neither can replay an old hit.
export function confirmedShot(previous,current){
  return Boolean(previous && current && !previous.dead && current.hp<previous.hp &&
    current.lastShotTick!=null && current.lastShotTick!==previous.lastShotTick);
}
export function shotDamageVignette(element){
  let hold;
  return {
    update(previous,current){
      if(!confirmedShot(previous,current))return;
      clearTimeout(hold);
      if(!element.classList.contains('struck'))element.classList.add('struck');
      // Bridge the carbine cadence and ordinary snapshot jitter during a burst.
      hold=setTimeout(()=>element.classList.remove('struck'),320);
    },
    reset(){
      clearTimeout(hold);
      element.classList.remove('struck');
      for(const animation of element.getAnimations())animation.cancel();
    }
  };
}
