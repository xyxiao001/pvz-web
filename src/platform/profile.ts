import type { LevelId, PlantKind } from '../game/config';
import type { CampaignRules } from '../game/campaign';

export const SHOP = [
  { id: 'slots', name: '种子卡槽', price: 750, level: 25, description: '增加一个冒险选卡槽，最多携带十张卡。', icon: 'shop-slots' },
  { id: 'poolCleaner', name: '泳池清理车', price: 1000, level: 25, description: '水路割草机可驶过整个泳池，不再入水沉没。', icon: 'pool-cleaner' },
  { id:'rake',name:'钉耙',price:200,level:25,description:'在接下来三场适用战斗中各放置一把钉耙，迎击第一只经过的僵尸。',icon:'shop-rake' },
  { id: 'roofCleaner', name: '屋顶清理车', price: 3000, level: 42, description: '每条屋顶道路增加一辆清理车。', icon: 'shop-roof' },
  { id: 'gatlingpea', name: '机枪射手', price: 5000, level: 25, description: '升级双发射手，一轮连续发射四颗豌豆。', icon: 'gatlingpea' },
  { id: 'twinsunflower', name: '双子向日葵', price: 5000, level: 25, description: '升级向日葵，每次生产两份阳光。', icon: 'twinsunflower' },
  {id:'gloomshroom',name:'忧郁菇',price:7500,level:35,description:'升级大喷菇，向周围喷射四轮孢子。',icon:'gloomshroom'},
  {id:'cattail',name:'香蒲',price:10000,level:35,description:'升级睡莲，用追踪尖刺攻击全场僵尸。',icon:'cattail'},
  {id:'spikerock',name:'地刺王',price:7500,level:41,description:'升级地刺，加倍攻击，可多次承受碾压。',icon:'spikerock'},
  {id:'goldmagnet',name:'吸金磁',price:3000,level:41,description:'升级磁力菇，自动收集金币。',icon:'goldmagnet'},
  { id: 'wintermelon', name: '冰西瓜', price: 10000, level: 51, description: '升级西瓜投手，范围伤害并使僵尸减速。', icon: 'wintermelon' },
  {id:'cobcannon',name:'玉米加农炮',price:20000,level:51,description:'升级同排相邻两株玉米投手，点击发射范围炮弹。',icon:'cobcannon'},
  {id:'imitater',name:'模仿者',price:30000,level:51,description:'复制一种普通植物，增加一张独立冷却的同类卡片。',icon:'imitater'},
  { id: 'firstAid', name: '坚果包扎术', price: 2000, level: 51, description: '在生命低于三分之二的坚果、高坚果、南瓜上种同类植物，恢复生命。', icon: 'shop-firstaid' },
] as const;
export type ShopItem = typeof SHOP[number]['id'];
export interface ProfileData {
  run: number; nextLevel: LevelId; completed: number; money: number;
  purchases: Record<ShopItem, number>; declinedSlots: number; sawYeti: boolean; tacoReceived:boolean; tacoPending:boolean; storeIntroduced:boolean;
}
export const PROFILE_KEY = 'pvz-web:profile:v1';
export class PlayerProfile {
  data: ProfileData;
  constructor(private storage: Pick<Storage,'getItem'|'setItem'>) {
    const saved = storage.getItem(PROFILE_KEY);
    if (saved !== null) this.data = JSON.parse(saved);
    else {
      // One-time import of the existing adventure progress, not a new/free completion.
      const old = storage.getItem('pvz-web:adventure:v1');
      const completed = old === null ? 0 : Number(old.split('-')[1]);
      this.data = { run: completed === 50 ? 2 : 1, nextLevel: (completed === 50 ? 1 : completed+1) as LevelId,
        completed: completed === 50 ? 0 : completed, money: 0,
        purchases: {rake:0,slots:0,gatlingpea:0,twinsunflower:0,wintermelon:0,poolCleaner:0,roofCleaner:0,firstAid:0,gloomshroom:0,cattail:0,goldmagnet:0,spikerock:0,cobcannon:0,imitater:0}, declinedSlots:0, sawYeti:false, tacoReceived:false, tacoPending:completed>=34, storeIntroduced:false };
      this.save();
    }
  }
  save() { this.storage.setItem(PROFILE_KEY,JSON.stringify(this.data)); }
  get storeOpen() { return this.data.run > 1 || this.data.nextLevel >= 25; }
  price(id: ShopItem) { return id === 'slots' ? [750,5000,20000,80000][this.data.purchases.slots] : SHOP.find(item=>item.id===id)!.price; }
  available(id: ShopItem) { return this.data.run > 1 || this.data.nextLevel >= SHOP.find(item=>item.id===id)!.level; }
  soldOut(id: ShopItem) { return this.data.purchases[id] >= (id==='slots'?4:1); }
  buy(id: ShopItem, offer = false) {
    // The purchase boundary enforces the same rules displayed on StoreScreen.
    if (!(offer && id==='slots') && !this.available(id) || this.soldOut(id) || this.data.money < this.price(id)) return false;
    this.data.money -= this.price(id); this.data.purchases[id]+=id==='rake'?3:1; this.save(); return true;
  }
  addMoney(amount: number) { if (amount === 0) return; this.data.money += amount; this.save(); }
  finish(level: LevelId, run: number) {
    if (run !== this.data.run) return;
    if(run===1&&level===34&&!this.data.tacoReceived)this.data.tacoPending=true;
    if (level === 50) { this.data.run++; this.data.completed=0; this.data.nextLevel=1; }
    else { this.data.completed=Math.max(this.data.completed,level); this.data.nextLevel=(this.data.completed+1) as LevelId; }
    this.save();
  }
  rules(): CampaignRules {
    return {sawYeti:this.data.sawYeti,rake:this.data.purchases.rake>0,run:this.data.run,slots:6+this.data.purchases.slots,
      upgrades: (['gatlingpea','twinsunflower','wintermelon','gloomshroom','cattail','goldmagnet','spikerock','cobcannon','imitater'] as PlantKind[]).filter(kind=>this.data.purchases[kind as ShopItem]>0),
      roofCleaner:!!this.data.purchases.roofCleaner,poolCleaner:!!this.data.purchases.poolCleaner,
      firstAid:!!this.data.purchases.firstAid,tutorial:this.data.run===1};
  }
}
