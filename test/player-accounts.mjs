import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { randomInt } from 'node:crypto';
import { test } from 'node:test';
import pg from 'pg';
import { WebSocket } from 'ws';

test('registration, login, WebSocket identity, play time and logout persist in Postgres',
  { skip: !process.env.TEST_DATABASE_URL && 'Set TEST_DATABASE_URL to run the database integration test' },
  async () => {
    const port = randomInt(45000, 55000);
    const base = `http://127.0.0.1:${port}`;
    const username = `player_${randomInt(1_000_000_000)}`;
    const password = 'local-test-password-123';
    const database = new pg.Pool({ connectionString: process.env.TEST_DATABASE_URL });
    const server = spawn(process.execPath, ['server.js'], {
      env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL, HOST: '127.0.0.1', PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    server.stdout.on('data', data => { output += data; });
    server.stderr.on('data', data => { output += data; });
    async function post(path, data, cookie, origin = base) {
      return fetch(base + '/api/account/' + path, {
        method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) },
        body: JSON.stringify(data),
      });
    }
    try {
      let ready = false;
      for (let i = 0; i < 100; i++) {
        if (server.exitCode != null) break;
        try { const response = await fetch(base + '/api/account'); ready = response.ok; if (ready) break; }
        catch {}
        await delay(100);
      }
      assert.ok(ready, `server did not start: ${output}`);
      const blocked = await post('register', { username, password }, null, 'https://evil.example');
      assert.equal(blocked.status, 403);
      const created = await post('register', { username, password });
      assert.equal(created.status, 201, await created.text());
      const cookie = created.headers.get('set-cookie').split(';')[0];
      assert.match(created.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
      assert.equal((await post('register', { username, password })).status, 409);
      assert.equal((await post('login', { username, password: 'incorrect-password' })).status, 401);
      const profile = await fetch(base + '/api/account', { headers: { Cookie: cookie } });
      const firstAccount = (await profile.json()).account;
      assert.equal(firstAccount.username, username);
      assert.equal((await post('stats', { kills: 999 }, cookie)).status, 404);
      const store = await import('../player-accounts.js');
      const writer = await store.createAccountStore(process.env.TEST_DATABASE_URL);
      await writer.stats(firstAccount.id, 2, 1, 0);
      await writer.close();
      const totals = await fetch(base + '/api/account', { headers: { Cookie: cookie } });
      assert.equal((await totals.json()).account.kills, 2);
      const deaths = await fetch(base + '/api/account', { headers: { Cookie: cookie } });
      assert.equal((await deaths.json()).account.deaths, 1);
      const hashed = await database.query('SELECT password_hash FROM player_accounts WHERE username=$1', [username]);
      assert.ok(hashed.rows[0].password_hash && !hashed.rows[0].password_hash.includes(password));

      const socket = new WebSocket(`ws://127.0.0.1:${port}/world`, { headers: { Cookie: cookie, Origin: base } });
      const welcome = await new Promise((resolve, reject) => {
        socket.on('message', data => { const message = JSON.parse(data); if (message.type === 'welcome') resolve(message); });
        socket.on('error', reject);
      });
      assert.equal(welcome.state.username, username);
      await delay(1250);
      socket.close();
      await once(socket, 'close');
      await delay(200);
      const saved = await fetch(base + '/api/account', { headers: { Cookie: cookie } });
      const account = (await saved.json()).account;
      assert.ok(account.play_seconds >= 1, `play time not saved: ${account.play_seconds}`);
      assert.equal(account.sessions, 1);
      const logout = await post('logout', {}, cookie);
      assert.equal(logout.status, 200);
      assert.match(logout.headers.get('set-cookie'), /Max-Age=0/);
      const signedOut = await fetch(base + '/api/account', { headers: { Cookie: cookie } });
      assert.equal((await signedOut.json()).account, null);
      const login = await post('login', { username, password });
      assert.equal(login.status, 200);
    } finally {
      server.kill();
      await database.query('DELETE FROM player_accounts WHERE username=$1', [username]);
      await database.end();
    }
  });
