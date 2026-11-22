export const venueSongs = [
  'greatest-rhymes-ever.mp3',
  'alligator-chedda.mp3',
  'leaky-garbage-drip.mp3',
  'country-healy-trap.mp3',
  'scoopin-dung.mp3',
];

function shuffledSet(previous, random) {
  const songs = [...venueSongs];
  for (let i = songs.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [songs[i], songs[j]] = [songs[j], songs[i]];
  }
  if (songs[0] === previous) [songs[0], songs[1]] = [songs[1], songs[0]];
  return songs;
}

// Keep only the current recording and, near its end, the upcoming recording in memory.
export function venueSet(context, output, random = Math.random) {
  const controller = new AbortController();
  const playing = new Set();
  let songs = [], previous, endsAt = 0, retryAt = 0, loading = false;
  async function update() {
    const now = context.currentTime;
    if (controller.signal.aborted || loading || now < retryAt || now < endsAt - 12) return;
    loading = true;
    if (!songs.length) songs = shuffledSet(previous, random);
    const song = songs.shift();
    try {
      const response = await fetch('./audio/' + song, {signal: controller.signal});
      if (!response.ok) throw Error('Soundtrack unavailable');
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      if (controller.signal.aborted) return;
      const start = Math.max(context.currentTime, endsAt);
      const offset = previous ? 0 : random() * buffer.duration;
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(output);
      source.onended = () => { playing.delete(source); source.disconnect(); };
      source.start(start, offset);
      playing.add(source);
      endsAt = start + buffer.duration - offset;
      previous = song;
    } catch {
      retryAt = context.currentTime + 2;
    } finally {
      loading = false;
    }
  }
  function stop() {
    controller.abort();
    for (const source of playing) source.stop();
  }
  return { update, stop };
}
