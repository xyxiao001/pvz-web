import portable from './data/portable-adventure.json';
// Behavioral reference: PvZ-Portable 141c1476. Source locations in docs/BASELINE.md.
export const TICK_MS = 10;
export const BOARD = { width: 800, height: 600, left: 40, top: 80, cellWidth: 80, cellHeight: 100, columns: 9 };
export type BasePlantKind = 'peashooter' | 'sunflower' | 'cherrybomb' | 'wallnut' | 'potatomine' | 'snowpea' | 'explodenut' | 'chomper' | 'repeater' | 'puffshroom' | 'sunshroom' | 'fumeshroom' | 'gravebuster' | 'hypnoshroom' | 'scaredyshroom' | 'iceshroom' | 'doomshroom' | 'lilypad' | 'squash' | 'threepeater' | 'plantern' | 'tanglekelp' | 'jalapeno' | 'spikeweed' | 'torchwood' | 'tallnut' | 'seashroom' | 'cactus' | 'blover' | 'splitpea' | 'starfruit' | 'pumpkin' | 'magnetshroom' | 'cabbagepult' | 'flowerpot' | 'kernelpult' | 'coffeebean' | 'garlic' | 'umbrella' | 'marigold' | 'melonpult';
export const UPGRADES = { gatlingpea: 'repeater', twinsunflower: 'sunflower', wintermelon: 'melonpult' } as const;
export type UpgradeKind = keyof typeof UPGRADES;
export type PlantKind = BasePlantKind | UpgradeKind;
export const isUpgrade = (kind: PlantKind): kind is UpgradeKind => kind in UPGRADES;
export type ZombieKind = 'normal' | 'cone' | 'flag' | 'pole' | 'bucket' | 'newspaper' | 'door' | 'football' | 'dancer' | 'backup' | 'ducky' | 'snorkel' | 'zomboni' | 'bobsled' | 'dolphin' | 'jack' | 'balloon' | 'digger' | 'pogo' | 'bungee' | 'ladder' | 'catapult' | 'gargantuar' | 'imp';
export type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 | 27 | 28 | 29 | 30 | 31 | 32 | 33 | 34 | 35 | 36 | 37 | 38 | 39 | 40 | 41 | 42 | 43 | 44 | 45 | 46 | 47 | 48 | 49 | 50;
export type SurvivalMode = 'endless' | 'survival-normal' | 'survival-hard';
export const SURVIVAL_MODES: SurvivalMode[] = ['survival-normal', 'survival-hard', 'endless'];
export const SURVIVAL_MODE_NAMES: Record<SurvivalMode, string> = { 'survival-normal': '普通', 'survival-hard': '困难', endless: '无尽' };
export type SurvivalScene = 'day' | 'night' | 'pool' | 'fog' | 'roof';
export const SCENE_NAMES: Record<SurvivalScene, string> = { day: '白天庭院', night: '夜晚庭院', pool: '泳池', fog: '迷雾泳池', roof: '屋顶' };
export const SURVIVAL_SCENES: SurvivalScene[] = ['day', 'night', 'pool', 'fog', 'roof'];
export type Environment = SurvivalScene | 'roof';
export const isPool = (environment: Environment) => environment === 'pool' || environment === 'fog';
export const isNight = (environment: Environment) => environment === 'night' || environment === 'fog';
export const MUSHROOMS: readonly PlantKind[] = ['puffshroom','sunshroom','fumeshroom','hypnoshroom','scaredyshroom','iceshroom','doomshroom','seashroom','magnetshroom'];
export const PLANTS = {
  wintermelon: { name: '冰西瓜', cost: 200, cooldown: 5000, health: 300, interval: 300 },
  gatlingpea: { name: '机枪射手', cost: 250, cooldown: 5000, health: 300, interval: 150 },
  twinsunflower: { name: '双子向日葵', cost: 150, cooldown: 5000, health: 300, interval: 2500 },
  umbrella: { name: '叶子保护伞', cost: 100, cooldown: 750, health: 300, interval: 0 },
  marigold: { name: '金盏花', cost: 50, cooldown: 3000, health: 300, interval: 2500 },
  melonpult: { name: '西瓜投手', cost: 300, cooldown: 750, health: 300, interval: 300 },
  splitpea: { name: '裂荚射手', cost: 125, cooldown: 750, health: 300, interval: 150 },
  starfruit: { name: '杨桃', cost: 125, cooldown: 750, health: 300, interval: 150 },
  pumpkin: { name: '南瓜头', cost: 125, cooldown: 3000, health: 4000, interval: 0 },
  magnetshroom: { name: '磁力菇', cost: 100, cooldown: 750, health: 300, interval: 1500 },
  cabbagepult: { name: '卷心菜投手', cost: 100, cooldown: 750, health: 300, interval: 300 },
  flowerpot: { name: '花盆', cost: 25, cooldown: 750, health: 300, interval: 0 },
  kernelpult: { name: '玉米投手', cost: 100, cooldown: 750, health: 300, interval: 300 },
  coffeebean: { name: '咖啡豆', cost: 75, cooldown: 750, health: 300, interval: 100 },
  garlic: { name: '大蒜', cost: 50, cooldown: 750, health: 400, interval: 0 },

  jalapeno: { name: '火爆辣椒', cost: 125, cooldown: 5000, health: 300, interval: 100 },
  spikeweed: { name: '地刺', cost: 100, cooldown: 750, health: 300, interval: 100 },
  torchwood: { name: '火炬树桩', cost: 175, cooldown: 750, health: 300, interval: 0 },
  tallnut: { name: '高坚果', cost: 125, cooldown: 3000, health: 8000, interval: 0 },
  seashroom: { name: '海蘑菇', cost: 0, cooldown: 3000, health: 300, interval: 150 },
  cactus: { name: '仙人掌', cost: 125, cooldown: 750, health: 300, interval: 150 },
  blover: { name: '三叶草', cost: 100, cooldown: 750, health: 300, interval: 50 },
  tanglekelp: { name: '缠绕海草', cost: 25, cooldown: 3000, health: 300, interval: 0 },
  iceshroom: { name: '寒冰菇', cost: 75, cooldown: 5000, health: 300, interval: 100 },
  doomshroom: { name: '毁灭菇', cost: 125, cooldown: 5000, health: 300, interval: 100 },
  lilypad: { name: '睡莲', cost: 25, cooldown: 750, health: 300, interval: 0 },
  squash: { name: '窝瓜', cost: 50, cooldown: 3000, health: 300, interval: 0 },
  threepeater: { name: '三线射手', cost: 325, cooldown: 750, health: 300, interval: 150 },
  plantern: { name: '路灯花', cost: 25, cooldown: 3000, health: 300, interval: 0 },
  hypnoshroom: { name: '魅惑菇', cost: 75, cooldown: 3000, health: 300, interval: 0 },
  scaredyshroom: { name: '胆小菇', cost: 25, cooldown: 750, health: 300, interval: 150 },
  puffshroom: { name: '小喷菇', cost: 0, cooldown: 750, health: 300, interval: 150 },
  sunshroom: { name: '阳光菇', cost: 25, cooldown: 750, health: 300, interval: 2500 },
  fumeshroom: { name: '大喷菇', cost: 75, cooldown: 750, health: 300, interval: 150 },
  gravebuster: { name: '墓碑吞噬者', cost: 75, cooldown: 750, health: 300, interval: 400 },
  chomper: { name: '食人花', cost: 150, cooldown: 750, health: 300, interval: 4000 },
  repeater: { name: '双发射手', cost: 200, cooldown: 750, health: 300, interval: 150 },
  peashooter: { name: '豌豆射手', cost: 100, cooldown: 750, health: 300, interval: 150 },
  sunflower: { name: '向日葵', cost: 50, cooldown: 750, health: 300, interval: 2500 },
  cherrybomb: { name: '樱桃炸弹', cost: 150, cooldown: 5000, health: 300, interval: 100 },
  potatomine: { name: '土豆雷', cost: 25, cooldown: 3000, health: 300, interval: 1500 },
  snowpea: { name: '寒冰射手', cost: 175, cooldown: 750, health: 300, interval: 150 },
  explodenut: { name: '爆炸坚果', cost: 0, cooldown: 0, health: 4000, interval: 0 },
  wallnut: { name: '坚果墙', cost: 50, cooldown: 3000, health: 4000, interval: 0 },
} as const;
export interface LevelConfig {
  environment: Environment; label: string; title: string; description: string; rows: readonly number[]; initialSun: number;
  mode: 'lawn' | 'bowling' | 'conveyor' | 'whack' | 'vase'; seeds: readonly PlantKind[]; waveCount: number; reward: PlantKind | null;
}
// Original daytime starter cards also seed the adventure progression.
export const ENDLESS: LevelConfig = {
  environment: 'day', mode: 'lawn', label: '无尽', title: '白天庭院无尽',
  description: '每轮 20 波，守住两面旗后调整六至十张卡。植物、阳光与割草机状态保留，僵尸逐轮增多。',
  rows: [0, 1, 2, 3, 4], initialSun: 50,
  seeds: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea', 'chomper', 'repeater'],
  waveCount: 20, reward: null,
};
export function endlessConfig(scene: SurvivalScene): LevelConfig {
  const seeds = [...new Set(Object.values(LEVELS).flatMap(level => level.seeds))].filter(kind => {
    if (kind === 'explodenut') return false;
    if (['lilypad','tanglekelp','seashroom'].includes(kind)) return isPool(scene);
    if (kind === 'gravebuster') return scene === 'night';
    if (kind === 'plantern') return scene === 'fog';
    if (kind === 'flowerpot') return scene === 'roof';
    if (scene === 'roof' && ['spikeweed','potatomine'].includes(kind)) return false;
    return true;
  });
  return { ...ENDLESS, environment: scene, title: `${SCENE_NAMES[scene]}无尽`, seeds: [...seeds, 'gatlingpea', 'twinsunflower', 'wintermelon'],
    rows: isPool(scene) ? [0,1,2,3,4,5] : [0,1,2,3,4] };
}
// Board::GetNumWavesPerSurvivalStage / IsFinalSurvivalStage: 5×10 or 5×20 waves.
export function survivalConfig(scene: SurvivalScene, mode: SurvivalMode): LevelConfig {
  const config = endlessConfig(scene);
  if (mode === 'endless') return config;
  const normal = mode === 'survival-normal';
  return { ...config, label: `生存 · ${SURVIVAL_MODE_NAMES[mode]}`, title: `${SCENE_NAMES[scene]}生存（${SURVIVAL_MODE_NAMES[mode]}）`,
    waveCount: normal ? 10 : 20,
    description: `守住 ${normal ? 5 : 10} 面旗帜获胜。每轮 ${normal ? 10 : 20} 波，共五轮；轮间保留防线、阳光和冷却，可重新选卡。` };
}
const nightSeeds: PlantKind[] = [...ENDLESS.seeds, 'puffshroom','sunshroom','fumeshroom','gravebuster','hypnoshroom','scaredyshroom'];
const poolSeeds: PlantKind[] = [...nightSeeds, 'iceshroom','doomshroom','lilypad'];
const latePoolSeeds: PlantKind[] = [...poolSeeds,'squash','threepeater','tanglekelp','jalapeno'];
const fogSeeds: PlantKind[] = [...latePoolSeeds,'spikeweed','torchwood','tallnut','seashroom'];
const lateFogSeeds: PlantKind[] = [...fogSeeds,'plantern','cactus','blover','splitpea'];
const roofSeeds: PlantKind[] = ([...lateFogSeeds,'starfruit','pumpkin','magnetshroom','cabbagepult'] as PlantKind[]).filter(k => !['lilypad','seashroom','tanglekelp','spikeweed','gravebuster','potatomine'].includes(k));
const lateRoofSeeds: PlantKind[] = [...roofSeeds,'flowerpot','kernelpult','coffeebean','garlic','umbrella'];
export const LEVELS: Record<LevelId, LevelConfig> = {
  1: { environment: 'day', mode: 'lawn', label: '1–1', title: '第一株守护者', description: '种下豌豆射手，守住中间这条草坪。', rows: [2], initialSun: 150, seeds: ['peashooter'], waveCount: portable.waveCounts[0], reward: 'sunflower' },
  2: { environment: 'day', mode: 'lawn', label: '1–2', title: '让阳光生长', description: '先种向日葵，再用射手守住三条草坪。', rows: [1, 2, 3], initialSun: 50, seeds: ['peashooter', 'sunflower'], waveCount: portable.waveCounts[1], reward: 'cherrybomb' },
  3: { environment: 'day', mode: 'lawn', label: '1–3', title: '樱桃的威力', description: '路障僵尸来了！樱桃炸弹可以炸掉附近三排的僵尸。', rows: [1, 2, 3], initialSun: 50, seeds: ['peashooter', 'sunflower', 'cherrybomb'], waveCount: portable.waveCounts[2], reward: 'wallnut' },
  4: { environment: 'day', mode: 'lawn', label: '1–4', title: '坚果防线', description: '五条草坪全部开放。把坚果种在射手前面，争取攻击时间。', rows: [0, 1, 2, 3, 4], initialSun: 50, seeds: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut'], waveCount: portable.waveCounts[3], reward: null },
  5: { environment: 'day', mode: 'bowling', label: '1–5', title: '坚果保龄球', description: '从传送带拿取坚果，在红线左侧滚出。红色坚果会爆炸！', rows: [0, 1, 2, 3, 4], initialSun: 0, seeds: ['wallnut', 'explodenut'], waveCount: portable.waveCounts[4], reward: 'potatomine' },
  6: { environment: 'day', mode: 'lawn', label: '1–6', title: '撑杆来客', description: '撑杆僵尸会越过第一株植物。提前埋下土豆雷，15 秒后武装。', rows: [0, 1, 2, 3, 4], initialSun: 50, seeds: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine'], waveCount: portable.waveCounts[5], reward: 'snowpea' },
  7: { environment: 'day', mode: 'lawn', label: '1–7', title: '寒冰防线', description: '寒冰射手能减缓僵尸。迎战两面旗帜、20 波僵尸！', rows: [0, 1, 2, 3, 4], initialSun: 50, seeds: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea'], waveCount: portable.waveCounts[6], reward: 'chomper' },
  8: { environment: 'day', mode: 'lawn', label: '1–8', title: '一口吞下铁桶', description: '铁桶拥有厚重护甲。食人花可以吞掉它，但消化期间需要保护。', rows: [0, 1, 2, 3, 4], initialSun: 50, seeds: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea', 'chomper'], waveCount: portable.waveCounts[7], reward: 'repeater' },
  9: { environment: 'day', mode: 'lawn', label: '1–9', title: '双发防线', description: '双发射手连续发射两颗豌豆。搭配食人花与坚果，挡住两面旗帜的进攻。', rows: [0, 1, 2, 3, 4], initialSun: 50, seeds: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea', 'chomper', 'repeater'], waveCount: portable.waveCounts[8], reward: null },
  10: { environment: 'day', mode: 'conveyor', label: '1–10', title: '白天庭院决战', description: '从传送带拿取植物，种在任意空草地。无需阳光，也没有种子冷却，守住两面旗帜！', rows: [0, 1, 2, 3, 4], initialSun: 0, seeds: ['peashooter', 'cherrybomb', 'wallnut', 'repeater', 'snowpea', 'chomper', 'potatomine'], waveCount: portable.waveCounts[9], reward: 'puffshroom' },
  11: { environment: 'night', mode: 'lawn', label: '2–1', title: '夜幕中的小喷菇', description: '夜晚没有天空阳光。免费的小喷菇射程短，配合向日葵建立防线。', rows: [0, 1, 2, 3, 4], initialSun: 50, seeds: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea', 'chomper', 'repeater', 'puffshroom'], waveCount: portable.waveCounts[10], reward: 'sunshroom' },
  12: { environment: 'night', mode: 'lawn', label: '2–2', title: '阳光菇的成长', description: '阳光菇先产 15 点阳光，约两分钟后长大产 25 点。', rows: [0, 1, 2, 3, 4], initialSun: 50, seeds: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea', 'chomper', 'repeater', 'puffshroom', 'sunshroom'], waveCount: portable.waveCounts[11], reward: 'fumeshroom' },
  13: { environment: 'night', mode: 'lawn', label: '2–3', title: '穿过铁栅门', description: '铁栅门挡住豌豆，大喷菇可以穿过门盾，攻击同排多个僵尸。', rows: [0, 1, 2, 3, 4], initialSun: 50, seeds: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea', 'chomper', 'repeater', 'puffshroom', 'sunshroom', 'fumeshroom'], waveCount: portable.waveCounts[12], reward: 'gravebuster' },
  14: { environment: 'night', mode: 'lawn', label: '2–4', title: '清理墓碑', description: '墓碑会在最后一波召出僵尸。把墓碑吞噬者种在墓碑上，提前清理。', rows: [0, 1, 2, 3, 4], initialSun: 50, seeds: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea', 'chomper', 'repeater', 'puffshroom', 'sunshroom', 'fumeshroom', 'gravebuster'], waveCount: portable.waveCounts[13], reward: null },
  15: { environment: 'night', mode: 'whack', label: '2–5', title: '打僵尸', description: '点击僵尸挥动木槌。路障需要两次、铁桶三次；收集掉落阳光，用三张辅助卡清理墓碑和尸群。', rows: [0, 1, 2, 3, 4], initialSun: 0, seeds: ['potatomine', 'gravebuster', 'cherrybomb'], waveCount: portable.waveCounts[14], reward: 'hypnoshroom' },
  16: { environment: 'night', mode: 'lawn', label: '2–6', title: '让对手倒戈', description: '橄榄球僵尸冲来了！让它吃下魅惑菇，转身帮助你阻挡僵尸。', rows: [0, 1, 2, 3, 4], initialSun: 50, seeds: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea', 'chomper', 'repeater', 'puffshroom', 'sunshroom', 'fumeshroom', 'gravebuster', 'hypnoshroom'], waveCount: portable.waveCounts[15], reward: 'scaredyshroom' },
  17: { environment: 'night', mode: 'lawn', label: '2–7', title: '胆小菇的勇气', description: '胆小菇可以攻击整排，但敌人靠近会缩起来。用坚果和魅惑菇保护它。', rows: [0, 1, 2, 3, 4], initialSun: 50, seeds: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea', 'chomper', 'repeater', 'puffshroom', 'sunshroom', 'fumeshroom', 'gravebuster', 'hypnoshroom', 'scaredyshroom'], waveCount: portable.waveCounts[16], reward: 'iceshroom' },
  18: { environment: 'night', mode: 'lawn', label: '2–8', title: '冻结舞池', description: '舞王会召唤伴舞。寒冰菇冻结全场，为防线争取时间。', rows: [0,1,2,3,4], initialSun: 50, seeds: [...nightSeeds,'iceshroom'], waveCount: portable.waveCounts[17], reward: 'doomshroom' },
  19: { environment: 'night', mode: 'lawn', label: '2–9', title: '毁灭的蘑菇', description: '毁灭菇大范围爆炸，原地留下暂时无法种植的弹坑。', rows: [0,1,2,3,4], initialSun: 50, seeds: [...nightSeeds,'iceshroom','doomshroom'], waveCount: portable.waveCounts[18], reward: null },
  20: { environment: 'night', mode: 'conveyor', label: '2–10', title: '夜晚决战', description: '六种蘑菇与墓碑吞噬者从传送带到来，守住夜晚最后两面旗！', rows: [0,1,2,3,4], initialSun: 0, seeds: ['gravebuster','iceshroom','doomshroom','hypnoshroom','scaredyshroom','fumeshroom','puffshroom'], waveCount: portable.waveCounts[19], reward: 'lilypad' },
  21: { environment: 'pool', mode: 'lawn', label: '3–1', title: '泳池初战', description: '六条战线，中间两行是水路。先种睡莲，再在上面种植物；白天蘑菇会睡觉。', rows: [0,1,2,3,4,5], initialSun: 50, seeds: poolSeeds, waveCount: portable.waveCounts[20], reward: 'squash' },
  22: { environment: 'pool', mode: 'lawn', label: '3–2', title: '一跃压倒', description: '窝瓜可以压倒附近的僵尸，水路需要先种睡莲。', rows: [0,1,2,3,4,5], initialSun: 50, seeds: [...poolSeeds,'squash'], waveCount: portable.waveCounts[21], reward: 'threepeater' },
  23: { environment: 'pool', mode: 'lawn', label: '3–3', title: '三线守望', description: '三线射手守住相邻三排。潜水僵尸游泳时避开直射，啃食时才浮出水面。', rows: [0,1,2,3,4,5], initialSun: 50, seeds: [...poolSeeds,'squash','threepeater'], waveCount: portable.waveCounts[22], reward: 'tanglekelp' },
  24: { environment: 'pool', mode: 'lawn', label: '3–4', title: '水下的守护者', description: '缠绕海草直接种在空水面，缠住并拖走一只水路僵尸，也能抓住潜水僵尸。', rows: [0,1,2,3,4,5], initialSun: 50, seeds: [...poolSeeds,'squash','threepeater','tanglekelp'], waveCount: portable.waveCounts[23], reward: null },
  25: { environment: 'pool', mode: 'conveyor', label: '3–5', title: '小僵尸大麻烦', description: '僵尸体型与生命变小，数量却大幅增加。使用传送带的睡莲、坚果、豌豆射手与樱桃炸弹守住泳池！', rows: [0,1,2,3,4,5], initialSun: 0, seeds: ['lilypad','wallnut','peashooter','cherrybomb'], waveCount: portable.waveCounts[24], reward: 'jalapeno' },
  26: { environment: 'pool', mode: 'lawn', label: '3–6', title: '冰车来袭', description: '冰车碾压植物并留下冰道。火爆辣椒烧毁整排敌人，也能清除冰道。', rows: [0,1,2,3,4,5], initialSun: 50, seeds: latePoolSeeds, waveCount: portable.waveCounts[25], reward: 'spikeweed' },
  27: { environment: 'pool', mode: 'lawn', label: '3–7', title: '地刺与冰道', description: '地刺不会被啃食，能扎破冰车轮胎。小心沿冰道滑来的雪橇队！', rows: [0,1,2,3,4,5], initialSun: 50, seeds: [...latePoolSeeds,'spikeweed'], waveCount: portable.waveCounts[26], reward: 'torchwood' },
  28: { environment: 'pool', mode: 'lawn', label: '3–8', title: '火力与海豚', description: '火炬树桩把豌豆变成火球。海豚骑士会跃过第一道水上防线。', rows: [0,1,2,3,4,5], initialSun: 50, seeds: [...latePoolSeeds,'spikeweed','torchwood'], waveCount: portable.waveCounts[27], reward: 'tallnut' },
  29: { environment: 'pool', mode: 'lawn', label: '3–9', title: '高坚果守泳池', description: '高坚果拥有 8000 生命，能挡住撑杆与海豚的跳跃。', rows: [0,1,2,3,4,5], initialSun: 50, seeds: [...latePoolSeeds,'spikeweed','torchwood','tallnut'], waveCount: portable.waveCounts[28], reward: null },
  30: { environment: 'pool', mode: 'conveyor', label: '3–10', title: '泳池决战', description: '八种植物由传送带供应，迎战三面旗帜。地刺和辣椒负责拦截冰车。', rows: [0,1,2,3,4,5], initialSun: 0, seeds: ['lilypad','squash','threepeater','tanglekelp','jalapeno','spikeweed','torchwood','tallnut'], waveCount: portable.waveCounts[29], reward: 'seashroom' },
  31: { environment: 'fog', mode: 'lawn', label: '4–1', title: '迷雾里的盒子', description: '夜晚没有天降阳光。海蘑菇可直接种在水里，小心玩偶匣僵尸爆炸。', rows: [0,1,2,3,4,5], initialSun: 50, seeds: fogSeeds, waveCount: portable.waveCounts[30], reward: 'plantern' },
  32: { environment: 'fog', mode: 'lawn', label: '4–2', title: '照亮迷雾', description: '带上路灯花照亮附近区域，留意迷雾中的玩偶匣。', rows: [0,1,2,3,4,5], initialSun: 50, seeds: [...fogSeeds,'plantern'], waveCount: portable.waveCounts[31], reward: 'cactus' },
  33: { environment: 'fog', mode: 'lawn', label: '4–3', title: '空中的来客', description: '气球僵尸能飞过防线，仙人掌会伸长并扎破气球。', rows: [0,1,2,3,4,5], initialSun: 50, seeds: [...fogSeeds,'plantern','cactus'], waveCount: portable.waveCounts[32], reward: 'blover' },
  34: { environment: 'fog', mode: 'lawn', label: '4–4', title: '吹散黑夜', description: '三叶草吹走飞行中的气球，并暂时吹散全场迷雾。', rows: [0,1,2,3,4,5], initialSun: 50, seeds: [...fogSeeds,'plantern','cactus','blover'], waveCount: portable.waveCounts[33], reward: null },
  35: { environment: 'night', mode: 'vase', label: '4–5', title: '砸罐子', description: '连续破解三组罐子。点击罐子，再拾取掉落的植物卡免费种植；绿罐里一定是植物。', rows: [0,1,2,3,4], initialSun: 0, seeds: ['peashooter','snowpea','squash','hypnoshroom'], waveCount: 3, reward: 'splitpea' },
  36: { environment: 'fog', mode: 'lawn', label: '4–6', title: '后方的矿工', description: '矿工钻到庭院后方再反向进攻，裂荚射手的后脑会连发两颗豌豆。', rows: [0, 1, 2, 3, 4, 5], initialSun: 50, seeds: lateFogSeeds, waveCount: portable.waveCounts[35], reward: 'starfruit' },
  37: { environment: 'fog', mode: 'lawn', label: '4–7', title: '星光防线', description: '杨桃向五个方向发射星星，守护前后与相邻战线。', rows: [0, 1, 2, 3, 4, 5], initialSun: 50, seeds: [...lateFogSeeds,'starfruit'], waveCount: portable.waveCounts[36], reward: 'pumpkin' },
  38: { environment: 'fog', mode: 'lawn', label: '4–8', title: '跳跃的威胁', description: '南瓜头保护同格植物；跳跳僵尸会越过普通防线，高坚果能拦住它。', rows: [0, 1, 2, 3, 4, 5], initialSun: 50, seeds: [...lateFogSeeds,'starfruit','pumpkin'], waveCount: portable.waveCounts[37], reward: 'magnetshroom' },
  39: { environment: 'fog', mode: 'lawn', label: '4–9', title: '磁力守夜', description: '磁力菇吸走金属装备，能够解除跳跳杆、矿镐和铁桶。', rows: [0, 1, 2, 3, 4, 5], initialSun: 50, seeds: [...lateFogSeeds,'starfruit','pumpkin','magnetshroom'], waveCount: portable.waveCounts[38], reward: null },
  40: { environment: 'fog', mode: 'conveyor', label: '4–10', title: '雷雨之夜', description: '闪电照亮庭院，八种植物通过传送带抵达。留意黑暗中的气球、矿工和跳跳僵尸。', rows: [0, 1, 2, 3, 4, 5], initialSun: 0, seeds: ['lilypad','seashroom','magnetshroom','blover','cactus','starfruit','splitpea','pumpkin'], waveCount: portable.waveCounts[39], reward: 'cabbagepult' },
  41: { environment: 'roof', mode: 'lawn', label: '5–1', title: '屋顶初战', description: '植物需要花盆。卷心菜投手可以越过屋顶坡面，留意蹦极偷取植物！', rows: [0, 1, 2, 3, 4], initialSun: 50, seeds: roofSeeds, waveCount: portable.waveCounts[40], reward: 'flowerpot' },
  42: { environment: 'roof', mode: 'lawn', label: '5–2', title: '铺满花盆', description: '用花盆扩展屋顶防线，保护后方的阳光生产。', rows: [0, 1, 2, 3, 4], initialSun: 50, seeds: [...roofSeeds,'flowerpot'], waveCount: portable.waveCounts[41], reward: 'kernelpult' },
  43: { environment: 'roof', mode: 'lawn', label: '5–3', title: '黄油与扶梯', description: '玉米投手偶尔投出定身黄油；扶梯僵尸会给坚果搭梯。', rows: [0, 1, 2, 3, 4], initialSun: 50, seeds: [...roofSeeds,'flowerpot','kernelpult'], waveCount: portable.waveCounts[42], reward: 'coffeebean' },
  44: { environment: 'roof', mode: 'lawn', label: '5–4', title: '唤醒屋顶蘑菇', description: '咖啡豆唤醒白天睡眠的蘑菇，磁力菇可以吸走扶梯。', rows: [0, 1, 2, 3, 4], initialSun: 50, seeds: [...roofSeeds,'flowerpot','kernelpult','coffeebean'], waveCount: portable.waveCounts[43], reward: 'garlic' },
  45: { environment: 'roof', mode: 'conveyor', label: '5–5', title: '蹦极突袭', description: '僵尸从天而降！使用花盆、食人花、南瓜头与樱桃炸弹守住屋顶。', rows: [0, 1, 2, 3, 4], initialSun: 0, seeds: ['flowerpot','chomper','pumpkin','cherrybomb'], waveCount: portable.waveCounts[44], reward: 'umbrella' },
  46: { environment: 'roof', mode: 'lawn', label: '5–6', title: '撑起保护伞', description: '投石车会瞄准后排！叶子保护伞保护周围九格，弹开篮球和蹦极僵尸。', rows: [0,1,2,3,4], initialSun: 50, seeds: lateRoofSeeds, waveCount: portable.waveCounts[45], reward: 'marigold' },
  47: { environment: 'roof', mode: 'lawn', label: '5–7', title: '屋顶的金币', description: '金盏花定期产出钱币。守住投石车和扶梯僵尸的进攻，收集本局金币。', rows: [0,1,2,3,4], initialSun: 50, seeds: [...lateRoofSeeds,'marigold'], waveCount: portable.waveCounts[46], reward: 'melonpult' },
  48: { environment: 'roof', mode: 'lawn', label: '5–8', title: '巨人的脚步', description: '巨人会砸毁植物，受伤后抛出小鬼！西瓜的溅射火力与爆炸植物可以阻挡它。', rows: [0,1,2,3,4], initialSun: 50, seeds: [...lateRoofSeeds,'marigold','melonpult'], waveCount: portable.waveCounts[47], reward: null },
  49: { environment: 'roof', mode: 'lawn', label: '5–9', title: '屋顶最后防线', description: '三面旗帜的屋顶大战。用保护伞守护后方，集中西瓜与爆炸火力迎战巨人。', rows: [0,1,2,3,4], initialSun: 50, seeds: [...lateRoofSeeds,'marigold','melonpult'], waveCount: portable.waveCounts[48], reward: null },
  50: { environment: 'roof', mode: 'conveyor', label: '5–10', title: '僵王博士的复仇', description: '传送带供应六种植物。僵王低头时集中攻击；寒冰菇消除火球，火爆辣椒消除同排冰球。小心蹦极、踩踏和飞来的房车！', rows: [0,1,2,3,4], initialSun: 0, seeds: ['flowerpot','melonpult','jalapeno','cabbagepult','kernelpult','iceshroom'], waveCount: 0, reward: null },
};
export const LEVEL_IDS: LevelId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50];
export const cellX = (column: number) => BOARD.left + column * BOARD.cellWidth + 40;
export const rowY = (row: number) => BOARD.top + row * BOARD.cellHeight + 78;
