import { MUSHROOMS, PLANTS, TICK_MS, UPGRADES, isUpgrade, type PlantKind, type ZombieKind } from './config';
import { ZOMBIE_NAMES } from './survival';
import { PLANT_DESCRIPTIONS } from './plant-descriptions';
import { BOSS_HEALTH } from './boss';

export const PLANT_GROUPS: { name: string; kinds: PlantKind[] }[] = [
  { name:'白天', kinds:['peashooter','sunflower','cherrybomb','wallnut','potatomine','snowpea','chomper','repeater'] },
  { name:'夜晚', kinds:['puffshroom','sunshroom','fumeshroom','gravebuster','hypnoshroom','scaredyshroom','iceshroom','doomshroom'] },
  { name:'泳池', kinds:['lilypad','squash','threepeater','tanglekelp','jalapeno','spikeweed','torchwood','tallnut'] },
  { name:'迷雾', kinds:['seashroom','plantern','cactus','blover','splitpea','starfruit','pumpkin','magnetshroom'] },
  { name:'屋顶', kinds:['cabbagepult','flowerpot','kernelpult','coffeebean','garlic','umbrella','marigold','melonpult'] },
  { name:'升级', kinds:['gatlingpea','twinsunflower','gloomshroom','cattail','wintermelon','goldmagnet','spikerock','cobcannon'] },
  { name:'特殊', kinds:['imitater','explodenut'] },
];

type ZombieEntry = { group: string; health: number; armor: number; shield: number; trait: string; counter: string };
// Base bodies and equipment correspond to Game.spawnZombie; special level modifiers are excluded.
export const ZOMBIE_ENTRIES: Record<ZombieKind, ZombieEntry> = {
  normal: {group:'庭院',health:270,armor:0,shield:0,trait:'沿着所在草坪前进，遇到植物就停下啃食。',counter:'用射手持续攻击，坚果墙可以为后排争取时间。'},
  flag: {group:'庭院',health:270,armor:0,shield:0,trait:'举着旗帜出现在大波僵尸中，前进比普通僵尸更快。',counter:'留意波次进度，提前准备火力或范围攻击。'},
  cone: {group:'庭院',health:270,armor:370,shield:0,trait:'路障提供额外护甲，破损后继续前进。',counter:'增加射手火力，或用土豆雷、窝瓜处理。'},
  pole: {group:'突袭',health:500,armor:0,shield:0,trait:'持杆快跑，跳过遇到的第一株可跨越植物后改为步行。',counter:'高坚果可以拦住跳跃；也可用便宜植物消耗它的撑杆。'},
  bucket: {group:'庭院',health:270,armor:1100,shield:0,trait:'铁桶能承受大量正面伤害。',counter:'磁力菇可吸走铁桶；也可用爆炸植物快速处理。'},
  newspaper: {group:'庭院',health:270,armor:0,shield:150,trait:'报纸挡住正面攻击；报纸被打坏后，会短暂停顿并愤怒加速。',counter:'大喷菇与投手可以绕过报纸，避免只靠低火力慢慢打。'},
  door: {group:'庭院',health:270,armor:0,shield:1100,trait:'铁栅门抵挡正面弹丸，但挡不住穿透攻击与抛射物。',counter:'使用大喷菇或投手；磁力菇也能吸走铁门。'},
  football: {group:'庭院',health:270,armor:1400,shield:0,trait:'穿戴坚固头盔，快速冲向防线。',counter:'磁力菇拆掉头盔，配合减速和集中火力。'},
  dancer: {group:'召唤',health:500,armor:0,shield:0,trait:'停下跳舞并召唤伴舞，伴舞被击败后还会补充。',counter:'优先解决舞王，范围攻击可以一并清理伴舞。'},
  backup: {group:'召唤',health:270,armor:0,shield:0,trait:'由舞王召唤，跟随舞队一起推进。',counter:'清理伴舞的同时攻击舞王，减少反复召唤。'},
  ducky: {group:'水路',health:270,armor:0,shield:0,trait:'借助救生圈在泳池水路前进；水路中还可能遇到路障和铁桶装束。',counter:'睡莲承载射手组成水路防线，缠绕海草可直接拖走敌人。'},
  snorkel: {group:'水路',health:270,armor:0,shield:0,trait:'潜入水中前进，潜水时躲过普通直线弹丸，进食时浮出水面。',counter:'用缠绕海草处理，或等它在坚果前浮出水面。'},
  zomboni: {group:'机械',health:1350,armor:0,shield:0,trait:'碾压植物并留下冰道，冰道上不能种植。',counter:'地刺可以扎破冰车；火爆辣椒可以清除整排冰道。'},
  bobsled: {group:'机械',health:270,armor:0,shield:0,trait:'小队乘雪橇沿冰道滑行，离开雪橇后各自步行。这里的生命值按单只成员计算。',counter:'先处理冰车和冰道，再用范围攻击清理小队。'},
  dolphin: {group:'水路',health:500,armor:0,shield:0,trait:'骑着海豚高速游动，可跳过水路前方的一株植物。',counter:'用高坚果拦住跳跃，或在起跳前用缠绕海草处理。'},
  jack: {group:'突袭',health:500,armor:0,shield:0,trait:'携带玩偶匣前进，开盒后爆炸，摧毁附近植物。',counter:'尽早消灭它，磁力菇可以吸走玩偶匣。'},
  balloon: {group:'突袭',health:270,armor:0,shield:0,trait:'借气球飞过地面防线，气球破裂后落地步行。',counter:'仙人掌或香蒲可以扎破气球，三叶草可以直接吹走。'},
  digger: {group:'突袭',health:270,armor:100,shield:0,trait:'从地下穿过草坪，到左侧钻出后回头攻击。',counter:'裂荚射手可以防守后方，磁力菇可吸走矿镐。'},
  pogo: {group:'突袭',health:270,armor:0,shield:0,trait:'使用弹跳杆不断跳过植物。',counter:'高坚果阻挡跳跃，磁力菇可以吸走弹跳杆。'},
  bungee: {group:'突袭',health:450,armor:0,shield:0,trait:'从空中降落，瞄准植物并将它偷走。',counter:'叶子保护伞可以保护周围九格，寒冰菇可以争取反应时间。'},
  ladder: {group:'突袭',health:500,armor:0,shield:500,trait:'携带梯子快速前进，遇到防御植物时架梯，让后续僵尸越过。',counter:'磁力菇移除梯子，或在架梯前用投手集中攻击。'},
  catapult: {group:'机械',health:850,armor:0,shield:0,trait:'停在远处向植物投掷篮球，弹药耗尽后向前推进。',counter:'叶子保护伞可以挡住篮球，爆炸植物能迅速处理车辆。'},
  gargantuar: {group:'巨人与首领',health:3000,armor:0,shield:0,trait:'挥动重物砸毁植物，受伤后会将背上的小鬼投向后排。',counter:'准备多次高伤害攻击，并在后排预留应对小鬼的火力。'},
  imp: {group:'巨人与首领',health:270,armor:0,shield:0,trait:'被巨人投进后排，落地后开始啃食附近植物。',counter:'用后排射手、窝瓜或樱桃炸弹及时清理。'},
  yeti: {group:'特殊',health:1350,armor:0,shield:0,trait:'在二周目特定关卡出现，停留一段时间后会逃走。',counter:'在它逃离前集中火力，击败后收集掉落的钻石。'},
};

export type AlmanacEntry = { id: string; name: string; group: string; image: string; stats: [string,string][]; description: string; noteTitle: string; note: string };
export function plantAlmanac(): AlmanacEntry[] {
  return PLANT_GROUPS.flatMap(group => group.kinds.map(kind => {
    const plant = PLANTS[kind];
    return { id:kind, name:plant.name, group:group.name, image:`hd4/original/${kind}.webp`,
      stats:[['阳光',kind==='explodenut'?'传送带专用':kind==='imitater'?'随复制植物':String(plant.cost)],['冷却',kind==='explodenut'?'无需冷却':kind==='imitater'?'随复制植物':`${plant.cooldown*TICK_MS/1000} 秒`],['生命',String(plant.health)]] as [string,string][],
      description:PLANT_DESCRIPTIONS[kind], noteTitle:'种植提示',
      note:kind==='cobcannon'?'需要同排相邻两株玉米投手，占用两格。':isUpgrade(kind)?`种在${PLANTS[UPGRADES[kind]].name}上完成升级。`:kind==='explodenut'?'仅在保龄球玩法的传送带中供应。':kind==='imitater'?'选卡时指定复制目标，种下后变身为该植物。':kind==='gravebuster'?'直接种在墓碑上，吞噬完成后消失。':MUSHROOMS.includes(kind)?'白天会睡觉，需要咖啡豆唤醒。':kind==='lilypad'?'先在水面放置睡莲，再种植陆生植物。':kind==='flowerpot'?'在屋顶先放置花盆，再种植植物。':'数值为基础属性；特殊关卡与升级规则以当前战斗为准。',
    };
  }));
}
export function zombieAlmanac(): AlmanacEntry[] {
  const entries: AlmanacEntry[] = (Object.keys(ZOMBIE_ENTRIES) as ZombieKind[]).map(kind => {
    const z=ZOMBIE_ENTRIES[kind];
    return {id:kind,name:ZOMBIE_NAMES[kind],group:z.group,image:kind==='yeti'?'original/yeti.webp':`almanac/${kind}.webp`,
      stats:[['本体生命',String(z.health)],['护甲',String(z.armor)],['盾牌',String(z.shield)]] as [string,string][],
      description:z.trait,noteTitle:'应对方式',note:z.counter};
  });
  entries.push({id:'boss',name:'僵王博士',group:'巨人与首领',image:'boss/ZOMBIE_BOSS_HEAD.webp',stats:[['生命',String(BOSS_HEALTH)],['出没','屋顶决战']],description:'操纵巨型机器召唤僵尸、踩踏植物并投出冰火球。只有低头阶段可以受到伤害。',noteTitle:'应对方式',note:'保留寒冰菇消灭火球，保留火爆辣椒消灭冰球；低头时集中攻击。'});
  return entries;
}
