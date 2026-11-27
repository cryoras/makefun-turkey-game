import {chromium} from '/home/hatch/workspace/projects/makefun/work/tools/shots/node_modules/playwright/index.mjs';
import {spawn} from 'node:child_process';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=process.cwd(),base='http://127.0.0.1:8902/';
const server=spawn(process.execPath,['serve.ts','--port','8902'],{cwd:root,stdio:'pipe'});
const errors=[],external=[];let browser;
const pass=(name,detail='')=>console.log('PASS',name,detail);
const measurePerf=page=>page.evaluate(()=>new Promise(resolve=>{const intervals=[];let start,last;function sample(now){if(start===undefined){start=last=now;requestAnimationFrame(sample);return;}intervals.push(now-last);last=now;if(now-start<10000){requestAnimationFrame(sample);return;}const sorted=[...intervals].sort((a,b)=>a-b);resolve({frames:intervals.length,durationMs:now-start,fps:intervals.length*1000/(now-start),p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1),over100ms:intervals.filter(x=>x>100).length,gpu:window.__gpu,renderer3d:window.__renderer3d});}requestAnimationFrame(sample);}));
try{
 for(let i=0;i<60;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
 context.on('request',request=>{const url=new URL(request.url());if(!['127.0.0.1','localhost'].includes(url.hostname)&&!request.url().startsWith('data:'))external.push(request.url());});
 context.on('page',page=>{page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});});
 await context.route('**/src/main.js',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text())+'\nwindow.__audio=audio;'});});
 const page=await context.newPage();
 const screenshots=[];
 for(const [name,file] of [['start','1-start.jpg'],['play','2-play.jpg'],['chase','3-chase.jpg'],['end','4-end.jpg']]){
  await page.goto(`${base}?shot=${name}&seed=1`);await page.waitForFunction(()=>window.__shotReady,{timeout:30000});await page.waitForTimeout(300);
  const image=await page.screenshot({type:'jpeg',quality:82});const baseline=await readFile(`${root}/screenshots/${file}`);
  assert.deepEqual(image,baseline,`${file} changed from committed baseline`);
  screenshots.push({name,hash:createHash('sha256').update(image).digest('hex')});pass(`Baseline screenshot ${name}`,screenshots.at(-1).hash);
 }
 await page.goto(base);await page.waitForFunction(()=>window.__game&&window.__audio);
 assert.equal(await page.evaluate(()=>window.__audio.ctx),null,'Audio must wait for a user gesture');
 await page.locator('#start').click();await page.waitForFunction(()=>window.__game.world.mode==='playing'&&window.__audio.ctx?.state==='running');
 await page.waitForFunction(()=>window.__audio.bgmActive&&window.__audio.bgmStep>3,{timeout:10000});
 const audioStart=await page.evaluate(()=>({state:window.__audio.ctx.state,active:window.__audio.bgmActive,step:window.__audio.bgmStep,melodyGain:window.__audio.bgmGain.gain.value,sfxGain:window.__audio.sfxGain.gain.value}));
 assert.equal(audioStart.state,'running');assert(audioStart.active&&audioStart.step>3);pass('Running AudioContext + scheduled BGM',JSON.stringify(audioStart));
 const perf=await measurePerf(page);
 pass('10-second SwiftShader performance sample',JSON.stringify(perf));
 await page.keyboard.press('m');await page.waitForFunction(()=>window.__audio.muted&&!window.__audio.bgmActive);await page.waitForTimeout(80);
 const muted=await page.evaluate(()=>({muted:window.__audio.muted,musicGain:window.__audio.bgmGain.gain.value,sfxGain:window.__audio.sfxGain.gain.value}));assert(muted.muted&&muted.musicGain<.01&&muted.sfxGain<.01);await page.evaluate(()=>window.__audio.play('hit'));pass('M silences BGM and SFX',JSON.stringify(muted));
 const perfMuted=await measurePerf(page);pass('10-second muted SwiftShader comparison',JSON.stringify(perfMuted));
 await page.keyboard.press('m');await page.waitForFunction(()=>!window.__audio.muted&&window.__audio.bgmActive);await page.keyboard.press('p');await page.waitForFunction(()=>window.__game.world.mode==='paused'&&!window.__audio.bgmActive);await page.waitForTimeout(80);
 const paused=await page.evaluate(()=>({mode:window.__game.world.mode,active:window.__audio.bgmActive,musicGain:window.__audio.bgmGain.gain.value}));assert.equal(paused.mode,'paused');assert(!paused.active&&paused.musicGain<.01);pass('Pause stops BGM',JSON.stringify(paused));
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(external.length,0,external.join('\n'));pass('Console errors',String(errors.length));pass('External requests',String(external.length));
 console.log('RESULT',JSON.stringify({screenshots, audioStart, perf, muted, perfMuted, paused, errors, external},null,2));
}catch(error){console.error(error);process.exitCode=1;}finally{await browser?.close();server.kill();}
