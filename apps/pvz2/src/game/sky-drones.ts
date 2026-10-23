import source from '../../public/assets/sky/properties.json';
import {BOARD,cellX,rowY} from './level';
import type {Game,Zombie} from './model';
export interface DroneState {animation:string;elapsed:number;event:number;host:number;plant:number;carrying:boolean;rest:number;returning:boolean}
export interface DroneMakerState {animation:string;elapsed:number;event:number;remaining:number;interval:number;stage:number}
export class SkyDrones {
 constructor(private g:Game){}
 private range(r:{Min:number;Max:number}){return r.Min+this.g.random()*(r.Max-r.Min);}
 private play(s:DroneState|DroneMakerState,animation:string){s.animation=animation;s.elapsed=0;s.event=0;}
 spawn(z:Zombie){
  if(z.kind==='sky_dronemaker'){const interval=this.range(source.zombies.sky_dronemaker.DroneInterval);z.x=cellX(8);z.droneMaker={animation:'Spawn',elapsed:0,event:0,remaining:interval,interval,stage:-1};}
  if(z.kind==='sky_drone')z.drone={animation:'Fly_Carry',elapsed:0,event:0,host:0,plant:0,carrying:true,rest:0,returning:false};
 }
 private target(z:Zombie){return this.g.zombies.filter(q=>q.hp>0&&source.zombies.sky_dronemaker.ValidDroneTargets.includes(q.kind)&&!(q.skyHelmet&&q.armor>0)&&q.x<=z.x&&q.x>=BOARD.left).sort((a,b)=>a.x-b.x)[0];}
 private move(z:Zombie,x:number,row:number,dt:number){const dx=x-z.x,dy=rowY(row)-rowY(z.row),distance=Math.hypot(dx,dy),step=source.zombies.sky_drone.FlyingSpeed*BOARD.cellWidth*dt;if(distance<=step){z.x=x;z.row=row;return true;}z.x+=dx/distance*step;z.row+=dy/distance*step/BOARD.cellHeight;return false;}
 zombie(z:Zombie,dt:number){
  const g=this.g;dt*=g.time<z.chilledUntil?.5:1;
  if(z.droneMaker){
   const s=z.droneMaker;
   if(s.animation!=='Spawn'&&s.animation!=='Send'){
    s.remaining-=dt;const stage=Math.min(3,Math.floor(4*(1-s.remaining/s.interval)));
    if(stage>s.stage){s.stage=stage;this.play(s,`Deliver${stage}`);}
    if(s.remaining<=0&&this.target(z))this.play(s,'Send');
   }
   s.elapsed+=dt;const timeline=g.props.plantAnimations.skyDroneMaker[s.animation];
   while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const event=timeline.events[s.event++].name;
    if(event==='fall_hit'){for(const p of g.plants)if(p.row===z.row&&p.column===8)p.hp=0;for(const other of g.zombies)if(other!==z&&other.droneMaker&&other.row===z.row&&other.x===z.x)other.hp=0;}
    if(event==='send'){const target=this.target(z);if(target){const d=g.spawnZombie('sky_drone',z.row,z.x);d.drone!.host=target.id;}}
    const sound:Record<string,string>={fall_start:'spawnSounds',fall_hit:'fallHitSounds',send_say:'sendSaySounds',convey:'conveySounds',screw:'screwSounds',put:'putSounds',retract:'retractSounds'};if(sound[event])g.beach.sounds.push('skyDroneMaker/'+sound[event]);
    if(event==='switchingFalse'){if(s.animation==='Send'){s.interval=this.range(source.zombies.sky_dronemaker.DroneInterval);s.remaining=s.interval;s.stage=-1;}this.play(s,'Idle');break;}
   }
   if(s.elapsed>=timeline.duration){if(s.animation.startsWith('Deliver'))this.play(s,s.animation.replace('Deliver','Fix'));else {s.elapsed-=timeline.duration;s.event=0;}}
   return true;
  }
  if(!z.drone)return false;
  const s=z.drone,p=source.zombies.sky_drone;
  let host=g.zombies.find(q=>q.id===s.host&&q.hp>0);
  if(s.carrying&&(!host||host.skyHelmet&&host.armor>0)){host=this.target(z);s.host=host?.id??0;}
  if(!s.carrying&&(!host||host.armor<=0)){z.hp=0;return true;}
  if(s.carrying){
   if(host&&this.move(z,host.x,host.row,dt)){host.armor=source.armors.sky_armor3.Toughness;host.skyHelmet=true;s.carrying=false;s.rest=this.range(p.TimeBeforeFirst);this.play(s,'Rest_Carry');}
   else if(!host){z.x-=p.FlyingSpeed*BOARD.cellWidth*dt;if(z.x<-80)z.hp=0;}
  }else {
   const plant=g.plants.find(q=>q.id===s.plant&&q.hp>0&&q.kind!=='bulbkekengi'&&q.action!=='food'&&!q.hidden&&!g.kongfu.peach.protected(q));
   if(plant){
    if(this.move(z,cellX(plant.column),plant.row,dt)){plant.hp-=p.EatDPS*dt;z.eating=true;if(s.animation!=='Eat')this.play(s,'Eat');}
   }else if(s.plant){s.plant=0;s.returning=true;z.eating=false;this.play(s,'Fly');}
   else if(s.returning){if(this.move(z,host!.x,host!.row,dt)){s.returning=false;s.rest=this.range(p.TimeBetween);this.play(s,'Rest');}}
   else {
    z.x=host!.x;z.row=host!.row;s.rest-=dt;
    if(s.rest<=0){const candidates=g.plants.filter(q=>q.hp>0&&q.kind!=='bulbkekengi'&&q.action!=='food'&&!q.hidden&&!q.leap&&cellX(q.column)<z.x&&!g.kongfu.peach.protected(q)&&!['iceburg','spikeweed','spikerock','iceweed','potatomine','goldleaf'].includes(q.kind)).sort((a,b)=>Number(p.LowPriorityPlantTypes.includes(a.kind))-Number(p.LowPriorityPlantTypes.includes(b.kind))||b.column-a.column);
     if(candidates.length){s.plant=candidates[0].id;this.play(s,'Fly');}
    }
   }
  }
  s.elapsed+=dt;const timeline=g.props.plantAnimations.skyDrone[s.animation];
  while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const event=timeline.events[s.event++].name;g.beach.sounds.push('skyDrone/'+event+'Sounds');}
  if(s.elapsed>=timeline.duration){if(['Fly','Rest','Rest_Carry'].includes(s.animation))this.play(s,s.animation==='Fly'?'Idle_Fly':'Idle_Rest');else {s.elapsed-=timeline.duration;s.event=0;}}
  return true;
 }
}
