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
for(const w of ['egypt','pirate','cowboy','future'])progress.finish(w,w+'8');progress.finishPresentation();for(const w of ['pirate','cowboy','future','dark','beach','iceage'])progress.unlockWorld(w);
storage.setItem('pvz2-web:map-rewards',JSON.stringify(BATTLE_LEVELS.iceage1.plants.map(({id},node)=>({world:'fixture',node,kind:'plant',id}))));
const battleHost=document.querySelector<HTMLElement>('#battle')!,sceneHost=document.querySelector<HTMLElement>('#scene')!,worldHost=document.querySelector<HTMLElement>('#world')!,status=document.querySelector<HTMLElement>('#status')!,controls=document.querySelector('#controls')!;
let battle:ReturnType<typeof createBattle>|undefined,scene:Scene|undefined,game:Game|undefined;
const shell=new WorldShell(worldHost,async id=>{battle=createBattle(battleHost,async()=>{await battle!.dispose();battle=undefined;await shell.resume();},BATTLE_LEVELS[id],progress);await battle.enter();},storage);
async function clean(){if(battle){await battle.dispose();battle=undefined;}if(scene){await scene.dispose();scene=undefined;}sceneHost.hidden=true;worldHost.hidden=true;battleHost.hidden=true;}
function button(label:string,action:()=>Promise<void>|void){const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{try{await action();}catch(e){status.textContent=String(e);throw e;}};controls.append(b);}
function draw(){scene!.sync(game!,0);scene!.render();status.textContent=`第${game!.level.day}关${game!.boosts.size?"（花园强化）":""} / ${game!.time.toFixed(1)}s / ${game!.phase} / ${game!.wave}波 / ${game!.zombies.length}僵尸`;}
button('世界地图',async()=>{await clean();worldHost.hidden=false;await shell.init();});
for(const day of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38])button(`进入第${day}关`,async()=>{await clean();battle=createBattle(battleHost,async()=>{await battle!.dispose();battle=undefined;},BATTLE_LEVELS[`iceage${day}`],progress);await battle.enter();});
for(const day of [1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35,36,37,38])button(`场景${day}`,async()=>{
 await clean();sceneHost.hidden=false;scene=new Scene();const config=BATTLE_LEVELS[`iceage${day}`],level=readLevel(await json<SourceLevel>(config.source));
 const groups=await Promise.all(['levels','campaign','pirate','cowboy','future','dark','beach','iceage'].map(name=>json<Properties>(name+'/properties.json'))),flag=await json<Properties['zombies']['mummy_flag']>('battle/flag.json');
 const props=groups.reduce((a,b)=>({...a,...b,plants:{...a.plants,...b.plants},zombies:{...a.zombies,...b.zombies},armors:{...a.armors,...b.armors},projectiles:{...a.projectiles,...b.projectiles},plantAnimations:{...a.plantAnimations,...b.plantAnimations}}));props.zombies.mummy_flag=flag;
 await scene.init(sceneHost,()=>{},config,[...config.plants.map(p=>p.kind),...(level.preset??[]),...level.protectedPlants.map(p=>p.kind),...level.initialPlants.map(p=>p.kind),...(level.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...level.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])],level);game=new Game(level,props,scene.timing,z=>({x:z.x,y:rowY(z.row)}),1234,false);scene.frameCombat();draw();
});
for(const seconds of [.1,1,5])button(`推进${seconds}秒`,()=>{for(let i=0;i<seconds*60;i++){game!.tick(1/60);scene!.sync(game!,1/60);}draw();});

button('融化第一块冰',()=>{const b=game!.iceage.blocks[0];game!.plant('hotpotato',b.row,b.column);draw();});
button('寒风与滑道',()=>{game!.iceage.wind([{row:0,left:false},{row:2,left:false},{row:4,left:false}]);for(const s of game!.level.sliders)game!.spawnZombie('iceage_armor1',s.row,cellX(s.column));draw();});

button('辣椒供暖与猎人',()=>{game!.plants=[];game!.iceage.blocks=[];game!.addPlant('wallnut',2,2);game!.addPlant('pepperpult',1,2);game!.iceage.freeze(1,1);game!.addPlant('cabbagepult',1,1);game!.spawnZombie('iceage_hunter',2,cellX(5));game!.spawnZombie('iceage_armor3',1,cellX(6));draw();});
button('辣椒大招',()=>{game!.food=1;game!.plantFood(1,2);draw();});
button('击倒僵尸',()=>{for(const z of game!.zombies)game!.damage(z,10000);game!.tick(1/60);scene!.sync(game!,1/60);draw();});

button('渡渡鸟越障',()=>{game!.plants=[];game!.iceage.blocks=[];game!.addPlant('wallnut',2,4);game!.spawnZombie('iceage_dodo',2,cellX(5));draw();});
button('巨人投掷',()=>{const z=game!.spawnZombie('iceage_gargantuar',3,cellX(7));game!.damage(z,2300);draw();});
button('开始预布阵战斗',()=>{game!.startLastStand();draw();});

button('穴居僵尸推冰',()=>{game!.plants=[];game!.iceage.blocks=[];const z=game!.spawnZombie('iceage_troglobite',2,cellX(4));z.x=cellX(7);game!.addPlant('wallnut',2,3);draw();});
button('洋葱眩晕',()=>{game!.zombies=[];game!.iceage.blocks=[];game!.addPlant('stunion',2,3);game!.spawnZombie('iceage',2,cellX(4));draw();});
button('洋葱大招',()=>{game!.plants=[];game!.addPlant('stunion',2,3);for(const row of [1,2,3])game!.spawnZombie('iceage',row,cellX(5));game!.food=1;game!.plantFood(2,3);draw();});

button('火焰豌豆射击',()=>{game!.plants=[];game!.zombies=[];game!.iceage.blocks=[];game!.addPlant('firepeashooter',2,2);game!.addPlant('wallnut',1,2);game!.iceage.freeze(1,2);game!.spawnZombie('iceage_armor2',2,cellX(6));draw();});
button('火焰豌豆大招',()=>{game!.food=1;game!.plantFood(2,2);draw();});
button('鼬鼠出笼',()=>{const z=game!.spawnZombie('iceage_weaselhoarder',2,cellX(7));game!.damage(z,45);draw();});

button('原始豌豆与砖甲',()=>{game!.addPlant('primalpeashooter',2,2);game!.spawnZombie('iceage_armor4',2,cellX(6));draw();});
button('原始豌豆大招',()=>{game!.food=1;game!.plantFood(2,2);draw();});
button('僵王战植物',()=>{for(const row of [0,1,2,3,4]){game!.addPlant('firepeashooter',row,1);game!.addPlant('pepperpult',row,0);}draw();});

button('榴莲接触攻击',()=>{game!.plants=[];game!.zombies=[];game!.iceage.blocks=[];game!.addPlant('endurian',2,3);game!.spawnZombie('iceage_armor2',2,cellX(3)+35);draw();});
button('榴莲大招',()=>{game!.food=1;game!.plantFood(2,3);draw();});
button('老练猎人与推冰',()=>{game!.plants=[];game!.zombies=[];game!.iceage.blocks=[];game!.addPlant('wallnut',2,1);game!.addPlant('wallnut',2,3);game!.spawnZombie('iceage_hunter_veteran',2,cellX(7));game!.spawnZombie('iceage_troglobite_veteran',4,cellX(4));draw();});
