import type {Game} from '../src/game/model';

// Only player actions: collect dropped food, plant with the authored sun budget
// and card cooldown, then use collected food. The caller supplies one pre-grown
// Kernel-pult garden boost before battle, just as the normal battle entry does.
export function playPirate34(g:Game,frame:number){
  for(const pickup of [...g.pickups])g.collectPickup(pickup.id);
  if(frame%15!==0)return;
  const target=g.zombies.filter(z=>z.hp>0&&!z.swing&&!z.leap)
    .sort((a,b)=>a.x-b.x).find(z=>z.x<800&&(z.butteredUntil??0)<=g.time&&z.frozenUntil<=g.time);
  if(!target)return;
  const rows=[target.row,...[0,1,2,3,4].filter(row=>row!==target.row)];
  for(const column of [0,1,2,3])for(const row of rows)if(g.plant('kernelpult',row,column))return;
  const plant=g.plants.find(p=>p.kind==='kernelpult'&&p.action!=='food');
  if(plant)g.plantFood(plant.row,plant.column);
}
