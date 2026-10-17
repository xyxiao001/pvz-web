import '../src/shell/style.css';
import '../src/style.css';
import {WorldShell} from '../src/shell/controller';
import {ProgressStore} from '../src/shell/progression';
import {createBattle} from '../src/battle';
import {BATTLE_LEVELS} from '../src/game/levels';
import {Scene} from '../src/rendering/scene';
import {Game} from '../src/game/model';
import {readLevel,rowY,cellX,type Properties,type SourceLevel} from '../src/game/level';
import {playFuture,playFutureNext} from './future-strategy';
import {json,assetUrl} from '../src/assets/load';
const font=new FontFace('PvZMap',`url('${assetUrl('shell/map-font.woff2')}')`);document.fonts.add(await font.load());
const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}},progress=new ProgressStore(storage);
for(const w of ['egypt','pirate','cowboy'])progress.finish(w,w+'8');progress.finishPresentation();for(const w of ['pirate','cowboy','future'])progress.unlockWorld(w);
storage.setItem('pvz2-web:map-rewards',JSON.stringify(BATTLE_LEVELS.future1.plants.map(({id},node)=>({world:'fixture',node,kind:'plant',id}))));
const battleHost=document.querySelector<HTMLElement>('#battle')!,sceneHost=document.querySelector<HTMLElement>('#scene')!,worldHost=document.querySelector<HTMLElement>('#world')!,status=document.querySelector<HTMLElement>('#status')!,controls=document.querySelector('#controls')!;
let battle:ReturnType<typeof createBattle>|undefined,scene:Scene|undefined,game:Game|undefined,frame=0;
const shell=new WorldShell(worldHost,async id=>{battle=createBattle(battleHost,async()=>{await battle!.dispose();battle=undefined;await shell.resume();},BATTLE_LEVELS[id],progress);await battle.enter();},storage);
async function clean(){if(battle){await battle.dispose();battle=undefined;}if(scene){await scene.dispose();scene=undefined;}sceneHost.hidden=true;worldHost.hidden=true;battleHost.hidden=true;}
function button(label:string,action:()=>Promise<void>|void){const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{try{await action();}catch(e){status.textContent=String(e);throw e;}};controls.append(b);}
function draw(){scene!.sync(game!,0);scene!.render();status.textContent=`第${game!.level.day}关 / ${game!.time.toFixed(1)}s / ${game!.phase} / ${game!.wave}波 / ${game!.zombies.length}僵尸`;}
button('世界地图',async()=>{await clean();worldHost.hidden=false;await shell.init();});
for(let day=1;day<=10;day++)button(`进入第${day}关`,async()=>{await clean();battle=createBattle(battleHost,async()=>{await battle!.dispose();battle=undefined;},BATTLE_LEVELS[`future${day}`],progress);await battle.enter();});
for(let day=1;day<=10;day++)button(`场景${day}`,async()=>{
 await clean();sceneHost.hidden=false;scene=new Scene();const config=BATTLE_LEVELS[`future${day}`],level=readLevel(await json<SourceLevel>(config.source));
 const groups=await Promise.all(['levels','campaign','pirate','cowboy','future'].map(name=>json<Properties>(name+'/properties.json'))),flag=await json<Properties['zombies']['mummy_flag']>('battle/flag.json');
 const props=groups.reduce((a,b)=>({...a,...b,plants:{...a.plants,...b.plants},zombies:{...a.zombies,...b.zombies},armors:{...a.armors,...b.armors},projectiles:{...a.projectiles,...b.projectiles},plantAnimations:{...a.plantAnimations,...b.plantAnimations}}));props.zombies.mummy_flag=flag;
 await scene.init(sceneHost,()=>{},config,[...config.plants.map(p=>p.kind),...level.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])],level);game=new Game(level,props,scene.timing,z=>({x:z.x,y:rowY(z.row)}),1234,false);scene.frameCombat();frame=0;draw();
});
for(const seconds of [.1,1,5])button(`推进${seconds}秒`,()=>{for(let i=0;i<seconds*60;i++){game!.tick(1/60);scene!.sync(game!,1/60);}draw();});
button('回放推进20秒',()=>{for(let i=0;i<1200&&game!.phase==='playing';i++,frame++){(game!.level.day>=6?playFutureNext:playFuture)(game!,frame);game!.tick(1/60);scene!.sync(game!,1/60);game!.events.length=0;}draw();});
button('瓷砖激光护盾检查',()=>{const g=game!;g['nextWave']=Infinity;for(const row of [0,2,4])g.addPlant('laser_bean',row,1);g.spawnZombie('future_protector',2,cellX(7));g.spawnZombie('future_armor2',0,cellX(6));g.food=1;draw();});
button('瓷砖联动大招',()=>{game!.plantFood(0,1);draw();});
button('空降三叶草检查',()=>{const g=game!;g.spawnZombie('future_imp',2,cellX(6),'spider');g.spawnZombie('future_jetpack',3,cellX(6));g.addPlant('blover',4,1);draw();});
button('阳光炸弹检查',()=>{const g=game!;g['nextWave']=Infinity;g.spawnZombie('future_armor2',2,cellX(5));g.dropSun(cellX(5),rowY(2)-45,50,'sky');draw();});
button('点击紫色阳光',()=>{const s=game!.suns.find(s=>s.bomb)!;game!.collect(s.id);draw();});
button('击倒僵尸',()=>{for(const z of game!.zombies)game!.damage(z,10000);game!.tick(1/60);scene!.sync(game!,1/60);draw();});
button('未来首通奖励地图',async()=>{await clean();storage.setItem('pvz2-web:world-navigation',JSON.stringify({world:'future',chooser:3,cameras:{future:0}}));progress.finish('future','future1');worldHost.hidden=false;const rewardsShell=new WorldShell(worldHost,async()=>{},storage);await rewardsShell.init();progress.finish('future','future2');progress.finish('future','future3');await rewardsShell.resume();status.textContent=`地图奖励：激光豆 ${progress.ownedPlants().has(89)} / 三叶草 ${progress.ownedPlants().has(36)}`;});

button('机械技能检查',()=>{const g=game!;g['nextWave']=Infinity;g.spawnZombie(g.level.day===8?'future_gargantuar':'disco_mech',2,cellX(7));g.addPlant('citron',2,1);g.addPlant('citron',0,1);draw();});
button('电磁桃检查',()=>{game!.addPlant('empea',1,6);draw();});
button('柚子大招检查',()=>{game!.food=1;game!.plantFood(2,1);draw();});

button('完整回放',async()=>{for(let chunk=0;chunk<500&&game!.phase==='playing';chunk++){for(let i=0;i<120&&game!.phase==='playing';i++,frame++){(game!.level.day>=6?playFutureNext:playFuture)(game!,frame);game!.tick(1/60);scene!.sync(game!,1/60);game!.events.length=0;}draw();await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));}draw();});
