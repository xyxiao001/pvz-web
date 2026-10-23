// Deterministic impact workload; no player save data is read or written.
import type {Container} from 'pixi.js';
import {Scene} from '../src/rendering/scene';
import {Game} from '../src/game/model';
import {BATTLE_LEVELS} from '../src/game/levels';
import {readLevel,cellX,rowY,type Properties,type SourceLevel} from '../src/game/level';
import {json} from '../src/assets/load';
const [source,base,campaign,extra,flag]=await Promise.all([json<SourceLevel>('pirate/pirate3.source.json'),json<Properties>('levels/properties.json'),json<Properties>('campaign/properties.json'),json<Properties>('pirate/properties.json'),json<Properties['zombies']['mummy_flag']>('battle/flag.json')]);
const props={...campaign,plants:{...base.plants,...campaign.plants,...extra.plants},zombies:{...base.zombies,...campaign.zombies,...extra.zombies,mummy_flag:flag},armors:{...base.armors,...campaign.armors,...extra.armors},projectiles:{...campaign.projectiles,...extra.projectiles},plantAnimations:{...campaign.plantAnimations,...extra.plantAnimations}};
const level=readLevel(source),scene=new Scene();
await scene.init(document.querySelector<HTMLElement>('#scene')!,()=>{},BATTLE_LEVELS.pirate3,['coconutcannon'],level);
const game=new Game(level,props,scene.timing,z=>({x:z.x,y:rowY(z.row)}),42,false);
game['nextWave']=Infinity;
scene.frameCombat();scene.sync(game,0);scene.render();
Object.assign(window,{cannonAudit:{scene,game}});
const button=document.querySelector<HTMLButtonElement>('#measure')!;
button.disabled=false;document.querySelector('#status')!.textContent='就绪';
button.onclick=async()=>{
 button.disabled=true;
 const results:object[]=[];
 const firstBirds=new Set<Container>();
 const check=(ok:boolean,message:string)=>{if(!ok)throw new Error(message);};
 for(let round=0;round<6;round++){
  for(let i=0;i<12;i++){const z=game.spawnZombie('seagull',2,cellX(5)+(i%4)*12);delete z.route;z.stunnedUntil=Infinity;}
  scene.sync(game,0);scene.render();
  const birds=[...scene['actors'].values()].filter(a=>a.kind==='seagull');
  if(round===0)for(const bird of birds)firstBirds.add(bird.root);
  else check(birds.length===12&&birds.every(bird=>firstBirds.has(bird.root)),'Cannon birds must reuse their original displays');
  check(birds.every(bird=>bird.rig.armature.getSlot('Seagull')!.childArmature!.animation.lastAnimationName==='Idle'),'Reused birds must fly again');
  const cannon=game.plants.find(p=>p.row===2)!;cannon.action='idle';cannon.animation='Idle';cannon.nextAction=game.time;
  const score=game.pirate.score;game.pirate.fire(2,1);
  let hitMs=0,hitRenderMs=0,maxMs=0,kills=0;
  for(let frame=0;frame<240;frame++){
   const previous=game.pirate.score,start=performance.now();game.tick(1/60);scene.sync(game,1/60);const middle=performance.now();scene.render();const end=performance.now();
   maxMs=Math.max(maxMs,end-start);
   if(game.pirate.score>previous){hitMs=middle-start;hitRenderMs=end-middle;kills=game.pirate.combo;}
   game.events.length=0;
   await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  }
  const pooled=scene['cannonBirdPool'].get('seagull')!;
  check(kills===12&&game.pirate.score-score===6000,'Cannon combo and score must stay unchanged');
  check(pooled.length===12&&pooled.every(a=>a.root.parent===null&&a.rig.armature.clock===null),'Pooled birds must leave the scene and animation clock');
  check(scene['particles'].size===0,'Feathers must finish and be released');
  results.push({round,kills,score:game.pirate.score-score,hitMs,hitRenderMs,maxMs,pooled:pooled.length});
  document.querySelector('#result')!.textContent=JSON.stringify(results,null,2);
 }
 scene.reset();
 check(scene['cannonBirdPool'].size===0&&scene['actors'].size===0&&[...firstBirds].every(root=>root.destroyed),'Reset must release cached and live birds');
 document.querySelector('#status')!.textContent='6 轮命中、复用、特效释放与重置检查通过';
 button.textContent='重新加载';button.onclick=()=>location.reload();button.disabled=false;
};
