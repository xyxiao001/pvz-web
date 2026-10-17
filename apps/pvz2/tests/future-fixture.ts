import {readFileSync} from 'node:fs';
import {Game} from '../src/game/model';
import {readLevel,rowY,type Properties,type SourceLevel,type AnimationTiming} from '../src/game/level';
import {animationTimeline,specialAnimationTiming,bonkAnimationTiming,type Skeleton} from '../src/rendering/presentation';
import type {CampaignCatalog} from '../src/rendering/battle-art';
const read=<T>(path:string):T=>JSON.parse(readFileSync(new URL('../public/assets/'+path,import.meta.url),'utf8'));
const base=read<Properties>('levels/properties.json'),extra=read<Properties>('campaign/properties.json');
export const props:Properties={...extra,plants:{...base.plants,...extra.plants},zombies:{...base.zombies,...extra.zombies,mummy_flag:read('battle/flag.json')},armors:{...base.armors,...extra.armors}};
const catalog=read<CampaignCatalog>('campaign/catalog.json');
const timeline=(actor:string,animation:string)=>animationTimeline(read<Skeleton>(`campaign/rigs/${catalog.actors[actor].rig}/skeleton.json`),catalog.actors[actor].armature,animation);
const nutFood=animationTimeline(read<Skeleton>('actors/wallnut/skeleton.json'),'Wall-nut','Food');
export const timing:AnimationTiming={wallnutArmor:nutFood.events.wearArmor,wallnutFoodEnd:nutFood.events.foodEnd,shoot:.5,shootDuration:26/30,produce:23/30,produceDuration:40/30,mineGrow:.6,mineExplode:14/30,mineDeath:.5,raStart:25/30,raEnd:25/30,
 campaign:{cabbage:timeline('cabbagepult','Lob').events.Lob,cabbageDuration:timeline('cabbagepult','Lob').duration,cabbageFood:timeline('cabbagepult','Food').events.lobFood,cabbageFoodEnd:timeline('cabbagepult','Food').events.foodEnd,
 boomerang:timeline('bloomerang','Shoot').events.Shoot,boomerangDuration:timeline('bloomerang','Shoot').duration,boomerangCatch:timeline('bloomerang','Catch').duration,ice:timeline('iceburg','Death').events.explode,iceDuration:timeline('iceburg','Death').duration,iceFood:timeline('iceburg','Food').events.foodExplode/.8,iceFoodEnd:timeline('iceburg','Food').events.foodEnd/.8}};
timing.special=specialAnimationTiming(new Map(Object.entries(catalog.actors).map(([name,rig])=>[name,read<Skeleton>(`campaign/rigs/${rig.rig}/skeleton.json`)])));
timing.bonk=bonkAnimationTiming(read<Skeleton>(`campaign/rigs/${catalog.actors.bonkchoy.rig}/skeleton.json`));
const pirate=read<Properties>('pirate/properties.json');
Object.assign(props,{plants:{...props.plants,...pirate.plants},zombies:{...props.zombies,...pirate.zombies},armors:{...props.armors,...pirate.armors},projectiles:{...props.projectiles,...pirate.projectiles},plantAnimations:{...props.plantAnimations,...pirate.plantAnimations}});
const west=read<Properties>('cowboy/properties.json');
Object.assign(props,{plants:{...props.plants,...west.plants},zombies:{...props.zombies,...west.zombies},armors:{...props.armors,...west.armors},projectiles:{...props.projectiles,...west.projectiles},plantAnimations:{...props.plantAnimations,...west.plantAnimations}});
const future=read<Properties>('future/properties.json');
Object.assign(props,{plants:{...props.plants,...future.plants},zombies:{...props.zombies,...future.zombies},armors:{...props.armors,...future.armors},projectiles:{...props.projectiles,...future.projectiles},plantAnimations:{...props.plantAnimations,...future.plantAnimations}});
export const level=(day:number)=>readLevel(read<SourceLevel>(`future/future${day}.source.json`));
export const create=(day:number)=>new Game(level(day),props,timing,z=>({x:z.x-25,y:rowY(z.row)-95}),1234);
export const tick=(g:Game,n:number)=>{for(let i=0;i<Math.round(n*60);i++)g.tick(1/60);};
