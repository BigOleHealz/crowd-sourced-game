import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
if(!process.env.NAV_TEST_MAP){
  for(const map of ['outpost','brickell']){
    const test=spawnSync(process.execPath,[process.argv[1]],{stdio:'inherit',env:{...process.env,NAV_TEST_MAP:map,PINEWATCH_MAP:map}});
    assert.equal(test.status,0);
  }
}else{
  const {destinations,landmarkGuide}=await import('../public/landmark-navigation.js');
  for(const [name,[x,z]] of destinations){
    const guide=landmarkGuide(name),route=guide(0,15,0);
    assert(Number.isFinite(route.distance));assert.deepEqual(route.line.at(-1),[x,z]);
    assert.equal(guide(x,z,0).cue,'Arrived');
  }
  if(process.env.NAV_TEST_MAP==='brickell'){
    const {reefDiveSite,reefTrail}=await import('../public/reef-channel.js');
    const reef=landmarkGuide(reefDiveSite.name),[x,z]=reefTrail[0];
    assert.deepEqual(reef(87,-419,0).line,[[87,-419],[x,z]]);
    assert.equal(reef(x,z+6,0).cue,'Dive buoy');
    assert.equal(reef(x,z+4,0).cue,'Arrived');
    const {fuelStop}=await import('../public/fire-sites.js');
    assert.equal(landmarkGuide(fuelStop.name)(fuelStop.x,fuelStop.z,0).cue,'Arrived');
    const guide=landmarkGuide('Lantern Point Marina');
    assert.equal(guide(0,-363,0).cue,'Turn right');
    assert.equal(guide(0,-363,0).meters,7);
    assert.equal(guide(0,-250,Math.PI).cue,'Turn around');
    assert.equal(guide(49,-378,0).cue,'Arrived');
    const detour=guide(-38,20,0);assert(detour.line.some(([x,z])=>x===0&&z===-60));
  }
  console.log('PASS road/trail navigation',process.env.NAV_TEST_MAP);
}
