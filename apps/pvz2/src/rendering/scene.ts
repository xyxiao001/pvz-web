import 'pixi.js/prepare';
import { Application, Assets, Container, Graphics, Sprite, Texture, type Ticker } from 'pixi.js';
import { PixiFactory, type PixiArmatureDisplay } from 'pixi-dragonbones-runtime';
import { assetUrl, json, loadInBatches } from '../assets/load';
import { BOARD, cellX, rowY, type AnimationTiming, type PlantKind } from '../game/level';
import type { Game, Plant } from '../game/model';

type RigName = PlantKind | 'mummy' | 'ra';
const RIGS: Record<RigName, { armature: string; idle: string; scale: number }> = {
  peashooter: { armature: 'Peashooter', idle: 'Idle', scale: .56 },
  sunflower: { armature: 'Sunflower', idle: 'Idle', scale: .55 },
  wallnut: { armature: 'Wall-nut', idle: 'Idle1', scale: .55 },
  potatomine: { armature: 'PotatoMine', idle: 'Idle_Baby', scale: .58 },
  mummy: { armature: 'EgyptBasicZombie', idle: 'Walk', scale: .51 },
  ra: { armature: 'RaZombie', idle: 'Walk', scale: .51 },
};
interface Skeleton { armature: { name: string; frameRate: number; animation: { name: string; duration: number; frame?: { duration?: number; events?: { name: string }[] }[] }[] }[] }
interface Actor { root: Container; rig: PixiArmatureDisplay; animation: string; actionAt: number; armor?: PixiArmatureDisplay; dying: number }

export class Scene {
  readonly app = new Application();
  timing!: AnimationTiming;
  onTick: (dt: number) => void = () => {};
  onPoint: (x: number, y: number) => void = () => {};
  onHover: (x: number, y: number) => void = () => {};
  private factory = new PixiFactory(null, false);
  private actors = new Map<number, Actor>();
  private world = new Container();
  private actorLayer = new Container();
  private effects = new Graphics();
  private highlight = new Graphics();
  private observer!: ResizeObserver;
  private scale = 1;
  private tick = (ticker: Ticker) => this.onTick(ticker.deltaMS / 1000);

  async init(host: HTMLElement, progress: (done: number, total: number) => void) {
    await this.app.init({ width: BOARD.width, height: BOARD.height, background: '#b5924c', antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2), autoDensity: true, autoStart: false });
    host.append(this.app.canvas);
    this.app.canvas.setAttribute('aria-label', '神秘埃及战场，五行九列。选择植物后点击地块种植。');
    this.app.stage.eventMode = 'none';
    this.app.stage.addChild(this.world);
    const lawn = new Sprite(await Assets.load<Texture>(assetUrl('egypt/lawn.webp')));
    lawn.position.set(-340, -40); this.world.addChild(lawn, this.highlight, this.actorLayer, this.effects);
    this.actorLayer.sortableChildren = true;
    let done = 1; progress(done, 7);
    const skeletons = new Map<RigName, Skeleton>();
    await loadInBatches(Object.keys(RIGS) as RigName[], 2, async name => {
      const [skeleton, atlas, texture] = await Promise.all([
        json<Skeleton>(`actors/${name}/skeleton.json`), json<object>(`actors/${name}/atlas.json`),
        Assets.load<Texture>(assetUrl(`actors/${name}/texture.webp`)),
      ]);
      this.factory.parseDragonBonesData(skeleton, name);
      this.factory.parseTextureAtlasData(atlas, texture, name);
      await this.app.renderer.prepare.upload(texture);
      skeletons.set(name, skeleton); progress(++done, 7);
    });
    const timing = (name: RigName, action: string, event: string) => {
      const armature = skeletons.get(name)!.armature.find(a => a.name === RIGS[name].armature)!;
      const animation = armature.animation.find(a => a.name === action)!;
      let frame = 0;
      for (const item of animation.frame!) {
        if (item.events?.some(e => e.name === event)) break;
        frame += item.duration!;
      }
      return { event: frame / armature.frameRate, duration: animation.duration / armature.frameRate };
    };
    const shoot = timing('peashooter', 'Shoot', 'Shoot'), produce = timing('sunflower', 'Produce', 'Produce');
    this.timing = { shoot: shoot.event, shootDuration: shoot.duration, produce: produce.event, produceDuration: produce.duration };
    this.observer = new ResizeObserver(() => {
      this.scale = host.clientWidth / BOARD.width;
      this.app.renderer.resize(host.clientWidth, host.clientWidth * BOARD.height / BOARD.width);
      this.world.scale.set(this.scale);
      this.render();
    });
    this.observer.observe(host);
    const point = (e: PointerEvent) => { const r = this.app.canvas.getBoundingClientRect(); return [(e.clientX - r.left) / this.scale, (e.clientY - r.top) / this.scale] as const; };
    this.app.canvas.addEventListener('pointerdown', e => { e.preventDefault(); this.onPoint(...point(e)); });
    this.app.canvas.addEventListener('pointermove', e => this.onHover(...point(e)));
    this.app.canvas.addEventListener('pointerleave', () => this.highlight.clear());
    this.app.ticker.add(this.tick);
    this.render();
  }

  private rig(name: RigName, armature = RIGS[name].armature) {
    return this.factory.buildArmatureDisplay(armature, name, '', name)!;
  }

  portrait(kind: PlantKind): string {
    const rig = this.rig(kind);
    rig.animation.play(kind === 'potatomine' ? 'Idle' : RIGS[kind].idle, 0);
    rig.armature.advanceTime(.01);
    const canvas = this.app.renderer.extract.canvas({ target: rig, resolution: 1 });
    const url = (canvas as HTMLCanvasElement).toDataURL('image/webp');
    rig.dispose(); PixiFactory.advanceTime(0);
    return url;
  }

  highlightCell(row: number, column: number, color: number) {
    this.highlight.clear();
    if (row >= 0 && row < 5 && column >= 0 && column < 9) this.highlight.rect(BOARD.left + column * BOARD.cellWidth, BOARD.top + row * BOARD.cellHeight,
      BOARD.cellWidth, BOARD.cellHeight).fill({ color, alpha: .22 }).stroke({ color, alpha: .6, width: 2 });
  }

  private addActor(id: number, name: RigName) {
    const root = new Container();
    const shade = new Graphics().ellipse(0, 2, name === 'mummy' || name === 'ra' ? 23 : 25, 8).fill({ color: '#302d20', alpha: .2 });
    const rig = this.rig(name); rig.scale.set(RIGS[name].scale);
    root.addChild(shade, rig); this.actorLayer.addChild(root);
    const actor: Actor = { root, rig, animation: '', actionAt: -1, dying: -1 };
    this.actors.set(id, actor); return actor;
  }

  private animate(actor: Actor, name: string, actionAt = 0, times = 0) {
    if (actor.animation === name && actor.actionAt === actionAt) return;
    actor.rig.animation.play(name, times); actor.animation = name; actor.actionAt = actionAt;
  }

  private plantAnimation(plant: Plant, game: Game) {
    if (plant.action === 'food') return 'Food';
    if (plant.action === 'shoot') return 'Shoot';
    if (plant.action === 'produce') return 'Produce';
    if (plant.kind === 'wallnut') return plant.armor > 0 ? 'Idle4' : plant.hp < 1333 ? 'Idle3' : plant.hp < 2666 ? 'Idle2' : 'Idle1';
    if (plant.kind === 'potatomine') return plant.age < game.props.plants.potatomine.ChargeTime ? 'Idle_Baby' : 'Idle';
    return 'Idle';
  }

  sync(game: Game, dt: number) {
    const alive = new Set<number>();
    for (const p of game.plants) {
      alive.add(p.id);
      const actor = this.actors.get(p.id) ?? this.addActor(p.id, p.kind);
      actor.root.position.set(cellX(p.column), rowY(p.row)); actor.root.zIndex = rowY(p.row);
      const animation = this.plantAnimation(p, game);
      this.animate(actor, animation, p.action === 'idle' ? 0 : p.actionAt, p.action === 'shoot' || p.action === 'produce' ? 1 : 0);
    }
    for (const z of game.zombies) {
      alive.add(z.id);
      const actor = this.actors.get(z.id) ?? this.addActor(z.id, z.kind === 'ra' ? 'ra' : 'mummy');
      actor.root.position.set(z.x, rowY(z.row)); actor.root.zIndex = rowY(z.row) + 1;
      this.animate(actor, z.eating ? 'Eat' : z.absorbUntil > game.time ? 'Absorbing' : 'Walk');
      if (z.armor > 0 && !actor.armor) {
        actor.armor = this.rig('mummy', 'Cone'); actor.armor.scale.set(.51); actor.root.addChild(actor.armor);
      }
      if (actor.armor) {
        actor.armor.visible = z.armor > 0;
        const animation = z.armor > 246 ? 'Broken0' : z.armor > 123 ? 'Broken1' : 'Broken2';
        if (actor.armor.animation.lastAnimationName !== animation) actor.armor.animation.play(animation, 0);
      }
    }
    for (const [id, actor] of this.actors) if (!alive.has(id)) {
      // The model owns removals; visuals leave over a short fade without affecting combat.
      if (actor.dying < 0) actor.dying = 0;
      actor.dying += dt; actor.root.alpha = Math.max(0, 1 - actor.dying / .3);
      if (actor.dying >= .3) { actor.rig.dispose(); actor.armor?.dispose(); actor.root.destroy({ children: true }); this.actors.delete(id); }
    }
    PixiFactory.advanceTime(dt);
    for (const actor of this.actors.values()) if (actor.armor?.visible) {
      const bone = actor.rig.armature.getBone('armorSOCKET')!;
      actor.armor.position.set(bone.global.x * .51, bone.global.y * .51);
      actor.armor.rotation = bone.global.rotation;
    }
    this.drawObjects(game);
  }

  private drawObjects(game: Game) {
    const g = this.effects; g.clear();
    for (const mower of game.mowers) if (!mower.spent) {
      const x = mower.x, y = rowY(mower.row);
      g.roundRect(x - 23, y - 22, 42, 20, 5).fill('#536b50').stroke({ color: '#263f31', width: 3 });
      g.moveTo(x - 20, y - 14).lineTo(x - 30, y - 40).lineTo(x - 37, y - 40).stroke({ color: '#594c38', width: 4 });
      g.circle(x - 13, y, 8).circle(x + 12, y, 8).fill('#303c32');
      g.circle(x - 13, y, 3).circle(x + 12, y, 3).fill('#d1bb79');
    }
    for (const pea of game.peas) {
      g.circle(pea.x, pea.y, pea.powered ? 8 : 7).fill(pea.powered ? '#c8f968' : '#8bd331').stroke({ color: '#3e761d', width: 1.5 });
      g.circle(pea.x - 2, pea.y - 2, 2).fill('#effcb0');
    }
    for (const sun of game.suns) {
      const radius = 21 + Math.sin(game.time * 3 + sun.id) * 1.5;
      for (let i = 0; i < 10; i++) {
        const a = i * Math.PI / 5 + game.time * .25;
        g.moveTo(sun.x + Math.cos(a - .1) * radius, sun.y + Math.sin(a - .1) * radius)
          .lineTo(sun.x + Math.cos(a) * (radius + 12), sun.y + Math.sin(a) * (radius + 12))
          .lineTo(sun.x + Math.cos(a + .1) * radius, sun.y + Math.sin(a + .1) * radius).fill('#ffcf3f');
      }
      g.circle(sun.x, sun.y, radius).fill('#ffdf58').stroke({ color: '#fff5b6', width: 3 });
      g.circle(sun.x - 5, sun.y - 5, 6).fill({ color: '#fffbed', alpha: .55 });
    }
    for (const effect of game.effects) {
      const t = effect.age / .65, r = effect.kind === 'explode' ? 85 : effect.kind === 'food' ? 55 : 23;
      const color = effect.kind === 'explode' ? '#fff1b0' : effect.kind === 'food' ? '#bdff91' : effect.kind === 'plant' ? '#b49a57' : '#e8ffaf';
      g.circle(effect.x, effect.y, 5 + r * t).stroke({ color, width: 5 * (1 - t), alpha: 1 - t });
    }
  }

  render() { this.app.render(); }
  start() { this.app.start(); }
  stop() { this.app.stop(); }
  reset() {
    this.stop();
    for (const actor of this.actors.values()) { actor.rig.dispose(); actor.armor?.dispose(); actor.root.destroy({ children: true }); }
    this.actors.clear(); this.effects.clear(); this.highlight.clear(); PixiFactory.advanceTime(0);
  }
}
