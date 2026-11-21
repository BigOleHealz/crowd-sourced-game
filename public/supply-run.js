import { depotPoint, landingPoint } from './scenery-layout.js';
import { ROVER_PAD } from './rover.js';
import { CITY, HELIPAD } from './world.js';

export const DEPOT = depotPoint;
export const OUTPOST = landingPoint(CITY);
const near = (a, b, radius) => Math.hypot(a.x - b.x, a.z - b.z) <= radius;

export function newSupplyRun() {
  return { stage: 'pickup', delivered: 0, hold: 0 };
}

export function replaySupplyRun(world) {
  if (world.mission.stage === 'complete') {
    world.mission.stage = 'pickup';
    world.mission.hold = 0;
  }
}

export function updateSupplyRun(world, dt) {
  const { mission, rover, heli } = world;
  if (!rover) return;
  const stopped = !rover.wrecked && Math.abs(rover.speed) < 0.65;
  const aircraftReady = heli.grounded && !heli.wrecked;
  let ready = false;
  let next;
  if (mission.stage === 'pickup') {
    ready = rover.driver != null && stopped && near(rover, DEPOT, 2.4);
    next = 'transfer';
  } else if (mission.stage === 'transfer') {
    ready = stopped && near(rover, HELIPAD, 4.6) && aircraftReady &&
      near(heli, HELIPAD, 3) && (rover.driver != null || heli.pilot != null);
    next = 'delivery';
  } else if (mission.stage === 'delivery') {
    ready = aircraftReady && heli.pilot != null && near(heli, OUTPOST, 3.4);
    next = 'complete';
  }
  mission.hold = ready ? mission.hold + dt : 0;
  if (ready && mission.hold >= 1 - 1e-9) {
    mission.stage = next;
    mission.hold = 0;
    if (next === 'complete') mission.delivered++;
  }
  // Cargo belongs to the expedition and is reissued on vehicle recovery.
  rover.cargo = mission.stage === 'transfer' && !rover.wrecked ? 3 : 0;
  heli.cargo = mission.stage === 'delivery' && !heli.wrecked ? 3 : 0;
}

export function supplyGuidance(world, local, id, touch=false) {
  const { mission, rover, heli } = world;
  if (!mission || !rover) return null;
  const driving = rover.driver === id, flying = heli.pilot === id;
  const home = !heli.wrecked && heli.grounded && near(heli, HELIPAD, 3);
  const guide = (label, action, point) => ({ label, action, point });
  const boardRover = () => guide('Trail rover', rover.driver != null ? 'Your teammate is driving.' :
    touch ? (CITY?'Approach the pickup and tap Drive pickup.':'Approach the jeep and tap Drive jeep.') : near(local, rover, 2.6) ? 'Press E to drive the rover.' : 'Reach the rover and press E to drive.', rover);
  const returnHeli = () => guide(CITY ? 'Waterfront helipad' : 'Trailhead helipad', 'Fly back and land on the H.', HELIPAD);
  if (mission.stage === 'complete') return guide('Delivery complete', touch?'Three cases delivered. Tap Replay in Gear for another run.':'Three cases delivered. Press R for another run.', null);
  if (rover.wrecked && (mission.stage === 'pickup' || mission.stage === 'transfer')) return guide('Trail rover','Replacement rover returning to the trailhead.',ROVER_PAD);
  if (mission.stage === 'pickup') {
    if (flying) return home ? guide('Trail rover', touch?'Tap Exit helicopter, then board the rover.':'Press E to exit, then board the rover.', rover) : returnHeli();
    if (!driving && !home && heli.grounded && !heli.wrecked && heli.pilot == null && near(local, heli, 3.8))
      return guide('Trail helicopter', touch?'Tap Pilot helicopter, then return to the H.':'Press E to pilot the helicopter back to the H.', heli);
    if (!driving && rover.driver == null) return boardRover();
    return guide(CITY ? 'Brickell Depot' : 'Pine Depot', driving ? 'Park inside the amber posts to load three cases.' : 'Your driver is collecting the supplies.', DEPOT);
  }
  if (heli.abandonedFor != null) return guide(CITY ? 'Waterfront helipad' : 'Trailhead helipad', 'Aircraft unpiloted. A replacement will return to the H after the crash.', HELIPAD);
  if (mission.stage === 'transfer') {
    if (flying && !home) return returnHeli();
    if (heli.wrecked) return guide(CITY ? 'Waterfront helipad' : 'Trailhead helipad', 'Park the loaded rover at the H for aircraft recovery.', HELIPAD);
    if (!home && !driving && heli.pilot == null)
      return guide('Trail helicopter', 'Board the helicopter and return it to the H.', heli);
    if (!home && driving && near(rover, HELIPAD, 4.6))
      return guide('Trail helicopter', 'Leave the rover here. Bring the helicopter back to the H.', heli);
    if (!driving && !flying && rover.driver == null) return boardRover();
    return guide(CITY ? 'Waterfront helipad' : 'Trailhead helipad', 'Park the loaded rover beside the helicopter.', HELIPAD);
  }
  if (heli.wrecked) return guide(CITY ? 'Waterfront helipad' : 'Trailhead helipad', 'Replacement aircraft and cargo are returning to the H.', HELIPAD);
  if (driving) return guide('Trail helicopter', touch?'Tap Exit, then board the helicopter.':'Press E to exit the rover, then board the helicopter.', heli);
  if (!flying && heli.pilot == null) return guide('Trail helicopter', touch?'Approach the helicopter and tap Pilot helicopter.':'Reach the helicopter and press E to fly the cargo.', heli);
  return guide(CITY ? 'Bayfront Landing' : 'Ridge Outpost', flying ? 'Land inside the amber ring to deliver the cases.' : 'Your pilot is delivering the supplies.', OUTPOST);
}
