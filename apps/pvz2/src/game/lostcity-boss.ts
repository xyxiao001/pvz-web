import {EgyptBoss} from './egypt-boss';
import {cellX,rowY,type BossAction,type ZombieKind} from './level';
import type {Game} from './model';
import native from '../../public/assets/lostcity/properties.json';

export class LostCityBoss extends EgyptBoss {
  sandbags:{id:number;row:number;column:number;age:number}[]=[];
  planes:{id:number;at:number}[]=[];
  private cursor=0;
  private restLeft=0;
  private stunLeftCity=0;
  private previous:BossAction|null=null;
  private summonQueue:ZombieKind[]=[];
  private summonLeft=0;
  private cityFoodSent=false;
  private travelState:{x:number;y:number;toX:number;row:number;age:number;after:string}|null=null;
  constructor(game:Game){super(game);}
  override covers(row:number){return row>=this.zombie.row-1&&row<=this.zombie.row+1;}
  override get rate(){return ['Spawn','DeathStart','DeathIdle','Escape','StunStart','StunLoop','StunEnd'].includes(this.animation)?1:this.current.AnimRateModifier*(this.game.time<this.zombie.chilledUntil?.5:1);}
  private change(name:string){this.animation=name;this.elapsed=0;this.cursor=0;this.animationSerial++;}
  private rest(){this.restLeft=this.current.MinIdleTime+this.game.random()*(this.current.MaxIdleTime-this.current.MinIdleTime);this.change('Idle');}
  override hit(amount:number){
    if(this.zombie.hp<=0||this.animation==='Spawn')return;
    const floor=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0);
    this.zombie.hp-=amount*(this.stunLeftCity>0?this.current.StunDamageScale:1);
    if(this.zombie.hp>floor)return;
    this.zombie.hp=floor;this.travelState=null;this.summonQueue=[];this.sandbags=[];this.planes=[];
    if(this.stage===this.stages.length-1){
      for(const z of [...this.game.zombies,...this.game.westFinale.allies])if(z!==this.zombie){z.hp=0;z.deathCause='potato';}
      this.travel(this.game.level.boss!.deathColumn,this.game.level.boss!.deathRow,'DeathStart');
    }else {this.stage++;this.previous=null;this.stunLeftCity=this.current.StunTime;this.change('StunStart');}
  }
  private travel(column:number,row:number,after:string){this.travelState={x:this.zombie.x,y:this.y,toX:cellX(column),row,age:0,after};this.change('Idle');}
  private choose(){
    const g=this.game,choices=this.current.Actions.filter(a=>a.weight>0&&a!==this.previous);
    let roll=g.random()*choices.reduce((n,a)=>n+a.weight,0);const action=choices.find(a=>(roll-=a.weight)<0)!;this.previous=action;
    if(action.actionName==='summon'){
      const remaining=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0),part=1-(this.zombie.hp-remaining)/this.current.HitPoints;
      let points=action.summonProps.pointMin+part*(action.summonProps.pointMax-action.summonProps.pointMin),pool=action.summonProps.zombieList.filter(k=>g.props.zombies[k].WavePointCost<=points);
      this.summonQueue=[];this.cityFoodSent=false;
      while(pool.length){const kind=pool[Math.floor(g.random()*pool.length)];this.summonQueue.push(kind);points-=g.props.zombies[kind].WavePointCost;pool=pool.filter(k=>g.props.zombies[k].WavePointCost<=points);}
      const rows=[0,1,2,3].filter(r=>r!==this.zombie.row);this.travel(6,rows[Math.floor(g.random()*rows.length)],'SummonStart');
    }else if(action.actionName==='rush'){
      const rows=[0,1,2,3,4].filter(r=>r!==this.zombie.row);this.travel(7,rows[Math.floor(g.random()*rows.length)],'Drop');
    }else this.change('Shoot');
  }
  private cue(name:string){const g=this.game;
    if(name==='Idle')this.rest();
    if(name==='StunLoop'||name==='SummonLoop'||name==='DeathIdle')this.change(name);
    if(name==='summonStart')this.summonLeft=.5;
    if(name==='plane')this.planes.push({id:g.nextEntityId(),at:g.time});
    if(name==='parachute'){
      const stage=native.zombies.zombossmech_lostcity.ZombossStages[this.stage],cells=[];
      for(let row=0;row<5;row++)for(let column=stage.ParachuteColumn.Min;column<=stage.ParachuteColumn.Max;column++)cells.push({row,column});
      const count=stage.ParachuteCount.Min+Math.floor(g.random()*(stage.ParachuteCount.Max-stage.ParachuteCount.Min+1));
      for(let i=0;i<count;i++){const cell=cells.splice(Math.floor(g.random()*cells.length),1)[0],z=g.spawnZombie(stage.ParachuteType as ZombieKind,cell.row,cellX(cell.column),'parachute');z.pilot!.fallTime=1.5;}
    }
    if(name==='drop')this.sandbags.push({id:g.nextEntityId(),row:this.zombie.row,column:8,age:0});
  }
  override tick(dt:number){const g=this.game;
    for(const bag of this.sandbags){bag.age+=dt;if(bag.age-dt<.75&&bag.age>=.75){const i=g.level.trapTiles.findIndex(t=>t.row===bag.row&&t.column===bag.column);g.lostcity.triggerTrap(i);g.beach.sounds.push('sandbag/sandSounds');}}
    this.sandbags=this.sandbags.filter(b=>b.age<.75);this.planes=this.planes.filter(p=>g.time-p.at<g.props.plantAnimations.planeShade.PlayL.duration);
    if(this.defeated)return;
    if(this.travelState){const m=this.travelState;m.age+=dt;const t=Math.min(1,m.age);this.zombie.x=m.x+(m.toX-m.x)*t;this.y=m.y+(rowY(m.row)-m.y)*t;
      if(t===1){this.zombie.row=m.row;this.travelState=null;this.change(m.after);}return;}
    const animation=this.animation;this.elapsed+=dt*this.rate;
    if(animation==='Idle'){this.restLeft-=dt;if(this.restLeft<=0)this.choose();return;}
    if(animation==='StunStart')this.stunLeftCity-=dt;
    if(animation==='StunLoop'){this.stunLeftCity-=dt;if(this.stunLeftCity<=0)this.change('StunEnd');return;}
    if(animation==='SummonLoop'){
      this.summonLeft-=dt;
      if(this.summonLeft<=0&&this.summonQueue.length){const kind=this.summonQueue.shift()!,rows=[this.zombie.row,this.zombie.row+1,this.zombie.row+2].filter(r=>r<5),row=rows[Math.floor(g.random()*rows.length)],z=g.spawnZombie(kind,row,cellX(7),'ground');
        z.leap={fromX:cellX(7),fromY:rowY(row)-120,toX:cellX(7),toRow:row,at:g.time,duration:.5};
        if(!this.cityFoodSent&&g.random()<.3){z.food=true;this.cityFoodSent=true;}this.summonLeft=.5;
      }
      if(!this.summonQueue.length)this.change('SummonEnd');return;
    }
    const timeline=g.props.plantAnimations.boss[animation];
    while(this.cursor<timeline.events.length&&this.elapsed>=timeline.events[this.cursor].at){this.cue(timeline.events[this.cursor++].name);if(this.animation!==animation)return;}
    if(this.elapsed>=timeline.duration){if(animation==='DeathIdle')this.change('Escape');else if(animation==='Escape')this.defeated=true;}
  }
}
