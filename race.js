export const RACE_LENGTH=6200;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const curve=s=>Math.sin(s/240)*23+Math.sin(s/670)*35;
export class Race{
 constructor(){this.reset();this.state='ready';}
 reset(){this.state='running';this.distance=0;this.time=0;this.x=0;this.speed=0;this.armor=100;this.boost=100;this.heat=0;this.overheated=false;this.firing=false;this.boosting=false;this.aim=0;this.bonus=0;this.invuln=0;this.events=[];this.entities=[];let seed=27;const rng=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);let pos=95;let i=0;while(pos<RACE_LENGTH-70){let kind=i%4===2?'cell':(i%5===1?'truck':(i%3===0?'rock':'barrier'));this.entities.push({id:i++,kind,s:pos,x:[-5,0,5][Math.floor(rng()*3)],active:true,burn:0});pos+=55+rng()*50;} }
 get score(){return Math.floor(this.distance*.25+this.bonus);}
 step(dt,input={}){
  if(this.state!=='running')return;dt=clamp(dt,0,.05);this.time+=dt;this.invuln=Math.max(0,this.invuln-dt);
  this.boosting=!!input.boost&&this.boost>1&&!input.brake;
  this.boost=clamp(this.boost+(this.boosting?-24:7)*dt,0,100);
  let target=input.brake?10:input.throttle?54:32;if(this.boosting)target=76;if(Math.abs(this.x)>8)target*=.55;
  this.speed+=(target-this.speed)*Math.min(1,dt*(input.brake?3.5:1.1));
  this.x=clamp(this.x+(input.steer||0)*(8+this.speed*.055)*dt,-11,11);
  this.aim=clamp(input.aim??(this.aim+(input.aimStep||0)*dt*1.5),-.72,.72);
  if(this.overheated&&this.heat<30)this.overheated=false;
  this.firing=!!input.fire&&!this.overheated;
  this.heat=clamp(this.heat+(this.firing?34:-28)*dt,0,100);
  if(this.heat>=100&&!this.overheated){this.overheated=true;this.firing=false;this.events.push({type:'heat'});}
  const before=this.distance;this.distance+=this.speed*dt;
  for(const e of this.entities){
   if(!e.active)continue;if(e.kind==='truck')e.s+=9*dt;
   const ahead=e.s-this.distance;
   if(ahead < -12){e.active=false;continue;}
   if(this.firing&&e.kind!=='cell'&&ahead>2&&ahead<39&&Math.abs(e.x-this.x-Math.tan(this.aim)*ahead)<2.8){e.burn+=dt;if(e.burn>.27){e.active=false;this.bonus+=150;this.events.push({type:'burn',id:e.id});continue;}}
   const crossed=e.s>=before-4&&e.s<=this.distance+4;
   if(crossed&&Math.abs(e.x-this.x)<2.35){
    e.active=false;
    if(e.kind==='cell'){this.armor=clamp(this.armor+12,0,100);this.boost=clamp(this.boost+32,0,100);this.bonus+=80;this.events.push({type:'cell',id:e.id});}
    else if(!this.invuln){this.armor-=22;this.speed*=.4;this.invuln=1.1;this.events.push({type:'hit',id:e.id});}
   }
  }
  if(this.armor<=0){this.armor=0;this.state='wrecked';this.firing=false;}
  else if(this.distance>=RACE_LENGTH){this.distance=RACE_LENGTH;this.state='finished';this.firing=false;}
 }
}
