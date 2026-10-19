import {BOARD,cellX,rowY,type PlantKind} from './level';
import type {Game,Plant} from './model';

export const isBowlingTool=(kind:PlantKind)=>kind.startsWith('tool_projectile_bowlingbulb');
export class BeachBowling {
  states=new Map<number,{loaded:boolean[];reload:number}>();
  balls:{id:number;kind:string;x:number;y:number;row:number;speed:number;direction:number;blockedRow:number|null}[]=[];
  constructor(private readonly g:Game){}
  init(p:Plant){this.states.set(p.id,{loaded:[true,true,true],reload:0});p.animation='Idle';p.eventIndex=0;}
  replant(p:Plant){p.hp=this.g.props.plants.bowlingbulb.Toughness;this.states.get(p.id)!.loaded.fill(true);this.play(p,'Idle','idle');}
  private play(p:Plant,animation:string,action:Plant['action']){p.animation=animation;p.action=action;p.actionAt=this.g.time;p.eventIndex=0;}
  roll(kind:string,row:number,x:number,speed:number){this.balls.push({id:this.g.nextEntityId(),kind,x,y:rowY(row)-20,row,speed,direction:0,blockedRow:null});}
  tool(kind:PlantKind,row:number,column:number){this.roll(this.g.props.plants[kind].ProjectileType,row,cellX(column),5);}
  food(p:Plant){const state=this.states.get(p.id)!;state.loaded.fill(true);state.reload=0;this.play(p,'FoodStart','food');this.g.beach.sounds.push('bowlingbulb/foodStart');}
  tickPlant(p:Plant,dt:number){
    const g=this.g,s=this.states.get(p.id)!,props=g.props.plants.bowlingbulb;
    s.reload-=dt;
    const enemies=()=>g.zombies.some(z=>z.hp>0&&g.inLane(z,p.row)&&!g.beach.diving(z)&&z.x>cellX(p.column)-15&&z.x<1150);
    if(p.action==='idle'){
      if(s.reload<=0){s.reload=props.AmmoRefreshTime;const next=[...props.LoadOrder].map(Number).find(i=>!s.loaded[i]);if(next!==undefined){s.loaded[next]=true;this.play(p,'Load'+next,'grow');g.beach.sounds.push('bowlingbulb/load');}}
      if(p.action==='idle'&&enemies()){const next=[...props.RollOrder].map(Number).find(i=>s.loaded[i]);if(next!==undefined){this.play(p,'Shoot'+next,'shoot');g.beach.sounds.push('bowlingbulb/preshoot');}}
    }
    if(p.animation==='FoodLoop'){if(enemies())this.play(p,'FoodShoot','food');else return;}
    if(p.action==='idle')return;
    const timeline=g.props.plantAnimations.bowlingbulb[p.animation!];
    while(p.eventIndex!<timeline.events.length&&g.time-p.actionAt>=timeline.events[p.eventIndex!].at){
      const name=timeline.events[p.eventIndex!++].name;
      if(name==='ShootFood'){this.roll(props.BowlingPlantfood,p.row,cellX(p.column),6);s.loaded.fill(true);}
      else if(name==='FSSound')g.beach.sounds.push('bowlingbulb/foodShoot');
      else if(name.startsWith('Shoot')){const i=Number(name.slice(5));s.loaded[i]=false;this.roll([props.Bowling0,props.Bowling1,props.Bowling2][i],p.row,cellX(p.column)+[20,-20,0][i]*.55,6);}
      else if(name==='foodEnd'){this.play(p,'Load0','grow');return;}
    }
    if(g.time-p.actionAt>=timeline.duration)this.play(p,p.animation==='FoodStart'?'FoodLoop':'Idle',p.animation==='FoodStart'?'food':'idle');
  }
  tick(dt:number){
    const g=this.g;
    for(const b of this.balls){
      const before=b.x;b.x+=b.speed*BOARD.cellWidth*dt;b.y+=b.direction*b.speed*BOARD.cellHeight*dt;
      const top=rowY(0)-20,bottom=rowY(4)-20;
      if(b.y<top){b.y=2*top-b.y;b.direction=1;}else if(b.y>bottom){b.y=2*bottom-b.y;b.direction=-1;}
      const row=Math.round((b.y-top)/BOARD.cellHeight);if(row!==b.row){b.row=row;b.blockedRow=null;}
      if(b.blockedRow===row)continue;
      const target=g.zombies.filter(z=>z.hp>0&&!z.leap&&g.inLane(z,row)&&!g.beach.diving(z)&&z.x>=before-25&&z.x<=b.x+25).sort((a,c)=>a.x-c.x)[0];
      if(!target)continue;
      const props=g.props.projectiles[b.kind];g.damage(target,props.Damage);
      if(b.kind==='bowling_pf'){
        const splash=props.SplashDamage[0];
        for(const z of g.zombies)if(z!==target&&z.hp>0&&Math.abs(z.x-target.x)<splash.Range.w*BOARD.cellWidth/2&&Math.abs(z.row-row)<splash.Range.h/2)g.damage(z,splash.Damage!);
        g.effects.push({id:g.nextEntityId(),kind:'explode',x:b.x,y:b.y,age:0});
      }else g.effects.push({id:g.nextEntityId(),kind:'hit',x:b.x,y:b.y,age:0});
      b.blockedRow=row;b.direction=row===0?1:row===4?-1:b.direction===0?(g.random()<.5?-1:1):-b.direction;
      // Native bowling keeps rolling after a hit; unlike grapeshot, it does not decrement the hit counter.
    }
    this.balls=this.balls.filter(b=>b.x<1250);
    for(const id of this.states.keys())if(!g.plants.some(p=>p.id===id))this.states.delete(id);
  }
}
