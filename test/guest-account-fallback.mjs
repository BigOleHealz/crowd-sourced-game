import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { randomInt } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { test } from 'node:test';
import { WebSocket } from 'ws';

test('guest play survives an unavailable account database', async () => {
  const port = randomInt(45000, 55000);
  const base = `http://127.0.0.1:${port}`;
  const server = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, DATABASE_URL: 'postgres://nobody:unused@127.0.0.1:1/unused',
      HOST: '127.0.0.1', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  server.stdout.on('data', data => { output += data; });
  server.stderr.on('data', data => { output += data; });
  try {
    let response;
    for (let i = 0; i < 100; i++) {
      if (server.exitCode != null) break;
      try { response = await fetch(base + '/api/account'); break; }
      catch { await delay(100); }
    }
    assert.ok(response, `game did not start: ${output}`);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).enabled, false);
    const socket = new WebSocket(`ws://127.0.0.1:${port}/world`, { headers: { Origin: base } });
    const welcome = await new Promise((resolve, reject) => {
      socket.on('message', data => { const value = JSON.parse(data); if (value.type === 'welcome') resolve(value); });
      socket.on('error', reject);
    });
    assert.ok(welcome.id > 0);
    socket.close();
  } finally { server.kill(); }
});
