import {BOARD,cellX,rowY,type ZombieKind} from './level';
import type {Game,Plant,Zombie} from './model';

export const seaCell=(planks:readonly number[]|null,row:number,column:number)=>planks!==null&&column>=5&&!planks.includes(row);
export const pirateArmor=(kind:ZombieKind)=>kind==='pirate_armor1'?'pirate_armor1':kind==='pirate_armor2'?'pirate_armor2':null;
export const zombieY=(z:Zombie)=>z.parrot?.y??z.route?.y??rowY(z.row);
export const isFlying=(z:Zombie)=>z.kind==='seagull'||z.kind==='pirate_captain_parrot';
export const swinging=(z:Zombie,time:number)=>!!z.swing&&time<z.swing.end;

export interface CannonShot {id:number;x:number;y:number;row:number;age:number;food?:boolean;explodeAt?:number}
export interface PirateEffect {id:number;kind:'seaSplash'|'snapFire'|'snapFood'|'snapBall'|'coconutFoodHit'|'coconutHit';x:number;y:number;at:number;damage?:number;hits?:number[];burning?:boolean}
export class PirateBattle {
  shots:CannonShot[]=[];
  effects:PirateEffect[]=[];
  score=0;
  combo=0;
  comboUntil=0;
  private serial=0;
  #game:Game;
  constructor(game:Game){this.#game=game;}
  private eventTime(name:string,animation:string,event:string){return this.#game.props.plantAnimations[name][animation].events.find(e=>e.name===event)!.at;}
  private throwImp(z:Zombie,row:number,column:number,duration=1){
    const g=this.#game,imp=g.spawnZombie('pirate_imp',z.row,z.x);
    imp.leap={fromX:z.x,fromY:rowY(z.row)-100,toX:cellX(column),toRow:row,at:g.time,duration};
    return imp;
  }
  die(z:Zombie){
    const g=this.#game;
    if(z.deathCause==='water')this.effects.push({id:++this.serial,kind:'seaSplash',x:Math.max(cellX(5),Math.min(cellX(8)-BOARD.cellWidth*.25,z.x)),y:rowY(z.row)+20,at:g.time});
    if(z.kind==='pirate_barrel'){
      const parent=g.zombies.find(p=>p.id===z.pusher);if(parent)delete parent.barrel;
      for(const row of [z.row===0?0:z.row-1,z.row===4?4:z.row+1])this.throwImp(z,row,Math.floor((z.x-BOARD.left)/BOARD.cellWidth)-1,.5);
    }
    if(z.barrel!==undefined){const barrel=g.zombies.find(b=>b.id===z.barrel);if(barrel){delete barrel.pusher;barrel.detachedAt=g.time;}}
  }
  private bounce(z:Zombie){
    const g=this.#game;
    if(z===g.boss?.zombie||z.hp<=0||z.leap||swinging(z,g.time)||['seagull','pirate_captain_parrot','pirate_gargantuar','cannon'].includes(z.kind))return;
    let row=z.row;const column=Math.floor((z.x-BOARD.left)/BOARD.cellWidth);
    if(column>=4&&!seaCell(g.level.planks,row,8)){
      if(row>0&&seaCell(g.level.planks,row-1,8))row--;
      else if(row<4&&seaCell(g.level.planks,row+1,8))row++;
    }
    if(z.kind==='pirate_barrel'&&z.pusher!==undefined){const parent=g.zombies.find(p=>p.id===z.pusher);if(parent)delete parent.barrel;delete z.pusher;z.detachedAt=g.time;}
    z.leap={fromX:z.x,fromY:rowY(z.row),toX:z.x+g.props.plants.springbean.KnockbackDistance*BOARD.cellWidth,toRow:row,at:g.time};
  }
  private consumeSpike(p:Plant){if(p.action==='food')return;if(p.kind==='spikerock'){p.spikes!--;if(p.spikes===0)p.hp=0;}else p.hp=0;}
  private tickGroundPlant(p:Plant,dt:number){
    const g=this.#game,props=g.props.plants[p.kind],x=cellX(p.column),timelines=g.props.plantAnimations[p.kind];
    const ground=g.zombies.filter(z=>z.hp>0&&!isFlying(z)&&!z.leap&&!swinging(z,g.time));
    const targets=ground.filter(z=>g.inLane(z,p.row)&&Math.abs(z.x-x)<BOARD.cellWidth/2);
    const start=(animation:string,action:Plant['action']='shoot')=>{p.animation=animation;p.action=action;p.actionAt=g.time;p.eventIndex=0;};
    if(p.kind==='spikeweed'||p.kind==='spikerock'){
      if(p.action==='food'){
        if(g.time-p.actionAt>=props.PlantfoodDuration){p.action='idle';p.animation='Idle';return;}
        for(const z of ground.filter(z=>g.inLane(z,p.row))){
          if(z.kind==='pirate_barrel'){z.hp=0;continue;}
          g.damage(z,(props.PlantfoodSideDPS+(Math.abs(z.x-x)<BOARD.cellWidth/2?props.PlantfoodDPS:0))*dt);
          z.stunnedUntil=g.time+.2;
          if(z!==g.boss?.zombie&&!['pirate_gargantuar','cannon'].includes(z.kind)&&Math.abs(z.x-x)>=BOARD.cellWidth/2)z.x+=Math.sign(x-z.x)*Math.min(Math.abs(x-z.x),props.PlantfoodDragSPS*BOARD.cellWidth*dt);
        }
        return;
      }
      if((p.action==='idle'||p.fired)&&targets.length&&g.time>=p.nextAction){p.fired=false;start('Attack');p.nextAction=g.time+props.AttackInterval;}
      if(p.action==='shoot'){
        if(!p.fired&&g.time-p.actionAt>=this.eventTime(p.kind,'Attack','attack')){p.fired=true;for(const z of targets){if(z.kind==='pirate_barrel'){z.hp=0;this.consumeSpike(p);}else g.damage(z,props.Damage);}}
        if(g.time-p.actionAt>=timelines.Attack.duration){p.action='idle';p.animation='Idle';p.fired=false;}
      }
      return;
    }
    if(p.action==='idle'){
      if(p.animation==='Sleep'){if(g.time>=p.nextAction)start('Recover');return;}
      const nearby=ground.some(z=>z.row===p.row&&Math.abs(z.x-x)<1.5*BOARD.cellWidth);
      if(p.animation!=='Idle_Ready'&&nearby){start('Ready');return;}
      if(p.animation==='Idle_Ready'){
        if(!nearby){start('Recover');return;}
        const target=targets.find(z=>z!==g.boss?.zombie&&!['pirate_gargantuar','cannon'].includes(z.kind));
        if(target){this.bounce(target);start('Bounce');return;}
      }
      return;
    }
    const animation=p.animation!,timeline=timelines[animation],elapsed=g.time-p.actionAt;
    while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
      const event=timeline.events[p.eventIndex!++].name;
      if(event==='foodBounce')for(const z of ground)this.bounce(z);
      if(event==='sleep'){p.action='idle';p.animation='Sleep';p.nextAction=g.time+props.RestTime;return;}
    }
    if(elapsed>=timeline.duration){p.action='idle';p.animation=animation==='Ready'?'Idle_Ready':'Idle';}
  }
  private capturable(p:Plant){return p.hp>0&&p.action!=='food'&&!p.hidden&&!['potatomine','spikeweed','spikerock','iceweed','iceburg','cherry_bomb','imitater'].includes(p.kind)&&!(p.kind==='springbean'&&['Ready','Idle_Ready'].includes(p.animation!));}
  private pickParrotTarget(){
    const g=this.#game,plants=g.plants.filter(p=>this.capturable(p)),rows=[...new Set(plants.map(p=>p.row))];
    if(!rows.length)return null;
    const row=rows[Math.floor(g.random()*rows.length)];return plants.filter(p=>p.row===row).sort((a,b)=>b.column-a.column)[0];
  }
  private tickCaptain(z:Zombie,dt:number){
    const g=this.#game,state=z.captain!;
    if(!state.parrot)return;state.next-=dt;if(state.next>0)return;
    const target=this.pickParrotTarget();
    if(!target){state.next=g.props.zombies.pirate_captain.ParrotRetryCooldown;return;}
    const bird=g.spawnZombie('pirate_captain_parrot',z.row,z.x);bird.hp=state.health;
    bird.parrot={captain:z.id,target:target.id,y:rowY(z.row),height:60,capture:0,fleeing:false,escaped:false};state.parrot=false;
  }
  private tickParrot(z:Zombie,dt:number){
    const g=this.#game,state=z.parrot!,captain=g.zombies.find(c=>c.id===state.captain&&c.hp>0);
    if(state.fleeing){
      state.height+=300*dt;
      if(state.height>2100){delete state.carrying;if(captain){state.fleeing=false;state.height=60;z.x=cellX(10);state.y=rowY(captain.row);state.target=null;}else state.escaped=true;}
      return;
    }
    let plant=g.plants.find(p=>p.id===state.target);
    if(plant&&!this.capturable(plant)){plant=undefined;state.target=null;state.capture=0;}
    const target=plant?{x:cellX(plant.column),y:rowY(plant.row)}:captain?{x:captain.x,y:rowY(captain.row)}:null;
    if(!target){state.fleeing=true;return;}
    const dx=target.x-z.x,dy=target.y-state.y,distance=Math.hypot(dx,dy),step=g.props.zombies.pirate_captain_parrot.FlyingSpeed*BOARD.cellWidth*dt;
    if(distance>6){z.x+=dx/distance*Math.min(step,distance);state.y+=dy/distance*Math.min(step,distance);z.reversed=dx>0;state.capture=0;}
    else if(plant){state.capture+=dt;if(state.capture>=5){state.carrying={...plant};plant.hp=0;state.target=null;state.fleeing=true;}}
    else {captain!.captain!.parrot=true;captain!.captain!.health=z.hp;captain!.captain!.next=g.props.zombies.pirate_captain.ParrotCooldown;state.escaped=true;}
    z.row=Math.max(0,Math.min(4,Math.round((state.y-rowY(0))/BOARD.cellHeight)));
  }
  private tickNewZombie(z:Zombie,dt:number):boolean{
    const g=this.#game,step=dt*(g.time<z.chilledUntil?.5:1);
    if(z.captain)this.tickCaptain(z,step);
    if(z.parrot){this.tickParrot(z,step);return true;}
    if(z.kind==='pirate_barrel'){
      const p=g.zombies.find(p=>p.id===z.pusher&&p.hp>0);
      if(p){z.x=p.x-62;z.row=p.row;
        for(const plant of g.plants)if(plant.hp>0&&plant.row===z.row&&Math.abs(cellX(plant.column)-z.x)<45){
          if(plant.kind==='spikeweed'||plant.kind==='spikerock'||plant.kind==='iceweed'){z.hp=0;this.consumeSpike(plant);}
          else if(!(plant.kind==='springbean'&&['Ready','Idle_Ready'].includes(plant.animation!))){plant.hp=0;plant.armor=0;p.stunnedUntil=g.time+.5;}
        }
      }else {if(g.time-z.detachedAt!>=10)z.hp=0;z.x-=.01*BOARD.cellWidth*step;}
      return true;
    }
    const state=z.pirate;if(!state)return false;
    const name=z.kind==='cannon'?'impCannon':'pirateGargantuar',timelines=g.props.plantAnimations[name];
    const start=(animation:string)=>{state.animation=animation;state.at=g.time;state.elapsed=0;state.fired=false;};
    if(z.kind==='cannon'){
      if(g.time-z.entryAt<4){z.x=z.entryX+(cellX(9)-z.entryX)*Math.pow((g.time-z.entryAt)/4,2);return true;}
      if(state.animation==='Idle'){
        state.next-=step;
        if(state.next<=0){if(state.count<g.props.zombies.cannon.MaxImpCount){start('Shoot');state.count++;}else start('Explode');}
        return true;
      }
      const timeline=timelines[state.animation];state.elapsed+=step;
      const event=state.animation==='Shoot'?'Shoot':'Explode';
      if(!state.fired&&state.elapsed>=this.eventTime(name,state.animation,event)){
        state.fired=true;const props=g.props.zombies.cannon;
        if(event==='Shoot')this.throwImp(z,z.row,props.ShootColumns[Math.floor(g.random()*props.ShootColumns.length)]);
        else for(let i=0;i<props.ExplodeImpCount;i++)this.throwImp(z,Math.floor(g.random()*5),props.ExplodeColumns[Math.floor(g.random()*props.ExplodeColumns.length)],(100+150*g.random())/150);
      }
      if(state.elapsed>=timeline.duration){if(state.animation==='Explode'){z.hp=0;}else {start('Idle');state.next=g.props.zombies.cannon.ShootInterval+g.random()*g.props.zombies.cannon.ShootIntervalAdditional;}}
      return true;
    }
    const target=g.plants.filter(p=>p.hp>0&&p.row===z.row&&Math.abs(cellX(p.column)-z.x)<75&&!(p.kind==='springbean'&&['Ready','Idle_Ready'].includes(p.animation!))).sort((a,b)=>b.column-a.column)[0];
    if(state.animation==='Walk'){
      if(state.imp&&z.hp<g.props.zombies[z.kind].Toughness/2&&z.x>cellX(2))start('Throw');
      else if(target)start('Smash');else return false;
    }
    state.elapsed+=step;
    const event=state.animation==='Smash'?'smash':'impThrow';
    if(!state.fired&&state.elapsed>=this.eventTime(name,state.animation,event)){
      state.fired=true;
      if(event==='smash'&&target){if(target.kind==='spikeweed'||target.kind==='spikerock'){g.damage(z,g.props.plants[target.kind].Damage);this.consumeSpike(target);}else {target.hp=0;target.armor=0;}}
      if(event==='impThrow'){state.imp=false;this.throwImp(z,Math.floor(g.random()*5),2,1.5);this.throwImp(z,Math.floor(g.random()*5),4,1.5);}
    }
    if(state.elapsed>=timelines[state.animation].duration)start('Walk');
    return true;
  }
  spawn(z:Zombie){
    const g=this.#game;
    if(z.kind==='pirate_captain')z.captain={parrot:true,health:g.props.zombies.pirate_captain_parrot.Toughness,next:g.props.zombies.pirate_captain.ParrotCooldown};
    if(z.kind==='pirate_barrel')z.detachedAt=g.time;
    if(z.kind==='barrelroller'){const barrel=g.spawnZombie('pirate_barrel',z.row,z.x-62);z.barrel=barrel.id;barrel.pusher=z.id;}
    if(z.kind==='cannon'||z.kind==='pirate_gargantuar')z.pirate={animation:z.kind==='cannon'?'Idle':'Walk',at:g.time,elapsed:0,next:z.kind==='cannon'?g.props.zombies.cannon.TimeBefore+g.random()*g.props.zombies.cannon.TimeBeforeAdditional:0,count:0,fired:false,imp:true};
    if(z.kind==='swashbuckler'){
      const props=g.props.zombies.swashbuckler,back=this.eventTime('swashbuckler','SwingBack','swingJudge');
      const failure=seaCell(g.level.planks,z.row,8)&&g.random()<props.ChanceToFallIntoSea;
      z.x=cellX(props.LandingColumns[Math.floor(g.random()*props.LandingColumns.length)])+(failure?2*BOARD.cellWidth:0);
      z.swing={at:g.time,judge:g.time+back,end:g.time+back+this.eventTime('swashbuckler',failure?'SwingFailure':'SwingSuccess',failure?'die':'switchingFalse'),failure};
    }
    if(g.level.cannon){
      const points=g.level.cannon.Lanes[z.row].SplinePoints.map(p=>({x:BOARD.left+(p.x-200)/64*BOARD.cellWidth,y:rowY(0)-BOARD.cellHeight/2+(p.y-160)/76*BOARD.cellHeight}));
      z.route={spawnLane:z.row,spawnWave:g.wave,points,index:0,y:rowY(z.row),angle:Math.PI};
    }
  }
  tickZombie(z:Zombie,dt:number){
    const g=this.#game;
    if(this.tickNewZombie(z,dt))return true;
    if(z.swing){if(g.time<z.swing.end)return true;if(z.swing.failure){z.hp=0;return true;}delete z.swing;}
    if(z.route){
      const route=z.route,props=g.level.cannon!,point=route.points[route.index];
      if(point){const dx=point.x-z.x,dy=point.y-route.y,target=Math.atan2(dy,dx),turn=Math.atan2(Math.sin(target-route.angle),Math.cos(target-route.angle)),maxTurn=props.BaseMovementRate/props.BufferDistance*dt;route.angle+=Math.sign(turn)*Math.min(Math.abs(turn),maxTurn);if(Math.hypot(dx,dy)<=props.BufferDistance/64*BOARD.cellWidth)route.index++;}
      const speed=props.BaseMovementRate/64*BOARD.cellWidth;
      z.x+=Math.cos(route.angle)*speed*dt;route.y+=Math.sin(route.angle)*speed*dt;
      z.row=Math.max(0,Math.min(4,Math.round((route.y-rowY(0))/BOARD.cellHeight)));
      return true;
    }
    return false;
  }
  fire(row:number,column:number){
    const g=this.#game,p=g.plants.find(p=>p.kind==='coconutcannon'&&p.row===row&&p.column===column);
    if(g.preparing||!p||p.action!=='idle'||g.time<p.nextAction)return false;
    p.action='shoot';p.animation='Shoot';p.actionAt=g.time;p.eventIndex=0;return true;
  }
  tickPlant(p:Plant,dt:number){
    if(p.kind==='spikeweed'||p.kind==='spikerock'||p.kind==='springbean'){this.tickGroundPlant(p,dt);return;}
    const g=this.#game,props=g.props.plants[p.kind],timelines=g.props.plantAnimations[p.kind],x=cellX(p.column);
    if(p.action==='idle'){
      if(p.kind==='coconutcannon'){
        if(p.animation==='Sleep'&&g.time>=p.nextAction){p.animation='Wake';p.action='grow';p.actionAt=g.time;p.eventIndex=0;}
        return;
      }
      if(g.time<p.nextAction||!g.zombies.some(z=>z.hp>0&&!swinging(z,g.time)&&Math.abs(zombieY(z)-rowY(p.row))<BOARD.cellHeight*1.5&&z.x>=x-41&&z.x<=x+BOARD.cellWidth*2.5))return;
      p.action='shoot';p.animation='Attack';p.actionAt=g.time;p.eventIndex=0;p.nextAction=g.time+props.AttackInterval+g.random()*props.AttackIntervalAdditional;
    }
    const timeline=timelines[p.animation!],elapsed=(g.time-p.actionAt)*(p.kind==='coconutcannon'&&['Shoot','Food'].includes(p.animation!)?2:1);
    while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
      const event=timeline.events[p.eventIndex!++].name;
      if(p.kind==='snapdragon'){
        if(event==='attackPar')for(const row of [p.row-1,p.row,p.row+1].filter(r=>r>=0&&r<5))this.effects.push({id:++this.serial,kind:'snapFire',x:x+2.5*BOARD.cellWidth,y:rowY(row),at:g.time});
        if(event==='attackEnd'||event==='foodEnd'){p.action='idle';p.animation='Idle';return;}
        if(event==='attack'||event==='foodAttack'){
          const food=event==='foodAttack';
          if(food)this.effects.push({id:++this.serial,kind:'snapFood',x:x+2*BOARD.cellWidth,y:rowY(p.row),at:g.time,damage:props.DamagePlantfood,hits:[]});
          for(const z of g.zombies)if(!food&&z.hp>0&&!swinging(z,g.time)&&Math.abs(zombieY(z)-rowY(p.row))<BOARD.cellHeight*1.5&&z.x>=x-.5*BOARD.cellWidth&&z.x<=x+2.5*BOARD.cellWidth){g.damage(z,props.Damage/2);z.frozenUntil=0;z.chilledUntil=0;}
        }
      }else if(event==='Shoot'||event==='foodShoot')this.shots.push({id:++this.serial,x:x+38,y:rowY(p.row)-44,row:p.row,age:0,food:event==='foodShoot'});
      else if(event==='foodEnd')p.action='grow';
      else if(event==='sleepStart'){p.action='idle';p.animation='Sleep';p.nextAction=g.time+props.RestTime;return;}
    }
    if(elapsed>=timeline.duration){p.action='idle';p.animation='Idle';}
  }
  tick(dt:number){
    const g=this.#game;
    for(const effect of this.effects)if(effect.kind==='snapFood'&&g.time-effect.at>=this.eventTime('snapFood','Play','burn')){
      if(!effect.burning){effect.burning=true;for(const r of [-1,0,1])for(const c of [-1,0,1]){const y=effect.y+r*BOARD.cellHeight;if(y>=rowY(0)&&y<=rowY(4))this.effects.push({id:++this.serial,kind:'snapBall',x:effect.x+c*BOARD.cellWidth,y,at:g.time});}}
      for(const z of g.zombies)if(z.hp>0&&!effect.hits!.includes(z.id)&&Math.abs(z.x-effect.x)<1.5*BOARD.cellWidth&&Math.abs(zombieY(z)-effect.y)<1.5*BOARD.cellHeight){g.damage(z,effect.damage!);effect.hits!.push(z.id);z.frozenUntil=0;z.chilledUntil=0;}}
    for(const shot of this.shots){
      const old=shot.x;shot.x+=(shot.food?6:17)*60*.5*dt;shot.age+=dt;
      if(shot.food){
        if(shot.explodeAt===undefined){
          for(const z of g.zombies)if(z.hp>0&&!z.leap&&!swinging(z,g.time)&&g.inLane(z,shot.row)&&Math.abs(z.x-shot.x)<45){
            if(z===g.boss?.zombie||['pirate_gargantuar','cannon'].includes(z.kind)){shot.explodeAt=g.time;break;}
            z.x+=shot.x-old;z.stunnedUntil=g.time+.1;
          }
          if(shot.x>=BOARD.left+8*BOARD.cellWidth)shot.explodeAt=g.time;
        }
        if(shot.explodeAt!==undefined){shot.x=old+(shot.x-old)*Math.pow(1/1.2,(g.time-shot.explodeAt)*60);if(g.time-shot.explodeAt<this.eventTime('coconutFood','Explode','pop'))continue;}
        else continue;
      }
      const target=g.zombies.filter(z=>z.hp>0&&!swinging(z,g.time)&&z.x>=old-25&&z.x<=shot.x+25&&(z===g.boss?.zombie?g.inLane(z,shot.row):Math.abs(zombieY(z)-44-shot.y)<45)).sort((a,b)=>a.x-b.x)[0];
      if(!shot.food&&!target)continue;
      const x=shot.food?shot.x:target!.x,y=shot.food?rowY(shot.row):zombieY(target!),projectile=g.props.projectiles[shot.food?'coconut_pf':'coconut'],splash=projectile.SplashDamage[0];const killed:Zombie[]=[];
      const width=g.level.cannon?2.5:splash.Range.w,height=g.level.cannon?2:splash.Range.h;
      for(const z of g.zombies)if(z.hp>0&&Math.abs(z.x-x)<=width*BOARD.cellWidth/2&&(z===g.boss?.zombie?Math.min(Math.abs(rowY(z.row)-y),Math.abs(rowY(z.row-1)-y))<=height*BOARD.cellHeight/2:Math.abs(zombieY(z)-y)<=height*BOARD.cellHeight/2)){g.damage(z,z===target?projectile.Damage:splash.Damage!,'potato');if(z.hp<=0)killed.push(z);}
      if(g.level.cannon){const bracket=g.level.cannon.ComboBrackets.filter(b=>killed.length>=b.ZombiesKilled).at(-1);this.score+=killed.length*g.level.cannon.BaseZombieKillScore*(bracket?bracket.ScoreMultiplier:1);this.combo=killed.length;this.comboUntil=g.time+1.8;
        const stun=g.level.cannon.SlowdownMovementRate*g.random()/60;
        for(const z of g.zombies)if(z.hp>0&&z.route&&killed.some(dead=>dead.route&&dead.route.spawnLane===z.route!.spawnLane&&dead.route.spawnWave===z.route!.spawnWave))z.stunnedUntil=Math.max(z.stunnedUntil??0,g.time+stun);
      }
      this.effects.push({id:++this.serial,kind:shot.food?'coconutFoodHit':'coconutHit',x,y,at:g.time});shot.age=Infinity;
    }
    this.shots=this.shots.filter(p=>p.age<(p.food?8:4)&&p.x<1250);
    g.zombies=g.zombies.filter(z=>!z.parrot?.escaped);
    // Routes leave the authored flight area without counting escaped birds as kills.
    g.zombies=g.zombies.filter(z=>!z.route||z.route.index<z.route.points.length||z.x>-100&&z.x<1400&&z.route.y>-150&&z.route.y<900);
    this.effects=this.effects.filter(e=>g.time-e.at<g.props.plantAnimations[e.kind][e.kind==='snapFire'||e.kind==='snapBall'?'Play1':'Play'].duration);
  }
}
