import '../src/shell/style.css';
import '../src/style.css';
import {WorldShell} from '../src/shell/controller';
import {ProgressStore} from '../src/shell/progression';
import {createBattle} from '../src/battle';
import {BATTLE_LEVELS} from '../src/game/levels';
import {Scene} from '../src/rendering/scene';
import {Game} from '../src/game/model';
import {readLevel,rowY,cellX,BOARD,type Properties,type SourceLevel} from '../src/game/level';
import {playCowboy,playCowboyNext} from './cowboy-strategy';
import {json,assetUrl} from '../src/assets/load';
const font=new FontFace('PvZMap',`url('${assetUrl('shell/map-font.woff2')}')`);document.fonts.add(await font.load());
const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}},progress=new ProgressStore(storage);
progress.finish('egypt','egypt8');progress.finish('pirate','pirate8');progress.finishPresentation();progress.unlockWorld('pirate');progress.unlockWorld('cowboy');
storage.setItem('pvz2-web:map-rewards',JSON.stringify(BATTLE_LEVELS.cowboy1.plants.map(({id},node)=>({world:'cowboy',node,kind:'plant',id}))));
const battleHost=document.querySelector<HTMLElement>('#battle')!,sceneHost=document.querySelector<HTMLElement>('#scene')!,worldHost=document.querySelector<HTMLElement>('#world')!,status=document.querySelector<HTMLElement>('#status')!,controls=document.querySelector('#controls')!;
let battle:ReturnType<typeof createBattle>|undefined,scene:Scene|undefined,game:Game|undefined;
const shell=new WorldShell(worldHost,async id=>{battle=createBattle(battleHost,async()=>{await battle!.dispose();battle=undefined;await shell.resume();},BATTLE_LEVELS[id],progress);await battle.enter();},storage);
async function clean(){if(battle){await battle.dispose();battle=undefined;}if(scene){await scene.dispose();scene=undefined;}sceneHost.hidden=true;worldHost.hidden=true;battleHost.hidden=true;}
function button(label:string,action:()=>Promise<void>|void){const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{try{await action();}catch(e){status.textContent=String(e);throw e;}};controls.append(b);}
button('世界地图',async()=>{await clean();worldHost.hidden=false;await shell.init();});
for(let day=1;day<=10;day++)button(`进入第${day}关`,async()=>{await clean();battle=createBattle(battleHost,async()=>{await battle!.dispose();battle=undefined;},BATTLE_LEVELS[`cowboy${day}`],progress);await battle.enter();});
for(let day=1;day<=10;day++)button(`场景${day}`,async()=>{
 await clean();sceneHost.hidden=false;scene=new Scene();const config=BATTLE_LEVELS[`cowboy${day}`],level=readLevel(await json<SourceLevel>(config.source));
 const groups=await Promise.all(['levels','campaign','pirate','cowboy'].map(name=>json<Properties>(name+'/properties.json'))),flag=await json<Properties['zombies']['mummy_flag']>('battle/flag.json');
 const props=groups.reduce((a,b)=>({...a,...b,plants:{...a.plants,...b.plants},zombies:{...a.zombies,...b.zombies},armors:{...a.armors,...b.armors},projectiles:{...a.projectiles,...b.projectiles},plantAnimations:{...a.plantAnimations,...b.plantAnimations}}));props.zombies.mummy_flag=flag;
 await scene.init(sceneHost,()=>{},config,config.plants.map(p=>p.kind),level);
 game=new Game(level,props,scene.timing,z=>({x:z.x,y:rowY(z.row)}),1234,false);scene.frameCombat();
 if(day>5){game.sun=9999;game['nextWave']=Infinity;game.preparing=false;if(day===10){game.plant('lightningreed',2,2);game.spawnZombie('chicken_farmer',2,cellX(7));}if(day===8){game.spawnZombie('cowboy_gargantuar',2,cellX(7));}if(day===9){game.plant('wintermelon',2,3);game.spawnZombie('cowboy_armor2',2,cellX(7));}}
 else if(day!==4){game.sun=9999;game['nextWave']=Infinity;const cart=game.cowboy.carts[0];game.plant('peashooter',cart.row,cart.column);game.plant('splitpea',2,4);game.plant('chilibean',3,4);game.spawnZombie('cowboy',3,cellX(4));game.spawnZombie('cowboy_armor1',1,cellX(8));if(day===2||day===5)game.spawnZombie('prospector',2,cellX(7));if(day===3)game.spawnZombie('piano',0,cellX(6));if(day===5)game.spawnZombie('poncho_plate',4,cellX(6));}
 else game.tick(1/60);
 scene.onPoint=(x,y)=>game!.cowboy.select(Math.floor((y-BOARD.top)/BOARD.cellHeight),Math.floor((x-BOARD.left)/BOARD.cellWidth));scene.onHover=(_x,y)=>{game!.cowboy.move(Math.floor((y-BOARD.top)/BOARD.cellHeight));scene!.sync(game!,0);scene!.render();};scene.onRelease=()=>{game!.cowboy.selected=null;};
 scene.sync(game,0);scene.render();status.textContent=`场景${day} 已加载`;
});
for(const seconds of [.1,1,5,20])button(`推进${seconds}秒`,()=>{for(let i=0;i<seconds*60;i++){game!.tick(1/60);scene!.sync(game!,1/60);}scene!.render();status.textContent=`${game!.time.toFixed(1)}s / ${game!.phase} / ${game!.wave}波`;} );
button('裂荚大招',()=>{game!.food=1;game!.plantFood(2,4);});
button('巴豆大招',()=>{game!.sun=999;game!.cooldowns.chilibean=0;game!.plant('chilibean',4,0);game!.food=1;game!.plantFood(4,0);});
button('移动矿车',()=>{const c=game!.cowboy.carts[0];game!.cowboy.select(c.row,c.column);game!.cowboy.move(c.row===c.end?c.start:c.end);scene!.sync(game!,0);scene!.render();status.textContent=`矿车 ${c.column},${c.row}`;});
button('击倒僵尸',()=>{for(const z of game!.zombies)game!.damage(z,10000);game!.tick(1/60);scene!.sync(game!,1/60);scene!.render();});
button('种下本波卡片',()=>{const g=game!,p=g.conveyor[0];if(p){const c=g.cowboy.carts.find(c=>!g.plants.some(p=>p.row===c.row&&p.column===c.column));if(c)g.plant(p.kind,c.row,c.column,p.id);}scene!.sync(g,0);scene!.render();});

let replayFrame=0;
button('本关合法通关回放',()=>{
 const current=game!;game=new Game(current.level,current.props,scene!.timing,z=>scene!.absorptionTarget(z),1234,false);if(game.level.corral)game.boosts=new Set(['peashooter']);replayFrame=0;scene!.reset();scene!.frameCombat();scene!.sync(game,0);scene!.render();status.textContent=game.level.corral?'第4关回放：一份成熟豌豆射手花园强化':'本关回放：正常阳光、卡片与冷却';
});
button('回放推进20秒',()=>{for(let i=0;i<1200&&game!.phase==='playing';i++,replayFrame++){(game!.level.day>5?playCowboyNext:playCowboy)(game!,replayFrame);game!.tick(1/60);scene!.sync(game!,1/60);game!.events.length=0;}scene!.render();status.textContent=`回放 ${game!.level.day} / ${game!.time.toFixed(1)}s / ${game!.phase} / ${game!.wave}波`;});

button('巨人抛掷',()=>{const z=game!.zombies.find(z=>z.kind==='cowboy_gargantuar')!;game!.damage(z,1900);});
button('释放鸡群',()=>{const z=game!.zombies.find(z=>z.kind==='chicken_farmer')!;game!.damage(z,40);});
button('冰西瓜大招',()=>{game!.food=1;game!.plantFood(2,3);});
