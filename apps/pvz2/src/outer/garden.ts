import type { AlmanacEntry, GardenArea } from './types';
import type { LocalStore } from '../shell/store';
export const GARDEN_KEY='pvz2-web:garden';
export const GROWTH_TIME=24*60*60*1000;
export interface GardenPlant {kind:string;grown:number;time:number;stuck:boolean;water:number;cooldown:number;requirement:'waterpourPar'|'fertilizerPar'|'jukeboxPar'|'pesticidePar'}
export interface GardenData {sprouts:number;rewardLevels:string[];areas:Record<number,{unlocked:boolean;plant:GardenPlant|null}[]>;cart:GardenPlant|null;boosts:Record<string,number>}
export const stageOf=(plant:GardenPlant)=>Math.floor(4*plant.grown/GROWTH_TIME);
export function compatible(ground:number,plant:AlmanacEntry){const place=plant.garden!.PlantPlace;return place!=='none'&&(ground===0||place==='dirt'||place==='fly'||ground===2&&place==='solid');}
export class GardenProgress {
  constructor(private storage:Pick<Storage,'getItem'|'setItem'>,readonly areas:GardenArea[],private wallet:LocalStore){
    if(storage.getItem(GARDEN_KEY)===null)this.save({sprouts:0,rewardLevels:[],cart:null,boosts:{},areas:Object.fromEntries(areas.map(area=>[area.id,area.slots.map(slot=>({unlocked:slot.unlocked,plant:null}))]))});
  }
  read():GardenData{return JSON.parse(this.storage.getItem(GARDEN_KEY)!);}
  private save(data:GardenData){this.storage.setItem(GARDEN_KEY,JSON.stringify(data));}
  claim(rewards:{level:string;type:string;count:number}[]){const data=this.read();for(const reward of rewards)if(reward.type==='sprout'&&!data.rewardLevels.includes(reward.level)){data.sprouts+=reward.count;data.rewardLevels.push(reward.level);}this.save(data);}
  buy(count:number,price:number){if(!this.wallet.spend('gem',price))return false;const data=this.read();data.sprouts+=count;this.save(data);return true;}
  unlock(area:number,index:number){const data=this.read();if(data.areas[area][index].unlocked||!this.wallet.spend('coin',4000))return false;data.areas[area][index].unlocked=true;this.save(data);return true;}
  plant(area:number,index:number,owned:AlmanacEntry[],now:number,random:()=>number=Math.random){
    const data=this.read(),slot=data.areas[area][index],ground=this.areas.find(a=>a.id===area)!.slots[index].ground;
    if(!slot.unlocked||slot.plant||data.sprouts===0)return false;
    const candidates=owned.filter(p=>compatible(ground,p)).map(p=>{const count=(data.boosts[p.kind]??0)+Number(data.cart?.kind===p.kind)+Object.values(data.areas).flat().filter(s=>s.plant?.kind===p.kind).length;return{plant:p,weight:p.garden!.FixedWeight!==undefined&&p.garden!.FixedWeight>=0?p.garden!.FixedWeight:count===0?8:count===1?32:count===2?128:1};});
    if(!candidates.length)return false;
    let weight=random()*candidates.reduce((sum,p)=>sum+p.weight,0),chosen=candidates[0].plant;
    for(const candidate of candidates){weight-=candidate.weight;if(weight<0){chosen=candidate.plant;break;}}
    // The native garden occasionally discovers a marigold independently of unlocked seeds.
    const kind=random()<.05?'marigold':chosen.kind,water=kind!=='marigold'&&chosen.garden!.PlantPlace==='float'?-1:3;
    slot.plant={kind,grown:0,time:now,stuck:true,water,cooldown:0,requirement:water<0?'fertilizerPar':'waterpourPar'};data.sprouts--;this.save(data);return true;
  }
  update(now:number,random:()=>number=Math.random){
    const data=this.read();
    for(const slot of Object.values(data.areas).flat())if(slot.plant){
      const p=slot.plant,elapsed=now-p.time,stage=stageOf(p);p.time=now;
      if(p.stuck){p.cooldown=Math.max(0,p.cooldown-elapsed);if(p.water<0)p.requirement=stage>2?(p.requirement==='waterpourPar'?(random()>.5?'jukeboxPar':'pesticidePar'):p.requirement):'fertilizerPar';}
      else {p.grown+=elapsed;if(stageOf(p)>stage){p.grown=(stage+1)*GROWTH_TIME/4-1;p.stuck=true;p.water=3;p.requirement='waterpourPar';}}
    }
    this.save(data);
  }
  water(area:number,index:number,now:number,random:()=>number=Math.random){const data=this.read(),p=data.areas[area][index].plant!;if(!p.stuck||p.cooldown>0)return false;p.water--;p.cooldown=7000+3000*random();p.time=now;this.save(data);return true;}
  grow(area:number,index:number,now:number){const data=this.read(),p=data.areas[area][index].plant!,stage=stageOf(p)+1;p.grown=stage*GROWTH_TIME/4+1;p.stuck=false;p.time=now;p.cooldown=0;this.wallet.credit(stage>=3?'gem':'coin',stage>=3?1:stage>=2?500:50);this.save(data);}
  remove(area:number,index:number){const data=this.read(),slot=data.areas[area][index],p=slot.plant!;const boost=!p.stuck&&stageOf(p)>=3;if(boost)data.boosts[p.kind]=(data.boosts[p.kind]??0)+1;slot.plant=null;this.save(data);return boost;}
  move(area:number,from:number,to:number,plants:AlmanacEntry[]){const data=this.read(),source=data.areas[area][from],target=data.areas[area][to];if(!source.plant||source.plant.stuck||stageOf(source.plant)===0||!target.unlocked||target.plant||!compatible(this.areas.find(a=>a.id===area)!.slots[to].ground,plants.find(p=>p.kind===source.plant!.kind)!))return false;target.plant=source.plant;source.plant=null;this.save(data);return true;}
  cart(area:number,index:number,plants:AlmanacEntry[]){const data=this.read(),slot=data.areas[area][index];if(data.cart){if(!slot.unlocked||slot.plant||!compatible(this.areas.find(a=>a.id===area)!.slots[index].ground,plants.find(p=>p.kind===data.cart!.kind)!))return false;slot.plant=data.cart;data.cart=null;}else{if(!slot.plant||slot.plant.stuck||stageOf(slot.plant)===0)return false;data.cart=slot.plant;slot.plant=null;}this.save(data);return true;}
}
