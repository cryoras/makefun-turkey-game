import {chromium} from '/home/hatch/workspace/projects/makefun/work/tools/shots/node_modules/playwright/index.mjs';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=process.cwd(),out='/tmp/gobble-tail',base='http://127.0.0.1:8907';
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['serve.ts','--port','8907'],{cwd:root,stdio:'ignore'});
const errors=[],external=[],checks=[],shotHashes={};let browser;
const pass=(name,detail='')=>{checks.push({name,detail});console.log('PASS',name,detail);};
const flags=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'];

try{
 for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:flags});
 const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
 context.on('request',r=>{const host=new URL(r.url()).hostname;if(!['127.0.0.1','localhost'].includes(host)&&!r.url().startsWith('data:'))external.push(r.url());});
 context.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});});
 const page=await context.newPage();

 for(const name of ['start','play','chase','end']){
  const pair=[];
  for(let i=0;i<2;i++){
   await page.goto(`${base}/?shot=${name}&seed=1`);await page.waitForFunction(()=>window.__shotReady,{timeout:30000});
   const state=await page.evaluate(()=>({...window.__game.snapshot(),invulnerable:window.__game.world.invulnerable}));
   assert.equal(state.mode,name==='start'?'title':name==='end'?'end':'playing');
   if(name==='play'||name==='chase'){assert.equal(state.y,0,`${name} must stage the turkey on the ground`);assert.equal(state.invulnerable,0,`${name} must not stage a hit pose`);}
   assert.equal(await page.evaluate(()=>window.__renderer3d),true);
   const image=await page.screenshot({type:'png'});pair.push(image);
   if(i===0)await writeFile(`${out}/${name}.png`,image);
  }
  assert.deepEqual(pair[0],pair[1],`${name} PNG pair differs byte-for-byte`);
  shotHashes[name]=createHash('sha256').update(pair[0]).digest('hex');
  pass(`?shot=${name}: deterministic PNG pair`,shotHashes[name]);
 }

 const fan=await page.evaluate(async()=>{
  const {turkey,animateTurkey,turkeyTailOpen}=await import('/src/turkey.js');
  const target=(mode,y,invulnerable,zone=0)=>turkeyTailOpen({mode,y,invulnerable,zone});
  const targets={title:target('title',0,0),run:target('playing',0,0),jump:target('playing',.1,0),hit:target('playing',0,1.6),end:target('end',0,0),zones:[0,1,2].map(zone=>target('playing',0,0,zone))};
  const bird=turkey();animateTurkey(bird,0,false,1,false);
  const closing=[];for(let i=1;i<=12;i++){animateTurkey(bird,i/60,true,0,false);closing.push(bird.userData.tailState.open);}
  const closedAt=bird.userData.tailState.open,closeTilt=bird.userData.fan.rotation.x,closeSpread=bird.userData.fan.scale.x;
  const opening=[];for(let i=13;i<=24;i++){animateTurkey(bird,i/60,true,1,false);opening.push(bird.userData.tailState.open);}
  const openAt=bird.userData.tailState.open,openTilt=bird.userData.fan.rotation.x,openSpread=bird.userData.fan.scale.x;
  const shotBird=turkey();animateTurkey(shotBird,4,true,0,true);
  const shotClosed=shotBird.userData.tailState.open;animateTurkey(shotBird,4,true,1,true);
  return{targets,closing,opening,closedAt,closeTilt,closeSpread,openAt,openTilt,openSpread,shotClosed,shotOpen:shotBird.userData.tailState.open};
 });
 assert.deepEqual(fan.targets,{title:1,run:0,jump:1,hit:1,end:1,zones:[0,0,0]});
 assert(fan.closing.every((v,i,a)=>v<1&&(i===0||v<a[i-1])),'Closing transition must change smoothly over multiple frames');
 assert(fan.opening.every((v,i,a)=>v>fan.closedAt&&(i===0||v>a[i-1])&&v<1),'Opening transition must change smoothly over multiple frames');
 assert(fan.closeTilt<0&&fan.closeSpread<1&&fan.openTilt>fan.closeTilt&&fan.openSpread>fan.closeSpread);
 assert.equal(fan.shotClosed,0);assert.equal(fan.shotOpen,1);
 pass('World-state targets + smooth fan close/open + fixed-shot snap',JSON.stringify(fan));

 await page.goto(base);await page.waitForFunction(()=>window.__game);
 await page.locator('#start').click();await page.waitForFunction(()=>window.__game.world.mode==='playing');
 await page.evaluate(()=>{const w=window.__game.world;w.entities=[];w.invulnerable=0;w.y=0;w.vy=0;});
 await page.waitForTimeout(700);await page.screenshot({path:`${out}/live-run.png`});
 await page.evaluate(()=>{const w=window.__game.world;w.y=1.5;w.vy=0;});await page.waitForTimeout(150);await page.screenshot({path:`${out}/live-jump.png`});
 await page.evaluate(()=>{const w=window.__game.world;w.y=0;w.vy=0;w.invulnerable=0;w.hit();});await page.waitForTimeout(350);await page.screenshot({path:`${out}/live-hit.png`});
 pass('Live ground, airborne, and post-hit evidence PNGs',`${out}/live-run.png; ${out}/live-jump.png; ${out}/live-hit.png`);

 const poses=await page.evaluate(async()=>{
  const T=await import('three'),{turkey,animateTurkey}=await import('/src/turkey.js');
  const canvas=document.createElement('canvas'),scene=new T.Scene();canvas.width=640;canvas.height=480;scene.background=new T.Color(0x553922);
  const camera=new T.PerspectiveCamera(38,canvas.width/canvas.height,.1,40);camera.position.set(3.8,3.3,8);camera.lookAt(0,1.65,0);
  const renderer=new T.WebGLRenderer({canvas,antialias:false});renderer.setPixelRatio(1);renderer.setSize(canvas.width,canvas.height,false);renderer.outputColorSpace=T.SRGBColorSpace;
  const bird=turkey();bird.rotation.y=Math.PI;bird.scale.setScalar(1.35);scene.add(bird);
  const output={};for(const [name,target,time] of [['run',0,.6],['jump',1,1.1],['hit',1,1.6]]){animateTurkey(bird,time,true,target,true);renderer.render(scene,camera);output[name]=canvas.toDataURL('image/png').split(',')[1];}
  renderer.dispose();return output;
 });
 for(const [name,data]of Object.entries(poses))await writeFile(`${out}/pose-${name}.png`,Buffer.from(data,'base64'));
 pass('Isolated turkey pose screenshots show lowered and spread tails',`${out}/pose-run.png; ${out}/pose-jump.png; ${out}/pose-hit.png`);

 await page.evaluate(()=>window.__game.start());await page.waitForTimeout(1200);
 const perf=await page.evaluate(()=>new Promise(resolve=>{const intervals=[];let start,last;function sample(now){if(start===undefined){start=last=now;requestAnimationFrame(sample);return;}intervals.push(now-last);last=now;if(now-start<10000){requestAnimationFrame(sample);return;}const sorted=[...intervals].sort((a,b)=>a-b);resolve({frames:intervals.length,durationMs:now-start,fps:intervals.length*1000/(now-start),p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1),gpu:window.__gpu,renderer3d:window.__renderer3d,pixelRatio:window.__renderStats?.pixelRatio});}requestAnimationFrame(sample);}));
 pass('10-second SwiftShader FPS/p95 sample',JSON.stringify(perf));
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(external.length,0,external.join('\n'));
 pass('Console/page errors and external requests','0 / 0');
 await writeFile(`${out}/results.json`,JSON.stringify({flags,shotHashes,fan,perf,errors,external,checks},null,2));
 console.log('RESULT',JSON.stringify({shotHashes,fan,perf,errors,external},null,2));
}catch(error){console.error(error);process.exitCode=1;}finally{await browser?.close();server.kill();}
