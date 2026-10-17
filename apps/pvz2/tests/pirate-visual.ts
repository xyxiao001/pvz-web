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
progress.finish('egypt','egypt8');progress.finishPresentation();
storage.setItem('pvz2-web:map-rewards',JSON.stringify([4,5,6,12,25,7,8,30,59,37,32].map((id,node)=>({world:'egypt',node,kind:'plant',id}))));
const battleHost=document.querySelector<HTMLElement>('#battle')!,sceneHost=document.querySelector<HTMLElement>('#scene')!,worldHost=document.querySelector<HTMLElement>('#world')!,status=document.querySelector<HTMLElement>('#status')!,controls=document.querySelector('#controls')!;
let battle:ReturnType<typeof createBattle>|undefined,scene:Scene|undefined,game:Game|undefined;
const shell=new WorldShell(worldHost,async id=>{battle=createBattle(battleHost,async()=>{await battle!.dispose();battle=undefined;await shell.resume();},BATTLE_LEVELS[id],progress);await battle.enter();},storage);
async function clean(){if(battle){await battle.dispose();battle=undefined;}if(scene){await scene.dispose();scene=undefined;}sceneHost.hidden=true;worldHost.hidden=true;battleHost.hidden=true;}
function button(label:string,action:()=>Promise<void>|void){const b=document.createElement('button');b.textContent=label;b.onclick=async()=>{try{await action();}catch(e){status.textContent=String(e);throw e;}};controls.append(b);}
button('世界解锁',async()=>{await clean();worldHost.hidden=false;await shell.init();});
for(let day=1;day<=10;day++)button(`进入第${day}关`,async()=>{await clean();battle=createBattle(battleHost,async()=>{await battle!.dispose();battle=undefined;},BATTLE_LEVELS[`pirate${day}`],progress);await battle.enter();});
for(const day of [1,2,3,4,5,6,7,8,9,10])button(`场景${day}`,async()=>{
 await clean();sceneHost.hidden=false;scene=new Scene();const config=BATTLE_LEVELS[`pirate${day}`],level=readLevel(await json<SourceLevel>(config.source));
 const [base,campaign,extra,flag]=await Promise.all([json<Properties>('levels/properties.json'),json<Properties>('campaign/properties.json'),json<Properties>('pirate/properties.json'),json<Properties['zombies']['mummy_flag']>('battle/flag.json')]);
 const props={...campaign,plants:{...base.plants,...campaign.plants,...extra.plants},zombies:{...base.zombies,...campaign.zombies,...extra.zombies,mummy_flag:flag},armors:{...base.armors,...campaign.armors,...extra.armors},projectiles:{...campaign.projectiles,...extra.projectiles},plantAnimations:{...campaign.plantAnimations,...extra.plantAnimations}};
 await scene.init(sceneHost,()=>{},config,['sunflower','peashooter','kernelpult','snapdragon','coconutcannon','spikeweed','springbean'],level);
 game=new Game(level,props,scene.timing,z=>({x:z.x,y:rowY(z.row)}),42,false);scene.frameCombat();
 if(day!==3){game.sun=9999;for(let row=0;row<5;row++){game.cooldowns.snapdragon=0;game.plant('snapdragon',row,1);}game.spawnZombie('pirate_armor2',0,cellX(6));if(level.waves.flat().includes('swashbuckler'))game.spawnZombie('swashbuckler',2,1070);if(level.waves.flat().includes('seagull'))game.spawnZombie('seagull',3,cellX(7));}
 if(day>=7)game.spawnZombie('barrelroller',2,cellX(6));if(day===8)game.spawnZombie('pirate_gargantuar',1,cellX(8));if(day===10)game.spawnZombie('cannon',4,1070);
 scene.sync(game,0);scene.render();status.textContent=`场景${day} 已加载`;
});
button('推进1秒',()=>{for(let i=0;i<60;i++){game!.tick(1/60);scene!.sync(game!,1/60);}scene!.render();status.textContent=`${game!.time.toFixed(1)}s / ${game!.phase} / ${game!.pirate.score}`;});
button('火龙草大招',()=>{game!.food=1;game!.plantFood(2,1);});
button('开炮',()=>{for(let row=0;row<5;row++)game!.pirate.fire(row,1);});

button('地刺大招',()=>{game!.sun=9999;game!.cooldowns.spikeweed=0;game!.plant('spikeweed',2,3);game!.food=1;game!.plantFood(2,3);});
button('弹簧豆',()=>{game!.sun=9999;game!.cooldowns.springbean=0;game!.plant('springbean',1,4);game!.spawnZombie('pirate',1,cellX(4)+20);});
button('推进20秒',()=>{for(let i=0;i<1200;i++){game!.tick(1/60);scene!.sync(game!,1/60);}scene!.render();status.textContent=`${game!.time.toFixed(1)}s / ${game!.phase}`;});
