const byId = id => document.getElementById(id);
const dialog = byId('account-dialog');
const form = byId('account-form');
const message = byId('account-message');
let mode = 'register';
let enabled = false;

function setMode(next) {
  mode = next;
  byId('account-submit').textContent = mode === 'register' ? 'Create account' : 'Sign in';
  byId('account-switch').textContent = mode === 'register' ? 'Already have an account? Sign in' : 'Need an account? Create one';
  form.elements.password.autocomplete = mode === 'register' ? 'new-password' : 'current-password';
  message.textContent = '';
}
function showProfile(account) {
  byId('account-open').textContent = account ? account.username : 'Guest · Account';
  byId('account-profile').hidden = !account;
  form.hidden = !enabled || !!account;
  if (!account) return;
  byId('account-username').textContent = account.username;
  byId('account-kills').textContent = account.kills;
  byId('account-deaths').textContent = account.deaths;
  byId('account-time').textContent = Math.floor(account.play_seconds / 60) + ' min';
  byId('account-sessions').textContent = account.sessions;
}
async function refresh() {
  try {
    const response = await fetch('/api/account', { credentials: 'same-origin', cache: 'no-store' });
    const result = await response.json();
    enabled = response.ok && result.enabled;
    showProfile(result.account);
    if (!enabled) message.textContent = result.error || 'Accounts are unavailable right now. You can still play as a guest.';
  } catch {
    enabled = false;
    showProfile(null);
    message.textContent = 'Accounts are unavailable right now. You can still play as a guest.';
  }
}
byId('account-open').addEventListener('click', () => { dialog.showModal(); refresh(); });
byId('account-close').addEventListener('click', () => dialog.close());
byId('account-switch').addEventListener('click', () => setMode(mode === 'register' ? 'login' : 'register'));
form.addEventListener('submit', async event => {
  event.preventDefault();
  if (!enabled) return;
  const button = byId('account-submit');
  button.disabled = true;
  message.textContent = '';
  try {
    const response = await fetch('/api/account/' + mode, {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: form.elements.username.value, password: form.elements.password.value }),
    });
    const result = await response.json();
    if (!response.ok) { message.textContent = result.error || 'Could not sign in.'; return; }
    location.reload();
  } catch { message.textContent = 'Connection failed. Please try again.'; }
  finally { button.disabled = false; }
});
byId('account-logout').addEventListener('click', async () => {
  try {
    const response = await fetch('/api/account/logout', { method: 'POST', credentials: 'same-origin' });
    if (!response.ok) throw new Error('Sign out failed');
    location.reload();
  } catch { message.textContent = 'Could not sign out. Please try again.'; }
});
refresh();
