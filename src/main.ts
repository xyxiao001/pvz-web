import './style.css';
import './ui.css';
import { registerPwa, showPwa } from './platform/pwa';
void registerPwa();
import { ZOMBIE_NAMES } from './game/survival';
import { GameClock, type GameSpeed } from './game/clock';
import { Hud } from './rendering/hud';
import type { Scene } from './rendering/scene';
import { BOARD, SURVIVAL_SCENES, SCENE_NAMES, isNight, type SurvivalScene, LEVEL_IDS, LEVELS, PLANTS, type LevelId, type PlantKind } from './game/config';
import { Game } from './game/model';
import { GameAudio } from './platform/audio';
import { clearSurvival, loadSurvival, saveSurvival, completeLevel, completedLevel } from './platform/storage';

const asset = (file: string) => `${import.meta.env.BASE_URL}assets/runtime/original/${file.replace(/\.png$/, ".webp")}`;
const lastLevel = LEVEL_IDS[LEVEL_IDS.length - 1];
// Composed packets use the original empty packet and plant portrait; prices stay crisp in the DOM.
const composedPacket = (kind: PlantKind) => ['fumeshroom','gravebuster','iceshroom','doomshroom','lilypad','squash','threepeater','plantern','tanglekelp'].includes(kind);
const seedImage = (kind: PlantKind) => composedPacket(kind)
  ? `<span class="packet-art"><img loading="lazy" src="${asset('seed-packet.png')}" alt=""/><img loading="lazy" class="packet-portrait" src="${asset(`${kind}.png`)}" alt=""/><b class="packet-price">${PLANTS[kind].cost}</b></span>`
  : `<img loading="lazy" src="${asset(`card-${kind}.png`)}" alt=""/>`;
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<main class="page"><div class="page-top"><span>植物大战僵尸</span><span>WEB · 冒险与生存</span></div>
<section id="game-frame" class="game-frame" aria-label="植物大战僵尸游戏">
  <div id="canvas-host"></div>
  <div id="battle-hud" hidden>
    <div class="seed-bank"><div id="conveyor-belt"></div><strong id="sun-total">150</strong><div id="seed-cards"></div></div>
    <button id="shovel" class="shovel-button" hidden title="铲除植物（不返还阳光）" aria-label="铲子" aria-pressed="false"><img loading="lazy" src="${asset('shovel.png')}" alt=""/></button>
    <div class="battle-controls"><label class="auto-sun"><input id="auto-sun" type="checkbox"/>自动收集阳光</label><button id="speed" class="wood-button" title="切换游戏速度：1× / 2× / 4×" aria-label="游戏速度 1 倍">1×</button><button id="pause" class="wood-button">菜单</button></div>
    <div id="advice" class="advice" role="status"></div>
    <div class="level-caption" id="level-label"></div>
    <div class="wave-hud"><span id="wave-label"></span><div class="wave-meter"><div id="wave-fill"></div><img loading="lazy" class="meter-flag" src="${asset('meter-flag.png')}" alt="最终波次"/><img loading="lazy" id="meter-head" src="${asset('meter-head.png')}" alt=""/></div></div>
  </div>
  <div id="menu" class="main-menu">
    <img class="game-logo" src="${asset('logo.png')}" alt="Plants vs. Zombies"/>
    <div class="garden-sign"><span>欢迎回到</span><b>疯狂戴夫的庭院</b></div>
    <div class="garden-defenders" aria-hidden="true"><img class="defender-sunflower" src="${asset('sunflower.png')}" alt=""/><img class="defender-pea" src="${asset('peashooter.png')}" alt=""/><img class="defender-wallnut" src="${asset('wallnut.png')}" alt=""/></div>
    <nav class="menu-modes" aria-label="游戏模式">
      <button id="adventure" class="mode-button mode-adventure" aria-label="开始冒险"><span class="mode-eyebrow">守住你的草坪</span><strong>冒险模式</strong><span class="mode-detail">种下第一道防线 <b aria-hidden="true">▶</b></span></button>
      <button id="levels" class="mode-button mode-levels"><img src="${asset('shovel.png')}" alt=""/><span><strong>关卡选择</strong><small>白天 · 夜晚 · 泳池</small></span></button>
      <button id="endless" class="mode-button mode-endless"><span class="menu-trophy" aria-hidden="true"></span><span><strong>无尽生存</strong><small>四种庭院，挑战更多旗帜</small></span></button>
    </nav>
    <button id="almanac" class="almanac-menu"><img src="${asset('seed-packet.png')}" alt=""/><img class="almanac-portrait" src="${asset('peashooter.png')}" alt=""/><span>植物图鉴<small>认识你的庭院守护者</small></span></button>
    <div class="menu-tools"><button id="settings" class="wood-button">设置</button><button id="help" class="wood-button">帮助</button></div>
    <span class="garden-note">准备好了吗？僵尸就要来了！</span>
  </div>
  <div id="overlay" class="overlay"><div class="paper-panel"><h2>正在准备庭院…</h2></div></div>
</section>
<footer><span>点击选卡、种植与收集阳光</span><span><kbd>1</kbd>–<kbd>6</kbd> 选卡　<kbd>Esc</kbd> 取消 / 暂停</span></footer>
</main>`;
const overlay = $('#overlay'); const audio = new GameAudio(); let scene: Scene;
let sceneLoading: Promise<void> | undefined;
let game = new Game(1, Date.now());
let screen: 'menu' | 'loading' | 'battle' = 'menu';
const clock = new GameClock();
const hud = new Hud($('#battle-hud'));
let packetKey = '';
let lastPhase = ''; let messageUntil = 0;
const backLabel = () => game.scenario === 'endless' && game.phase !== 'lost' ? '保存退出' : '返回主菜单';
const unlocked = (level: LevelId) => level <= completedLevel() + 1;

function showMenu() {
  game.pause(); screen = 'menu'; clock.reset(); scene?.app.stop();
  $('#menu').hidden = false; $('#battle-hud').hidden = true; overlay.hidden = true;
}
function panel(content: string, className = 'paper-panel') {
  overlay.hidden = false; overlay.innerHTML = `<div class="${className}">${content}</div>`;
}
function closeMenuPanel() { overlay.hidden = true; }
function levelPicker() {
  panel(`<span class="kicker">冒险模式</span><h2>选择你的庭院</h2><p>通关后解锁下一关，进度保存在当前浏览器。</p>
    <div class="level-grid">${LEVEL_IDS.map(level => `<button class="level-card" data-level="${level}" ${unlocked(level) ? '' : 'disabled'}><b>${LEVELS[level].label}</b><img loading="lazy" src="${asset(`${LEVELS[level].seeds.at(-1)}.png`)}" alt=""/><strong>${LEVELS[level].title}</strong><small>${unlocked(level) ? `${LEVELS[level].rows.length} 条草坪 · ${LEVELS[level].waveCount} 波` : '完成上一关解锁'}</small></button>`).join('')}</div><button id="close" class="wood-button">返回主菜单</button>`, 'paper-panel wide-panel level-panel');
  document.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(button => button.onclick = () => setLevel(Number(button.dataset.level) as LevelId));
  $('#close').onclick = closeMenuPanel;
}
function setLevel(level: LevelId, scenario: Game['scenario'] = 'adventure', survivalScene: SurvivalScene = 'day') {
  game = new Game(level, Date.now(), scenario, survivalScene);
  game.autoCollectSun = $<HTMLInputElement>('#auto-sun').checked;
  mountGame();
}
async function mountGame() {
  screen = 'loading'; scene?.app.stop(); $('#battle-hud').hidden = true;
  panel('<h2>正在准备庭院…</h2><p id="loading-status" role="status">准备画面</p>');
  const progress = (done: number, total: number) => { $('#loading-status').textContent = `加载资源 ${done} / ${total}`; };
  await ensureScene();
  await scene.prepareBoard(game, progress);
  scene.setLevel(game);
  if (game.phase !== 'ready' || game.plants.length || game.zombies.length || game.suns.length || game.rollers.length || game.peas.length || game.craters.length) await scene.prepareActors(game, progress);
  screen = 'battle'; $('#menu').hidden = true; $('#battle-hud').hidden = false;
  clock.reset(); messageUntil = 0; lastPhase = '';
  $<HTMLInputElement>('#auto-sun').checked = game.autoCollectSun;
  $('#speed').textContent = `${clock.speed}×`; $('#speed').setAttribute('aria-label', `游戏速度 ${clock.speed} 倍`);
  $('#canvas-host').classList.toggle('whack-field', game.config.mode === 'whack');
  $('.seed-bank').classList.toggle('conveyor-bank', game.hasConveyor);
  $('#shovel').hidden = game.scenario === 'adventure' && game.level < 6;
  document.querySelectorAll('.meter-flag').forEach(flag => flag.remove());
  $('.wave-meter').insertAdjacentHTML('beforeend', game.waves.map((_, index) => game.isFlagWave(index) ? `<img loading="lazy" class="meter-flag" style="left:${(1 - (index + 1) / game.config.waveCount) * 84}%" src="${asset('meter-flag.png')}" alt="第 ${index + 1} 波旗帜"/>` : '').join(''));
  packetKey = '';
  renderSeedBank(); updateConveyor(); scene.render(game); scene.app.render(); updateHud();
}
function renderSeedBank() {
  $('#seed-cards').innerHTML = (!game.hasConveyor ? game.seeds : []).map((kind, index) => `<button class="seed-card" data-plant="${kind}" title="${PLANTS[kind].name} · ${PLANTS[kind].cost} 阳光 · 快捷键 ${index + 1}" aria-label="${PLANTS[kind].name}，${PLANTS[kind].cost} 阳光">${seedImage(kind)}<span class="cooldown-cover"></span><span class="cooldown-number"></span></button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('#seed-cards [data-plant]').forEach(button => button.onclick = () => { game.select(button.dataset.plant as PlantKind); updateHud(); });
  hud.bindSeeds();
}
function seedChooser() {
  panel(`<span class="kicker">${game.scenario === 'endless' ? `${game.config.title} · 第 ${game.survivalStage + 1} 轮` : `冒险模式 ${game.config.label} · ${game.config.title}`}</span><h2>选择你的植物</h2>${game.scenario === 'endless' ? `<p>${game.survivalStage === 0 ? '50 初始阳光 · 每轮 20 波，守住两面旗后重新选卡。' : `已守住 ${game.survivalFlags} 旗 · 防线与 ${game.sun} 阳光保留，开战 6 秒后出怪。`}<br/>本轮：${game.survivalEnemies.map(kind => ZOMBIE_NAMES[kind]).join('、')}</p>` : game.level > 10 ? `<p>${game.config.description}</p>` : ''}<p>带上六张植物卡。点击已选卡片可以放回，按选择顺序进入战斗。</p>
    <div id="chosen-seeds" class="chosen-seeds" aria-label="六个植物槽位"></div>
    <div class="seed-options">${game.config.seeds.map(kind => `<button class="seed-option" data-choice="${kind}" aria-label="选择${PLANTS[kind].name}" aria-pressed="false">${seedImage(kind)}<span>${PLANTS[kind].name}</span></button>`).join('')}</div>
    <p id="choice-count" role="status"></p><div class="chooser-actions"><button id="start" class="wood-button large" disabled>一起摇滚吧！</button><button class="text-button back-menu">${backLabel()}</button></div>`, `paper-panel chooser-panel${game.config.seeds.length > 10 ? ' night-chooser' : ''}`);
  const update = () => {
    $('#chosen-seeds').innerHTML = Array.from({ length: 6 }, (_, index) => {
      const kind = game.seeds[index];
      return kind ? `<button class="chosen-seed" data-remove="${kind}" aria-label="放回${PLANTS[kind].name}">${seedImage(kind)}</button>` : `<span class="empty-seed" aria-label="空槽位 ${index + 1}">${index + 1}</span>`;
    }).join('');
    document.querySelectorAll<HTMLButtonElement>('[data-remove]').forEach(button => button.onclick = () => { game.chooseSeed(button.dataset.remove as PlantKind); update(); });
    document.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button => {
      const selected = game.seeds.includes(button.dataset.choice as PlantKind);
      button.setAttribute('aria-pressed', String(selected));
      button.disabled = game.seeds.length === 6 && !selected;
    });
    $('#choice-count').textContent = `已选 ${game.seeds.length} / 6`;
    $<HTMLButtonElement>('#start').disabled = game.seeds.length !== 6;
    renderSeedBank(); hud.update(game, '');
  };
  document.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button => button.onclick = () => { game.chooseSeed(button.dataset.choice as PlantKind); update(); });
  update();
}
function updateConveyor() {
  if (!game.hasConveyor) return;
  const key = game.conveyor.map(packet => packet.id).join(',');
  if (key === packetKey) return;
  packetKey = key;
  const cards = $('#seed-cards');
  for (const button of cards.querySelectorAll<HTMLButtonElement>('[data-packet]')) {
    if (!game.conveyor.some(packet => packet.id === Number(button.dataset.packet))) button.remove();
  }
  for (const packet of game.conveyor) if (!cards.querySelector(`[data-packet="${packet.id}"]`)) {
    const button = document.createElement('button'); button.className = 'seed-card conveyor-card';
    button.dataset.packet = String(packet.id); button.dataset.plant = packet.kind;
    button.setAttribute('aria-label', PLANTS[packet.kind].name); button.title = PLANTS[packet.kind].name;
    button.innerHTML = `<img loading="lazy" src="${asset('seed-packet.png')}" alt=""/><img loading="lazy" class="conveyor-plant" src="${asset(`${packet.kind}.png`)}" alt=""/><span class="cooldown-cover"></span><span class="cooldown-number"></span>`;
    button.onclick = () => { game.selectPacket(packet.id); updateHud(); }; cards.appendChild(button);
  }
  hud.bindSeeds();
}
function phasePanel() {
  if (game.phase === 'playing') { overlay.hidden = true; return; }
  if (game.phase === 'ready') {
    if (game.needsSeedChoice) seedChooser();
    else panel(`<span class="kicker">冒险模式 ${game.config.label}</span><img loading="lazy" class="intro-plant" src="${asset(`${game.config.seeds.at(-1)}.png`)}" alt=""/><h2>${game.config.title}</h2><p>${game.config.description}</p><div class="facts">${game.config.rows.length} 条草坪　·　${game.config.waveCount} 波僵尸　·　${game.hasConveyor ? '传送带供应 · 无需阳光' : `${game.config.initialSun} 初始阳光`}</div><button id="start" class="wood-button large">${game.config.mode === 'whack' ? '拿起木槌' : game.config.mode === 'bowling' ? '开始保龄球' : game.config.mode === 'conveyor' ? '开始传送带决战' : '开始种植'}</button><button class="text-button back-menu">${backLabel()}</button>`);
    $('#start').onclick = async () => { $<HTMLButtonElement>('#start').disabled = true; $('#start').textContent = '准备角色…'; await Promise.all([audio.unlock(game), scene.prepareActors(game, (done,total) => { $('#start').textContent = `准备角色 ${done} / ${total}`; })]); game.start(); updateHud(); };
  } else if (game.phase === 'paused') {
    panel(`<div class="pause-content"><h2>庭院休息中</h2><p>准备好了，就继续守护草坪。</p><button id="resume" class="wood-button large">继续游戏</button><button id="restart" class="wood-button large">重新开始</button><button class="wood-button large back-menu">${game.scenario === 'endless' ? '保存退出' : '返回主菜单'}</button><button id="pause-sound" class="text-button">音效：${audio.muted ? '关闭' : '开启'}</button></div>`, 'pause-panel');
    $('#resume').onclick = async () => { await audio.unlock(game); game.resume(); updateHud(); }; $('#restart').onclick = () => { if(game.scenario==='endless')clearSurvival(game.survivalScene); setLevel(game.level, game.scenario, game.survivalScene); };
    $('#pause-sound').onclick = () => { audio.muted = !audio.muted; $('#pause-sound').textContent = `音效：${audio.muted ? '关闭' : '开启'}`; };
  } else if (game.phase === 'intermission') {
    panel(`<span class="kicker">${game.config.title} · 第 ${game.survivalStage + 1} 轮完成</span><h2>已守住 ${game.survivalFlags} 面旗帜！</h2><p>下一轮僵尸更多，重新挑选六张植物卡。<br/>场上植物、剩余阳光、卡片冷却和割草机状态保留。</p><div class="facts">累计击败 ${game.kills} 只僵尸 · 剩余 ${game.sun} 阳光</div><button id="repick" class="wood-button large">继续守护 · 重新选卡</button><button class="text-button back-menu">保存退出</button>`);
    $('#repick').onclick = () => { game.nextSurvivalStage(); clock.reset(); messageUntil = 0; updateHud(); };
  } else if (game.phase === 'won') {
    const reward = game.config.reward;
    const shovel = game.level === 4;
    const name = shovel ? '铲子' : reward ? PLANTS[reward].name : game.level === 24 ? '小僵尸来袭' : game.level === 9 || game.level === 19 ? '最后的挑战' : game.level === 14 ? '木槌准备好了' : '当前冒险阶段完成';
    const description = shovel ? '可以铲除植物、重新布置防线。下一关来玩坚果保龄球！' : reward ? `${PLANTS[reward].cost} 阳光 · 下一关可以使用` : game.level === 24 ? '下一关使用四种传送带植物，迎战成群的小僵尸！' : game.level === 9 || game.level === 19 ? '下一关由传送带供应植物，迎战本场景最后两面旗帜！' : game.level === 14 ? '接下来是打僵尸！点击僵尸挥动木槌，辅助植物可以帮助清场。' : '已完成当前 25 关。后续泳池关卡将继续开放，也可以挑战四种场景的无尽生存。';
    panel(`<span class="kicker">${shovel ? '你获得了新工具！' : reward ? '你获得了一株新植物！' : '庭院守住了！'}</span><img loading="lazy" class="reward-image" src="${asset(shovel ? 'shovel.png' : reward ? composedPacket(reward) ? `${reward}.png` : `card-${reward}.png` : 'trophy.png')}" alt="${name}"/><h2>${name}</h2><p>${description}</p><div class="facts">击败 ${game.kills} 只僵尸　·　使用 ${game.planted} 张植物卡</div><button id="next" class="wood-button large">${game.level < lastLevel ? '下一关' : '返回主菜单'}</button><button id="replay" class="text-button">重玩本关</button>`, 'paper-panel reward-panel');
    $('#next').onclick = () => game.level < lastLevel ? setLevel((game.level + 1) as LevelId) : showMenu();
    $('#replay').onclick = () => setLevel(game.level);
  } else {
    panel(`<span class="kicker">僵尸入侵</span><h2>僵尸吃掉了你的脑子！</h2>${game.scenario === 'endless' ? `<p>本次守住 ${game.survivalFlags} 面旗帜 · 累计击败 ${game.kills} 只僵尸</p>` : ''}<p>${game.config.mode === 'whack' ? '先敲最靠近房子的僵尸，<br/>路障需要两锤，铁桶需要三锤。' : game.config.mode === 'bowling' ? '把坚果滚向最靠近房子的僵尸，<br/>留下爆炸坚果应对密集队伍。' : game.config.mode === 'conveyor' ? '及时使用传送带植物，<br/>留下樱桃炸弹应对密集队伍。' : '试着先种向日葵积攒阳光，<br/>再把射手放在靠左的位置。'}</p><button id="retry" class="wood-button large">重新开始</button><button class="text-button back-menu">${backLabel()}</button>`);
    $('#retry').onclick = () => setLevel(game.level, game.scenario, game.survivalScene);
  }
  document.querySelectorAll<HTMLButtonElement>('.back-menu').forEach(button => button.onclick = () => { if (game.scenario === 'endless' && game.phase !== 'lost') saveSurvival(game, clock.speed); showMenu(); });
}
function updateHud() {
  if (screen !== 'battle') return;
  let advice = '';
  if (game.phase === 'playing') {
    if (game.flagWarningIn > 0) advice = '一大波僵尸即将来袭！';
    else if (game.digging) advice = '点击要铲除的植物，右键取消';
    else if (game.config.mode === 'bowling' && (game.selected || game.planted === 0)) advice = '选择传送带上的坚果，在红线左侧滚出';
    else if (game.config.mode === 'conveyor' && (game.selected || game.planted === 0)) advice = '从传送带取卡，种在空草地上，无需阳光';
    else if (game.config.mode === 'whack' && !game.selected) advice = '点击僵尸挥动木槌 · 路障两次、铁桶三次';
    else if (game.planted === 0) advice = game.level === 1 ? '选择豌豆射手，再点击中间的草地' : isNight(game.config.environment) ? '夜晚没有天空阳光，用阳光植物积攒阳光，小喷菇免费' : '先种向日葵，积攒阳光';
    else if (game.collected === 0 && game.suns.length > 0) advice = '点击阳光收集';
    else if (game.ticks < messageUntil) advice = game.wave === game.config.waveCount ? game.scenario === 'endless' ? '本轮最后一波！' : '最后一波！' : '僵尸来了！';
    else if (game.selected) advice = `把${PLANTS[game.selected].name}种在草地上`;
  }
  updateConveyor(); hud.update(game, advice);
  if (lastPhase !== game.phase) {
    lastPhase = game.phase; phasePanel();
    if (game.phase === 'playing' || game.phase === 'won' || game.phase === 'lost') scene.app.start();
    else { scene.app.stop(); scene.render(game, 0, 1); scene.app.render(); }
  }
}
function pause() {
  if (screen !== 'battle') return;
  if (game.phase === 'playing') game.pause(); else if (game.phase === 'paused') game.resume();
  clock.reset(); updateHud();
}
$('#pause').onclick = pause;
$<HTMLInputElement>('#auto-sun').onchange = () => { game.autoCollectSun = $<HTMLInputElement>('#auto-sun').checked; };
$('#shovel').onclick = () => { game.toggleShovel(); updateHud(); };
$('#speed').onclick = () => {
  clock.speed = (clock.speed === 1 ? 2 : clock.speed === 2 ? 4 : 1) as GameSpeed;
  $('#speed').textContent = `${clock.speed}×`;
  $('#speed').setAttribute('aria-label', `游戏速度 ${clock.speed} 倍`);
};
$('#adventure').onclick = () => setLevel(Math.min(lastLevel, completedLevel() + 1) as LevelId);
$('#levels').onclick = levelPicker;
$('#endless').onclick = () => {
  panel(`<span class="kicker">生存 · 无尽</span><h2>选择无尽场景</h2><p>每轮 20 波，轮间重选六张植物卡。<br/>暂停菜单可保存退出；每个场景分别保留一份进度。</p><div class="survival-scenes">${SURVIVAL_SCENES.map(scene => {
    const saved = loadSurvival(scene);
    return `<article><img loading="lazy" src="${asset(scene === 'day' ? 'menu.png' : `${scene}.png`)}" alt=""/><h3>${SCENE_NAMES[scene]}</h3><p>${scene==='day'?'五行草坪 · 天空阳光':scene==='night'?'五行夜晚 · 墓碑与蘑菇':scene==='pool'?'六行泳池 · 睡莲与水路':'六行迷雾 · 无天空阳光 · 路灯花照明'}</p>${saved ? `<button class="wood-button" data-continue="${scene}">继续第 ${saved.game.survivalStage+1} 轮</button>` : ''}<button class="text-button" data-survival="${scene}">${saved ? '新开一局（替换此存档）' : '开始挑战'}</button></article>`;
  }).join('')}</div><p>已接舞王、橄榄球和潜水僵尸；巨人、屋顶及其他后期单位尚未接入。</p><button id="close" class="wood-button">返回主菜单</button>`, 'paper-panel wide-panel survival-panel');
  document.querySelectorAll<HTMLButtonElement>('[data-survival]').forEach(button => button.onclick = () => { const scene = button.dataset.survival as SurvivalScene; clearSurvival(scene); setLevel(9,'endless',scene); });
  document.querySelectorAll<HTMLButtonElement>('[data-continue]').forEach(button => button.onclick = () => { const saved=loadSurvival(button.dataset.continue as SurvivalScene)!; game=Game.restore(saved.game); clock.speed=saved.speed; mountGame(); });
  $('#close').onclick = closeMenuPanel;
};
$('#almanac').onclick = () => {
  const descriptions = { tanglekelp:'直接种在空水面，缠住并拖走一只附近的水路僵尸，包括潜水僵尸。', iceshroom:'冻结全场僵尸并造成 20 伤害，解冻后继续减速。白天睡眠。', doomshroom:'大范围爆炸造成 1800 伤害，留下持续三分钟的弹坑。白天睡眠。', lilypad:'种在泳池水路上，承载一株陆生植物。', squash:'发现近处僵尸后跳起压下，对落点周围造成 1800 伤害。', threepeater:'同时守住本行和相邻两行，每颗豌豆 20 伤害。', plantern:'照亮周围迷雾，种在水上需要睡莲。', hypnoshroom: '被吃下后让僵尸转向，攻击其他僵尸；保留它的剩余护甲和生命。', scaredyshroom: '25 阳光，向整排发射 20 伤害的孢子。附近有敌人时缩起并停止攻击。', puffshroom: '免费，向前喷射短程孢子，每次造成 20 点伤害。', sunshroom: '初产 15 点阳光，约两分钟后长大产 25 点阳光。', fumeshroom: '向前喷出烟雾，对同排范围内多个僵尸造成 20 点伤害，穿透门盾与报纸。', gravebuster: '种在墓碑上，啃食 4 秒后与墓碑一起消失。', chomper: '吞下同排靠近的僵尸，消化需要 40 秒。消化时请保护它。', repeater: '每轮发射两颗豌豆，每颗造成 20 点伤害。', potatomine: '埋下 15 秒后武装，对同排靠近的僵尸造成 1800 点伤害。', snowpea: '发射冰豌豆造成 20 点伤害，并减缓僵尸 10 秒。', explodenut: '保龄球专用。碰到僵尸后爆炸，攻击附近三排。', peashooter: '向同一排的僵尸发射豌豆，每次造成 20 点伤害。', sunflower: '定期生产 25 点阳光，让你种下更多植物。', cherrybomb: '种下约 1 秒后爆炸，对附近三排造成 1800 点伤害。', wallnut: '拥有 4000 点生命，为身后的射手争取时间。' };
  panel(`<span class="kicker">植物图鉴</span><h2>认识你的守护者</h2><div class="almanac-grid">${(Object.keys(PLANTS) as PlantKind[]).map(kind => `<article><img loading="lazy" src="${asset(`${kind}.png`)}" alt=""/><div><h3>${PLANTS[kind].name}<span>${kind === 'explodenut' ? '传送带专用' : `${PLANTS[kind].cost} 阳光`}</span></h3><p>${descriptions[kind]}</p></div></article>`).join('')}</div><button id="close" class="wood-button">返回主菜单</button>`, 'paper-panel wide-panel'); $('#close').onclick = closeMenuPanel;
};
$('#settings').onclick = () => {
  panel(`<span class="kicker">庭院设置</span><h2>准备好出发</h2><button id="sound" class="wood-button large">音效：${audio.muted ? '关闭' : '开启'}</button><button id="fullscreen" class="wood-button large">切换全屏</button><button id="pwa" class="wood-button large">安装与离线</button><button id="close" class="text-button">返回主菜单</button>`);
  $('#pwa').onclick = showPwa;
  $('#sound').onclick = () => { audio.muted = !audio.muted; $('#sound').textContent = `音效：${audio.muted ? '关闭' : '开启'}`; };
  $('#fullscreen').onclick = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void $('.page').requestFullscreen(); };
  $('#close').onclick = closeMenuPanel;
};
$('#help').onclick = () => {
  panel('<span class="kicker">庭院指南</span><h2>种下你的第一道防线</h2><ol class="help-list"><li>点击植物卡片，再点击草地种植。</li><li>点击阳光收集，也可勾选右上角“自动收集阳光”；植物需要阳光和冷却时间。</li><li>向日葵放后方，坚果挡前方；樱桃应对密集僵尸。</li><li>保龄球关从传送带取卡，在红线左侧滚出坚果。</li><li>1–8 起在战前选择六张植物卡；1–10 从传送带取卡种植，无需阳光。</li><li>2–5 点击僵尸挥动木槌，路障两次、铁桶三次。选取辅助植物时切换到种植，右键回到木槌。</li><li>夜晚没有天空阳光；小喷菇射程短，大喷菇能穿门盾，墓碑吞噬者只能种在墓碑上。</li><li>每排割草机只能使用一次。消灭所有波次即可通关。</li></ol><p>数字 1–6 选卡（传送带可用 1–8） · 右键取消选卡 · Esc 暂停</p><button id="close" class="wood-button">返回主菜单</button>'); $('#close').onclick = closeMenuPanel;
};
window.addEventListener('keydown', event => {
  if (event.repeat || screen === 'loading') return;
  if (event.key === 'Escape') { if (screen === 'menu') closeMenuPanel(); else if (game.selected || game.digging) { game.cancelSelection(); updateHud(); } else pause(); }
  if (screen === 'battle' && ['1', '2', '3', '4', '5', '6', '7', '8'].includes(event.key)) {
    if (game.hasConveyor) {
      const packet = game.conveyor[Number(event.key) - 1]; if (packet) { game.selectPacket(packet.id); updateHud(); }
      return;
    }
    const kind = game.seeds[Number(event.key) - 1]; if (kind) { game.select(kind); updateHud(); }
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && game.phase === 'playing') { game.pause(); clock.reset(); updateHud(); } });
async function ensureScene() {
  sceneLoading ??= (async () => {
    const { Scene } = await import('./rendering/scene');
    scene = new Scene();
    await scene.init($('#canvas-host'));
    const canvas = scene.app.canvas;
    const point = (event: PointerEvent) => { const bounds = canvas.getBoundingClientRect(); return { x: (event.clientX - bounds.left) * BOARD.width / bounds.width, y: (event.clientY - bounds.top) * BOARD.height / bounds.height }; };
    canvas.addEventListener('pointermove', event => scene.setPointer(point(event))); canvas.addEventListener('pointerleave', () => scene.setPointer(null));
    canvas.addEventListener('pointerdown', event => {
      if (screen !== 'battle' || game.phase !== 'playing' || event.button !== 0) return;
      const { x, y } = point(event); const sun = [...game.suns].reverse().find(sun => Math.hypot(sun.x - x, sun.y - y) <= 35);
      if (sun) game.collectSun(sun.id); else if (game.config.mode === 'whack' && !game.selected && !game.digging) game.whack(x, y); else if (game.digging) game.dig(Math.floor((x - BOARD.left) / BOARD.cellWidth), game.rowAt(y)); else game.plant(Math.floor((x - BOARD.left) / BOARD.cellWidth), game.rowAt(y));
      updateHud();
    });
    canvas.addEventListener('contextmenu', event => { event.preventDefault(); game.cancelSelection(); updateHud(); });
    scene.app.ticker.add(ticker => {
      if (screen === 'battle') clock.advance(game, ticker.deltaMS, () => scene.captureMovement());
      for (const event of game.drainEvents()) {
        if (event.kind !== 'wave' || game.wave === game.config.waveCount) audio.play(event.kind);
        scene.event(event);
        if (event.kind === 'wave') messageUntil = game.ticks + 280;
        if (event.kind === 'win') completeLevel(game.level);
        if (event.kind === 'lose' && game.scenario === 'endless') clearSurvival(game.survivalScene);
      }
      if (screen === 'battle') { scene.render(game, ticker.deltaMS * clock.speed, clock.alpha); updateHud(); }
    });
  })();
  await sceneLoading;
}
showMenu();
