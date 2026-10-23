import {BOARD,cellX,rowY,type PlantKind} from './level';
import type {Game,Plant,Zombie} from './model';
import {isFlying} from './pirate';

interface State {life:number;nextHit:number;foodUntil:number;swimming:boolean;ghosting:boolean;stage:number}
export class BeachFinalePlants {
  states=new Map<number,State>();
  tiles:{row:number;column:number;next:number;at:number}[]=[];
  shots:{id:number;x:number;y:number;dx:number;dy:number;damage:number;sea:boolean}[]=[];
  visuals:{id:number;name:string;animation:string;x:number;y:number;at:number}[]=[];
  shields:{id:number;plant:number;row:number;column:number;hp:number}[]=[];
  constructor(private g:Game){}
  handles(kind:PlantKind){return ['moonflower','goldleaf','ghostpepper','coldsnapdragon','seashooter','pineapple'].includes(kind);}
  private play(p:Plant,animation:string,action:Plant['action']='idle'){p.animation=animation;p.action=action;p.actionAt=this.g.time;p.eventIndex=0;}
  private idle(p:Plant){const s=this.states.get(p.id)!;return p.kind==='seashooter'?(s.swimming?'Idle':'Idle_H'):p.kind==='ghostpepper'?'Idle'+s.stage:p.kind==='pineapple'?'Idle'+Math.min(3,Math.floor(4*(1-p.hp/this.g.props.plants.pineapple.Toughness))):'Idle';}
  init(p:Plant){const g=this.g,prop=g.props.plants[p.kind];this.states.set(p.id,{life:Infinity,nextHit:0,foodUntil:0,swimming:g.beach.water(p.column),ghosting:false,stage:0});this.play(p,p.kind==='goldleaf'?'Attack':this.idle(p),p.kind==='goldleaf'?'explode':'idle');if(p.kind==='moonflower')p.nextAction=g.time+prop.ProduceCountdownStart+g.random()*prop.ProduceCountdownStartAdditional;}
  food(p:Plant){const g=this.g,s=this.states.get(p.id)!;if(p.kind==='ghostpepper'){s.life=Infinity;s.ghosting=false;s.foodUntil=g.time+g.props.plants.ghostpepper.PlantfoodDuration;this.play(p,'FoodStart','food');}else if(p.kind==='pineapple'){p.hp=g.props.plants.pineapple.Toughness;s.foodUntil=g.time+g.props.plants.pineapple.PlantfoodDuration;this.play(p,'RotateStart0','food');}else {this.play(p,'Food','food');if(p.kind==='seashooter'){p.burst=g.props.plants.seashooter.PlantfoodPeaCount;p.nextBurst=g.time;}}}
  private targets(p:Plant,rows:number,distance:number,behind=0){return this.g.zombies.filter(z=>z.hp>0&&Math.abs(z.row-p.row)<=rows&&z.x>=cellX(p.column)-behind&&z.x<=cellX(p.column)+distance);}
  private visual(name:string,animation:string,p:Plant,offset=0){this.visuals.push({id:this.g.nextEntityId(),name,animation,x:cellX(p.column)+offset,y:rowY(p.row),at:this.g.time});}
  private breath(p:Plant,food:boolean){const g=this.g,props=g.props.plants.coldsnapdragon,range=(food?3.5:2.5)*BOARD.cellWidth;for(const z of this.targets(p,1,range,20)){g.damage(z,food?props.DamagePlantfood:props.Damage);g.chill(z,props.ChillDuration);if(food)z.frozenUntil=g.time+props.FreezeDurationPlantfood;}for(const t of g.graves)if(Math.abs(t.row-p.row)<=1&&t.column>=p.column&&cellX(t.column)<=cellX(p.column)+range)t.hp-=food?props.DamagePlantfood:props.Damage;}
  private shot(p:Plant,dx:number,dy:number){const sea=this.states.get(p.id)!.swimming;this.shots.push({id:this.g.nextEntityId(),x:cellX(p.column)+20,y:rowY(p.row)-30,dx,dy,sea,damage:this.g.props.projectiles[sea?'sea_pea':'pea'].Damage});}
  private shoot(p:Plant){const g=this.g,s=this.states.get(p.id)!;this.shot(p,1,0);for(const dir of [-1,1]){const target=s.swimming?g.zombies.filter(z=>z.hp>0&&(z.row-p.row)*dir>=0&&z.x>cellX(p.column)).sort((a,b)=>a.x-b.x)[0]:undefined;const dx=target?target.x-cellX(p.column):1,dy=target?rowY(target.row)-rowY(p.row):0,d=Math.hypot(dx,dy);this.shot(p,dx/d,dy/d);}g.beach.sounds.push('seashooter/shootSound');}
  reflect(p:Plant,damage:number){if(p.kind!=='pineapple')return false;const g=this.g,s=this.states.get(p.id)!;s.foodUntil=g.time+g.props.plants.pineapple.SpinDuration;this.play(p,'RotateStart'+s.stage,'shoot');this.shots.push({id:g.nextEntityId(),x:cellX(p.column)+25,y:rowY(p.row)-30,dx:1,dy:0,damage,sea:false});g.beach.sounds.push('pineapple/hit');return true;}
  block(z:Zombie,dt:number){const g=this.g,shield=this.shields.find(s=>s.hp>0&&s.row===z.row&&Math.abs(z.x-cellX(s.column))<40);if(!shield)return false;z.eating=true;shield.hp-=g.props.zombies[z.kind].EatDPS*dt;return true;}
  tickPlant(p:Plant,dt:number){
    if(p.hp<=0)return;
    const g=this.g,s=this.states.get(p.id)!,props=g.props.plants[p.kind];p.age+=dt;
    if(p.kind==='moonflower'&&p.action==='idle'&&g.time>=p.nextAction){this.play(p,'Produce','produce');p.nextAction=g.time+props.ProduceInterval+g.random()*props.ProduceIntervalAdditional;}
    if(p.kind==='coldsnapdragon'&&p.action==='idle'&&g.time>=p.nextAction&&this.targets(p,1,2.5*BOARD.cellWidth,20).some(z=>!isFlying(z))){this.play(p,'Attack','shoot');p.nextAction=g.time+props.AttackInterval+g.random()*props.AttackIntervalAdditional;}
    if(p.kind==='seashooter'){
      const water=g.beach.water(p.column);if(s.swimming!==water&&p.action!=='food'){s.swimming=water;this.play(p,water?'Trans_H':'Trans','grow');}
      if(p.action==='idle'&&g.time>=p.nextAction&&this.targets(p,s.swimming?4:0,1500,0).length){this.play(p,s.swimming?'Shoot':'Shoot_H','shoot');p.nextAction=g.time+props.ShootInterval+g.random()*props.ShootIntervalAdditional;}
      if(p.action==='food'){while(p.burst>0&&g.time>=p.nextBurst){for(let i=0;i<3;i++){const a=(g.random()-.5)*Math.PI;this.shot(p,Math.cos(a),Math.sin(a));}p.burst--;p.nextBurst+=2/props.PlantfoodPeaCount;}if(!p.burst)this.play(p,this.idle(p));return;}
    }
    if(p.kind==='ghostpepper'){
      if(p.action!=='food'&&p.action!=='explode'){s.life-=dt;s.stage=s.life>props.Lifetime*2/3?0:s.life>props.Lifetime/3?1:2;if(s.life<=0){s.ghosting=false;this.play(p,'Death','explode');}}
      const food=p.action==='food',range=(food?2.5:2)*BOARD.cellWidth,targets=this.targets(p,food?1:0,range,range),tombs=g.graves.filter(t=>t.hp>0&&Math.abs(t.row-p.row)<=(food?1:0)&&Math.abs(t.column-p.column)<=(food?2.5:2));
      if(p.action==='idle'&&(targets.length||tombs.length)){if(!Number.isFinite(s.life))s.life=props.Lifetime;this.play(p,'AttackStart'+s.stage,'shoot');}
      if(s.ghosting&&g.time>=s.nextHit){const damage=props.GhostDamage*(food?props.PlantfoodDamageMult:1);for(const z of targets)g.damage(z,damage);for(const t of tombs)t.hp-=damage;s.nextHit=g.time+props.GhostDamageCooldownTime;}
      if(s.ghosting&&!food&&!targets.length&&!tombs.length){s.ghosting=false;this.play(p,'AttackEnd'+s.stage,'grow');}
      if(food&&g.time>=s.foodUntil){s.ghosting=false;this.play(p,'FoodEnd','grow');}
    }
    if(p.kind==='pineapple'){s.stage=Math.min(3,Math.floor(4*(1-p.hp/props.Toughness)));if((p.action==='food'||p.animation==='RotateLoop')&&g.time>=s.foodUntil)this.play(p,'RotateEnd0','grow');else if(p.action==='idle')p.animation=this.idle(p);}
    if(p.action==='idle'||p.animation==='AttackLoop'||p.animation==='FoodLoop'||p.animation==='RotateLoop')return;
    const animation=p.animation!,timeline=g.props.plantAnimations[p.kind][animation],elapsed=g.time-p.actionAt;
    while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){const event=timeline.events[p.eventIndex!++].name;
      if(p.kind==='moonflower'){
        if(event==='Produce'){const count=g.plants.filter(q=>q.hp>0&&g.modern.shadowPlant(q)&&Math.abs(q.row-p.row)<=1&&Math.abs(q.column-p.column)<=1).length;g.dropSun(cellX(p.column),rowY(p.row)-60,props.SunValueList[Math.min(3,count-1)],'plant');}
        if(event==='produceSound')g.beach.sounds.push('moonflower/produceSound');
        if(event==='foodEnd'){this.shields=this.shields.filter(s=>s.plant!==p.id);for(const dr of [-1,0,1])for(const dc of [-1,1])if(p.row+dr>=0&&p.row+dr<5)this.shields.push({id:g.nextEntityId(),plant:p.id,row:p.row+dr,column:p.column+dc,hp:5000});}
      }
      if(p.kind==='goldleaf'){if(event==='place'){this.tiles=this.tiles.filter(t=>t.row!==p.row||t.column!==p.column);this.tiles.push({row:p.row,column:p.column,next:g.time,at:-Infinity});}if(event==='attack'||event==='release')g.beach.sounds.push('goldleaf/'+event);if(event==='die'){p.hp=0;return;}}
      if(p.kind==='coldsnapdragon'){if(event==='attack')this.breath(p,false);if(event==='foodHit')this.breath(p,true);if(event==='attackPar')this.visual('coldBreath','Play1',p,BOARD.cellWidth);if(event==='foodAttack')for(const dr of [-1,0,1])if(p.row+dr>=0&&p.row+dr<5)this.visual('coldFood','Play',{...p,row:p.row+dr},3.5*BOARD.cellWidth);}
      if(p.kind==='seashooter'&&event==='shoot0')this.shoot(p);
      if(p.kind==='ghostpepper'){
        if(event==='ghost'){s.ghosting=true;g.beach.sounds.push('ghostpepper/attackStart');}
        if(event==='attackLP'||event==='foodLP'){this.play(p,event==='attackLP'?'AttackLoop':'FoodLoop',p.action);return;}
        if(event==='expl'){for(const z of this.targets(p,1,1.5*BOARD.cellWidth,1.5*BOARD.cellWidth))g.damage(z,props.ExplodeDamage);for(const t of g.graves)if(Math.abs(t.row-p.row)<=1&&Math.abs(t.column-p.column)<=1)t.hp-=props.ExplodeDamage;g.beach.sounds.push('ghostpepper/explode');}
        if(event==='die'){p.hp=0;return;}
      }
    }
    if(elapsed>=timeline.duration){if(p.kind==='pineapple'&&animation.startsWith('RotateStart'))this.play(p,'RotateLoop',p.action);else this.play(p,this.idle(p));}
  }
  tick(dt:number){const g=this.g;
    for(const t of this.tiles)if(g.time>=t.next&&g.plants.some(p=>p.hp>0&&p.kind!=='goldleaf'&&p.row===t.row&&p.column===t.column)){g.dropSun(cellX(t.column),rowY(t.row)-20,50,'plant');t.next=g.time+20;t.at=g.time;}
    for(const s of this.shots){s.x+=s.dx*8*BOARD.cellWidth*dt;s.y+=s.dy*8*BOARD.cellWidth*dt;const z=g.zombies.find(z=>z.hp>0&&(!g.beach.diving(z)||s.sea)&&Math.abs(z.x-s.x)<25&&Math.abs(rowY(z.row)-30-s.y)<35),t=g.graves.find(t=>t.hp>0&&Math.abs(cellX(t.column)-s.x)<25&&Math.abs(rowY(t.row)-30-s.y)<35);if(z){if(!g.beach.surfers.blockShot(z,s.damage,s.x-30))g.damage(z,s.damage);s.x=1400;}else if(t){t.hp-=s.damage;s.x=1400;}}
    this.shots=this.shots.filter(s=>s.x<1250&&s.y>0&&s.y<800);
    this.visuals=this.visuals.filter(v=>g.time-v.at<g.props.plantAnimations[v.name][v.animation].duration);
    this.shields=this.shields.filter(s=>s.hp>0&&g.plants.some(p=>p.id===s.plant&&p.hp>0));
    for(const [id] of this.states)if(!g.plants.some(p=>p.id===id))this.states.delete(id);
  }
}
