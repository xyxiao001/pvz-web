import {BOARD,cellX,rowY,type PlantKind} from './level';
import type {Game,Plant,Zombie,Sun} from './model';
import {isFlying} from './pirate';
import laserCurve from '../../public/assets/future/laser-food-curve.json';
export const futureArmor=(kind:string)=>kind==='future_armor1'?'future_armor1':kind==='future_armor2'?'future_armor2':null;
export interface FutureZombie {animation:string;at:number;elapsed:number;event:number;high:boolean;shield?:number;master?:number;recover:number;pause:number;hop:boolean;empUntil?:number;next?:number;imp?:boolean;summoned?:number[];beam?:{from:{x:number;y:number};to:{x:number;y:number};x:number;y:number}}
interface Visual {id:number;name:string;animation:string;x:number;y:number;at:number;duration:number}
interface Link {id:number;from:{row:number;column:number};to:{row:number;column:number};group:string;at:number;arrive:number;sent:boolean}
export class FutureBattle {
  #game:Game;
  visuals:Visual[]=[];links:Link[]=[];sounds:string[]=[];
  private serial=0;
  private discoPlayed=false;
  private discoMusicAt=-Infinity;
  shots:{id:number;x:number;y:number;row:number;food:boolean;hits:Set<number>}[]=[];
  private lasers=new Map<number,{hits:Set<number>;lastX:number;nextDirt:number}>();
  private blows=new Map<number,number>();
  private bombs:{x:number;y:number;at:number;hit:boolean}[]=[];
  constructor(g:Game){this.#game=g;}
  handles(kind:PlantKind){return ['laser_bean','blover','citron','empea','powerplant_alpha','powerplant_beta'].includes(kind);}
  private play(p:Plant,animation:string,action:Plant['action']='idle'){p.animation=animation;p.action=action;p.actionAt=this.#game.time;p.eventIndex=0;}
  init(p:Plant){if(p.kind==='powerplant_alpha'||p.kind==='powerplant_beta'){this.play(p,'Dig','explode');this.sounds.push(p.kind+'/digSounds');return;}if(p.kind==='citron'){this.charge(p);return;}if(p.kind==='empea'){this.play(p,'Attack','explode');return;}this.play(p,p.kind==='blover'?'BlowStart':'Idle',p.kind==='blover'?'shoot':'idle');if(p.kind==='blover')this.sounds.push('blover/windSound');}
  food(p:Plant){if(p.kind==='citron'){this.play(p,'Food','food');this.visual('citronLightning','Play',cellX(p.column),rowY(p.row));this.sounds.push('citron/foodSounds');return;}this.play(p,'FoodStart','food');this.lasers.set(p.id,{hits:new Set(),lastX:cellX(p.column),nextDirt:cellX(p.column)});this.sounds.push('laser_bean/foodSound');}
  link(p:Plant){
    const g=this.#game,t=g.level.powerTiles.find(t=>t.row===p.row&&t.column===p.column);if(!t)return;
    for(const q of g.level.powerTiles)if(q!==t&&q.group===t.group)this.links.push({id:++this.serial,from:t,to:q,group:t.group,at:g.time+t.delay,arrive:g.time+t.delay+(Math.abs(q.column-t.column)+Math.abs(q.row-t.row))/16,sent:false});
  }
  visual(name:string,animation:string,x:number,y:number){const g=this.#game;this.visuals.push({id:++this.serial,name,animation,x,y,at:g.time,duration:g.props.plantAnimations[name][animation].duration});}
  tickPlant(p:Plant,dt:number){
    const g=this.#game,props=g.props.plants[p.kind];p.age+=dt;
    if(p.kind==='citron'||p.kind==='empea'||p.kind==='powerplant_alpha'||p.kind==='powerplant_beta'){this.tickNewPlant(p);return;}
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
    if(!['future_gargantuar','disco_mech','future_jetpack_disco','future_protector','future_protector_shield','future_imp','future_jetpack','mech_cone'].includes(z.kind))return;
    z.future={animation:z.kind==='future_imp'?'Fall':z.kind==='future_protector_shield'?'Spawn':'Walk',at:this.#game.time,elapsed:0,event:0,high:false,recover:0,pause:0,hop:false};
    if(z.kind==='future_gargantuar'){z.future.imp=true;z.future.next=this.#game.props.zombies[z.kind].EyeLaserDelayBetweenShots;}if(z.kind==='disco_mech'){z.future.summoned=[];z.future.next=this.#game.props.zombies[z.kind].DanceCountdown;}
    if(z.kind==='future_imp'){z.landUntil=this.#game.time+1;this.sounds.push('futureImp/fallSound');}
  }
  private animate(z:Zombie,animation:string){const s=z.future!;s.animation=animation;s.at=this.#game.time;s.elapsed=0;s.event=0;}
  private killShields(master:Zombie){const g=this.#game,s=master.future!;for(const z of g.zombies)if(z.future?.master===master.id)z.hp=0;s.shield=undefined;s.recover=g.props.zombies.future_protector.ShieldRecoverTime;s.pause=g.props.zombies.future_protector.ShieldKillStunTime;}
  die(z:Zombie){if(z.kind==='disco_mech'&&z.future!.animation==='SummonLoop')this.killDancers(z);if(z.future?.beam)delete z.future.beam;if(z.kind==='future_protector'&&z.future!.shield!==undefined)this.killShields(z);}
  damageShield(z:Zombie,amount:number){
    const g=this.#game,master=g.zombies.find(m=>m.id===z.future!.master)!;
    const health=z.hp-amount;
    for(const shield of g.zombies)if(shield.future?.master===master.id){shield.hp=health;this.animate(shield,'Hit');}
    if(health<=0)this.killShields(master);
  }
  tickZombie(z:Zombie,dt:number){
    const g=this.#game,s=z.future;if(!s)return false;
    if(z.kind==='future_protector_shield')return true;
    if(this.tickMech(z,dt))return true;
    if(z.kind==='future_protector'){
      if(s.pause>0){s.pause-=dt;this.animateIf(z,'Idle');return true;}
      if(s.shield===undefined&&z.x<cellX(9)&&z.x>=BOARD.left&&!z.leap){
        if(s.recover>0){if(!z.eating)s.recover-=dt;}else{
          for(let row=Math.max(0,z.row-1);row<=Math.min(4,z.row+1);row++){const shield=g.spawnZombie('future_protector_shield',row,z.x-.95*BOARD.cellWidth);shield.future!.master=z.id;}
          s.shield=1;s.pause=g.props.zombies.future_protector.ShieldKillStunTime;this.sounds.push('futureShield/spawnSounds','futureProtector/activateSound');return true;
        }
      }
    }
    if(z.kind==='future_jetpack'||z.kind==='future_jetpack_disco'){
      if(s.animation==='Rise'||s.animation==='Land'){
        s.elapsed+=dt;const timeline=g.props.plantAnimations[z.kind==='future_jetpack'?'futureJetpack':'discoJetpack'][s.animation];if(s.elapsed<timeline.duration)return true;this.animate(z,s.high?'Walk_High':'Walk');
      }
      const plant=g.plants.find(p=>p.hp>0&&p.row===z.row&&Math.abs(z.x-cellX(p.column))<55&&!['blover','spikeweed','spikerock','iceweed','potatomine','empea','powerplant_alpha','powerplant_beta'].includes(p.kind));
      const high=!!plant&&plant.kind!=='tallnut';
      if(high!==s.high){s.high=high;this.animate(z,high?'Rise':'Land');return true;}
      if(high){z.eating=false;z.x-=g.props.zombies[z.kind].WalkSPS*BOARD.cellWidth*dt*(g.time<z.chilledUntil?.5:1);return true;}
    }
    if(z.kind==='future_imp'){
      if(s.animation==='Fall'){this.animate(z,'Land');this.sounds.push('futureImp/landSound');}
      const plant=g.plants.find(p=>p.hp>0&&p.row===z.row&&Math.abs(z.x-cellX(p.column))<38&&!['blover','spikeweed','spikerock','iceweed','empea','powerplant_alpha','powerplant_beta'].includes(p.kind));
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
    this.animateIf(z,z.eating&&z.kind!=='future_gargantuar'?'Eat':'Walk');return false;
  }
  private animateIf(z:Zombie,animation:string){if(z.future!.animation!==animation)this.animate(z,animation);}

  rate(p:Plant){return p.kind==='citron'?(p.animation==='Food'?.7:p.animation==='Ready'?1:9.5/this.#game.props.plants.citron.ChargeTime):1;}
  private charge(p:Plant){this.play(p,'Charge','shoot');this.sounds.push('citron/chargeSounds');}
  private tickNewPlant(p:Plant){
    const g=this.#game;
    if(p.kind==='citron'&&p.animation==='Ready'&&(g.zombies.some(z=>z.hp>0&&g.inLane(z,p.row)&&z.x>=cellX(p.column)-20)||g.graves.some(t=>t.row===p.row&&t.column>=p.column))){this.play(p,'Shoot','shoot');this.sounds.push('citron/shootSounds');}
    const timeline=g.props.plantAnimations[p.kind][p.animation!],elapsed=(g.time-p.actionAt)*this.rate(p);
    while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
      const event=timeline.events[p.eventIndex!++].name;
      if(event==='tile'){const group=p.kind==='powerplant_alpha'?'alpha':'beta';g.level.powerTiles.push({group,row:p.row,column:p.column,delay:1});this.visual('tile_'+group+'Flash','Play',cellX(p.column),rowY(p.row));p.hp=0;p.transformed=true;return;}
      if(event==='explode'){
        for(const z of g.zombies)if(z.hp>0){const dx=Math.abs(z.x-cellX(p.column)),dy=Math.abs(z.row-p.row);if(dy<=1&&dx<=2.5*BOARD.cellWidth||dy<=2&&dx<=1.5*BOARD.cellWidth)this.emp(z,g.props.plants.empea.StunDuration);}
        this.visual('empBlast','Play',cellX(p.column),rowY(p.row));this.sounds.push('empea/explSound');
      }
      if(event==='die'){p.hp=0;return;}
      if(event==='ready'){this.play(p,'Ready');return;}
      if(event==='shrink'||event==='foodEnd'){this.play(p,'Shrink','shoot');return;}
      if(event==='chargeStart'){this.charge(p);return;}
      if(event==='land')this.sounds.push('citron/landSounds');
      if(event==='shoot'||event==='foodShoot')this.shots.push({id:++this.serial,x:cellX(p.column),y:rowY(p.row)-45,row:p.row,food:event==='foodShoot',hits:new Set()});
    }
  }
  private tickShots(dt:number){
    const g=this.#game;
    for(const shot of this.shots){
      const old=shot.x;shot.x+=6*BOARD.cellWidth*dt;
      const props=g.props.projectiles[shot.food?'citron_pf':'citron'];
      const targets=[...g.zombies.filter(z=>z.hp>0&&g.inLane(z,shot.row)&&!shot.hits.has(z.id)).map(z=>({id:z.id,x:z.x,z})),...g.graves.filter(t=>t.hp>0&&t.row===shot.row&&!shot.hits.has(t.id)).map(t=>({id:t.id,x:cellX(t.column),t}))].filter(t=>t.x>=old-25&&t.x<=shot.x+25).sort((a,b)=>a.x-b.x);
      for(const target of targets){
        shot.hits.add(target.id);
        if(shot.food&&'z' in target&&target.z.kind!=='future_protector_shield'&&!g.props.zombies[target.z.kind].CannotBeTossedByCitron){target.z.hp=0;target.z.deathCause='toss';this.visual('citronToss','Play',target.x,rowY(shot.row));this.sounds.push('citronFood/tossSounds');continue;}
        if('z' in target)g.damage(target.z,props.Damage,shot.food?'electric':'normal');else target.t.hp-=shot.food?target.t.hp:props.Damage;
        if(shot.food&&'t' in target)continue;
        for(const splash of props.SplashDamage)for(const z of g.zombies)if(z.id!==target.id&&z.hp>0&&Math.abs(z.row-shot.row)<=Math.floor(splash.Range.h/2)&&Math.abs(z.x-target.x)<=splash.Range.w*BOARD.cellWidth/2)g.damage(z,splash.Damage!);
        this.visual(shot.food?'citronFoodHit':'citronHit','Play',target.x,shot.food?rowY(shot.row):shot.y);this.sounds.push(shot.food?'citronFood/PopSound':'citronShot/PopSound');shot.x=1300;break;
      }
    }
    this.shots=this.shots.filter(s=>s.x<1200);
  }
  private mechRig(z:Zombie){return z.kind==='future_gargantuar'?'futureGargantuar':z.kind==='disco_mech'?'discoMech':'mechCone';}
  private killDancers(z:Zombie){for(const id of z.future!.summoned!) {const dancer=this.#game.zombies.find(d=>d.id===id);if(dancer)dancer.hp=0;}z.future!.summoned=[];}
  emp(z:Zombie,seconds:number){
    if(!['future_gargantuar','disco_mech','mech_cone'].includes(z.kind))return;
    // MechZombieProps supplies EMPStunTimeScale=1 when the prefab does not override it.
    const g=this.#game,s=z.future!,until=g.time+seconds*(g.props.zombies[z.kind].EMPStunTimeScale??1);
    if((s.empUntil??0)<=g.time){if(z.kind==='disco_mech'){if(s.animation==='SummonLoop')this.killDancers(z);s.next=g.props.zombies[z.kind].DanceDuration/2;}delete s.beam;this.animate(z,'StunStart');this.sounds.push(this.mechRig(z)+'/deactivateSound');}
    s.empUntil=Math.max(s.empUntil??0,until);
  }
  private tickMech(z:Zombie,dt:number){
    if(!['future_gargantuar','disco_mech','mech_cone'].includes(z.kind))return false;
    const g=this.#game,s=z.future!,props=g.props.zombies[z.kind],rig=this.mechRig(z);s.elapsed+=dt*(g.time<z.chilledUntil?.5:1);
    if(s.empUntil!==undefined&&g.time>=s.empUntil){delete s.empUntil;this.animate(z,'StunEnd');this.sounds.push(rig+'/activateSound');}
    const timeline=g.props.plantAnimations[rig][s.animation];
    while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){
      const event=timeline.events[s.event++].name;
      if(event==='mechStun'){this.animate(z,'StunLoop');return true;}
      if(event==='switchingFalse'){this.animate(z,'Walk');return true;}
      if(event==='smash'){
        const target=g.plants.filter(p=>p.hp>0&&p.row===z.row&&Math.abs(cellX(p.column)-(z.x-35))<70&&!['empea','blover','iceburg','cherry_bomb','powerplant_alpha','powerplant_beta'].includes(p.kind)).sort((a,b)=>b.column-a.column)[0];
        if(target){const absorbed=Math.min(target.armor,props.SmashDamage);target.armor-=absorbed;target.hp-=props.SmashDamage-absorbed;}this.sounds.push(rig+'/smashSounds');
      }
      if(event==='throw'&&s.imp){
        s.imp=false;const imp=g.spawnZombie('future_imp',z.row,z.x);imp.landUntil=undefined;this.animate(imp,'Fall');imp.leap={fromX:z.x,fromY:rowY(z.row)-120,toX:cellX(2),toRow:z.row,at:g.time,duration:1.5};this.sounds.push(rig+'/throwSound');
      }
      if(event==='shootStart'){
        const x=cellX(0)+g.random()*(Math.min(cellX(props.EyeLaserMaxColumn),z.x-props.EyeLaserMinDistance*BOARD.cellWidth)-cellX(0)),y=rowY(0)-g.random()*4*BOARD.cellHeight+4*BOARD.cellHeight,angle=g.random()*Math.PI*2;
        s.beam={from:{x,y},to:{x:x+Math.cos(angle)*BOARD.cellHeight*props.EyeLaserSweepLength,y:y+Math.sin(angle)*BOARD.cellHeight*props.EyeLaserSweepLength},x,y};this.animate(z,'ShootLoop');return true;
      }
      if(event==='summonStart'){
        this.animate(z,'SummonLoop');this.sounds.push(rig+'/summonSound');
        for(const [row,x] of [[z.row,z.x-1.2*BOARD.cellWidth],[z.row,z.x+1.2*BOARD.cellWidth],[z.row-1,z.x],[z.row+1,z.x]])if(row>=0&&row<5){const dancer=g.spawnZombie('future_jetpack_disco',row,x,'ground');s.summoned!.push(dancer.id);}
        return true;
      }
    }
    if(s.empUntil!==undefined||s.animation==='StunEnd')return true;
    if(s.animation==='ShootLoop'){
      const b=s.beam!,t=Math.min(1,s.elapsed/props.EyeLaserSweepTime);b.x=b.from.x+(b.to.x-b.from.x)*t;b.y=b.from.y+(b.to.y-b.from.y)*t;
      for(const p of g.plants)if(p.hp>0&&p.kind!=='powerplant_alpha'&&p.kind!=='powerplant_beta'&&Math.abs(cellX(p.column)-b.x)<35&&Math.abs(rowY(p.row)-40-b.y)<50){const amount=props.EyeLaserTotalDamage*dt,armor=Math.min(p.armor,amount);p.armor-=armor;p.hp-=amount-armor;}
      for(const other of g.zombies)if(other!==z&&other.hp>0&&Math.abs(other.x-b.x)<35&&Math.abs(rowY(other.row)-40-b.y)<50)g.damage(other,props.EyeLaserTotalDamage*dt);
      for(const tomb of g.graves)if(Math.abs(cellX(tomb.column)-b.x)<35&&Math.abs(rowY(tomb.row)-40-b.y)<50)tomb.hp-=props.EyeLaserTotalDamage*dt;
      if(t===1){delete s.beam;this.animate(z,'ShootEnd');s.next=props.EyeLaserDelayBetweenShots;this.sounds.push(rig+'/shootEndSound',rig+'/rayEndSound');}return true;
    }
    if(s.animation==='SummonLoop'){if(s.elapsed>=props.SummonDuration){s.summoned=[];s.next=props.DanceDuration;this.animate(z,'SummonEnd');this.sounds.push(rig+'/summonEndSounds');}return true;}
    if(!['Walk','Eat','Idle'].includes(s.animation))return true;
    if(z.x>=cellX(9))return false;
    if(z.kind==='future_gargantuar'){
      if(s.imp&&z.hp<props.Toughness/2&&z.x>cellX(2)){this.animate(z,'Throw');return true;}
      if(g.plants.some(p=>p.hp>0&&p.row===z.row&&z.x-cellX(p.column)>-22&&z.x-cellX(p.column)<65&&!['empea','blover','iceburg','cherry_bomb','powerplant_alpha','powerplant_beta'].includes(p.kind))){this.animate(z,'Smash');return true;}
      if(z.x>cellX(props.EyeLaserMinDistance)){s.next!-=dt;if(s.next!<=0){this.animate(z,'ShootStart');this.sounds.push(rig+'/shootStartSound',rig+'/rayStartSound');return true;}}
    }
    if(z.kind==='disco_mech'){s.next!-=dt;if(s.next!<=0){this.animate(z,'SummonStart');if(!this.discoPlayed){this.discoPlayed=true;this.discoMusicAt=g.time;this.sounds.push(rig+'/musicClip');}else if(g.time-this.discoMusicAt>=2.899592*1.5){this.discoMusicAt=g.time;this.sounds.push(rig+'/musicClipWeak');}return true;}}
    return false;
  }

  collectBomb(sun:Sun){this.visual('sunbombBlast','Play',sun.x,sun.y);this.bombs.push({x:sun.x,y:sun.y,at:this.#game.time,hit:false});this.sounds.push('sunbomb/explodeSound');this.endRay(sun);}
  endRay(sun:Sun){this.visual('sunbombRay','Die',sun.x,sun.y);}
  defuse(sun:Sun){sun.bomb=false;sun.defusedAt=this.#game.time;this.endRay(sun);this.sounds.push('sunbomb/defuseSound');}
  tick(dt:number){
    const g=this.#game;
    this.tickShots(dt);
    for(const link of this.links){
      if(g.time>=link.at&&!link.sent){link.sent=true;this.visual('tile_'+link.group+'Flash','Play',cellX(link.from.column),rowY(link.from.row));}
      if(g.time>=link.arrive){this.visual('tile_'+link.group+'Flash','Play',cellX(link.to.column),rowY(link.to.row));g.plantFood(link.to.row,link.to.column,true);}
    }
    this.links=this.links.filter(l=>g.time<l.arrive);
    for(const [id,until] of this.blows)if(g.time<until&&g.plants.some(p=>p.id===id&&p.hp>0))for(const z of g.zombies)if(z.hp>0&&z.kind!=='future_protector_shield'&&(isFlying(z)||z.leap||z.kind==='future_imp'&&z.future?.animation==='Fall')){z.hp=0;z.deathCause='blow';}
    for(const z of g.zombies){
      if(z.future?.beam&&g.time<z.frozenUntil){delete z.future.beam;this.animate(z,'ShootEnd');z.future.next=g.props.zombies[z.kind].EyeLaserDelayBetweenShots;}
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
