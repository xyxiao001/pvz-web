import targeting from '../../public/assets/future/boss-targeting.json';
import {EgyptBoss} from './egypt-boss';
import type {Level} from './level';

/** Future mech locks the largest color group; feeding a targeted tile cancels the salvo. */
export class FutureBoss extends EgyptBoss {
  canceledTargets:{id:number;row:number;column:number;age:number}[]=[];
  private locatorSerial=0;
  private shuffle<T>(items:T[]){
    for(let i=items.length-1;i>0;i--){const j=Math.floor(this.game.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;
  }
  protected override aim(){
    const g=this.game,settings=(g.props.zombies[this.zombie.kind].ZombossMechLevel===1?targeting.stages2:targeting.stages)[this.stage];this.targets=[];this.shootAnimation='Shoot';
    if(g.random()<=settings.shootRailWeight/(settings.shootRailWeight+settings.shootPlantWeight)){
      const groups:Level['powerTiles'][number]['group'][]=['alpha','beta','gamma','delta','epsilon'];
      let largest:Level['powerTiles']=[];
      for(const group of groups){const tiles=g.level.powerTiles.filter(t=>t.group===group);if(tiles.length>largest.length)largest=tiles;}
      if(largest.length){this.targets=largest.slice(0,settings.shootRailCount).map(t=>({row:t.row,column:t.column}));this.shootAnimation='Shoot_'+largest[0].group;return;}
    }
    const cells=this.shuffle(Array.from({length:45},(_,i)=>({row:i%5,column:Math.floor(i/5)})));
    const plants=this.shuffle(g.plants.filter((p,i,ps)=>ps.findIndex(q=>q.row===p.row&&q.column===p.column)===i));
    for(const p of plants.slice(0,targeting.count))if(g.random()>settings.shootPlantEmptyRate)this.targets.push({row:p.row,column:p.column});
    for(const cell of cells){if(this.targets.length===targeting.count)break;if(cell.column<=targeting.columnMax&&!this.targets.some(t=>t.row===cell.row&&t.column===cell.column))this.targets.push(cell);}
  }
  interruptTile(row:number,column:number){
    if(this.animation.startsWith('Shoot')&&this.targets.some(t=>t.row===row&&t.column===column)){this.canceledTargets.push(...this.targets.map(t=>({...t,id:++this.locatorSerial,age:0})));this.targets=[];}
  }
  override tick(dt:number){
    for(const target of this.canceledTargets)target.age+=dt;
    this.canceledTargets=this.canceledTargets.filter(t=>t.age<this.game.props.plantAnimations.bossTarget.Die.duration);
    super.tick(dt);
  }
  protected override impact(missile:{row:number;column:number}){
    const g=this.game;
    // Native zombossMissile burns the impact cell and removes its power tile; no splash to plants.
    for(const p of g.plants)if(p.row===missile.row&&p.column===missile.column&&p.action!=='food'&&!['powerplant','powerplant_alpha','powerplant_beta'].includes(p.kind))g.future.burn(p);
    const hit=(t:{row:number;column:number})=>t.row===missile.row&&t.column===missile.column;
    g.level.powerTiles=g.level.powerTiles.filter(t=>!hit(t));
    g.future.links=g.future.links.filter(link=>!hit(link.to)&&(!hit(link.from)||g.time>=link.at));
  }
}
