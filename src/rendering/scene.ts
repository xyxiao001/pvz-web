import { Application, Assets, Container, Graphics, Rectangle, Sprite, Text, Texture } from 'pixi.js';
import { BOARD, cellX, PLANTS } from '../game/config';
import { headless, type Game, type GameEvent } from '../game/model';
import { walkingCycleTicks } from '../game/zombie-motion';

type ClipData = { frames: number[][]; durations: number[]; anchor: number[] };
type Clip = { frames: Texture[]; ends: number[]; duration: number; offsets: number[][]; anchor: number[] };
type Actor = { root: Container; art: Sprite; clip: string; since: number; frame: number; seen: number; previousX: number; previousY: number; motion?: { x: number; y?: number } };
type Effect = { node: Container; born: number; duration: number; actor?: Actor };

export class Scene {
  readonly app = new Application();
  private world = new Container();
  private actors = new Map<string, Actor>();
  private effects: Effect[] = [];
  private textures!: Record<string, Texture>;
  private clips: Record<string, Clip> = {};
  private hover = new Graphics();
  private health = new Graphics();
  private fog = new Container();
  private fogFrames: Texture[] = [];
  private fogKey = '';
  private pointer: { x: number; y: number } | null = null;
  private time = 0;
  private stamp = 0;
  private healthKey = '';
  private hoverKey = '';
  private lawnTextures: Texture[] = [];
  private explosions: { x: number; y: number }[] = [];

  async init(host: HTMLElement) {
    await this.app.init({ width: BOARD.width, height: BOARD.height, backgroundAlpha: 0, antialias: true,
      resolution: window.devicePixelRatio, autoDensity: true });
    host.appendChild(this.app.canvas);
    this.app.canvas.style.width = '100%';
    this.app.canvas.style.height = '100%';
    this.app.canvas.setAttribute('aria-label', '庭院战场。先选植物，再点击草地种植；点击阳光收集。');
    // Keep the 800×600 world; render enough physical pixels for its displayed size.
    new ResizeObserver(([entry]) => {
      this.app.renderer.resize(BOARD.width, BOARD.height, entry.contentRect.width / BOARD.width * window.devicePixelRatio);
      this.app.canvas.style.width = '100%'; this.app.canvas.style.height = '100%';
      this.app.render();
    }).observe(host);
    const base = `${import.meta.env.BASE_URL}assets/hd/`;
    const files = { yard: 'yard.png', lawn: 'lawn.png', mower: 'original/mower.png', pea: 'pea.png', ice: 'original/snow-pea.png', stripe: 'original/bowling-stripe.png', night: 'original/night.png', grave: 'original/grave.png', puff: 'original/puff.png', hammer: 'original/hammer.png', pool: 'original/pool.png', fog: 'original/fog.png', poolCleaner: 'original/pool-cleaner.png', crater: 'original/crater.png', fogCloud:'original/fog-cloud.png' };
    this.textures = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, file]) => [key, await Assets.load<Texture>({ src: base + file, data: { resolution: 2 } })])));
    const data: { pages: number; animations: Record<string, ClipData> } = await (await fetch(base + 'original/animations.json')).json();
    const pages = await Promise.all(Array.from({ length: data.pages }, (_, i) => Assets.load<Texture>({ src: `${base}original/actors-${i}.png`, data: { resolution: 2 } })));
    for (const [key, clip] of Object.entries(data.animations)) {
      let duration = 0;
      this.clips[key] = { anchor: clip.anchor, ends: clip.durations.map(ticks => duration += ticks), duration,
        offsets: clip.frames.map(frame => [frame[5], frame[6]]),
        frames: clip.frames.map(([page, x, y, w, h]) => new Texture({ source: pages[page].source, frame: new Rectangle(x, y, w, h) })) };
    }
    this.fogFrames=Array.from({length:8},(_,i)=>new Texture({source:this.textures.fogCloud.source,frame:new Rectangle(i*210,0,210,190)}));
    this.lawnTextures = Array.from({ length: 5 }, (_, row) => new Texture({ source: this.textures.lawn.source,
      frame: new Rectangle(220, BOARD.top + row * 100, 800, 100) }));
    this.world.sortableChildren = true;
  }

  setLevel(game: Game) {
    for (const child of this.app.stage.removeChildren()) {
      if (child !== this.world && child !== this.hover && child !== this.health && child !== this.fog) child.destroy({ children: true });
    }
    for (const actor of this.actors.values()) actor.root.destroy({ children: true });
    for (const effect of this.effects) effect.node.destroy({ children: true });
    this.actors.clear(); this.effects = []; this.explosions = []; this.time = 0; this.healthKey = ''; this.hoverKey = '';
    this.hover.clear(); this.health.clear(); this.fog.removeChildren().forEach(child=>child.destroy()); this.fogKey = '';
    const yard = new Sprite(game.config.environment === 'day' ? this.textures.yard : this.textures[game.config.environment]); yard.x = -220;
    this.app.stage.addChild(yard);
    for (const row of game.config.environment === 'day' ? game.config.rows : []) {
      const lawn = new Sprite(this.lawnTextures[row]);
      lawn.y = BOARD.top + row * 100; this.app.stage.addChild(lawn);
    }
    if (game.config.mode === 'bowling') { const stripe = new Sprite(this.textures.stripe); stripe.position.set(268, 77); this.app.stage.addChild(stripe); }
    this.app.stage.addChild(this.hover, this.world, this.health, this.fog); this.pointer = null;
  }

  setPointer(pointer: { x: number; y: number } | null) { this.pointer = pointer; }

  private animate(actor: Actor, clipName: string, loop = true, timeline = this.time, rate = 1) {
    if (actor.clip !== clipName) {
      actor.clip = clipName; actor.since = timeline; actor.frame = -1;
      // Spread idle plants across the cycle; do not synchronize every newly planted row.
      if (loop && ['peashooter', 'sunflower', 'wallnut', 'snowpea', 'potatomine', 'chomper', 'repeater', 'puffshroom', 'sunshroom', 'sunshroom-big', 'fumeshroom', 'hypnoshroom', 'scaredyshroom', 'iceshroom','doomshroom','lilypad','squash','threepeater','plantern'].includes(clipName)) actor.since -= actor.root.uid * 17 % this.clips[clipName].duration;
    }
    const clip = this.clips[clipName];
    const elapsed = (timeline - actor.since) * rate;
    const position = loop ? elapsed % clip.duration : Math.min(elapsed, clip.duration - .001);
    const frame = clip.ends.findIndex(end => position < end);
    if (actor.frame === frame) return;
    actor.frame = frame;
    actor.art.texture = clip.frames[frame];
    actor.art.anchor.set((clip.anchor[0] - clip.offsets[frame][0]) / actor.art.texture.width, (clip.anchor[1] - clip.offsets[frame][1]) / actor.art.texture.height);
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
    if (event.kind === 'sun') {
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
    for (const plant of game.plants) {
      const key = `p${plant.id}`; const actor = this.actor(key, plant.row * 100 + (plant.kind === 'lilypad' ? 7 : 10));
      const clip = plant.kind === 'tanglekelp' && plant.kelp ? 'tanglekelp-grab' : plant.kind === 'squash' && plant.squash && plant.squash.remaining <= 60 ? 'squash-attack' : plant.kind === 'scaredyshroom' && plant.scared ? 'scaredyshroom-scared' : plant.kind === 'sunshroom' && game.ticks - plant.born >= 12000 ? 'sunshroom-big'
        : plant.kind === 'fumeshroom' && game.ticks - plant.shotAt < 35 ? 'fumeshroom-attack'
        : plant.kind === 'chomper' ? plant.chomp!.phase === 'digest' ? 'chomper-digest' : plant.chomp!.phase === 'ready' ? 'chomper' : 'chomper-bite'
        : plant.kind === 'potatomine' && plant.actionIn > 0 ? 'potatomine-unarmed' : plant.kind === 'wallnut' && plant.health < 1334 ? 'wallnut-cracked2'
        : plant.kind === 'wallnut' && plant.health < 2667 ? 'wallnut-cracked1' : plant.kind;
      this.animate(actor, clip, plant.kind !== 'cherrybomb' && clip !== 'chomper-bite', game.sleeping(plant) ? 0 : this.time, clip === 'chomper-bite' ? this.clips[clip].duration / 70 : 1);
      actor.root.position.set(cellX(plant.column), game.rowY(plant.row));
      actor.art.tint=game.sleeping(plant)?0xa3a1be:0xffffff;
      if (game.sleeping(plant)) {
        const sleep=this.actor(`sleep${plant.id}`,plant.row*100+15);
        if(sleep.clip!=='sleep'){sleep.clip='sleep';const label=new Text({text:'Zzz',style:{fontSize:16,fill:0xc6d9ff}});sleep.root.addChild(label);}
        sleep.root.position.set(cellX(plant.column)+15,game.rowY(plant.row)-70);
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
      const clip = zombie.kind === 'snorkel' ? game.submerged(zombie) ? 'snorkel-swim' : `snorkel-${zombie.eating?'eat':'walk'}`
        : zombie.kind === 'dancer' && (zombie.dancePhase==='point'||zombie.dancePhase==='hold') ? 'dancer-summon'
        : swimming ? `${type}-${zombie.eating?'eat':'walk'}` : headless(zombie) ? (zombie.kind === 'dancer' || zombie.kind === 'backup' ? `${zombie.kind}-headless` : zombie.kind === 'football' ? 'football-headless' : zombie.kind === 'newspaper' ? 'newspaper-headless' : zombie.kind === 'pole' ? 'pole-headless' : 'zombie-headless')
        : zombie.rageIn > 0 ? 'newspaper-gasp' : zombie.vaultIn > 52 ? 'pole-jump' : zombie.vaultIn > 0 ? 'pole-land'
        : zombie.hasPole ? 'pole-run' : `${type}-${zombie.eating ? 'eat' : 'walk'}`;
      const walking = clip.endsWith('-walk') || clip.endsWith('-headless') || clip === 'pole-run';
      const rate = clip === 'newspaper-gasp' ? this.clips[clip].duration / 150 : walking ? this.clips[clip].duration / walkingCycleTicks(zombie) : 1;
      this.animate(actor, clip, zombie.vaultIn === 0 && zombie.rageIn === 0, zombie.animationTime + alpha * (zombie.frozenIn !== undefined && zombie.frozenIn > 0 ? 0 : zombie.chillIn > 0 ? .4 : 1), rate);
      this.move(actor, zombie, game.rowY(zombie.row) + 1, alpha);
      actor.root.scale.x = (zombie.hypnotized ? -1 : 1) * (zombie.mini ? .5 : 1);
      actor.root.alpha = zombie.riseIn > 50 ? 0 : 1;
      actor.root.scale.y = (zombie.riseIn > 0 ? Math.max(.01, 1 - zombie.riseIn / 50) : 1) * (zombie.mini ? .5 : 1);
      const kelp = game.plants.find(p => p.kelp?.target === zombie.id)?.kelp;
      if (kelp && kelp.remaining <= 50) { actor.root.y += 50 - kelp.remaining; actor.root.alpha = (kelp.remaining - 1) / 50; }
      actor.art.tint = game.ticks - zombie.hitAt < 8 ? 0xe4ff9b : zombie.hypnotized ? 0xd28cff : zombie.chillIn > 0 ? 0x87c7ff : 0xffffff;
    }
    for (const pea of game.peas) {
      const key = `b${pea.id}`; const actor = this.actor(key, pea.row * 100 + 30);
      if (actor.clip !== 'pea') { actor.clip = 'pea'; actor.art.texture = pea.puff ? this.textures.puff : pea.ice ? this.textures.ice : this.textures.pea; actor.art.anchor.set(.5); actor.art.width = 19; actor.art.height = 19; }
      this.move(actor, pea, game.rowY(pea.row) - 43, alpha);
    }
    for (const nut of game.rollers) {
      const actor = this.actor(`r${nut.id}`, nut.row * 100 + 28);
      actor.root.zIndex = nut.row * 100 + 28;
      this.animate(actor, nut.kind === 'wallnut' ? 'wallnut-roll' : 'explodenut');
      this.move(actor, nut, nut.y, alpha);
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
        const burned = this.explosions.some(e => Math.abs(e.x - actor.root.x) <= 115 && Math.abs(e.y + 35 - actor.root.y) <= 101);
        const special = ['dancer','backup','snorkel'].find(name=>actor.clip.startsWith(`${name}-`));
        const clip = actor.clip.startsWith('ducky') && !burned ? 'ducky-die' : special && (special!=='snorkel'||!burned) ? `${special}-${burned?'burn':'die'}` : `${actor.clip.startsWith('football-') && !burned ? 'football' : actor.clip.startsWith('newspaper-') ? 'newspaper' : actor.clip.startsWith('pole-') ? 'pole' : 'zombie'}-${burned ? 'burn' : 'die'}`;
        this.animate(actor, clip, false); actor.art.tint = 0xffffff;
        this.effects.push({ node: actor.root, actor, born: this.time, duration: this.clips[clip].duration });
      } else actor.root.destroy({ children: true });
      this.actors.delete(key);
    }
    this.explosions = [];
    let healthKey = '';
    for (const plant of game.plants) if (plant.health < PLANTS[plant.kind].health) healthKey += `${plant.id}:${plant.health};`;
    if (healthKey !== this.healthKey) {
      this.healthKey = healthKey; this.health.clear();
      for (const plant of game.plants) if (plant.health < PLANTS[plant.kind].health) {
        this.health.rect(cellX(plant.column) - 20, game.rowY(plant.row) + 4, 40, 5).fill({ color: 0x2c3927, alpha: .7 });
        this.health.rect(cellX(plant.column) - 19, game.rowY(plant.row) + 5, 38 * plant.health / PLANTS[plant.kind].health, 3).fill(0xb7e458);
      }
    }
    let hoverKey = '';
    if ((game.selected || game.digging) && game.phase === 'playing' && this.pointer) {
      const column = Math.floor((this.pointer.x - BOARD.left) / 80); const row = game.rowAt(this.pointer.y);
      if (column >= 0 && column < 9 && game.config.rows.includes(row)) {
        const color = (game.digging || game.canPlant(game.selected!, column, row)) ? 0xfcf4bb : 0xe46647;
        hoverKey = `${column}:${row}:${color}`;
        if (hoverKey !== this.hoverKey) {
          this.hover.clear().rect(BOARD.left + column * 80 + 2, BOARD.top + row * game.cellHeight + 2, 76, game.cellHeight - 4).fill({ color, alpha: .2 });
        }
      }
    }
    if (!hoverKey && this.hoverKey) this.hover.clear();
    this.hoverKey = hoverKey;
    if(game.config.environment==='fog') {
      const lamps=game.plants.filter(p=>p.kind==='plantern'&&p.health>0);
      const key='fog:'+lamps.map(p=>p.id).join(',');
      if(key!==this.fogKey) {
        this.fogKey=key;this.fog.removeChildren().forEach(child=>child.destroy());
        for(let column=5;column<=9;column++)for(let row=0;row<=6;row++) {
          const lit=lamps.some(p=>{const dx=Math.abs(column-p.column),dy=Math.abs(row-p.row);return dx<=3&&dy<=2&&dx+dy!==5;});
          if(!lit){const cloud=new Sprite(this.fogFrames[(column*3+row)%8]);cloud.position.set(column*80-15,row*85+20);cloud.alpha=column===5?.78:1;this.fog.addChild(cloud);}
        }
      }
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
