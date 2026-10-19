import type {Game} from '../src/game/model';

export function playDark22(g:Game,frame:number){
 for(const sun of [...g.suns])g.collect(sun.id);
 for(const pickup of [...g.pickups])g.collectPickup(pickup.id);
 if(frame%12)return;
 for(const p of g.plants)if(p.kind==='wallnut'&&p.hp<g.props.plants.wallnut.Toughness*.75)g.plant('wallnut',p.row,p.column);
 const used=(row:number,column:number)=>g.plants.some(p=>p.row===row&&p.column===column);
 for(const row of [0,1,2,3])if(g.plantsLost+g.plants.filter(p=>p.kind==='gravebuster').length<4)g.plant('gravebuster',row,0);
 if(!used(0,0))g.plant('sunshroom',0,0);
 for(const r of [1,2,3])if(!used(r,0))g.plant('cabbagepult',r,0);
 if(g.graves.length&&g.food>0){const p=g.plants.find(p=>p.kind==='cabbagepult'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
 for(const r of [4])if(!used(r,0))g.plant('sunshroom',r,0);
 for(const r of [0,1,2,3,4])if(!used(r,1))g.plant(r===1||r===3?'magnetshroom':'sunshroom',r,1);
 for(const r of [0,1,2,3,4])if(!used(r,3)&&g.zombies.some(z=>z.row===r&&z.x<750))g.plant('wallnut',r,3);
 for(const c of [2])for(const r of [0,1,2,3,4])if(!used(r,c))g.plant('laser_bean',r,c);
 if(g.food>0&&g.zombies.some(z=>z.hp>0&&z.kind==='dark_gargantuar')){const z=g.zombies.filter(z=>z.hp>0&&z.kind==='dark_gargantuar').sort((a,b)=>a.x-b.x)[0];const p=g.plants.find(p=>p.kind==='laser_bean'&&p.action!=='food'&&p.row===z?.row);if(p)g.plantFood(p.row,p.column);}
}
