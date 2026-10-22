import {BOARD,cellX,rowY} from './level';
import type {Game,Plant} from './model';
import {isFlying,seaCell,swinging} from './pirate';

export interface RootBomb {id:number;row:number;column:number;at:number;animation:'Death'|'Death_Dig_End'|'Death_Silently';variant:number;exploded:boolean}
export class EscapeRoots {
  selected:number|null=null;
  bombs:RootBomb[]=[];
  grapes:{id:number;x:number;y:number;vx:number;vy:number;hits:number;lane:number;blocked:boolean;detected:number[]}[]=[];
  private serial=0;
  #game:Game;
  constructor(game:Game){this.#game=game;}
  private play(p:Plant,animation:string){p.animation=animation;p.actionAt=this.#game.time;}
  cancel(){const p=this.#game.plants.find(p=>p.id===this.selected);if(p)this.play(p,p.rootGrown?'Idle':'Baby_Loop');this.selected=null;}
  select(row:number,column:number){
    const p=this.#game.plants.find(p=>p.kind==='escaperoot'&&p.row===row&&p.column===column&&p.hp>0);
    if(!p||p.action!=='idle'||!['Idle','Baby_Loop'].includes(p.animation!))return false;
    this.selected=p.id;this.play(p,p.rootGrown?'Ready_Start':'Baby_Ready_Start');return true;
  }
  exchange(row:number,column:number){
    const g=this.#game,p=g.plants.find(p=>p.id===this.selected),target=g.plants.find(p=>p.row===row&&p.column===column&&p.hp>0);
    this.cancel();
    if(!p||!target||p===target||target.endangered||target.leap||target.action==='food'||target.action==='explode'||['gravebuster','cherry_bomb'].includes(target.kind)||seaCell(g.level.planks,row,column)||g.level.mold.some(c=>c.row===row&&c.column===column))return false;
    this.bombs.push({id:--this.serial,row:p.row,column:p.column,at:g.time,animation:'Death_Silently',variant:-1,exploded:true});
    target.leap={x:cellX(column),y:rowY(row),at:g.time};target.row=p.row;target.column=p.column;
    p.row=row;p.column=column;p.rootGrown=true;p.age=g.props.plants.escaperoot.ChargeTime;this.play(p,'Dig_End');return true;
  }
  food(p:Plant){p.rootGrown=true;p.burst=2;p.nextBurst=this.#game.time+.5;this.play(p,'Dig_Start');}
  private bomb(row:number,column:number,animation:RootBomb['animation']){
    this.bombs.push({id:--this.serial,row,column,at:this.#game.time,animation,variant:Math.floor(this.#game.random()*4),exploded:false});
  }
  tickPlant(p:Plant,dt:number){
    const g=this.#game,animations=g.props.plantAnimations.escaperoot;
    if(p.action==='food'){
      if(g.time>=p.nextBurst){
        if(p.burst===0){p.action='idle';this.play(p,'Dig_End');return;}
        const cells=g.zombies.filter(z=>z.hp>0&&!isFlying(z)&&!z.leap&&!swinging(z,g.time)).map(z=>({row:z.row,column:Math.floor((z.x-BOARD.left)/BOARD.cellWidth)})).filter(c=>c.column>=0&&c.column<9&&!seaCell(g.level.planks,c.row,c.column)&&!g.level.mold.some(m=>m.row===c.row&&m.column===c.column)&&!g.plants.some(p=>p.hp>0&&p.row===c.row&&p.column===c.column)&&!g.graves.some(t=>t.row===c.row&&t.column===c.column));
        const cell=cells.length?cells[Math.floor(g.random()*cells.length)]:p;
        this.bomb(cell.row,cell.column,'Death_Dig_End');p.burst--;p.nextBurst=g.time+3;
      }
      if(p.animation==='Dig_Start'&&g.time-p.actionAt>=animations.Dig_Start.duration)this.play(p,'Dig_Loop');
      return;
    }
    if(p.id===this.selected){if(p.animation!.endsWith('Start')&&g.time-p.actionAt>=animations[p.animation!].duration)this.play(p,p.rootGrown?'Ready_Loop':'Baby_Ready_Loop');return;}
    if(!p.rootGrown&&p.animation==='Baby_Start')p.age+=dt;
    if(!['Idle','Baby_Loop'].includes(p.animation!)){
      if(g.time-p.actionAt>=animations[p.animation!].duration)this.play(p,p.rootGrown?'Idle':'Baby_Loop');
      return;
    }
    if(!p.rootGrown){p.age+=dt;if(p.age>=g.props.plants.escaperoot.ChargeTime){p.rootGrown=true;this.play(p,'Baby_End');}return;}
    if(g.zombies.some(z=>z.hp>0&&!isFlying(z)&&!z.leap&&!swinging(z,g.time)&&g.inLane(z,p.row)&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth/2)){this.bomb(p.row,p.column,'Death');p.hp=0;}
  }
  shootGrapes(row:number,column:number){for(const x of [-1,0,1])for(const y of [-1,0,1])if(x||y)this.grapes.push({id:--this.serial,x:cellX(column),y:rowY(row)-40,vx:x*15*BOARD.cellWidth,vy:y*15*BOARD.cellHeight,hits:0,lane:row,blocked:false,detected:[]});}
  tick(dt:number){
    const g=this.#game;
    if(this.selected!==null&&!g.plants.some(p=>p.id===this.selected&&p.hp>0))this.selected=null;
    for(const b of this.bombs){
      const timeline=g.props.plantAnimations.escaperoot[b.animation];
      if(!b.exploded&&g.time-b.at>=timeline.events.find(e=>e.name==='Explode')!.at){
        b.exploded=true;const wide=b.variant!==0,damage=b.variant===1?g.props.plants.escaperoot.DamagePrimal:g.props.plants.escaperoot.Damage;
        for(const z of g.zombies)if(z.hp>0&&(wide||!isFlying(z))&&Math.abs(z.row-b.row)<=(wide?1:0)&&Math.abs(z.x-cellX(b.column))<BOARD.cellWidth*(wide?1.5:.5))g.damage(z,damage,'potato');
        for(const t of g.graves)if(Math.abs(t.row-b.row)<=(wide?1:0)&&Math.abs(t.column-b.column)<=(wide?1:0))t.hp-=damage;
        g.effects.push({id:--this.serial,kind:b.variant===3?'grape':b.variant===2?'cherry':'explode',x:cellX(b.column),y:rowY(b.row),age:0});g.events.push({type:'explode'});
        if(b.variant===3)this.shootGrapes(b.row,b.column);
      }
    }
    this.bombs=this.bombs.filter(b=>g.time-b.at<g.props.plantAnimations.escaperoot[b.animation].duration);
    for(const p of this.grapes){
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      const lane=Math.floor((p.y+40-BOARD.top)/BOARD.cellHeight);
      if(lane!==p.lane){
        p.lane=lane;p.blocked=false;p.detected=p.detected.filter(id=>g.zombies.some(z=>z.id===id&&z.row===lane));
        if(lane<0&&p.vy<0||lane>4&&p.vy>0){p.vy=-p.vy;p.hits++;}
      }
      if(p.x<BOARD.left&&p.vx<0){p.vx=-p.vx;p.hits++;}
      const target=!p.blocked&&g.zombies.find(z=>z.hp>0&&z.row===lane&&!p.detected.includes(z.id)&&Math.abs(z.x-p.x)<35);
      if(target){
        g.damage(target,g.props.projectiles.grapeshot.Damage);p.detected.push(target.id);p.blocked=true;p.hits++;
        if(p.vy===0)p.vy=Math.abs(p.vx)*BOARD.cellHeight/BOARD.cellWidth*(lane<=0?1:lane>=4?-1:g.random()<.5?-1:1);
        else {p.vy=-p.vy;if(lane<=0&&p.vy<0||lane>=4&&p.vy>0)p.vy=-p.vy;}
      }
    }
    this.grapes=this.grapes.filter(p=>p.x>BOARD.left-50&&p.x<1200&&p.hits<g.props.projectiles.grapeshot.MaxHitCount);
  }
}
