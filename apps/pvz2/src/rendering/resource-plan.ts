import type { Level, PlantKind, ZombieKind } from '../game/level';
export const zombieRig=(kind:ZombieKind)=>kind==='beach_snorkel'?'beachSnorkel':kind==='beach_gargantuar'?'beachGargantuar':kind==='beach_flag'?'beachFlag':kind==='beach_imp'?'beachImp':kind.startsWith('beach_fem')?'beachFemale':kind.startsWith('beach')?'beach':kind==='dark_king_veteran'?'darkKingVeteran':kind==='dark_wizard_veteran'?'darkWizardVeteran':kind==='dark_king'?'darkKing':kind==='dark_imp_dragon'?'dragonImp':kind==='dark_wizard'?'darkWizard':kind==='dark_gargantuar'?'darkGargantuar':kind==='dark_juggler'?'darkJester':kind==='dark_imp'?'darkImp':kind==='dark_flag'?'darkFlag':kind.startsWith('dark')?'dark':kind==='future_jetpack_veteran'?'jetpackVeteran':kind==='football_mech'?'footballMech':kind==='future_gargantuar'?'futureGargantuar':kind==='disco_mech'?'discoMech':kind==='future_jetpack_disco'?'discoJetpack':kind==='future_jetpack'?'futureJetpack':kind==='future_protector'?'futureProtector':kind==='future_protector_shield'?'futureShield':kind==='future_imp'?'futureImp':kind==='mech_cone'?'mechCone':kind==='future_flag'?'futureFlag':kind.startsWith('future')?'future':kind==='west_bull_veteran'?'blackBull':kind==='west_bull'?'bull':kind==='cowboy_gargantuar'?'cowboyGargantuar':kind==='west_bullrider'?'cowboyImp':kind==='chicken_farmer'?'chickenFarmer':kind==='chicken'?'chicken':kind==='chicken_pumpkin'?'chickenPumpkin':kind==='cowboy_flag'?'cowboyFlag':kind.startsWith('cowboy')?'cowboy':kind.startsWith('poncho')?'poncho':kind==='prospector'||kind==='piano'?kind:kind==='pirate_captain'?'pirateCaptain':kind==='pirate_captain_parrot'?'pirateParrot':kind==='barrelroller'?'barrelroller':kind==='pirate_barrel'?'pirateBarrel':kind==='pirate_gargantuar'?'pirateGargantuar':kind==='pirate_imp'?'pirateImp':kind==='cannon'?'impCannon':kind==='pirate_flag'?'pirateFlag':kind.startsWith('pirate')?'pirate':kind==='swashbuckler'||kind==='seagull'||kind==='pelican'?kind:kind.startsWith('zombossmech_')?'boss':kind==='explorer_veteran'?'torchlight':kind==='pharaoh_weak'?'pharaohWeak':kind==='pharaoh'?'pharaoh':kind==='pharaoh_inner'?'pharaohInner':kind.endsWith('_touch')?'camelTouch':kind.startsWith('camel_')?'camel':kind==='egypt_gargantuar'?'gargantuar':kind==='egypt_imp'?'imp':kind==='explorer'?'explorer':kind==='tomb_raiser'?'tombraiser':kind==='ra'?'ra':'mummy';
export function battleActors(level:Level,plants:readonly PlantKind[]){
  const names=new Set(['peashooter','sunflower','wallnut','potatomine','mummy','ra',...plants,...level.waves.flat().map(zombieRig)]);
  if(level.world==='beach')names.add('beachFlag');
  if(names.has('beachGargantuar'))names.add('beachImp');
  if(level.initialPlants.some(p=>p.kind==='lilypad'))names.add('lilypad');
  if(level.world==='pirate')names.add('pirateFlag');
  if(level.world==='west')names.add('cowboyFlag');
  if(level.world==='dark'){names.add('darkFlag');if(names.has('hypnoshroom')||names.has('darkGargantuar')){names.add('darkGargantuar');names.add('darkImp');}}
  if(level.world==='future')names.add('futureFlag');
  if(names.has('jetpackVeteran'))names.add('future');
  if(names.has('futureGargantuar'))names.add('futureImp');
  if(names.has('discoMech'))names.add('discoJetpack');
  if(names.has('futureProtector'))names.add('futureShield');
  if(names.has('cowboyGargantuar')||names.has('bull')||names.has('blackBull'))names.add('cowboyImp');
  if(names.has('chickenFarmer')){names.add('chicken');names.add('chickenPumpkin');}
  if(names.has('pirateCaptain'))names.add('pirateParrot');
  if(names.has('barrelroller'))names.add('pirateBarrel');
  if(['barrelroller','pirateGargantuar','impCannon'].some(n=>names.has(n)))names.add('pirateImp');
  if(level.boss?.kind.startsWith('zombossmech_pirate'))for(const name of ['boss','pirate','pirateCaptain','pirateParrot','pirateGargantuar','pirateImp','barrelroller','pirateBarrel'])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_cowboy'))for(const name of ['boss','cowboy','prospector','piano','poncho','cowboyGargantuar','cowboyImp','chickenFarmer','chicken','chickenPumpkin'])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_future'))for(const name of ['boss','future','futureJetpack','futureProtector','futureShield','futureImp','futureGargantuar','footballMech'])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_dark'))for(const name of ['boss','dark','darkImp','darkGargantuar','darkJester','darkWizard','dragonImp'])names.add(name);
  else if(level.boss)for(const name of ['boss','mummy','gargantuar','imp','tombraiser','explorer','torchlight','pharaoh','pharaohInner'])names.add(name);
  if(level.memory||names.has('darkKingVeteran'))names.add('dark');
  if(level.memory)names.add('darkImp');
  if(level.boss?.kind==='zombossmech_dark2')for(const name of ['darkKing','darkKingVeteran','darkWizardVeteran'])names.add(name);
  if(level.boss?.kind==='zombossmech_cowboy2')names.add('blackBull');
  if(level.boss?.kind==='zombossmech_future2')for(const name of ['jetpackVeteran','discoMech','discoJetpack','mechCone'])names.add(name);
  if(names.has('gargantuar')){names.add('imp');names.add('pharaohInner');}
  if(names.has('pharaoh')||names.has('pharaohWeak'))names.add('pharaohInner');
  return [...names];
}
export function battleEffects(level:Level,plants:readonly PlantKind[]){
  const names=new Set(['food']);
  if(level.bowlingLine!==null){names.add('bowlingLine');names.add('bowlingSign');}
  if(plants.some(p=>p==='bowlingbulb'||p.startsWith('tool_projectile_bowlingbulb')))for(const n of ['bowling0','bowling1','bowling2','bowling_pf'])names.add(n);
  if(level.world==='beach')for(const n of ['beachLawn','mower','beachCone','beachBucket','tide','tideLine','tideSign'])names.add(n);
  if(level.world==='dark')for(const n of ['darkLawn','mower','darkCone','darkBucket','darkHelmet','darkBricks','graveSun','graveFood'])names.add(n);
  if(level.world==='future')for(const n of [(level.sunBomb||[8,11,16,22,25,27,31,35].includes(level.day))?'futureNightLawn':'futureLawn','mower','futureCone','futureBucket',...new Set(level.powerTiles.flatMap(t=>['tile_'+t.group,'tile_'+t.group+'Flash','tile_'+t.group+'Dot']))])names.add(n);
  if(level.world==='dark'&&level.day===10)names.add('zombossicon');
  if(level.waves.flat().some(z=>z.startsWith('dark_king'))||level.boss?.kind==='zombossmech_dark2')names.add('knightEffect');
  if(level.waves.flat().some(z=>z==='dark_wizard'||z==='dark_wizard_veteran')||level.boss?.kind.startsWith('zombossmech_dark'))for(const n of ['wizardSheep','wizardLink','wizardHit'])names.add(n);
  if(level.extraPotions.some(p=>p.PotionTypes.includes('zombiepotion_invisibility')))names.add('potionInvisibility');
  if(level.memory){names.add('grave');names.add('memoryImp');names.add('dirtSpawn');}
  if(level.potions)for(const n of ['potionSpeed','potionToughness'])names.add(n);
  if(level.sunBomb)for(const n of ['sunbomb','sunbombRay','sunbombBlast'])names.add(n);
  if(level.corral)for(const name of ['fenceHere','fenceThere'])names.add(name);
  if(level.world==='west')for(const name of ['cowboyLawn','mower','cowboyCone','cowboyBucket','rail','cart','prospectorSmoke','prospectorTail','ponchoBreak','plateDrop','cowboyHat'])names.add(name);
  if((level.world==='west'||level.world==='future')&&level.day===8)names.add('zombossicon');
  if(level.waves.flat().includes('chicken_farmer')||level.boss?.kind.startsWith('zombossmech_cowboy'))names.add('chickenAsh');
  if((level.world==='pirate'||level.world==='egypt')&&level.day===8)names.add('zombossicon');
  if(level.world==='pirate')for(const name of ['pirateLawn','mower','pirateCone','pirateBucket','seaSplash'])names.add(name);
  if(level.waves.flat().includes('pirate_armor4')||level.boss?.kind==='zombossmech_pirate2')names.add('pirateBricks');
  const actors=new Set(battleActors(level,plants)),actions=level.actions.flat();
  if(level.waves.flat().includes('cowboy_armor4')||level.boss?.kind==='zombossmech_cowboy2')names.add('cowboyBricks');
  if((level.waves.flat().includes('future_armor4')||level.boss?.kind==='zombossmech_future2'))names.add('futureBricks');
  const plantEffects:Partial<Record<PlantKind,string[]>>={
    tanglekelp:['kelpHands'],guacodile:['guacShot','guacRunner'],jackolantern:['jackFire','jackFood'],scaredyshroom:['scaredyShot','scaredyFood'],peanut:['peanutShot'],sunbean:['sunbeanBlast'],fumeshroom:['fumeShot','fumeFood','fumeHit'],applemortar:['appleShot','appleFood','appleHit','appleFoodHit'],electricblueberry:['blueberryCloud'],pinkstarfruit:['pinkShot','pinkFood','pinkHit','pinkFoodHit'],redstinger:['redShot','redWeak','redHit','redRay'],powerplant:['tile_epsilon','tile_epsilonFlash','tile_epsilonDot'],starfruit:['starShot','starFood','starHit','starFoodHit'],holonut:['infinutShield'],powerplant_alpha:['tile_alpha','tile_alphaFlash','tile_alphaDot'],powerplant_beta:['tile_beta','tile_betaFlash','tile_betaDot'],citron:['citronShot','citronFood','citronHit','citronFoodHit','citronToss','citronLightning'],empea:['empBlast','empEffect'],laser_bean:['laserBeam','laserDirt'],shadowshroom:['shadowExpl'],hurrikale:['windUpper','windLower'],puffshroom:['puffshroom_spore','puffshroom_sporeHit'],banana:['bananaShot','bananaHit','bananaTarget'],electriccurrant:['currantLine','currantCenter','currantHit'],
    electricpeashooter:['electricpea','electricpea_pf','electricpea_small','electricFoot','electricLink','electricHit','electricBigHit','electricSmallHit'],magnetshroom:['cowboyBucket','plateDrop'],magnifyinggrass:['magnifying_grass','grassHit','grassFrom','grassTo','grassAbsorb','grassRay'],wintermelon:['winter_melon','winter_melon_pf'],chilibean:['chiliFart','chiliStun'],splitpea:['megaPea'],xshot:['rotobaga','rotobagaFood'],chardguard:['chardHand'],dandelion:['dandelionShot','dandelionFood','dandelionExplosion','dandelionFoodExplosion','dandelionThrow'],jalapeno:['jalapenoFire'],lightningreed:['reedCloud','reedHit','reedLink'],escaperoot:['grapeshot','escapeGrapeExplosion','cherryExplosion'],spikerock:['rockFood'],spikeweed:['spikeFood'],snapdragon:['snapFire','snapFood','snapBall'],coconutcannon:['coconut','coconutHit','coconutFood','coconutFoodHit'],iceburg:['iceTrap'],iceweed:['iceSaw','iceTrap'],snowdrop:['snowdrop','snowdrop_freeze','iceTrap'],
    sapfling:['sapfling','sapfling_pf','sapTile'],parsnip:['parsnip_child','parsnip_child_small'],cherry_bomb:['cherryExplosion'],
    kernelpult:['corn','butter','butter2'],melonpult:['melon','melon_pf'],cabbagepult:['cabbage'],bloomerang:['boomerang'],
  };
  for(const plant of plants)for(const effect of plantEffects[plant]??[])names.add(effect);
  if(actors.has('futureGargantuar'))for(const name of ['gargEye','gargHit','gargRay'])names.add(name);
  if(actors.has('discoMech'))names.add('dirtSpawn');
  if(level.boss?.kind.startsWith('zombossmech_pirate'))for(const name of ['bossEscape','bossPortal','zombossicon','dirtSpawn'])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_future')||level.boss?.kind.startsWith('zombossmech_cowboy'))for(const name of ['bossMissile','bossMissileImpact','bossTarget','bossEscape','bossPortal','zombossicon','dirtSpawn'])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_dark'))for(const name of ['bossMissile','bossEscape','jalapenoFire','dragonFire','dragonIntroFire','dragonShade','zombossicon','dirtSpawn'])names.add(name);
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
