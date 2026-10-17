export const PLANT_KINDS = ['sunflower', 'peashooter', 'wallnut', 'potatomine', 'cabbagepult', 'bloomerang', 'iceburg'] as const;
export type PlantKind = typeof PLANT_KINDS[number];
export type ZombieKind = 'mummy' | 'mummy_armor1' | 'mummy_armor2' | 'mummy_flag' | 'ra' | 'camel_onehump';
export const BOARD = { width: 1200, height: 700, left: 190, top: 160, cellWidth: 82, cellHeight: 98, columns: 9, rows: 5 };
export const cellX = (column: number) => BOARD.left + (column + .5) * BOARD.cellWidth;
export const rowY = (row: number) => BOARD.top + row * BOARD.cellHeight + 80;

export interface PlantProperties {
  SunCost: number; Cooldown: number; CooldownFrom: number; Toughness: number;
  ShootInterval: number; ShootIntervalAdditional: number; PlantfoodPeaCount: number;
  SunValue: number; ProduceInterval: number; ProduceIntervalAdditional: number;
  ProduceCountdownStart: number; ProduceCountdownStartAdditional: number;
  ChargeTime: number; Damage: number; ArmorToughness: number;
  ThrowInterval:number; ThrowIntervalAdditional:number; PierceCount:number; PlantfoodBoomerangCount:number; FreezeDuration:number;
}
export interface ZombieProperties { Toughness: number; WalkSPS: number; EatDPS: number; MaxAbsorbValue: number }
export interface PowerProperties { TotalTime:number; DPS:number; TimePerUse:number; FlamethrowerNormalDPS:number; GroundFlameNormalDPS:number; GroundFlameDuration:number }
export interface Properties {
  plants: Record<PlantKind, PlantProperties>;
  zombies: Record<ZombieKind, ZombieProperties>;
  armors: { egypt_armor1: { Toughness: number }; egypt_armor2:{Toughness:number} };
  grave: {Toughness:number};
  projectiles:Record<string,{Damage:number;FreezeDuration:number;ChillDuration:number}>;
  powerups:Record<string,PowerProperties>;
}
export interface SourceLevel { objects: { objclass: string; aliases?: string[]; objdata: Record<string, unknown> }[] }
export interface SpawnAction {
  mode:'walk'|'storm'|'ground'; zombies:{kind:ZombieKind;row:number|null}[]; food:number;
  columnStart:number;columnEnd:number;groupSize:number;interval:number;
}
export interface Conveyor { DropDelayConditions:{Delay:number;MaxPackets:number}[]; InitialPlantList:{PlantType:PlantKind;Weight:number}[] }
export interface Level {
  waves: ZombieKind[][]; actions:SpawnAction[][]; minHealth:number;maxHealth:number;flagInterval:number;
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
  const actions=(manager.Waves as string[][]).map(wave=>wave.map(name=>{
    const action=byName.get(reference(name))!,d=action.objdata;
    const mode:SpawnAction['mode']=action.objclass==='StormZombieSpawnerProps'?'storm':action.objclass==='SpawnZombiesFromGroundSpawnerProps'?'ground':'walk';
    const defaults=mode==='storm'?{ColumnStart:4,ColumnEnd:8,GroupSize:2,TimeBetweenGroups:2}:{ColumnStart:0,ColumnEnd:8,GroupSize:1,TimeBetweenGroups:0};
    const data={...defaults,AdditionalPlantfood:0,...d};
    return {mode,zombies:(d.Zombies as {Type:string;Row?:string}[]).map(z=>({kind:reference(z.Type) as ZombieKind,row:z.Row===undefined?null:Number(z.Row)-1})),
      food:'DynamicPlantfood' in d?(d.DynamicPlantfood as number[])[3]:Number(data.AdditionalPlantfood),
      columnStart:Number(data.ColumnStart),columnEnd:Number(data.ColumnEnd),groupSize:Number(data.GroupSize),interval:Number(data.TimeBetweenGroups)};
  }));
  const grave=source.objects.find(o=>o.objclass==='GravestoneProperties');
  const conveyor=source.objects.find(o=>o.objclass==='ConveyorSeedBankProperties');
  return {
    waves:actions.map(w=>w.flatMap(a=>a.zombies.map(z=>z.kind))),actions,
    minHealth:manager.MinNextWaveHealthPercentage as number,maxHealth:manager.MaxNextWaveHealthPercentage as number,flagInterval:manager.FlagWaveInterval as number,
    day:definition.LevelNumber as number,graves:grave?(grave.objdata.ForceSpawnData as {GridX:number;GridY:number}[]).map(g=>({row:g.GridY,column:g.GridX})):[],
    sunDrops:modules.includes('RTID(DefaultSunDropper@LevelModules)'),mowers:modules.includes('RTID(EgyptMowers@LevelModules)'),
    conveyor:conveyor?conveyor.objdata as unknown as Conveyor:null,powerups:source.objects.some(o=>o.objclass==='PowerupTutorialIntroProperties'),
  };
}

export interface CampaignTiming { cabbage:number;cabbageDuration:number;cabbageFood:number;cabbageFoodEnd:number;boomerang:number;boomerangDuration:number;boomerangCatch:number;ice:number;iceDuration:number;iceFood:number;iceFoodEnd:number }
export interface AnimationTiming { shoot:number;shootDuration:number;produce:number;produceDuration:number;mineGrow:number;mineExplode:number;mineDeath:number;raStart:number;raEnd:number;campaign?:CampaignTiming }
export const plantLabels: Record<PlantKind, string> = { peashooter:'豌豆射手',sunflower:'向日葵',wallnut:'坚果',potatomine:'土豆地雷',cabbagepult:'卷心菜投手',bloomerang:'回旋镖射手',iceburg:'冰冻生菜' };
