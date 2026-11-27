// Screenshot poses are actual fixed-step runs with a small obstacle-aware autopilot.
// All distances, scores and entities are produced by World.update, exactly as in live play.
export function prepareShot(w,name){if(name==='start')return 2.4;w.reset();const target=name==='play'?272:name==='chase'?1118:386;const dt=1/60;
 while(w.distance<target&&w.mode==='playing'){
  const upcoming=w.entities.filter(e=>!e.done&&e.at>w.distance&&e.at<w.distance+13&&!['corn','heart','feather','mud'].includes(e.type));
  const safe=[-2.8,0,2.8].map(x=>({x,cost:upcoming.reduce((v,e)=>v+(Math.abs(e.x-x)<1.2?1:0),0)})).sort((a,b)=>a.cost-b.cost||Math.abs(a.x-w.x)-Math.abs(b.x-w.x));w.targetX=safe[0].x;
  if(upcoming.some(e=>Math.abs(e.x-w.x)<1.1&&e.at-w.distance<5))w.jump();w.update(dt);
 }
 if(name==='end'){w.invulnerable=0;w.hit();w.invulnerable=0;w.hit();w.invulnerable=0;w.hit();}else{w.farmer=name==='chase'?2.5:7;w.invulnerable=0;w.eventTime=0;w.targetX=w.x;}
 return w.time;
}
