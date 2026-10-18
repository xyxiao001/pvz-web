import {BOARD,cellX,rowY,type ZombieKind} from './level';
import type {Game,Plant,Zombie} from './model';
import graveProperties from '../../public/assets/dark/graves.json';
import projectileRules from '../../public/assets/dark/jester-projectiles.json';
export const darkArmor=(kind:ZombieKind)=>kind==='dark_armor1'?'dark_armor1':kind==='dark_armor2'?'dark_armor2':null;
export const graveArt=(kind?:string)=>kind==='gravestoneSunOnDestruction'?'graveSun':kind==='gravestonePlantfoodOnDestruction'?'graveFood':'grave';
interface Jester {animation:string;at:number;until:number}
interface Reflected {id:number;owner:Zombie;name:string;armature?:string;x:number;y:number;fromX:number;fromY:number;at:number;damage:number;released:boolean;friendly:boolean}
export class DarkBattle {
  readonly #game:Game;
  private serial=0;
  private soundAt=new Map<number,number>();
  jesters=new Map<number,Jester>();
  reflected:Reflected[]=[];
  fumes=new Map<number,{until:number}>();
  visuals:{owner?:number;id:number;name:string;x:number;y:number;at:number;duration:number}[]=[];
  sounds:string[]=[];
  constructor(game:Game){this.#game=game;}
  private play(p:Plant,animation:string,action:Plant['action']='idle'){p.animation=animation;p.action=action;p.actionAt=this.#game.time;p.eventIndex=0;}
  init(p:Plant){this.play(p,'Idle');p.nextAction=0;}
  food(p:Plant){this.play(p,'Food','food');this.sounds.push('fumeshroom/foodSound');}
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
    if(t.kind==='gravestoneSunOnDestruction')g.dropSun(cellX(t.column),rowY(t.row)-45,graveProperties.gravestoneSunOnDestruction.SunValue,'ra');
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
  movement(z:Zombie){const s=this.jesters.get(z.id);return !s||s.animation==='Walk'?1:s.animation==='RotateLoop'?this.#game.props.zombies.dark_juggler.MoveSpeedMultiplierWhileJuggling:0;}
  tick(dt:number){
    const g=this.#game;
    this.visuals=this.visuals.filter(v=>g.time-v.at<v.duration&&(v.owner===undefined||g.plants.some(p=>p.id===v.owner&&p.hp>0)));
    for(const [id] of this.fumes)if(!g.plants.some(p=>p.id===id&&p.hp>0)){this.fumes.delete(id);}
    if(!g.zombies.some(z=>z.kind==='dark_juggler')&&!this.reflected.length)return;
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
