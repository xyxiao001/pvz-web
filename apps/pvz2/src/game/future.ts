import {BOARD,cellX,rowY,type PlantKind} from './level';
import type {Game,Plant,Zombie,Sun} from './model';
import {isFlying} from './pirate';
import laserCurve from '../../public/assets/future/laser-food-curve.json';
export const futureArmor=(kind:string)=>kind==='future_armor1'?'future_armor1':kind==='future_armor2'?'future_armor2':null;
export interface FutureZombie {animation:string;at:number;elapsed:number;event:number;high:boolean;shield?:number;master?:number;recover:number;pause:number;hop:boolean}
interface Visual {id:number;name:string;animation:string;x:number;y:number;at:number;duration:number}
interface Link {id:number;from:{row:number;column:number};to:{row:number;column:number};group:string;at:number;arrive:number;sent:boolean}
export class FutureBattle {
  #game:Game;
  visuals:Visual[]=[];links:Link[]=[];sounds:string[]=[];
  private serial=0;
  private lasers=new Map<number,{hits:Set<number>;lastX:number;nextDirt:number}>();
  private blows=new Map<number,number>();
  private bombs:{x:number;y:number;at:number;hit:boolean}[]=[];
  constructor(g:Game){this.#game=g;}
  handles(kind:PlantKind){return kind==='laser_bean'||kind==='blover';}
  private play(p:Plant,animation:string,action:Plant['action']='idle'){p.animation=animation;p.action=action;p.actionAt=this.#game.time;p.eventIndex=0;}
  init(p:Plant){this.play(p,p.kind==='blover'?'BlowStart':'Idle',p.kind==='blover'?'shoot':'idle');if(p.kind==='blover')this.sounds.push('blover/windSound');}
  food(p:Plant){this.play(p,'FoodStart','food');this.lasers.set(p.id,{hits:new Set(),lastX:cellX(p.column),nextDirt:cellX(p.column)});this.sounds.push('laser_bean/foodSound');}
  link(p:Plant){
    const g=this.#game,t=g.level.powerTiles.find(t=>t.row===p.row&&t.column===p.column);if(!t)return;
    for(const q of g.level.powerTiles)if(q!==t&&q.group===t.group)this.links.push({id:++this.serial,from:t,to:q,group:t.group,at:g.time+t.delay,arrive:g.time+t.delay+(Math.abs(q.column-t.column)+Math.abs(q.row-t.row))/16,sent:false});
  }
  visual(name:string,animation:string,x:number,y:number){const g=this.#game;this.visuals.push({id:++this.serial,name,animation,x,y,at:g.time,duration:g.props.plantAnimations[name][animation].duration});}
  tickPlant(p:Plant,dt:number){
    const g=this.#game,props=g.props.plants[p.kind];p.age+=dt;
    if(p.kind==='laser_bean'&&p.action==='idle'&&g.time>=p.nextAction&&g.zombies.some(z=>z.hp>0&&g.inLane(z,p.row)&&z.x>cellX(p.column)-20)){
      this.play(p,'Shoot','shoot');p.nextAction=g.time+props.ShootInterval+g.random()*props.ShootIntervalAdditional;this.sounds.push('laser_bean/shootSound');this.visual('laserBeam','Play',cellX(p.column),rowY(p.row)-50);
    }
    if(p.kind==='blover'&&p.animation==='Blowing'&&g.time>=this.blows.get(p.id)!){this.play(p,'Death','explode');this.blows.delete(p.id);}
    if(p.action==='idle')return;
    const animation=p.animation!,timeline=g.props.plantAnimations[p.kind][animation],elapsed=g.time-p.actionAt;
    while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
      const event=timeline.events[p.eventIndex!++].name;
      if(p.kind==='blover'&&event==='blowStart'){this.blows.set(p.id,g.time+props.BlowDuration);this.sounds.push('blover/blowSound');this.play(p,'Blowing','shoot');return;}
      if(p.kind==='laser_bean'&&event==='shoot'){
        for(const z of g.zombies)if(z.kind!=='future_protector_shield'&&z.hp>0&&g.inLane(z,p.row)&&z.x>=cellX(p.column)-20)g.damage(z,props.Damage);
        for(const t of g.graves)if(t.row===p.row&&t.column>=p.column)t.hp-=props.Damage;
      }
      if(p.kind==='laser_bean'&&event==='foodStart'){this.play(p,'Food','food');return;}
      if(p.kind==='laser_bean'&&event==='foodEnd'){this.play(p,'FoodEnd','food');this.lasers.delete(p.id);return;}
      if(event==='die'){p.hp=0;return;}
    }
    if(p.kind==='laser_bean'&&animation==='Food'){
      const state=this.lasers.get(p.id)!,a=[...laserCurve].reverse().find(c=>c.at<=elapsed)!,b=laserCurve.find(c=>c.at>elapsed),x=cellX(p.column)+(b?a.x+(b.x-a.x)*(elapsed-a.at)/(b.at-a.at):a.x)*.55;
      for(const z of g.zombies)if(z.kind!=='future_protector_shield'&&z.hp>0&&g.inLane(z,p.row)&&z.x>=state.lastX-BOARD.cellWidth/2&&z.x<=x+BOARD.cellWidth/2&&!state.hits.has(z.id)){state.hits.add(z.id);g.damage(z,props.DamagePlantfood);}
      for(const t of g.graves)if(t.row===p.row&&cellX(t.column)>=state.lastX-BOARD.cellWidth/2&&cellX(t.column)<=x+BOARD.cellWidth/2&&!state.hits.has(t.id)){state.hits.add(t.id);t.hp-=props.DamagePlantfood;}
      while(state.nextDirt<x&&state.nextDirt<cellX(9)){this.visual('laserDirt','Play',state.nextDirt,rowY(p.row));state.nextDirt+=BOARD.cellWidth;}state.lastX=x;return;
    }
    if(elapsed>=timeline.duration&&animation!=='Blowing')this.play(p,'Idle');
  }
  spawn(z:Zombie){
    if(!['future_protector','future_protector_shield','future_imp','future_jetpack','mech_cone'].includes(z.kind))return;
    z.future={animation:z.kind==='future_imp'?'Fall':z.kind==='future_protector_shield'?'Spawn':'Walk',at:this.#game.time,elapsed:0,event:0,high:false,recover:0,pause:0,hop:false};
    if(z.kind==='future_imp'){z.landUntil=this.#game.time+1;this.sounds.push('futureImp/fallSound');}
  }
  private animate(z:Zombie,animation:string){const s=z.future!;s.animation=animation;s.at=this.#game.time;s.elapsed=0;s.event=0;}
  private killShields(master:Zombie){const g=this.#game,s=master.future!;for(const z of g.zombies)if(z.future?.master===master.id)z.hp=0;s.shield=undefined;s.recover=g.props.zombies.future_protector.ShieldRecoverTime;s.pause=g.props.zombies.future_protector.ShieldKillStunTime;}
  die(z:Zombie){if(z.kind==='future_protector'&&z.future!.shield!==undefined)this.killShields(z);}
  damageShield(z:Zombie,amount:number){
    const g=this.#game,master=g.zombies.find(m=>m.id===z.future!.master)!;
    const health=z.hp-amount;
    for(const shield of g.zombies)if(shield.future?.master===master.id){shield.hp=health;this.animate(shield,'Hit');}
    if(health<=0)this.killShields(master);
  }
  tickZombie(z:Zombie,dt:number){
    const g=this.#game,s=z.future;if(!s)return false;
    if(z.kind==='future_protector_shield')return true;
    if(z.kind==='future_protector'){
      if(s.pause>0){s.pause-=dt;this.animateIf(z,'Idle');return true;}
      if(s.shield===undefined&&z.x<cellX(9)&&z.x>=BOARD.left&&!z.leap){
        if(s.recover>0){if(!z.eating)s.recover-=dt;}else{
          for(let row=Math.max(0,z.row-1);row<=Math.min(4,z.row+1);row++){const shield=g.spawnZombie('future_protector_shield',row,z.x-.95*BOARD.cellWidth);shield.future!.master=z.id;}
          s.shield=1;s.pause=g.props.zombies.future_protector.ShieldKillStunTime;this.sounds.push('futureShield/spawnSounds','futureProtector/activateSound');return true;
        }
      }
    }
    if(z.kind==='future_jetpack'){
      if(s.animation==='Rise'||s.animation==='Land'){
        s.elapsed+=dt;const timeline=g.props.plantAnimations.futureJetpack[s.animation];if(s.elapsed<timeline.duration)return true;this.animate(z,s.high?'Walk_High':'Walk');
      }
      const plant=g.plants.find(p=>p.hp>0&&p.row===z.row&&Math.abs(z.x-cellX(p.column))<55&&!['blover','spikeweed','spikerock','iceweed','potatomine'].includes(p.kind));
      const high=!!plant&&plant.kind!=='tallnut';
      if(high!==s.high){s.high=high;this.animate(z,high?'Rise':'Land');return true;}
      if(high){z.eating=false;z.x-=g.props.zombies[z.kind].WalkSPS*BOARD.cellWidth*dt*(g.time<z.chilledUntil?.5:1);return true;}
    }
    if(z.kind==='future_imp'){
      if(s.animation==='Fall'){this.animate(z,'Land');this.sounds.push('futureImp/landSound');}
      const plant=g.plants.find(p=>p.hp>0&&p.row===z.row&&Math.abs(z.x-cellX(p.column))<38&&!['blover','spikeweed','spikerock','iceweed'].includes(p.kind));
      if(plant&&s.animation!=='Land'){this.animateIf(z,'Eat');return false;}
      if(s.animation==='Eat'){this.animate(z,'Walk');s.hop=false;}
      s.elapsed+=dt;
      const timeline=g.props.plantAnimations.futureImp[s.animation];
      while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const event=timeline.events[s.event++].name;if(event==='walkStart')s.hop=true;if(event==='walkEnd')s.hop=false;if(event==='walkIdle'){this.animate(z,'Idle');s.pause=2.107;break;}}
      if(s.animation==='Land'&&s.elapsed>=timeline.duration)this.animate(z,'Walk');
      if(s.animation==='Idle'){s.pause-=dt;if(s.pause<=0)this.animate(z,'Walk');}
      if(s.hop)z.x-=g.props.zombies.future_imp.WalkSPS*8*BOARD.cellWidth*dt*(g.time<z.chilledUntil?.5:1);
      // Retain the shared mower / house boundary processing once the imp reaches it.
      return z.x>=BOARD.left;
    }
    this.animateIf(z,z.eating?'Eat':'Walk');return false;
  }
  private animateIf(z:Zombie,animation:string){if(z.future!.animation!==animation)this.animate(z,animation);}
  collectBomb(sun:Sun){this.visual('sunbombBlast','Play',sun.x,sun.y);this.bombs.push({x:sun.x,y:sun.y,at:this.#game.time,hit:false});this.sounds.push('sunbomb/explodeSound');this.endRay(sun);}
  endRay(sun:Sun){this.visual('sunbombRay','Die',sun.x,sun.y);}
  defuse(sun:Sun){sun.bomb=false;sun.defusedAt=this.#game.time;this.endRay(sun);this.sounds.push('sunbomb/defuseSound');}
  tick(dt:number){
    const g=this.#game;
    for(const link of this.links){
      if(g.time>=link.at&&!link.sent){link.sent=true;this.visual('tile_'+link.group+'Flash','Play',cellX(link.from.column),rowY(link.from.row));}
      if(g.time>=link.arrive){this.visual('tile_'+link.group+'Flash','Play',cellX(link.to.column),rowY(link.to.row));g.plantFood(link.to.row,link.to.column,true);}
    }
    this.links=this.links.filter(l=>g.time<l.arrive);
    for(const [id,until] of this.blows)if(g.time<until&&g.plants.some(p=>p.id===id&&p.hp>0))for(const z of g.zombies)if(z.hp>0&&z.kind!=='future_protector_shield'&&(isFlying(z)||z.leap||z.kind==='future_imp'&&z.future?.animation==='Fall')){z.hp=0;z.deathCause='blow';}
    for(const z of g.zombies){
      if(z.kind==='future_protector_shield'){if(z.future!.animation!=='Idle'&&g.time-z.future!.at>=g.props.plantAnimations.futureShield[z.future!.animation].events.find(e=>e.name==='idle')!.at)this.animate(z,'Idle');const master=g.zombies.find(m=>m.id===z.future!.master&&m.hp>0);if(!master)z.hp=0;else z.x=master.x-.95*BOARD.cellWidth;}
      if(z.kind==='future_protector'&&z.future!.shield!==undefined&&(z.hp<=0||z.leap||z.reversed))this.killShields(z);
    }
    for(const bomb of this.bombs)if(!bomb.hit&&g.time-bomb.at>=g.props.plantAnimations.sunbombBlast.Play.events.find(e=>e.name==='expl')!.at){
      bomb.hit=true;const props=g.level.sunBomb!,zr=props.ZombieBombExplosionRadius*BOARD.cellWidth/80,pr=props.PlantBombExplosionRadius*BOARD.cellWidth/80;
      for(const z of g.zombies)if(z.hp>0&&Math.abs(z.x-bomb.x)<=zr+20&&Math.abs(rowY(z.row)-45-bomb.y)<=zr+45)g.damage(z,props.ZombieDamage);
      for(const p of g.plants)if(Math.abs(cellX(p.column)-bomb.x)<=pr+20&&Math.abs(rowY(p.row)-40-bomb.y)<=pr+35){const armor=Math.min(p.armor,props.PlantDamage);p.armor-=armor;p.hp-=props.PlantDamage-armor;}
      for(const t of g.graves)if(Math.abs(cellX(t.column)-bomb.x)<=zr+20&&Math.abs(rowY(t.row)-40-bomb.y)<=zr+40)t.hp-=props.ZombieDamage;
    }
    this.bombs=this.bombs.filter(b=>!b.hit);this.visuals=this.visuals.filter(v=>g.time-v.at<v.duration);
    for(const id of this.lasers.keys())if(!g.plants.some(p=>p.id===id&&p.hp>0))this.lasers.delete(id);
    for(const id of this.blows.keys())if(!g.plants.some(p=>p.id===id&&p.hp>0))this.blows.delete(id);
  }
}
