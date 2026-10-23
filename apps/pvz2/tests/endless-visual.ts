import '../src/shell/style.css';
import '../src/style.css';
import {ProgressStore} from '../src/shell/progression';
import {createBattle} from '../src/battle';
import {ENDLESS_LEVELS} from '../src/game/endless';
import {generateEndless} from '../src/game/endless-generator';
import {readLevel,cellX,rowY,type SourceLevel,type Properties} from '../src/game/level';
import {Game} from '../src/game/model';
import {Scene} from '../src/rendering/scene';
import {json} from '../src/assets/load';
const memory=new Map<string,string>(),progress=new ProgressStore({getItem:k=>memory.get(k)??null,setItem:(k,v)=>{memory.set(k,v);},removeItem:k=>{memory.delete(k);}});
const controls=document.querySelector('#controls')!,status=document.querySelector('#status')!,host=document.querySelector<HTMLDivElement>('#scene')!,battleHost=document.querySelector<HTMLElement>('#battle')!;
let scene:Scene|undefined,game:Game|undefined,battle:ReturnType<typeof createBattle>|undefined;
const draw=()=>{scene!.sync(game!,0);scene!.render();status.textContent=`摩登${game!.level.day} ${game!.time.toFixed(1)}s ${game!.phase} 裂缝${game!.modern.portals.length} 僵尸${game!.zombies.length}`;};
const button=(label:string,run:()=>void|Promise<void>)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{Promise.resolve(run()).catch(e=>{status.textContent=String(e);console.error(e);});};controls.append(b);};
async function clean(){if(battle){await battle.dispose();battle=undefined;}if(scene){await scene.dispose();scene=undefined;}host.replaceChildren();battleHost.hidden=true;host.hidden=true;}
for(const day of [30]){
 button(`场景${day}`,async()=>{await clean();host.hidden=false;scene=new Scene();const config=ENDLESS_LEVELS.endless_modern,level=readLevel(generateEndless(await json<SourceLevel>(config.source),day,8521));
 level.waves[0].push('modern_balloon','modern_allstar','modern_superfanimp');
 const groups=await Promise.all(['levels','campaign',...config.bundles!].map(name=>json<Properties>(name+'/properties.json'))),props=groups.reduce((a,b)=>({...a,...b,plants:{...a.plants,...b.plants},zombies:{...a.zombies,...b.zombies},armors:{...a.armors,...b.armors},projectiles:{...a.projectiles,...b.projectiles},plantAnimations:{...a.plantAnimations,...b.plantAnimations}}));props.zombies.mummy_flag=await json('battle/flag.json');
 const plants=[...new Set(['wallnut' as const,'moonflower' as const,'nightshade' as const,'shrinkingviolet' as const,...(level.airRaid?.teams.flatMap(t=>t.members.map(m=>m.kind))??[]),...config.plants.map(p=>p.kind),...(level.preset??[]),...level.protectedPlants.map(p=>p.kind),...level.initialPlants.map(p=>p.kind),...(level.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...level.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 await scene.init(host,()=>{},config,plants,level);game=new Game(level,props,scene.timing,z=>scene!.absorptionTarget(z),1234,false);scene.frameCombat();draw();});
}
for(const seconds of [.1,1,5])button(`推进${seconds}秒`,()=>{for(let i=0;i<seconds*60;i++){game!.tick(1/60);scene!.sync(game!,1/60);}draw();});

button('三种无尽僵尸',()=>{Object.assign(game!,{nextWave:Infinity});game!.plants=[];game!.zombies=[];game!.spawnZombie('modern_balloon',1,cellX(6));game!.spawnZombie('modern_allstar',2,cellX(7));game!.spawnZombie('modern_superfanimp',2,cellX(7)-20);game!.addPlant('wallnut',1,4);game!.addPlant('wallnut',2,3);draw();});
button('打破气球',()=>{for(const z of game!.zombies)if(z.balloon)game!.damage(z,z.balloon);draw();});
button('跨世界裂缝',()=>{Object.assign(game!,{nextWave:Infinity});for(const [i,kind] of ['dangerroom_lostcity','dangerroom_dino','dangerroom_egypt'].entries())game!.modern.portal({row:i+1,column:6,kind:kind as 'dangerroom_lostcity',count:2});draw();});

button('僵尸损伤与死亡',()=>{for(const z of game!.zombies)game!.damage(z,500);draw();});
