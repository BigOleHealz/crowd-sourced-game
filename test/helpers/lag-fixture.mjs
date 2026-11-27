// LOCAL LAB ONLY: node --import ./test/helpers/lag-fixture.mjs server.js.
// Never loaded by npm start. Fixtures exercise real server simulation/protocol.
import {registerHooks} from 'node:module';
registerHooks({load(url,context,next){
  const result=next(url,context);
  if(!url.endsWith('/server.js'))return result;
  let source=String(result.source);
  source=source.replace('let world = freshWorld();',`let world = freshWorld();
    Object.assign(world.heli,{x:-169,y:groundHeight(-169,-209),z:-209});
    Object.assign(world.rover,{x:process.env.LAG_DRIVER==='1'?-225:-221,y:groundHeight(-225,-180),z:-180,yaw:0});`);
  source=source.replace('  players.set(id, player);',`  if(id===1){
      player.state={x:-225,y:groundHeight(-225,-180),z:-180,grounded:true,vy:0};
      if(process.env.LAG_DRIVER==='1')world.rover.driver=id;
    }else if(id===2){world.heli.gunner=id;player.state={...world.heli,vy:0,grounded:true};}
    players.set(id, player);`);
  return {...result,source};
}});
if(process.env.LAG_PROFILE){
  const {Session}=await import('node:inspector');const {writeFileSync}=await import('node:fs');
  const session=new Session();session.connect();session.post('Profiler.enable');session.post('Profiler.start');
  process.on('SIGTERM',()=>session.post('Profiler.stop',(error,result)=>{
    if(!error)writeFileSync(process.env.LAG_PROFILE,JSON.stringify(result.profile));process.exit(0);
  }));
}
