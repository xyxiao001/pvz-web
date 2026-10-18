import {EgyptBoss} from './egypt-boss';
import {BOARD,cellX,rowY,type BossAction} from './level';
import type {Game} from './model';

/** Mechanical dragon: native animation events drive summons, fire and two-lane breath. */
export class DarkBoss extends EgyptBoss {
  fireballs:{id:number;row:number;column:number;age:number;imp:boolean}[]=[];
  flames:{id:number;row:number;column:number;until:number;hit:Set<number>}[]=[];
  visuals:{id:number;name:string;x:number;y:number;at:number;duration:number}[]=[];
  private nextId=0;
  private cursor=0;
  private action:BossAction|null=null;
  private repeatsLeft=0;
  private idleLeft=0;
  private stunTime=0;
  private magnet=false;
  private firesLeft=0;
  private impsLeft=0;
  private rushColumn=6;
  private rushElapsed=0;
  private rushHits=0;
  private move:{from:number;to:number;elapsed:number;duration:number}|null=null;
  constructor(game:Game){super(game);this.zombie.x=cellX(6);}
  override get rate(){return ['Spawn','DeathStart','DeathIdle','Escape','StunStart','StunLoop','StunEnd','MagnetStart','MagnetLoop','MagnetEnd'].includes(this.animation)?1:this.current.AnimRateModifier*(this.game.time<this.zombie.chilledUntil?.5:1);}
  private change(name:string){this.animation=name;this.elapsed=0;this.cursor=0;this.animationSerial++;}
  private rest(){this.idleLeft=this.current.MinIdleTime+this.game.random()*(this.current.MaxIdleTime-this.current.MinIdleTime);this.change('Idle');}
  private stop(magnet:boolean){this.magnet=magnet;this.move=null;this.stunTime=this.current.StunTime;this.change(magnet?'MagnetStart':'StunStart');}
  magnetize(){if(this.zombie.hp<=0||this.animation==='Spawn')return;if(this.stunTime>0)this.stunTime=this.current.StunTime;else this.stop(true);}
  override hit(amount:number){
    if(this.zombie.hp<=0||this.animation==='Spawn')return;
    const floor=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0);
    this.zombie.hp-=amount*(this.stunTime>0?this.current.StunDamageScale:1);
    if(this.zombie.hp<=floor){
      this.zombie.hp=floor;
      if(this.stage===this.stages.length-1){
        this.move=null;this.fireballs=[];this.flames=[];this.zombie.x=cellX(this.game.level.boss!.deathColumn);this.zombie.row=this.game.level.boss!.deathRow;this.y=rowY(this.zombie.row);
        for(const z of [...this.game.zombies,...this.game.westFinale.allies])if(z!==this.zombie){z.hp=0;z.deathCause='potato';}this.change('DeathStart');
      }else {this.stage++;this.action=null;this.repeatsLeft=0;this.stop(false);}return;
    }
    if(this.animation==='RushLoop'){this.rushHits+=amount;if(this.rushHits>=400)this.stop(false);}
  }
  private choose(){
    const g=this.game,choices=this.current.Actions.filter(a=>a.weight>0&&(this.repeatsLeft>0?a===this.action:a!==this.action));
    let roll=g.random()*choices.reduce((n,a)=>n+a.weight,0);const action=choices.find(a=>(roll-=a.weight)<0)!;
    if(!this.repeatsLeft){this.action=action;this.repeatsLeft=action.repeatMin+Math.floor(g.random()*(action.repeatMax-action.repeatMin+1));}this.repeatsLeft--;
    if(action.actionName==='walk'){
      const rows=[...(this.zombie.row>1?[this.zombie.row-1]:[]),...(this.zombie.row<4?[this.zombie.row+1]:[])],to=rows[Math.floor(g.random()*rows.length)];
      this.move={from:this.y,to,elapsed:0,duration:140/30};this.change('Idle');
    }else if(action.actionName==='summon')this.change('Summon');
    else if(action.actionName==='rush'){this.rushColumn=6;this.rushElapsed=0;this.rushHits=0;this.change('RushStart');}
    else {const s=this.current;this.firesLeft=s.FireballCount+Math.floor(g.random()*(s.FireballCountAdditional+1));this.impsLeft=s.DragonImpCount+Math.floor(g.random()*(s.DragonImpCountAdditional+1));this.change('FireStart');}
  }
  private summonColumn(){
    const g=this.game,props=this.action!.summonProps,remaining=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0);
    let points=props.pointMin+(1-(this.zombie.hp-remaining)/this.current.HitPoints)*(props.pointMax-props.pointMin),food=g.random()<(props.plantfoodchance??.3);
    let choices=props.zombieList.filter(k=>g.props.zombies[k].WavePointCost<=points);
    while(choices.length){const kind=choices[Math.floor(g.random()*choices.length)],z=g.spawnZombie(kind,Math.floor(g.random()*5),cellX(5),'ground');if(food){z.food=true;food=false;}points-=g.props.zombies[kind].WavePointCost;choices=choices.filter(k=>g.props.zombies[k].WavePointCost<=points);}
  }
  private burn(row:number,column:number){
    const g=this.game,p=g.props.projectiles.zomboss_missile_dark;
    for(const t of g.graves)if(t.row===row&&t.column===column)t.hp-=p.FlameDamage;
    this.flames.push({id:++this.nextId,row,column,until:g.time+p.FlameDuration,hit:new Set()});
  }
  private cue(name:string){
    if(name==='Idle'){this.rest();return;}
    if(name==='summon')this.summonColumn();
    if(name==='rushLoop')this.change('RushLoop');
    if(name==='fireLoop'){if(this.firesLeft-->0)this.change('FireLoop');else this.change('FireEnd');}
    if(name==='Fire')this.fireballs.push({id:++this.nextId,row:Math.floor(this.game.random()*5),column:2+Math.floor(this.game.random()*5),age:0,imp:this.impsLeft-->0});
    if(name==='shade'||name==='introFire'){
      const asset=name==='shade'?'dragonShade':'dragonIntroFire';this.visuals.push({id:++this.nextId,name:asset,x:cellX(name==='shade'?4:8),y:rowY(2),at:this.game.time,duration:this.game.props.plantAnimations[asset].Play.duration});
    }
  }
  override tick(dt:number){
    const g=this.game;
    this.visuals=this.visuals.filter(v=>g.time-v.at<v.duration);this.flames=this.flames.filter(f=>f.until>g.time);
    for(const f of this.flames)for(const p of g.plants)if(p.row===f.row&&p.column===f.column&&p.action!=='food'&&!f.hit.has(p.id)){p.hp-=g.props.projectiles.zomboss_missile_dark.FlameDamage;f.hit.add(p.id);}
    for(const f of this.fireballs){f.age+=dt;if(f.age>=1.5&&f.age-dt<1.5){this.burn(f.row,f.column);if(f.imp)g.spawnZombie('dark_imp_dragon',f.row,cellX(f.column),'ground');}}
    this.fireballs=this.fireballs.filter(f=>f.age<1.5);
    if(this.defeated)return;
    const animation=this.animation;this.elapsed+=dt*this.rate;
    if(this.move){const m=this.move;m.elapsed+=dt*this.rate;const t=Math.min(1,m.elapsed/m.duration),ease=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;this.y=m.from+(rowY(m.to)-m.from)*ease;if(t===1){this.zombie.row=m.to;this.move=null;this.rest();}return;}
    if(animation==='Idle'){this.idleLeft-=dt;if(this.idleLeft<=0)this.choose();return;}
    if(animation==='RushLoop'){
      this.rushElapsed+=dt;const column=6*(1-Math.min(1,this.rushElapsed/3));
      for(let c=Math.floor(column);c<Math.floor(this.rushColumn);c++)for(const row of [this.zombie.row-1,this.zombie.row])this.burn(row,c);
      this.rushColumn=column;if(this.rushElapsed>=3)this.change('RushEnd');return;
    }
    if(animation==='StunLoop'||animation==='MagnetLoop'){this.stunTime-=dt;if(this.stunTime<=0)this.change(this.magnet?'MagnetEnd':'StunEnd');return;}
    const timeline=g.props.plantAnimations.boss[animation];
    while(this.cursor<timeline.events.length&&this.elapsed>=timeline.events[this.cursor].at){this.cue(timeline.events[this.cursor++].name);if(this.animation!==animation)return;}
    if(this.elapsed>=timeline.duration){
      if(animation==='StunStart'||animation==='MagnetStart')this.change(this.magnet?'MagnetLoop':'StunLoop');
      else if(animation==='DeathStart')this.change('DeathIdle');
      else if(animation==='DeathIdle')this.change('Escape');
      else if(animation==='Escape')this.defeated=true;
      else if(animation==='FireLoop')this.cue('fireLoop');
      else this.rest();
    }
  }
}
