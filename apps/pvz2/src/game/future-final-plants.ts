import {BOARD,cellX,rowY,type PlantKind} from './level';
import type {Game,Plant,Zombie} from './model';
import {swinging} from './pirate';
interface Apple {id:number;food:boolean;fromX:number;fromY:number;x:number;y:number;at:number;duration:number;target:number|null;grave:boolean}
interface Cloud {id:number;x:number;y:number;animation:string;at:number;event:number;left:number;target:Zombie|null;moving:boolean;food:boolean}
interface State {rate:number;foodUntil:number;rest:number;remaining:number;stage:number}
/** Native AppleMortar, WasabiWhip and ElectricBlueberry animation-event behavior. */
export class FutureFinalPlants {
  private serial=0;
  private states=new Map<number,State>();
  apples:Apple[]=[];
  clouds:Cloud[]=[];
  readonly #game:Game;
  constructor(g:Game){this.#game=g;}
  handles(kind:PlantKind){return ['applemortar','wasabiwhip','electricblueberry'].includes(kind);}
  rate(p:Plant){return this.states.get(p.id)!.rate;}
  private play(p:Plant,animation:string,action:Plant['action']='idle'){p.animation=animation;p.action=action;p.actionAt=this.#game.time;p.eventIndex=0;}
  init(p:Plant){const prop=this.#game.props.plants[p.kind],rest=p.kind==='electricblueberry'?prop.AttackCooldownStart+this.#game.random()*prop.AttackCooldownStartAdditional:0;this.states.set(p.id,{rate:1,foodUntil:0,rest,remaining:rest,stage:0});p.nextAction=0;this.play(p,p.kind==='electricblueberry'?'Idle00':'Idle');}
  food(p:Plant){const s=this.states.get(p.id)!;s.rate=1;s.foodUntil=0;if(p.kind==='electricblueberry')this.resetBlue(p);this.play(p,p.kind==='wasabiwhip'?'FoodStart':'Food','food');}
  private resetBlue(p:Plant){const prop=this.#game.props.plants.electricblueberry,s=this.states.get(p.id)!;s.rest=prop.AttackCooldownBetween+this.#game.random()*prop.AttackCooldownBetweenAdditional;s.remaining=s.rest;s.stage=0;}
  private enemies(){return this.#game.zombies.filter(z=>z.hp>0&&!this.#game.westFinale.allies.includes(z)&&!swinging(z,this.#game.time));}
  private rows(p:Plant){return this.enemies().filter(z=>Math.abs(z.row-p.row)<=1&&z.x>=cellX(p.column)-20);}
  private lob(p:Plant,row:number,target:Zombie|Game['graves'][number]|null,food:boolean,grave=false){
    this.apples.push({id:++this.serial,food,fromX:cellX(p.column)+8.514*.55,fromY:rowY(p.row)-161.946*.55,x:target?(grave?cellX((target as Game['graves'][number]).column):(target as Zombie).x):cellX(9),y:rowY(row)-45,at:this.#game.time,duration:.4444,target:target?.id??null,grave});
  }
  private appleShoot(p:Plant,food:boolean){
    if(food){for(const z of this.enemies())this.lob(p,z.row,z,true);for(const t of this.#game.graves)if(t.hp>0)this.lob(p,t.row,t,true,true);return;}
    for(const row of [p.row,p.row-1,p.row+1])if(row>=0&&row<5){const z=this.rows(p).filter(z=>z.row===row).sort((a,b)=>a.x-b.x)[0],t=this.#game.graves.filter(t=>t.hp>0&&t.row===row&&t.column>=p.column).sort((a,b)=>a.column-b.column)[0];this.lob(p,row,z??t??null,false,!z&&!!t);}
  }
  private whipTargets(p:Plant,side:number){const x=cellX(p.column),range=this.#game.props.plants.wasabiwhip.MaxDistance*BOARD.cellWidth;return this.enemies().filter(z=>this.#game.inLane(z,p.row)&&(z.x-x)*side>=-20&&(z.x-x)*side<=range+20).sort((a,b)=>(a.x-b.x)*side);}
  private whipGraves(p:Plant,side:number){return this.#game.graves.filter(t=>t.hp>0&&t.row===p.row&&(t.column-p.column)*side>=0&&(t.column-p.column)*side<=this.#game.props.plants.wasabiwhip.MaxDistance).sort((a,b)=>(a.column-b.column)*side);}
  private fire(z:Zombie,damage:number){this.#game.damage(z,damage);z.frozenUntil=0;z.chilledUntil=0;}
  private whip(p:Plant,side:number){const g=this.#game,prop=g.props.plants.wasabiwhip,z=this.whipTargets(p,side)[0],t=this.whipGraves(p,side)[0],x=z?.x??(t?cellX(t.column):cellX(p.column)+side*prop.MaxDistance*BOARD.cellWidth);
    if(z)this.fire(z,prop.AttackDamage);else if(t)t.hp-=prop.AttackDamage;
    for(const q of this.enemies())if(q!==z&&g.inLane(q,p.row)&&Math.abs(q.x-x)<=BOARD.cellWidth/2+20)this.fire(q,prop.AttackSplashSamage);
    for(const q of g.graves)if((z||q!==t)&&q.row===p.row&&Math.abs(cellX(q.column)-x)<=BOARD.cellWidth/2)q.hp-=prop.AttackSplashSamage;
  }
  private sound(p:Plant,key:string){this.#game.future.sounds.push(p.kind+'/'+key);}
  tickPlant(p:Plant,dt:number){
    const g=this.#game,prop=g.props.plants[p.kind],s=this.states.get(p.id)!;
    if(p.action==='food'&&p.kind!=='electricblueberry')p.nextAction+=dt;
    if(p.kind==='wasabiwhip'&&s.foodUntil>0){
      const damage=prop.PlantfoodDPS*Math.min(dt,Math.max(0,s.foodUntil-g.time+dt));
      for(const z of this.enemies())if(Math.abs(z.row-p.row)<=1&&Math.abs(z.x-cellX(p.column))<=BOARD.cellWidth*1.5+20)this.fire(z,damage);
      for(const t of g.graves)if(Math.abs(t.row-p.row)<=1&&Math.abs(t.column-p.column)<=1)t.hp-=damage;
      if(g.time>=s.foodUntil){s.foodUntil=0;this.play(p,'FoodEnd','shoot');}
    }
    if(p.action!=='food'){
      if(p.kind==='applemortar'&&g.time>=p.nextAction&&(this.rows(p).length||g.graves.some(t=>t.hp>0&&Math.abs(t.row-p.row)<=1&&t.column>=p.column))){const interval=prop.ShootInterval+g.random()*prop.ShootIntervalAdditional;p.nextAction=g.time+interval;s.rate=Math.max(1,1.5/interval);this.play(p,'Shoot','shoot');}
      if(p.kind==='wasabiwhip'&&p.animation!=='FoodEnd'&&g.time>=p.nextAction){const left=this.whipTargets(p,-1).length+this.whipGraves(p,-1).length>0,right=this.whipTargets(p,1).length+this.whipGraves(p,1).length>0;if(left||right){p.nextAction=g.time+prop.AttackInterval;this.play(p,left&&right?'AttackB':left?'AttackL':'AttackR','shoot');}}
      if(p.kind==='electricblueberry'&&p.action==='idle'){
        s.remaining=Math.max(0,s.remaining-dt);const stage=Math.max(0,Math.min(3,3-Math.floor(s.remaining/s.rest*4)));
        if(stage!==s.stage){s.stage=stage;this.play(p,`Idle${stage}0`);this.sound(p,'glow');}
        if(s.remaining===0&&this.blueTargets().length){this.resetBlue(p);this.play(p,'Attack','shoot');}
      }
    }
    const animation=p.animation!,timeline=g.props.plantAnimations[p.kind][animation],elapsed=(g.time-p.actionAt)*s.rate;
    while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){const event=timeline.events[p.eventIndex!++].name;
      if(p.kind==='applemortar'){
        const sounds:Record<string,string>={Shoot:'lobSounds',FoodShoot:'foodLobSounds',Ready:'preLobSounds',Load:'loadSounds',LoadBG:'loadBGSounds',FoodStart:'foodStartSounds'};
        if(sounds[event])this.sound(p,sounds[event]);if(event==='Shoot'||event==='FoodShoot')this.appleShoot(p,event==='FoodShoot');
      }
      if(p.kind==='wasabiwhip'){
        if(event==='hit_L'||event==='hit_R')this.whip(p,event==='hit_L'?-1:1);
        if(event==='food'&&s.foodUntil===0){s.foodUntil=g.time+prop.PlantfoodDuration;this.sound(p,'foodStart');this.sound(p,'foodStartSay');}
        if(event==='swing'){this.sound(p,'attackSay');this.sound(p,'hit');}if(event==='expl')this.sound(p,'explode');if(event==='idle')this.sound(p,'idle');
      }
      if(p.kind==='electricblueberry'){
        if(['breathIn','breathOut','spark','jump'].includes(event))this.sound(p,event);
        if(event==='ele'){this.sound(p,'ele');this.sound(p,'eleSay');}if(event==='attackSound')this.sound(p,'attack');if(event==='foodSound')this.sound(p,'foodAttack');
        if(event==='foodCloud'||event==='cloud'){
          if(event==='foodCloud'||this.blueTargets().length)this.clouds.push({id:++this.serial,x:cellX(p.column),y:rowY(p.row),animation:'Spawn',at:g.time,event:0,left:event==='foodCloud'?prop.PlantFoodLightningTargets:prop.NormalLightningTargets,target:null,moving:false,food:event==='foodCloud'});
          else s.remaining=s.rest*5/8;
        }
      }
      if(event==='foodEnd'){this.play(p,p.kind==='electricblueberry'?`Idle${s.stage}0`:'Idle');return;}
    }
    if(elapsed>=timeline.duration){
      if(p.kind==='wasabiwhip'&&animation==='FoodStart'){this.play(p,'FoodLoop','food');}
      else if(p.kind==='wasabiwhip'&&animation==='FoodLoop')return;
      else this.play(p,p.kind==='electricblueberry'?`Idle${s.stage}0`:'Idle');
    }
  }
  private blueTargets(){return this.enemies().filter(z=>z.x<cellX(9)&&!z.kind.startsWith('zombossmech')&&z.kind!=='future_protector_shield'&&!this.clouds.some(c=>c.target===z));}
  private cloudPlay(c:Cloud,animation:string){c.animation=animation;c.at=this.#game.time;c.event=0;c.moving=false;}
  private locate(c:Cloud){
    c.moving=true;if(c.target)return;if(c.left<=0){this.cloudPlay(c,'Death');return;}
    const prop=this.#game.props.plants.electricblueberry,targets=this.blueTargets(),sort=(z:Zombie)=>this.#game.props.zombies[z.kind].ZombieSort==='Gargantuar'?'garg':this.#game.props.zombies[z.kind].ZombieSort==='Normal'?'normal':'other';
    const groups=[{sort:'normal',weight:prop.WeightTargetNormalZombie},{sort:'garg',weight:prop.WeightTargetGargantuarZombie},{sort:'other',weight:prop.WeightTargetOtherZombie}];
    while(groups.length){let choice=this.#game.random()*groups.reduce((n,t)=>n+t.weight,0),index=groups.findIndex(t=>(choice-=t.weight)<=0);const group=groups.splice(index,1)[0];const z=targets.filter(z=>sort(z)===group.sort).sort((a,b)=>a.x-b.x)[0];if(z){c.target=z;c.left--;return;}}
  }
  tick(dt:number){
    const g=this.#game;
    for(const [id] of this.states)if(!g.plants.some(p=>p.id===id&&p.hp>0))this.states.delete(id);
    for(const a of this.apples){
      const z=!a.grave?g.zombies.find(z=>z.id===a.target):undefined,t=a.grave?g.graves.find(t=>t.id===a.target):undefined;
      if(z){a.x=z.x;a.y=rowY(z.row)-45;}
      if(g.time-a.at<a.duration)continue;
      const prop=g.props.projectiles[a.food?'apple_pf':'apple'],stun=g.props.plants.applemortar[a.food?'StunDurationPF':'StunDuration'];
      if(z&&z.hp>0){g.damage(z,prop.Damage);if(z!==g.boss?.zombie)z.stunnedUntil=Math.max(z.stunnedUntil??0,g.time+stun);}else if(t)t.hp-=prop.Damage;
      if(a.food){for(const q of this.enemies())if(q!==z&&Math.abs(q.x-a.x)<=BOARD.cellWidth/2+20&&Math.abs(rowY(q.row)-45-a.y)<=BOARD.cellHeight/2){g.damage(q,prop.SplashDamage[0].Damage!);if(q!==g.boss?.zombie)q.stunnedUntil=Math.max(q.stunnedUntil??0,g.time+stun);}for(const q of g.graves)if(q!==t&&Math.abs(cellX(q.column)-a.x)<=BOARD.cellWidth/2&&Math.abs(rowY(q.row)-45-a.y)<=BOARD.cellHeight/2)q.hp-=prop.SplashDamage[0].Damage!;}
      g.future.visual(a.food?'appleFoodHit':'appleHit','Play',a.x,a.y);g.future.sounds.push((a.food?'appleFood':'appleShot')+'/PopSound');
    }
    this.apples=this.apples.filter(a=>g.time-a.at<a.duration);
    for(const c of this.clouds){
      const timeline=g.props.plantAnimations.blueberryCloud[c.animation],elapsed=g.time-c.at;
      while(c.event<timeline.events.length&&elapsed>=timeline.events[c.event].at){const e=timeline.events[c.event++].name;if(e==='locate'){this.locate(c);break;}}
      if(c.target&&c.moving){const z=c.target;if(z.hp<=0||g.westFinale.allies.includes(z)){c.target=null;c.left++;}else{const dx=z.x-c.x,dy=rowY(z.row)-c.y,distance=Math.hypot(dx,dy),prop=g.props.plants.electricblueberry,step=prop[c.food?'PlantFoodCloudSpeed':'NormalCloudSpeed']*BOARD.cellWidth*dt;
        if(distance<=step){c.x=z.x;c.y=rowY(z.row);this.cloudPlay(c,'Attack');g.future.sounds.push('blueberryCloud/hitSounds');g.damage(z,prop[c.food?'PlantFoodLightningBoltDamage':'NormalLightningBoltDamage'],'electric');if(z.hp<=0)c.target=null;}else{c.x+=dx/distance*step;c.y+=dy/distance*step;}}
      }
      if(c.animation!=='Death'&&g.time-c.at>=g.props.plantAnimations.blueberryCloud[c.animation].duration){c.animation='Idle0';c.at=g.time;c.event=0;}
    }
    this.clouds=this.clouds.filter(c=>c.animation!=='Death'||g.time-c.at<g.props.plantAnimations.blueberryCloud.Death.duration);
  }
}
