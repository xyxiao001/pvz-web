import { Application, Container, Rectangle } from 'pixi.js';
import { PLANT_GROUPS } from '../src/game/almanac';
import { PlantMotion, hasPlantMotion } from '../src/rendering/plant-motion';
import { ActorMotion, ACTOR_MOTION } from '../src/rendering/actor-motion';
import { GiantMotion } from '../src/rendering/giant-motion';

// Offline authoring only: reuse runtime transforms, attachments and visibility.
const zombies: Record<string, string> = {
  normal:'zombie-walk', flag:'flag-walk', cone:'cone-walk', pole:'pole-run',
  bucket:'bucket-walk', newspaper:'newspaper-walk', door:'door-walk',
  football:'football-walk', dancer:'dancer-walk', backup:'backup-walk',
  ducky:'ducky1-walk', snorkel:'snorkel-walk', zomboni:'zomboni-walk',
  bobsled:'bobsled-walk', dolphin:'dolphin-walk', jack:'jack-walk',
  balloon:'balloon-fly', digger:'digger-walk', pogo:'pogo-bounce',
  bungee:'bungee-idle', ladder:'ladder-walk', catapult:'catapult-walk',
  gargantuar:'gargantuar-walk', imp:'imp-walk', yeti:'yeti-walk',
};
// Keep special explodenut art and the sharper standalone portraits of Lanczos families.
const retainedPlants = new Set(['explodenut','gloomshroom','cattail','goldmagnet','spikerock','cobcannon','imitater']);
document.querySelector<HTMLButtonElement>('#export')!.onclick = async () => {
  const app = new Application();
  await app.init({ width:1, height:1, backgroundAlpha:0, antialias:true, autoStart:false });
  const plants = new PlantMotion(), actors = new ActorMotion(), giant = new GiantMotion();
  const entries = [
    ...PLANT_GROUPS.flatMap(group => group.kinds).filter(kind => !retainedPlants.has(kind)).map(kind => ({
      file:`hd4/original/${kind}.webp`, clip:kind as string,
    })),
    ...Object.entries(zombies).filter(([kind]) => kind !== 'imp').map(([kind, clip]) => ({ file:kind === 'yeti' ? 'original/yeti.webp' : `almanac/${kind}.webp`, clip })),
  ];
  const results = [];
  const progress = () => {};
  const upload = async () => {};
  for (const entry of entries) {
    const holder = new Container();
    let sources: string[];
    if (hasPlantMotion(entry.clip)) {
      await plants.prepare([entry.clip], progress, upload);
      const rig = plants.create(entry.clip); rig.render(0); holder.addChild(rig.root);
      sources = [`plant-motion/${entry.clip}.json`, `plant-motion/${entry.clip}.webp`];
    } else if (entry.clip === 'gargantuar-walk') {
      await giant.prepare(true, upload);
      const rig = giant.create(); rig.render('gargantuar-walk', 0, true); holder.addChild(rig.root);
      sources = ['giant-motion/gargantuar.json', 'giant-motion/gargantuar.webp'];
    } else {
      await actors.prepare([entry.clip], progress, upload);
      const rig = actors.create(entry.clip); rig.render(entry.clip, 0, true); holder.addChild(rig.root);
      sources = [`actor-motion/${ACTOR_MOTION[entry.clip]}.json`, `actor-motion/${ACTOR_MOTION[entry.clip]}.webp`];
    }
    const bounds = holder.getLocalBounds();
    const frame = new Rectangle(Math.floor(bounds.x)-1, Math.floor(bounds.y)-1,
      Math.ceil(bounds.maxX)-Math.floor(bounds.x)+2, Math.ceil(bounds.maxY)-Math.floor(bounds.y)+2);
    const canvas = app.renderer.extract.canvas({ target:holder, frame, resolution:4, antialias:true }) as HTMLCanvasElement;
    const png = canvas.toDataURL('image/png');
    results.push({...entry, sources, size:[canvas.width,canvas.height], png});
    const figure = document.createElement('figure'), img = document.createElement('img'), caption = document.createElement('figcaption');
    img.src = png; caption.textContent = entry.file; figure.append(img,caption); document.querySelector('main')!.append(figure);
    document.querySelector('#status')!.textContent = `${results.length} / ${entries.length}`;
    holder.destroy({children:true});
  }
  await plants.destroy(); await actors.destroy(); await giant.destroy(); app.destroy();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(new Blob([JSON.stringify(results)], {type:'application/json'}));
  link.download = 'portraits.json'; link.textContent = '下载展示图数据';
  document.querySelector('#export')!.after(link);
  document.querySelector('#status')!.textContent = `完成 ${results.length} 张展示图`;
};
