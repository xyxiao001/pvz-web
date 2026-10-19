import '../src/shell/style.css';
import '../src/style.css';
import {WorldShell} from '../src/shell/controller';
import {ProgressStore} from '../src/shell/progression';
import {createBattle} from '../src/battle';
import {BATTLE_LEVELS} from '../src/game/levels';
import {Scene} from '../src/rendering/scene';
import {Game} from '../src/game/model';
import {readLevel,rowY,cellX,type Properties,type SourceLevel} from '../src/game/level';
import {json,assetUrl} from '../src/assets/load';
const font=new FontFace('PvZMap',`url('${assetUrl('shell/map-font.woff2')}')`);document.fonts.add(await font.load());
const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}},progress=new ProgressStore(storage);
for(const w of ['egypt','pirate','cowboy','future'])progress.finish(w,w+'8');progress.finishPresentation();for(const w of ['pirate','cowboy','future','dark','beach'])progress.unlockWorld(w);
storage.setItem('pvz2-web:map-rewards',JSON.stringify(BATTLE_LEVELS.beach1.plants.map(({id},node)=>({world:'fixture',node,kind:'plant',id}))));
const battleHost=document.querySelector<HTMLElement>('#battle')!,sceneHost=document.querySelector<HTMLElement>('#scene')!,worldHost=document.querySelector<HTMLElement>('#world')!,status=document.querySelector<HTMLElement>('#status')!,controls=document.querySelector('#controls')!;
let battle:ReturnType<typeof createBattle>|undefined,scene:Scene|undefined,game:Game|undefined;
const shell=new WorldShell(worldHost,async id=>{battle=createBattle(battleHost,async()=>{await battle!.dispose();battle=undefined;await shell.resume();},BATTLE_LEVELS[id],progress);await battle.enter();},storage);
async function clean(){if(battle){await battle.dispose();battle=undefined;}if(scene){await scene.dispose();scene=undefined;}sceneHost.hidden=true;worldHost.hidden=true;battleHost.hidden=true;}
function button(label:string,action:()=>Promise<void>|void){const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{try{await action();}catch(e){status.textContent=String(e);throw e;}};controls.append(b);}
function draw(){scene!.sync(game!,0);scene!.render();status.textContent=`第${game!.level.day}关${game!.boosts.size?"（花园强化）":""} / ${game!.time.toFixed(1)}s / ${game!.phase} / ${game!.wave}波 / ${game!.zombies.length}僵尸`;}
button('世界地图',async()=>{await clean();worldHost.hidden=false;await shell.init();});
for(const day of Array.from({length:5},(_,i)=>i+1))button(`进入第${day}关`,async()=>{await clean();battle=createBattle(battleHost,async()=>{await battle!.dispose();battle=undefined;},BATTLE_LEVELS[`beach${day}`],progress);await battle.enter();});
for(const day of Array.from({length:5},(_,i)=>i+1))button(`场景${day}`,async()=>{
 await clean();sceneHost.hidden=false;scene=new Scene();const config=BATTLE_LEVELS[`beach${day}`],level=readLevel(await json<SourceLevel>(config.source));
 const groups=await Promise.all(['levels','campaign','pirate','cowboy','future','dark','beach'].map(name=>json<Properties>(name+'/properties.json'))),flag=await json<Properties['zombies']['mummy_flag']>('battle/flag.json');
 const props=groups.reduce((a,b)=>({...a,...b,plants:{...a.plants,...b.plants},zombies:{...a.zombies,...b.zombies},armors:{...a.armors,...b.armors},projectiles:{...a.projectiles,...b.projectiles},plantAnimations:{...a.plantAnimations,...b.plantAnimations}}));props.zombies.mummy_flag=flag;
 await scene.init(sceneHost,()=>{},config,[...config.plants.map(p=>p.kind),...(level.preset??[]),...level.protectedPlants.map(p=>p.kind),...level.initialPlants.map(p=>p.kind),...(level.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...level.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])],level);game=new Game(level,props,scene.timing,z=>({x:z.x,y:rowY(z.row)}),1234,false);scene.frameCombat();draw();
});
for(const seconds of [.1,1,5])button(`推进${seconds}秒`,()=>{for(let i=0;i<seconds*60;i++){game!.tick(1/60);scene!.sync(game!,1/60);}draw();});

button('睡莲与海带',()=>{game!.sun=10000;game!.addPlant('tanglekelp',2,7);game!.spawnZombie('beach_armor2',2,cellX(7)+10);game!.addPlant('splitpea',0,2);draw();});
button('海带大招',()=>{game!.food=1;game!.plantFood(2,7);for(let row=0;row<5;row++)game!.spawnZombie('beach_fem_armor2',row,cellX(8));draw();});
button('击倒僵尸',()=>{for(const z of game!.zombies)game!.damage(z,10000);game!.tick(1/60);scene!.sync(game!,1/60);draw();});
