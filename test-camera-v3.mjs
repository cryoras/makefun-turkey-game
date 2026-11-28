import {chromium} from '/home/hatch/workspace/projects/makefun/work/tools/shots/node_modules/playwright/index.mjs';
import {readFile} from 'node:fs/promises';
import {resolve,sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(fileURLToPath(new URL('./game/',import.meta.url)));
const base='http://127.0.0.1:8903/';
const errors=[],external=[],results=[];const pass=(name,detail='')=>{results.push({name,detail,status:'PASS'});console.log('PASS',name,detail);};
let browser;
try{
 browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const context=await browser.newContext({viewport:{width:1280,height:720},deviceScaleFactor:1});
context.on('request',request=>{if(!request.url().startsWith(base)&&!request.url().startsWith('data:'))external.push(request.url());});
context.on('page',page=>{page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});});
context.route('**/*',async route=>{
 const url=new URL(route.request().url());
 if(url.origin!=='http://127.0.0.1:8903'){external.push(url.href);await route.abort();return;}
 let pathname=decodeURIComponent(url.pathname);if(pathname.endsWith('/'))pathname+='index.html';
 const file=resolve(root,`.${pathname}`);if(file!==root&&!file.startsWith(root+sep)){await route.abort();return;}
 try{
  let body=await readFile(file);if(pathname==='/src/main.js')body=Buffer.concat([body,Buffer.from('\nwindow.__testRenderer=renderer;')]);
  if(pathname==='/src/render3d.js')body=Buffer.concat([body,Buffer.from('\nwindow.__testThree=T;')]);
  const contentType=pathname.endsWith('.html')?'text/html':pathname.endsWith('.css')?'text/css':pathname.endsWith('.json')?'application/json':pathname.endsWith('.js')?'text/javascript':'application/octet-stream';
  await route.fulfill({status:200,contentType,body});
 }catch{await route.fulfill({status:404,body:'not found'});}
});
const page=await context.newPage();
 for(const shot of ['play','chase']){
  await page.goto(`${base}?shot=${shot}&seed=1`);await page.waitForFunction(()=>window.__shotReady,{timeout:30000});
  const data=await page.evaluate(shot=>{
   const T=window.__testThree,r=window.__testRenderer,w=window.__game.world;
   function projected(obj){obj.updateMatrixWorld(true);const box=new T.Box3().setFromObject(obj),points=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])points.push(new T.Vector3(x,y,z).project(r.camera));const xs=points.map(v=>(v.x+1)*640),ys=points.map(v=>(1-v.y)*360),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);return{left,top,right,bottom,area:(right-left)*(bottom-top),fully:left>=0&&right<=1280&&top>=0&&bottom<=720,centerPct:(left+right)/25.6,framePct:(right-left)*(bottom-top)/(1280*720)*100};}
   const checks=[];
   for(const lane of [-2.8,0,2.8])for(const jump of [0,1.8]){
    w.x=w.targetX=lane;w.y=jump;w.farmer=shot==='play'?7:2.5;r.render(w,20);
    const bird=projected(r.bird),farmer=projected(r.chaser),overlap=Math.max(0,Math.min(bird.right,farmer.right)-Math.max(bird.left,farmer.left))*Math.max(0,Math.min(bird.bottom,farmer.bottom)-Math.max(bird.top,farmer.top));
    checks.push({lane,jump,bird,farmer,overlapPct:overlap/bird.area*100});
   }
   const obstacleTypes=new Set(['fence','hay','cart','oven','knife','scissors-ground','scissors-left','scissors-right','scissors-pivot']),obstacles=[],corn=[];
   for(const [type,batch]of r.entityBatches){if((!obstacleTypes.has(type)&&type!=='corn')||!batch.visible)continue;batch.updateMatrixWorld(true);if(!batch.geometry.boundingBox)batch.geometry.computeBoundingBox();const local=batch.geometry.boundingBox;
    for(let i=0;i<batch.count;i++){const instance=new T.Matrix4();batch.getMatrixAt(i,instance);const matrix=batch.matrixWorld.clone().multiply(instance),points=[];for(const x of[local.min.x,local.max.x])for(const y of[local.min.y,local.max.y])for(const z of[local.min.z,local.max.z])points.push(new T.Vector3(x,y,z).applyMatrix4(matrix).project(r.camera));const xs=points.map(v=>(v.x+1)*640),ys=points.map(v=>(1-v.y)*360),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys),area=(right-left)*(bottom-top),visibleArea=Math.max(0,Math.min(1280,right)-Math.max(0,left))*Math.max(0,Math.min(720,bottom)-Math.max(0,top));if(visibleArea>100)(type==='corn'?corn:obstacles).push({type,area,visibleArea,box:{left,top,right,bottom}});}
   }
   return{checks,obstacles,corn,hud:Object.fromEntries(['score','distance','lives','farmer'].map(id=>{const el=document.querySelector('#'+id),rect=el.getBoundingClientRect(),style=getComputedStyle(el);return[id,{text:el.textContent.trim(),visible:!document.querySelector('#hud').hidden&&style.display!=='none'&&rect.width>0&&rect.height>0}]}))};
  },shot);
  for(const check of data.checks){if(!check.bird.fully)throw new Error(`${shot} lane ${check.lane} jump ${check.jump}: turkey clipped`);if(!check.farmer.fully)throw new Error(`${shot} lane ${check.lane} jump ${check.jump}: farmer clipped`);if(check.overlapPct>=10)throw new Error(`${shot} lane ${check.lane} jump ${check.jump}: overlap ${check.overlapPct.toFixed(2)}%`);if(check.bird.centerPct<35||check.bird.centerPct>65)throw new Error(`${shot} lane ${check.lane}: x center ${check.bird.centerPct.toFixed(2)}%`);if(check.bird.framePct<8)throw new Error(`${shot} lane ${check.lane}: turkey area ${check.bird.framePct.toFixed(2)}%`);}
  pass(`${shot}: bbox visibility in 3 lanes + jump`,JSON.stringify(data.checks.map(c=>({lane:c.lane,jump:c.jump,overlapPct:+c.overlapPct.toFixed(2),centerPct:+c.bird.centerPct.toFixed(2),framePct:+c.bird.framePct.toFixed(2),fully:c.bird.fully}))));
  for(const [id,value]of Object.entries(data.hud))if(!value.visible||!value.text)throw new Error(`${shot}: HUD ${id} not readable`);
  pass(`${shot}: score, distance, lives, farmer-gap HUD`,JSON.stringify(data.hud));
  if(shot==='play'){if(!data.obstacles.length)throw new Error('play shot has no visible obstacle bbox');pass('play: visible obstacle',JSON.stringify(data.obstacles[0]));if(!data.corn.length)throw new Error('play shot has no visible corn collectible');pass('play: visible corn row',JSON.stringify(data.corn.slice(0,4)));}
 }
 if(errors.length)throw new Error(`console/page errors: ${errors.join(' | ')}`);pass('Console/page errors','0');
 if(external.length)throw new Error(`external requests: ${external.join(' | ')}`);pass('External requests','0');
}catch(error){results.push({name:'Camera v3 visibility',status:'FAIL',detail:error.stack});console.error('FAIL Camera v3 visibility',error.stack);process.exitCode=1;}
finally{await browser?.close();console.log(JSON.stringify(results,null,2));}
