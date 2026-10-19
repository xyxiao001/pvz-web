export interface CostumePlant { id:number;kind:string;name:string;count:number;path:string;armature:string;animation:string }
export interface CostumeReward { world:string;node:number;kind:'costume';id:number;plant:string;costume:number }

export function availableCostumes(plants:readonly CostumePlant[],owned:ReadonlySet<number>,rewards:readonly CostumeReward[]) {
  return plants.filter(plant=>owned.has(plant.id)).flatMap(plant=>Array.from({length:plant.count},(_,costume)=>({plant,costume})))
    .filter(({plant,costume})=>!rewards.some(reward=>reward.id===plant.id&&reward.costume===costume));
}

export function applyCostume(slots:Iterable<{name:string;displayIndex:number}>,costume:number) {
  for(const slot of slots)if(slot.name.startsWith('COS'))slot.displayIndex=slot.name===`COS${costume}`||slot.name.startsWith(`COS${costume}_`)?0:-1;
}
