import source from '../../public/assets/dino/dinosaurs.json';
import {BOARD,cellX,rowY} from './level';
import {isFlying,swinging} from './pirate';
import type {Game,Zombie} from './model';
export interface DinoVisitor {id:number;kind:'stego'|'ptero';direction:number;row:number;x:number;animation:string;elapsed:number;event:number;charmed:boolean;born:number;leaveAt:number;left:number;tail:boolean;flying:boolean;leaving:boolean;held:Zombie[]}
/** Sword-tail throws and pterosaur transport use the original animation events. */
export class DinoVisitors {
 items:DinoVisitor[]=[];
 constructor(private g:Game){}
 add(kind:DinoVisitor['kind'],row:number,id:number){const p=source[kind];this.items.push({id,kind,direction:1,row,x:cellX(p.IdleColumn),animation:'Intro',elapsed:0,event:0,charmed:false,born:this.g.time,leaveAt:this.g.time+p.MaxWonderingTime,left:kind==='stego'?source.stego.MaxThrowingTime:source.ptero.FlyingTimes,tail:false,flying:false,leaving:false,held:[]});}
 animation(d:DinoVisitor){return d.animation+(d.charmed&&!d.animation.endsWith('_Tail')?'_Charmed':'');}
 private play(d:DinoVisitor,animation:string){d.animation=animation;d.elapsed=0;d.event=0;}
 charm(d:DinoVisitor){d.charmed=true;d.left=d.kind==='stego'?source.stego.MaxThrowingTime:source.ptero.FlyingTimes;if(d.kind==='stego')d.held=[];this.g.beach.sounds.push(d.kind+'/charmSounds');}
 private targets(d:DinoVisitor){const g=this.g;return [...g.zombies,...g.westFinale.allies].filter(z=>z!==g.boss?.zombie&&z.hp>0&&z.row===d.row&&!z.dinoCarry&&!z.leap&&!isFlying(z)&&!swinging(z,g.time)&&(z.kind==='dino_bully'||!g.props.zombies[z.kind].CannotBeKnockedBackByProjectiles)&&!g.props.zombies[z.kind].CannotBeFlickedByPowerToss&&!d.held.includes(z));}
 tick(dt:number){
  const g=this.g;
  for(const d of this.items){
   d.held=d.held.filter(z=>z.hp>0);
   if(d.kind==='stego')this.stego(d,dt);else this.ptero(d,dt);
   if(d.animation==='Gone')continue;
   const timeline=g.props.plantAnimations[d.kind][this.animation(d)];d.elapsed+=dt;
   while(d.event<timeline.events.length&&d.elapsed>=timeline.events[d.event].at){const event=timeline.events[d.event++].name;this.event(d,event);}
   if(d.elapsed>=timeline.duration)this.complete(d);
  }
  this.items=this.items.filter(d=>d.animation!=='Gone');
 }
 private stego(d:DinoVisitor,dt:number){
  const g=this.g,p=source.stego;
  if(d.animation.startsWith('Idle')||d.animation==='Throw_Tail'&&d.elapsed<1.1333333333333333||d.animation==='Smash_Tail'&&d.elapsed<.9333333333333333){
   const targets=this.targets(d).filter(z=>d.tail?Math.abs(z.x-d.x)<BOARD.cellWidth/2+20:z.x>d.x-20&&z.x<cellX(8.5));
   if(!d.tail&&targets.length)this.play(d,'Annoy');
   else if(d.tail)for(const z of targets)if(d.held.length<p.MaxZombiesToSitOnce)d.held.push(z);
  }
  for(const z of d.held){z.stunnedUntil=g.time+.1;z.x+=(d.x-z.x)*dt*3;z.eating=false;}
 }
 private ptero(d:DinoVisitor,dt:number){
  const g=this.g,p=source.ptero;
  if(!d.flying)return;
  const canGrab=d.charmed||d.x>cellX(p.DropColumn);
  if(canGrab&&d.held.length<p.MaxCarryZombies){const z=this.targets(d).find(z=>(d.charmed||!z.reversed)&&g.time>=z.frozenUntil&&Math.abs(z.x-(d.x+30*.6*d.direction))<35);
   if(z){d.held.push(z);z.reversed=d.direction>0;z.dinoCarry=90;z.eating=false;this.play(d,'Rise');g.beach.sounds.push('ptero/grabSounds');}}
  if(!canGrab&&d.held.length){for(const z of d.held){delete z.dinoCarry;z.landUntil=g.time+.3;}d.held=[];this.play(d,'Fly');g.beach.sounds.push('ptero/dropSounds');}
  d.x-=p.FlySPS*BOARD.cellWidth*dt*d.direction;
  for(const z of d.held){z.x=d.x;z.dinoCarry=d.charmed?90+d.elapsed*100:90;}
  if(d.x<cellX(-10)||d.x>cellX(18)){
   for(const z of d.held){delete z.dinoCarry;z.hp=0;z.deathCause='toss';}d.held=[];d.flying=false;
   if(d.left>0){d.x=cellX(p.IdleColumn);this.play(d,'Intro');}else this.play(d,'Gone');
  }
 }
 private event(d:DinoVisitor,event:string){
  const g=this.g;
  const sounds:Record<string,string>=d.kind==='stego'?{say:'saySounds',step:'stepSounds',rub:'rubSounds',yawn:'yawnSounds',swing:'swingSounds',smash:'smashSounds',throw:'throwSounds'}:{stab:'stabSounds',grab:'grabSounds',clean:'cleanSounds',flap:'flapSounds',yawn:'yawnSounds',look_at_floor:'lookAtFloorSounds',outro:'introSounds',enter:'introSounds'};
  if(sounds[event])g.beach.sounds.push(d.kind+'/'+sounds[event]);
  if(d.kind!=='stego'||!['throw','smash'].includes(event))return;
  const held=d.held;d.held=[];if(!held.length)return;d.left--;d.leaveAt=g.time+source.stego.MaxWonderingTime;
  if(event==='throw'&&!d.charmed)for(const z of held){const col=source.stego.ThrowColumn.Min+g.random()*(source.stego.ThrowColumn.Max-source.stego.ThrowColumn.Min);z.leap={fromX:z.x,fromY:rowY(z.row),toX:cellX(col),toRow:Math.floor(g.random()*5),at:g.time,duration:.3+.3*g.random()};}
  if(event==='smash'){
   for(const z of [...g.zombies,...g.westFinale.allies])if(z.hp>0&&!held.includes(z)&&Math.abs(z.row-d.row)<=1&&Math.abs(z.x-d.x)<2*BOARD.cellWidth)g.damage(z,source.stego.SplashDamage,'potato');
   for(const z of held)g.damage(z,source.stego.DirectDamage,'potato');
  }
 }
 private complete(d:DinoVisitor){
  const g=this.g,p=source[d.kind];
  if(d.leaving){if(d.kind==='stego'&&d.charmed&&!d.tail&&d.left>0){d.leaving=false;d.tail=true;this.play(d,'Intro_Tail');}else this.play(d,'Gone');return;}
  if(d.kind==='stego'){
   if(d.animation==='Annoy'){d.tail=true;this.play(d,'Intro_Tail');return;}
   if(d.left<=0||!d.charmed&&g.time>=d.leaveAt){d.leaving=true;this.play(d,d.tail?'Outro_Tail':'Outro');return;}
   this.play(d,d.held.length?(d.charmed?'Smash_Tail':'Throw_Tail'):d.tail?'Idle_Tail':'Idle0');
  }else{
   if(d.flying){this.play(d,d.held.length?'Rise':'Fly');return;}
   if(d.animation==='Outro'){d.flying=true;d.direction=d.charmed?-1:1;d.x=cellX(d.charmed?-10:18);this.play(d,'Fly');return;}
   if(d.left<=0||!d.charmed&&g.time>=d.leaveAt){d.leaving=true;this.play(d,'Outro');return;}
   if(d.animation!=='Intro'&&this.targets(d).some(z=>(d.charmed||!z.reversed)&&z.x>cellX(-10)&&z.x<cellX(18))){d.left--;d.leaveAt=g.time+p.MaxWonderingTime;this.play(d,'Outro');}else this.play(d,'Idle0');
  }
 }
}
