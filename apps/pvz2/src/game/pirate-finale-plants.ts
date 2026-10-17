import {BOARD,cellX,rowY,type PlantKind} from './level';
import type {Game,Plant,Zombie} from './model';
import {isFlying,swinging} from './pirate';

interface Shot {id:number;kind:'rotobaga'|'dandelion';food:boolean;x:number;y:number;vx:number;vy:number;row:number;targetY:number;age:number;impactAt?:number;targetX?:number}
interface Visual {id:number;name:string;animation:string;x:number;y:number;at:number;duration:number;toX?:number;toY?:number}
export class PirateFinalePlants {
  shots:Shot[]=[];
  visuals:Visual[]=[];
  clouds:{id:number;x:number;y:number;at:number;target:number|null;striking:boolean;fading:boolean}[]=[];
  fires:{id:number;row:number;column:number;at:number;hit:number[]}[]=[];
  sounds:string[]=[];
  private serial=0;
  #game:Game;
  constructor(game:Game){this.#game=game;}
  handles(kind:PlantKind){return ['xshot','chardguard','dandelion','jalapeno','lightningreed'].includes(kind);}
  private play(p:Plant,animation:string,action:Plant['action']='shoot'){p.animation=animation;p.action=action;p.actionAt=this.#game.time;p.eventIndex=0;}
  rate(p:Plant){return p.kind==='chardguard'&&['Ready','Bounce'].includes(p.animation!)?1.5:p.kind==='dandelion'&&p.animation==='Shoot'?Math.max(1,2.2/(p.nextAction-p.actionAt)):1;}
  private visual(name:string,animation:string,x:number,y:number,toX?:number,toY?:number){const g=this.#game;this.visuals.push({id:++this.serial,name,animation,x,y,toX,toY,at:g.time,duration:g.props.plantAnimations[name][animation].duration});}
  food(p:Plant){
    this.play(p,'Food','food');p.burst=0;
    if(p.kind==='chardguard')p.leaves=this.#game.props.plants.chardguard.MaxBounceTime;
    if(p.kind==='lightningreed')this.clouds.push({id:++this.serial,x:cellX(p.column),y:rowY(p.row),at:this.#game.time,target:null,striking:false,fading:false});
    const sound=p.kind==='xshot'?'foodSound':p.kind==='lightningreed'?'foodSound':null;if(sound)this.sounds.push(p.kind+'/'+sound);
  }
  private targets(p:Plant){return this.#game.zombies.filter(z=>z.hp>0&&!z.leap&&!swinging(z,this.#game.time)&&Math.abs(z.row-p.row)<=1&&z.x>=cellX(p.column)-20);}
  private directions(p:Plant){
    const result:{x:number;y:number}[]=[];
    for(const z of this.#game.zombies.filter(z=>z.hp>0&&!z.leap&&!swinging(z,this.#game.time))){
      const dx=(z.x-cellX(p.column))/BOARD.cellWidth,dy=z.row-p.row;
      if(Math.abs(Math.abs(dx)-Math.abs(dy))>.65)continue;
      for(const x of dx===0?[-1,1]:[Math.sign(dx)])for(const y of dy===0?[-1,1]:[Math.sign(dy)])if(!result.some(d=>d.x===x&&d.y===y))result.push({x,y});
    }
    return result;
  }
  private roto(p:Plant,food:boolean){
    const dirs=food?[-1,1].flatMap(x=>[-1,1].map(y=>({x,y}))):this.directions(p);
    for(const d of dirs){const jitter=food?1.5-3*this.#game.random():0,dx=BOARD.cellWidth*d.x+2*jitter,dy=BOARD.cellHeight*d.y,speed=(8+jitter)*BOARD.cellWidth/Math.hypot(dx,dy);
      this.shots.push({id:++this.serial,kind:'rotobaga',food,x:cellX(p.column),y:rowY(p.row)-45,vx:dx*speed,vy:dy*speed,row:p.row,targetY:0,age:0});}
  }
  private seed(p:Plant){
    const rows=[...new Set(this.targets(p).map(z=>z.row))];if(!rows.length)return;
    const row=rows[Math.floor(this.#game.random()*rows.length)];
    this.shots.push({id:++this.serial,kind:'dandelion',food:false,x:cellX(p.column)+15,y:rowY(p.row)-50,vx:2.2*BOARD.cellWidth,vy:Math.sign(row-p.row)*4.5*BOARD.cellHeight,row,targetY:rowY(row)-50,age:0});
  }
  private dropSeeds(p:Plant){
    const g=this.#game,zone=p.burst++,inZone=(x:number)=>zone===0?x>=cellX(5):zone===1?x<cellX(2):x>=cellX(2)&&x<cellX(5);
    const targets=g.zombies.filter(z=>z.hp>0&&inZone(z.x)).map(z=>({x:z.x,row:z.row}));
    const cells=Array.from({length:45},(_,i)=>({x:cellX(i%9),row:Math.floor(i/9)})).filter(c=>inZone(c.x));
    while(targets.length<7&&cells.length)targets.push(cells.splice(Math.floor(g.random()*cells.length),1)[0]);
    for(const target of targets)this.shots.push({id:++this.serial,kind:'dandelion',food:true,x:target.x+160,y:rowY(target.row)-650,vx:0,vy:0,row:target.row,targetY:rowY(target.row)-40,targetX:target.x,age:0,impactAt:.85+g.random()*.2});
  }
  private knock(p:Plant,food:boolean){
    const g=this.#game,x=cellX(p.column),targets=g.zombies.filter(z=>z.hp>0&&z!==g.boss?.zombie&&!z.leap&&!isFlying(z)&&!swinging(z,g.time)&&!['pirate_gargantuar','cannon','egypt_gargantuar'].includes(z.kind)&&Math.abs(z.row-p.row)<=(food?1:0)&&z.x>x-(food?0:BOARD.cellWidth/2)&&z.x<x+BOARD.cellWidth*(food?2:1.2));
    for(const z of targets){
      if(z.kind==='pirate_barrel'&&z.pusher!==undefined){const parent=g.zombies.find(q=>q.id===z.pusher);if(parent)delete parent.barrel;delete z.pusher;z.detachedAt=g.time;}
      z.leap={fromX:z.x,fromY:rowY(z.row),toX:z.x+g.props.plants.chardguard.BounceDistance*BOARD.cellWidth,toRow:z.row,at:g.time,duration:.5};
    }
    if(!food&&targets.length){p.leaves!--;this.visual('chardHand',['PlayM','PlayL','PlayR'][p.leaves!],x,rowY(p.row));this.sounds.push('chardguard/hitSounds');}
  }
  private lightning(p:Plant){
    const g=this.#game,props=g.props.plants.lightningreed,first=this.targets(p).sort((a,b)=>a.x-b.x)[0];if(!first)return false;
    const chain:Zombie[]=[first];
    for(let i=0;i<props.SplashCount;i++){const last=chain.at(-1)!,next=g.zombies.filter(z=>z.hp>0&&!chain.includes(z)&&Math.abs(z.row-last.row)<=1&&Math.abs(z.x-last.x)<BOARD.cellWidth*1.5).sort((a,b)=>a.x-b.x)[0];if(!next)break;chain.push(next);}
    let x=cellX(p.column),y=rowY(p.row)-50;
    for(const [i,z] of chain.entries()){g.damage(z,i?props.SplashDamage:props.Damage,z.kind==='west_bull'?'electric':'normal');this.visual('reedLink','Play1',x,y,z.x,rowY(z.row)-50);this.visual('reedHit','Play',z.x,rowY(z.row)-50);x=z.x;y=rowY(z.row)-50;}
    this.sounds.push('lightningreed/attackSound');return true;
  }
  tickPlant(p:Plant,dt:number){
    const g=this.#game,props=g.props.plants[p.kind],timelines=g.props.plantAnimations[p.kind];
    if(!p.animation)p.animation='Idle';
    if(p.kind==='jalapeno'){
      if(g.time-p.actionAt>=timelines.Attack.events.find(e=>e.name==='explode')!.at){this.fires.push({id:++this.serial,row:p.row,column:p.column,at:g.time,hit:[]});p.hp=0;this.sounds.push('jalapeno/burnSound');}return;
    }
    if(p.action==='idle'&&g.time>=p.nextAction){
      if(p.kind==='chardguard'&&p.leaves!>0){
        const x=cellX(p.column),near=g.zombies.filter(z=>z.hp>0&&z.row===p.row&&!isFlying(z)&&!z.leap&&!swinging(z,g.time)&&z.x>x-41&&z.x<x+123);
        if(near.length&&p.animation==='Idle'){this.play(p,'Ready');this.sounds.push('chardguard/readySaySounds');}
        else if(p.animation==='Idle_Ready'&&near.some(z=>z.x<x+41&&z!==g.boss?.zombie&&!['pirate_gargantuar','cannon'].includes(z.kind))){this.play(p,'Bounce');this.sounds.push('chardguard/bounceSounds');}
        else if(!near.length)p.animation='Idle';
      }else if(p.kind==='lightningreed'&&this.lightning(p)){this.play(p,'Attack');p.nextAction=g.time+props.AttackInterval+g.random()*props.AttackIntervalAdditional;}
      else if(p.kind==='xshot'&&this.directions(p).length||p.kind==='dandelion'&&this.targets(p).length){this.play(p,'Shoot');p.nextAction=g.time+props.ShootInterval+g.random()*props.ShootIntervalAdditional;}
    }
    if(p.action==='idle')return;
    const timeline=timelines[p.animation!],elapsed=(g.time-p.actionAt)*this.rate(p);
    while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
      const name=timeline.events[p.eventIndex!++].name;
      if(p.kind==='xshot'){
        if(name==='Shoot'){this.roto(p,false);this.sounds.push('xshot/shootSound');}
        if(name==='shootStart'){p.burst=props.PlantfoodPeaCount;p.nextBurst=g.time;}
      }
      if(p.kind==='dandelion'){
        if(name==='Shoot'){this.seed(p);this.sounds.push('dandelion/shootSounds');}
        if(name==='foodShoot'){this.dropSeeds(p);this.sounds.push('dandelion/foodShootSounds');}
        if(name==='playPar')this.visual('dandelionThrow','Play',cellX(p.column),rowY(p.row)-50);
        if(name==='foodCharge')this.sounds.push('dandelion/foodStartSounds');
      }
      if(p.kind==='chardguard'){
        if(name==='bounce'){this.knock(p,false);this.sounds.push('chardguard/bounceSaySounds');}
        if(name==='hit')this.knock(p,true);
        const key=({foodStartYell:'foodStartSaySounds',foodEndYell:'foodEndSaySounds',foodStart:'foodHitSounds',sleepy:'sleepySaySounds',shock:'shockSaySounds'} as Record<string,string>)[name];if(key)this.sounds.push('chardguard/'+key);
      }
      if(name==='foodEnd'||name==='shootEnd'){p.action='idle';p.animation='Idle';p.nextAction=g.time;return;}
    }
    if(p.kind==='xshot'&&p.action==='food'&&p.burst>0&&g.time>=p.nextBurst){this.roto(p,true);p.burst--;p.nextBurst+=2/props.PlantfoodPeaCount;}
    if(elapsed>=timeline.duration){p.action='idle';p.animation=p.animation==='Ready'?'Idle_Ready':'Idle';}
  }
  tick(dt:number){
    const g=this.#game;
    for(const p of this.shots){
      p.age+=dt;
      if(p.impactAt!==undefined){const t=Math.min(1,p.age/p.impactAt);p.x=p.targetX!+160*(1-t);p.y=p.targetY-650*(1-t);}
      else {p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.kind==='dandelion'&&p.vy){const next=p.vy-Math.sign(p.vy)*(4.5**2/2)*BOARD.cellHeight*dt;p.vy=Math.sign(next)!==Math.sign(p.vy)?0:next;if(!p.vy)p.y=p.targetY;}}
      const hit=p.impactAt!==undefined?p.age>=p.impactAt:g.zombies.some(z=>z.hp>0&&!z.leap&&Math.abs(z.x-p.x)<30&&Math.abs(rowY(z.row)-45-p.y)<40);
      if(!hit)continue;
      const prop=g.props.projectiles[p.kind==='rotobaga'?(p.food?'rotobaga_pf':'rotobaga'):(p.food?'dandelion_pf':'dandelion')];
      if(p.kind==='rotobaga'){const z=g.zombies.find(z=>z.hp>0&&!z.leap&&Math.abs(z.x-p.x)<30&&Math.abs(rowY(z.row)-45-p.y)<40)!;g.damage(z,prop.Damage);}
      else {for(const z of g.zombies)if(z.hp>0&&g.inLane(z,p.row)&&Math.abs(z.x-p.x)<BOARD.cellWidth)g.damage(z,prop.Damage,'potato');this.visual(p.food?'dandelionFoodExplosion':'dandelionExplosion','Play',p.x,rowY(p.row)-30);}
      p.age=100;
    }
    this.shots=this.shots.filter(p=>p.age<30&&p.x>BOARD.left-100&&p.x<1250&&p.y>BOARD.top-700&&p.y<800);
    for(const c of this.clouds){
      const age=g.time-c.at;c.striking=false;if(age<.5)continue;
      if(age>=.5+g.props.plants.lightningreed.PlantfoodDuration){if(!c.fading){c.fading=true;this.sounds.push('reedCloud/fadeSound');}continue;}
      let target=g.zombies.find(z=>z.id===c.target&&z.hp>0);if(!target){const targets=g.zombies.filter(z=>z.hp>0);target=targets[Math.floor(g.random()*targets.length)];c.target=target?.id??null;}
      if(target){const dx=target.x-c.x,dy=rowY(target.row)-c.y,length=Math.hypot(dx,dy),step=Math.min(length,550*dt);if(length){c.x+=dx/length*step;c.y+=dy/length*step;}if(length-step<=30){if(length>30)this.sounds.push('reedCloud/thunderSound');c.striking=true;g.damage(target,g.props.plants.lightningreed.PlantfoodDPS*dt,target.kind==='west_bull'?'electric':'normal');}}
    }
    this.clouds=this.clouds.filter(c=>g.time-c.at<.5+g.props.plants.lightningreed.PlantfoodDuration+g.props.plantAnimations.reedCloud.Fade.duration);
    for(const f of this.fires)for(const z of g.zombies)if(g.time-f.at<g.props.plants.jalapeno.Duration&&z.hp>0&&g.inLane(z,f.row)&&!f.hit.includes(z.id)&&g.time-f.at>=Math.abs((z.x-cellX(f.column))/BOARD.cellWidth)/18){g.damage(z,g.props.plants.jalapeno.Damage,'potato');f.hit.push(z.id);}
    this.fires=this.fires.filter(f=>g.time-f.at<g.props.plants.jalapeno.Duration+8/18+g.props.plantAnimations.jalapenoFire.Fade.duration);
    this.visuals=this.visuals.filter(v=>g.time-v.at<v.duration);
  }
}
