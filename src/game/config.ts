import portable from './data/portable-adventure.json';
// Behavioral reference: PvZ-Portable 141c1476. Source locations in docs/BASELINE.md.
export const TICK_MS = 10;
export const BOARD = { width: 800, height: 600, left: 40, top: 80, cellWidth: 80, cellHeight: 100, columns: 9 };
export type PlantKind = 'peashooter' | 'sunflower' | 'cherrybomb' | 'wallnut' | 'potatomine' | 'snowpea' | 'explodenut' | 'chomper' | 'repeater' | 'puffshroom' | 'sunshroom' | 'fumeshroom' | 'gravebuster' | 'hypnoshroom' | 'scaredyshroom' | 'iceshroom' | 'doomshroom' | 'lilypad' | 'squash' | 'threepeater' | 'plantern' | 'tanglekelp';
export type ZombieKind = 'normal' | 'cone' | 'flag' | 'pole' | 'bucket' | 'newspaper' | 'door' | 'football' | 'dancer' | 'backup' | 'ducky' | 'snorkel';
export type LevelId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25;
export type SurvivalScene = 'day' | 'night' | 'pool' | 'fog';
export const SCENE_NAMES: Record<SurvivalScene, string> = { day: '白天庭院', night: '夜晚庭院', pool: '泳池', fog: '迷雾泳池' };
export const SURVIVAL_SCENES: SurvivalScene[] = ['day', 'night', 'pool', 'fog'];
export const isPool = (environment: SurvivalScene) => environment === 'pool' || environment === 'fog';
export const isNight = (environment: SurvivalScene) => environment === 'night' || environment === 'fog';
export const MUSHROOMS: readonly PlantKind[] = ['puffshroom','sunshroom','fumeshroom','hypnoshroom','scaredyshroom','iceshroom','doomshroom'];
export const PLANTS = {
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
  environment: SurvivalScene; label: string; title: string; description: string; rows: readonly number[]; initialSun: number;
  mode: 'lawn' | 'bowling' | 'conveyor' | 'whack'; seeds: readonly PlantKind[]; waveCount: number; reward: PlantKind | null;
}
// Day lawn survival, restricted to the eight migrated daytime plants.
export const ENDLESS: LevelConfig = {
  environment: 'day', mode: 'lawn', label: '无尽', title: '白天庭院无尽 · 先行版',
  description: '每轮 20 波，守住两面旗后重新选择六张卡。植物、阳光与割草机状态保留，僵尸逐轮增多。',
  rows: [0, 1, 2, 3, 4], initialSun: 50,
  seeds: ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea', 'chomper', 'repeater'],
  waveCount: 20, reward: null,
};
export function endlessConfig(scene: SurvivalScene): LevelConfig {
  const daytime: PlantKind[] = [...ENDLESS.seeds, 'squash', 'threepeater'];
  const seeds: PlantKind[] = isNight(scene) ? [...daytime, ...MUSHROOMS] : daytime;
  if (scene === 'night') seeds.push('gravebuster');
  if (isPool(scene)) seeds.push('lilypad','tanglekelp');
  if (scene === 'fog') seeds.push('plantern');
  return { ...ENDLESS, environment: scene, title: `${SCENE_NAMES[scene]}无尽`, seeds,
    rows: isPool(scene) ? [0,1,2,3,4,5] : [0,1,2,3,4] };
}
const nightSeeds: PlantKind[] = [...ENDLESS.seeds, 'puffshroom','sunshroom','fumeshroom','gravebuster','hypnoshroom','scaredyshroom'];
const poolSeeds: PlantKind[] = [...nightSeeds, 'iceshroom','doomshroom','lilypad'];
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
  25: { environment: 'pool', mode: 'conveyor', label: '3–5', title: '小僵尸大麻烦', description: '僵尸体型与生命变小，数量却大幅增加。使用传送带的睡莲、坚果、豌豆射手与樱桃炸弹守住泳池！', rows: [0,1,2,3,4,5], initialSun: 0, seeds: ['lilypad','wallnut','peashooter','cherrybomb'], waveCount: portable.waveCounts[24], reward: null },
};
export const LEVEL_IDS: LevelId[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];
export const cellX = (column: number) => BOARD.left + column * BOARD.cellWidth + 40;
export const rowY = (row: number) => BOARD.top + row * BOARD.cellHeight + 78;
