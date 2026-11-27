import {chromium} from '/home/hatch/workspace/projects/makefun/work/tools/shots/node_modules/playwright/index.mjs';
import {spawn} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:8904',out='/tmp/gobble-run-scissors',root=process.cwd();
await mkdir(`${out}/repo/screenshots`,{recursive:true});
// Run the existing 28 checks against this worktree, with all artifacts in /tmp.
const original=await readFile(new URL('../test-turkey.mjs',import.meta.url),'utf8');
const adapted=original.replace("const root='/home/hatch/workspace/projects/makefun/work/turkey-game';",`const root=${JSON.stringify(out)};`).replace("cwd:root+'/repo'",`cwd:${JSON.stringify(root)}`).replaceAll('8901','8904');
await writeFile(`${out}/test-turkey.mjs`,adapted);
if(!process.argv.includes('--skip-regression'))await new Promise((resolve,reject)=>{const child=spawn(process.execPath,[`${out}/test-turkey.mjs`],{stdio:'inherit'});child.on('exit',code=>code===0?resolve():reject(new Error(`28-check regression suite exited ${code}`)));});
const server=spawn(process.execPath,['serve.ts','--port','8904'],{cwd:root,stdio:'ignore'});
let browser;const errors=[],external=[],checks=[],shots={},poses=[];
const pass=(name,detail)=>{checks.push({name,detail});console.log('PASS',name,detail??'');};
try{
 for(let i=0;i<80;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
 context.on('request',r=>{if(!r.url().startsWith(base+'/')&&!r.url().startsWith('data:'))external.push(r.url());});
 await context.route('**/src/main.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nwindow.__testRenderer=renderer;'});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 for(const name of ['start','play','chase','end']){
  const hashes=[],states=[];
  for(let repeat=0;repeat<2;repeat++){
   await page.goto(`${base}/?shot=${name}&seed=1`);await page.waitForFunction(()=>window.__shotReady);
   hashes.push(createHash('sha256').update(await page.screenshot({path:`${out}/${name}${repeat?'-repeat':''}.png`})).digest('hex'));
   states.push(await page.evaluate(()=>({state:window.__game.snapshot(),hazards:window.__game.world.entities.filter(e=>['scissors','knife'].includes(e.type)).map(e=>[e.type,e.at,e.lane])})));
  }
  assert.equal(hashes[0],hashes[1]);assert.deepEqual(states[0],states[1]);shots[name]={hash:hashes[0],state:states[0].state};pass(`Deterministic shot ${name}`);
 }
 const distribution=await page.evaluate(()=>{const w=window.__game.world;let totals=[0,0,0],knives=0;const seeds=[];for(let seed=1;seed<=100;seed++){w.seed=seed;w.reset();const counts=[0,0,0];for(const e of w.entities){if(e.type==='scissors')counts[Math.min(2,Math.floor(e.at/500))]++;if(e.type==='knife')knives++;}totals=totals.map((n,i)=>n+counts[i]);seeds.push(counts);}w.seed=1;w.reset();return{totals,knives,seed1:seeds[0],missingZones:seeds.filter(c=>c.some(n=>n===0)).length};});
 assert(distribution.totals.every(n=>n>500));assert(distribution.knives>0);assert(distribution.seed1.every(n=>n>0));pass('Spawn scissors in all zones; carving knives retained',distribution);
 await page.goto(`${base}/?shot=play&seed=1`);await page.waitForFunction(()=>window.__shotReady);
 for(const [label,gap,time] of [['mound',40,2],['rising',27,2],['open',9,Math.PI/12],['closed',9,Math.PI/4]]){
  const pose=await page.evaluate(({gap,time})=>{
   const w=window.__game.world,r=window.__testRenderer;w.reset();w.x=w.targetX=2.8;w.distance=100;w.time=time;w.zone=0;w.entities=[{id:9001,type:'scissors',x:-2.8,lane:0,at:100+gap,phase:0,done:false}];r.render(w,time);
   const read=key=>{const batch=r.entityBatches.get(key),m=r.entityDummy.matrix.clone();if(!batch?.count)return null;batch.getMatrixAt(0,m);const a=m.elements;return{y:a[13],angle:Math.atan2(a[1],a[0]),count:batch.count};};
   return{gap,time,ground:read('scissors-ground'),left:read('scissors-left'),right:read('scissors-right')};
  },{gap,time});poses.push(pose);await page.screenshot({path:`${out}/scissors-${label}.png`});
 }
 assert.equal(poses[0].left,null);assert(poses[1].left.y<poses[2].left.y);assert(Math.abs(poses[2].left.angle-poses[3].left.angle)>.4);pass('Mound warning, rising from ground, opening and closing',poses);
 const collision=await page.evaluate(()=>{
  const w=window.__game.world,events=[];const sound=w.sound;w.sound=name=>events.push(name);
  const setup=(type,y=0,x=0)=>{w.reset();w.x=w.targetX=x;w.y=y;w.entities=[{id:9002,type,x:0,at:.1,phase:0,done:false}];w.update(1/60);return{lives:w.lives,hits:w.hits,event:w.event,invulnerable:w.invulnerable,done:w.entities[0].done};};
  const hit=setup('scissors'),clear=setup('scissors',1.8),dodge=setup('scissors',0,2.8),knife=setup('knife');w.sound=sound;return{hit,clear,dodge,knife,events};
 });
 const collisionOK=collision.hit.lives===2&&collision.hit.hits===1&&collision.hit.invulnerable>1.2&&/STUMBLE/.test(collision.hit.event)&&collision.clear.lives===3&&collision.dodge.lives===3&&collision.knife.lives===2&&collision.events.includes('hit');
 if(collisionOK)pass('Collision, jump, dodge and standard impact hooks',collision);else console.error('FAIL scissors collision',collision);
 await page.evaluate(()=>{const w=window.__game.world,r=window.__testRenderer;r.render(w,w.time);});
 // Shot mode has no animation loop: explicitly update HUD to verify its shared hit class.
 const impact=await page.evaluate(async()=>{const {HUD}=await import('/src/hud.js');const w=window.__game.world;w.reset();w.entities=[{id:9,type:'scissors',x:0,at:.1,done:false}];w.update(1/60);new HUD({}).update(w,{muted:false});return document.body.classList.contains('hit');});
 if(impact)pass('Shared HUD impact class triggered');else console.error('FAIL shared HUD impact class');
 await page.evaluate(()=>{const w=window.__game.world,r=window.__testRenderer;w.reset();const e=w.entities.find(e=>e.type==='knife');w.distance=e.at-8;w.zone=2;r.render(w,2);});await page.screenshot({path:`${out}/knife-gameplay.png`});
 assert(await page.evaluate(()=>window.__testRenderer.entityBatches.get('knife').count>0));pass('Knife present in rendered natural spawn');
 await page.goto(base);await page.waitForFunction(()=>window.__game);await page.evaluate(()=>{window.__game.start();window.__game.world.invulnerable=1000;});await page.waitForTimeout(2000);
 const perf=await page.evaluate(()=>new Promise(resolve=>{const times=[];let start,last;function sample(now){if(!start){start=last=now;requestAnimationFrame(sample);return;}times.push(now-last);last=now;if(now-start<10000){requestAnimationFrame(sample);return;}const sorted=[...times].sort((a,b)=>a-b);resolve({frames:times.length,durationMs:now-start,fps:times.length*1000/(now-start),p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1),gpu:window.__gpu,stats:window.__renderStats});}requestAnimationFrame(sample);}));
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(external.length,0);pass('Console errors / external requests',{errors:0,external:0});
 await writeFile(`${out}/results.json`,JSON.stringify({checks,shots,poses,distribution,collision,perf,errors,external},null,2));console.log('PERFORMANCE',JSON.stringify(perf));console.log('ARTIFACTS',out);assert(collisionOK&&impact,'Scissors need a collision height entry to trigger hit and HUD impact');
}finally{await browser?.close();server.kill();}
