import {BOARD,cellX,rowY} from './level';
import type {Game,Plant,Zombie} from './model';
import native from '../../public/assets/kongfu/properties.json';
export interface KongfuZombie {animation:string;at:number;elapsed:number;torch:boolean;flying:boolean;rocket:boolean}
export const isRack=(kind?:string)=>kind==='kongfu_rack_torch'||kind==='kongfu_rack_hammer';
export const rackHP=(kind:string)=>native.tombs[kind as keyof typeof native.tombs].Toughness;
export class KongfuCombat {
 tnt:{row:number;column:number;length:number;speed:number;lit:boolean;explodeAt:number|null}[]=[];
 reflected:{id:number;x:number;y:number;vx:number;damage:number;name:'pea'|'boomerang';powered:boolean}[]=[];
 constructor(protected g:Game){}
 initCombat(){this.tnt=this.g.level.tnt?this.g.level.tnt.SpawnData.map(t=>({row:t.GridY,column:t.GridX,length:t.WireLength,speed:t.Speed,lit:false,explodeAt:null})):[];}
 spawn(z:Zombie){if(!['kongfu_torch','kongfu_hammer','kongfu_rocket_imp'].includes(z.kind))return;const flying=z.kind==='kongfu_rocket_imp'&&(z.entry==='walk'||z.entry==='raid');z.kongfu={animation:flying?'Walk_Fly':'Walk',at:this.g.time,elapsed:0,torch:z.kind==='kongfu_torch',flying,rocket:z.kind==='kongfu_rocket_imp'};if(flying){z.entry='walk';this.g.beach.sounds.push('kongfuRocket/launchSounds');}}
 private change(z:Zombie,animation:string){Object.assign(z.kongfu!,{animation,at:this.g.time,elapsed:0});}
 cold(z:Zombie){if(!z.kongfu)return;z.kongfu.torch=false;if(z.kongfu.flying)this.land(z,false);}
 heat(z:Zombie){if(z.kind==='kongfu_torch')z.kongfu!.torch=true;if(z.kind==='kongfu_rocket_imp'&&z.kongfu!.rocket&&!z.kongfu!.flying&&z.kongfu!.animation!=='Flee'){this.change(z,'Flee');this.g.beach.sounds.push('kongfuRocket/scream0Sounds');}}
 private land(z:Zombie,throwRocket=true){z.kongfu!.flying=false;if(throwRocket)z.kongfu!.rocket=false;this.change(z,'Drop');this.g.beach.sounds.push('kongfuRocket/scream1Sounds');}
 animation(z:Zombie){return z.kongfu&&z.kongfu.animation!=='Walk'?z.kongfu.animation:null;}
 zombie(z:Zombie,dt:number){const g=this.g;
  if(['kongfu','kongfu_armor1','kongfu_armor2'].includes(z.kind)&&z.armor<=0&&z.hp>g.props.zombies[z.kind].Toughness*.5){
   const rack=g.graves.find(t=>t.hp>0&&isRack(t.kind)&&t.row===z.row&&Math.abs(cellX(t.column)-z.x)<50);
   if(rack){rack.hp=0;z.kind=rack.kind==='kongfu_rack_torch'?'kongfu_torch':'kongfu_hammer';z.hp=g.props.zombies[z.kind].Toughness;this.spawn(z);}
  }
  const s=z.kongfu;if(!s)return false;const step=dt*(g.time<z.chilledUntil?.5:1);s.elapsed+=s.flying?dt:step;
  if(z.kind==='kongfu_hammer'){
   const timeline=native.plantAnimations.kongfuHammer;
   if(s.animation==='RotateStart'&&s.elapsed>=timeline.RotateStart.events[0].at)this.change(z,'RotateLoop');
   else if(s.animation==='RotateLoop'&&s.elapsed>=native.zombies.kongfu_hammer.HammerDuration)this.change(z,'RotateEnd');
   else if(s.animation==='RotateEnd'&&s.elapsed>=timeline.RotateEnd.events[0].at)this.change(z,'Resting');
   else if(s.animation==='Resting'&&s.elapsed>=native.zombies.kongfu_hammer.RestDuration)this.change(z,'Walk');
   if(s.animation!=='Walk'){z.eating=false;return true;}
  }
  if(z.kind==='kongfu_rocket_imp'){
   if(s.animation==='Flee'){if(s.elapsed>=native.plantAnimations.kongfuRocket.Flee.duration)g.damage(z,z.hp+z.armor,'blow');return true;}
   if(s.animation==='Drop'){if(s.elapsed>=native.plantAnimations.kongfuRocket.Drop.events.find(e=>e.name==='switchingFalse')!.at)this.change(z,'Walk');return true;}
   if(s.flying){if(z.x<=cellX(0)||g.plants.some(p=>p.hp>0&&!p.hidden&&p.row===z.row&&!['iceburg','spikeweed','spikerock'].includes(p.kind)&&Math.abs(cellX(p.column)-z.x)<45)||g.graves.some(t=>t.hp>0&&t.row===z.row&&Math.abs(cellX(t.column)-z.x)<45)){this.land(z);return true;}z.x-=native.zombies.kongfu_rocket_imp.WalkSPS*native.zombies.kongfu_rocket_imp.WalkSpeedMultFlying*BOARD.cellWidth*dt;return true;}
  }
  return false;
 }
 private catchShot(x:number,y:number,vx:number,damage:number,name:'pea'|'boomerang',powered:boolean){const g=this.g;
  const z=g.zombies.find(z=>z.kind==='kongfu_hammer'&&z.hp>0&&!z.reversed&&g.time>=z.frozenUntil&&g.time>=(z.stunnedUntil??0)&&g.time>=(z.butteredUntil??0)&&Math.abs(z.x-x)<35&&Math.abs(rowY(z.row)-45-y)<40);
  if(!z)return false;const s=z.kongfu!;
  if(s.animation==='Walk'&&vx>0){this.change(z,'RotateStart');return false;}
  if(s.animation!=='RotateLoop')return false;
  this.reflected.push({id:g.nextEntityId(),x,y,vx:-vx,damage:damage*native.zombies.kongfu_hammer.ProjectileDamageMult,name,powered});g.beach.sounds.push('kongfuHammer/hitSounds');return true;
 }
 tip(t:typeof this.tnt[number]){return cellX(t.column)+t.length*BOARD.cellWidth;}
 burningAt(p:Plant,width=BOARD.cellWidth/4){return this.tnt.some(t=>t.lit&&t.row===p.row&&Math.abs(this.tip(t)-cellX(p.column))<width);}
 extinguish(p:Plant,all=false){for(const t of this.tnt)if(all||t.row===p.row&&Math.abs(this.tip(t)-cellX(p.column))<BOARD.cellWidth/2)t.lit=false;}
 tickCombat(dt:number){const g=this.g;
  if(g.zombies.some(z=>z.kind==='kongfu_hammer')){
   g.peas=g.peas.filter(p=>p.vector?.ay!==undefined&&p.vector.ay!==0||!this.catchShot(p.x,p.y,p.vector?.vx??(p.powered?p.speed!:360),p.damage,'pea',p.powered));
   g.cowboy.shots=g.cowboy.shots.filter(p=>!this.catchShot(p.x,rowY(p.row)-45,p.vx,p.damage,'pea',p.mega));
   g.missiles=g.missiles.filter(p=>p.kind!=='boomerang'||!this.catchShot(p.x,p.y,p.dx*656*(p.returning?-1:1),p.damage,'boomerang',p.powered));
  }
  for(const p of this.reflected){p.x+=p.vx*dt;const plant=g.plants.find(t=>t.hp>0&&!t.hidden&&Math.abs(cellX(t.column)-p.x)<25&&Math.abs(rowY(t.row)-45-p.y)<40);if(plant){const armor=Math.min(plant.armor,p.damage);plant.armor-=armor;plant.hp-=(p.damage-armor)*g.future.plantDamageScale(plant);p.x=-200;}}
  this.reflected=this.reflected.filter(p=>p.x>0&&p.x<BOARD.width);
  for(const t of this.tnt){
   if(t.explodeAt!==null){if(g.time-t.explodeAt>=native.plantAnimations.kongfuTNT.Explode.duration&&g.phase==='playing'){
    const config=g.level.tnt!;if(config.DamagesToPlants)for(const p of g.plants)if(Math.abs(p.row-t.row)<=1&&Math.abs(p.column-t.column)<=1)p.hp-=1800;
    if(config.DamagesToZombies)for(const z of g.zombies)if(Math.abs(z.row-t.row)<=1&&Math.abs(z.x-cellX(t.column))<123)g.damage(z,1800);
    g.effects.push({id:g.nextEntityId(),kind:'explode',x:cellX(t.column),y:rowY(t.row),age:0});if(config.TriggerGameLose){g.phase='lost';g.lossReason='tnt';g.events.push({type:'lose'});}
   }continue;}
   if(t.lit){t.length-=t.speed*dt;
    if(g.westFinale.winds.some(w=>w.row===t.row&&w.until>g.time))t.lit=false;
    for(const pea of g.peas)if(pea.snow&&pea.row===t.row&&Math.abs(pea.x-this.tip(t))<25){t.lit=false;pea.x=1300;}
    if(t.length<=0){t.length=0;t.explodeAt=g.time;}
   }else {const z=g.zombies.find(z=>z.hp>0&&z.kongfu?.torch&&z.row===t.row&&z.x-30<=this.tip(t)&&z.x>=cellX(t.column));if(z){t.length=Math.min(t.length,(z.x-30-cellX(t.column))/BOARD.cellWidth);t.lit=true;z.kongfu!.torch=false;g.beach.sounds.push('kongfuTNT/igniteSounds');}}
  }
 }
}
