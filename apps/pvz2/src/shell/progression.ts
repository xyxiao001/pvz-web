import {newEndlessRun, type EndlessWorld, type EndlessRun} from '../game/endless';
import { GARDEN_KEY, type GardenData } from '../outer/garden';
import { LocalStore } from './store';
import { availableCostumes, type CostumePlant, type CostumeReward } from './costumes';
import { islandStates, isWorldMigrated } from './navigation';
import type { Island, WorldMap } from './types';

const completionKey = (level: string) => `pvz2-web:${level}-complete`;
const REWARDS_KEY = 'pvz2-web:map-rewards';
const PENDING_KEY = 'pvz2-web:pending-map-completion';
const FREE_PLAY_KEY = 'pvz2-web:free-play';
export type MapReward = { world: string; node: number; kind: 'plant' | 'upgrade'; id: number } | CostumeReward;
export interface PendingCompletion { world: string; level: string }
export class ProgressStore {
  get temporaryUnlock() { return this.storage.getItem(FREE_PLAY_KEY) === '1'; }
  set temporaryUnlock(enabled: boolean) {
    if (enabled) this.storage.setItem(FREE_PLAY_KEY, '1');
    else this.storage.removeItem(FREE_PLAY_KEY);
  }
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {}
  endlessUnlocked(world:EndlessWorld) { return this.temporaryUnlock||this.campaignRewards().some(r=>r.id===`dangerroom_${world}`); }
  endlessRun(world:EndlessWorld):EndlessRun|null { const saved=this.storage.getItem(`pvz2-web:endless:${world}`);return saved===null?null:JSON.parse(saved); }
  saveEndless(world:EndlessWorld,run:EndlessRun) { this.storage.setItem(`pvz2-web:endless:${world}`,JSON.stringify(run)); }
  startEndless(world:EndlessWorld,seed=Date.now()>>>0) { const run=newEndlessRun(world,seed,this.endlessRun(world)?.best??0);this.saveEndless(world,run);return run; }
  isComplete(level: string) { return this.storage.getItem(completionKey(level)) === '1'; }
  completed(map: WorldMap) { return new Set(map.islands.flatMap(n => n.levels).filter(id => this.isComplete(id))); }
  rewards(): MapReward[] {
    const saved = this.storage.getItem(REWARDS_KEY);
    return saved === null ? [] : JSON.parse(saved);
  }
  rewardNodes(world: string) { return new Set(this.rewards().filter(r => r.world === world).map(r => r.node)); }
  costumeRewards() { return this.rewards().filter((r):r is CostumeReward=>r.kind==='costume'); }
  equippedCostumes() { return Object.fromEntries(this.costumeRewards().map(r=>[r.plant,r.costume])); }
  openGift(world:string,node:number,plants:readonly CostumePlant[],random=Math.random) {
    const rewards=this.rewards(),claimed=this.costumeRewards().find(r=>r.world===world&&r.node===node);
    if(claimed)return claimed;
    const available=availableCostumes(plants,this.ownedPlants(),this.costumeRewards());
    if(!available.length)return null;
    const {plant,costume}=available[Math.floor(random()*available.length)];
    const reward:CostumeReward={world,node,kind:'costume',id:plant.id,plant:plant.kind,costume};
    this.storage.setItem(REWARDS_KEY,JSON.stringify([...rewards,reward]));
    return reward;
  }
  shop() { return new LocalStore(this.storage); }
  ownedPlants() { return new Set([0, 1, 2, 3, ...this.shop().read().plants, ...this.rewards().filter(r => r.kind === 'plant').map(r => r.id)]); }
  ownedUpgrades() { return new Set([...this.shop().read().upgrades, ...this.rewards().filter(r => r.kind === 'upgrade').map(r => r.id)]); }
  gardenBoosts(){const saved=this.storage.getItem(GARDEN_KEY);return saved===null?{}:(JSON.parse(saved) as GardenData).boosts;}
  consumeGardenBoosts(kinds:ReadonlySet<string>){
    if(kinds.size===0)return;
    const data=JSON.parse(this.storage.getItem(GARDEN_KEY)!) as GardenData;
    for(const kind of kinds)data.boosts[kind]--;this.storage.setItem(GARDEN_KEY,JSON.stringify(data));
  }
  battleBonuses() {
    const upgrades = this.ownedUpgrades();
    return { plantfoodRefresh:upgrades.has(5), wallnutFirstAid:upgrades.has(4), shovelRefund: .25 * [6,7,8].filter(id=>upgrades.has(id)).length, manualMowers: [11,12].filter(id=>upgrades.has(id)).length, seedSlots: 6 + Number(upgrades.has(9)) + Number(upgrades.has(10)), foodLimit: 3 + Number(upgrades.has(2)) + Number(upgrades.has(3)), startingSun: 25 * (Number(upgrades.has(0)) + Number(upgrades.has(1))) };
  }
  pending(): PendingCompletion | null {
    const saved = this.storage.getItem(PENDING_KEY);
    return saved === null ? null : JSON.parse(saved);
  }
  campaignRewards():{level:string;type:'worldtrophy'|'pinata'|'sprout'|'note'|'coinbag';id:string;count:number}[]{
    const saved=this.storage.getItem('pvz2-web:campaign-rewards');return saved===null?[]:JSON.parse(saved);
  }
  unlockedWorlds():string[]{const saved=this.storage.getItem('pvz2-web:unlocked-worlds');return saved===null?[]:JSON.parse(saved);}
  worldUnlocked(world:string){return isWorldMigrated(world)&&(this.temporaryUnlock||world==='egypt'||this.unlockedWorlds().includes(world));}
  unlockWorld(world:string){if(this.worldUnlocked(world)||this.worldKeys()<1)return false;this.storage.setItem('pvz2-web:unlocked-worlds',JSON.stringify([...this.unlockedWorlds(),world]));return true;}
  worldKeys(){return this.campaignRewards().filter(r=>r.type==='worldtrophy'&&r.id==='worldkey').reduce((n,r)=>n+r.count,5)-this.unlockedWorlds().length;}
  finish(world: string, level: string, sprouts=0) {
    if (this.isComplete(level)) return;
    if(['egypt4','egypt6','egypt7','egypt8','egypt10','egypt11','egypt12','egypt14','egypt15','egypt16','egypt18','egypt20','egypt22','egypt23','egypt25','egypt27','egypt30','egypt31','egypt34'].includes(level)||level==='egypt5'&&sprouts>0){
      const rewards=this.campaignRewards();
      if(level==='egypt4')rewards.push({level,type:'worldtrophy',id:'powerupgadget',count:1});
      if(level==='egypt12')rewards.push({level,type:'worldtrophy',id:'dangerroom_egypt',count:1});
      if(level==='egypt23')rewards.push({level,type:'worldtrophy',id:'dangerroom_egypt_minigame',count:1});
      if(level==='egypt25')rewards.push({level,type:'worldtrophy',id:'worldtrophy_egypt',count:1});
      if(level==='egypt31')rewards.push({level,type:'worldtrophy',id:'dangerroom_egypt2',count:1});
      if(level==='egypt7')rewards.push({level,type:'note',id:'note_egypt',count:1});
      if(level==='egypt8')rewards.push({level,type:'worldtrophy',id:'worldkey',count:1});
      if(['egypt10','egypt14','egypt16','egypt18','egypt20'].includes(level))rewards.push({level,type:'coinbag',id:'CoinBag',count:1});
      if(level==='egypt6'||level==='egypt11'||level==='egypt15'||level==='egypt22'||level==='egypt27'||level==='egypt30'||level==='egypt34')rewards.push({level,type:'pinata',id:'spine_egypt',count:1});
      if(level==='egypt5')rewards.push({level,type:'sprout',id:'sprout',count:sprouts});
      this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));
    }
    if(level==='sky16'||level==='sky20'){const rewards=this.campaignRewards();rewards.push({level,type:'worldtrophy',id:level==='sky16'?'worldkey':'dangerroom_sky',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='dino16'||level==='dino20'||level==='dino32'||level==='dino36'){const rewards=this.campaignRewards();rewards.push({level,type:'worldtrophy',id:level==='dino36'?'dangerroom_dino2':level==='dino16'?'worldkey':level==='dino32'?'worldtrophy_dino':'dangerroom_dino',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='modern16'||level==='modern20'){const rewards=this.campaignRewards();rewards.push({level,type:'worldtrophy',id:level==='modern16'?'worldkey':'dangerroom_modern',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='modern15'){const rewards=this.campaignRewards();rewards.push({level,type:'note',id:'note_modern',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(['modern6','modern7','modern12','modern14','modern25'].includes(level)){const rewards=this.campaignRewards();rewards.push({level,type:'pinata',id:'spine_modern',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='dino12'||level==='dino14'||level==='dino24'||level==='dino29'||level==='dino33'||level==='dino37'||level==='dino41'){const rewards=this.campaignRewards();rewards.push({level,type:'pinata',id:'spine_dino',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='kongfu8'){const rewards=this.campaignRewards();rewards.push({level,type:'worldtrophy',id:'worldkey',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='pirate7'||level==='pirate8'){const rewards=this.campaignRewards();rewards.push({level,type:level==='pirate7'?'note':'worldtrophy',id:level==='pirate7'?'note_pirate':'worldkey',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(['pirate4','pirate5','pirate16','pirate19','pirate23','pirate25','pirate27','pirate30','pirate33'].includes(level)){const rewards=this.campaignRewards();rewards.push({level,type:level==='pirate4'||level==='pirate25'||level==='pirate33'?'worldtrophy':'pinata',id:level==='pirate33'?'dangerroom_pirate2':level==='pirate25'?'worldtrophy_pirate':level==='pirate4'?'dangerroom_pirate':'spine_pirate',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='cowboy7'||level==='cowboy8'){const rewards=this.campaignRewards();rewards.push({level,type:level==='cowboy7'?'note':'worldtrophy',id:level==='cowboy7'?'note_cowboy':'worldkey',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='cowboy2'||level==='cowboy3'||level==='cowboy14'||level==='cowboy17'||level==='cowboy22'||level==='cowboy25'||level==='cowboy26'||level==='cowboy30'||level==='cowboy33'||level==='cowboy34'){const rewards=this.campaignRewards();rewards.push({level,type:level==='cowboy3'||level==='cowboy25'||level==='cowboy33'?'worldtrophy':'pinata',id:level==='cowboy33'?'dangerroom_cowboy2':level==='cowboy25'?'worldtrophy_cowboy':level==='cowboy3'?'dangerroom_cowboy':'spine_cowboy',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='future7'||level==='future8'){const rewards=this.campaignRewards();rewards.push({level,type:level==='future7'?'note':'worldtrophy',id:level==='future7'?'note_future':'worldkey',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='future32'||level==='future33'||level==='future34'||level==='future4'||level==='future5'||level==='future11'||level==='future15'||level==='future22'||level==='future25'||level==='future27'||level==='future30'){const rewards=this.campaignRewards();rewards.push({level,type:level==='future32'||level==='future33'||level==='future4'||level==='future25'?'worldtrophy':'pinata',id:level==='future32'?'dangerroom_future2':level==='future33'?'dangerroom_future_sunbomb':level==='future25'?'worldtrophy_future':level==='future4'?'dangerroom_future':'spine_future',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='beach16'||level==='beach20'||level==='beach24'){const rewards=this.campaignRewards();rewards.push({level,type:'worldtrophy',id:level==='beach24'?'dangerroom_beach_minigame':level==='beach16'?'worldkey':'dangerroom_beach',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(['beach4','beach8','beach12','beach14','beach15','beach17','beach22','beach25','beach30'].includes(level)){const rewards=this.campaignRewards();rewards.push({level,type:level==='beach15'?'note':'pinata',id:level==='beach15'?'note_beach':'spine_beach',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(['dark26','dark27','dark29'].includes(level)){const rewards=this.campaignRewards();rewards.push({level,type:level==='dark29'?'pinata':'worldtrophy',id:level==='dark26'?'dangerroom_dark2':level==='dark27'?'dangerroom_dark_potion':'spine_dark',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(['dark18','dark20','dark22','dark24','dark25'].includes(level)){const rewards=this.campaignRewards();rewards.push({level,type:level==='dark20'?'worldtrophy':'pinata',id:level==='dark20'?'worldtrophy_dark':'spine_dark',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(['dark11','dark12','dark13'].includes(level)){const rewards=this.campaignRewards();rewards.push({level,type:level==='dark12'?'worldtrophy':'pinata',id:level==='dark12'?'dangerroom_dark':'spine_dark',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(['dark8','dark9','dark10'].includes(level)){const rewards=this.campaignRewards();rewards.push({level,type:level==='dark8'?'pinata':level==='dark9'?'note':'worldtrophy',id:level==='dark8'?'spine_dark':level==='dark9'?'note_dark':'worldkey',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(['iceage12','iceage14','iceage17','iceage22','iceage24','iceage29','iceage31','iceage34'].includes(level)){const rewards=this.campaignRewards();rewards.push({level,type:'pinata',id:'spine_iceage',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(['lostcity4','lostcity8','lostcity12','lostcity14','lostcity17','lostcity23','lostcity28','lostcity30','lostcity33','lostcity34','lostcity35','lostcity36','lostcity38','lostcity40','lostcity41'].includes(level)){const rewards=this.campaignRewards();rewards.push({level,type:'pinata',id:'spine_lostcity',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='eighties16'||level==='eighties20'||level==='eighties32'||level==='eighties38'){const rewards=this.campaignRewards();rewards.push({level,type:'worldtrophy',id:level==='eighties38'?'dangerroom_eighties2':level==='eighties32'?'worldtrophy_eighties':level==='eighties16'?'worldkey':'dangerroom_eighties',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='eighties12'||level==='eighties14'||level==='eighties24'||level==='eighties29'){const rewards=this.campaignRewards();rewards.push({level,type:'pinata',id:'spine_eighties',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='kongfu14'){const rewards=this.campaignRewards();rewards.push({level,type:'worldtrophy',id:'dangerroom_kongfu',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='lostcity39'){const rewards=this.campaignRewards();rewards.push({level,type:'worldtrophy',id:'dangerroom_lostcity2',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='lostcity32'){const rewards=this.campaignRewards();rewards.push({level,type:'worldtrophy',id:'worldtrophy_lostcity',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='iceage30'){const rewards=this.campaignRewards();rewards.push({level,type:'worldtrophy',id:'worldtrophy_iceage',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='iceage20'||level==='iceage35'){const rewards=this.campaignRewards();rewards.push({level,type:'worldtrophy',id:level==='iceage35'?'dangerroom_iceage2':'dangerroom_iceage',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='lostcity15'||level==='lostcity16'||level==='lostcity20'){const rewards=this.campaignRewards();rewards.push({level,type:level==='lostcity15'?'note':'worldtrophy',id:level==='lostcity20'?'dangerroom_lostcity':level==='lostcity15'?'note_lostcity':'worldkey',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    if(level==='iceage15'||level==='iceage16'){const rewards=this.campaignRewards();rewards.push({level,type:level==='iceage15'?'note':'worldtrophy',id:level==='iceage15'?'note_iceage':'worldkey',count:1});this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));}
    this.storage.setItem(completionKey(level), '1');
    this.storage.setItem(PENDING_KEY, JSON.stringify({ world, level }));
  }
  award(world: string, island: Island) {
    const rewards = this.rewards();
    if (rewards.some(r => r.world === world && r.node === island.node)) return;
    rewards.push({ world, node: island.node, kind: island.kind === 1 ? 'plant' : 'upgrade', id: island.kind === 1 ? island.plant : island.upgrade });
    this.storage.setItem(REWARDS_KEY, JSON.stringify(rewards));
  }
  finishPresentation() { this.storage.removeItem(PENDING_KEY); }
}

export interface MapEvent { at: number; node: number; action: 'finish' | 'path' | 'open' | 'reward' }
// WorldMap.ts: Finish -> 0.5s -> Push -> 0.5s -> unlock.
// Plant/upgrade nodes grant their reward and push the next path immediately.
export function completionEvents(map: WorldMap, level: string, completed: ReadonlySet<string>, rewards: ReadonlySet<number>): MapEvent[] {
  const before = new Set(completed); before.delete(level);
  const states = islandStates(map, before, rewards);
  const first = map.islands.find(n => n.kind === 0 && n.levels.includes(level))!;
  const events: MapEvent[] = [{ at: 0, node: first.node, action: 'finish' }];
  const visited = new Set<number>();
  const push = (island: Island, at: number) => {
    if (visited.has(island.node)) return;
    visited.add(island.node);
    if (island.next.length) events.push({ at, node: island.node, action: 'path' });
    for (const id of island.next) {
      const next = map.islands.find(n => n.node === id)!;
      if (next.kind === 0) {
        if (states.get(id) !== 'finished') events.push({ at: at + .5, node: id, action: 'open' });
      } else if (next.kind === 1 || next.kind === 3) {
        events.push({ at: at + .5, node: id, action: 'reward' });
        push(next, at + .5);
      } else { push(next,at+.5); }
    }
  };
  push(first, .5);
  return events.sort((a, b) => a.at - b.at);
}
