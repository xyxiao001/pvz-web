import {DinoVisitors} from './dino-visitors';
import source from '../../public/assets/dino/dinosaurs.json';
import {BOARD,cellX,rowY,type SpawnAction,type ZombieKind} from './level';
import {isFlying,swinging} from './pirate';
import type {Game,Plant} from './model';

export const dinoArmor=(kind:ZombieKind)=>kind==='dino_armor1'||kind==='dino_armor2'||kind==='dino_armor3'?kind:null;
export interface Raptor {id:number;row:number;x:number;direction:number;animation:'Walk'|'Turn'|'Kick'|'Idle';charmed:boolean;born:number;elapsed:number;event:number;speed:number;left:number;leaveAt:number;leaving:boolean;detect:boolean;kicked:Map<number,number>;sayAt:number}
export class DinoBattle {
 raptors:Raptor[]=[];
 pending:{kind:NonNullable<SpawnAction['dinosaur']>['kind'];row:number;at:number}[]=[];
 perfumes:{id:number;row:number;column:number;at:number}[]=[];
 readonly visitors:DinoVisitors;
 private serial=0;
 constructor(private g:Game){this.visitors=new DinoVisitors(g);}
 add(action:NonNullable<SpawnAction['dinosaur']>){this.pending.push({kind:action.kind,row:action.row,at:this.g.time+action.delay});}
 private play(r:Raptor,animation:Raptor['animation']){r.animation=animation;r.elapsed=0;r.event=0;}
 private targets(r:Raptor,wide=false){
  const g=this.g,rect=source.attackRect,center=r.x+rect.x*.6*(wide||r.charmed?r.direction:1),half=rect.w*.6*(wide?2.5:1)/2;
  return [...g.zombies,...g.westFinale.allies].filter(z=>z.hp>0&&z.row===r.row&&!z.dinoCarry&&!z.leap&&!isFlying(z)&&!swinging(z,g.time)&&!g.props.zombies[z.kind].CannotBeKnockedBackByProjectiles&&!g.props.zombies[z.kind].CannotBeFlickedByPowerToss&&g.time>=(r.kicked.get(z.id)??0)&&Math.abs(z.x-center)<half+20).sort((a,b)=>(b.x-a.x)*r.direction);
 }
 tick(dt:number){
  const g=this.g,p=source.raptor;
  for(const item of this.pending)if(g.time>=item.at){if(item.kind!=='raptor'){this.visitors.add(item.kind,item.row,++this.serial);continue;}this.raptors.push({charmed:false,born:g.time,id:++this.serial,row:item.row,x:1070,direction:1,animation:'Walk',elapsed:0,event:0,speed:p.WalkSPS+.1*(1-2*g.random()),left:p.ZombiesToKick,leaveAt:g.time+p.MaxWonderingTime,leaving:false,detect:false,kicked:new Map(),sayAt:g.time+3});}
  this.pending=this.pending.filter(item=>g.time<item.at);
  this.perfumes=this.perfumes.filter(f=>g.time-f.at<g.props.plants.perfumeshroom.Duration+g.props.plantAnimations.perfumeFire.Fade.duration+8/18);
  for(const f of this.perfumes){
   const touches=(d:{row:number;x:number;born:number;charmed:boolean})=>!d.charmed&&d.row===f.row&&g.time-d.born>=.5&&d.x>=cellX(0)-41&&d.x<=cellX(8)+41&&g.time-f.at>=Math.abs((d.x-cellX(f.column))/BOARD.cellWidth)/18&&g.time-f.at<g.props.plants.perfumeshroom.Duration;
   for(const r of this.raptors)if(touches(r)){r.charmed=true;r.detect=true;r.left=p.ZombiesToFlickCharmed;r.kicked.clear();this.play(r,r.direction>0?'Turn':'Idle');g.beach.sounds.push('raptor/charmSounds');}
   for(const d of this.visitors.items)if(touches(d))this.visitors.charm(d);
  }
  this.visitors.tick(dt);
  for(const r of this.raptors){
   if(r.animation==='Walk'||r.animation==='Idle'){
    if(!r.leaving&&(r.left===0||!r.charmed&&g.time>=r.leaveAt)){r.leaving=true;if(r.direction>0){this.play(r,'Turn');continue;}this.play(r,'Walk');}
    if(!r.leaving&&r.detect&&(r.charmed||r.x>cellX(p.WalkEdgeColumn)&&r.x<cellX(8))&&this.targets(r).length){this.play(r,!r.charmed&&r.direction<0?'Turn':'Kick');continue;}
    if(r.animation==='Walk')r.x-=r.speed*BOARD.cellWidth*dt*r.direction*(r.leaving?p.LeaveSpeedScale:1);
    if(!r.leaving&&!r.charmed&&(r.direction>0&&r.x<cellX(p.WalkEdgeColumn)||r.direction<0&&r.x>cellX(8))){r.detect=true;this.play(r,'Turn');continue;}
    if(g.time>=r.sayAt){g.beach.sounds.push('raptor/idleSaySounds');r.sayAt=g.time+3;}
   }
   const timeline=g.props.plantAnimations.raptor[this.animation(r)];
   // Native walking animation speed is movement / (.31 * originalScale).
   r.elapsed+=dt*(r.animation==='Walk'?r.speed/(.31*1.2)*(r.leaving?p.LeaveSpeedScale:1):1);
   while(r.event<timeline.events.length&&r.elapsed>=timeline.events[r.event].at){
    const event=timeline.events[r.event++].name;
    if(event==='turn')r.direction*=-1;
    if(event==='kick'){
     const z=this.targets(r,true)[0];
     if(z){if(r.charmed){z.hp=0;z.deathCause='toss';}else z.leap={fromX:z.x,fromY:rowY(z.row),toX:Math.max(cellX(p.KickEdgeColumn),z.x-p.ZombieKickDistance*BOARD.cellWidth),toRow:z.row,at:g.time,duration:.5};z.eating=false;r.kicked.set(z.id,g.time+p.SameZombieInterval);r.left--;r.leaveAt=g.time+p.MaxWonderingTime;}
    }
    const sound={step:'stepSounds',leap:r.charmed?'leapCharmSounds':'leapSounds',kick:'kickSaySounds',scratch:'rubSounds'}[event];
    if(sound)g.beach.sounds.push('raptor/'+sound);
   }
   if(r.elapsed>=timeline.duration)this.play(r,r.charmed&&!r.leaving?'Idle':'Walk');
  }
  this.raptors=this.raptors.filter(r=>r.x<1200);
 }
 animation(r:Raptor){return r.animation+(r.charmed?'_Charmed':'');}
 perfume(p:Plant){
  const g=this.g,timeline=g.props.plantAnimations.perfumeshroom.Attack,age=g.time-p.actionAt;
  if(!p.fired&&age>=timeline.events.find(e=>e.name==='explode')!.at){p.fired=true;this.perfumes.push({id:++this.serial,row:p.row,column:p.column,at:g.time});g.beach.sounds.push('perfumeshroom/burnSound');}
  if(age>=timeline.duration)p.hp=0;
 }
 nut(p:Plant){
  const g=this.g;
  if(p.action!=='food')return;
  const timeline=g.props.plantAnimations.primalwallnut.Food,elapsed=g.time-p.actionAt;
  while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
   const event=timeline.events[p.eventIndex!++].name;
   if(event==='wearArmor'){p.armor=g.props.plants.primalwallnut.ArmorToughness;g.beach.sounds.push('primalwallnut/foodSound');}
   if(event==='foodEnd'){p.action='idle';p.animation=undefined;}
  }
 }
}
