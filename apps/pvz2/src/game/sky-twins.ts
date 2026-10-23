import {BOARD,cellX} from './level';
import type {Game,Zombie,DeathCause} from './model';
export interface TwinState {partner:number;paralyzed:boolean;at:number;cut:number;crash?:{at:number;x:number}}
export class SkyTwins {
 constructor(private g:Game){}
 spawn(z:Zombie){if(z.kind!=='sky_twin')return;z.row=Math.max(1,z.row);const partner=this.g.spawnZombie('sky_twin_upper',z.row-1,z.x);z.twin={partner:partner.id,paralyzed:false,at:0,cut:0};partner.twin={partner:z.id,paralyzed:false,at:0,cut:0};}
 damage(z:Zombie,amount:number,cause:DeathCause){
  if(!z.twin)return false;const partner=this.g.zombies.find(q=>q.id===z.twin!.partner)!,target=z.twin.paralyzed?partner:z;
  target.hp-=amount*(z.twin.paralyzed?.5:1);
  if(target.hp<=0){target.twin!.paralyzed=true;target.twin!.at=this.g.time;const other=target===z?partner:z;
   if(other.twin!.paralyzed){z.hp=0;partner.hp=0;z.deathCause=cause;partner.deathCause=cause;}
   else {target.hp=1;this.g.beach.sounds.push((target.kind==='sky_twin'?'skyTwinLower':'skyTwinUpper')+'/ParalyzeSounds');}
  }return true;
 }
 animation(z:Zombie){return z.twin?(z.twin.paralyzed?(this.g.time-z.twin.at<7/6?'ParalyzedStart':'ParalyzedLoop'):'Idle'):null;}
 zombie(z:Zombie,dt:number){
  if(!z.twin)return false;const g=this.g,s=z.twin,partner=g.zombies.find(q=>q.id===s.partner)!;
  if(partner.hp<=0){z.hp=0;return true;}
  if(z.kind==='sky_twin_upper')return true;
  const frozen=Math.max(z.frozenUntil,partner.frozenUntil,z.stunnedUntil??0,partner.stunnedUntil??0,z.butteredUntil??0,partner.butteredUntil??0)>g.time;
  if(frozen)return true;
  dt*=g.time<Math.max(z.chilledUntil,partner.chilledUntil)?.5:1;
  if(s.crash){const elapsed=g.time-s.crash.at;z.x=s.crash.x+(elapsed<.4?elapsed/.4:1-1.5*(elapsed-.4)/.4)*BOARD.cellWidth*.6;partner.x=z.x;if(elapsed>=.8){g.sky.damageShip(2000);z.hp=0;partner.hp=0;g.beach.sounds.push('skyTwinLower/CrashSounds');}return true;}
  if(!z.reversed&&z.x-80*.6<=g.sky.edge){s.crash={at:g.time,x:z.x};g.beach.sounds.push('skyTwinLower/PreCrashSounds');return true;}
  for(const member of [z,partner]){
   member.twin!.cut=Math.max(0,member.twin!.cut-dt);
   for(const p of g.plants)if(p.hp>0&&p.kind!=='bulbkekengi'&&!p.hidden&&p.row===member.row&&Math.abs(cellX(p.column)-member.x)<45){if(!member.twin!.paralyzed){const damage=g.props.zombies[member.kind].EatDPS*dt,armor=Math.min(p.armor,damage);p.armor-=armor;p.hp-=damage-armor;}member.twin!.cut=.5;}
  }
  const speed=g.props.zombies[z.kind].WalkSPS*(s.paralyzed||partner.twin!.paralyzed?.67:1)*(1-2*Math.max(s.cut,partner.twin!.cut));
  z.x+=(z.reversed?1:-1)*speed*BOARD.cellWidth*dt;partner.x=z.x;partner.row=z.row-1;partner.reversed=z.reversed;
  return true;
 }
}
