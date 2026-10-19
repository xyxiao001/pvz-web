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
for(const w of ['egypt','pirate','cowboy','future'])progress.finish(w,w+'8');progress.finishPresentation();for(const w of ['pirate','cowboy','future','dark','beach','iceage'])progress.unlockWorld(w);progress.unlockWorld('lostcity');
storage.setItem('pvz2-web:map-rewards',JSON.stringify(BATTLE_LEVELS.lostcity1.plants.map(({id},node)=>({world:'fixture',node,kind:'plant',id}))));
const battleHost=document.querySelector<HTMLElement>('#battle')!,sceneHost=document.querySelector<HTMLElement>('#scene')!,worldHost=document.querySelector<HTMLElement>('#world')!,status=document.querySelector<HTMLElement>('#status')!,controls=document.querySelector('#controls')!;
let battle:ReturnType<typeof createBattle>|undefined,scene:Scene|undefined,game:Game|undefined;
const shell=new WorldShell(worldHost,async id=>{battle=createBattle(battleHost,async()=>{await battle!.dispose();battle=undefined;await shell.resume();},BATTLE_LEVELS[id],progress);await battle.enter();},storage);
async function clean(){if(battle){await battle.dispose();battle=undefined;}if(scene){await scene.dispose();scene=undefined;}sceneHost.hidden=true;worldHost.hidden=true;battleHost.hidden=true;}
function button(label:string,action:()=>Promise<void>|void){const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{try{await action();}catch(e){status.textContent=String(e);throw e;}};controls.append(b);}
function draw(){scene!.sync(game!,0);scene!.render();status.textContent=`第${game!.level.day}关${game!.boosts.size?"（花园强化）":""} / ${game!.time.toFixed(1)}s / ${game!.phase} / ${game!.wave}波 / ${game!.zombies.length}僵尸`;}
button('世界地图',async()=>{await clean();worldHost.hidden=false;await shell.init();});
for(const day of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23])button(`进入第${day}关`,async()=>{await clean();battle=createBattle(battleHost,async()=>{await battle!.dispose();battle=undefined;},BATTLE_LEVELS[`lostcity${day}`],progress);await battle.enter();});
for(const day of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23])button(`场景${day}`,async()=>{
 await clean();sceneHost.hidden=false;scene=new Scene();const config=BATTLE_LEVELS[`lostcity${day}`],level=readLevel(await json<SourceLevel>(config.source));
 const groups=await Promise.all(['levels','campaign','pirate','cowboy','future','dark','beach','iceage','lostcity'].map(name=>json<Properties>(name+'/properties.json'))),flag=await json<Properties['zombies']['mummy_flag']>('battle/flag.json');
 const props=groups.reduce((a,b)=>({...a,...b,plants:{...a.plants,...b.plants},zombies:{...a.zombies,...b.zombies},armors:{...a.armors,...b.armors},projectiles:{...a.projectiles,...b.projectiles},plantAnimations:{...a.plantAnimations,...b.plantAnimations}}));props.zombies.mummy_flag=flag;
 await scene.init(sceneHost,()=>{},config,[...config.plants.map(p=>p.kind),...(level.preset??[]),...level.protectedPlants.map(p=>p.kind),...level.initialPlants.map(p=>p.kind),...(level.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...level.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])],level);game=new Game(level,props,scene.timing,z=>({x:z.x,y:rowY(z.row)}),1234,false);scene.frameCombat();draw();
});
for(const seconds of [.1,1,5])button(`推进${seconds}秒`,()=>{for(let i=0;i<seconds*60;i++){game!.tick(1/60);scene!.sync(game!,1/60);}draw();});

button('黄金砖种植',()=>{game!.addPlant('peashooter',1,0);draw();});
button('降落伞入场',()=>{const z=game!.spawnZombie('lostcity_lostpilot',2,cellX(4),'parachute');z.pilot!.fallTime=1.5;draw();});
button('熔岩喷发',()=>{game!.addPlant('lavaguava',3,3);game!.spawnZombie('lostcity_armor2',3,cellX(3)+30);draw();});
button('熔岩大招',()=>{game!.addPlant('lavaguava',1,2);game!.spawnZombie('lostcity_armor2',1,cellX(6));game!.food=1;game!.plantFood(1,2);draw();});
button('击倒僵尸',()=>{for(const z of game!.zombies)game!.damage(z,10000);game!.tick(1/60);scene!.sync(game!,1/60);draw();});
button('铲子挖植物',()=>{game!.addPlant('wallnut',2,3);game!.spawnZombie('lostcity_excavator',2,cellX(3)+40);draw();});
button('阿开木与阳伞',()=>{game!.addPlant('akee',1,0);game!.addPlant('akee',3,0);game!.spawnZombie('lostcity_excavator',1,cellX(5));game!.spawnZombie('lostcity_jane',3,cellX(5));game!.spawnZombie('lostcity_imp',1,cellX(7));draw();});
button('阿开木大招',()=>{game!.food=1;game!.plantFood(1,0);draw();});

button('飞虫越过植物',()=>{game!.addPlant('wallnut',1,4);game!.addPlant('tallnut',3,4);for(const row of [1,3])game!.spawnZombie('lostcity_bug_armor2',row,cellX(4)+50);draw();});
button('击落飞虫',()=>{for(const z of game!.zombies)if(z.bug)game!.damage(z,350);draw();});
button('火把巨人',()=>{game!.addPlant('endurian',2,4);game!.spawnZombie('lostcity_gargantuar',2,cellX(4)+60);draw();});
button('巨人投掷',()=>{for(const z of game!.zombies)if(z.kind==='lostcity_gargantuar')game!.damage(z,1900);draw();});
button('熄灭火把',()=>{for(const z of game!.zombies)if(z.kind==='lostcity_gargantuar')game!.chill(z,5);draw();});

button('搬运工搭帐篷',()=>{const tile=game!.level.goldTiles[0];game!.spawnZombie('lostcity_impporter',tile.row,cellX(tile.column));draw();});
button('搬运工掉背包',()=>{const z=game!.spawnZombie('lostcity_impporter',2,cellX(5));game!.damage(z,400);draw();});
button('阿开木攻击帐篷',()=>{const tile=game!.level.goldTiles[0];game!.addPlant('akee',tile.row,0);draw();});
button('摧毁帐篷背包',()=>{for(const t of game!.graves)if(t.kind==='tent'||t.kind==='backpack')t.hp=0;draw();});

button('金蟾菇吞食',()=>{game!.addPlant('toadstool',2,1);game!.spawnZombie('lostcity_armor2',2,cellX(4));draw();});
button('金蟾菇大招',()=>{game!.food=1;game!.plantFood(2,1);for(const row of [0,1,3,4])game!.spawnZombie('lostcity',row,cellX(4));draw();});
button('触发机关',()=>{game!.addPlant('puffshroom',0,4);game!.addPlant('puffshroom',2,4);game!.spawnZombie('lostcity_armor2',0,cellX(6));game!.spawnZombie('lostcity',3,cellX(5));draw();});
button('遗迹猎人入场',()=>{game!.spawnZombie('lostcity_relichunter',2,1100);draw();});
