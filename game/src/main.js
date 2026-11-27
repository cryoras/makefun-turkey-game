import {World} from './world.js';
import {Renderer3D} from './render3d.js';
import {Renderer2D} from './render2d.js';
import {HUD} from './hud.js';
import {Audio} from './audio.js';
import {input} from './input.js';
import {prepareShot} from './shots.js';
const params=new URLSearchParams(location.search),shot=params.get('shot');
const audio=new Audio(),world=new World(Number(params.get('seed'))||1,name=>audio.play(name));
let renderer;try{renderer=new Renderer3D(document.querySelector('#game'));window.__renderer3d=true;window.__gpu=renderer.device;window.__softwareRenderer=renderer.software;}catch(error){console.warn('Using Canvas fallback:',error.message);const old=document.querySelector('#game'),fresh=old.cloneNode();old.replaceWith(fresh);renderer=new Renderer2D(fresh);window.__renderer3d=false;window.__gpu='Canvas 2D';}
const actions={unlock:()=>audio.unlock(),start:()=>{audio.unlock();world.reset();last=performance.now();if(window.anime?.animate)window.anime.animate('.score-card',{opacity:[0,1],translateY:[-12,0],duration:500,ease:'outQuad'});},pause:()=>{if(world.mode==='playing')world.mode='paused';else if(world.mode==='paused')world.mode='playing';},mute:()=>{audio.unlock();audio.toggle();},jump:()=>{audio.unlock();if(world.jump())last=performance.now();},dash:()=>{audio.unlock();if(world.dash())last=performance.now();}};
const controls=input(world,actions),hud=new HUD(actions);let shotTime=0;if(shot)shotTime=prepareShot(world,shot);
window.__game={world,start:actions.start,pause:actions.pause,jump:()=>world.jump(),dash:()=>world.dash(),forceEnd:(won=false)=>world.finish(won),step:(dt=1/60)=>world.update(dt),snapshot:()=>({mode:world.mode,distance:world.distance,score:world.score,lives:world.lives,farmer:world.farmer,zone:world.zone,corn:world.corn,time:world.time,x:world.x,y:world.y})};
let last=performance.now(),visual=0;function frame(now){let dt=Math.max(0,Math.min((now-last)/1000,2));last=now;if(world.justAction){dt=Math.min(dt,.05);world.justAction=false;}if(!shot){if(world.mode!=='paused')visual+=dt;const state=controls.poll();for(let left=dt;left>0;left-=1/60)world.update(Math.min(left,1/60),state);audio.update(world.mode==='playing');}hud.update(world,audio);renderer.render(world,shot?shotTime:visual);if(shot)window.__shotReady=true;else requestAnimationFrame(frame);}requestAnimationFrame(frame);
