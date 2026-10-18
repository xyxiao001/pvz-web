import {BOARD,cellX,rowY,type PlantKind} from './level';
import type {Game,Plant,Zombie} from './model';
import {isFlying} from './pirate';

interface State {stage:number;growAt:number;life:number;foodUntil:number;empowered:boolean;nextHit:number;shotAt:number}
interface Visual {id:number;name:string;animation:string;x:number;y:number;at:number;duration:number}
interface Shot {id:number;kind:'banana'|'puffshroom_spore';x:number;y:number;row:number;column:number;age:number;distance:number}
interface Line {row:number;column:number;direction:0|1|2;damage:number;food:boolean}
export class WesternFinale {
  #game:Game;
  states=new Map<number,State>();
  allies:Zombie[]=[];
  converted=new Set<number>();
  visuals:Visual[]=[];
  shots:Shot[]=[];
  lines:Line[]=[];
  winds:{row:number;until:number}[]=[];
  sounds:string[]=[];
  selected:number|null=null;
  private serial=0;
  private nextLineHit=0;
  private dyingCurrants:{row:number;column:number;at:number;fired:boolean}[]=[];
  private nextLoop=0;
  constructor(game:Game){this.#game=game;}
  handles(kind:PlantKind){return ['shadowshroom','stallia','hurrikale','sunshroom','puffshroom','banana','electriccurrant','hypnoshroom'].includes(kind);}
  init(p:Plant){
    const g=this.#game,props=g.props.plants[p.kind];
    this.states.set(p.id,{stage:0,growAt:g.time+props.GrowTime0_1,life:props.LifeSpan,foodUntil:0,empowered:false,nextHit:0,shotAt:0});
    this.play(p,p.kind==='sunshroom'?'Idle_Small':p.kind==='hurrikale'?'Attack':'Idle',p.kind==='hurrikale'?'shoot':'idle');
    if(p.kind==='sunshroom')p.nextAction=g.time+props.ProduceCountdownStart+g.random()*props.ProduceCountdownStartAdditional;
    if(p.kind==='banana')p.nextAction=g.time;
    if(p.kind==='hurrikale')this.sounds.push('hurrikale/prePushSound');
  }
  private play(p:Plant,animation:string,action:Plant['action']='idle'){p.animation=animation;p.action=action;p.actionAt=this.#game.time;p.eventIndex=0;}
  private idle(p:Plant){const s=this.states.get(p.id)!;return p.kind==='sunshroom'?['Idle_Small','Idle_Mid','Idle'][s.stage]:p.kind==='hypnoshroom'&&s.empowered||p.kind==='electriccurrant'&&s.empowered?'Idle_Food':p.kind==='banana'&&this.#game.time<p.nextAction?'IdleSad':'Idle';}
  foodable(p:Plant){return p.kind!=='hurrikale'&&!(['hypnoshroom','electriccurrant'].includes(p.kind)&&this.states.get(p.id)!.empowered)&&!(p.kind==='electriccurrant'&&p.animation?.startsWith('Attack'));}
  food(p:Plant){
    const g=this.#game,s=this.states.get(p.id)!;
    this.play(p,'Food','food');
    if(p.kind==='sunshroom'){
      if(s.stage<2){s.stage=2;this.play(p,'Grow','food');this.sounds.push('sunshroom/growSound');}
      else this.sounds.push('sunshroom/foodSound');
    }
    if(p.kind==='hypnoshroom'){s.empowered=true;this.sounds.push('hypnoshroom/foodSound');}
    if(p.kind==='electriccurrant'){s.empowered=true;s.foodUntil=g.time+g.props.plants.electriccurrant.PlantfoodDuration;}
    if(p.kind==='banana'){this.selected=null;this.sounds.push('banana/foodStartSounds','banana/foodSaySounds');}
    if(p.kind==='puffshroom'){
      this.sounds.push('puffshroom/foodStartSounds');
      for(const q of g.plants.filter(q=>q.hp>0&&q.kind==='puffshroom')){
        const state=this.states.get(q.id)!;state.life=g.props.plants.puffshroom.LifeSpan;
        if(q!==p&&q.action==='food')continue;
        state.shotAt=g.time+Math.hypot(q.row-p.row,q.column-p.column)/8+.05;this.play(q,'FoodStart','food');q.burst=0;
      }
    }
  }
  select(row:number,column:number){
    const g=this.#game,p=g.plants.find(p=>p.kind==='banana'&&p.hp>0&&p.row===row&&p.column===column&&p.action==='idle'&&g.time>=p.nextAction);
    if(!p||g.phase!=='playing'||g.preparing)return false;
    if(this.selected!==null)this.cancel();this.selected=p.id;this.play(p,'TakeAim','shoot');return true;
  }
  cancel(){const p=this.#game.plants.find(p=>p.id===this.selected);if(p)this.play(p,this.idle(p));this.selected=null;}
  fire(row:number,column:number){
    const g=this.#game,p=g.plants.find(p=>p.id===this.selected&&p.hp>0);
    if(!p||g.phase!=='playing'||g.preparing||row<0||row>=5||column<0||column>=9)return false;
    this.selected=null;this.play(p,'Launch','shoot');p.nextAction=g.time+g.props.plants.banana.RestTime;this.banana(row,column);this.sounds.push('banana/shootSounds','banana/shootSaySounds');return true;
  }
  private banana(row:number,column:number){this.shots.push({id:++this.serial,kind:'banana',row,column,x:cellX(column),y:rowY(row)-550,age:0,distance:0});}
  private visual(name:string,animation:string,x:number,y:number){this.visuals.push({id:++this.serial,name,animation,x,y,at:this.#game.time,duration:this.#game.props.plantAnimations[name][animation].duration});}
  private poisonDamage(z:Zombie,damage:number){const g=this.#game;if(z===g.boss?.zombie)g.damage(z,damage);else {z.hp-=damage;g.cowboy.damaged(z);}}
  private poison(z:Zombie){const g=this.#game,p=g.props.plants.shadowshroom;z.poison={until:g.time+p.PoisonDuration,dps:p.PoisonDPS};}
  eaten(p:Plant,z:Zombie){
    const g=this.#game;
    if(p.kind==='shadowshroom'){this.poison(z);this.visual('shadowExpl','Play',cellX(p.column),rowY(p.row));this.sounds.push('shadowshroom/deathExplodeSounds');}
    if(p.kind!=='hypnoshroom')return;
    g.kills++;
    if(z.food){g.pickups.push({id:-100000-z.id,kind:'food',x:z.x,y:rowY(z.row)-45,age:0});z.food=false;}
    let ally=z;
    if(this.states.get(p.id)!.empowered){this.converted.add(z.id);ally=g.spawnZombie(z.kind.startsWith('dark')?'dark_gargantuar':'cowboy_gargantuar',z.row,z.x);this.sounds.push('hypnoshroom/transGargSound');}
    else this.sounds.push('hypnoshroom/tranSound');
    g.zombies=g.zombies.filter(q=>q!==z&&q!==ally);ally.reversed=true;ally.eating=false;
    if(ally.west){ally.west.animation=(ally.kind==='cowboy_gargantuar'||ally.kind==='dark_gargantuar')?'Walk':undefined;ally.west.at=g.time;}
    this.allies.push(ally);this.sounds.push('hypnoshroom/hypnoBGSound','hypnoshroom/hyponoTurnSound');
  }
  adopt(z:Zombie){this.#game.zombies=this.#game.zombies.filter(q=>q!==z);this.allies.push(z);}
  hitAlly(z:Zombie,amount:number){this.#game.damage(z,amount*this.#game.props.plants.hypnoshroom.HypnoedZombieDamageScale);if(z===this.#game.boss?.zombie)return amount*this.#game.props.plants.hypnoshroom.HypnoedZombieDamageScale*this.#game.props.zombies[z.kind].FoeEatDamageReflectPct;return 0;}
  blockEnemy(z:Zombie,dt:number){
    const g=this.#game,a=this.allies.find(a=>a.hp>0&&a.row===z.row&&Math.abs(a.x-z.x)<50);
    if(!a)return false;
    z.eating=true;g.damage(a,g.props.zombies[z.kind].EatDPS*dt*(g.time<z.chilledUntil?.5:1));return true;
  }
  private puff(p:Plant){this.shots.push({id:++this.serial,kind:'puffshroom_spore',x:cellX(p.column)+18,y:rowY(p.row)-22,row:p.row,column:p.column,age:0,distance:0});}
  tickPlant(p:Plant,dt:number){
    if(p.hp<=0)return;
    const g=this.#game,s=this.states.get(p.id)!,props=g.props.plants[p.kind];p.age+=dt;
    const targets=g.zombies.filter(z=>z.hp>0&&!z.leap&&g.inLane(z,p.row));
    if(p.kind==='sunshroom'&&p.action==='idle'){
      if(s.stage<2&&g.time>=s.growAt){s.stage++;s.growAt=g.time+props.GrowTime1_2;this.play(p,'Grow','grow');this.sounds.push('sunshroom/growSound');}
      else if(g.time>=p.nextAction){this.play(p,['Produce_Small','Produce_Mid','Produce'][s.stage],'produce');p.nextAction=g.time+props.ProduceInterval+g.random()*props.ProduceIntervalAdditional;this.sounds.push('sunshroom/produceSound');}
    }
    if(p.kind==='puffshroom'){
      if(p.action!=='food')s.life-=dt;
      if(s.life<=0&&p.animation!=='Fade'){this.play(p,'Fade','explode');this.sounds.push('puffshroom/fadeSounds');}
      if(p.action==='idle'&&g.time>=p.nextAction&&targets.some(z=>z.x>=cellX(p.column)-20&&z.x<=cellX(p.column)+3.5*BOARD.cellWidth)){
        this.play(p,'Shoot','shoot');p.nextAction=g.time+props.ShootInterval+g.random()*props.ShootIntervalAdditional;
      }
      if(p.action==='food'&&p.animation!=='FoodEnd'&&g.time>=s.shotAt){
        if(p.animation==='FoodStart')this.play(p,'Fooding','food');
        while(p.burst<props.PlantfoodPeaCount&&g.time>=s.shotAt){this.puff(p);p.burst++;s.shotAt+=2/props.PlantfoodPeaCount;}
        if(p.burst===props.PlantfoodPeaCount)this.play(p,'FoodEnd','food');
      }
    }
    if(p.kind==='stallia'&&p.action==='idle'&&targets.some(z=>!isFlying(z)&&g.time>=z.frozenUntil&&g.time>=(z.stunnedUntil??0)&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth/4+20))this.play(p,'Death','explode');
    if(p.kind==='electriccurrant'){
      if(p.action==='food'&&g.time>=s.foodUntil){this.play(p,'Idle_Food');this.sounds.push('electriccurrant/foodEnd');}
      const near=targets.filter(z=>Math.abs(z.x-cellX(p.column))<BOARD.cellWidth/2+20);
      if(p.action==='idle'&&!s.empowered){if(near.length&&p.animation==='Idle')this.play(p,'AttackStart','shoot');else if(!near.length&&p.animation==='AttackLoop')this.play(p,'AttackEnd','shoot');}
      if(near.length&&(s.empowered||p.animation==='AttackLoop')&&g.time>=s.nextHit){for(const z of near)g.damage(z,s.empowered?props.DamagePlantfood:props.Damage,'electric');s.nextHit=g.time+props.DirectDamageInterval;}
    }
    if(p.kind==='banana'&&p.action==='idle'&&p.animation==='IdleSad'&&g.time>=p.nextAction){this.play(p,'GetReady','grow');this.sounds.push('banana/wakeSounds');}
    if(p.action==='idle'||p.animation==='Fooding')return;
    const timeline=g.props.plantAnimations[p.kind][p.animation!],elapsed=g.time-p.actionAt;
    while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
      const event=timeline.events[p.eventIndex!++].name;
      if(p.kind==='sunshroom'&&event==='foodEnd'){p.nextAction=g.time+props.ProduceCountdownStart+g.random()*props.ProduceCountdownStartAdditional;this.play(p,this.idle(p));return;}
      if(p.kind==='sunshroom'&&(event==='Produce'||event==='ProduceFood'))for(let i=0;i<(event==='ProduceFood'?props.PlantfoodTime:1);i++)g.dropSun(cellX(p.column),rowY(p.row)-65,props.SunValueList[s.stage],'plant');
      if(p.kind==='puffshroom'&&event==='Shoot')this.puff(p);
      if(p.kind==='puffshroom'&&event==='ShootSound')this.sounds.push('puffshroom/shootSound');
      if(p.kind==='shadowshroom'){
        if(event==='foodSound')this.sounds.push('shadowshroom/foodExplodeSounds');
        if(event==='playPar')this.visual('shadowExpl','Play',cellX(p.column),rowY(p.row));
        if(event==='foodExplode')for(const z of g.zombies){const active=z.poison&&z.poison.until>g.time;this.poison(z);if(active){this.poisonDamage(z,props.PoisonDPS*props.PoisonDuration);delete z.poison;}}
      }
      if(p.kind==='stallia'){
        if(event==='explode'||event==='foodExplode'){for(const z of g.zombies)if(event==='foodExplode'||Math.abs(z.row-p.row)<=1&&Math.abs(z.x-cellX(p.column))<1.5*BOARD.cellWidth+20)z.perfumeUntil=g.time+(event==='foodExplode'?props.PerfumeDurationPlantfood:props.PerfumeDuration);}
        if(event==='explode')this.sounds.push('stallia/explodeSound');if(event==='foodExplodeStart')this.sounds.push('stallia/foodSound');
      }
      if(p.kind==='hurrikale'&&event==='push'){this.winds.push({row:p.row,until:g.time+props.PushDuration});for(const n of ['windUpper','windLower'])this.visual(n,'Play',cellX(p.column),rowY(p.row));this.sounds.push('hurrikale/pushSound');}
      if(p.kind==='banana'&&event==='drop'){
        const choices=g.zombies.filter(z=>z.hp>0&&z.x>=BOARD.left&&z.x<cellX(9)),z=choices[Math.floor(g.random()*choices.length)];
        this.banana(z?z.row:Math.floor(g.random()*5),z?Math.max(0,Math.min(8,Math.floor((z.x-BOARD.left)/BOARD.cellWidth))):Math.floor(g.random()*9));this.sounds.push('banana/shootSounds');
      }
      if(p.kind==='electriccurrant'&&['shootStart','shoot','spark','sparkSay','attackStartSay','foodStartSay'].includes(event))this.sounds.push('electriccurrant/'+event);
      if(event==='die'){p.hp=0;return;}
    }
    if(elapsed<timeline.duration)return;
    if(p.kind==='sunshroom'&&p.animation==='Grow'&&p.action==='food'){this.play(p,'Food','food');this.sounds.push('sunshroom/foodSound');return;}
    if(p.kind==='puffshroom'&&p.animation==='FoodStart')return;
    if(p.kind==='banana'&&p.action==='food')p.nextAction=g.time+props.RestTime;
    if(p.kind==='banana'&&p.animation==='TakeAim'){this.play(p,'Steady');return;}
    if(p.kind==='electriccurrant'&&p.animation==='AttackStart'){this.play(p,'AttackLoop');return;}
    if(p.kind==='electriccurrant'&&p.action==='food'){this.play(p,'Idle_Food','food');return;}
    this.play(p,this.idle(p));
  }
  private currents(){
    const g=this.#game,plants=g.plants.filter(p=>p.hp>0&&p.kind==='electriccurrant');this.lines=[];
    const cells=new Map<string,Line>();
    for(const p of plants)for(const [dr,dc] of [[0,1],[1,0]]){
      const q=plants.filter(q=>dr?q.column===p.column&&q.row>p.row:q.row===p.row&&q.column>p.column).sort((a,b)=>dr?a.row-b.row:a.column-b.column)[0];if(!q)continue;
      const food=this.states.get(p.id)!.empowered||this.states.get(q.id)!.empowered,damage=food?g.props.plants.electriccurrant.DamagePlantfood:g.props.plants.electriccurrant.Damage,n=dr?q.row-p.row:q.column-p.column;
      for(let i=0;i<=n;i++){const row=p.row+dr*i,column=p.column+dc*i,key=`${row}-${column}`,old=cells.get(key);cells.set(key,{row,column,direction:i===0||i===n?0:dr?2:1,damage:Math.max(damage,old?.damage??0),food:food||!!old?.food});}
    }
    this.lines=[...cells.values()];
    if(this.lines.length&&g.time>=this.nextLoop){this.sounds.push('electriccurrant/loop');this.nextLoop=g.time+2/3;}
    if(g.time>=this.nextLineHit){
      for(const z of g.zombies){const cell=this.lines.find(c=>g.inLane(z,c.row)&&Math.abs(z.x-cellX(c.column))<BOARD.cellWidth/2+20);if(cell){g.damage(z,cell.damage,'electric');this.visual('currantHit','Play',z.x,rowY(z.row)-30);}}
      this.nextLineHit=g.time+.25;
    }
  }
  removed(p:Plant){if(p.kind==='electriccurrant')this.dyingCurrants.push({row:p.row,column:p.column,at:this.#game.time,fired:false});this.states.delete(p.id);}
  tick(dt:number){
    const g=this.#game;
    if(this.selected!==null&&!g.plants.some(p=>p.id===this.selected&&p.hp>0))this.selected=null;
    for(const z of g.zombies){if(z.poison&&z.poison.until>g.time)this.poisonDamage(z,z.poison.dps*dt);else delete z.poison;}
    for(const wind of this.winds)if(g.time<wind.until)for(const z of g.zombies)if(z.hp>0&&z.row===wind.row&&z!==g.boss?.zombie){z.x=Math.min(BOARD.left+9*BOARD.cellWidth,z.x+2*BOARD.cellWidth*dt);g.chill(z,8);}
    this.winds=this.winds.filter(w=>g.time<w.until);
    this.currents();
    for(const shot of this.shots){
      shot.age+=dt;
      if(shot.kind==='banana'){
        shot.y=rowY(shot.row)-Math.max(0,(1000-12*60*shot.age)*.51);
        if(shot.age>=1000/(12*60)){
          const damage=g.props.projectiles.banana.SplashDamage[0];
          for(const z of g.zombies)if(z.hp>0&&g.inLane(z,shot.row)&&Math.abs(z.x-shot.x)<damage.Range.w/2*BOARD.cellWidth+20)g.damage(z,damage.Damage!,'potato');
          this.visual('bananaHit','Play',shot.x,rowY(shot.row));this.sounds.push('banana/impact');shot.age=99;
        }
      }else{
        const old=shot.x;shot.x+=3.33*BOARD.cellWidth*dt;shot.distance+=shot.x-old;
        const target=g.zombies.filter(z=>z.hp>0&&g.inLane(z,shot.row)&&z.x>=old-20&&z.x<=shot.x+20).sort((a,b)=>a.x-b.x)[0];
        if(target){g.damage(target,g.props.projectiles.puffshroom_spore.Damage);this.visual('puffshroom_sporeHit','Play',shot.x,shot.y);this.sounds.push('puffshroom_spore/impact');shot.age=99;}
        if(shot.distance>=4*BOARD.cellWidth)shot.age=99;
      }
    }
    this.shots=this.shots.filter(s=>s.age<30);
    for(const a of this.allies){
      if(a.hp<=0)continue;
      if(a.leap||g.time<a.frozenUntil||g.time<(a.landUntil??0)||g.time<(a.stunnedUntil??0)||g.time<(a.butteredUntil??0))continue;
      if(g.cowboy.tickZombie(a,dt))continue;
      const direction=a.reversed?1:-1;
      const target=g.zombies.filter(z=>z.hp>0&&g.inLane(z,a.row)&&(z.x-a.x)*direction>=-45&&(z.x-a.x)*direction<=50).sort((u,v)=>direction*(u.x-v.x))[0];
      a.eating=!!target;
      if(target){const reflected=this.hitAlly(target,g.props.zombies[a.kind].EatDPS*dt);if(reflected)g.damage(a,reflected);}
      else a.x+=direction*g.props.zombies[a.kind].WalkSPS*BOARD.cellWidth*dt;
    }
    for(const a of this.allies)if(a.hp<=0){g.cowboy.die(a);g.deaths.push({zombie:{...a},cause:a.deathCause,at:g.time});}else if(a.x>=1250||a.x<0)this.converted.add(a.id);
    this.allies=this.allies.filter(a=>a.hp>0&&a.x<1250&&a.x>=0);
    for(const death of this.dyingCurrants)if(!death.fired&&g.time-death.at>=g.props.plantAnimations.electriccurrant.Death.events.find(e=>e.name==='death')!.at){
      death.fired=true;this.sounds.push('electriccurrant/death');
      for(const z of g.zombies)if(z.hp>0&&z.row===death.row&&Math.abs(z.x-cellX(death.column))<BOARD.cellWidth/2+20){const row=death.row+(g.random()<.5?(death.row>0?-1:0):(death.row<4?1:0));z.leap={fromX:z.x,fromY:rowY(z.row),toX:z.x+.75*BOARD.cellWidth,toRow:row,at:g.time,duration:.4};}
    }
    this.dyingCurrants=this.dyingCurrants.filter(d=>!d.fired);
    this.visuals=this.visuals.filter(v=>g.time-v.at<v.duration);
    for(const id of this.states.keys())if(!g.plants.some(p=>p.id===id&&p.hp>0))this.states.delete(id);
  }
}
