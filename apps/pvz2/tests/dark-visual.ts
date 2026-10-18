import '../src/shell/style.css';
import '../src/style.css';
import {WorldShell} from '../src/shell/controller';
import {ProgressStore} from '../src/shell/progression';
import {createBattle} from '../src/battle';
import {BATTLE_LEVELS} from '../src/game/levels';
import {Scene} from '../src/rendering/scene';
import {Game} from '../src/game/model';
import {readLevel,rowY,cellX,type Properties,type SourceLevel} from '../src/game/level';
import {playDark} from './dark-strategy';
import {json,assetUrl} from '../src/assets/load';
const font=new FontFace('PvZMap',`url('${assetUrl('shell/map-font.woff2')}')`);document.fonts.add(await font.load());
const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}},progress=new ProgressStore(storage);
for(const w of ['egypt','pirate','cowboy'])progress.finish(w,w+'8');progress.finishPresentation();for(const w of ['pirate','cowboy','future','dark'])progress.unlockWorld(w);
storage.setItem('pvz2-web:map-rewards',JSON.stringify(BATTLE_LEVELS.dark1.plants.map(({id},node)=>({world:'fixture',node,kind:'plant',id}))));
const battleHost=document.querySelector<HTMLElement>('#battle')!,sceneHost=document.querySelector<HTMLElement>('#scene')!,worldHost=document.querySelector<HTMLElement>('#world')!,status=document.querySelector<HTMLElement>('#status')!,controls=document.querySelector('#controls')!;
let battle:ReturnType<typeof createBattle>|undefined,scene:Scene|undefined,game:Game|undefined,frame=0;
const shell=new WorldShell(worldHost,async id=>{battle=createBattle(battleHost,async()=>{await battle!.dispose();battle=undefined;await shell.resume();},BATTLE_LEVELS[id],progress);await battle.enter();},storage);
async function clean(){if(battle){await battle.dispose();battle=undefined;}if(scene){await scene.dispose();scene=undefined;}sceneHost.hidden=true;worldHost.hidden=true;battleHost.hidden=true;}
function button(label:string,action:()=>Promise<void>|void){const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{try{await action();}catch(e){status.textContent=String(e);throw e;}};controls.append(b);}
function draw(){scene!.sync(game!,0);scene!.render();status.textContent=`第${game!.level.day}关 / ${game!.time.toFixed(1)}s / ${game!.phase} / ${game!.wave}波 / ${game!.zombies.length}僵尸`;}
button('世界地图',async()=>{await clean();worldHost.hidden=false;await shell.init();});
for(let day=1;day<=10;day++)button(`进入第${day}关`,async()=>{await clean();battle=createBattle(battleHost,async()=>{await battle!.dispose();battle=undefined;},BATTLE_LEVELS[`dark${day}`],progress);await battle.enter();});
for(let day=1;day<=10;day++)button(`场景${day}`,async()=>{
 await clean();sceneHost.hidden=false;scene=new Scene();const config=BATTLE_LEVELS[`dark${day}`],level=readLevel(await json<SourceLevel>(config.source));
 const groups=await Promise.all(['levels','campaign','pirate','cowboy','future','dark'].map(name=>json<Properties>(name+'/properties.json'))),flag=await json<Properties['zombies']['mummy_flag']>('battle/flag.json');
 const props=groups.reduce((a,b)=>({...a,...b,plants:{...a.plants,...b.plants},zombies:{...a.zombies,...b.zombies},armors:{...a.armors,...b.armors},projectiles:{...a.projectiles,...b.projectiles},plantAnimations:{...a.plantAnimations,...b.plantAnimations}}));props.zombies.mummy_flag=flag;
 await scene.init(sceneHost,()=>{},config,[...config.plants.map(p=>p.kind),...(level.preset??[]),...level.protectedPlants.map(p=>p.kind),...level.initialPlants.map(p=>p.kind),...(level.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...level.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])],level);game=new Game(level,props,scene.timing,z=>({x:z.x,y:rowY(z.row)}),1234,false);scene.frameCombat();frame=0;draw();
});
for(const seconds of [.1,1,5])button(`推进${seconds}秒`,()=>{for(let i=0;i<seconds*60;i++){game!.tick(1/60);scene!.sync(game!,1/60);}draw();});
button('回放推进20秒',()=>{for(let i=0;i<1200&&game!.phase==='playing';i++,frame++){playDark(game!,frame);game!.tick(1/60);scene!.sync(game!,1/60);game!.events.length=0;}draw();});

button('完整回放',async()=>{for(let chunk=0;chunk<500&&game!.phase==='playing';chunk++){for(let i=0;i<120&&game!.phase==='playing';i++,frame++){playDark(game!,frame);game!.tick(1/60);scene!.sync(game!,1/60);game!.events.length=0;}draw();await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}draw();});
button('小丑与大喷菇检查',()=>{const g=game!;g['nextWave']=Infinity;g.graves=[];g.addPlant('peashooter',0,1);g.addPlant('fumeshroom',2,1);g.addPlant('wallnut',0,0);g.spawnZombie('dark_juggler',0,cellX(5));g.spawnZombie('dark_juggler',2,cellX(5));g.spawnZombie('dark_armor2',2,cellX(6));draw();});
button('大喷菇大招',()=>{game!.food=1;game!.plantFood(2,1);draw();});
button('击倒僵尸',()=>{for(const z of game!.zombies)game!.damage(z,10000);game!.tick(1/60);scene!.sync(game!,1/60);draw();});

button('阳光豆与药水检查',()=>{const g=game!;g['nextWave']=Infinity;g.graves=[];g.dark.potions=[];g.addPlant('sunbean',0,2);g.addPlant('sunbean',2,2);g.food=1;g.plantFood(2,2);g.spawnZombie('dark_armor3',0,cellX(2)+20);g.spawnZombie('dark_armor3',2,cellX(2)+20);g.spawnZombie('dark',4,cellX(5)+10);g.dark.potions.push({id:g.nextEntityId(),kind:'zombiepotion_speed',row:4,column:5,animation:'Spawn',at:g.time,dropped:false},{id:g.nextEntityId(),kind:'zombiepotion_toughness',row:3,column:6,animation:'Spawn',at:g.time,dropped:false});draw();});
