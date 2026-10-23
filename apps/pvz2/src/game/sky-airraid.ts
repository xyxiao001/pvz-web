import {BOARD,cellX,rowY,type AirRaidEnemy} from './level';
import type {Game,Plant,Zombie} from './model';
type Shot={id:number;x:number;y:number;vx:number;vy:number;damage:number;rig:string;animation:string;hits:number[];pierce:number;life:number};
export class SkyAirRaid {
 score=0;team=0;member=0;player:Plant|null=null;
 shots:Shot[]=[];bullets:Shot[]=[];keys=new Set<string>();
 private poweredCactus=false;private foodShots=0;private foodCount=0;
 private next=0;private foodUntil=0;private foodNext=0;private angles=new Map<number,number>();
 constructor(private g:Game){}
 get current(){return this.g.level.airRaid!.teams[this.team].members[this.member];}
 choose(team:number){this.team=team;this.member=0;this.score=0;this.evolve();}
 private evolve(){
  const old=this.player,x=old?cellX(old.column):cellX(1),y=old?rowY(old.row):rowY(2);
  if(old)this.g.plants=this.g.plants.filter(p=>p.id!==old.id);
  this.g.addPlant(this.current.kind,2,1);this.player=this.g.plants.at(-1)!;this.player.hp=this.current.props.Toughness!;this.player.animation='Idle';this.move(x,y);this.next=this.g.time;this.poweredCactus=false;
 }
 move(x:number,y:number){if(!this.player)return;this.player.column=(Math.max(0,Math.min(1200,x))-BOARD.left)/BOARD.cellWidth-.5;this.player.row=(Math.max(0,Math.min(700,y))-rowY(0))/BOARD.cellHeight;}
 food(){
  if(!this.player||!this.g.food||this.g.time<this.foodUntil||this.player.kind==='cactus'&&this.poweredCactus)return false;
  const p=this.player,props={...this.g.props.plants[p.kind],...this.current.props};this.g.food--;this.foodUntil=this.g.time+(p.kind==='fumeshroom'?props.PlantfoodDuration:2);this.foodNext=this.g.time;this.foodShots=0;
  this.foodCount=p.kind==='bloomerang'?props.PlantfoodBoomerangCount:p.kind==='laser_bean'||p.kind==='cactus'?1:p.kind==='fumeshroom'?60:props.PlantfoodPeaCount;
  if(p.kind==='cactus')this.poweredCactus=true;
  p.action='food';p.animation=p.kind==='starfruit'||p.kind==='pinkstarfruit'?'Fooding':'Food';p.actionAt=this.g.time;this.g.events.push({type:'food'});return true;
 }
 killed(z:Zombie){this.score+=this.g.level.airRaid!.enemies[z.kind]!.WavePointCost;if(this.current.threshold!==undefined&&this.score>=this.current.threshold){this.member++;this.evolve();}}
 private range(r:{Min:number;Max:number}){return r.Min+this.g.random()*(r.Max-r.Min);}
 spawn(z:Zombie){
  if(!this.g.level.airRaid)return;const props=this.g.level.airRaid.enemies[z.kind]!;
  if(props.Toughness!==undefined)z.hp=props.Toughness;
  z.airRaid={next:this.g.time+(z.kind==='sky_battleplane'?0:this.range(props.TimeBeforeFirst)),escaped:false};
  z.sky={animation:z.kind==='sky_battleplane'?'Walk_Shoot':'Walk',elapsed:0,event:0,impHealth:390,speed:1};
  if(props.WalkingRoute){const route=props.WalkingRoute;z.route={spawnLane:z.row,spawnWave:this.g.wave,index:0,y:rowY(z.row),angle:Math.PI,points:Array.from({length:route.LoopTime},()=>route.SplinePoints.map(p=>({x:BOARD.left+(p.x-200)/64*BOARD.cellWidth,y:rowY(0)-BOARD.cellHeight/2+(p.y-160)/76*BOARD.cellHeight}))).flat()};z.sky.speed=this.range(route.Speed);}
 }
 private bullet(z:Zombie,p:AirRaidEnemy){
  const plane=z.kind==='sky_battleplane',count=plane?p.BulletCountPerShot:p.ProjectileCountPerShot,speed=(plane?p.BulletSpeed:this.range(p.ProjectileSpeed))*BOARD.cellWidth,angle=plane?(this.angles.get(z.id)??0):p.ShootsTowardsAirRaidPlant&&this.player?Math.atan2(rowY(this.player.row)-rowY(z.row),cellX(this.player.column)-z.x):Math.PI;
  for(let i=0;i<count;i++){const a=plane?Math.PI+angle+2*Math.PI*i/count:angle+(count===1?0:-p.ProjectileAngle+2*p.ProjectileAngle*i/(count-1))*Math.PI/180;
   this.bullets.push({id:this.g.nextEntityId(),x:z.x-30,y:rowY(z.row)-35,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,damage:this.g.props.projectiles[plane?p.BulletType:p.ProjectileType].Damage,rig:plane?'airRaid1':'airRaid0',animation:'i',hits:[],pierce:1,life:10});
  }
  if(plane)this.angles.set(z.id,angle+p.ShootingDeltaAngle*Math.PI/180);
 }
 zombie(z:Zombie,dt:number){
  const g=this.g,p=g.level.airRaid!.enemies[z.kind]!,s=z.sky!;dt*=g.time<z.chilledUntil?.5:1;
  if(z.kind!=='sky_battleplane'&&g.time>=z.airRaid!.next&&s.animation==='Walk'){s.animation='Shoot';s.elapsed=0;s.event=0;z.airRaid!.next=g.time+this.range(p.TimeBetween);}
  s.elapsed+=dt;const timeline=g.props.plantAnimations[z.kind==='sky_battleplane'?'skyBattlePlane':z.kind==='sky_flag'?'skyFlag':'sky'][s.animation];
  while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const event=timeline.events[s.event++].name;if(event==='bullet'||event==='shoot'&&z.kind!=='sky_battleplane')this.bullet(z,p);}
  if(s.elapsed>=timeline.duration){s.elapsed-=timeline.duration;s.event=0;if(s.animation==='Shoot')s.animation='Walk';}
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
  p.animation=food?(kind==='starfruit'||kind==='pinkstarfruit'?'Fooding':'Food'):kind==='splitpea'?'ShootRL':kind==='threepeater'?'Shoot111':kind==='pinkstarfruit'?'Shoot2':'Shoot';p.action=food?'food':'shoot';p.actionAt=g.time;g.events.push({type:'shot'});
 }
 tick(dt:number){
  const g=this.g;if(!g.level.airRaid||!this.player)return;
  const p=this.player;if(p.hp<=0){g.phase='lost';g.lossReason='airRaid';g.events.push({type:'lose'});return;}
  const dx=Number(this.keys.has('ArrowRight')||this.keys.has('KeyD'))-Number(this.keys.has('ArrowLeft')||this.keys.has('KeyA')),dy=Number(this.keys.has('ArrowDown')||this.keys.has('KeyS'))-Number(this.keys.has('ArrowUp')||this.keys.has('KeyW'));
  if(dx||dy){const scale=6*BOARD.cellWidth*dt/Math.hypot(dx,dy);this.move(cellX(p.column)+dx*scale,rowY(p.row)+dy*scale);}
  if(g.time<this.foodUntil){if(this.foodShots<this.foodCount&&g.time>=this.foodNext){this.shoot(true);this.foodShots++;this.foodNext+=(p.kind==='fumeshroom'?3:2)/this.foodCount;}}
  else if(g.time>=this.next){this.shoot(false);this.next=g.time+this.current.props.ShootInterval!;}
  for(const b of this.bullets){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(Math.hypot(b.x-cellX(p.column),b.y-(rowY(p.row)-35))<25){if(g.time>=this.foodUntil)p.hp-=b.damage;b.life=0;}}
  for(const s of this.shots){const ox=s.x,oy=s.y;s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.rig==='boomerang'&&(s.hits.length>=s.pierce||s.x>1160)){s.vx=-Math.abs(s.vx);s.hits=[];s.pierce=Infinity;}
   for(const z of g.zombies){if(z.hp<=0||s.hits.includes(z.id))continue;const dx=s.x-ox,dy=s.y-oy,t=Math.max(0,Math.min(1,((z.x-ox)*dx+(rowY(z.row)-45-oy)*dy)/(dx*dx+dy*dy)));
    if(Math.hypot(ox+dx*t-z.x,oy+dy*t-(rowY(z.row)-45))<35){g.damage(z,s.damage);s.hits.push(z.id);if(s.hits.length>=s.pierce){if(s.rig!=='boomerang')s.life=0;break;}}
   }
  }
  this.shots=this.shots.filter(s=>s.life>0&&s.x>-100&&s.x<1300&&s.y>-100&&s.y<800);this.bullets=this.bullets.filter(s=>s.life>0&&s.x>-100&&s.x<1300&&s.y>-100&&s.y<800);
  for(const pickup of [...g.pickups])g.collectPickup(pickup.id);
 }
}
