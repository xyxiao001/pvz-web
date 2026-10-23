// Fixed scene and seed; no player save data is written by this harness.
import { Scene } from '../src/rendering/scene';
import { Game } from '../src/game/model';
import { BATTLE_LEVELS } from '../src/game/levels';
import { readLevel, cellX, rowY, type Properties, type SourceLevel, type PlantKind } from '../src/game/level';
import { json } from '../src/assets/load';

const host = document.querySelector<HTMLElement>('#scene')!;
const status = document.querySelector<HTMLOutputElement>('#status')!;
const measure = document.querySelector<HTMLButtonElement>('#measure')!;
const step = document.querySelector<HTMLButtonElement>('#step')!;
const config = BATTLE_LEVELS.egypt3;
const [source, base, campaign, flag] = await Promise.all([
  json<SourceLevel>(config.source), json<Properties>('levels/properties.json'),
  json<Properties>('campaign/properties.json'), json<Properties['zombies']['mummy_flag']>('battle/flag.json'),
]);
const props = {...campaign, plants:{...base.plants,...campaign.plants}, zombies:{...base.zombies,...campaign.zombies,mummy_flag:flag}, armors:{...base.armors,...campaign.armors}};
const level = readLevel(source);
const scene = new Scene();
const plants: PlantKind[] = ['sunflower','peashooter','cabbagepult','wallnut','potatomine'];
await scene.init(host, (done,total) => { status.value = `${done}/${total}`; }, config, plants, level);
const game = new Game(level, props, scene.timing, z=>({x:z.x,y:rowY(z.row)}),42,false);
game.plants=[];game.graves=[];game.sun=99999;
for(let row=0;row<5;row++)for(let column=0;column<6;column++){
  const kind=plants[column%plants.length];game.cooldowns[kind]=0;game.plant(kind,row,column);
}
for(let i=0;i<40;i++)game.spawnZombie(i%3===0?'mummy_armor2':'mummy',i%5,cellX(6)+(i%8)*22);
scene.frameCombat();scene.sync(game,0);scene.render();
status.value=`${game.plants.length} 株植物 · ${game.zombies.length} 只僵尸`;
measure.disabled=step.disabled=false;
const percentile=(values:number[],p:number)=>[...values].sort((a,b)=>a-b)[Math.floor((values.length-1)*p)];
measure.onclick=async()=>{
  measure.disabled=step.disabled=true;
  const sync:number[]=[],render:number[]=[];
  for(let i=0;i<720;i++){
    const start=performance.now();scene.sync(game,1/60);const middle=performance.now();scene.render();const end=performance.now();
    if(i>=120){sync.push(middle-start);render.push(end-middle);}
    if(i%12===0)await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  }
  const stats=(values:number[])=>({mean:values.reduce((a,b)=>a+b)/values.length,p50:percentile(values,.5),p95:percentile(values,.95)});
  const result={plants:game.plants.length,zombies:game.zombies.length,frames:sync.length,syncMs:stats(sync),renderSubmitMs:stats(render),textureMiB:scene.textureBytes/1024/1024};
  document.querySelector('#result')!.textContent=JSON.stringify(result,null,2);
  measure.disabled=step.disabled=false;
};
step.onclick=()=>{
  for(let i=0;i<300;i++){game.tick(1/60);scene.sync(game,1/60);game.events.length=0;}
  scene.render();status.value=`${game.time.toFixed(1)}s · ${game.plants.length} 株植物 · ${game.zombies.length} 只僵尸`;
};
