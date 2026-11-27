import {chromium} from '/home/hatch/workspace/projects/makefun/work/tools/shots/node_modules/playwright/index.mjs';
import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';

const root=process.cwd(),out='/tmp/gobble-tail',base='http://127.0.0.1:8909';
await mkdir(out,{recursive:true});
const server=spawn(process.execPath,['serve.ts','--port','8909'],{cwd:root,stdio:'ignore'});
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

 const tail=await page.evaluate(async()=>{
  const T=await import('three'),{turkey,animateTurkey,turkeyTailOpen}=await import('/src/turkey.js');
  const target=(mode,y,invulnerable,zone=0)=>turkeyTailOpen({mode,y,invulnerable,zone});
  const targets={title:target('title',0,0),run:target('playing',0,0),jump:target('playing',.1,0),hit:target('playing',0,1.6),end:target('end',0,0),zones:[0,1,2].map(zone=>target('playing',0,0,zone))};
  const bird=turkey(),d=bird.userData,merged=d.body.children.find(o=>o.isMesh&&o.geometry.attributes.color);
  const bbox=()=>{const a=d.tailAttribute.array,n=d.tailVertexCount;const min=[Infinity,Infinity,Infinity],max=[-Infinity,-Infinity,-Infinity];for(let i=0;i<n*3;i+=3)for(let k=0;k<3;k++){min[k]=Math.min(min[k],a[i+k]);max[k]=Math.max(max[k],a[i+k]);}return{min,max,height:max[1]-min[1]};};
  const expectedTailVertices=54*new T.SphereGeometry(1,8,6).index.count;
  const wing=d.wings[0],wingPosition=wing.geometry.attributes.position,wingBefore=Array.from(wingPosition.array);wing.geometry.computeBoundingBox();
  const wingBox={min:wing.geometry.boundingBox.min.toArray(),max:wing.geometry.boundingBox.max.toArray()};
  animateTurkey(bird,0,false,1,true);const openBox=bbox();
  const closing=[];for(let i=1;i<=12;i++){animateTurkey(bird,i/60,true,0,false);closing.push(d.tailState.open);}
  const closedAt=d.tailState.open;
  const opening=[];for(let i=13;i<=24;i++){animateTurkey(bird,i/60,true,1,false);opening.push(d.tailState.open);}
  const openAt=d.tailState.open;
  const shotBird=turkey();animateTurkey(shotBird,4,true,0,true);const shotClosed=shotBird.userData.tailState.open;animateTurkey(shotBird,4,true,1,true);
  animateTurkey(bird,2,true,0,true);const closeBox=bbox(),wingAfter=Array.from(wingPosition.array);
  return{targets,closing,opening,closedAt,openAt,shotClosed,shotOpen:shotBird.userData.tailState.open,expectedTailVertices,tailVertexCount:d.tailVertexCount,mergedVertexCount:merged.geometry.attributes.position.count,mergedHasColors:!!merged.geometry.attributes.color,tailAttributeIsMerged:merged.geometry.attributes.position===d.tailAttribute,openBox,closeBox,wingBox,wingUnchanged:wingBefore.every((v,i)=>v===wingAfter[i])};
 });
 assert.deepEqual(tail.targets,{title:1,run:0,jump:1,hit:1,end:1,zones:[0,0,0]});
 assert(tail.closing.every((v,i,a)=>v<1&&(i===0||v<a[i-1])),'Closing transition must change smoothly over multiple frames');
 assert(tail.opening.every((v,i,a)=>v>tail.closedAt&&(i===0||v>a[i-1])&&v<1),'Opening transition must change smoothly over multiple frames');
 assert.equal(tail.shotClosed,0);assert.equal(tail.shotOpen,1);
 assert.equal(tail.tailVertexCount,tail.expectedTailVertices,'Tail prefix must match all 54 fan spheres after bake() toNonIndexed()');
 assert(tail.mergedHasColors&&tail.tailAttributeIsMerged,'Morph attribute must belong to the baked vertex-color merged mesh');
 assert(tail.tailVertexCount<tail.mergedVertexCount,'Merged mesh must contain body vertices after the fan prefix');
 assert(tail.openBox.height-tail.closeBox.height>.5,`Tail region height must visibly contract: ${tail.openBox.height} -> ${tail.closeBox.height}`);
 assert(tail.wingBox.min.every(v=>Math.abs(v+1)<1e-6)&&tail.wingBox.max.every(v=>Math.abs(v-1)<1e-6),'Wing sphere geometry must retain its unit-sphere bounds');
 assert(tail.wingUnchanged,'Tail morph must not alter wing sphere vertices');
 pass('Targets, smooth transitions, and fixed-shot snap',JSON.stringify({targets:tail.targets,closing:tail.closing,opening:tail.opening,shotClosed:tail.shotClosed,shotOpen:tail.shotOpen}));
 pass('Baked merged-mesh tail-region geometry changes on close',JSON.stringify({tailVertexCount:tail.tailVertexCount,expectedTailVertices:tail.expectedTailVertices,mergedVertexCount:tail.mergedVertexCount,openBox:tail.openBox,closeBox:tail.closeBox}));
 pass('Wing sphere remains undistorted',JSON.stringify({bounds:tail.wingBox,unchanged:tail.wingUnchanged}));

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
  const gl=renderer.getContext(),output={},pixelBuffers={};
  for(const [name,target,time] of [['run',0,1.1],['jump',1,1.1],['hit',1,1.1]]){
   animateTurkey(bird,time,true,target,true);renderer.render(scene,camera);
   const pixels=new Uint8Array(canvas.width*canvas.height*4);gl.readPixels(0,0,canvas.width,canvas.height,gl.RGBA,gl.UNSIGNED_BYTE,pixels);pixelBuffers[name]=pixels;
   const digest=await crypto.subtle.digest('SHA-256',pixels);output[name]={png:canvas.toDataURL('image/png').split(',')[1],pixelHash:Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('')};
  }
  const changedPixels=(a,b)=>{let count=0;for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3])count++;return count;};
  output.runJumpChangedPixels=changedPixels(pixelBuffers.run,pixelBuffers.jump);output.jumpHitChangedPixels=changedPixels(pixelBuffers.jump,pixelBuffers.hit);
  renderer.dispose();return output;
 });
 for(const name of ['run','jump','hit'])await writeFile(`${out}/pose-${name}.png`,Buffer.from(poses[name].png,'base64'));
 assert.notEqual(poses.run.pixelHash,poses.jump.pixelHash,'Rendered run/jump pixel buffers must differ');
 assert(poses.runJumpChangedPixels>100,`Run/jump poses must differ in rendered pixels (got ${poses.runJumpChangedPixels})`);
 assert.equal(poses.jump.pixelHash,poses.hit.pixelHash,'Equal openness at the same animation time must render identically');
 pass('Rendered turkey pose pixels differ',JSON.stringify({runHash:poses.run.pixelHash,jumpHash:poses.jump.pixelHash,hitHash:poses.hit.pixelHash,runJumpChangedPixels:poses.runJumpChangedPixels,jumpHitChangedPixels:poses.jumpHitChangedPixels,files:`${out}/pose-run.png; ${out}/pose-jump.png; ${out}/pose-hit.png`}));

 await page.evaluate(()=>window.__game.start());await page.waitForTimeout(1200);
 const perf=await page.evaluate(()=>new Promise(resolve=>{const intervals=[];let start,last;function sample(now){if(start===undefined){start=last=now;requestAnimationFrame(sample);return;}intervals.push(now-last);last=now;if(now-start<10000){requestAnimationFrame(sample);return;}const sorted=[...intervals].sort((a,b)=>a-b);resolve({frames:intervals.length,durationMs:now-start,fps:intervals.length*1000/(now-start),p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1),gpu:window.__gpu,renderer3d:window.__renderer3d,pixelRatio:window.__renderStats?.pixelRatio});}requestAnimationFrame(sample);}));
 pass('10-second SwiftShader FPS/p95 sample',JSON.stringify(perf));
 assert.equal(errors.length,0,errors.join('\n'));assert.equal(external.length,0,external.join('\n'));
 pass('Console/page errors and external requests','0 / 0');
 await writeFile(`${out}/results.json`,JSON.stringify({flags,shotHashes,tail,poses:Object.fromEntries(['run','jump','hit'].map(name=>[name,poses[name].pixelHash])),perf,errors,external,checks},null,2));
 console.log('RESULT',JSON.stringify({shotHashes,tail,poses:Object.fromEntries(['run','jump','hit'].map(name=>[name,poses[name].pixelHash])),perf,errors,external},null,2));
}catch(error){console.error(error);process.exitCode=1;}finally{await browser?.close();server.kill();}
