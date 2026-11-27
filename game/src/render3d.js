import * as T from 'three';
import {bake} from './geometry.js';
import {random} from './random.js';
import {ZONES,clamp} from './config.js';
import {turkey,farmer,animateTurkey,animateFarmer,turkeyTailOpen,mesh,ball,box,cyl,material} from './turkey.js';
const C={wood:0x805232,dark:0x553922,straw:0xe4b34f,leaf:0xc27631};
function contact(parent,x,z,r=1,opacity=.12){const m=new T.Mesh(new T.CircleGeometry(r,16).scale(1.8,.65,1),new T.MeshBasicMaterial({color:0x4d3621,transparent:true,opacity,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.set(x,.018,z);parent.add(m);return m;}
function ridge(parent,color,z,points){const shape=new T.Shape();shape.moveTo(points[0][0],points[0][1]);for(let i=1;i<points.length;i++)shape.lineTo(points[i][0],points[i][1]);shape.lineTo(points[points.length-1][0],-28);shape.lineTo(points[0][0],-28);shape.closePath();const m=new T.Mesh(new T.ShapeGeometry(shape),new T.MeshBasicMaterial({color,side:T.DoubleSide,fog:false}));m.position.z=z;parent.add(m);return m;}
function tree(rng){
 const g=new T.Group(),height=3+rng()*3,type=rng(),birch=type<.2,evergreen=type>=.2&&type<.46;
 cyl(g,birch?0xd9cfad:0x6b4226,0,height*.45,0,birch?.19:.16,height,undefined,7);
 const branch=(x,y,side,color=birch?0xc9bd99:0x704528,lean=.62)=>{const b=box(g,color,x,y,0,[.13,1.5,.13]);b.rotation.z=-side*lean;};
 if(evergreen){
  for(let i=0;i<3;i++){const size=1.2-i*.25,cy=height*.42+i*.93;mesh(g,new T.ConeGeometry(size,2.45,5),i%2?0x3e6b2f:0x285034,0,cy,0);if(i===0)for(const side of [-1,1])branch(side*.28,height*.47,side,0x674327,.9);}
 }else if(birch){
  for(const y of [.27,.52,.75])box(g,0x594832,0,y*height,.195,[.24,.045,.035]);
  for(const side of [-1,1])branch(side*.32,height*.66,side,0xc9bd99,.72);
  const shades=[0x7f6632,0xb98a3c,0xd9a641];
  for(let i=0;i<3;i++)mesh(g,new T.IcosahedronGeometry(1,0),shades[(i+Math.floor(rng()*3))%3],(i-1)*.58,height+i*.28,0,[1.05+rng()*.35,1.05+rng()*.32,1.05+rng()*.3]);
 }else{
  for(const side of [-1,1])branch(side*.35,height*.56,side,0x704528,.7);
  const palettes=[[0xa93226,0xd96c2c,0xf2b705],[0xb53b22,0xe17a2d,0xe9a72e],[0x9c3024,0xc95b2d,0xf0b947]];
  const colors=palettes[Math.floor(rng()*palettes.length)];
 const lobes=rng()<.4?2:3;for(let i=0;i<lobes;i++){const x=(rng()-.5)*1.6,z=(rng()-.5)*1.4;mesh(g,new T.IcosahedronGeometry(1,0),colors[i%3],x,height+i*.32,z,[1.05+rng()*.42,1.05+rng()*.4,1.02+rng()*.4]);}
 }
 const shade=mesh(g,new T.CircleGeometry(1,10),0x49341f,0,.025,0,[1.9,.02,1.25]);shade.rotation.x=-Math.PI/2;
 const leafColors=[0xd96c2c,0xa93226,0xf2b705];
 for(let i=0;i<2;i++){const leaf=mesh(g,new T.CircleGeometry(.16+rng()*.08,3),leafColors[Math.floor(rng()*leafColors.length)],(rng()-.5)*2,.035,(rng()-.5)*1.4);leaf.rotation.x=-Math.PI/2;leaf.rotation.z=rng()*6;}
 return g;
}
function pumpkin(p,x,y,z,s=1,color=0xd96c2c){const g=new T.Group();p.add(g);g.position.set(x,y,z);g.scale.setScalar(s);mesh(g,new T.SphereGeometry(.46,7,5),color,0,.34,0,[1,.85,1]);const stem=cyl(g,0x596341,0,.65,0,.06,.22);stem.rotation.z=.2;return g;}
function fence(){const g=new T.Group();for(const x of [-1,1]){box(g,C.wood,x,.65,0,[.17,1.3,.22]);mesh(g,new T.ConeGeometry(.16,.18,4),0xaa7644,x,1.38,0);}for(const y of [.45,.95])box(g,0xad7945,0,y,0,[2.3,.18,.15]);return g;}
function hay(){const g=new T.Group();box(g,C.straw,0,.68,0,[1.85,1.36,1.45]);for(const x of [-.53,.53])box(g,0xa88037,x,.69,.01,[.075,1.4,1.48]);for(let j=0;j<7;j++)box(g,0xf2c86a,-.79+j*.26,.45+(j%3)*.25,.74,[.15,.026,.015]);return g;}
function cart(){const g=new T.Group();box(g,0x845532,0,.73,0,[2.05,.26,2]);for(const x of [-1,1]){for(let j=0;j<3;j++)box(g,j%2?0xb2804d:0xa3703f,x,1+j*.24,0,[.12,.18,2]);for(const z of [-.65,.65]){const w=cyl(g,0x4f3927,x*1.13,.44,z,.43,.15,.43,12);w.rotation.z=Math.PI/2;const hub=cyl(g,0xc9a25f,x*1.23,.44,z,.13,.17);hub.rotation.z=Math.PI/2;}}const bale=hay();bale.scale.setScalar(.65);bale.position.y=.85;g.add(bale);return g;}
function oven(){const g=new T.Group();box(g,0x57594c,0,1,0,[2.05,2,1.65]);box(g,0xd5c9a5,0,1.94,0,[2.14,.14,1.73]);box(g,0x302c25,0,.88,.845,[1.66,1.25,.07]);box(g,0xef6c24,0,.85,.89,[1.35,.87,.025]);box(g,0xffc75a,0,.7,.91,[1.08,.48,.02]);for(let i=0;i<4;i++){ball(g,0xff9b32,(i-1.5)*.25,.96,.93,[.12,.24,.02]);cyl(g,0x33352d,(i-1.5)*.45,2.035,0,.17,.05);}box(g,0x2d342e,0,1.45,.99,[1.45,.1,.13]);for(let i=0;i<3;i++)box(g,0xedd8a4,(i-1)*.45,1.77,.85,[.12,.12,.05]);return g;}
function knife(){const g=new T.Group();box(g,0x65422e,-.65,0,0,[.7,.17,.19]);box(g,0xd6e2d7,.2,0,0,[1.1,.09,.35]);const tip=mesh(g,new T.ConeGeometry(.2,.4,3),0xf5eed7,.9,0,0);tip.rotation.z=-Math.PI/2;box(g,0xe5bc70,-.3,0,0,[.09,.23,.27]);return g;}
// Separate baked parts share four instanced draws for every visible trap.
function scissors(){
 const ground=new T.Group(),arm=new T.Group(),pivot=new T.Group();
 mesh(ground,new T.SphereGeometry(1,10,4),0x805232,0,-.03,0,[1.08,.23,.72]);
 const slit=mesh(ground,new T.CircleGeometry(1,10),0x38291e,0,.18,0,[.8,.32,1]);slit.rotation.x=-Math.PI/2;
 for(const side of [-1,1]){const crack=box(ground,0x38291e,side*.67,.17,side*.16,[.65,.025,.08]);crack.rotation.y=side*.45;}
 const blade=new T.Shape();blade.moveTo(-.13,-.08);blade.lineTo(.14,-.08);blade.lineTo(.12,.78);blade.lineTo(0,1.17);blade.lineTo(-.13,.74);blade.closePath();
 mesh(arm,new T.ExtrudeGeometry(blade,{depth:.075,bevelEnabled:false}),0xc6d9de,0,0,-.04);
 box(arm,0xf5f4df,-.075,.38,.045,[.035,.82,.018]);
 box(arm,0xe45425,0,-.25,0,[.18,.4,.14]);
 mesh(arm,new T.TorusGeometry(.27,.095,5,12),0xe45425,0,-.56,0,[1,1.15,1]);
 const pin=cyl(pivot,0xffc75a,0,0,.12,.13,.18,undefined,10);pin.rotation.x=Math.PI/2;
 for(const part of [ground,arm,pivot])bake(part);
 return {ground,arm,pivot};
}
function collectible(type){const g=new T.Group();if(type==='corn'){const cob=ball(g,0xf2bf36,0,0,0,[.21,.44,.2]);cob.rotation.z=-.3;const l=ball(g,0x6d853c,-.14,-.23,.03,[.13,.34,.1]);l.rotation.z=.6;}else if(type==='feather'){const f=ball(g,0xfbc24f,0,0,0,[.19,.61,.08]);f.rotation.z=-.45;box(g,0xffe8a4,0,0,.07,[.025,1,.025]).rotation.z=-.45;}else{ball(g,0xc94c37,-.15,.12,0,[.22,.23,.12]);ball(g,0xc94c37,.15,.12,0,[.22,.23,.12]);mesh(g,new T.ConeGeometry(.31,.46,4),0xc94c37,0,-.12,0).rotation.z=Math.PI;}return g;}
function barn(){const g=new T.Group();box(g,0xa93226,0,2,0,[6,4,8]);const roofGeo=new T.BufferGeometry();roofGeo.setAttribute('position',new T.Float32BufferAttribute([-3.5,4,-4.5,3.5,4,-4.5,0,6.5,-4.5,-3.5,4,4.5,3.5,4,4.5,0,6.5,4.5],3));roofGeo.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,2,5,4,2,4,1,0,1,4,0,4,3]);roofGeo.computeVertexNormals();mesh(g,roofGeo,0x63472f);box(g,0x603c28,0,1.35,4.03,[2.8,2.7,.1]);for(const x of [-1.45,1.45])box(g,0xffedcf,x,1.5,4.13,[.14,3,.1]);box(g,0xffedcf,0,3,4.13,[3,.14,.1]);for(let x=-2.7;x<3;x+=.5)box(g,0xc15b36,x,2,4.07,[.04,3.8,.03]);for(const s of [-1,1]){const b=box(g,0xffedcf,s*.69,1.5,4.16,[.11,3.2,.08]);b.rotation.z=s*.42;}return g;}
export class Renderer3D{
 constructor(canvas,{deterministic=false}={}){const probe=document.createElement('canvas');const gl=probe.getContext('webgl2')||probe.getContext('webgl');if(!gl)throw new Error('WebGL unavailable');const ext=gl.getExtension('WEBGL_debug_renderer_info');this.device=ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);this.software=/swiftshader|llvmpipe|software/i.test(this.device);this.deterministic=deterministic;this.pixelRatio=this.software?(deterministic?1:.35):Math.min(devicePixelRatio,1.75);gl.getExtension('WEBGL_lose_context')?.loseContext();
  this.renderer=new T.WebGLRenderer({canvas,antialias:!this.software,powerPreference:'high-performance'});this.renderer.setPixelRatio(this.pixelRatio);this.renderer.outputColorSpace=T.SRGBColorSpace;this.renderer.toneMapping=T.NoToneMapping;this.renderer.toneMappingExposure=1;this.renderer.shadowMap.enabled=!this.software;this.renderer.shadowMap.type=T.PCFSoftShadowMap;
  this.scene=new T.Scene();this.scene.background=new T.Color(0xf3ad79);this.scene.fog=new T.Fog(0xf3ad79,48,100);this.camera=new T.PerspectiveCamera(43,1,.1,110);this.scene.add(new T.HemisphereLight(0xffd6a6,0x49301d,1.35));const sun=new T.DirectionalLight(0xffb45d,1.9);sun.position.set(-18,14,-12);sun.castShadow=!this.software;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-20,right:20,top:20,bottom:-20,near:1,far:70});sun.shadow.bias=-.002;this.scene.add(sun);const rim=new T.DirectionalLight(0xffcb72,1.15);rim.position.set(8,6,-16);this.scene.add(rim);
  // A single procedural gradient dome follows the camera; no texture or network asset.
  const skyGeo=new T.SphereGeometry(105,8,6);const skyMat=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{},vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 v;void main(){float h=smoothstep(0.,14.,v.y);gl_FragColor=vec4(mix(vec3(.95,.58,.32),vec3(.37,.65,.78),h),1.);}'});this.sky=new T.Mesh(skyGeo,skyMat);this.sky.frustumCulled=false;this.scene.add(this.sky);
  this.horizon=new T.Group();this.sky.add(this.horizon);
  const halo=new T.Mesh(new T.CircleGeometry(5.5,16),new T.MeshBasicMaterial({color:0xff963d,transparent:true,opacity:.18,depthWrite:false,fog:false}));halo.position.set(3,10,-101);this.horizon.add(halo);
  const sunDisk=new T.Mesh(new T.CircleGeometry(4,16),new T.MeshBasicMaterial({color:0xf3b94f,fog:false}));sunDisk.position.set(3,10,-100);this.horizon.add(sunDisk);
  const sunCore=new T.Mesh(new T.CircleGeometry(3.2,16),new T.MeshBasicMaterial({color:0xffd16a,fog:false}));sunCore.position.set(3,10,-99.8);this.horizon.add(sunCore);
  ridge(this.horizon,0x9c6242,-98,[[-80,-4],[-64,1],[-48,-1],[-31,5],[-18,1],[0,7],[17,2],[33,6],[49,0],[66,4],[80,-3]]);
  ridge(this.horizon,0x76472e,-94,[[-80,-7],[-60,-2],[-43,-5],[-23,1],[-7,-3],[13,3],[29,-2],[49,2],[67,-4],[80,-6]]);
  this.ground=box(this.scene,0xa7a05a,0,-.18,-44,[240,.3,240]);this.road=box(this.scene,0xc29560,0,-.005,-48,[10,.06,180]);this.road.receiveShadow=true;for(const x of [-5.12,5.12])box(this.scene,0x6b4226,x,.025,-48,[.32,.04,180]);
  this.stripes=[];this.stripeDummy=new T.Object3D();for(let lane=0;lane<2;lane++){const m=new T.InstancedMesh(new T.BoxGeometry(1,1,1),material(0xf0ce8d),32);m.instanceMatrix.setUsage(T.DynamicDrawUsage);this.scene.add(m);this.stripes.push(m);}
  this.environment=new T.Group();this.scene.add(this.environment);this.farmSet=new T.Group();this.environment.add(this.farmSet);const rng=random(974);this.scenery=[];for(let i=0;i<52;i++){const side=i%2?1:-1;const g=tree(rng);g.position.set(side*(8+rng()*15),0,13-i*4+(rng()-.5)*3.4);g.rotation.y=(rng()-.5)*.8;g.scale.setScalar(.72+rng()*.7);this.farmSet.add(g);this.scenery.push(g);}
  this.fences=[];for(let i=0;i<70;i++){const f=fence();f.rotation.y=Math.PI/2;f.position.set(i%2?6:-6,0,12-Math.floor(i/2)*6);this.farmSet.add(f);this.fences.push(f);}
  for(let i=0;i<12;i++){const hill=mesh(this.scene,new T.SphereGeometry(1,14,8),[0x824f2a,0xa5632c,0x3e6b2f][i%3],(i-6)*27,-1,-100-rng()*40,[22+rng()*15,10+rng()*10,15]);}
  const pumpkinColors=[0xd96c2c,0xe18432,0xa93226,0xe7a432];for(let i=0;i<21;i++){const p=pumpkin(this.farmSet,(i%2?1:-1)*(6.8+rng()*3),0,8-i*10+(rng()-.5)*2,.65+rng()*.7,pumpkinColors[Math.floor(rng()*pumpkinColors.length)]);this.scenery.push(p);}
  this.barns=[];for(const [x,z,s] of [[-17,-25,1],[22,-65,.85]]){const b=barn();b.position.set(x,0,z);b.rotation.y=x<0?.28:-.4;b.scale.setScalar(s);this.farmSet.add(b);this.barns.push(b);}
  // Batched low-poly dressing: repeat the entire seeded tile, never respawn randomly.
  const groundLeafColors=[0xd96c2c,0xa93226,0xf2b705,0xe58b32];for(let i=0;i<650;i++){const side=i%2?1:-1,x=side*(5.5+rng()*16),z=14-rng()*210;const leaf=mesh(this.farmSet,new T.CircleGeometry(.12+rng()*.16,3),groundLeafColors[Math.floor(rng()*groundLeafColors.length)],x,.06,z);leaf.rotation.x=-Math.PI/2;leaf.rotation.z=rng()*6;if(i%8===0){const tuft=mesh(this.farmSet,new T.ConeGeometry(.15+rng()*.08,.55+rng()*.35,3),rng()<.5?0x3e6b2f:0x58733a,x,.3,z);tuft.scale.y=.75+rng()*.8;}}
  for(let i=0;i<20;i++){const side=i%2?1:-1,z=10-i*10.5;const stalk=new T.Group();cyl(stalk,0x8b8a2a,0,.9,0,.035,1.8,undefined,4);for(const d of [-1,1]){const l=box(stalk,0x3e6b2f,d*.22,.9,0,[.55,.09,.22]);l.rotation.z=d*.5;}ball(stalk,0xf2b705,.1,1.2,.1,[.12,.28,.1]);stalk.position.set(side*6.9,0,z);this.farmSet.add(stalk);if(i%4===0){const bale=hay();bale.position.set(side*9,0,z);this.farmSet.add(bale);}}
  const silo=new T.Group();cyl(silo,0xd96c2c,0,3,0,1.6,6,undefined,12);mesh(silo,new T.ConeGeometry(1.8,1.4,12),0x4d5d55,0,6.6,0);for(const y of [1,3,5])cyl(silo,0xffedcf,0,y,0,1.63,.1,undefined,12);silo.position.set(-22,0,-28);this.farmSet.add(silo);
  this.kitchen=new T.Group();this.scene.add(this.kitchen);for(const s of [-1,1]){box(this.kitchen,0x6b4226,s*8,2,-51,[4,4,126]);box(this.kitchen,0xe6d6b5,s*8,4.1,-51,[4.2,.18,126]);for(let i=0;i<18;i++){const o=oven();o.position.set(s*7.2,4.2,10-i*7);o.scale.setScalar(.8);this.kitchen.add(o);box(this.kitchen,0x6d6a55,s*10,7,10-i*7,[.2,6,.2]);}box(this.kitchen,0x3e6b2f,s*12,7,-51,[.3,14,126]);for(let j=0;j<21;j++){const z=9-j*6;box(this.kitchen,j%2?0x46583b:0x536344,s*11.81,7,z,[.08,12.3,5.45]);box(this.kitchen,0x68482d,s*11.73,7,z,[.12,13.6,.14]);}for(const y of [.8,3.4,6.9,10.4,13.1])box(this.kitchen,0x8e6339,s*11.73,y,-51,[.12,.16,126]);}for(let i=0;i<14;i++)for(let j=-1;j<=1;j++)box(this.kitchen,0x847d69,j*3.3,.034,10-i*6,[.025,.01,5.95]);for(let row=0;row<42;row++)for(let col=0;col<6;col++)box(this.kitchen,(row+col)%2?0x343b35:0xdab77d,-4.17+col*1.67,.045,12-row*3,[1.66,.025,2.99]);for(let i=0;i<18;i++){const x=i%2?5.6:-5.6,z=6-i*7;cyl(this.kitchen,0x2e3735,x,5.2,z,.48,.16,undefined,8);box(this.kitchen,0x2e3735,x,5.8,z,[.09,1.2,.09]);}this.kitchen.visible=false;bake(this.kitchen,[],true);this.kitchenTile=this.kitchen.clone(true);this.scene.add(this.kitchenTile);bake(this.farmSet,[],true);this.farmTile=this.farmSet.clone(true);this.farmTile.position.z=-210;this.environment.add(this.farmTile);
  this.barnInterior=new T.Group();for(let i=0;i<12;i++){const z=12-i*10;for(const side of [-1,1]){box(this.barnInterior,0x715135,side*6,3.6,z,[.48,7.2,.5]);box(this.barnInterior,0x9d7141,side*7.4,.8,z,[2,.3,8]);box(this.barnInterior,0xa57848,side*7.4,2.1,z,[2,.3,8]);const bale=hay();bale.position.set(side*7.4,2.25,z);this.barnInterior.add(bale);const brace=box(this.barnInterior,0xa17a4b,side*3.2,7.8,z,[7.2,.25,.3]);brace.rotation.z=side*-.24;}box(this.barnInterior,0x5b412c,0,6.8,z,[12.5,.27,.35]);box(this.barnInterior,0x38291e,0,5.9,z,[.05,1.6,.05]);box(this.barnInterior,0xffb529,0,5,z,[.45,.65,.45]);for(const x of [-.25,.25])box(this.barnInterior,0x38291e,x,5,z,[.045,.75,.5]);}bake(this.barnInterior,[],true);this.barnInterior.visible=false;this.scene.add(this.barnInterior);this.barnTile=this.barnInterior.clone(true);this.scene.add(this.barnTile);
  const gate=new T.Group();for(const x of [-5.3,5.3])cyl(gate,0x615538,x,4,0,.4,8);box(gate,0x7c6538,0,7.5,0,[11.8,1,.5]);this.gate=gate;this.scene.add(gate);
  this.forest=new T.Group();const forestRng=random(31);for(let i=0;i<35;i++){const tr=tree(forestRng);tr.position.set((forestRng()-.5)*34,0,-5-forestRng()*45);tr.scale.setScalar(1.1+forestRng());this.forest.add(tr);}bake(this.forest,[],true);this.forest.visible=false;this.scene.add(this.forest);
  this.bird=turkey();this.scene.add(this.bird);this.chaser=farmer();this.scene.add(this.chaser);this.birdShadow=contact(this.scene,0,2,1);this.farmerShadow=contact(this.scene,-2,6,1.1);
  this.items=new Map();this.entityBatches=new Map();this.entityDummy=new T.Object3D();this.lastWorld=null;this.lastZone=-1;this.resize();window.addEventListener('resize',()=>this.resize());
 }
 resize(){this.renderer.setSize(innerWidth,innerHeight,false);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();}
 makeEntity(e){let g;if(e.type==='fence')g=fence();else if(e.type==='hay')g=hay();else if(e.type==='cart')g=cart();else if(e.type==='oven')g=oven();else if(e.type==='knife')g=knife();else if(e.type==='mud'){g=new T.Group();const m=mesh(g,new T.CircleGeometry(1,14),0x6b5133,0,.045,0,[1.2,1.7,1]);m.rotation.x=-Math.PI/2;const n=mesh(g,new T.CircleGeometry(.6,12),0x8a6b44,.1,.05,.2,[1,1.8,1]);n.rotation.x=-Math.PI/2;}else g=collectible(e.type);bake(g);this.scene.add(g);return g;}
 render(w,t){const title=w.mode==='title',end=w.mode==='end',staged=title||end;
  if(w!==this.lastWorld||w.distance<this.lastDistance){for(const g of this.items.values())this.scene.remove(g);this.items.clear();this.lastWorld=w;}this.lastDistance=w.distance;
  const zone=staged?0:w.zone;if(this.lastZone!==zone){this.scene.background.setHex(ZONES[zone].sky);this.scene.fog.color.setHex(ZONES[zone].sky);this.ground.material=material(ZONES[zone].ground);this.road.material=material(ZONES[zone].road);this.farmSet.visible=zone!==2;this.kitchen.visible=zone===2;this.lastZone=zone;}
  this.barnInterior.visible=!staged&&w.zone===1;this.barnInterior.position.z=staged?0:w.distance%120;this.barnTile.visible=this.barnInterior.visible;this.barnTile.position.z=this.barnInterior.position.z-120;
  this.environment.position.z=staged?0:(w.distance%210);this.farmTile.visible=this.farmSet.visible;this.farmTile.position.z=-210;this.kitchen.position.z=staged?0:(w.distance%126);this.kitchenTile.visible=this.kitchen.visible;this.kitchenTile.position.z=this.kitchen.position.z-126;this.gate.visible=!staged&&w.distance>1370;this.gate.position.set(0,0,2-(1500-w.distance));
  this.forest.visible=end&&w.won;if(end&&w.won){this.farmSet.visible=false;this.farmTile.visible=false;this.road.visible=false;this.ground.material=material(0x829054);}else{this.road.visible=true;this.ground.material=material(ZONES[zone].ground);this.farmSet.visible=zone!==2;this.farmTile.visible=this.farmSet.visible;}
  this.stripes.forEach((m,lane)=>{m.visible=!staged;if(!staged){for(let i=0;i<32;i++){this.stripeDummy.position.set(lane===0?-1.4:1.4,.035,14-i*5+w.distance%5);this.stripeDummy.scale.set(.075,.015,1.5);this.stripeDummy.updateMatrix();m.setMatrixAt(i,this.stripeDummy.matrix);}m.instanceMatrix.needsUpdate=true;}});
  if(staged){const aspect=innerWidth/innerHeight;this.camera.position.set(9,5.6,16);this.camera.lookAt(-.9,1.85,-1);this.bird.visible=true;this.bird.position.set(3.3,end?2.4:0,0);this.bird.scale.setScalar(title?1.8:1.1);this.bird.rotation.set(0,title?-.5+t*.19:-.25,end?.25:0);this.chaser.visible=end&&!w.won;this.chaser.position.set(3.1,0,-.3);this.chaser.scale.setScalar(1.65);this.chaser.rotation.y=-.25;animateTurkey(this.bird,t,false,1,this.deterministic);animateFarmer(this.chaser,t,true);this.birdShadow.position.set(3.3,.04,0);this.birdShadow.scale.setScalar(1.6);this.farmerShadow.visible=false;if(end&&w.won){this.bird.position.set(3.3,0,0);this.bird.rotation.y=-.6;this.bird.scale.setScalar(1.8);}if(aspect<1)this.camera.position.x=12;
  }else{this.camera.position.set(0,6.4,15.5);this.camera.lookAt(0,1.6,-15);this.bird.position.set(w.x,w.y,2);this.bird.rotation.set(0,Math.PI,-clamp((w.targetX-w.x)*.05,-.2,.2));this.bird.scale.setScalar(1.22);this.bird.visible=!(w.invulnerable>0&&Math.floor(t*12)%2===0);animateTurkey(this.bird,t,true,turkeyTailOpen(w),this.deterministic);this.chaser.visible=true;const fz=3.5+w.farmer*.24,fx=w.x+clamp((w.targetX-w.x)*.15,-.35,.35);this.chaser.position.set(fx,0,fz);this.chaser.scale.setScalar(1);this.chaser.rotation.y=Math.PI;animateFarmer(this.chaser,t);this.birdShadow.position.set(w.x,.04,2);this.birdShadow.scale.setScalar(1-w.y*.13);this.farmerShadow.visible=true;this.farmerShadow.position.set(this.chaser.position.x,.04,fz);}
  const near=w.entities.filter(e=>!staged&&!e.done&&e.at>w.distance-10&&e.at<w.distance+105);const counts=new Map();
  for(const e of near){
   if(e.type==='scissors'){
    if(!this.entityBatches.has('scissors-ground')){
     const parts=scissors();
     for(const [name,part] of [['ground',parts.ground],['left',parts.arm],['right',parts.arm],['pivot',parts.pivot]]){
      const source=part.children.find(o=>o.isMesh),batch=new T.InstancedMesh(source.geometry,source.material,96);
      batch.instanceMatrix.setUsage(T.DynamicDrawUsage);batch.frustumCulled=false;this.scene.add(batch);this.entityBatches.set('scissors-'+name,batch);
     }
    }
    // Mound is visible from the horizon. Rise completes 18 m before contact,
    // leaving at least 0.8 s even at kitchen dash speed (22.4 m/s).
    const gap=e.at-w.distance,rise=clamp((36-gap)/18,0,1),lift=rise*rise*(3-2*rise);
    const opening=.08+.49*(.5+.5*Math.sin(w.time*6+e.phase));
    for(const name of ['ground','left','right','pivot']){
     if(name!=='ground'&&rise===0)continue;
     const d=this.entityDummy,key='scissors-'+name;
     d.position.set(e.x,name==='ground'?0:-2.1+2.82*lift,2-gap);
     d.rotation.set(0,0,name==='left'?opening:name==='right'?-opening:0);d.scale.setScalar(1);
     if(name==='right')d.position.z+=.09;
     d.updateMatrix();const count=counts.get(key)||0;this.entityBatches.get(key).setMatrixAt(count,d.matrix);counts.set(key,count+1);
    }
    continue;
   }
   let batch=this.entityBatches.get(e.type);if(!batch){const template=this.makeEntity(e);let source;template.traverse(o=>{if(o.isMesh)source=o;});this.scene.remove(template);batch=new T.InstancedMesh(source.geometry,source.material,96);batch.instanceMatrix.setUsage(T.DynamicDrawUsage);batch.frustumCulled=false;this.scene.add(batch);this.entityBatches.set(e.type,batch);}
   const d=this.entityDummy;d.position.set(e.type==='knife'?e.x+Math.sin(w.time*2.6+e.phase)*2.2:e.x,0,2-(e.at-w.distance));d.rotation.set(0,0,0);d.scale.setScalar(1);if(['corn','heart','feather'].includes(e.type)){d.position.y=1.1+Math.sin(t*3+e.id)*.12;d.rotation.y=t*.9+e.id;}if(e.type==='knife'){d.position.y=1.2+Math.sin(t*3)*.15;d.rotation.y=t*2;d.rotation.z=Math.sin(t*3)*.2;}d.updateMatrix();const count=counts.get(e.type)||0;batch.setMatrixAt(count,d.matrix);counts.set(e.type,count+1);
  }
  for(const [type,batch] of this.entityBatches){batch.count=counts.get(type)||0;batch.visible=batch.count>0;batch.instanceMatrix.needsUpdate=true;}
  this.sky.visible=zone===0;this.sky.position.copy(this.camera.position);
  const renderStart=performance.now();this.renderer.render(this.scene,this.camera);const renderMs=performance.now()-renderStart;if(this.software&&!this.deterministic&&renderMs>40&&this.pixelRatio>.25){this.pixelRatio=Math.max(.25,this.pixelRatio-.05);this.renderer.setPixelRatio(this.pixelRatio);this.renderer.setSize(innerWidth,innerHeight,false);}window.__renderStats={calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,renderMs,pixelRatio:this.pixelRatio};
 }
}
