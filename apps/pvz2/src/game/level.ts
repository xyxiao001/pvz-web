import boardGridMaps from '../../public/assets/campaign/board-grid-maps.json';
export const PLANT_KINDS = ['pinkstarfruit','redstinger','powerplant','starfruit','holonut','powerplant_alpha','powerplant_beta','citron','empea','laser_bean','blover','shadowshroom','stallia','hurrikale','sunshroom','puffshroom','banana','electriccurrant','hypnoshroom','electricpeashooter','magnetshroom','magnifyinggrass','tallnut','wintermelon','splitpea','chilibean','sunflower', 'peashooter', 'wallnut', 'potatomine', 'cabbagepult', 'bloomerang', 'iceburg', 'gravebuster', 'twinsunflower', 'iceweed', 'bonkchoy','repeater','kernelpult','melonpult','snowdrop','imitater','peapod','cherry_bomb','celerystalker','parsnip','sapfling','snapdragon','coconutcannon','spikeweed','springbean','threepeater','spikerock','escaperoot','xshot','chardguard','dandelion','jalapeno','lightningreed'] as const;
export type PlantKind = typeof PLANT_KINDS[number];
export type ZombieKind = 'future_armor4'|'future_jetpack_veteran'|'football_mech'|'future_infinut_shield'|'future_gargantuar'|'disco_mech'|'future_jetpack_disco'|'future'|'future_armor1'|'future_armor2'|'future_flag'|'future_jetpack'|'future_protector'|'future_protector_shield'|'future_imp'|'mech_cone'|'west_bull_veteran'|'west_bull'|'cowboy_gargantuar'|'west_bullrider'|'chicken_farmer'|'chicken'|'chicken_pumpkin'| 'cowboy'|'cowboy_armor1'|'cowboy_armor2'|'cowboy_armor4'|'cowboy_flag'|'prospector'|'piano'|'poncho'|'poncho_plate'|'poncho_no_plate'|'pelican'|'pirate_armor4'|'pirate_captain'|'pirate_captain_parrot'|'barrelroller'|'pirate_barrel'|'pirate_gargantuar'|'pirate_imp'|'cannon'|'pirate'|'pirate_armor1'|'pirate_armor2'|'pirate_flag'|'swashbuckler'|'seagull' | 'mummy' | 'mummy_armor1' | 'mummy_armor2' | 'mummy_flag' | 'ra' | 'camel_onehump' | 'camel_twohump' | 'camel_manyhump' | 'camel_onehump_touch' | 'camel_twohump_touch' | 'camel_threehump_touch' | 'egypt_gargantuar' | 'egypt_imp' | 'explorer' | 'tomb_raiser' | 'pharaoh' | 'pharaoh_inner' | 'camel_manyhump_touch' | 'mummy_armor4' | 'explorer_veteran' | 'pharaoh_weak' | 'zombossmech_cowboy2'|'zombossmech_cowboy'|'zombossmech_pirate'|'zombossmech_pirate2' | 'zombossmech_future' | 'zombossmech_egypt' | 'zombossmech_egypt2';
export const BOARD = { width: 1200, height: 700, left: 190, top: 160, cellWidth: 82, cellHeight: 98, columns: 9, rows: 5 };
export const cellX = (column: number) => BOARD.left + (column + .5) * BOARD.cellWidth;
export const rowY = (row: number) => BOARD.top + row * BOARD.cellHeight + 80;

export interface PlantProperties {
  DamageScale0:number;DamageScale1:number;DamageScale2:number;PFDuration:number;PFDPS:number;
  CannotBePushedByFootballMech?:boolean;DelayBeforeRegenFromDamage:number;DelayBeforeRecoverFromDeath:number;StunDuration:number;BlowDuration:number;
  PoisonDuration:number;PoisonDPS:number;PerfumeDuration:number;PerfumeDurationPlantfood:number;PushDuration:number;LifeSpan:number;SunValueList:number[];GrowTime0_1:number;GrowTime1_2:number;HypnoedZombieDamageScale:number;DirectDamageInterval:number;
  ShootSunCost:number;PlantfoodDurationExtendPerProducer:number;SunProducerList:PlantKind[];PlantfoodAbsorbDuration:number;PlantfoodThrowDamage:number;
  PlantfoodPeaCountBack:number;ChiliStunDuration:number;
  MaxBounceTime:number;BounceDistance:number;SplashDamage:number;SplashCount:number;Duration:number;
  DamagePrimal:number;MaxSpike:number;KnockbackDistance:number;PlantfoodDuration:number;PlantfoodSideDPS:number;RestTime:number;AttackIntervalAdditional:number;
  PlantfoodChildrenCount:number;RetractionDelay:number;DamagePerHit:number;DamagePerSnip:number;PlantfoodSummonCount:number;
  CabbageType:string;CabbageTypePlantfood:string;ButterType:string;ChanceToButter:number;
  SunCostList:number[];SunCost: number; Cooldown: number; CooldownFrom: number; Toughness: number;
  ShootInterval: number; ShootIntervalAdditional: number; PlantfoodPeaCount: number;
  SunValue: number; PlantfoodTime:number; ProduceInterval: number; ProduceIntervalAdditional: number;
  ProduceCountdownStart: number; ProduceCountdownStartAdditional: number;
  ChargeTime: number; Damage: number; ArmorToughness: number;
  DamageHeavy:number;DamagePlantfood:number;PlantfoodHitCount:number;ZombieDetectorWidth:number;TombDetectorWidth:number;
  BustTime:number;AttackInterval:number;ChillDuration:number;DamagePowered:number;PlantfoodDPS:number;PlantfoodDragSPS:number;
  ThrowInterval:number; ThrowIntervalAdditional:number; PierceCount:number; PlantfoodBoomerangCount:number; FreezeDuration:number;
}
export interface ZombieProperties { PushFailDamage:number; CannotBeTossedByCitron?:boolean;EMPStunTimeScale?:number;SummonDuration:number;DanceCountdown:number;DanceDuration:number;EyeLaserDelayBetweenShots:number;EyeLaserMaxColumn:number;EyeLaserMinDistance:number;EyeLaserSweepLength:number;EyeLaserSweepTime:number;EyeLaserTotalDamage:number; ShieldRecoverTime:number;ShieldKillStunTime:number; BullRammingDamage:number;FoeEatDamageReflectPct:number; BullRunAgainDelay:number;RushSPS:number;ImpThrowDistance:number; ChickeningDuration:number;ChickeningDurationVariance:number;ChickeningHealthPercentage:number;ChickeningInterval:number;ChickeningIntervalVariance:number;SplashDamageToPlants:number;SplashDamageToZombies:number; CowboyPianoActionInterval:number;ExplodeCountdown:number;LandingStunnTime:number;ShieldToughness:number;PonchoToughness:number;ChanceToPlate:number; ParrotCooldown:number;ParrotRetryCooldown:number;FlyingSpeed:number; TimeBefore:number;TimeBeforeAdditional:number;ShootInterval:number;ShootIntervalAdditional:number;MaxImpCount:number;MaxImpCountAdditional:number;ExplodeImpCount:number;ExplodeImpCountAdditional:number;ShootColumns:number[];ExplodeColumns:number[]; ChooseToSpawnOnNonDeckRows?:boolean;ChanceToFallIntoSea:number;LandingColumns:number[]; NormalDeathWhenMowed?:boolean;WavePointCost:number;Weight:number;CannotCarryPlantfoodsInWaves?:boolean;ZombossStages:BossStage[];ZombossMechLevel:number;MissileType:string; Toughness: number; WalkSPS: number; EatDPS: number; MaxAbsorbValue: number;TeamMemberCount:number[];SmashDamage:number;FireDPS:number;TimeBetweenGroups:number;TimeBetweenGroupsAdditional:number }
export interface BossAction {actionName:'walk'|'rush'|'shoot'|'summon';weight:number;repeatMax:number;repeatMin:number;summonProps:{pointMin:number;pointMax:number;zombieList:ZombieKind[]}}
export interface BossStage {HitPoints:number;AnimRateModifier:number;ChilledDurationFromFrozen:number;MinIdleTime:number;MaxIdleTime:number;StunTime:number;StunDamageScale:number;StunStaggerBackMovement:number;StunStaggerBackTime:number;Actions:BossAction[]}
export interface PowerProperties { TotalTime:number; DPS:number; TimePerUse:number; FlamethrowerNormalDPS:number; GroundFlameNormalDPS:number; GroundFlameDuration:number }
export interface Properties {
  plantAnimations:Record<string,Record<string,{duration:number;events:{at:number;name:string}[]}>>;
  plants: Record<PlantKind, PlantProperties>;
  zombies: Record<ZombieKind, ZombieProperties>;
  armors: { future_armor4:{Toughness:number}; future_armor1:{Toughness:number};future_armor2:{Toughness:number}; cowboy_armor4:{Toughness:number}; cowboy_armor1:{Toughness:number};cowboy_armor2:{Toughness:number};pirate_armor4:{Toughness:number}; pirate_armor1:{Toughness:number};pirate_armor2:{Toughness:number};egypt_armor1: { Toughness: number }; egypt_armor2:{Toughness:number};egypt_armor4:{Toughness:number} };
  grave: {Toughness:number};
  projectiles:Record<string,{ElectricInterval:number;ElectricDamage:number;ElectricTargetCount:number;ChildCount:number;MaxHitCount:number;Damage:number;DamagePerHit:number;TileLiquid:{Type:string;Duration:number};BoneCount:{Min:number;Max:number};FreezeDuration:number;ChillDuration:number;SplashDamage:{Damage?:number;ChillDuration?:number;FreezeDuration?:number;Range:{w:number;h:number}}[];ButterDuration:number}>;
  powerups:Record<string,PowerProperties>;
}
export interface SourceLevel { objects: { objclass: string; aliases?: string[]; objdata: Record<string, unknown> }[] }
export interface SpawnAction {
  mode:'spider'|'raid'|'walk'|'storm'|'ground'|'graves'|'graveZombies'|'conveyor';add?:ConveyorPlant[];remove?:PlantKind[];graveCount?:number;positions?:{row:number;column:number}[];wait?:number;spiderDuration?:number;gridTypes?:string[]; zombies:{kind:ZombieKind;row:number|null;behind?:boolean;column?:number}[]; food:number;
  columnStart:number;columnEnd:number;groupSize:number;interval:number;
}
export interface ConveyorPlant {PlantType:PlantKind;Weight:number;MaxDelivered?:number;MinCount?:number;MinWeightFactor?:number;MaxCount?:number;MaxWeightFactor?:number;MaxCountCooldownSeconds?:number}
export interface Conveyor { DropDelayConditions:{Delay:number;MaxPackets:number}[]; InitialPlantList:ConveyorPlant[] }
export interface CannonLevel {SlowdownMovementRate:number;BaseMovementRate:number;BufferDistance:number;MinScore:number;BaseZombieKillScore:number;RowHasCannon:number[];Lanes:{SplinePoints:{x:number;y:number}[]}[];ComboBrackets:{ZombiesKilled:number;ScoreMultiplier:number}[]}
export interface Level {
  powerTiles:{group:'alpha'|'beta'|'gamma'|'delta'|'epsilon';row:number;column:number;delay:number}[];
  sunBomb:{PlantBombExplosionRadius:number;PlantDamage:number;ZombieBombExplosionRadius:number;ZombieDamage:number}|null;
  sunDropper:{InitialSunDropDelay:number;SunCountdownBase:number;SunCountdownIncreasePerSun:number;SunCountdownMax:number;SunCountdownRange:number}|null;
  rails:{Rails:{Column:number;RowStart:number;RowEnd:number}[];Railcarts:{Column:number;Row:number}[]}|null;corral:boolean;
  maxPlantsLost:number|null;world:string;planks:number[]|null;cannon:CannonLevel|null;
  boss:{kind:'zombossmech_future'|'zombossmech_egypt'|'zombossmech_egypt2'|'zombossmech_cowboy2'|'zombossmech_cowboy'|'zombossmech_pirate'|'zombossmech_pirate2';reserved:number;row:number;column:number;deathRow:number;deathColumn:number}|null;
  waves: ZombieKind[][]; actions:SpawnAction[][]; minHealth:number;maxHealth:number;flagInterval:number;
  match:{types:number}|null;suppressFlag:boolean;preset:PlantKind[]|null;initialPlants:{kind:PlantKind;row:number;column:number}[];randomGraves:{count:number;start:number;end:number}|null;
  killChallenge:{seconds:number;count:number}|null;targetSun:number|null;maxPlants:number|null;maxSun:number|null;flowerLine:number|null;blacklist:PlantKind[];lastStand:{sun:number;food:number}|null;
  mold:{row:number;column:number}[];protectedPlants:{kind:PlantKind;row:number;column:number}[];mustProtect:number;
  day:number;graves:{row:number;column:number}[];sunDrops:boolean;mowers:boolean;conveyor:Conveyor|null;powerups:boolean;
}
const reference = (value: string) => value.slice(5, value.indexOf('@'));

// Serialized omissions here are the pinned levelController class defaults. Normal
// difficulty is index 3; authored row numbers are one-based, grid coordinates are not.
export function readLevel(source: SourceLevel): Level {
  const manager:Record<string,unknown> = {MinNextWaveHealthPercentage:.5,MaxNextWaveHealthPercentage:.65,...source.objects.find(o => o.objclass === 'WaveManagerProperties')!.objdata};
  const definition=source.objects.find(o=>o.objclass==='LevelDefinition')!.objdata;
  const modules=definition.Modules as string[];
  const byName = new Map(source.objects.flatMap(o => (o.aliases ?? []).map(name => [name, o] as const)));
  const actions=(manager.Waves as string[][]).map(wave=>wave.filter(name=>!reference(name).startsWith('//')).map(name=>{
    const action=byName.get(reference(name))!,d=action.objdata;
    if(action.objclass==='SpiderRainZombieSpawnerProps')return {mode:'spider' as const,spiderDuration:Number(d.TimeBeforeFullSpawn),zombies:Array.from({length:Number(d.SpiderCount)},()=>({kind:d.SpiderZombieName as ZombieKind,row:null})),food:0,columnStart:Number(d.ColumnStart)-1,columnEnd:Number(d.ColumnEnd)-1,groupSize:Number(d.GroupSize),interval:Number(d.TimeBetweenGroups)};
    if(action.objclass==='RaidingPartyZombieSpawnerProps')return {mode:'raid' as const,zombies:Array.from({length:Number(d.SwashbucklerCount)},()=>({kind:'swashbuckler' as const,row:null})),food:0,columnStart:0,columnEnd:8,groupSize:Number(d.GroupSize),interval:Number(d.TimeBetweenGroups)};
    if(action.objclass==='ModifyConveyorWaveActionProps')return {mode:'conveyor' as const,zombies:[],food:0,columnStart:0,columnEnd:8,groupSize:1,interval:0,add:(d.Add as (ConveyorPlant&{Type:string;ToolType?:string})[]).map(p=>({...p,PlantType:p.ToolType?p.ToolType.replace('tool_powertile_','powerplant_') as PlantKind:reference(p.Type) as PlantKind})),remove:(d.Remove as {Type:string}[]).map(p=>reference(p.Type) as PlantKind)};
    if(action.objclass==='SpawnGravestonesWaveActionProps')return {mode:'graves' as const,zombies:[],food:0,columnStart:0,columnEnd:8,groupSize:1,interval:0,graveCount:(d.GravestonePool as {Count:number}[]).reduce((n,g)=>n+g.Count,0),positions:(d.SpawnPositionsPool as {mX:number;mY:number}[]).map(p=>({column:p.mX,row:p.mY}))};
    if(action.objclass==='SpawnZombiesFromGridItemSpawnerProps')return {mode:'graveZombies' as const,gridTypes:(d.GridTypes as string[]).map(reference),zombies:(d.Zombies as {Type:string}[]).map(z=>({kind:reference(z.Type) as ZombieKind,row:null})),food:Number(d.AdditionalPlantfood),columnStart:0,columnEnd:8,groupSize:1,interval:0,wait:Number(d.ZombieSpawnWaitTime)};
    const mode:SpawnAction['mode']=action.objclass==='StormZombieSpawnerProps'?'storm':action.objclass==='SpawnZombiesFromGroundSpawnerProps'?'ground':'walk';
    const defaults=mode==='storm'?{ColumnStart:4,ColumnEnd:8,GroupSize:2,TimeBetweenGroups:2}:{ColumnStart:0,ColumnEnd:8,GroupSize:1,TimeBetweenGroups:0};
    // SpawnZombiesJitteredWaveAction defaults to an empty list (Pirate 26 raid-only waves).
    const data={...defaults,AdditionalPlantfood:0,Zombies:[],...d};
    return {mode,zombies:(data.Zombies as {Type:string;Row?:string;Column?:string}[]).map(z=>({kind:reference(z.Type) as ZombieKind,row:z.Row===undefined||z.Row==='prev'?null:Number(z.Row)-1,...(z.Row==='prev'?{behind:true}:{}),...(z.Column===undefined?{}:{column:Number(z.Column)-1})})),
      food:'DynamicPlantfood' in d?(d.DynamicPlantfood as number[])[3]:Number(data.AdditionalPlantfood),
      columnStart:Number(data.ColumnStart),columnEnd:Number(data.ColumnEnd),groupSize:Number(data.GroupSize),interval:Number(data.TimeBetweenGroups)};
  }));
  const grave=source.objects.find(o=>o.objclass==='GravestoneProperties');
  const conveyor=source.objects.find(o=>o.objclass==='ConveyorSeedBankProperties');
  const seedBank=source.objects.find(o=>o.objclass==='SeedBankProperties')?.objdata;
  const initial=source.objects.find(o=>o.objclass==='InitialPlantProperties');
  const protection=source.objects.find(o=>o.objclass==='ProtectThePlantChallengeProperties');
  const challenge=modules.flatMap(m=>byName.get(reference(m))?.objclass==='StarChallengeModuleProperties'?[byName.get(reference(m))!]:[])[0];
  // Pirate 8 references the shared SaveMowers objective but has no mower module.
  const activeChallenges=challenge?(challenge.objdata.Challenges as string[][])[0].flatMap(name=>name==='RTID(SaveMowers@LevelModules)'?[]:[byName.get(reference(name))!]):[];
  const mold=activeChallenges.find(o=>o.objclass==='MoldColonyChallengeProps');
  const limit=activeChallenges.find(o=>o.objclass==='StarChallengeSimultaneousPlantsProps');
  const killChallenge=activeChallenges.find(o=>o.objclass==='StarChallengeKillZombiesInTimeProps');
  const sunProduced=activeChallenges.find(o=>o.objclass==='StarChallengeSunProducedProps');
  const sunLimit=activeChallenges.find(o=>o.objclass==='StarChallengeSunUsedProps');
  const plantsLost=activeChallenges.find(o=>o.objclass==='StarChallengePlantsLostProps');
  const flowers=activeChallenges.find(o=>o.objclass==='StarChallengeZombieDistanceProps');
  const lastStand=source.objects.find(o=>o.objclass==='LastStandMinigameProperties');
  const match=source.objects.find(o=>o.objclass==='CamelMinigameProperties');
  const boss=source.objects.find(o=>o.objclass==='ZombossBattleModuleProperties')?.objdata;
  const world=reference(definition.StageModule as string).replace(/(?:Night)?Stage$/,'').toLowerCase();
  const planks=source.objects.find(o=>o.objclass==='PiratePlankProperties');
  const cannon=source.objects.find(o=>o.objclass==='CannonMinigameProperties');
  const rails=modules.map(m=>byName.get(reference(m))).find(o=>o?.objclass==='RailcartProperties');
  const powerTiles=source.objects.find(o=>o.objclass==='PowerTileProperties');
  const sunBomb=source.objects.find(o=>o.objclass==='SunBombChallengeProperties');
  const sunDropper=source.objects.find(o=>o.objclass==='SunDropperProperties');
  return {
    powerTiles:powerTiles?(powerTiles.objdata.LinkedTiles as {Group:Level['powerTiles'][number]['group'];Location:{mX:number;mY:number};PropagationDelay:number}[]).map(t=>({group:t.Group,row:t.Location.mY,column:t.Location.mX,delay:t.PropagationDelay})):[],
    sunBomb:sunBomb?sunBomb.objdata as unknown as Level['sunBomb']:null,sunDropper:sunDropper?sunDropper.objdata as unknown as Level['sunDropper']:null,
    rails:rails?rails.objdata as unknown as NonNullable<Level['rails']>:null,corral:modules.some(m=>byName.get(reference(m))?.objclass==='CowboyMinigameProperties'),
    maxPlantsLost:plantsLost?Number(plantsLost.objdata.MaximumPlantsLost):null,world,planks:cannon?[]:planks?planks.objdata.PlankRows as number[]:null,cannon:cannon?cannon.objdata as unknown as CannonLevel:null,
    boss:boss?{kind:boss.ZombossMechType as 'zombossmech_future'|'zombossmech_egypt'|'zombossmech_egypt2'|'zombossmech_cowboy2'|'zombossmech_cowboy'|'zombossmech_pirate'|'zombossmech_pirate2',reserved:Number(boss.ReservedColumnCount),row:(boss.ZombossSpawnGridPosition as {mY:number}).mY,column:(boss.ZombossSpawnGridPosition as {mX:number}).mX,deathRow:Number(boss.ZombossDeathRow),deathColumn:Number(boss.ZombossDeathColumn)}:null,
    killChallenge:killChallenge?{seconds:Number(killChallenge.objdata.Time),count:Number(killChallenge.objdata.ZombiesToKill)}:null,
    targetSun:sunProduced?Number(sunProduced.objdata.TargetSun):null,maxPlants:limit?Number(limit.objdata.MaximumPlants):null,maxSun:sunLimit?Number(sunLimit.objdata.MaximumSun):null,flowerLine:flowers?Number(flowers.objdata.TargetDistance):null,
    blacklist:seedBank?[...('PlantBlackList' in seedBank?seedBank.PlantBlackList as PlantKind[]:[]),...('PlantExcludeList' in seedBank?seedBank.PlantExcludeList as PlantKind[]:[]),...(seedBank.ExcludeListSunProducers==='true'?['sunflower','twinsunflower'] as PlantKind[]:[])]:[],lastStand:lastStand?{sun:Number(lastStand.objdata.StartingSun),food:Number(lastStand.objdata.StartingPlantfood)}:null,
    mold:mold?[...new Map([
      ...('Locations' in mold.objdata?(boardGridMaps.objects.find(o=>o.aliases.includes(reference(mold.objdata.Locations as string)))!.objdata.Values).flatMap((line,row)=>line.flatMap((cell,column)=>cell?[{row,column}]:[])):[]),
      ...('MoldMatrix' in mold.objdata?(mold.objdata.MoldMatrix as string[]).flatMap((line,row)=>[...line].flatMap((cell,column)=>cell==='1'?[{row,column}]:[])):[]),
      ...('MoldedSquares' in mold.objdata?(mold.objdata.MoldedSquares as {GridX:number;GridY:number}[]).map(c=>({row:c.GridY,column:c.GridX})):[]),
    ].map(c=>[`${c.row}:${c.column}`,c])).values()]:[],
    protectedPlants:protection?(protection.objdata.Plants as {PlantType:PlantKind;GridX:number;GridY:number}[]).map(p=>({kind:p.PlantType,row:p.GridY,column:p.GridX})):[],mustProtect:protection?Number(protection.objdata.MustProtectCount):0,
    match:match?{types:Number(match.objdata.CardTypesUsed)}:null,suppressFlag:manager.SuppressFlagZombie===true,
    preset:seedBank?.SelectionMethod==='preset'?(seedBank.PresetPlantList as {PlantType:PlantKind}[]).map(p=>p.PlantType):null,
    initialPlants:initial?(initial.objdata.InitialPlantPlacements as {TypeName:PlantKind;GridX:number;GridY:number}[]).map(p=>({kind:p.TypeName,row:p.GridY,column:p.GridX})):[],
    randomGraves:grave&&'GravestoneCount' in grave.objdata?{count:Number(grave.objdata.GravestoneCount),start:Number(grave.objdata.SpawnColumnStart)-1,end:Number(grave.objdata.SpawnColumnEnd)-1}:null,
    waves:actions.map(w=>w.flatMap(a=>a.zombies.map(z=>z.kind))),actions,
    minHealth:manager.MinNextWaveHealthPercentage as number,maxHealth:manager.MaxNextWaveHealthPercentage as number,flagInterval:manager.FlagWaveInterval as number,
    day:definition.LevelNumber as number,graves:grave&&'ForceSpawnData' in grave.objdata?(grave.objdata.ForceSpawnData as {GridX:number;GridY:number}[]).map(g=>({row:g.GridY,column:g.GridX})):[],
    sunDrops:!!sunDropper||modules.includes('RTID(DefaultSunDropper@LevelModules)'),mowers:modules.includes(`RTID(${world==='pirate'?'Pirate':world==='west'?'West':world==='future'?'Future':'Egypt'}Mowers@LevelModules)`),
    conveyor:conveyor?{...conveyor.objdata as unknown as Conveyor,InitialPlantList:(conveyor.objdata.InitialPlantList as ConveyorPlant[]).map(p=>({...p,PlantType:p.PlantType.replace('tool_powertile_','powerplant_') as PlantKind}))}:null,powerups:source.objects.some(o=>o.objclass==='PowerupTutorialIntroProperties'),
  };
}

export interface SpecialTiming {gargPharaoh:number;gargSmash:number;gargSmashEnd:number;gargThrow:number;gargThrowEnd:number;boneThrow:number;boneEnd:number;graveBust:number;graveFinish:number;graveDie:number;twinProduce:number;twinProduceEnd:number;iceweedShoot:number;iceweedFoodEnd:number}
export interface CampaignTiming { cabbage:number;cabbageDuration:number;cabbageFood:number;cabbageFoodEnd:number;boomerang:number;boomerangDuration:number;boomerangCatch:number;ice:number;iceDuration:number;iceFood:number;iceFoodEnd:number }
export interface BonkTiming {attack:number;heavy:number;foodStart:number;foodHit:number}
export interface AnimationTiming { wallnutArmor:number;wallnutFoodEnd:number; bonk?:BonkTiming; shoot:number;shootDuration:number;produce:number;produceDuration:number;mineGrow:number;mineExplode:number;mineDeath:number;raStart:number;raEnd:number;campaign?:CampaignTiming;special?:SpecialTiming }
export const plantLabels: Record<PlantKind, string> = { pinkstarfruit:'粉红杨桃',redstinger:'红针花', powerplant:'瓷砖萝卜',starfruit:'杨桃',holonut:'全息坚果',powerplant_alpha:'绿色能量瓷砖',powerplant_beta:'红色能量瓷砖',citron:'充能柚子',empea:'电磁桃',laser_bean:'激光豆',blover:'三叶草',shadowshroom:'毒影菇',stallia:'大丽菊',hurrikale:'飓风甘蓝',sunshroom:'阳光菇',puffshroom:'小喷菇',banana:'香蕉火箭炮',electriccurrant:'电流醋栗',hypnoshroom:'魅惑菇',electricpeashooter:'电能豌豆',magnetshroom:'磁力菇',magnifyinggrass:'棱镜草',tallnut:'高坚果',wintermelon:'冰西瓜',splitpea:'裂荚射手',chilibean:'巴豆',xshot:'旋转芜菁',chardguard:'甜菜护卫',dandelion:'蒲公英',jalapeno:'火爆辣椒',lightningreed:'闪电芦苇',escaperoot:'逃脱树根',spikerock:'钢地刺',threepeater:'三线射手',spikeweed:'地刺',springbean:'弹簧豆',snapdragon:'火龙草',coconutcannon:'椰子加农炮',peashooter:'豌豆射手',sunflower:'向日葵',wallnut:'坚果',potatomine:'土豆地雷',cabbagepult:'卷心菜投手',bloomerang:'回旋镖射手',iceburg:'冰冻生菜',gravebuster:'噬碑藤',twinsunflower:'双胞向日葵',iceweed:'冰地刺',bonkchoy:'菜问',repeater:'双发射手',kernelpult:'玉米投手',melonpult:'西瓜投手',snowdrop:'雪莲',imitater:'模仿者',peapod:'豌豆荚',cherry_bomb:'樱桃炸弹',celerystalker:'潜伏芹菜',parsnip:'防风草',sapfling:'树脂投手' };
