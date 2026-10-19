import {BOARD,cellX,rowY,type PlantKind} from './level';
import type {Game,Plant} from './model';

export class DarkFinalePlants {
  states=new Map<number,{elapsed:number;event:number;fuel:number;rest:number;loops:number}>();
  shots:{id:number;x:number;y:number;row:number}[]=[];
  runners:{id:number;x:number;row:number;elapsed:number;event:number;animation:string;damage:number}[]=[];
  fires:{id:number;row:number;column:number;at:number}[]=[];
  sounds:string[]=[];
  constructor(private g:Game){}
  handles(kind:PlantKind){return kind==='guacodile'||kind==='jackolantern';}
  init(p:Plant){this.states.set(p.id,{elapsed:0,event:0,fuel:this.g.props.plants.jackolantern.ShootDuration,rest:0,loops:0});this.play(p,'Idle');}
  private play(p:Plant,animation:string,action:Plant['action']='idle'){p.animation=animation;p.action=action;p.actionAt=this.g.time;const s=this.states.get(p.id)!;s.elapsed=0;s.event=0;}
  private targets(p:Plant,distance:number){return this.g.zombies.filter(z=>z.hp>0&&!z.reversed&&this.g.inLane(z,p.row)&&z.x>cellX(p.column)-20&&z.x<cellX(p.column)+distance*BOARD.cellWidth);}
  private graves(p:Plant,distance:number){return this.g.graves.filter(t=>t.hp>0&&t.row===p.row&&t.column>=p.column&&t.column<=p.column+distance);}
  private rush(p:Plant,spawn:boolean){
    const g=this.g,prop=g.props.plants.guacodile;
    this.runners.push({id:g.nextEntityId(),x:cellX(p.column),row:p.row,elapsed:0,event:0,animation:spawn?'Spawn':'Idle',damage:prop.ChildrenBiteDamage});
    for(const z of this.targets(p,1))if(z!==g.boss?.zombie&&!g.props.zombies[z.kind].CannotBeTossedByCitron)z.x=Math.max(z.x,cellX(p.column)+prop.KnockbackDistance*BOARD.cellWidth);
  }
  food(p:Plant){const g=this.g,s=this.states.get(p.id)!;
    if(p.kind==='guacodile'){s.loops=g.props.plants.guacodile.PlantfoodTime;this.play(p,'FoodLoop','food');}
    else {
      s.fuel=g.props.plants.jackolantern.ShootDuration;s.rest=0;this.play(p,'Food','food');this.sounds.push('jackolantern/foodSay');
      const cells=[...g.zombies.filter(z=>z.hp>0&&z.x<cellX(9)).map(z=>({row:z.row,column:Math.floor((z.x-BOARD.left)/BOARD.cellWidth)})),...g.graves.filter(t=>t.hp>0).map(t=>({row:t.row,column:t.column}))];
      const random=Array.from({length:45},(_,i)=>({row:i%5,column:Math.floor(i/5)}));for(let i=random.length-1;i>0;i--){const j=Math.floor(g.random()*(i+1));[random[i],random[j]]=[random[j],random[i]];}
      const unique=new Map([...cells,...random].map(c=>[`${c.row}:${c.column}`,c]));
      for(const c of [...unique.values()].slice(0,g.props.plants.jackolantern.PlantfoodFireCount))this.fires.push({...c,id:g.nextEntityId(),at:g.time});
    }
  }
  tickPlant(p:Plant,dt:number){
    const g=this.g,s=this.states.get(p.id)!,prop=g.props.plants[p.kind];
    if(p.kind==='guacodile'&&p.action!=='food'&&this.targets(p,.5).length){p.hp=0;return;}
    if(p.kind==='jackolantern'&&p.action!=='food'){
      if(p.animation==='AttackLoop'){
        s.fuel-=dt;for(const z of this.targets(p,prop.Distance+.5))g.damage(z,prop.DPS*dt);for(const t of this.graves(p,prop.Distance))t.hp-=prop.DPS*dt;
        if(s.fuel<=0||!this.targets(p,prop.Distance+.5).length&&!this.graves(p,prop.Distance).length){this.play(p,'AttackEnd','shoot');this.sounds.push('jackolantern/shootEnd');}else return;
      }else if(p.animation==='Idle_Out'){s.rest-=.5*dt;if(s.rest<=0){s.fuel=prop.ShootDuration;this.play(p,'Recharge','grow');}else return;}
      else if(p.animation==='Idle'){
        if(s.fuel<=0){s.rest=prop.RechargeTime;this.play(p,'Out','grow');}
        else {s.fuel=Math.min(prop.ShootDuration,s.fuel+dt);if(this.targets(p,prop.Distance+.5).length||this.graves(p,prop.Distance).length){this.play(p,'AttackStart','shoot');this.sounds.push('jackolantern/shootStartSay');}}
      }
    }else if(p.kind==='guacodile'&&p.action==='idle'&&g.time>=p.nextAction&&(this.targets(p,12).length||this.graves(p,9).length)){
      p.nextAction=g.time+prop.ShootInterval+g.random()*prop.ShootIntervalAdditional;this.play(p,'Shoot','shoot');
    }
    const animation=p.animation!,timeline=g.props.plantAnimations[p.kind][animation];s.elapsed+=dt;
    while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const name=timeline.events[s.event++].name;
      if(p.kind==='guacodile'){
        if(name==='Shoot')this.shots.push({id:g.nextEntityId(),x:cellX(p.column)+20,y:rowY(p.row)-35,row:p.row});
        else if(name==='FoodShoot')this.rush(p,false);
        else if(['shootSound','foodShootSound','foodCharge','foodLand'].includes(name))this.sounds.push('guacodile/'+name.replace('Sound',''));
      }else if(name==='Shoot')this.sounds.push('jackolantern/shootStart');
    }
    if(s.elapsed>=timeline.duration&&p.action!=='idle'){
      if(animation==='FoodLoop'&&--s.loops>0)this.play(p,'FoodLoop','food');
      else if(animation==='AttackStart')this.play(p,'AttackLoop','shoot');
      else if(animation==='Out')this.play(p,'Idle_Out');
      else this.play(p,'Idle');
    }
  }
  settle(){for(const p of this.g.plants)if(p.kind==='guacodile'&&p.hp<this.g.props.plants.guacodile.Toughness){this.rush(p,true);p.hp=0;}}
  tick(dt:number){
    const g=this.g;
    for(const shot of this.shots){const from=shot.x;shot.x+=8*BOARD.cellWidth*dt;const z=g.zombies.find(z=>z.hp>0&&g.inLane(z,shot.row)&&z.x>=from-20&&z.x<=shot.x+20),t=g.graves.find(t=>t.hp>0&&t.row===shot.row&&cellX(t.column)>=from-20&&cellX(t.column)<=shot.x+20);if(z){g.damage(z,g.props.projectiles.guacodile.Damage);shot.x=1300;}else if(t){t.hp-=g.props.projectiles.guacodile.Damage;shot.x=1300;}}
    this.shots=this.shots.filter(p=>p.x<1230);
    for(const r of this.runners){const timeline=g.props.plantAnimations.guacRunner[r.animation];r.elapsed+=dt;if(r.animation==='Idle')r.x+=4.5*BOARD.cellWidth*dt;
      while(r.event<timeline.events.length&&r.elapsed>=timeline.events[r.event].at){if(timeline.events[r.event++].name==='bite'){for(const z of g.zombies)if(z.hp>0&&z.row===r.row&&Math.abs(z.x-r.x)<50)g.damage(z,r.damage);for(const t of g.graves)if(t.hp>0&&t.row===r.row&&Math.abs(cellX(t.column)-r.x)<50)t.hp-=r.damage;}}
      if(r.elapsed>=timeline.duration){r.animation='Idle';r.elapsed=0;r.event=0;}
    }
    this.runners=this.runners.filter(r=>r.x<1230);
    for(const f of this.fires)if(g.time-f.at<7.5){for(const z of g.zombies)if(z.hp>0&&g.inLane(z,f.row)&&Math.abs(z.x-cellX(f.column))<60)g.damage(z,g.props.plants.jackolantern.DPSPlantfood*dt);for(const t of g.graves)if(t.hp>0&&t.row===f.row&&t.column===f.column)t.hp-=g.props.plants.jackolantern.DPSPlantfood*dt;}
    this.fires=this.fires.filter(f=>g.time-f.at<7.5+g.props.plantAnimations.jackFood.Fade.duration);
    for(const [id] of this.states)if(!g.plants.some(p=>p.id===id))this.states.delete(id);
  }
}
