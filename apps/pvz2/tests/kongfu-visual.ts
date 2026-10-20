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
const draw=()=>{scene!.sync(game!,0);scene!.render();status.textContent=`武林${game!.level.day} ${game!.time.toFixed(1)}s ${game!.phase} 波次${game!.wave} 植物${game!.plants.length} 僵尸${game!.zombies.length} 武器架${game!.graves.length} 点燃引线${game!.kongfu.tnt.filter(t=>t.lit).length}`;};
const button=(label:string,run:()=>void|Promise<void>)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{Promise.resolve(run()).catch(e=>{status.textContent=String(e);console.error(e);});};controls.append(b);};
async function clean(){if(battle){await battle.dispose();battle=undefined;}if(scene){await scene.dispose();scene=undefined;}host.replaceChildren();battleHost.hidden=true;host.hidden=true;}
for(const day of [7,8,9,10,11]){
 button(`进入${day}关`,async()=>{await clean();battleHost.hidden=false;battle=createBattle(battleHost,async()=>{await clean();},BATTLE_LEVELS[`kongfu${day}`],progress);await battle.enter();status.textContent=`武林${day}正式入口`;});
 button(`场景${day}`,async()=>{await clean();host.hidden=false;scene=new Scene();const config=BATTLE_LEVELS[`kongfu${day}`],level=readLevel(await json<SourceLevel>(config.source));
 const groups=await Promise.all(['levels','campaign',...config.bundles!].map(name=>json<Properties>(name+'/properties.json'))),props=groups.reduce((a,b)=>({...a,...b,plants:{...a.plants,...b.plants},zombies:{...a.zombies,...b.zombies},armors:{...a.armors,...b.armors},projectiles:{...a.projectiles,...b.projectiles},plantAnimations:{...a.plantAnimations,...b.plantAnimations}}));props.zombies.mummy_flag=await json('battle/flag.json');
 const plants=[...new Set([...config.plants.map(p=>p.kind),...level.initialPlants.map(p=>p.kind),...(level.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...level.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 await scene.init(host,()=>{},config,plants,level);game=new Game(level,props,scene.timing,z=>scene!.absorptionTarget(z),1234,false);scene.frameCombat();draw();});
}
for(const seconds of [.1,1,5])button(`推进${seconds}秒`,()=>{for(let i=0;i<seconds*60;i++){game!.tick(1/60);scene!.sync(game!,1/60);}draw();});
button('武器架换装',()=>{for(const t of [...game!.graves])game!.spawnZombie('kongfu',t.row,cellX(t.column)+20);draw();});
button('铜锤与火箭',()=>{game!.spawnZombie('kongfu_hammer',2,cellX(6));game!.spawnZombie('kongfu_rocket_imp',0,cellX(8),'raid');game!.addPlant('repeater',2,1);game!.addPlant('wallnut',0,3);draw();});
button('点燃引线',()=>{const t=game!.kongfu.tnt[2];game!.spawnZombie('kongfu_torch',2,game!.kongfu.tip(t));draw();});
button('布阵开始',()=>{game!.preparing=false;draw();});
button('竹笋与新僵尸',()=>{game!.graves=[];game!.addPlant('bambooshoot',2,1);game!.spawnZombie('kongfu_bomb',2,cellX(5));game!.spawnZombie('kongfu_gong',3,cellX(6));draw();});
button('酒鬼喝酒',()=>{const z=game!.spawnZombie('kongfu_drink',1,cellX(5));game!.damage(z,310);draw();});
button('铜人觉醒',()=>{for(const z of game!.zombies)if(z.kind==='kongfu_bronze_statue')z.kongfu!.life=.1;draw();});
button('清场结算',()=>{game!.preparing=false;if(game!.level.targetSun)game!.dropSun(cellX(0),rowY(0),game!.level.targetSun,'plant');for(let i=0;i<30000&&game!.phase==='playing';i++){game!.tick(1/60);for(const z of game!.zombies)game!.damage(z,100000,'water');}draw();});
