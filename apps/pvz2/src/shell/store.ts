import type { SpriteArt } from './types';

export type StoreCategory = 'Plants' | 'Upgrade' | 'Coin' | 'Gem';
export interface StoreItem {
  id: string; category: StoreCategory; type: 'plant' | 'upgrade' | 'coin' | 'gem';
  name: string; label: string; currency: 'coin' | 'gem'; price: number; count: number;
  unlockLevel?: string; plant?: number; upgrade?: number; animation?: string; description?: string;
}
export interface StoreCatalog { rig: string; art: Record<string, SpriteArt>; items: StoreItem[] }
export interface Wallet { coin: number; gem: number; ticket: number; plants: number[]; upgrades: number[] }
const WALLET_KEY = 'pvz2-web:wallet';
export class LocalStore {
  constructor(private storage: Pick<Storage, 'getItem' | 'setItem'>) {
    if (storage.getItem(WALLET_KEY) === null) this.save({ coin: 0, gem: 99999, ticket: 0, plants: [], upgrades: [] });
  }
  read(): Wallet { return JSON.parse(this.storage.getItem(WALLET_KEY)!); }
  private save(wallet: Wallet) { this.storage.setItem(WALLET_KEY, JSON.stringify(wallet)); }
  owned(item: StoreItem) {
    const wallet = this.read();
    return item.type === 'plant' ? wallet.plants.includes(item.plant!) : item.type === 'upgrade' && wallet.upgrades.includes(item.upgrade!);
  }
  canBuy(item: StoreItem, completed: (level: string) => boolean) {
    return !this.owned(item) && (!item.unlockLevel || completed(item.unlockLevel)) && this.read()[item.currency] >= item.price;
  }
  buy(item: StoreItem, completed: (level: string) => boolean) {
    if (!this.canBuy(item, completed)) return false;
    const wallet = this.read();
    wallet[item.currency] -= item.price;
    if (item.type === 'plant') wallet.plants.push(item.plant!);
    else if (item.type === 'upgrade') wallet.upgrades.push(item.upgrade!);
    else wallet[item.type] += item.count;
    this.save(wallet);
    return true;
  }
}
