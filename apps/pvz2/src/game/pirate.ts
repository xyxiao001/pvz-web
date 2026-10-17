import {BOARD,cellX,rowY,type ZombieKind} from './level';
import type {Game,Plant,Zombie} from './model';

export const seaCell=(planks:readonly number[]|null,row:number,column:number)=>planks!==null&&column>=5&&!planks.includes(row);
export const pirateArmor=(kind:ZombieKind)=>kind==='pirate_armor1'?'pirate_armor1':kind==='pirate_armor2'?'pirate_armor2':null;
export const zombieY=(z:Zombie)=>z.route?.y??rowY(z.row);
export const swinging=(z:Zombie,time:number)=>!!z.swing&&time<z.swing.end;

export interface CannonShot {id:number;x:number;y:number;row:number;age:number}
export interface PirateEffect {id:number;kind:'snapFire'|'snapFood'|'snapBall'|'coconutHit';x:number;y:number;at:number;damage?:number;hits?:number[];burning?:boolean}
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
  spawn(z:Zombie){
    const g=this.#game;
    if(z.kind==='swashbuckler'){
      const props=g.props.zombies.swashbuckler,back=this.eventTime('swashbuckler','SwingBack','swingJudge');
      const failure=seaCell(g.level.planks,z.row,8)&&g.random()<props.ChanceToFallIntoSea;
      z.x=cellX(props.LandingColumns[Math.floor(g.random()*props.LandingColumns.length)])+(failure?2*BOARD.cellWidth:0);
      z.swing={at:g.time,judge:g.time+back,end:g.time+back+this.eventTime('swashbuckler',failure?'SwingFailure':'SwingSuccess',failure?'die':'switchingFalse'),failure};
    }
    if(g.level.cannon){
      const points=g.level.cannon.Lanes[z.row].SplinePoints.map(p=>({x:BOARD.left+(p.x-200)/64*BOARD.cellWidth,y:rowY(0)-BOARD.cellHeight/2+(p.y-160)/76*BOARD.cellHeight}));
      z.route={points,index:0,y:rowY(z.row),angle:Math.PI};
    }
  }
  tickZombie(z:Zombie,dt:number){
    const g=this.#game;
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
    if(!p||p.action!=='idle'||g.time<p.nextAction)return false;
    p.action='shoot';p.animation='Shoot';p.actionAt=g.time;p.eventIndex=0;return true;
  }
  tickPlant(p:Plant){
    const g=this.#game,props=g.props.plants[p.kind],timelines=g.props.plantAnimations[p.kind],x=cellX(p.column);
    if(p.action==='idle'){
      if(p.kind==='coconutcannon'){
        if(p.animation==='Sleep'&&g.time>=p.nextAction){p.animation='Wake';p.action='grow';p.actionAt=g.time;p.eventIndex=0;}
        return;
      }
      if(g.time<p.nextAction||!g.zombies.some(z=>z.hp>0&&!swinging(z,g.time)&&Math.abs(zombieY(z)-rowY(p.row))<BOARD.cellHeight*1.5&&z.x>=x-41&&z.x<=x+BOARD.cellWidth*2.5))return;
      p.action='shoot';p.animation='Attack';p.actionAt=g.time;p.eventIndex=0;p.nextAction=g.time+props.AttackInterval+g.random()*props.AttackIntervalAdditional;
    }
    const timeline=timelines[p.animation!],elapsed=(g.time-p.actionAt)*(p.kind==='coconutcannon'&&p.action==='shoot'?2:1);
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
      }else if(event==='Shoot')this.shots.push({id:++this.serial,x:x+38,y:rowY(p.row)-44,row:p.row,age:0});
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
      const old=shot.x;shot.x+=17*60*.5*dt;shot.age+=dt;
      const target=g.zombies.filter(z=>z.hp>0&&z.x>=old-25&&z.x<=shot.x+25&&Math.abs(zombieY(z)-44-shot.y)<45).sort((a,b)=>a.x-b.x)[0];
      if(!target)continue;
      const splash=g.props.projectiles.coconut.SplashDamage[0];let killed=0;
      for(const z of g.zombies)if(z.hp>0&&Math.abs(z.x-target.x)<=2.5*BOARD.cellWidth/2&&Math.abs(zombieY(z)-zombieY(target))<=BOARD.cellHeight){g.damage(z,z===target?g.props.projectiles.coconut.Damage:splash.Damage!,'potato');if(z.hp<=0)killed++;}
      const bracket=g.level.cannon!.ComboBrackets.filter(b=>killed>=b.ZombiesKilled).at(-1);
      this.score+=killed*g.level.cannon!.BaseZombieKillScore*(bracket?bracket.ScoreMultiplier:1);this.combo=killed;this.comboUntil=g.time+1.8;
      this.effects.push({id:++this.serial,kind:'coconutHit',x:target.x,y:zombieY(target),at:g.time});shot.age=Infinity;
    }
    this.shots=this.shots.filter(p=>p.age<4&&p.x<1250);
    // Routes leave the authored flight area without counting escaped birds as kills.
    g.zombies=g.zombies.filter(z=>!z.route||z.route.index<z.route.points.length||z.x>-100&&z.x<1400&&z.route.y>-150&&z.route.y<900);
    this.effects=this.effects.filter(e=>g.time-e.at<g.props.plantAnimations[e.kind][e.kind==='snapFire'||e.kind==='snapBall'?'Play1':'Play'].duration);
  }
}
