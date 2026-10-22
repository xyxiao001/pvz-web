import type { Level, PlantKind, ZombieKind } from '../game/level';
export const zombieRig=(kind:ZombieKind)=>kind==='eighties_glitter'?'eightiesGlitter':kind==='eighties_mc'?'eightiesMC':kind==='eighties_punk'?'eightiesPunk':kind==='eighties_flag'?'eightiesFlag':kind.startsWith('eighties')?'eighties':kind==='kongfu_boss_chi'?'boss':kind==='kongfu_bronze_chi_without_torch'?'kongfuBronzeChi':kind==='abbot_3section_staff'?'abbotStaff':kind==='kongfu_bronze_chi'?'kongfuBronzeChi':kind==='abbot_fan'?'abbotFan':kind==='abbot_imp'?'abbotImp':kind==='abbot_chi'?'abbotChi':kind==='abbot_torch'?'abbotTorch':kind==='abbot_flag'?'abbotFlag':kind.startsWith('abbot')?'abbot':kind==='kongfu_boss_blade'?'boss':kind==='monk_drink'?'monkDrink':kind==='kongfu_bronze_hook'?'kongfuHook':kind==='monk_blade'?'monkBlade':kind==='monk_nunchaku'?'monkNunchaku':kind==='monk_torch'?'monkTorch':kind==='monk_imp'?'monkImp':kind==='monk_flag'?'monkFlag':kind.startsWith('monk')?'monk':kind==='kongfu_boss_explode'?'boss':kind==='kongfu_chi'?'kongfuChi':kind==='kongfu_bomb'?'kongfuBomb':kind==='kongfu_drink'?'kongfuDrink':kind==='kongfu_gong'?'kongfuGong':kind==='kongfu_bronze_statue'?'kongfuStatue':kind==='kongfu_bronze_strong'?'kongfuStrong':kind==='kongfu_torch'?'kongfuTorch':kind==='kongfu_hammer'?'kongfuHammer':kind==='kongfu_rocket_imp'?'kongfuRocket':kind==='kongfu_flag'?'kongfuFlag':kind.startsWith('kongfu')?'kongfu':kind.startsWith('lostcity_lostpilot_veteran')?'lostPilotVeteran':kind==='zoybean_gargantuar'?'zoybeanGarg':kind.startsWith('zoybean')?'zoybean':kind==='lostcity_crystalskull'?'lostCrystal':kind==='lostcity_relichunter'?'lostRelic':kind==='lostcity_impporter'?'lostPorter':kind==='lostcity_gargantuar'?'lostGargantuar':kind==='lostcity_excavator'?'lostExcavator':kind==='lostcity_jane'?'lostJane':kind==='lostcity_imp'?'lostImp':kind==='lostcity_lostpilot'?'lostPilot':kind==='lostcity_flag'?'lostcityFlag':kind.startsWith('lostcity')?'lostcity':kind==='iceage_hunter_veteran'?'iceageHunterVeteran':kind==='iceage_troglobite_veteran'?'iceageTroglobiteVeteran':kind==='iceage_weaselhoarder'?'iceageWeaselHoarder':kind==='iceage_weasel'?'iceageWeasel':kind==='iceage_troglobite'?'iceageTroglobite':kind==='iceage_dodo'?'iceageDodo':kind==='iceage_gargantuar'?'iceageGargantuar':kind==='iceage_hunter'?'iceageHunter':kind==='iceage_imp'?'iceageImp':kind==='iceage_flag'?'iceageFlag':kind.startsWith('iceage')?'iceage':kind==='beach_fisherman'?'beachFisher':kind==='beach_octopus'?'beachOctopus':kind==='beach_surfer_veteran'?'beachSurferVeteran':kind==='beach_surfer'?'beachSurfer':kind==='beach_snorkel'?'beachSnorkel':kind==='beach_gargantuar'?'beachGargantuar':kind==='beach_flag'?'beachFlag':kind==='beach_imp'?'beachImp':kind.startsWith('beach_fem')?'beachFemale':kind.startsWith('beach')?'beach':kind==='dark_king_veteran'?'darkKingVeteran':kind==='dark_wizard_veteran'?'darkWizardVeteran':kind==='dark_king'?'darkKing':kind==='dark_imp_dragon'?'dragonImp':kind==='dark_wizard'?'darkWizard':kind==='dark_gargantuar'?'darkGargantuar':kind==='dark_juggler'?'darkJester':kind==='dark_imp'?'darkImp':kind==='dark_flag'?'darkFlag':kind.startsWith('dark')?'dark':kind==='future_jetpack_veteran'?'jetpackVeteran':kind==='football_mech'?'footballMech':kind==='future_gargantuar'?'futureGargantuar':kind==='disco_mech'?'discoMech':kind==='future_jetpack_disco'?'discoJetpack':kind==='future_jetpack'?'futureJetpack':kind==='future_protector'?'futureProtector':kind==='future_protector_shield'?'futureShield':kind==='future_imp'?'futureImp':kind==='mech_cone'?'mechCone':kind==='future_flag'?'futureFlag':kind.startsWith('future')?'future':kind==='west_bull_veteran'?'blackBull':kind==='west_bull'?'bull':kind==='cowboy_gargantuar'?'cowboyGargantuar':kind==='west_bullrider'?'cowboyImp':kind==='chicken_farmer'?'chickenFarmer':kind==='chicken'?'chicken':kind==='chicken_pumpkin'?'chickenPumpkin':kind==='cowboy_flag'?'cowboyFlag':kind.startsWith('cowboy')?'cowboy':kind.startsWith('poncho')?'poncho':kind==='prospector'||kind==='piano'?kind:kind==='pirate_captain'?'pirateCaptain':kind==='pirate_captain_parrot'?'pirateParrot':kind==='barrelroller'?'barrelroller':kind==='pirate_barrel'?'pirateBarrel':kind==='pirate_gargantuar'?'pirateGargantuar':kind==='pirate_imp'?'pirateImp':kind==='cannon'?'impCannon':kind==='pirate_flag'?'pirateFlag':kind.startsWith('pirate')?'pirate':kind==='swashbuckler'||kind==='seagull'||kind==='pelican'?kind:kind.startsWith('zombossmech_')?'boss':kind==='explorer_veteran'?'torchlight':kind==='pharaoh_weak'?'pharaohWeak':kind==='pharaoh'?'pharaoh':kind==='pharaoh_inner'?'pharaohInner':kind.endsWith('_touch')?'camelTouch':kind.startsWith('camel_')?'camel':kind==='egypt_gargantuar'?'gargantuar':kind==='egypt_imp'?'imp':kind==='explorer'?'explorer':kind==='tomb_raiser'?'tombraiser':kind==='ra'?'ra':'mummy';
export function battleActors(level:Level,plants:readonly PlantKind[]){
  const names=new Set(['peashooter','sunflower','wallnut','potatomine','mummy','ra',...plants,...level.waves.flat().map(zombieRig),...level.actions.flat().flatMap(a=>a.cargo?.map(c=>zombieRig(c.Type))??[]),...level.frozenZombies.map(z=>zombieRig(z.kind))]);
  if(level.world==='kongfu'){names.add(level.day>=33?'abbotFlag':level.day>=17?'monkFlag':'kongfuFlag');names.add('kongfu');if(level.day>=17)names.add('monk');if(level.day>=33)names.add('abbot');if(level.bronzeStatues.length){names.add('kongfuStatue');for(const t of level.bronzeStatues)for(const z of t.ZombiesToSpawn)names.add(zombieRig(z));}const racks=[...level.graves.map(t=>t.kind),...level.actions.flat().flatMap(a=>a.graveTypes??[])];if(racks.includes('kongfu_rack_bomb')||names.has('kongfuGong'))names.add('kongfuBomb');if(racks.includes('kongfu_rack_torch'))names.add(level.day>=33?'abbotTorch':level.day>=17?'monkTorch':'kongfuTorch');if(racks.includes('kongfu_rack_blade'))names.add('monkBlade');if(racks.includes('kongfu_rack_nunchaku'))names.add('monkNunchaku');if(racks.includes('kongfu_rack_3section_staff'))names.add('abbotStaff');if(racks.includes('kongfu_rack_fan'))names.add('abbotFan');if(racks.includes('kongfu_rack_hammer'))names.add('kongfuHammer');}
  if(names.has('bamboozle'))names.add('bamboobusket');
  if(names.has('kongfuBronzeChi'))for(const n of ['kongfuHammer','kongfuTorch','kongfuBomb','kongfuDrink','monkBlade','monkTorch','monkNunchaku','monkDrink'])names.add(n);
  if(level.world==='eighties')names.add('eightiesFlag');
  if(level.world==='lostcity')names.add('lostcityFlag');
  if(plants.includes('zoybeanpod'))for(const n of ['zoybean','zoybeanGarg'])names.add(n);
  if(names.has('lostPorter'))names.add('lostcity');
  if(names.has('lostGargantuar'))names.add('lostImp');
  if(level.world==='iceage')names.add('iceageFlag');
  if(names.has('iceageWeaselHoarder'))names.add('iceageWeasel');
  if(names.has('iceageTroglobiteVeteran')){names.add('iceageHunter');names.add('iceageHunterVeteran');}
  if(names.has('iceageGargantuar')||names.has('iceageTroglobite'))names.add('iceageImp');
  if(level.world==='beach')names.add('beachFlag');
  if(names.has('beachGargantuar'))names.add('beachImp');
  if(level.initialPlants.some(p=>p.kind==='lilypad'))names.add('lilypad');
  if(level.world==='pirate')names.add('pirateFlag');
  if(level.world==='west')names.add('cowboyFlag');
  if(level.world==='dark'){names.add('darkFlag');if(names.has('hypnoshroom')||names.has('darkGargantuar')){names.add('darkGargantuar');names.add('darkImp');}}
  if(level.world==='future')names.add('futureFlag');
  if(names.has('jetpackVeteran'))names.add('future');
  if(names.has('futureGargantuar'))names.add('futureImp');
  if(names.has('beachSurferVeteran'))names.add('beachSnorkel');
  if(names.has('discoMech'))names.add('discoJetpack');
  if(names.has('futureProtector'))names.add('futureShield');
  if(names.has('cowboyGargantuar')||names.has('bull')||names.has('blackBull'))names.add('cowboyImp');
  if(names.has('chickenFarmer')){names.add('chicken');names.add('chickenPumpkin');}
  if(names.has('pirateCaptain'))names.add('pirateParrot');
  if(names.has('barrelroller'))names.add('pirateBarrel');
  if(['barrelroller','pirateGargantuar','impCannon'].some(n=>names.has(n)))names.add('pirateImp');
  if(level.boss?.kind==='kongfu_boss_chi')for(const name of ['boss','abbot','abbotFlag','abbotFan','abbotStaff','abbotTorch','abbotChi','abbotImp','kongfuGong','kongfuBomb','kongfuBronzeChi','kongfuHammer','kongfuDrink','monk','monkBlade','monkNunchaku','monkDrink','monkTorch','kongfuTorch'])names.add(name);
  else if(level.boss?.kind==='kongfu_boss_blade')for(const name of ['boss','monk','monkFlag','monkBlade','monkTorch','monkNunchaku','monkImp','monkDrink','kongfuBomb','kongfuChi','kongfuHook'])names.add(name);
  else if(level.boss?.kind==='kongfu_boss_explode')for(const name of ['boss','kongfu','kongfuTorch','kongfuHammer','kongfuChi','kongfuBomb','kongfuGong','kongfuDrink','kongfuStrong','kongfuRocket'])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_lostcity'))for(const name of ['boss','lostcity','lostJane','lostExcavator','lostPorter','lostCrystal','lostPilot',...(level.boss.kind==='zombossmech_lostcity2'?['lostPilotVeteran','lostImp','lostGargantuar']:[])])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_iceage'))for(const name of ['boss','iceage','iceageImp','iceageHunter','iceageWeasel','iceageDodo',...(level.boss!.kind==='zombossmech_iceage2'?['iceageHunterVeteran']:[])])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_pirate'))for(const name of ['boss','pirate','pirateCaptain','pirateParrot','pirateGargantuar','pirateImp','barrelroller','pirateBarrel'])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_cowboy'))for(const name of ['boss','cowboy','prospector','piano','poncho','cowboyGargantuar','cowboyImp','chickenFarmer','chicken','chickenPumpkin'])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_future'))for(const name of ['boss','future','futureJetpack','futureProtector','futureShield','futureImp','futureGargantuar','footballMech'])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_dark'))for(const name of ['boss','dark','darkImp','darkGargantuar','darkJester','darkWizard','dragonImp'])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_beach'))for(const name of ['boss','beach','beachFemale','beachSurfer','beachSnorkel','beachImp','beachGargantuar','beachOctopus'])names.add(name);
  else if(level.boss)for(const name of ['boss','mummy','gargantuar','imp','tombraiser','explorer','torchlight','pharaoh','pharaohInner'])names.add(name);
  if(level.memory||names.has('darkKingVeteran'))names.add('dark');
  if(level.memory)names.add('darkImp');
  if(level.boss?.kind==='zombossmech_dark2')for(const name of ['darkKing','darkKingVeteran','darkWizardVeteran'])names.add(name);
  if(level.boss?.kind==='zombossmech_cowboy2')names.add('blackBull');
  if(level.boss?.kind==='zombossmech_future2')for(const name of ['jetpackVeteran','discoMech','discoJetpack','mechCone'])names.add(name);
  if(level.boss?.kind==='zombossmech_beach2'){names.add('beachSurferVeteran');names.add('beachFisher');}
  if(names.has('gargantuar')){names.add('imp');names.add('pharaohInner');}
  if(names.has('pharaoh')||names.has('pharaohWeak'))names.add('pharaohInner');
  return [...names];
}
export function battleEffects(level:Level,plants:readonly PlantKind[]){
  const names=new Set(['food']);
  if(level.world==='eighties')for(const n of ['eightiesLawn','eightiesCone','eightiesBucket','mower'])names.add(n);
  if(plants.includes('thymewarp'))names.add('thymeTeleport');
  if(plants.includes('phatbeet'))for(const n of ['phatWave','phatHit'])names.add(n);
  if(plants.includes('cactus'))for(const n of ['cactusShot','cactusShot1','cactusShot2','cactusFood'])names.add(n);
  if(level.bowlingLine!==null){names.add('bowlingLine');names.add('bowlingSign');}
  if(plants.some(p=>p==='bowlingbulb'||p.startsWith('tool_projectile_bowlingbulb')))for(const n of ['bowling0','bowling1','bowling2','bowling_pf'])names.add(n);
  if(level.waves.flat().includes('lostcity_impporter')||level.actions.flat().some(a=>a.cargo?.some(c=>c.Type==='lostcity_impporter'))||level.boss?.kind.startsWith('zombossmech_lostcity'))for(const name of ['lostTent','lostBackpack'])names.add(name);
  if(level.world==='kongfu')for(const n of ['kongfuHelmet','kongfuLawn','kongfuCone','kongfuBucket','mower','taichi','kongfuRack'])names.add(n);
  if(level.actions.flat().some(a=>a.mode==='chiHole'))names.add('chiHole');
  if(level.tnt)for(const n of ['kongfuTNT','tntRope','tntSpark'])names.add(n);
  if(level.world==='lostcity')for(const n of ['lostcityLawn','lostcityNightLawn','lostcityCone','lostcityBucket','shovelDrop','mower','goldtile'])names.add(n);
  if(level.world==='iceage')for(const n of ['iceageHelmet','hunterSnowball','frostWind','icePrepare','iceageLawn','mower','iceageCone','iceageBucket','sliderUp','sliderDown','sliderUpBack','sliderDownBack','icePlant','iceZombie','icePlantBack','iceZombieBack','iceBreak','hotVapour','hotPuddle'])names.add(n);
  if(level.world==='beach')for(const n of ['beachLawn','mower','beachCone','beachBucket','tide','tideLine','tideSign'])names.add(n);
  if(level.world==='dark')for(const n of ['darkLawn','mower','darkCone','darkBucket','darkHelmet','darkBricks','graveSun','graveFood'])names.add(n);
  if(level.world==='future')for(const n of [(level.sunBomb||[8,11,16,22,25,27,31,35].includes(level.day))?'futureNightLawn':'futureLawn','mower','futureCone','futureBucket',...new Set(level.powerTiles.flatMap(t=>['tile_'+t.group,'tile_'+t.group+'Flash','tile_'+t.group+'Dot']))])names.add(n);
  if((level.world==='lostcity'||level.world==='iceage'||level.world==='beach')&&level.day===16)names.add('zombossicon');
  if(level.world==='kongfu'&&level.day===40)names.add('zombossicon');
  if(level.world==='dark'&&level.day===10)names.add('zombossicon');
  if(level.waves.flat().some(z=>z.startsWith('dark_king'))||level.boss?.kind==='zombossmech_dark2')names.add('knightEffect');
  if(level.waves.flat().some(z=>z==='dark_wizard'||z==='dark_wizard_veteran')||level.boss?.kind.startsWith('zombossmech_dark'))for(const n of ['wizardSheep','wizardLink','wizardHit'])names.add(n);
  if(level.extraPotions.some(p=>p.PotionTypes.includes('zombiepotion_invisibility')))names.add('potionInvisibility');
  if(level.memory){names.add('grave');names.add('memoryImp');names.add('dirtSpawn');}
  if(level.potions)for(const n of ['potionSpeed','potionToughness'])names.add(n);
  if(level.sunBomb)for(const n of ['sunbomb','sunbombRay','sunbombBlast'])names.add(n);
  if(level.rails)for(const name of ['rail','cart'])names.add(name);
  if(level.waves.flat().includes('iceage_armor4'))names.add('iceageBricks');
  if(level.waves.flat().some(z=>z==='beach_armor4'||z==='beach_fem_armor4'))names.add('beachBricks');
  if(level.corral)for(const name of ['fenceHere','fenceThere'])names.add(name);
  if(level.world==='west')for(const name of ['cowboyLawn','mower','cowboyCone','cowboyBucket','rail','cart','prospectorSmoke','prospectorTail','ponchoBreak','plateDrop','cowboyHat'])names.add(name);
  if((level.world==='west'||level.world==='future'||level.world==='kongfu')&&level.day===8)names.add('zombossicon');
  if(level.waves.flat().includes('chicken_farmer')||level.boss?.kind.startsWith('zombossmech_cowboy'))names.add('chickenAsh');
  if((level.world==='pirate'||level.world==='egypt')&&level.day===8)names.add('zombossicon');
  if(level.world==='pirate')for(const name of ['pirateLawn','mower','pirateCone','pirateBucket','seaSplash'])names.add(name);
  if(level.waves.flat().includes('pirate_armor4')||level.boss?.kind==='zombossmech_pirate2')names.add('pirateBricks');
  const actors=new Set(battleActors(level,plants)),actions=level.actions.flat();
  if(actors.has('eightiesGlitter'))for(const n of ['glitterTrail','glitterHit'])names.add(n);
  if(actors.has('eightiesPunk')&&plants.includes('magnetshroom'))names.add('punkHead');

  if(actors.has('beachSurferVeteran'))for(const name of ['surfboardVeteran','surfboardBreakVeteran','surfboardThrowVeteran'])names.add(name);
  if(actors.has('beachSurfer'))for(const name of ['surfboard','surfboardBreak','surfboardThrow'])names.add(name);
  if(actors.has('beachFisher'))for(const name of ['fisherHook','fisherWire'])names.add(name);
  if(actors.has('beachOctopus'))for(const name of ['octopus','octopusShot'])names.add(name);
  if(level.waves.flat().includes('cowboy_armor4')||level.boss?.kind==='zombossmech_cowboy2')names.add('cowboyBricks');
  if((level.waves.flat().includes('future_armor4')||level.boss?.kind==='zombossmech_future2'))names.add('futureBricks');
  if(actors.has('lostCrystal'))names.add('crystalRay');
  if(level.trapTiles.length)for(const name of ['trapFlame','trapBoulder','boulder','jalapenoFire'])names.add(name);
  if(level.boss?.kind==='zombossmech_lostcity2'||level.waves.flat().some(z=>z==='lostcity_armor4'||z==='lostcity_bug_armor4')||level.actions.flat().some(a=>a.cargo?.some(c=>c.Type==='lostcity_armor4')))names.add('lostcityBricks');
  if(level.trapTiles.some(t=>t.group==='thunder'))for(const n of ['trapThunder','thunderStrike'])names.add(n);
  if(actors.has('abbotTorch'))names.add('abbotFire');
  if(actors.has('abbotStaff'))names.add('staffShield');
  if(actors.has('abbotFan'))for(const n of ['fanStorm','fanStormBack'])names.add(n);
  if(actors.has('abbotChi'))names.add('abbotShot');
  const plantEffects:Partial<Record<PlantKind,string[]>>={cantaloupe:['cantaloupeShot','cantaloupeFood','cantaloupeSplash','cantaloupeShoot'],bamboozle:['bamboozleShot'],solarsage:['sageSpirit'],lychee:['lycheeHit','lycheeMetal'],peach:['peachHeal','peachShield'],bambooshoot:['bamboo','bambooPF'],firegourd:['gourdFire'],bloominghearts:['blooming_heart','blooming_heart_pf'],zoybeanpod:['zoybeanCone','zoybeanBucket','zoyFog'],snowpea:['snowPea'],toadstool:['toadTongue'],primalpeashooter:['primalPea'],
    akee:['akeeShot','akeeFood'],gatling:['firePea','bluePea'],lavaguava:['lava','lavaCrack','plantHeat'],firepeashooter:['firePea','firePeaHit','plantHeat','jalapenoFire'],stunion:['stunionSpawn','stunionPush','chiliStun'],pepperpult:['pepper','pepper_pf','plantHeat'],moonflower:['moonShield'],seashooter:['seaPea'],goldleaf:['goldtile'],ghostpepper:['ghost','ghostFog'],coldsnapdragon:['coldBreath','coldFood'],
    missiletoe:['missiletoeShot','missiletoeHit','missiletoeTarget'],seashroom:['seashroom_spore','seashroom_sporeHit'],homingthistle:['thistle','thistleFood'],tanglekelp:['kelpHands'],guacodile:['guacShot','guacRunner'],jackolantern:['jackFire','jackFood'],scaredyshroom:['scaredyShot','scaredyFood'],peanut:['peanutShot'],sunbean:['sunbeanBlast'],fumeshroom:['fumeShot','fumeFood','fumeHit'],applemortar:['appleShot','appleFood','appleHit','appleFoodHit'],electricblueberry:['blueberryCloud'],pinkstarfruit:['pinkShot','pinkFood','pinkHit','pinkFoodHit'],redstinger:['redShot','redWeak','redHit','redRay'],powerplant:['tile_epsilon','tile_epsilonFlash','tile_epsilonDot'],starfruit:['starShot','starFood','starHit','starFoodHit'],holonut:['infinutShield'],powerplant_alpha:['tile_alpha','tile_alphaFlash','tile_alphaDot'],powerplant_beta:['tile_beta','tile_betaFlash','tile_betaDot'],citron:['citronShot','citronFood','citronHit','citronFoodHit','citronToss','citronLightning'],empea:['empBlast','empEffect'],laser_bean:['laserBeam','laserDirt'],shadowshroom:['shadowExpl'],hurrikale:['windUpper','windLower'],puffshroom:['puffshroom_spore','puffshroom_sporeHit'],banana:['bananaShot','bananaHit','bananaTarget'],electriccurrant:['currantLine','currantCenter','currantHit'],
    electricpeashooter:['electricpea','electricpea_pf','electricpea_small','electricFoot','electricLink','electricHit','electricBigHit','electricSmallHit'],magnetshroom:['cowboyBucket','plateDrop'],magnifyinggrass:['magnifying_grass','grassHit','grassFrom','grassTo','grassAbsorb','grassRay'],wintermelon:['winter_melon','winter_melon_pf'],chilibean:['chiliFart','chiliStun'],splitpea:['megaPea'],xshot:['rotobaga','rotobagaFood'],chardguard:['chardHand'],dandelion:['dandelionShot','dandelionFood','dandelionExplosion','dandelionFoodExplosion','dandelionThrow'],jalapeno:['jalapenoFire'],lightningreed:['reedCloud','reedHit','reedLink'],escaperoot:['grapeshot','escapeGrapeExplosion','cherryExplosion'],spikerock:['rockFood'],spikeweed:['spikeFood'],snapdragon:['snapFire','snapFood','snapBall'],coconutcannon:['coconut','coconutHit','coconutFood','coconutFoodHit'],iceburg:['iceTrap'],iceweed:['iceSaw','iceTrap'],snowdrop:['snowdrop','snowdrop_freeze','iceTrap'],
    sapfling:['sapfling','sapfling_pf','sapTile'],parsnip:['parsnip_child','parsnip_child_small'],cherry_bomb:['cherryExplosion'],
    kernelpult:['corn','butter','butter2'],melonpult:['melon','melon_pf'],cabbagepult:['cabbage'],bloomerang:['boomerang'],
  };
  for(const plant of plants)for(const effect of plantEffects[plant]??[])names.add(effect);
  if(actors.has('futureGargantuar'))for(const name of ['gargEye','gargHit','gargRay'])names.add(name);
  if(actors.has('discoMech'))names.add('dirtSpawn');
  if(level.boss?.kind==='kongfu_boss_chi')for(const name of ['chiBossRack','chiBossRackHit','chiBossRay','chiBossRayHit','chiBossHole','chiBossStuck','chiBossShield','chiBossShieldBack','abbotShot','bossTarget','zombossicon','dirtSpawn'])names.add(name);
  else if(level.boss?.kind==='kongfu_boss_blade')for(const name of ['bladeChi','bladeBoomerang','bladeLink','bossEscape','zombossicon','dirtSpawn'])names.add(name);
  else if(level.boss?.kind==='kongfu_boss_explode')for(const name of ['kongfuBossBomb','kongfuBombSmall','kongfuBombBig','bossTarget','bossEscape','zombossicon','dirtSpawn'])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_lostcity'))for(const name of ['bossEscape','zombossicon','sandbag','planeShade','dirtSpawn'])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_iceage'))for(const name of ['bossEscape','zombossicon','bossTarget','glacierUp','glacierMid','glacierDown','glacierBlock','iceberg','icebergHit','dirtSpawn'])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_pirate'))for(const name of ['bossEscape','bossPortal','zombossicon','dirtSpawn'])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_future')||level.boss?.kind.startsWith('zombossmech_cowboy'))for(const name of ['bossMissile','bossMissileImpact','bossTarget','bossEscape','bossPortal','zombossicon','dirtSpawn'])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_dark'))for(const name of ['bossMissile','bossEscape','jalapenoFire','dragonFire','dragonIntroFire','dragonShade','zombossicon','dirtSpawn'])names.add(name);
  else if(level.boss?.kind.startsWith('zombossmech_beach'))for(const name of ['bossEscape','beachShark','bossDive','bossCut','bossSuction','zombossicon','dirtSpawn'])names.add(name);
  else if(level.boss)for(const name of ['bossMissile','bossTarget','bossEscape','bossPortal','zombossicon'])names.add(name);
  if(level.flowerLine!==null)names.add('flower');
  if(level.mold.length)names.add('mold');
  if(level.protectedPlants.length)names.add('endangered');
  if(level.conveyor)names.add('conveyor');
  if(actors.has('gargantuar')||actors.has('pharaoh')||actors.has('pharaohWeak'))names.add('pharaohBreak');
  if(actors.has('tombraiser')){names.add('tombBone');names.add('dirtSpawn');}
  if(level.graves.length||level.randomGraves||actors.has('tombraiser')||actions.some(a=>a.mode==='graves'))names.add('grave');
  if(level.match||actions.some(a=>['ground','graveZombies','graves'].includes(a.mode)||a.zombies.some(z=>z.column!==undefined)))names.add('dirtSpawn');
  if(actions.some(a=>a.mode==='storm'))names.add(level.world==='iceage'?'snowstorm':'sandstorm');
  if(level.powerups)for(const name of ['iceTrap','dirtSpawn','sprout','powerSnow','snowHit','cherryExplosion','wizardFinger','wizardPoint','tossPar','flameFinger','flameSquare'])names.add(name);
  return [...names];
}
