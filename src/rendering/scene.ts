import { ActorMotion, ACTOR_MOTION, hasActorMotion, type ActorRig } from './actor-motion';
import { ZombieHealthBar } from './zombie-health';
import { GiantMotion, hasGiantMotion, type GiantRig } from './giant-motion';
import { hasPlantMotion, hasPlantMotionClip, PlantMotion, type PlantRig } from './plant-motion';
import { renderResolution } from './resolution';
import { loadInBatches } from '../platform/load-queue';
import { BossArt } from './boss';
import 'pixi.js/prepare';
import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { BOARD, cellX, PLANTS, isPool } from '../game/config';
import { headless, type Game, type GameEvent } from '../game/model';
import { walkingCycleTicks } from '../game/zombie-motion';

import { animationNames, animationFrame, combatTextureFiles } from './asset-plan';

type ClipData = { frames: number[][]; durations: number[]; anchor: number[]; pages: string[] };
type Clip = { files: string[]; frames: Texture[]; ends: number[]; duration: number; anchors: number[][] };
type Actor = { nativeRig?: ActorRig; healthBar?: ZombieHealthBar; giantRig?: GiantRig; rig?: PlantRig; root: Container; art: Sprite; clip: string; since: number; frame: number; seen: number; previousX: number; previousY: number; motion?: { x: number; y?: number } };
type Effect = { node: Container; born: number; duration: number; actor?: Actor };

export class Scene {
  readonly app = new Application();
  showZombieHealth = false;
  private world = new Container();
  private bossArt?: BossArt;
  private plantMotion = new PlantMotion();
  private actorMotion = new ActorMotion();
  private giantMotion = new GiantMotion();
  private actors = new Map<string, Actor>();
  private effects: Effect[] = [];
  private textures: Record<string, Texture> = {};
  private textureFiles: string[] = [];
  private resourceWork = Promise.resolve();
  private animationData?: Promise<{ animations: Record<string, ClipData> }>;
  private clips: Record<string, Clip> = {};
  private hover = new Graphics();
  private health = new Graphics();
  private fog = new Container();
  private weather = new Graphics();
  private fogFrames: Texture[] = [];
  private fogKey = '';
  private pointer: { x: number; y: number } | null = null;
  private time = 0;
  private stamp = 0;
  private healthKey = '';
  private hoverKey = '';
  private lawnTextures: Texture[] = [];
  private vaseFrames: Texture[] = [];
  private explosions: { x: number; y: number }[] = [];

  async init(host: HTMLElement) {
    await this.app.init({ width: BOARD.width, height: BOARD.height, backgroundAlpha: 0, antialias: true,
      resolution: renderResolution(host.clientWidth, window.devicePixelRatio), autoDensity: true, autoStart: false });
    host.appendChild(this.app.canvas);
    this.app.canvas.style.width = '100%';
    this.app.canvas.style.height = '100%';
    this.app.canvas.setAttribute('aria-label', '庭院战场。先选植物，再点击草地种植；点击阳光收集。');
    // Keep the 800×600 world and match display density up to the 2× source artwork.
    new ResizeObserver(([entry]) => {
      this.app.renderer.resize(BOARD.width, BOARD.height, renderResolution(entry.contentRect.width, window.devicePixelRatio));
      this.app.canvas.style.width = '100%'; this.app.canvas.style.height = '100%';
      this.app.render();
    }).observe(host);
    this.world.sortableChildren = true;
  }

  prepareBoard(game: Game, progress: (done: number, total: number) => void) {
    this.resourceWork = this.resourceWork.then(() => this.loadBoard(game, progress));
    return this.resourceWork;
  }

  private async loadBoard(game: Game, progress: (done: number, total: number) => void) {
    await this.clearResources();
    const files: Record<string, string> = { mower: 'original/mower.webp' };
    const environment = game.config.environment;
    if (environment === 'day') { files.yard = 'yard.webp'; files.lawn = 'lawn.webp'; }
    else files[environment] = `original/${environment}.webp`;
    if(game.boss)files.bossBackground='boss/background.webp';
    if (environment === 'roof') files.flowerpot = 'original/flowerpot.webp';
    if (environment === 'night') files.grave = 'original/grave.webp';
    if (isPool(environment)) files.poolCleaner = 'original/pool-cleaner.webp';
    if (environment === 'fog') files.fogCloud = 'original/fog-cloud.webp';
    if (game.config.mode === 'bowling') files.stripe = 'original/bowling-stripe.webp';
    if (game.config.mode === 'whack') files.hammer = 'original/hammer.webp';
    if (game.config.mode === 'vase') {
      files.vases = 'original/vases.webp'; files.packet = 'original/seed-packet.webp';
      for (const kind of game.config.seeds) files[kind] = `original/${kind}.webp`;
    }
    await this.prepareTextures(files, progress);
    if (game.config.mode === 'vase' && this.vaseFrames.length === 0) this.vaseFrames = [0,1].map(i => new Texture({ source:this.textures.vases.source, frame:new Rectangle(i*80,101,80,101) }));
    if (environment === 'fog' && this.fogFrames.length === 0) this.fogFrames = Array.from({length:8}, (_,i) => new Texture({source:this.textures.fogCloud.source,frame:new Rectangle(i*210,0,210,190)}));
    if (environment === 'day' && this.lawnTextures.length === 0) this.lawnTextures = Array.from({length:5}, (_,row) => new Texture({source:this.textures.lawn.source,frame:new Rectangle(220,BOARD.top+row*100,800,100)}));
  }

  private async prepareTextures(files: Record<string, string>, progress: (done: number, total: number) => void) {
    const pending = Object.entries(files).filter(([key]) => !this.textures[key]);
    let done = 0; progress(done, pending.length);
    await loadInBatches(pending, 4, async ([key, file]) => {
      this.textures[key] = await Assets.load<Texture>({ src: `${import.meta.env.BASE_URL}assets/runtime/${file}`, data: { resolution: 2 } });
      this.textureFiles.push(`${import.meta.env.BASE_URL}assets/runtime/${file}`);
      await this.app.renderer.prepare.upload(this.textures[key]);
      progress(++done, pending.length);
    });
  }

  prepareActors(game: Game, progress: (done: number, total: number) => void) {
    this.resourceWork = this.resourceWork.then(() => this.loadActors(game, progress));
    return this.resourceWork;
  }

  private async loadActors(game: Game, progress: (done: number, total: number) => void) {
    await this.prepareTextures(combatTextureFiles(game), progress);
    await this.plantMotion.prepare([...new Set([...game.seeds, ...game.plants.map(p => p.kind)])].filter(hasPlantMotion), progress, texture => this.app.renderer.prepare.upload(texture));
    if(game.boss&&!this.bossArt){this.bossArt=new BossArt();await this.bossArt.load(progress);this.bossArt.root.zIndex=590;this.world.addChild(this.bossArt.root);}
    const base = `${import.meta.env.BASE_URL}assets/runtime/`;
    this.animationData ??= fetch(base + 'animations.json').then(response => response.json());
    const { animations } = await this.animationData;
    const needed = new Set(animationNames(game, Object.keys(animations)).filter(name => !hasPlantMotionClip(name)));
    for (const effect of this.effects) if (effect.actor) needed.add(effect.actor.clip);
    for (const [name, clip] of Object.entries(this.clips)) if (!needed.has(name)) {
      for (const texture of clip.frames) texture.destroy();
      await Assets.unload(clip.files);
      delete this.clips[name];
    }
    await this.giantMotion.prepare([...needed].some(hasGiantMotion), texture => this.app.renderer.prepare.upload(texture));
    await this.actorMotion.prepare([...needed], progress, texture => this.app.renderer.prepare.upload(texture));
    const names = [...needed].filter(name => !hasGiantMotion(name) && !hasActorMotion(name) && !this.clips[name]);
    const files = [...new Set(names.flatMap(name => animations[name].pages))];
    const pages = new Map<string, Texture>();
    let done = 0; progress(done, files.length);
    await loadInBatches(files, 4, async file => {
      const texture = await Assets.load<Texture>({ src: base + file, data: { resolution: 2 } });
      pages.set(file, texture);
      await this.app.renderer.prepare.upload(texture);
      progress(++done, files.length);
    });
    for (const name of names) {
      const clip = animations[name];
      let duration = 0;
      this.clips[name] = {
        files: clip.pages.map(file => base + file),
        ends: clip.durations.map(ticks => duration += ticks), duration,
        anchors: clip.frames.map(frame => [(clip.anchor[0]-frame[5])/frame[3], (clip.anchor[1]-frame[6])/frame[4]]),
        frames: clip.frames.map(([page,x,y,w,h]) => new Texture({source:pages.get(clip.pages[page])!.source,frame:new Rectangle(x,y,w,h)})),
      };
    }
  }

  // Discard battle-owned CPU/GPU textures; HTTP/PWA caches still serve revisits.
  release() {
    this.app.stop();
    this.resourceWork = this.resourceWork.then(() => this.clearResources());
    return this.resourceWork;
  }

  private async clearResources() {
    this.clearObjects();
    if (this.bossArt) { await this.bossArt.destroy(); this.bossArt = undefined; }
    await this.plantMotion.destroy();
    await this.actorMotion.destroy();
    await this.giantMotion.destroy();
    const files = [...this.textureFiles];
    for (const clip of Object.values(this.clips)) {
      clip.frames.forEach(texture => texture.destroy()); files.push(...clip.files);
    }
    for (const texture of [...this.lawnTextures, ...this.fogFrames, ...this.vaseFrames]) texture.destroy();
    this.lawnTextures = []; this.fogFrames = []; this.vaseFrames = [];
    this.clips = {}; this.textures = {}; this.textureFiles = [];
    await Assets.unload(files);
  }

  private clearObjects() {
    for (const child of this.app.stage.removeChildren()) {
      if (child !== this.world && child !== this.hover && child !== this.health && child !== this.fog && child !== this.weather) child.destroy({ children: true });
    }
    for (const actor of this.actors.values()) actor.root.destroy({ children: true });
    for (const effect of this.effects) effect.node.destroy({ children: true });
    this.actors.clear(); this.effects = []; this.explosions = []; this.time = 0; this.healthKey = ''; this.hoverKey = '';
    this.hover.clear(); this.health.clear(); this.fog.removeChildren().forEach(child=>child.destroy()); this.fogKey = '';
  }

  setLevel(game: Game) {
    this.clearObjects();
    const yard = new Sprite(game.boss ? this.textures.bossBackground : game.config.environment === 'day' ? this.textures.yard : this.textures[game.config.environment]); yard.x = -220;
    this.app.stage.addChild(yard);
    for (const row of game.config.environment === 'day' ? game.config.rows : []) {
      const lawn = new Sprite(this.lawnTextures[row]);
      lawn.y = BOARD.top + row * 100; this.app.stage.addChild(lawn);
    }
    if (game.config.mode === 'bowling') { const stripe = new Sprite(this.textures.stripe); stripe.position.set(268, 77); this.app.stage.addChild(stripe); }
    this.app.stage.addChild(this.hover, this.world, this.health, this.fog, this.weather); this.pointer = null;
  }

  setPointer(pointer: { x: number; y: number } | null) { this.pointer = pointer; }

  private clipDuration(name: string) {
    return hasActorMotion(name) ? this.actorMotion.duration(name) : hasGiantMotion(name) ? this.giantMotion.duration(name) : this.clips[name].duration;
  }

  private animate(actor: Actor, clipName: string, loop = true, timeline = this.time, rate = 1, shootingTicks?: number) {
    if (hasPlantMotion(clipName)) {
      if (!actor.rig) {
        actor.rig = this.plantMotion.create(clipName); actor.root.addChild(actor.rig.root); actor.art.visible = false;
        actor.clip = clipName; actor.since = timeline - actor.root.uid * 17 % this.plantMotion.duration(clipName);
      }
      actor.rig.render((timeline - actor.since) * rate, shootingTicks);
      return;
    }
    if (actor.clip !== clipName) {
      actor.clip = clipName; actor.since = timeline; actor.frame = -1;
      // Spread idle plants across the cycle; do not synchronize every newly planted row.
      if (loop && ['peashooter', 'sunflower', 'wallnut', 'snowpea', 'potatomine', 'chomper', 'repeater', 'puffshroom', 'sunshroom', 'sunshroom-big', 'fumeshroom', 'hypnoshroom', 'scaredyshroom', 'iceshroom','doomshroom','lilypad','squash','threepeater','plantern','spikeweed','torchwood','tallnut','seashroom','cactus'].includes(clipName)) actor.since -= actor.root.uid * 17 % this.clipDuration(clipName);
    }
    const elapsed = (timeline - actor.since) * rate;
    if (hasGiantMotion(clipName)) {
      if (!actor.giantRig) {
        actor.giantRig = this.giantMotion.create(); actor.root.addChild(actor.giantRig.root); actor.art.visible = false;
      }
      actor.giantRig.render(clipName, elapsed, loop);
      return;
    }
    if (hasActorMotion(clipName)) {
      if (actor.nativeRig && actor.nativeRig.family !== ACTOR_MOTION[clipName]) {
        actor.nativeRig.root.destroy({ children: true }); actor.nativeRig = undefined;
      }
      if (!actor.nativeRig) {
        actor.nativeRig = this.actorMotion.create(clipName); actor.root.addChild(actor.nativeRig.root);
      }
      actor.nativeRig.root.visible = true; actor.art.visible = false;
      actor.nativeRig.render(clipName, elapsed, loop);
      return;
    }
    if (actor.nativeRig) actor.nativeRig.root.visible = false;
    actor.art.visible = true;
    const clip = this.clips[clipName];
    // Bowling nuts rotate as rigid bodies; interpolate the angle at display rate.
    if (clipName === 'wallnut-roll' || clipName === 'explodenut') {
      actor.art.texture = clip.frames[0]; actor.art.anchor.set(.5);
      actor.art.position.set((.5 - clip.anchors[0][0]) * actor.art.texture.width,
        (.5 - clip.anchors[0][1]) * actor.art.texture.height);
      actor.art.rotation = elapsed / clip.duration * Math.PI * 2;
      return;
    }
    const position = loop ? elapsed % clip.duration : Math.min(elapsed, clip.duration - .001);
    const frame = animationFrame(clip.ends, position);
    if (actor.frame === frame) return;
    actor.frame = frame;
    actor.art.texture = clip.frames[frame];
    actor.art.anchor.set(clip.anchors[frame][0], clip.anchors[frame][1]);
  }

  // Capture moving actors before each fixed step; the final snapshot brackets the rendered frame.
  captureMovement() {
    for (const actor of this.actors.values()) if (actor.motion) {
      actor.previousX = actor.motion.x;
      if (actor.motion.y !== undefined) actor.previousY = actor.motion.y;
    }
  }

  private move(actor: Actor, motion: { x: number; y?: number }, y: number, alpha: number) {
    if (!actor.motion) { actor.previousX = motion.x; actor.previousY = y; }
    actor.motion = motion;
    actor.root.position.set(actor.previousX + (motion.x - actor.previousX) * alpha,
      motion.y === undefined ? y : actor.previousY + (y - actor.previousY) * alpha);
  }

  private actor(key: string, zIndex: number) {
    let actor = this.actors.get(key);
    if (!actor) {
      const root = new Container(); root.zIndex = zIndex; const art = new Sprite(); root.addChild(art); this.world.addChild(root);
      actor = { root, art, clip: '', since: this.time, frame: -1, seen: this.stamp, previousX: 0, previousY: 0 }; this.actors.set(key, actor);
    }
    actor.seen = this.stamp;
    return actor;
  }

  event(event: GameEvent) {
    if (event.kind === 'fire') {
      const actor = this.actor(`fire-${this.stamp}`, event.row * 100 + 35);
      actor.root.position.set(0, event.y); this.animate(actor, 'jalapeno-fire', false);
      this.actors.delete(`fire-${this.stamp}`);
      this.effects.push({ node: actor.root, actor, born: this.time, duration: this.clips['jalapeno-fire'].duration });
    }
    if (event.kind === 'vase') {
      const shards = new Graphics();
      for (let i=0;i<7;i++) shards.poly([i*9-30,-10, i*9-24,-24-(i%3)*5, i*9-18,-7]).fill(i%2 ? 0xb38e60 : 0x785231);
      shards.position.set(event.x,event.y); shards.zIndex=700; this.world.addChild(shards);
      this.effects.push({ node:shards, born:this.time, duration:25 });
    }
    if (event.kind === 'swallow') {
      const key = `z${event.zombieId}`; const actor = this.actors.get(key);
      if (actor) { actor.root.destroy({ children: true }); this.actors.delete(key); }
    }
    if (event.kind === 'whack') {
      const hammer = new Sprite(this.textures.hammer); hammer.anchor.set(.75, .85);
      hammer.position.set(event.x, event.y); hammer.zIndex = 1000;
      this.world.addChild(hammer); this.effects.push({ node: hammer, born: this.time, duration: 18 });
    }
    if (event.kind === 'freeze') {
      const frost = new Graphics().rect(0,80,800,510).fill({color:0xc9f5ff,alpha:.55});
      frost.zIndex=900; this.world.addChild(frost); this.effects.push({node:frost,born:this.time,duration:45});
    }
    if (event.kind === 'hypnotize') {
      const glow = new Graphics().circle(0, 0, 40).stroke({ color: 0xdc79ff, width: 5 });
      glow.position.set(event.x, event.y); glow.zIndex = 800;
      this.world.addChild(glow); this.effects.push({ node: glow, born: this.time, duration: 40 });
    }
    if (event.kind === 'sun' || event.kind === 'coin') {
      const label = new Text({ text: `+${event.value}`, style: { fontFamily: 'Arial', fontWeight: 'bold', fontSize: 25,
        fill: 0xfffbc2, stroke: { color: 0x496225, width: 3 } } });
      label.anchor.set(.5); label.position.set(event.x, event.y - 10); label.zIndex = 999;
      this.world.addChild(label); this.effects.push({ node: label, born: this.time, duration: 70 });
    }
    if (event.kind === 'fume') {
      const actor = this.actor(`f${this.stamp}-${this.effects.length}`, event.row * 100 + 30);
      actor.root.position.set(event.x, event.y); this.animate(actor, 'fume-cloud', false);
      this.actors.delete(`f${this.stamp}-${this.effects.length}`);
      this.effects.push({ node: actor.root, actor, born: this.time, duration: this.clips['fume-cloud'].duration });
    }
    if (event.kind === 'explode') {
      this.explosions.push(event);
      const burst = new Graphics().circle(0, 0, 110).fill({ color: 0xffcf3a, alpha: .8 }).circle(0, 0, 75).fill(0xfff3b0);
      burst.position.set(event.x, event.y); burst.zIndex = 800; this.world.addChild(burst);
      this.effects.push({ node: burst, born: this.time, duration: 35 });
    }
  }

  render(game: Game, elapsed = 0, alpha = 1) {
    if (game.phase === 'playing') this.time = game.ticks + alpha;
    else if (game.phase === 'won' || game.phase === 'lost') this.time += elapsed / 10;
    this.stamp++;
    if(game.boss)this.bossArt?.render(game,alpha);
    for (const ice of game.iceTrails) {
      const actor = this.actor(`ice${ice.row}`, ice.row * 100 + 1);
      actor.art.texture = this.textures.iceTrail; actor.art.width = 800 - ice.x; actor.art.height = 70;
      actor.root.position.set(ice.x, game.rowY(ice.row) - 55); actor.root.alpha = Math.min(1, ice.remaining / 200);
    }
    for (const vase of game.vases) {
      const actor = this.actor(`vase${vase.id}`, vase.row*100+15);
      actor.art.texture = this.vaseFrames[Number(vase.green)]; actor.art.anchor.set(.5,1);
      actor.root.position.set(cellX(vase.column),game.rowY(vase.row));
    }
    for (const drop of game.seedDrops) {
      const actor = this.actor(`drop${drop.id}`, 650);
      if (actor.clip !== 'drop') {
        actor.clip='drop'; const card=new Sprite(this.textures.packet);card.width=48;card.height=68;card.anchor.set(.5);
        actor.root.addChildAt(card,0);actor.art.texture=this.textures[drop.kind];actor.art.anchor.set(.5);
        const ratio=Math.min(38/actor.art.width,48/actor.art.height);actor.art.scale.set(ratio);
      }
      actor.root.position.set(cellX(drop.column),game.rowY(drop.row)-40);
      actor.root.alpha=drop.id===game.selectedDrop ? .5 : drop.remaining<300 ? .5+Math.abs(Math.sin(this.time/10))*.5 : 1;
      actor.art.tint=drop.id===game.selectedDrop?0xd3ff7b:0xffffff;
    }
    for (const grave of game.graves) {
      const actor = this.actor(`g${grave.id}`, grave.row * 100 + 5);
      if (actor.clip !== 'grave') { actor.clip = 'grave'; actor.art.texture = this.textures.grave; actor.art.anchor.set(.5, 1); }
      actor.root.position.set(cellX(grave.column), game.rowY(grave.row));
    }
    for (const crater of game.craters) {
      const actor=this.actor(`c${crater.id}`,crater.row*100+4);
      if(actor.clip!=='crater') {actor.clip='crater';actor.art.texture=this.textures.crater;actor.art.anchor.set(.5,.7);}
      actor.root.position.set(cellX(crater.column),game.rowY(crater.row));
      actor.root.alpha=crater.remaining<9000?.6:1;
    }
    const kelpTargets = new Map(game.plants.filter(p => p.kelp).map(p => [p.kelp!.target, p.kelp!]));
    for (const plant of game.plants) {
      const sleeping = game.sleeping(plant);
      const key = `p${plant.id}`; const actor = this.actor(key, plant.row * 100 + (['lilypad','flowerpot'].includes(plant.kind) ? 7 : plant.kind==='pumpkin'?18:plant.kind==='coffeebean'?19:10));
      const clip = hasPlantMotion(plant.kind) ? plant.kind : plant.kind==='umbrella'&&game.ticks-plant.shotAt<65?'umbrella-block':plant.kind==='magnetshroom' && game.ticks-plant.shotAt<50 ? `${plant.kind}-attack` : plant.kind==='pumpkin'&&plant.health<1334?'pumpkin-cracked2':plant.kind==='pumpkin'&&plant.health<2667?'pumpkin-cracked1':plant.kind==='garlic'&&plant.health<134?'garlic-cracked2':plant.kind==='garlic'&&plant.health<267?'garlic-cracked1': plant.kind === 'cactus' && plant.tall ? 'cactus-tall' : plant.kind === 'blover' && game.ticks-plant.born>50 ? 'blover-loop' : plant.kind === 'tallnut' && plant.health<2667 ? 'tallnut-cracked2' : plant.kind === 'tallnut' && plant.health<5334 ? 'tallnut-cracked1' : plant.kind === 'tanglekelp' && plant.kelp ? 'tanglekelp-grab' : plant.kind === 'squash' && plant.squash && plant.squash.remaining <= 60 ? 'squash-attack' : plant.kind === 'scaredyshroom' && plant.scared ? 'scaredyshroom-scared' : plant.kind === 'sunshroom' && game.ticks - plant.born >= 12000 ? 'sunshroom-big'
        : plant.kind === 'fumeshroom' && game.ticks - plant.shotAt < 35 ? 'fumeshroom-attack'
        : plant.kind === 'chomper' ? plant.chomp!.phase === 'digest' ? 'chomper-digest' : plant.chomp!.phase === 'ready' ? 'chomper' : 'chomper-bite'
        : plant.kind === 'potatomine' && plant.actionIn > 0 ? 'potatomine-unarmed' : plant.kind === 'wallnut' && plant.health < 1334 ? 'wallnut-cracked2'
        : plant.kind === 'wallnut' && plant.health < 2667 ? 'wallnut-cracked1' : plant.kind;
      this.animate(actor, clip, plant.kind !== 'cherrybomb' && clip !== 'chomper-bite' && clip !== 'umbrella-block', sleeping ? 0 : this.time, clip === 'chomper-bite' ? this.clipDuration(clip) / 70 : clip==='umbrella-block'?this.clipDuration(clip)/65:1, (plant.kind==='wintermelon' && plant.winterLaunchIn!==undefined || ['cabbagepult','kernelpult','melonpult'].includes(plant.kind)) && !sleeping ? game.ticks+(game.phase==='playing'?alpha:0)-plant.shotAt : undefined);
      actor.root.position.set(cellX(plant.column), game.rowY(plant.row,cellX(plant.column)));
      if(game.config.environment==='roof'&&plant.kind!=='flowerpot')actor.root.y-=12;
      (actor.nativeRig?.root ?? actor.rig?.root ?? actor.art).tint=sleeping?0xa3a1be:0xffffff;
      if (sleeping) {
        const sleep=this.actor(`sleep${plant.id}`,plant.row*100+15);
        if(sleep.clip!=='sleep'){sleep.clip='sleep';const label=new Text({text:'Zzz',style:{fontSize:16,fill:0xc6d9ff}});sleep.root.addChild(label);}
        sleep.root.position.set(cellX(plant.column)+15,game.rowY(plant.row,cellX(plant.column))-70);
      }
      if (plant.squash && plant.squash.remaining <= 60) {
        const progress=(60-plant.squash.remaining)/60;
        actor.root.x=cellX(plant.column)+(plant.squash.x-cellX(plant.column))*Math.min(1,progress*2);
        actor.root.y-=Math.sin(progress*Math.PI)*120;
      }
    }
    for (const zombie of game.zombies) {
      const key = `z${zombie.id}`; const actor = this.actor(key, zombie.row * 100 + 20);
      const swimming = game.waterRow(zombie.row) && zombie.x < 780 && zombie.x > 90;
      const type = zombie.kind === 'snorkel' ? 'snorkel' : swimming ? `ducky${zombie.armor>0?(zombie.kind==='bucket'?3:2):1}` : zombie.kind === 'ducky' ? 'zombie' : zombie.kind === 'dancer' || zombie.kind === 'backup' ? zombie.kind : zombie.kind === 'football' ? zombie.armor > 0 ? 'football' : 'football-bare' : zombie.kind === 'newspaper' ? zombie.shield > 0 ? 'newspaper' : 'newspaper-mad'
        : zombie.kind === 'door' && zombie.shield > 0 ? 'door' : zombie.kind === 'pole' ? 'pole' : (zombie.kind === 'cone' || zombie.kind === 'bucket') && zombie.armor > 0 ? zombie.kind : zombie.kind === 'flag' ? 'flag' : 'zombie';
      const clip = zombie.giant?`gargantuar-${zombie.giant.thrown&&zombie.giant.phase!=='throw'?'bare-':''}${zombie.giant.phase}`:zombie.catapult?`catapult-${zombie.catapult.phase==='reload'?'idle':zombie.catapult.phase}`:zombie.kind==='imp'?`imp-${zombie.flight?'thrown':zombie.landingIn?'land':zombie.eating?'eat':'walk'}`:zombie.kind==='digger'?`digger-${zombie.underground?'dig':zombie.emergingIn?'rise':zombie.eating?'eat':'walk'}`
        :zombie.kind==='pogo'?`pogo-${zombie.pogo?'bounce':zombie.eating?'eat':'walk'}`
        :zombie.kind==='bungee'?`bungee-${zombie.bungee?.phase==='down'?'drop':'idle'}`
        :zombie.kind==='ladder'?`ladder-${zombie.ladderIn?'place':zombie.shield<=0?'bare':zombie.eating?'eat':'walk'}`
        : zombie.kind === 'zomboni' ? zombie.health<450 ? 'zomboni-critical' : zombie.health<900 ? 'zomboni-damaged' : 'zomboni-walk'
        : zombie.kind === 'bobsled' ? `bobsled-${zombie.eating?'eat':'walk'}`
        : zombie.kind === 'dolphin' ? zombie.vaultIn>0 ? 'dolphin-jump' : zombie.eating ? 'dolphin-eat' : swimming ? zombie.dolphin ? 'dolphin-ride' : 'dolphin-swim' : 'dolphin-walk'
        : zombie.kind === 'jack' ? zombie.jackOpening ? 'jack-open' : headless(zombie) ? 'jack-headless' : `jack-${zombie.eating?'eat':'walk'}`
        : zombie.kind === 'balloon' ? zombie.flying ? 'balloon-fly' : zombie.popIn ? 'balloon-pop' : `balloon-${zombie.eating?'eat':'walk'}`
        : zombie.kind === 'snorkel' ? game.submerged(zombie) ? 'snorkel-swim' : `snorkel-${zombie.eating?'eat':'walk'}`
        : zombie.kind === 'dancer' && (zombie.dancePhase==='point'||zombie.dancePhase==='hold') ? 'dancer-summon'
        : swimming ? `${type}-${zombie.eating?'eat':'walk'}` : headless(zombie) ? (zombie.kind === 'dancer' || zombie.kind === 'backup' ? `${zombie.kind}-headless` : zombie.kind === 'football' ? 'football-headless' : zombie.kind === 'newspaper' ? 'newspaper-headless' : zombie.kind === 'pole' ? 'pole-headless' : 'zombie-headless')
        : zombie.rageIn > 0 ? 'newspaper-gasp' : zombie.vaultIn > 52 ? 'pole-jump' : zombie.vaultIn > 0 ? 'pole-land'
        : zombie.hasPole ? 'pole-run' : `${type}-${zombie.eating ? 'eat' : 'walk'}`;
      const walking = zombie.kind !== 'zomboni' && zombie.kind !== 'catapult' && !zombie.sled && (clip.endsWith('-walk') || clip.endsWith('-headless') || clip === 'pole-run');
      const rate = zombie.giant&&zombie.giant.phase!=='walk'?this.clipDuration(clip)/(zombie.giant.phase==='smash'?134:138):zombie.catapult?.phase==='shoot'?this.clipDuration(clip)/129:zombie.catapult?.phase==='walk'?.55:zombie.catapult?.phase==='reload'?1.2:clip === 'newspaper-gasp' ? this.clipDuration(clip) / 150 : walking ? this.clipDuration(clip) / walkingCycleTicks(zombie) : 1;
      this.animate(actor, clip, !zombie.popIn && !zombie.jackOpening && zombie.vaultIn === 0 && zombie.rageIn === 0 && (!zombie.giant||zombie.giant.phase==='walk') && zombie.catapult?.phase!=='shoot' && !zombie.flight && !zombie.landingIn, zombie.animationTime + alpha * (zombie.frozenIn !== undefined && zombie.frozenIn > 0 ? 0 : zombie.chillIn > 0 ? .4 : 1), rate);
      this.move(actor, zombie, game.rowY(zombie.row,zombie.x) + 1, alpha);
      if(zombie.flight){const f=zombie.flight;actor.root.y-=Math.sin((1-f.remaining/f.duration)*Math.PI)*110+f.remaining/f.duration*88;}
      if(zombie.pogo)actor.root.y-=Math.abs(Math.sin(zombie.animationTime/80*Math.PI))*45;
      if(zombie.bungee){const b=zombie.bungee;actor.root.y-=b.phase==='down'?b.remaining*8:b.phase==='up'?(100-b.remaining)*8:0;const target=this.actor(`target${zombie.id}`,zombie.row*100+8);target.art.texture=this.textures.bungeeTarget;target.art.anchor.set(.5);target.root.position.set(zombie.x,game.rowY(zombie.row,zombie.x)-15);const rope=this.actor(`rope${zombie.id}`,zombie.row*100+19);rope.art.texture=this.textures.bungeeCord;rope.art.anchor.set(.5,1);rope.art.width=5;rope.art.height=Math.max(1,actor.root.y-80);rope.root.position.set(zombie.x,actor.root.y-80);}
      if (zombie.kind === 'dolphin' && zombie.vaultIn>0) actor.root.y-=Math.sin(zombie.vaultIn/120*Math.PI)*55;
      if (zombie.sled && !zombie.sledLeader) {
        const sled=this.actor(`sled${zombie.id}`,zombie.row*100+23);sled.art.texture=this.textures.sled;sled.art.anchor.set(.2,1);
        sled.root.position.set(actor.root.x,game.rowY(zombie.row,zombie.x)+10);sled.art.width=245;sled.art.height=80;
      }
      actor.root.scale.x = (zombie.hypnotized || zombie.backwards ? -1 : 1) * (zombie.mini ? .5 : 1);
      actor.root.alpha = zombie.riseIn > 50 ? 0 : 1;
      actor.root.scale.y = (zombie.riseIn > 0 ? Math.max(.01, 1 - zombie.riseIn / 50) : 1) * (zombie.mini ? .5 : 1);
      if (this.showZombieHealth) {
        if (!actor.healthBar) { actor.healthBar = new ZombieHealthBar(); actor.root.addChild(actor.healthBar.root); }
        actor.healthBar.root.visible = true;
        actor.healthBar.root.y = actor.nativeRig ? actor.nativeRig.healthTop(clip) : actor.giantRig ? -170 : -actor.art.height * actor.art.anchor.y - 10;
        actor.healthBar.update(zombie);
      } else if (actor.healthBar) actor.healthBar.root.visible = false;
      const kelp = kelpTargets.get(zombie.id);
      if (kelp && kelp.remaining <= 50) { actor.root.y += 50 - kelp.remaining; actor.root.alpha = (kelp.remaining - 1) / 50; }
      if(zombie.underground)actor.root.alpha=.55;
      (actor.nativeRig?.root ?? actor.giantRig?.root ?? actor.art).tint = zombie.butterIn ? 0xffdc63 : game.ticks - zombie.hitAt < 8 ? 0xe4ff9b : zombie.hypnotized ? 0xd28cff : zombie.chillIn > 0 ? 0x87c7ff : 0xffffff;
    }
    for(const l of game.ladders){const actor=this.actor(`ladder${l.column}-${l.row}`,l.row*100+24);actor.art.texture=this.textures.ladder;actor.art.anchor.set(.5,1);actor.art.width=65;actor.art.height=115;actor.root.position.set(cellX(l.column)+20,game.rowY(l.row,cellX(l.column)));}
    for (const pea of game.peas) {
      const key = `b${pea.id}`; const actor = this.actor(key, pea.row * 100 + 30);
      const kind = pea.lob ? pea.lob.kind : pea.star?'star': pea.spike ? 'spike' : pea.puff ? 'puff' : pea.ice ? 'ice' : pea.fire ? 'fire' : 'pea';
      if (actor.clip !== kind) { actor.clip = kind; actor.art.texture = pea.lob?this.textures[pea.lob.kind]:pea.star?this.textures.star:pea.spike ? this.textures.spike : pea.puff ? this.textures.puff : pea.ice ? this.textures.ice : this.textures.pea; actor.art.anchor.set(.5); actor.art.width = (pea.lob?.kind==='melon'||pea.lob?.kind==='wintermelon')?38:pea.lob?25:pea.star?28:pea.spike?26:19; actor.art.height = (pea.lob?.kind==='melon'||pea.lob?.kind==='wintermelon')?38:pea.lob?25:pea.star?28:pea.spike?8:19;actor.art.tint=pea.fire?0xff7925:0xffffff; }
      this.move(actor, pea, pea.y!==undefined?pea.y:pea.originY!==undefined?pea.originY-(pea.high?72:0):game.rowY(pea.row) - (pea.high ? 115 : 43), alpha);
    }
    for (const nut of game.rollers) {
      const actor = this.actor(`r${nut.id}`, nut.row * 100 + 28);
      actor.root.zIndex = nut.row * 100 + 28;
      this.animate(actor, nut.kind === 'wallnut' ? 'wallnut-roll' : 'explodenut');
      this.move(actor, nut, nut.y, alpha);
    }
    for(const coin of game.coins){
      const actor=this.actor(`coin${coin.id}`,700);actor.art.texture=coin.value===50?this.textures.coinGold:this.textures.coinSilver;
      actor.art.anchor.set(.5);actor.art.width=30;actor.art.height=30;this.move(actor,coin,coin.y,alpha);
      actor.root.alpha=coin.expiresIn<150?.45+Math.abs(Math.sin(game.ticks/10))*.55:1;
    }
    for (const sun of game.suns) {
      const key = `s${sun.id}`; const actor = this.actor(key, 700);
      this.animate(actor, 'sun'); actor.root.scale.set(sun.value === 15 ? .4 : .8);
      this.move(actor, sun, sun.y, alpha);
      actor.root.alpha = sun.expiresIn < 150 ? .45 + Math.abs(Math.sin(game.ticks / 10)) * .55 : 1;
    }
    for (const mower of game.mowers) {
      if (mower.state === 'spent') continue;
      const key = `m${mower.row}`; const actor = this.actor(key, mower.row * 100 + 25);
      if (actor.clip !== 'mower') { actor.clip = 'mower'; actor.art.texture = game.waterRow(mower.row) ? this.textures.poolCleaner : this.textures.mower; actor.art.anchor.set(.5, 1); }
      this.move(actor, mower, game.rowY(mower.row) + 5, alpha);
    }
    for (const [key, actor] of this.actors) if (actor.seen !== this.stamp) {
      if (key.startsWith('z')) {
        if (actor.healthBar) actor.healthBar.root.visible = false;
        const burned = this.explosions.some(e => Math.abs(e.x - actor.root.x) <= 115 && Math.abs(e.y + 35 - actor.root.y) <= 101);
        const special = ['dancer','backup','snorkel','zomboni','bobsled','dolphin','jack','balloon','digger','pogo','bungee','ladder','catapult','gargantuar','imp'].find(name=>actor.clip.startsWith(`${name}-`));
        const clip = special && ['zomboni','bobsled','dolphin','jack','balloon','digger','pogo','bungee','ladder','catapult','gargantuar','imp'].includes(special) ? `${special}${special==='gargantuar'&&actor.clip.includes('-bare-')?'-bare':''}-die` : actor.clip.startsWith('ducky') && !burned ? 'ducky-die' : special && (special!=='snorkel'||!burned) ? `${special}-${burned?'burn':'die'}` : `${actor.clip.startsWith('football-') && !burned ? 'football' : actor.clip.startsWith('newspaper-') ? 'newspaper' : actor.clip.startsWith('pole-') ? 'pole' : 'zombie'}-${burned ? 'burn' : 'die'}`;
        this.animate(actor, clip, false); (actor.nativeRig?.root ?? actor.giantRig?.root ?? actor.art).tint = 0xffffff;
        this.effects.push({ node: actor.root, actor, born: this.time, duration: this.clipDuration(clip) });
      } else actor.root.destroy({ children: true });
      this.actors.delete(key);
    }
    this.explosions = [];
    let healthKey = '';
    for (const plant of game.plants) if (plant.health < PLANTS[plant.kind].health) healthKey += `${plant.id}:${plant.health};`;
    if (healthKey !== this.healthKey) {
      this.healthKey = healthKey; this.health.clear();
      for (const plant of game.plants) if (plant.health < PLANTS[plant.kind].health) {
        this.health.rect(cellX(plant.column) - 20, game.rowY(plant.row,cellX(plant.column)) + 4, 40, 5).fill({ color: 0x2c3927, alpha: .7 });
        this.health.rect(cellX(plant.column) - 19, game.rowY(plant.row,cellX(plant.column)) + 5, 38 * plant.health / PLANTS[plant.kind].health, 3).fill(0xb7e458);
      }
    }
    let hoverKey = '';
    if ((game.selected || game.digging) && game.phase === 'playing' && this.pointer) {
      const column = Math.floor((this.pointer.x - BOARD.left) / 80); const row = game.rowAt(this.pointer.y,this.pointer.x);
      if (column >= 0 && column < 9 && game.config.rows.includes(row)) {
        const color = (game.digging || game.canPlant(game.selected!, column, row)) ? 0xfcf4bb : 0xe46647;
        hoverKey = `${column}:${row}:${color}`;
        if (hoverKey !== this.hoverKey) {
          this.hover.clear().rect(BOARD.left + column * 80 + 2, BOARD.top + row * game.cellHeight + game.slope(cellX(column)) + (game.config.environment==='roof'?-10:0) + 2, 76, game.cellHeight - 4).fill({ color, alpha: .2 });
        }
      }
    }
    if (!hoverKey && this.hoverKey) this.hover.clear();
    this.hoverKey = hoverKey;
    if(game.config.environment==='fog'&&game.level!==40) {
      this.fog.visible = game.fogBlownIn === 0;
      const lamps=game.plants.filter(p=>p.kind==='plantern'&&p.health>0);
      const key='fog:'+lamps.map(p=>p.id).join(',');
      if(key!==this.fogKey) {
        this.fogKey=key;this.fog.removeChildren().forEach(child=>child.destroy());
        const left=game.scenario==='adventure'?(game.level===31?6:game.level>=37?4:5):5;
        for(let column=left;column<=9;column++)for(let row=0;row<=6;row++) {
          const lit=lamps.some(p=>{const dx=Math.abs(column-p.column),dy=Math.abs(row-p.row);return dx<=3&&dy<=2&&dx+dy!==5;});
          if(!lit){const cloud=new Sprite(this.fogFrames[(column*3+row)%8]);cloud.position.set(column*80-15,row*85+20);cloud.alpha=column===5?.78:1;this.fog.addChild(cloud);}
        }
      }
    }
    this.weather.clear();
    if(game.scenario==='adventure'&&game.level===40){
      this.fog.visible=false;
      const flash=game.stormIn<150?1-game.stormIn/150:0;
      this.weather.rect(0,80,800,520).fill({color:0x05091a,alpha:.92*(1-flash)});
      for(let i=0;i<35;i++){const x=(i*139+game.ticks*1.2)%850,y=80+(i*73+game.ticks*6)%520;this.weather.moveTo(x,y).lineTo(x-8,y+22);}
      this.weather.stroke({color:0xa9c8de,alpha:.3,width:1});
    }
    this.effects = this.effects.filter(effect => {
      const age = this.time - effect.born;
      if (effect.actor) this.animate(effect.actor, effect.actor.clip, false);
      else effect.node.alpha = 1 - age / effect.duration;
      if (age >= effect.duration) { effect.node.destroy({ children: true }); return false; }
      return true;
    });
  }
}
