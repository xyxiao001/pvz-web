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
const draw=()=>{scene!.sync(game!,0);scene!.render();status.textContent=`魔音${game!.level.day} ${game!.time.toFixed(1)}s ${game!.phase} 波次${game!.wave} 音乐${game!.eighties.musicJam} 臭鼬${game!.zombies.filter(z=>z.kind==='eighties_skunk').length} 友军${game!.westFinale.allies.length}`;};
const button=(label:string,run:()=>void|Promise<void>)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{Promise.resolve(run()).catch(e=>{status.textContent=String(e);console.error(e);});};controls.append(b);};
async function clean(){if(battle){await battle.dispose();battle=undefined;}if(scene){await scene.dispose();scene=undefined;}host.replaceChildren();battleHost.hidden=true;host.hidden=true;}
for(const day of [36,37,38,39,40]){
 button(`进入${day}关`,async()=>{await clean();battleHost.hidden=false;battle=createBattle(battleHost,async()=>{await clean();},BATTLE_LEVELS[`eighties${day}`],progress);await battle.enter();status.textContent=`魔音${day}正式入口`;});
 button(`场景${day}`,async()=>{await clean();host.hidden=false;scene=new Scene();const config=BATTLE_LEVELS[`eighties${day}`],level=readLevel(await json<SourceLevel>(config.source));
 const groups=await Promise.all(['levels','campaign',...config.bundles!].map(name=>json<Properties>(name+'/properties.json'))),props=groups.reduce((a,b)=>({...a,...b,plants:{...a.plants,...b.plants},zombies:{...a.zombies,...b.zombies},armors:{...a.armors,...b.armors},projectiles:{...a.projectiles,...b.projectiles},plantAnimations:{...a.plantAnimations,...b.plantAnimations}}));props.zombies.mummy_flag=await json('battle/flag.json');
 const plants=[...new Set(['thymewarp' as const,'phatbeet' as const,'cactus' as const,...config.plants.map(p=>p.kind),...(level.preset??[]),...level.protectedPlants.map(p=>p.kind),...level.initialPlants.map(p=>p.kind),...(level.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...level.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 await scene.init(host,()=>{},config,plants,level);game=new Game(level,props,scene.timing,z=>scene!.absorptionTarget(z),1234,false);scene.frameCombat();draw();});
}
for(const seconds of [.1,1,5])button(`推进${seconds}秒`,()=>{for(let i=0;i<seconds*60;i++){game!.tick(1/60);scene!.sync(game!,1/60);}draw();});
button('老兵与重甲',()=>{game!.plants=[];game!.zombies=[];game!.graves=[];Object.assign(game!,{nextWave:Infinity});game!.addPlant('wallnut',2,4);game!.spawnZombie('eighties_punk_veteran',2,cellX(7));game!.spawnZombie('eighties_armor4',3,cellX(7));draw();});
button('普通伤害清场',()=>{for(const z of game!.zombies)game!.damage(z,100000);for(let i=0;i<120;i++){game!.tick(1/60);scene!.sync(game!,1/60);}draw();});
button('朋克音乐',()=>{game!.eighties.jam='jam_punk';draw();});
button('超能花菜场景',()=>{game!.plants=[];game!.zombies=[];game!.graves=[];Object.assign(game!,{nextWave:Infinity});game!.addPlant('caulipower',0,1);for(let row=0;row<5;row++)game!.spawnZombie('eighties_armor4',row,cellX(7));draw();});
button('超能花菜能量豆',()=>{game!.food=1;game!.plantFood(0,1);draw();});
button('清场结算',()=>{if(game!.preparing)game!.startLastStand();for(let i=0;i<30000&&game!.phase==='playing';i++){game!.tick(1/60);for(const z of game!.zombies)game!.damage(z,100000,'water');}draw();});
