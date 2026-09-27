import * as THREE from 'three';
import {GLTFLoader} from './vendor/GLTFLoader.js';
import {Race,RACE_LENGTH,curve,clamp} from './race.js';
const $=id=>document.getElementById(id),race=new Race(),keys=new Set(),touchKeys=new Set();
let loaded=false,muted=false,cameraMode=0,pointerAim=null,lastState='ready',toastTimer=0,hitTimer=0;
const game=$('game'),audio=$('music');audio.volume=.6;game.classList.add('ready');
const renderer=new THREE.WebGLRenderer({canvas:$('world'),antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0x96d4e1);renderer.toneMapping=THREE.NoToneMapping;
const scene=new THREE.Scene();scene.fog=new THREE.Fog(0xadd9df,150,520);
const camera=new THREE.PerspectiveCamera(55,innerWidth/innerHeight,.1,900);
scene.add(new THREE.HemisphereLight(0xffffff,0xc89768,2.0));const sun=new THREE.DirectionalLight(0xfff0d4,2.3);sun.position.set(-35,65,35);scene.add(sun);
const ramp=new THREE.DataTexture(new Uint8Array([100,178,255]),3,1,THREE.RedFormat);ramp.needsUpdate=true;ramp.minFilter=THREE.NearestFilter;ramp.magFilter=THREE.NearestFilter;
const toon=(color)=>new THREE.MeshToonMaterial({color,gradientMap:ramp});
const ink=toon(0x364653),cream=toon(0xffe3a2),orange=toon(0xf57540),gold=new THREE.MeshBasicMaterial({color:0xffd86a});
function prep(root){root.traverse(o=>{if(o.isMesh){o.material=new THREE.MeshToonMaterial({color:0xffffff,vertexColors:true,gradientMap:ramp});o.frustumCulled=true;}});return root;}
const loader=new GLTFLoader();let rig,artist,escort,horse,flameMesh,wheels=[],hills=[],rockTemplate,entityObjects=new Map(),hillObjects=[],horseObjects=[];
const roadGeo=new THREE.BufferGeometry(),roadN=150,roadPos=new Float32Array((roadN+1)*6),roadIndices=[];
for(let i=0;i<roadN;i++){const j=i*2;roadIndices.push(j,j+1,j+2,j+1,j+3,j+2);}roadGeo.setAttribute('position',new THREE.BufferAttribute(roadPos,3));roadGeo.setIndex(roadIndices);roadGeo.computeVertexNormals();
const road=new THREE.Mesh(roadGeo,ink);road.frustumCulled=false;scene.add(road);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(2800,2800),toon(0xc48655));ground.rotation.x=-Math.PI/2;ground.position.y=-.055;scene.add(ground);
const dummy=new THREE.Object3D();
const stripe=new THREE.InstancedMesh(new THREE.BoxGeometry(.15,.018,3.2),cream,90);stripe.frustumCulled=false;scene.add(stripe);
const edgeMarkers=new THREE.InstancedMesh(new THREE.BoxGeometry(.25,.025,4),orange,200);edgeMarkers.frustumCulled=false;scene.add(edgeMarkers);
const posts=new THREE.InstancedMesh(new THREE.BoxGeometry(.22,1,.22),cream,100);posts.frustumCulled=false;scene.add(posts);
const sunDisc=new THREE.Mesh(new THREE.SphereGeometry(22,20,16),new THREE.MeshBasicMaterial({color:0xffe6a0}));sunDisc.position.set(-145,130,-460);scene.add(sunDisc);
const flare=new THREE.Group();scene.add(flare);const fireParts=[];
for(let i=0;i<20;i++){const p=new THREE.Mesh(new THREE.IcosahedronGeometry(1,0),new THREE.MeshBasicMaterial({color:i%3?0xff8b27:0xffe271}));flare.add(p);fireParts.push(p);}flare.visible=false;
const flameLight=new THREE.PointLight(0xff8b38,0,18);scene.add(flameLight);
const particles=[];const particleGeo=new THREE.IcosahedronGeometry(.13,0),particleMat=new THREE.MeshBasicMaterial({color:0xffd779});
for(let i=0;i<80;i++){const p=new THREE.Mesh(particleGeo,particleMat);p.visible=false;scene.add(p);particles.push({mesh:p,life:0,v:new THREE.Vector3()});}
let particleCursor=0;
function burst(x,z,n=22){for(let i=0;i<n;i++){const p=particles[(particleCursor++)%particles.length];p.life=.55+Math.random()*.5;p.mesh.position.set(x,1.6,z);p.v.set((Math.random()-.5)*15,Math.random()*10,(Math.random()-.5)*15);p.mesh.visible=true;}}
const shadowCanvas=document.createElement('canvas');shadowCanvas.width=shadowCanvas.height=128;const sc=shadowCanvas.getContext('2d'),sg=sc.createRadialGradient(64,64,3,64,64,62);sg.addColorStop(0,'rgba(31,25,27,.38)');sg.addColorStop(1,'rgba(31,25,27,0)');sc.fillStyle=sg;sc.fillRect(0,0,128,128);const shadow=new THREE.Mesh(new THREE.PlaneGeometry(7,10),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(shadowCanvas),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.y=.035;scene.add(shadow);
function instance(mesh,x,y,z,scale=1,rot=0,index=0){dummy.position.set(x,y,z);dummy.rotation.set(0,rot,0);dummy.scale.setScalar(scale);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);}
function worldX(station,offset=0){return curve(station)-curve(race.distance)+offset;}
function updateRoad(){
 for(let i=0;i<=roadN;i++){const ahead=-40+i*4,s=race.distance+ahead,x=worldX(s),k=i*6;roadPos.set([x-9,.015,-ahead,x+9,.015,-ahead],k);}roadGeo.attributes.position.needsUpdate=true;roadGeo.computeVertexNormals();
 const base=Math.floor(race.distance/8)*8;
 for(let i=0;i<90;i++){const station=base+(i-5)*8;instance(stripe,worldX(station),.04,-(station-race.distance),1,-Math.atan((curve(station+2)-curve(station))/2),i);}
 for(let i=0;i<100;i++){const s=base+(i-5)*8;for(let side=0;side<2;side++)instance(edgeMarkers,worldX(s,side?9:-9),.04,-(s-race.distance),1,0,i*2+side);}
 for(let i=0;i<50;i++){const s=Math.floor(race.distance/15)*15+(i-3)*15;for(let side=0;side<2;side++)instance(posts,worldX(s,side?10:-10),.5,-(s-race.distance),1,0,i*2+side);}
 stripe.instanceMatrix.needsUpdate=true;edgeMarkers.instanceMatrix.needsUpdate=true;posts.instanceMatrix.needsUpdate=true;
}
function makeCell(){const root=new THREE.Group();const ring=new THREE.Mesh(new THREE.TorusGeometry(1,.12,6,18),gold);root.add(ring);const core=new THREE.Mesh(new THREE.OctahedronGeometry(.62),gold);root.add(core);return root;}
function makeBarrier(){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(3.2,1.7,.8),orange);body.position.y=.9;g.add(body);for(let i=-1;i<=1;i++){const b=new THREE.Mesh(new THREE.BoxGeometry(.3,1.6,.85),cream);b.position.set(i*.85,.9,0);b.rotation.z=-.4;g.add(b);}return g;}
function createEntities(){if(entityObjects.size===race.entities.length){for(const o of entityObjects.values())o.visible=false;return;}for(const o of entityObjects.values()){scene.remove(o);o.traverse(n=>{if(n.isMesh&&n.userData.disposable)n.geometry.dispose();});}entityObjects.clear();for(const e of race.entities){let o;if(e.kind==='truck'){o=escort.clone(true);o.scale.setScalar(.85);}else if(e.kind==='rock'){o=rockTemplate.clone(true);o.scale.set(2.1,1.6,1.5);}else if(e.kind==='cell')o=makeCell();else o=makeBarrier();o.visible=false;scene.add(o);entityObjects.set(e.id,o);}}
async function load(){try{
 const files=['war-rig','escort','danxia','horse'];let done=0;
 const assets=await Promise.all(files.map(async name=>{const g=await loader.loadAsync('./assets/'+name+'.glb');$('loading').textContent=`Preparing your ride · ${++done}/4`;return prep(g.scene);}));
 [rig,escort,,horse]=assets;rig.scale.setScalar(.88);scene.add(rig);artist=rig.getObjectByName('Guitarist');flameMesh=rig.getObjectByName('OriginalGuitarFlame');if(flameMesh)flameMesh.visible=false;rig.traverse(o=>{if(o.name.startsWith('Wheel'))wheels.push(o);});
 assets[2].children.forEach(o=>{if(o.name.startsWith('Hill'))hills.push(o);if(o.name==='Rock')rockTemplate=o;});
 if(!artist||!hills.length||!rockTemplate)throw new Error('The exported canyon assets are incomplete.');
 for(let i=0;i<44;i++){const mesh=hills[i%hills.length].clone(true);mesh.scale.setScalar(.65+(i%5)*.17);scene.add(mesh);hillObjects.push({mesh,s:i*28,side:i%2?1:-1,offset:29+(i%4)*19});}
 for(let i=0;i<6;i++){const o=horse.clone(true);o.scale.setScalar(1.15);scene.add(o);horseObjects.push(o);}
 createEntities();loaded=true;$('start').disabled=false;$('start-label').textContent='START YOUR RIDE';$('loading').textContent='6.2 km · Keyboard + touch · Headphones on';
 }catch(err){console.error(err);showError(err.message);}}
function showError(message){$('error').hidden=false;$('error-message').textContent=message+' Reload to try again.';}
function clearInputs(){keys.clear();touchKeys.clear();document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));pointerAim=null;}
function musicPlay(){if(muted)return;audio.play().then(()=>{$('equalizer').classList.add('active');$('music-status').textContent='Playing · M to mute';}).catch(()=>{$('music-status').textContent='Tap ♫ to play music';});}
function start(){if(!loaded)return;race.reset();createEntities();clearInputs();lastState='running';game.classList.remove('ready');game.classList.add('racing');$('menu').hidden=true;$('result').hidden=true;$('paused').hidden=true;$('gauges').hidden=false;$('aim').hidden=false;$('touch').hidden=!matchMedia('(pointer:coarse)').matches;$('pause').disabled=false;audio.currentTime=0;musicPlay();toast('RIDE THE RED CANYON',2.3);}
function togglePause(){if(race.state==='running'){race.state='paused';$('paused').hidden=false;audio.pause();$('equalizer').classList.remove('active');$('pause').textContent='▶';$('pause').setAttribute('aria-label','Resume race');clearInputs();}else if(race.state==='paused'){race.state='running';$('paused').hidden=true;$('pause').textContent='Ⅱ';$('pause').setAttribute('aria-label','Pause race');musicPlay();}}
function toggleMusic(){muted=!muted;audio.muted=muted;$('sound').textContent=muted?'♪̸':'♫';$('sound').setAttribute('aria-pressed',String(!muted));$('sound').setAttribute('aria-label',muted?'Unmute music':'Mute music');$('music-status').textContent=muted?'Muted · M to unmute':'Playing · M to mute';if(!muted&&race.state==='running')musicPlay();$('equalizer').classList.toggle('active',!muted&&!audio.paused);}
function finish(){const won=race.state==='finished';$('result').hidden=false;$('aim').hidden=true;$('touch').hidden=true;$('pause').disabled=true;$('result-kicker').textContent=won?'RIDE COMPLETE':'RIG DOWN';$('result-title').innerHTML=won?'CANYON<br>CONQUERED.':'ONE MORE<br>RIDE?';$('result-copy').textContent=won?'The red mountains are behind you. The music goes on.':`You made it ${(race.distance/1000).toFixed(1)} km. Dodge obstacles or burn them before they hit.`;$('final-time').textContent=formatTime(race.time);$('final-score').textContent=race.score.toLocaleString();clearInputs();}
function formatTime(t){return `${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;}
function toast(text,seconds=1.5){$('toast').textContent=text;$('toast').classList.add('visible');toastTimer=seconds;}
$('start').addEventListener('click',start);$('restart').addEventListener('click',start);$('reset').addEventListener('click',start);$('pause').addEventListener('click',togglePause);$('resume').addEventListener('click',togglePause);$('sound').addEventListener('click',toggleMusic);
addEventListener('keydown',e=>{if(e.code.startsWith('Arrow')||e.code==='Space')e.preventDefault();if(e.repeat)return;keys.add(e.code);if(e.code==='KeyP'||e.code==='Escape')togglePause();if(e.code==='KeyM')toggleMusic();if(e.code==='KeyC'){cameraMode=(cameraMode+1)%2;toast(cameraMode?'GUITAR CAM':'CHASE CAM');}if(e.code==='KeyQ'||e.code==='KeyE')pointerAim=null;});addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>{clearInputs();if(race.state==='running')togglePause();});document.addEventListener('visibilitychange',()=>{if(document.hidden&&race.state==='running')togglePause();});
$('world').addEventListener('pointermove',e=>{if(race.state==='running'&&e.pointerType==='mouse')pointerAim=clamp((e.clientX/innerWidth-.5)*1.35,-.72,.72);});$('world').addEventListener('pointerdown',e=>{if(race.state==='running'&&e.button===0){touchKeys.add('fire');$('world').setPointerCapture(e.pointerId);}});$('world').addEventListener('pointerup',()=>touchKeys.delete('fire'));$('world').addEventListener('pointercancel',()=>touchKeys.delete('fire'));
document.querySelectorAll('[data-control]').forEach(b=>{const name=b.dataset.control;const stop=()=>{touchKeys.delete(name);b.classList.remove('pressed');};b.addEventListener('pointerdown',e=>{e.preventDefault();b.setPointerCapture(e.pointerId);touchKeys.add(name);b.classList.add('pressed');});b.addEventListener('pointerup',stop);b.addEventListener('pointercancel',stop);b.addEventListener('lostpointercapture',stop);});
function resize(){renderer.setSize(innerWidth,innerHeight,false);camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();$('touch').hidden=!(race.state==='running'&&matchMedia('(pointer:coarse)').matches);}addEventListener('resize',resize);resize();
const time=new THREE.Clock(),look=new THREE.Vector3(),muzzle=new THREE.Vector3(),aimPoint=new THREE.Vector3();let idleTime=0;
function draw(){requestAnimationFrame(draw);const dt=Math.min(time.getDelta(),.05);idleTime+=dt;if(!loaded){renderer.render(scene,camera);return;}
 const active=race.state==='running';const input={steer:(keys.has('KeyD')||keys.has('ArrowRight')||touchKeys.has('right')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')||touchKeys.has('left')?1:0),throttle:keys.has('KeyW')||keys.has('ArrowUp'),brake:keys.has('KeyS')||keys.has('ArrowDown')||touchKeys.has('brake'),boost:keys.has('ShiftLeft')||keys.has('ShiftRight')||touchKeys.has('boost'),fire:keys.has('Space')||touchKeys.has('fire'),aim:pointerAim??undefined,aimStep:(keys.has('KeyE')?1:0)-(keys.has('KeyQ')?1:0)};
 race.step(dt,input);
 for(const event of race.events.splice(0)){if(event.type==='heat')toast('GUITAR OVERHEATED · COOLING');if(event.type==='cell')toast('REPAIRED +12 / BOOST +32');if(event.type==='burn')toast('ROAD CLEARED +150',.8);if(event.type==='hit'){hitTimer=.45;toast('ARMOR HIT −22',1);}
  const e=race.entities.find(e=>e.id===event.id);if(e)burst(worldX(e.s,e.x),-(e.s-race.distance));}
 if(race.state!==lastState&&['finished','wrecked'].includes(race.state))finish();lastState=race.state;
 updateRoad();const distance=race.distance;
 for(const h of hillObjects){const ahead=((h.s-distance)%1232+1232)%1232-110;h.mesh.position.set(worldX(distance+ahead,h.side*h.offset),-.3,-ahead);}
 for(let i=0;i<horseObjects.length;i++){const h=horseObjects[i],ahead=20+i*23;h.position.set(worldX(distance+ahead,(i%2?1:-1)*(15+i%3)),.08*Math.sin(idleTime*10+i),-ahead);h.traverse(o=>{if(o.name.startsWith('HorseLeg'))o.rotation.x=Math.sin(idleTime*10+i+Number(o.name.slice(-1))*2)*.4;});}
 for(const e of race.entities){const o=entityObjects.get(e.id),ahead=e.s-distance;o.visible=e.active&&ahead>-10&&ahead<430;if(!o.visible)continue;o.position.set(worldX(e.s,e.x),e.kind==='cell'?2+Math.sin(idleTime*3)*.2:0,-ahead);if(e.kind==='cell')o.rotation.y=idleTime*2;else o.rotation.y=-Math.atan((curve(e.s+1)-curve(e.s)));}
 rig.position.set(race.x,.03*Math.sin(idleTime*(active?14:2)),0);rig.rotation.z=active?-input.steer*.035:0;rig.rotation.y=active?-input.steer*.045:0;shadow.position.x=race.x;artist.rotation.y=Math.PI/2-race.aim;artist.rotation.z=active?Math.sin(idleTime*(race.firing?22:6))*.035:0;for(const w of wheels)w.rotation.x-=(active?race.speed:0)*dt/1.6;
 artist.updateWorldMatrix(true,false);muzzle.copy(new THREE.Vector3(2.1,2.3,-.65));artist.localToWorld(muzzle);
 flare.visible=active&&race.firing;flameLight.intensity=flare.visible?12:0;flameLight.position.copy(muzzle);
 if(flare.visible)for(let i=0;i<fireParts.length;i++){const p=fireParts[i],t=(i/20+idleTime*1.7)%1,spread=.3+t*1.2;p.position.set(muzzle.x+Math.sin(race.aim)*t*31+Math.sin(i*8+idleTime*20)*spread,muzzle.y-t*1.5+Math.cos(i*4+idleTime*16)*spread*.6,muzzle.z-Math.cos(race.aim)*t*31);p.scale.setScalar((.5+Math.sin(t*Math.PI)*.8)*(1-t*.45));p.rotation.x=idleTime*9+i;}
 for(const p of particles){if(p.life>0){p.life-=dt;p.mesh.position.addScaledVector(p.v,dt);p.v.y-=dt*17;p.mesh.position.z+=race.speed*dt;p.mesh.scale.setScalar(Math.max(0,p.life));p.mesh.visible=p.life>0;}}
 if(race.state==='ready'){const a=idleTime*.075;camera.position.set(12+Math.sin(a)*3,7.2,15);camera.lookAt(-3,2.4,-7);}
 else{const near=cameraMode===1;const cx=race.x*(near?.82:.54)+(near?3.9:6.4),cy=near?6.8:8.7,cz=near?10:17;camera.position.lerp(new THREE.Vector3(cx,cy,cz),Math.min(1,dt*5));look.set(race.x*.6,2.5,-(near?12:22));camera.lookAt(look);const fov=race.boosting?64:55;camera.fov+=(fov-camera.fov)*dt*3;camera.updateProjectionMatrix();}
 aimPoint.set(race.x+Math.sin(race.aim)*30,2.7,-Math.cos(race.aim)*30).project(camera);$('aim').style.left=(aimPoint.x*.5+.5)*innerWidth+'px';$('aim').style.top=(-aimPoint.y*.5+.5)*innerHeight+'px';
 $('speed').textContent=String(Math.round(race.speed*3.6)).padStart(3,'0');$('speed-fill').style.width=clamp(race.speed/76*100,0,100)+'%';$('distance').textContent=`${(race.distance/1000).toFixed(1)} / 6.2 KM`;$('progress').style.width=race.distance/RACE_LENGTH*100+'%';$('score').textContent=race.score.toLocaleString();for(const id of ['armor','boost','heat']){$(id).style.width=race[id]+'%';$(id+'-value').textContent=Math.ceil(race[id])+'%';}$('heat-label').style.color=race.overheated?'#ff895e':'';
 if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').classList.remove('visible');}hitTimer=Math.max(0,hitTimer-dt);$('hit').style.opacity=hitTimer>0?'.75':'0';renderer.render(scene,camera);
}
window.addEventListener('error',e=>{if(!loaded)showError(e.message);});
const getStatus=()=>({state:race.state,distance:Math.round(race.distance),speed:Math.round(race.speed*3.6),armor:race.armor,score:race.score,musicPlaying:!audio.paused&&!audio.muted});
if(document.modelContext?.registerTool){for(const tool of [{name:'get_race_status',description:'Read the current race state and progress.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>getStatus()},{name:'set_race_pause',description:'Pause or resume the current race.',inputSchema:{type:'object',properties:{paused:{type:'boolean'}},required:['paused'],additionalProperties:false},execute:input=>{if(typeof input.paused!=='boolean')throw new Error('paused must be a boolean');if((input.paused&&race.state==='running')||(!input.paused&&race.state==='paused'))togglePause();return getStatus();}}]){try{Promise.resolve(document.modelContext.registerTool(tool)).catch(()=>{});}catch{}}}
window.__qilian={getStatus,rendererInfo:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}),assets:()=>({rig:!!rig,artist:!!artist,hills:hills.length})};
load();draw();
