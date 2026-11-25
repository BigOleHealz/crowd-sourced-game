import {platformDive} from './platform-judges.js';

const storageKey='goy-theft-auto.dive-bests.v1';
const recordKey=(platform,flip)=>(platform?'platform':'springboard')+(flip?'-tuck':'-straight');
const format=(n,platform)=>n.toFixed(platform?2:1);

export function scoringJudges(awards){
  const ordered=awards.map((value,i)=>({value,i})).sort((a,b)=>a.value-b.value || a.i-b.i);
  return new Set(ordered.slice(2,5).map(v=>v.i));
}

function element(tag,cls,text){
  const node=document.createElement(tag);node.className=cls;node.textContent=text;return node;
}

export function diveScorecard(panel){
  const best=Object.create(null);
  let lastDrawn='',lastOwn,recentRecord;
  function readBest(){
    try{
      const stored=JSON.parse(localStorage.getItem(storageKey));
      for(const [key,value] of Object.entries(stored??{})){
        if(Number.isFinite(value) && value>=0)best[key]=Math.max(best[key]??0,value);
      }
    }catch{}
  }
  readBest();
  return {
    observe(mark){
      if(!mark){lastOwn=null;return;}
      if(lastOwn?.tick===mark.tick && lastOwn.x===mark.x && lastOwn.z===mark.z)return;
      lastOwn=mark;readBest();
      const j=mark.judging,value=j?.points??mark.score,key=recordKey(!!j,mark.flip),before=best[key];
      recentRecord={value,before};
      if(before!=null && value<=before)return;
      best[key]=value;
      try{localStorage.setItem(storageKey,JSON.stringify(best));}catch{}
    },
    targets(platform){
      const parts=[];
      for(const flip of [false,true]){
        const value=best[recordKey(platform,flip)];
        if(value!=null)parts.push((flip?'Flip ':'Straight ')+format(value,platform));
      }
      return parts.length?'Best · '+parts.join(' / ')+(platform?' pts':' of 10'):'';
    },
    show(mark,spectatorName){
      const stamp=[spectatorName,mark.tick,mark.x,mark.z,mark.flip,mark.score].join('/');
      if(stamp===lastDrawn)return;
      lastDrawn=stamp;
      const j=mark.judging,platform=!!j,value=j?.points??mark.score;
      const title=platform?j.code+' · '+platformDive(mark.flip).name:(mark.flip?'Pool · Front flip':'Pool · Straight dive');
      const score=element('div','dive-points',format(value,platform));
      score.append(element('small','',platform?' pts':' / 10'));
      const pieces=[element('div','dive-headline',title),score,element('div','dive-entry-note',mark.note)];
      if(j){
        const judges=element('div','dive-judges',''),counted=scoringJudges(j.awards);
        j.awards.forEach((award,index)=>{
          const item=element('span',counted.has(index)?'counted':'trimmed',award.toFixed(1));
          item.title='Judge '+(index+1)+(counted.has(index)?' · counted':' · discarded');
          item.setAttribute('aria-label',item.title+' · '+award);
          judges.append(item);
        });
        pieces.push(judges,element('small','dive-math','Middle three × '+j.dd.toFixed(1)+' difficulty'));
      }
      if(spectatorName){
        pieces.push(element('div','dive-spectator',spectatorName+'’s dive'));
      }else{
        const before=recentRecord?.before,top=best[recordKey(platform,mark.flip)]??value;
        const line=before!=null && value>before?'New personal best · +'+format(value-before,platform):
          'Personal best · '+format(top,platform)+(platform?' pts':' / 10');
        pieces.push(element('div','dive-record',line));
      }
      panel.replaceChildren(...pieces);
    },
  };
}
