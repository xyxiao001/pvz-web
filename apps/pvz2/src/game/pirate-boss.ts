import { cellX } from './level';
import { EgyptBoss } from './egypt-boss';

/** Native PirateZombossMech shares movement/stages but fires imps, not missiles. */
export class PirateBoss extends EgyptBoss {
  protected override aim(){this.targets=[];}
  protected override fire(){
    for(let i=0;i<6;i++){
      const x=cellX(2)+this.game.random()*3*82,row=Math.floor(this.game.random()*5);
      const imp=this.game.spawnZombie('pirate_imp',this.zombie.row,this.zombie.x);
      imp.leap={fromX:this.zombie.x-11.19645,fromY:this.y-141.3748,toX:x,toRow:row,at:this.game.time,duration:.8+.5*this.game.random()};
    }
  }
}
