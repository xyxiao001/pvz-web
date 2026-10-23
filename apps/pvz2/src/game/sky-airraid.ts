import {BOARD,cellX,rowY,type AirRaidStyle,type AirRaidEnemy} from './level';
import type {Game,Plant,Zombie} from './model';
type Shot={target?:number;splash?:number;emissions?:{Type:string;Count:number}[];id:number;x:number;y:number;vx:number;vy:number;damage:number;rig:string;animation:string;hits:number[];pierce:number;life:number};
export class SkyAirRaid {
 rays:{id:number;x:number;y:number;toX:number;toY:number;at:number}[]=[];
 score=0;team=0;member=0;player:Plant|null=null;
 shots:Shot[]=[];bullets:Shot[]=[];keys=new Set<string>();
 private twins=new Map<number,{style:number;left:number;next:number;angle:number}[]>();
 private poweredCactus=false;private foodShots=0;private foodCount=0;
 private next=0;private foodUntil=0;private foodNext=0;private angles=new Map<number,number>();
 constructor(private g:Game){}
 get current(){return this.g.level.airRaid!.teams[this.team].members[this.member];}
 choose(team:number){this.team=team;this.member=0;this.score=0;this.evolve();}
 private evolve(){
  const old=this.player,x=old?cellX(old.column):cellX(1),y=old?rowY(old.row):rowY(2);
  if(old)this.g.plants=this.g.plants.filter(p=>p.id!==old.id);
  this.g.addPlant(this.current.kind,2,1);this.player=this.g.plants.at(-1)!;this.player.hp={...this.g.props.plants[this.current.kind],...this.current.props}.Toughness!;this.player.animation='Idle';this.move(x,y);this.next=this.g.time+(this.current.kind==='citron'?this.current.props.ChargeTime!:0);this.poweredCactus=false;
 }
 move(x:number,y:number){if(!this.player)return;this.player.column=(Math.max(0,Math.min(1200,x))-BOARD.left)/BOARD.cellWidth-.5;this.player.row=(Math.max(0,Math.min(700,y))-rowY(0))/BOARD.cellHeight;}
 food(){
  if(!this.player||!this.g.food||this.g.time<this.foodUntil||this.player.kind==='cactus'&&this.poweredCactus)return false;
  const p=this.player,props={...this.g.props.plants[p.kind],...this.current.props};this.g.food--;this.foodUntil=this.g.time+(p.kind==='fumeshroom'?props.PlantfoodDuration:2);this.foodNext=this.g.time;this.foodShots=0;
  this.foodCount=p.kind==='bloomerang'?props.PlantfoodBoomerangCount:['laser_bean','cactus','coconutcannon','citron'].includes(p.kind)?1:p.kind==='lightningreed'?30:p.kind==='fumeshroom'?60:props.PlantfoodPeaCount;
  if(p.kind==='cactus')this.poweredCactus=true;
  p.action='food';p.animation=p.kind==='starfruit'||p.kind==='pinkstarfruit'||p.kind==='homingthistle'?'Fooding':'Food';p.actionAt=this.g.time;this.g.events.push({type:'food'});return true;
 }
 killed(z:Zombie){this.score+=z.airRaid!.props.WavePointCost;if(this.current.threshold!==undefined&&this.score>=this.current.threshold){this.member++;this.evolve();}}
 private range(r:{Min:number;Max:number}){return r.Min+this.g.random()*(r.Max-r.Min);}
 spawn(z:Zombie,variant?:string){
  if(!this.g.level.airRaid)return;const props={...this.g.props.zombies[z.kind],...(variant===undefined?this.g.level.airRaid.enemies[z.kind]!:this.g.level.airRaid.variants[variant])} as AirRaidEnemy;
  if(props.Toughness!==undefined)z.hp=props.Toughness;
  z.airRaid={next:this.g.time+(z.kind==='sky_battleplane'||z.kind==='sky_airraid_twin'?0:this.range(props.TimeBeforeFirst)),escaped:false,props};
  z.sky={animation:z.kind==='sky_airraid_twin'?'Idle':z.kind==='sky_battleplane'?'Walk_Shoot':'Walk',elapsed:0,event:0,impHealth:390,speed:1};
  if(props.WalkingRoute){const route=props.WalkingRoute;z.route={spawnLane:z.row,spawnWave:this.g.wave,index:0,y:rowY(z.row),angle:Math.PI,points:Array.from({length:route.LoopTime},()=>route.SplinePoints.map(p=>({x:BOARD.left+(p.x-200)/64*BOARD.cellWidth,y:rowY(0)-BOARD.cellHeight/2+(p.y-160)/76*BOARD.cellHeight}))).flat()};z.sky.speed=this.range(route.Speed);}
 }
 private projectile(type:string){
  const level=this.g.level.airRaid!,local=level.projectiles[type];
  if(local)return {damage:local.props.Damage,rig:local.base==='shootingstar_pf'?'skyAirRaidStar':'skyBullet',animation:local.base==='shootingstar_pf'?'Idle':'i',emissions:local.props.ProjectileEmissions};
  if(type==='airraid_bolt_positive'||type==='airraid_bolt_negative')return {damage:this.g.props.projectiles.airraid_2.Damage,rig:type.endsWith('positive')?'skyBoltPositive':'skyBoltNegative',animation:'Idle'};
  return {damage:this.g.props.projectiles[type].Damage,rig:type==='airraid_1'?'airRaid1':'airRaid0',animation:'i'};
 }
 private twinShot(z:Zombie,p:AirRaidEnemy,dt:number){
  let states=this.twins.get(z.id);if(!states){states=[0,1].map(()=>({style:-1,left:0,next:0,angle:0}));this.twins.set(z.id,states);}
  for(const [index,styles] of [p.UpperStyles,p.LowerStyles].entries()){
   const s=states[index];
   if(s.left===0){const choices=styles.map((style,i)=>({style,i})).filter(v=>v.i!==s.style),sum=choices.reduce((n,v)=>n+v.style.Weight,0);let r=this.g.random()*sum;const selected=choices.find(v=>(r-=v.style.Weight)<0)!;s.style=selected.i;s.left=Math.floor(this.range(selected.style.Repeat));s.next=this.range(selected.style.ShootInterval);if(selected.style.ClearAngleOnStarted)s.angle=0;}
   s.next-=dt;if(s.next>0)continue;const style=styles[s.style],count=Math.floor(this.range(style.BulletCountPerShot)),art=this.projectile(style.BulletType),y=rowY(z.row)+(index===0?-85:5);
   const base=style.TowardsAirRaidPlant&&this.player?Math.atan2(rowY(this.player.row)-35-y,cellX(this.player.column)-z.x):Math.PI+s.angle;
   const sector=this.range(style.ShootingSectorAngle)*Math.PI/180;
   for(let i=0;i<count;i++){const a=base+(style.IsShootingSector?(count===1?0:-sector/2+sector*i/(count-1)):2*Math.PI*i/count),speed=this.range(style.BulletSpeed)*BOARD.cellWidth,life=this.range(style.BulletSelfExplodeTime);
    this.bullets.push({id:this.g.nextEntityId(),x:z.x-30,y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,...art,hits:[],pierce:1,life:life>0?life:10});
   }
   s.angle+=this.range(style.DeltaAnglePerShot)*Math.PI/180;s.left--;s.next+=this.range(style.ShootInterval);
  }
 }
 private bullet(z:Zombie,p:AirRaidEnemy){
  const plane=z.kind==='sky_battleplane',count=plane?p.BulletCountPerShot:p.ProjectileCountPerShot,speed=(plane?p.BulletSpeed:this.range(p.ProjectileSpeed))*BOARD.cellWidth,angle=plane?(this.angles.get(z.id)??0):p.ShootsTowardsAirRaidPlant&&this.player?Math.atan2(rowY(this.player.row)-rowY(z.row),cellX(this.player.column)-z.x):Math.PI;
  for(let i=0;i<count;i++){const a=plane?Math.PI+angle+2*Math.PI*i/count:angle+(count===1?0:-p.ProjectileAngle+2*p.ProjectileAngle*i/(count-1))*Math.PI/180;
   this.bullets.push({id:this.g.nextEntityId(),x:z.x-30,y:rowY(z.row)-35,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,...this.projectile(plane?p.BulletType:p.ProjectileType),hits:[],pierce:1,life:10});
  }
  if(plane)this.angles.set(z.id,angle+p.ShootingDeltaAngle*Math.PI/180);
 }
 zombie(z:Zombie,dt:number){
  const g=this.g,p=z.airRaid!.props,s=z.sky!;dt*=g.time<z.chilledUntil?.5:1;
  if(z.kind==='sky_airraid_twin')this.twinShot(z,p,dt);
  if(z.kind!=='sky_airraid_twin'&&z.kind!=='sky_battleplane'&&g.time>=z.airRaid!.next&&s.animation==='Walk'){s.animation=z.kind==='sky_electric'?(p.ProjectileType.endsWith('positive')?'Shoot_Positive':'Shoot_Negative'):'Shoot';s.elapsed=0;s.event=0;z.airRaid!.next=g.time+this.range(p.TimeBetween);}
  s.elapsed+=dt;const timeline=g.props.plantAnimations[z.kind==='sky_airraid_twin'?'skyAirRaidTwin':z.kind==='sky_electric'?'skyElectric':z.kind==='sky_battleplane'?'skyBattlePlane':z.kind==='sky_flag'?'skyFlag':'sky'][s.animation];
  while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const event=timeline.events[s.event++].name;if(event==='bullet'||event==='shoot_positive'||event==='shoot_negative'||event==='shoot'&&z.kind!=='sky_battleplane')this.bullet(z,p);}
  if(s.elapsed>=timeline.duration){s.elapsed-=timeline.duration;s.event=0;if(s.animation.startsWith('Shoot'))s.animation='Walk';}
  if(z.route){const r=z.route,point=r.points[r.index],buffer=p.WalkingRoute!.BufferDistance/64*BOARD.cellWidth,speed=s.speed*BOARD.cellWidth;
   if(point){const dx=point.x-z.x,dy=point.y-r.y,target=Math.atan2(dy,dx),turn=Math.atan2(Math.sin(target-r.angle),Math.cos(target-r.angle));r.angle+=Math.sign(turn)*Math.min(Math.abs(turn),speed/buffer*dt);if(Math.hypot(dx,dy)<=buffer)r.index++;}
   z.x+=Math.cos(r.angle)*speed*dt;r.y+=Math.sin(r.angle)*speed*dt;z.row=(r.y-rowY(0))/BOARD.cellHeight;
  }else if(s.animation==='Walk')z.x-=p.WalkSPS*BOARD.cellWidth*dt;
  if(z.x<-80){z.airRaid!.escaped=true;z.hp=0;}
  if(this.player&&Math.abs(z.x-cellX(this.player.column))<40&&Math.abs(z.row-this.player.row)*BOARD.cellHeight<50)this.player.hp-=g.props.zombies[z.kind].EatDPS*dt;
  return true;
 }
 private shoot(food:boolean){
  const p=this.player!,g=this.g,kind=p.kind,x=cellX(p.column)+30,y=rowY(p.row)-40;
  const emit=(angle:number,dy=0,rig='pea',damage=20,pierce=1,animation='Idle')=>this.shots.push({id:g.nextEntityId(),x,y:y+dy,vx:Math.cos(angle)*8*BOARD.cellWidth,vy:Math.sin(angle)*8*BOARD.cellWidth,rig,animation,damage,hits:[],pierce,life:3});
  switch(kind){
   case 'lightningreed':{const props={...g.props.plants.lightningreed,...this.current.props},targets=g.zombies.filter(z=>z.hp>0).sort((a,b)=>Math.hypot(a.x-x,rowY(a.row)-y)-Math.hypot(b.x-x,rowY(b.row)-y)).slice(0,1+props.SplashCount);let from={x,y};for(const [i,z] of targets.entries()){g.damage(z,food?props.PlantfoodDPS*.1:i===0?props.Damage:props.SplashDamage,'electric');this.rays.push({id:g.nextEntityId(),x:from.x,y:from.y,toX:z.x,toY:rowY(z.row)-40,at:g.time});from={x:z.x,y:rowY(z.row)-40};}break;}
   case 'homingthistle':{const target=g.zombies.filter(z=>z.hp>0).sort((a,b)=>a.x-b.x)[0];emit(target?Math.atan2(rowY(target.row)-40-y,target.x-x):0,0,food?'thistleFood':'thistle',g.props.projectiles[food?'homing_thistle_pf':'homing_thistle'].Damage,1,'Idle');this.shots.at(-1)!.target=target?.id;break;}
   case 'coconutcannon':case 'citron':{const key=kind==='coconutcannon'?'coconut':'citron',props=g.props.projectiles[key+(food?'_pf':'')];emit(0,0,key+(food?'Food':key==='citron'?'Shot':''),props.Damage,food&&kind==='citron'?Infinity:1,'Idle');this.shots.at(-1)!.splash=props.SplashDamage[0].Damage;break;}

   case 'xshot':for(const a of [-Math.PI/4,Math.PI/4,3*Math.PI/4,5*Math.PI/4])emit(a,0,food?'rotobagaFood':'rotobaga',g.props.projectiles[food?'rotobaga_pf':'rotobaga'].Damage,1,'Idle');break;
   case 'starfruit':for(const a of [Math.PI,-Math.PI/2,Math.PI/2,-Math.PI/4,Math.PI/4])emit(a,0,food?'starFood':'starShot',g.props.projectiles[food?'star_pf':'star'].Damage,1,'Idle');break;
   case 'pinkstarfruit':for(let i=0;i<5;i++)emit(i*2*Math.PI/5,0,food?'pinkFood':'pinkShot',g.props.projectiles[food?'pinkstar_pf':'pinkstar'].Damage,1,'Idle');break;
   case 'splitpea':emit(0);emit(Math.PI);emit(Math.PI,-7);break;
   case 'repeater':emit(0,-4);emit(0,4);break;
   case 'threepeater':for(const dy of [-BOARD.cellHeight,0,BOARD.cellHeight])emit(0,dy);break;
   case 'gatling':for(const dy of [-BOARD.cellHeight,0,BOARD.cellHeight])for(let i=0;i<4;i++)emit(0,dy+i*3);break;
   case 'cactus':if(!food)emit(0,0,this.poweredCactus?'cactusFood':'cactusShot',g.props.projectiles[this.poweredCactus?'cactus_pf':'cactus'].Damage,g.props.plants.cactus.PierceCount+(this.poweredCactus?g.props.plants.cactus.PierceCountAdditional:0),'Idle');break;
   case 'bloomerang':emit(food?this.foodShots%4*Math.PI/2:0,0,'boomerang',20,3,'Idle');break;
   case 'fumeshroom':emit(0,0,food?'fumeFood':'fumeShot',food?g.props.plants.fumeshroom.PlantfoodDPS*.05:g.props.plants.fumeshroom.Damage,Infinity,'Play');this.shots.at(-1)!.life=g.props.plants.fumeshroom.ShootDistance/8;break;
   case 'laser_bean':emit(0,0,'laserBeam',food?g.props.plants.laser_bean.DamagePlantfood:g.props.plants.laser_bean.Damage,Infinity,'Play');break;
   case 'peashooter':emit(0);break;
  }
  p.animation=food?(kind==='starfruit'||kind==='pinkstarfruit'||kind==='homingthistle'?'Fooding':'Food'):kind==='lightningreed'?'Attack':kind==='splitpea'?'ShootRL':kind==='threepeater'?'Shoot111':kind==='pinkstarfruit'?'Shoot2':'Shoot';p.action=food?'food':'shoot';p.actionAt=g.time;g.events.push({type:'shot'});
 }
 tick(dt:number){
  const g=this.g;if(!g.level.airRaid||!this.player)return;
  const p=this.player;if(p.hp<=0){g.phase='lost';g.lossReason='airRaid';g.events.push({type:'lose'});return;}
  const dx=Number(this.keys.has('ArrowRight')||this.keys.has('KeyD'))-Number(this.keys.has('ArrowLeft')||this.keys.has('KeyA')),dy=Number(this.keys.has('ArrowDown')||this.keys.has('KeyS'))-Number(this.keys.has('ArrowUp')||this.keys.has('KeyW'));
  if(dx||dy){const scale=6*BOARD.cellWidth*dt/Math.hypot(dx,dy);this.move(cellX(p.column)+dx*scale,rowY(p.row)+dy*scale);}
  if(g.time<this.foodUntil){if(this.foodShots<this.foodCount&&g.time>=this.foodNext){this.shoot(true);this.foodShots++;this.foodNext+=(p.kind==='fumeshroom'?3:2)/this.foodCount;}}
  else if(g.time>=this.next){this.shoot(false);this.next=g.time+(p.kind==='coconutcannon'?this.current.props.RestTime!:p.kind==='citron'?this.current.props.ChargeTime!:p.kind==='lightningreed'?this.current.props.AttackInterval!:this.current.props.ShootInterval!);}
  for(const b of this.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.hypot(b.x-cellX(p.column),b.y-(rowY(p.row)-35))<25){if(g.time>=this.foodUntil)p.hp-=b.damage;b.life=0;}}
  for(const b of this.bullets.filter(b=>b.life<=0&&b.emissions))for(const emission of b.emissions!){const art=this.projectile(emission.Type),speed=Math.hypot(b.vx,b.vy),rotation=g.random()*2*Math.PI;for(let i=0;i<emission.Count;i++){const angle=rotation+i*2*Math.PI/emission.Count;this.bullets.push({id:g.nextEntityId(),x:b.x,y:b.y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,...art,hits:[],pierce:1,life:10});}}
  for(const s of this.shots){if(s.target!==undefined){const target=g.zombies.find(z=>z.id===s.target&&z.hp>0);if(target){const angle=Math.atan2(rowY(target.row)-40-s.y,target.x-s.x),speed=Math.hypot(s.vx,s.vy);s.vx=Math.cos(angle)*speed;s.vy=Math.sin(angle)*speed;}}const ox=s.x,oy=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.rig==='boomerang'&&(s.hits.length>=s.pierce||s.x>1160)){s.vx=-Math.abs(s.vx);s.hits=[];s.pierce=Infinity;}
   for(const z of g.zombies){if(z.hp<=0||s.hits.includes(z.id))continue;const dx=s.x-ox,dy=s.y-oy,t=Math.max(0,Math.min(1,((z.x-ox)*dx+(rowY(z.row)-45-oy)*dy)/(dx*dx+dy*dy)));
    if(Math.hypot(ox+dx*t-z.x,oy+dy*t-(rowY(z.row)-45))<35){g.damage(z,s.damage);if(s.splash)for(const other of g.zombies)if(other.hp>0&&Math.hypot(other.x-z.x,rowY(other.row)-rowY(z.row))<BOARD.cellWidth*1.5)g.damage(other,s.splash);s.hits.push(z.id);if(s.hits.length>=s.pierce){if(s.rig!=='boomerang')s.life=0;break;}}
   }
  }
  this.shots=this.shots.filter(s=>s.life>0&&s.x>-100&&s.x<1300&&s.y>-100&&s.y<800);this.bullets=this.bullets.filter(s=>s.life>0&&s.x>-100&&s.x<1300&&s.y>-100&&s.y<800);
  this.rays=this.rays.filter(r=>g.time-r.at<.2);
  for(const pickup of [...g.pickups])g.collectPickup(pickup.id);
 }
}
