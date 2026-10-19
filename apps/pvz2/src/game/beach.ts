import {BOARD,cellX,type PlantKind,type ZombieKind} from './level';
import type {Game,Plant,Zombie} from './model';
import tags from '../../public/assets/beach/plant-tags.json';
import {BeachSurfers} from './beach-surfer';
import {BeachBowling} from './beach-bowling';
import {isFlying} from './pirate';
export const beachArmor=(kind:ZombieKind)=>kind==='beach_armor1'||kind==='beach_fem_armor1'?'beach_armor1':kind==='beach_armor2'||kind==='beach_fem_armor2'?'beach_armor2':null;
export class BeachBattle {
  readonly bowling:BeachBowling;
  readonly surfers:BeachSurfers;
  position=9;
  private from=9;private target=9;private changedAt=-Infinity;
  hands:{id:number;zombie:Zombie;at:number;hit:boolean}[]=[];
  sounds:string[]=[];
  constructor(private readonly g:Game){this.bowling=new BeachBowling(g);this.surfers=new BeachSurfers(g);}
  init(){this.position=this.g.level.tide!.start;this.target=this.position;}
  change(position:number){this.from=this.position;this.target=position;this.changedAt=this.g.time;}
  water(column:number){return this.g.level.tide!==null&&column>=Math.ceil(this.position);}
  inWater(z:Zombie){return this.water(Math.floor((z.x-BOARD.left)/BOARD.cellWidth));}
  diving(z:Zombie){return z.kind==='beach_snorkel'&&this.inWater(z)&&!z.eating&&(z.entry!=='ground'||this.g.time-z.entryAt>=1.35);}
  speed(z:Zombie){return z.kind==='beach_gargantuar'&&!this.inWater(z)?this.g.props.zombies[z.kind].SpeedScaleOnLand:1;}
  support(row:number,column:number){return this.g.plants.find(p=>p.hp>0&&p.row===row&&p.column===column&&(p.kind==='lilypad'||p.kind==='floawerPot'));}
  occupant(p:Plant){return this.g.plants.find(q=>q.hp>0&&q.id!==p.id&&q.row===p.row&&q.column===p.column);}
  canPlant(kind:PlantKind,row:number,column:number){
    if(this.g.level.bowlingLine!==null&&column>=this.g.level.bowlingLine)return false;
    if(!this.g.level.tide)return kind!=='lilypad'&&kind!=='tanglekelp';
    const support=this.support(row,column),plantTags=(tags as Record<string,string[]>)[kind];
    if(kind==='lilypad')return !support&&column>=9-this.g.level.tide.max&&!this.g.plants.some(p=>p.hp>0&&p.row===row&&p.column===column&&(tags as Record<string,string[]>)[p.kind].some(t=>['aquatic','potatomine','spikeweed'].includes(t)));
    if(plantTags.includes('aquatic'))return this.water(column)&&!support;
    if(kind==='floawerPot')return support?.kind!=='lilypad';
    if(support&&plantTags.some(t=>['potatomine','spikeweed'].includes(t)))return false;
    return !this.water(column)||!!support||plantTags.some(t=>['fly','amphibious','powertile'].includes(t));
  }
  initPlant(p:Plant){p.animation=p.kind==='lilypad'&&this.water(p.column)?'Idle_Water':'Idle';p.eventIndex=0;}
  private play(p:Plant,animation:string,action:Plant['action']){p.animation=animation;p.action=action;p.actionAt=this.g.time;p.eventIndex=0;}
  food(p:Plant){
    if(p.kind==='lilypad'){
      for(const [dr,dc] of [[-1,0],[1,0],[0,-1],[0,1]]){const r=p.row+dr,c=p.column+dc;if(r>=0&&r<5&&c>=0&&c<9&&this.canPlant('lilypad',r,c))this.g.addPlant('lilypad',r,c);}
      this.play(p,this.water(p.column)?'Idle_Water':'Idle','idle');
    }else {this.play(p,'Food','food');this.sounds.push('tanglekelp/foodStart');}
  }
  private grab(z:Zombie){z.stunnedUntil=this.g.time+2;this.hands.push({id:this.g.nextEntityId(),zombie:z,at:this.g.time,hit:false});this.sounds.push('tanglekelp/out','tanglekelp/swing');}
  tickPlant(p:Plant){
    if(p.kind==='lilypad'){p.animation=this.water(p.column)?'Idle_Water':'Idle';return;}
    const g=this.g;
    const candidates=()=>g.zombies.filter(z=>z.hp>0&&!isFlying(z)&&z.row===p.row&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth*.65&&!this.hands.some(h=>h.zombie===z));
    if(p.action==='idle'&&candidates().length)this.play(p,'Dive','shoot');
    if(p.action==='idle')return;
    const timeline=g.props.plantAnimations.tanglekelp[p.animation!];
    while(p.eventIndex!<timeline.events.length&&g.time-p.actionAt>=timeline.events[p.eventIndex!].at){const event=timeline.events[p.eventIndex!++].name;
      if(event==='dive')this.sounds.push('tanglekelp/dive');
      if(event==='kelp'){const target=candidates().sort((a,b)=>(b.hp+b.armor)-(a.hp+a.armor))[0];if(target){this.grab(target);p.hp=0;}else this.play(p,'Appear','grow');}
      if(event==='foodKelp'){
        const targets=g.zombies.filter(z=>z.hp>0&&!isFlying(z)&&this.water(Math.floor((z.x-BOARD.left)/BOARD.cellWidth))&&!this.hands.some(h=>h.zombie===z));
        for(let i=0;i<g.props.plants.tanglekelp.MaxDraggedZombieCountPlantfood&&targets.length;i++)this.grab(targets.splice(Math.floor(g.random()*targets.length),1)[0]);
        this.sounds.push('tanglekelp/foodKelp');
      }
    }
    if(g.time-p.actionAt>=timeline.duration&&p.hp>0)this.play(p,'Idle','idle');
  }
  tick(dt:number){
    this.bowling.tick(dt);this.surfers.tick();
    const g=this.g;
    if(g.level.tide){const t=Math.min(1,(g.time-this.changedAt)/3),e=t<.5?4*t*t*t:1-(-2*t+2)**3/2;this.position=this.from+(this.target-this.from)*e;
      for(const p of g.plants)if(p.hp>0&&p.action!=='food'&&p.kind!=='lilypad'&&!this.canPlant(p.kind,p.row,p.column))p.hp=0;
    }
    if(!this.hands.length)return;
    const timeline=g.props.plantAnimations.kelpHands.Play;
    for(const h of this.hands)if(!h.hit&&g.time-h.at>=timeline.events.find(e=>e.name==='kill')!.at){h.hit=true;if(h.zombie.hp>0){if(h.zombie.kind==='beach_gargantuar')g.damage(h.zombie,g.props.plants.tanglekelp.DamageWhenDragFailed);else g.damage(h.zombie,h.zombie.hp+h.zombie.armor,'water');}this.sounds.push('tanglekelp/pull','tanglekelp/hit');}
    if(this.hands.length)this.hands=this.hands.filter(h=>g.time-h.at<timeline.duration);
  }
}
