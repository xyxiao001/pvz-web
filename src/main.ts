import { bindBattlePointer } from './platform/battle-pointer';
import { bindSeedInspection } from './platform/seed-inspection';
import { PlayerProfile, SHOP, type ShopItem } from './platform/profile';
import { DIALOGUE, adventureDialogue, tutorialHint } from './game/dialogue';
import './campaign.css';
import { PLANT_DESCRIPTIONS } from './game/plant-descriptions';
import './style.css';
import './ui.css';
import './mobile.css';
import './hud-skin.css';
import './interaction.css';
import './widescreen.css';
import { registerPwa, showPwa } from './platform/pwa';
void registerPwa();
import { ZOMBIE_NAMES } from './game/survival';
import { GameClock, type GameSpeed } from './game/clock';
import { Hud } from './rendering/hud';
import type { Scene } from './rendering/scene';
import { isUpgrade, BOARD, SURVIVAL_MODES, SURVIVAL_MODE_NAMES, type SurvivalMode, SURVIVAL_SCENES, SCENE_NAMES, isNight, type SurvivalScene, LEVEL_IDS, LEVELS, PLANTS, type LevelId, type PlantKind } from './game/config';
import { Game } from './game/model';
import { GameAudio } from './platform/audio';
import { GameMusic, battleMusic } from './platform/music';
import { clearSurvival, loadSurvival, saveSurvival, completeLevel, allLevelsEnabled, setAllLevelsEnabled } from './platform/storage';

import { ACHIEVEMENTS, Achievements } from './platform/achievements';

const asset = (file: string) => `${import.meta.env.BASE_URL}assets/runtime/original/${file.replace(/\.png$/, ".webp")}`;
const lastLevel = LEVEL_IDS[LEVEL_IDS.length - 1];
// Composed packets use the original empty packet and plant portrait; prices stay crisp in the DOM.
const composedPacket = (kind: PlantKind) => isUpgrade(kind) || kind==='imitater' || ['wintermelon','gatlingpea','twinsunflower','fumeshroom','gravebuster','iceshroom','doomshroom','lilypad','squash','threepeater','plantern','tanglekelp','jalapeno','spikeweed','torchwood','tallnut','seashroom','cactus','blover','splitpea','starfruit','pumpkin','magnetshroom','cabbagepult','flowerpot','kernelpult','coffeebean','garlic','umbrella','marigold','melonpult'].includes(kind);
const seedImage = (kind: PlantKind, cost: number = PLANTS[kind].cost) => composedPacket(kind)
  ? `<span class="packet-art"><img loading="lazy" src="${asset('seed-packet.png')}" alt=""/><img loading="lazy" class="packet-portrait" src="${asset(`${kind}.png`)}" alt=""/><b class="packet-price">${cost}</b></span>`
  : `<img loading="lazy" src="${asset(`card-${kind}.png`)}" alt=""/>`;
const $ = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
// Local diagnostics: preserve the browser's normal error reporting and failure behavior.
const diagnostics = document.createElement('details');
diagnostics.hidden = true; diagnostics.open = true;
diagnostics.style.cssText = 'position:fixed;z-index:1000;left:2vw;bottom:2vh;width:min(640px,96vw);max-height:45dvh;overflow:auto;background:#241712;color:#fff0c5;border:2px solid #d3a864;padding:10px;border-radius:8px;font:13px/1.5 monospace;';
const diagnosticSummary = document.createElement('summary');
diagnosticSummary.textContent = '游戏运行错误（展开后可长按复制）';
const diagnosticText = document.createElement('textarea');
diagnosticText.readOnly = true; diagnosticText.setAttribute('aria-label', '游戏错误详情');
diagnosticText.style.cssText = 'box-sizing:border-box;width:100%;height:25dvh;margin-top:8px;background:#130e0b;color:#fff0c5;font:12px/1.5 monospace;user-select:text;';
diagnostics.append(diagnosticSummary, diagnosticText); document.body.append(diagnostics);
function showDiagnostic(error: unknown) {
  const message = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack}` : String(error);
  diagnosticText.value += `${navigator.userAgent}\nViewport ${innerWidth}×${innerHeight}, DPR ${devicePixelRatio}\n${message}\n\n`;
  diagnostics.hidden = false;
}
window.addEventListener('error', event => showDiagnostic(event.error ?? event.message));
window.addEventListener('unhandledrejection', event => showDiagnostic(event.reason));

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<main class="page"><div class="page-top"><span>植物大战僵尸</span><span>WEB · 冒险与生存</span></div>
<section id="game-frame" class="game-frame" aria-label="植物大战僵尸游戏">
  <div id="canvas-host"><div id="planting-feedback" class="planting-feedback" role="status" hidden></div></div>
  <div id="battle-hud" hidden>
    <div class="seed-bank"><div id="conveyor-belt"></div><strong id="sun-total">150</strong><div id="seed-cards"></div></div>
    <button id="shovel" class="shovel-button" hidden title="铲除植物（不返还阳光）" aria-label="铲子" aria-pressed="false"><img loading="lazy" src="${asset('shovel.png')}" alt=""/></button>
    <div class="battle-controls"><label class="auto-sun"><input id="auto-sun" type="checkbox"/>自动收集阳光</label><button id="speed" class="wood-button" title="切换游戏速度：1× / 2× / 4×" aria-label="游戏速度 1 倍">1×</button><button id="pause" class="wood-button">菜单</button></div>
    <div id="advice" class="advice" role="status"></div><button id="cancel-action" class="wood-button action-cancel" hidden>取消</button>
    <div class="level-caption" id="level-label"></div>
    <div class="wave-hud"><span id="wave-label"></span><div class="wave-meter"><div id="wave-fill"></div><img loading="lazy" class="meter-flag" src="${asset('meter-flag.png')}" alt="最终波次"/><img loading="lazy" id="meter-head" src="${asset('meter-head.png')}" alt=""/></div></div>
  </div>
  <div id="menu" class="main-menu">
    <img class="game-logo" src="${asset('logo.png')}" alt="Plants vs. Zombies"/>
    <div class="garden-sign"><span>欢迎回到</span><b>疯狂戴夫的庭院</b></div>
    <div class="garden-defenders" aria-hidden="true"><img class="defender-sunflower" src="${asset('sunflower.png')}" alt=""/><img class="defender-pea" src="${asset('peashooter.png')}" alt=""/><img class="defender-wallnut" src="${asset('wallnut.png')}" alt=""/></div>
    <nav class="menu-modes" aria-label="游戏模式">
      <button id="adventure" class="mode-button mode-adventure" aria-label="开始冒险"><span class="mode-eyebrow">守住你的草坪</span><strong>冒险模式</strong><span class="mode-detail">种下第一道防线 <b aria-hidden="true">▶</b></span></button>
      <button id="levels" class="mode-button mode-levels"><img src="${asset('shovel.png')}" alt=""/><span><strong>关卡选择</strong><small>白天 · 夜晚 · 泳池 · 迷雾 · 屋顶</small></span></button>
      <button id="endless" class="mode-button mode-endless"><span class="menu-trophy" aria-hidden="true"></span><span><strong>生存模式</strong><small>普通 · 困难 · 无尽挑战</small></span></button>
    </nav>
    <button id="almanac" class="almanac-menu"><img src="${asset('seed-packet.png')}" alt=""/><img class="almanac-portrait" src="${asset('peashooter.png')}" alt=""/><span>植物图鉴<small>认识你的庭院守护者</small></span></button>
    <div class="menu-tools"><button id="shop" class="wood-button">戴夫商店</button><button id="achievements" class="wood-button">成就</button><button id="settings" class="wood-button">设置</button><button id="help" class="wood-button">帮助</button></div>
    <span class="garden-note">准备好了吗？僵尸就要来了！</span>
  </div>
  <div id="achievement-toast" class="achievement-toast" role="status" hidden></div>
  <div id="overlay" class="overlay"><div class="paper-panel"><h2>正在准备庭院…</h2></div></div>
</section>
<footer><span>点击选卡、种植与收集阳光</span><span><kbd>1</kbd>–<kbd>6</kbd> 选卡　<kbd>Esc</kbd> 取消 / 暂停</span></footer>
</main>`;
const overlay = $('#overlay'); const audio = new GameAudio();
const achievements = new Achievements(localStorage);
const profile = new PlayerProfile(localStorage);
let dialogueAdvance: (() => void) | null = null;
let introShown = false;
let tutorialTarget: string | null = null;
let achievementToastTimer: ReturnType<typeof setTimeout>;
const music = new GameMusic(import.meta.env.BASE_URL);
let scene: Scene;
let showZombieHealth = false;
let sceneLoading: Promise<void> | undefined;
let game = new Game(1, Date.now());
let screen: 'menu' | 'loading' | 'battle' = 'menu';
const clock = new GameClock();
const hud = new Hud($('#battle-hud'));
let packetKey = '';
let lastPhase = ''; let messageUntil = 0;
let feedbackTimer: ReturnType<typeof setTimeout>;
function clearPlacementFeedback() {
  clearTimeout(feedbackTimer); $('#planting-feedback').hidden = true;
}
function placementFeedback(message: string, x: number, y: number) {
  const tip = $('#planting-feedback');
  clearTimeout(feedbackTimer);
  tip.textContent = message;
  const position = scene.toScreen(x,y), host = $('#canvas-host');
  tip.style.left = `${Math.max(17,Math.min(83,position.x/host.clientWidth*100))}%`;
  tip.style.top = `${Math.max(20,Math.min(88,position.y/host.clientHeight*100-12))}%`;
  tip.hidden = false;
  feedbackTimer = setTimeout(clearPlacementFeedback, 1600);
  if (message === '阳光不足' && !matchMedia('(prefers-reduced-motion: reduce)').matches)
    $('#sun-total').animate([{color:'#a12c18',transform:'scale(1.15)'},{color:'#17160c',transform:'scale(1)'}], {duration:350});
}
const backLabel = () => game.isSurvival && game.phase !== 'lost' && game.phase !== 'won' ? '保存退出' : '返回主菜单';

function showMenu() {
  clearPlacementFeedback();
  $('.page').classList.remove('in-battle', 'endless-game');
  bankCoins(); dialogueAdvance=null; game.pause(); screen = 'menu'; clock.reset(); if (scene) void scene.release();
  $('#menu').hidden = false; $('#battle-hud').hidden = true; overlay.hidden = true;
  $('#adventure .mode-detail').textContent = `第 ${profile.data.run} 周目 · ${LEVELS[profile.data.nextLevel].label} 继续冒险 ▶`;
  updateMusic();
}
function updateMusic() {
  music.setTrack(screen === 'menu' ? 'menu' : screen === 'loading' || game.phase === 'ready' || game.phase === 'intermission' ? 'choose' : game.phase === 'won' || game.phase === 'lost' ? null : battleMusic(game));
  music.setPaused(document.hidden || screen === 'battle' && game.phase === 'paused');
}
function panel(content: string, className = 'paper-panel') {
  overlay.classList.remove('chooser-overlay'); $('#battle-hud').classList.remove('choosing');
  overlay.hidden = false; overlay.innerHTML = `<div class="${className}">${content}</div>`;
}
function closeMenuPanel() { overlay.hidden = true; }
function levelPicker() {
  panel(`<span class="kicker">冒险模式 · 第 ${profile.data.run} 周目</span><h2>选择你的庭院</h2><p>共 50 关 · 通关记录保存在当前浏览器。</p><label class="all-levels-toggle"><input id="all-levels" type="checkbox" ${allLevelsEnabled() ? 'checked' : ''}/>开启全部关卡</label><p id="level-access"></p>
    <div class="level-grid">${LEVEL_IDS.map(level => `<button class="level-card" data-level="${level}"><b>${LEVELS[level].label}</b><img loading="lazy" src="${asset(`${LEVELS[level].seeds.at(-1)}.png`)}" alt=""/><strong>${LEVELS[level].title}</strong><small>${level === 50 ? '僵王博士 · 传送带决战' : level === 35 ? '三轮砸罐子' : `${LEVELS[level].rows.length} 条草坪 · ${LEVELS[level].waveCount} 波`}</small></button>`).join('')}</div><button id="close" class="wood-button">返回主菜单</button>`, 'paper-panel wide-panel level-panel');
  document.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(button => button.onclick = () => setLevel(Number(button.dataset.level) as LevelId));
  const updateAccess = () => {
    const all = allLevelsEnabled();
    const nextLevel = profile.data.nextLevel;
    document.querySelectorAll<HTMLButtonElement>('[data-level]').forEach(button => {
      button.disabled = !all && Number(button.dataset.level) > nextLevel;
    });
    $('#level-access').textContent = all ? '全部 50 关可直接挑战，不影响通关记录和成就。' : '按通关进度开放，完成当前关卡后解锁下一关。';
  };
  $<HTMLInputElement>('#all-levels').onchange = event => { setAllLevelsEnabled((event.currentTarget as HTMLInputElement).checked); updateAccess(); };
  updateAccess();
  $('#close').onclick = closeMenuPanel;
}
function bankCoins() {
  if(game.campaign?.sawYeti&&!profile.data.sawYeti){profile.data.sawYeti=true;profile.save();}
  const amount=game.money-game.bankedMoney;
  if (amount!==0) { profile.addMoney(amount); game.bankedMoney=game.money; }
}
function showDialogue(start: number, complete: () => void) {
  let index=start;
  const show = () => {
    const line=DIALOGUE[String(index)];
    const text=line.text.replaceAll('{PLAYER_NAME}','邻居').replaceAll('{MONEY}',`$${profile.data.money}`).replaceAll('{UPGRADE_COST}',`$${profile.price('slots')}`);
    const offer=index===1503||index===1553;
    panel(`<img class="dave-portrait" src="${asset('crazy-dave.webp')}" alt="疯狂戴夫"/><div class="dave-speech"><h2>疯狂戴夫</h2><p id="dave-line"></p>${offer?'<button id="offer-buy" class="wood-button">购买卡槽</button><button id="offer-no" class="wood-button">下次再说</button>':'<button id="dialogue-next" class="wood-button">继续 ▶</button>'}</div>`, 'dave-dialogue');
    $('#dave-line').textContent=text;
    const next=()=>{
      dialogueAdvance=null;
      if(index===2406) { game.beginShovelLesson(); void scene.prepareActors(game,()=>{}).then(()=>{lastPhase='';updateHud();}); return; }
      index++;
      if(index===603&&!profile.data.tacoReceived){profile.addMoney(1000);profile.data.tacoReceived=true;profile.data.tacoPending=false;profile.save();}
      if(DIALOGUE[String(index)]) show(); else { overlay.hidden=true; complete(); }
    };
    if(offer) {
      dialogueAdvance=null;
      $('#offer-buy').onclick=()=>{ profile.buy('slots',true); game.campaign!.slots=6+profile.data.purchases.slots;$('.page').classList.add('endless-game'); index=index===1503?1510:1560; show(); };
      $('#offer-no').onclick=()=>{profile.data.declinedSlots++;profile.save();index=index===1503?1520:1570;show();};
    } else { dialogueAdvance=next; $('#dialogue-next').onclick=next; }
  };
  show();
}
function shopPanel(close: () => void) {
  dialogueAdvance=null;
  if(profile.storeOpen&&!profile.data.storeIntroduced){showDialogue(301,()=>{profile.data.storeIntroduced=true;profile.save();shopPanel(close);});return;}
  if(profile.data.tacoPending){showDialogue(601,()=>shopPanel(close));return;}
  let page=0;
  const render=()=>{
    panel(`<header class="shop-heading"><h2>疯狂戴夫的小商店</h2><b>金币 $${profile.data.money.toLocaleString()}</b></header><p class="shop-message">${profile.storeOpen?'欢迎光临！点击商品查看说明，再决定购买。':'完成 3–4、取得车钥匙后，商店正式营业。'}</p><div class="shop-shelves">${SHOP.slice(page*8,page*8+8).map(item=>{const sold=profile.soldOut(item.id), unlocked=profile.available(item.id);return `<button class="shop-item" data-shop="${item.id}" ${!unlocked||sold?'disabled':''}><img loading="lazy" src="${asset(item.icon+'.webp')}" alt=""/><strong>${item.id==='slots'?`${Math.min(10,7+profile.data.purchases.slots)} 格种子卡槽`:item.name}</strong><span>${sold?'已购买':!unlocked?item.level===51?'通关冒险后开放':`${LEVELS[item.level as LevelId].label} 开放`:`$${profile.price(item.id).toLocaleString()}`}</span></button>`;}).join('')}</div><div id="shop-detail" class="shop-detail">${profile.storeOpen?'种好植物、守住庭院，把赚到的金币花在需要的装备上。':'可以先在冒险中收集金币。'}</div><footer class="shop-footer"><button id="shop-page" class="wood-button">${page===0?'下一页 ▶':'◀ 上一页'}</button><button id="shop-close" class="wood-button">返回</button></footer>`, 'shop-panel');
    $('#shop-close').onclick=close;
    $('#shop-page').onclick=()=>{page=1-page;render();};
    document.querySelectorAll<HTMLButtonElement>('[data-shop]').forEach(button=>button.onclick=()=>{
      const id=button.dataset.shop as ShopItem,item=SHOP.find(item=>item.id===id)!,cost=profile.price(id);
      $('#shop-detail').innerHTML=`<h3>${item.name} · $${cost.toLocaleString()}</h3><p>${item.description}</p><button id="buy-item" class="wood-button" ${profile.data.money<cost?'disabled':''}>${profile.data.money<cost?'金币不足':'确认购买'}</button><button id="cancel-buy" class="wood-button">再看看</button>`;
      $('#buy-item').onclick=()=>{profile.buy(id);render();}; $('#cancel-buy').onclick=render;
    });
  };
  render();
}
function setLevel(level: LevelId, scenario: Game['scenario'] = 'adventure', survivalScene: SurvivalScene = 'day') {
  clearPlacementFeedback();
  game = new Game(level, Date.now(), scenario, survivalScene, scenario === 'adventure' ? profile.rules() : null);
  introShown=false;
  game.autoCollectSun = $<HTMLInputElement>('#auto-sun').checked;
  mountGame();
}
async function mountGame() {
  $('.page').classList.remove('in-battle');
  $('.page').classList.toggle('endless-game', game.isSurvival || game.seedCapacity>6);
  screen = 'loading'; scene?.app.stop(); $('#battle-hud').hidden = true; updateMusic();
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
  $('#canvas-host').classList.toggle('whack-field', game.config.mode === 'whack' || game.config.mode === 'vase');
  $('.seed-bank').classList.toggle('conveyor-bank', game.hasConveyor);
  $('footer').innerHTML = game.isSurvival ? '点击选卡、种植与收集阳光 <span><kbd>1</kbd>–<kbd>9</kbd> / <kbd>0</kbd> 选卡　<kbd>Esc</kbd> 取消 / 暂停</span>' : '点击选卡、种植与收集阳光 <span><kbd>1</kbd>–<kbd>6</kbd> 选卡　<kbd>Esc</kbd> 取消 / 暂停</span>';
  $('#shovel').hidden = game.scenario === 'adventure' && game.level < 5 && !game.repeatAdventure;
  document.querySelectorAll('.meter-flag').forEach(flag => flag.remove());
  $('.wave-meter').insertAdjacentHTML('beforeend', game.waves.map((_, index) => game.isFlagWave(index) ? `<img loading="lazy" class="meter-flag" style="left:${(1 - (index + 1) / game.config.waveCount) * 84}%" src="${asset('meter-flag.png')}" alt="第 ${index + 1} 波旗帜"/>` : '').join(''));
  packetKey = '';
  renderSeedBank(); updateConveyor(); scene.render(game); scene.app.render(); updateHud();
}
function renderSeedBank() {
  $('#seed-cards').innerHTML = (!game.hasConveyor && game.config.mode !== 'vase' ? game.seeds : []).map((kind, index) => `<button class="seed-card" data-plant="${kind}" title="${PLANTS[kind].name} · ${game.plantCost(kind)} 阳光 · 快捷键 ${(index + 1) % 10}" aria-label="${PLANTS[kind].name}，${game.plantCost(kind)} 阳光">${seedImage(kind, game.plantCost(kind))}<span class="cooldown-cover"></span><span class="cooldown-number"></span></button>`).join('');
  document.querySelectorAll<HTMLButtonElement>('#seed-cards [data-plant]').forEach(button => button.onclick = () => { clearPlacementFeedback(); game.select(button.dataset.plant as PlantKind); updateHud(); });
  hud.bindSeeds(); tutorialTarget=null;
}
function seedChooser() {
  const enemies = [...new Set(game.isSurvival ? game.survivalEnemies : game.waves.flat())];
  panel(`<div id="chosen-seeds" class="chosen-seeds" aria-label="${game.seedCapacity} 个植物槽位"></div>
    <section class="chooser-catalog" aria-label="植物卡册"><h2>选择你的植物</h2>
      <div class="seed-options">${game.config.seeds.map(kind => `<button class="seed-option" data-choice="${kind}" title="${PLANTS[kind].name} · ${game.plantCost(kind)} 阳光" aria-label="选择${PLANTS[kind].name}" aria-pressed="false">${seedImage(kind, game.plantCost(kind))}</button>`).join('')}${Array.from({ length: Math.max(0, 48 - game.config.seeds.length) }, () => '<span class="seed-silhouette" aria-hidden="true"></span>').join('')}</div>
      <div class="chooser-footer"><button id="clear-seeds" class="text-button">清空选卡</button><span id="choice-count" role="status"></span><button id="start" class="seed-start" disabled>一起摇滚吧！</button></div>
    </section>
    <aside class="chooser-details"><span class="kicker">${game.isSurvival ? `生存 · ${SURVIVAL_MODE_NAMES[game.scenario as SurvivalMode]} · 第 ${game.survivalStage + 1} 轮` : `冒险模式 ${game.config.label}`}</span><h3>${game.config.title}</h3><p>${game.isSurvival ? `已守住 ${game.survivalFlags} 旗 · ${game.sun} 阳光` : SCENE_NAMES[game.config.environment]}</p><div class="chooser-enemies"><h4>${game.isSurvival ? '本轮僵尸' : '本关僵尸'}</h4><p>${enemies.map(kind => ZOMBIE_NAMES[kind]).join(' · ')}</p></div><p class="chooser-tip">${game.isSurvival ? '可携带 6–10 张植物卡' : `可携带 ${game.seedCapacity} 张植物卡${game.repeatAdventure?' · 戴夫指定三张':''}`}<br/>点击上方卡片，再选新卡替换；再点一次放回</p>${game.campaign&&profile.storeOpen?'<button id="chooser-shop" class="wood-button">戴夫商店</button>':''}<div id="plant-detail" class="plant-detail"><h4>了解你的植物</h4><p>悬停或长按卡片查看；点击选入。选满后仍可查看。</p></div></aside>
    <button class="wood-button chooser-back back-menu">${backLabel()}</button>`, 'seed-chooser');
  if(game.campaign&&profile.storeOpen)$('#chooser-shop').onclick=()=>shopPanel(()=>{game.applyPurchases(profile.rules());$('.page').classList.toggle('endless-game',game.seedCapacity>6);phasePanel();});
  overlay.classList.add('chooser-overlay'); $('#battle-hud').classList.add('choosing');
  const chosen = $('#chosen-seeds');
  const chosenCards = new Map<PlantKind, HTMLButtonElement>();
  let replacing: PlantKind | null = null;
  const emptySlots = Array.from({ length: game.seedCapacity }, (_, index) => {
    const slot = document.createElement('span'); slot.className = 'empty-seed';
    slot.setAttribute('aria-label', `空槽位 ${index + 1}`); return slot;
  });
  const update = () => {
    // Keep decoded images and in-flight animations on cards already selected.
    for (const [kind, card] of chosenCards) if (!game.seeds.includes(kind)) {
      card.remove(); chosenCards.delete(kind);
    }
    const slots = Array.from({ length: game.seedCapacity }, (_, index) => {
      const kind = game.seeds[index];
      if (!kind) return emptySlots[index];
      let card = chosenCards.get(kind);
      if (!card) {
        card = document.createElement('button'); card.className = 'chosen-seed';
        card.dataset.remove = kind; card.setAttribute('aria-label', `放回${PLANTS[kind].name}`);
        card.innerHTML = seedImage(kind==='imitater'?game.imitaterTarget!:kind, game.plantCost(kind));
        if(kind==='imitater')card.classList.add('imitater-card');
        // Selected cards are visible immediately and may fly from below the viewport.
        card.querySelectorAll('img').forEach(image => { image.loading = 'eager'; });
        card.disabled=game.davePicks.includes(kind);
        if (card.disabled) { card.classList.add('dave-picked'); card.title='戴夫为你选择的植物，不能放回'; }
        card.onclick = () => {
          if (replacing === kind) { game.chooseSeed(kind); replacing = null; }
          else replacing = kind;
          update();
        }; chosenCards.set(kind, card);
      }
      card.classList.toggle('replace-target', replacing === kind);
      card.setAttribute('aria-pressed', String(replacing === kind));
      card.setAttribute('aria-label', `${PLANTS[kind].name}，${replacing === kind ? '再次点击放回' : '点击选择替换'}`);
      return card;
    });
    slots.forEach((slot, index) => {
      if (chosen.children[index] !== slot) chosen.insertBefore(slot, chosen.children[index] ?? null);
    });
    while (chosen.children.length > slots.length) chosen.lastElementChild!.remove();
    document.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button => {
      const selected = game.seeds.includes(button.dataset.choice as PlantKind);
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('dave-picked', game.davePicks.includes(button.dataset.choice as PlantKind));
    });
    $('#choice-count').textContent = replacing ? `正在替换${PLANTS[replacing].name} · 请选择新卡` : game.canStart ? `准备出发！已选 ${game.seeds.length} / ${game.seedCapacity}` : `选择植物 ${game.seeds.length} / ${game.seedCapacity} · ${game.campaign?'请填满卡槽':'至少 6 张'}`;
    $<HTMLButtonElement>('#clear-seeds').disabled = game.seeds.length === game.davePicks.length;
    $<HTMLButtonElement>('#start').disabled = !game.canStart;
    renderSeedBank(); hud.update(game, '');
  };
  const choose = (kind: PlantKind) => {
    if (game.davePicks.includes(kind)) return;
    if (!game.seeds.includes(kind) && game.seeds.length === game.seedCapacity && replacing === null) { $('#choice-count').textContent='卡槽已满 · 点击上方卡片选择替换'; return; }
    if(kind==='imitater'&&!game.seeds.includes(kind)){
      $('#plant-detail').innerHTML=`<h4>模仿哪一种植物？</h4><div class=imitater-options>${game.config.seeds.filter(k=>!isUpgrade(k)&&k!=='imitater').map(k=>`<button class=text-button data-imitate="${k}">${PLANTS[k].name}</button>`).join('')}</div>`;
      document.querySelectorAll<HTMLButtonElement>('[data-imitate]').forEach(b=>b.onclick=()=>{game.chooseImitater(b.dataset.imitate as PlantKind,replacing ?? undefined);replacing=null;update();$('#plant-detail').innerHTML=`<h4>模仿者 · ${PLANTS[game.imitaterTarget!].name}</h4><p>独立冷却，种下后变身。</p>`;});return;
    }
    const removing = game.seeds.includes(kind);
    const from = $(removing ? `[data-remove="${kind}"]` : `[data-choice="${kind}"]`).getBoundingClientRect();
    if (!removing && replacing !== null) game.replaceSeed(replacing,kind);
    else game.chooseSeed(kind);
    replacing = null; update();
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      const target = $(removing ? `[data-choice="${kind}"]` : `[data-remove="${kind}"]`);
      const to = target.getBoundingClientRect();
      target.animate([{ transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${from.width / to.width}, ${from.height / to.height})` }, { transform: 'none' }], { duration: 250, easing: 'ease-in-out' });
    }
  };
  document.querySelectorAll<HTMLButtonElement>('[data-choice]').forEach(button => {
    const kind = button.dataset.choice as PlantKind;
    const detail = () => { $('#plant-detail').innerHTML = `<h4>${PLANTS[kind].name} · ${game.plantCost(kind)} 阳光</h4><p>${PLANT_DESCRIPTIONS[kind]}</p><small>冷却 ${PLANTS[kind].cooldown / 100} 秒</small>`; };
    bindSeedInspection(button, detail, () => choose(kind));
  });
  $('#clear-seeds').onclick = () => { replacing=null; for (const kind of [...game.seeds]) game.chooseSeed(kind); update(); };
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
  $('.page').classList.toggle('in-battle', game.phase !== 'ready');
  updateMusic();
  if (game.phase === 'playing') { overlay.hidden = true; overlay.classList.remove('chooser-overlay'); $('#battle-hud').classList.remove('choosing'); return; }
  if (game.phase === 'ready') {
    if (game.tutorial==='shovel-done') { game.tutorial='off'; showDialogue(2410,phasePanel); return; }
    if (!introShown) {
      introShown=true; const start=adventureDialogue(game,profile.data);
      if (start!==null) { showDialogue(start,phasePanel); return; }
    }
    if (game.needsSeedChoice) seedChooser();
    else panel(`<span class="kicker">冒险模式 ${game.config.label}</span><img loading="lazy" class="intro-plant" src="${asset(`${game.config.seeds.at(-1)}.png`)}" alt=""/><h2>${game.config.title}</h2><p>${game.config.description}</p><div class="facts">${game.config.rows.length} 条草坪　·　${game.boss ? '僵王博士' : game.config.mode === 'vase' ? '三轮砸罐子' : `${game.config.waveCount} 波僵尸`}　·　${game.hasConveyor ? '传送带供应 · 无需阳光' : `${game.config.initialSun} 初始阳光`}</div><button id="start" class="wood-button large">${game.config.mode === 'vase' ? '开始砸罐子' : game.config.mode === 'whack' ? '拿起木槌' : game.config.mode === 'bowling' ? '开始保龄球' : game.config.mode === 'conveyor' ? '开始传送带决战' : '开始种植'}</button><button class="text-button back-menu">${backLabel()}</button>`);
    $('#start').onclick = async () => { $<HTMLButtonElement>('#start').disabled = true; $('#start').textContent = '准备角色…'; await Promise.all([audio.unlock(game), scene.prepareActors(game, (done,total) => { $('#start').textContent = `准备角色 ${done} / ${total}`; })]); game.start(); if(game.rake){profile.data.purchases.rake--;profile.save();} updateHud(); };
  } else if (game.phase === 'paused') {
    panel(`<div class="pause-content"><h2>庭院休息中</h2><p>准备好了，就继续守护草坪。</p><button id="resume" class="wood-button large">继续游戏</button><button id="restart" class="wood-button large">重新开始</button><button class="wood-button large back-menu">${game.isSurvival ? '保存退出' : '返回主菜单'}</button><div class="pause-audio"><button id="pause-zombie-health" class="text-button">僵尸血条：${showZombieHealth ? '开启' : '关闭'}</button><button id="pause-fullscreen" class="text-button">${fullscreenLabel()}</button><button id="pause-sound" class="text-button">音效：${audio.muted ? '关闭' : '开启'}</button><button id="pause-music" class="text-button">音乐：${music.enabled ? '开启' : '关闭'}</button></div></div>`, 'pause-panel');
    $('#resume').onclick = async () => { await audio.unlock(game); game.resume(); updateHud(); }; $('#restart').onclick = () => { if(game.isSurvival)clearSurvival(game.survivalScene, game.scenario); setLevel(game.level, game.scenario, game.survivalScene); };
    $('#pause-fullscreen').onclick = toggleFullscreen;
    $('#pause-zombie-health').onclick = toggleZombieHealth;
    $('#pause-music').onclick = () => { music.enabled = !music.enabled; $('#pause-music').textContent = `音乐：${music.enabled ? '开启' : '关闭'}`; };
    $('#pause-sound').onclick = () => { audio.muted = !audio.muted; $('#pause-sound').textContent = `音效：${audio.muted ? '关闭' : '开启'}`; };
  } else if (game.phase === 'intermission' && game.config.mode === 'vase') {
    panel(`<span class="kicker">砸罐子 · 第 ${game.vaseStage + 1} 轮完成</span><h2>这组罐子清理完了！</h2><p>下一轮重新布置罐子，场上的植物与掉落卡片会清空。</p><button id="vase-next" class="wood-button large">下一组罐子</button><button class="text-button back-menu">返回主菜单</button>`);
    $('#vase-next').onclick = () => showDialogue(game.vaseStage===0?2700:2800,()=>{ game.nextVaseStage(); clock.reset(); updateHud(); });
  } else if (game.phase === 'intermission') {
    panel(`<span class="kicker">${game.config.title} · 第 ${game.survivalStage + 1} 轮完成</span><h2>已守住 ${game.survivalFlags} 面旗帜！</h2><p>下一轮保留上轮所选卡片，可直接开战，也可以调整阵容。<br/>场上植物、剩余阳光、卡片冷却和割草机状态保留。</p><div class="facts">累计击败 ${game.kills} 只僵尸 · 剩余 ${game.sun} 阳光</div><button id="repick" class="wood-button large">继续守护 · 查看阵容</button><button class="text-button back-menu">保存退出</button>`);
    $('#repick').onclick = () => { game.nextSurvivalStage(); clock.reset(); messageUntil = 0; updateHud(); };
  } else if (game.phase === 'won' && game.isSurvival) {
    panel(`<span class="kicker">${game.config.title}</span><img class="reward-image" src="${asset('trophy.png')}" alt="生存挑战奖杯"/><h2>生存挑战完成！</h2><p>已守住 ${game.survivalGoal} 面旗帜，完成全部五轮。</p><div class="facts">击败 ${game.kills} 只僵尸 · 使用 ${game.planted} 张植物卡</div><button id="survival-again" class="wood-button large">再次挑战</button><button class="text-button back-menu">返回主菜单</button>`, 'paper-panel reward-panel');
    $('#survival-again').onclick = () => setLevel(game.level, game.scenario, game.survivalScene);
  } else if (game.phase === 'won') {
    const reward = game.config.reward;
    const shovel = !game.repeatAdventure && game.level === 4;
    const name = game.repeatAdventure ? '庭院守住了！' : shovel ? '铲子' : reward ? PLANTS[reward].name : game.level === 24 ? '小僵尸来袭' : game.level === 9 || game.level === 19 ? '最后的挑战' : game.level === 14 ? '木槌准备好了' : game.level === 29 ? '泳池最终挑战' : game.level === 39 ? '雷雨将至' : game.level === 34 ? '砸罐子时间' : game.level === 44 ? '蹦极突袭' : '当前冒险阶段完成';
    const description = game.repeatAdventure ? `第 ${game.campaign!.run} 周目 ${game.config.label} 完成，金币已存入钱包。` : shovel ? '可以铲除植物、重新布置防线。下一关来玩坚果保龄球！' : reward ? `${PLANTS[reward].cost} 阳光 · 下一关可以使用` : game.level === 24 ? '下一关使用四种传送带植物，迎战成群的小僵尸！' : game.level === 9 || game.level === 19 ? '下一关由传送带供应植物，迎战本场景最后两面旗帜！' : game.level === 14 ? '接下来是打僵尸！点击僵尸挥动木槌，辅助植物可以帮助清场。' : game.level === 29 ? '下一关使用八种传送带植物，守住三面旗帜！' : game.level === 39 ? '接下来迎战雷雨之夜：闪电照亮庭院，传送带提供八种植物。' : game.level === 34 ? '下一关连续破解三组罐子，拾取掉落的植物卡布置防线。' : game.level===44 ? '接下来是蹦极突袭：使用传送带植物，守住从天而降的僵尸。' : game.level===49 ? '接下来迎战僵王博士，准备好寒冰菇和火爆辣椒！' : game.level===48 ? '下一关迎战三面旗帜的屋顶防线。' : '已完成冒险模式 50 关，也可以挑战五种场景的无尽生存。';
    panel(`<span class="kicker">${shovel ? '你获得了新工具！' : reward ? '你获得了一株新植物！' : '庭院守住了！'}</span><img loading="lazy" class="reward-image" src="${asset(shovel ? 'shovel.png' : reward ? composedPacket(reward) ? `${reward}.png` : `card-${reward}.png` : 'trophy.png')}" alt="${name}"/><h2>${name}</h2><p>${description}</p><div class="facts">击败 ${game.kills} 只僵尸　·　使用 ${game.planted} 张植物卡</div><button id="next" class="wood-button large">${game.level < lastLevel ? '下一关' : '开始下一周目'}</button><button id="replay" class="text-button">重玩本关</button>`, 'paper-panel reward-panel');
    $('#next').onclick = () => {
      const next=()=>game.level<lastLevel?setLevel((game.level+1) as LevelId):setLevel(1);
      if (game.campaign?.run===1 && game.level===24) { shopPanel(next); return; }
      if (game.campaign?.run===1 && game.level===34) { shopPanel(next); return; }
      next();
    };
    $('#replay').onclick = () => setLevel(game.level);
  } else {
    panel(`<span class="kicker">僵尸入侵</span><h2>僵尸吃掉了你的脑子！</h2>${game.isSurvival ? `<p>本次守住 ${game.survivalFlags} 面旗帜 · 累计击败 ${game.kills} 只僵尸</p>` : ''}<p>${game.config.mode === 'whack' ? '先敲最靠近房子的僵尸，<br/>路障需要两锤，铁桶需要三锤。' : game.config.mode === 'bowling' ? '把坚果滚向最靠近房子的僵尸，<br/>留下爆炸坚果应对密集队伍。' : game.boss ? '僵王低头时集中攻击，<br/>留好寒冰菇与火爆辣椒反制冰火球。' : game.config.mode === 'conveyor' ? '及时使用传送带植物，<br/>留下樱桃炸弹应对密集队伍。' : '试着先种向日葵积攒阳光，<br/>再把射手放在靠左的位置。'}</p><button id="retry" class="wood-button large">重新开始</button><button class="text-button back-menu">${backLabel()}</button>`);
    $('#retry').onclick = () => setLevel(game.level, game.scenario, game.survivalScene);
  }
  document.querySelectorAll<HTMLButtonElement>('.back-menu').forEach(button => button.onclick = () => { if (game.isSurvival && game.phase !== 'lost' && game.phase !== 'won') saveSurvival(game, clock.speed); showMenu(); });
}
function updateHud() {
  if (screen !== 'battle') return;
  bankCoins();
  const newlyEarned = achievements.update(game);
  if (newlyEarned.length) {
    const toast = $('#achievement-toast');
    toast.textContent = `成就达成 · ${newlyEarned.map(item => item.name).join(' · ')}`; toast.hidden = false;
    clearTimeout(achievementToastTimer);
    achievementToastTimer = setTimeout(() => { toast.hidden = true; }, 4500);
  }
  let advice = '';
  if (game.phase === 'playing') {
    if(game.cannonTarget!==null)advice='点击庭院中的目标位置，发射玉米加农炮 · 右键取消';
    else if (game.flagWarningIn > 0) advice = '一大波僵尸即将来袭！';
    else if (game.digging) advice = '点击铲除高亮植物 · 触屏可按住滑动预览';
    else if (game.config.mode === 'bowling' && (game.selected || game.planted === 0)) advice = '选择传送带上的坚果，在红线左侧滚出';
    else if (game.boss) advice = game.boss.ball ? (game.boss.ball.kind==='fire'?'火球来袭！使用寒冰菇消除':'冰球来袭！在同排使用火爆辣椒') : ['headBefore','spit','headAfter'].includes(game.boss.phase)?'僵王低头了！集中攻击，寒冰菇可以延长攻击时间':'传送带供应植物 · 保留寒冰菇与辣椒应对冰火球';
    else if (game.config.mode === 'conveyor' && (game.selected || game.planted === 0)) advice = '从传送带取卡，种在空草地上，无需阳光';
    else if (game.config.mode === 'vase') advice = game.selected ? '选择空格种植这张植物卡 · 无需阳光' : '点击罐子打碎 · 点击掉落的卡片再种植 · 绿罐中一定是植物';
    else if (game.config.mode === 'whack' && !game.selected) advice = '点击僵尸挥动木槌 · 路障两次、铁桶三次';
    else if (game.selected === 'wintermelon') advice = '把冰西瓜种在西瓜投手上升级';
    else if (game.selected === 'gatlingpea') advice = '把机枪射手种在双发射手上升级';
    else if (game.selected === 'twinsunflower') advice = '把双子向日葵种在向日葵上升级';
    else if (game.planted === 0) advice = game.level === 1 ? '选择豌豆射手，再点击中间的草地' : isNight(game.config.environment) ? '夜晚没有天空阳光，用阳光植物积攒阳光，小喷菇免费' : '先种向日葵，积攒阳光';
    else if (game.collected === 0 && game.suns.length > 0) advice = '点击阳光收集';
    else if (game.ticks < messageUntil) advice = game.wave === game.config.waveCount ? game.isSurvival ? '本轮最后一波！' : '最后一波！' : '僵尸来了！';
    else if (game.selected) advice = `把${PLANTS[game.selected].name}种在草地上`;
  }
  advice=tutorialHint(game)||(game.cannonTarget!==null?'点击目标发射 · 触屏可按住滑动瞄准':advice);
  $('#cancel-action').hidden = game.phase !== 'playing' || !(game.selected || game.digging || game.cannonTarget !== null);
  updateConveyor(); hud.update(game, advice);
  const target=game.tutorial==='shovel'&&!game.digging?'#shovel':game.tutorial==='pea'&&!game.selected?'[data-plant=peashooter]':(game.tutorial==='sunflower'||game.tutorial==='more-sun')&&!game.selected?'[data-plant=sunflower]':null;
  if(target!==tutorialTarget){document.querySelector('.tutorial-target')?.classList.remove('tutorial-target');if(target)document.querySelector(target)?.classList.add('tutorial-target');tutorialTarget=target;}
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
$('#shovel').onclick = () => { clearPlacementFeedback(); game.toggleShovel(); updateHud(); };
$('#cancel-action').onclick = () => { clearPlacementFeedback(); game.cancelSelection(); scene.setPointer(null); updateHud(); };
$('#speed').onclick = () => {
  clock.speed = (clock.speed === 1 ? 2 : clock.speed === 2 ? 4 : 1) as GameSpeed;
  $('#speed').textContent = `${clock.speed}×`;
  $('#speed').setAttribute('aria-label', `游戏速度 ${clock.speed} 倍`);
};
$('#adventure').onclick = () => setLevel(profile.data.nextLevel);
$('#shop').onclick = () => shopPanel(closeMenuPanel);
$('#levels').onclick = levelPicker;
function survivalPicker(mode: SurvivalMode) {
  const goal = mode === 'survival-normal' ? 5 : 10;
  const waves = mode === 'survival-normal' ? 10 : 20;
  panel(`<span class="kicker">生存模式</span><h2>选择你的生存挑战</h2><div class="survival-modes" role="group" aria-label="生存难度">${SURVIVAL_MODES.map(item => `<button class="wood-button" data-survival-mode="${item}" aria-pressed="${item === mode}">${SURVIVAL_MODE_NAMES[item]}${item === 'endless' ? '' : item === 'survival-normal' ? ' · 5 旗' : ' · 10 旗'}</button>`).join('')}</div><p>${mode === 'endless' ? '没有终点，挑战更多旗帜。' : `五个场景各有独立关卡；守住 ${goal} 面旗帜获胜。`}<br/>每轮 ${waves} 波，可携带 6–10 张植物卡，轮间可换卡。暂停可保存退出，各难度与场景的存档互不覆盖。</p><div class="survival-scenes">${SURVIVAL_SCENES.map((scene, index) => {
    const saved = loadSurvival(scene, mode);
    return `<article class="survival-card survival-card-${scene}"><div class="survival-preview"><img loading="lazy" src="${import.meta.env.BASE_URL}assets/runtime/previews/${scene}.${scene === 'day' ? 'jpg' : 'webp'}" alt=""/><span class="survival-number" aria-hidden="true">0${index + 1}</span><span class="survival-badge">${SURVIVAL_MODE_NAMES[mode]}</span><h3>${SCENE_NAMES[scene]}</h3></div><div class="survival-card-body"><p>${scene==='day'?'五行草坪 · 天空阳光':scene==='night'?'五行夜晚 · 墓碑与蘑菇':scene==='pool'?'六行泳池 · 睡莲与水路':scene==='roof'?'五行屋顶 · 花盆与投手':'六行迷雾 · 无天空阳光 · 路灯花照明'}</p><div class="survival-actions">${saved ? `<button class="survival-play" data-continue="${scene}">继续第 ${saved.game.survivalStage+1} 轮<span aria-hidden="true">▶</span></button>` : ''}<button class="${saved ? 'text-button survival-restart' : 'survival-play'}" data-survival="${scene}">${saved ? '新开一局（替换此存档）' : '开始挑战<span aria-hidden="true">▶</span>'}</button></div></div></article>`;
  }).join('')}</div><button id="close" class="wood-button">返回主菜单</button>`, 'paper-panel wide-panel survival-panel');
  document.querySelectorAll<HTMLButtonElement>('[data-survival-mode]').forEach(button => button.onclick = () => survivalPicker(button.dataset.survivalMode as SurvivalMode));
  document.querySelectorAll<HTMLButtonElement>('[data-survival]').forEach(button => button.onclick = () => { const scene = button.dataset.survival as SurvivalScene; clearSurvival(scene, mode); setLevel(9, mode, scene); });
  document.querySelectorAll<HTMLButtonElement>('[data-continue]').forEach(button => button.onclick = () => { const saved=loadSurvival(button.dataset.continue as SurvivalScene, mode)!; game=Game.restore(saved.game); clock.speed=saved.speed; mountGame(); });
  $('#close').onclick = closeMenuPanel;
}
$('#endless').onclick = () => survivalPicker('endless');
$('#almanac').onclick = () => {
  panel(`<span class="kicker">植物图鉴</span><h2>认识你的守护者</h2><div class="almanac-grid">${(Object.keys(PLANTS) as PlantKind[]).map(kind => `<article><img loading="lazy" src="${asset(`${kind}.png`)}" alt=""/><div><h3>${PLANTS[kind].name}<span>${kind === 'explodenut' ? '传送带专用' : `${PLANTS[kind].cost} 阳光`}</span></h3><p>${PLANT_DESCRIPTIONS[kind]}</p></div></article>`).join('')}</div><button id="close" class="wood-button">返回主菜单</button>`, 'paper-panel wide-panel almanac-panel'); $('#close').onclick = closeMenuPanel;
};
$('#achievements').onclick = () => {
  panel(`<span class="kicker">庭院荣誉</span><h2>成就</h2><p>已达成 ${Object.keys(achievements.earned).length} / ${ACHIEVEMENTS.length} · 记录保存在当前浏览器</p><div class="achievement-list">${ACHIEVEMENTS.map(item => {
    const earned = achievements.earned[item.id];
    return `<article class="${earned === undefined ? '' : 'earned'}"><span class="achievement-medal" aria-hidden="true">${earned === undefined ? '☆' : '★'}</span><div><h3>${item.name}<small>${item.original}</small></h3><p>${item.description}</p><span>${earned === undefined ? '未达成' : `已达成 · ${new Date(earned).toLocaleDateString('zh-CN')}`}</span></div></article>`;
  }).join('')}</div><button id="close" class="wood-button">返回主菜单</button>`, 'paper-panel wide-panel achievements-panel');
  $('#close').onclick = closeMenuPanel;
};
function toggleZombieHealth() {
  showZombieHealth = !showZombieHealth;
  if (scene) scene.showZombieHealth = showZombieHealth;
  document.querySelectorAll<HTMLButtonElement>('#zombie-health, #pause-zombie-health').forEach(button => { button.textContent = `僵尸血条：${showZombieHealth ? '开启' : '关闭'}`; });
}
function fullscreenLabel() { return document.fullscreenElement ? '退出全屏' : '进入全屏'; }
document.addEventListener('fullscreenchange', () => {
  document.querySelectorAll<HTMLButtonElement>('#fullscreen, #pause-fullscreen').forEach(button => { button.textContent = fullscreenLabel(); });
});
function toggleFullscreen() { if (document.fullscreenElement) void document.exitFullscreen(); else void $('.page').requestFullscreen(); }
$('#settings').onclick = () => {
  panel(`<span class="kicker">庭院设置</span><h2>准备好出发</h2><div class="settings-controls"><button id="fullscreen" class="wood-button large">${fullscreenLabel()}</button><button id="zombie-health" class="wood-button large">僵尸血条：${showZombieHealth ? '开启' : '关闭'}</button><button id="sound" class="wood-button large">音效：${audio.muted ? '关闭' : '开启'}</button><button id="music" class="wood-button large">背景音乐：${music.enabled ? '开启' : '关闭'}</button><button id="pwa" class="wood-button large">安装与离线</button></div><button id="close" class="text-button">返回主菜单</button>`, 'paper-panel settings-panel');
  $('#pwa').onclick = showPwa;
  $('#music').onclick = () => { music.enabled = !music.enabled; $('#music').textContent = `背景音乐：${music.enabled ? '开启' : '关闭'}`; };
  $('#sound').onclick = () => { audio.muted = !audio.muted; $('#sound').textContent = `音效：${audio.muted ? '关闭' : '开启'}`; };
  $('#fullscreen').onclick = toggleFullscreen;
  $('#zombie-health').onclick = toggleZombieHealth;
  $('#close').onclick = closeMenuPanel;
};
$('#help').onclick = () => {
  panel('<span class="kicker">庭院指南</span><h2>种下你的第一道防线</h2><ol class="help-list"><li>点击植物卡片，再点击草地种植。</li><li>点击阳光收集，也可勾选右上角“自动收集阳光”；植物需要阳光和冷却时间。</li><li>向日葵放后方，坚果挡前方；樱桃应对密集僵尸。</li><li>保龄球关从传送带取卡，在红线左侧滚出坚果。</li><li>1–8 起在战前选择六张植物卡；1–10 从传送带取卡种植，无需阳光。</li><li>2–5 点击僵尸挥动木槌，路障两次、铁桶三次。选取辅助植物时切换到种植，右键回到木槌。</li><li>夜晚没有天空阳光；小喷菇射程短，大喷菇能穿门盾，墓碑吞噬者只能种在墓碑上。</li><li>每排割草机只能使用一次。消灭所有波次即可通关。</li></ol><p>数字 1–6 选卡（无尽可用 1–9、0，传送带可用 1–8） · 右键取消选卡 · Esc 暂停</p><button id="close" class="wood-button">返回主菜单</button>'); $('#close').onclick = closeMenuPanel;
};
window.addEventListener('keydown', event => {
  if (dialogueAdvance && ['Enter',' '].includes(event.key)) { event.preventDefault(); dialogueAdvance(); return; }
  if (event.repeat || screen === 'loading') return;
  if (event.key === 'Escape') { clearPlacementFeedback(); if (screen === 'menu') closeMenuPanel(); else if (game.selected || game.digging || game.cannonTarget!==null) { game.cancelSelection(); updateHud(); } else pause(); }
  if (screen === 'battle' && ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(event.key)) {
    if (game.hasConveyor) {
      const packet = game.conveyor[Number(event.key) - 1]; if (packet) { game.selectPacket(packet.id); updateHud(); }
      return;
    }
    clearPlacementFeedback();
    const kind = game.seeds[event.key === '0' ? 9 : Number(event.key) - 1]; if (kind) { game.select(kind); updateHud(); }
  }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && game.phase === 'playing') { game.pause(); clock.reset(); updateHud(); } updateMusic(); });
const activateMusic = () => {
  window.removeEventListener('pointerdown', activateMusic, true);
  window.removeEventListener('keydown', activateMusic, true);
  void music.activate();
};
window.addEventListener('pointerdown', activateMusic, true);
window.addEventListener('keydown', activateMusic, true);
async function ensureScene() {
  sceneLoading ??= (async () => {
    const { Scene } = await import('./rendering/scene');
    scene = new Scene(); scene.showZombieHealth = showZombieHealth;
    await scene.init($('#canvas-host'));
    const canvas = scene.app.canvas;
    canvas.addEventListener('webglcontextlost', () => showDiagnostic(new Error('WebGL context lost: GPU rendering context was lost.')));
    const point = (event: PointerEvent) => { const bounds = canvas.getBoundingClientRect(); return scene.toWorld(event.clientX - bounds.left, event.clientY - bounds.top); };
    const operate = (x: number, y: number) => {
      const sun = [...game.suns].reverse().find(sun => Math.hypot(sun.x-x,sun.y-y)<=35);
      const column = Math.floor((x - BOARD.left) / BOARD.cellWidth), row = game.rowAt(y,x);
      const drop = game.seedDrops.find(d => Math.abs(x - (BOARD.left + d.column * 80 + 40)) < 27 && Math.abs(y - (game.rowY(d.row) - 40)) < 38);
      const coin=[...game.coins].reverse().find(coin=>Math.hypot(coin.x-x,coin.y-y)<=22);
      if (sun) game.collectSun(sun.id);
      else if(coin)game.collectCoin(coin.id);
      else if(game.cannonTarget!==null)game.fireCannon(x,y);
      else if(!game.selected&&!game.digging&&game.aimCannon(column,row)){}
      else if (game.config.mode === 'vase' && !game.selected && drop) game.selectDrop(drop.id);
      else if (game.config.mode === 'vase' && !game.selected && game.vases.some(v => v.column === column && v.row === row)) game.openVase(column,row);
      else if (game.config.mode === 'whack' && !game.selected && !game.digging) game.whack(x, y);
      else if (game.digging) game.dig(column,row);
      else if (game.selected) {
        const kind = game.selected;
        if (game.plant(column,row)) clearPlacementFeedback();
        else placementFeedback(game.plantingIssue(kind,column,row)!,x,y);
      }
      updateHud();
    };
    bindBattlePointer(canvas, {
      point,
      enabled: () => screen === 'battle' && game.phase === 'playing',
      action: () => game.selected || game.digging || game.cannonTarget !== null ? `${game.selected}:${game.selectedPacket}:${game.selectedDrop}:${game.digging}:${game.cannonTarget}` : null,
      collecting: (x,y) => game.suns.some(sun=>Math.hypot(sun.x-x,sun.y-y)<=35) || game.coins.some(coin=>Math.hypot(coin.x-x,coin.y-y)<=22),
      preview: pointer => scene.setPointer(pointer), operate,
    });
    canvas.addEventListener('contextmenu', event => { event.preventDefault(); clearPlacementFeedback(); game.cancelSelection(); updateHud(); });
    scene.app.ticker.add(ticker => {
      if (screen === 'battle') clock.advance(game, ticker.deltaMS, () => scene.captureMovement());
      for (const event of game.drainEvents()) {
        if (event.kind !== 'wave' || game.wave === game.config.waveCount) audio.play(event.kind);
        scene.event(event);
        if (event.kind === 'wave') messageUntil = game.ticks + 280;
        if (event.kind === 'win') { if (game.scenario === 'adventure') {
          completeLevel(game.level);
          if (game.campaign) {
            game.money += (game.repeatAdventure||game.level>=11?game.mowers.filter(m=>m.state==='ready').length*50:0) + (game.level===50?3000:game.repeatAdventure?game.level===35?100:250:0);
            bankCoins(); profile.finish(game.level,game.campaign.run);
          }
        } else clearSurvival(game.survivalScene, game.scenario); }
        if (event.kind === 'lose' && game.isSurvival) clearSurvival(game.survivalScene, game.scenario);
      }
      if (screen === 'battle') { scene.render(game, ticker.deltaMS * clock.speed, clock.alpha); updateHud(); }
    });
  })();
  await sceneLoading;
}
showMenu();
