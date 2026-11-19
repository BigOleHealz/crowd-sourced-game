# Crowd-Sourced Game · Codex project plan

The first milestone is two people meeting at a lookout. Each opens a link, joins the same small 3D world, runs up a trail and sees the other player reach the top. The next milestone is seeing a change the players voted for appear in that same world. Build and playtest those two experiences in that order.

## The launch experience

Matt owns and operates one shared server and world. Every player signs in and selects **Play** to enter the same spawn clearing. Friends can share the game link, cross a footbridge together and climb to a lookout. A short loop leads back to spawn. From the world menu, players can request improvements, vote on them and see which release introduced a change.

Use grounded realism for the player and environment. Keep the third-person controls responsive, give turns and landings a sense of weight, and keep the route visible from the shoulder camera. Judge human proportions, clothing, foot placement and stride in motion at normal play distance. Build with original or licensed art. Test a single playable Brickell Avenue block under consistent daylight and measure frame times before extending the approach.

**Working assumptions.** Start with desktop browsers, keyboard and mouse, a single hosting region and a pilot capacity of 16 concurrent players in the shared world. At capacity, show a full-world message and let players retry. Matt sets the voting and release policy and can pause automation or roll back. Exploration remains the starting activity. The local arcade build also supports blaster duels between hikers and two patrolling NPC rivals. Device coverage, player cap, voting rules and operating budget are pilot decisions to validate.

## Buildings at street level

Start with Mangle Café and the 810 Brickell Avenue lobby on the spawn block. A player walking along the glass should see a nearby chair pass in front of the counter, then reveal the back wall. Give each space a floor, walls, ceiling, furniture and light sources at believable distances. Check the result from the normal player camera and measure frame intervals on the same walk before expanding it.

After Matt reviews this block, use the following order for later art passes.

1. Extend the approach along the rest of Brickell Avenue and around the nearest intersections, where players spend the most time on foot.
2. Apply it to waterfront and Harbor Key destinations approached by road or boat.
3. Revisit the Rural Outpost depot and other buildings along the supply route.

Reuse chairs, doors, counters and materials across buildings. Give shops and homes different layouts and silhouettes. Plan for eventual entry by aligning finished floors with the sidewalk, sizing openings for people, and leaving navigable routes between furnishings. When a building opens for play, update its collision and test entry and exit with two clients.

## Architecture and hosting

### Local prototype with Docker

Build and run the prototype in a project-specific Docker Compose service. Open the play link in the Mac’s regular browser. The game container serves the client and simulates the shared world. Chrome or Safari on the host renders the 3D scene using the Mac’s graphics hardware. For the first slice, use browser-native JavaScript modules, Three.js and a shared kinematic movement solver. Revisit the proposed TypeScript tooling and Rapier when the physics requirements expand.

| Local workload | Starting ceiling | Operating pattern |
| --- | --- | --- |
| Game server | 0.50 CPU, 192 MiB RAM | One Node process for HTTP, WebSockets and the 30 Hz simulation. Start it when playing and stop it afterward. |
| Multiplayer smoke test | 0.25 CPU, 128 MiB RAM | Two temporary WebSocket players exercise the running world. This optional service exits after its checks. The visual acceptance test uses two host-browser sessions. |

These are adjustable upper bounds for each container. The game and test share physical resources with the Mac’s other apps. Docker’s Linux VM, image builds and the host browser consume additional resources outside these ceilings. Leave Docker Desktop’s global CPU and memory settings alone. Build once, avoid overlapping heavy builds, and run the smoke test only when needed. The initial sizing uses a local host baseline of roughly 64 MiB resident for the server during a two-client run. Treat the host measurement as a starting point. Inspect the actual container limits and workload before increasing player count.

Run the following commands from the project root.

```sh
docker compose build game
docker compose up -d game
docker compose --profile test run --rm smoke
docker compose stats --no-stream
docker compose down
```

Open [the local game](http://127.0.0.1:4173/) in two browser windows for the visual playtest. Interrupt a running smoke test with Ctrl-C. To restart after stopping, use `docker compose up -d game`. The Compose file binds the game to loopback, runs as an unprivileged user with a read-only filesystem, and mounts no Mac directories. The image copies only game sources, the locked dependency manifests and the smoke test. Override `GAME_CPUS`, `GAME_MEMORY`, `TEST_CPUS` or `TEST_MEMORY` per invocation to tune the project. Record observed CPU, resident memory and tick behavior under load before choosing new limits.

### Future hosted pilot

| Part | Proposed implementation | Responsibility |
| --- | --- | --- |
| Browser | TypeScript, Vite, Three.js and Rapier | Render the world, read input, predict local movement and interpolate remote avatars. Load the nearby trail and spawn assets first. |
| Game service | One Node.js process with HTTPS and secure WebSockets | Verify the account, issue a short-lived join ticket and run the single authoritative world at 30 Hz. Broadcast snapshots initially at 15 Hz. |
| Account and world data | Managed authentication and PostgreSQL, proposed Supabase | Store player profiles, checkpoints, proposals, votes, release history and job state. Distinguish player permissions from Matt’s owner controls. Keep per-frame state in the simulation. |
| World releases | A shared, versioned game template plus an immutable content manifest per release | One world settings record pins the template version and active manifest. A manifest can place approved assets at permitted locations. Loading one uses the same validation in preview and production. |
| Feature builds | Durable Postgres job queue, isolated Codex build runner and a small release worker | Keep slow builds off the game process. Give only the release worker permission to switch the world's active version. |

Start with Vercel serving the compiled web client and its versioned assets. Vercel Functions support WebSockets, but each connection ends at the function's duration limit and a new connection can reach a different instance. A persistent process keeps the pilot's authoritative simulation and its players together. [Vercel WebSocket lifecycle](https://vercel.com/docs/functions/websockets)

Use one paid Render web service for the pilot simulation. Render supports secure WebSockets with no fixed connection duration and can replace an instance during deployment. On shutdown, stop new joins, checkpoint safe player positions and tell clients to reconnect. On restart, reconstruct the shared world from its pinned release and restore players to a valid checkpoint or spawn. Run a single active simulation. During host replacement, close admissions and hand over simulation ownership before accepting new joins. Render recommends paid resources for production. [Render WebSockets](https://render.com/docs/websocket) · [Render free instance limits](https://render.com/docs/free)

For a first hosted playtest, record region, instance size, measured outbound bytes per player-hour, database cost and build cost per released feature. Agree a pilot spend ceiling before enabling unattended builds. Cap daily build count and model spend, and queue qualifying requests when the allowance is exhausted. Recheck provider limits and pricing when choosing the pilot plans.

## Development team for Codex

Assign **GPT-6.2 Astra at high reasoning** as development orchestrator. It owns sequencing, integration and the acceptance decision for each phase. Assign a **planner** to turn the next phase into tasks with dependencies, ownership, acceptance cases and an explicit integration point. Use Astra/high for the initial multiplayer and release designs. A bounded follow-up, such as adding an approved prop, can use Sol/medium for planning.

| Delegate when the task calls for it | Model and reasoning | Expected handoff |
| --- | --- | --- |
| Implement bounded UI or fixture work with a settled contract | GPT-6.2 Sol, low for mechanical edits and medium for behavior | A working entry point and evidence for the assigned acceptance case |
| Implement movement prediction, concurrent vote processing, owner permissions or rollback | GPT-6.2 Astra, high | The design decision, change and a test covering the failure mode |
| Evaluate camera readability and the art target | GPT-6.1 Terra, medium | Captures from the fixed playtest route with specific visibility or motion issues |
| Independently review a high-impact integration | GPT-6.2 Astra, high, with fresh context | Findings against the contract and results of an independent verification run |

Parallelize only work with settled interfaces. For example, after agreeing the input and snapshot formats, one agent can implement the controller while another builds the two-client replay fixture. Keep one owner for each changing interface. The orchestrator integrates through the actual join-and-play flow, escalates model effort when evidence conflicts or a failure spans components, and handles small tasks directly when delegation adds little. Record the model chosen and the reason in the phase handoff. Confirm available models in the implementation environment.

These assignments govern development of the product. The live pipeline below runs a separate, budgeted Codex job on a single proposal for Matt’s world. Reaching the vote threshold triggers the eligible change process defined below.

## Implementation phases

| Phase | Deliverable | Advance when |
| --- | --- | --- |
| 1 · Thin playable slice | Build a graybox clearing, bridge, slope and lookout. Use a test identity, one room, a third-person camera, camera-relative walk/sprint, jump, gravity, capsule collision and fall recovery. Clients send sequenced inputs. The server simulates movement, acknowledges inputs and corrects predictions. | Two independent browser sessions join from a link, see one another cross the bridge and land a jump. Check wall contact, slopes, camera occlusion, falls and reconnect at 100 ms round-trip latency. Capture a baseline before adding scenery. |
| 2 · Shared-world pilot | Add sign-in and one Play entry point. Persist safe player checkpoints and the world’s pinned version. Give Matt owner controls. Apply the original art pass and benchmark the loop. | Two signed-in accounts enter the same world independently and resume after a host restart. Player accounts cannot change the release pointer. Run the performance gates below. |
| 3 · Requests and voting | Give the shared world a request board with submission, one upvote per eligible account, moderation, status and release history. Write a durable build job when a proposal qualifies. Start with preview builds. | Concurrent votes and retried events create one job. The preview demonstrates the requested change. Signed-out visitors and duplicate votes cannot advance the count. |
| 4 · Automatic world releases | Enable the eligible change catalog, isolated builds, independent gates and atomic activation for Matt’s world. Exercise rollback before enabling unattended releases. | Run the lookout example below through real accounts, the real queue and the hosted pilot world. Demonstrate successful activation, build failure, automatic rollback and recovery through the normal Play entry point. |
| 5 · Pilot and expansion | Invite a small cohort. Review playtest notes, frame times, join failures, release incidents and cost per player-hour. Add a new eligible change type only once its validator and rollback test exist. | Players can complete a second eligible request in Matt’s world without operator intervention and within budget. Evaluate fairness under latency and moderation needs before opening the existing arcade combat to a public pilot. |

## Proposed performance gates

Use a base M1 MacBook Air with 8 GB RAM, current stable Chrome, a 1280 × 720 render buffer and a 60 Hz display as the initial reference. Record browser build, quality settings, hardware and host tier. Exercise the same five-minute route three times after warm-up with 16 visible, moving avatars. Capture the worst run. Before public launch, repeat on a representative Windows integrated GPU and record the supported settings.

| Measure | Pilot target and measurement |
| --- | --- |
| Client rendering | Median frame interval ≤ 16.8 ms and 95th percentile ≤ 20 ms on the route. Capture frame traces through the busy spawn clearing. Reduce foliage density, shadows or texture cost first if over budget. |
| Movement response | 95th percentile time from recorded input to first locally rendered movement ≤ 50 ms. With 100 ms round-trip latency and 1% simulated packet loss, 95th percentile authoritative position correction ≤ 0.30 m during ordinary traversal. Exclude intentional respawns. |
| Simulation capacity | With all 16 slots in the world occupied on the pilot instance for 30 minutes, 95th percentile simulation work ≤ 20 ms per 33.3 ms tick. Record overdue ticks, event-loop delay and process memory. |
| Network and entry | Average game payload downstream ≤ 40 KB/s per player over the route. Cold-cache sign-in-complete to controllable spawn ≤ 8 s at the 95th percentile across 30 joins at 20 Mbps and 80 ms round-trip latency. |

Collect a short human playtest alongside the traces. Ask players to reverse direction, jump onto the bridge and keep a friend in view around a corner. Record missed inputs, distracting corrections and camera clipping. Use the observed misses to tune acceleration, jump timing and camera behavior before repeating the route.

## From votes to a released feature

1. **Submit and moderate.** A signed-in player describes the desired outcome for the shared world. Treat the text as untrusted content. Allow mature themes such as horror and strong language. Exclude pornography and sexually explicit content across requests, generated text, assets and playable scenes. Screen submissions and generated output, support member reports and hide disputed material pending Matt’s moderation decision.
2. **Count eligible votes.** For the pilot, take a snapshot of accounts that played in the preceding 30 days when the request opens. Require the greater of three distinct upvotes or 20% of that cohort, rounded up. Show the target and progress. If the pilot has fewer than three eligible voters, keep collecting ideas and open a new voting round once three players qualify. Enforce one vote per request revision and account in the database, check voter eligibility and account standing and rate-limit submissions. Edits that change the request start a new revision and vote.
3. **Queue once.** In one transaction, recheck eligibility, mark the revision qualified and insert a uniquely keyed job for the proposal and revision. Workers claim time-limited leases and resume safely after a crash. Post queued, building, testing, live or failed status back to the board, with a reason for holds.
4. **Constrain the build.** Start with placement of curated props and signs at prevalidated sockets. Give Codex the request as data, the allowed schema, asset catalog and pinned parent manifest in an ephemeral workspace. Its deliverable is a declarative manifest diff and an acceptance fixture. Enforce permitted fields, asset IDs, size limits and permitted locations outside the model. Keep production credentials out of the runner. Route engine code, new executable behavior, new asset imports, data migrations and ambiguous requests to maintainer review. Policy violations stop the job.
5. **Test the candidate.** A trusted harness validates the manifest, content policy, asset provenance, collisions, spawn clearance and traversal to the lookout. Boot the exact candidate in a disposable room, join two clients and compare the performance route against the gates. Verify the live world still resolves to its original release during testing. A failure leaves the current release live and records what failed. Cap retries and model spend.
6. **Activate and observe.** Publish the tested manifest by content hash. The release worker verifies the test record and atomically switches the shared world's release pointer if its parent still matches. If another change landed first, rebuild and retest against that parent. Announce the refresh, checkpoint players, drain the live world and reconnect clients on the new version. Record the proposal, parent and candidate hashes, test evidence, time and outcome in release history.
7. **Roll back.** Keep the prior manifest and assets available. For ten minutes after activation, run synthetic two-client joins and traversal once a minute alongside live telemetry. Give the probes two reserved diagnostic slots and test their overhead with all 16 player slots occupied. Revert on two consecutive failed probes, a room crash attributable to the release or a confirmed content-policy violation. Matt can also revert from release history. Switch the pointer back with a version check, reload the shared world and verify join, movement and the restored scene. Mark the failed revision rolled back and suppress automatic replay. Target recovery within two minutes of the rollback decision.

**Acceptance example.** Players in Matt’s world ask for a timber bench at the lookout. With 20 eligible voters from the past 30 days, the board shows a target of four. The fourth unique vote queues one build even if its network request retries. Codex selects the approved bench and lookout socket. Two preview clients see it, walk past it and return to spawn. Passing gates publish the manifest to Matt’s world automatically. Two players reconnect and find the bench at the lookout. A newly signed-in player sees it too, and the board links the request to the live release ID. Repeat with an obstructed socket to verify rejection, then exercise rollback on the valid release and confirm the bench disappears for both connected clients while each account’s votes and checkpoints survive.

## Later community-owned servers

Keep the base map, movement defaults and approved content catalog together as a named, versioned template. Exercise template loading today through the live world and a disposable test fixture. If Matt later opens server creation to communities, introduce ownership and membership, per-world release pointers, board and vote scoping, provisioning, routing and resource limits in that expansion phase. Its first acceptance case is two communities using the same template and independently releasing different changes. Launch needs one world settings record and one board.

## First playable handoff

Pinewatch implements Phase 1. Two players on the host computer can open the same local URL in separate browser windows. Each gets a temporary hiker identity and joins the shared trail. WASD and the arrow keys both move relative to the camera. W/↑ and S/↓ move forward and back. A/← and D/→ strafe left and right. Hold Shift to sprint and press Space to jump. With the game window focused, move the ordinary cursor over the 3D world to look left, right, up or down. This works immediately without clicking or holding a button. Keep the cursor near a world edge to continue turning, and move inward to stop the continuous turn. Camera tracking pauses over controls, outside the world and when the window loses focus. Scroll to change camera distance. Refreshing starts a new guest session.

The playable world also includes a trail-clearing activity. Equip the Pulse blaster with **1** for quick single-crystal shots or the Bloom blaster with **2** for slower pulses that affect nearby crystals. Aim with the existing mouse look and use **F** or the left mouse button to fire. Cleared crystals open passages for every hiker. Both blasters can also hit the two patrolling trail rivals and other connected hikers. Pulse deals 25 health damage and Bloom deals 40 in its burst. Health bars show damage and defeat. Hikers and rivals respawn after three seconds with a two-second shield. A shooter is immune to their own burst.

The orange **H** on the trail map marks the utility helicopter. Approach on foot and press **E** to pilot it. Hold **Space** to climb, use WASD or the arrows for camera-relative flight, and hold **Shift** to descend onto clear ground. Ease off **Shift** near the surface for a gentle landing. Hard landings, solid impacts and blasters damage the 500-HP airframe. At 150 HP or below it smokes. At zero the pilot returns safely to the trailhead and the wreck recovers on the pad after six seconds. Press **E** after landing to get out. One hiker can fly at a time. Joining an occupied world picks up its current flight and crystal state. When the pilot disconnects the helicopter returns to the pad. When the last player leaves, the world resets for the next group.

Docker Desktop ran the game locally. Readback from the Linux control groups confirmed 0.50 CPU and 192 MiB for the game, 0.25 CPU and 128 MiB for the on-demand smoke test, and zero swap allowance for both. The game ran as UID 1000 with a read-only root filesystem, zero host mounts and a loopback-only published port. One Docker stats sample during the short capacity check showed 26.14 MiB used by the game container. Browser and VM memory are additional. The smoke-test container exited and was removed.

Two independent Chrome sessions on the Mac passed the playtest against the container. Each observer received the other hiker’s roughly six-metre sprint, 1.2-metre jump and landing. A separate two-browser run added 50 ms of relay delay in each direction. The hiker crossed the timber bridge, contacted its rail, jumped, climbed to the lookout and turned the camera there. A short capacity probe drove 16 WebSocket players, received the full-world response for player 17 and measured 74 ms at the 95th percentile between snapshots. These measurements cover the local prototype. The 30-minute pilot load test and representative-device performance gates remain future work.

Use the Docker commands above for the preferred local setup. For a host-only diagnostic run, use the existing Node runtime with the project’s lockfile (`npm ci`, then `npm start`). Run `node test/multiplayer.mjs` against the running server to repeat the protocol smoke test. Have two people play the loop and judge acceleration, camera distance and readability before beginning Phase 2.
