import {BOARD,cellX,rowY,type PlantKind,type ZombieKind} from './level';
import type {Game,Plant,Zombie} from './model';
import potionProperties from '../../public/assets/dark/potions.json';
import graveProperties from '../../public/assets/dark/graves.json';
import projectileRules from '../../public/assets/dark/jester-projectiles.json';
export const darkArmor=(kind:ZombieKind)=>kind==='dark_armor4'?'dark_armor4':kind==='dark_armor3'?'dark_armor3':kind==='dark_armor1'?'dark_armor1':kind==='dark_armor2'?'dark_armor2':null;
export const graveArt=(kind?:string)=>kind==='gravestoneSunOnDestruction'?'graveSun':kind==='gravestonePlantfoodOnDestruction'?'graveFood':'grave';
export interface Potion {id:number;kind:'zombiepotion_speed'|'zombiepotion_toughness';row:number;column:number;animation:'Spawn'|'Idle'|'Consume'|'Splat';at:number;dropped:boolean}
export interface DarkZombie {speed:number;toughness:number;scaleFrom:number;scaleAt:number;bean:boolean;health:number;sun:number;blastAt:number}
interface Wizard {animation:'Walk'|'Attack';at:number;elapsed:number;cooldown:number;first:boolean;target:number|null;event:number}
interface Sheep {id:number;plant:Plant;wizard:number;at:number;animation:'Spawn'|'Idle0'|'Die'}
interface Jester {animation:string;at:number;until:number}
interface Reflected {id:number;owner:Zombie;name:string;armature?:string;x:number;y:number;fromX:number;fromY:number;at:number;damage:number;released:boolean;friendly:boolean}
export class DarkBattle {
  readonly #game:Game;
  private serial=0;
  kings=new Map<number,{animation:string;at:number;elapsed:number;event:number;cooldown:number;given:number|null;effectAt:number}>();
  knightEffects:{id:number;target:number;at:number;animation:string}[]=[];
  canPlant(kind:PlantKind,row:number,column:number){return !this.#game.zombies.some(z=>z.kind==='dark_king'&&z.hp>0&&z.row===row&&Math.abs(z.x-cellX(column))<BOARD.cellWidth/2&&!this.#game.props.zombies.dark_king.PlantablePlants.includes(kind));}
  private kingTargets(z:Zombie){const g=this.#game,p=g.props.zombies.dark_king;return g.zombies.filter(t=>t.hp>0&&p.ValidKnightTargets.includes(t.kind)&&!(t.kind==='dark_armor3'&&t.armor>0)&&Math.abs(t.row-z.row)<=1&&t.x<=z.x+BOARD.cellWidth/2&&t.x>=z.x+(0.5-p.KnightingAreaW)*BOARD.cellWidth);}
  private tickKings(dt:number){
    const g=this.#game;
    this.knightEffects=this.knightEffects.filter(f=>g.time-f.at<g.props.plantAnimations.knightEffect[f.animation].duration);
    for(const z of g.zombies){const s=this.kings.get(z.id);if(!s||z.hp<=0||g.time<z.frozenUntil||g.time<(z.stunnedUntil??0)||g.time<(z.butteredUntil??0))continue;
      const rate=(g.time<z.chilledUntil?.5:1)*Math.pow(1.5,z.dark?.speed??0),play=(name:string)=>{s.animation=name;s.at=g.time;s.elapsed=0;s.event=0;};
      if(s.animation==='Idle'){s.cooldown-=dt*rate;if(s.cooldown<=0&&this.kingTargets(z).length)play('Attack');}
      if(s.given!==null&&g.time>=s.effectAt&&s.cooldown>0){const t=g.zombies.find(t=>t.id===s.given&&t.hp>0&&t.armor>0);if(t){this.knightEffects.push({id:++this.serial,target:t.id,at:g.time,animation:'Play'+Math.floor(g.random()*4)});this.sounds.push('darkKing/knightEffectSounds');}s.effectAt=g.time+.5;}
      s.elapsed+=dt*rate;const timeline=g.props.plantAnimations.darkKing[s.animation];
      while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const e=timeline.events[s.event++].name;
        if(e==='Idle'){play('Idle');break;}
        if(e==='smash'){for(const p of g.plants)if(p.row===z.row&&Math.abs(cellX(p.column)-z.x)<40)p.hp=0;for(const t of g.graves)if(t.row===z.row&&Math.abs(cellX(t.column)-z.x)<40)t.hp=0;}
        if(e==='give'){const targets=this.kingTargets(z),t=targets[Math.floor(g.random()*targets.length)];if(t){t.kind='dark_armor3';t.armor=g.props.armors.dark_armor3.Toughness;t.magnetized=false;s.given=t.id;s.effectAt=g.time;s.cooldown=g.props.zombies.dark_king.DelayBetweenKnightings;}}
      }
      if(s.elapsed>=timeline.duration)play('Idle');
    }
    for(const [id] of this.kings)if(!g.zombies.some(z=>z.id===id))this.kings.delete(id);
  }
  wizards=new Map<number,Wizard>();
  sheep:Sheep[]=[];
  links:{id:number;x:number;y:number;toX:number;toY:number;at:number}[]=[];
  spawn(z:Zombie){if(z.kind==='dark_king'){z.x=cellX(8);this.kings.set(z.id,{animation:'Spawn',at:this.#game.time,elapsed:0,event:0,cooldown:0,given:null,effectAt:0});}if(z.kind==='dark_wizard'||z.kind==='dark_wizard_veteran'){const p=this.#game.props.zombies[z.kind];this.wizards.set(z.id,{animation:'Walk',at:this.#game.time,elapsed:0,cooldown:p.TimeBeforeFirst+this.#game.random()*p.TimeBeforeFirstAdditional,first:true,target:null,event:0});}}
  private sheepable(p:Plant){return p.hp>0&&p.sheep===undefined&&p.action!=='food'&&!p.hidden&&!p.leap&&!this.#game.props.plants[p.kind].CannotBeSheepenedByWizard&&!this.#game.plants.some(q=>q.row===p.row&&q.column===p.column&&q.hp>0&&this.#game.props.plants[q.kind].CannotBeSheepenedByWizard);}
  private wizardTarget(z:Zombie,s:Wizard){const plants=this.#game.plants.filter(p=>this.sheepable(p));return plants.sort((a,b)=>Number(cellX(a.column)>z.x)-Number(cellX(b.column)>z.x)||(s.first?Math.abs(a.row-z.row)-Math.abs(b.row-z.row):0)||b.column-a.column)[0];}
  private tickWizards(dt:number){
    const g=this.#game;
    for(const sheep of this.sheep){if(sheep.animation!=='Die'&&!g.zombies.some(z=>z.id===sheep.wizard&&z.hp>0)){delete sheep.plant.sheep;sheep.animation='Die';sheep.at=g.time;}else if(sheep.animation==='Spawn'&&g.time-sheep.at>=g.props.plantAnimations.wizardSheep.Spawn.duration){sheep.animation='Idle0';sheep.at=g.time;}}
    this.sheep=this.sheep.filter(s=>s.animation!=='Die'||g.time-s.at<g.props.plantAnimations.wizardSheep.Die.duration);
    this.links=this.links.filter(l=>g.time-l.at<g.props.plantAnimations.wizardLink.Play1.duration);
    for(const z of g.zombies){const s=this.wizards.get(z.id);if(!s||z.hp<=0||z.leap||g.time<z.frozenUntil||g.time<(z.stunnedUntil??0)||g.time<(z.butteredUntil??0))continue;
      const prop=g.props.zombies[z.kind],rate=(g.time<z.chilledUntil?.5:1)*Math.pow(1.5,z.dark?.speed??0);
      if(s.animation==='Walk'){
        if(z.x>cellX(9))continue;
        s.cooldown-=dt*rate;const close=g.plants.find(p=>this.sheepable(p)&&p.row===z.row&&Math.abs(z.x-cellX(p.column))<38);
        const target=close??(s.cooldown<=0?this.wizardTarget(z,s):undefined);
        if(target){s.target=target.id;s.animation='Attack';s.at=g.time;s.elapsed=0;s.event=0;z.eating=false;}
      }else{
        s.elapsed+=dt*rate;const timeline=g.props.plantAnimations[z.kind==='dark_wizard_veteran'?'darkWizardVeteran':'darkWizard'].Attack;
        while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const e=timeline.events[s.event++].name;
          if(e==='charge'||e==='chargeSay'||e==='magic')this.sounds.push((z.kind==='dark_wizard_veteran'?'darkWizardVeteran':'darkWizard')+'/'+(e==='charge'?'chargeSounds':e==='chargeSay'?'chargeSaySounds':'magicSounds'));
          if(e==='magic'){let p=g.plants.find(p=>p.id===s.target&&this.sheepable(p));p??=this.wizardTarget(z,s);if(p){p.sheep=z.id;this.sheep.push({id:++this.serial,plant:p,wizard:z.id,at:g.time,animation:'Spawn'});this.links.push({id:++this.serial,x:z.x-18,y:rowY(z.row)-100,toX:cellX(p.column),toY:rowY(p.row)-40,at:g.time});this.visual('wizardHit',cellX(p.column),rowY(p.row));s.cooldown=prop.TimeBetween+g.random()*prop.TimeBetweenAdditional;}s.first=false;}
        }
        if(s.elapsed>=timeline.duration){s.animation='Walk';s.at=g.time;}
      }
    }
    for(const [id] of this.wizards)if(!g.zombies.some(z=>z.id===id))this.wizards.delete(id);
  }
  peanutStage(p:Plant){return Math.max(0,Math.min(3,4-Math.ceil(p.hp/this.#game.props.plants.peanut.Toughness*4)));}
  peanutFood(p:Plant){const g=this.#game;p.hp=g.props.plants.peanut.Toughness;p.armor=g.props.plants.peanut.ArmorToughness;this.play(p,'FoodStart','food');p.nextAction=Infinity;}
  tickPeanut(p:Plant,dt:number){
    const g=this.#game,prop=g.props.plants.peanut,stage=this.peanutStage(p);p.age+=dt;
    const shoot=(food:boolean)=>{g.peas.push({id:g.nextEntityId(),row:p.row,x:cellX(p.column)+20,y:rowY(p.row)-49+(food?(g.random()-.5)*16:0),damage:20,powered:food,peanut:true,speed:(food?8+g.random()*3:8)*BOARD.cellWidth});};
    if(p.action==='idle'){p.animation='Idle'+stage;if(g.time>=p.nextAction&&(g.zombies.some(z=>g.inLane(z,p.row)&&z.hp>0&&z.x>cellX(p.column)-20&&z.x<cellX(p.column)+4.5*BOARD.cellWidth)||g.graves.some(t=>t.hp>0&&t.row===p.row&&t.column>p.column&&t.column-p.column<=4.5))){p.variant=!p.variant;this.play(p,'Shoot'+stage+(stage<2&&p.variant?'1':'0'),'shoot');p.nextAction=g.time+(stage<2?prop.ShootInterval:prop.ShootIntervalSemi)+g.random()*(stage<2?prop.ShootIntervalAdditional:prop.ShootIntervalSemiAdditional);}}
    if(p.animation==='FoodLoop'){while(p.burst>0&&g.time>=p.nextBurst){shoot(true);p.burst--;p.nextBurst+=2/prop.PlantfoodPeaCount;}if(g.time-p.actionAt>=2){this.play(p,'FoodEnd','food');this.sounds.push('peanut/foodEnd');}return;}
    const timeline=g.props.plantAnimations.peanut[p.animation!],elapsed=g.time-p.actionAt;
    while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){const event=timeline.events[p.eventIndex!++].name;if(event==='Shoot'){shoot(false);this.sounds.push('peanut/shoot');}if(event==='foodShoot'){this.play(p,'FoodLoop','food');p.burst=prop.PlantfoodPeaCount;p.nextBurst=g.time;this.sounds.push('peanut/food');return;}}
    if(p.action!=='idle'&&elapsed>=timeline.duration){if(p.animation==='FoodEnd')p.nextAction=g.time;this.play(p,'Idle'+stage);}
  }

  potions:Potion[]=[];
  private nextPotion=Infinity;
  beanFood=new Set<number>();
  zombie(z:Zombie){return z.dark??= {speed:0,toughness:0,scaleFrom:1,scaleAt:this.#game.time,bean:false,health:z.hp+z.armor,sun:0,blastAt:Infinity};}
  scale(z:Zombie){if(!z.dark)return 1;const s=z.dark;return s.scaleFrom+(Math.pow(1.1,s.speed+s.toughness)-s.scaleFrom)*Math.min(1,(this.#game.time-s.scaleAt)/.2);}
  private shuffle<T>(values:T[]){for(let i=values.length-1;i>0;i--){const j=Math.floor(this.#game.random()*(i+1));[values[i],values[j]]=[values[j],values[i]];}return values;}
  private occupied(row:number,column:number){const g=this.#game;return g.plants.some(p=>p.hp>0&&p.row===row&&p.column===column)||g.graves.some(p=>p.hp>0&&p.row===row&&p.column===column)||this.blocks(row,column);}
  blocks(row:number,column:number){return this.potions.some(p=>p.row===row&&p.column===column&&(p.animation==='Spawn'||p.animation==='Idle'));}
  private resetPotionTimer(){const g=this.#game,t=g.level.potions!.PotionSpawnTimer;this.nextPotion=g.time+t.Min+g.random()*(t.Max-t.Min);}
  private spawnPotion(row:number,column:number){const g=this.#game,types=g.level.potions!.PotionTypes,kind=types[Math.floor(g.random()*types.length)];if(this.occupied(row,column))return false;this.potions.push({id:++this.serial,kind,row,column,animation:'Spawn',at:g.time,dropped:false});return true;}
  initLevel(){const p=this.#game.level.potions;if(!p)return;this.resetPotionTimer();const cells:{row:number;column:number}[]=[];for(let r=0;r<Math.ceil(p.MaxPotionCount/5)+1&&r<9;r++)for(let row=0;row<5;row++)for(let weight=0;weight<10-r;weight++)cells.push({row,column:9-r});let count=p.InitialPotionCount;for(const cell of this.shuffle(cells)){if(count===0)break;if(this.spawnPotion(cell.row,cell.column))count--;}}
  eatPotion(z:Zombie){const g=this.#game;const p=this.potions.find(p=>p.dropped&&(p.animation==='Idle'||p.animation==='Spawn')&&p.row===z.row&&Math.abs(z.x-cellX(p.column)-8)<30&&(p.kind==='zombiepotion_speed'?(z.dark?.speed??0):(z.dark?.toughness??0))<potionProperties[p.kind].MaxEnchantLevel);if(!p)return false;const s=this.zombie(z);s.scaleFrom=this.scale(z);s.scaleAt=g.time;if(p.kind==='zombiepotion_speed')s.speed++;else s.toughness++;p.animation='Consume';p.at=g.time;this.sounds.push((p.kind==='zombiepotion_speed'?'potionSpeed':'potionToughness')+'/consume');z.eating=true;return true;}
  eaten(p:Plant,z:Zombie){if(p.kind!=='sunbean')return;const s=this.zombie(z);s.bean=true;s.health=z.hp+z.armor;if(this.beanFood.has(p.id)){s.blastAt=this.#game.time+1;z.stunnedUntil=s.blastAt;this.visual('sunbeanBlast',z.x,rowY(z.row)-80);this.sounds.push('sunbean/burn','sunbean/burnStart');}else this.sounds.push('sunbean/buff','sunbean/buffMusic');}
  tickBean(p:Plant,dt:number){p.age+=dt;if(p.action==='food'){const g=this.#game,t=g.props.plantAnimations.sunbean.Food;if(g.time-p.actionAt>=t.events.find(e=>e.name==='foodEnd')!.at){this.play(p,'FoodLoop');this.sounds.push('sunbean/foodEnd');}}}
  private tickPotions(){const g=this.#game;for(const p of this.potions){const name=p.kind==='zombiepotion_speed'?'potionSpeed':'potionToughness',t=g.props.plantAnimations[name][p.animation];if(p.animation==='Spawn'&&!p.dropped&&g.time-p.at>=t.events.find(e=>e.name==='drop')!.at){p.dropped=true;this.sounds.push(name+'/drop');}if(p.animation==='Spawn'&&g.time-p.at>=t.duration){p.animation='Idle';p.at=g.time;}if((p.animation==='Spawn'||p.animation==='Idle')&&g.graves.some(t=>t.hp>0&&t.row===p.row&&t.column===p.column)){p.animation='Splat';p.at=g.time;this.sounds.push(name+'/splat');}}
    this.potions=this.potions.filter(p=>p.animation==='Spawn'||p.animation==='Idle'||g.time-p.at<g.props.plantAnimations[p.kind==='zombiepotion_speed'?'potionSpeed':'potionToughness'][p.animation].duration);
    if(g.level.potions&&g.time>=this.nextPotion){this.resetPotionTimer();if(this.potions.filter(p=>p.animation==='Spawn'||p.animation==='Idle').length<g.level.potions.MaxPotionCount){for(let col=8;col>=0;col--){let placed=false;for(const row of this.shuffle([0,1,2,3,4]))if(this.spawnPotion(row,col)){placed=true;break;}if(placed)break;}}}
  }
  settleBeans(){const g=this.#game;for(const z of g.zombies){const s=z.dark;if(!s?.bean)continue;if(g.time>=s.blastAt&&z.hp>0){z.hp=0;z.armor=0;z.deathCause='potato';this.sounds.push('sunbean/blastSounds');}const health=z.hp<=0?0:z.hp+z.armor;s.sun+=Math.max(0,s.health-health)*g.props.plants.sunbean.SunPerHitpoint;s.health=health;const value=Math.floor((s.sun+1e-8)/5)*5;if(value>=5){g.dropSun(z.x,rowY(z.row)-65,value,'plant');s.sun-=value;}}for(const id of this.beanFood)if(!g.plants.some(p=>p.id===id&&p.hp>0))this.beanFood.delete(id);}
  private soundAt=new Map<number,number>();
  jesters=new Map<number,Jester>();
  reflected:Reflected[]=[];
  fumes=new Map<number,{until:number}>();
  visuals:{owner?:number;id:number;name:string;x:number;y:number;at:number;duration:number}[]=[];
  sounds:string[]=[];
  constructor(game:Game){this.#game=game;}
  private play(p:Plant,animation:string,action:Plant['action']='idle'){p.animation=animation;p.action=action;p.actionAt=this.#game.time;p.eventIndex=0;}
  init(p:Plant){this.play(p,'Idle');p.nextAction=0;}
  food(p:Plant){this.play(p,'Food','food');if(p.kind==='sunbean'){this.beanFood.add(p.id);this.sounds.push('sunbean/food');}else this.sounds.push('fumeshroom/foodSound');}
  private visual(name:string,x:number,y:number,owner?:number){this.visuals.push({owner,id:++this.serial,name,x,y,at:this.#game.time,duration:this.#game.props.plantAnimations[name].Play.duration});}
  tickPlant(p:Plant,dt:number){
    const g=this.#game,prop=g.props.plants.fumeshroom,x=cellX(p.column),y=rowY(p.row)-68;
    p.age+=dt;
    const targets=g.zombies.filter(z=>z.hp>0&&!g.westFinale.allies.includes(z)&&g.inLane(z,p.row)&&z.x>x-20);
    const graves=g.graves.filter(t=>t.hp>0&&t.row===p.row&&t.column>=p.column);
    if(p.action==='idle'&&g.time>=p.nextAction&&(targets.some(z=>z.x<x+prop.DetectDistance*BOARD.cellWidth+20)||graves.some(t=>t.column-p.column<=prop.DetectDistance))){p.nextAction=g.time+prop.ShootInterval+g.random()*prop.ShootIntervalAdditional;this.play(p,'Shoot','shoot');}
    const timeline=g.props.plantAnimations.fumeshroom[p.animation!],elapsed=g.time-p.actionAt;
    while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
      const event=timeline.events[p.eventIndex!++].name;
      if(event==='shootSound')this.sounds.push('fumeshroom/shootSounds');
      if(event==='shoot'){
        this.visual('fumeShot',x,y);
        for(const z of targets)if(z.x<x+prop.ShootDistance*BOARD.cellWidth+20){g.damage(z,prop.Damage);this.visual('fumeHit',z.x,y);}
        for(const t of graves)if(t.column-p.column<=prop.ShootDistance){t.hp-=prop.Damage;this.visual('fumeHit',cellX(t.column),y);}
      }
      if(event==='foodStart'){this.fumes.set(p.id,{until:g.time+prop.PlantfoodDuration});this.visual('fumeFood',x,y,p.id);}
      if(event==='foodEnd'){this.fumes.delete(p.id);this.play(p,'Idle');p.nextAction=g.time;return;}
    }
    const food=this.fumes.get(p.id);
    if(food){const step=Math.min(dt,Math.max(0,food.until-g.time+dt));for(const z of targets){g.damage(z,prop.PlantfoodDPS*step);if(z!==g.boss?.zombie&&z.x<cellX(8)+BOARD.cellWidth/2)z.x+=prop.PlantfoodKnockbackSPS*BOARD.cellWidth*step;}for(const t of graves)t.hp-=prop.PlantfoodDPS*step;}
    if(elapsed>=timeline.duration)this.play(p,'Idle');
  }
  graveDestroyed(t:Game['graves'][number]){
    const g=this.#game;
    if(t.kind==='gravestoneSunOnDestruction')g.dropSun(cellX(t.column),rowY(t.row)-45,graveProperties.gravestoneSunOnDestruction.SunValue,'plant');
    if(t.kind==='gravestonePlantfoodOnDestruction')g.pickups.push({id:g.nextEntityId(),kind:'food',x:cellX(t.column),y:rowY(t.row)-45,age:0});
  }
  /** Jester catches only incoming reversible projectiles while able to move. */
  private catchShot(x:number,y:number,vx:number,projectile:string,name:string,damage:number,armature?:string){
    const g=this.#game,rules=projectileRules as Record<string,{reverse:boolean}>;
    if(!rules[projectile].reverse)return false;
    const z=g.zombies.find(z=>z.kind==='dark_juggler'&&z.hp>0&&!z.reversed&&vx>0&&g.time>=z.frozenUntil&&g.time>=(z.stunnedUntil??0)&&g.time>=(z.butteredUntil??0)&&Math.abs(z.x-x)<40&&Math.abs(rowY(z.row)-45-y)<45);
    if(!z)return false;
    let state=this.jesters.get(z.id);
    if(!state||state.animation==='Walk'||state.animation==='RotateEnd'){state={animation:'RotateStart',at:g.time,until:Infinity};this.jesters.set(z.id,state);this.sounds.push('darkJester/rotateStartSound');}
    state.until=Infinity;
    this.reflected.push({id:++this.serial,owner:z,name,armature,x,y,fromX:x,fromY:y,at:g.time,damage,released:false,friendly:false});return true;
  }
  movement(z:Zombie){if(z.kind==='dark_king')return 0;if(this.wizards.get(z.id)?.animation==='Attack')return 0;const s=this.jesters.get(z.id);return !s||s.animation==='Walk'?1:s.animation==='RotateLoop'?this.#game.props.zombies.dark_juggler.MoveSpeedMultiplierWhileJuggling:0;}
  tick(dt:number){
    const g=this.#game;
    this.tickPotions();this.tickWizards(dt);this.tickKings(dt);
    this.visuals=this.visuals.filter(v=>g.time-v.at<v.duration&&(v.owner===undefined||g.plants.some(p=>p.id===v.owner&&p.hp>0)));
    for(const [id] of this.fumes)if(!g.plants.some(p=>p.id===id&&p.hp>0)){this.fumes.delete(id);}
    if(!g.zombies.some(z=>z.kind==='dark_juggler')&&!this.reflected.length)return;
    g.darkPlants.spores=g.darkPlants.spores.filter(p=>p.hitAt!==undefined||!this.catchShot(p.x,p.y,1,p.knockback?'scaredyshroom_spore2':'scaredyshroom_spore',p.knockback?'scaredyFood':'scaredyShot',g.props.projectiles.scaredyshroom_spore.Damage));
    g.peas=g.peas.filter(p=>!this.catchShot(p.x,p.y,p.vector?.vx??1,'pea','pea',p.damage,p.mega?'pea_g':'pea0'));
    g.missiles=g.missiles.filter(p=>{
      if(!['cabbage','boomerang'].includes(p.kind))return true;
      const type=p.projectile??(p.kind==='cabbage'&&p.powered?'cabbage_pf':p.kind);
      const native=p.projectile&&p.projectile!=='cabbage'&&p.projectile!=='cabbage_pf'?p.projectile:null;
      return !this.catchShot(p.x,p.y,p.kind==='boomerang'?p.dx*(p.returning?-1:1):p.targetX-p.startX,type,native??p.kind,p.damage,native?undefined:p.kind==='cabbage'?(p.powered?'Projectile2':'Projectile1'):(p.powered?'Projectile1':'Projectile0'));
    });
    g.cowboy.shots=g.cowboy.shots.filter(p=>!this.catchShot(p.x,rowY(p.row)-45,p.vx,'pea','pea',p.damage,p.mega?'pea_g':'pea0'));
    g.westFinale.shots=g.westFinale.shots.filter(p=>p.kind!=='puffshroom_spore'||!this.catchShot(p.x,p.y,1,p.kind,p.kind,g.props.projectiles[p.kind].Damage));
    g.western.shots=g.western.shots.filter(p=>p.armor||!this.catchShot(p.x,p.y,p.vx,p.kind,p.kind,p.damage));
    g.future.shots=g.future.shots.filter(p=>!this.catchShot(p.x,p.y,1,p.food?'citron_pf':'citron',p.food?'citronFood':'citronShot',g.props.projectiles[p.food?'citron_pf':'citron'].Damage));
    g.future.stars=g.future.stars.filter(p=>{const key=p.style==='red'?'redstinger':p.style==='redWeak'?'redstinger_weak':p.style==='pink'?(p.food?'pinkstar_pf':'pinkstar'):(p.food?'star_pf':'star'),name=p.style==='red'?'redShot':p.style==='redWeak'?'redWeak':p.style==='pink'?(p.food?'pinkFood':'pinkShot'):(p.food?'starFood':'starShot');return !this.catchShot(p.x,p.y,p.vx,key,name,g.props.projectiles[key].Damage);});
    g.pirate.shots=g.pirate.shots.filter(p=>!this.catchShot(p.x,p.y,1,p.food?'coconut_pf':'coconut',p.food?'coconutFood':'coconut',g.props.projectiles[p.food?'coconut_pf':'coconut'].Damage));
    g.finale.shots=g.finale.shots.filter(p=>{const key=p.kind+(p.food?'_pf':''),name=p.kind==='rotobaga'?(p.food?'rotobagaFood':'rotobaga'):(p.food?'dandelionFood':'dandelionShot');return !this.catchShot(p.x,p.y,p.vx,key,name,g.props.projectiles[key].Damage);});
    g.future.finale.apples=g.future.finale.apples.filter(p=>!this.catchShot(p.x,p.y,p.x-p.fromX,p.food?'apple_pf':'apple',p.food?'appleFood':'appleShot',g.props.projectiles[p.food?'apple_pf':'apple'].Damage));
    for(const p of this.reflected){
      if(!p.released){
        const z=p.owner,t=Math.min(1,g.time-p.at),stopped=z.hp<=0||g.time<z.frozenUntil||g.time<(z.stunnedUntil??0)||g.time<(z.butteredUntil??0);
        p.x=p.fromX+(z.x-30-p.fromX)*t+30*Math.sin(t*Math.PI);p.y=p.fromY-65*Math.sin(t*Math.PI);
        if(t===1||stopped){p.released=true;p.friendly=stopped;p.y=rowY(z.row)-45;const s=this.jesters.get(z.id)!;s.until=g.time+g.props.zombies.dark_juggler.RotateDuration;this.sounds.push('darkJester/throwSound');}
      }else {
        p.x-=8*BOARD.cellWidth*dt;
        if(p.friendly){const z=g.zombies.find(z=>z.hp>0&&z!==p.owner&&Math.abs(z.x-p.x)<25&&Math.abs(rowY(z.row)-45-p.y)<40);if(z){g.damage(z,p.damage);p.x=-200;}}
        else {const plant=g.plants.filter(t=>t.hp>0&&!t.hidden&&t.action!=='food'&&Math.abs(cellX(t.column)-p.x)<25&&Math.abs(rowY(t.row)-45-p.y)<40).sort((a,b)=>b.column-a.column)[0];if(plant){const armor=Math.min(plant.armor,p.damage);plant.armor-=armor;plant.hp-=(p.damage-armor)*g.future.plantDamageScale(plant);p.x=-200;}}
      }
    }
    this.reflected=this.reflected.filter(p=>p.x>BOARD.left-100);
    for(const z of g.zombies){const s=this.jesters.get(z.id);if(!s)continue;
      if(s.animation==='RotateStart'&&g.time-s.at>=.5){s.animation='RotateLoop';s.at=g.time;}
      else if(s.animation==='RotateLoop'&&g.time>=s.until&&!this.reflected.some(p=>p.owner===z&&!p.released)){s.animation='RotateEnd';s.at=g.time;this.sounds.push('darkJester/rotateEndSound');}
      else if(s.animation==='RotateEnd'&&g.time-s.at>=.5){s.animation='Walk';s.at=g.time;}
    }
    for(const z of g.zombies)if(z.kind==='dark_juggler'&&z.hp>0&&!z.eating&&g.time>=z.frozenUntil&&g.time>=(z.stunnedUntil??0)&&g.time>=(z.butteredUntil??0)&&g.time>=(this.soundAt.get(z.id)??0)){const rotating=this.jesters.get(z.id)?.animation==='RotateLoop';this.sounds.push(rotating?'darkJester/rotateLoopSound':'darkJester/ringSounds');this.soundAt.set(z.id,g.time+(rotating?.5:.8));}
    for(const [id] of this.soundAt)if(!g.zombies.some(z=>z.id===id))this.soundAt.delete(id);
    for(const [id] of this.jesters)if(!g.zombies.some(z=>z.id===id)&&!this.reflected.some(p=>p.owner.id===id))this.jesters.delete(id);
  }
}
