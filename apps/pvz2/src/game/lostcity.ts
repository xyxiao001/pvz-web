import type {Game,Zombie} from './model';
import type {ZombieKind} from './level';
export const lostcityArmor=(kind:ZombieKind)=>kind==='lostcity_armor1'||kind==='lostcity_armor2'?kind:null;
export class LostCityBattle {
 constructor(private g:Game){}
 spawn(z:Zombie){if(z.kind==='lostcity_lostpilot')z.pilot={animation:z.entry==='parachute'?'Arrive':'Walk',at:this.g.time,event:0,hanging:z.entry==='parachute',left:this.g.props.zombies[z.kind].HangingNoEatTimeUntilDrop,fallTime:0};}
 tick(z:Zombie,dt:number){
  const s=z.pilot;if(!s)return false;const g=this.g;
  const play=(name:string)=>{s.animation=name;s.at=g.time;s.event=0;};
  if(s.animation==='Walk')return false;
  if(s.animation==='Idle_Hang'||s.animation==='Eat_Hang'){
   if(!z.eating)s.left-=dt;if(s.left<=0){s.hanging=false;play('Land');return true;}s.animation=z.eating?'Eat_Hang':'Idle_Hang';return false;
  }
  const timeline=g.props.plantAnimations.lostPilot[s.animation];
  while(s.event<timeline.events.length&&g.time-s.at>=timeline.events[s.event].at){const e=timeline.events[s.event++].name;if(['arrive','drop','break'].includes(e))g.beach.sounds.push('lostPilot/'+e+'Sounds');}
  if(g.time-s.at>=Math.max(s.animation==='Arrive'?s.fallTime:0,timeline.duration))play(s.hanging?'Idle_Hang':'Walk');
  return true;
 }
}
