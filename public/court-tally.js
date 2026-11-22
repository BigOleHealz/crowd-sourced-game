// Both courts publish their points in team order. Only update changed text so
// the live status and score labels remain quiet on idle snapshot updates.
export function setScoreText(node,text){
  const value=String(text);
  if(node.textContent!==value)node.textContent=value;
}
export function courtTally(panel){
  const teams=[...panel.querySelectorAll('.court-tally > div')].map(row=>({
    score:row.querySelector('b'),badge:row.querySelector('small'),
  }));
  return (points,side,active,role)=>{
    for(const [i,team] of teams.entries()){
      setScoreText(team.score,points[i]);
      setScoreText(team.badge,[i===side?'You':'',i===active?role:''].filter(Boolean).join(' · '));
    }
  };
}
