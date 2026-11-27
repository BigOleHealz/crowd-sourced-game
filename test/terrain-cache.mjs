import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {registerHooks} from 'node:module';
import {createHash} from 'node:crypto';
if(process.env.TERRAIN_REFERENCE){
  if(process.env.TERRAIN_REFERENCE==='uncached')registerHooks({load(url,context,next){
    const result=next(url,context);if(!url.endsWith('/brickell-map.js'))return result;
    return {...result,source:String(result.source).replace(/function shoreSurvey\(x,z\) \{[\s\S]*?\n\}/,'function shoreSurvey(x,z) { return surveyShore(x,z); }')};
  }});
  process.env.GOY_THEFT_AUTO_MAP='brickell';
  const {coastalBedHeight,militaryShoreBedHeight,harborShoreBedHeight}=await import('../public/brickell-map.js');
  const {groundHeight}=await import('../public/world.js');
  const hash=createHash('sha256');
  // Traverse enough vertices to evict the bounded cache, including negative
  // grid coordinates, triangle diagonals, repeat queries and shore transitions.
  for(let pass=0;pass<2;pass++)for(let x=-260;x<=100;x+=2.75)for(let z=-490;z<=90;z+=3.25){
    hash.update(JSON.stringify([coastalBedHeight(x,z),militaryShoreBedHeight(x,z),harborShoreBedHeight(x,z),groundHeight(x,z,.1),groundHeight(x,z,20)]));
  }
  console.log(hash.digest('hex'));
}else{
  const results=['cached','uncached'].map(mode=>{
    const result=spawnSync(process.execPath,[import.meta.filename],{env:{...process.env,TERRAIN_REFERENCE:mode},encoding:'utf8'});
    assert.equal(result.status,0,result.stderr);return result.stdout.trim();
  });
  assert.equal(results[0],results[1],'cached survey preserves exact terrain and movement support heights');
  const {indexShoreRocks,shoreRockTopAt}=await import('../public/shore-rock-piles.js');
  const field=indexShoreRocks([{x:0,z:0,radius:2,zRadius:2,height:1},{x:0,z:0,radius:2,zRadius:2,height:2}]);
  let calls=0;assert.equal(shoreRockTopAt(field,0,0,()=>{calls++;return .5;}),3.1);assert.equal(calls,1);
  console.log('PASS exact terrain cache parity across eviction, grid boundaries, shores and walking support; one bed query for overlapping stones');
}
