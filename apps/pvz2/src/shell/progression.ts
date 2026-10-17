import { islandStates } from './navigation';
import type { Island, WorldMap } from './types';

const completionKey = (level: string) => `pvz2-web:${level}-complete`;
const REWARDS_KEY = 'pvz2-web:map-rewards';
const PENDING_KEY = 'pvz2-web:pending-map-completion';
export interface MapReward { world: string; node: number; kind: 'plant' | 'upgrade'; id: number }
export interface PendingCompletion { world: string; level: string }
export class ProgressStore {
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>) {}
  isComplete(level: string) { return this.storage.getItem(completionKey(level)) === '1'; }
  completed(map: WorldMap) { return new Set(map.islands.flatMap(n => n.levels).filter(id => this.isComplete(id))); }
  rewards(): MapReward[] {
    const saved = this.storage.getItem(REWARDS_KEY);
    return saved === null ? [] : JSON.parse(saved);
  }
  rewardNodes(world: string) { return new Set(this.rewards().filter(r => r.world === world).map(r => r.node)); }
  ownedPlants() { return new Set([0, 1, 2, 3, ...this.rewards().filter(r => r.kind === 'plant').map(r => r.id)]); }
  pending(): PendingCompletion | null {
    const saved = this.storage.getItem(PENDING_KEY);
    return saved === null ? null : JSON.parse(saved);
  }
  campaignRewards():{level:string;type:'worldtrophy'|'pinata'|'sprout'|'note'|'coinbag';id:string;count:number}[]{
    const saved=this.storage.getItem('pvz2-web:campaign-rewards');return saved===null?[]:JSON.parse(saved);
  }
  worldKeys(){return this.campaignRewards().filter(r=>r.type==='worldtrophy'&&r.id==='worldkey').reduce((n,r)=>n+r.count,0);}
  finish(world: string, level: string, sprouts=0) {
    if (this.isComplete(level)) return;
    if(['egypt4','egypt6','egypt7','egypt8','egypt10','egypt11','egypt12','egypt14','egypt15','egypt16'].includes(level)||level==='egypt5'&&sprouts>0){
      const rewards=this.campaignRewards();
      if(level==='egypt4')rewards.push({level,type:'worldtrophy',id:'powerupgadget',count:1});
      if(level==='egypt12')rewards.push({level,type:'worldtrophy',id:'dangerroom_egypt',count:1});
      if(level==='egypt7')rewards.push({level,type:'note',id:'note_egypt',count:1});
      if(level==='egypt8')rewards.push({level,type:'worldtrophy',id:'worldkey',count:1});
      if(['egypt10','egypt14','egypt16'].includes(level))rewards.push({level,type:'coinbag',id:'CoinBag',count:1});
      if(level==='egypt6'||level==='egypt11'||level==='egypt15')rewards.push({level,type:'pinata',id:'spine_egypt',count:1});
      if(level==='egypt5')rewards.push({level,type:'sprout',id:'sprout',count:sprouts});
      this.storage.setItem('pvz2-web:campaign-rewards',JSON.stringify(rewards));
    }
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
