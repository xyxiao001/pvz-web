import {BOARD,cellX,rowY,type ZombieKind} from './level';
import type {Game,Plant,Zombie} from './model';
import ice from '../../public/assets/iceage/ice.json';
import {isFlying} from './pirate';
export const iceageArmor=(kind:ZombieKind)=>kind==='iceage_armor4'?'iceage_armor4':kind==='iceage_armor3'?'iceage_armor3':kind==='iceage_armor1'?'iceage_armor1':kind==='iceage_armor2'?'iceage_armor2':null;
export class IceageBattle {
  blocks:{id:number;row:number;column:number;hp:number;glacier?:boolean;release?:(ZombieKind|'')[];zombie?:Zombie;meltAt?:number}[]=[];
  cold=new Map<string,number>();
  winds:{id:number;row:number;left:boolean;at:number;step:number}[]=[];
  slides=new Map<number,{from:number;to:number;at:number;column:number}>();
  passed=new Map<number,Set<number>>();
  modernSliders=new Map<number,{animation:string;at:number;event:number}>();
  effects:{id:number;name:string;animation:string;row:number;column:number;at:number}[]=[];
  constructor(private g:Game){}
  init(){for(const p of this.g.level.frozenPlants)this.freeze(p.row,p.column);for(const z of this.g.level.frozenZombies){const zombie=this.g.spawnZombie(z.kind,z.row,cellX(z.column));this.freeze(z.row,z.column,zombie);}}
  freeze(row:number,column:number,zombie?:Zombie){const g=this.g;this.blocks.push({id:g.nextEntityId(),row,column,hp:ice[zombie?'zombietarget_iceblock':'planttarget_iceblock'].Toughness,zombie});}
  blocked(p:Plant){return this.blocks.some(b=>b.hp>0&&b.row===p.row&&b.column===p.column);}
  canPlant(kind:string,row:number,column:number){const block=this.blocks.some(b=>b.hp>0&&b.row===row&&b.column===column);return kind==='hotpotato'?block:!block&&!this.g.level.sliders.some(s=>s.row===row&&s.column===column);}
  wind(winds:{row:number;left:boolean}[]){winds.forEach((w,i)=>this.winds.push({...w,id:this.g.nextEntityId(),at:this.g.time+i*.5,step:0}));}
  hot(p:Plant){p.animation='Attack';p.action='explode';p.actionAt=this.g.time;p.eventIndex=0;this.g.beach.sounds.push('hotpotato/attack');}
  tickHot(p:Plant){const g=this.g,timeline=g.props.plantAnimations.hotpotato.Attack;while(p.eventIndex!<timeline.events.length&&g.time-p.actionAt>=timeline.events[p.eventIndex!].at){const e=timeline.events[p.eventIndex!++].name;if(e==='melt'){for(const b of this.blocks)if(b.row===p.row&&b.column===p.column)b.meltAt=g.time+2.5;this.effects.push({id:g.nextEntityId(),name:'hotVapour',animation:'Play',row:p.row,column:p.column,at:g.time});}if(e==='die')p.hp=0;}}
  hit(row:number,from:number,to:number,damage:number){const b=this.blocks.filter(b=>b.hp>0&&b.row===row&&cellX(b.column)>=from-25&&cellX(b.column)<=to+25).sort((a,b)=>a.column-b.column)[0];if(!b)return false;b.hp-=damage;return true;}
  tickZombie(z:Zombie){const g=this.g;if(this.blocks.some(b=>b.hp>0&&b.zombie===z))return true;
    const slide=this.slides.get(z.id);if(slide){if(g.time-slide.at<.75)return true;z.row=slide.to;this.slides.delete(z.id);}
    if(g.props.zombies[z.kind].CannotBePushedBySliders||isFlying(z)||z.leap)return false;
    for(const [i,s] of g.level.sliders.entries())if(z.row===s.row&&Math.abs(z.x-cellX(s.column))<25&&!this.passed.get(z.id)?.has(i)){
      const to=z.row+(s.up?-1:1);if(to<0||to>=5)continue;const passed=this.passed.get(z.id)??new Set<number>();passed.add(i);this.passed.set(z.id,passed);this.slides.set(z.id,{from:z.row,to,at:g.time,column:s.column});return true;
    }
    return false;
  }
  canPush(b:IceageBattle['blocks'][number],direction:number):boolean {
    const column=b.column+direction,g=this.g;
    if(column<0||direction>0&&column>8)return false;
    const next=this.blocks.find(n=>n.hp>0&&n.row===b.row&&n.column===column);
    if(next)return this.canPush(next,direction);
    return !g.level.sliders.some(t=>t.row===b.row&&t.column===column)&&!g.plants.some(p=>p.hp>0&&p.row===b.row&&(p.column===column&&p.action==='food'||p.column===b.column&&g.props.plants[p.kind].CannotBePushedByFootballMech))&&![...g.future.holonuts.values()].some(s=>s.shield>0&&s.column===column);
  }
  push(b:IceageBattle['blocks'][number],direction:number){
    const column=b.column+direction,g=this.g,next=this.blocks.find(n=>n.hp>0&&n.row===b.row&&n.column===column);
    if(next)this.push(next,direction);
    for(const p of g.plants)if(p.hp>0&&p.row===b.row){if(p.column===column)p.hp=0;else if(p.column===b.column)p.column=column;}
    b.column=column;if(b.zombie)b.zombie.x=cellX(column);
  }
  tick(dt:number){const g=this.g;
    if(g.level.world==='modern')for(const [i,t] of g.level.sliders.entries()){const active=[...this.slides.values()].some(s=>s.column===t.column&&s.from===t.row),name=t.up?'modernSliderUp':'modernSliderDown',state=this.modernSliders.get(i)??{animation:'Idle',at:g.time,event:0};this.modernSliders.set(i,state);const change=(animation:string)=>{state.animation=animation;state.at=g.time;state.event=0;};
      if(state.animation==='Idle'&&active)change('ActiveStart');else if(state.animation==='ActiveLoop'&&!active)change('ActiveEnd');
      const timeline=g.props.plantAnimations[name][state.animation];while(state.event<timeline.events.length&&g.time-state.at>=timeline.events[state.event].at){g.beach.sounds.push(name+'/'+timeline.events[state.event++].name);}
      if(state.animation==='ActiveStart'&&g.time-state.at>=timeline.duration)change(active?'ActiveLoop':'ActiveEnd');else if(state.animation==='ActiveEnd'&&g.time-state.at>=timeline.duration)change(active?'ActiveStart':'Idle');
    }
    for(const w of this.winds){while(w.step<9&&g.time>=w.at+.15*(w.step+2)){const col=w.left?w.step:8-w.step;w.step++;const plants=g.plants.filter(p=>p.hp>0&&p.row===w.row&&p.column===col);if(!plants.length||plants.some(p=>g.props.plants[p.kind].ImmuneToIceblock))continue;const block=this.blocks.find(b=>b.row===w.row&&b.column===col&&b.hp>0);if(block){block.hp=Math.min(600,block.hp+300);continue;}const key=w.row+':'+col,cold=(this.cold.get(key)??0)+2;if(cold>2){this.freeze(w.row,col);this.cold.delete(key);}else this.cold.set(key,cold);}}
    this.winds=this.winds.filter(w=>g.time-w.at<3);
    for(const b of this.blocks)if(b.meltAt!==undefined&&g.time>=b.meltAt)b.hp=0;
    for(const b of this.blocks)if(b.hp<=0){this.effects.push({id:g.nextEntityId(),name:'iceBreak',animation:'Play4',row:b.row,column:b.column,at:g.time});if(b.release?.length&&g.boss!.zombie.hp>0){const kind=b.release[Math.floor(g.random()*b.release.length)];if(kind)g.spawnZombie(kind,b.row,cellX(b.column),'ground');}}
    this.blocks=this.blocks.filter(b=>b.hp>0);
    this.effects=this.effects.filter(e=>g.time-e.at<g.props.plantAnimations[e.name][e.animation].duration);
    for(const p of g.plants)if(this.blocked(p)&&p.kind!=='hotpotato'){p.actionAt+=dt;p.nextAction+=dt;p.nextBurst+=dt;}
  }
  y(z:Zombie){const s=this.slides.get(z.id);if(!s)return rowY(z.row);const t=Math.min(1,(this.g.time-s.at)/.75),e=t<.5?2*t*t:1-(-2*t+2)**2/2;return rowY(s.from)+(rowY(s.to)-rowY(s.from))*e;}
}
