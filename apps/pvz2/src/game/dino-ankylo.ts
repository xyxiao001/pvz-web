import source from '../../public/assets/dino/dinosaurs.json';
import {BOARD,cellX} from './level';
import {isFlying,swinging} from './pirate';
import type {Game,Zombie} from './model';
export interface Ankylo {id:number;row:number;x:number;born:number;charmed:boolean;animation:string;elapsed:number;event:number;left:number;leaveAt:number}
export class DinoAnkylo {
 items:Ankylo[]=[];
 slides=new Map<Zombie,{from:number;to:number;at:number}>();
 constructor(private g:Game){}
 add(row:number,id:number){const p=source.ankylo;this.items.push({id,row,x:cellX(p.IdleColumn),born:this.g.time,charmed:false,animation:'Intro',elapsed:0,event:0,left:p.ZombiesToThrow,leaveAt:this.g.time+p.MaxWonderingTime});}
 animation(d:Ankylo){return d.animation+(d.charmed?'_Charmed':'');}
 charm(d:Ankylo){d.charmed=true;d.left=source.ankylo.ZombiesToThrow;if(d.animation!=='Intro'&&d.animation!=='Outro')this.play(d,'Idle0');this.g.beach.sounds.push('ankylo/charmSounds');}
 private play(d:Ankylo,animation:string){d.animation=animation;d.elapsed=0;d.event=0;if(animation==='Kick')d.leaveAt=this.g.time+source.ankylo.MaxWonderingTime;}
 private targets(d:Ankylo){const g=this.g,x=d.x-(d.charmed?230.7087:310.2935)*.6;return [...g.zombies,...g.westFinale.allies].filter(z=>z.hp>0&&z.row===d.row&&z.x>=BOARD.left&&z.x<=cellX(8.5)&&!z.dinoCarry&&!z.leap&&!isFlying(z)&&!swinging(z,g.time)&&(z.kind==='dino_bully'||!g.props.zombies[z.kind].CannotBeKnockedBackByProjectiles)&&!g.props.zombies[z.kind].CannotBeFlickedByPowerToss&&!this.slides.has(z)&&Math.abs(z.x-x)<1.5*BOARD.cellWidth);}
 tick(dt:number){
  const g=this.g;
  for(const [z,s] of this.slides){const t=Math.min(1,(g.time-s.at)/.7);z.x=s.from+(s.to-s.from)*t;z.eating=false;z.stunnedUntil=g.time+dt;
   const plant=!g.westFinale.allies.includes(z)&&g.plants.find(p=>p.hp>0&&p.row===z.row&&!p.hidden&&!p.leap&&p.action!=='explode'&&!(p.kind==='primalpotatomine'&&p.rootGrown)&&!['spikeweed','spikerock','iceweed','perfumeshroom','grapeshot'].includes(p.kind)&&Math.abs(cellX(p.column)-z.x)<38);
   if(plant){g.future.pushPlant(plant,500);this.slides.delete(z);}else if(t===1||z.hp<=0)this.slides.delete(z);
  }
  for(const d of this.items){
   const timeline=g.props.plantAnimations.ankylo[this.animation(d)];d.elapsed+=dt;
   while(d.event<timeline.events.length&&d.elapsed>=timeline.events[d.event].at){const event=timeline.events[d.event++].name,sounds:Record<string,string>={intro:'introSaySounds',outro:'outroSaySounds',steps:'stepsSounds',shake:'shakeSounds',charge:'chargeSounds',reload:'reloadSounds',kick:'hitSounds',bounce:'bounceSounds'};g.beach.sounds.push('ankylo/'+sounds[event]);
    if(event==='kick'||event==='bounce'){const targets=this.targets(d);if(targets.length)g.beach.sounds.push('ankylo/throwSounds');for(const z of targets){d.left--;if(d.charmed){z.hp=0;z.armor=0;z.deathCause='toss';}else this.slides.set(z,{from:z.x,to:cellX(1.8+.5*g.random()),at:g.time});}}
   }
   if(d.elapsed>=timeline.duration){if(d.animation==='Outro'){d.animation='Gone';continue;}if(d.left<=0||g.time>=d.leaveAt)this.play(d,'Outro');else if(this.targets(d).length)this.play(d,'Kick');else this.play(d,'Idle'+Math.floor(g.random()*3));}
  }
  this.items=this.items.filter(d=>d.animation!=='Gone');
 }
}
