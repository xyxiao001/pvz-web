import '../audio-controls.css';
import { showPwa } from '../pwa';
import { reportError } from '../errors';
import { playAudio } from '../audio';
import type { OuterFeatures, Feature } from '../outer/controller';
import { Tickets } from '../outer/tickets';
import { readAudio, saveAudio, audioControls, updateVolumeControl } from '../audio';
import { assetUrl, json } from '../assets/load';
import { NAVIGATION_KEY, LEVEL_ROUTES, initialNavigation, islandStates, isWorldMigrated, type Navigation } from './navigation';
import { ProgressStore, completionEvents } from './progression';
import type { Catalog, Island, World, WorldMap, ProgressionArt } from './types';
import type { CostumePlant } from './costumes';
import type { StoreCatalog, StoreCategory } from './store';
import type { MapRenderer } from './renderer';

export class WorldShell {
  private renderer!: MapRenderer;
  private feature:OuterFeatures|null=null;
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
  private progress: ProgressStore;
  private progression!: ProgressionArt;
  private storeCatalog: StoreCatalog | null = null;
  private storeImages = new Map<string, string>();
  private storeCategory: StoreCategory = 'Coin';
  private completed = () => this.progress.completed(this.map!);
  private $ = <T extends HTMLElement>(selector: string) => this.host.querySelector<T>(selector)!;
  constructor(private host: HTMLElement, private play: (level: string, progress: ProgressStore) => Promise<void>, private storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> = localStorage) {
    this.progress = new ProgressStore(storage);
    const saved = storage.getItem(NAVIGATION_KEY);
    this.navigation = saved === null ? initialNavigation() : JSON.parse(saved);
    host.innerHTML = `<div class="world-frame"><div class="map-canvas"></div><div class="map-controls"></div>
      <div class="world-labels"></div><div class="map-level-targets"></div>
      <button class="map-arrow map-arrow-left" aria-label="向左浏览"><span></span></button><button class="map-arrow map-arrow-right" aria-label="向右浏览"><span></span></button>
      <div class="map-modal" hidden></div><div class="map-loading" role="status"><span class="loading-flower">✿</span><span>正在准备世界地图…</span></div></div>
      <div class="world-caption"><a href="/">‹ 植物大战僵尸 1</a><span class="map-caption">世界地图</span><span></span></div>`;
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
    this.renderer.onHoverIsland = node => {
      for (const target of this.host.querySelectorAll<HTMLElement>('[data-level-node]')) target.classList.toggle('hovered', Number(target.dataset.levelNode) === node);
    };
    this.renderer.onStep = direction => this.step(direction);
    this.renderer.onCamera = camera => { if (this.map) this.navigation.cameras[this.map.id] = camera; };
    this.renderer.onFrame = (camera, carousel) => this.layoutTargets(camera, carousel);
    this.makeControls();
    for (const [name, path] of Object.entries(catalog.sounds)) {
      const clip = new Audio(); clip.preload = 'none'; clip.src = assetUrl(path); this.clickSounds.set(name, clip);
    }
    this.host.addEventListener('pointerdown', () => { if(!this.feature)this.startMusic(); this.clickSound('touchStartSound'); });
    this.host.addEventListener('pointerup', () => this.clickSound('touchEndSound'));
    this.$('.map-arrow-left').onclick = () => this.step(-1); this.$('.map-arrow-right').onclick = () => this.step(1);
    window.addEventListener('keydown', event => {
      if (this.host.hidden || this.busy) return;
      if(this.feature){if(event.key==='Escape'){event.preventDefault();void this.feature.back();}return;}
      if (event.key === 'Escape') { event.preventDefault(); void this.back(); }
      if (this.$('.map-modal').hidden && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) { event.preventDefault(); this.step(event.key === 'ArrowLeft' ? -1 : 1); }
    });
    if (this.navigation.world) await this.openWorld(this.catalog.worlds.find(w => w.id === this.navigation.world)!);
    else await this.showChooser();
  }
  private save() { this.storage.setItem(NAVIGATION_KEY, JSON.stringify(this.navigation)); }
  private loading(show: boolean) { this.busy = show; this.$('.map-loading').hidden = !show; this.$('.map-controls').inert = show; }
  private makeControls() {
    const names: Record<string,string> = { exitButton: '返回', settingButton: '设置', arcadeButton: '小游戏', almanacButton: '图鉴', zengardenButton: '禅境花园', storeButton: '商店' };
    this.$('.map-controls').innerHTML = Object.entries(this.catalog.buttons).map(([id,b]) => `<button class="native-icon" data-control="${id}" aria-label="${names[id]}" title="${names[id]}"  style="left:${b.x/10.24}%;top:${b.y/6.4}%;width:${b.w/10.24}%;height:${b.h/6.4}%;--normal:url('${assetUrl(b.normal.image)}');--hover:url('${assetUrl(b.hover.image)}');--pressed:url('${assetUrl(b.pressed.image)}')"></button>`).join('');
    this.$('[data-control="exitButton"]').onclick = () => { void this.back(); };
    this.$('[data-control="settingButton"]').onclick = () => this.settings();
    this.$('[data-control="storeButton"]').onclick = () => { void this.openStore(); };
    for(const [control,feature] of Object.entries({arcadeButton:'arcade',almanacButton:'almanac',zengardenButton:'garden'}))this.$(`[data-control="${control}"]`).onclick=()=>{void this.openFeature(feature as Feature);};
    const ticket=this.catalog.toolbar.find(d=>d.name==='TicketCounter')!;
    const target=document.createElement('button');target.className='ticket-target';target.setAttribute('aria-label','门票');target.style.cssText=`left:${(512+ticket.x)/10.24}%;top:${(320+ticket.y)/6.4}%;width:${ticket.w!*ticket.sx/10.24}%;height:${ticket.h!*ticket.sy/6.4}%;`;target.onclick=()=>{void this.openFeature('tickets');};this.$('.map-controls').append(target);
    new Tickets(this.storage,this.progress.shop()).refresh();this.renderer.setCurrencies(this.progress.shop().read());
    const skin = this.catalog.window;
    this.host.style.setProperty('--window-fill',`url('${assetUrl(skin.windowCommon.image)}')`);
    this.host.style.setProperty('--window-border',`url('${assetUrl(skin.windowCommonBorder.image)}')`);
    this.host.style.setProperty('--close-art',`url('${assetUrl(skin.buttonExit.image)}')`);
    this.host.style.setProperty('--arrow-art',`url('${assetUrl(this.catalog.arrow.image!)}')`);
    this.host.style.setProperty('--button-art',`url('${assetUrl(skin.PlayButton.image)}')`);
  }
  private clickSound(name: string) {
    if (this.audio.effects === 0 || this.busy) return;
    const clip = this.clickSounds.get(name)!; clip.volume = this.audio.effects; clip.currentTime = 0; void playAudio(clip);
  }
  private startMusic() {
    if (this.audio.music === 0) return;
    if (!this.music.src) this.music.src = assetUrl(this.catalog.music);
    if(!this.musicPlay)this.musicPlay=playAudio(this.music);
  }
  private async choose(index: number) {
    if (this.busy || !this.$('.map-modal').hidden) return;
    if (index !== this.navigation.chooser) {
      this.navigation.chooser = index; this.renderer.selectWorld(index); this.save(); return;
    }
    const world = this.catalog.worlds[index];
    if (!world.enterable || !isWorldMigrated(world.id)) return;
    if (this.progress.worldUnlocked(world.id)) await this.openWorld(world);
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
    this.$('.map-level-targets').innerHTML = this.catalog.worlds.map((world,index) => `<button class="world-target" data-world-target="${index}" aria-label="${world.enterable ? '选择' : ''}${world.name}"${!isWorldMigrated(world.id)?' aria-disabled="true" title="尚未迁移"':''}></button>`).join('');
    for (const button of this.host.querySelectorAll<HTMLButtonElement>('[data-world-target]')) button.onclick = () => { void this.choose(Number(button.dataset.worldTarget)); };

    this.renderer.setWorldKeys(this.progress.worldKeys());
    await this.renderer.showChooser(this.navigation.chooser,new Set(this.catalog.worlds.filter(w=>this.progress.worldUnlocked(w.id)).map(w=>w.id)));
    this.$('.map-caption').textContent = '世界地图 · 点击两侧世界切换，再次点击进入';
    this.save(); this.loading(false);
  }
  private async openWorld(world: World) {
    if (!isWorldMigrated(world.id)) { await this.showChooser(); return; }
    this.loading(true); this.closeModal(); this.host.dataset.view = 'map'; this.currentWorld = world;
    try {
      this.map = await json<WorldMap>(`shell/maps/${world.id}.json`); this.navigation.world = world.id;
      this.$('.world-labels').innerHTML = '';
      const states = islandStates(this.map,this.completed(),this.progress.rewardNodes(this.map.id),this.progress.temporaryUnlock);
      this.$('.map-level-targets').innerHTML = this.map.islands.filter(n=>n.kind===0||n.kind===2).map(n=>`<button class="level-target" data-level-node="${n.node}" aria-label="${world.name} ${n.kind===2?'装扮礼物':`第 ${n.name} 关`} · ${n.kind===2?(this.progress.rewardNodes(world.id).has(n.node)?'已领取':states.get(n.node)==='locked'?'未解锁':'可领取'):states.get(n.node)==='finished'?'已完成':states.get(n.node)==='open'?'可进入':'未解锁'}${n.kind===2||n.levels.some(id=>LEVEL_ROUTES[id])?'':' · 尚未接入'}"></button>`).join('');
      for (const button of this.host.querySelectorAll<HTMLButtonElement>('[data-level-node]')) button.onclick = () => { void this.selectLevel(this.map!.islands.find(n=>n.node===Number(button.dataset.levelNode))!); };
      const camera = Object.hasOwn(this.navigation.cameras,world.id) ? this.navigation.cameras[world.id] : 0;
      const pending = this.progress.pending();
      const completed = this.completed(), rewards = this.progress.rewardNodes(world.id);
      const events = pending?.world === world.id ? completionEvents(this.map,pending.level,completed,rewards) : [];
      const displayed = new Set(completed); if (events.length) displayed.delete(pending!.level);
      await this.renderer.showMap(this.map,camera,displayed,world.night,rewards,this.progression,events,this.progress.temporaryUnlock);
      this.cameraLayout = NaN;
      this.$('.map-caption').textContent = `${world.name} · 拖动或滚轮浏览`;
      this.save(); this.loading(false);
      if (events.length) {
        this.busy = true; this.$('.world-frame').inert = true;
        await this.renderer.presentCompletion(events, event => {
          if (event.action === 'reward') this.progress.award(world.id,this.map!.islands.find(n=>n.node===event.node)!);
        }, name => {
          const paths = this.progression.sounds[name];
          const clip = new Audio(assetUrl(paths[Math.floor(Math.random()*paths.length)]));
          clip.volume = this.audio.effects; if (clip.volume > 0) void playAudio(clip);
        });
        this.progress.finishPresentation();
        const finalStates = islandStates(this.map,this.completed(),this.progress.rewardNodes(world.id),this.progress.temporaryUnlock);
        for (const button of this.host.querySelectorAll<HTMLElement>('[data-level-node]')) {
          const island = this.map.islands.find(n=>n.node===Number(button.dataset.levelNode))!;
          const state = finalStates.get(island.node);
          button.setAttribute('aria-label',`${world.name} ${island.kind===2?'装扮礼物':`第 ${island.name} 关`} · ${island.kind===2?(this.progress.rewardNodes(world.id).has(island.node)?'已领取':state==='locked'?'未解锁':'可领取'):state==='finished'?'已完成':state==='open'?'可进入':'未解锁'}${island.kind===2||island.levels.some(id=>LEVEL_ROUTES[id])?'':' · 尚未接入'}`);
        }
      }
    } catch (error) {
      reportError(error, `打开地图：${world.name}`, { retry: () => this.openWorld(world), back: () => this.showChooser() });
    } finally {
      this.$('.world-frame').inert = false;
      this.loading(false);
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
    const state = islandStates(this.map!,this.completed(),this.progress.rewardNodes(this.map!.id),this.progress.temporaryUnlock).get(island.node)!;
    const id=island.levels.find(id=>LEVEL_ROUTES[id]);
    // WorldMap.ts ignores locked nodes; there is no native locked-level window.
    if (state === 'locked') return;
    if(island.kind===2){await this.openGift(island);return;}
    if (id) {
      this.save(); this.renderer.stop(); if(this.musicPlay) await this.musicPlay; this.music.pause(); this.musicPlay=null; this.host.hidden=true; await this.play(id, this.progress); return;
    }
    this.modal(`${this.currentWorld.name} · 第 ${island.name} 关`, `<p>此关卡尚未接入。</p><button class="native-button close-dialog">返回地图</button>`);
  }
  private async openGift(island:Island) {
    this.busy=true;
    try {
      const plants=await json<CostumePlant[]>('shell/costumes.json');
      const claimed=this.progress.rewardNodes(this.map!.id).has(island.node);
      const reward=this.progress.openGift(this.map!.id,island.node,plants);
      if(!reward){this.modal('装扮礼物','<p>当前拥有植物的装扮已集齐。礼物已保留，获得新植物后再来领取。</p><button class="native-button close-dialog">返回地图</button>');return;}
      if(!claimed)this.renderer.openGift(island.node);
      this.$(`[data-level-node="${island.node}"]`).setAttribute('aria-label',`${this.currentWorld.name} 装扮礼物 · 已领取`);
      const plant=plants.find(p=>p.id===reward.id)!;
      const image=await this.renderer.costumeImage(plant,reward.costume);
      this.modal(claimed?'已领取装扮':'获得植物装扮',`<img class="costume-reward" src="${image}" alt="${plant.name}装扮"><p>${plant.name} · 装扮 ${reward.costume+1}</p><p>${claimed?'这份礼物已经领取。':'已自动穿戴，进入关卡即可看到。'}</p><button class="native-button close-dialog">返回地图</button>`);
    } finally { this.busy=false; }
  }
  private async openFeature(feature:Feature){
    this.loading(true);this.renderer.stop();if(this.musicPlay)await this.musicPlay;this.music.pause();this.musicPlay=null;
    const {OuterFeatures}=await import('../outer/controller');
    const host=document.createElement('div');this.$('.world-frame').append(host);
    this.feature=new OuterFeatures(host,this.progress,this.storage,this.catalog,()=>this.closeFeature());
    await this.feature.open(feature);this.loading(false);this.$('.map-controls').inert=true;this.$('.map-level-targets').inert=true;
  }
  private async closeFeature(){
    if(this.busy||!this.feature)return;this.busy=true;
    await this.feature.dispose();this.feature=null;this.$('.map-controls').inert=false;this.$('.map-level-targets').inert=false;this.renderer.setCurrencies(this.progress.shop().read());this.renderer.start();this.startMusic();this.busy=false;
  }
  private async openStore() {
    if (this.busy) return;
    if (this.storeCatalog === null) {
      this.loading(true);
      this.storeCatalog = await json<StoreCatalog>('shell/store.json');
      this.storeImages = await this.renderer.storeArt(this.storeCatalog);
      this.loading(false);
    }
    this.renderStore();
  }
  private renderStore() {
    const catalog = this.storeCatalog!, shop = this.progress.shop(), wallet = shop.read();
    const names: Record<StoreCategory, string> = { Plants: '植物', Upgrade: '升级', Coin: '金币', Gem: '钻石' };
    const items = catalog.items.filter(item => item.category === this.storeCategory && (!item.unlockLevel || this.progress.isComplete(item.unlockLevel)));
    const money = (value: number) => value.toLocaleString('en-US');
    const art = (name: string) => assetUrl(catalog.art[name].image);
    const counters = (['coin', 'gem'] as const).map(currency => {
      const background = this.catalog.toolbar.find(d => d.name === (currency === 'coin' ? 'CoinCounter' : 'GemCounter'))!;
      return `<div class="store-currency" aria-label="${currency === 'coin' ? '金币' : '钻石'} ${wallet[currency]}" style="background-image:url('${assetUrl(background.image!)}')"><span>${money(wallet[currency])}</span></div>`;
    }).join('');
    this.modal('商店', `<div class="store-wallet" aria-live="polite">${counters}</div><div class="store-tabs" role="tablist" aria-label="商品分类">${(Object.keys(names) as StoreCategory[]).map(category => `<button role="tab" aria-label="${names[category]}" aria-selected="${category === this.storeCategory}" data-store-tab="${category}"><img src="${this.storeImages.get(category + (category === this.storeCategory ? '-selected' : ''))}" alt=""></button>`).join('')}</div><div class="store-shelf" role="tabpanel" aria-label="${names[this.storeCategory]}">${items.map(item => {
      const owned = shop.owned(item), canBuy = shop.canBuy(item, level => this.progress.isComplete(level));
      return `<article class="store-item" style="background-image:url('${art(item.type + 'Window')}')"><h3>${item.label}</h3><img class="store-product" src="${this.storeImages.get(item.id)}" alt="${item.label}">${item.type === 'coin' || item.type === 'gem' ? `<b class="store-count">×${money(item.count)}</b>` : ''}${item.description ? `<p class="store-description">${item.description}</p>` : ''}<button class="store-buy" data-buy="${item.id}" aria-label="${owned ? '已购买' : '购买'}${item.label}${owned ? '' : `，${item.price}${item.currency === 'gem' ? '钻石' : '金币'}`}" ${canBuy ? '' : 'disabled'} style="--buy-up:url('${art(item.currency + 'ButtonUp')}');--buy-down:url('${art(item.currency + 'ButtonDown')}')"><img src="${art(item.currency === 'gem' ? 'buyGemIcon' : 'buyCoinIcon')}" alt="">${owned ? '已售罄' : money(item.price)}</button></article>`;
    }).join('')}</div><div class="store-pagination"><button class="native-button" data-store-scroll="-1" aria-label="上一页商品">◀</button><button class="native-button" data-store-scroll="1" aria-label="下一页商品">▶</button></div>`);
    this.$('.native-window').classList.add('store-window');
    this.host.dataset.store = 'true'; this.renderer.setStoreOpen(true);
    for (const tab of this.host.querySelectorAll<HTMLButtonElement>('[data-store-tab]')) tab.onclick = () => {
      this.storeCategory = tab.dataset.storeTab as StoreCategory; this.renderStore();
      this.$<HTMLButtonElement>(`[data-store-tab="${this.storeCategory}"]`).focus();
    };
    for (const button of this.host.querySelectorAll<HTMLButtonElement>('[data-buy]')) button.onclick = () => {
      const item = catalog.items.find(item => item.id === button.dataset.buy)!;
      shop.buy(item, level => this.progress.isComplete(level));
      this.renderer.setCurrencies(shop.read());
      const offset = this.$('.store-shelf').scrollLeft;
      this.renderStore(); this.$('.store-shelf').scrollLeft = offset;
      this.$<HTMLButtonElement>(`[data-buy="${item.id}"]`).focus();
    };
    for (const button of this.host.querySelectorAll<HTMLButtonElement>('[data-store-scroll]')) button.onclick = () => {
      const shelf = this.$('.store-shelf'); shelf.scrollBy({ left: Number(button.dataset.storeScroll) * shelf.clientWidth * .8, behavior: 'smooth' });
    };
  }
  private async worldDescription(world: World) {
    this.loading(true);
    const art=await this.renderer.worldDetails(world.id);
    this.loading(false);
    if(isWorldMigrated(world.id)){
      this.modal(world.name,`<p>${world.description}</p><img class="world-banner" src="${art.background}" alt="${world.name}"><button class="native-button" data-unlock ${this.progress.worldKeys()<1?'disabled':''}>世界钥匙 × 1 · 解锁</button><div class="world-plant-cards">${art.cards.map(image=>`<img src="${image}" alt="本世界植物卡片">`).join('')}</div>`);
      this.$('.native-window').classList.add('world-description');this.$('[data-unlock]').onclick=()=>{if(this.progress.unlockWorld(world.id))void this.openWorld(world);};return;
    }
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
  private closeModal() { delete this.host.dataset.store; this.renderer.setStoreOpen(false); this.$('.map-modal').hidden=true; this.$('.map-modal').innerHTML=''; }
  private settings() {
    this.modal('设置',`<div class="settings-section"><h3>声音</h3>${audioControls(this.audio)}</div><div class="settings-section"><h3>游玩方式</h3><label class="free-play-option"><span class="free-play-copy"><strong>自由选关</strong><small>解锁世界与关卡入口，通关进度照常保存。</small></span><input data-test-unlock type="checkbox" role="switch" aria-label="自由选关" ${this.progress.temporaryUnlock?'checked':''}><span class="free-play-switch" aria-hidden="true"></span></label><p class="settings-note">${this.progress.temporaryUnlock?'已开启 · 关闭后恢复按进度解锁':'未开启 · 按通关进度解锁'}</p></div><button class="settings-pwa" data-pwa>安装与更新 <span>桌面安装 · 离线资源 · 版本管理 ›</span></button><p class="settings-saved">设置自动保存到本机，刷新后仍有效</p><button class="native-button close-dialog">返回游戏</button><a class="switch-version" href="/">植物大战僵尸 1</a>`);
    this.$('.native-window').classList.add('settings-window');
    this.$<HTMLButtonElement>('[data-pwa]').onclick = showPwa;
    this.$<HTMLInputElement>('[data-test-unlock]').onchange=async event=>{
      this.progress.temporaryUnlock=(event.target as HTMLInputElement).checked;
      if(this.map)await this.openWorld(this.currentWorld);else await this.showChooser();
      this.settings();
    };
    for (const input of this.host.querySelectorAll<HTMLInputElement>('[data-volume]')) input.oninput=()=>{
      this.audio[input.dataset.volume as 'music'|'effects']=Number(input.value);saveAudio(this.audio);updateVolumeControl(input);
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
