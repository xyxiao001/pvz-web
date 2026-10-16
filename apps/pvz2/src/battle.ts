import './style.css';
import { json, assetUrl } from './assets/load';
import { BOARD, PLANT_KINDS, plantLabels, readLevel, type PlantKind, type Properties, type SourceLevel } from './game/level';
import { Game } from './game/model';
import type { Scene } from './rendering/scene';

export function createBattle(host: HTMLElement, onReturn: () => void) {
const COMPLETE_KEY = 'pvz2-web:egypt1-complete';
const $ = <T extends HTMLElement>(selector: string) => host.querySelector<T>(selector)!;
host.innerHTML = `
  <main class="shell">
    <header class="topbar">
      <a class="brand" href="/pvz2/" aria-label="植物大战僵尸2主菜单"><span class="brand-mark">☀</span><span>植物大战僵尸 <b>2</b><small>埃及首关原型 · 待逐项还原</small></span></a>
      <nav class="game-switch" aria-label="切换游戏"><a href="/">经典一代</a><span aria-current="page">时空二代</span></nav>
    </header>

    <section id="battle" class="battle" hidden>
      <div id="canvas-host"></div>
      <div id="hud" class="hud" hidden>
        <div class="sun-counter"><span>☀</span><b id="sun-count">150</b></div>
        <div class="seed-bank">${PLANT_KINDS.map((kind, i) => `<button class="seed" data-plant="${kind}" aria-label="选择${plantLabels[kind]}"><kbd>${i + 1}</kbd><img alt="${plantLabels[kind]}"/><strong>${plantLabels[kind]}</strong><span class="seed-price"></span><span class="seed-cooldown"></span></button>`).join('')}</div>
        <div class="battle-tools"><button id="shovel" class="tool" aria-label="使用铲子">铲子</button><button id="food" class="tool food">能量豆 <b id="food-count">1</b></button><button id="pause" class="tool" aria-label="暂停游戏">Ⅱ</button></div>
      </div>
      <div id="wave-hud" class="wave-hud" hidden><span id="wave-label">准备迎战</span><div class="wave-track"><div id="wave-fill"></div></div><b>⚑</b></div>
      <div id="battle-hint" class="battle-hint" hidden>先种向日葵，收集阳光。</div>
      <div id="overlay" class="overlay" hidden></div>
    </section>
    <footer><span id="footer-hint">经典的伙伴，全新的旅程。</span><span>基于 <a href="https://github.com/Gzh0821/pvzge_web" target="_blank" rel="noreferrer">PvZ2 Gardendless</a> 移植</span></footer>
  </main>`;

let scene: Scene;
let properties: Properties;
let source: SourceLevel;
let game: Game;
let selected: PlantKind | 'shovel' | 'food' | null = null;
let accumulator = 0;
let screen: 'menu' | 'loading' | 'ready' | 'playing' | 'pause' | 'result' = 'menu';
let musicEnabled = true;
const music = new Audio(); music.loop = true; music.preload = 'none'; music.volume = .25;
let audioContext: AudioContext;
let lastShot = 0;
const panel = (html: string) => { $('#overlay').innerHTML = `<div class="panel">${html}</div>`; $('#overlay').hidden = false; };

function sound(type: string) {
  if (!musicEnabled || !audioContext) return;
  const now = audioContext.currentTime;
  if (type === 'shot' && now - lastShot < .1) return;
  if (type === 'shot') lastShot = now;
  const oscillator = audioContext.createOscillator(), gain = audioContext.createGain();
  const frequencies: Record<string, number> = { plant: 190, shot: 400, sun: 950, explode: 65, food: 750, wave: 160, win: 880, lose: 110 };
  oscillator.type = type === 'explode' ? 'sawtooth' : 'sine';
  oscillator.frequency.setValueAtTime(frequencies[type], now);
  oscillator.frequency.exponentialRampToValueAtTime(frequencies[type] * (type === 'sun' ? 1.5 : .5), now + .12);
  gain.gain.setValueAtTime(.055, now); gain.gain.exponentialRampToValueAtTime(.001, now + .16);
  oscillator.connect(gain); gain.connect(audioContext.destination); oscillator.start(); oscillator.stop(now + .17);
}

async function enter() {
  host.hidden = false; screen = 'loading'; $('#battle').hidden = false;
  panel('<span class="eyebrow">神秘埃及 · 第 1 天</span><h2>准备穿越时空</h2><p id="load-status" role="status">准备庭院…</p><progress id="load-progress" max="7" value="0"></progress>');
  if (!scene) {
    const [{ Scene }, props, level] = await Promise.all([import('./rendering/scene'), json<Properties>('levels/properties.json'), json<SourceLevel>('levels/egypt1.source.json')]);
    properties = props; source = level;
    scene = new Scene();
    await scene.init($('#canvas-host'), (done, total) => {
      $('#load-status').textContent = `准备植物与庭院 ${done} / ${total}`;
      const progress = $<HTMLProgressElement>('#load-progress'); progress.max = total; progress.value = done;
    });
    scene.onPoint = interact; scene.onHover = hover; scene.onTick = tick;
    for (const kind of PLANT_KINDS) {
      $<HTMLImageElement>(`[data-plant="${kind}"] img`).src = scene.portrait(kind);
      $(`[data-plant="${kind}"] .seed-price`).textContent = String(properties.plants[kind].SunCost);
    }
  }
  scene.reset(); scene.render();
  screen = 'ready';
  panel(`<span class="eyebrow">神秘埃及 · 第 1 天</span><h2>准备好你的植物小队</h2><p>向日葵生产阳光，豌豆射手负责进攻。<br>坚果挡住僵尸，土豆地雷需要时间成长。</p><div class="ready-cards">${PLANT_KINDS.map(kind => `<div><img src="${$<HTMLImageElement>(`[data-plant="${kind}"] img`).src}" alt=""/><b>${plantLabels[kind]}</b><span>☀ ${properties.plants[kind].SunCost}</span></div>`).join('')}</div><p class="tip">留意太阳神僵尸！及时点击收集阳光。<br>能量豆可强化植物，每击败 6 只僵尸获得一颗。</p><button id="start" class="primary">开始种植 <span>→</span></button><button id="ready-back" class="text-button">返回地图</button>`);
  $('#start').onclick = start; $('#ready-back').onclick = menu;
}

function start() {
  audioContext ??= new AudioContext(); void audioContext.resume();
  music.src = assetUrl('egypt/music.mp3'); if (musicEnabled) void music.play();
  game = new Game(readLevel(source), properties, scene.timing, Date.now() >>> 0);
  selected = 'sunflower'; accumulator = 0; screen = 'playing';
  $('#overlay').hidden = true; $('#hud').hidden = false; $('#wave-hud').hidden = false; $('#battle-hint').hidden = false;
  $('#footer-hint').textContent = '点击收集阳光 · 1–4 选植物 · Esc 取消 · 空格暂停';
  scene.sync(game, 0); updateHud(); scene.start();
}

function menu() {
  scene.stop(); scene.reset(); music.pause(); screen = 'menu'; selected = null;
  $('#battle').hidden = true; $('#hud').hidden = true; $('#wave-hud').hidden = true; $('#battle-hint').hidden = true;
  host.hidden = true; onReturn();
}

function updateHud() {
  $('#sun-count').textContent = String(game.sun); $('#food-count').textContent = String(game.food);
  for (const kind of PLANT_KINDS) {
    const button = $<HTMLButtonElement>(`[data-plant="${kind}"]`);
    button.disabled = game.sun < properties.plants[kind].SunCost || game.cooldowns[kind] > 0;
    button.classList.toggle('selected', selected === kind);
    const cooldown = button.querySelector<HTMLElement>('.seed-cooldown')!;
    cooldown.style.height = `${game.cooldowns[kind] / properties.plants[kind].Cooldown * 100}%`;
    cooldown.textContent = game.cooldowns[kind] > 0 ? `${Math.ceil(game.cooldowns[kind])}s` : '';
  }
  $('#shovel').classList.toggle('selected', selected === 'shovel'); $('#food').classList.toggle('selected', selected === 'food');
  $<HTMLButtonElement>('#food').disabled = game.food === 0;
  $('#wave-label').textContent = game.wave === 0 ? '僵尸即将出现' : `第 ${game.wave} / ${game.level.waves.length} 波`;
  $('#wave-fill').style.width = `${game.wave / game.level.waves.length * 100}%`;
  $('#battle-hint').textContent = selected === 'food' ? '点击一株植物，为它使用能量豆。' : selected === 'shovel' ? '点击植物铲除，再点铲子取消。'
    : game.time < 20 ? '先种向日葵，点击阳光收集。' : game.time < 45 ? '在僵尸所在的一行种下豌豆射手。' : game.wave === 10 ? '最后一波，守住庭院！' : '阳光要及时收集，小心太阳神僵尸。';
}

function hover(x: number, y: number) {
  if (screen !== 'playing') return;
  const column = Math.floor((x - BOARD.left) / BOARD.cellWidth), row = Math.floor((y - BOARD.top) / BOARD.cellHeight);
  scene.highlightCell(selected ? row : -1, column, selected === 'shovel' ? 0xedb56a : 0xe7fbb0);
}

function interact(x: number, y: number) {
  if (screen !== 'playing') return;
  const sun = [...game.suns].reverse().find(s => Math.hypot(x - s.x, y - s.y) < 38);
  if (sun) { game.collect(sun.id); updateHud(); return; }
  const column = Math.floor((x - BOARD.left) / BOARD.cellWidth), row = Math.floor((y - BOARD.top) / BOARD.cellHeight);
  if (selected === 'shovel') game.shovel(row, column);
  else if (selected === 'food') { if (game.plantFood(row, column)) selected = null; }
  else if (selected && game.plant(selected, row, column)) selected = null;
  updateHud();
}

function tick(dt: number) {
  if (screen !== 'playing') return;
  accumulator += Math.min(dt, .1);
  let advanced = 0;
  while (accumulator >= 1 / 60 && game.phase === 'playing') { game.tick(1 / 60); accumulator -= 1 / 60; advanced += 1 / 60; }
  scene.sync(game, advanced); updateHud();
  for (const event of game.events) sound(event.type);
  game.events.length = 0;
  if (game.phase === 'won' || game.phase === 'lost') finish();
}

function pause() {
  if (screen !== 'playing') return;
  game.phase = 'paused'; screen = 'pause'; scene.stop(); music.pause();
  panel(`<span class="eyebrow">神秘埃及 · 第 1 天</span><h2>庭院歇一会儿</h2><p>你的植物正在等你回来。</p><button id="resume" class="primary">继续守护 <span>→</span></button><button id="sound" class="secondary">声音：${musicEnabled ? '开启' : '关闭'}</button><button id="restart" class="secondary">重新开始</button><button id="exit" class="text-button">退出本局 · 返回地图</button><a href="/" class="text-button">切换到植物大战僵尸 1</a>`);
  $('#resume').onclick = resume;
  $('#sound').onclick = () => { musicEnabled = !musicEnabled; $('#sound').textContent = `声音：${musicEnabled ? '开启' : '关闭'}`; };
  $('#restart').onclick = () => { scene.reset(); start(); };
  $('#exit').onclick = menu;
}

function resume() {
  game.phase = 'playing'; screen = 'playing'; accumulator = 0;
  $('#overlay').hidden = true; if (musicEnabled) void music.play(); scene.start();
}

function finish() {
  screen = 'result'; scene.stop(); scene.render(); music.pause();
  const won = game.phase === 'won'; if (won) localStorage.setItem(COMPLETE_KEY, '1');
  panel(`<span class="result-mark">${won ? '☀' : '☾'}</span><span class="eyebrow">神秘埃及 · 第 1 天</span><h2>${won ? '阳光依然属于庭院' : '僵尸闯进了庭院'}</h2><p>${won ? '你和植物小队一起，守住了古老的沙海。' : '试着多种向日葵，用坚果争取时间。'}</p><div class="result-stats"><span><b>${game.kills}</b>击败僵尸</span><span><b>${game.wave} / 10</b>守护波次</span></div><button id="again" class="primary">再来一局 <span>→</span></button><button id="result-menu" class="text-button">返回地图</button>`);
  $('#again').onclick = () => { scene.reset(); start(); }; $('#result-menu').onclick = menu;
}

$('#pause').onclick = pause;
for (const kind of PLANT_KINDS) $(`[data-plant="${kind}"]`).onclick = () => { if (screen === 'playing') { selected = selected === kind ? null : kind; updateHud(); } };
$('#shovel').onclick = () => { if (screen === 'playing') { selected = selected === 'shovel' ? null : 'shovel'; updateHud(); } };
$('#food').onclick = () => { if (screen === 'playing') { selected = selected === 'food' ? null : 'food'; updateHud(); } };
window.addEventListener('keydown', event => {
  if (event.repeat) return;
  if (event.code === 'Space' && (screen === 'playing' || screen === 'pause')) { event.preventDefault(); screen === 'playing' ? pause() : resume(); }
  if (screen !== 'playing') return;
  if (event.key === 'Escape') selected = null;
  if ('1234'.includes(event.key) && event.key.length === 1) { const kind = PLANT_KINDS[Number(event.key) - 1]; if (!$<HTMLButtonElement>(`[data-plant="${kind}"]`).disabled) selected = kind; }
  updateHud();
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

return { enter };
}
