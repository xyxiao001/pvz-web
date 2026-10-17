import type { Level, PlantKind, ZombieKind } from '../game/level';
export const zombieRig=(kind:ZombieKind)=>kind==='pirate_captain'?'pirateCaptain':kind==='pirate_captain_parrot'?'pirateParrot':kind==='barrelroller'?'barrelroller':kind==='pirate_barrel'?'pirateBarrel':kind==='pirate_gargantuar'?'pirateGargantuar':kind==='pirate_imp'?'pirateImp':kind==='cannon'?'impCannon':kind==='pirate_flag'?'pirateFlag':kind.startsWith('pirate')?'pirate':kind==='swashbuckler'||kind==='seagull'?kind:kind.startsWith('zombossmech_')?'boss':kind==='explorer_veteran'?'torchlight':kind==='pharaoh_weak'?'pharaohWeak':kind==='pharaoh'?'pharaoh':kind==='pharaoh_inner'?'pharaohInner':kind.endsWith('_touch')?'camelTouch':kind.startsWith('camel_')?'camel':kind==='egypt_gargantuar'?'gargantuar':kind==='egypt_imp'?'imp':kind==='explorer'?'explorer':kind==='tomb_raiser'?'tombraiser':kind==='ra'?'ra':'mummy';
export function battleActors(level:Level,plants:readonly PlantKind[]){
  const names=new Set(['peashooter','sunflower','wallnut','potatomine','mummy','ra',...plants,...level.waves.flat().map(zombieRig)]);
  if(level.world==='pirate')names.add('pirateFlag');
  if(names.has('pirateCaptain'))names.add('pirateParrot');
  if(names.has('barrelroller'))names.add('pirateBarrel');
  if(['barrelroller','pirateGargantuar','impCannon'].some(n=>names.has(n)))names.add('pirateImp');
  if(level.boss?.kind==='zombossmech_pirate')for(const name of ['boss','pirate','pirateCaptain','pirateParrot','pirateGargantuar','pirateImp','barrelroller','pirateBarrel'])names.add(name);
  else if(level.boss)for(const name of ['boss','mummy','gargantuar','imp','tombraiser','explorer','torchlight','pharaoh','pharaohInner'])names.add(name);
  if(names.has('gargantuar')){names.add('imp');names.add('pharaohInner');}
  if(names.has('pharaoh')||names.has('pharaohWeak'))names.add('pharaohInner');
  return [...names];
}
export function battleEffects(level:Level,plants:readonly PlantKind[]){
  const names=new Set(['food']);
  if(level.world==='pirate'&&level.day===8)names.add('zombossicon');
  if(level.world==='pirate')for(const name of ['pirateLawn','mower','pirateCone','pirateBucket','seaSplash'])names.add(name);
  const actors=new Set(battleActors(level,plants)),actions=level.actions.flat();
  const plantEffects:Partial<Record<PlantKind,string[]>>={
    spikerock:['rockFood'],spikeweed:['spikeFood'],snapdragon:['snapFire','snapFood','snapBall'],coconutcannon:['coconut','coconutHit','coconutFood','coconutFoodHit'],iceburg:['iceTrap'],iceweed:['iceSaw','iceTrap'],snowdrop:['snowdrop','snowdrop_freeze','iceTrap'],
    sapfling:['sapfling','sapfling_pf','sapTile'],parsnip:['parsnip_child','parsnip_child_small'],cherry_bomb:['cherryExplosion'],
    kernelpult:['corn','butter','butter2'],melonpult:['melon','melon_pf'],cabbagepult:['cabbage'],bloomerang:['boomerang'],
  };
  for(const plant of plants)for(const effect of plantEffects[plant]??[])names.add(effect);
  if(level.boss?.kind==='zombossmech_pirate')for(const name of ['bossEscape','bossPortal','zombossicon','dirtSpawn'])names.add(name);
  else if(level.boss)for(const name of ['bossMissile','bossTarget','bossEscape','bossPortal','zombossicon'])names.add(name);
  if(level.flowerLine!==null)names.add('flower');
  if(level.mold.length)names.add('mold');
  if(level.protectedPlants.length)names.add('endangered');
  if(level.conveyor)names.add('conveyor');
  if(actors.has('gargantuar')||actors.has('pharaoh')||actors.has('pharaohWeak'))names.add('pharaohBreak');
  if(actors.has('tombraiser')){names.add('tombBone');names.add('dirtSpawn');}
  if(level.graves.length||level.randomGraves||actors.has('tombraiser')||actions.some(a=>a.mode==='graves'))names.add('grave');
  if(level.match||actions.some(a=>['ground','graveZombies','graves'].includes(a.mode)||a.zombies.some(z=>z.column!==undefined)))names.add('dirtSpawn');
  if(actions.some(a=>a.mode==='storm'))names.add('sandstorm');
  if(level.powerups)for(const name of ['iceTrap','dirtSpawn','sprout','powerSnow','snowHit','cherryExplosion','wizardFinger','wizardPoint','tossPar','flameFinger','flameSquare'])names.add(name);
  return [...names];
}
