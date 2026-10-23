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
const draw=()=>{scene!.sync(game!,0);scene!.render();status.textContent=`云端${game!.level.day} ${game!.time.toFixed(1)}s ${game!.phase} 飞船${Math.ceil(game!.sky.health)} 护盾${Math.ceil(game!.sky.shield)} 运输机${game!.sky.drops.length} 僵尸${game!.zombies.length}`;};
const button=(label:string,run:()=>void|Promise<void>)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{Promise.resolve(run()).catch(e=>{status.textContent=String(e);console.error(e);});};controls.append(b);};
async function clean(){if(battle){await battle.dispose();battle=undefined;}if(scene){await scene.dispose();scene=undefined;}host.replaceChildren();battleHost.hidden=true;host.hidden=true;}
for(const day of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25]){
 button(`进入${day}关`,async()=>{await clean();battleHost.hidden=false;battle=createBattle(battleHost,async()=>{await clean();},BATTLE_LEVELS[`sky${day}`],progress);await battle.enter();status.textContent=`云端${day}正式入口`;});
 button(`场景${day}`,async()=>{await clean();host.hidden=false;scene=new Scene();const config=BATTLE_LEVELS[`sky${day}`],level=readLevel(await json<SourceLevel>(config.source));
 const groups=await Promise.all(['levels','campaign',...config.bundles!].map(name=>json<Properties>(name+'/properties.json'))),props=groups.reduce((a,b)=>({...a,...b,plants:{...a.plants,...b.plants},zombies:{...a.zombies,...b.zombies},armors:{...a.armors,...b.armors},projectiles:{...a.projectiles,...b.projectiles},plantAnimations:{...a.plantAnimations,...b.plantAnimations}}));props.zombies.mummy_flag=await json('battle/flag.json');
 const plants=[...new Set(['asparagus' as const,'skyshooter' as const,'pineapple' as const,'moonbean' as const,'anthurium' as const,...(level.airRaid?.teams.flatMap(t=>t.members.map(m=>m.kind))??[]),...config.plants.map(p=>p.kind),...(level.preset??[]),...level.protectedPlants.map(p=>p.kind),...level.initialPlants.map(p=>p.kind),...(level.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...level.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 await scene.init(host,()=>{},config,plants,level);game=new Game(level,props,scene.timing,z=>scene!.absorptionTarget(z),1234,false);if(level.airRaid)game.sky.airRaid.choose(0);scene.frameCombat();draw();});
}
for(const seconds of [.1,1,5])button(`推进${seconds}秒`,()=>{for(let i=0;i<seconds*60;i++){game!.tick(1/60);scene!.sync(game!,1/60);}draw();});

button('布置空战（场景5）',()=>{Object.assign(game!,{nextWave:Infinity});game!.plants=[];game!.zombies=[];game!.sky.setShield(true);game!.addPlant('skyshooter',0,3);game!.addPlant('asparagus',2,1);game!.addPlant('pineapple',4,2);for(const [row,kind] of (['sky','sky_armor1','sky_armor2','sky_battleplane'] as const).entries())game!.spawnZombie(kind,row,cellX(7));game!.sky.addDropShip(game!.level.actions.flat().find(a=>a.dropShip)!.dropShip!);draw();});
button('植物能量豆',()=>{game!.food=3;game!.plantFood(0,3);game!.plantFood(2,1);draw();});
button('受控结算',()=>{for(let i=0;i<30000&&game!.phase==='playing';i++){game!.tick(1/60);for(const z of game!.zombies)game!.damage(z,100000,'water');}draw();});

button('雷电双舱（场景10）',()=>{Object.assign(game!,{nextWave:Infinity});game!.plants=[];game!.zombies=[];game!.addPlant('anthurium',2,1);game!.addPlant('skyshooter',2,2);game!.addPlant('moonbean',3,3);game!.sky.thunder.add(2,2,1);game!.spawnZombie('sky_twin',2,cellX(7));draw();});
button('空战移动',()=>{game!.sky.airRaid.move(500,400);draw();});

button('电磁与巨人（场景14）',()=>{Object.assign(game!,{nextWave:Infinity});game!.plants=[];game!.zombies=[];game!.addPlant('skyshooter',1,3);game!.addPlant('anthurium',1,2);game!.spawnZombie('sky_electric',1,cellX(7));const z=game!.spawnZombie('sky_gargantuar',3,cellX(7));z.hp=2400;draw();});

button('无人机工厂（场景17）',()=>{Object.assign(game!,{nextWave:Infinity});game!.plants=[];game!.zombies=[];game!.addPlant('wallnut',2,2);const host=game!.spawnZombie('sky_armor2',2,cellX(5));host.frozenUntil=Infinity;game!.spawnZombie('sky_dronemaker',2,cellX(8));draw();});
button('双舱弹幕（场景19）',()=>{Object.assign(game!,{nextWave:Infinity});game!.zombies=[];game!.sky.airRaid.move(100,650);game!.spawnZombie('sky_airraid_twin',2,850,'walk','sky_airraid_twin2_t');draw();});
for(const [i,name] of ['豌豆','追踪','炮火'].entries())button(`空战${name}小队`,()=>{game!.sky.airRaid.choose(i);draw();});
button('空战升级',()=>{const raid=game!.sky.airRaid;raid.score=5000;const z=game!.spawnZombie('sky',0,1200,'walk','sky_t');raid.killed(z);z.hp=0;game!.zombies=game!.zombies.filter(q=>q!==z);draw();});
button('空战能量豆',()=>{game!.food=1;game!.sky.airRaid.food();draw();});

button('迷雾与灯笼（场景24）',()=>{Object.assign(game!,{nextWave:Infinity});game!.plants=[];game!.zombies=[];game!.sky.setShield(true);game!.spawnZombie('sky_arbiterx',2,cellX(4));game!.addPlant('bulbkekengi',2,6);draw();});
button('灯笼能量豆',()=>{game!.food=1;game!.plantFood(2,6);draw();});
button('突击队（场景25）',()=>{Object.assign(game!,{nextWave:Infinity});game!.plants=[];game!.zombies=[];game!.addPlant('peacommando',2,3);const z=game!.spawnZombie('sky_arbiterx',2,cellX(7));z.hp=20000;z.frozenUntil=Infinity;draw();});
button('突击队能量豆',()=>{game!.food=1;game!.plantFood(2,3);draw();});
button('花盆（场景21）',()=>{Object.assign(game!,{nextWave:Infinity});game!.plants=[];game!.zombies=[];game!.addPlant('floawerPot',2,5);game!.addPlant('repeater',2,5);game!.spawnZombie('sky_armor2',2,cellX(7));draw();});

button('击落迷雾飞机',()=>{for(const z of game!.zombies)if(z.kind==='sky_arbiterx')game!.damage(z,30000);game!.tick(1/60);draw();});
