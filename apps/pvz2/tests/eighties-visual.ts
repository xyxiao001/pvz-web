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
const draw=()=>{scene!.sync(game!,0);scene!.render();status.textContent=`魔音${game!.level.day} ${game!.time.toFixed(1)}s ${game!.phase} 波次${game!.wave} 音乐${game!.eighties.musicJam} 植物${game!.plants.length} 复活格${game!.eighties.carrot.cells.size}`;};
const button=(label:string,run:()=>void|Promise<void>)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{Promise.resolve(run()).catch(e=>{status.textContent=String(e);console.error(e);});};controls.append(b);};
async function clean(){if(battle){await battle.dispose();battle=undefined;}if(scene){await scene.dispose();scene=undefined;}host.replaceChildren();battleHost.hidden=true;host.hidden=true;}
for(const day of [41,42]){
 button(`进入${day}关`,async()=>{await clean();battleHost.hidden=false;battle=createBattle(battleHost,async()=>{await clean();},BATTLE_LEVELS[`eighties${day}`],progress);await battle.enter();status.textContent=`魔音${day}正式入口`;});
 button(`场景${day}`,async()=>{await clean();host.hidden=false;scene=new Scene();const config=BATTLE_LEVELS[`eighties${day}`],level=readLevel(await json<SourceLevel>(config.source));
 const groups=await Promise.all(['levels','campaign',...config.bundles!].map(name=>json<Properties>(name+'/properties.json'))),props=groups.reduce((a,b)=>({...a,...b,plants:{...a.plants,...b.plants},zombies:{...a.zombies,...b.zombies},armors:{...a.armors,...b.armors},projectiles:{...a.projectiles,...b.projectiles},plantAnimations:{...a.plantAnimations,...b.plantAnimations}}));props.zombies.mummy_flag=await json('battle/flag.json');
 const plants=[...new Set(['thymewarp' as const,'phatbeet' as const,'cactus' as const,...config.plants.map(p=>p.kind),...(level.preset??[]),...level.protectedPlants.map(p=>p.kind),...level.initialPlants.map(p=>p.kind),...(level.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...level.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 await scene.init(host,()=>{},config,plants,level);game=new Game(level,props,scene.timing,z=>scene!.absorptionTarget(z),1234,false);scene.frameCombat();draw();});
}
for(const seconds of [.1,1,5])button(`推进${seconds}秒`,()=>{for(let i=0;i<seconds*60;i++){game!.tick(1/60);scene!.sync(game!,1/60);}draw();});
button('复活预设',()=>{for(let c=0;c<7;c++)game!.addPlant('intensivecarrot',2,c);draw();});
button('末关植物',()=>{game!.addPlant('strawburst',0,1);game!.addPlant('hollyknight',2,1);game!.addPlant('loquat',3,4);game!.spawnZombie('eighties_armor4',4,cellX(5));draw();});
button('草莓发射',()=>{game!.eighties.finale.click(0,1);draw();});
button('冬青落点',()=>{game!.eighties.finale.click(2,1);game!.eighties.finale.fire(1,4);draw();});
button('草莓能量豆',()=>{game!.food=1;game!.plantFood(0,1);draw();});
button('冬青能量豆',()=>{game!.food=1;game!.plantFood(2,1);draw();});
button('清场结算',()=>{if(game!.preparing)game!.startLastStand();for(let i=0;i<40000&&game!.phase==='playing';i++){game!.tick(1/60);for(const z of game!.zombies)game!.damage(z,100000,'water');}draw();});
