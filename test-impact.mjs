// Run functional checks alone; use --perf-only [--baseline | --active] in a fresh process.
import {chromium} from '/home/hatch/workspace/projects/makefun/work/tools/shots/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const base='http://127.0.0.1:8903/',out=new URL('./verification/impact/',import.meta.url);
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
const errors=[],external=[],checks=[],hashes={};
const pass=(name,detail)=>{checks.push({name,detail});console.log('PASS',name,detail??'');};
context.on('request',r=>{if(!r.url().startsWith(base)&&!r.url().startsWith('data:'))external.push(r.url());});
context.on('page',p=>{p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});});
const originalMain=execFileSync('git',['show','39ad90c:game/src/main.js'],{encoding:'utf8'});
let baseline=false;
await context.route('**/src/main.js',async route=>{
 const response=await route.fetch();
 await route.fulfill({response,body:baseline?originalMain:(await response.text())+'\nwindow.__impact=impact;'});
});
const page=await context.newPage();
try {
 if(!process.argv.includes('--perf-only')) {
 for(const name of ['start','play','chase','end']) {
  const pair=[];
  for(let i=0;i<2;i++) {
   await page.goto(base+'?shot='+name+'&seed=1');await page.waitForFunction(()=>window.__shotReady);
   assert.equal(await page.locator('#comic-impact').count(),0);
   assert.equal(await page.locator('#game').evaluate(c=>c.classList.contains('impact-punch')),false);
   pair.push(createHash('sha256').update(await page.screenshot()).digest('hex'));
  }
  assert.equal(pair[0],pair[1]);
  baseline=true;await page.goto(base+'?shot='+name+'&seed=1');await page.waitForFunction(()=>window.__shotReady);
  const previous=createHash('sha256').update(await page.screenshot()).digest('hex');baseline=false;
  assert.equal(pair[0],previous);hashes[name]={hash:pair[0],pairIdentical:true,unchangedFromBase:true};
  pass('Staged '+name+' PNG pair byte-identical + unchanged from 39ad90c');
 }
 await page.goto(base);await page.waitForFunction(()=>window.__game);
 assert.equal(await page.locator('#comic-impact').isVisible(),false);pass('Title has no visible impact');
 const scale=await page.evaluate(()=>{const fx=window.__impact;fx.started=1000;const result=[1000,1084,1085,1137.5,1190,2000].map(t=>fx.timeScale(t));fx.clear();return result;});
 assert.deepEqual(scale,[.04,.04,.04,.52,1,1]);pass('Hit-stop: 4% for 85ms, recovery to 100% by 190ms',scale);
 await page.evaluate(()=>{window.__game.start();const w=window.__game.world;w.entities=[{id:9999,type:'mud',x:0,at:.1,done:false}];});
 await page.waitForFunction(()=>window.__game.world.entities[0].done);
 assert.equal(await page.locator('#comic-impact').isVisible(),false);pass('Mud does not trigger damage impact');
 await page.evaluate(()=>{const w=window.__game.world;w.invulnerable=1;w.hit();});
 assert.equal(await page.locator('#comic-impact').isVisible(),false);pass('Invulnerability rejects impact');
 // Only the collision-frame animation clock is held for the evidence PNG.
 await page.evaluate(()=>{window.__game.start();const w=window.__game.world;const sound=w.sound;
  w.sound=name=>{sound(name);if(name==='hit'){clearTimeout(window.__impact.timer);window.__impact.started=performance.now()-140;const updateCamera=window.__impact.updateCamera;window.__impact.updateCamera=function(){updateCamera.call(this,this.started+140);};for(const a of document.getAnimations()){a.pause();a.currentTime=140;}w.sound=sound;window.__restoreImpactCamera=()=>{window.__impact.updateCamera=updateCamera;};}};
  w.entities=[{id:9999,type:'fence',x:0,at:.1,done:false}];
 });
 await page.waitForFunction(()=>window.__game.world.hits===1);
 assert(await page.locator('#comic-impact').isVisible());assert(await page.locator('.impact-lines').evaluate(c=>c.width===Math.ceil(innerWidth/2)&&c.height===Math.ceil(innerHeight/2)&&c.getContext('2d').getImageData(2,2,1,1).data[3]>0));
 assert.match(await page.locator('.impact-caption strong').innerText(),/^(BAM|WHAM|DOON|CRASH)!$/);
 const visual=await page.evaluate(()=>({lines:getComputedStyle(document.querySelector('.impact-lines')).opacity,zoom:window.__impact.camera?.zoom??1,caption:document.querySelector('.impact-caption').getBoundingClientRect().toJSON()}));
 assert(Number(visual.lines)>0);assert(visual.zoom>1);
 await page.screenshot({path:new URL('crash.png',out).pathname});pass('Real frame collision: rasterized rays/dots + word + shake/zoom visible',visual);
 await page.evaluate(()=>{window.__impact.clear();window.__restoreImpactCamera();});
 // A fresh hit checks the real cleanup timer, independent of the held evidence frame.
 await page.evaluate(()=>{window.__game.start();const w=window.__game.world;w.entities=[{id:9999,type:'hay',x:0,at:.1,done:false}];});
 await page.waitForFunction(()=>window.__game.world.hits===1);assert(await page.locator('#comic-impact').isVisible());
 await page.waitForFunction(()=>document.querySelector('#comic-impact').hidden);
 assert.equal(await page.locator('#game').evaluate(c=>c.classList.contains('impact-punch')),false);pass('Effect clears naturally after 640ms');
 await page.evaluate(()=>{const w=window.__game.world;w.invulnerable=0;w.hit();window.__game.pause();});
 assert.equal(await page.locator('#comic-impact').isVisible(),false);pass('Pause clears effect');
 await page.evaluate(()=>{window.__game.start();const w=window.__game.world;w.hit();window.__game.start();});
 assert.equal(await page.locator('#comic-impact').isVisible(),false);pass('Restart clears effect and hit-stop');
 await page.evaluate(()=>{const w=window.__game.world;w.lives=1;w.hit();});
 assert(await page.locator('#comic-impact').isVisible());assert.equal(await page.evaluate(()=>window.__game.world.mode),'end');
 await page.waitForFunction(()=>document.querySelector('#comic-impact').hidden);pass('Lethal collision also punctuated + cleaned');
 const reduced=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
 const rp=await reduced.newPage();await rp.goto(base);await rp.waitForFunction(()=>window.__game);
 await rp.evaluate(()=>{window.__game.start();window.__game.world.hit();});
 const motion=await rp.locator('#game').evaluate(c=>getComputedStyle(c).animationName);assert.equal(motion,'none');
 await reduced.close();pass('Reduced motion disables shake/zoom');
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(external.length,0,external.join('\n'));
 await writeFile(new URL('functional-results.json',out),JSON.stringify({checks,hashes,errors,external},null,2));
 }
 if(process.argv.includes('--perf-only')) {
 // Real gameplay, all generated entities; invulnerability prevents premature ending.
 async function measure(useBaseline) {
  baseline=useBaseline;await page.goto(base);await page.waitForFunction(()=>window.__game);
  await page.evaluate(active=>{window.__game.start();const w=window.__game.world;w.invulnerable=1000;if(active){window.__perfCrashes=0;window.__drawTimes=[];if(window.__impact){const draw=window.__impact.draw;window.__impact.draw=function(...args){const t=performance.now();draw.apply(this,args);window.__drawTimes.push(performance.now()-t);};}setInterval(()=>{w.invulnerable=0;w.lives=3;w.entities.push({id:90000+window.__perfCrashes++,type:'fence',x:w.x,at:w.distance+.1,done:false});},1800);}},process.argv.includes('--active'));await page.waitForTimeout(2000);
  return page.evaluate(()=>new Promise(resolve=>{const times=[];let start,last;function sample(now){if(start===undefined){start=last=now;requestAnimationFrame(sample);return;}times.push(now-last);last=now;if(now-start<10000){requestAnimationFrame(sample);return;}const sorted=[...times].sort((a,b)=>a-b);resolve({frames:times.length,durationMs:now-start,fps:times.length*1000/(now-start),p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1),gpu:window.__gpu,renderer3d:window.__renderer3d,stats:window.__renderStats,crashes:window.__perfCrashes??0,drawTimesMs:window.__drawTimes??[]});}requestAnimationFrame(sample);}));
 }
 const perfBaseline=process.argv.includes('--baseline')?await measure(true):null,perf=process.argv.includes('--baseline')?null:await measure(false);baseline=false;
 if(perfBaseline)pass('10-second SwiftShader baseline',perfBaseline);if(perf)pass('10-second SwiftShader '+(process.argv.includes('--active')?'with repeated impacts':'with inactive impact'),perf);
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(external.length,0,external.join('\n'));pass('Zero console/page errors + external requests');
 await writeFile(new URL(process.argv.includes('--baseline')?(process.argv.includes('--active')?'perf-baseline-active.json':'perf-baseline.json'):process.argv.includes('--active')?'perf-active.json':'results.json',out),JSON.stringify({checks,hashes,perfBaseline,perf,errors,external},null,2));
 }
} finally {await browser.close();}
