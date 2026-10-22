// Deterministic native-scale comparison; this harness never changes a profile.
import { Application, Assets, Container, type Texture } from 'pixi.js';
import { PixiFactory, type PixiArmatureDisplay } from 'pixi-dragonbones-runtime';
import { texturePath, textureResolution, type TextureQuality } from '../src/assets/quality';
const host = document.querySelector<HTMLElement>('#scene')!;
const status = document.querySelector<HTMLOutputElement>('#status')!;
const app = new Application();
await app.init({ width: host.clientWidth, height: host.clientWidth * 700 / 1200, antialias: true, autoDensity: true, resolution: devicePixelRatio, autoStart: false });
host.append(app.canvas);
const world = new Container(); app.stage.addChild(world);
const factory = new PixiFactory(null, false);
const read = async (path: string) => (await fetch('/pvz2/assets/' + path)).json();
const items = [
  { name: 'lawn', path: 'eighties/rigs/560fd5a4-3031-4953-86f4-1b961d1c0f6b', armature: 'Lawn', animation: 'Idle', x: 449.645, y: 344, scale: .5 },
  { name: 'sunflower', path: 'actors/sunflower', armature: 'Sunflower', animation: 'Idle', x: 231, y: 235, scale: .55 },
  { name: 'peashooter', path: 'actors/peashooter', armature: 'Peashooter', animation: 'Idle', x: 313, y: 333, scale: .56 },
  { name: 'wallnut', path: 'actors/wallnut', armature: 'Wall-nut', animation: 'Idle1', x: 477, y: 431, scale: .55 },
  { name: 'potatomine', path: 'actors/potatomine', armature: 'PotatoMine', animation: 'Idle', x: 559, y: 235, scale: .55 },
];
let rigs: PixiArmatureDisplay[] = [], urls: string[] = [];
async function show(quality: TextureQuality) {
  status.textContent = '加载中';
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-quality]')) button.disabled = true;
  rigs.forEach(rig => rig.dispose()); rigs = []; PixiFactory.advanceTime(0);
  for (const item of items) { factory.removeDragonBonesData(item.name); factory.removeTextureAtlasData(item.name); }
  await Promise.all(urls.map(url => Assets.unload(url))); urls = [];
  for (const item of items) {
    const url = '/pvz2/assets/' + texturePath(item.path + '/texture.webp', quality);
    const [skeleton, atlas, texture] = await Promise.all([read(item.path + '/skeleton.json'), read(item.path + '/atlas.json'), Assets.load<Texture>({ src: url, data: { resolution: textureResolution(url) } })]);
    urls.push(url); factory.parseDragonBonesData(skeleton, item.name); factory.parseTextureAtlasData(atlas, texture, item.name);
    const rig = factory.buildArmatureDisplay(item.armature, item.name)!;
    rig.animation.play(item.animation, 0); rig.armature.advanceTime(.01);
    rig.scale.set(item.scale); rig.position.set(item.x, item.y); world.addChild(rig); rigs.push(rig);
  }
  world.scale.set(host.clientWidth / 1200); app.render();
  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-quality]')) { button.disabled = false; button.setAttribute('aria-pressed', String(button.dataset.quality === quality)); }
  status.textContent = quality;
}
for (const button of document.querySelectorAll<HTMLButtonElement>('[data-quality]')) button.onclick = () => { void show(button.dataset.quality as TextureQuality); };
await show('light');
