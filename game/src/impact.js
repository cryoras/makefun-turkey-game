// Original, asset-free crash punctuation. Its clock is wall time, independent of hit-stop.
export class Impact {
 constructor(canvas) {
  this.canvas=canvas;this.started=-Infinity;this.timer=null;this.count=0;
  this.overlay=document.createElement('div');this.overlay.id='comic-impact';
  this.overlay.hidden=true;this.overlay.setAttribute('aria-hidden','true');
  this.overlay.innerHTML='<canvas class="impact-lines"></canvas><div class="impact-caption"><strong></strong></div>';
  this.word=this.overlay.querySelector('strong');this.art=this.overlay.querySelector('canvas');
  document.body.append(this.overlay);
 }
 trigger(world,camera) {
  // Called only by the accepted World.hit() sound signal, never by mud or pickups.
  let x=50+world.x*7.2,y=77-world.y*6;
  if(camera) {
   const point=camera.position.clone().set(world.x,world.y+.9,2).project(camera);
   x=(point.x+1)*50;y=(1-point.y)*50;
  }
  x=Math.max(18,Math.min(82,x));y=Math.max(30,Math.min(78,y));
  this.clear();this.started=performance.now();
  if(camera&&!matchMedia('(prefers-reduced-motion: reduce)').matches){this.camera=camera;this.cameraState={zoom:camera.zoom,view:camera.view?{...camera.view}:null};}
  this.word.textContent=['BAM!','WHAM!','DOON!','CRASH!'][this.count++%4];
  for(const element of [this.overlay,this.canvas]) {
   element.style.setProperty('--impact-x',`${x}%`);element.style.setProperty('--impact-y',`${y}%`);
  }
  this.draw(x,y);this.overlay.hidden=false;if(!camera)this.canvas.classList.add('impact-punch');
  this.timer=setTimeout(()=>this.clear(),640);
 }
 draw(x,y) {
  // Rasterize ink and dots once per hit; no full-screen masks or per-ray compositing.
  const art=this.art,W=innerWidth,H=innerHeight;art.width=Math.ceil(W/2);art.height=Math.ceil(H/2);
  const c=art.getContext('2d',{willReadFrequently:true});c.scale(art.width/W,art.height/H);
  const cx=W*x/100,cy=H*y/100,reach=Math.hypot(W,H);
  const tile=document.createElement('canvas');tile.width=tile.height=12;
  const ink=tile.getContext('2d');ink.fillStyle='#17120d';ink.beginPath();ink.arc(4,4,1.2,0,Math.PI*2);ink.fill();
  c.globalAlpha=.25;c.fillStyle=c.createPattern(tile,'repeat');c.fillRect(0,0,W,H);
  c.globalCompositeOperation='destination-out';c.globalAlpha=1;c.beginPath();
  c.ellipse(cx,cy,W*.2,H*.2,0,0,Math.PI*2);c.fill();
  c.globalCompositeOperation='source-over';c.globalAlpha=.8;c.fillStyle='#17120d';
  for(let i=0;i<28;i++) {
   const angle=(i*360/28+(i%3-1)*2)*Math.PI/180,gap=110+i%5*17,half=5+i%4*4;
   const dx=Math.cos(angle),dy=Math.sin(angle);
   c.beginPath();c.moveTo(cx+dx*gap,cy+dy*gap);
   c.lineTo(cx+dx*reach-dy*half,cy+dy*reach+dx*half);
   c.lineTo(cx+dx*reach+dy*half,cy+dy*reach-dx*half);c.closePath();
   c.strokeStyle='#fff9e9';c.lineWidth=1.5;c.stroke();c.fill();
  }
 }
 updateCamera(now) {
  if(!this.camera)return;
  const elapsed=(now-this.started)/460;
  if(elapsed>=1){this.restoreCamera();return;}
  const power=Math.max(0,1-elapsed);
  this.camera.zoom=this.cameraState.zoom*(1+.09*power);
  this.camera.setViewOffset(innerWidth,innerHeight,Math.sin(elapsed*35)*8*power,Math.cos(elapsed*43)*5*power,innerWidth,innerHeight);
 }
 restoreCamera() {
  if(!this.camera)return;
  this.camera.zoom=this.cameraState.zoom;
  const v=this.cameraState.view;
  if(v?.enabled)this.camera.setViewOffset(v.fullWidth,v.fullHeight,v.offsetX,v.offsetY,v.width,v.height);
  else this.camera.clearViewOffset();
  this.camera.updateProjectionMatrix();this.camera=null;this.cameraState=null;
 }
 timeScale(now) {
  const elapsed=now-this.started;
  if(elapsed<85)return .04;
  if(elapsed<190)return .04+.96*(elapsed-85)/105;
  return 1;
 }
 clear() {
  this.restoreCamera();clearTimeout(this.timer);this.timer=null;this.started=-Infinity;
  this.overlay.hidden=true;this.canvas.classList.remove('impact-punch');
  for(const element of [this.overlay,this.canvas]) {
   element.style.removeProperty('--impact-x');element.style.removeProperty('--impact-y');
  }
 }
}
