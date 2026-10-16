// Manual visual regression harness. Vite's production entry does not include this page.
import { Scene } from '../src/rendering/scene';
import { Game, type Zombie } from '../src/game/model';
import { json } from '../src/assets/load';
import { cellX, rowY, readLevel, type Properties, type SourceLevel, type ZombieKind, type ZombieProperties } from '../src/game/level';

const state=document.querySelector<HTMLElement>('#state')!;
const scene=new Scene();
await scene.init(document.querySelector<HTMLElement>('#canvas')!,(done,total)=>{state.textContent=`加载 ${done}/${total}`;});
const props=await json<Properties>('levels/properties.json');
props.zombies.mummy_flag=await json<ZombieProperties>('battle/flag.json');
const level=readLevel(await json<SourceLevel>('levels/egypt1.source.json'));
let game:Game;
let serial=9000;
function zombie(kind:ZombieKind,x:number,row=2):Zombie {
  return {id:serial++,kind,row,x,hp:props.zombies[kind].Toughness,armor:kind==='mummy_armor1'?370:0,eating:false,absorbed:0,absorbUntil:0,absorbState:'idle',absorbAt:0,deathCause:'normal'};
}
function report(){state.textContent=`时间 ${game.time.toFixed(2)} · 活僵尸 ${game.zombies.length} · 死亡记录 ${game.deaths.length} · 阳光 ${game.suns.length} · 演出 ${scene.hasDeathAnimations?'进行中':'已结束'}`;}
function render(){scene.sync(game,0);scene.render();report();}
scene.onPoint=(x,y)=>{const sun=game.suns.find(s=>Math.hypot(x-s.x,y-s.y)<38);if(sun){game.collect(sun.id);render();}};
function reset(){scene.reset();scene.setCamera(0);game=new Game(level,props,scene.timing,zombie=>scene.absorptionTarget(zombie),42);}
function zombies(){reset();game.zombies=(['mummy','mummy_flag','ra','mummy_armor1'] as const).map((kind,i)=>zombie(kind,400+i*180));render();}
function advance(seconds:number){for(let i=0;i<Math.round(seconds*60);i++){game.tick(1/60);scene.sync(game,1/60);game.events.length=0;}scene.render();report();}
function effects(){
  reset();game.sun=500;
  game.plant('peashooter',1,1);game.plant('sunflower',2,1);game.plant('potatomine',3,4);
  game.plants[1].nextAction=0;game.plants[2].age=props.plants.potatomine.ChargeTime-.1;
  game.zombies.push(zombie('mummy',700,1),zombie('mummy',cellX(4)+30,3));render();
}
function ra(){
  reset();game.zombies.push(zombie('ra',850));
  for(let i=0;i<3;i++)game.suns.push({id:8000+i,x:350+i*90,y:rowY(i+1),targetY:rowY(i+1),value:50,age:0,from:'sky',vx:0,vy:0,groundAge:0,absorber:null,absorbAge:0});
  render();
}
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-action]'))button.onclick=()=>{
  switch(button.dataset.action){
    case 'spawn':reset();scene.frameCombat();game.zombies=(['mummy','mummy_flag','ra','mummy_armor1'] as const).map((kind,i)=>zombie(kind,1070,i));game.suns.push({id:8000,x:cellX(4),y:rowY(2),targetY:rowY(2),value:50,age:0,from:'sky',vx:0,vy:0,groundAge:0,absorber:null,absorbAge:0});render();break;
    case 'reset':zombies();break;
    case 'normal':case 'potato':case 'mower':for(const z of game.zombies){z.hp=0;z.deathCause=button.dataset.action;}advance(1/60);break;
    case 'effects':effects();break;
    case 'ra':ra();break;
    case 'collect':for(const sun of [...game.suns])game.collect(sun.id);render();break;
    case 'step':advance(.2);break;
    case 'second':advance(1);break;
  }
};
zombies();document.querySelector<HTMLFieldSetElement>('fieldset')!.disabled=false;
