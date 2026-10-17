import targeting2 from '../../public/assets/cowboy/boss-targeting2.json';
import targeting from '../../public/assets/cowboy/boss-targeting.json';
import {EgyptBoss} from './egypt-boss';

/** Native western mech: rail salvos leave one cart position free. */
export class CowboyBoss extends EgyptBoss {
  private shuffle<T>(items:T[]){
    for(let i=items.length-1;i>0;i--){const j=Math.floor(this.game.random()*(i+1));[items[i],items[j]]=[items[j],items[i]];}return items;
  }
  protected override aim(){
    const settings=(this.game.props.zombies[this.zombie.kind].ZombossMechLevel===1?targeting2:targeting).stages[this.stage];
    const railAttack=this.game.random()<=settings.shootRailWeight/(settings.shootRailWeight+settings.shootPlantWeight);
    const cells=this.shuffle(Array.from({length:45},(_,i)=>({row:i%5,column:Math.floor(i/5)})));
    this.targets=[];
    if(railAttack){
      const rails=this.game.level.rails!.Rails,chosen:typeof rails=[];
      for(const cell of cells){const rail=rails.find(r=>r.Column===cell.column&&cell.row>=r.RowStart&&cell.row<=r.RowEnd);if(rail&&!chosen.includes(rail))chosen.push(rail);if(chosen.length===settings.shootRailCount)break;}
      for(const rail of chosen)this.targets.push(...this.shuffle(Array.from({length:rail.RowEnd-rail.RowStart+1},(_,i)=>({row:rail.RowStart+i,column:rail.Column}))).slice(0,-1));
    }else{
      const plants=this.shuffle(this.game.plants.map(p=>({row:p.row,column:p.column})));
      for(const plant of plants.slice(0,targeting.count))if(this.game.random()>settings.shootPlantEmptyRate)this.targets.push(plant);
      for(const cell of cells){if(this.targets.length===targeting.count)break;if(cell.column<=5&&!this.targets.some(t=>t.row===cell.row&&t.column===cell.column))this.targets.push(cell);}
    }
  }
  protected override impact(missile:{row:number;column:number}){
    const props=this.game.props.projectiles.zomboss_missile_cowboy;
    // SupressArmorProtection: these fire missiles hit health through nut armor.
    for(const plant of this.game.plants)if(plant.row===missile.row&&Math.abs(plant.column-missile.column)<=1&&plant.action!=='food')plant.hp-=plant.column===missile.column?props.Damage:props.SplashDamage[0].Damage!;
  }
}
