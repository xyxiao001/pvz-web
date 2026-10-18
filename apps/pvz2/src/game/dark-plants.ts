import {BOARD,cellX,rowY,type PlantKind} from './level';
import type {Game,Plant,Zombie} from './model';
interface State {elapsed:number;event:number;chews:number[];hiding:boolean;iron:boolean;planted:boolean;until:number;swallowed:Set<number>;moving?:{x:number;y:number;at:number}}
interface Spore {id:number;row:number;x:number;y:number;speed:number;knockback:boolean;hitAt?:number}
export class DarkPlants {
  states=new Map<number,State>();
  spores:Spore[]=[];
  sounds:string[]=[];
  selected:number|null=null;
  constructor(private g:Game){}
  handles(kind:PlantKind){return ['scaredyshroom','chomper','floawerPot'].includes(kind);}
  init(p:Plant){this.states.set(p.id,{elapsed:0,event:0,chews:[],hiding:false,iron:false,planted:false,until:0,swallowed:new Set()});this.play(p,'Idle');}
  private play(p:Plant,animation:string,action:Plant['action']='idle'){p.animation=animation;p.action=action;p.actionAt=this.g.time;const s=this.states.get(p.id)!;s.elapsed=0;s.event=0;}
  private idle(p:Plant){const s=this.states.get(p.id)!;return p.kind==='chomper'?(s.chews.length?'Chewing':'Idle'):p.kind==='floawerPot'?`Idle${s.planted?'_Planted':''}${s.iron?'_Iron':''}`:s.hiding?'Hiding':'Idle';}
  rate(p:Plant){return p.kind==='chomper'&&['Attack','FoodPullStart','FoodPullEndPushStart'].includes(p.animation!)?2:1;}
  occupant(p:Plant){return this.g.plants.find(q=>q!==p&&q.row===p.row&&q.column===p.column&&q.hp>0);}
  foodable(p:Plant){return p.kind!=='floawerPot'||!this.states.get(p.id)!.iron&&!this.occupant(p);}
  food(p:Plant,chain=true){const s=this.states.get(p.id)!,prop=this.g.props.plants[p.kind];
    if(p.kind==='scaredyshroom'){
      this.play(p,'Food','food');p.burst=prop.PlantfoodSporeCount;p.nextBurst=this.g.time+2/p.burst;
      if(chain){this.sounds.push('scaredyshroom/foodSound');for(const q of this.g.plants)if(q!==p&&q.kind===p.kind&&q.hp>0&&q.sheep===undefined&&Math.abs(q.row-p.row)<=1&&Math.abs(q.column-p.column)<=1)this.food(q,false);}
    }else if(p.kind==='chomper'){s.chews=[];s.swallowed.clear();this.play(p,'FoodPullStart','food');this.sounds.push('chomper/foodPullStartSound','chomper/foodPullSkillSound');}
    else {s.iron=true;p.hp=prop.ToughnessPlantfooded;this.play(p,'Food','food');}
  }
  select(row:number,column:number){const p=this.g.plants.find(p=>p.kind==='floawerPot'&&p.row===row&&p.column===column&&p.hp>0);if(!p||!this.states.get(p.id)!.iron||this.occupant(p)||p.action==='food'||this.states.get(p.id)!.moving)return false;this.selected=p.id;this.play(p,'Locating');return true;}
  cancel(){const p=this.g.plants.find(p=>p.id===this.selected);if(p)this.play(p,this.idle(p));this.selected=null;}
  move(row:number,column:number){const g=this.g,p=g.plants.find(p=>p.id===this.selected);this.cancel();if(!p||row<0||row>=5||column<0||column>=9||g.plants.some(q=>q.row===row&&q.column===column)||g.graves.some(t=>t.row===row&&t.column===column)||g.level.mold.some(t=>t.row===row&&t.column===column)||!g.dark.canPlant(p.kind,row,column)||g.dark.blocks(row,column))return false;const s=this.states.get(p.id)!;s.moving={x:cellX(p.column),y:rowY(p.row),at:g.time};p.row=row;p.column=column;this.play(p,'Moving');return true;}
  private targets(p:Plant){return this.g.zombies.filter(z=>z.hp>0&&!z.reversed&&this.g.inLane(z,p.row)&&z.x>=cellX(p.column)-20).sort((a,b)=>a.x-b.x);}
  private spit(p:Plant,knockback:boolean,food=false){this.spores.push({id:this.g.nextEntityId(),row:p.row,x:cellX(p.column)+17,y:rowY(p.row)-36+(food?15-30*this.g.random():0),speed:(8+(food?3*this.g.random():0))*60,knockback});}
  private chomp(p:Plant,z:Zombie){const prop=this.g.props.zombies[z.kind],s=this.states.get(p.id)!;
    if(!prop.CannotBeSwallowedByChomper){z.hp=0;z.armor=0;z.deathCause='swallow';if(p.action!=='food'&&!prop.CanBeEasilySwallowedByChomper)s.chews.push(this.g.props.plants.chomper.ChewTimePerZombie);return true;}
    this.g.damage(z,this.g.props.plants.chomper.ChompFailDamage);return false;
  }
  tickPlant(p:Plant,dt:number){const g=this.g,s=this.states.get(p.id)!,prop=g.props.plants[p.kind];
    if(p.kind==='floawerPot'){
      if(s.moving){if(g.time-s.moving.at<prop.MoveToPosTime)return;delete s.moving;this.play(p,this.idle(p));}
      const planted=!!this.occupant(p);if(planted!==s.planted){s.planted=planted;this.play(p,(planted?'Plant':'Recover')+(s.iron?'_Iron':''),'grow');}
    }
    if(p.kind==='scaredyshroom'){
      if(p.action==='food'){while(p.burst>0&&g.time>=p.nextBurst){this.spit(p,true,true);p.burst--;p.nextBurst+=2/prop.PlantfoodSporeCount;}if(p.burst===0)this.play(p,this.idle(p));else return;}
      const scary=g.zombies.filter(z=>z.hp>0&&!z.reversed&&Math.abs(z.row-p.row)<=1&&Math.abs(z.x-cellX(p.column))<1.5*BOARD.cellWidth+18);
      if(p.action==='idle'&&scary.length&&!s.hiding){s.hiding=true;this.play(p,scary.some(z=>z.x<cellX(p.column))?'HideStartL':'HideStartR','grow');this.sounds.push('scaredyshroom/hideSound');}
      if(s.hiding&&!scary.length&&!p.animation!.startsWith('HideEnd')){s.hiding=false;this.play(p,'HideEnd','grow');this.sounds.push('scaredyshroom/hideSound');}
      if(p.action==='idle'&&!s.hiding&&g.time>=p.nextAction&&(this.targets(p).length||g.graves.some(t=>t.row===p.row&&t.column>=p.column))){p.nextAction=g.time+prop.ShootInterval+g.random()*prop.ShootIntervalAdditional;this.play(p,g.random()<=prop.KnockbackChance?'Shoot':'Shoot2','shoot');}
    }
    if(p.kind==='chomper'){
      if(p.action==='food'){
        if(p.animation==='FoodPulling'){
          const candidates=this.targets(p).filter(z=>z.kind!=='dark_king'&&z!==g.boss?.zombie&&!g.props.zombies[z.kind].CannotBeTossedByCitron&&!s.swallowed.has(z.id)).slice(0,prop.PlantfoodSwallowCount-s.swallowed.size);
          for(const z of candidates){z.stunnedUntil=g.time+.2;z.x-=prop.PlantfoodPullSPS*BOARD.cellWidth*dt;if(z.x<=cellX(p.column)+15){this.chomp(p,z);s.swallowed.add(z.id);}}
          if(g.time>=s.until||s.swallowed.size>=prop.PlantfoodSwallowCount){this.play(p,'FoodPullEndPushStart','food');this.sounds.push('chomper/foodSwallowSound');}
        }else if(p.animation==='FoodPushing'){for(const z of this.targets(p))if(z.kind!=='dark_king'&&z!==g.boss?.zombie&&!g.props.zombies[z.kind].CannotBeTossedByCitron)z.x+=prop.PlantfoodPushSPS*BOARD.cellWidth*dt;if(g.time>=s.until)this.play(p,'FoodPushEnd','food');}
      }else {
        const count=s.chews.length;if(p.animation!=='Attack')s.chews=s.chews.map(t=>t-dt).filter(t=>t>0);
        if(count>s.chews.length&&p.action==='idle')this.play(p,'ChewEnd','grow');
        if(p.action==='idle'&&s.chews.length<prop.MaxContainZombieCount&&(this.targets(p).some(z=>z.x<cellX(p.column)+1.5*BOARD.cellWidth)||g.graves.some(t=>t.row===p.row&&t.column>=p.column&&t.column<=p.column+1)))this.play(p,'Attack','shoot');
      }
    }
    const animation=p.animation!,timeline=g.props.plantAnimations[p.kind][animation];s.elapsed+=dt*this.rate(p);
    while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const e=timeline.events[s.event++].name;
      if(e==='Shoot'||e==='ShootKnockback')this.spit(p,e==='ShootKnockback');
      if(e==='ShootSound')this.sounds.push('scaredyshroom/shootSound');
      if(e==='chomp'){
        const z=this.targets(p).find(z=>z.x<cellX(p.column)+1.5*BOARD.cellWidth);let swallowed=false;
        if(z)swallowed=this.chomp(p,z);else {const grave=g.graves.find(t=>t.row===p.row&&t.column>=p.column&&t.column<=p.column+1);if(grave)grave.hp-=prop.ChompFailDamage;}
        this.sounds.push('chomper/chompSound');this.play(p,swallowed&&s.chews.length?'AttackChewStart':'AttackEmpty','grow');break;
      }
      if(['chew','swallow','hiccup','chewStart'].includes(e))this.sounds.push('chomper/'+e+'Sound');
      if(e==='pullBegin'){this.play(p,'FoodPulling','food');s.until=g.time+prop.PlantfoodPullDuration;break;}
      if(e==='pushStart'){this.play(p,'FoodPushing','food');s.until=g.time+prop.PlantfoodPushDuration;this.sounds.push('chomper/foodPushSound');break;}
      if(e==='foodEnd'||e==='FoodEnd'){this.play(p,this.idle(p));break;}
    }
    if(animation===p.animation&&s.elapsed>=timeline.duration){if(p.action==='food'||p.action==='idle'){s.elapsed=0;s.event=0;}else this.play(p,this.idle(p));}
  }
  tick(dt:number){const g=this.g;
    for(const shot of this.spores){if(shot.hitAt!==undefined)continue;const old=shot.x;shot.x+=shot.speed*dt;
      const target=g.zombies.filter(z=>z.hp>0&&g.inLane(z,shot.row)&&z.x-18>=old-12&&z.x-18<=shot.x+12).sort((a,b)=>a.x-b.x)[0];
      const grave=g.graves.filter(t=>t.hp>0&&t.row===shot.row&&cellX(t.column)>=old-24&&cellX(t.column)<=shot.x+24).sort((a,b)=>a.column-b.column)[0];
      if(grave&&(!target||cellX(grave.column)<target.x)){grave.hp-=g.props.projectiles.scaredyshroom_spore.Damage;shot.hitAt=g.time;}
      else if(target){g.damage(target,g.props.projectiles.scaredyshroom_spore.Damage);if(shot.knockback&&target.kind!=='dark_king'&&target!==g.boss?.zombie&&!g.props.zombies[target.kind].CannotBeKnockedBackByProjectiles)target.x+=g.props.plants.scaredyshroom.KnockbackDistance*BOARD.cellWidth;shot.hitAt=g.time;}
    }
    this.spores=this.spores.filter(s=>s.x<1300&&(s.hitAt===undefined||g.time-s.hitAt<.3));
    for(const id of this.states.keys())if(!g.plants.some(p=>p.id===id))this.states.delete(id);
  }
}
