import '../src/shell/style.css';
import '../src/style.css';
import {ProgressStore} from '../src/shell/progression';
import {createBattle} from '../src/battle';
import {BATTLE_LEVELS} from '../src/game/levels';
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
for(const day of [1,2,3,4,5]){
 button(`进入${day}关`,async()=>{await clean();battleHost.hidden=false;battle=createBattle(battleHost,async()=>{await clean();},BATTLE_LEVELS[`modern${day}`],progress);await battle.enter();status.textContent=`摩登${day}正式入口`;});
 button(`场景${day}`,async()=>{await clean();host.hidden=false;scene=new Scene();const config=BATTLE_LEVELS[`modern${day}`],level=readLevel(await json<SourceLevel>(config.source));
 const groups=await Promise.all(['levels','campaign',...config.bundles!].map(name=>json<Properties>(name+'/properties.json'))),props=groups.reduce((a,b)=>({...a,...b,plants:{...a.plants,...b.plants},zombies:{...a.zombies,...b.zombies},armors:{...a.armors,...b.armors},projectiles:{...a.projectiles,...b.projectiles},plantAnimations:{...a.plantAnimations,...b.plantAnimations}}));props.zombies.mummy_flag=await json('battle/flag.json');
 const plants=[...new Set(['moonflower' as const,'nightshade' as const,'shrinkingviolet' as const,...(level.airRaid?.teams.flatMap(t=>t.members.map(m=>m.kind))??[]),...config.plants.map(p=>p.kind),...(level.preset??[]),...level.protectedPlants.map(p=>p.kind),...level.initialPlants.map(p=>p.kind),...(level.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...level.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 await scene.init(host,()=>{},config,plants,level);game=new Game(level,props,scene.timing,z=>scene!.absorptionTarget(z),1234,false);scene.frameCombat();draw();});
}
for(const seconds of [.1,1,5])button(`推进${seconds}秒`,()=>{for(let i=0;i<seconds*60;i++){game!.tick(1/60);scene!.sync(game!,1/60);}draw();});

button('暗影植物',()=>{Object.assign(game!,{nextWave:Infinity});game!.plants=[];game!.zombies=[];game!.addPlant('moonflower',2,2);game!.addPlant('nightshade',1,3);game!.addPlant('nightshade',2,3);game!.addPlant('nightshade',3,3);for(const row of [1,2,3]){const z=game!.spawnZombie('tutorial_armor2',row,cellX(7));z.frozenUntil=Infinity;}draw();});
button('龙葵能量豆',()=>{game!.food=1;game!.plantFood(2,3);draw();});
button('裂缝（场景2）',()=>{Object.assign(game!,{nextWave:Infinity});game!.modern.portal({row:2,column:5,kind:'beach'});draw();});
button('报纸与缩小（场景3）',()=>{Object.assign(game!,{nextWave:Infinity});game!.plants=[];game!.zombies=[];game!.addPlant('shrinkingviolet',2,3);game!.spawnZombie('modern_newspaper',2,cellX(3)+40);game!.spawnZombie('tutorial_armor2',3,cellX(4));draw();});
button('打破报纸',()=>{for(const z of game!.zombies)if(z.kind==='modern_newspaper')game!.damage(z,400);draw();});
button('受控结算',()=>{for(let i=0;i<30000&&game!.phase==='playing';i++){game!.tick(1/60);for(const z of game!.zombies)game!.damage(z,100000,'swallow');}draw();});
