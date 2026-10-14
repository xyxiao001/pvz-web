import type { Game } from '../game/model';

export function soundFiles(game: Game) {
  const files = {
    plant: 'plant_water.mp3', sun: 'points.mp3', mower: 'lawnmower.mp3',
    wave: 'finalwave.mp3', flag: 'hugewave.mp3', win: 'winmusic.mp3', lose: 'losemusic.mp3',
  } as Record<string, string>;
  const plants = new Set([...game.seeds, ...game.plants.map(plant => plant.kind), ...game.rollers.map(roller => roller.kind)]);
  if (plants.has('cherrybomb') || plants.has('potatomine') || plants.has('doomshroom') || plants.has('explodenut')) files.explode = 'cherrybomb.mp3';
  if (plants.has('chomper')) files.swallow = 'chomp.mp3';
  if (plants.has('fumeshroom')) files.fume = 'fume.ogg';
  if (plants.has('hypnoshroom')) files.hypnotize = 'mindcontrolled.ogg';
  if (plants.has('iceshroom')) files.freeze = 'frozen.ogg';
  if (plants.has('blover')) files.blover = 'blover.ogg';
  if (plants.has('jalapeno')) files.fire = 'cherrybomb.mp3';
  if (game.waves.flat().includes('jack') || game.config.mode === 'vase') files.explode = 'cherrybomb.mp3';
  if (game.config.mode === 'vase') files.vase = 'vase_breaking.ogg';
  if (game.config.mode === 'whack') files.whack = 'bonk.ogg';
  return files;
}
