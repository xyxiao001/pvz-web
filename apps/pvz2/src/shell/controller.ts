import { readAudio, saveAudio, audioControls } from '../audio';
import { assetUrl, json } from '../assets/load';
import { NAVIGATION_KEY, LEVEL_ROUTES, initialNavigation, islandStates, type Navigation } from './navigation';
import { ProgressStore, completionEvents } from './progression';
import type { Catalog, Island, World, WorldMap, ProgressionArt } from './types';
import type { MapRenderer } from './renderer';

export class WorldShell {
  private renderer!: MapRenderer;
  private catalog!: Catalog;
  private navigation: Navigation;
  private map: WorldMap | null = null;
  private busy = true;
  private audio = readAudio();
  private music = new Audio();
  private musicPlay: Promise<void> | null = null;
  private currentWorld!: World;
  private cameraLayout = NaN;
  private clickSounds = new Map<string, HTMLAudioElement>();
  private progress = new ProgressStore(localStorage);
  private progression!: ProgressionArt;
  private completed = () => this.progress.completed(this.map!);
  private $ = <T extends HTMLElement>(selector: string) => this.host.querySelector<T>(selector)!;
  constructor(private host: HTMLElement, private play: (level: string, progress: ProgressStore) => Promise<void>) {
    const saved = localStorage.getItem(NAVIGATION_KEY);
    this.navigation = saved === null ? initialNavigation() : JSON.parse(saved);
    host.innerHTML = `<div class="world-frame"><div class="map-canvas"></div><div class="map-controls"></div>
      <div class="world-labels"></div><div class="map-level-targets"></div>
      <button class="map-arrow map-arrow-left" aria-label="向左浏览"><span></span></button><button class="map-arrow map-arrow-right" aria-label="向右浏览"><span></span></button>
      <div class="map-modal" hidden></div><div class="map-loading" role="status"><span class="loading-flower">✿</span><span>正在准备世界地图…</span></div></div>
      <div class="world-caption"><a href="/">‹ 植物大战僵尸 1</a><span class="map-caption">世界地图 · 关卡逐步接入</span><span>外层移植预览</span></div>`;
    this.music.loop = true; this.music.preload = 'none'; this.music.volume = this.audio.music;
  }
  async init() {
    const [{ MapRenderer }, catalog, progression] = await Promise.all([import('./renderer'), json<Catalog>('shell/catalog.json'), json<ProgressionArt>('shell/progression.json')]);
    this.progression = progression;
    this.catalog = catalog;
    const font = new FontFace('PvZMap', `url('${assetUrl('shell/map-font.woff2')}')`);
    document.fonts.add(await font.load());
    this.renderer = new MapRenderer(this.$('.map-canvas'), catalog);
    await this.renderer.init();
    this.renderer.onWorld = index => { void this.choose(index); };
    this.renderer.onIsland = island => { void this.selectLevel(island); };
    this.renderer.onStep = direction => this.step(direction);
    this.renderer.onCamera = camera => { if (this.map) this.navigation.cameras[this.map.id] = camera; };
    this.renderer.onFrame = (camera, carousel) => this.layoutTargets(camera, carousel);
    this.makeControls();
    for (const [name, path] of Object.entries(catalog.sounds)) {
      const clip = new Audio(); clip.preload = 'none'; clip.src = assetUrl(path); this.clickSounds.set(name, clip);
    }
    this.host.addEventListener('pointerdown', () => { this.startMusic(); this.clickSound('touchStartSound'); });
    this.host.addEventListener('pointerup', () => this.clickSound('touchEndSound'));
    this.$('.map-arrow-left').onclick = () => this.step(-1); this.$('.map-arrow-right').onclick = () => this.step(1);
    window.addEventListener('keydown', event => {
      if (this.host.hidden || this.busy) return;
      if (event.key === 'Escape') { event.preventDefault(); void this.back(); }
      if (this.$('.map-modal').hidden && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) { event.preventDefault(); this.step(event.key === 'ArrowLeft' ? -1 : 1); }
    });
    if (this.navigation.world) await this.openWorld(this.catalog.worlds.find(w => w.id === this.navigation.world)!);
    else await this.showChooser();
  }
  private save() { localStorage.setItem(NAVIGATION_KEY, JSON.stringify(this.navigation)); }
  private loading(show: boolean) { this.busy = show; this.$('.map-loading').hidden = !show; this.$('.map-controls').inert = show; }
  private makeControls() {
    const names: Record<string,string> = { exitButton: '返回', settingButton: '设置', arcadeButton: '小游戏 · 尚未接入', almanacButton: '图鉴 · 尚未接入', zengardenButton: '禅境花园 · 尚未接入', storeButton: '商店 · 尚未接入' };
    this.$('.map-controls').innerHTML = Object.entries(this.catalog.buttons).map(([id,b]) => `<button class="native-icon" data-control="${id}" aria-label="${names[id]}" title="${names[id]}" ${id === 'exitButton' || id === 'settingButton' ? '' : 'disabled'} style="left:${b.x/10.24}%;top:${b.y/6.4}%;width:${b.w/10.24}%;height:${b.h/6.4}%;--normal:url('${assetUrl(b.normal.image)}');--hover:url('${assetUrl(b.hover.image)}');--pressed:url('${assetUrl(b.pressed.image)}')"></button>`).join('');
    this.$('[data-control="exitButton"]').onclick = () => { void this.back(); };
    this.$('[data-control="settingButton"]').onclick = () => this.settings();
    const skin = this.catalog.window;
    this.host.style.setProperty('--window-fill',`url('${assetUrl(skin.windowCommon.image)}')`);
    this.host.style.setProperty('--window-border',`url('${assetUrl(skin.windowCommonBorder.image)}')`);
    this.host.style.setProperty('--close-art',`url('${assetUrl(skin.buttonExit.image)}')`);
    this.host.style.setProperty('--arrow-art',`url('${assetUrl(this.catalog.arrow.image!)}')`);
    this.host.style.setProperty('--button-art',`url('${assetUrl(skin.PlayButton.image)}')`);
  }
  private clickSound(name: string) {
    if (this.audio.effects === 0 || this.busy) return;
    const clip = this.clickSounds.get(name)!; clip.volume = this.audio.effects; clip.currentTime = 0; void clip.play();
  }
  private startMusic() {
    if (this.audio.music === 0) return;
    if (!this.music.src) this.music.src = assetUrl(this.catalog.music);
    if(!this.musicPlay)this.musicPlay=this.music.play();
  }
  private async choose(index: number) {
    if (this.busy || !this.$('.map-modal').hidden) return;
    if (index !== this.navigation.chooser) {
      this.navigation.chooser = index; this.renderer.selectWorld(index); this.save(); return;
    }
    const world = this.catalog.worlds[index];
    if (!world.enterable) return;
    if (world.id === 'egypt') await this.openWorld(world);
    else await this.worldDescription(world);
  }
  private step(direction: number) {
    if (this.busy || !this.$('.map-modal').hidden) return;
    if (this.map) this.renderer.moveBy(direction * 220);
    else { this.navigation.chooser = Math.max(0,Math.min(this.catalog.worlds.length-1,this.navigation.chooser+direction)); this.renderer.selectWorld(this.navigation.chooser); }
    this.save();
  }
  private async showChooser() {
    this.loading(true); this.closeModal(); this.host.dataset.view = 'chooser'; this.map = null; this.navigation.world = null;
    this.$('.map-level-targets').innerHTML = '';
    const empty = this.catalog.chooser.find(d => d.name === 'Difficulty_Empty')!;
    const filled = this.catalog.chooser.find(d => d.name === 'Difficulty_Filled')!;
    this.$('.world-labels').innerHTML = this.catalog.worlds.map((world,index) => `<div class="world-label" data-world-label="${index}"><b>${world.enterable ? world.name : ''}</b>${world.enterable ? `<div class="world-difficulty" aria-label="难度 ${world.difficulty} / 5" style="--empty:url('${assetUrl(empty.image!)}');--filled:url('${assetUrl(filled.image!)}')"><i style="width:${world.difficulty*20}%"></i></div>` : ''}</div>`).join('');
    this.$('.map-level-targets').innerHTML = this.catalog.worlds.map((world,index) => `<button class="world-target" data-world-target="${index}" aria-label="${world.enterable ? '选择' : ''}${world.name}"></button>`).join('');
    for (const button of this.host.querySelectorAll<HTMLButtonElement>('[data-world-target]')) button.onclick = () => { void this.choose(Number(button.dataset.worldTarget)); };

    this.renderer.setWorldKeys(this.progress.worldKeys());
    await this.renderer.showChooser(this.navigation.chooser);
    this.$('.map-caption').textContent = '世界地图 · 点击两侧世界切换，再次点击进入';
    this.save(); this.loading(false);
  }
  private async openWorld(world: World) {
    this.loading(true); this.closeModal(); this.host.dataset.view = 'map'; this.currentWorld = world; this.cameraLayout = NaN;
    this.map = await json<WorldMap>(`shell/maps/${world.id}.json`); this.navigation.world = world.id;
    this.$('.world-labels').innerHTML = '';
    const states = islandStates(this.map,this.completed(),this.progress.rewardNodes(this.map.id));
    this.$('.map-level-targets').innerHTML = this.map.islands.filter(n=>n.kind===0).map(n=>`<button class="level-target" data-level-node="${n.node}" aria-label="${world.name} 第 ${n.name} 关 · ${states.get(n.node)==='finished'?'已完成':states.get(n.node)==='open'?'可进入':'未解锁'}${n.levels.some(id=>LEVEL_ROUTES[id])?'':' · 尚未接入'}"></button>`).join('');
    for (const button of this.host.querySelectorAll<HTMLButtonElement>('[data-level-node]')) button.onclick = () => { void this.selectLevel(this.map!.islands.find(n=>n.node===Number(button.dataset.levelNode))!); };
    const camera = Object.hasOwn(this.navigation.cameras,world.id) ? this.navigation.cameras[world.id] : 0;
    const pending = this.progress.pending();
    const completed = this.completed(), rewards = this.progress.rewardNodes(world.id);
    const events = pending?.world === world.id ? completionEvents(this.map,pending.level,completed,rewards) : [];
    const displayed = new Set(completed); if (events.length) displayed.delete(pending!.level);
    await this.renderer.showMap(this.map,camera,displayed,world.night,rewards,this.progression,events);
    this.$('.map-caption').textContent = `${world.name} · 拖动或滚轮浏览 · 关卡逐步接入`;
    this.save(); this.loading(false);
    if (events.length) {
      this.busy = true; this.$('.world-frame').inert = true;
      await this.renderer.presentCompletion(events, event => {
        if (event.action === 'reward') this.progress.award(world.id,this.map!.islands.find(n=>n.node===event.node)!);
      }, name => {
        const paths = this.progression.sounds[name];
        const clip = new Audio(assetUrl(paths[Math.floor(Math.random()*paths.length)]));
        clip.volume = this.audio.effects; if (clip.volume > 0) void clip.play();
      });
      this.progress.finishPresentation();
      const finalStates = islandStates(this.map,this.completed(),this.progress.rewardNodes(world.id));
      for (const button of this.host.querySelectorAll<HTMLElement>('[data-level-node]')) {
        const island = this.map.islands.find(n=>n.node===Number(button.dataset.levelNode))!;
        const state = finalStates.get(island.node);
        button.setAttribute('aria-label',`${world.name} 第 ${island.name} 关 · ${state==='finished'?'已完成':state==='open'?'可进入':'未解锁'}${island.levels.some(id=>LEVEL_ROUTES[id])?'':' · 尚未接入'}`);
      }
      this.$('.world-frame').inert = false; this.busy = false;
    }
  }
  private layoutTargets(camera: number, carousel: number) {
    if (this.map && this.cameraLayout === camera) return;
    this.cameraLayout = camera;
    if (this.map) for (const button of this.host.querySelectorAll<HTMLElement>('[data-level-node]')) {
      const node=this.map.islands.find(n=>n.node===Number(button.dataset.levelNode))!;
      button.style.left=`${(512+node.x-camera)/10.24}%`;button.style.top=`${(320+node.y-18)/6.4}%`;
      // Canvas receives drags; buttons remain available for keyboard navigation.
    }
    else {
    for (const button of this.host.querySelectorAll<HTMLElement>('[data-world-target]')) button.style.left=`${(512+Number(button.dataset.worldTarget)*264-carousel)/10.24}%`;
    for (const label of this.host.querySelectorAll<HTMLElement>('[data-world-label]')) {
      const x=Number(label.dataset.worldLabel)*264-carousel;
      label.style.left=`${(512+x)/10.24}%`;label.style.opacity=String(Math.max(0,1-Math.abs(x)/150));
    }
    }
  }
  private async selectLevel(island: Island) {
    if (this.busy || !this.$('.map-modal').hidden) return;
    const state = islandStates(this.map!,this.completed(),this.progress.rewardNodes(this.map!.id)).get(island.node)!;
    const id=island.levels.find(id=>LEVEL_ROUTES[id]);
    if (id && state !== 'locked') {
      this.save(); this.renderer.stop(); if(this.musicPlay) await this.musicPlay; this.music.pause(); this.musicPlay=null; this.host.hidden=true; await this.play(id, this.progress); return;
    }
    this.modal(`${this.currentWorld.name} · 第 ${island.name} 关`, `<p>${state==='locked'?'此关卡尚未解锁。':'此关卡尚未接入。'}</p><p class="port-note">当前先还原地图与选关流程，后续按原关卡逐一移植。</p><button class="native-button close-dialog">返回地图</button>`);
  }
  private async worldDescription(world: World) {
    this.loading(true);
    const art=await this.renderer.worldDetails(world.id);
    this.loading(false);
    this.modal(world.name,`<p>${world.description}</p><img class="world-banner" src="${art.background}" alt="${world.name}"><button class="native-button" disabled>世界钥匙 × 1 · ${this.progress.worldKeys()>0?'已获得，关卡尚未接入':'尚未获得'}</button><div class="world-plant-cards" aria-label="本世界植物">${art.cards.map(image=>`<img src="${image}" alt="本世界植物卡片">`).join('')}</div><button class="preview-world">预览地图 · 关卡尚未接入</button>`);
    this.$('.native-window').classList.add('world-description');
    this.$('.preview-world').onclick=()=>{void this.openWorld(world);};
  }
  private modal(title: string, content: string) {
    this.$('.map-modal').innerHTML=`<section class="native-window" role="dialog" aria-modal="true" aria-label="${title}"><h2>${title}</h2><button class="native-close" aria-label="关闭窗口"></button><div class="native-window-content">${content}</div></section>`;
    this.$('.map-modal').hidden=false;
    this.$('.native-close').onclick=()=>this.closeModal();
    for(const button of this.host.querySelectorAll<HTMLButtonElement>('.close-dialog'))button.onclick=()=>this.closeModal();
    this.$<HTMLButtonElement>('.native-close').focus();
  }
  private closeModal() { this.$('.map-modal').hidden=true; this.$('.map-modal').innerHTML=''; }
  private settings() {
    this.modal('设置',`${audioControls(this.audio)}<button class="native-button close-dialog">返回游戏</button><a class="switch-version" href="/">植物大战僵尸 1</a>`);
    for (const input of this.host.querySelectorAll<HTMLInputElement>('[data-volume]')) input.oninput=()=>{
      this.audio[input.dataset.volume as 'music'|'effects']=Number(input.value);saveAudio(this.audio);
      this.music.volume=this.audio.music;if(this.audio.music>0)this.startMusic();
    };
  }
  private async back() {
    if(this.busy)return;
    if(!this.$('.map-modal').hidden){this.closeModal();return;}
    this.save();if(this.map)await this.showChooser();else location.href='/';
  }
  async resume() { this.audio=readAudio(); this.music.volume=this.audio.music; this.host.hidden=false; await this.openWorld(this.currentWorld); this.startMusic(); }
}
