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
const draw=()=>{scene!.sync(game!,0);scene!.render();status.textContent=`魔音${game!.level.day} ${game!.time.toFixed(1)}s ${game!.phase} 波次${game!.wave} 音乐${game!.eighties.jam}`;};
const button=(label:string,run:()=>void|Promise<void>)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{Promise.resolve(run()).catch(e=>{status.textContent=String(e);console.error(e);});};controls.append(b);};
async function clean(){if(battle){await battle.dispose();battle=undefined;}if(scene){await scene.dispose();scene=undefined;}host.replaceChildren();battleHost.hidden=true;host.hidden=true;}
for(const day of [6,7,8,9,10]){
 button(`进入${day}关`,async()=>{await clean();battleHost.hidden=false;battle=createBattle(battleHost,async()=>{await clean();},BATTLE_LEVELS[`eighties${day}`],progress);await battle.enter();status.textContent=`魔音${day}正式入口`;});
 button(`场景${day}`,async()=>{await clean();host.hidden=false;scene=new Scene();const config=BATTLE_LEVELS[`eighties${day}`],level=readLevel(await json<SourceLevel>(config.source));
 const groups=await Promise.all(['levels','campaign',...config.bundles!].map(name=>json<Properties>(name+'/properties.json'))),props=groups.reduce((a,b)=>({...a,...b,plants:{...a.plants,...b.plants},zombies:{...a.zombies,...b.zombies},armors:{...a.armors,...b.armors},projectiles:{...a.projectiles,...b.projectiles},plantAnimations:{...a.plantAnimations,...b.plantAnimations}}));props.zombies.mummy_flag=await json('battle/flag.json');
 const plants=[...new Set(['thymewarp' as const,'phatbeet' as const,'cactus' as const,...config.plants.map(p=>p.kind),...(level.preset??[]),...level.protectedPlants.map(p=>p.kind),...level.initialPlants.map(p=>p.kind),...(level.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...level.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 await scene.init(host,()=>{},config,plants,level);game=new Game(level,props,scene.timing,z=>scene!.absorptionTarget(z),1234,false);scene.frameCombat();draw();});
}
for(const seconds of [.1,1,5])button(`推进${seconds}秒`,()=>{for(let i=0;i<seconds*60;i++){game!.tick(1/60);scene!.sync(game!,1/60);}draw();});
button('闪光场景',()=>{game!.plants=[];game!.graves=[];game!.zombies=[];game!.addPlant('wallnut',2,3);game!.addPlant('magnetshroom',1,2);game!.spawnZombie('eighties_glitter',2,cellX(4));game!.spawnZombie('eighties_armor2',2,cellX(6));game!.spawnZombie('eighties_punk',1,cellX(4));game!.eighties.jam='jam_pop';draw();});
button('MC场景',()=>{game!.plants=[];game!.graves=[];game!.zombies=[];game!.addPlant('wallnut',2,4);game!.addPlant('wallnut',1,5);game!.addPlant('spikerock',3,5);game!.spawnZombie('eighties_mc',2,cellX(5));game!.eighties.jam='jam_rap';draw();});
button('逆时草',()=>{game!.addPlant('thymewarp',0,2);draw();});
button('清场结算',()=>{if(game!.level.targetSun)game!.dropSun(400,200,game!.level.targetSun,'plant');for(let i=0;i<30000&&game!.phase==='playing';i++){game!.tick(1/60);for(const z of game!.zombies)game!.damage(z,100000,'water');}draw();});
