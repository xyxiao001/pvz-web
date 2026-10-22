import source from '../../public/assets/dino/dinosaurs.json';
import {BOARD,cellX,rowY,type SpawnAction,type ZombieKind} from './level';
import {isFlying,swinging} from './pirate';
import type {Game,Plant} from './model';

export const dinoArmor=(kind:ZombieKind)=>kind==='dino_armor1'||kind==='dino_armor2'||kind==='dino_armor3'?kind:null;
export interface Raptor {id:number;row:number;x:number;direction:number;animation:'Walk'|'Turn'|'Kick';elapsed:number;event:number;speed:number;left:number;leaveAt:number;leaving:boolean;detect:boolean;kicked:Map<number,number>;sayAt:number}
export class DinoBattle {
 raptors:Raptor[]=[];
 pending:{row:number;at:number}[]=[];
 private serial=0;
 constructor(private g:Game){}
 add(action:NonNullable<SpawnAction['dinosaur']>){this.pending.push({row:action.row,at:this.g.time+action.delay});}
 private play(r:Raptor,animation:Raptor['animation']){r.animation=animation;r.elapsed=0;r.event=0;}
 private targets(r:Raptor,wide=false){
  const g=this.g,rect=source.attackRect,center=r.x+rect.x*.6*(wide?r.direction:1),half=rect.w*.6*(wide?2.5:1)/2;
  return [...g.zombies,...g.westFinale.allies].filter(z=>z.hp>0&&z.row===r.row&&!z.leap&&!isFlying(z)&&!swinging(z,g.time)&&!g.props.zombies[z.kind].CannotBeKnockedBackByProjectiles&&!g.props.zombies[z.kind].CannotBeFlickedByPowerToss&&g.time>=(r.kicked.get(z.id)??0)&&Math.abs(z.x-center)<half+20).sort((a,b)=>(b.x-a.x)*r.direction);
 }
 tick(dt:number){
  const g=this.g,p=source.raptor;
  for(const item of this.pending)if(g.time>=item.at)this.raptors.push({id:++this.serial,row:item.row,x:1070,direction:1,animation:'Walk',elapsed:0,event:0,speed:p.WalkSPS+.1*(1-2*g.random()),left:p.ZombiesToKick,leaveAt:g.time+p.MaxWonderingTime,leaving:false,detect:false,kicked:new Map(),sayAt:g.time+3});
  this.pending=this.pending.filter(item=>g.time<item.at);
  for(const r of this.raptors){
   if(r.animation==='Walk'){
    if(!r.leaving&&(r.left===0||g.time>=r.leaveAt)){r.leaving=true;if(r.direction>0){this.play(r,'Turn');continue;}}
    if(!r.leaving&&r.detect&&r.x>cellX(p.WalkEdgeColumn)&&r.x<cellX(8)&&this.targets(r).length){this.play(r,r.direction<0?'Turn':'Kick');continue;}
    r.x-=r.speed*BOARD.cellWidth*dt*r.direction*(r.leaving?p.LeaveSpeedScale:1);
    if(!r.leaving&&(r.direction>0&&r.x<cellX(p.WalkEdgeColumn)||r.direction<0&&r.x>cellX(8))){r.detect=true;this.play(r,'Turn');continue;}
    if(g.time>=r.sayAt){g.beach.sounds.push('raptor/idleSaySounds');r.sayAt=g.time+3;}
   }
   const timeline=g.props.plantAnimations.raptor[r.animation];
   // Native walking animation speed is movement / (.31 * originalScale).
   r.elapsed+=dt*(r.animation==='Walk'?r.speed/(.31*1.2)*(r.leaving?p.LeaveSpeedScale:1):1);
   while(r.event<timeline.events.length&&r.elapsed>=timeline.events[r.event].at){
    const event=timeline.events[r.event++].name;
    if(event==='turn')r.direction*=-1;
    if(event==='kick'){
     const z=this.targets(r,true)[0];
     if(z){z.leap={fromX:z.x,fromY:rowY(z.row),toX:Math.max(cellX(p.KickEdgeColumn),z.x-p.ZombieKickDistance*BOARD.cellWidth),toRow:z.row,at:g.time,duration:.5};z.eating=false;r.kicked.set(z.id,g.time+p.SameZombieInterval);r.left--;r.leaveAt=g.time+p.MaxWonderingTime;}
    }
    const sound={step:'stepSounds',leap:'leapSounds',kick:'kickSaySounds',scratch:'rubSounds'}[event];
    if(sound)g.beach.sounds.push('raptor/'+sound);
   }
   if(r.elapsed>=timeline.duration)this.play(r,'Walk');
  }
  this.raptors=this.raptors.filter(r=>r.x<1200);
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
