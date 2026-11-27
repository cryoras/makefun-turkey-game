import {LANES,ZONES,FINISH,clamp} from './config.js';
import {random} from './random.js';
export class World{
 constructor(seed=1,sound=()=>{}){this.seed=seed;this.sound=sound;this.best=0;try{this.best=+localStorage.getItem('gobble-run-best')||0;}catch{}this.reset();this.mode='title';}
 reset(){Object.assign(this,{mode:'playing',distance:0,time:0,x:0,targetX:0,y:0,vy:0,lives:3,corn:0,feathers:0,zone:0,zoneBonus:0,speed:8,farmer:12,dashTime:0,dashCooldown:0,slow:0,invulnerable:0,hits:0,event:'',eventTime:0,bannerTime:0,won:false,justAction:false});this.entities=[];this.rng=random(this.seed);let id=0;
  for(let at=22;at<FINISH+30;){const zone=Math.min(2,Math.floor(at/500));const open=Math.floor(this.rng()*3);const types=zone===0?['fence','hay','mud']:zone===1?['cart','hay','fence','mud']:['oven','knife','cart','mud'];
   for(let lane=0;lane<3;lane++){if(lane!==open&&(this.rng()<.7+zone*.1))this.entities.push({id:id++,type:types[Math.floor(this.rng()*types.length)],lane,x:LANES[lane],at,phase:this.rng()*6.28,done:false});}
   for(let j=0;j<4;j++)this.entities.push({id:id++,type:'corn',lane:open,x:LANES[open],at:at+3+j*2,done:false});
   let rare=this.rng();if(rare<.08)this.entities.push({id:id++,type:'heart',x:LANES[open],lane:open,at:at+12,done:false});else if(rare<.25)this.entities.push({id:id++,type:'feather',x:LANES[open],lane:open,at:at+12,done:false});
   at+=zone===0?21+this.rng()*9:zone===1?18+this.rng()*7:16+this.rng()*6;
  }
 }
 get score(){return Math.floor(this.distance)+this.corn*50+this.feathers*150+this.zoneBonus;}
 tell(text){this.event=text;this.eventTime=1.8;}
 jump(){if(this.mode==='playing'&&this.y<=.02){this.vy=9.8;this.justAction=true;this.sound('gobble');return true;}return false;}
 dash(){if(this.mode==='playing'&&this.dashCooldown<=0){this.dashTime=1;this.dashCooldown=3;this.justAction=true;this.farmer=clamp(this.farmer+4,1,24);this.sound('dash');this.tell('FEATHERS, FLY!');return true;}return false;}
 hit(){if(this.mode!=='playing'||this.invulnerable>0)return;this.lives--;this.hits++;this.invulnerable=1.6;this.slow=.45;this.farmer=Math.max(1,this.farmer-6);this.sound('hit');this.tell('STUMBLE!  −1 HEART');if(this.lives<=0)this.finish(false);}
 finish(won=false){this.won=won;this.mode='end';if(this.score>this.best){this.best=this.score;try{localStorage.setItem('gobble-run-best',this.best);}catch{}}this.sound(won?'win':'end');}
 update(dt,input={}){if(this.mode!=='playing')return;this.time+=dt;this.eventTime=Math.max(0,this.eventTime-dt);this.bannerTime=Math.max(0,this.bannerTime-dt);this.invulnerable=Math.max(0,this.invulnerable-dt);this.dashCooldown=Math.max(0,this.dashCooldown-dt);this.dashTime=Math.max(0,this.dashTime-dt);this.slow=Math.max(0,this.slow-dt);
  const lane=LANES.reduce((best,x,index)=>Math.abs(x-this.targetX)<Math.abs(LANES[best]-this.targetX)?index:best,0);this.targetX=LANES[lane];const laneDelta=this.targetX-this.x;if(Math.abs(laneDelta)<.02)this.x=this.targetX;else this.x+=laneDelta*Math.min(1,dt*13);this.vy-=21*dt;this.y=Math.max(0,this.y+this.vy*dt);if(this.y===0)this.vy=0;
  const z=Math.min(2,Math.floor(this.distance/500));if(z!==this.zone){this.zone=z;this.zoneBonus+=250;this.bannerTime=3;this.tell('+250 · NEW ZONE');this.sound('collect');}
  this.speed=ZONES[this.zone].speed*(this.dashTime>0?1.6:1)*(this.slow>0?.48:1);this.distance=Math.min(FINISH,this.distance+this.speed*dt);this.farmer=clamp(this.farmer+dt*.11,1,24);
  for(const e of this.entities){const gap=e.at-this.distance;if(e.done||gap>3||gap< -3)continue;const ex=e.type==='knife'?e.x+Math.sin(this.time*2.6+e.phase)*2.2:e.x;if(Math.abs(ex-this.x)> (e.type==='corn'||e.type==='feather'||e.type==='heart'?.85:1.02)||Math.abs(gap)> (e.type==='mud'?1.7:.85))continue;
   if(['corn','feather','heart'].includes(e.type)){if(this.y>2)continue;e.done=true;if(e.type==='corn'){this.corn++;this.farmer=clamp(this.farmer+.35,1,24);}if(e.type==='feather'){this.feathers++;this.tell('GOLDEN FEATHER · +150');}if(e.type==='heart'){this.lives=Math.min(3,this.lives+1);this.tell('A LITTLE EXTRA HEART');}this.sound('collect');}
   else if(e.type==='mud'){if(this.y<.4){this.slow=.8;e.done=true;this.tell('MUD! JUMP TO KEEP YOUR PACE');}}
   else{const height={fence:1.05,hay:1.6,cart:1.85,oven:2.15,knife:1.5}[e.type];if(this.y<height){e.done=true;this.hit();}}
  }
  if(this.distance>=FINISH&&this.mode==='playing')this.finish(true);
 }
}
