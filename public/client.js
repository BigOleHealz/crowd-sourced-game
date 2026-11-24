import {sidearmSlot,sidearmCar,hasMountedTool} from './car-sidearm.js';
import {activeCast,fishingDetail,fishingLabel,fishingSpot} from './pier-fishing.js';
import {equipmentKeys,meleeItems,nextEquipment} from './arcade-melee.js';
import {nearDog,carriedDog} from './dog-walkers.js';
import {footStickPace} from './foot-stick.js';
import {diveScorecard} from './dive-scorecard.js';
import {marinaPlatform,platformLadderAt} from './marina-platform.js';
import {takeoffBoard,entryBeat} from './estate-diving.js';
import {civilianProfiles} from './civilian-fleet.js';
import {casinoPanel} from './casino-panel.js';
import {fanDecks,arcadeDecks,supperDeck,shorePads,valet,resortArrivals} from './palma-site.js';
import {nearBlackjack} from './casino-layout.js';
import {safeInReach} from './estate-safes.js';
import {nearbySidearm} from './market-goods.js';
import {yachtDoorAction} from './yacht-layout.js';
import {elevatorControls} from './elevator-controls.js';
import {buildingAction,doorIsOpen,roomAtFeet,ridingHotelShaft} from './building-interiors.js';
import {marinaDecks} from './marina-docks.js';
import {bankConversation,bankBulletin} from './bank-conversation.js';
import {atBankDesk,bankPrompt} from './bank-rules.js';
import {atMarketCounter} from './market-goods.js';
import {marketPanel} from './market-panel.js';
import {atBeachClub,barMenu,beachClubAction,beachClubLabel,pourTicks} from './beach-club.js';
import {inClub,inBoothAisle,nearClubDoor} from './club-lucero.js';
import {breathSeconds} from './scuba.js';
import {canSpearfish} from './spearfishing.js';
import {fishSpecies} from './reef-fish.js';
import {createTouchControls,touchLayout,touchUseLabel} from './touch-controls.js';
import {inSkatePark} from './skate-park.js';
import {basketballCourt,basketballTeams,hoopHeading,onBasketballCourt} from './basketball-layout.js';
import {basketballHud} from './basketball-hud.js';
import {nearbySpeaker,conversations} from './brickell-conversations.js';
import {conversationView} from './conversation-view.js';
import {boardingSeconds} from './road-cabin.js';
import {hotelEntrance} from './maravela-hotel.js';
import {automaticPump,fuelVehicle,fuelSiteFor,fuelSites} from './vehicle-fuel.js';
import {roadGarages,garageAt,needsRoadRepair} from './road-garages.js';
import {roadFraming} from './road-chase.js';
import {SnapshotClock} from './snapshot-clock.js';
import {driverPrediction} from './driver-prediction.js';
import {launcherSpec,lockLabel} from './handheld-launcher.js';
import {frozenPhase,modes,teamColors} from './island-rules.js';
import {zombieMode} from './zombie-arena.js';
import {survivalHud} from './zombie-hud.js';
import {drawMatchMap,updateMatchHud} from './island-hud.js';
import {church,churchPath,churchLot} from './ridge-church.js';
import {casaRoomAt} from './casa-luma.js';
import {inPalazzoMare} from './palazzo-mare.js';
import {lanternBuildings} from './lantern-buildings-layout.js';
import {lanternLand,lanternRoads,lanternBridge,ferrySlip,marketPiers,lanternLocation} from './lantern-point.js';
import {keyShores} from './offshore-keys.js';
import {viewPitch} from './view-pitch.js';
import {shotDamageVignette} from './shot-damage-vignette.js';
import {liveShots} from './shot-events.js';
import {retailRoom} from './frontage-glass.js';
import {galleryRoomAt} from './gallery-lobbies.js';
import {storefrontRoom} from './storefront-layout.js';
import {aboardYacht,carryOnYacht,yachtHelmFeet,yachtPrompt} from './yacht-layout.js';
import {crewBoat,helmFeet,localBoatFrame} from './patrol-boats.js';
import {marinaModel} from './marina-fleet-layout.js';
import { createGameAudio } from './game-audio.js';
import {firearmSpecs} from './rounds.js';
import {arcadeMolotov} from './arcade-molotov.js';
import {flameProjector} from './fire-sites.js';
const equipmentSpecs={...firearmSpecs,4:launcherSpec,5:flameProjector,6:arcadeMolotov,...meleeItems};
import {seatVehicle,seatChoices} from './seat-selection.js';
import { onBeach, beach, courts } from './beach-layout.js';
import { updateSupplyHud, drawSupplyMap } from './supply-view.js';
import { interpolateSuspension } from './road-suspension.js';
import { createScene } from './scene.js';
import { gunnerVehicle, gunnerFeet, vehicleById } from './mounts.js';
import { drivenRoad } from './rover.js';
import { streetPlan, coast, harbor, causeway } from './brickell-map.js';
import { CITY, MAP, travelBounds, BREAKABLES, stepPlayer } from './world.js';

import {reefDiveSite} from './reef-channel.js';
import {destinations,landmarkGuide} from './landmark-navigation.js';
import {sprintHud} from './marina-sprint-view.js';
import {courtHalfLength,courtHalfWidth,volleyballMember} from './volleyball-court.js';
import {volleyballHud,volleyballScoreboard} from './volleyball-hud.js';
import {marinaMode,sprintStart,sprintGates} from './marina-sprint.js';
let sprintBoard=[];
const byId = id => document.getElementById(id);
const damageEdges=shotDamageVignette(byId('damage-edges'));
const canvas = byId('game');
const lighting=byId('lighting-choice');
const costume=byId('parade-costume');
try{costume.checked=localStorage.getItem('pinewatch.paradeCostume')==='on';}catch{}
costume.onchange=()=>{
  try{localStorage.setItem('pinewatch.paradeCostume',costume.checked?'on':'off');}catch{}
  if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'paradeCostume',enabled:costume.checked}));
};
const audio=createGameAudio(byId('sound-mute'),byId('sound-volume'),byId('sound-level'),byId('owner-caption'));
window.addEventListener('pointerdown',audio.unlock,{capture:true});
window.addEventListener('keydown',audio.unlock,{capture:true});
window.addEventListener('pagehide',()=>audio.reset());
const destinationsMenu=byId('destination');
for(const name of destinations.keys())destinationsMenu.add(new Option(name,name));
let navigate,route;
destinationsMenu.onchange=()=>{
  navigate=landmarkGuide(destinationsMenu.value);route=null;
  byId('nav-cue').hidden=!navigate;canvas.focus({preventScroll:true});
};
const selector=byId('map-choice');
const arrival=new URLSearchParams(location.search).get('arrival');
const chosen=new URLSearchParams(location.search).get('mode');
const zombies=CITY && chosen===zombieMode;
const racing=CITY && chosen===marinaMode;
const mode=CITY && Object.hasOwn(modes,chosen) ? chosen : null;
const modeGroup=document.createElement('optgroup');
modeGroup.label='Brickell team games';
for(const [key,rule] of Object.entries(modes))modeGroup.append(new Option(rule.name,key));
selector.append(new Option('Zombie Survival · Co-op',zombieMode),new Option('Brickell · Marina Sprint',marinaMode),modeGroup);
selector.value=zombies?zombieMode:racing?marinaMode:mode ?? (CITY ? 'brickell' : 'outpost');
selector.addEventListener('change',()=>{ const url=new URL(location.href);if(selector.value===zombieMode || selector.value===marinaMode || Object.hasOwn(modes,selector.value)){url.searchParams.set('map','brickell');url.searchParams.set('mode',selector.value);}else{url.searchParams.set('map',selector.value);url.searchParams.delete('mode');}location.assign(url); });
if(CITY) {
  document.title='Brickell · '+document.querySelector('.world-name h1').textContent;
  document.querySelector('.map-title span').textContent='District map';
  byId('map').setAttribute('aria-label','Brickell streets, waterfront and player locations');
}
byId('zombie-start').onclick=()=>{
  if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'startSurvival'}));
  canvas.focus({preventScroll:true});
};
const step = 1 / 30;
const camera = { yaw: 0, pitch: -0.15, distance: 5.6 };
let lastGlass=0;
let roverView = null, roadImpact=null;
const held = new Set();
let stickX=0, stickY=0;
const stickOutput=n=>Math.sign(n)*Math.max(0,Math.abs(n)-.06)/.94;
let lastPointer = null, pressedAim = null, releaseSwimTrigger=false;
let lookPaused=false;
const locked=()=>document.pointerLockElement===canvas;
let manualHolster=false,holsterSeq=0;
const canHandleGear = () => self && !atTable() && !self.liftTravel && !atYachtHelm() && !frozenPhase(world?.match?.phase) && world?.match?.phase!=='setup' && !self.dive && !playingHoops() && !self.ride && vitals.clubSince==null && !vitals.dead && !vitals.fall && !self.climb && !self.swimming && !vitals.swimming && !self.parachute && !isPilot() && !isDriving() && !gunnerRole() && !inVolleyball();
const canAim=()=>!activeCast(vitals.fishing) && !manualHolster && canHandleGear();
function setHolster(value){
  manualHolster=value;
  holsterSeq=seq+1;
  releaseSwimTrigger=!!(queuedFire || mouseFire || down('KeyF'));
  pressedAim=null;queuedFire=false;
  showSight(false);
}
function showSight(active) {
  camera.sighted = active;
  canvas.classList.toggle('sighted', active);
}
let windowBlurred = false;
let edgeYaw = 0, edgePitch = 0;
const headings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
const map = byId('map');
const ctx = map.getContext('2d');
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const mix = (a, b, t) => a + (b - a) * t;
const angleMix = (a, b, t) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;
let scene, socket, id, self, readShots, facing = 0, moving = false, sprint = false;
let vitals = {}, world = null, weapon = 1, queuedInteract = false, queuedReload = false, queuedFire = false, mouseFire = false;
const inVolleyball=()=>volleyballMember(world?.volleyball,id);
const volleyballStatus=()=>volleyballHud(world,self,id,canChangeStance(self) && !world?.basketball?.players.includes(id));
function volleyballAction(action){
  if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'volleyball',action}));
}
const playingHoops=()=>id!=null && Boolean(world?.basketball?.players.includes(id));
const showVolleyScore=volleyballScoreboard(byId('volleyball-score'));
const hoopsHud=basketballHud(byId('basketball-score'));
const myBoat=()=>crewBoat(world,id);
const atYachtHelm=()=>id!=null && world?.yacht?.driver===id;
const inTank=()=>id!=null && world?.tank?.driver===id;
const myRoad = () => inTank()?world.tank:drivenRoad(world,id);
const carNames={hatchback:'Hatchback',sedan:'Sedan',van:'Delivery van',engine:'Fire engine'};
const inEngine=()=>myRoad()?.model==='engine';
const unarmedRoad=()=>inGT() || Boolean(myRoad()?.model);
const inGT = () => myRoad()?.kind==='supercar';
const isDriving = () => id != null && (Boolean(myRoad()) || myBoat()?.driver===id || atYachtHelm());
let selectedCarPistol=false;
const carPistol=()=>{const car=sidearmCar(world,id);return car && (!hasMountedTool(car) || selectedCarPistol);};
const gunnerRole=()=>gunnerVehicle(world,id);
const jetPilot=()=>id!=null && world?.jet?.pilot===id;
const isPilot = () => id != null && (world?.heli.pilot === id || jetPilot());

const talk=conversationView(byId('conversation'),releaseLook,()=>{
  stopLook();lookPaused=false;canvas.classList.remove('look-paused');canvas.focus({preventScroll:true});
});
const market=marketPanel(byId('market-panel'),byId('wallet'),{
  enter:releaseLook,leave(){stopLook();lookPaused=false;canvas.classList.remove('look-paused');canvas.focus({preventScroll:true});},
  send(message){if(socket?.readyState!==WebSocket.OPEN)return false;socket.send(JSON.stringify(message));return true;}
});
function nearbySafe(){
  return world?.market && !vitals.use && canChangeStance(self)?safeInReach(self,world.doors):null;
}
function counter(){
  return world?.market && !vitals.use && canChangeStance(self)?atMarketCounter(self):null;
}
let interiorSeq=0;
function interiorAction(){
  const action=canChangeStance(self) && !frozenPhase(world?.match?.phase) && world?.match?.phase!=='setup' ? yachtDoorAction(world?.yacht,self)??buildingAction(self,world?.doors) : null;
  if(action?.kind==='slot' && vitals.slotResult?.slot===action.slot){
    const reels=vitals.slotResult.reels;
    return {...action,label:reels.join(' · ')+(new Set(reels).size===1?' — Jackpot!':'')+' · Spin again'};
  }
  if(action?.kind==='concierge' && vitals.resortStay){
    const {floor,key}=vitals.resortStay;
    return {...action,label:'Guest key · Suite '+((floor+1)*100+key%2+1)};
  }
  return action;
}
function sendInterior(action){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'interior',seq:++interiorSeq,...action}));}
const elevator=elevatorControls(byId('elevator-dialog'),(s,floor)=>sendInterior({building:s.p.id,floor}),releaseLook,()=>canvas.focus({preventScroll:true}));
let bankSeq=0,bankReceiptUntil=0;
function teller(){
  return world?.bank && !vitals.use && canChangeStance(self) && atBankDesk(self) ? bankPrompt(world.bank,id) : null;
}
function showBankReceipt(message){
  const receipt=byId('bank-receipt');
  receipt.textContent=message;
  receipt.hidden=false;
  bankReceiptUntil=performance.now()+5500;
}
function bankAction(action,serial,pursuit=false){
  if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'bank',action,seq:++bankSeq,serial,pursuit}));
}
const casino=casinoPanel(byId('casino-dialog'),msg=>{
  if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(msg));
},releaseLook,()=>{stopLook();lookPaused=false;canvas.classList.remove('look-paused');canvas.focus({preventScroll:true});});
const atTable=()=>id!=null && world?.casino?.player===id;
function tablePrompt(feet){
  if(!world?.casino || atTable() || !canChangeStance(feet) || !nearBlackjack(feet))return '';
  return world.casino.player==null?'Sit at blackjack':'Blackjack seat occupied';
}
const bankDialog=bankConversation(byId('bank-dialog'),{
  enter:releaseLook,
  leave(){stopLook();lookPaused=false;canvas.classList.remove('look-paused');canvas.focus({preventScroll:true});},
  confirm(serial,pursuit){if(teller()?.action==='talk')bankAction('rob',serial,pursuit);}
});
function openBag(){if(world?.market && canChangeStance(self) && !touchBlocked())market.open();}
byId('wallet').onclick=openBag;
byId('holster-control').onclick=()=>{if(canHandleGear()){setHolster(!manualHolster);canvas.focus({preventScroll:true});}};
function speaker(current=null){
  const available=canChangeStance(self) && byId('guide').hidden && !frozenPhase(world?.match?.phase) && world?.match?.phase!=='setup';
  return nearbySpeaker(world,self,available,vitals.use,self && hotelEntrance(self),current);
}
function canChangeStance(state) {
  return !playingHoops() && vitals.clubSince==null && !state?.ride && state?.grounded && !state.swimming && !state.climb && !state.parachute &&
    !vitals.dead && !vitals.fall && !isPilot() && !isDriving() && !gunnerRole();
}

let requestedStance;
let queuedSeat=null, queuedSeatKind=null;
let handleCase=false;
let queuedHorn=false,queuedBomb=false,queuedMissile=false;
let queuedReplay = false, queuedDeploy = false;
let queuedFlip=false;
let queuedSkateTrick;
let spearSequence=0;
let seq = 0, pending = [], samples = [], queuedJump = false, retry = 500;
let predictedDriver, nextFrame=0;
const snapshotClock=new SnapshotClock();
let accumulator = 0, lastTime = performance.now(), nextHud = 0;
const controls = new Set(['KeyP','KeyU','KeyX','KeyI','KeyK','KeyL','KeyV','KeyH','KeyB','KeyG','KeyW','KeyA','KeyS','KeyD','Space','ShiftLeft','ShiftRight','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyR','KeyJ',...equipmentKeys,'Digit0','KeyQ','KeyF','KeyE','KeyC','KeyZ']);

function notice(message = '') {
  byId('notice').textContent = message;
  byId('notice').hidden = !message;
}

function setGuide(open) {
  byId('guide').hidden = !open;
  if(open && talk.current)talk.close();
  if (open) byId('unstuck').disabled = !self || vitals.dead || (world?.match && frozenPhase(world.match.phase));
  if(open)releaseLook();
  byId('help').setAttribute('aria-expanded', String(open));
  clearInput();
  stopLook();
  if (!open) canvas.focus({ preventScroll: true });
}
let queuedScuba=false,queuedRefuel=false;
let touchSprint=false,handingMouseToTouch=false;
function touchBlocked(){return !byId('guide').hidden || !!document.querySelector('dialog[open], [aria-modal="true"]:not(dialog):not([hidden])');}
const touch=createTouchControls(canvas,{
  blocked:touchBlocked,
  releaseMouse(){
    handingMouseToTouch=true;clearInput();stopLook();document.exitPointerLock();
  },
  wake(){lookPaused=false;canvas.classList.remove('look-paused');stopLook();canvas.focus({preventScroll:true});},
  menuOpened:releaseLook,
  look(dx,dy){
    if(jetPilot()){
      const radius=Math.max(40,Math.min(innerWidth,innerHeight)*.20);
      stickX=clamp(stickX+dx/radius,-1,1);stickY=clamp(stickY-dy/radius,-1,1);
      byId('flight-cursor').style.transform='translate('+stickX*radius+'px,'+-stickY*radius+'px)';
    }else{
      camera.yaw+=dx*.0052;camera.pitch=viewPitch(camera.pitch-dy*.0041);
    }
  },
  endLook(){if(jetPilot()){stickX=stickY=0;byId('flight-cursor').style.transform='';}},
  action(code){
    if(code==='aim'){if(canAim() && !meleeItems[weapon])showSight(!camera.sighted);return;}
    if(code==='run'){touchSprint=!touchSprint;return;}
    if(code==='tool')code='KeyQ';
    if(code==='KeyT'){startMarinaSprint();return;}
    pressAction(code);
  },
});
const down=code=>held.has(code)||touch.down(code);
function clearInput() {
  touch.reset();touchSprint=false;queuedScuba=queuedRefuel=false;
  queuedHorn=queuedBomb=queuedMissile=false;
  stickX=stickY=0;byId('flight-cursor').style.transform='';
  handleCase=false;
  showSight(false);
  held.clear();
  requestedStance = undefined;
  queuedSeat=queuedSeatKind=null;
  pressedAim = null;
  queuedReplay = queuedDeploy = false;
  queuedSkateTrick=undefined;
  queuedFlip = queuedJump = queuedInteract = queuedReload = queuedFire = mouseFire = false;
}
function stopLook() { lastPointer = null; edgeYaw = 0; edgePitch = 0; }
function releaseLook(){
  lookPaused=true;
  canvas.classList.add('look-paused');
  if(locked())document.exitPointerLock();
  clearInput();stopLook();
}
document.addEventListener('pointerlockchange',()=>{
  canvas.classList.toggle('captured',locked());
  if(locked()){lookPaused=false;canvas.classList.remove('look-paused');stopLook();}
  else if(handingMouseToTouch){
    handingMouseToTouch=false;
    if(!touchBlocked() && !windowBlurred && !document.hidden){lookPaused=false;canvas.classList.remove('look-paused');}
  }else releaseLook();
});
function pauseControls() { releaseLook(); }
byId('sound-mute').onclick = e => {
  audio.toggleMute();
  if (e.detail && byId('guide').hidden) canvas.focus({ preventScroll: true });
};
const wantedButton=byId('wanted-toggle'),wantedStatus=byId('wanted-status');
let lastWantedHud;
function wantedHud(state){
  const key=state?[state.enabled,state.stars,state.phase,state.phase==='search'?state.escapeSeconds:0].join('/'):'offline';
  if(key===lastWantedHud)return;
  lastWantedHud=key;
  wantedButton.hidden=!!mode || zombies;
  wantedButton.disabled=!state;
  const enabled=!!state?.enabled;
  wantedButton.setAttribute('aria-pressed',String(enabled));wantedButton.textContent=enabled?'Police on':'Police off';
  wantedStatus.hidden=!enabled;
  if(enabled){
    const stars=state.stars?'★'.repeat(state.stars)+'☆'.repeat(5-state.stars):'';
    wantedStatus.textContent=state.stars?stars+'  '+(state.phase==='search'?'Searching · '+state.escapeSeconds+'s':'In pursuit'):'Wanted level clear';
    wantedStatus.setAttribute('aria-label',state.stars+' of 5 wanted stars, '+state.phase);
  }
}
wantedHud();
wantedButton.onclick=()=>{
  if(mode || socket?.readyState!==WebSocket.OPEN)return;
  socket.send(JSON.stringify({type:'wantedMode',enabled:!vitals.wanted?.enabled}));
  canvas.focus({preventScroll:true});
};
byId('unstuck').onclick = () => {
  if (socket?.readyState !== WebSocket.OPEN || vitals.dead || !self) return;
  socket.send(JSON.stringify({type:'unstuck'}));
  setGuide(false);
};
byId('help').onclick = () => setGuide(byId('guide').hidden);
byId('close-guide').onclick = () => setGuide(false);
window.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if(elevator.open){if(e.code==='Escape' || e.code==='KeyE'){e.preventDefault();if(!e.repeat)elevator.close();}return;}
  if(byId('casino-dialog').open)return;
  if(bankDialog.open){
    if(e.code==='KeyE' || e.code==='Escape'){
      e.preventDefault();
      if(!e.repeat)bankDialog.close();
    }
    return;
  }
  if(market.current){
    if(!e.repeat && ['Escape','KeyE','KeyI'].includes(e.code)){e.preventDefault();market.close();}
    return;
  }
  if(talk.current){
    if(e.repeat)return;
    if(['Escape','KeyE'].includes(e.code)){e.preventDefault();talk.close();}
    else if(['Digit1','Digit2','Digit3'].includes(e.code)){e.preventDefault();talk.answer(Number(e.key)-1);}
    else if(['KeyW','KeyA','KeyS','KeyD'].includes(e.code)){e.preventDefault();talk.close();held.add(e.code);}
    return;
  }
  if (e.key.toLowerCase() === 'm' && !e.target.closest?.('input, select, textarea, [contenteditable]')) {
    e.preventDefault();
    if (!e.repeat) audio.toggleMute();
    return;
  }
  if(touchBlocked() && byId('guide').hidden)return;
  if(e.code==='Enter' && zombies && !e.repeat && !touchBlocked() &&
    (e.target===canvas || e.target===document.body) &&
    (world?.survival?.phase==='lobby' || world?.survival?.phase==='finished')){
    e.preventDefault();
    byId('zombie-start').click();
    return;
  }
  if(e.code==='KeyT' && !e.repeat){startMarinaSprint();return;}
  if (e.key === '?' && !e.repeat) setGuide(byId('guide').hidden);
  if (e.code === 'Escape') {if(vitals.clubSince!=null)pressAction('KeyE');setGuide(false);releaseLook();return;}
  if (!byId('guide').hidden || !controls.has(e.code) || e.target.closest?.('button, select')) return;
  if(e.code==='KeyV' && !drivenRoad(world,id))return;
  e.preventDefault();
  held.add(e.code);
  if(!e.repeat)pressAction(e.code);
});
function startMarinaSprint(){
  if(racing && !touchBlocked() && drivenRoad(world,id) && socket?.readyState===WebSocket.OPEN)
    socket.send(JSON.stringify({type:'marinaSprint'}));
}
function beachUse(){
  if(!CITY || mode || !canChangeStance(self) || inVolleyball() || atTable())return null;
  const action=beachClubAction(self);
  if(barMenu.some(drink=>drink.id===action) && !world.npcs.some(n=>n.id==='beach-club-0' && n.beachRole==='bar'))return null;
  return action;
}
function beachHint(action){
  const drink=barMenu.find(d=>d.id===action);
  if(drink){
    const order=vitals.beachOrder;
    if(order){
      if(world.simTick<order.tick)return 'Marisol has your order';
      const label=barMenu.find(d=>d.id===order.drink).label;
      if(world.simTick-order.tick<pourTicks)return 'Marisol is pouring your '+label;
      return 'Marisol · Your '+label+' is ready';
    }
    if(samples.at(-1)?.players.some(p=>p.beachOrder?.drink===action))return 'Marisol · This spot is serving another guest';
  }
  if(vitals.beachPose===action)return action==='dance'?'Stop dancing':'Stand up';
  if(action.startsWith('seat') && samples.at(-1)?.players.some(p=>p.beachPose===action))return 'Seat occupied';
  return beachClubLabel(action);
}
function clubInteraction(){
  if(!CITY || mode || !self || vitals.dead || vitals.fall)return '';
  if(vitals.clubSince!=null)return 'Leave dance';
  if(!canChangeStance(self) || !inBoothAisle(self) || !world.npcs.some(n=>n.id==='lucero-daniel' && n.performer))return '';
  return 'Sit for a private dance';
}
function dogInteraction(){
  if(!world?.dogs || !canChangeStance(self) || self.dive || self.liftTravel || inVolleyball() || atTable())return null;
  const carried=carriedDog(world,id);
  if(carried)return {dog:carried,held:true};
  const dog=nearDog(world,{id,state:self});
  return dog?{dog,held:false}:null;
}
function pierAt(feet){
  return CITY && !mode && !atTable() && !inVolleyball() && canChangeStance(feet) && fishingSpot(feet);
}
function spearReady(feet){
  return CITY && !mode && !racing && !zombies && !vitals.dead && !vitals.fall && canSpearfish(feet);
}
function castSpear(){
  if(!spearReady(self) || socket?.readyState!==WebSocket.OPEN)return;
  socket.send(JSON.stringify({type:'spearfish',seq:++spearSequence,aimYaw:camera.yaw,aimPitch:camera.pitch}));
}
function pressAction(code){
  if(code==='KeyF' && self?.swimming){castSpear();return;}

  if(code==='KeyP'){
    const car=sidearmCar(world,id);
    if(car && hasMountedTool(car))selectedCarPistol=!selectedCarPistol;
    return;
  }
  if(code==='KeyU'){
    const vehicle=world && !vitals.dead && fuelVehicle(world,id);
    if(vehicle && !automaticPump(world,vehicle) && (vehicle.fuel??100)<100 && fuelSiteFor(world,vehicle))queuedRefuel=true;
    return;
  }
  if(code==='KeyG' && pierAt(self)){
    const f=vitals.fishing;
    const action=!activeCast(f)?'cast':f.phase==='bite'?'hook':f.phase==='reel'?'reel':null;
    if(action && socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'fishing',action}));
    return;
  }
  if(vitals.clubSince!=null && code!=='KeyE')return;
  if(self?.swimming && (code==='KeyG' || code==='KeyC')){
    if(code==='KeyG' && (self.swimDepth??0)<=.06)queuedScuba=true;
    return;
  }
  if(inVolleyball()){
    if(code==='Space')volleyballAction('strike');
    else if(code==='KeyE')volleyballAction('leave');
    return;
  }
  if(playingHoops()){
    if(code==='KeyE')queuedInteract=vitals.use;
    if(code==='KeyF')queuedFire=true;
    return;
  }
  if(self?.ride?.kind==='board' && inSkatePark(self.x,self.z) && (code==='KeyF' || code==='KeyX')){
    queuedSkateTrick=code==='KeyF'?'kickflip':'shove';return;
  }
  // Give the visible floor control first use of E even when an NPC, dog or
  // shopkeeper happens to stand within reach of the elevator.
  if(code==='KeyE'){
    const lift=interiorAction();
    if(lift?.kind==='lift'){elevator.show(lift.s);return;}
  }
  if(code==='KeyE' || code==='KeyX'){
    const target=dogInteraction();
    if(target && (code==='KeyX' || !target.held)){
      const action=target.held?'toss':code==='KeyE'?'take':'kick';
      if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify({type:'dog',action,target:target.dog.id,yaw:camera.yaw,pitch:camera.pitch}));
      return;
    }
  }
  if(CITY && !isPilot() && !isDriving() && !gunnerRole() && !vitals.dead && !vitals.fall && (self?.dive || takeoffBoard(self))){
    if(code==='KeyC' && !self.dive){queuedFlip=true;return;}
    if(code==='Space'){queuedJump=true;return;}
  }
  if (code === 'Space') queuedDeploy = true;
  if (code === 'Space' && !isPilot() && !isDriving() && !gunnerRole()) queuedJump = true;
  if ((code === 'KeyC' || code === 'KeyZ') && canChangeStance(self)) {
    const target = code === 'KeyC' ? 'crouch' : 'prone';
    requestedStance = (requestedStance ?? self.stance) === target ? 'stand' : target;
  }
  if(code==='KeyG' && mode)handleCase=true;
  if(code==='KeyI')openBag();
  if(code==='KeyE'){
    if(tablePrompt(self)){
      if(world.casino.player==null)socket?.send(JSON.stringify({type:'blackjack',action:'sit',revision:world.casino.revision}));
      return;
    }
    if(volleyballStatus()?.use){volleyballAction('join');return;}
    const safe=nearbySafe();
    if(safe){
      if(!(world.doors.estateSafes&safe.bit))market.lootSafe(safe.id);
      return;
    }
    const pickup=canChangeStance(self) && !vitals.use && nearbySidearm(self,world?.market);
    if(pickup){market.collectSidearm(pickup.id);return;}
    const shop=counter();
    if(shop){market.open(shop);return;}
    const bank=teller();
    if(bank){
      if(bank.action==='talk')bankDialog.show(world.bank.serial,!!vitals.wanted?.enabled);
      else if(bank.action==='collect')bankAction('collect',world.bank.serial);
      return;
    }
    const beachAction=beachUse();
    if(beachAction){socket?.send(JSON.stringify({type:'beachClub',action:beachAction}));return;}
    const clubUse=clubInteraction();
    if(clubUse){socket?.send(JSON.stringify({type:'clubSeat',action:vitals.clubSince!=null?'leave':'join'}));return;}
    const building=interiorAction();
    if(building?.kind==='slot'){sendInterior({slot:building.slot});return;}
    if(building?.kind==='concierge'){sendInterior({checkIn:true});return;}
    if(building?.kind==='yachtDoor'){sendInterior({cabin:building.d.id,open:!!(world.yacht.closedCabins&(1<<building.d.id))});return;}
    if(building?.kind==='door'){sendInterior({door:building.d.id,open:!doorIsOpen(building.d,world.doors)});return;}
    const person=speaker();
    if(person)talk.open(person);
    else queuedInteract=vitals.use;
  }
  if(code==='KeyL' && myRoad()?.patrol)socket?.send(JSON.stringify({type:'cruiserLights',on:!myRoad().emergencyLights}));
  if (code === 'KeyH' && myRoad() && !inTank())queuedHorn=true;
  if (code === 'KeyF') queuedFire = true;
  if (code === 'KeyB' && jetPilot()) queuedBomb=true;
  if ((code==='reload' || code==='KeyJ' || (code==='KeyR' && world?.mission?.stage!=='complete')) && (canAim() || carPistol())) queuedReload=true;
  if (code === 'KeyR' && isPilot()) queuedMissile=true;
  if (code === 'KeyR' && !isPilot() && world?.mission?.stage === 'complete') queuedReplay = true;
  if(code==='Digit0'){if(canHandleGear())setHolster(!manualHolster);return;}
  if(code==='KeyQ' && canHandleGear())code='Digit'+nextEquipment(weapon);
  if (!jetPilot() && !unarmedRoad() && !myBoat()?.boatModel && equipmentKeys.includes(code)) {
    const number=Number(code.at(-1));
    const kind=seatVehicle(world,id);
    if(atYachtHelm() || gunnerRole()==='superyacht')return;
    if(kind) {
      if(number<=2 && !vitals.dead){queuedSeat=number;queuedSeatKind=kind;}
    } else if(!self?.swimming && !vitals.swimming && !self?.ride){weapon=number;if(manualHolster && canHandleGear())setHolster(false);if(camera.sighted)showSight(!meleeItems[number]);}
  }
}
window.addEventListener('keyup', e => held.delete(e.code));
// A visible embedded document can receive pointer events before it has keyboard focus.
window.addEventListener('blur', () => { windowBlurred = true; pauseControls(); });
window.addEventListener('focus', () => { windowBlurred = false; });
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseControls();});
function releasePointer(e) { if(e.pointerType!=='touch'){stopLook();mouseFire=false;} }
canvas.addEventListener('pointerleave', releasePointer);
canvas.addEventListener('pointercancel', releasePointer);
canvas.addEventListener('contextmenu', e => e.preventDefault());
function pressButton(e) {
  if (!byId('guide').hidden || (e.button !== 0 && e.button !== 2)) return;
  lookPaused=false;canvas.classList.remove('look-paused');
  // Embedded browsers may reject capture. Canvas movement and edge turning
  // still control the same view in that case.
  if(!locked() && canvas.requestPointerLock){
    try{canvas.requestPointerLock()?.catch(()=>{});}catch{}
  }
  if (e.button === 2) {
    if (canAim() && !meleeItems[weapon]) {
      canvas.focus({ preventScroll: true });
      showSight(!camera.sighted);
    }
    return;
  }
  canvas.focus({ preventScroll: true });
  if(inVolleyball())return;
  if(playingHoops()){mouseFire=queuedFire=true;return;}
  if((self?.swimming || manualHolster) && !isDriving() && !isPilot() && !gunnerRole()){
    if(self?.swimming)castSpear();
    mouseFire=true;return;
  }
  if (self && (!meleeItems[weapon] || meleeItems[weapon].posedContact || gunnerRole()) && !isDriving() && !isPilot() && !vitals.dead && !vitals.fall)
    pressedAim = scene.aimAt(self,id,equipmentSpecs[gunnerRole() ? 'turret' : weapon].range,gunnerRole());
  mouseFire = queuedFire = true;
}
// Mouse events report each button in a chord (pointerdown only reports the first).
let pointerType;
canvas.addEventListener('pointerdown', e => { pointerType = e.pointerType; });
canvas.addEventListener('mousedown', e => { if (pointerType !== 'touch') pressButton(e); });
window.addEventListener('mouseup', e => {
  if (e.button === 0) mouseFire = false;
});

// An unlocked cursor stops sending deltas at the window boundary. Continue
// turning gently in the outer band until the cursor moves inward or exits.
function edgeRate(position, extent) {
  const band = Math.min(48, extent * 0.07);
  if (position < band) return -Math.pow(clamp(1 - position / band, 0, 1), 2);
  if (position > extent - band) return Math.pow(clamp(1 - (extent - position) / band, 0, 1), 2);
  return 0;
}

canvas.addEventListener('pointermove', e => {
  if(e.pointerType==='touch')return;
  if (lookPaused || windowBlurred || document.hidden || !byId('guide').hidden) {
    stopLook();
    return;
  }
  if(jetPilot()){
    const rect=canvas.getBoundingClientRect();
    const radius=Math.max(36,Math.min(rect.width,rect.height)*.20);
    if(locked()){
      stickX=clamp(stickX+e.movementX/radius,-1,1);
      stickY=clamp(stickY-e.movementY/radius,-1,1);
    } else {
      stickX=clamp((e.clientX-rect.left-rect.width/2)/radius,-1,1);
      stickY=clamp((rect.top+rect.height/2-e.clientY)/radius,-1,1);
    }
    byId('flight-cursor').style.transform='translate('+stickX*radius+'px,'+-stickY*radius+'px)';
    stopLook();return;
  }
  if(locked()){
    camera.yaw+=e.movementX*.0028;
    camera.pitch=viewPitch(camera.pitch-e.movementY*.0024);
    return;
  }
  const x = e.clientX, y = e.clientY;
  if (lastPointer) {
    camera.yaw += (x - lastPointer.x) * 0.0028;
    camera.pitch = viewPitch(camera.pitch - (y - lastPointer.y) * 0.0024);
  }
  lastPointer = { x, y };
  const rect = canvas.getBoundingClientRect();
  edgeYaw = edgeRate(x - rect.left, rect.width) * 1.35;
  edgePitch = -edgeRate(y - rect.top, rect.height) * 0.65;
});
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  camera.distance = clamp(camera.distance + e.deltaY * 0.006, 2.6, 8.5);
}, { passive: false });

let connectedBuild,previousScoreKey;
let canUnpack = typeof DecompressionStream === 'function';
const scoreStorage=mode?'island-score-'+mode:CITY?'brickell-match-score':'outpost-match-score';
try{previousScoreKey=sessionStorage.getItem(scoreStorage);}catch{}
function connect() {
  byId('presence').textContent = 'Connecting';
  socket = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + (CITY ? '/world?map=brickell'+(zombies?'&mode='+zombieMode:racing?'&mode='+marinaMode:mode?'&mode='+mode:resortArrivals.has(arrival)?'&arrival='+arrival:'') : '/world'));
  let full = false;
  const connection = socket;
  let incoming = Promise.resolve();
  connection.onopen = () => {
    if (canUnpack && !connection.extensions.includes('permessage-deflate')) {
      connection.send(JSON.stringify({type:'snapshotEncoding', encoding:'deflate'}));
    }
  };
  // WebSocket delivers binary frames as Blobs. Keep snapshot order across
  // asynchronous decompression, and discard work belonging to closed sockets.
  connection.onmessage = ({data}) => {
    incoming = incoming.then(async () => {
      if (connection !== socket || connection.readyState === WebSocket.CLOSED) return;
      let text = data;
      if (typeof data !== 'string') {
        try {
          const stream = data.stream().pipeThrough(new DecompressionStream('deflate'));
          text = await new Response(stream).text();
        } catch {
          canUnpack = false;
          connection.close();
          return;
        }
      }
      if (connection === socket && connection.readyState !== WebSocket.CLOSED) receive(JSON.parse(text));
    }).catch(error => {console.error(error); connection.close();});
  };
  function receive(m) {
    if(m.type==='wallet'){
      market.receive(m);
      if(m.message?.startsWith('Estate safe'))showBankReceipt(m.message);
      if(m.equipped===2 && !self?.swimming && !vitals.swimming){weapon=2;if(camera.sighted)showSight(true);}
      if(m.message?.startsWith('Picked up patrol sidearm'))showBankReceipt(m.message);
      if(m.message?.startsWith('Bank payout')){
        showBankReceipt(m.message+(vitals.wanted?.stars?' Patrol in pursuit.':''));
      }
      return;
    }
    if(m.type==='marinaBoard'){sprintBoard=m.rows;return;}
    if (m.type === 'full') { full = true; return; }
    if (m.type === 'welcome') {
      if(connectedBuild && m.build && connectedBuild!==m.build){location.reload();return;}
      if(costume.checked)socket.send(JSON.stringify({type:'paradeCostume',enabled:true}));
      sprintBoard=m.raceBoard??[];
      connectedBuild=m.build;market.receive(m);
      if(previousScoreKey)socket.send(JSON.stringify({type:'resumeScore',key:previousScoreKey}));
      previousScoreKey=m.scoreKey;
      try{sessionStorage.setItem(scoreStorage,m.scoreKey);}catch{}
      id = m.id; self = m.state; facing = m.state.yaw;
      if(CITY && !mode && resortArrivals.has(arrival))camera.yaw=facing;
      damageEdges.reset();scene.resetSurfaceMarks();
      canvas.classList.remove('bow-sight');
      world = m.world; roadImpact=null; lastGlass=world.doors?.glassSeq??0; readShots=liveShots(world.shots); audio.reset(world); vitals = m.state; wantedHud(vitals.wanted); weapon = m.state.weapon;manualHolster=!!m.state.holstered;holsterSeq=0;
      predictedDriver=null;
      spearSequence=0;seq = 0; pending = []; samples = []; accumulator = 0; retry = 500;
      notice(); clearInput();
      byId('presence').parentElement.classList.add('online');
    } else if (m.type === 'snapshot' && id != null) {
      const authoritative = m.players.find(p => p.id === id);
      if (!authoritative) return;
      pending = pending.filter(cmd => cmd.seq > authoritative.ack);
      if(zombies && m.world.survival?.phase==='finished' && world.survival?.phase!=='finished'){
        if(document.pointerLockElement===canvas)document.exitPointerLock();
        clearInput();
      }
      if(m.world.match?.phase!==world.match?.phase){
        clearInput();pending=[];samples=[];
      }
      const wasJet=jetPilot(),wasPlayingHoops=playingHoops();
      const wasDriving = isDriving(), wasGunner=gunnerRole();
      const changedLife = !!vitals.dead !== !!authoritative.dead;
      if(vitals.dead && !authoritative.dead)damageEdges.reset();
      else damageEdges.update(vitals,authoritative,roverView?.yaw ?? (jetPilot()?world.jet.yaw:camera.yaw));
      if((vitals.clubSince!=null)!==(authoritative.clubSince!=null)){
        clearInput();pending=[];
        if(authoritative.clubSince!=null){camera.yaw=Math.PI/2;camera.pitch=-.055;facing=camera.yaw;showSight(false);}
      }
      vitals = authoritative;wantedHud(vitals.wanted);
      if(authoritative.ack>=holsterSeq){
        manualHolster=!!authoritative.holstered;holsterSeq=0;
        if(manualHolster)weapon=authoritative.weapon;
      }
      const road=myRoad(), bump=drivenRoad(m.world,id)?.contactSound;
      if(road && bump?.damage>0 && bump.id!==road.contactSound?.id){
        roadImpact={message:bump.panel+' impact −'+bump.damage+' HP',until:performance.now()+1800};
      }
      if(world.bank?.claimant===id && m.world.bank?.outcome==='aborted'){
        showBankReceipt('Robbery interrupted. The cash stayed at the branch.');
      }
      const wasPlayingVolleyball=inVolleyball();
      world = m.world;world.simTick=m.simTick;
      casino.update(world.casino,id,market.cash);
      const volley=inVolleyball();
      if(!wasPlayingVolleyball && volley){
        clearInput();pending=[];
        camera.yaw=volley.side?0:Math.PI;camera.pitch=-.15;facing=camera.yaw;
      }
      if(wasPlayingHoops!==playingHoops()){
        clearInput();pending=[];
        if(!wasPlayingHoops){camera.yaw=facing=hoopHeading(authoritative);camera.pitch=-.17;stopLook();}
      }
      if(wasJet!==jetPilot()){
        stickX=stickY=0;stopLook();
        byId('flight-cursor').style.transform='';
        camera.yaw=world.jet.yaw;
        camera.pitch=-.10;
      }
      predictedDriver = !vitals.dead && !vitals.fall && !frozenPhase(world.match?.phase) ? driverPrediction(world,id) : null;
      if(predictedDriver)for(const cmd of pending.slice(-8))predictedDriver.step(cmd,step);
      if (wasDriving && !isDriving() && roverView) {
        camera.yaw = roverView.yaw;
        camera.pitch = roverView.pitch;
        roverView = null;
      }
      const gunner=gunnerRole();
      if(wasDriving!==isDriving() || gunner!==wasGunner)selectedCarPistol=false;
      canvas.classList.toggle('bow-sight',gunner==='superyacht' && !vitals.dead);
      if(gunner && gunner!==wasGunner) {camera.yaw=gunner==='tank'?world.tank.roofYaw:vehicleById(world,gunner).turretYaw;camera.pitch=0;stopLook();}
      if (changedLife) clearInput();
      if(authoritative.swimming)weapon=authoritative.weapon;
      if (camera.sighted && (!canAim() || authoritative.parachute || authoritative.swimming)) showSight(false);
      const corrected = atTable() || vitals.clubSince!=null || isPilot() || isDriving() || gunner || vitals.dead || vitals.fall ? authoritative : pending.reduce(
        (state, cmd) => stepPlayer(state, cmd, step, world.hp, world), authoritative);
      self = corrected;
      const shots=readShots(world.shots);
      for(const e of world.doors?.glassSounds??[])if(e.seq>lastGlass)scene.glassBurst(e);
      lastGlass=world.doors?.glassSeq??0;
      scene.showShots(shots,m.simTick);
      audio.events(world,authoritative,roverView?.yaw ?? camera.yaw,shots,lighting.value);
      audio.melee?.(m.players,m.simTick,authoritative,roverView?.yaw ?? camera.yaw);
      const arrival=performance.now(),sim=Number.isFinite(m.simTick)?m.simTick*step*1000:arrival;
      if(!samples.length || sim<samples.at(-1).sim){samples=[];snapshotClock.reset(sim,arrival);}
      else snapshotClock.accept(sim,arrival);
      if(samples.at(-1)?.sim===sim)samples.pop();
      samples.push({time:arrival,sim, bullets:world.bullets, traffic:world.traffic,patrolCars:world.patrolCars,tank:world.tank, jet:world.jet, boats:world.boats, yacht:world.yacht, heli: world.heli, supercar:world.supercar, rover: world.rover, npcs: world.npcs, players: m.players.filter(p => p.id !== id),volleyball:world.volleyball });
      if (samples.length > 12) samples.shift();
      const label = m.players.length === 1 ? '1 hiker online' : m.players.length + ' hikers online';
      if (byId('presence').textContent !== label) byId('presence').textContent = label;
    }
  }
  socket.onclose = () => {
    casino.close();elevator.close();byId('elevator-status').hidden=true;bankDialog.close();byId('bank-event').hidden=true;market.reset();bankSeq=bankReceiptUntil=0;byId('bank-receipt').hidden=true;
    talk.close();
    damageEdges.reset();
    canvas.classList.remove('armed');
    roverView = null;
    audio.reset();
    byId('marina-card').hidden=true;byId('touch-race-tally').hidden=true;hoopsHud.hide();showVolleyScore(null);
    byId('match-card').hidden=true;
    byId('zombie-card').hidden=true;
    byId('flight-cursor').hidden=true;
    wantedHud();id = null; self = null; world = null; pending = []; samples = [];
    byId('presence').parentElement.classList.remove('online');
    byId('presence').textContent = full ? 'World full' : 'Reconnecting';
    notice(full ? 'All 16 places are taken. Retrying shortly…' : 'Connection lost. Rejoining the trail…');
    clearInput();
    setTimeout(connect, full ? 5000 : retry);
    retry = Math.min(retry * 2, 5000);
  };
}

function movementInput() {
  if(atTable() || vitals.clubSince!=null)return {x:0,z:0,lateral:0,forward:0,moving:false,sprint:false};
  const right = held.has('KeyD') || held.has('ArrowRight');
  const left = held.has('KeyA') || held.has('ArrowLeft');
  const up = held.has('KeyW') || held.has('ArrowUp');
  const backward = held.has('KeyS') || held.has('ArrowDown');
  const foot=touch.active && canChangeStance(self) && !self.ride && !self.swimming && !self.parachute && !playingHoops();
  const pace=foot ? footStickPace(touch.axes.x,touch.axes.y,touch.axes.sprint) : touch.axes;
  const lateral=clamp(Number(right)-Number(left)+pace.x,-1,1);
  const forward=clamp(Number(up)-Number(backward)+pace.y,-1,1);
  const length = Math.max(1, Math.hypot(lateral, forward));
  const x = (lateral * Math.cos(camera.yaw) + forward * Math.sin(camera.yaw)) / length;
  const z = (lateral * Math.sin(camera.yaw) - forward * Math.cos(camera.yaw)) / length;
  const moving = Boolean(lateral || forward);
  const effectiveStance = requestedStance ?? self.stance;
  const sprint = moving && (!effectiveStance || effectiveStance === 'stand') && !self.swimming && ((foot && pace.sprint) || touchSprint || down('ShiftLeft') || down('ShiftRight'));
  return {x,z,lateral,forward,moving,sprint};
}

function tick() {
  if (socket?.readyState !== WebSocket.OPEN || id == null) return;
  if(world?.match && frozenPhase(world.match.phase)){moving=sprint=false;handleCase=false;return;}
  const {x,z,lateral,forward,...motion}=movementInput();
  moving=motion.moving;sprint=motion.sprint;
  const pilot = isPilot();
  const driving = isDriving();
  const basketball=playingHoops(),trigger=queuedFire || mouseFire || down('KeyF');
  const mounted=pilot || driving || gunnerRole() || atYachtHelm();
  const holstered=!mounted && (activeCast(vitals.fishing) || self.swimming || vitals.swimming || manualHolster);
  if(holstered){
    releaseSwimTrigger=!!trigger;pressedAim=null;
    if(camera.sighted)showSight(false);
  }else if(!trigger || mounted)releaseSwimTrigger=false;
  const hoopShot=basketball && trigger;
  const playingVolleyball=!!inVolleyball();
  const pistol=carPistol();
  const fire = !self.dive && !basketball && !playingVolleyball && !myBoat()?.boatModel && !self.ride && (!unarmedRoad() || inEngine() || pistol) && !holstered && !releaseSwimTrigger && !self.climb && !vitals.dead && !vitals.fall && trigger;
  const gunner=gunnerRole();
  // Ordinary movement sends camera angles. Only interactions that consume a
  // muzzle-to-target bearing need to raycast the world on this input tick.
  const tracking=weapon===4 && camera.sighted && canAim() && !lookPaused;
  const needsAim=(fire && (!meleeItems[weapon] || meleeItems[weapon].posedContact)) || gunner || tracking || (basketball && (hoopShot || world.basketball.charge>0));
  const aim=(pistol && fire && scene.aimAt(self,id,equipmentSpecs[sidearmSlot].range,'car-window')) || (inEngine() && scene.aimAt(self,id,34,'engine')) || (inTank() && scene.aimAt(self,id,60,'tankCannon')) || (!driving && !pilot && needsAim &&
    (pressedAim || scene.aimAt(self,id,equipmentSpecs[gunner ? 'turret' : weapon].range,gunner))) || camera;
  pressedAim = null;
  if(activeCast(vitals.fishing))facing=Math.atan2(vitals.fishing.x-self.x,self.z-vitals.fishing.z);
  else if (hoopShot || basketball && world.basketball.charge>0 && world.basketball.players[world.basketball.turn]===id) facing = camera.yaw;
  else if (fire || spearReady(self) || (!lookPaused && canAim())) facing = aim.yaw;
  else if (moving) facing = Math.atan2(x, -z);
  else if (queuedJump && self.swimming) facing = camera.yaw;
  const descending = down('ShiftLeft') || down('ShiftRight');
  const swimY=self.swimming?Number(down('Space'))-Number(down('KeyC')):0;
  const cmd = { ...(swimY && {swimY}), ...(queuedScuba && {toggleScuba:true}), skateTrick:queuedSkateTrick,flipDive:queuedFlip,type: 'input', seq: ++seq, ...(pistol && {sidearm:true}), lowerHook:world.heli.pilot===id && down('KeyK'), releaseHook:world.heli.pilot===id && down('KeyL'), horn:queuedHorn, handleCase, x, z, jump: queuedJump && !pilot && !driving, yaw: facing,
    stance: playingVolleyball?'stand':canChangeStance(self)?requestedStance:undefined,
    ...(holsterSeq && canHandleGear()?{holster:manualHolster}:{}),
    ...(queuedReload && {reload:true}),
    ...(queuedRefuel && {refuel:true}),
    ...(!mounted && trigger && (holstered || releaseSwimTrigger)?{handheldHeld:true}:{}),
    sprint: sprint && !pilot, weapon:holstered?null:weapon, hoopShot, fire:fire && !atYachtHelm(), interact: !!queuedInteract,useTarget:queuedInteract?.target,useRole:queuedInteract?.role, seat:queuedSeat, seatKind:queuedSeatKind,
    bomb:jetPilot() && queuedBomb,
    missile:pilot && (queuedMissile || down('KeyR')),
    throttle: driving || jetPilot() || self.ride ? forward : 0, steer:jetPilot()?stickOutput(stickX):(driving || self.ride)?lateral:0,
    jetPitch:jetPilot()?stickOutput(stickY):undefined,
    lift: pilot && !jetPilot() ? Number(down('Space')) - Number(descending) : 0,
    tracking,
    deploy: queuedDeploy, replaySupply: queuedReplay, aimYaw: aim.yaw, aimPitch: aim.pitch };
  queuedReplay = queuedDeploy = queuedScuba = queuedRefuel = false;
  queuedSkateTrick=undefined;
  queuedFlip = queuedJump = queuedInteract = queuedReload = queuedFire = false;
  queuedSeat=queuedSeatKind=null;
  requestedStance = undefined;
  handleCase=false;
  queuedHorn=queuedBomb=queuedMissile=false;
  socket.send(JSON.stringify(cmd));
  pending.push(cmd);
  predictedDriver?.step(cmd,step);
  if (pending.length > 150) { socket.close(); return; }
  if (!atTable() && vitals.clubSince==null && !pilot && !driving && !gunner && !vitals.dead && !vitals.fall) self = stepPlayer(self, cmd, step, world.hp, world);
}

// Interpolate only live rounds. An impact snapshot immediately retires its tracer.
function roundFrame(time) {
  const newest=samples.at(-1),older=samples.at(-2);
  if(!older || !newest?.bullets?.length) return world.bullets;
  const duration=Math.max(1,newest.time-older.time),blend=clamp((time-newest.time)/duration,0,1);
  return newest.bullets.map(r=>{
    const old=older.bullets?.find(v=>v.id===r.id);
    const back=Math.min(r.age/30,duration/1000);
    return {...r,visualAge:mix(old?.age ?? r.age-back*30,r.age,blend),x:mix(old?.x ?? r.x-r.vx*back,r.x,blend),
      y:mix(old?.y ?? r.y-r.vy*back,r.y,blend),z:mix(old?.z ?? r.z-r.vz*back,r.z,blend)};
  });
}

function remoteFrame(time) {
  if (!samples.length) return { players: [], traffic:world.traffic,patrolCars:world.patrolCars,tank:world.tank, jet:world.jet, npcs: world.npcs, boats:world.boats, yacht:world.yacht, heli: world.heli, supercar:world.supercar, rover: world.rover };
  const target=snapshotClock.target(time);
  let after=samples.findIndex(s=>s.sim>=target);
  if (after < 0) return samples.at(-1);
  if (after === 0) return samples[0];
  const a = samples[after - 1], b = samples[after];
  const t=clamp((target-a.sim)/Math.max(1,b.sim-a.sim),0,1);
  function interpolateActors(older, newer) {
    return newer.map(p => {
      const q = older.find(q => p.id === q.id);
      if (!q || q.dead !== p.dead || Math.hypot(q.x - p.x, q.z - p.z) > 5) return p;
      const fall=p.fall?.joints && q.fall?.started===p.fall.started ? {...p.fall,
        joints:p.fall.joints.map((n,i)=>mix(q.fall.joints[i],n,t)),age:mix(q.fall.age,p.fall.age,t)} : p.fall;
      const climb = q.climb && p.climb ? {...p.climb,t:mix(q.climb.t,p.climb.t,t)} : p.climb;
      const dive=q.dive && p.dive ? {...p.dive,time:mix(q.dive.time,p.dive.time,t)} : p.dive;
      const ride=p.ride && p.ride.id===q.ride?.id ? {...p.ride,yaw:angleMix(q.ride.yaw,p.ride.yaw,t)} : p.ride;
      return { ...p, dive, climb, fall, ride, x: mix(q.x,p.x,t), y: mix(q.y,p.y,t), z: mix(q.z,p.z,t), yaw: angleMix(q.yaw,p.yaw,t) };
    });
  }
  const players = interpolateActors(a.players,b.players);
  const npcs = interpolateActors(a.npcs || [],b.npcs || []);
  let heli = b.heli;
  if (a.heli.pilot === b.heli.pilot && a.heli.wrecked === b.heli.wrecked) {
    heli = { ...b.heli, x: mix(a.heli.x,b.heli.x,t), y: mix(a.heli.y,b.heli.y,t),
      pitch: mix(a.heli.pitch,b.heli.pitch,t), roll: mix(a.heli.roll,b.heli.roll,t),
    z: mix(a.heli.z,b.heli.z,t), yaw: angleMix(a.heli.yaw,b.heli.yaw,t),
      abandonedFor: b.heli.abandonedFor == null ? null : mix(a.heli.abandonedFor ?? 0,b.heli.abandonedFor,t) };
  }
  function roadFrame(old,car) {
    if(!old || !car)return car;
    const moment=t<.5?old:car;
    if(old.driver!==car.driver || old.wrecked!==car.wrecked || Math.hypot(old.x-car.x,old.z-car.z)>9)return moment;
    // Discrete lamp, tire and crew state follows the nearer simulation tick.
    const boarding=old.boarding && car.boarding
      ? {...car.boarding,progress:mix(old.boarding.progress,car.boarding.progress,t)} : moment.boarding;
    return {...moment,boarding,x:mix(old.x,car.x,t),y:mix(old.y,car.y,t),z:mix(old.z,car.z,t),
      yaw:angleMix(old.yaw,car.yaw,t),speed:mix(old.speed,car.speed,t),lateralSpeed:mix(old.lateralSpeed??0,car.lateralSpeed??0,t),steer:mix(old.steer??0,car.steer??0,t),
      suspension:Boolean(old.bridgeFlight)!==Boolean(car.bridgeFlight)?car.suspension:interpolateSuspension(old.suspension,car.suspension,t)};
  }
  let tank=b.tank;
  if(tank && a.tank && tank.driver===a.tank.driver && tank.wrecked===a.tank.wrecked && Math.hypot(tank.x-a.tank.x,tank.z-a.tank.z)<=9){
    tank={...tank,suspension:interpolateSuspension(a.tank.suspension,tank.suspension,t),x:mix(a.tank.x,tank.x,t),y:mix(a.tank.y,tank.y,t),z:mix(a.tank.z,tank.z,t),
      yaw:angleMix(a.tank.yaw,tank.yaw,t),turretYaw:angleMix(a.tank.turretYaw,tank.turretYaw,t),turretPitch:mix(a.tank.turretPitch,tank.turretPitch,t),
      roofYaw:angleMix(a.tank.roofYaw,tank.roofYaw,t),roofPitch:mix(a.tank.roofPitch,tank.roofPitch,t)};
  }
  const supercar=roadFrame(a.supercar,b.supercar);
  const traffic=b.traffic?.map(car=>{
    const old=a.traffic?.find(v=>v.id===car.id),frame=roadFrame(old,car);
    if(car.takeover && old?.takeover?.npcId===car.takeover.npcId)
      return {...frame,takeover:{...car.takeover,progress:mix(old.takeover.progress,car.takeover.progress,t)}};
    if(car.model==='engine' && old && frame){
      frame.monitorYaw=angleMix(old.monitorYaw,car.monitorYaw,t);
      frame.monitorPitch=mix(old.monitorPitch,car.monitorPitch,t);
    }
    return frame;
  });
  const patrolCars=b.patrolCars?.map(car=>roadFrame(a.patrolCars?.find(c=>c.id===car.id),car));
  const rover=roadFrame(a.rover,b.rover);
  for(const [kind,v] of [['heli',heli],['rover',rover]]) {
    if(v.gunner!=null && a[kind].gunner===v.gunner) {
      v.turretYaw=angleMix(a[kind].turretYaw,b[kind].turretYaw,t);
      v.turretPitch=mix(a[kind].turretPitch,b[kind].turretPitch,t);
    }
  }
  const boats=(b.boats??[]).map(boat=>{
    const old=a.boats?.find(v=>v.id===boat.id);
    if(!old || old.wrecked!==boat.wrecked)return boat;
    return {...boat,x:mix(old.x,boat.x,t),y:mix(old.y,boat.y,t),z:mix(old.z,boat.z,t),yaw:angleMix(old.yaw,boat.yaw,t),
      pitch:mix(old.pitch,boat.pitch,t),roll:mix(old.roll,boat.roll,t),turretYaw:angleMix(old.turretYaw,boat.turretYaw,t),
      turretPitch:mix(old.turretPitch,boat.turretPitch,t)};
  });
  let yacht=b.yacht;
  if(a.yacht && yacht && a.yacht.wrecked===yacht.wrecked){
    yacht={...yacht,x:mix(a.yacht.x,yacht.x,t),z:mix(a.yacht.z,yacht.z,t),yaw:angleMix(a.yacht.yaw,yacht.yaw,t),
      turretYaw:angleMix(a.yacht.turretYaw,yacht.turretYaw,t),turretPitch:mix(a.yacht.turretPitch,yacht.turretPitch,t)};
  }
  let jet=b.jet;
  if(jet && a.jet?.pilot===jet.pilot && a.jet.wrecked===jet.wrecked){
    jet={...jet};
    for(const key of ['x','y','z','pitch','roll'])jet[key]=mix(a.jet[key],jet[key],t);
    jet.yaw=angleMix(a.jet.yaw,jet.yaw,t);
  }
  const volleyball=b.volleyball?.map((court,index)=>({...court,
    athletes:interpolateActors(a.volleyball?.[index]?.athletes??[],court.athletes),
  }));
  return { sim:mix(a.sim,b.sim,t),players, npcs, heli, rover, supercar, boats, yacht, jet, tank, traffic, patrolCars,volleyball };
}

// Follow the same interpolated heading as the rendered body, once per frame.
function drivingView(rover, dt, wheeled) {
  if (!roverView) {
    roverView = { yaw: camera.yaw, pitch: camera.pitch, heading: rover.yaw };
    camera.yaw = rover.yaw;
  }
  const turn = Math.atan2(Math.sin(rover.yaw-roverView.heading), Math.cos(rover.yaw-roverView.heading));
  roverView.heading = rover.yaw;
  // Apply the driver's mouse orbit immediately. Filter only the change in
  // chassis heading, including prediction corrections around tight corners.
  const mouseTurn=wheeled && roverView.lastAimYaw!=null ? camera.yaw-roverView.lastAimYaw : 0;
  camera.yaw += turn;
  roverView.lastAimYaw=camera.yaw;
  const blend = 1 - Math.exp(-16 * dt);
  roverView.yaw = angleMix(roverView.yaw + (wheeled ? mouseTurn : turn), camera.yaw, blend);
  roverView.pitch = mix(roverView.pitch, camera.pitch, blend);
  roverView.road=wheeled ? roadFraming(roverView.road,rover,dt) : null;
  const marina=marinaModel(rover);
  roverView.distance = marina?Math.max(camera.distance,marina.length*.68):camera.distance;
  // The rearward angle lives only in the rendered view. Steering and the
  // driver's saved mouse orbit continue in their normal coordinate frame.
  const rear=wheeled && down('KeyV');
  roverView.rearAngle=mix(roverView.rearAngle??0,rear?Math.PI:0,-Math.expm1(-dt*10));
  return roverView.rearAngle>.0001 ? {...roverView,yaw:roverView.yaw+roverView.rearAngle} : roverView;
}

const divingScores=diveScorecard(byId('dive-result'));

function updateEquipment(local) {
  const board=CITY && !local.dead && !local.fall && !isDriving() && !isPilot() && !gunnerRole() && takeoffBoard(local);
  const diving=local.dive;
  const ladderDirection=CITY && platformLadderAt(local);
  const ladderLabel=ladderDirection && (ladderDirection==='up'?'Climb ladder':'Descend ladder');
  const climbingLadder=local.climb?.kind==='platformLadder';
  const gauge=byId('dive-meter'),report=byId('dive-result');
  let mark=vitals.lastDive,spectatorName='';
  divingScores.observe(mark);
  if(CITY && local.z< -385 && local.z> -490){
    for(const athlete of samples.at(-1)?.players??[]){
      const entry=athlete.lastDive;
      if(entry && (!mark || entry.tick>mark.tick) && Math.hypot(local.x-entry.x,local.z-entry.z)<(entry.judging?32:14)){
        mark=entry;spectatorName=athlete.name || 'Hiker '+athlete.id;
      }
    }
  }
  report.hidden=!mark || !!diving || (!!board && !spectatorName);
  if(!report.hidden)divingScores.show(mark,spectatorName);
  gauge.hidden=!diving;
  if(diving){
    const progress=diving.time/diving.duration;
    gauge.dataset.inZone=String(diving.release==null && Math.abs(progress-entryBeat)<=.065);
    gauge.style.setProperty('--progress',Math.min(100,(diving.release??diving.time)/diving.duration*100)+'%');
    byId('dive-call').textContent=diving.release!=null?'Entry set':progress<entryBeat-.065?'Wait for the gold zone':progress<=entryBeat+.065?'Open now':'Open for entry';
  }
  const volleyball=volleyballStatus();
  const heli = jetPilot()?world.jet:world.heli;
  const pilot = isPilot();
  const distance = Math.hypot(local.x - heli.x, local.y - heli.y, local.z - heli.z);
  const boat=myBoat();
  const marina=marinaModel(boat);
  const trafficCar=myRoad()?.model && myRoad();
  const cleared = BREAKABLES.filter(p => world.hp[p.id] === 0).length;
  const gunner=gunnerRole(),basketball=playingHoops();
  byId('match-kills').textContent=vitals.score?.kills??0;
  byId('match-deaths').textContent=vitals.score?.deaths??0;
  byId('kit').textContent = marina?boat.name+' · '+marina.title:basketball?basketballTeams[world.basketball.players.indexOf(id)].name:inTank()?'Tank · Arcade cannon':jetPilot() ? 'Strike jet · Cannon, missiles and bombs' : atYachtHelm() ? 'Solana · Yacht helm' : boat ? (gunner?'Boat turret':'Patrol boat helm') : gunner ? (gunner==='superyacht' ? 'Solana · Bow gun' : gunner==='heli' ? 'Helicopter turret' : gunner==='tank' ? 'Tank roof gun' : 'Rover turret') : trafficCar ? (trafficCar.patrol?'Patrol cruiser':(civilianProfiles[trafficCar.model]?.name??carNames[trafficCar.model])) : inGT() ? 'Cheetah' : isDriving() ? 'Rover missiles' : pilot ? 'Helicopter forward guns · R missile' : local.swimming?(local.scuba?'Scuba':'Swimming')+' · Air '+Math.ceil(local.swimAir??breathSeconds)+'s · '+(local.swimDepth??0).toFixed(1)+' m':manualHolster?'Unarmed · '+equipmentSpecs[weapon].name+' put away':weapon+' · '+equipmentSpecs[weapon].name;
  byId('progress').textContent = zombies ? '' : cleared + ' / ' + BREAKABLES.length + ' roadblocks cleared';
  canvas.classList.toggle('armed', (!manualHolster || isDriving() || gunner) && !basketball && !volleyball?.member && !local.swimming && !pilot && (carPistol() || inTank() || inEngine() || !isDriving()) && !vitals.dead && byId('guide').hidden);
  const health = ((atYachtHelm() || gunner==='superyacht') && world.yacht) || boat || (pilot ? heli : myRoad() || vitals);
  const driven=fuelVehicle(world,id);
  const fueled=driven || (gunner && vehicleById(world,gunner));
  const fuelReadout=byId('vehicle-fuel');
  fuelReadout.hidden=!fueled || vitals.dead;
  const refuelSite=driven && !vitals.dead && fuelSiteFor(world,driven);
  const filling=!!refuelSite && (driven.fuel??100)<100;
  const canRefuel=filling && !automaticPump(world,driven);
  if(!fuelReadout.hidden){
    const amount=clamp(fueled.fuel??100,0,100);
    byId('fuel-meter').value=amount;
    byId('fuel-label').textContent=amount===0?'Out of fuel':'Fuel '+Math.max(1,Math.floor(amount))+'%';
    fuelReadout.classList.toggle('low-fuel',amount<=15);
  }
  const hp = health.hp;
  const maxHp = health.maxHp || 100;
  byId('hp-meter').max = maxHp; byId('hp-meter').value = hp ?? maxHp;
  byId('hp-label').textContent = (boat || atYachtHelm() || gunner==='superyacht' ? 'Hull ' : pilot ? 'Airframe ' : inTank()?'Tank ':trafficCar ? (trafficCar.patrol?'Patrol cruiser':(civilianProfiles[trafficCar.model]?.name??carNames[trafficCar.model]))+' ' : inGT() ? 'Cheetah ' : isDriving() ? 'Rover ' : 'Health ') + (hp ?? maxHp) + '/' + maxHp;
  byId('flight-cursor').hidden=!jetPilot() || vitals.dead || !byId('guide').hidden || lookPaused;
  byId('life-status').textContent = vitals.dead && zombies ? 'Down · waiting for squad' : vitals.dead ? 'Down · Respawning in ' + Math.ceil(vitals.respawnIn) + 's' : gunner ? 'Hull '+vehicleById(world,gunner).hp+'/'+vehicleById(world,gunner).maxHp : myRoad() && roadImpact?.until>performance.now() ? roadImpact.message : unarmedRoad() ? Math.round(Math.abs(myRoad().speed)*3.6)+' km/h' : vitals.protected ? 'Spawn shield' : '';
  byId('space-action').parentElement.hidden = basketball || isDriving() || jetPilot() || !!gunner;
  byId('shift-action').parentElement.hidden = basketball || local.swimming || isDriving() || jetPilot() || !!gunner;
  byId('space-action').textContent = pilot ? 'Climb' : local.swimming ? 'Rise / climb ashore' : local.parachute === 'packed' ? 'Deploy parachute' : 'Jump';
  if (local.parachute === 'open') byId('space-action').parentElement.hidden = true;
  byId('shift-action').textContent = pilot ? 'Descend' : 'Sprint';
  const gearAvailable=!!canHandleGear();
  const pistol=carPistol();
  const magazine=pistol ? vitals.magazine?.weapon===sidearmSlot && vitals.magazine : gearAvailable && !manualHolster && vitals.magazine?.weapon===weapon && vitals.magazine;
  const ammo=byId('ammo-readout');
  ammo.hidden=!magazine;
  if(magazine){
    const key=world?.mission?.stage==='complete'?'J':'R';
    const progress=magazine.reloadTicks!=null?' · Reloading '+(magazine.reloadTicks/30).toFixed(1)+'s':
      magazine.rounds<magazine.capacity && !touch.active?' · '+key+' Reload':'';
    ammo.textContent=(magazine.weapon===5?'Fuel ':'Ammo ')+magazine.rounds+' / '+magazine.capacity+progress;
  }
  byId('holster-control').hidden=!gearAvailable || touch.active;
  byId('holster-action').textContent=manualHolster?'Draw':'Put away';
  const showStances = canChangeStance(local);
  byId('prone-shortcut').hidden = byId('crouch-shortcut').hidden = !showStances;
  byId('crouch-action').textContent = local.stance === 'crouch' ? 'Stand' : 'Crouch';
  byId('prone-action').textContent = local.stance === 'prone' ? 'Stand' : 'Prone';
  if (local.stance) byId('shift-action').parentElement.hidden = true;
  const kind=seatVehicle(world,id);
  byId('tool-shortcut').hidden=!!marina || basketball || jetPilot() || unarmedRoad() || atYachtHelm() || kind==='tank' || gunner==='superyacht' || local.swimming || vitals.dead;
  byId('number-action').textContent=kind ? 'Seats' : 'Weapons';
  byId('third-tool-key').hidden=byId('fourth-tool-key').hidden=byId('fifth-tool-key').hidden=byId('sixth-tool-key').hidden=Boolean(kind);
  byId('look-back-control').hidden=!drivenRoad(world,id);
  const tracking=byId('launcher-status'),lock=vitals.launcherLock;
  tracking.hidden=weapon!==4 || !canAim() || !!kind || (touch.active && !camera.sighted);
  if(!tracking.hidden)tracking.textContent=lock ? (lock.progress===1?'Locked · ':'Locking '+Math.round(lock.progress*100)+'% · ')+lockLabel(lock.key) :
    touch.active?(camera.sighted?'Hold sight on a vehicle to lock':'Tap Aim to lock on'):
    camera.sighted?'Aim at a vehicle to lock · F fires straight':'Right-click to lock · F / click fires straight';
  byId('fire-shortcut').hidden = (manualHolster && gearAvailable) || (unarmedRoad() && !inEngine() && !pistol) || atYachtHelm() || local.swimming || !!local.climb || vitals.dead || (boat && !gunner);
  byId('fire-verb').textContent=basketball?'Hold to shoot':pistol?'Fire pistol':inEngine()?'Spray water':weapon===6 && !kind?'Throw':meleeItems[weapon] && !kind?'Swing':'Fire';
  const sharkNearby=local.swimming && world.sharks?.some(s=>s.target===id);
  const prompt = byId('field-prompt');
  if(talk.current && !speaker(talk.current))talk.close();
  const bank=teller();
  if(bankDialog.open && bank?.action!=='talk')bankDialog.close();
  const bulletin=bankBulletin(world.bank,local,id),event=byId('bank-event');
  if(event.textContent!==bulletin)event.textContent=bulletin;
  event.hidden=!bulletin;
  byId('bank-receipt').hidden=bankReceiptUntil<=performance.now();
  const safe=nearbySafe(),safeLabel=safe && !(world.doors.estateSafes&safe.bit)?'Loot safe':null;
  const pickupLabel=!vitals.use && canChangeStance(self) && nearbySidearm(self,world.market)?'Pick up patrol sidearm':null;
  const shop=counter(),shopLabel=shop && (world.market.shops[shop.id].down?'Loot counter':'Shop with '+(world.npcs.find(n=>n.id===shop.owner)?.name??shop.name));
  market.update(world,shop,canChangeStance(self));
  const person=!talk.current && speaker();
  const use=vitals.use,helmPrompt=yachtPrompt(world,local,id);
  const serviceCar=drivenRoad(world,id),garage=serviceCar && garageAt(serviceCar);
  if((refuelSite || garage) && !vitals.dead){
    const service=[];
    if(garage && serviceCar.repairPercent!=null)service.push('Repairing · '+serviceCar.repairPercent+'%');
    else if(garage && needsRoadRepair(serviceCar))service.push('Stop in the marked bay for 3 seconds');
    else if(garage && !refuelSite)service.push('Vehicle in full repair');
    if(refuelSite)service.push(canRefuel?(touch.active?'Tap Refuel':'U  Refuel'):filling?'Refueling · '+Math.floor(driven.fuel)+'%':'Tank full');
    prompt.textContent=(refuelSite??garage).name+' · '+service.join(' · ');
  }else if (local.climb) prompt.textContent = 'Pulling up…';
  else if (vitals.fall && !vitals.dead) prompt.textContent=vitals.fall.cause==='skateboard'?'Skateboard wipeout · Getting back up…':'Knocked down · Getting back up…';
  else if (vitals.dead && zombies) prompt.textContent = 'Clear the wave to bring fallen teammates back.';
    else if (vitals.dead) prompt.textContent = 'Returning to the trailhead…';
  else if(use && !(isDriving() || pilot || gunner))prompt.textContent='E  ·  '+use.label;
  else if(bankDialog.open || market.current || talk.current)prompt.textContent='';
  else if(bank)prompt.textContent=bank.action?'E  ·  '+bank.detail:bulletin?'':bank.detail;
  else if(safe)prompt.textContent=safeLabel?'E  ·  Loot estate safe':'Estate safe · Empty';
  else if(pickupLabel)prompt.textContent='E  ·  '+pickupLabel;
  else if(shop)prompt.textContent='E  ·  '+shopLabel+' · '+shop.name;
  else if(person)prompt.textContent='E  ·  Talk to '+conversations[person].name;
  else if(inTank())prompt.textContent='W/S drive · A/D turn tracks · Mouse aims turret · F / click fire';
  else if(jetPilot())prompt.textContent='Hold cursor up/down to loop · W/S throttle · F cannon · R missile · B bomb';
  else if(atYachtHelm() || (boat && !gunner))prompt.textContent='W/S throttle · A/D steer';
  else if(trafficCar?.takeover)prompt.textContent='Taking the wheel…';
  else if(trafficCar?.patrol)prompt.textContent='W/S drive · A/D steer · L emergency lights';
  else if(inEngine())prompt.textContent='W/S accelerate or brake · A/D steer · Mouse aims the water cannon · Hold F / click to spray';
  else if(isDriving())prompt.textContent='W/S accelerate or brake · A/D steer';
  else if(gunner)prompt.textContent='Look around to aim · Hold F / click to fire';
  else if(pilot)prompt.textContent=heli.grounded?'Space to lift off · F forward guns · R missile':heli.hook?.load?'Cargo attached · L to release · F guns · R missile':'Space / Shift altitude · F forward guns · R missile · Hold K for cargo hook';
  else if(helmPrompt==='occupied' || helmPrompt==='gunOccupied')prompt.textContent='Yacht station occupied';
  else if(sharkNearby)prompt.textContent='Shark approaching · swim to shallow water';
  else if(local.swimming)prompt.textContent=local.outOfAir?'Out of air · Surfacing':local.swimDepth?'C to descend · Space to surface':'C to dive · Space to climb ashore · G to '+(local.scuba?'stow':'equip')+' scuba';
  else if(local.parachute==='packed')prompt.textContent='Free fall · Press Space to deploy parachute';
  else if(local.parachute==='open')prompt.textContent='Parachute open · WASD / arrows to steer';
  else if(heli.wrecked)prompt.textContent='Helicopter recovering · '+Math.ceil(heli.recoverySeconds)+'s';
  else if(zombies)prompt.textContent='';
  else prompt.textContent='Helicopter · '+Math.round(distance)+' m';
  const roadStation=sidearmCar(world,id);
  if(roadStation && hasMountedTool(roadStation) && !touch.active)prompt.textContent+='  ·  P  '+(pistol?'Mounted controls':'Draw pistol');
  if(use && !touch.active && (isDriving() || pilot || gunner))prompt.textContent+='  ·  E  ·  '+use.label;
  if(CITY && local.grounded && !vitals.dead && !isDriving() && !pilot && !gunner && hotelEntrance(local))
    prompt.textContent=(use?prompt.textContent+'  ·  ':'')+'Hotel Maravela · Walk through the automatic doors';
  const building=interiorAction();
  elevator.validate(building);
  byId('elevator-status').hidden=!local.liftTravel;
  if(local.liftTravel)byId('elevator-status').classList.toggle('hotel-ride',Boolean(ridingHotelShaft(local)));
  if(local.liftTravel)byId('elevator-status').textContent='Elevator · '+(local.liftTravel===1?'Ground lobby':'Floor '+local.liftTravel);
  if(building && !bank && !shop)prompt.textContent='E  ·  '+building.label;
  const clubUse=clubInteraction();
  const beachAction=beachUse();
  if(beachAction)prompt.textContent='E  ·  '+beachHint(beachAction);
  else if(clubUse)prompt.textContent='E  ·  '+clubUse;
  else if(CITY && !mode && nearClubDoor(local))prompt.textContent='Club Lucero · Live cabaret · Walk in';
  const jamBoard=local.ride?.kind==='board' && inSkatePark(local.x,local.z);
  const jamCard=byId('skate-score');jamCard.hidden=!jamBoard;
  if(jamBoard){
    const run=local.ride.run;
    byId('skate-clock').textContent=run?Math.ceil(run.left)+'s · '+run.score+' pts':'45-second run';
    byId('skate-result').textContent=run?(run.left?run.last+(run.award?' +'+run.award:''):'Time · Best '+run.best+' · Trick to restart'):'Land tricks and grinds to score';
  }
  if(local.ride){
    prompt.textContent=local.ride.kind==='bike' ? 'Bicycle · W pedal · S brake · A/D steer · E dismount' : 'Skateboard · W push · S brake · A/D carve · Space ollie · E step off';
    const bikeHop=local.ride.kind==='bike' && inSkatePark(local.x,local.z);
    if(bikeHop)prompt.textContent='Bicycle · W pedal · A/D steer · Space hop · Align with a rail to grind';
    if(jamBoard)prompt.textContent='Skate park · Space ollie · F kickflip · X shove-it · Ride onto rails';
    if(local.ride.kind==='board' && !local.grounded)prompt.textContent='A/D rotate · Line up with your direction of travel to land';
    if(local.ride.grind)prompt.textContent='Grinding · Space hop off';
    byId('kit').textContent=local.ride.kind==='bike'?'Bicycle':'Skateboard';byId('space-action').parentElement.hidden=local.ride.kind==='bike' && !bikeHop;byId('space-action').textContent=bikeHop?'Bunny hop':'Ollie';canvas.classList.remove('armed');
  }
  const tableHint=tablePrompt(local);
  if(tableHint)prompt.textContent=world.casino.player==null?'E  ·  '+tableHint:tableHint;
  if(kind && kind!=='tank' && !vitals.dead && !touch.active) prompt.textContent += '  ·  '+seatChoices(world,kind,id);
  const volleyballVisible=volleyball && !vitals.dead && !bankDialog.open && !market.current && !talk.current;
  showVolleyScore(volleyballVisible?volleyball:null);
  if(volleyballVisible){
    const labels=[];
    if(!touch.active){
      if(volleyball.action)labels.push('Space  ·  '+volleyball.action);
      if(volleyball.use)labels.push('E  ·  '+volleyball.use);
    }
    prompt.textContent=labels.filter(Boolean).join('  ·  ');
    if(volleyball.member){
      byId('kit').textContent='Beach volleyball';
      byId('progress').textContent='';
      byId('fire-shortcut').hidden=byId('prone-shortcut').hidden=byId('crouch-shortcut').hidden=byId('tool-shortcut').hidden=true;
      byId('space-action').parentElement.hidden=!volleyball.action;
      byId('space-action').textContent=volleyball.action??'';
    }
  }
  const dogTarget=dogInteraction();
  const dogInfo=dogTarget && (dogTarget.dog.name+' · '+dogTarget.dog.hp+'/'+dogTarget.dog.maxHp+' HP');
  if(dogTarget)prompt.textContent=dogInfo+(dogTarget.held?' · X  Throw':' · E  Steal dog   X  Kick');
  const liftLabel=building?.kind==='lift'?building.label:null;
  if(liftLabel && !touch.active)prompt.textContent='E  ·  '+liftLabel;
  const pier=pierAt(local),fish=vitals.fishing;
  if(touch.active){
    const role=board || diving?'diving':local.swimming?'swimming':basketball?'basketball':volleyball?.member?'volleyball':vitals.clubSince!=null?'seat':jetPilot()?'jet':pilot?'heli':gunner?'turret':inTank()?'tank':boat || atYachtHelm()?'helm':inEngine()?'engine':isDriving()?(unarmedRoad()?'car':'armed-car'):local.ride?.kind==='board'?'skateboard':'foot';
    const active=!vitals.dead && !vitals.fall && !frozenPhase(world.match?.phase);
    const useLabel=(world.casino?.player==null && tablePrompt(local)) || volleyball?.use || safeLabel || pickupLabel || (beachAction && beachHint(beachAction)) || clubUse || bank?.label || shopLabel || building?.label || (person?'Talk to '+conversations[person].name:touchUseLabel(use));
    const seat=kind && !['jet','supercar','superyacht','tank'].includes(kind) && !myRoad()?.model
      ? [kind==='heli'?'Pilot':boat?'Helm':'Driver','Gunner'] : null;
    const mount=seat && vehicleById(world,kind);
    const occupancy=mount && [kind==='heli'?mount.pilot:mount.driver,mount.gunner].map(occupant=>occupant==null?'':occupant===id?'You':'Taken');
    touch.render(touchLayout({role,active,pistol,swapPistol:roadStation && hasMountedTool(roadStation),canRefuel,canSpear:spearReady(local),scuba:local.scuba,submerged:(local.swimDepth??0)>.06,jamBoard,fishAction:pier?fishingLabel(fish):null,canReload:magazine && magazine.rounds<magazine.capacity && magazine.reloadTicks==null,holsterLabel:gearAvailable?(manualHolster?'Draw':'Put away'):null,onBoard:!!board,canOpen:diving && diving.release==null,throwable:weapon===6,melee:!!meleeItems[weapon],cruiserLights:trafficCar?.patrol?!!trafficCar.emergencyLights:null,use:liftLabel || (dogTarget && !dogTarget.held?'Steal dog':useLabel),dogAction:dogTarget?(dogTarget.held?'Throw dog':'Kick dog'):null,occupancy,stance:canChangeStance(local)?(local.stance??'stand'):null,
      shoot:basketball && world.basketball.phase==='held' && world.basketball.players[world.basketball.turn]===id,canAim:canAim(),sighted:camera.sighted,jump:ladderLabel || (volleyball?.member?volleyball.action:local.ride?.kind==='bike'?(inSkatePark(local.x,local.z)?'Bunny hop':null):local.ride?'Ollie':local.climb || local.parachute==='open'?null:local.swimming?'Climb out':local.parachute==='packed'?'Deploy':'Jump'),
      sprint:touchSprint,seat,hook:world.heli.hook?.load,caseAction:!!mode,race:racing && !!drivenRoad(world,id),replay:world.mission?.stage==='complete'}));
    if(!volleyball && !talk.current && active && !garage && !refuelSite)prompt.textContent=bank && !bank.action && !bulletin?bank.detail:(local.climb?'Pulling up…':local.parachute==='packed'?'Free fall':sharkNearby?'Shark approaching · swim to shallow water':local.swimming?'Swimming':'');
    if(dogInfo)prompt.textContent=dogInfo;
  }
  if(pier){
    const label=fishingLabel(fish),action=touch.active?'Tap '+label:'G · '+label;
    prompt.textContent=pier.name+' fishing · '+fishingDetail(fish,world.simTick)+
      (fish?.phase==='waiting'?'':'   '+action);
    if(activeCast(fish))byId('kit').textContent='Fishing rod';
  }
  const canSpear=spearReady(local);
  canvas.classList.toggle('spear-sight',canSpear && byId('guide').hidden);
  if(canSpear){
    const record=vitals.spearfishing,last=record?.last;
    const tally=record?.count?' · '+record.count+' caught · '+record.score+' pts':'';
    const recent=last && world.simTick-last.tick<100;
    if(recent && last.catch){
      const fish=last.catch;
      prompt.textContent='Caught '+fishSpecies[fish.species].name+' · '+fish.lengthCm+' cm · +'+fish.points+' pts';
    }else if(recent)prompt.textContent='Miss · Aim at a nearby fish'+tally;
    else if(!sharkNearby)prompt.textContent=(touch.active?'Aim at a fish · Tap Spear':'Aim at a fish · F or click to spear')+tally;
  }
  if(local.swimming && local.outOfAir)prompt.textContent='Out of air · Surfacing';
  if(climbingLadder){
    prompt.textContent=local.climb.down?'Descending ladder…':'Climbing ladder…';
  }else if(ladderLabel){
    prompt.textContent=(touch.active?'Tap ':'Space · ')+ladderLabel;
    byId('space-action').textContent=ladderLabel;
  }
  if(board || diving){
    prompt.textContent=board?(touch.active?'Choose your dive':'Springboard · Space for straight dive · C for front flip'):(touch.active?'Tap Open for entry in the gold zone':'Press Space in the gold zone to open for entry');
    if(board?.kind==='platform')prompt.textContent=(touch.active?'Choose your dive':'Space · Straight dive   C · Front flip')+'   101A straight ×1.6   /   103C tuck ×1.5';
    if(board){
      const target=divingScores.targets(board.kind==='platform');
      if(target)prompt.textContent+=' · '+target;
    }
    byId('space-action').textContent=board?'Straight dive':'Open for entry';
    byId('crouch-action').textContent=board?'Front flip':'Crouch';
  }
}

function drawMap(player, remotes, yaw) {
  const w = map.width, h = map.height;
  const scale=CITY ? 1.34 : 3.25;
  const centerX=CITY ? player.x-clamp(player.x,-67,67) : 0;
  const centerZ=CITY ? Math.min(0,player.z+36)+Math.max(0,player.z-48) : Math.min(0,player.z+16);
  const sx = x => w / 2 + (x-centerX) * scale, sy = z => h * (CITY ? .48 : .57) + (z-centerZ) * scale;
  if(CITY) {
    ctx.fillStyle='#467e87';ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='#82a6aa';ctx.lineWidth=1;
    ctx.strokeRect(sx(travelBounds.west),sy(travelBounds.north),
      (travelBounds.east-travelBounds.west)*scale,(travelBounds.south-travelBounds.north)*scale);
    ctx.fillStyle='#899676';
    for(const {chart} of keyShores){
      ctx.beginPath();chart.forEach(([x,z],i)=>i?ctx.lineTo(sx(x),sy(z)):ctx.moveTo(sx(x),sy(z)));
      ctx.closePath();ctx.fill();
    }
    ctx.fillStyle='#69716b';ctx.fillRect(sx(coast.west),sy(coast.north),(coast.east-coast.west)*scale,(coast.south-coast.north)*scale);
    ctx.fillRect(sx(harbor.west),sy(harbor.north),(harbor.east-harbor.west)*scale,(harbor.south-harbor.north)*scale);
    for(const r of [...shorePads,...lanternLand,ferrySlip,...marketPiers,...marinaDecks])ctx.fillRect(sx(r.west),sy(r.north),(r.east-r.west)*scale,(r.south-r.north)*scale);
    ctx.fillStyle='#d3bb8c';ctx.fillRect(sx(beach.west),sy(beach.north),25*scale,(beach.south-beach.north)*scale);
    ctx.fillStyle='#b1aba0';
    for(const road of [causeway,lanternBridge,...streetPlan.roads,...lanternRoads])
      ctx.fillRect(sx(road.west),sy(road.north),(road.east-road.west)*scale,(road.south-road.north)*scale);
    if(Math.hypot(player.x-marinaPlatform.x,player.z-marinaPlatform.near)<102){
      const px=sx(marinaPlatform.x),py=sy(marinaPlatform.near);
      ctx.fillStyle='#e9c978';ctx.fillRect(px-1.5,py-3,3,9);
      ctx.save();ctx.font='bold 9px sans-serif';ctx.textAlign='right';ctx.strokeStyle='#203e46';ctx.lineWidth=2;
      ctx.strokeText('10m Dive',px-3,py);ctx.fillText('10m Dive',px-3,py);ctx.restore();
    }
    if(racing){
      const next=vitals.race?.phase==='racing'?sprintGates[vitals.race.next]:sprintStart;
      ctx.fillStyle='#6affdc';ctx.beginPath();ctx.arc(sx(next.x),sy(next.z),4,0,Math.PI*2);ctx.fill();
    }
    ctx.fillStyle='#3b4b4c';
    for(const b of [...MAP.buildings,...lanternBuildings,...fanDecks,...arcadeDecks,supperDeck]) ctx.fillRect(sx(b.x-b.w/2),sy(b.z-b.d/2),b.w*scale,b.d*scale);
    if(world.volleyball){
      for(const [i,{x,z}] of courts.entries()){
        ctx.strokeStyle=world.volleyball[i].phase==='closed'?'#776758':'#237286';
        ctx.strokeRect(sx(x-courtHalfWidth),sy(z-courtHalfLength),courtHalfWidth*2*scale,courtHalfLength*2*scale);
        ctx.beginPath();ctx.moveTo(sx(x-courtHalfWidth),sy(z));ctx.lineTo(sx(x+courtHalfWidth),sy(z));ctx.stroke();
      }
    }
  } else {
  ctx.fillStyle = '#31473a'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = '#a8bdaa25'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x < w; x += 24) { ctx.moveTo(x,0); ctx.lineTo(x,h); }
  for (let y = 0; y < h; y += 24) { ctx.moveTo(0,y); ctx.lineTo(w,y); }
  ctx.stroke();
  ctx.strokeStyle = '#638e8b'; ctx.lineWidth = 10;
  ctx.beginPath(); ctx.moveTo(0,sy(0)); ctx.lineTo(w,sy(0)); ctx.stroke();
  ctx.strokeStyle = '#c1ac7f'; ctx.lineWidth = 4; ctx.lineJoin = 'round';
  for(const path of [MAP.trail,MAP.northTrail,churchPath]){
    ctx.beginPath();path.forEach(([x,z],i)=>i?ctx.lineTo(sx(x),sy(z)):ctx.moveTo(sx(x),sy(z)));ctx.stroke();
  }
  }
  if(!CITY){
    ctx.fillStyle='#f2dfc2';ctx.font='bold 11px sans-serif';ctx.textAlign='center';
    ctx.fillText('Church',sx(church.x),sy(church.z));
  }
  ctx.fillStyle = '#e8bb71'; ctx.fillRect(sx(MAP.lookout.x)-4,sy(MAP.lookout.z)-4,8,8);
  for (const piece of BREAKABLES) {
    if (world.hp[piece.id] === 0) continue;
    ctx.fillStyle = '#acdbcf'; ctx.fillRect(sx(piece.x)-2,sy(piece.z)-2,4,4);
  }
  if(route){
    ctx.save();ctx.lineJoin='round';ctx.lineWidth=3;ctx.strokeStyle='#7fe9fc';
    ctx.beginPath();route.line.forEach(([x,z],i)=>i?ctx.lineTo(sx(x),sy(z)):ctx.moveTo(sx(x),sy(z)));ctx.stroke();
    ctx.fillStyle='#b7f6ff';ctx.beginPath();ctx.arc(sx(route.goal[0]),sy(route.goal[1]),4,0,Math.PI*2);ctx.fill();ctx.restore();
  }
  if(world.basketball){
    const {x,z,width,length}=basketballCourt;
    ctx.fillStyle='#438786';ctx.strokeStyle='#f6dfaf';ctx.lineWidth=1.5;
    ctx.fillRect(sx(x-width/2),sy(z-length/2),width*scale,length*scale);
    ctx.strokeRect(sx(x-width/2),sy(z-length/2),width*scale,length*scale);
    ctx.fillStyle='#f2a963';ctx.beginPath();ctx.arc(sx(x),sy(z),5,0,2*Math.PI);ctx.fill();
    ctx.strokeStyle='#7e5436';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(sx(x)-5,sy(z));ctx.lineTo(sx(x)+5,sy(z));
    ctx.moveTo(sx(x),sy(z)-5);ctx.lineTo(sx(x),sy(z)+5);ctx.stroke();
  }
  const heli = world.heli;
  ctx.font = 'bold 15px sans-serif'; ctx.textAlign = 'center';
  ctx.fillStyle = '#ffae60'; ctx.fillText('H', sx(heli.x), sy(heli.z) - 4);
  if(world.tank){ctx.fillStyle='#dae5a1';ctx.fillText('T',sx(world.tank.x),sy(world.tank.z)-4);}
  if(world.jet){ctx.fillStyle='#9de3ff';ctx.fillText('J',sx(world.jet.x),sy(world.jet.z)-4);}
  ctx.fillStyle = '#ffe085'; ctx.fillText('R',sx(world.rover.x),sy(world.rover.z)-4);
  if(world.supercar){ctx.fillStyle='#ff9651';ctx.fillText('GT',sx(world.supercar.x),sy(world.supercar.z)-4);}
  for(const b of world.boats??[]){
    ctx.fillStyle=b.wrecked?'#7b8181':b.boatModel?'#edcf9b':'#eff3df';ctx.fillText(b.boatModel?'◆':'B',sx(b.x),sy(b.z));
  }
  if(world.yacht){ctx.fillStyle='#f5dba7';ctx.fillText('Y',sx(world.yacht.x),sy(world.yacht.z)-4);}
  ctx.fillStyle='#f4cc70';ctx.font='bold 10px sans-serif';
  for(const g of roadGarages)ctx.fillText('⚒',sx(g.x)-3,sy(g.z)-3);
  ctx.save();
  ctx.font='bold 10px sans-serif';ctx.textAlign='center';ctx.fillStyle='#fff3ad';ctx.strokeStyle='#29413c';ctx.lineWidth=2.5;
  for(const site of fuelSites){
    const x=sx(site.x),z=sy(site.z);
    ctx.strokeText('⛽',x,z);ctx.fillText('⛽',x,z);
  }
  ctx.restore();
  if(CITY){
    const x=sx(reefDiveSite.x),y=sy(reefDiveSite.z);
    if(x>=0 && x<w && y>=0 && y<h){
      ctx.save();
      ctx.fillStyle='#c52c35';ctx.strokeStyle='#fff';ctx.lineWidth=1.4;
      ctx.fillRect(x-6,y-5,12,9);ctx.strokeRect(x-6,y-5,12,9);
      ctx.beginPath();ctx.moveTo(x-5,y-4);ctx.lineTo(x+5,y+3);ctx.stroke();
      const labelLeft=x>w-66;
      ctx.font='bold 10px sans-serif';ctx.textAlign=labelLeft?'right':'left';
      ctx.strokeStyle='#193437';ctx.lineWidth=2.6;ctx.fillStyle='#fff';
      const labelX=x+(labelLeft?-9:9), labelY=clamp(y+3,10,h-2);
      ctx.strokeText(reefDiveSite.name,labelX,labelY);ctx.fillText(reefDiveSite.name,labelX,labelY);
      ctx.restore();
    }
  }
  if(world.match)drawMatchMap(ctx,sx,sy,world.match,vitals.team);
  else if(!zombies)drawSupplyMap(ctx,sx,sy,world,player,id);
  if(market.chart && world.market){
    ctx.fillStyle='#d4ff98';ctx.font='bold 13px sans-serif';ctx.textAlign='center';
    for(const d of world.market.drops)ctx.fillText(d.cash?'$':'+',sx(d.x),sy(d.z)-3);
  }
  for (const remote of remotes) {
    ctx.fillStyle = teamColors[remote.team] ?? '#b3e6ec'; ctx.beginPath(); ctx.arc(sx(remote.x),sy(remote.z),5,0,Math.PI*2); ctx.fill();
  }
  ctx.save(); ctx.translate(sx(player.x),sy(player.z)); ctx.rotate(yaw);
  ctx.fillStyle = '#fcf5ce'; ctx.strokeStyle = '#19291f'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(0,-10); ctx.lineTo(7,7); ctx.lineTo(0,4); ctx.lineTo(-7,7); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
}

// Enable a local frame-time readout on a phone with ?perf=1.
const frameReadout = new URLSearchParams(location.search).get('perf') === '1' ? document.createElement('small') : null;
const frameTimes = [];
let previousRender = 0;
let worstFrame={preMs:0,updateMs:0,drawMs:0,totalMs:0};
if (frameReadout) {
  byId('location').parentElement.append(frameReadout);
  document.addEventListener('visibilitychange', () => { previousRender = 0; frameTimes.length = 0; });
}
function measureFrame(time, players, cost) {
  if (previousRender) frameTimes.push(time - previousRender);
  previousRender = time;
  for(const key of Object.keys(worstFrame))worstFrame[key]=Math.max(worstFrame[key],cost[key]);
  if (frameTimes.length < 120) return;
  const elapsed = frameTimes.reduce((sum, t) => sum + t, 0);
  frameTimes.sort((a, b) => a - b);
  const p95 = frameTimes[Math.ceil(frameTimes.length * .95) - 1];
  frameReadout.textContent = (1000 * frameTimes.length / elapsed).toFixed(0) + ' FPS · 95th ' + p95.toFixed(0) + ' ms · ' + players + ' online · worst pre/update/draw/total ' + Object.values(worstFrame).map(ms=>ms.toFixed(0)).join('/') + ' ms';
  frameTimes.length = 0;
  worstFrame={preMs:0,updateMs:0,drawMs:0,totalMs:0};
}
function frame(time) {
  // On high-refresh displays keep the prototype's visual workload near 60 frames/s.
  if (time+.75 < nextFrame) { requestAnimationFrame(frame); return; }
  const frameStart=frameReadout?performance.now():0;
  const interval=1000/60;
  nextFrame=nextFrame && time-nextFrame<interval ? nextFrame+interval : time+interval;
  const dt = clamp((time - lastTime) / 1000, 0, .14);
  lastTime = time;
  if (edgeYaw || edgePitch) {
    if (!windowBlurred && !document.hidden && canvas.matches(':hover')) {
      camera.yaw += edgeYaw * dt;
      camera.pitch = viewPitch(camera.pitch + edgePitch * dt);
    } else {
      stopLook();
    }
  }
  accumulator += dt;
  while (accumulator >= step) { tick(); accumulator -= step; }
  if (self) {
    const t = accumulator / step;
    const free=!atTable() && vitals.clubSince==null && !vitals.dead && !vitals.fall && !self.climb && !isPilot() && !isDriving() && !gunnerRole() && !frozenPhase(world.match?.phase);
    const motion=free ? movementInput() : null;
    const display=free ? stepPlayer(self,{...motion,swimY:self.swimming?Number(down('Space'))-Number(down('KeyC')):0,throttle:motion.forward,steer:motion.lateral,jump:queuedJump,yaw:facing,stance:requestedStance,deploy:queuedDeploy},accumulator,world.hp,world) : self;
    const local = { ...display,carShot:vitals.carShot,burning:vitals.burning,lastDive:vitals.lastDive,paradeCostume:costume.checked,clubSince:vitals.clubSince,beachPose:vitals.beachPose,beachOrder:vitals.beachOrder, race:vitals.race, team:vitals.team, lostParts:vitals.lostParts, hp: vitals.hp, maxHp: vitals.maxHp, dead: vitals.dead, deathKind:vitals.deathKind, protected: vitals.protected, id, yaw: self.fall ? self.yaw : facing,
      moving:motion?.moving??moving, sprint:motion?.sprint??sprint };
    const traffic={...remoteFrame(time)};
    if(predictedDriver){
      const kind=predictedDriver.kind, pose=predictedDriver.pose(t);
      const localCar=predictedDriver.vehicleId ? myRoad() : world[kind];
      if(localCar?.boarding || localCar?.takeover){
        const elapsed=clamp((time-(samples.at(-1)?.time??time))*.001,0,.075);
        const key=localCar.boarding?'boarding':'takeover',action=localCar[key];
        pose[key]={...action,progress:Math.min(1,action.progress+elapsed/(key==='boarding'?boardingSeconds:.95))};
      }
      if(kind==='boat')traffic.boats=world.boats.map(b=>b.driver===id ? {...b,...pose} : traffic.boats.find(v=>v.id===b.id)??b);
      else if(predictedDriver.vehicleId){
        traffic.traffic=world.traffic.map(v=>v.id===predictedDriver.vehicleId?{...v,...pose}:traffic.traffic?.find(c=>c.id===v.id)??v);
      }else traffic[kind]={...world[kind],...pose};
    }
    const {players:remotes,npcs,heli,rover,supercar,yacht:sampledYacht,boats:sampledBoats=[],jet:remoteFrameJet}=traffic;
    const yacht=world.yacht?.driver!==sampledYacht?.driver || world.yacht?.gunner!==sampledYacht?.gunner ? world.yacht : sampledYacht;
    const shownJet=remoteFrameJet?.pilot===world.jet?.pilot ? remoteFrameJet : world.jet;
    const aircraft=jetPilot()?shownJet:heli;
    const assigned=myBoat();
    const boats=localBoatFrame(sampledBoats,assigned,id);
    const boat=assigned && boats.find(b=>b.id===assigned.id);
    const tank=world.tank?.driver===traffic.tank?.driver ? traffic.tank : world.tank;
    const cars=traffic.traffic??[];
    const road=inTank()?tank:myRoad()?.model ? cars.find(c=>c.driver===id)??myRoad() : inGT() ? supercar : rover;
    local.weapon = weapon;local.spearfishing=vitals.spearfishing;local.fishing=vitals.fishing;local.holstered=manualHolster || !!activeCast(vitals.fishing);
    local.meleeSwing=vitals.meleeSwing;
    if (isPilot()) Object.assign(local, { x: aircraft.x, y: aircraft.y, z: aircraft.z, yaw: aircraft.yaw });
    if(boat?.driver===id)Object.assign(local,helmFeet(boat),{yaw:boat.yaw});
    else if (atYachtHelm() && yacht)Object.assign(local,yachtHelmFeet(yacht),{yaw:yacht.yaw});
    else if (isDriving()) Object.assign(local, { x: road.x, y: road.y, z: road.z, yaw: road.yaw });
    if(yacht && !atYachtHelm() && !isPilot() && aboardYacht(world.yacht,local))Object.assign(local,carryOnYacht(world.yacht,yacht,local));
    const role=gunnerRole();
    if(role) Object.assign(local,gunnerFeet(role==='superyacht'?yacht:role==='tank'?tank:boat??(role==='rover' ? rover : heli),role));
    const view = jetPilot() ? {...camera,yaw:aircraft.yaw,pitch:aircraft.pitch} : isDriving() && !inTank() ? drivingView(atYachtHelm() ? yacht??world.yacht : boat??road, dt, !atYachtHelm() && !boat) : camera;
    view.spearSight=spearReady(local);view.marinaSprint=racing;view.touch=touch.active;view.basketball=playingHoops();
    const patrolCars=world.patrolCars?.map(c=>({...c,...traffic.patrolCars?.find(v=>v.id===c.id),npcDriver:c.npcDriver,wrecked:c.wrecked,hp:c.hp}));
    const roadTraffic=patrolCars?.length?[...cars,...patrolCars]:cars;
    audio.patrolSiren(local,view.yaw,roadTraffic,dt);
    audio.trafficEngines(local,view.yaw,roadTraffic);
    audio.roadTires(local,view.yaw,[rover,supercar,...roadTraffic]);
    audio.engines(local,view.yaw,heli,rover,boats,world.heli.chainFiring && (world.heli.gunner!=null || world.heli.pilot!=null) && !world.heli.wrecked,supercar);
    audio.tankEngine(local,view.yaw,tank);
    audio.yachtEngine(local,view.yaw,yacht);
    audio.jetEngine(local,view.yaw,shownJet,dt);
    const latest=samples.at(-1),volleyballTick=(world.simTick??0)-1+clamp((time-(latest?.time??time))*.03,0,2);
    const sceneStart=frameReadout?performance.now():0;
    const frameCost=scene.render(local, remotes, view, dt, { ...world, patrolCars, traffic:cars, tank, jet:shownJet, heli, rover, supercar, boats, yacht, npcs, bullets:roundFrame(time),volleyballAthletes:traffic.volleyball,volleyballTick,meleeRemoteTick:(traffic.sim??0)*.03,frameTick:volleyballTick });
    if(frameReadout)measureFrame(time,remotes.length+1,{preMs:sceneStart-frameStart,...frameCost,totalMs:performance.now()-frameStart});
    if (time >= nextHud) {
      nextHud = time + 80;
      hoopsHud.update(world.basketball,local,view.yaw,touch.active);
      const direction = (Math.round(view.yaw / (Math.PI / 4)) % 8 + 8) % 8;
      byId('bearing').textContent = headings[direction];
      byId('degrees').textContent=String((Math.round(view.yaw*180/Math.PI)%360+360)%360).padStart(3,'0')+'°';
      byId('left-bearing').textContent = headings[(direction + 7) % 8];
      byId('right-bearing').textContent = headings[(direction + 1) % 8];
      const upstairs=roomAtFeet(local,world.doors);
      const interior=CITY && (storefrontRoom(local.x,local.y,local.z) || retailRoom(local.x,local.y,local.z) || galleryRoomAt(local.x,local.y,local.z) || (casaRoomAt(local.x,local.y,local.z) && {name:'Casa de Luma'}));
      byId('location').textContent = (atYachtHelm() || aboardYacht(yacht,local)) ? 'Solana · Superyacht' : CITY && inClub(local)?'Club Lucero':upstairs ? (upstairs.l?upstairs.p.name+' · Floor '+(upstairs.l.n+2)+' · '+(upstairs.label==='Hall'?'Hall':'Room '+upstairs.label):upstairs.label) :interior ? interior.name : CITY && inPalazzoMare(local.x,local.y,local.z) ? 'Palazzo Mare' : CITY && Math.hypot(local.x-valet.x,local.z-valet.z)<6?'Palma de Sal · Valet' : CITY ? (lanternLocation(local.x,local.z) ?? (onBasketballCourt(local) && Math.abs(local.y-basketballCourt.y)<3 ? basketballCourt.name : atBeachClub(local) ? 'Harbor Key Beach Club' : onBeach(local.x,local.z) ? 'Harbor Key Beach' : local.z<harbor.south ? 'Harbor Key' : local.z<coast.north ? 'North Causeway' : local.x>24 || local.z < -48 ? 'Biscayne Bayfront' : 'Brickell Avenue')) : Math.hypot(local.x - MAP.lookout.x, local.z - MAP.lookout.z) < 6 ? 'The Lookout'
        : Math.abs(local.z) < 5.2 ? (Math.abs(local.x) < 2.5 ? 'Timber Bridge' : 'Cedar Creek')
        : churchLot(local.x,local.z) ? 'North Meadow Church' : local.z< -68 ? 'Granite Ridge' : local.z< -37 ? 'North Meadow' : local.z < -5 ? 'Summit Trail' : Math.hypot(local.x,local.z - 15) < 6 ? 'Trailhead' : 'Pine Loop';
      if(racing)sprintHud(byId('marina-card'),vitals.race,drivenRoad(world,id),local,sprintBoard,touch.active);
      updateEquipment(local);
      if(world.survival)survivalHud(world.survival,remotes.length+1);
      else if(world.match)updateMatchHud(world.match,vitals.team,local);
      else updateSupplyHud(world,local,id,touch.active);
      if(navigate){
        route=navigate(local.x,local.z,isDriving()?local.yaw:view.yaw);
        byId('nav-cue').textContent=route.cue+(route.cue==='Arrived' || !route.meters?'':' · '+route.meters+' m');
      }
      drawMap(local, remotes, view.yaw);
    }
  }
  requestAnimationFrame(frame);
}

try {
  scene = createScene(canvas);
  try{lighting.value=localStorage.getItem('pinewatch-lighting')??(zombies?'dusk':'day');}catch{}
  if(!lighting.value)lighting.value='day';
  scene.setLighting(lighting.value);
  lighting.onchange=()=>{
    scene.setLighting(lighting.value);
    try{localStorage.setItem('pinewatch-lighting',lighting.value);}catch{}
    canvas.focus({preventScroll:true});
  };
  window.addEventListener('resize', () => scene.resize());
  scene.resize();
  connect();
  requestAnimationFrame(frame);
} catch (error) {
  console.error(error);
  byId('presence').textContent = 'Unavailable';
  notice('goy theft auto could not initialize 3D graphics. Open it in a desktop browser with WebGL 2 enabled.');
}
