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
for(const day of [17,18,19,20,21]){
 button(`进入${day}关`,async()=>{await clean();battleHost.hidden=false;battle=createBattle(battleHost,async()=>{await clean();},BATTLE_LEVELS[`kongfu${day}`],progress);await battle.enter();status.textContent=`武林${day}正式入口`;});
 button(`场景${day}`,async()=>{await clean();host.hidden=false;scene=new Scene();const config=BATTLE_LEVELS[`kongfu${day}`],level=readLevel(await json<SourceLevel>(config.source));
 const groups=await Promise.all(['levels','campaign',...config.bundles!].map(name=>json<Properties>(name+'/properties.json'))),props=groups.reduce((a,b)=>({...a,...b,plants:{...a.plants,...b.plants},zombies:{...a.zombies,...b.zombies},armors:{...a.armors,...b.armors},projectiles:{...a.projectiles,...b.projectiles},plantAnimations:{...a.plantAnimations,...b.plantAnimations}}));props.zombies.mummy_flag=await json('battle/flag.json');
 const plants=[...new Set([...config.plants.map(p=>p.kind),...(level.preset??[]),...level.protectedPlants.map(p=>p.kind),...level.initialPlants.map(p=>p.kind),...(level.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...level.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 await scene.init(host,()=>{},config,plants,level);game=new Game(level,props,scene.timing,z=>scene!.absorptionTarget(z),1234,false);scene.frameCombat();draw();});
}
for(const seconds of [.1,1,5])button(`推进${seconds}秒`,()=>{for(let i=0;i<seconds*60;i++){game!.tick(1/60);scene!.sync(game!,1/60);}draw();});
button('武器架换装',()=>{for(const t of [...game!.graves])game!.spawnZombie('monk',t.row,cellX(t.column)+20);draw();});
button('布阵开始',()=>{game!.preparing=false;draw();});
button('清场结算',()=>{game!.preparing=false;if(game!.level.targetSun)game!.dropSun(cellX(0),rowY(0),game!.level.targetSun,'plant');for(let i=0;i<30000&&game!.phase==='playing';i++){game!.tick(1/60);for(const z of game!.zombies)game!.damage(z,100000,'water');}draw();});

button('奖励图',()=>{const config=BATTLE_LEVELS[`kongfu${game!.level.day}`];const img=new Image();img.src=config.firstReward.plant?scene!.art.card(scene!.app,config.firstReward.plant):scene!.art.image(scene!.app,'reward',config.firstReward.animation);host.append(img);});
button('仙桃治疗',()=>{game!.graves=[];game!.addPlant('peach',2,2);game!.addPlant('wallnut',2,3);game!.plants.at(-1)!.hp=1000;game!.spawnZombie('monk_blade',2,cellX(3)+40);draw();});
button('仙桃能量豆',()=>{game!.food=1;game!.plantFood(2,2);draw();});
button('轻功小鬼',()=>{const z=game!.spawnZombie('monk_imp',0,cellX(8));z.kongfu!.next=0;game!.addPlant('tallnut',0,5);draw();});
