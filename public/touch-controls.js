const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));

const gestures={
  foot:{name:'On foot',axis:'Move',look:'Drag to look',tip:'Drag the left stick to move. Swipe the open right side to look.',help:'Hold Fire to shoot. Drag on Fire to aim while shooting. Open Gear to sprint, change stance or switch weapons.'},
  car:{name:'Driver',axis:'Steer',up:'Gas',down:'Reverse',look:'Drag to look',tip:'Push up for gas, down to brake or reverse. Move the stick sideways to steer.',help:'Swipe the right side to look around. Open Driver tools for the horn and rear view.'},
  'armed-car':{name:'Pickup driver',axis:'Steer',up:'Gas',down:'Reverse',look:'Drag to look',tip:'Push up for gas, down to brake or reverse. Move the stick sideways to steer.',help:'Swipe to look around. Fire missile launches straight ahead. Change seats in Driver tools.'},
  tank:{name:'Tank driver',axis:'Steer',up:'Gas',down:'Reverse',look:'Drag to aim',tip:'Push up to drive and sideways to turn. Drag the right side to aim the cannon.',help:'Hold Cannon to fire. Down on the stick brakes or reverses.'},
  helm:{name:'Boat helm',axis:'Steer',up:'Ahead',down:'Astern',look:'Drag to look',tip:'Push up for forward throttle, down for reverse, and sideways to steer.',help:'Swipe the right side to look around. Use the labeled helm action to leave your station.'},
  heli:{name:'Helicopter pilot',axis:'Fly',up:'Forward',down:'Back',look:'Drag to look',tip:'Hold Climb to lift off. Drag the stick to fly and swipe the right side to turn your view.',help:'Hold Descend to lower altitude. Fire missile launches straight ahead. Flight tools contains the cargo hook and seat controls.'},
  jet:{name:'Jet pilot',axis:'Throttle',up:'Faster',down:'Slower',look:'Drag to fly',tip:'Push up for throttle. Drag up or down to pitch and sideways to bank.',help:'Hold Cannon for guns, tap Missile to launch, and tap Bomb to drop. Release the right thumb to center the flight stick.'},
  turret:{name:'Gunner',look:'Drag to aim',tip:'Drag the open right side to turn the turret. Hold Fire turret to shoot.',help:'You can aim while holding Fire turret by dragging that same thumb.'},
  seat:{name:'Seated',look:'Drag to look',tip:'Swipe the right side to look around. Tap Leave dance to stand.',help:'Your movement and equipment controls return when you stand.'},
  volleyball:{name:'Beach volleyball',axis:'Move',look:'Drag to look',tip:'Use the joystick to reach the landing marker. Tap Return as the ball comes down.',help:'Serve from behind your back line. Tap Leave volleyball to exit the game.'},
};
export function createTouchControls(canvas,{wake,look,endLook,action,menuOpened,blocked,releaseMouse}){
  const byId=id=>document.getElementById(id);
  const root=byId('touch-controls'),pad=byId('touch-pad'),knob=byId('touch-stick'),menu=byId('touch-menu');
  const quick=byId('touch-actions'),tools=byId('touch-tools'),opener=byId('touch-menu-open');
  const tip=byId('touch-tip'),lookCue=byId('touch-look'),reference=byId('touch-reference');
  const seen=new Set();
  try{for(const role of JSON.parse(localStorage.getItem('pinewatch.touchTips.v1')||'[]'))seen.add(role);}catch{}
  let tipRole=null,lastRole=null,sawStick=false,sawLook=false;
  function dismissTip(){
    if(tipRole){seen.add(tipRole);try{localStorage.setItem('pinewatch.touchTips.v1',JSON.stringify([...seen]));}catch{}}
    tip.hidden=true;tipRole=null;
  }
  function showTip(){
    if(!layout?.active || !visible)return;
    tipRole=layout.role;sawStick=sawLook=false;tip.querySelector('span').textContent=gestures[tipRole].tip;tip.hidden=false;
  }
  tip.querySelector('button').onclick=dismissTip;
  reference.querySelector('[data-replay-tip]').onclick=()=>{menu.close();showTip();};
  const primary=matchMedia('(pointer: coarse)');
  const holds=new Map(),buttons=new Map(),axes={x:0,y:0};
  let visible=false,moveId=null,lookId=null,prevX=0,prevY=0,originX=0,originY=0,radius=34;
  let current='',layout=null,stowed=[],hasGame=false;
  function capture(target,id){
    // A first touch may arrive while the desktop mouse lock is releasing.
    // Window listeners keep that contact live until its normal release.
    if(!document.pointerLockElement)target.setPointerCapture(id);
  }
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
    if(!on){reset();tip.hidden=true;lastRole=null;current='';if(menu.open)menu.close();tools.hidden=true;}
    if(on && document.pointerLockElement===canvas)releaseMouse();
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
    if(tipRole && amount>.35){sawStick=true;if(sawLook)dismissTip();}
    knob.style.transform='translate('+axes.x*radius+'px,'+-axes.y*radius+'px)';
  }
  pad.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch' || moveId!==null || blocked() || !hasGame)return;
    consume(e);wake();moveId=e.pointerId;
    const rect=pad.getBoundingClientRect();radius=rect.width*.34;
    originX=rect.left+rect.width/2;originY=rect.top+rect.height/2;
    capture(pad,moveId);padMotion(e);
  });
  function startLook(e){
    if(lookId!==null)return;
    lookId=e.pointerId;prevX=e.clientX;prevY=e.clientY;
  }
  canvas.addEventListener('pointerdown',e=>{
    if(e.pointerType!=='touch' || !visible || e.clientX<innerWidth*.36 || blocked() || !hasGame)return;
    consume(e);wake();startLook(e);capture(canvas,e.pointerId);
  });
  function press(e){
    const el=e.target.closest('button[data-action]');
    if(!el || e.pointerType!=='touch' || blocked() || !hasGame)return;
    consume(e);wake();capture(el,e.pointerId);
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
      const dx=e.clientX-prevX,dy=e.clientY-prevY;
      if(tipRole && Math.hypot(dx,dy)>2){sawLook=true;if(sawStick || !gestures[tipRole].axis)dismissTip();}
      consume(e);look(dx,dy);prevX=e.clientX;prevY=e.clientY;
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

  const options=menu.querySelector('[data-game-options]'),navigation=menu.querySelector('[data-navigation]'),
    objectives=menu.querySelector('[data-objectives]');
  // Reparent the live panels while the menu is open so the selectors,
  // scoreboard and map keep their original event handlers and updates.
  function showMenu(){
    if(menu.open)return;
    menuOpened();reset();tools.hidden=true;
    reference.open=navigation.open=objectives.open=false;
    const slots=[['#map-choice',options],['.session-controls',options],['.map-panel',navigation.lastElementChild],
      ['#match-card',objectives.lastElementChild],['#supply-card',objectives.lastElementChild],['#marina-card',objectives.lastElementChild]];
    stowed=slots.map(([selector,parent])=>{
      const el=document.querySelector(selector),slot=document.createComment(selector);
      el.before(slot);parent.append(el);return {el,slot};
    });
    menu.showModal();
  }
  opener.onclick=showMenu;menu.querySelector('[data-close]').onclick=()=>menu.close();
  menu.addEventListener('close',()=>{for(const {el,slot} of stowed)slot.replaceWith(el);stowed=[];if(byId('guide').hidden)canvas.focus({preventScroll:true});});
  menu.querySelector('[data-world-guide]').onclick=()=>{menu.close();byId('help').click();};
  function setButtons(row,entries){
    const visibleCodes=new Set();
    for(const [code,label,disabled=false] of entries){
      let button=buttons.get(row.id+'/'+code);
      if(!button){
        button=document.createElement('button');button.type='button';button.className='touch-button';
        button.dataset.action=code;buttons.set(row.id+'/'+code,button);row.append(button);
      }
      button.hidden=false;button.disabled=disabled;
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
    const g=gestures[config.role];
    root.dataset.role=config.role;
    pad.querySelector('.pad-up').textContent=g.up||'▴';pad.querySelector('.pad-down').textContent=g.down||'▾';
    byId('touch-axis-label').textContent=g.axis||'';pad.setAttribute('aria-label',g.name+' joystick');
    lookCue.querySelector('span').textContent=g.look;
    reference.querySelector('h3').textContent=g.name;reference.querySelector('p').textContent=g.tip+' '+g.help;
    pad.hidden=!hasGame || !g.axis;quick.hidden=lookCue.hidden=!hasGame;
    if(!hasGame){tip.hidden=true;tipRole=null;lastRole=null;}
    else if(lastRole!==config.role){
      tipRole=null;tip.hidden=true;tools.hidden=true;lastRole=config.role;
      if(!seen.has(lastRole))showTip();
    }
    if(!hasGame){reset();tools.hidden=true;}
    setButtons(quick,config.quick);setButtons(tools,config.tools);
  }
  return {get active(){return visible;},axes,reset,render,
    down(code){for(const button of holds.values())if(button.dataset.action===code)return true;return false;}};
}

export function touchUseLabel(use){
  if(use?.role==='drive' && use.target!=='tank' && use.label.startsWith('Drive ')){
    return 'Get in '+use.label.slice(6);
  }
  return use?.label;
}

export function touchLayout({role,active,use,stance,canAim,sighted,jump,sprint,seat,occupancy,hook,caseAction,race,replay}){
  const foot=role==='foot',heli=role==='heli',jet=role==='jet';
  const quick=[],extra=[];
  if(use)quick.push(['KeyE',use]);
  if(canAim)quick.push(['aim',sighted?'Lower sight':'Aim']);
  if((foot || role==='volleyball') && jump)quick.push(['Space',jump]);
  if(heli)quick.push(['Space','Climb'],['ShiftLeft','Descend']);
  if(jet)quick.push(['KeyR','Missile'],['KeyB','Bomb']);
  if(foot?canAim:['heli','jet','armed-car','turret','tank'].includes(role)){
    const label=heli || role==='armed-car'?'Fire missile':role==='turret'?'Fire turret':jet || role==='tank'?'Cannon':'Fire';
    quick.push(['KeyF',label]);
  }
  if(foot){
    if(stance)extra.push(['KeyC',stance==='crouch'?'Stand':'Crouch'],['KeyZ',stance==='prone'?'Stand':'Prone'],['run',sprint?'Walk':'Sprint']);
    if(canAim)extra.push(['tool','Switch weapon']);
    if(caseAction)extra.push(['KeyG','Handle case']);
    if(replay)extra.push(['KeyR','Replay']);
  }
  if(seat)seat.forEach((name,i)=>{
    const occupied=occupancy?.[i];
    extra.push(['Digit'+(i+1),occupied?name+' · '+occupied:name+' seat',!!occupied]);
  });
  if(heli)extra.push([hook?'KeyL':'KeyK',hook?'Release load':'Hold hook']);
  if(['armed-car','car'].includes(role))extra.push(['KeyH','Horn'],['KeyV','Look back']);
  if(race)extra.push(['KeyT','Marina Sprint']);
  const toolsName=foot?'Gear':heli || jet?'Flight tools':role==='helm' || role==='turret'?'Crew tools':'Driver tools';
  if(extra.length)quick.push(['more',toolsName]);
  return {active,role,axis:gestures[role].axis,quick,tools:extra};
}
