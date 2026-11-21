import {conversations} from './brickell-conversations.js';

export function conversationView(panel,onOpen,onClose){
  const name=panel.querySelector('h2'),line=panel.querySelector('[data-speech]'),topics=panel.querySelector('[data-topics]');
  const leave=panel.querySelector('[data-leave]');
  let current=null;
  function close(){
    if(!current)return;
    current=null;panel.close();onClose();
  }
  function open(id){
    const person=conversations[id];
    if(!person)return;
    current=id;onOpen();
    name.textContent=person.name+' · '+person.age;
    line.textContent=person.greeting;
    topics.replaceChildren(...person.topics.map(([label,reply],index)=>{
      const btn=document.createElement('button');
      btn.type='button';btn.textContent=(index+1)+'. '+label;
      btn.onclick=()=>{line.textContent=reply;};
      return btn;
    }));
    panel.showModal();topics.firstElementChild.focus({preventScroll:true});
  }
  leave.onclick=close;
  panel.addEventListener('cancel',e=>{e.preventDefault();close();});
  return {get current(){return current;},open,close,
    answer(index){topics.children[index]?.click();}};
}
