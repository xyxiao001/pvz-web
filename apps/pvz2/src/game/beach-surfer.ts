import {BOARD,cellX} from './level';
import type {Game,Grave,Zombie} from './model';

export interface SurferState {surfing:boolean;board:number;animation:string;at:number;elapsed:number;eventIndex:number;deathAnimation?:string}
export class BeachSurfers {
  effects:{id:number;name:'surfboardBreak'|'surfboardThrow'|'surfboardBreakVeteran'|'surfboardThrowVeteran';veteran:boolean;animation:string;x:number;toX:number;row:number;at:number;board:number}[]=[];
  constructor(private readonly g:Game){}
  spawn(z:Zombie){if(z.kind==='beach_surfer'||z.kind==='beach_surfer_veteran'){const surfing=z.entry==='walk'&&this.g.beach.inWater(z);z.surfer={surfing,board:this.g.props.zombies[z.kind].BoardToughness,animation:surfing?'Walk_Water':'Walk_Board',at:this.g.time,elapsed:0,eventIndex:0};}}
  private rig(z:Zombie){return z.kind==='beach_surfer_veteran'?'beachSurferVeteran':'beachSurfer';}
  emp(z:Zombie,seconds:number){if(seconds>0&&z.kind==='beach_surfer_veteran'&&z.surfer!.surfing&&z.surfer!.animation==='Walk_Water'){this.play(z,'Fall');this.g.beach.sounds.push(this.rig(z)+'/fallSlideSounds');}}
  private play(z:Zombie,animation:string){const s=z.surfer!;s.animation=animation;s.at=this.g.time;s.elapsed=0;s.eventIndex=0;}
  private idle(z:Zombie){this.play(z,z.surfer!.board>0?'Walk_Board':'Walk');}
  private effect(veteran:boolean,name:'surfboardBreak'|'surfboardThrow',animation:string,x:number,row:number,board:number,toX=x){this.effects.push({id:this.g.nextEntityId(),name:veteran?`${name}Veteran`:name,veteran,animation,x,toX,row,board,at:this.g.time});}
  blockShot(z:Zombie,damage:number,fromX:number){
    const s=z.surfer;if(!s||s.board<=0||s.surfing||fromX>z.x)return false;
    s.board=Math.max(0,s.board-damage);this.g.beach.sounds.push(this.rig(z)+'/bdHitSounds');
    if(s.board===0){this.effect(z.kind==='beach_surfer_veteran','surfboardBreak','Play4',z.x,z.row,0);this.g.beach.sounds.push(this.rig(z)+'/bdBreakSounds');if(s.animation!=='Fall'&&s.animation!=='Stab')this.idle(z);}
    return true;
  }
  private stab(z:Zombie,throwing=false){
    const g=this.g,s=z.surfer!;if(s.board<=0)return;
    // The source stabPoint is 100 pixels in front of the actor, rendered at .51.
    const x=z.x-100*.51*(z.reversed?-1:1),column=Math.floor((x-BOARD.left)/BOARD.cellWidth);
    const plants=g.plants.filter(p=>p.hp>0&&p.row===z.row&&p.column===column);
    if(throwing)this.effect(z.kind==='beach_surfer_veteran','surfboardThrow','Play',z.x,z.row,s.board,cellX(column));
    if(column>=0&&column<BOARD.columns&&!plants.some(p=>p.action==='food'||g.props.plants[p.kind].CannotBeKilledBySurfboard)){
      for(const p of plants){p.hp=0;p.armor=0;}
      g.graves=g.graves.filter(p=>p.row!==z.row||p.column!==column);
      g.graves.push({id:g.nextEntityId(),kind:'surfboard',row:z.row,column,hp:s.board,veteran:z.kind==='beach_surfer_veteran',stage:this.stage(s.board,z.kind==='beach_surfer_veteran'),spawnAt:g.time});
      g.beach.sounds.push((z.kind==='beach_surfer_veteran'?'surfboardVeteran':'surfboard')+'/spawnSounds');
    }else {this.effect(z.kind==='beach_surfer_veteran','surfboardBreak','Play4',x,z.row,0);g.beach.sounds.push(this.rig(z)+'/bdDestructionSounds');}
    s.board=0;
  }
  tickZombie(z:Zombie,dt:number){
    const s=z.surfer;if(!s)return false;
    const g=this.g,step=dt*(g.time<z.chilledUntil?.5:1);
    if(s.animation==='Fall'||s.animation==='Stab'){
      s.elapsed+=step;const timeline=g.props.plantAnimations[this.rig(z)][s.animation];
      while(s.eventIndex<timeline.events.length&&s.elapsed>=timeline.events[s.eventIndex].at){
        const event=timeline.events[s.eventIndex++].name;
        if(event==='stab')this.stab(z);
        if(event==='appear'){s.surfing=false;g.beach.sounds.push(this.rig(z)+'/appearSounds');}
        if(event==='fall')g.beach.sounds.push(this.rig(z)+'/fallSounds');
        if(event==='switchingFalse'){this.idle(z);return true;}
      }
      return true;
    }
    if(s.surfing){
      const blocker=g.plants.some(p=>p.hp>0&&p.row===z.row&&g.props.zombies[z.kind].PlantBlockers.includes(p.kind)&&Math.abs(z.x-cellX(p.column))<55);
      const shield=g.future.shieldAt(z);
      if(!g.beach.inWater(z)||blocker||shield){this.play(z,'Fall');g.beach.sounds.push(this.rig(z)+'/fallSlideSounds');}
      else z.x-=(z.reversed?-1:1)*g.props.zombies[z.kind].WalkSPS*g.props.zombies[z.kind].SwimSpeedMultiplier*BOARD.cellWidth*step*(g.time<(z.sappedUntil??0)?.5:1);
      z.eating=false;return true;
    }
    if(s.board>0&&(g.plants.some(p=>p.hp>0&&p.row===z.row&&!p.hidden&&p.kind!=='tanglekelp'&&!['potatomine','spikeweed','spikerock','iceweed'].includes(p.kind)&&Math.abs(z.x-cellX(p.column))<55)||g.graves.some(p=>p.hp>0&&p.row===z.row&&Math.abs(z.x-cellX(p.column))<55))){this.play(z,'Stab');z.eating=false;return true;}
    return false;
  }
  die(z:Zombie){
    const s=z.surfer;if(!s)return;
    s.deathAnimation=s.surfing?'Death_Water':s.board>0?'Death_Board':'Death';
    if(!s.surfing&&s.board>0&&z.deathCause!=='water'&&z.deathCause!=='swallow'){this.g.beach.sounds.push(this.rig(z)+'/bdSwingSounds');this.stab(z,true);}
  }
  stage(hp:number,veteran:boolean){const full=this.g.props.zombies[veteran?'beach_surfer_veteran':'beach_surfer'].BoardToughness;return hp>=full?0:hp>=full*.75?1:hp>=full*.5?2:hp>=full*.25?3:4;}
  damageBoard(grave:Grave){
    const stage=this.stage(grave.hp,grave.veteran===true);
    if(grave.hp<=0||stage!==grave.stage){const animation='Play'+Math.max(1,Math.min(4,stage));this.effect(grave.veteran===true,'surfboardBreak',animation,cellX(grave.column),grave.row,0);this.g.beach.sounds.push((grave.veteran?'surfboardVeteran':'surfboard')+(grave.hp<=0?'/destructionSounds':'/breakSounds'));grave.stage=stage;}
  }
  tick(){this.effects=this.effects.filter(e=>this.g.time-e.at<this.g.props.plantAnimations[e.name][e.animation].duration);}
}
