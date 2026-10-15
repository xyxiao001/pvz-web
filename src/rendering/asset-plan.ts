import { BOSS_ENEMIES } from '../game/boss';
import { isPool } from '../game/config';
import type { Game } from '../game/model';
import portable from '../game/data/portable-adventure.json';

// Combat-only images wait for card selection; retained shots and craters also need them on resume.
export function combatTextureFiles(game: Game) {
  const plants = new Set([...game.seeds, ...(game.imitaterTarget?[game.imitaterTarget]:[]), ...game.plants.map(plant => plant.kind)]);
  const files: Record<string, string> = {};
  if(game.campaign?.rake||game.rake)files.rake='original/rake.webp';
  if(game.campaign?.roofCleaner)files.roofCleaner='original/roof-cleaner.webp';
  if (plants.has('splitpea') || plants.has('gatlingpea') || plants.has('peashooter') || plants.has('repeater') || plants.has('threepeater') || game.peas.some(pea => !pea.ice && !pea.puff)) files.pea = 'pea.webp';
  if (plants.has('snowpea') || game.peas.some(pea => pea.ice)) files.ice = 'original/snow-pea.webp';
  if (plants.has('puffshroom') || plants.has('scaredyshroom') || plants.has('seashroom') || game.peas.some(pea => pea.puff)) files.puff = 'original/puff.webp';
  if(plants.has('starfruit'))files.star='original/star.webp';
  if(plants.has('wintermelon') || game.peas.some(pea=>pea.lob?.kind==='wintermelon'))files.wintermelon='original/wintermelon-projectile.webp';
  if(plants.has('melonpult'))files.melon='original/melon.webp';
  if(game.campaign||plants.has('goldmagnet')||plants.has('marigold')||game.coins.length){files.coinSilver='original/coin-silver.webp';files.coinGold='original/coin-gold.webp';files.coinDiamond='original/coin-diamond.webp';}
  if(plants.has('cabbagepult'))files.cabbage='original/cabbage.webp';
  if(plants.has('kernelpult')){files.kernel='original/kernel.webp';files.butter='original/butter.webp';}
  if(game.boss||game.waves.flat().includes('catapult'))files.basketball='original/basketball.webp';
  if(game.boss)files.iceTrail='original/ice-trail.webp';
  if(game.config.environment==='roof'||game.waves.flat().includes('ladder')||game.ladders.length)files.ladder='original/ladder.webp';
  if(game.config.environment==='roof'||game.waves.flat().includes('bungee')||game.zombies.some(z=>z.kind==='bungee')){files.ladder='original/ladder.webp';files.bungeeTarget='original/bungee-target.webp';files.bungeeCord='original/bungee-cord.webp';}
  if(plants.has('cobcannon')||game.peas.some(p=>p.cannon))files.cannon='original/cannon-projectile.webp';
  if (plants.has('cactus')||plants.has('cattail')) files.spike = 'original/spike.webp';
  if (plants.has('torchwood') || game.peas.some(pea => pea.fire)) files.firePea = 'original/fire-pea.webp';
  if (game.waves.flat().includes('zomboni')) files.iceTrail = 'original/ice-trail.webp';
  if (game.waves.flat().includes('bobsled')) files.sled = 'original/sled.webp';
  if (plants.has('doomshroom') || game.craters.length) files.crater = 'original/crater.webp';
  return files;
}

// Include selected cards, retained defenses, wave enemies and their spawned forms.
export function animationNames(game: Game, available: string[]) {
  const roots = new Set<string>(['sun', 'zombie']);
  for (const kind of [...game.seeds, ...(game.imitaterTarget?[game.imitaterTarget]:[]), ...game.plants.map(p => p.kind), ...game.rollers.map(p => p.kind)]) roots.add(kind);
  if (roots.has('fumeshroom')) roots.add('fume-cloud');
  const enemies = new Set([...game.waves.flat(), ...game.zombies.map(z => z.kind)]);
  if (game.config.mode === 'vase') for (const stage of portable.vaseStages) for (const content of stage.contents) {
    if (content.type === 'zombie') enemies.add(content.kind as Game['zombies'][number]['kind']);
    else roots.add(content.kind);
  }
  if(game.boss)for(const kind of BOSS_ENEMIES)enemies.add(kind);
  if(game.config.environment==='roof'){enemies.add('bungee');enemies.add('normal');enemies.add('cone');}
  if (game.config.mode === 'whack') for (const kind of ['normal','cone','bucket'] as const) enemies.add(kind);
  if (game.config.environment === 'night' || isPool(game.config.environment)) { enemies.add('normal'); enemies.add('cone'); }
  for (const kind of enemies) {
    roots.add(kind === 'normal' || kind === 'ducky' ? 'zombie' : kind);
    if (kind === 'gargantuar') roots.add('imp');
    if (kind === 'dancer') roots.add('backup');
  }
  if (isPool(game.config.environment)) {
    roots.add('ducky'); roots.add('ducky1');
    if (enemies.has('cone')) roots.add('ducky2');
    if (enemies.has('bucket')) roots.add('ducky3');
  }
  return available.filter(name => [...roots].some(root => name === root || name.startsWith(`${root}-`)));
}

// Return the first frame whose exclusive end lies after the animation clock.
export function animationFrame(ends: number[], position: number) {
  let left = 0, right = ends.length - 1;
  while (left < right) { const middle = (left + right) >>> 1; if (position < ends[middle]) right = middle; else left = middle + 1; }
  return left;
}
