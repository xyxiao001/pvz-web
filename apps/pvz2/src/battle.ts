import { playAudio } from './audio';
import { FrameRate, jsHeapBytes } from './performance';
import { readFrameLimit, saveFrameLimit, frameLimitControl, type FrameLimit } from './frame-limit';
import './frame-limit.css';
import './style.css';
import './audio-controls.css';
import { plantReward } from './plant-reward';
import './cursor.css';
import { json, assetUrl } from './assets/load';
import { readAudio, saveAudio, audioControls, updateVolumeControl } from './audio';
import { BOARD, rowY, plantLabels, readLevel, type PlantKind, type Properties, type SourceLevel, type ZombieProperties } from './game/level';
import { Game, type PowerKind } from './game/model';
import type { ProgressStore } from './shell/progression';
import { availablePlants, type BattleLevel } from './game/levels';
import type { Scene } from './rendering/scene';
import { cubicInOut, introCamera } from './rendering/presentation';

const DESCRIPTIONS: Record<PlantKind,string> = {nightshade:'投出三片叶子；月光花强化后可远程攻击并恢复叶片。能量豆连续发射大叶片并永久强化。',shrinkingviolet:'敌人靠近时缩小周围僵尸，使其减速并承受双倍伤害；能量豆影响全场。',bulbkekengi:'照亮周围的迷雾，不会被僵尸啃食；能量豆扩大照明范围，持续15秒。',peacommando:'派出三名飞行突击兵轰击敌人；能量豆派出六名突击兵，发射范围射线。',moonbean:'被吃掉后变成可以点击引爆的阳光炸弹；能量豆向三个目标投出炸弹。',anthurium:'发射电球，吸收周围电荷后发射大电球；能量豆吸收全场电荷并召唤雷电。',skyshooter:'向前发射豌豆，可以种在空中；能量豆连续发射75颗豌豆。',asparagus:'向前方三行敌人连射，弹夹耗尽后装填；能量豆扫射前方三行。',explodeonut:'阻挡僵尸，被消灭时爆炸；能量豆恢复生命并获得会在破裂时爆炸的护甲。',torchwood:'点燃经过的豌豆，灼烧附近僵尸；能量豆升级为蓝火，被消灭时释放十字火焰。',goldbloom:'种下后连续产出三颗阳光，合计375阳光。',primalpotatomine:'短暂准备后爆炸，攻击周围九宫格；能量豆额外投出两枚成熟地雷。',primalsunflower:'生产大颗阳光，每颗价值 75；能量豆一次生产多颗阳光。',perfumeshroom:'释放一整行香气，使恐龙转而帮助植物。',grapeshot:'爆炸攻击周围九宫格，再向八个方向射出会弹跳的葡萄。',primalwallnut:'阻挡僵尸，种植冷却较短；能量豆恢复生命并增加护甲。',gumnut:'粘液桉果用粘液困住附近僵尸，能量豆会把粘液抛向更多目标。',strawburst:'点击爆裂草莓发射浆果，等它长大后再发射，伤害更高。',hollyknight:'冬青骑士可发射三枚叶片。点击它，再选择落点，生成能攻击僵尸的屏障。',loquat:'枇杷短暂旋转，将附近的僵尸聚拢到所在格。',hollybarrierleaf:'冬青叶屏障阻挡并刺伤靠近的僵尸。',hollybarrierleafplantfood:'强化冬青叶屏障有更高的耐久和伤害。',caulipower:'发射追踪光弹，让僵尸转身为你作战；能量豆连续弹飞五个目标。',intensivecarrot:'种在植物被消灭后留下的空格，将该植物以一半生命值复活。',sporeshroom:'投掷孢子；命中过的僵尸死亡后，可在空格生成新菇。能量豆向全场随机目标投出三颗大孢子。',garlic:'让啃咬它的僵尸换到相邻行；能量豆使前方同一行的僵尸换行并眩晕。',thymewarp:'将僵尸送回草坪末列，同时恢复它们的生命和剩余护甲。',phatbeet:'用音波攻击周围僵尸，间歇打出重击；能量豆扩大攻击范围。',cactus:'发射穿透尖刺，僵尸靠近时缩进地下刺击；能量豆强化尖刺。',cantaloupe:'在目标上方泼洒瓜汁，对周围三行僵尸造成伤害，不会被三节棍反弹。能量豆向全场连续投掷。',bamboozle:'点击竹员外，再选落点投出竹筐，伤害僵尸并保护该格植物。五发用完可重新种植补充；能量豆补满并向五行发射。',bamboobusket:'竹筐保护同格植物。',solarsage:'点化接触到的僵尸，让它向右移动并生产阳光；能量豆随机点化三只僵尸。',lychee:'阻挡僵尸，受伤后反击周围敌人；能量豆恢复生命并强化外壳和反击。',powerlily:'种下后产生一颗能量豆。',peach:'治疗周围九宫格内的植物并短暂无敌，能量豆强化治疗并持续保护周围植物。',turnip:'阻挡僵尸和气功，能量豆会撒出新的白萝卜。',bambooshoot:'从地下伸出竹刺，往返攻击前方敌人；能量豆延长射程并击退敌人。',firegourd:'点击喷出火焰；充能越久射程越远，喷火后需要休息。',bloominghearts:'投掷爱心，使被击中的僵尸受到更多伤害。',zoybeanpod:'生长后召唤豆腐僵尸，能量豆召唤豆腐巨人。',snowpea:'发射寒冰豌豆，减慢僵尸速度。',toadstool:'伸出舌头吞食前方僵尸，消化后产生阳光。',akee:'投出能在同一行僵尸之间弹跳的种子。',lavaguava:'敌人靠近时喷发，并留下持续灼烧的熔岩。',gatling:'一次连射四颗豌豆，能量豆增加侧枪并发射三行弹幕。',endurian:'阻挡僵尸并用尖刺攻击接触的敌人，能量豆会增加护甲。',primalpeashooter:'发射原始豌豆，使僵尸短暂眩晕，并有机会击退。',homingthistle:'发射尖刺，追踪草坪上最靠前的僵尸。',bowlingbulb:'滚出三种保龄球，在僵尸之间弹射；消耗后逐个补充。',tool_projectile_bowlingbulb1:'向前滚出蓝色保龄球。',tool_projectile_bowlingbulb2:'向前滚出绿色保龄球。',tool_projectile_bowlingbulb3:'向前滚出橙色保龄球。',tool_projectile_bowlingbulb_explode:'滚出能造成范围伤害的爆炸保龄球。',guacodile:'发射果核，受到攻击时向前冲刺撕咬僵尸。',jackolantern:'喷出火焰，耗尽后休息恢复；能量豆会点燃多个地块。',peanut:'既能发射豌豆，也能抵挡僵尸；受损后射速降低。',sunbean:'被僵尸吃掉后，使它受到伤害时掉落阳光。',fumeshroom:'向前喷出浓雾，穿透多个僵尸。',applemortar:'向三行投掷苹果，击中后使僵尸短暂眩晕。',wasabiwhip:'挥动火焰长鞭，攻击前后的僵尸。',electricblueberry:'召唤雷云，追踪并电击僵尸。',pinkstarfruit:'向五个方向发射星星，根据僵尸位置切换方向。',redstinger:'靠后种植可连续攻击，靠前种植可抵挡更多伤害。',
  firepeashooter:'发射火焰豌豆并为附近植物解冻，能量豆喷射整行火焰。',moonflower:'周围暗影植物越多，产出的阳光越多；能强化附近的暗影植物。',goldleaf:'在地面留下黄金地砖，上面有植物时产生阳光。',ghostpepper:'悬浮攻击附近僵尸，消失时爆炸。',coldsnapdragon:'攻击前方三行并使僵尸减速。',seashooter:'发射三颗豌豆，在水中向上下方目标瞄准。',pineapple:'阻挡僵尸并旋转反弹来袭弹体。',stunion:'释放毒气使前方僵尸眩晕，能量豆可影响前方三行。',pepperpult:'辣椒投手投掷火热的辣椒，并为周围的植物解冻。',hotpotato:'融化所在格的冰块。',
  missiletoe:'点击槲寄冰仙子，再选择落点，对附近僵尸造成伤害并冻结。',seashroom:'海蘑菇免费种植，近距离攻击；在水中的寿命更长。',lilypad:'睡莲可在潮水能够到达的地块种植，承载水上的植物。能量豆会向四周扩展睡莲。',tanglekelp:'缠绕海带只能种在水中，会拖走靠近的僵尸。能量豆可拖走多个水中僵尸。',scaredyshroom:'胆小菇远程发射孢子，僵尸靠近时躲藏。能量豆会让周围的胆小菇一起爆发。',chomper:'大嘴花吞下前方僵尸，消化时仍可再吞一只。',floawerPot:'花盆可以承载植物，阻止巫师将这一格的植物变成羊。空花盆用能量豆强化后，可点击移动。',powerplant:'瓷砖萝卜生成紫色能量瓷砖，种植得越多，阳光费用越高。',holonut:'全息坚果在受损后恢复投影，能量豆可生成整列护盾。',powerplant_alpha:'在地块上生成绿色能量瓷砖。',powerplant_beta:'在地块上生成红色能量瓷砖。',citron:'充能柚子蓄能后发射强力电浆弹。',empea:'电磁桃释放电磁脉冲，使附近的机械僵尸暂时失灵。',laser_bean:'激光豆发射激光，穿透整行僵尸和护盾。',blover:'三叶草吹走所有悬空的僵尸。',shadowshroom:'毒影菇被吃掉后使僵尸中毒，大招让所有僵尸中毒。',stallia:'大丽菊释放香气，让附近僵尸减速。',hurrikale:'飓风甘蓝吹退并冰冷整行僵尸。',sunshroom:'阳光菇逐渐长大，生产更多阳光。',puffshroom:'小喷菇免费种植，近距离攻击，寿命有限。',banana:'点击香蕉火箭炮，再选择落点，轰击附近僵尸。',electriccurrant:'同一行或列的电流醋栗会连接电网。',hypnoshroom:'魅惑菇被吃掉后，让僵尸转身为你作战。',
  starfruit:'杨桃向五个方向发射星星。',electricpeashooter:'电能豌豆发射穿透电球，并向附近的僵尸释放电流。',magnetshroom:'磁力菇吸走僵尸的金属护甲，消化后可以再次吸取。',magnifyinggrass:'点击棱镜草，消耗50阳光发射彩虹光弹。',
  wintermelon:'冰西瓜投出冰瓜，对落点附近的僵尸造成伤害并减速。',splitpea:'裂荚射手向前发射一颗豌豆，向后连射两颗。',chilibean:'巴豆被吃掉后会毒死僵尸，并使它身后的同路僵尸眩晕。',xshot:'旋转芜菁向四个斜向射击。',chardguard:'甜菜护卫可以用叶片把僵尸推回去。',dandelion:'蒲公英向附近三行发射爆炸种子。',jalapeno:'火爆辣椒烧毁一整行的僵尸。',lightningreed:'闪电芦苇的电流会在附近僵尸间传导。',escaperoot:'点击逃脱树根，再点击另一株植物即可换位。成熟后遇到僵尸会变成爆炸植物。',spikerock:'钢地刺能刺破三个滚桶，伤害踩在上面的僵尸。',threepeater:'三线射手同时向所在行和相邻两行发射豌豆。',spikeweed:'地刺可以伤害踩在上面的僵尸，并刺破滚桶。',springbean:'弹簧豆可以弹开僵尸，也能把靠近海边的僵尸弹入水中。',snapdragon:'火龙草向前方三行喷火，灼烧靠近的僵尸。',coconutcannon:'点击椰子加农炮发射炮弹，爆炸后需要时间重新装填。',snowdrop:'雪莲抛出冰霜花瓣，使僵尸减速，偶尔将它冻住。',imitater:'选择本关的一种植物，模仿者会在种下后变成它。',peapod:'在同一格重复种植，最多叠加五个豌豆头。',cherry_bomb:'樱桃炸弹炸毁周围九宫格内的僵尸。',celerystalker:'潜伏芹菜藏在地下，攻击走过身后的僵尸。',parsnip:'防风草用钳子攻击前方，被吃掉后冲出去继续攻击。',sapfling:'树脂投手在落点留下树脂，减缓僵尸的移动。',
  repeater:'双发射手连续发射两颗豌豆。',kernelpult:'玉米投手抛射玉米粒，偶尔用黄油定住僵尸。',melonpult:'西瓜投手的西瓜能伤害落点周围的僵尸。',
  bonkchoy:'菜问快速拳击前后靠近的僵尸。',
  gravebuster:'噬碑藤吞噬墓碑，为种植腾出空间。',
  twinsunflower:'双胞向日葵一次生产双倍阳光。',
  iceweed:'冰地刺伤害并减速踩在上面的僵尸。',
  peashooter:'豌豆射手向前发射豌豆，攻击所在行的僵尸。',
  sunflower:'向日葵为你生产额外的阳光。',
  tallnut:'高坚果拥有坚硬的外壳，还能拦住飞来的牛仔小鬼。',
  wallnut:'坚果用坚硬的外壳保护身后的植物。',
  cabbagepult:'卷心菜投手能够越过墓碑，将卷心菜投向僵尸。',
  bloomerang:'回旋镖射手的回旋镖可以穿过三个目标，并在返回时再次造成伤害。',
  iceburg:'冰冻生菜会冻住靠近的僵尸，为其他植物争取时间。',
  potatomine:'土豆地雷需要时间准备，然后炸飞靠近的僵尸。',
};

export function createBattle(host: HTMLElement, onReturn: () => void, levelConfig: BattleLevel, progress: ProgressStore) {
  const listeners=new AbortController();
  const bonuses = progress.battleBonuses(), seedSlots = bonuses.seedSlots;
  host.style.setProperty('--seed-slots', String(seedSlots));
  host.dataset.mode=levelConfig.mode;
  const title = `${levelConfig.worldName} - 第${levelConfig.day}天`;
  const touchHelp = levelConfig.mode==='cannon'?'点击椰子加农炮开火 · 连击获得更多分数':levelConfig.mode==='match'?'翻开骆驼牌 · 配对相同图案':levelConfig.mode==='powerups'?'选择道具 · 按住或拖动攻击':levelConfig.mode==='conveyor'?'点击传送带植物 · 点击地块种植':'点击卡片选植物 · 点击地块种植 · 点击阳光收集';
  let cardOrder: PlantKind[] = [];
  const $ = <T extends HTMLElement>(selector: string) => host.querySelector<T>(selector)!;
  host.innerHTML = `<section class="battle-frame" aria-label="${title}">
    <div id="canvas-host"></div>
    <div id="hud" hidden>
      <div class="sun-counter"><img alt="阳光"><b id="sun-count">50</b></div>
      <div class="seed-bank">${Array.from({length:seedSlots},(_,i)=>`<button class="seed" data-slot="${i}" aria-label="空卡槽" disabled><img alt=""><span class="seed-price"></span><span class="seed-cooldown"></span></button>`).join('')}</div>
      <div class="battle-tools">
        <button id="auto-sun" aria-label="自动收集阳光" aria-pressed="true"><span>自动阳光</span><span class="auto-sun-state" aria-hidden="true">开</span></button>
        <div id="performance-hud" aria-label="战斗性能"><span id="performance-fps">FPS —</span><span id="performance-memory"></span><span id="performance-js-memory" hidden></span></div>
      </div>
      <button id="speed" class="battle-icon" aria-label="切换二倍速" aria-pressed="false"></button>
      <button id="pause" class="battle-icon" aria-label="暂停游戏"></button>
      <button id="shovel" class="battle-icon" aria-label="使用铲子"><img alt="铲子"></button>
      <button id="plant-food" aria-label="使用能量豆" hidden><img alt="能量豆"><b>0 / ${bonuses.foodLimit}</b></button>
      <div id="conveyor" hidden aria-label="传送带"></div>
      <div id="powerups" hidden>${(['fire','snow','toss','zap','cherry'] as const).map((kind,i)=>`<button data-power="${kind}" aria-label="${['火焰','雪球','抛掷','闪电','樱桃炸弹'][i]}" title="${['按住并拖动喷火','按住并拖动投掷雪球','划过僵尸将它推离庭院','按住并拖动释放闪电','点击庭院使用樱桃炸弹'][i]}"><img alt="${['火焰','雪球','抛掷','闪电','樱桃炸弹'][i]}"></button>`).join('')}<progress id="power-time" max="1" value="1"></progress></div>
      <button id="corral-view" class="battle-button" hidden>查看僵尸</button><button id="laststand-start" class="battle-button" hidden>开始进攻</button><div id="game-tip" role="status" hidden></div>
      <div class="challenge-objective" hidden></div>
      <div id="ship-health" hidden></div>
      <div class="level-name">${title}</div>
      <div id="wave-hud"><div id="wave-fill"></div><span id="wave-label"></span></div>
    </div>
    <button id="narrative" aria-label="继续对白" hidden><span class="speech"><span id="speech-line"></span><small>点击继续</small></span></button>
    <div id="seed-chooser" hidden>
      <section class="chooser-window" aria-label="选择植物">
        <div class="plant-description"><img id="plant-portrait" alt=""><div><h2 id="plant-name"></h2><p id="plant-description"></p></div></div>
        <p class="challenge-objective chooser-objective" hidden></p>
        <div class="chooser-cards"></div>
      </section>
      <button id="ready-back" class="battle-button">返回地图</button><button id="start" class="battle-button" disabled>开始战斗</button>
    </div>
    <div id="battle-announcement" role="status" hidden></div>
    <div id="overlay" hidden></div>
  </section><div class="battle-caption"><span>${title}</span><span>${levelConfig.mode==='airraid'?'鼠标／方向键／WASD 移动 · 自动射击':levelConfig.mode==='seedbank'||levelConfig.mode==='preset'?`1–${seedSlots} 选卡 · 点击阳光收集`:touchHelp} · 空格暂停</span></div>`;
  const seedViews = Array.from(host.querySelectorAll<HTMLButtonElement>('[data-slot]'), button => ({
    button, kind:null as PlantKind | undefined | null, image:button.querySelector<HTMLImageElement>('img')!,
    price:button.querySelector<HTMLElement>('.seed-price')!, cooldown:button.querySelector<HTMLElement>('.seed-cooldown')!,
  }));
  const sunCount=$('#sun-count'),foodCount=$('#plant-food b'),waveLabel=$('#wave-label'),waveFill=$('#wave-fill');
  const powerButtons=Array.from(host.querySelectorAll<HTMLButtonElement>('[data-power]'));
  const powerTime=$<HTMLProgressElement>('#power-time'),gameTip=$('#game-tip'),announcement=$('#battle-announcement');
  const performanceHud=$('#performance-hud'),fpsLabel=$('#performance-fps'),jsMemoryLabel=$('#performance-js-memory');
  const frameRate=new FrameRate();
  let showPerformance=true;
  function updateJsMemory() {
    const bytes=jsHeapBytes(performance as Performance & {memory?:{usedJSHeapSize:number}});
    jsMemoryLabel.hidden=bytes===undefined;
    if(bytes!==undefined)text(jsMemoryLabel,`JS 堆 ${(bytes/1024/1024).toFixed(1)} MiB`);
  }
  // Keep unchanged HUD values out of the DOM; card images are large data URLs.
  const text = (element:HTMLElement,value:string) => {if(element.textContent!==value)element.textContent=value;};

  let scene: Scene, properties: Properties, source: SourceLevel, game: Game;
  let autoCollectSun = true;
  let selected: PlantKind | 'shovel' | 'food' | null = null;
  let screen: 'menu'|'loading'|'npc-enter'|'narrative'|'npc-exit'|'survey'|'returning'|'choosing'|'countdown'|'playing'|'pause'|'ending'|'result' = 'menu';
  let deck: PlantKind[] = [];
  let packetId:number|undefined;
  let pointerDown=false;
  let sceneDirty=true;
  let tipUntil=0;let bossMusicStage=-1;let pianoPlaying=false;let eightiesJam='jam_clear';let corralStreet=false,corralPan=0,corralPreview=-1;
  let foodTipShown=false;
  let narrativeLines:typeof scene.art.catalog.intro=[];
  let narrativeIndex=0;
  let outro=false;
  let transitionTime=0;
  let voice:HTMLAudioElement|null=null;
  let accumulator = 0, countdown = 0, speed = 1, warningUntil = 0;
  let preferences = readAudio();
  const cards = new Map<PlantKind,string>();
  const portraits = new Map<PlantKind,string>();
  const clips = new Map<string,HTMLAudioElement[]>();
  const music = new Audio(); music.loop = true; music.preload = 'none';
  const panel = (title: string, body: string) => {
    $('#overlay').innerHTML = `<section class="battle-window" role="dialog" aria-modal="true" aria-label="${title}"><h2>${title}</h2>${body}</section>`;
    $('#overlay').hidden = false;
  };
  const sound = (name: string) => {
    const variants = clips.get(name)!;
    const clip = variants[Math.floor(Math.random()*variants.length)];
    clip.volume=preferences.effects; clip.currentTime=0; if (clip.volume>0) void playAudio(clip);
    return clip;
  };
  $('#corral-view').onclick=()=>{corralStreet=!corralStreet;corralPreview=-1;};
  const playMusic = () => { music.volume=preferences.music; if(music.volume>0) void playAudio(music); };

  async function enter() {
    host.hidden=false; screen='loading'; host.dataset.screen=screen; preferences=readAudio();
    $('#overlay').innerHTML = `<section class="battle-loading" aria-label="${title}加载中">
      <img class="loading-scenery" src="${assetUrl(levelConfig.presentation.loading)}" alt="">
      <div class="loading-destination"><span class="loading-chapter">时空之旅</span><h2>${levelConfig.worldName}</h2><span class="loading-day">第${levelConfig.day}天</span></div>
      <div class="loading-progress"><p id="load-status" role="status">正在准备庭院…</p><progress id="load-progress" aria-label="关卡资源加载进度" max="7" value="0"></progress></div>
    </section>`;
    $('#overlay').hidden = false;
    cardOrder=availablePlants(levelConfig,progress.ownedPlants());

    if (!scene) {
      const [{ Scene },props,level,flag,campaign] = await Promise.all([import('./rendering/scene'),json<Properties>('levels/properties.json'),json<SourceLevel>(levelConfig.source),json<ZombieProperties>('battle/flag.json'),levelConfig.assets==='campaign'?json<Properties>('campaign/properties.json'):Promise.resolve(null)]);
      if(campaign){Object.assign(props.plants,campaign.plants);Object.assign(props.zombies,campaign.zombies);Object.assign(props.armors,campaign.armors);Object.assign(props,{grave:campaign.grave,projectiles:campaign.projectiles,powerups:campaign.powerups,plantAnimations:campaign.plantAnimations});}
      for(const bundle of levelConfig.bundles??[]){const extra=await json<Properties>(`${bundle}/properties.json`);for(const key of ['plants','zombies','armors','projectiles','plantAnimations'] as const)Object.assign(props[key],extra[key]);}
      properties=props; properties.zombies.mummy_flag=flag; source=level; scene=new Scene();scene.costumes=progress.equippedCostumes();
      const parsed=readLevel(source);
      cardOrder=[...new Set([...cardOrder,...(parsed.chooserPlants??[])])].filter(kind=>!parsed.blacklist.includes(kind));
      const actorPlants=[...new Set([...(parsed.preset??(parsed.conveyor?parsed.conveyor.InitialPlantList.map(p=>p.PlantType):parsed.match||parsed.powerups||parsed.cannon?[]:cardOrder)),...parsed.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[]),...(parsed.memory?['gravebuster' as const]:[]),...parsed.initialPlants.map(p=>p.kind),...parsed.protectedPlants.map(p=>p.kind),...(parsed.cannon?['coconutcannon' as const]:[]),...(parsed.airRaid?parsed.airRaid.teams.flatMap(t=>t.members.map(m=>m.kind)):[])])];
      await scene.init($('#canvas-host'),(done,total)=>{
        $('#load-status').textContent=`正在准备植物与庭院 ${done} / ${total}`;
        const progress=$<HTMLProgressElement>('#load-progress');progress.max=total;progress.value=done;
      },levelConfig,actorPlants,parsed);
      $('#performance-memory').textContent=`纹理估算 ${(scene.textureBytes/1024/1024).toFixed(1)} MiB`;
      updateJsMemory();
      scene.onPoint=(x,y)=>{pointerDown=true;interact(x,y);};scene.onHover=hover;scene.onRelease=()=>{sceneDirty=true;pointerDown=false;game?.releaseMower();if(game)game.cowboy.selected=null;if(game?.power)game.powerPointer(game.power.x,game.power.y,false);};scene.onTick=tick;
      scene.onSound=sound;
      scene.onNPCEvent=(character,event)=>{
        const sounds:Record<string,string>={enter:'Enter',exit:'Exit',enter_brake:'Enter_Brake',exit_brake:'Exit_Brake',enter_shake:'Enter_Shake',exit_shake:'Exit_Shake'};
        if(event in sounds)sound(character+'/'+sounds[event]);
      };
      for(const [name,art] of Object.entries(scene.art.catalog.ui)) host.style.setProperty(`--art-${name}`,`url('${assetUrl(art.image)}')`);
      host.style.setProperty('--art-emptySlot',`url('${scene.art.image(scene.app,'cards','emptyslot','emptyslot')}')`);
      for(const kind of [...new Set([...actorPlants,...(levelConfig.firstReward.plant?[levelConfig.firstReward.plant]:[])])]){cards.set(kind,scene.art.card(scene.app,kind));if(actorPlants.includes(kind))portraits.set(kind,scene.portrait(kind));}

      $<HTMLImageElement>('.sun-counter img').src=scene.art.image(scene.app,'sunIcon');
      $<HTMLImageElement>('#shovel img').src=scene.art.image(scene.app,'shovel',bonuses.shovelRefund>0?'IdleSunback':'Idle');
      for(const [name,paths] of Object.entries(scene.art.catalog.sounds)) clips.set(name,paths.map(path=>{const audio=new Audio(assetUrl(path));audio.preload='none';return audio;}));
      music.src=assetUrl(levelConfig.presentation.music);
      if(levelConfig.id!=='egypt1'){
        $<HTMLImageElement>('#plant-food img').src=scene.art.image(scene.app,'food','Idle');
        if(levelConfig.mode==='powerups')for(const kind of ['fire','snow','toss','zap','cherry'])$<HTMLImageElement>(`[data-power="${kind}"] img`).src=assetUrl(scene.art.catalog.ui['power-'+kind].image);

      }
    }
    cardOrder = [...new Set([...availablePlants(levelConfig,progress.ownedPlants()),...(readLevel(source).chooserPlants??[])])].filter(kind=>!readLevel(source).blacklist.includes(kind));
    $('.chooser-cards').innerHTML = cardOrder.map(kind=>`<button data-choose="${kind}" class="seed choose-card${progress.gardenBoosts()[kind]>0?' boosted':''}" aria-label="选择${plantLabels[kind]}${progress.gardenBoosts()[kind]>0?'（爆发）':''}" aria-pressed="false"><img alt="${plantLabels[kind]}" src="${cards.get(kind)!}"><span class="seed-price">${kind==='imitater'?'':kind==='powerplant'?properties.plants.powerplant.SunCostList[0]:properties.plants[kind].SunCost}</span></button>`).join('');
    for(const kind of cardOrder)$(`[data-choose="${kind}"]`).onclick=()=>{
      describe(kind);const index=deck.indexOf(kind);if(index===-1&&deck.length<seedSlots){deck.push(kind);sound('cardChosen');}else if(index!==-1){deck.splice(index,1);sound('cardCancel');}updateDeck();
    };
    $('#overlay').hidden=true;
    narrativeLines=levelConfig.narrative===null?[]:levelConfig.id==='egypt1'?scene.art.catalog.intro:scene.art.campaign.narratives[levelConfig.id==='egypt5'&&progress.isComplete(levelConfig.id)?'POWERUPS_TUTORIAL_REPEAT':levelConfig.narrative];
    if(!narrativeLines.length||progress.isComplete(levelConfig.id)&&levelConfig.id!=='egypt5')survey();else {narrativeIndex=0;screen='npc-enter';host.dataset.screen=screen;scene.enterNarrative(narrativeCast(0));}
  }
  function narrativeCast(index:number){
    const cast=new Set<string>();let line=0;
    for(const step of narrativeLines){if(step.Action==='NPC_ENTER')cast.add(step.Character);if(step.Action==='NPC_EXIT')cast.delete(step.Character);if(step.Lines&&line++===index)break;}
    return [...cast];
  }
  function nextNarrative() {
    voice?.pause();voice=null;
    const lines=narrativeLines.filter(step=>step.Lines);
    const step=lines[narrativeIndex++];
    if(!step){$('#narrative').hidden=true;screen='npc-exit';host.dataset.screen=screen;scene.exitNarrative();return;}
    screen='narrative';host.dataset.screen=screen;$('#overlay').hidden=true;$('#hud').hidden=true;
    $('#narrative').hidden=false;$('#narrative').dataset.character=step.Character;
    $('#speech-line').textContent=step.Lines!.zh;scene.setNarrativeCast(narrativeCast(narrativeIndex-1));scene.narrative(step.Character,step.Animation!);voice=sound(step.Voice!);
  }
  function settleBoosts(){if(game){progress.consumeGardenBoosts(game.usedBoosts);game.usedBoosts.clear();}}
  function prepareGame(){
    settleBoosts();
    bossMusicStage=-1;eightiesJam='jam_clear';
    game=new Game(readLevel(source),properties,scene.timing,zombie=>scene.absorptionTarget(zombie),Date.now()>>>0,!progress.isComplete(levelConfig.id));
    game.autoCollectSun=autoCollectSun;
    if(game.level.world==='sky')game.sky.setShield(progress.ownedUpgrades().has(13));
    game.boosts=new Set(Object.entries(progress.gardenBoosts()).filter(([,count])=>count>0).map(([kind])=>kind as PlantKind));
    for(const kind of cardOrder){const card=$(`[data-choose="${kind}"]`),boosted=game.boosts.has(kind);card.classList.toggle('boosted',boosted);card.setAttribute('aria-label',`选择${plantLabels[kind]}${boosted?'（爆发）':''}`);}
    game.plantfoodRefresh=bonuses.plantfoodRefresh;game.wallnutFirstAid=bonuses.wallnutFirstAid;game.foodLimit=bonuses.foodLimit;game.shovelRefund=bonuses.shovelRefund;game.manualMowers=bonuses.manualMowers;
    if(!game.level.lastStand)game.sun+=bonuses.startingSun;
    const objective=[game.level.memory?'记住小鬼出现的墓碑，用噬碑藤清除它们':'',game.level.maxPlantsLost!==null?`最多损失 ${game.level.maxPlantsLost} 株植物`:'',game.level.killChallenge?`在 ${game.level.killChallenge.seconds} 秒内消灭 ${game.level.killChallenge.count} 只僵尸`:'',game.level.mold.length?'霉菌覆盖的地块不能种植':'',game.level.mustProtect?`保护好 ${game.level.mustProtect} 株植物`:'',game.level.targetSun!==null?`生产 ${game.level.targetSun} 阳光`:'',game.level.maxPlants!==null?`同时种植不超过 ${game.level.maxPlants} 株植物`:'',game.level.flowerLine!==null?'不要让僵尸踩到花坛':'',game.level.cannon?`点击椰子加农炮，获得 ${game.level.cannon.MinScore} 分`:'',game.level.maxSun!==null?`消耗阳光不超过 ${game.level.maxSun}`:'',game.level.potions?'阻止僵尸喝下强化药水':'',game.level.lastStand?`用 ${game.level.lastStand.sun} 阳光布置防线，再开始进攻`:''].filter(Boolean).join(' · ');
    for(const element of host.querySelectorAll<HTMLElement>('.challenge-objective')){element.textContent=objective;element.hidden=!objective;}
  }
  function survey() {
    prepareGame();
    screen='survey';host.dataset.screen=screen;transitionTime=0;
    $('#hud').hidden=true;$('#overlay').hidden=true;$('#seed-chooser').hidden=true;
    scene.preview(game.level.waves.flat(),game.graves,game.plants,game.level);scene.start();playMusic();
  }
  function describe(kind: PlantKind) {
    $('#plant-name').textContent=plantLabels[kind];$('#plant-description').textContent=DESCRIPTIONS[kind];
    $<HTMLImageElement>('#plant-portrait').src=portraits.get(kind)!;
  }
  function updateDeck() {
    for (let i=0;i<seedSlots;i++) {
      const view=seedViews[i],{button,image,price,cooldown}=view,kind=deck[i];
      const refresh=!!kind&&selected==='food'&&game.plantfoodRefresh&&!game.preparing&&game.food>0&&game.cooldowns[kind]>0;
      const disabled=screen==='choosing'?!kind||!!game.level.chooserPlants?.includes(kind):!kind||!refresh&&(game.sun<game.seedCost(kind)||!game.preparing&&game.cooldowns[kind]>0);
      if(button.disabled!==disabled)button.disabled=disabled;
      button.classList.toggle('food-refresh',refresh);
      button.classList.toggle('empty',!kind);button.classList.toggle('selected',selected===kind);
      const label=kind?`${screen==='choosing'?'移除':'选择'}${plantLabels[kind]}`:'空卡槽';
      if(button.getAttribute('aria-label')!==label)button.setAttribute('aria-label',label);
      if(view.kind!==kind){view.kind=kind;image.hidden=!kind;if(kind)image.src=cards.get(kind)!;}
      text(price,kind?kind==='imitater'&&game.imitateKind===null?'':String(game.seedCost(kind)):'');
      const height=kind&&screen!=='choosing'?`${game.cooldowns[kind]/game.seedCooldown(kind)*100}%`:'0%';
      if(cooldown.style.height!==height)cooldown.style.height=height;
    }
    if(screen==='choosing') {
      for(const kind of cardOrder) {
        const button=$<HTMLButtonElement>(`[data-choose="${kind}"]`);
        button.setAttribute('aria-pressed',String(deck.includes(kind)));
        button.disabled=!!game.level.chooserPlants?.includes(kind);
      }
      $<HTMLButtonElement>('#start').disabled=deck.length===0;
    }
  }
  function chooseSeeds() {
    frameRate.reset();text(fpsLabel,'FPS —');
    prepareGame();
    scene.preview(game.level.waves.flat(),game.graves,game.plants,game.level);scene.setCamera(scene.art.catalog.presentation.seedChoosingCameraX);scene.start();openChooser();
  }
  function openChooser() {
    if(game.level.airRaid){
      screen='choosing';host.dataset.screen=screen;deck=[];selected=null;$('#hud').hidden=true;$('#seed-chooser').hidden=true;
      panel('选择空战小队',`<p>移动鼠标或使用方向键、WASD 操纵植物，自动射击。击败僵尸获得分数，达到升级分数后更换队员。</p><div class="imitater-actions">${game.level.airRaid.teams.map((t,i)=>`<button class="battle-button" data-airraid="${i}">${t.name} · 难度 ${t.difficulty}</button>`).join('')}</div>`);
      for(const button of host.querySelectorAll<HTMLButtonElement>('[data-airraid]'))button.onclick=()=>{game.sky.airRaid.choose(Number(button.dataset.airraid));prepareStart();};return;
    }
    if(levelConfig.mode!=='seedbank'){deck=readLevel(source).preset??[];prepareStart();return;}
    screen='choosing';deck=[...(game.level.chooserPlants??[])];selected=null;speed=1;
    $('#overlay').hidden=true;$('#hud').hidden=false;$('#seed-chooser').hidden=false;$('#battle-announcement').hidden=true;
    host.dataset.screen=screen;$('#sun-count').textContent=String(game.sun);
    describe(cardOrder[0]);updateDeck();
    sound('cardChosen');playMusic();
  }
  function prepareStart() {
    if(!deck.includes('imitater')){start();return;}
    screen='choosing';$('#hud').hidden=true;$('#seed-chooser').hidden=true;
    const choices=levelConfig.mode==='seedbank'?cardOrder:deck;
    panel('模仿哪种植物？',`<div class="imitater-actions">${choices.filter(k=>k!=='imitater').map(k=>`<button class="battle-button" data-imitate="${k}">${plantLabels[k]}</button>`).join('')}${levelConfig.mode==='seedbank'?'<button class="battle-button" data-imitate-back>返回选卡</button>':''}</div>`);
    for(const button of host.querySelectorAll<HTMLButtonElement>('[data-imitate]'))button.onclick=()=>{game.imitateKind=button.dataset.imitate as PlantKind;start();};
    if(levelConfig.mode==='seedbank')$('[data-imitate-back]').onclick=()=>{$('#overlay').hidden=true;$('#hud').hidden=false;$('#seed-chooser').hidden=false;};
  }
  function start() {
    selected=null;packetId=undefined;foodTipShown=false;corralStreet=false;corralPan=0;corralPreview=-1;tipUntil=0;$('#game-tip').hidden=true;pointerDown=false;
    accumulator=0;countdown=0;speed=1;screen='returning';transitionTime=0;host.dataset.screen=screen;
    $('#seed-chooser').hidden=true;$('#overlay').hidden=true;$('#battle-announcement').hidden=true;$('#hud').hidden=false;
    for(const selector of ['.seed-bank','.sun-counter','#auto-sun'])$(selector).hidden=!!game.level.airRaid;
    $('#shovel').hidden=game.level.bowlingLine!==null||!!game.level.airRaid;
    $('#plant-food').hidden=game.level.bowlingLine!==null||levelConfig.id==='egypt1'||levelConfig.mode==='powerups'||levelConfig.mode==='match'||levelConfig.mode==='cannon';$('#powerups').hidden=levelConfig.mode!=='powerups';$('#conveyor').hidden=levelConfig.mode!=='conveyor';
    $('#speed').setAttribute('aria-pressed','false');sound('letsRock');sound('cameraMove');
  }
  function menu() {
    scene.stop();scene.reset();music.pause();screen='menu';selected=null;
    $('#hud').hidden=true;$('#overlay').hidden=true;$('#seed-chooser').hidden=true;host.hidden=true;onReturn();
  }
  function updateHud() {
    sceneDirty=true;
    if(selected){game.eighties.finale.cancel();game.escape.cancel();game.westFinale.cancel();game.kongfu.bamboozle.cancel();game.darkPlants.cancel();}
    if(game.level.airRaid){const ship=$('#ship-health'),raid=game.sky.airRaid;ship.hidden=false;text(ship,`得分 ${raid.score} / ${game.level.airRaid.target} · 生命 ${Math.max(0,Math.ceil(raid.player?.hp??0))} / 300${raid.current.threshold!==undefined?` · 下次升级 ${raid.current.threshold}`:''}`);}else if(game.level.world==='sky'){const ship=$('#ship-health');ship.hidden=false;text(ship,`飞船 ${Math.max(0,Math.ceil(game.sky.health))} / 20000${game.sky.shield>0?` · 护盾 ${Math.ceil(game.sky.shield)}`:''}`);}
    text(sunCount,String(game.sun));if(levelConfig.mode==='seedbank'||levelConfig.mode==='preset')updateDeck();
    text(foodCount,`${game.food} / ${game.foodLimit}`);$('#plant-food').classList.toggle('selected',selected==='food');
    if(levelConfig.mode==='conveyor')updateConveyor();
    for(const button of powerButtons){button.classList.toggle('selected',game.power?.kind===button.dataset.power);const disabled=!!game.power&&game.power.remaining>0;if(button.disabled!==disabled)button.disabled=disabled;}
    const powerValue=game.power&&game.power.remaining>0?game.power.remaining/game.power.total:1;
    if(powerTime.value!==powerValue)powerTime.value=powerValue;
    if(game.time>tipUntil&&!gameTip.hidden)gameTip.hidden=true;
    if(levelConfig.id==='egypt2'&&!foodTipShown&&game.pickups.some(p=>p.kind==='food')){foodTipShown=true;tip('点击发光的能量豆收集，再点击左下角能量豆，对植物使用。',12);}
    $('#shovel').classList.toggle('selected',selected==='shovel');scene.carrotPreview=selected==='intensivecarrot';
    text(waveLabel,game.level.cannon?`${game.pirate.score.toLocaleString()} / ${game.level.cannon.MinScore.toLocaleString()}${game.time<game.pirate.comboUntil&&game.pirate.combo>=3?` · ${game.pirate.combo} 连击`:''}`:game.level.killChallenge?`${game.killChallengeComplete?'挑战完成':`${game.level.killChallenge.seconds} 秒内击杀 ${game.recentKills.length} / ${game.level.killChallenge.count}`}${game.level.targetSun!==null?` · 阳光 ${Math.min(game.sunProduced,game.level.targetSun)} / ${game.level.targetSun}`:''} · ${game.wave} / ${game.level.waves.length}`:game.level.targetSun!==null?`阳光 ${Math.min(game.sunProduced,game.level.targetSun)} / ${game.level.targetSun} · ${game.wave} / ${game.level.waves.length}`:game.level.maxPlantsLost!==null?`损失 ${game.plantsLost} / ${game.level.maxPlantsLost}${game.level.maxSun!==null?` · 阳光 ${game.sunSpent} / ${game.level.maxSun}`:''} · ${game.wave} / ${game.level.waves.length}`:game.level.maxSun!==null?`阳光 ${game.sunSpent} / ${game.level.maxSun} · ${game.wave} / ${game.level.waves.length}`:game.boss?`僵王 · ${game.boss.stage+1} / ${game.boss.stages.length}`:game.wave===0?'':`${game.wave} / ${game.level.waves.length}`);
    const waveWidth=`${(game.boss?game.boss.progress:game.wave/game.level.waves.length)*100}%`;
    if(waveFill.style.width!==waveWidth)waveFill.style.width=waveWidth;
    if(game.level.world==='eighties'&&game.eighties.musicJam!==eightiesJam){eightiesJam=game.eighties.musicJam;music.src=assetUrl(eightiesJam==='jam_clear'?levelConfig.presentation.music:`eighties/${eightiesJam}.mp3`);playMusic();}
    if(game.level.world==='west'&&game.cowboy.pianoPlaying!==pianoPlaying){pianoPlaying=game.cowboy.pianoPlaying;music.src=assetUrl(pianoPlaying?'cowboy/piano.mp3':levelConfig.presentation.music);playMusic();}
    if(game.boss&&game.level.world!=='eighties'){const stage=game.boss.zombie.hp<=0?3:game.boss.stage;if(bossMusicStage!==stage){bossMusicStage=stage;music.src=assetUrl(`${game.level.world==='kongfu'?'kongfu':'campaign'}/${stage===3?'bossVictory':`boss${stage}`}.mp3`);playMusic();}}
  }
  function hover(x: number,y: number) {
    if(screen!=='playing')return;
    sceneDirty=true;
    if(game.level.airRaid){game.sky.airRaid.move(x,y);return;}
    if(game.power){game.powerPointer(x,y,pointerDown);return;}
    if(!selected&&pointerDown){game.mowerPointer(x,y,true);if(game.cowboy.move(Math.floor((y-BOARD.top)/BOARD.cellHeight))){game.westFinale.cancel();game.kongfu.bamboozle.cancel();}}
    scene.highlightCell(selected?Math.floor((y-BOARD.top)/BOARD.cellHeight):-1,Math.floor((x-BOARD.left)/BOARD.cellWidth),selected==='shovel'?0xedb56a:0xe7fbb0);
  }
  function interact(x: number,y: number) {
    if(screen!=='playing')return;
    sceneDirty=true;
    if(game.level.airRaid){game.sky.airRaid.move(x,y);if(selected==='food'){game.sky.airRaid.food();selected=null;updateHud();}return;}
    if(game.level.cannon){game.pirate.fire(Math.floor((y-BOARD.top)/BOARD.cellHeight),Math.floor((x-BOARD.left)/BOARD.cellWidth));return;}
    if(!selected)game.mowerPointer(x,y,true,true);
    if(game.level.match){const z=[...game.zombies].sort((a,b)=>b.row-a.row).find(z=>Math.abs(z.x-x)<32&&y>rowY(z.row)-145&&y<rowY(z.row));if(z)game.flipCamel(z.id);return;}
    if(game.power){game.powerPointer(x,y,true,true);return;}
    const pickup=game.pickups.find(p=>Math.hypot(x-p.x,y-p.y)<38);
    if(pickup){game.collectPickup(pickup.id);sound('collect');updateHud();return;}
    const sun=[...game.suns].reverse().find(s=>Math.hypot(x-s.x,y-s.y)<38);
    if(sun){game.collect(sun.id);updateHud();return;}
    const column=Math.floor((x-BOARD.left)/BOARD.cellWidth),row=Math.floor((y-BOARD.top)/BOARD.cellHeight);
    if(selected){game.eighties.finale.cancel();game.escape.cancel();game.westFinale.cancel();game.kongfu.bamboozle.cancel();game.darkPlants.cancel();}
    if(selected===null&&game.eighties.finale.selected!==null){game.eighties.finale.fire(row,column);updateHud();return;}
    if(selected===null&&game.darkPlants.selected!==null){game.darkPlants.move(row,column);updateHud();return;}
    if(selected===null&&game.kongfu.bamboozle.selected!==null){game.kongfu.bamboozle.fire(row,column);updateHud();return;}
    if(selected===null&&game.westFinale.selected!==null){game.westFinale.fire(row,column);updateHud();return;}
    if(selected===null&&game.escape.selected!==null){game.escape.exchange(row,column);updateHud();return;}
    if(selected==='shovel'){game.shovel(row,column);sound('shovelDig');}
    else if(selected==='food'){if(game.plantFood(row,column)){selected=null;scene.highlightCell(-1,-1,0);}}
    else if(selected&&game.plant(selected,row,column,packetId)){selected=null;scene.highlightCell(-1,-1,0);}
    else if(selected===null&&game.eighties.finale.click(row,column)){game.escape.cancel();game.westFinale.cancel();game.kongfu.bamboozle.cancel();game.darkPlants.cancel();}
    else if(selected===null&&game.darkPlants.select(row,column)){game.escape.cancel();game.westFinale.cancel();game.kongfu.bamboozle.cancel();}
    else if(selected===null&&game.kongfu.bamboozle.select(row,column)){game.westFinale.cancel();game.escape.cancel();}
    else if(selected===null&&game.westFinale.select(row,column))game.cowboy.select(row,column);
    else if(selected===null&&!game.cowboy.select(row,column)&&!game.escape.select(row,column)&&!game.western.fire(row,column)&&!game.kongfu.fire(row,column))game.pirate.fire(row,column);
    updateHud();
  }
  function tick(dt: number) {
    if(showPerformance){const fps=frameRate.sample(performance.now());if(fps!==null){text(fpsLabel,`FPS ${fps}`);updateJsMemory();}}
    if(screen==='npc-enter'||screen==='npc-exit') {
      if(scene.narrativeTick(dt)){if(screen==='npc-enter')nextNarrative();else if(outro){outro=false;finish();}else survey();}return;
    }
    if(screen==='narrative'){scene.narrativeTick(dt);return;}
    if(screen==='survey') {
      const intro=scene.art.catalog.presentation.camera,previous=transitionTime;transitionTime+=dt;
      if(previous<intro.PanLeftDuration&&transitionTime>=intro.PanLeftDuration)sound('cameraMove');
      scene.setCamera(introCamera(transitionTime,intro,scene.art.catalog.presentation.seedChoosingCameraX));scene.previewTick(dt);
      if(transitionTime>=intro.PanLeftDuration+intro.PanMoveRightTime+intro.PanRightDuration+intro.PanMoveLeftTime)openChooser();return;
    }
    if(screen==='returning') {
      const presentation=scene.art.catalog.presentation;transitionTime+=dt;
      const t=Math.min(1,transitionTime/presentation.camera.PanMoveLeftTime);
      scene.frameCombat(cubicInOut(t));scene.previewTick(dt);
      if(t===1){scene.reset();scene.frameCombat();scene.sync(game,0);updateHud();screen=game.preparing?'playing':'countdown';host.dataset.screen=screen;$('#laststand-start').hidden=!game.preparing;$('#battle-announcement').hidden=game.preparing;$('#battle-announcement').textContent='准备…';scene.start();if(!game.preparing)sound('readySetPlant');playMusic();}return;
    }
    if(screen==='choosing'){scene.previewTick(dt);return;}
    if(screen==='countdown') {
      const [ready,set,plant]=scene.art.catalog.presentation.readySetPlant;
      countdown+=dt;$('#battle-announcement').textContent=countdown<ready?'准备…':countdown<ready+set?'安放…':'种植！';scene.sync(game,dt);
      if(countdown>=ready+set+plant){screen='playing';host.dataset.screen=screen;$('#battle-announcement').hidden=true;if(levelConfig.mode==='match')tip('翻开骆驼牌，找到两张相同图案即可消除。',10);if(game.level.corral)tip('每波种下发放的植物，再拖动矿车抵挡进攻。',10);else if(levelConfig.mode==='conveyor')tip(game.level.bowlingLine!==null?'选择传送带保龄球，点击界线左侧地块投球。':'点击传送带上的植物，再点击地块种植。',8);else if(game.level.rails)tip('按住矿车上下拖动，可以带着植物换行。',10);if(levelConfig.mode==='powerups')tip('选择下方道具，按住并拖动手指来攻击僵尸。',10);}
      return;
    }
    if(screen==='ending'){scene.sync(game,dt);if(!scene.hasDeathAnimations){if(game.phase==='won'&&levelConfig.outro&&!progress.isComplete(levelConfig.id)){outro=true;narrativeLines=scene.art.campaign.narratives[levelConfig.outro];narrativeIndex=0;screen='npc-enter';host.dataset.screen=screen;$('#hud').hidden=true;scene.enterNarrative(narrativeCast(0));}else finish();}return;}
    if(screen!=='playing')return;
    accumulator+=Math.min(dt,.1)*speed;let advanced=0;
    if(selected)game.releaseMower();
    while(accumulator>=1/60&&game.phase==='playing'){game.tick(1/60);accumulator-=1/60;advanced+=1/60;}
    if(game.phase!=='playing')game.releaseMower();
    if(game.level.corral){
      $('#corral-view').hidden=!game.corralWaiting;
      if(corralPreview>=0){corralPreview+=dt;corralStreet=corralPreview<2;if(corralPreview>=4)corralPreview=-1;}
      if(!game.corralWaiting){corralStreet=false;corralPreview=-1;}
      corralPan=Math.max(0,Math.min(1,corralPan+(corralStreet?1:-1)*dt/2));scene.frameCorral(cubicInOut(corralPan));
      $('#corral-view').textContent=corralStreet?'返回庭院':'查看僵尸';
    }
    // On high-refresh displays, keep rendering without repeating an unchanged battle sync.
    // Input marks the scene dirty so pointer/selection changes appear on the next frame.
    if(advanced>0||sceneDirty){scene.sync(game,advanced);updateHud();sceneDirty=false;}
    for(const event of game.events) {
      if(event.type==='wave'&&game.level.corral&&game.wave>1)corralPreview=0;
      if(event.type==='flip')sound('camelTouch/flipSound');
      if(event.type==='match')sound('camelTouch/matchSound');
      if(event.type==='plant')sound('plantOnFloor');
      if(event.type==='mower')sound('mower');
      if(event.type==='shot')sound('shoot');
      if(event.type==='sun')sound('collect');
      if(event.type==='explode')sound('spudow');
      if(event.type==='sprout')tip('获得植物幼苗！通关时一起领取。',7);
      if(event.type==='raid'){sound('awooga');tip('海盗突袭！',5);}
      if(event.type==='storm'){sound('awooga');tip('沙尘暴来袭！',5);}
      if(event.type==='wave'&&(game.wave===1||game.wave===game.level.waves.length)){
        sound(game.wave===game.level.waves.length?'finalWave':'awooga');
        $('#battle-announcement').textContent=game.wave===game.level.waves.length?'最后一波！':'僵尸来了！';$('#battle-announcement').hidden=false;warningUntil=game.time+3;
      }
    }
    if((game.time>warningUntil||game.corralWaiting)&&!announcement.hidden)announcement.hidden=true;
    game.events.length=0;
    if(game.phase==='won'){screen='ending';host.dataset.screen=screen;}else if(game.phase==='lost')finish();
  }
  function tip(text:string,duration:number){$('#game-tip').textContent=text;$('#game-tip').hidden=false;tipUntil=game.time+duration;}
  function updateConveyor(){
    const element=$('#conveyor');element.hidden=game.level.corral&&!game.corralWaiting;
    for(const button of element.querySelectorAll<HTMLButtonElement>('[data-packet]'))if(!game.conveyor.some(c=>String(c.id)===button.dataset.packet))button.remove();
    for(const packet of game.conveyor){
      let button=element.querySelector<HTMLButtonElement>(`[data-packet="${packet.id}"]`);
      if(!button){button=document.createElement('button');button.className='seed';button.dataset.packet=String(packet.id);button.setAttribute('aria-label',`选择${plantLabels[packet.kind]}`);button.innerHTML=`<img src="${cards.get(packet.kind)!}" alt="${plantLabels[packet.kind]}">`;button.onclick=()=>{selected=packet.kind;packetId=packet.id;updateHud();};element.append(button);}
      button.style.left=`${packet.position*19}%`;button.style.top=`${packet.lane*50}%`;button.classList.toggle('selected',packetId===packet.id&&selected===packet.kind);button.classList.toggle('boosted',!!packet.forceBoosted);
    }
  }
  function bindAudio() {
    for(const input of host.querySelectorAll<HTMLInputElement>('[data-volume]'))input.oninput=()=>{
      preferences[input.dataset.volume as 'music'|'effects']=Number(input.value);saveAudio(preferences);updateVolumeControl(input);
    };
  }
  function pause() {
    if(screen!=='playing')return;
    game.sky.airRaid.keys.clear();game.releaseMower();pointerDown=false;game.phase='paused';screen='pause';scene.stop();music.pause();sound('pause');
    frameRate.reset();
    panel('暂停',`<p class="pause-level">${title}</p><p class="pause-help">${touchHelp}</p>${audioControls(preferences)}${frameLimitControl(readFrameLimit(localStorage))}<label class="performance-option"><span>显示性能<span class="performance-description">FPS · 纹理估算 · JS 堆（支持时）</span></span><input id="show-performance" type="checkbox"${showPerformance?' checked':''}></label><div class="pause-actions"><button id="exit" class="battle-button">退出地图</button><button id="restart" class="battle-button">重新开始</button><button id="resume" class="battle-button">继续</button></div>`);
    $('.battle-window').classList.add('pause-window');
    $<HTMLSelectElement>('[data-frame-limit]').onchange=event=>{const limit=Number((event.currentTarget as HTMLSelectElement).value) as FrameLimit;saveFrameLimit(localStorage,limit);scene.app.ticker.maxFPS=limit;};
    $<HTMLInputElement>('#show-performance').onchange=event=>{showPerformance=(event.currentTarget as HTMLInputElement).checked;performanceHud.hidden=!showPerformance;frameRate.reset();text(fpsLabel,'FPS —');};
    $('#resume').onclick=resume;$('#restart').onclick=chooseSeeds;$('#exit').onclick=menu;bindAudio();
  }
  function resume() {game.phase='playing';screen='playing';accumulator=0;frameRate.reset();text(fpsLabel,'FPS —');$('#overlay').hidden=true;playMusic();scene.start();}
  function finish() {
    screen='result';scene.stop();scene.render();music.pause();$('#battle-announcement').hidden=true;
    if(game.phase==='won') {
      const first=!progress.isComplete(levelConfig.id)&&!!(levelConfig.firstReward.image||levelConfig.firstReward.plant);
      const reward=levelConfig.firstReward;
      const rewardImage=first?(reward.plant?cards.get(reward.plant)!:reward.animation?scene.art.image(scene.app,'reward',reward.animation,reward.armature):reward.image.startsWith('note_')?assetUrl(scene.art.catalog.ui[`note-${levelConfig.world}`].image):scene.art.image(scene.app,'reward',levelConfig.day===4?'powerups':[6,11,15,22,27,30,34].includes(levelConfig.day)?'Pinata':(levelConfig.day===25?'egypt':[23,31].includes(levelConfig.day)?'dangerroom_egypt':reward.image),[6,11,15,22,27,30,34].includes(levelConfig.day)?'Upgrades':[17,21].includes(levelConfig.day)?'Upgrades':[10,14,16,18,20].includes(levelConfig.day)?'CoinBag':undefined)):'';
      const sprouts=game.sprouts+game.pickups.filter(p=>p.kind==='sprout').length;
      panel(first&&reward.plant?'获得新植物':'关卡完成',`${first&&reward.plant?plantReward(rewardImage,reward.label,DESCRIPTIONS[reward.plant]):first?`<img class="map-reward" src="${rewardImage}" alt="${levelConfig.firstReward.label}"><p>获得${levelConfig.firstReward.label}</p>`:`<p>${title}</p>`}${sprouts>0?`<p>植物幼苗 × ${sprouts}</p>`:''}<button id="result-map" class="battle-button">继续</button>`);
      if(first&&reward.plant){$('.battle-window').classList.add('plant-reward-window');$('#result-map').textContent='领取并继续';}
      $('#result-map').onclick=()=>{progress.finish(levelConfig.world,levelConfig.id,sprouts);menu();};
    } else {
      panel(game.lossReason==='airRaid'?'空战植物被击落了！':game.lossReason==='ship'?'飞船被摧毁了！':game.lossReason==='tnt'?'炸药爆炸了！':game.lossReason==='plantsLost'?'损失的植物超过了关卡限制！':game.lossReason==='killChallenge'?'未完成限时击杀目标':game.lossReason==='sunProduced'?'未完成阳光生产目标':game.lossReason==='score'?'未达到目标分数':game.lossReason==='flowers'?'僵尸踩到了花坛！':game.lossReason==='plants'?'植物数量超过了关卡限制！':game.lossReason==='sun'?'消耗的阳光超过了关卡限制！':game.lossReason==='protected'?'需要保护的植物被吃掉了！':'僵尸吃掉了你的脑子！','<button id="again" class="battle-button">重新开始</button><button id="result-map" class="battle-button">返回地图</button>');
      $('#again').onclick=chooseSeeds;$('#result-map').onclick=menu;
    }
  }
  $('#plant-food').onclick=()=>{if(screen==='playing'&&game.food>0){selected=selected==='food'?null:'food';updateHud();}};
  for(const button of host.querySelectorAll<HTMLButtonElement>('[data-power]'))button.onclick=()=>{if(screen==='playing'&&game.selectPower(button.dataset.power as PowerKind)){selected=null;const soundName:Partial<Record<PowerKind,string>>={fire:'powerUpFlameStart',snow:'powerUpSnowStart',zap:'powerUpWizardStart',cherry:'powerUpCherryStart'};const name=soundName[button.dataset.power as PowerKind];if(name)sound(name);tip(button.title,5);updateHud();}};
  $('#narrative').onclick=nextNarrative;
  $('#laststand-start').onclick=()=>{game.startLastStand();screen='countdown';host.dataset.screen=screen;countdown=0;$('#laststand-start').hidden=true;$('#battle-announcement').hidden=false;$('#battle-announcement').textContent='准备…';sound('readySetPlant');};
  $('#pause').onclick=pause;$('#start').onclick=prepareStart;$('#ready-back').onclick=menu;
  $('#auto-sun').onclick=()=>{autoCollectSun=!autoCollectSun;game.autoCollectSun=autoCollectSun;$('#auto-sun').setAttribute('aria-pressed',String(autoCollectSun));$('.auto-sun-state').textContent=autoCollectSun?'开':'关';};
  $('#speed').onclick=()=>{if(screen==='playing'){speed=speed===1?2:1;$('#speed').setAttribute('aria-pressed',String(speed===2));}};
  $('#shovel').onclick=()=>{if(screen==='playing'){selected=selected==='shovel'?null:'shovel';updateHud();}};
  for(let i=0;i<seedSlots;i++)$(`[data-slot="${i}"]`).onclick=()=>{
    if(screen==='choosing'){deck.splice(i,1);sound('cardCancel');updateDeck();}
    else if(screen==='playing'){if(selected==='food'&&game.plantfoodRefresh){if(game.refreshSeed(deck[i]))selected=null;}else selected=selected===deck[i]?null:deck[i];updateHud();}
  };
  window.addEventListener('keydown',event=>{
    if(!host.hidden&&screen==='playing'&&game.level.airRaid&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(event.code)){event.preventDefault();game.sky.airRaid.keys.add(event.code);return;}
    if(host.hidden||event.repeat)return;
    if(event.code==='Space'&&(screen==='playing'||screen==='pause')){event.preventDefault();screen==='playing'?pause():resume();}
    if(event.key==='Escape'){if(screen==='pause')resume();else if(screen==='playing'){selected=null;game.escape.cancel();game.westFinale.cancel();game.kongfu.bamboozle.cancel();if(game.power?.remaining===0)game.power=null;scene.highlightCell(-1,-1,0);}}
    if(screen!=='playing')return;
    if((levelConfig.mode==='seedbank'||levelConfig.mode==='preset')&&'12345678'.slice(0,seedSlots).includes(event.key)&&event.key.length===1){const i=Number(event.key)-1;if(!$<HTMLButtonElement>(`[data-slot="${i}"]`).disabled)selected=deck[i];}
    updateHud();
  },{signal:listeners.signal});
  window.addEventListener('keyup',event=>{game?.sky.airRaid.keys.delete(event.code);},{signal:listeners.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();},{signal:listeners.signal});
  return {enter,async dispose(){settleBoosts();listeners.abort();voice?.pause();music.pause();for(const variants of clips.values())for(const clip of variants)clip.pause();await scene.dispose();host.innerHTML='';}};
}
