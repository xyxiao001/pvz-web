import {cellX,rowY,type PlantKind} from './level';
import type {Game,Plant} from './model';

/** LnC.deadPlantType and IntensiveCarrot's native open event. */
export class EightiesCarrot {
 readonly cells=new Map<string,{row:number;column:number;kind:PlantKind}>();
 private opening=new Map<number,number>();
 constructor(private g:Game){}
 at(row:number,column:number){return this.cells.get(`${row}:${column}`);}
 clear(row:number,column:number){this.cells.delete(`${row}:${column}`);}
 blocked(p:Plant){return this.g.time<(this.opening.get(p.id)??0);}
 remember(p:Plant){
  // Consumed instants and transformations use die(), not dieOnLnC().
  if(!['eighties','modern'].includes(this.g.level.world)||p.transformed||p.action==='explode'||['grimrose','cherry_bomb','jalapeno','bamboobusket','powerlily','goldleaf','hotpotato','thymewarp','empea','blover','stallia','hurrikale','iceburg','gravebuster','sunbean','chilibean','tanglekelp','stunion','lavaguava','ghostpepper','powerplant','powerplant_alpha','powerplant_beta'].includes(p.kind))return;
  this.cells.set(`${p.row}:${p.column}`,{row:p.row,column:p.column,kind:p.kind});
 }
 revive(row:number,column:number){
  const g=this.g,kind=this.at(row,column)!.kind;
  g.addPlant(kind,row,column);
  const p=g.plants.at(-1)!;p.hp=g.props.plants[kind].Toughness*g.props.plants.intensivecarrot.HealthReturns;
  this.opening.set(p.id,g.time+g.props.plantAnimations.intensivecarrot.Death.events.find(e=>e.name==='open')!.at);
  g.future.visual('carrotRevive','Death',cellX(column),rowY(row));g.beach.sounds.push('intensivecarrot/digSound');
 }
 tick(){for(const [id,until] of this.opening)if(this.g.time>=until||!this.g.plants.some(p=>p.id===id))this.opening.delete(id);}
}
