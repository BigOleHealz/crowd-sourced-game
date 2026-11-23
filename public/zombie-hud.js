const card = document.getElementById('zombie-card');
const status = document.getElementById('zombie-status');
const tally = document.getElementById('zombie-tally');
const start = document.getElementById('zombie-start');

export function survivalHud(run, size) {
  card.hidden = false;
  const lobby = run.phase==='lobby', finished = run.phase==='finished';
  card.classList.toggle('run-finished',finished);
  const title = lobby ? 'Harbor Key · '+size+' in squad' :
    finished ? 'Squad down · Final score '+run.score.toLocaleString() :
    run.phase==='ready' ? 'Wave '+run.wave+' in '+run.readyIn+'s' :
    'Wave '+run.wave+' · '+run.waveKills+' / '+run.goal+' defeated';
  if (status.textContent!==title) status.textContent=title;
  tally.textContent = lobby ? 'Invite friends to this mode, then start together.' :
    finished ? run.kills+' kills · Reached wave '+run.wave :
    run.score.toLocaleString()+' points · '+run.kills+' squad kills';
  start.hidden = !lobby && !finished;
  start.textContent = finished ? 'Play again' : 'Start run';
}
