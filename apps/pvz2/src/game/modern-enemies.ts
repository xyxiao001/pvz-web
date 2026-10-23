import {BOARD,cellX,rowY,type ZombieProperties} from './level';
import type {Game,Zombie} from './model';
type Props=ZombieProperties&{BalloonToughness:number;BalloonWalkSPS:number;RunningSpeedScale:number;ExplosionDamage:number;MinTriggerColumn:number;MaxTriggerColumn:number};
interface State {kind:'modernBalloon'|'modernAllstar'|'modernSuperfan';animation:string|null;at:number;elapsed:number;event:number;running:boolean;ignited:boolean;column:number;risen:boolean}
export class ModernEnemies {
 readonly states=new Map<number,State>();
 constructor(private g:Game){}
 spawn(z:Zombie){
  const kind=z.kind==='modern_balloon'?'modernBalloon':z.kind==='modern_allstar'?'modernAllstar':z.kind==='modern_superfanimp'?'modernSuperfan':null;if(!kind)return;
  const p=this.g.props.zombies[z.kind] as Props;
  this.states.set(z.id,{kind,animation:null,at:0,elapsed:0,event:0,running:kind==='modernAllstar',ignited:true,column:kind==='modernSuperfan'?p.MinTriggerColumn+Math.floor(this.g.random()*(p.MaxTriggerColumn-p.MinTriggerColumn+1)):0,risen:false});
  if(kind==='modernBalloon')z.balloon=p.BalloonToughness;
 }
 private play(s:State,animation:string){s.animation=animation;s.at=this.g.time;s.elapsed=0;s.event=0;}
 damage(z:Zombie,amount:number){if(!z.balloon)return amount;const hit=Math.min(z.balloon,amount);z.balloon-=hit;if(!z.balloon){this.play(this.states.get(z.id)!,'Land');this.g.beach.sounds.push('modernBalloon/explodeSound');}return amount-hit;}
 cold(z:Zombie){const s=this.states.get(z.id);if(s?.kind==='modernSuperfan')s.ignited=false;}
 private kick(z:Zombie){
  const g=this.g;let kicked=false;
  for(const imp of g.zombies)if(imp.hp>0&&imp.kind==='modern_superfanimp'&&!imp.leap&&imp.row===z.row&&!!imp.reversed===!!z.reversed&&Math.abs(imp.x-z.x)<65){
   const s=this.states.get(imp.id)!,column=imp.reversed?8-s.column:s.column;
   imp.leap={fromX:imp.x,fromY:rowY(imp.row),toX:cellX(column),toRow:imp.row,at:g.time,duration:2};this.play(s,'Fly_Kicked');g.beach.sounds.push('modernSuperfan/hurraySound');kicked=true;
  }
  if(kicked)g.beach.sounds.push('modernAllstar/kickSound');return kicked;
 }
 landed(z:Zombie){const s=this.states.get(z.id);if(s?.kind==='modernSuperfan')this.play(s,'Land_Kicked');}
 tick(z:Zombie,dt:number){
  const s=this.states.get(z.id);if(!s)return false;const g=this.g,p=g.props.zombies[z.kind] as Props;
  if(s.animation){
   const timeline=g.props.plantAnimations[s.kind][s.animation];s.elapsed+=dt;z.eating=false;
   while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const event=timeline.events[s.event++].name;
    if(event==='Kick')this.kick(z);
    if(event==='Punch'){const plant=g.plants.filter(p=>p.hp>0&&p.row===z.row&&Math.abs(cellX(p.column)-z.x)<65).sort((a,b)=>b.column-a.column)[0];if(plant){const hit=Math.min(plant.armor,p.SmashDamage);plant.armor-=hit;plant.hp-=p.SmashDamage-hit;}g.beach.sounds.push('modernAllstar/punchSound');}
    if(event==='explode'&&s.ignited){const plant=g.plants.filter(p=>p.hp>0&&p.row===z.row&&Math.abs(cellX(p.column)-z.x)<BOARD.cellWidth/2).sort((a,b)=>Number(b.kind==='bamboobusket')-Number(a.kind==='bamboobusket'))[0];if(plant&&!z.reversed){const hit=Math.min(plant.armor,p.ExplosionDamage);plant.armor-=hit;plant.hp-=p.ExplosionDamage-hit;}for(const other of g.zombies)if(other.hp>0&&other.row===z.row&&!!other.reversed!==!!z.reversed&&Math.abs(other.x-z.x)<BOARD.cellWidth/2)g.damage(other,p.ExplosionDamage,'potato');z.hp=0;z.deathCause='potato';g.effects.push({id:g.nextEntityId(),kind:'explode',x:z.x,y:rowY(z.row),age:0});}
    const sounds:Record<string,string>={explodeSound:'explodeSound',ground_hit:'groundHitSound',ro:'rotateSound',ro_end:'rotateEndSound',bounce:'bounceSound',steady:'steadySound'};if(event in sounds)g.beach.sounds.push(`${s.kind}/${sounds[event]}`);
    if(event==='judgeExplode'){if(s.ignited)this.play(s,'Explode');else s.animation=null;return true;}
   }
   if(s.elapsed>=timeline.duration){if(s.animation==='Prepare'&&s.ignited)this.play(s,'Explode');else s.animation=null;}return true;
  }
  if(s.kind==='modernAllstar'){
   if(s.running)this.kick(z);
   else if(g.zombies.some(q=>q.kind==='modern_superfanimp'&&q.hp>0&&!q.leap&&q.row===z.row&&!!q.reversed===!!z.reversed&&Math.abs(q.x-z.x)<65)){this.play(s,'Kick');g.beach.sounds.push('modernAllstar/whistleSounds');return true;}
   if(s.running&&g.plants.some(p=>p.hp>0&&p.row===z.row&&Math.abs(cellX(p.column)-z.x)<40)){s.running=false;this.play(s,'Punch');return true;}
  }
  if(s.kind==='modernSuperfan'&&s.ignited&&(z.reversed?z.x>=cellX(8-s.column):z.x<=cellX(s.column))){this.play(s,'Prepare');return true;}
  if(s.kind==='modernBalloon'&&z.balloon){const risen=g.plants.some(p=>p.hp>0&&p.row===z.row&&p.kind!=='tallnut'&&Math.abs(cellX(p.column)-z.x)<55);if(risen!==s.risen){s.risen=risen;this.play(s,risen?'Rise':'Unrise');return true;}}
  return false;
 }
 animation(z:Zombie){const s=this.states.get(z.id);return s?s.animation??(s.kind==='modernAllstar'&&s.running?'Run':s.kind==='modernBalloon'&&z.balloon?(z.eating?'Eat_Fly':s.risen?'Walk_Fly_High':'Walk_Fly'):null):null;}
 speed(z:Zombie){const s=this.states.get(z.id),p=this.g.props.zombies[z.kind] as Props;return s?.running?p.RunningSpeedScale:z.balloon?p.BalloonWalkSPS/p.WalkSPS:1;}
}
