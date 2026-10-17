import { BATTLE_LEVELS } from '../src/game/levels';
import {Scene} from '../src/rendering/scene';
import {Game} from '../src/game/model';
import {json} from '../src/assets/load';
import {readLevel,cellX,type SourceLevel,type Properties,type PlantKind} from '../src/game/level';
const state=document.querySelector<HTMLElement>('#state')!,fieldset=document.querySelector('fieldset')!;
window.addEventListener('error',e=>{document.querySelector('#errors')!.textContent+=e.message+'\n';});
window.addEventListener('unhandledrejection',e=>{document.querySelector('#errors')!.textContent+=String(e.reason?.stack??e.reason)+'\n';});
const base=await json<Properties>('levels/properties.json'),extra=await json<Properties>('campaign/properties.json');
const props:Properties={...extra,plants:{...base.plants,...extra.plants},zombies:{...base.zombies,...extra.zombies,mummy_flag:await json('battle/flag.json')},armors:{...base.armors,...extra.armors}};
let scene:Scene,game:Game;
function render(){scene.render();state.textContent=`时间 ${game.time.toFixed(2)} · 状态 ${game.phase} · 僵尸 ${game.zombies.length} · 僵王 ${game.boss?.animation??''} ${game.boss?.zombie.hp??''}`;}
function advance(seconds:number){for(let i=0;i<seconds*60;i++){game.tick(1/60);scene.sync(game,1/60);game.events.length=0;}render();}
async function setup(day:number){
 fieldset.disabled=true;await scene?.dispose();scene=new Scene();
 const level=readLevel(await json<SourceLevel>(`campaign/egypt${day}.source.json`));
 const plants:PlantKind[]=day===25?['bloomerang','bonkchoy','cabbagepult','repeater','iceburg','wallnut']:day===35?['bloomerang','celerystalker','parsnip','repeater','sapfling','gravebuster','iceburg']:day===28?['sunflower','snowdrop','peashooter','iceburg','gravebuster','imitater']:day===29?['peapod','melonpult','kernelpult','repeater']:day===34?['cherry_bomb','sunflower','wallnut','iceburg','gravebuster']:['sunflower','repeater','wallnut'];
 await scene.init(document.querySelector('#canvas')!,(n,total)=>{state.textContent=`加载 ${n}/${total}`;},BATTLE_LEVELS[`egypt${day}`],plants,level);
 game=new Game(level,props,scene.timing,z=>scene.absorptionTarget(z),1234,false);scene.frameCombat();game.graves=[];game.sun=20000;game.imitateKind='snowdrop';
 plants.forEach((kind,i)=>{const row=i%5,column=1+Math.floor(i/5);if(level.conveyor){game.conveyor.push({id:99900+i,kind,lane:0,position:0});game.plant(kind,row,column,99900+i);}else game.plant(kind,row,column);});
 if(day===35){const z=game.spawnZombie('mummy_armor4',1,cellX(1)-55);z.hp=5000;z.frozenUntil=10000;}
 if(!game.boss){for(let row=0;row<5;row++){const z=game.spawnZombie(day===34?'pharaoh_weak':day===28?'explorer':'mummy',row,cellX(7));z.hp=20000;}if(day===29){for(let i=0;i<4;i++){game.conveyor.push({id:99000+i,kind:'peapod',lane:0,position:0});game.plant('peapod',0,1,99000+i);}}}
 advance(.1);fieldset.disabled=false;
}
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-day]'))b.onclick=()=>{void setup(Number(b.dataset.day));};
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-action]'))b.onclick=()=>{
 const action=b.dataset.action;if(action==='step')advance(.2);if(action==='second')advance(1);if(action==='ten')advance(10);
 if(action==='food'){game.food=10;for(const p of [...game.plants])game.plantFood(p.row,p.column);advance(.5);}
 if(action==='damage'){game.damage(game.boss!.zombie,1e6);advance(.1);}
 if(action==='kill'){for(const z of game.zombies)if(z!==game.boss?.zombie)game.damage(z,1e6,'potato');advance(.1);}
};
await setup(35);
