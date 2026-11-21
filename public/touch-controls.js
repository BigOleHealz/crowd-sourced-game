const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

export function createTouchControls(canvas,{wake,look,endLook,action,menuOpened,blocked}){
  const byId=id=>document.getElementById(id);
  const root=byId('touch-controls'),pad=byId('touch-pad'),knob=byId('touch-stick'),menu=byId('touch-menu');
  const quick=byId('touch-actions'),tools=byId('touch-tools'),opener=byId('touch-menu-open');
  const primary=matchMedia('(pointer: coarse)');
  const holds=new Map(),buttons=new Map(),axes={x:0,y:0};
  let visible=false,moveId=null,lookId=null,prevX=0,prevY=0,originX=0,originY=0,radius=34;
  let current='',layout=null,stowed=[],hasGame=false;
  function consume(e){e.preventDefault();e.stopPropagation();}
  function clearPad(){
    moveId=null;axes.x=axes.y=0;knob.style.transform='';
  }
  function reset(){
    clearPad();tools.hidden=true;quick.querySelector('[data-action=more]')?.setAttribute('aria-expanded','false');
    if(lookId!==null)endLook();
    lookId=null;
    for(const el of holds.values())el.classList.remove('down');
    holds.clear();
  }
  function setMode(on){
    if(visible===on)return;
    visible=on;root.hidden=!on;document.documentElement.classList.toggle('touch-play',on);
    if(!on){reset();if(menu.open)menu.close();tools.hidden=true;}
    if(on && layout)render(layout);
  }
  setMode(primary.matches);
  primary.addEventListener('change',e=>setMode(e.matches));
  document.addEventListener('pointerdown',e=>{
    if(e.pointerType==='touch')setMode(true);
    else if(e.pointerType==='mouse' && e.target===canvas)setMode(false);
  },true);

  function padMotion(e){
    const dx=(e.clientX-originX)/radius,dy=(e.clientY-originY)/radius;
    const distance=Math.hypot(dx,dy),amount=clamp((distance-.10)/.90,0,1);
    axes.x=distance?dx/distance*amount:0;axes.y=distance?-dy/distance*amount:0;
    knob.style.transform='translate('+axes.x*radius+'px,'+-axes.y*radius+'px)';
  }
  pad.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch' || moveId!==null || blocked() || !hasGame)return;
    consume(e);wake();moveId=e.pointerId;
    const rect=pad.getBoundingClientRect();radius=rect.width*.34;
    originX=rect.left+rect.width/2;originY=rect.top+rect.height/2;
    pad.setPointerCapture(moveId);padMotion(e);
  });
  function startLook(e){
    if(lookId!==null)return;
    lookId=e.pointerId;prevX=e.clientX;prevY=e.clientY;
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch' || !visible || e.clientX<innerWidth*.36 || blocked() || !hasGame)return;
    consume(e);wake();startLook(e);canvas.setPointerCapture(e.pointerId);
  });
  function press(e){
    const el=e.target.closest('button[data-action]');
    if(!el || e.pointerType!=='touch' || blocked() || !hasGame)return;
    consume(e);wake();el.setPointerCapture(e.pointerId);
    const code=el.dataset.action;
    holds.set(e.pointerId,el);el.classList.add('down');
    if(code==='more'){tools.hidden=!tools.hidden;el.setAttribute('aria-expanded',String(!tools.hidden));return;}
    if(code==='KeyF')startLook(e);
    action(code);
    if(tools.contains(el) && !['KeyK','KeyV','ShiftLeft'].includes(code))tools.hidden=true;
  }
  quick.addEventListener('pointerdown',press);tools.addEventListener('pointerdown',press);
  function buttonClick(e){
    if(e.detail!==0 && e.pointerType!=='mouse')return;
    const btn=e.target.closest('button[data-action]');if(!btn || blocked() || !hasGame)return;
    if(btn.dataset.action==='more'){tools.hidden=!tools.hidden;return;}
    action(btn.dataset.action);
  }
  quick.addEventListener('click',buttonClick);tools.addEventListener('click',buttonClick);
  window.addEventListener('pointermove',e=>{
    if(e.pointerType!=='touch' || !visible)return;
    if(e.pointerId===moveId){consume(e);padMotion(e);}
    if(e.pointerId===lookId){
      consume(e);look(e.clientX-prevX,e.clientY-prevY);prevX=e.clientX;prevY=e.clientY;
    }
  },{passive:false});
  function release(e){
    if(e.pointerId===moveId)clearPad();
    if(e.pointerId===lookId){lookId=null;endLook();}
    const button=holds.get(e.pointerId);
    if(button){holds.delete(e.pointerId);if(![...holds.values()].includes(button))button.classList.remove('down');}
  }
  for(const event of ['pointerup','pointercancel','lostpointercapture'])window.addEventListener(event,release,true);
  window.addEventListener('resize',()=>{if(visible){reset();menuOpened();}});
  window.addEventListener('pagehide',reset);
  window.addEventListener('blur',reset);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)reset();});

  const options=menu.querySelector('[data-game-options]');
  // Reuse the game's native selectors and panels so match status and preferences
  // remain live when a phone menu is open.
  function showMenu(){
    if(menu.open)return;
    menuOpened();reset();tools.hidden=true;
    stowed=['#map-choice','.session-controls','.map-panel','#match-card','#supply-card','#marina-card','#help'].map(selector=>{
      const el=document.querySelector(selector),slot=document.createComment(selector);
      el.before(slot);options.append(el);return {el,slot};
    });
    menu.showModal();
  }
  opener.onclick=showMenu;menu.querySelector('[data-close]').onclick=()=>menu.close();
  menu.addEventListener('close',()=>{for(const {el,slot} of stowed)slot.replaceWith(el);stowed=[];canvas.focus({preventScroll:true});});
  byId('help').addEventListener('click',()=>{if(menu.open)menu.close();});
  function setButtons(row,entries){
    const visibleCodes=new Set();
    for(const [code,label] of entries){
      let button=buttons.get(row.id+'/'+code);
      if(!button){
        button=document.createElement('button');button.type='button';button.className='touch-button';
        button.dataset.action=code;buttons.set(row.id+'/'+code,button);row.append(button);
      }
      button.hidden=false;
      if(button.textContent!==label)button.textContent=label;
      if(code==='more'){button.setAttribute('aria-controls','touch-tools');button.setAttribute('aria-expanded',String(!tools.hidden));}
      visibleCodes.add(code);
    }
    for(const el of row.children)if(!visibleCodes.has(el.dataset.action)){
      el.hidden=true;
      for(const [id,button] of holds)if(button===el)release({pointerId:id});
    }
  }
  function render(config){
    layout=config;hasGame=config.active;
    if(!visible)return;
    const key=JSON.stringify(config);
    if(key===current)return;
    current=key;
    byId('touch-axis-label').textContent=config.axis;
    pad.hidden=quick.hidden=!hasGame;
    if(!hasGame){reset();tools.hidden=true;}
    setButtons(quick,config.quick);setButtons(tools,config.tools);
  }
  return {get active(){return visible;},axes,reset,render,
    down(code){for(const button of holds.values())if(button.dataset.action===code)return true;return false;}};
}

export function touchLayout({role,active,use,stance,canAim,sighted,jump,sprint,seat,hook,caseAction,race,replay}){
  const foot=role==='foot',heli=role==='heli',jet=role==='jet';
  const quick=[],extra=[];
  if(use)quick.push(['KeyE',use]);
  if(canAim)quick.push(['aim',sighted?'Lower sight':'Aim']);
  if(foot && jump)quick.push(['Space',jump]);
  if(heli)quick.push(['Space','Climb'],['ShiftLeft','Descend']);
  if(jet)quick.push(['KeyR','Missile'],['KeyB','Bomb']);
  if(foot?canAim:['heli','jet','armed-car','turret','tank'].includes(role)){
    quick.push(['KeyF',heli || role==='armed-car'?'Missile':'Fire']);
  }
  if(foot){
    if(stance)extra.push(['KeyC',stance==='crouch'?'Stand':'Crouch'],['KeyZ',stance==='prone'?'Stand':'Prone'],['run',sprint?'Walk':'Sprint']);
    if(canAim)extra.push(['tool','Switch weapon']);
    if(caseAction)extra.push(['KeyG','Handle case']);
    if(replay)extra.push(['KeyR','Replay']);
  }
  if(seat)extra.push(['Digit1',seat[0]],['Digit2',seat[1]]);
  if(heli)extra.push([hook?'KeyL':'KeyK',hook?'Release load':'Hold hook']);
  if(['armed-car','car'].includes(role))extra.push(['KeyH','Horn'],['KeyV','Look back']);
  if(race)extra.push(['KeyT','Marina Sprint']);
  if(extra.length)quick.push(['more','Actions']);
  return {active,axis:foot?'Move':heli?'Fly':jet?'Throttle':role==='helm'?'Helm':role==='turret'?'Look':'Drive',quick,tools:extra};
}
