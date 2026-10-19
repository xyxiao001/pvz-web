import {EgyptBoss} from './egypt-boss';
import {cellX,rowY,type BossAction} from './level';
import type {Game} from './model';
import ice from '../../public/assets/iceage/ice.json';

/** Ice shields, columns and winds use the pinned mech's animation events. */
export class IceageBoss extends EgyptBoss {
  shield:number;
  shieldAt=0;
  icebergs:{id:number;row:number;column:number;age:number}[]=[];
  private cursor=0;
  private restLeft=0;
  private stunLeftIce=0;
  private action:BossAction|null=null;
  private repeatsLeft=0;
  constructor(game:Game){super(game);this.zombie.row=2;this.y=rowY(2);this.shield=game.props.zombies.zombossmech_iceage.GlacierToughness;}
  override covers(row:number){return Math.abs(row-this.zombie.row)<=1;}
  override get rate(){return ['Spawn','DeathStart','DeathIdle','Escape','StunStart','Stunning','StunEnd'].includes(this.animation)?1:this.current.AnimRateModifier*(this.game.time<this.zombie.chilledUntil?.5:1);}
  private change(name:string){this.animation=name;this.elapsed=0;this.cursor=0;this.animationSerial++;}
  private rest(){this.restLeft=this.current.MinIdleTime+this.game.random()*(this.current.MaxIdleTime-this.current.MinIdleTime);this.change('Idle');}
  private stop(seconds:number){this.shield=0;this.targets=[];this.stunLeftIce=seconds;this.change('StunStart');}
  override hit(amount:number){
    if(this.zombie.hp<=0||this.animation==='Spawn')return;
    if(this.shield>0){this.shield-=amount;if(this.shield<=0)this.stop(6);return;}
    const floor=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0);
    this.zombie.hp-=amount*(this.stunLeftIce>0?this.current.StunDamageScale:1);
    if(this.zombie.hp>floor)return;
    this.zombie.hp=floor;
    if(this.stage===this.stages.length-1){
      this.targets=[];this.icebergs=[];this.game.iceage.blocks=[];
      for(const z of [...this.game.zombies,...this.game.westFinale.allies])if(z!==this.zombie){z.hp=0;z.deathCause='potato';}
      this.change('DeathStart');
    }else {this.stage++;this.action=null;this.repeatsLeft=0;this.stop(this.current.StunTime);}
  }
  private column(row:number){return [5,4,3,2,1].find(column=>!this.game.iceage.blocks.some(b=>b.hp>0&&b.row===row&&b.column===column));}
  block(row:number,column:number){
    const g=this.game,plants=g.plants.filter(p=>p.hp>0&&p.row===row&&p.column===column);
    for(const p of plants)if(p.action!=='food')p.hp=0;
    if(plants.some(p=>p.hp>0))return;
    const old=g.iceage.blocks.find(b=>b.hp>0&&b.row===row&&b.column===column);
    if(old){old.hp=ice.zomboss_iceage_glacier_block.Toughness;return;}
    const list=g.props.zombies.zombossmech_iceage.GlacierBlockZombieList;
    g.iceage.blocks.push({id:g.nextEntityId(),row,column,hp:ice.zomboss_iceage_glacier_block.Toughness,glacier:true,release:list[Math.floor(column/8*list.length)]});
  }
  private choose(){
    const column=[5,4,3,2,1].find(c=>[0,1,2,3,4].some(row=>!this.game.iceage.blocks.some(b=>b.hp>0&&b.row===row&&b.column===c)));
    const choices=this.current.Actions.filter(a=>a.weight>0&&(this.repeatsLeft>0?a===this.action:a!==this.action)&&(a.actionName!=='summon'||column!==undefined));
    // Native summon does nothing when every usable cell already contains ice.
    if(!choices.length){this.repeatsLeft=0;this.rest();return;}
    let roll=this.game.random()*choices.reduce((n,a)=>n+a.weight,0);const action=choices.find(a=>(roll-=a.weight)<0)!;
    if(!this.repeatsLeft){this.action=action;this.repeatsLeft=action.repeatMin+Math.floor(this.game.random()*(action.repeatMax-action.repeatMin+1));}this.repeatsLeft--;
    if(action.actionName==='summon')this.change('Summon'+column);
    else if(action.actionName==='rush')this.change(['Wind01','Wind12','Wind23','Wind34'][Math.floor(this.game.random()*4)]);
    else {this.aim();this.change('Shoot');}
  }
  private cue(name:string){
    const g=this.game;
    if(name==='Idle')this.rest();
    if(name.startsWith('block'))this.block(Number(name[5]),Number(name[6]));
    if(/^wind\d\d$/.test(name))g.iceage.wind([{row:Number(name[4]),left:false},{row:Number(name[5]),left:false}]);
    if(name==='glacierM'){
      this.shield=g.props.zombies.zombossmech_iceage.GlacierToughness;this.shieldAt=g.time;
      for(let row=0;row<5;row++){const column=this.column(row);if(column!==undefined)this.block(row,column);}
    }
    if(name==='shoot'){for(const t of this.targets)this.icebergs.push({...t,id:g.nextEntityId(),age:0});this.targets=[];}
  }
  override tick(dt:number){
    const g=this.game,prop=g.props.projectiles.zomboss_missile_iceage;
    for(const m of this.icebergs){m.age+=dt;if(m.age-dt<1.5&&m.age>=1.5){
      for(const p of g.plants)if(p.hp>0&&Math.abs(p.column-m.column)<=1&&Math.abs(p.row-m.row)<=1&&p.action!=='food'){
        if(p.row===m.row)p.hp-=p.column===m.column?prop.Damage:prop.SplashDamage[0].Damage!;
        g.iceageCombat.cold(p.row,p.column,3);
      }
      g.beach.sounds.push('iceberg/PopSound');
    }}
    this.icebergs=this.icebergs.filter(m=>m.age<1.5+g.props.plantAnimations.icebergHit.Play.duration);
    if(this.defeated)return;
    const animation=this.animation;this.elapsed+=dt*this.rate;
    if(animation==='Idle'){this.restLeft-=dt;if(this.restLeft<=0)this.choose();return;}
    if(animation==='StunStart')this.stunLeftIce-=dt;
    if(animation==='Stunning'){this.stunLeftIce-=dt;if(this.stunLeftIce<=0)this.change('StunEnd');return;}
    const timeline=g.props.plantAnimations.boss[animation];
    while(this.cursor<timeline.events.length&&this.elapsed>=timeline.events[this.cursor].at){this.cue(timeline.events[this.cursor++].name);if(this.animation!==animation)return;}
    if(this.elapsed>=timeline.duration){
      if(animation==='StunStart')this.change('Stunning');
      else if(animation==='DeathStart')this.change('DeathIdle');
      else if(animation==='DeathIdle')this.change('Escape');
      else if(animation==='Escape')this.defeated=true;
      else this.rest();
    }
  }
}
