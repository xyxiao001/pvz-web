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
const draw=()=>{scene!.sync(game!,0);scene!.render();status.textContent=`侏罗纪${game!.level.day} ${game!.time.toFixed(1)}s ${game!.phase} 波次${game!.wave} 植物${game!.plants.length} 迅猛龙${game!.dino.raptors.length} 葡萄${game!.escape.grapes.length} 生产阳光${game!.sunProduced} 霸王龙${game!.dino.tyranno.items.map(d=>d.animation+(d.charmed?"魅惑":"")).join(",")} 恐龙${game!.dino.visitors.items.map(d=>d.kind+':'+d.animation+(d.charmed?'魅惑':'')).join(',')}`;};
const button=(label:string,run:()=>void|Promise<void>)=>{const b=document.createElement('button');b.textContent=label;b.onclick=()=>{Promise.resolve(run()).catch(e=>{status.textContent=String(e);console.error(e);});};controls.append(b);};
async function clean(){if(battle){await battle.dispose();battle=undefined;}if(scene){await scene.dispose();scene=undefined;}host.replaceChildren();battleHost.hidden=true;host.hidden=true;}
for(const day of [2,3,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25]){
 button(`进入${day}关`,async()=>{await clean();battleHost.hidden=false;battle=createBattle(battleHost,async()=>{await clean();},BATTLE_LEVELS[`dino${day}`],progress);await battle.enter();status.textContent=`侏罗纪${day}正式入口`;});
 button(`场景${day}`,async()=>{await clean();host.hidden=false;scene=new Scene();const config=BATTLE_LEVELS[`dino${day}`],level=readLevel(await json<SourceLevel>(config.source));
 const groups=await Promise.all(['levels','campaign',...config.bundles!].map(name=>json<Properties>(name+'/properties.json'))),props=groups.reduce((a,b)=>({...a,...b,plants:{...a.plants,...b.plants},zombies:{...a.zombies,...b.zombies},armors:{...a.armors,...b.armors},projectiles:{...a.projectiles,...b.projectiles},plantAnimations:{...a.plantAnimations,...b.plantAnimations}}));props.zombies.mummy_flag=await json('battle/flag.json');
 const plants=[...new Set(['primalpotatomine' as const,'primalsunflower' as const,'perfumeshroom' as const,'grapeshot' as const,'primalwallnut' as const,...config.plants.map(p=>p.kind),...(level.preset??[]),...level.protectedPlants.map(p=>p.kind),...level.initialPlants.map(p=>p.kind),...(level.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...level.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 await scene.init(host,()=>{},config,plants,level);game=new Game(level,props,scene.timing,z=>scene!.absorptionTarget(z),1234,false);scene.frameCombat();draw();});
}
for(const seconds of [.1,1,5])button(`推进${seconds}秒`,()=>{for(let i=0;i<seconds*60;i++){game!.tick(1/60);scene!.sync(game!,1/60);}draw();});
button('迅猛龙踢击',()=>{Object.assign(game!,{nextWave:Infinity});game!.dino.add({kind:'raptor',row:2,delay:0});game!.tick(1/60);const r=game!.dino.raptors[0];r.x=cellX(7);r.detect=true;for(const [i,kind] of (['dino_armor1','dino_armor2','dino_armor3','dino_imp'] as const).entries())game!.spawnZombie(kind,i+1,cellX(7)-25);draw();});
button('原始坚果能量豆',()=>{game!.addPlant('primalwallnut',0,3);game!.food=1;game!.plantFood(0,3);draw();});
button('葡萄爆炸',()=>{game!.addPlant('grapeshot',2,4);draw();});
button('护甲脱落',()=>{for(const z of game!.zombies)game!.damage(z,z.armor);draw();});

button('剑龙与翼龙',()=>{Object.assign(game!,{nextWave:Infinity});game!.dino.add({kind:'stego',row:1,delay:0});game!.dino.add({kind:'ptero',row:3,delay:0});game!.tick(1/60);for(const row of [1,3])game!.spawnZombie('dino_armor2',row,cellX(7));draw();});
button('香水魅惑',()=>{for(const row of [1,2,3])game!.addPlant('perfumeshroom',row,4);draw();});

button('巨人重击坚果',()=>{Object.assign(game!,{nextWave:Infinity});game!.plants=[];game!.addPlant('primalwallnut',2,5);game!.spawnZombie('dino_gargantuar',2,cellX(5)+40);draw();});
button('巨人投掷小鬼',()=>{Object.assign(game!,{nextWave:Infinity});const z=game!.spawnZombie('dino_gargantuar',3,cellX(7));z.hp=2600;draw();});

button('霸王龙咆哮',()=>{Object.assign(game!,{nextWave:Infinity});game!.dino.add({kind:'tyranno',row:2,delay:0});game!.tick(1/60);game!.spawnZombie('dino_armor2',2,cellX(7));draw();});
button('霸王龙魅惑',()=>{game!.addPlant('perfumeshroom',2,5);game!.spawnZombie('dino_gargantuar',2,cellX(6));draw();});
button('原始向日葵生产',()=>{Object.assign(game!,{nextWave:Infinity});game!.addPlant('primalsunflower',0,2);draw();});
button('原始向日葵能量豆',()=>{game!.food=1;game!.plantFood(0,2);draw();});

button('原始地雷成长',()=>{Object.assign(game!,{nextWave:Infinity});game!.addPlant('primalpotatomine',1,3);draw();});
button('原始地雷引爆',()=>{for(const row of [0,1,2])game!.spawnZombie('dino_armor2',row,cellX(3));draw();});
button('原始地雷能量豆',()=>{game!.addPlant('primalpotatomine',4,2);game!.food=1;game!.plantFood(4,2);draw();});
button('甲龙撞击',()=>{Object.assign(game!,{nextWave:Infinity});game!.dino.add({kind:'ankylo',row:3,delay:0});game!.spawnZombie('dino_bully',3,cellX(7));game!.addPlant('wallnut',3,4);draw();});
button('甲龙魅惑',()=>{game!.addPlant('perfumeshroom',3,5);game!.spawnZombie('dino_armor2',3,cellX(7));draw();});
