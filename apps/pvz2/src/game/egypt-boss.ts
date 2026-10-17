import { BOARD, cellX, rowY, type BossAction, type ZombieKind } from './level';
import type { Game, Zombie } from './model';

/** The Egyptian mech uses its own action clock; attacks follow native skeleton events. */
export class EgyptBoss {
  readonly zombie:Zombie;
  stage=0;
  animation='Spawn';
  elapsed=0;
  animationSerial=0;
  height=0;
  y:number;
  defeated=false;
  targets:{row:number;column:number}[]=[];
  missiles:{id:number;row:number;column:number;age:number}[]=[];
  private serial=0;
  private eventIndex=0;
  private idle=0;
  private last:BossAction|null=null;
  private repeats=0;
  private afterJump:'idle'|'summon'|'death'='idle';
  private movement:{x:number;y:number;toX:number;row:number;duration:number;elapsed:number}|null=null;
  private summon:ZombieKind[]=[];
  private summonAt=0;
  private foodSent=false;
  private rushDamage=0;
  private stunLeft=0;
  private rushing=false;
  private backing=false;
  constructor(protected game:Game){
    const config=game.level.boss!;
    this.zombie=game.spawnZombie(config.kind,config.row,cellX(config.column));
    this.zombie.hp=this.stages.reduce((hp,s)=>hp+s.HitPoints,0);
    this.y=rowY(config.row);
  }
  get stages(){return this.game.props.zombies[this.zombie.kind].ZombossStages;}
  get current(){return this.stages[this.stage];}
  get progress(){const remaining=this.stages.slice(this.stage+1).reduce((hp,s)=>hp+s.HitPoints,0);return (this.stages.length-1-this.stage+(this.zombie.hp-remaining)/this.current.HitPoints)/this.stages.length;}
  get rate(){return this.rushing?2.7:['Spawn','DeathStart','DeathIdle','Escape','StunStart','Stunning','StunEnd'].includes(this.animation)?1:this.current.AnimRateModifier*(this.game.time<this.zombie.chilledUntil?.5:1);}
  covers(row:number){return row===this.zombie.row||row===this.zombie.row-1;}
  hit(amount:number){
    if(this.zombie.hp<=0||this.animation==='Spawn'||this.height>0)return;
    const floor=this.stages.slice(this.stage+1).reduce((hp,s)=>hp+s.HitPoints,0);
    this.zombie.hp-=amount*(this.stunLeft>0?this.current.StunDamageScale:1);
    if(this.zombie.hp<=0&&this.stage===this.stages.length-1){this.zombie.hp=0;this.targets=[];this.summon=[];this.jump(this.game.level.boss!.deathColumn,this.game.level.boss!.deathRow,'death');return;}
    if(this.zombie.hp<=floor){this.zombie.hp=floor;this.stage++;this.last=null;this.repeats=0;this.stun();return;}
    if(this.rushing){this.rushDamage+=amount;if(this.rushDamage>=400)this.stun();}
  }
  freeze(){this.zombie.chilledUntil=this.game.time+this.current.ChilledDurationFromFrozen;}
  private play(animation:string){this.animation=animation;this.elapsed=0;this.eventIndex=0;this.animationSerial++;}
  private stun(){this.rushing=false;this.backing=false;this.movement=null;this.targets=[];this.summon=[];this.stunLeft=this.current.StunTime;this.zombie.x+=this.current.StunStaggerBackMovement*BOARD.cellWidth;this.play('StunStart');}
  private jump(column:number,row:number,after:'idle'|'summon'|'death'){
    this.rushing=false;this.backing=false;this.afterJump=after;
    this.movement={x:this.zombie.x,y:this.y,toX:cellX(column),row,duration:.8,elapsed:0};this.play('LeapStart');
  }
  private randomRow(){const rows=[1,2,3,4].filter(r=>r!==this.zombie.row);return rows[Math.floor(this.game.random()*rows.length)];}
  private chooseAction(){
    const column=Math.round((this.zombie.x-BOARD.left)/BOARD.cellWidth-.5);
    const actions=this.current.Actions.filter(a=>a.weight>0&&(this.repeats>0?a===this.last:a!==this.last)&&(a.actionName==='walk'||column===7)&&(a.actionName!=='rush'||this.game.plants.some(p=>this.covers(p.row))));
    if(!actions.length){this.repeats=0;this.jump(7,this.randomRow(),'idle');return;}
    let roll=this.game.random()*actions.reduce((n,a)=>n+a.weight,0);const action=actions.find(a=>(roll-=a.weight)<0)!;
    if(this.repeats===0){this.last=action;this.repeats=action.repeatMin+Math.floor(this.game.random()*(action.repeatMax-action.repeatMin+1));}this.repeats--;
    if(action.actionName==='summon'){
      const remaining=this.stages.slice(this.stage+1).reduce((hp,s)=>hp+s.HitPoints,0),part=1-(this.zombie.hp-remaining)/this.current.HitPoints;
      let points=action.summonProps.pointMin+part*(action.summonProps.pointMax-action.summonProps.pointMin);
      this.summon=[];let choices=action.summonProps.zombieList.filter(k=>this.game.props.zombies[k].WavePointCost<=points);
      while(choices.length){const kind=choices[Math.floor(this.game.random()*choices.length)];this.summon.push(kind);points-=this.game.props.zombies[kind].WavePointCost;choices=choices.filter(k=>this.game.props.zombies[k].WavePointCost<=points);}
      this.foodSent=false;this.jump(7,this.randomRow(),'summon');
    }else if(action.actionName==='shoot'){
      this.aim();this.play('Shoot');
    }else if(action.actionName==='rush'){this.play('Stomp');}
    else {
      const options=[...(this.zombie.row>1?['WalkU']:[]),...(this.zombie.row<4?['WalkD']:[]),...(column>7?['WalkL']:column<7?['WalkR']:[])];
      const animation=options[Math.floor(this.game.random()*options.length)],row=this.zombie.row+(animation==='WalkU'?-1:animation==='WalkD'?1:0);
      this.movement={x:this.zombie.x,y:this.y,toX:this.zombie.x+(animation==='WalkL'?-82:animation==='WalkR'?82:0),row,duration:35/30,elapsed:0};this.play(animation);
    }
  }
  protected aim(){
    const plants=this.game.plants;
    const cell=this.game.random()>.5&&plants.length?plants[Math.floor(this.game.random()*plants.length)]:{row:Math.floor(this.game.random()*5),column:Math.floor(this.game.random()*6)};
    this.targets=[{row:cell.row,column:cell.column}];
  }
  protected fire(){for(const target of this.targets)this.missiles.push({...target,id:++this.serial,age:0});this.targets=[];}
  private crush(){
    for(const p of this.game.plants)if(this.covers(p.row)&&Math.abs(cellX(p.column)-this.zombie.x)<100){if(p.action==='food'){if(this.rushing)this.stun();}else p.hp=0;}
    for(const g of this.game.graves)if(this.covers(g.row)&&Math.abs(cellX(g.column)-this.zombie.x)<100)g.hp=0;
    for(const z of this.game.zombies)if(z!==this.zombie&&this.covers(z.row)&&Math.abs(z.x-this.zombie.x)<90){z.hp=0;z.deathCause='potato';}
  }
  private event(name:string){
    if(name==='leap')this.play('Leaping');
    if(name==='stabU'||name==='stabD'){
      const row=this.zombie.row-(name==='stabU'?1:0),x=this.zombie.x-BOARD.cellWidth;
      for(const p of this.game.plants)if(p.row===row&&Math.abs(cellX(p.column)-x)<40&&p.action!=='food')p.hp=0;
      for(const g of this.game.graves)if(g.row===row&&Math.abs(cellX(g.column)-x)<40)g.hp=0;
    }
    if(name==='mouthOpenSound')this.summonAt=this.game.time+.5;
    if(name==='shoot')this.fire();
  }
  protected impact(missile:{row:number;column:number}){
      const props=this.game.props.projectiles[this.game.props.zombies[this.zombie.kind].MissileType];
      for(const plant of this.game.plants)if(plant.row===missile.row&&Math.abs(plant.column-missile.column)<=1&&plant.action!=='food')plant.hp-=plant.column===missile.column?props.Damage:props.SplashDamage[0].Damage!;
      const cells=Array.from({length:9},(_,i)=>({row:missile.row+Math.floor(i/3)-1,column:missile.column+i%3-1})).filter(c=>c.row>=0&&c.row<5&&c.column>=0&&c.column<9&&(c.row!==missile.row||c.column!==missile.column)&&!this.game.plants.some(p=>p.row===c.row&&p.column===c.column)&&!this.game.graves.some(g=>g.row===c.row&&g.column===c.column));
      let count=props.BoneCount.Min+Math.floor(this.game.random()*(props.BoneCount.Max-props.BoneCount.Min+1));
      while(count--&&cells.length){const cell=cells.splice(Math.floor(this.game.random()*cells.length),1)[0];this.game.throwBone(cell.row,cell.column,cellX(missile.column),rowY(missile.row));}
  }
  tick(dt:number){
    for(const missile of this.missiles){missile.age+=dt;if(missile.age-dt<1.5&&missile.age>=1.5){
      this.impact(missile);
    }}
    this.missiles=this.missiles.filter(m=>m.age<2.5);
    if(this.defeated)return;
    const animation=this.animation;this.elapsed+=dt*this.rate;
    if(this.movement&&(['WalkU','WalkD','WalkL','WalkR','Leaping'].includes(animation))){
      const move=this.movement;move.elapsed+=dt*(this.rushing||this.backing||animation==='Leaping'?1:this.rate);
      const t=Math.min(1,move.elapsed/move.duration),ease=this.rushing?t*t:t;
      this.zombie.x=move.x+(move.toX-move.x)*ease;this.y=move.y+(rowY(move.row)-move.y)*ease;
      this.height=animation==='Leaping'?250*4*t*(1-t):0;
      if(!this.height)this.crush();
      if(this.movement!==move)return;
      if(t===1){this.zombie.row=move.row;this.movement=null;
        if(this.backing){this.backing=false;this.rushing=true;this.rushDamage=0;this.movement={x:this.zombie.x,y:this.y,toX:cellX(0),row:this.zombie.row,duration:1.7,elapsed:0};this.play('WalkL');}
        else if(this.rushing)this.jump(7,this.randomRow(),'idle');
        else this.play(animation==='Leaping'?'LeapEnd':'Idle');
      }
      return;
    }
    if(animation==='Idle'){this.idle-=dt;if(this.idle<=0)this.chooseAction();return;}
    if(animation==='StunStart')this.stunLeft-=dt;
    if(animation==='Stunning'){this.stunLeft-=dt;if(this.stunLeft<=0)this.play('StunEnd');return;}
    if(animation==='Summonning'||animation==='SummonStart'){
      if(this.summonAt>0&&this.game.time>=this.summonAt&&this.summon.length){const kind=this.summon.shift()!,row=this.zombie.row-(this.game.random()<.5?1:0),z=this.game.spawnZombie(kind,row,this.zombie.x-82,'ground');
        if(!this.foodSent&&this.game.random()<.3){z.food=true;this.foodSent=true;}this.summonAt=this.game.time+.75;
        if(!this.summon.length){this.summonAt=0;this.play('SummonEnd');return;}
      }
    }
    const timeline=this.game.props.plantAnimations.boss[animation];
    while(this.eventIndex<timeline.events.length&&this.elapsed>=timeline.events[this.eventIndex].at){const event=timeline.events[this.eventIndex++];this.event(event.name);if(this.animation!==animation)return;}
    if(this.elapsed>=timeline.duration){
      if(animation==='SummonStart')this.play('Summonning');
      else if(animation==='Summonning')this.play('Summonning');
      else if(animation==='StunStart')this.play('Stunning');
      else if(animation==='LeapEnd'&&this.afterJump==='summon')this.play('SummonStart');
      else if(animation==='LeapEnd'&&this.afterJump==='death'){
        for(const z of this.game.zombies)if(z!==this.zombie){z.hp=0;z.deathCause='potato';}this.play('DeathStart');
      }else if(animation==='DeathStart')this.play('DeathIdle');
      else if(animation==='DeathIdle'){this.play('Escape');}
      else if(animation==='Escape'){this.defeated=true;}
      else if(animation==='Stomp'){this.backing=true;this.movement={x:this.zombie.x,y:this.y,toX:this.zombie.x+82,row:this.zombie.row,duration:7/6,elapsed:0};this.play('WalkR');}
      else {this.idle=this.current.MinIdleTime+this.game.random()*(this.current.MaxIdleTime-this.current.MinIdleTime);this.play('Idle');}
    }
  }
}
