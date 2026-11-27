# Movement snapback investigation

## Finding and limits

The controlled reproduction is **server CPU starvation → simulation debt and
outbound snapshot backlog → the 30-command input queue drops predicted movement
→ the next acknowledgment retires commands the server never simulated → a backward
correction**. More bullets amplify the workload, but CPU starvation can affect
quiet walking too. Adding prediction again or smoothing the camera does not fix
this sequence: prediction and input acknowledgment already exist.

Render inspection on 2026-11-26 found one Virginia free instance, a reported
0.15 CPU limit, and recent five-minute usage around 0.12–0.13 CPU. The live deploy
was `2f44b14`; the repository baseline was `3c286d3`. A passive 20-second public
observation received 301 snapshots, p95 gap 96 ms and maximum 421 ms, with zero
visible bullets. It did **not** capture the player's reported snap. Coarse Render
CPU metrics cannot identify the first event in that particular session.

A local arm64 Linux container with a 0.15 CPU quota reproduces multi-metre walking
corrections. The unrestricted local server does not. Cgroup counters confirm CPU
throttling, and server tick/loop times grow before the queue starts dropping
inputs. In the same workload at 0.5 CPU, the server drops no commands and walking
prediction has no corrections. This supports a capacity problem aggravated by
terrain collision cost, not out-of-order WebSocket messages or a camera-only jump.
It is not proof that every reported production hitch has this cause.

## Measured results

Local probes use two clients and exclude the first three seconds in percentile
summaries. Results describe individual captures, not capacity guarantees.

| Workload | CPU allowance | p95 snapshot gap | Max position correction | Dropped inputs |
|---|---:|---:|---:|---:|
| Quiet walking, baseline | 0.15 | 206 ms | 1.53 m | 24 |
| Walking + gunner, baseline | 0.15 | 1,304 ms | 3.37 m | Telemetry starved by queued snapshots |
| Walking + gunner, optimized | 0.5 | 74 ms | 0 m | 0 |
| Walking + gunner + 60–130 ms ordered delivery delay each way | 0.5 | 88 ms | 0.09 m | 0 |
| Driving + gunner, optimized | 0.5 | 74 ms | 0.0077 m | 0 |
| Quiet driving, optimized | 0.5 | 73 ms | 0.0077 m | 0 |

An optimized 0.15-CPU driving run still overflowed its input queue and reached the
client's 150-pending-input disconnect limit. CPU allowance is therefore part of
the remedy; the code-only change is not a verified cure on Free. The baseline
walking/gunner capture stayed below the client's disconnect threshold (maximum
104 pending commands). Longer exploratory probes that exceeded that threshold
are not used as normal-client before/after results.

A Chrome rendering run at 0.5 CPU with sustained gunner fire recorded zero page
errors, zero dropped inputs, maximum walking correction 0.112 m, p95 frame delta
16.7 ms and p95 draw time 5.5 ms. A 172 ms long task occurred; good averages do not
mean the browser never hitches. Browser gunner traffic and the walker were in the
same district. A preliminary run accidentally used two districts and was excluded.
The displayed tracer count peaked at 13 while server collision load was 66 rounds.

Validation: all 288 repository tests passed, including multiplayer vehicle
entry/exit, damage and projectile tests; tracked JavaScript syntax checks passed.
Focused diagnostics and exact terrain parity tests also passed. Physical tab
background/resume and the original player's production snap still need the
capture below. CPU increase and code optimization were measured separately;
the table does not attribute the capacity experiment's entire improvement to code.

## Code path

- `public/client.js`: RAF samples controls, simulates at 30 Hz, sends numbered
  commands, predicts walking through `stepPlayer` and vehicles through
  `driverPrediction`. Incoming snapshots are processed in an ordered promise
  chain, including asynchronous decompression. The client discards acknowledged
  inputs, resets to the authoritative pose, then replays outstanding commands
  (vehicle replay is bounded to 30). More than 150 pending commands closes the
  connection. Reconnecting gets a new authoritative spawn, not a saved pose.
- `server.js`: WebSockets route districts to separate child processes sharing
  the service CPU quota. Each authoritative world integrates 30 Hz, at most four
  catch-up ticks per 8 ms callback, retaining at most one second of elapsed debt.
  Each player consumes one queued input per tick; overflow discards the oldest
  of 30 queued commands. Snapshots are published every two simulation ticks.
  Sending is skipped at 64 KiB buffered output. Compression can itself queue work.
- On foot, `stepPlayer` handles input, gravity, terrain and solid contacts on both
  sides. Server-only writers include respawn, falls, swimming transitions,
  interiors/elevators, interactions and vehicle boarding/exit. Driving uses
  shared rover/tank/flight/boat functions, but the server also owns collisions
  with other actors, damage, fuel and interactions. `driverPrediction` clones
  vehicle state so replay does not mutate received snapshots or other players.
- `expedition.js` creates authoritative projectiles. The city helicopter gunner
  emits 50 rounds/second, with roughly 66 concurrent rounds in the skyward test.
  Only every fifth round is a replicated visible tracer. `advanceRounds` sweeps
  all rounds through `segmentContact`, including terrain samples every 12 cm,
  glass, vehicle, character and wildlife hit tests. Disabling tracer visuals does
  not remove these server collision checks.
- `remoteFrame` interpolates remote entities on `SnapshotClock`. The local pose
  comes from prediction plus a fractional walking step or interpolated vehicle
  pose. `scene.render` writes the local mesh and camera from that displayed pose;
  camera occlusion changes its boom, not authoritative player coordinates.

## Repository changes

`brickell-map.js` caches up to 32,768 exact immutable shoreline survey vertices.
It does not quantize gameplay positions or cache dynamic doors, bridge lifts,
damage or height-dependent interior floors. `shore-rock-piles.js` uses numeric
spatial keys instead of allocating strings for every query, returns immediately
for empty cells, and calculates the common bed only once for overlapping stones.

A 900-tick sustained-gunner collision benchmark reduced mean collision work from
1.069 ms to 0.673 ms (37%). Every projectile trajectory hashed identically before
and after. A separate parity test crosses cache eviction, both terrain triangles,
negative grid coordinates, shore transitions and different support heights.
These optimizations **do not make the 0.15 CPU tier sufficient** for all tested
loads. The verified capacity experiment changes CPU allowance, not fire rate,
collision resolution, simulation tick rate or movement semantics.

Opt-in `?perf=1` diagnostics retain a bounded 8,192-event browser ring with frame,
long-task, input, receive, correction, camera, rendering, server and ping events.
No diagnostics are enabled by default. No names, IP addresses, session keys or
complete world snapshots are recorded. Explicit mark labels are user-supplied.
The server sends telemetry only to opted-in peers and rate-limits ping replies.

## Read the trace correctly

Browser events use `performance.now()` and include `performance.timeOrigin` on
export. Server events carry a random process `run`, monotonic `now`, simulation
`tick`, snapshot number, input ack and receive sequence. Use tick/ack IDs to join
processes; do not subtract unrelated clocks. `completedTick` identifies the last
fully timed tick; `publishTick` identifies the previous publish whose duration,
size and interval are reported. Collision counters describe the current sweep.
CPU milliseconds cover the previous publish interval and include this process's
threads, not sibling district workers. `debtMs` is the callback's pre-catch-up debt.

`rtt` includes transport **and server scheduling**; delayed JS delivery can add
browser scheduling too. `processMs` measures browser decode/processing delay.
Receive byte counts are delivered message payloads, not compressed TCP wire
bytes. Server `snapshotBytes` is uncompressed JSON size. `buffered` is the
transport's queued byte count. Counts/rates can be derived from the ring; no
per-frame console logs are emitted. Server `rounds` includes hidden bullets;
browser `bullets` counts visible replicated tracers.

## Repeatable local reproduction

Install the game's existing dependencies with `npm ci`. Use Node 24. The fixture
is loaded **only** by the explicit `--import` below; `npm start` cannot teleport
players or enable a diagnostic cheat. Player 1 starts on the empty military
runway and player 2 occupies the helicopter gunner seat. Set `LAG_DRIVER=1` on the
server to put player 1 in the Humvee instead. The probe alternates four-second
forward/reverse legs; the gunner fires skyward away from actors and buildings.

```sh
GOY_THEFT_AUTO_MAP=brickell PORT=4187 node --import ./test/helpers/lag-fixture.mjs server.js
mkdir -p output/lag
LAG_SECONDS=25 LAG_OUTPUT=output/lag/quiet.json node scripts/lag-probe.mjs
LAG_SECONDS=25 LAG_FIRE=1 LAG_OUTPUT=output/lag/fire.json node scripts/lag-probe.mjs
LAG_FIRE=1 LAG_DELAY_MS=60 LAG_JITTER_MS=70 LAG_OUTPUT=output/lag/jitter.json node scripts/lag-probe.mjs
node scripts/lag-collision-bench.mjs
```

The jitter probe delays application delivery while preserving message ordering;
it does not simulate packet loss. Its RTT probe is not delayed on the outgoing
leg, so use it for server responsiveness, not a claimed symmetric network RTT.
For a baseline collision benchmark, save the baseline `brickell-map.js` and
`shore-rock-piles.js` in a directory and set `LAG_REFERENCE_DIR` to that directory.
`LAG_PROFILE=output/lag/server.cpuprofile` enables the fixture's inspector profile;
stop the process with SIGTERM to save it.

To match a CPU quota, build the game's Docker image and mount the checkout at
`/lab`, with installed dependencies at `/lab/node_modules`. Start the same
fixture with `--cpus=.15`, publish a loopback port, and run the probe using
`LAG_URL=ws://127.0.0.1:PORT/world`. Repeat with `--cpus=.5` using the same fixtures
and durations. Allow up to 120 seconds for cold startup on the smaller quota.
Never run these artificial-load fixtures against the public service.

For a real browser run, install Playwright separately (not as a game dependency)
and supply `PLAYWRIGHT_MODULE` if it is outside Node's module search path:

```sh
LAG_HTTP=http://127.0.0.1:4187 LAG_FIRE=1 node scripts/lag-browser.mjs
```

This uses installed Chrome, a 1280×720 viewport, normal keyboard events, a second
WebSocket gunner in the **same city room**, and saves JSON plus a screenshot.
It exercises real rendering; headless Chrome is not a guarantee of the user's
interactive GPU presentation behavior. Do not compare a direct `/world` probe
and a browser city-room run concurrently: they create two active simulations.

## Capture the remaining production evidence

1. Deploy the instrumented revision; confirm `welcome.build` in the trace and
   the Render deploy commit. Open `https://goy-theft-auto.onrender.com/?map=brickell&perf=1`.
2. After assets load, open Chrome DevTools Performance, start recording, and run
   `gameLag.mark('quiet-walk')` in Console. Walk straight in an empty area for
   20 seconds, stop, turn, and return. Repeat driving with entry and exit.
3. Run `gameLag.mark('gunner-fire')`, enter the helicopter gunner seat and hold
   fire into the sky for 20 seconds. Repeat walking/driving while another player
   fires only if reproducing that specific shared-room load.
4. Immediately after a snap, run `gameLag.mark('snap')`, then
   `gameLag.download()`. Stop and export the Performance recording too. Also test
   background/resume and a reconnect; these events are explicit in the JSON.
5. Keep the traces local. Record local time and Render deploy ID. Compare the
   first jump in frame time, server loop/tick time, queue/dropped counts, snapshot
   gap, decode time and correction. A new `run` identifies a process restart;
   disconnect/welcome identifies a new connection. Export CPU usage/limit and
   instance/restart events over that interval from Render.

The tested capacity remedy is at least 0.5 CPU for this two-player workload.
It does not establish capacity for 16 players or multiple active districts.
Changing the public service from free to paid compute is a separate, billable
operation; it was not performed during this repository investigation.
