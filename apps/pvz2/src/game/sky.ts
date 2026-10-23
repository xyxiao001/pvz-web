import ship from '../../public/assets/sky/ship.json';
import flyingPlants from '../../public/assets/sky/flying-plants.json';
import {BOARD,cellX,rowY,type PlantKind,type SpawnAction} from './level';
import type {Game,Plant,Zombie} from './model';
import {SkyPlants} from './sky-plants';

type DropProps=NonNullable<SpawnAction['dropShip']>['DropShipShiftedProperties'];
export interface DropShip {id:number;x:number;row:number;animation:string;elapsed:number;event:number;left:number;next:number;props:DropProps}
export class SkyBattle {
 health=ship.Toughness;
 shield=0;
 drops:DropShip[]=[];
 bullets:{id:number;x:number;row:number}[]=[];
 readonly plants:SkyPlants;
 private serial=0;
 constructor(private g:Game){this.plants=new SkyPlants(g);}
 get edge(){return cellX(ship.EdgeX)+(this.shield>0?BOARD.cellWidth/3:0);}
 setShield(owned:boolean){this.shield=owned?ship.ToughnessShield:0;}
 canPlant(kind:PlantKind,column:number){return this.g.level.world!=='sky'||column<3||flyingPlants.includes(kind);}
 initPlant(p:Plant){this.plants.init(p);}
 food(p:Plant){this.plants.food(p);}
 plant(p:Plant){this.plants.plant(p);}
 damageShip(amount:number,bypass=false){
  const g=this.g;if(g.level.world!=='sky'||g.phase!=='playing')return;
  if(this.shield>0&&!bypass)this.shield-=amount;
  else this.health-=amount;
  if(this.health<=0){g.phase='lost';g.lossReason='ship';g.events.push({type:'lose'});}
 }
 private range(v:{Min:number;Max:number}){return v.Min+this.g.random()*(v.Max-v.Min);}
 addDropShip(action:NonNullable<SpawnAction['dropShip']>){
  const p=action.DropShipShiftedProperties;
  // Native SkyDropShip.onLaneSpawnSettled fixes X to column 7, regardless of the wave's mX.
  this.drops.push({id:++this.serial,x:cellX(7),row:action.DropShipPosition.mY,animation:'Spawn',elapsed:0,event:0,left:Math.floor(this.range({Min:p.ImpCount.Min,Max:p.ImpCount.Max+1})),next:this.range(p.TimeBeforeFirst),props:p});
 }
 damagePilot(z:Zombie,amount:number){
  if(z.kind!=='sky_battleplane')return amount;
  const state=z.sky??(z.sky={animation:'Walk',elapsed:0,event:0,impHealth:390,speed:1});
  if(state.impHealth<=0)return amount;
  const absorbed=Math.min(amount,state.impHealth);state.impHealth-=absorbed;
  if(state.impHealth<=0)this.g.beach.sounds.push('skyBattlePlane/speedUpSounds');
  return amount-absorbed;
 }
 private play(z:Zombie,animation:string){z.sky!.animation=animation;z.sky!.elapsed=0;z.sky!.event=0;}
 zombie(z:Zombie,dt:number){
  if(!z.kind.startsWith('sky')||z.kind==='sky_imp')return false;
  const g=this.g,state=z.sky??(z.sky={animation:'Walk',elapsed:0,event:0,impHealth:390,speed:1});
  const name=z.kind==='sky_battleplane'?'skyBattlePlane':z.kind==='sky_flag'?'skyFlag':'sky';
  const chilled=g.time<z.chilledUntil?.5:1;dt*=chilled;
  const target=g.plants.filter(p=>p.hp>0&&!p.hidden&&p.row===z.row&&Math.abs(z.x-cellX(p.column))<40).sort((a,b)=>b.column-a.column)[0];
  if(z.kind==='sky_battleplane'){
   if(state.animation==='FleeStart'||state.animation==='FleeEnd'){
    state.elapsed+=dt;
    const timeline=g.props.plantAnimations[name][state.animation];
    if(state.animation==='FleeStart'&&state.elapsed>=timeline.events.find(e=>e.name==='flee_end')!.at){z.x=cellX(9.5);z.row=Math.floor(g.random()*5);this.play(z,'FleeEnd');}
    else if(state.animation==='FleeEnd'&&state.elapsed>=timeline.duration)this.play(z,'Walk');
    return true;
   }
   if(target||g.level.world==='sky'&&z.x-60*.6<=this.edge){
    if(state.impHealth>0){this.play(z,'FleeStart');g.beach.sounds.push('skyBattlePlane/fleeSounds');}
    else {if(target)target.hp-=1200;else this.damageShip(1200);z.hp=0;}
    return true;
   }
   state.speed=state.impHealth>0?Math.max(1,state.speed-dt):Math.min(2,state.speed+dt);
   const shooting=state.impHealth>0&&(g.level.world==='sky'||g.plants.some(p=>p.hp>0&&!p.hidden&&p.row===z.row&&cellX(p.column)<z.x));
   const animation=state.impHealth<=0?'Walk_Dead':shooting?'Walk_Shoot':'Walk';
   if(state.animation!==animation)this.play(z,animation);
   state.elapsed+=dt;const timeline=g.props.plantAnimations[name][animation];
   while(state.event<timeline.events.length&&state.elapsed>=timeline.events[state.event].at){const event=timeline.events[state.event++].name;if(event==='bullet')this.bullets.push({id:++this.serial,x:z.x-40,row:z.row});if(event==='shoot')g.beach.sounds.push('skyBattlePlane/shootSounds');}
   if(state.elapsed>=timeline.duration){state.elapsed-=timeline.duration;state.event=0;}
   z.x-=g.props.zombies[z.kind].WalkSPS*BOARD.cellWidth*state.speed*dt;return true;
  }
  const firing=!target&&!z.reversed&&g.level.world==='sky'&&z.x-(state.animation==='FireLoop'?60:40)*.6<=this.edge;
  if(firing){
   z.eating=false;
   if(state.animation==='Walk'||state.animation==='Eat')this.play(z,'FireStart');
   state.elapsed+=dt;
   if(state.animation==='FireStart'&&state.elapsed>=g.props.plantAnimations[name].FireStart.events.find(e=>e.name==='fire_on')!.at){this.play(z,'FireLoop');g.beach.sounds.push(name+'/fireStartSound');}
   if(state.animation==='FireLoop')this.damageShip(100*dt);
   return true;
  }
  if(state.animation==='FireStart'||state.animation==='FireLoop')this.play(z,'FireEnd');
  if(state.animation==='FireEnd'){state.elapsed+=dt;if(state.elapsed>=g.props.plantAnimations[name].FireEnd.duration)this.play(z,'Walk');return true;}
  state.animation=target?'Eat':'Walk';
  return false;
 }
 tick(dt:number){
  const g=this.g;this.plants.tick(dt);
  if(g.level.world==='sky'&&(g.plants.some(p=>p.hp>0&&p.kind==='blover'&&p.animation==='Blowing')||g.westFinale.winds.length>0))this.damageShip(ship.BloverDPS*dt,true);
  for(const d of this.drops){
   d.elapsed+=dt;const timeline=g.props.plantAnimations.skyDropShip[d.animation];
   while(d.event<timeline.events.length&&d.elapsed>=timeline.events[d.event].at){const event=timeline.events[d.event++].name;
    const sound:Record<string,string>={intro:'introSounds',outro:'outroSounds',open:'openSounds',closing:'closingSounds',closed:'closedSounds',warn:'warnSounds',jump:'jumpSaySounds'};
    if(sound[event])g.beach.sounds.push('skyDropShip/'+sound[event]);
    if(event==='spawn'){
     const p=d.props,column=p.ImpLandingColumns.length?p.ImpLandingColumns[Math.floor(g.random()*p.ImpLandingColumns.length)]:Math.floor(g.random()*9),row=p.ImpLandingRows.length?p.ImpLandingRows[Math.floor(g.random()*p.ImpLandingRows.length)]:Math.floor(g.random()*5);
     const z=g.spawnZombie(p.ImpType,d.row,d.x);z.reversed=true;z.leap={fromX:d.x,fromY:rowY(d.row)-200,toX:cellX(column),toRow:row,at:g.time,duration:this.range(p.ImpFlyingDuration)};
     d.left--;d.animation=d.left===0?'Death':'Waiting';d.elapsed=0;d.event=0;d.next=this.range(p.TimeBetween);break;
    }
   }
   if(d.animation==='Spawn'&&d.elapsed>=timeline.duration){d.animation='Waiting';d.elapsed=0;d.event=0;}
   if(d.animation==='Waiting'){d.next-=dt;if(d.next<=0){d.animation='Jump';d.elapsed=0;d.event=0;}}
  }
  this.drops=this.drops.filter(d=>d.animation!=='Death'||d.elapsed<g.props.plantAnimations.skyDropShip.Death.duration);
  for(const b of this.bullets){
   const old=b.x;b.x-=13*BOARD.cellWidth*dt;
   const target=g.plants.filter(p=>p.hp>0&&!p.hidden&&p.row===b.row&&cellX(p.column)>=b.x-20&&cellX(p.column)<=old+20).sort((a,b)=>b.column-a.column)[0];
   if(target){if(g.beachFinale.reflect(target,30)){b.x=-1000;continue;}const absorbed=Math.min(target.armor,30);target.armor-=absorbed;target.hp-=30-absorbed;b.x=-1000;}
   else if(g.level.world==='sky'&&b.x<=this.edge){this.damageShip(20);b.x=-1000;}
  }
  this.bullets=this.bullets.filter(b=>b.x>-100);
 }
}
