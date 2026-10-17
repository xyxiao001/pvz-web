import {Scene} from '../src/rendering/scene';
import {Game,type Zombie} from '../src/game/model';
import {json} from '../src/assets/load';
import {readLevel,cellX,rowY,type SourceLevel,type Properties} from '../src/game/level';
const font=new FontFace('PvZMap',`url('/pvz2/assets/shell/map-font.woff2')`);document.fonts.add(await font.load());
const base=await json<Properties>('levels/properties.json'),extra=await json<Properties>('campaign/properties.json');
const props:Properties={...extra,plants:{...base.plants,...extra.plants},zombies:{...base.zombies,...extra.zombies,mummy_flag:await json('battle/flag.json')},armors:{...base.armors,...extra.armors}};
const state=document.querySelector<HTMLElement>('#state')!,fieldset=document.querySelector('fieldset')!;
let scene:Scene,game:Game,serial=9000;
const zombie=(row:number,x:number):Zombie=>({id:serial++,kind:'mummy',row,x,hp:190,armor:0,eating:false,absorbed:0,absorbUntil:0,absorbState:'idle',absorbAt:0,deathCause:'normal',frozenUntil:0,chilledUntil:0,food:false,entry:'walk',entryAt:0,entryX:x,camelPart:0,team:0,leap:null});
function render(){scene.sync(game,0);scene.render();state.textContent=`时间 ${game.time.toFixed(2)} · 僵尸 ${game.zombies.length} · 墓碑 ${game.graves.length} · 演出 ${scene.hasDeathAnimations?'进行中':'结束'}`;}
function advance(seconds:number){for(let i=0;i<seconds*60;i++){game.tick(1/60);scene.sync(game,1/60);game.events.length=0;}render();}
async function setup(name:string){
 fieldset.disabled=true;scene?.dispose();scene=new Scene();
 const day=name==='lateplants'?21:name==='pharaoh'?12:name==='mold'?13:name==='bonk'?14:name==='protect'?15:name==='match16'?16:name==='match'?7:name==='garg'?8:name==='explorer'?9:name==='tomb'?10:name==='preset'?11:name==='power'?5:6;
 await scene.init(document.querySelector('#canvas')!,(n,total)=>{state.textContent=`加载 ${n}/${total}`;},day,['cabbagepult','bloomerang','iceburg',...(day===21?['repeater' as const,'kernelpult' as const,'melonpult' as const]:[]),...(day===9?['iceweed' as const]:[]),...(day===10?['gravebuster' as const]:[]),...(day===11?['twinsunflower' as const]:[]),...(day===14?['bonkchoy' as const]:[])]);
 const level=readLevel(await json<SourceLevel>(`campaign/egypt${day}.source.json`));
 if(name==='camel'){level.actions=[[{...level.actions[0][0],zombies:[{kind:'camel_onehump',row:2}]}]];level.waves=[['camel_onehump']];level.flagInterval=100;}
 if(name==='storm'){level.actions=[level.actions[9].filter(a=>a.mode==='storm')];level.waves=[level.actions[0].flatMap(a=>a.zombies.map(z=>z.kind))];level.flagInterval=100;}
 if(['garg','explorer','tomb','pharaoh','bonk'].includes(name)){const kind=name==='garg'?'egypt_gargantuar':name==='explorer'?'explorer':name==='pharaoh'||name==='bonk'?'pharaoh':'tomb_raiser';level.actions=[[{...level.actions[0][0],zombies:[{kind,row:2}],food:0}]];level.waves=[[kind]];level.flagInterval=100;}
 game=new Game(level,props,scene.timing,z=>scene.absorptionTarget(z),42,false);scene.frameCombat();
 if(name==='match'||name==='match16'){advance(6);}
 else if(['garg','explorer','tomb','pharaoh','bonk'].includes(name)){advance(15.6);game.zombies[0].x=cellX(6);if(name==='garg'){game.zombies[0].hp=1700;advance(.1);}if(name==='tomb')advance(7);if(name==='bonk'){game.graves=[];game.sun=500;game.plant('bonkchoy',2,4);game.zombies[0].x=cellX(5);advance(.5);}render();}
 else if(name==='mold'||name==='protect'){render();}
 else if(name==='preset'){game.sun=500;game.plant('twinsunflower',2,0);advance(8);}
 else if(name==='lateplants'){game.sun=2000;game.graves=[];for(const [r,kind] of (['repeater','kernelpult','melonpult'] as const).entries()){game.plant(kind,r+1,2);const z=zombie(r+1,cellX(8));z.hp=5000;game.zombies.push(z);}render();}
 else if(name==='plants'){
  game.sun=1000;game.plant('cabbagepult',1,2);game.plant('bloomerang',2,2);game.plant('iceburg',3,4);
  for(const row of [1,2,3])game.zombies.push(zombie(row,row===3?cellX(4)+30:cellX(8)));
  render();
 }else {advance(name==='storm'?18.8:15.6);if(name==='camel'){game.zombies.forEach((z,i)=>{z.x=650+i*60;});render();}}
 fieldset.disabled=false;
}
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-scene]'))b.onclick=()=>{void setup(b.dataset.scene!);};
for(const b of document.querySelectorAll<HTMLButtonElement>('[data-action]'))b.onclick=()=>{
 const action=b.dataset.action!;
 if(action==='pair'){const z=game.zombies.find(z=>game.camelCards.get(z.id)?.state==='back');if(z)game.flipCamel(z.id);advance(.2);}
 if(action==='bust'){const grave=game.graves[0];game.plant('gravebuster',grave.row,grave.column);advance(.8);}
 if(action==='step')advance(.2);if(action==='second')advance(1);
 if(action==='board'){for(const z of [...game.zombies])game.peas.push({id:serial++,row:z.row,x:z.x-25,y:rowY(z.row)-48,damage:z.kind==='pharaoh'?1201:251,powered:false});advance(.05);}
 if(action==='food'){game.food=3;for(const p of game.plants)game.plantFood(p.row,p.column);advance(.5);}
 if(action==='kill'){for(const z of game.zombies){z.hp=0;z.deathCause='normal';}advance(.05);}
 if(action==='zap'||action==='snow'||action==='cherry'){game.power=null;game.selectPower(action);const z=game.zombies[0];game.powerPointer(z.x,rowY(z.row)-50,true,true);advance(.25);}
};
await setup('plants');
