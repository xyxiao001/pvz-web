import {BOARD,cellX,rowY} from './level';
import type {Game,Plant,Zombie} from './model';

export class IceageCombat {
  weaselThrowers:{row:number;x:number;reversed:boolean;left:number;cooldown:number}[]=[];
  primalPeas:{fire?:'firePea'|'bluePea';id:number;row:number;x:number;y:number;kind:'pea_primal'|'pea_primal_kb'|'pea_primal_pf'}[]=[];
  firePeas:{id:number;row:number;x:number;y:number}[]=[];
  fireHits:{id:number;x:number;y:number;at:number}[]=[];
  troglobites=new Map<number,{at:number;elapsed:number;event:number;pushing:boolean}>();
  stunionGas=new Map<number,number>();
  heat=new Map<number,number>();
  hunters=new Map<number,{at:number;next:number;left:number;event:number;throwing:boolean}>();
  veteranHunters=new Map<number,{at:number;cooldown:number;event:number;throwing:boolean}>();
  lobbedSnowballs:{id:number;row:number;column:number;fromX:number;toX:number;x:number;y:number;at:number}[]=[];
  snowballs:{id:number;row:number;x:number}[]=[];
  peppers:{id:number;row:number;fromX:number;fromY:number;x:number;y:number;toX:number;toY:number;at:number;food:boolean}[]=[];
  chilled=new Map<string,number>();
  constructor(private g:Game){}
  init(p:Plant){if(p.kind==='endurian')p.animation='Idle00';if(p.kind==='stunion')p.animation='Idle';if(p.kind==='lavaguava'||p.kind==='pepperpult'||p.kind==='firepeashooter'){this.heat.set(p.id,this.g.time+this.g.props.plants[p.kind].WarmingRadius!.PulseInitialDelay);p.animation='Idle';}}
  spawn(z:Zombie){if(z.kind==='iceage_hunter_veteran')this.veteranHunters.set(z.id,{at:0,cooldown:0,event:0,throwing:false});if(z.kind==='iceage_weaselhoarder')z.weasel={hidden:true,exploding:false,at:0,elapsed:0,event:0};if(z.kind==='iceage_troglobite_1block'||z.kind==='iceage_troglobite_2block'||z.kind==='iceage_troglobite'||z.kind==='iceage_troglobite_veteran'){const g=this.g,prop=g.props.zombies[z.kind],column=Math.floor((z.x-BOARD.left)/BOARD.cellWidth);for(let i=0;i<prop.NumberOfIceblocksToSpawnWith;i++){const col=column+i;if(!g.iceage.blocks.some(b=>b.hp>0&&b.row===z.row&&b.column===col)){const imp=g.spawnZombie(prop.ImpTypes[Math.floor(g.random()*prop.ImpTypes.length)],z.row,cellX(col));g.iceage.freeze(z.row,col,imp);}}z.x=cellX(column+prop.NumberOfIceblocksToSpawnWith+1);this.troglobites.set(z.id,{at:0,elapsed:0,event:0,pushing:false});}if(z.kind==='iceage_dodo')z.dodo={animation:'Walk',at:0,elapsed:0,event:0,flying:false,remaining:0,column:Math.floor((z.x-BOARD.left)/BOARD.cellWidth)};if(z.kind==='iceage_hunter'){const g=this.g,p=g.props.zombies.iceage_hunter;this.hunters.set(z.id,{at:0,next:g.time+p.TimeBeforeFirst+g.random()*p.TimeBeforeFirstAddtional,left:p.SnowballsPerBarrage,event:0,throwing:false});}}
  food(p:Plant){if(p.kind==='endurian')this.g.beach.sounds.push('endurian/food');if(p.kind==='primalpeashooter')p.burst=0;p.animation=p.kind==='firepeashooter'?'FoodStart':'Food';if(p.kind==='firepeashooter')this.heat.set(p.id,this.g.time+this.g.props.plants.firepeashooter.WarmingRadiusPlantfood!.PulseInitialDelay);p.actionAt=this.g.time;p.eventIndex=0;}
  cold(row:number,column:number,amount:number){const g=this.g,plants=g.plants.filter(p=>p.hp>0&&p.row===row&&p.column===column);if(!plants.length||plants.some(p=>p.action==='food'||g.props.plants[p.kind].ImmuneToIceblock))return;const key=row+':'+column,ice=g.iceage.blocks.find(b=>b.hp>0&&b.row===row&&b.column===column);if(ice){ice.hp=Math.min(600,ice.hp+150*amount);return;}const level=(g.iceage.cold.get(key)??0)+amount;if(level>2){g.iceage.freeze(row,column);g.iceage.cold.delete(key);}else g.iceage.cold.set(key,level);}
  private lob(p:Plant,row:number,x:number,food:boolean){this.peppers.push({id:this.g.nextEntityId(),row,fromX:cellX(p.column),fromY:rowY(p.row)-80,x:cellX(p.column),y:rowY(p.row)-80,toX:x,toY:rowY(row)-25,at:this.g.time,food});}
  tickPlant(p:Plant){const g=this.g,prop=g.props.plants.pepperpult;
    const targets=()=>[...g.zombies.filter(z=>z.hp>0&&g.inLane(z,p.row)).map(z=>({row:p.row,x:z.x})),...g.iceage.blocks.filter(b=>b.hp>0&&b.glacier&&b.row===p.row).map(b=>({row:b.row,x:cellX(b.column)}))].filter(t=>t.x>=cellX(p.column)).sort((a,b)=>a.x-b.x);
    if(p.action==='idle'&&g.time>=p.nextAction&&targets().length){p.action='shoot';p.animation='Lob';p.actionAt=g.time;p.eventIndex=0;p.nextAction=g.time+prop.ThrowInterval+g.random()*prop.ThrowIntervalAdditional;}
    if(p.action==='idle')return;
    const timeline=g.props.plantAnimations.pepperpult[p.animation!];
    while(p.eventIndex!<timeline.events.length&&g.time-p.actionAt>=timeline.events[p.eventIndex!].at){const e=timeline.events[p.eventIndex!++].name;
      if(e==='Lob'){const target=targets()[0];if(target)this.lob(p,target.row,target.x,false);}
      if(e.startsWith('foodLob')){const [lo,hi]=e==='foodLobL'?[-1,3]:e==='foodLobR'?[5,9]:[2,6],targets=g.zombies.filter(z=>z.hp>0&&z.x>=cellX(lo)&&z.x<=cellX(hi));for(let i=0;i<3;i++){const z=targets.splice(Math.floor(g.random()*targets.length),1)[0];this.lob(p,z?z.row:Math.floor(g.random()*5),z?z.x:cellX(Math.max(0,lo)+Math.floor(g.random()*(Math.min(8,hi)-Math.max(0,lo)+1))),true);}}
      if(['LobSound','reload','foodSound'].includes(e))g.beach.sounds.push('pepperpult/'+({LobSound:'lobSound',reload:'reload',foodSound:'foodSound'}[e]));
    }
    if(g.time-p.actionAt>=timeline.duration){p.action='idle';p.animation='Idle';}
  }
  hunter(z:Zombie,dt:number){if(z.kind==='iceage_hunter_veteran')return this.veteranHunter(z,dt);const s=this.hunters.get(z.id);if(!s)return false;const g=this.g,prop=g.props.zombies.iceage_hunter;
    const target=()=>g.plants.some(p=>p.hp>0&&p.row===z.row&&!g.iceage.blocked(p)&&p.sheep===undefined&&!['potatomine','spikeweed','spikerock','puffshroom','iceburg','hotpotato'].includes(p.kind)&&z.x-cellX(p.column)>=prop.NearAttackRange*BOARD.cellWidth&&z.x-cellX(p.column)<=prop.FarAttackRange*BOARD.cellWidth);
    if(!s.throwing&&g.time>=s.next&&target()){if(!s.left)s.left=prop.SnowballsPerBarrage;s.throwing=true;s.at=g.time;s.event=0;}
    if(!s.throwing)return false;
    if(g.time<z.chilledUntil)s.at+=dt*.5;
    const timeline=g.props.plantAnimations.iceageHunter.Throw;
    while(s.event<timeline.events.length&&g.time-s.at>=timeline.events[s.event].at){const e=timeline.events[s.event++].name;
      if(e==='throw'){this.snowballs.push({id:g.nextEntityId(),row:z.row,x:z.x-25});s.left--;if(!s.left)s.next=g.time+prop.TimeBetweenBarrages+g.random()*prop.TimeBetweenBarragesAddtional;}
      if(e==='throwSound'){g.beach.sounds.push('iceageHunter/swingSounds','iceageHunter/cluckSounds');}
      if(e==='judgeSwitching'){if(s.left&&target()){s.at=g.time;s.event=0;}else s.throwing=false;break;}
    }
    return s.throwing;
  }
  endurian(p:Plant){
    const g=this.g,prop=g.props.plants.endurian,stage=Math.min(3,4-Math.ceil(p.hp/prop.Toughness*4));
    const start=(animation:string)=>{p.animation=animation;p.actionAt=g.time;p.eventIndex=0;};
    if(p.action==='food'){
      const timeline=g.props.plantAnimations.endurian.Food;
      while(p.eventIndex!<timeline.events.length&&g.time-p.actionAt>=timeline.events[p.eventIndex!].at){const e=timeline.events[p.eventIndex!++].name;if(e==='armor')p.armor=prop.ArmorToughness;if(e==='foodEnd'){p.action='idle';start(`Idle${stage}0`);}}
      return;
    }
    const targets=g.zombies.filter(z=>z.hp>0&&g.inLane(z,p.row)&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth/2+18);
    if(g.time>=p.nextAction){for(const z of targets)g.damage(z,prop.StabDamage+(p.armor>0?prop.StabDamagePFExtra:0));p.nextAction=g.time+prop.StabInterval;}
    const animation=p.animation!,timeline=g.props.plantAnimations.endurian[animation];
    while(p.eventIndex!<timeline.events.length&&g.time-p.actionAt>=timeline.events[p.eventIndex!].at){if(timeline.events[p.eventIndex!++].name==='stab')g.beach.sounds.push('endurian/stab');}
    if(animation.startsWith('AttackStart')||animation.startsWith('AttackEnd')){if(g.time-p.actionAt>=timeline.duration)start(animation.startsWith('AttackStart')?`AttackLoop${stage}`:`Idle${stage}0`);return;}
    if(targets.length&&animation.startsWith('Idle'))start(`AttackStart${stage}`);
    else if(!targets.length&&animation.startsWith('AttackLoop'))start(`AttackEnd${stage}`);
    else if(animation.startsWith('AttackLoop')&&(g.time-p.actionAt>=timeline.duration||!animation.endsWith(String(stage))))start(`AttackLoop${stage}`);
    else if(animation.startsWith('Idle')&&animation!==`Idle${stage}0`)start(`Idle${stage}0`);
  }
  private veteranHunter(z:Zombie,dt:number){
    const s=this.veteranHunters.get(z.id)!,g=this.g,prop=g.props.zombies.iceage_hunter_veteran;
    const target=()=>g.plants.filter(p=>p.hp>0&&p.row===z.row&&p.sheep===undefined&&p.action!=='food'&&!g.props.plants[p.kind].ImmuneToIceblock&&!g.props.plants[p.kind].CannotBeDetectedByCatapult&&!['potatomine','spikeweed','spikerock','puffshroom','iceburg','hotpotato','sunbean','stunion','goldleaf','ghostpepper'].includes(p.kind)&&(z.x-cellX(p.column))*(z.reversed?-1:1)>BOARD.cellWidth/2).sort((a,b)=>(a.column-b.column)*(z.reversed?-1:1))[0];
    const rate=g.time<z.chilledUntil?.5:1;
    if(!s.throwing){s.cooldown-=dt*rate;if(s.cooldown>0)return true;if(z.x<=cellX(8)&&target()){s.throwing=true;s.at=g.time;s.event=0;s.cooldown=prop.LobInterval+g.random()*prop.LobIntervalAdditional;}else return false;}
    z.eating=false;s.at+=dt*(1-rate);
    const timeline=g.props.plantAnimations.iceageHunterVeteran.Throw;
    while(s.event<timeline.events.length&&g.time-s.at>=timeline.events[s.event].at){const e=timeline.events[s.event++].name;
      if(e==='throw'){const p=target(),column=p?p.column:z.reversed?9:-1;this.lobbedSnowballs.push({id:g.nextEntityId(),row:z.row,column,fromX:z.x-25,toX:cellX(column),x:z.x-25,y:rowY(z.row)-40,at:g.time});}
      if(e==='throwSound')g.beach.sounds.push('iceageHunterVeteran/swingSounds','iceageHunterVeteran/cluckSounds');
      if(e==='roll')g.beach.sounds.push('iceageHunterVeteran/rollSounds');
      if(e==='judgeSwitching'){s.throwing=false;break;}
    }
    return true;
  }
  dodo(z:Zombie,dt:number){
    const s=z.dodo;if(!s)return false;const g=this.g,prop=g.props.zombies.iceage_dodo;
    const start=(animation:string)=>{s.animation=animation;s.at=g.time;s.elapsed=0;s.event=0;z.eating=false;};
    if(s.animation==='FlyStart'||s.animation==='FlyEnd'){
      s.elapsed+=dt*(g.time<z.chilledUntil?.5:1);
      const timeline=g.props.plantAnimations.iceageDodo[s.animation];
      while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const e=timeline.events[s.event++].name;if(e==='fly')s.flying=true;if(e==='leapEnd')s.flying=false;if(e==='switchingFalse'){start(s.flying?'FlyLoop':'Walk');break;}}
      return true;
    }
    const column=Math.floor((z.x-BOARD.left)/BOARD.cellWidth);if(column!==s.column){s.remaining--;s.column=column;}
    const ahead=(col:number)=>{const distance=(z.x-cellX(col))*(z.reversed?-1:1);return distance>=-BOARD.cellWidth/2&&distance<=BOARD.cellWidth*1.5;};
    const obstacle=g.level.sliders.some(t=>t.row===z.row&&ahead(t.column))||g.plants.some(p=>p.hp>0&&p.row===z.row&&ahead(p.column)&&prop.PlantsToFlyOver.includes(p.kind));
    const shield=[...g.future.holonuts.values()].some(sh=>sh.shield>0&&ahead(sh.column));
    if(s.flying&&(!obstacle||shield||s.remaining<=0)){start('FlyEnd');return true;}
    if(!s.flying&&obstacle&&!shield){s.remaining=prop.SquaresToFlyOver+1+Math.ceil(prop.SquaresToFlyOverAdditional*g.random());start('FlyStart');return true;}
    return false;
  }
  stunion(p:Plant){
    const g=this.g,prop=g.props.plants.stunion,x=cellX(p.column),detect=()=>g.zombies.some(z=>z.hp>0&&g.inLane(z,p.row)&&z.x>=x-BOARD.cellWidth/2&&z.x<=x+(prop.DetectDistance+.5)*BOARD.cellWidth&&g.time>=z.frozenUntil&&g.time>=(z.stunnedUntil??0));
    if(p.action==='idle'&&detect()){p.action='shoot';p.animation='Attack';p.actionAt=g.time;p.eventIndex=0;}
    if(p.action==='idle')return;
    const timeline=g.props.plantAnimations.stunion[p.animation!],stun=(z:Zombie,duration:number)=>{z.stunnedUntil=g.time+duration;z.west??={at:0,elapsed:0};z.west.chiliUntil=z.stunnedUntil;};
    while(p.eventIndex!<timeline.events.length&&g.time-p.actionAt>=timeline.events[p.eventIndex!].at){const e=timeline.events[p.eventIndex!++].name;
      if(e==='judge'){if(!detect()){p.action='idle';p.animation='Idle';return;}g.beach.sounds.push('stunion/attack');}
      if(e==='attack')for(const z of g.zombies)if(z.hp>0&&g.inLane(z,p.row)&&z.x>=x-BOARD.cellWidth/2&&z.x<=x+(prop.StunDistance+.5)*BOARD.cellWidth)stun(z,prop.StunDuration);
      if(e==='foodStart'){this.stunionGas.set(p.id,g.time);for(let row=Math.max(0,p.row-1);row<=Math.min(4,p.row+1);row++)for(const name of ['stunionSpawn','stunionPush'])g.iceage.effects.push({id:g.nextEntityId(),name,animation:'Play',row,column:p.column,at:g.time});}
      if(e==='foodLeap')g.beach.sounds.push('stunion/foodInhale');if(e==='foodSound')g.beach.sounds.push('stunion/foodShoot');if(e==='fade')g.beach.sounds.push('stunion/fade');
      if(e==='foodEnd'){this.stunionGas.delete(p.id);p.action='idle';p.animation='Idle';return;}
      if(e==='die')p.hp=0;
    }
    const at=this.stunionGas.get(p.id);if(at!==undefined){const t=Math.min(1,(g.time-at)/1.6666),width=(1-(1-t)**2)*prop.DetectDistancePlantfood;for(const z of g.zombies)if(z.hp>0&&Math.abs(z.row-p.row)<=1&&z.x>=x-BOARD.cellWidth/2&&z.x<=x+(width+.5)*BOARD.cellWidth)stun(z,prop.StunDurationPlantfood);}
  }
  troglobite(z:Zombie,dt:number){
    const s=this.troglobites.get(z.id);if(!s)return false;const g=this.g,direction=z.reversed?1:-1;
    const target=()=>g.iceage.blocks.filter(b=>b.hp>0&&b.row===z.row&&(z.x-cellX(b.column))*(-direction)>0&&(z.x-cellX(b.column))*(-direction)<BOARD.cellWidth*1.5&&g.iceage.canPush(b,direction)).sort((a,b)=>Math.abs(cellX(a.column)-z.x)-Math.abs(cellX(b.column)-z.x))[0];
    if(!s.pushing&&target()){s.pushing=true;s.at=g.time;s.elapsed=0;s.event=0;z.eating=false;}
    if(!s.pushing){if(z.x>=cellX(9))z.x+=direction*g.props.zombies[z.kind].WalkSPS*BOARD.cellWidth*dt;return false;}
    s.elapsed+=dt*(g.time<z.chilledUntil?.5:1);const actor=z.kind==='iceage_troglobite_veteran'?'iceageTroglobiteVeteran':'iceageTroglobite',timeline=g.props.plantAnimations[actor].Push;
    while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const e=timeline.events[s.event++].name;if(e==='push'){const b=target();if(b){g.iceage.push(b,direction);g.beach.sounds.push(actor+'/pushSounds',actor+'/pushChargeSounds');}}if(e==='pushSound')g.beach.sounds.push(actor+'/pushSaySounds');if(e==='switchingFalse'){s.pushing=false;break;}}
    return true;
  }
  damaged(z:Zombie){
    const g=this.g,s=z.weasel;if(!s||!s.hidden)return;
    if(z.hp<=g.props.zombies[z.kind].Toughness*g.props.zombies[z.kind].WeaselingHealthPercentage&&g.time>=z.frozenUntil&&g.time>=(z.stunnedUntil??0)&&g.time>=(z.butteredUntil??0)&&z.entry==='walk'){
      s.hidden=false;s.exploding=true;s.at=g.time;s.elapsed=0;s.event=0;z.eating=false;
    }
  }
  private tickWeasels(dt:number){
    const g=this.g,prop=g.props.zombies.iceage_weaselhoarder;
    for(const z of g.zombies){const s=z.weasel;if(!s?.exploding||g.time<z.frozenUntil||g.time<(z.stunnedUntil??0)||g.time<(z.butteredUntil??0))continue;
      s.elapsed+=dt*(g.time<z.chilledUntil?.5:1);const timeline=g.props.plantAnimations.iceageWeaselHoarder.Explode;
      while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const e=timeline.events[s.event++].name;
        if(e==='throw'){this.weaselThrowers.push({row:z.row,x:z.x,reversed:!!z.reversed,left:prop.WeaselingDuration+(1-2*g.random())*prop.WeaselingDurationVariance,cooldown:0});g.beach.sounds.push('iceageWeaselHoarder/weaselActionSounds');}
        if(e==='expl')g.beach.sounds.push('iceageWeaselHoarder/explodeSounds','iceageWeaselHoarder/explodeSaySounds','iceageWeaselHoarder/weaselSurpriseSounds');
        if(e==='rotate')g.beach.sounds.push('iceageWeaselHoarder/rotateSounds');
        if(e==='switchingFalse'){s.exploding=false;break;}
      }
    }
    for(const t of this.weaselThrowers){t.left-=dt;t.cooldown-=dt;if(t.cooldown<0){t.cooldown=prop.WeaselingInterval+(1-2*g.random())*prop.WeaselingIntervalVariance;const rows=[t.row,t.row+1,t.row-1].filter(row=>row>=0&&row<5);const z=g.spawnZombie(prop.WeaselTypeName,rows[Math.floor(g.random()*rows.length)],t.x+(1-2*g.random())*BOARD.cellWidth);z.reversed=t.reversed;}}
    this.weaselThrowers=this.weaselThrowers.filter(t=>t.left>=0);
  }
  firePeashooter(p:Plant){
    const g=this.g,prop=g.props.plants.firepeashooter,x=cellX(p.column);
    if(p.animation==='Food'){
      while(g.time>=p.nextBurst&&p.nextBurst<=p.actionAt+prop.PlantfoodDuration){
        const columns=Math.min(8,p.column+Math.floor((p.nextBurst-p.actionAt)*18));
        for(const z of g.zombies)if(z.hp>0&&g.inLane(z,p.row)&&z.x>=x-BOARD.cellWidth/2&&(columns===8||z.x<=cellX(columns)+BOARD.cellWidth/2)){g.damage(z,prop.PlantfoodDamagePerHit);z.frozenUntil=0;z.chilledUntil=0;}
        for(const b of [...g.iceage.blocks,...g.graves])if(b.row===p.row&&b.column>=p.column&&b.column<=columns)b.hp-=prop.PlantfoodDamagePerHit;
        p.nextBurst+=prop.PlantfoodDamageInterval;
      }
      if(g.time-p.actionAt>=prop.PlantfoodDuration){p.animation='Idle';p.action='idle';g.beach.sounds.push('firepeashooter/foodEndSounds');this.heat.set(p.id,g.time+prop.WarmingRadius!.PulseInitialDelay);}return;
    }
    if(p.action==='idle'&&g.time>=p.nextAction&&(g.zombies.some(z=>z.hp>0&&g.inLane(z,p.row)&&z.x>=x&&!g.beach.diving(z))||[...g.iceage.blocks,...g.graves].some(b=>b.hp>0&&b.row===p.row&&cellX(b.column)>x))){p.action='shoot';p.animation='Shoot';p.actionAt=g.time;p.eventIndex=0;p.nextAction=g.time+prop.ShootInterval+g.random()*prop.ShootIntervalAdditional;}
    if(p.action==='idle')return;
    const timeline=g.props.plantAnimations.firepeashooter[p.animation!];
    while(p.eventIndex!<timeline.events.length&&g.time-p.actionAt>=timeline.events[p.eventIndex!].at){const e=timeline.events[p.eventIndex!++].name;
      if(e==='Shoot')this.firePeas.push({id:g.nextEntityId(),row:p.row,x:x+38,y:rowY(p.row)-48});
      if(e==='ShootSound')g.beach.sounds.push('firepeashooter/shootSound');
      if(e==='foodStartSound')g.beach.sounds.push('firepeashooter/foodStartSounds');
      if(e==='playFooding'){p.animation='Food';p.actionAt=g.time;p.nextBurst=g.time+prop.PlantfoodDamageInterval;g.beach.sounds.push('firepeashooter/foodLoopSound');return;}
    }
    if(g.time-p.actionAt>=timeline.duration){p.action='idle';p.animation='Idle';}
  }
  primal(p:Plant){
    const g=this.g,prop=g.props.plants.primalpeashooter;
    if(p.action==='idle'&&g.time>=p.nextAction&&(g.zombies.some(z=>z.hp>0&&g.inLane(z,p.row)&&z.x>=cellX(p.column))||g.iceage.blocks.some(b=>b.hp>0&&b.row===p.row&&b.column>p.column))){p.action='shoot';p.animation='Shoot';p.actionAt=g.time;p.eventIndex=0;p.nextAction=g.time+prop.ShootInterval+g.random()*prop.ShootIntervalAdditional;}
    if(p.action==='idle')return;
    const timeline=g.props.plantAnimations.primalpeashooter[p.animation!];
    while(p.eventIndex!<timeline.events.length&&g.time-p.actionAt>=timeline.events[p.eventIndex!].at){const event=timeline.events[p.eventIndex!++].name;
      if(event==='Shoot'||event==='shootFood'){
        const kind=event==='shootFood'?'pea_primal_pf':g.random()<prop.KnockbackChance?'pea_primal_kb':'pea_primal';
        this.primalPeas.push({id:g.nextEntityId(),row:p.row,x:cellX(p.column)+35,y:rowY(p.row)-48,kind});
        g.beach.sounds.push('primalpeashooter/'+(event==='shootFood'?'foodShootSound':'shootSound'));if(event==='shootFood')p.burst++;
      }
    }
    if(g.time-p.actionAt>=timeline.duration){if(p.action==='food'&&p.burst<prop.PlantfoodPeaCount){p.actionAt+=timeline.duration;p.eventIndex=0;}else {p.action='idle';p.animation='Idle';}}
  }
  tick(dt:number){const g=this.g;
    for(const b of this.primalPeas){const old=b.x;b.x+=8*BOARD.cellWidth*dt;const prop=g.props.projectiles[b.kind];g.dino.plants.ignite(b,old);const damage=prop.Damage*(b.fire==='bluePea'?3:b.fire==='firePea'?2:1);
      if(g.iceage.hit(b.row,old,b.x,damage)){b.x=1300;continue;}
      const target=g.zombies.filter(z=>z.hp>0&&g.inLane(z,b.row)&&!g.beach.diving(z)&&z.x>=old-25&&z.x<=b.x+25).sort((a,c)=>a.x-c.x)[0];
      if(!target)continue;
      const x=target.x,targets=b.kind==='pea_primal_pf'?g.zombies.filter(z=>z.hp>0&&g.inLane(z,b.row)&&Math.abs(z.x-x)<=BOARD.cellWidth):[target];
      for(const z of targets){g.damage(z,damage);if(b.fire){z.frozenUntil=0;z.chilledUntil=0;}if(z!==g.boss?.zombie){z.stunnedUntil=g.time+prop.StunDuration;if(b.kind!=='pea_primal'&&!g.props.zombies[z.kind].CannotBeKnockedBackByProjectiles)z.leap={fromX:z.x,fromY:rowY(z.row),toX:z.x+prop.KnockbackDistance*BOARD.cellWidth,toRow:z.row,at:g.time,duration:.5};}}
      b.x=1300;
    }
    this.primalPeas=this.primalPeas.filter(b=>b.x<1200);
    this.tickWeasels(dt);
    for(const b of this.firePeas){const old=b.x;b.x+=360*dt;const damage=g.props.projectiles.pea_flame_yellow.Damage*g.props.projectiles.pea_flame_yellow.DamageScale;
      let hit=g.iceage.hit(b.row,old,b.x,damage);
      if(!hit){const z=g.zombies.filter(z=>z.hp>0&&g.inLane(z,b.row)&&!g.beach.diving(z)&&z.x-18>=old-12&&z.x-18<=b.x+12).sort((a,c)=>a.x-c.x)[0],grave=g.graves.find(gr=>gr.hp>0&&gr.row===b.row&&cellX(gr.column)-25>=old-12&&cellX(gr.column)-25<=b.x+12);
        if(grave&&(!z||cellX(grave.column)<z.x)){grave.hp-=damage;hit=true;}else if(z){g.damage(z,damage);z.frozenUntil=0;z.chilledUntil=0;hit=true;}}
      if(hit){this.fireHits.push({id:g.nextEntityId(),x:b.x,y:b.y,at:g.time});g.beach.sounds.push('firePea/PopSound');b.x=1300;}
    }
    this.firePeas=this.firePeas.filter(b=>b.x<1200);this.fireHits=this.fireHits.filter(f=>g.time-f.at<g.props.plantAnimations.firePeaHit.Play.duration);

    for(const [id] of this.troglobites)if(!g.zombies.some(z=>z.id===id))this.troglobites.delete(id);
    for(const p of g.plants){const warm=(p.kind==='lavaguava'||p.kind==='firepeashooter')&&p.action==='food'?g.props.plants[p.kind].WarmingRadiusPlantfood:g.props.plants[p.kind].WarmingRadius;if(!warm||!['lavaguava','pepperpult','firepeashooter'].includes(p.kind)||p.hp<=0)continue;if(g.time>=this.heat.get(p.id)!){let hit=false;for(const b of g.iceage.blocks)if(b.hp>0&&Math.abs(b.row-p.row)<=1&&Math.abs(b.column-p.column)<=1){b.hp-=warm.GridItemDamage;hit=true;}for(const [key,value] of g.iceage.cold){const [row,col]=key.split(':').map(Number);if(Math.abs(row-p.row)<=1&&Math.abs(col-p.column)<=1){if(value===1)g.iceage.cold.delete(key);else g.iceage.cold.set(key,value-1);hit=true;}}for(const z of g.zombies)if(z.kind==='iceage_armor3'&&z.armor>0&&Math.abs(z.row-p.row)<=1&&Math.abs(z.x-cellX(p.column))<=1.5*BOARD.cellWidth){z.armor=0;hit=true;}if(hit){this.heat.set(p.id,g.time+warm.PulseCooldown);g.iceage.effects.push({id:g.nextEntityId(),name:'plantHeat',animation:'Play',row:p.row,column:p.column,at:g.time});}}}
    for(const b of this.snowballs){const old=b.x;b.x-=8*BOARD.cellWidth*dt;const p=g.plants.filter(p=>p.hp>0&&p.row===b.row&&!['spikeweed','spikerock','potatomine','hotpotato'].includes(p.kind)&&cellX(p.column)>=b.x-25&&cellX(p.column)<=old+25).sort((a,b)=>b.column-a.column)[0];if(p){const prop=g.props.projectiles.hunter_snowball;this.cold(p.row,p.column,prop.IceBlockLevel);this.chilled.set(p.row+':'+p.column,g.time+prop.ChillDuration);b.x=-100;}}
    this.snowballs=this.snowballs.filter(b=>b.x>BOARD.left-50);
    for(const b of this.lobbedSnowballs){const t=Math.min(1,(g.time-b.at)/.66666);b.x=b.fromX+(b.toX-b.fromX)*t;b.y=rowY(b.row)-40-160*4*t*(1-t);if(t===1){const prop=g.props.projectiles.hunter_snowball;this.cold(b.row,b.column,prop.IceBlockLevel);this.chilled.set(b.row+':'+b.column,g.time+prop.ChillDuration);}}
    this.lobbedSnowballs=this.lobbedSnowballs.filter(b=>g.time-b.at<.66666);
    for(const [id] of this.veteranHunters)if(!g.zombies.some(z=>z.id===id))this.veteranHunters.delete(id);
    for(const b of this.peppers){const t=Math.min(1,(g.time-b.at)/.8);b.x=b.fromX+(b.toX-b.fromX)*t;b.y=b.fromY+(b.toY-b.fromY)*t-150*4*t*(1-t);if(t===1){const prop=g.props.projectiles[b.food?'pepper_pf':'pepper'],direct=g.zombies.filter(z=>z.hp>0&&z.row===b.row&&Math.abs(z.x-b.toX)<45).sort((a,c)=>Math.abs(a.x-b.toX)-Math.abs(c.x-b.toX))[0];for(const z of g.zombies)if(z.hp>0&&Math.abs(z.row-b.row)<=1&&Math.abs(z.x-b.toX)<1.5*BOARD.cellWidth){g.damage(z,(z===direct?prop.Damage:0)+prop.SplashDamage[0].Damage!);z.frozenUntil=0;z.chilledUntil=0;}for(const ice of g.iceage.blocks)if(Math.abs(ice.row-b.row)<=1&&Math.abs(cellX(ice.column)-b.toX)<1.5*BOARD.cellWidth)ice.hp-=prop.SplashDamage[0].Damage!;}}
    this.peppers=this.peppers.filter(b=>g.time-b.at<.8);
    for(const p of g.plants)if((this.chilled.get(p.row+':'+p.column)??0)>g.time&&!g.iceage.blocked(p)&&!g.props.plants[p.kind].ImmuneToIceblock){p.actionAt+=dt*.5;p.nextAction+=dt*.5;p.nextBurst+=dt*.5;}
    for(const [id] of this.hunters)if(!g.zombies.some(z=>z.id===id))this.hunters.delete(id);
    for(const [id] of this.heat)if(!g.plants.some(p=>p.id===id))this.heat.delete(id);
  }
}
