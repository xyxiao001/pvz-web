import source from '../../public/assets/dino/dinosaurs.json';
import {BOARD,cellX} from './level';
import type {Game,Zombie} from './model';
export interface Tyranno {id:number;row:number;x:number;born:number;charmed:boolean;animation:string;elapsed:number;event:number;idle:number;roars:number;bites:number;leaveAt:number}
export class DinoTyranno {
 items:Tyranno[]=[];
 constructor(private g:Game){}
 add(row:number,id:number){const p=source.tyranno;this.items.push({id,row,x:cellX(p.IdleColumn),born:this.g.time,charmed:false,animation:'Intro',elapsed:0,event:0,idle:2,roars:p.MaxRoaringTime,bites:p.MaxBitingTime,leaveAt:this.g.time+p.MaxWonderingTime});}
 charm(d:Tyranno){d.charmed=true;}
 private play(d:Tyranno,animation:string){d.animation=animation;d.elapsed=0;d.event=0;if(animation==='Bite'||animation==='Roar'){d.idle=2;d.leaveAt=this.g.time+source.tyranno.MaxWonderingTime;}}
 private targets(d:Tyranno){return [...this.g.zombies,...this.g.westFinale.allies].filter(z=>z!==this.g.boss?.zombie&&z.hp>0&&z.row===d.row&&!z.dinoCarry&&z.x>=BOARD.left&&z.x<=cellX(8.5));}
 private biteTarget(d:Tyranno){return this.targets(d).filter(z=>!this.g.props.zombies[z.kind].CannotBeChompedByTyranno&&Math.abs(z.x-d.x)<=BOARD.cellWidth+20).sort((a,b)=>a.x-b.x)[0];}
 private cancelFear(z:Zombie){const g=this.g;if(g.time<z.chilledUntil||g.time<z.frozenUntil||g.time<(z.perfumeUntil??0)||g.time<(z.sappedUntil??0))z.scaredByTyranno=false;}
 tick(dt:number){
  const g=this.g;
  for(const z of [...g.zombies,...g.westFinale.allies])if(z.scaredByTyranno)this.cancelFear(z);
  for(const d of this.items){
   if(d.charmed&&d.animation.startsWith('Idle')){if(d.bites<=0)this.play(d,'Outro');else if(this.biteTarget(d))this.play(d,'Bite');}
   const timeline=g.props.plantAnimations.tyranno[d.animation];d.elapsed+=dt;
   while(d.event<timeline.events.length&&d.elapsed>=timeline.events[d.event].at){
    const event=timeline.events[d.event++].name;
    const sounds:Record<string,string[]>={intro:['brakeSounds','introSaySounds'],outro:['outroSaySounds'],lie:['lieSounds'],open:['eatSaySounds'],jump:['jumpSounds'],roar:['roarSounds'],bite:['biteSaySounds','swallowSounds','biteSounds'],idle2:['idle2Sounds']};
    for(const sound of sounds[event])g.beach.sounds.push('tyranno/'+sound);
    if(event==='roar'&&!d.charmed){d.roars--;for(const z of this.targets(d)){z.scaredByTyranno=true;z.reversed=false;this.cancelFear(z);}}
    if(event==='bite'){const z=this.biteTarget(d);if(z){z.hp=0;z.armor=0;z.deathCause='swallow';d.bites--;}}
   }
   if(d.elapsed>=timeline.duration){
    if(d.animation==='Outro'){d.animation='Gone';continue;}
    if(d.animation.startsWith('Idle'))d.idle--;
    if(d.idle<=0&&(g.time>=d.leaveAt||(d.charmed?d.bites<=0:d.roars<=0)))this.play(d,'Outro');
    else if(d.idle<=0&&!d.charmed&&this.targets(d).length)this.play(d,'Roar');
    else this.play(d,'Idle0');
   }
  }
  this.items=this.items.filter(d=>d.animation!=='Gone');
 }
}
