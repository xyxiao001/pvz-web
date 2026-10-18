import { textureScope } from '../assets/textures';
import 'pixi.js/prepare';
import { Application, Assets, Container, Sprite, Texture, Text, ColorMatrixFilter, Rectangle } from 'pixi.js';
import { PixiFactory, WorldClock, type PixiArmatureDisplay } from 'pixi-dragonbones-runtime';
import { assetUrl, json, loadInBatches } from '../assets/load';
import { clampCamera, islandStates } from './navigation';
import { WorldScrollGesture } from './world-scroll';
import type { CampaignCatalog } from '../rendering/battle-art';
import type { StoreCatalog, Wallet } from './store';
import type { MapEvent } from './progression';
import type { Catalog, Draw, Island, WorldMap, ProgressionArt } from './types';

interface MapDraw extends Draw { island?: number; role?: 'node' | 'path' | 'reward' }
interface View { root: Container; rigs: PixiArmatureDisplay[]; draw: MapDraw }
export class MapRenderer {
  private textures=textureScope();
  readonly app = new Application();
  private factory = new PixiFactory(null, false);
  private clock = new WorldClock();
  private root = new Container();
  private background!: PixiArmatureDisplay;
  private layer = new Container();
  private toolbar = new Container();
  private loaded = new Set<string>();
  private views = new Map<number, View>();
  private draws: MapDraw[] = [];
  private progression!: ProgressionArt;
  private map: WorldMap | null = null;
  private camera = 0;
  private velocity = 0;
  private mode: 'chooser' | 'map' = 'chooser';
  private carousel = 0;
  private worldScroll = new WorldScrollGesture();
  private carouselStart = 0;
  private carouselTarget = 0;
  private transition = .2;
  private pointer: { id: number; x: number; origin: number; moved: boolean } | null = null;
  private scale = 1;
  private grey = new ColorMatrixFilter();
  private backgroundColor = [0, 255, 224];
  private targetColor = [0, 255, 224];
  private observer!: ResizeObserver;
  onWorld: (index: number) => void = () => {};
  onIsland: (island: Island) => void = () => {};
  onCamera: (x: number) => void = () => {};
  onFrame: (camera: number, carousel: number) => void = () => {};
  onStep: (direction: number) => void = () => {};

  constructor(private host: HTMLElement, readonly catalog: Catalog) { this.grey.desaturate(); }
  async init() {
    await this.app.init({ width: 1024, height: 640, background: '#00c6d3', resolution: Math.min(devicePixelRatio, 2), autoDensity: true, antialias: true, autoStart: false });
    this.host.append(this.app.canvas); this.app.canvas.setAttribute('aria-label', '原生世界地图');
    this.app.stage.eventMode = 'none'; this.app.stage.addChild(this.root); this.root.addChild(this.layer, this.toolbar);
    await this.load([this.catalog.background]);
    this.background = this.makeRig(this.catalog.background, 'WorldmapBG', 'IdleDay');
    this.background.position.set(512, 320); this.root.addChildAt(this.background, 0);
    await this.prepare(this.catalog.toolbar);
    for (const draw of this.catalog.toolbar) {
      const view = this.make(draw); this.toolbar.addChild(view.root);
      if (draw.owner === 14) view.root.visible = true;
    }
    this.observer = new ResizeObserver(() => {
      this.scale = this.host.clientWidth / 1024; this.root.scale.set(this.scale);
      this.app.renderer.resize(this.host.clientWidth, this.host.clientWidth * 640 / 1024); this.app.render();
    }); this.observer.observe(this.host);
    const x = (event: PointerEvent) => (event.clientX - this.app.canvas.getBoundingClientRect().left) / this.scale;
    this.app.canvas.addEventListener('pointerdown', event => {
      this.velocity = 0; this.pointer = { id: event.pointerId, x: x(event), origin: x(event), moved: false };
      this.app.canvas.setPointerCapture(event.pointerId);
    });
    this.app.canvas.addEventListener('pointermove', event => {
      if (!this.pointer || this.pointer.id !== event.pointerId) return;
      const next = x(event), delta = next - this.pointer.x;
      if (Math.abs(next - this.pointer.origin) > 6) this.pointer.moved = true;
      if (this.mode === 'map' && this.pointer.moved) { this.velocity = -delta * 60; this.setCamera(this.camera - delta); }
      this.pointer.x = next;
    });
    this.app.canvas.addEventListener('pointerup', event => {
      const pointer = this.pointer; if (!pointer) return;
      this.pointer = null;
      if (pointer.moved) { if (this.mode === 'chooser') this.onStep(x(event) < pointer.origin ? 1 : -1); return; }
      const px = x(event), py = (event.clientY - this.app.canvas.getBoundingClientRect().top) / this.scale;
      if (this.mode === 'chooser') {
        const index = Math.round((px - 512 + this.carousel) / 264);
        if (index >= 0 && index < this.catalog.worlds.length && py > 100 && py < 570) this.onWorld(index);
      } else {
        const island = this.map!.islands.filter(n => n.kind === 0).find(n => Math.abs(px - (512 + n.x - this.camera)) < 32 && Math.abs(py - (320 + n.y - 18)) < 44);
        if (island) this.onIsland(island);
      }
    });
    this.app.canvas.addEventListener('pointercancel', () => { this.pointer = null; this.velocity = 0; });
    this.app.canvas.addEventListener('wheel', event => {
      event.preventDefault();
      if (this.mode === 'chooser') {
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? this.host.clientWidth : 1;
        const direction = this.worldScroll.step(delta * unit,event.timeStamp);
        if (direction !== 0) this.onStep(direction);
      }
      else { this.velocity = 0; this.setCamera(this.camera + (Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY) * .2); }
    }, { passive: false });
    this.app.ticker.add(ticker => {
      const dt = Math.min(ticker.deltaMS / 1000, .05);
      if (this.mode === 'chooser' && this.transition < .2) {
        this.transition = Math.min(.2, this.transition + dt); const t = this.transition / .2;
        this.carousel = this.carouselStart + (this.carouselTarget - this.carouselStart) * (1 - (1 - t) ** 2);
        this.positionChooser();
      }
      if (this.mode === 'map' && !this.pointer && Math.abs(this.velocity) > .5) {
        this.setCamera(this.camera + this.velocity * dt); this.velocity *= Math.pow(1 / 1.05, dt * 60);
      }
      for (let i = 0; i < 3; i++) this.backgroundColor[i] += (this.targetColor[i] - this.backgroundColor[i]) * Math.min(1, dt * 5);
      this.background.tint = (Math.round(this.backgroundColor[0]) << 16) | (Math.round(this.backgroundColor[1]) << 8) | Math.round(this.backgroundColor[2]);
      this.clock.advanceTime(dt); PixiFactory.advanceTime(0);
      this.onFrame(this.camera, this.carousel);
    });
  }
  private makeRig(key: string, armature: string, animation: string) {
    const display = this.factory.buildArmatureDisplay(armature, key)!;
    display.armature.clock = this.clock;
    if (animation) display.animation.play(animation, 0);
    return display;
  }
  private async load(keys: string[]) {
    await loadInBatches([...new Set(keys)].filter(key => !this.loaded.has(key)), 2, async key => {
      const path = `shell/rigs/${key}/`;
      const [skeleton, atlas, texture] = await Promise.all([json<object>(path + 'skeleton.json'), json<object>(path + 'atlas.json'), this.textures.load(assetUrl(path + 'texture.webp'))]);
      this.factory.parseDragonBonesData(skeleton, key); this.factory.parseTextureAtlasData(atlas, texture, key);
      await this.app.renderer.prepare.upload(texture); this.loaded.add(key);
    });
  }
  private clear() {
    for (const view of this.views.values()) { for (const rig of view.rigs) rig.dispose(); view.root.destroy({ children: true }); }
    this.views.clear(); this.draws = []; PixiFactory.advanceTime(0);
  }
  private async releaseExcept(keys: Set<string>) {
    for (const draw of this.catalog.toolbar) if (draw.kind === 'rig') keys.add(draw.rig!);
    for (const key of this.loaded) if (!keys.has(key)) {
      this.factory.removeDragonBonesData(key); this.factory.removeTextureAtlasData(key);
      await this.textures.release(assetUrl(`shell/rigs/${key}/texture.webp`)); this.loaded.delete(key);
    }
    PixiFactory.advanceTime(0);
  }
  private make(draw: MapDraw): View {
    const root = new Container(), rigs: PixiArmatureDisplay[] = [];
    if (draw.kind === 'rig') { const rig = this.makeRig(draw.rig!, draw.armature!, draw.animation!); root.addChild(rig); rigs.push(rig); }
    if (draw.kind === 'sprite') {
      const image = new Sprite(Assets.get<Texture>(assetUrl(draw.image!))); image.anchor.set(draw.ax!, draw.ay!); image.width = draw.w!; image.height = draw.h!; root.addChild(image);
    }
    if (draw.kind === 'label' && draw.text) {
      const text = new Text({ text: draw.text, style: { fontFamily: 'PvZMap, sans-serif', fontSize: draw.size, fill: '#fff', stroke: { color: '#333129', width: 2 } } });
      text.anchor.set(.5); root.addChild(text);
    }
    root.position.set(512 + draw.x, 320 + draw.y); root.scale.set(draw.sx, draw.sy); root.rotation = draw.rotation;
    this.layer.addChild(root); return { root, rigs, draw };
  }
  private async prepare(draws: Draw[]) {
    await this.load(draws.filter(d => d.kind === 'rig').map(d => d.rig!));
    await Promise.all([...new Set(draws.filter(d => d.kind === 'sprite').map(d => assetUrl(d.image!)))].map(path => this.textures.load(path)));
  }
  setWorldKeys(count:number){const index=this.catalog.toolbar.findIndex(d=>d.owner===14&&d.kind==='label');(this.toolbar.children[index].children[0] as Text).text=String(count);}
  setStoreOpen(open: boolean) { this.layer.visible = !open; this.toolbar.visible = !open; }
  setCurrencies(wallet: Wallet) {
    for (const [owner, value] of [[24, wallet.coin], [25, wallet.gem], [26, wallet.ticket]]) {
      const index = this.catalog.toolbar.findIndex(d => d.owner === owner && d.name === 'value');
      const label = this.toolbar.children[index].children[0] as Text;
      label.text = value.toLocaleString('en-US'); label.scale.set(1);
      label.scale.set(Math.min(1, 170 / label.width));
    }
  }
  async storeArt(catalog: StoreCatalog) {
    const campaign = await json<CampaignCatalog>('campaign/catalog.json');
    const upgradeKey = this.catalog.nodes.upgrade.find(d => d.kind === 'rig')!.rig!;
    await this.load([catalog.rig, upgradeKey]);
    const images = new Map<string, string>();
    const previews=textureScope();
    const capture = (id: string, layers: PixiArmatureDisplay[]) => {
      const root = new Container();
      for (const rig of layers) { rig.armature.advanceTime(.001); root.addChild(rig); }
      images.set(id, (this.app.renderer.extract.canvas({ target: root, resolution: 2 }) as HTMLCanvasElement).toDataURL('image/webp'));
      layers.forEach(rig => rig.dispose()); root.destroy({ children: true });
    };
    for (const [category, armature] of Object.entries({ Plants: 'page_plant', Upgrade: 'page_trophy', Coin: 'page_coin', Gem: 'page_gem' })) {
      capture(category, [this.makeRig(catalog.rig, armature, 'Idle')]);
      capture(category + '-selected', [this.makeRig(catalog.rig, armature, 'Chosen')]);
    }
    for (const item of catalog.items) {
      if (item.type === 'plant') {
        const spec = campaign.actors[item.name], base = `campaign/rigs/${spec.rig}/`;
        const [skeleton, atlas, texture] = await Promise.all([json<object>(base + 'skeleton.json'), json<object>(base + 'atlas.json'), previews.load(assetUrl(base + 'texture.webp'))]);
        const factory = new PixiFactory(null, false);
        factory.parseDragonBonesData(skeleton, spec.rig); factory.parseTextureAtlasData(atlas, texture, spec.rig);
        const rig = factory.buildArmatureDisplay(spec.armature, spec.rig)!; rig.animation.play('Idle', 0);
        capture(item.id, [rig]); factory.clear(false);
      } else if (item.type === 'upgrade') capture(item.id, [this.makeRig(upgradeKey, 'Upgrades', item.animation!)]);
      else capture(item.id, [this.makeRig(catalog.rig, item.type + 'Stack', item.animation!)]);
    }
    PixiFactory.advanceTime(0);await previews.dispose();
    return images;
  }
  async showChooser(index: number,unlocked:ReadonlySet<string>) {
    this.stop(); this.clear(); this.toolbar.children.forEach((child,i) => { child.visible = this.catalog.toolbar[i].owner === 14; }); this.mode = 'chooser'; this.map = null; this.velocity = 0;
    const selected = this.catalog.chooser.filter(d => d.kind === 'rig');
    await this.prepare([...selected, ...this.catalog.lock]);
    await this.releaseExcept(new Set([this.catalog.background, ...selected.map(d => d.rig!), ...this.catalog.lock.map(d => d.rig!)]));
    this.draws = selected;
    for (const [i, draw] of selected.entries()) {
      const view = this.make(draw); this.views.set(i, view);
      const world = this.catalog.worlds.find(w => w.draw.owner === draw.owner);
      if (world && !unlocked.has(world.id) && world.enterable) {
        view.rigs[0].filters = [this.grey]; view.rigs[0].tint = 0x969696;
        for (const lock of this.catalog.lock) if (lock.kind === 'rig') {
          const rig = this.makeRig(lock.rig!, lock.armature!, lock.animation!); rig.y = -120; view.root.addChild(rig); view.rigs.push(rig);
        }
      }
    }
    this.carousel = this.carouselTarget = index * 264; this.transition = .2; this.positionChooser(); this.setNight(this.catalog.worlds[index].night); this.start();
  }
  async worldDetails(id: string) {
    const data = await json<{rig:string;worlds:Record<string,number[]>}>('shell/window.json');
    const cardKey = this.catalog.nodes.plantCard.find(d=>d.kind==='rig')!.rig!;
    await this.load([data.rig,cardKey]);
    const banner = this.makeRig(data.rig,'BG',id); banner.armature.advanceTime(.001);
    const background=(this.app.renderer.extract.canvas({target:banner,resolution:1}) as HTMLCanvasElement).toDataURL('image/webp');banner.dispose();
    const cards=data.worlds[id].map(plant=>{
      const props=this.catalog.plantCards[plant],root=new Container();
      const layers=[this.makeRig(cardKey,'background',props.background),this.makeRig(cardKey,'plants',props.animation)];
      for(const rig of layers){rig.armature.advanceTime(.001);root.addChild(rig);}
      const image=(this.app.renderer.extract.canvas({target:root,resolution:1,frame:new Rectangle(-119,-75,238,150)}) as HTMLCanvasElement).toDataURL('image/webp');
      layers.forEach(r=>r.dispose());root.destroy({children:true});return image;
    });
    return {background,cards};
  }
  selectWorld(index: number) {
    this.carouselStart = this.carousel; this.carouselTarget = index * 264; this.transition = 0;
    this.setNight(this.catalog.worlds[index].night);
  }
  private setNight(night: boolean) { this.targetColor = night ? [75, 133, 255] : [0, 255, 224]; }
  private positionChooser() {
    for (const view of this.views.values()) {
      const draw = view.draw;
      if (draw.armature === 'rotateEffect') continue;
      const x = draw.x - this.carousel, scale = Math.max(1 - Math.abs(x) / 600, .3);
      view.root.position.set(512 + x, 320 + draw.y); view.root.scale.set(draw.sx * scale, draw.sy * scale);
    }
  }
  async showMap(map: WorldMap, camera: number, completed: ReadonlySet<string>, night: boolean, rewards: ReadonlySet<number>, progression: ProgressionArt, events: MapEvent[] = [], temporaryUnlock = false) {
    this.stop(); this.clear(); this.toolbar.children.forEach((child,i) => { child.visible = this.catalog.toolbar[i].owner !== 14; }); this.map = map; this.mode = 'map'; this.velocity = 0; this.setNight(night);
    this.progression = progression;
    const states = islandStates(map, completed, rewards, temporaryUnlock), dynamic: MapDraw[] = [], paths: MapDraw[] = [];
    for (const island of map.islands) {
      const state = states.get(island.node)!;
      for (const next of island.next) {
        const target = map.islands.find(n => n.node === next)!, dx = target.x - island.x, dy = target.y - island.y;
        for (const style of this.catalog.nodes.path) if (style.kind === 'rig') paths.push({ ...style, island: island.node, role: 'path', x: island.x, y: island.y, sx: Math.hypot(dx, dy) / 330, sy: .4, rotation: Math.atan2(dy, dx), parallax: 1, animation: state === 'finished' ? 'Idle' : 'Idle_Thin' });
      }
      if (island.kind === 0) {
        const key = island.appearance === 0 ? 'normalNode' : island.appearance === 1 ? 'minigameNode' : 'gargantuarNode';
        for (const style of this.catalog.nodes[key]) {
          if (style.kind === 'sprite' || style.kind === 'rig' || style.kind === 'label') dynamic.push({ ...style, island: island.node, role: 'node', x: island.x + style.x, y: island.y + style.y, parallax: 1,
            ...(style.kind === 'label' ? { text: island.name } : {}), ...(style.kind === 'rig' ? { animation: state === 'finished' ? 'IdleFinished' : state === 'open' ? 'IdleUnfinish' : 'IdleUnopen' } : {}) });
        }
      }
      if (island.kind === 1 && rewards.has(island.node)) dynamic.push(...this.plantDraws(island));
      if (island.kind === 1 && !rewards.has(island.node)) {
        const card = this.catalog.plantCards[island.plant];
        for (const style of this.catalog.nodes.plantCard) dynamic.push({ ...style, island: island.node, role: 'reward', x: island.x, y: island.y - 30, sx: .4, sy: .4, parallax: 1,
          animation: style.armature === 'plants' ? card.animation : card.background });
      }
      if (island.kind === 3) for (const style of this.catalog.nodes.upgrade) dynamic.push({ ...style, x: island.x, y: island.y, sx: .4, sy: .4, parallax: 1, animation: this.catalog.upgrades[island.upgrade] });
      if (island.kind === 2 || island.kind === 4) for (const style of this.catalog.nodes[island.kind === 2 ? 'giftbox' : 'epicPortal']) {
        if (style.kind === 'rig') dynamic.push({ ...style, x: island.x + style.x, y: island.y + style.y, sx: .4, sy: .4, parallax: 1, animation: island.kind === 2 ? (state === 'finished' ? 'Finished' : 'Idle') : (state === 'finished' ? 'Idle' : 'Idle_Locked') });
      }
    }
    this.draws = [...map.draws.filter(d => !['DeltaArrow', 'BtnPurpleBigUp'].includes(d.name)), ...paths, ...dynamic];
    const rewardDraws = events.filter(e => e.action === 'reward').flatMap(e => {
      const island = map.islands.find(n => n.node === e.node)!;
      return island.kind === 1 ? this.plantDraws(island) : [];
    });
    await this.prepare([...this.draws, ...rewardDraws]);
    await this.releaseExcept(new Set([this.catalog.background, ...[...this.draws, ...rewardDraws].filter(d => d.kind === 'rig').map(d => d.rig!)]));
    this.camera = clampCamera(map, camera); this.positionMap(); this.start();
  }
  private plantDraws(island: Island): MapDraw[] {
    return this.progression.plants[island.plant].map(draw => ({ ...draw,
      island: island.node, role: 'reward', x: island.x + draw.x, y: island.y + draw.y, parallax: 1,
    }));
  }
  private animateIsland(node: number, role: MapDraw['role'], animation: string, idle: string) {
    for (const [index, draw] of this.draws.entries()) if (draw.island === node && draw.role === role && draw.kind === 'rig') {
      draw.animation = idle;
      for (const rig of (this.views.get(index)?.rigs ?? [])) rig.animation.play(animation, 1);
    }
  }
  private revealPlant(island: Island) {
    for (const [index, draw] of this.draws.entries()) if (draw.island === island.node && draw.role === 'reward') {
      const view = this.views.get(index);
      if (view) { view.rigs.forEach(r => r.dispose()); view.root.destroy({ children: true }); this.views.delete(index); }
      // Retain indices of the other map views while replacing the card's two layers.
      draw.kind = 'label'; draw.text = ''; delete draw.animation;
    }
    this.draws.push(...this.plantDraws(island)); this.positionMap();
  }
  async presentCompletion(events: MapEvent[], onEvent: (event: MapEvent) => void, sound: (name: string) => void) {
    let elapsed = 0, next = 0;
    const end = Math.max(...events.map(e => e.at + (e.action === 'reward' ? 0 : this.progression.durations[e.action])));
    await new Promise<void>(resolve => {
      const tick = () => {
        elapsed += Math.min(this.app.ticker.deltaMS / 1000, .05);
        while (next < events.length && events[next].at <= elapsed) {
          const event = events[next++], island = this.map!.islands.find(n => n.node === event.node)!;
          if (event.action === 'finish') this.animateIsland(event.node, 'node', 'Finish', 'IdleFinished');
          if (event.action === 'path') this.animateIsland(event.node, 'path', 'Push', 'Idle');
          if (event.action === 'open') this.animateIsland(event.node, 'node', 'Open', 'IdleUnfinish');
          if (event.action === 'reward' && island.kind === 1) this.revealPlant(island);
          onEvent(event);
          sound({ finish: 'levelNodeFinish', path: 'levelPathPush', open: 'levelNodeReveal', reward: 'plantNodeUnlock' }[event.action]);
        }
        if (elapsed >= end) { this.app.ticker.remove(tick); resolve(); }
      };
      this.app.ticker.add(tick);
    });
  }
  private positionMap() {
    for (const [index, draw] of this.draws.entries()) {
      const x = 512 + draw.x - this.camera * draw.parallax!;
      const visible = draw.parallax !== 1 || x > -900 && x < 1924;
      const old = this.views.get(index);
      if (!visible) { if (old) { for (const rig of old.rigs) rig.dispose(); old.root.destroy({ children: true }); this.views.delete(index); } continue; }
      const view = old ?? this.make(draw); view.root.x = x; view.root.zIndex = index;
      if (!old) this.views.set(index, view);
    }
    this.layer.sortableChildren = true; this.onCamera(this.camera);
  }
  private setCamera(x: number) { this.camera = clampCamera(this.map!, x); this.positionMap(); }
  moveBy(delta: number) { this.velocity = 0; this.setCamera(this.camera + delta); }
  start() { this.app.start(); }
  stop() { this.app.stop(); this.velocity = 0; }
}
