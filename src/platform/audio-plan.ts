import type { Game } from '../game/model';

export function soundFiles(game: Game) {
  const files = {
    plant: 'plant_water.mp3', sun: 'points.mp3', mower: 'lawnmower.mp3',
    wave: 'finalwave.mp3', flag: 'hugewave.mp3', win: 'winmusic-web.mp3', lose: 'losemusic.mp3',
  } as Record<string, string>;
  const plants = new Set([...game.seeds, ...game.plants.map(plant => plant.kind), ...game.rollers.map(roller => roller.kind)]);
  if (plants.has('cherrybomb') || plants.has('potatomine') || plants.has('doomshroom') || plants.has('explodenut')) files.explode = 'cherrybomb.mp3';
  if (plants.has('chomper')) files.swallow = 'chomp.mp3';
  if (plants.has('fumeshroom')) files.fume = 'fume.mp3';
  if (plants.has('hypnoshroom')) files.hypnotize = 'mindcontrolled.mp3';
  if (plants.has('iceshroom')) files.freeze = 'frozen.mp3';
  if (plants.has('blover')) files.blover = 'blover.mp3';
  if (plants.has('jalapeno')) files.fire = 'cherrybomb.mp3';
  if (game.boss || game.waves.flat().includes('jack') || game.config.mode === 'vase') files.explode = 'cherrybomb.mp3';
  if (game.config.mode === 'vase') files.vase = 'vase_breaking.mp3';
  if (game.config.mode === 'whack') files.whack = 'bonk.mp3';
  if(game.level===40&&game.scenario==='adventure')files.thunder='thunder.mp3';
  if(game.config.environment==='roof')files.bungee='bungee_scream.mp3';
  if(plants.has('marigold'))files.coin='points.mp3';
  if(plants.has('coffeebean'))files.coffee='coffee.mp3';
  return files;
}
