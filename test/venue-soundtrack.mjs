import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { venueSet, venueSongs } from '../public/venue-soundtrack.js';

for (const file of venueSongs) await access(new URL('../public/audio/' + file, import.meta.url));
const starts = [], requests = [];
let pending, defer = false;
globalThis.fetch = async (url, { signal }) => {
  const name = url.split('/').pop();
  requests.push({name, signal});
  if (defer) await new Promise(resolve => { pending = resolve; });
  return {ok: true, arrayBuffer: async () => name};
};
const ctx = {
  currentTime: 10,
  decodeAudioData: async name => ({name, duration: 120}),
  createBufferSource: () => ({
    connect() {}, disconnect() {}, stop() { this.stopped = true; },
    start(at, offset) { starts.push({at, offset, name: this.buffer.name, source: this}); },
  }),
};
const dj = venueSet(ctx, {}, () => .45);
await dj.update();
assert.equal(starts[0].offset, 54);
for (let i = 1; i < 10; i++) {
  const last = starts.at(-1);
  const end = last.at + 120 - last.offset;
  ctx.currentTime = end - 13;
  await dj.update();
  assert.equal(requests.length, i);
  ctx.currentTime = end - 12;
  await Promise.all([dj.update(), dj.update()]);
  assert.equal(starts.length, i + 1);
  assert.equal(starts[i].at, end);
  assert.equal(starts[i].offset, 0);
  last.source.onended();
}
assert.deepEqual(new Set(starts.slice(0, 5).map(s => s.name)), new Set(venueSongs));
assert.deepEqual(new Set(starts.slice(5).map(s => s.name)), new Set(venueSongs));
assert.notEqual(starts[4].name, starts[5].name);
dj.stop();
assert.ok(starts.at(-1).source.stopped);
const other = venueSet(ctx, {}, () => .2);
defer = true;
const loading = other.update();
other.stop();
assert.ok(requests.at(-1).signal.aborted);
pending();
await loading;
assert.equal(starts.length, 10);
console.log('Venue shuffle, continuous transitions, re-entry cleanup, and five packaged files passed.');
