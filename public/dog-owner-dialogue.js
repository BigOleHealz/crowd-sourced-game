import {crowdVoices} from './crowd-panic-audio.js';

// The fallback performances are part of the game's credited CC0 voice bank.
const lines={
  'rival-fern': {say:'Hey! Bring my dog back!',clip:crowdVoices[5][3],fallback:'Stop it!',pitch:1.09},
  'rival-rosa': {say:'Stop! Give Biscuit back!',clip:crowdVoices[5][11],fallback:'What are you doing?',pitch:.98},
  'rival-santi':{say:'Hey! Give me back my dog!',clip:crowdVoices[3][5],fallback:'Help!',pitch:.86},
};

export function dogOwnerDialogue(){
  let previous;
  return {
    reset(dogs){previous=dogs;},
    step(world,listener,emit){
      if(previous===world.dogs)return;
      const before=previous;previous=world.dogs;
      if(!before || !previous || !Number.isFinite(world.simTick))return;
      for(const dog of previous){
        const tick=dog.theftTick,old=before.find(d=>d.id===dog.id);
        if(!old || !Number.isFinite(tick) || tick<=(old.theftTick??-1) || world.simTick<tick || world.simTick-tick>22)continue;
        const owner=world.npcs?.find(n=>n.id===dog.walker),line=lines[dog.walker];
        if(!owner || !line || owner.dead || owner.fall || owner.hp===0)continue;
        const mouth={x:owner.x,y:owner.y+1.45,z:owner.z};
        const distance=Math.hypot(listener.x-mouth.x,listener.y+1.35-mouth.y,listener.z-mouth.z);
        if(distance<27)emit(line,owner,mouth,Math.min(1,(27-distance)/9),tick);
      }
    },
  };
}

// Use a local browser voice where available. If the speech engine fails to start
// promptly, a recorded spatial shout still lands on the theft instead of much later.
export function ownerSpeech(browser=globalThis){
  let active;
  function stop(){
    if(!active)return;
    clearTimeout(active.timer);
    const clip=active;active=null;
    clip.utterance.onstart=clip.utterance.onerror=clip.utterance.onend=null;
    browser.speechSynthesis?.cancel();
  }
  function say(line,volume,fallback){
    const speech=browser.speechSynthesis,Utterance=browser.SpeechSynthesisUtterance;
    const voices=speech?.getVoices().filter(v=>v.localService && /^en(?:[-_]|$)/i.test(v.lang));
    if(!Utterance || !voices?.length || active || speech.speaking || speech.pending){fallback();return;}
    const utterance=new Utterance(line.say);
    utterance.voice=voices.find(v=>v.default)??voices[0];utterance.lang=utterance.voice.lang;
    utterance.volume=Math.min(1,volume);utterance.pitch=line.pitch;utterance.rate=1.13;
    const clip={utterance,started:false,timer:null};active=clip;
    const fail=()=>{
      if(active!==clip)return;
      const started=clip.started;stop();if(!started)fallback();
    };
    utterance.onstart=()=>{clip.started=true;clearTimeout(clip.timer);};
    utterance.onend=()=>{if(active===clip){clearTimeout(clip.timer);active=null;}};
    utterance.onerror=fail;clip.timer=setTimeout(fail,550);
    try{speech.speak(utterance);}catch{fail();}
  }
  return {say,stop};
}
