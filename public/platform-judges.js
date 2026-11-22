// World Aquatics Competition Regulations, Part Four §9.1.5 and Appendix 11 (10 m).
// Execution is judged from game motion. All seven judges see the same attempt.
export function platformDive(flip){
  return flip?{code:'103C',dd:1.5,name:'Forward 1½ somersaults, tuck'}:{code:'101A',dd:1.6,name:'Forward dive, straight'};
}

export function platformTotal(awards,dd){
  const middle=[...awards].sort((a,b)=>a-b).slice(2,5);
  return Math.round(middle.reduce((sum,n)=>sum+n,0)*dd*100)/100;
}

export function judgePlatform(d,entryX,angle){
  const {code,dd}=platformDive(d.flip);
  const clamp=n=>Math.min(1,Math.max(0,n));
  const angleError=Math.abs(Math.abs(angle)-(d.flip?3:1)*Math.PI);
  const release=d.release==null?0:clamp(1-Math.abs(d.release/d.duration-.76)/.36);
  const entry=clamp(1-angleError/(Math.PI/2));
  const takeoff=clamp(1-Math.abs(d.startX-d.centerX)/1.7);
  const flight=clamp(1-Math.abs(entryX-d.startX)/2);
  // Each simulated judge gives one impression of the entire dive, with modest
  // differences in how much the flight line and the entry affect that impression.
  const awards=Array.from({length:7},(_,i)=>{
    if(angleError>=Math.PI*.5)return 0; // the announced head-first dive was missed
    const w=i/6,quality=takeoff*(.12+.08*w)+flight*(.18-.08*w)+release*(.27-.08*w)+entry*(.43+.08*w);
    return Math.round(clamp(quality)*20)/2;
  });
  return {code,dd,awards,points:platformTotal(awards,dd)};
}

export function platformReport(mark){
  const {points,code,dd,awards}=mark.judging;
  return code+' · '+points.toFixed(2)+' points · '+mark.note+'\nJudges  '+awards.map(n=>n.toFixed(1)).join('  ')+'\nMiddle three × '+dd.toFixed(1)+' difficulty';
}
