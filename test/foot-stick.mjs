import assert from 'node:assert/strict';
import {footStickPace} from '../public/foot-stick.js';
assert.deepEqual(footStickPace(0,.12,false),{x:0,y:1,sprint:false});
assert(footStickPace(.41,.89,false).sprint);
assert(footStickPace(0,.80,true).sprint);
assert(!footStickPace(0,.68,true).sprint);
assert(!footStickPace(1,0,true).sprint);
assert(!footStickPace(0,-1,true).sprint);
assert.deepEqual(footStickPace(0,0,true),{x:0,y:0,sprint:false});
