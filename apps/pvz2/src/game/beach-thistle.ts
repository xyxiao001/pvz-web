import {BOARD,cellX,rowY} from './level';
import type {Game,Plant} from './model';
export class BeachThistles {
  shots:{id:number;x:number;y:number;angle:number;food:boolean;hit:boolean}[]=[];
  constructor(private readonly g:Game){}
  init(p:Plant){this.play(p,'Idle','idle');}
  private play(p:Plant,animation:string,action:Plant['action']){p.animation=animation;p.action=action;p.actionAt=this.g.time;p.eventIndex=0;}
  food(p:Plant){this.play(p,'FoodStart','food');this.g.beach.sounds.push('homingthistle/foodSound');}
  private target(){const g=this.g;return g.zombies.filter(z=>z.hp>0&&!g.props.zombies[z.kind].IgnoredByHomingThistle&&!z.leap&&z.x<cellX(9)).sort((a,b)=>a.x-b.x)[0];}
  private grave(){return this.g.graves.filter(t=>t.hp>0).sort((a,b)=>a.column-b.column)[0];}
  private fire(p:Plant,food:boolean,angle:number){this.shots.push({id:this.g.nextEntityId(),x:cellX(p.column)+20,y:rowY(p.row)-45,angle,food,hit:false});}
  tickPlant(p:Plant){
    const g=this.g,prop=g.props.plants.homingthistle;
    if(p.action==='idle'&&g.time>=p.nextAction&&(this.target()||this.grave())){this.play(p,'Shoot','shoot');p.nextAction=g.time+prop.ShootInterval+g.random()*prop.ShootIntervalAdditional;g.beach.sounds.push('homingthistle/steadySound');}
    if(p.animation==='Fooding'){
      while(p.burst>0&&g.time>=p.nextBurst){this.fire(p,true,(prop.PlantfoodPeaCount-p.burst)*2*Math.PI/prop.PlantfoodPeaCount);p.burst--;p.nextBurst+=1/prop.PlantfoodPeaCount;}
      if(!p.burst)this.play(p,'FoodEnd','food');return;
    }
    if(p.action==='idle')return;
    const timeline=g.props.plantAnimations.homingthistle[p.animation!];
    while(p.eventIndex!<timeline.events.length&&g.time-p.actionAt>=timeline.events[p.eventIndex!].at){const event=timeline.events[p.eventIndex!++].name;
      if(event==='Shoot'){this.fire(p,false,0);g.beach.sounds.push('homingthistle/shootSound');}
      if(event==='foodStart'){this.play(p,'Fooding','food');p.burst=prop.PlantfoodPeaCount;p.nextBurst=g.time;return;}
      if(event==='foodEnd'){this.play(p,'Idle','idle');p.nextAction=g.time;return;}
    }
    if(g.time-p.actionAt>=timeline.duration)this.play(p,'Idle','idle');
  }
  tick(dt:number){
    const g=this.g;
    for(const shot of this.shots){
      const target=this.target(),grave=target?undefined:this.grave(),tx=target?.x??(grave?cellX(grave.column):undefined),ty=target?rowY(target.row)-45:grave?rowY(grave.row)-45:undefined;
      if(tx!==undefined){const desired=Math.atan2(ty!-shot.y,tx-shot.x),difference=Math.atan2(Math.sin(desired-shot.angle),Math.cos(desired-shot.angle));shot.angle+=Math.sign(difference)*Math.min(Math.abs(difference),4*Math.PI*dt);}
      else shot.angle-=4*Math.PI*dt;
      const speed=8*BOARD.cellWidth;shot.x+=Math.cos(shot.angle)*speed*dt;shot.y+=Math.sin(shot.angle)*speed*dt;
      const damage=g.props.projectiles[shot.food?'homing_thistle_pf':'homing_thistle'].Damage;
      if(target&&Math.hypot(target.x-shot.x,rowY(target.row)-45-shot.y)<26){if(!g.beach.surfers.blockShot(target,damage,shot.x))g.damage(target,damage);shot.hit=true;}
      else if(grave&&Math.hypot(cellX(grave.column)-shot.x,rowY(grave.row)-45-shot.y)<26){grave.hp-=damage;shot.hit=true;}
    }
    this.shots=this.shots.filter(s=>!s.hit&&s.x>-100&&s.x<1300&&s.y>-100&&s.y<850);
  }
}
