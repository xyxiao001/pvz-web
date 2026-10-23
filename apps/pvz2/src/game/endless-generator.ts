import sharedData from '../../public/assets/endless/designers.json';
import zombieData from '../../public/assets/endless/zombies.json';
import type {SourceLevel} from './level';

// These objects retain the native designer schema; each switch handles its own fields.
type Data = Record<string, any>;
type ObjectData = {objclass:string;aliases?:string[];objdata:Data};
const shared:Record<string,ObjectData> = sharedData;
const zombies:Record<string,{cost:number;weight:number;jam:string}> = zombieData;
const name = (ref:string) => ref.startsWith('RTID(')?ref.slice(5,ref.indexOf('@')):ref;
const rtid = (value:string,table='CurrentLevel') => `RTID(${value}@${table})`;
export function endlessRandom(seed:number){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

/** Materialize a native Danger Room into the ordinary battle reader's event format. */
export function generateEndless(template:SourceLevel,round:number,seed:number):SourceLevel {
 const source=structuredClone(template),objects=source.objects as ObjectData[];
 const random=endlessRandom(seed),pick=<T>(a:T[])=>a[Math.floor(random()*a.length)];
 const shuffle=<T>(a:T[])=>{const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;};
 const integer=(a:number,b:number)=>Math.floor(a+Math.floor((b-a+1)*random()));
 const rangeInt=(a:number,b:number)=>integer(Math.ceil(Math.min(a,b)),Math.floor(Math.max(a,b)));
 const indices=(n:number)=>Array.from({length:n},(_,i)=>i);
 const cells=(start:number,end:number)=>indices(5).flatMap(GridY=>indices(9).filter(x=>x>=start&&x<=end).map(GridX=>({GridX,GridY})));
 const module=objects.find(o=>o.objclass==='DangerRoomModuleProperties')!.objdata;
 const waves:string[][]=Array.from({length:Math.ceil(random()*Math.min(module.MaxFlagWave??4,round/4))*10},()=>[]);
 let serial=0,maxTide=0,pool:string[]=[];
 const object=(cls:string,data:Data,alias=`Endless${serial++}`)=>{const o={objclass:cls,aliases:[alias],objdata:data};objects.push(o);return o;};
 const action=(wave:number,cls:string,data:Data)=>{const o=object(cls,data);waves[wave].push(rtid(o.aliases[0]));};
 const find=(cls:string)=>objects.find(o=>o.objclass===cls)!.objdata;
 const resolve=(ref:string)=>ref.includes('@LevelModules')?shared[name(ref)]:objects.find(o=>o.aliases?.includes(name(ref)))!;
 const progress=(range:Data,clamp=true)=>{const n=(round-range.Min)/(range.Max-range.Min);return clamp?Math.max(0,Math.min(1,n)):n;};
 const lerp=(range:Data,p:number)=>range.Min+(range.Max-range.Min)*p;
 const bound=(b:Data,max=Infinity,min=0)=>Math.max(Math.max(min,b.LowerLimit?.Value??min),Math.min(Math.min(max,b.UpperLimit?.Value??max),(b.YIntercept??0)+round*(b.SlopeCoefficient??0)));
 const bounded=(b:Data,max=Infinity)=>integer(bound(b.LowerBound,max),bound(b.UpperBound,max));
 const perFlag=(min:number,max:number)=>indices(waves.length/10).flatMap(flag=>shuffle(indices(10)).slice(0,Math.ceil(Math.min(10,min+random()*(max-min)))).map(i=>flag*10+i));
 const weighted=(types:string[])=>{let roll=random()*types.reduce((sum,z)=>sum+zombies[name(z)].weight,0);for(const z of types){roll-=zombies[name(z)].weight;if(roll<0)return z;}return types[types.length-1];};
 const buy=(types:string[],budget:number)=>{const bag=types.filter(z=>zombies[name(z)].cost<=budget),result:{Type:string}[]=[];while(bag.length){const z=weighted(bag),cost=zombies[name(z)].cost;if(cost<=budget){result.push({Type:z});budget-=cost;}else bag.splice(bag.indexOf(z),1);}return result;};
 object('WaveManagerProperties',{FlagWaveInterval:10,WaveCount:waves.length,Waves:waves},'EndlessWaves');
 for(const ref of module.LevelDesigners as string[]){
  const {objclass,objdata:d}=resolve(ref),p=d.LevelRange?progress(d.LevelRange):0;
  const value=(key:string)=>lerp(d[key],p),between=(key:string)=>rangeInt(value(key+'Min'),value(key+'Max'));
  switch(objclass){
   case 'DangerRoomJitteredWaveGenerator': {
    const selected=[...d.MustContainZombie],count=integer(Math.max(0,d.MinDynamicZombieType),Math.min(d.MaxDynamicZombieType??d.ZombiePool.length,d.ZombiePool.length));
    const cap=d.MaxPointPerWave??Infinity,step=d.BasePointIncrementPerWave+d.BasePointIncrementPerLevel*round;
    const food=shuffle(indices(waves.length)).slice(0,d.SuppressPlantfood?0:Math.min(Math.ceil(4*(Math.PI-Math.atan(30*round))/Math.PI),waves.length));
    for(let i=0;i<count;i++){const z=weighted(d.ZombiePool);if(zombies[name(z)].cost<=Math.min(cap,d.StartingPoints+step*waves.length))selected.push(z);}
    pool=[...d.ZombiePool,...d.MustContainZombie];
    waves.forEach((_,i)=>action(i,'SpawnZombiesJitteredWaveActionProps',{AdditionalPlantfood:d.SuppressPlantfood?0:Number(food.includes(i))+Number((i+1)%10===0),Zombies:buy(selected,Math.min(cap,d.StartingPoints+step*i)*((i+1)%10===0?2.5:1))}));break;
   }
   case 'DangerRoomPlankDesigner': find('PiratePlankProperties').PlankRows=[...pick<string>(d.PlankLayouts)].flatMap((v,i)=>v==='1'?[i]:[]);break;
   case 'DangerRoomGravestoneGenerator': case 'DangerRoomKongfuRackGenerator': {
    const count=Math.ceil(Math.min(d.MaxGeneratedGravestones,d.MinGravestoneCount+d.BaseGravestoneCountPerLevel*round));
    const start=Math.max(d.MinStartingGravestoneSpawnCol,d.MaxStartingGravestoneSpawnCol+d.MaxStartingGravestoneSpawnColOffsetPerLevel*round)-1,end=Math.max(d.MinEndingGravestoneSpawnCol,d.MaxEndingGravestoneSpawnCol+d.MaxEndingGravestoneSpawnColOffsetPerLevel*round)-1;
    const data={ForceSpawnData:shuffle(cells(start,end)).slice(0,count).map(c=>({...c,...(d.Types?{TypeName:name(pick(d.Types))}:d.Type?{TypeName:name(d.Type)}:{})}))};
    const previous=objects.find(o=>o.objclass==='GravestoneProperties');if(previous)previous.objdata=data;else object('GravestoneProperties',data);break;
   }
   case 'DangerRoomGravestoneEventGenerator': case 'DangerRoomKongfuRackEventGenerator': {
    for(const wave of perFlag(d.WaveMinPerFlag,Math.min(d.WaveMaxPerFlagSlope,d.WaveMaxPerFlagBase+d.WaveMaxPerFlagIncrementPerLevel*round))){
     let count=integer(d.GravestonesMinPerSpawnEvent,Math.min(d.GravestonesMaxPerSpawnEventSlope,d.GravestonesMaxPerSpawnEventBase+d.GravestonesMaxPerSpawnEventIncrementPerLevel*round));
     if(count<=0)continue;
     let sun=Math.floor(d.BeneficialGravestonesPerSpawnEventMin+random()*(d.BeneficialGravestonesPerSpawnEventMax-d.BeneficialGravestonesPerSpawnEventMin)),food=0;count-=sun;
     for(let i=0;i<sun;i++)if(random()<d.ChanceThatBeneficialGravestoneIsPlantfoodNotSun){food++;sun--;}
     const types=indices(Math.ceil(count)).map(()=>d.Types?name(pick<string>(d.Types)):'gravestone_dark'),start=Math.max(d.GravestoneSpawnColumnMinLowerLimit,Math.min(d.GravestoneSpawnColumnMinUpperLimit,Math.ceil(d.GravestoneSpawnColumnMinBase+d.GravestoneSpawnColumnMinIncrementPerLevel*round)));
     types.push(...indices(sun).map(()=>'gravestoneSunOnDestruction'),...indices(food).map(()=>'gravestonePlantfoodOnDestruction'));
     action(wave,'SpawnGravestonesWaveActionProps',{GravestonePool:types.map(Type=>({Type:rtid(Type,'GridItemTypes'),Count:1})),SpawnPositionsPool:cells(start,d.GravestoneSpawnColumnMax-1).map(c=>({mX:c.GridX,mY:c.GridY}))});
    }break;
   }
   case 'DangerRoomNecromancyEventGenerator':
    for(const wave of perFlag(d.WaveMinPerFlag,Math.min(d.WaveMaxPerFlagSlope,d.WaveMaxPerFlagBase+d.WaveMaxPerFlagIncrementPerLevel*round))){const count=Math.floor(d.ZombieMinPerNecromancy+random()*(Math.min(d.ZombieMaxPerNecromancySlope,d.ZombieMaxPerNecromancyBase+d.ZombieMaxPerNecromancyIncrementPerLevel*round)-d.ZombieMinPerNecromancy));action(wave,'SpawnZombiesFromGridItemSpawnerProps',{AdditionalPlantfood:0,GridTypes:['gravestone_tutorial','gravestone_dark','gravestoneSunOnDestruction','gravestonePlantfoodOnDestruction'].map(n=>rtid(n,'GridItemTypes')),ZombieSpawnWaitTime:1,Zombies:indices(count).map(()=>({Type:rtid(d.SpawnZombieType,'ZombieTypes')}))});}break;
   case 'DangerRoomSandstormDesigner': {
    const events=indices(waves.length/10).flatMap(flag=>shuffle(indices(10)).slice(0,integer(0,d.MaxSandstormsPerFlagWave)).map(i=>flag*10+i));
    for(const wave of events.slice(0,Math.ceil(Math.max(d.MinSandstormCountPerLevel,d.BaseSandstormCount+d.BaseSandstormCountPerLevel*round))))action(wave,'StormZombieSpawnerProps',{ColumnStart:Math.ceil(Math.max(d.MinStartingSandstormSpawnCol,d.MaxStartingSandstormSpawnCol+d.MaxStartingSandstormSpawnColOffsetPerLevel*round)-1),ColumnEnd:Math.ceil(Math.max(d.MinEndingSandstormSpawnCol,d.MaxEndingSandstormSpawnCol+d.MaxEndingSandstormSpawnColOffsetPerLevel*round)-1),GroupSize:3,TimeBetweenGroups:1,Type:'sandstorm',Zombies:indices(Math.ceil(Math.min(d.MaxSandstormZombies,d.BaseSandstormZombiesCount+d.BaseSandstormZombiesCountPerLevel*round))).map(()=>({Type:rtid('mummy','ZombieTypes')}))});break;
   }
   case 'DangerRoomRaidingPartyDesigner':
    for(const wave of shuffle(indices(waves.length).filter(i=>i>=d.BasePartyStartWave)).slice(0,Math.min(d.MaxPartyCount,Math.floor(d.BasePartyCount+d.BasePartyCountPerLevel*round))))action(wave,'RaidingPartyZombieSpawnerProps',{GroupSize:1,SwashbucklerCount:Math.floor(Math.min(d.MaxPartyZombies,d.BasePartyZombiesCount+d.BasePartyZombiesCountPerLevel*round)),TimeBetweenGroups:d.TimeBetweenGroups??1,ZombieType:d.ZombieType});break;
   case 'DangerRoomRailcartDesigner': {
    const rails:{Column:number;RowStart:number;RowEnd:number}[]=[];
    for(const col of shuffle(indices(9)).slice(0,Math.ceil(random()*Math.min(d.MaxGeneratedRailcarts,d.BaseRailcartCount+d.BaseRailcartCountPerLevel*round)))){const layout=pick<string>(d.Layouts);let start=0,last='0';for(let row=0;row<=5;row++)if(!layout[row]||layout[row]!==last){if(last!=='0'&&start<row-1)rails.push({Column:col,RowStart:start,RowEnd:row-1});last=layout[row];if(last!=='0')start=row;}}
    Object.assign(find('RailcartProperties'),{Rails:rails,Railcarts:rails.map(r=>({Column:r.Column,Row:r.RowStart+Math.floor((r.RowEnd-r.RowStart)*random())}))});break;
   }
   case 'DangerRoomSpiderRainDesigner': case 'DangerRoomParachuteRainDesigner': {
    const count=Math.ceil(Math.min(d.MaxSpiderRainZombies,d.BaseSpiderRainZombieCount+d.BaseSpiderRainZombiesCountPerLevel*round));
    for(const wave of shuffle(indices(waves.length).filter(i=>i>=d.BaseSpiderRainStartWave)).slice(0,Math.min(d.MaxSpiderRainCount,Math.floor(d.BaseSpiderRainCount+d.BaseSpiderRainCountPerLevel*round))))action(wave,objclass==='DangerRoomSpiderRainDesigner'?'SpiderRainZombieSpawnerProps':'ParachuteRainZombieSpawnerProps',{ColumnStart:4,ColumnEnd:7,GroupSize:1,SpiderCount:count,TimeBeforeFullSpawn:6,TimeBetweenGroups:.2,SpiderZombieName:objclass==='DangerRoomSpiderRainDesigner'?'future_imp':'lostcity_lostpilot',ZombieFallTime:1.5,...(d.ZombiesToBringWith?{ZombiesToBringWith:d.ZombiesToBringWith.map((Type:string)=>({Type}))}:{})});break;
   }
   case 'DangerRoomPowerTileDesigner': {
    const count=Math.ceil(random()*Math.min(Math.ceil(d.MaxTileSetCount),Math.ceil(d.BaseTileSetCount+d.BaseTileSetCountPerLevel*round))),layouts=shuffle<string[]>(d.TileSetLayouts),used=new Set<string>(),linked:Data[]=[];let group=0;
    for(const anchor of shuffle(cells(0,d.ColumnCount-1))){if(group>=count)break;for(const layout of layouts){const set=layout.flatMap((row,y)=>[...row].flatMap((v,x)=>v!=='0'?[{GridX:anchor.GridX+x,GridY:anchor.GridY+y}]:[]));if(set.some(c=>c.GridX>8||c.GridY>4||used.has(`${c.GridX}:${c.GridY}`)))continue;for(const c of set){used.add(`${c.GridX}:${c.GridY}`);linked.push({Group:['alpha','beta','delta','gamma','epsilon'][group%5],Location:{mX:c.GridX,mY:c.GridY},PropagationDelay:1.5});}group++;break;}}
    find('PowerTileProperties').LinkedTiles=linked;break;
   }
   case 'DangerRoomSliderTileDesigner':object('InitialGridItemProperties',{InitialGridItemPlacements:pick<Data>(d.SliderTileLayouts).Layout});break;
   case 'GridItemPatternPlacer': {const pattern=structuredClone(resolve(pick(d.GridItemSpawnerPatterns)));pattern.aliases=['GoldTiles'];objects.push(pattern);break;}
   case 'DangerRoomFreezingWindDesigner':waves.forEach((_,i)=>{if(random()<value('WavePercent')/100)action(i,'FrostWindWaveActionProps',{Winds:shuffle(indices(5)).slice(0,integer(value('LaneCountMin'),value('LaneCountMax'))).map(Row=>({Row,Direction:'right'})),BlastCount:random()<value('DoubleBlastPercent')/100?2:1});});break;
   case 'DangerRoomIceBlockDesigner': {
    const count=integer(value('BlocksMin'),value('BlocksMax')),good=Math.floor(count*integer(d.PctGoodBlocks.Min,d.PctGoodBlocks.Max)/100);
    const plants=shuffle(cells(value('PlantColumnMin'),value('PlantColumnMax'))).slice(0,good).map(c=>({...c,TypeName:pick(d.PlantTypeNames),Condition:'icecubed'}));
    object('InitialPlantProperties',{InitialPlantPlacements:plants});object('InitialZombieProperties',{InitialZombiePlacements:shuffle(cells(value('ZombieColumnMin'),value('ZombieColumnMax'))).filter(c=>!plants.some(q=>q.GridX===c.GridX&&q.GridY===c.GridY)).slice(0,count-good).map(c=>({...c,TypeName:pick(d.ZombieTypeNames),Condition:'icecubed'}))});break;
   }
   case 'DangerRoomLightningDesigner':if(p>0)waves.forEach((_,i)=>{if(random()<value('WaveLightningChance')/100)action(i,'ThunderChargeWaveActionProps',{TimeBeforeFirst:{Min:3,Max:3},TimeBetween:{Min:3,Max:3},Thunders:indices(between('ThunderCount')).map(()=>({Sign:pick([-1,1]),LinkedPlantCount:between('LinkedPlantCount')}))});});break;
   case 'DangerRoomDropShipDesigner':if(p>0)waves.forEach((_,i)=>{if(random()<value('WaveDropShipChance')/100)action(i,'DropShipZombieSpawnerProps',{DropShipPosition:{mX:5,mY:pick([1,2,3])},DropShipType:'sky_dropship',DropShipShiftedProperties:{ImpType:'sky_imp',ImpCount:{Min:value('ImpCountMin'),Max:value('ImpCountMax')},TimeBeforeFirst:{Min:6,Max:6},TimeBetween:{Min:2,Max:2},ImpFlyingDuration:{Min:3,Max:3.5},ImpLandingColumns:indices(9).filter(c=>c>=Math.min(value('ImpColumnMin'),value('ImpColumnMax'))&&c<=Math.max(value('ImpColumnMin'),value('ImpColumnMax'))),ImpLandingRows:[]}});});break;
   case 'DangerRoomDinoDesigner': case 'DangerRoomPortalDesigner': {
    const dinosaur=objclass==='DangerRoomDinoDesigner',prefix=dinosaur?'Dino':'Portal',types=shuffle<string>(dinosaur?['raptor','stego','ptero','tyranno','ankylo']:d.PortalOptions).slice(0,between(prefix+'Types'));
    if(!types.length)break;
    for(let wave=between('First'+prefix+'Waves');wave<waves.length;){const count=between(prefix+'CountInWave');if(dinosaur){for(let i=0;i<count;i++)action(wave,'DinoWaveActionProps',{DinoRow:Math.floor(random()*5),DinoType:pick(types),DinoWaveDuration:random()*3});}else for(const c of shuffle(cells(Math.round(value('ColumnToSpawnMin')),Math.round(value('ColumnToSpawnMax')))).slice(0,count))action(wave,'SpawnModernPortalsWaveActionProps',{PortalRow:c.GridY,PortalColumn:c.GridX,PortalType:pick(types),ZombiesToSpawn:between('ZombiesToSpawn')});if(wave===waves.length-1)break;wave=Math.min(waves.length-1,wave+between('Next'+prefix+'Waves'));}break;
   }
   case 'DangerRoomJamDesigner': {
    const jp=progress(d.LevelRange),jv=(key:string)=>lerp(d[key],jp),types=shuffle(['jam_punk','jam_pop','jam_rap','jam_8bit',...(round>=d.LevelToIntroduceMetalJam?['jam_metal']:[])]).slice(0,rangeInt(jv('JamTypesMin'),jv('JamTypesMax'))),zp=progress(d.ZombieAddLevelRange);
    for(let wave=rangeInt(jv('FirstJamWavesMin'),jv('FirstJamWavesMax'));wave<waves.length;wave+=rangeInt(jv('NextJamWavesMin'),jv('NextJamWavesMax'))){const jam=pick(types),matching=pool.filter(z=>zombies[name(z)].jam===jam),count=rangeInt(lerp(d.JamZombiesToReplaceMin,zp),lerp(d.JamZombiesToReplaceMax,zp));const event=resolve(waves[wave][0]).objdata;event.NotificationEvents=[jam];if(matching.length)event.Zombies=shuffle<Data>(event.Zombies).map((z,i)=>i<count?{...z,Type:pick(matching)}:z);}break;
   }
   case 'DangerRoomBeachTideChanger': {
    let tide=bounded(d.StartingTideLevel,9);find('TideProperties').StartingWaveLocation=tide;maxTide=tide;
    const final=bounded(d.FinalTideLevel,9),count=integer(bounded(d.MaximumTideLevel,9),bounded(d.MinimumTideLevel,9)),minDelta=bounded(d.MinimumTideDelta,9),maxDelta=bounded(d.MaximumTideDelta,9),lowStart=bounded(d.LowTideStartLevel);
    const low=perFlag(bound(d.LowTideEventsPerFlagWave.LowerBound),bound(d.LowTideEventsPerFlagWave.UpperBound)).slice(0,count);
    for(const wave of shuffle(indices(waves.length)).slice(0,count)){const before=tide;if(round>=lowStart&&low.includes(wave)){tide=Math.max(0,tide-bounded(d.LowTideRecedeAmount,9));const basic=bounded(d.BasicLowTideZombiesPerLowTideEvent),special=bounded(d.SpecialLowTideZombiesPerLowTideEvent);for(const [z,n,group] of [[d.BasicLowTideZombieType,basic,3],[pick(d.SpecialLowTideZombieTypes),special?basic:0,1]] as [string,number,number][])if(n)action(wave,'BeachStageEventZombieSpawnerProps',{TimeBeforeFullSpawn:.5,TimeBetweenGroups:.25,ColumnStart:10-before,ColumnEnd:10-tide,ZombieCount:n,GroupSize:group,ZombieName:z});}else tide=Math.max(0,Math.min(final,tide+integer(maxDelta,minDelta)));maxTide=Math.max(maxTide,tide);action(wave,'TidalChangeWaveActionProps',{TidalChange:{ChangeAmount:tide,ChangeType:'absolute'}});}break;
   }
   case 'DangerRoomBeachLilypadPlacer': {const count=bounded(d.NumberOfLilypads),start=Math.max(9-maxTide,bounded(d.MinimumLilypadColumn,8)),end=bounded(d.MaximumLilypadColumn,8);objects.find(o=>o.aliases?.includes('LilypadPlacement'))!.objdata.InitialGridItemPlacements=shuffle(cells(start,end)).slice(0,count).map(c=>({...c,TypeName:'lilypad'}));break;}
  }
 }
 // The standard native stages use the same active module list as their authored template.
 return source;
}
