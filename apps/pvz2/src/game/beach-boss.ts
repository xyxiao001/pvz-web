import {EgyptBoss} from './egypt-boss';
import {BOARD,cellX,rowY,type BossAction} from './level';
import type {Game} from './model';

interface Shark {id:number;row:number;column:number;animation:string;elapsed:number;event:number;target?:{row:number;column:number}}
/** Beach mech attacks and sharks follow the pinned skeleton's animation events. */
export class BeachBoss extends EgyptBoss {
  sharks:Shark[]=[];
  cuts:{id:number;row:number;column:number;at:number}[]=[];
  pulling=new Map<number,number>();
  private nextId=0;
  private cursor=0;
  private action:BossAction|null=null;
  private repeatsLeft=0;
  private idleLeft=0;
  private stunTime=0;
  private cough=false;
  private rushHits=0;
  private jumpRow=1;
  private landingAt=Infinity;
  constructor(game:Game){super(game);this.spawnSharks();}
  override get rate(){return ['Spawn','DeathStart','DeathIdle','Escape','StunStart','StunLoop','StunEnd','CoughStart','CoughLoop','CoughEnd'].includes(this.animation)?1:this.current.AnimRateModifier*(this.game.time<this.zombie.chilledUntil?.5:1);}
  private change(name:string){this.animation=name;this.elapsed=0;this.cursor=0;this.animationSerial++;}
  private rest(){this.idleLeft=this.current.MinIdleTime+this.game.random()*(this.current.MaxIdleTime-this.current.MinIdleTime);this.change('Idle');}
  private stop(cough:boolean){this.cough=cough;this.pulling.clear();this.stunTime=this.current.StunTime;this.change(cough?'CoughStart':'StunStart');}
  override hit(amount:number){
    if(this.zombie.hp<=0||this.animation==='Spawn'||this.animation==='LeapStart')return;
    const floor=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0);
    this.zombie.hp-=amount*(this.stunTime>0?this.current.StunDamageScale:1);
    if(this.zombie.hp<=floor){
      this.zombie.hp=floor;
      if(this.stage===this.stages.length-1){
        this.pulling.clear();this.sharks=[];this.zombie.x=cellX(this.game.level.boss!.deathColumn);this.zombie.row=this.game.level.boss!.deathRow;this.y=rowY(this.zombie.row);
        for(const z of [...this.game.zombies,...this.game.westFinale.allies])if(z!==this.zombie){z.hp=0;z.deathCause='potato';}this.change('DeathStart');
      }else {this.stage++;this.action=null;this.repeatsLeft=0;this.stop(false);}return;
    }
    if(this.animation==='RushLoop'){this.rushHits+=amount;if(this.rushHits>=1000)this.stop(false);}
  }
  private spawnSharks(){
    this.sharks=this.sharks.filter(s=>s.target||s.row!==this.zombie.row);
    for(let row=0;row<5;row++)if(row!==this.zombie.row&&!this.sharks.some(s=>!s.target&&s.row===row))this.sharks.push({id:++this.nextId,row,column:7,animation:'Enter',elapsed:0,event:0});
  }
  private shootCells(){return this.game.plants.filter(p=>p.hp>0&&p.action!=='food'&&this.game.beach.water(p.column)).map(p=>({row:p.row,column:p.column})).filter((p,i,a)=>a.findIndex(q=>q.row===p.row&&q.column===p.column)===i);}
  private choose(){
    const g=this.game,choices=this.current.Actions.filter(a=>a.weight>0&&(this.repeatsLeft>0?a===this.action:a!==this.action)&&(a.actionName!=='shoot'||this.shootCells().length>0));
    // A repeated shoot ends when its targets have been cleared.
    if(!choices.length){this.repeatsLeft=0;this.rest();return;}
    let roll=g.random()*choices.reduce((n,a)=>n+a.weight,0);const action=choices.find(a=>(roll-=a.weight)<0)!;
    if(!this.repeatsLeft){this.action=action;this.repeatsLeft=action.repeatMin+Math.floor(g.random()*(action.repeatMax-action.repeatMin+1));}this.repeatsLeft--;
    if(action.actionName==='jump'){const rows=[1,2,3,4].filter(r=>r!==this.zombie.row);this.jumpRow=rows[Math.floor(g.random()*rows.length)];this.change('LeapStart');}
    else if(action.actionName==='summon')this.change('Summon');
    else if(action.actionName==='rush'){this.rushHits=0;this.change('RushStart');}
    else this.change('Shoot');
  }
  private summonColumn(){
    const g=this.game,props=this.action!.summonProps,remaining=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0);
    let points=props.pointMin+(1-(this.zombie.hp-remaining)/this.current.HitPoints)*(props.pointMax-props.pointMin),food=g.random()<(g.level.day===42?props.plantfoodchance!:.3);
    let choices=props.zombieList.filter(k=>g.props.zombies[k].WavePointCost<=points);
    while(choices.length){const kind=choices[Math.floor(g.random()*choices.length)],z=g.spawnZombie(kind,Math.floor(g.random()*5),cellX(5),'ground');if(food){z.food=true;food=false;}points-=g.props.zombies[kind].WavePointCost;choices=choices.filter(k=>g.props.zombies[k].WavePointCost<=points);}
  }
  private cut(row:number,column:number){this.cuts.push({id:++this.nextId,row,column,at:this.game.time});this.game.beach.sounds.push('boss/plantCutSounds');}
  private suck(dt:number){
    const g=this.game;
    for(const row of [this.zombie.row-1,this.zombie.row]){
      for(let column=6;column>=0;column--){
        const plants=g.plants.filter(p=>p.hp>0&&p.row===row&&p.column===column);
        if(g.graves.some(t=>t.hp>0&&t.kind==='octopus'&&t.row===row&&t.column===column)||plants.some(p=>p.sheep!==undefined||p.action==='food'||g.props.plants[p.kind].CannotBePushedByFootballMech))break;
        const moving=plants.filter(p=>p.kind!=='lilypad');
        for(const p of moving){
          if(column===6){p.hp=0;if(p.kind==='tanglekelp'){this.stop(true);return;}this.cut(row,column);continue;}
          if(!this.pulling.has(p.id))this.pulling.set(p.id,g.time+.5*(7-column)/7);
          if(g.time>=this.pulling.get(p.id)!){p.leap={x:cellX(column),y:rowY(row),at:g.time,pushed:true};p.column++;this.pulling.set(p.id,g.time+.5*(7-p.column)/7);}
        }
      }
      for(const z of [...g.zombies,...g.westFinale.allies])if(z!==this.zombie&&z.hp>0&&z.row===row&&z.x<this.zombie.x&&!['beach','beach_fem','beach_armor1','beach_armor2','beach_fem_armor1','beach_fem_armor2','beach_imp','beach_flag'].includes(z.kind)&&!g.props.zombies[z.kind].CannotBeKnockedBackByProjectiles){z.x+=5*BOARD.cellWidth*dt;if(z.x>=this.zombie.x){z.hp=0;this.cut(row,6);}}
    }
  }
  private tickSharks(dt:number){
    const g=this.game;
    for(const s of this.sharks){
      const animation=s.animation;s.elapsed+=dt*(s.target&&animation!=='Kill'?3:1);
      const timeline=g.props.plantAnimations.beachShark[animation];
      while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){
        const event=timeline.events[s.event++].name;
        if(event==='burst')g.beach.sounds.push('beachShark/burstSounds');
        if(event==='kill'){
          s.row=s.target!.row;s.column=s.target!.column;s.animation='Kill';
          for(const p of g.plants)if(p.row===s.row&&p.column===s.column&&p.action!=='food')p.hp=0;
          for(const z of g.westFinale.allies)if(z.row===s.row&&Math.abs(z.x-cellX(s.column))<BOARD.cellWidth/2)z.hp=0;
        }
        if(event==='judgeIdle')s.animation=s.target?'Dive':'Idle';
        if(event==='die')s.animation='dead';
        if(s.animation!==animation){s.elapsed=0;s.event=0;break;}
      }
    }
    this.sharks=this.sharks.filter(s=>s.animation!=='dead');
  }
  private cue(name:string){
    if(name==='Idle')this.rest();
    if(name==='summon')this.summonColumn();
    if(name==='RushLoop'){this.change('RushLoop');this.game.beach.sounds.push('boss/rushLoopSound');}
    if(name==='shoot'){
      const cells=this.shootCells(),sharks=this.sharks.filter(s=>!s.target);
      for(const s of sharks){if(!cells.length)break;s.target=cells.splice(Math.floor(this.game.random()*cells.length),1)[0];s.animation='Dive';s.elapsed=0;s.event=0;}
      this.spawnSharks();
    }
  }
  override tick(dt:number){
    const g=this.game;
    this.cuts=this.cuts.filter(c=>g.time-c.at<g.props.plantAnimations.bossCut.Pop.duration);this.tickSharks(dt);
    if(this.defeated)return;
    if(g.time>=this.landingAt){this.landingAt=Infinity;for(const p of g.plants)if(this.covers(p.row)&&p.column>=5&&p.column<=6&&p.action!=='food'&&p.kind!=='lilypad')p.hp=0;}
    const animation=this.animation;this.elapsed+=dt*this.rate;
    if(animation==='Idle'){this.idleLeft-=dt;if(this.idleLeft<=0)this.choose();return;}
    if(animation==='LeapStart'){if(this.elapsed>=3){this.zombie.row=this.jumpRow;this.zombie.x=cellX(6);this.y=rowY(this.jumpRow);this.spawnSharks();this.landingAt=g.time+.5;this.change('LeapEnd');}return;}
    if(animation==='RushLoop'){this.suck(dt);if(this.animation==='RushLoop'&&this.elapsed>=4){this.pulling.clear();this.change('RushEnd');}return;}
    if(animation==='StunLoop'||animation==='CoughLoop'){this.stunTime-=dt;if(this.stunTime<=0)this.change(this.cough?'CoughEnd':'StunEnd');return;}
    const timeline=g.props.plantAnimations.boss[animation];
    while(this.cursor<timeline.events.length&&this.elapsed>=timeline.events[this.cursor].at){this.cue(timeline.events[this.cursor++].name);if(this.animation!==animation)return;}
    if(this.elapsed>=timeline.duration){
      if(animation==='StunStart'||animation==='CoughStart')this.change(this.cough?'CoughLoop':'StunLoop');
      else if(animation==='DeathStart')this.change('DeathIdle');
      else if(animation==='DeathIdle')this.change('Escape');
      else if(animation==='Escape')this.defeated=true;
      else this.rest();
    }
  }
}
