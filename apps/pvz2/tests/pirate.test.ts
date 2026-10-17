import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Game} from '../src/game/model';
import {BATTLE_LEVELS} from '../src/game/levels';
import {readLevel,cellX,rowY,type Properties,type SourceLevel,type AnimationTiming} from '../src/game/level';
import {animationTimeline,specialAnimationTiming,bonkAnimationTiming,type Skeleton} from '../src/rendering/presentation';
import type {CampaignCatalog} from '../src/rendering/battle-art';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import type {WorldMap} from '../src/shell/types';
import {playPirate34} from './pirate34-strategy';
const read=<T>(path:string):T=>JSON.parse(readFileSync(new URL('../public/assets/'+path,import.meta.url),'utf8'));
const base=read<Properties>('levels/properties.json'),extra=read<Properties>('campaign/properties.json');
const props:Properties={...extra,plants:{...base.plants,...extra.plants},zombies:{...base.zombies,...extra.zombies,mummy_flag:read('battle/flag.json')},armors:{...base.armors,...extra.armors}};
const catalog=read<CampaignCatalog>('campaign/catalog.json');
const timeline=(actor:string,animation:string)=>animationTimeline(read<Skeleton>(`campaign/rigs/${catalog.actors[actor].rig}/skeleton.json`),catalog.actors[actor].armature,animation);
const nutFood=animationTimeline(read<Skeleton>('actors/wallnut/skeleton.json'),'Wall-nut','Food');
const timing:AnimationTiming={wallnutArmor:nutFood.events.wearArmor,wallnutFoodEnd:nutFood.events.foodEnd,shoot:.5,shootDuration:26/30,produce:23/30,produceDuration:40/30,mineGrow:.6,mineExplode:14/30,mineDeath:.5,raStart:25/30,raEnd:25/30,
 campaign:{cabbage:timeline('cabbagepult','Lob').events.Lob,cabbageDuration:timeline('cabbagepult','Lob').duration,cabbageFood:timeline('cabbagepult','Food').events.lobFood,cabbageFoodEnd:timeline('cabbagepult','Food').events.foodEnd,
 boomerang:timeline('bloomerang','Shoot').events.Shoot,boomerangDuration:timeline('bloomerang','Shoot').duration,boomerangCatch:timeline('bloomerang','Catch').duration,ice:timeline('iceburg','Death').events.explode,iceDuration:timeline('iceburg','Death').duration,iceFood:timeline('iceburg','Food').events.foodExplode/.8,iceFoodEnd:timeline('iceburg','Food').events.foodEnd/.8}};
timing.special=specialAnimationTiming(new Map(Object.entries(catalog.actors).map(([name,rig])=>[name,read<Skeleton>(`campaign/rigs/${rig.rig}/skeleton.json`)])));
timing.bonk=bonkAnimationTiming(read<Skeleton>(`campaign/rigs/${catalog.actors.bonkchoy.rig}/skeleton.json`));
const pirate=read<Properties>('pirate/properties.json');
Object.assign(props,{plants:{...props.plants,...pirate.plants},zombies:{...props.zombies,...pirate.zombies},armors:{...props.armors,...pirate.armors},projectiles:{...props.projectiles,...pirate.projectiles},plantAnimations:{...props.plantAnimations,...pirate.plantAnimations}});
const level=(day:number)=>readLevel(read<SourceLevel>(`pirate/pirate${day}.source.json`));
const create=(day:number)=>new Game(level(day),props,timing,z=>({x:z.x-25,y:rowY(z.row)-95}),1234);
const tick=(g:Game,n:number)=>{for(let i=0;i<Math.round(n*60);i++)g.tick(1/60);};
test('Pirate 1–5 preserve planks, disabled waves, cannon challenge and preset deck',()=>{
 assert.deepEqual([1,2,3,4,5].map(d=>level(d).waves.length),[10,10,12,12,16]);
 assert.deepEqual([1,2,3,4,5].map(d=>level(d).planks),[[0,1,3,4],[0,1,2,3],[],[1,2,3,4],[2,3]]);
 assert.ok(level(1).waves.flat().every(z=>String(z)!=='kungfu_imp'));
 assert.equal(level(3).cannon!.MinScore,5000);assert.equal(level(3).mowers,false);
 assert.deepEqual(level(5).preset,['sunflower','kernelpult','iceburg','wallnut','cherry_bomb']);
});
test('sea cells reject planting while wood planks remain usable',()=>{
 const g=create(1);g.sun=999;
 assert.equal(g.plant('wallnut',2,5),false);assert.equal(g.plant('wallnut',2,4),true);
 g.cooldowns.wallnut=0;assert.equal(g.plant('wallnut',1,8),true);
});
test('swashbuckler swings to the authored column before walking',()=>{
 const g=create(1),z=g.spawnZombie('swashbuckler',0,1070);
 assert.equal(z.x,cellX(4));g.damage(z,100);assert.equal(z.hp,190);
 tick(g,2);assert.equal(z.x,cellX(4));tick(g,3);assert.ok(z.x<cellX(4));assert.equal(z.swing,undefined);
});
test('cannon shots score a native triple-kill combo, consume no sun and require reload',()=>{
 const g=create(3);g['nextWave']=Infinity;
 assert.equal(g.plants.length,5);assert.equal(g.plant('sunflower',0,0),false);
 for(let i=0;i<3;i++){const z=g.spawnZombie('seagull',2,500+i*12);delete z.route;z.frozenUntil=100;}
 tick(g,.5);assert.equal(g.pirate.fire(2,1),true);assert.equal(g.pirate.fire(2,1),false);
 tick(g,1);assert.equal(g.pirate.score,600);assert.equal(g.pirate.combo,3);assert.equal(g.zombies.length,0);
 assert.equal(g.pirate.fire(2,1),false);tick(g,16);assert.equal(g.pirate.fire(2,1),true);
});
test('cannon route groups keep their spawn spacing and finish with a score failure when all birds escape',()=>{
 const g=create(3);tick(g,8);
 const group=g.zombies.filter(z=>z.route);assert.ok(group.length>1);assert.ok(new Set(group.map(z=>z.x)).size>1);
 for(let i=0;i<60*700&&g.phase==='playing';i++)g.tick(1/60);
 assert.equal(g.phase,'lost');assert.equal(g.lossReason,'score');assert.equal(g.wave,12);
});
test('snapdragon attacks three rows and plant food burns once per zombie then expires',()=>{
 const g=create(4);g['nextWave']=Infinity;g.sun=999;g.plant('snapdragon',2,2);
 const targets=[1,2,3].map(row=>{const z=g.spawnZombie('pirate_armor2',row,cellX(4));z.frozenUntil=100;return z;});
 tick(g,1.4);assert.ok(targets.every(z=>z.armor===1100-30));
 g.food=1;assert.equal(g.plantFood(2,2),true);tick(g,4);
 assert.equal(g.zombies.length,0);assert.equal(g.pirate.effects.length,0);assert.equal(g.plants[0].action,'idle');
});
test('world key opens Pirate once and world completion preserves independent progress and rewards',()=>{
 const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
 const progress=new ProgressStore(storage);assert.equal(progress.worldUnlocked('pirate'),false);assert.equal(progress.unlockWorld('pirate'),false);
 progress.finish('egypt','egypt8');assert.equal(progress.worldKeys(),1);assert.equal(progress.unlockWorld('pirate'),true);assert.equal(progress.unlockWorld('pirate'),false);assert.equal(progress.worldKeys(),0);
 const map=read<WorldMap>('shell/maps/pirate.json');
 for(let day=1;day<=20;day++){const id=`pirate${day}`;progress.finish('pirate',id);for(const event of completionEvents(map,id,progress.completed(map),progress.rewardNodes('pirate')))if(event.action==='reward')progress.award('pirate',map.islands.find(n=>n.node===event.node)!);progress.finishPresentation();}
 assert.ok(progress.ownedPlants().has(30));assert.ok(progress.ownedPlants().has(59));assert.ok(progress.ownedPlants().has(37));assert.ok(progress.ownedPlants().has(32));assert.ok(progress.ownedPlants().has(57));assert.ok(progress.ownedPlants().has(17));assert.ok(progress.ownedPlants().has(38));assert.ok(progress.ownedUpgrades().has(6));assert.equal(progress.battleBonuses().shovelRefund,.25);assert.equal(progress.worldKeys(),1);assert.equal(progress.isComplete('egypt1'),false);
 assert.equal(new ProgressStore(storage).worldUnlocked('pirate'),true);
 assert.deepEqual(progress.campaignRewards().filter(r=>r.level.startsWith('pirate')).map(r=>r.id),['dangerroom_pirate','spine_pirate','note_pirate','worldkey','spine_pirate','spine_pirate']);
});
for(const day of [1,2,4,5])test(`Pirate ${day} completes using legal seed planting and plant food`,()=>{
 const g=create(day),attacker=day===1?'cabbagepult':'kernelpult';
 for(let frame=0;frame<60*900&&g.phase==='playing';frame++){
  for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   const occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c),threats=[...g.zombies].filter(z=>!z.swing).sort((a,b)=>a.x-b.x);
   for(const z of threats)if(!g.plants.some(p=>p.row===z.row&&p.kind===attacker))g.plant(attacker,z.row,2);
   for(const col of [0,1])for(let row=0;row<5;row++)if(!occupied(row,col))g.plant('sunflower',row,col);
   for(const col of [2,3,4])for(let row=0;row<5;row++)if(!occupied(row,col))g.plant(attacker,row,col);
   for(const z of threats)if(z.x<700){g.plant('wallnut',z.row,4);g.plant('iceburg',z.row,Math.floor((z.x-190)/82));if(day===5&&z.x<550)g.plant('cherry_bomb',z.row,Math.floor((z.x-190)/82));}
   const target=threats.find(z=>z.x<850);if(target){const p=g.plants.find(p=>p.row===target.row&&p.kind===attacker);if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`day ${day}, time ${g.time}, wave ${g.wave}, kills ${g.kills}`);
});
test('Pirate 3 can reach the authored target with player-triggered cannon shots',()=>{
 const g=create(3);
 for(let frame=0;frame<60*700&&g.phase==='playing';frame++){
  if(frame%6===0)for(let row=0;row<5;row++)if(g.zombies.some(z=>z.route&&Math.abs(z.route.y-rowY(row))<42&&z.x>cellX(2)&&z.x<950))g.pirate.fire(row,1);
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`score ${g.pirate.score}, time ${g.time}, wave ${g.wave}`);assert.ok(g.pirate.score>=5000);
});
test('Pirate assets match the pinned extraction manifest',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../pirate-provenance.json',import.meta.url),'utf8'));
 for(const [path,expected] of Object.entries(manifest.outputs) as [string,{bytes:number;sha256:string}][]){const data=readFileSync(new URL('../public/assets/'+path,import.meta.url));assert.equal(data.length,expected.bytes,path);assert.equal(createHash('sha256').update(data).digest('hex'),expected.sha256,path);}
});

test('Pirate 6–10 preserve authored raids, deck rows and rewards',()=>{
 assert.deepEqual([6,7,8,9,10].map(d=>level(d).waves.length),[16,16,18,14,16]);
 assert.deepEqual([6,7,8,9,10].map(d=>level(d).planks),[[2,3],[1,2,3],[1,2,3],[0,1],[1,2]]);
 assert.deepEqual(level(6).actions.flat().filter(a=>a.mode==='raid').map(a=>a.zombies.length),[3,5]);
 assert.deepEqual(level(8).actions.flat().filter(a=>a.mode==='raid').map(a=>a.zombies.length),[4,8,10]);
 assert.equal(level(8).mowers,false);assert.equal(level(8).sunDrops,false);
 assert.ok(level(8).conveyor!.InitialPlantList.some(p=>p.PlantType==='spikeweed'));
});
test('raiding parties respect their group interval and swing on arrival',()=>{
 const g=create(6);g.level.actions=[g.level.actions[9].filter(a=>a.mode==='raid')];g.level.waves=[['swashbuckler','swashbuckler','swashbuckler']];g['nextWave']=0;
 g.tick(1/60);assert.equal(g.zombies.length,0);tick(g,1.1);
 assert.equal(g.zombies.length,3);assert.ok(g.zombies.every(z=>z.swing));
});
test('barrel is a separate target and a spikeweed breaks it, releasing two adjacent imps',()=>{
 const g=create(7);g['nextWave']=Infinity;g.sun=999;g.plant('spikeweed',2,3);
 const pusher=g.spawnZombie('barrelroller',2,cellX(3)+62),barrel=g.zombies.find(z=>z.id===pusher.barrel)!;
 assert.equal(barrel.hp,1100);tick(g,.1);
 assert.equal(pusher.barrel,undefined);assert.equal(g.plants.length,0);
 const imps=g.zombies.filter(z=>z.kind==='pirate_imp');assert.equal(imps.length,2);assert.deepEqual(imps.map(z=>z.leap!.toRow),[1,3]);assert.ok(pusher.hp>0);
});
test('pirate giant throws two imps at the native animation event',()=>{
 const g=create(8);g['nextWave']=Infinity;
 const giant=g.spawnZombie('pirate_gargantuar',2,cellX(6));g.damage(giant,1900);tick(g,1.5);assert.equal(g.zombies.length,1);
 tick(g,.1);assert.equal(g.zombies.filter(z=>z.kind==='pirate_imp').length,2);
 assert.deepEqual(g.zombies.filter(z=>z.kind==='pirate_imp').map(z=>z.leap!.toX),[cellX(2),cellX(4)]);
});
test('imp cannon rolls in, fires and explodes into five additional imps',()=>{
 const g=create(10);g['nextWave']=Infinity;const cannon=g.spawnZombie('cannon',4,1070);
 tick(g,3);assert.ok(cannon.x>cellX(9));assert.equal(g.zombies.length,1);
 // Freeze launched imps so this focused timeline check cannot end from losing a lane.
 for(let i=0;i<60*65;i++){for(const z of g.zombies)if(z.kind==='pirate_imp')z.frozenUntil=100;g.tick(1/60);}
 assert.ok(!g.zombies.includes(cannon));assert.equal(g.zombies.filter(z=>z.kind==='pirate_imp').length+g.deaths.filter(d=>d.zombie.kind==='pirate_imp').length,10);
});
test('spring bean bounces deck zombies into adjacent sea and wakes after its rest',()=>{
 const g=create(10);g['nextWave']=Infinity;g.sun=999;g.plant('springbean',1,4);
 const z=g.spawnZombie('pirate',1,cellX(4)+20);tick(g,1.5);assert.ok(!g.zombies.includes(z));assert.ok(g.pirate.effects.find(e=>e.kind==='seaSplash')!.x>=cellX(5));
 assert.equal(g.plants[0].animation,'Bounce');tick(g,2);assert.equal(g.plants[0].animation,'Sleep');tick(g,11);assert.equal(g.plants[0].animation,'Idle');
});
test('spikeweed plant food pulls, damages and releases the lane after five seconds',()=>{
 const g=create(7);g['nextWave']=Infinity;g.sun=999;g.plant('spikeweed',2,2);const z=g.spawnZombie('pirate_armor2',2,cellX(4));g.food=1;g.plantFood(2,2);
 tick(g,1);assert.ok(z.x<cellX(4)-82);assert.ok(z.armor<1100);tick(g,4.1);assert.equal(g.plants[0].action,'idle');
});
for(const day of [6,7,9,10])test(`Pirate ${day} completes through normal planting`,()=>{
 const g=create(day);
 for(let frame=0;frame<60*1000&&g.phase==='playing';frame++){
  for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   const occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c),threats=[...g.zombies].filter(z=>!z.swing).sort((a,b)=>a.x-b.x);
   for(const z of threats)if(!g.plants.some(p=>p.row===z.row&&p.kind==='kernelpult'))g.plant('kernelpult',z.row,2);
   for(const col of [0,1])for(let row=0;row<5;row++)if(!occupied(row,col))g.plant('sunflower',row,col);
   for(const col of [2,3])for(let row=0;row<5;row++)if(!occupied(row,col))g.plant('kernelpult',row,col);
   for(let row=0;row<5;row++)if(!occupied(row,4))g.plant('snapdragon',row,4);
   for(const z of threats)if(z.x<700){g.plant('wallnut',z.row,4);g.plant('iceburg',z.row,Math.floor((z.x-190)/82));}
   const target=threats.find(z=>z.x<850);if(target){const p=g.plants.find(p=>p.row===target.row&&p.kind==='kernelpult');if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`day ${day}, time ${g.time}, wave ${g.wave}, kills ${g.kills}`);
});
test('Pirate 8 completes using only delivered conveyor packets and collected food',()=>{
 const g=create(8);
 for(let frame=0;frame<60*1000&&g.phase==='playing';frame++){
  for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   for(const packet of [...g.conveyor]){
    const cells=Array.from({length:25},(_,i)=>({row:i%5,column:Math.floor(i/5)})).filter(c=>!g.plants.some(p=>p.row===c.row&&p.column===c.column));
    const threats=g.zombies.filter(z=>z.hp>0&&!z.swing).sort((a,b)=>a.x-b.x);
    cells.sort((a,b)=>{
      const score=(c:{row:number;column:number})=>{
       const front=threats.find(z=>z.row===c.row),near=front?Math.max(0,1000-front.x):0;
       const target=packet.kind==='kernelpult'?1:packet.kind==='snapdragon'?3:4;
       return Math.abs(c.column-target)*1000-near+g.plants.filter(p=>p.row===c.row&&p.kind===packet.kind).length*500;
      };return score(a)-score(b);
    });
    const cell=cells[0];if(cell)g.plant(packet.kind,cell.row,cell.column,packet.id);
   }
   const threats=g.zombies.filter(z=>z.hp>0&&!z.swing).sort((a,b)=>a.x-b.x),target=threats.find(z=>z.x<700);
   if(target){const p=g.plants.find(p=>p.kind==='snapdragon'&&Math.abs(p.row-target.row)<=1&&target.x>cellX(p.column)&&target.x<cellX(p.column)+300)??g.plants.find(p=>p.kind==='kernelpult');if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`time ${g.time}, wave ${g.wave}, kills ${g.kills}`);
});

test('pirate giant crushes a wallnut at the Smash event, not at the start of the animation',()=>{
 const g=create(7);g['nextWave']=Infinity;g.sun=999;g.plant('wallnut',2,4);g.spawnZombie('pirate_gargantuar',2,cellX(4)+50);
 tick(g,1.3);assert.equal(g.plants[0].hp,props.plants.wallnut.Toughness);tick(g,.1);assert.equal(g.plants.length,0);
});
test('spring bean food affects ground lanes and excludes flying and giant zombies',()=>{
 const g=create(10);g['nextWave']=Infinity;g.sun=999;g.plant('springbean',2,2);
 const ground=g.spawnZombie('pirate',0,cellX(4)),bird=g.spawnZombie('seagull',3,cellX(4)),giant=g.spawnZombie('pirate_gargantuar',2,cellX(6));
 g.food=1;g.plantFood(2,2);tick(g,1.7);assert.ok(ground.leap);assert.equal(bird.leap,null);assert.equal(giant.leap,null);
 tick(g,2);assert.equal(g.plants[0].action,'idle');assert.ok(g.deaths.some(d=>d.zombie.id===ground.id&&d.cause==='water'));
});

test('Pirate 11–15 preserve cannon score, sun production, last stand and flower objectives',()=>{
 assert.deepEqual([11,12,13,14,15].map(d=>level(d).waves.length),[12,16,16,10,16]);
 assert.deepEqual([11,12,13,14,15].map(d=>level(d).planks),[[],[3,4],[0,1],[1,2,3],[2,3]]);
 assert.equal(level(11).cannon!.MinScore,30000);assert.equal(level(13).targetSun,3000);
 assert.deepEqual(level(14).lastStand,{sun:2000,food:3});assert.ok(level(14).blacklist.includes('sunflower'));assert.equal(level(15).flowerLine,4);
});
test('captain launches a parrot that captures a frontmost plant after five seconds and returns',()=>{
 const g=create(13);g['nextWave']=Infinity;g.sun=999;g.plant('wallnut',1,2);g.plant('sunflower',1,1);
 const captain=g.spawnZombie('pirate_captain',1,cellX(7));tick(g,7.1);
 const bird=g.zombies.find(z=>z.parrot)!;assert.ok(bird);assert.equal(captain.captain!.parrot,false);assert.equal(bird.parrot!.target,g.plants.find(p=>p.kind==='wallnut')!.id);
 tick(g,3.7);assert.ok(g.plants.some(p=>p.kind==='wallnut'));tick(g,5.2);assert.ok(!g.plants.some(p=>p.kind==='wallnut'));assert.equal(bird.parrot!.carrying!.kind,'wallnut');
 tick(g,15);assert.equal(captain.captain!.parrot,true);assert.ok(!g.zombies.includes(bird));
});
test('killing a parrot during capture saves its plant and prevents another launch',()=>{
 const g=create(13);g['nextWave']=Infinity;g.sun=999;g.plant('wallnut',1,2);const captain=g.spawnZombie('pirate_captain',1,cellX(6));tick(g,10);
 const bird=g.zombies.find(z=>z.parrot)!;assert.ok(bird);g.damage(bird,300);tick(g,1);assert.ok(g.plants.some(p=>p.kind==='wallnut'));assert.equal(captain.captain!.parrot,false);assert.ok(!g.zombies.some(z=>z.parrot));
});
test('normal coconut cannon damages a three-by-three area without minigame scoring',()=>{
 const g=create(12);g['nextWave']=Infinity;g.sun=999;g.plant('coconutcannon',3,2);
 const targets=[2,3,4].map(row=>{const z=g.spawnZombie('pirate_armor2',row,cellX(5));z.frozenUntil=100;return z;});
 assert.equal(g.pirate.fire(3,2),true);tick(g,1);assert.equal(targets[1].armor,200);assert.equal(targets[0].armor,800);assert.equal(targets[2].armor,800);assert.equal(g.pirate.score,0);
});
test('coconut plant food wakes a sleeping cannon, pushes the lane and explodes at the far edge',()=>{
 const g=create(12);g['nextWave']=Infinity;g.sun=999;g.plant('coconutcannon',3,2);g.pirate.fire(3,2);tick(g,1);
 const z=g.spawnZombie('pirate_armor2',3,cellX(4));g.food=1;assert.equal(g.plantFood(3,2),true);tick(g,1.5);assert.ok(z.x>cellX(4));tick(g,4);assert.ok(!g.zombies.includes(z));assert.equal(g.pirate.shots.length,0);assert.equal(g.plants[0].animation,'Sleep');
});
test('threepeater fires only valid lanes, curves to neighbors and ends its fan burst',()=>{
 for(const row of [0,2,4]){
  const g=create(15);g['nextWave']=Infinity;g.sun=999;g.plant('threepeater',row,0);const target=g.spawnZombie('pirate_armor2',row,cellX(8));target.frozenUntil=100;
  tick(g,1.05);assert.equal(g.peas.length,row===2?3:2);assert.ok(g.peas.every(p=>p.row>=0&&p.row<5));
  tick(g,.8);assert.ok(g.peas.every(p=>Math.abs(p.y-(rowY(p.row)-40))<.01));
  g.food=1;g.plantFood(row,0);tick(g,1);assert.ok(g.peas.some(p=>p.vector!.vy>0));assert.ok(g.peas.some(p=>p.vector!.vy<0));assert.ok(g.peas.every(p=>p.vector!.vx>=-1e-10));tick(g,1.2);assert.equal(g.plants[0].action,'idle');tick(g,5);assert.ok(g.peas.every(p=>Number.isFinite(p.damage)));
 }
});
test('sun-production objective counts produced sun before collection and excludes sky sun',()=>{
 const g=create(13);g['nextWave']=Infinity;g.sun=999;g.plant('sunflower',0,0);let produced=0;for(let i=0;i<60*30;i++){g.tick(1/60);for(const s of [...g.suns]){if(s.from==='plant')produced+=s.value;g.collect(s.id);}}assert.ok(produced>0);assert.equal(g.sunProduced,produced);
 g.level.waves=[];g.level.actions=[];g.tick(1/60);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'sunProduced');
});
test('Pirate 11 cannon route reaches the authored score by aiming at groups',()=>{
 const g=create(11);
 for(let frame=0;frame<60*800&&g.phase==='playing';frame++){
  if(frame%6===0){
   let best={row:0,kills:0};
   for(let row=0;row<5;row++){
    const plant=g.plants.find(p=>p.row===row)!;if(plant.action!=='idle'||g.time<plant.nextAction)continue;
    const targets=g.zombies.filter(z=>z.route).map(z=>({...z,route:{...z.route!}}));let x=cellX(1)+38;
    for(let n=0;n<150;n++){
     for(const z of targets)g.pirate.tickZombie(z,1/60);
     if(n<12)continue;
     const old=x;x+=510/60;
     const hit=targets.filter(z=>z.x>=old-25&&z.x<=x+25&&Math.abs(z.route.y-rowY(row))<45).sort((a,b)=>a.x-b.x)[0];
     if(hit){const kills=targets.filter(z=>Math.abs(z.x-hit.x)<=2.5*82/2&&Math.abs(z.route.y-hit.route.y)<=98).length;if(kills>best.kills)best={row,kills};break;}
    }
   }
   if(best.kills>=5)g.pirate.fire(best.row,1);
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`score ${g.pirate.score}, time ${g.time}, wave ${g.wave}`);
});
for(const day of [12,13,15])test(`Pirate ${day} completes with normal planting and collected food`,()=>{
 const g=create(day);
 for(let frame=0;frame<60*1000&&g.phase==='playing';frame++){
  for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   const occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c),threats=g.zombies.filter(z=>z.hp>0&&!z.swing&&!z.parrot).sort((a,b)=>a.x-b.x);
   for(const z of threats)if(!g.plants.some(p=>p.row===z.row&&p.kind==='kernelpult'))g.plant('kernelpult',z.row,2);
   for(const col of [0,1])for(let row=0;row<5;row++)if(!occupied(row,col))g.plant('sunflower',row,col);
   for(const col of [2,3])for(let row=0;row<5;row++)if(!occupied(row,col))g.plant(day===15&&col===3?'threepeater':'kernelpult',row,col);
   for(let row=0;row<5;row++)if(!occupied(row,4))g.plant('snapdragon',row,4);
   const target=threats.find(z=>z.x<(day===15?650:850));if(target){const p=g.plants.find(p=>p.row===target.row&&p.kind==='kernelpult');if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`day ${day}, reason ${g.lossReason}, sun ${g.sunProduced}, time ${g.time}, wave ${g.wave}`);
});
test('Pirate 14 completes with its starting sun and earned plant food',()=>{
 const g=create(14);assert.equal(g.preparing,true);
 for(let row=0;row<5;row++){g.plant('snapdragon',row,3);g.plant('kernelpult',row,1);g.plant('spikeweed',row,4);}
 assert.equal(g.sun,250);assert.equal(g.plant('sunflower',0,0),false);g.startLastStand();
 for(let frame=0;frame<60*1000&&g.phase==='playing';frame++){
  for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){for(let row=0;row<5;row++)if(!g.plants.some(p=>p.row===row&&p.column===3))g.plant('snapdragon',row,3);const target=g.zombies.filter(z=>z.hp>0&&!z.swing&&z.x<780).sort((a,b)=>a.x-b.x)[0];if(target){const p=g.plants.find(p=>p.kind==='snapdragon'&&Math.abs(p.row-target.row)<=1&&target.x>cellX(p.column)&&target.x<cellX(p.column)+300);if(p)g.plantFood(p.row,p.column);}}
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`reason ${g.lossReason}, time ${g.time}, wave ${g.wave}`);
});

test('Pirate 16–20 preserve protection, rolling kills, preset cards and combined objectives',()=>{
 assert.deepEqual([16,17,18,19,20].map(d=>level(d).waves.length),[10,16,16,10,16]);
 assert.deepEqual([16,17,18,19,20].map(d=>level(d).planks),[[1,2],[3,4],[3,4],[0,1,3,4],[]]);
 assert.equal(level(16).mustProtect,2);assert.deepEqual(level(16).protectedPlants,[{kind:'springbean',row:1,column:4},{kind:'springbean',row:2,column:4}]);
 assert.deepEqual(level(17).killChallenge,{seconds:30,count:20});
 assert.deepEqual(level(18).preset,['peashooter','repeater','iceburg','spikeweed','springbean','wallnut']);
 assert.equal(level(19).targetSun,1750);assert.equal(level(19).flowerLine,4);
 assert.equal(level(20).cannon!.MinScore,40000);assert.equal(level(20).cannon!.Lanes.length,5);assert.equal(level(20).sunDrops,false);assert.equal(level(20).mowers,false);
});
test('protected spring beans cannot be shoveled and losing either fails Pirate 16',()=>{
 const g=create(16);g['nextWave']=Infinity;g.shovel(1,4);assert.equal(g.plants.length,2);
 g.plants[0].hp=0;g.tick(1/60);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'protected');
});
test('kill challenge uses a rolling window and permanently records success',()=>{
 const g=create(17);g['nextWave']=Infinity;
 const kill=(count:number)=>{for(let i=0;i<count;i++)g.spawnZombie('pirate',2,1000).hp=0;g.tick(1/60);};
 kill(10);tick(g,29);kill(9);assert.equal(g.killChallengeComplete,false);tick(g,1.1);assert.equal(g.recentKills.length,9);
 kill(11);assert.equal(g.killChallengeComplete,true);tick(g,31);assert.equal(g.killChallengeComplete,true);
 g.level.waves=[];g.level.actions=[];g.tick(1/60);assert.equal(g.phase,'won');
 const failed=create(17);failed.level.waves=[];failed.level.actions=[];failed.tick(1/60);assert.equal(failed.phase,'lost');assert.equal(failed.lossReason,'killChallenge');
});
test('spikerock survives two barrels, loses its third spike to the third and releases their imps',()=>{
 const g=create(19);g['nextWave']=Infinity;g.sun=999;g.plant('spikerock',0,3);const rock=g.plants[0];
 for(let i=0;i<3;i++){const pusher=g.spawnZombie('barrelroller',0,cellX(3)+62);g.tick(1/60);assert.equal(pusher.barrel,undefined);assert.equal(rock.spikes,2-i);assert.equal(g.plants.includes(rock),i<2);}
 assert.equal(g.zombies.filter(z=>z.kind==='pirate_imp').length,6);
});
test('spikerock repair costs sun, food restores spikes and native damage excludes flyers',()=>{
 const g=create(19);g['nextWave']=Infinity;g.sun=1000;g.plant('spikerock',2,3);const rock=g.plants[0];rock.spikes=1;tick(g,5.1);
 assert.equal(g.plant('spikerock',2,3),true);assert.equal(rock.spikes,3);assert.equal(g.sun,500);assert.equal(g.plants.length,1);
 const z=g.spawnZombie('pirate_armor2',2,cellX(3)),bird=g.spawnZombie('seagull',2,cellX(3));z.frozenUntil=100;bird.frozenUntil=100;
 tick(g,.3);assert.equal(z.armor,1080);assert.equal(bird.hp,props.zombies.seagull.Toughness);
 rock.spikes=1;g.food=1;g.plantFood(2,3);assert.equal(rock.spikes,3);
 const roller=g.spawnZombie('barrelroller',2,cellX(3)+62);tick(g,.1);assert.equal(roller.barrel,undefined);assert.equal(rock.spikes,3);tick(g,5);assert.equal(rock.action,'idle');
});

for(const day of [16,17,19])test(`Pirate ${day} completes with normal planting and collected food`,()=>{
 const g=create(day);
 for(let frame=0;frame<60*1000&&g.phase==='playing';frame++){
  for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   const occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c),threats=g.zombies.filter(z=>z.hp>0&&!z.swing&&!z.parrot).sort((a,b)=>a.x-b.x);
   for(const z of threats)if(!g.plants.some(p=>p.row===z.row&&p.kind==='kernelpult'))g.plant('kernelpult',z.row,2);
   for(const col of [0,1])for(let row=0;row<5;row++)if(!occupied(row,col))g.plant('sunflower',row,col);
   for(const col of [2,3])for(let row=0;row<5;row++)if(!occupied(row,col))g.plant(col===3?'threepeater':'kernelpult',row,col);
   for(let row=0;row<5;row++)if(!occupied(row,4))g.plant('snapdragon',row,4);
   const target=threats.find(z=>z.x<(day===19?650:850));if(target){const p=g.plants.find(p=>p.row===target.row&&p.kind==='kernelpult');if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`day ${day}, reason ${g.lossReason}, sun ${g.sunProduced}, time ${g.time}, wave ${g.wave}`);
});

test('Pirate 20 reaches 40000 by waiting for clustered birds and firing reloaded cannons',()=>{
 const g=create(20);
 for(let frame=0;frame<60*800&&g.phase==='playing';frame++){
  if(frame%6===0&&!g.pirate.shots.length&&!g.plants.some(p=>p.action==='shoot')){
   let best={row:0,kills:0,wait:0};
   for(let row=0;row<5;row++){
    const plant=g.plants.find(p=>p.row===row)!;if(plant.action!=='idle'||g.time<plant.nextAction)continue;
    for(const delay of [0,12,24,36,48]){
    const targets=g.zombies.filter(z=>z.route).map(z=>({...z,route:{...z.route!}}));let x=cellX(1)+38;
    for(let n=0;n<150+delay;n++){
     for(const z of targets)if(g.time+n/60>=(z.stunnedUntil??0))g.pirate.tickZombie(z,1/60);
     if(n<12+delay)continue;
     const old=x;x+=510/60;
     const hit=targets.filter(z=>z.x>=old-25&&z.x<=x+25&&Math.abs(z.route.y-rowY(row))<45).sort((a,b)=>a.x-b.x)[0];
     if(hit){const kills=targets.filter(z=>Math.abs(z.x-hit.x)<=2.5*82/2&&Math.abs(z.route.y-hit.route.y)<=98).length;if(kills>best.kills)best={row,kills,wait:delay};break;}
    }
   }
   }
   if(best.wait===0&&best.kills>=4)g.pirate.fire(best.row,1);
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`score ${g.pirate.score}, wave ${g.wave}`);
});

test('Pirate 18 completes with only its six authored preset cards',()=>{
 const g=create(18);
 for(let frame=0;frame<60*1000&&g.phase==='playing';frame++){
  for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   const threats=g.zombies.filter(z=>z.hp>0&&!z.swing).sort((a,b)=>a.x-b.x);
   for(const z of threats){
    const r=z.row;
    if(!g.plants.some(p=>p.row===r&&['peashooter','repeater'].includes(p.kind)))g.plant('peashooter',r,1);
    if(!g.plants.some(p=>p.row===r&&p.kind==='springbean'))g.plant('springbean',r,4);
    if(z.x<800)g.plant('wallnut',r,3);
    if(z.x<650)g.plant('iceburg',r,Math.floor((z.x-190)/82));
   }
   for(let row=0;row<5;row++)g.plant('repeater',row,2);
   const target=threats.find(z=>z.x<700);if(target){const p=g.plants.find(p=>p.row===target.row&&p.kind==='repeater')??g.plants.find(p=>p.row===target.row&&p.kind==='peashooter');if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`time ${g.time}, wave ${g.wave}`);
});

test('a cannon hit briefly stalls surviving birds from the same original wave and lane only',()=>{
 const g=create(20);g['nextWave']=Infinity;
 const group=Array.from({length:4},(_,i)=>g.spawnZombie('seagull',2,cellX(4)+i*40));
 for(const z of group){z.route!.points=[];z.route!.index=0;z.route!.y=rowY(2);z.frozenUntil=100;}
 const other=g.spawnZombie('seagull',3,cellX(7));other.frozenUntil=100;
 const nextWave=g.spawnZombie('seagull',2,cellX(8));nextWave.route!.spawnWave=1;nextWave.frozenUntil=100;
 g.pirate.fire(2,1);tick(g,1);
 assert.ok(group[3].hp>0);assert.ok(group[3].stunnedUntil!>0);assert.equal(other.stunnedUntil,undefined);assert.equal(nextWave.stunnedUntil,undefined);
});

test('pirate giant consumes one spikerock spike per native smash instead of instantly crushing it',()=>{
 const g=create(17);g['nextWave']=Infinity;g.sun=999;g.plant('spikerock',2,3);const rock=g.plants[0],giant=g.spawnZombie('pirate_gargantuar',2,cellX(3)+60);
 tick(g,1.3);assert.equal(rock.spikes,3);tick(g,.1);assert.equal(rock.spikes,2);assert.equal(rock.hp,900);assert.equal(giant.hp,props.zombies.pirate_gargantuar.Toughness-20);
});

test('Pirate 21–25 retain source objectives, protected cells, conveyor and boss stages',()=>{
 assert.deepEqual([21,22,23,24].map(d=>level(d).waves.length),[16,10,10,16]);
 assert.deepEqual(level(21).killChallenge,{seconds:5,count:5});assert.equal(level(21).targetSun,3250);
 assert.equal(level(22).lastStand!.sun,2750);assert.deepEqual(level(22).planks,[]);
 assert.deepEqual(level(23).killChallenge,{seconds:10,count:8});assert.equal(level(23).flowerLine,4.5);
 assert.deepEqual(level(24).protectedPlants,[{kind:'springbean',row:0,column:4},{kind:'springbean',row:1,column:4},{kind:'springbean',row:4,column:4}]);
 assert.equal(level(25).boss!.kind,'zombossmech_pirate');assert.equal(level(25).boss!.reserved,2);
 assert.equal(level(25).conveyor!.InitialPlantList.length,7);
 assert.deepEqual(create(25).boss!.stages.map(s=>s.HitPoints),[5500,10000,11000]);
});
for(const day of [25,35])test(`Pirate ${day} boss fires its native six or ten imps without Egyptian missiles`,()=>{
 const g=create(day),boss=g.boss!;tick(g,4.4);boss['play']('Shoot');boss['aim']();
 tick(g,3.6);assert.equal(g.zombies.length,1);tick(g,.05);
 const imps=g.zombies.filter(z=>z.kind==='pirate_imp');assert.equal(imps.length,day===35?10:6);
 assert.ok(imps.every(z=>z.leap&&z.leap.toX>=cellX(2)&&z.leap.toX<=cellX(5)&&z.leap.toRow>=0&&z.leap.toRow<=4));
 assert.equal(boss.targets.length,0);assert.equal(boss.missiles.length,0);
 tick(g,1.4);assert.ok(imps.every(z=>!z.leap));
});
for(const day of [25,35])test(`Pirate ${day} boss clamps each stage and completes death and escape before winning`,()=>{
 const g=create(day),boss=g.boss!;tick(g,4.4);
 for(const stage of [1,2]){g.damage(boss.zombie,50000);assert.equal(boss.stage,stage);assert.equal(boss.animation,'StunStart');tick(g,5);}
 g.spawnZombie('pirate_captain',0,1000);g.damage(boss.zombie,50000);
 assert.equal(g.phase,'playing');tick(g,3);assert.equal(boss.animation,'DeathStart');assert.equal(g.zombies.length,1);
 tick(g,15);assert.equal(boss.defeated,true);assert.equal(g.phase,'won');
});
test('coconut cannons hit both boss lanes and food explodes without pushing the mech',()=>{
 for(const offset of [0,1]){
  const g=create(25),boss=g.boss!;tick(g,4.4);boss['play']('Stunning');boss['stunLeft']=100;
  const row=boss.zombie.row-offset;g.conveyor.push({id:999,kind:'coconutcannon',lane:0,position:0});assert.equal(g.plant('coconutcannon',row,2,999),true);
  const hp=boss.zombie.hp,x=boss.zombie.x;assert.equal(g.pirate.fire(row,2),true);tick(g,2);assert.ok(boss.zombie.hp<hp);assert.equal(boss.zombie.x,x);
  g.food=1;assert.equal(g.plantFood(row,2),true);const before=boss.zombie.hp;tick(g,5);assert.ok(boss.zombie.hp<before);assert.equal(boss.zombie.x,x);
 }
});
test('Pirate 21 requires both rolling kills and sun; Pirate 23 protects the half-cell flower line',()=>{
 const g=create(21);g.level.waves=[];g.level.actions=[];g.killChallengeComplete=true;g.tick(1/60);assert.equal(g.lossReason,'sunProduced');
 const flowers=create(23);flowers['nextWave']=Infinity;flowers.spawnZombie('pirate',2,190+4.5*82);flowers.tick(1/60);assert.equal(flowers.lossReason,'flowers');
});
for(const day of [21,23,24])test(`Pirate ${day} completes with normal planting and collected food`,()=>{
 const g=create(day);
 for(let frame=0;frame<60*1000&&g.phase==='playing';frame++){
  for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   const occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c),threats=g.zombies.filter(z=>z.hp>0&&!z.swing&&!z.parrot).sort((a,b)=>a.x-b.x);
   for(const z of threats)if(!g.plants.some(p=>p.row===z.row&&p.kind==='kernelpult'))g.plant('kernelpult',z.row,2);
   for(const col of [0,1])for(let row=0;row<5;row++)if(!occupied(row,col))g.plant('sunflower',row,col);
   for(const col of [2,3])for(let row=0;row<5;row++)if(!occupied(row,col))g.plant(col===3?'threepeater':'kernelpult',row,col);
   for(let row=0;row<5;row++)if(!occupied(row,4))g.plant('snapdragon',row,4);
   const target=threats.find(z=>z.x<(day===23?680:850));if(target){const p=g.plants.find(p=>p.row===target.row&&p.kind==='kernelpult');if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`day ${day}, reason ${g.lossReason}, sun ${g.sunProduced}, time ${g.time}, wave ${g.wave}`);
});
test('Pirate 22 completes with its original last-stand budget',()=>{
 const g=create(22);
 for(let row=0;row<5;row++){g.plant('snapdragon',row,0);g.plant('bonkchoy',row,1);g.plant('wallnut',row,2);g.plant('spikeweed',row,3);g.plant('springbean',row,4);}
 assert.equal(g.sun,250);g.startLastStand();
 for(let frame=0;frame<60*1000&&g.phase==='playing';frame++){
  for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   for(let row=0;row<5;row++)if(!g.plants.some(p=>p.row===row&&p.column===2))g.plant('wallnut',row,2);
   const threat=g.zombies.filter(z=>z.hp>0&&!z.swing&&z.x<430).sort((a,b)=>a.x-b.x)[0];if(threat){const p=g.plants.find(p=>p.kind==='snapdragon'&&Math.abs(p.row-threat.row)<=1&&threat.x>cellX(p.column)&&threat.x<cellX(p.column)+240);if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`reason ${g.lossReason}, time ${g.time}, wave ${g.wave}`);
});
test('Pirate 25 completes using delivered conveyor cards and earned food',()=>{
 const g=create(25);
 for(let frame=0;frame<60*1600&&g.phase==='playing';frame++){
  for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   for(const card of [...g.conveyor]){
    const cols=card.kind==='cherry_bomb'?[5,4,3]:card.kind==='spikeweed'?[5,4,3,2,1,0]:card.kind==='snapdragon'?[4,3,2]:[0,1,2,3];
    let planted=false;for(const col of cols){for(let row=0;row<5;row++){if(card.kind==='cherry_bomb'&&!g.zombies.some(z=>z.hp>0&&Math.abs(z.row-row)<=1&&Math.abs(z.x-cellX(col))<140))continue;if(g.plant(card.kind,row,col,card.id)){planted=true;break;}}if(planted)break;}
   }
   for(const p of g.plants)if(p.kind==='coconutcannon'&&g.zombies.some(z=>z.hp>0&&g.inLane(z,p.row)))g.pirate.fire(p.row,p.column);
   const p=g.plants.find(p=>p.kind==='coconutcannon'&&g.boss!.covers(p.row));if(p)g.plantFood(p.row,p.column);
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`reason ${g.lossReason}, time ${g.time}, hp ${g.boss!.zombie.hp}, stage ${g.boss!.stage}`);
});

test('spikeweed food damages either boss lane without dragging the mech',()=>{
 const g=create(25),boss=g.boss!;tick(g,4.4);boss['play']('Stunning');boss['stunLeft']=100;
 const row=boss.zombie.row-1;g.conveyor.push({id:999,kind:'spikeweed',lane:0,position:0});g.plant('spikeweed',row,3,999);g.food=1;g.plantFood(row,3);
 const x=boss.zombie.x,hp=boss.zombie.hp;tick(g,2);assert.equal(boss.zombie.x,x);assert.ok(boss.zombie.hp<hp);
});
test('Pirate 21–25 reward slots, cherry bomb and the Pirate trophy once',()=>{
 const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}},progress=new ProgressStore(storage),map=read<WorldMap>('shell/maps/pirate.json');
 for(let day=1;day<=25;day++){const id=`pirate${day}`;progress.finish('pirate',id);for(const event of completionEvents(map,id,progress.completed(map),progress.rewardNodes('pirate')))if(event.action==='reward')progress.award('pirate',map.islands.find(n=>n.node===event.node)!);progress.finishPresentation();}
 assert.ok(progress.ownedPlants().has(45));assert.ok(progress.ownedUpgrades().has(9));
 assert.equal(progress.campaignRewards().filter(r=>r.id==='worldtrophy_pirate').length,1);progress.finish('pirate','pirate25');assert.equal(new ProgressStore(storage).campaignRewards().filter(r=>r.id==='worldtrophy_pirate').length,1);
});

test('Pirate 26–30 preserve empty waves, source planks, mold, limits and preset challenge',()=>{
 assert.deepEqual([26,27,28,29,30].map(d=>level(d).waves.length),[12,18,10,16,16]);
 assert.equal(level(26).actions[0][0].zombies.length,0);assert.equal(level(26).actions[0][1].zombies.length,2);
 assert.deepEqual([26,27,28,29,30].map(d=>level(d).planks),[[0,4],[1,2,4],[0,1,3,4],[0,1,3,4],[1,2]]);
 assert.equal(level(27).mold.length,19);assert.equal(level(27).conveyor!.InitialPlantList[0].MaxDelivered,5);
 assert.equal(level(28).maxSun,2000);assert.equal(level(28).maxPlants,15);
 assert.deepEqual(level(29).preset,['sunflower','kernelpult','iceburg','spikeweed','cherry_bomb']);assert.deepEqual(level(29).killChallenge,{count:20,seconds:8});
 const g=create(30),z=g.spawnZombie('pirate_armor4',1,900);assert.equal(z.armor,2200);g.damage(z,1800);assert.equal(z.armor,400);assert.equal(z.hp,190);
});
test('Escape Root matures, exchanges positions and retains target health without spending another packet',()=>{
 const g=create(27);g['nextWave']=Infinity;
 g.conveyor.push({id:900,kind:'escaperoot',lane:0,position:0},{id:901,kind:'threepeater',lane:1,position:0});
 assert.ok(g.plant('escaperoot',0,0,900));assert.ok(g.plant('threepeater',1,1,901));const root=g.plants[0],target=g.plants[1];target.hp=123;
 tick(g,1.1);assert.equal(g.plantFood(0,0),false);assert.ok(g.escape.select(0,0));assert.equal(g.escape.exchange(2,2),false);
 assert.ok(g.escape.select(0,0));assert.ok(g.escape.exchange(1,1));assert.equal(root.rootGrown,true);assert.equal(root.row,1);assert.equal(root.column,1);assert.equal(target.row,0);assert.equal(target.column,0);assert.equal(target.hp,123);assert.ok(target.leap);
 tick(g,1.3);assert.equal(root.animation,'Idle');assert.equal(target.leap,undefined);
});
test('Escape Root uses native Show, charge and Explode timings, then removes its bomb',()=>{
 for(const variant of [0,1,2,3]){
  const g=create(27);g['nextWave']=Infinity;g.conveyor.push({id:900,kind:'escaperoot',lane:0,position:0});g.plant('escaperoot',2,3,900);tick(g,12.3);
  const root=g.plants[0];assert.equal(root.rootGrown,true);const z=g.spawnZombie('pirate_gargantuar',2,cellX(3));z.frozenUntil=100;
  g.tick(1/60);const bomb=g.escape.bombs[0];bomb.variant=variant;const hp=z.hp;tick(g,1.48);assert.equal(z.hp,hp);tick(g,.04);if(variant===3)assert.ok(z.hp<=hp-1800);else assert.equal(z.hp,hp-(variant===1?2700:1800));
  if(variant===3)assert.equal(g.escape.grapes.length,8);tick(g,.1);assert.equal(g.escape.bombs.length,0);assert.ok(!g.plants.includes(root));
 }
});
test('Escape Root food produces two bombs, returns to idle and consumes one food',()=>{
 const g=create(27);g['nextWave']=Infinity;g.conveyor.push({id:900,kind:'escaperoot',lane:0,position:0});g.plant('escaperoot',0,0,900);tick(g,12.3);g.food=1;assert.ok(g.plantFood(0,0));tick(g,.6);assert.equal(g.escape.bombs.length,1);assert.equal(g.escape.bombs[0].animation,'Death_Dig_End');tick(g,3);assert.equal(g.escape.bombs.length,1);tick(g,4.3);assert.equal(g.escape.bombs.length,0);assert.equal(g.plants[0].animation,'Idle');assert.equal(g.food,0);
});
test('Pirate 27 delivers at most five Escape Root cards',()=>{
 const g=create(27);g['nextWave']=Infinity;g.conveyorPlants=g.conveyorPlants.filter(p=>p.PlantType==='escaperoot');let delivered=0;
 for(let i=0;i<60*120;i++){delivered+=g.conveyor.length;g.conveyor=[];g.tick(1/60);}assert.equal(delivered,5);
});
// Extended-world completion fixtures include the earned Egyptian +25 starting sun /
// fourth food slot and explicitly listed, pre-grown garden boosts. No battle currency,
// cooldown, zombie health or authored wave is changed during these runs.
function emergencyBombs(g:Game,threshold:number){
 const threats=g.zombies.filter(z=>z.hp>0&&!z.swing&&!z.parrot&&z.x<threshold).sort((a,b)=>a.x-b.x);
 for(const z of threats){
  const col=Math.floor((z.x-190)/82);
  for(const c of [col,col-1,col+1])for(const r of [z.row,z.row-1,z.row+1])if((g.level.maxSun===null||g.sunSpent+150<=g.level.maxSun)&&(g.level.maxPlants===null||g.plants.length<g.level.maxPlants))g.plant('cherry_bomb',r,c);
  if(g.level.maxPlants===null||g.plants.length<g.level.maxPlants)g.plant('iceburg',z.row,col);
 }
}
for(const day of [26,30])test(`Pirate ${day} completes with garden boosts, collected sun and earned food`,()=>{
 const g=create(day);g.sun+=25;g.foodLimit=4;g.boosts=new Set(['sunflower','kernelpult']);
 for(let frame=0;frame<60*1400&&g.phase==='playing';frame++){
  for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   const occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c),threats=g.zombies.filter(z=>z.hp>0&&!z.swing&&!z.parrot).sort((a,b)=>a.x-b.x);
   for(const z of threats)if(!g.plants.some(p=>p.row===z.row&&p.kind==='kernelpult'))g.plant('kernelpult',z.row,1);
   for(const z of threats)if(z.x<cellX(4)+90){g.plant('springbean',z.row,4);if(z.x<cellX(3)+45)g.plant('iceburg',z.row,3);}
   emergencyBombs(g,620);
   for(const col of [0])for(let row=0;row<5;row++)if(!occupied(row,col))g.plant('sunflower',row,col);
   for(const col of [1,2])for(let row=0;row<5;row++)if(!occupied(row,col))g.plant(col===2?'snapdragon':'kernelpult',row,col);
   for(let row=0;row<5;row++)if(!occupied(row,4))g.plant('springbean',row,4);
   const target=threats.find(z=>z.x<850);if(target){const p=g.plants.find(p=>p.row===target.row&&p.kind==='kernelpult');const bean=g.plants.find(p=>p.kind==='springbean');if(bean)g.plantFood(bean.row,bean.column);else if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`day ${day}, reason ${g.lossReason}, time ${g.time}, wave ${g.wave}`);
});

test('Pirate 27 completes with a Threepeater garden boost and its original limited conveyor',()=>{
 const g=new Game(level(27),props,timing,z=>({x:z.x,y:rowY(z.row)}),42);g.boosts=new Set(['threepeater']);
 for(let frame=0;frame<60*1600&&g.phase==='playing';frame++){
  for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   for(const card of [...g.conveyor]){
    const cells=card.kind==='threepeater'?[{row:2,column:0},{row:0,column:0},{row:4,column:0},{row:3,column:1},{row:1,column:1}]:card.kind==='escaperoot'?[{row:2,column:3},{row:1,column:1},{row:3,column:1}]:Array.from({length:45},(_,i)=>({row:i%5,column:8-Math.floor(i/5)}));
    for(const c of cells)if(g.plant(card.kind,c.row,c.column,card.id))break;
   }
   const threats=g.zombies.filter(z=>z.hp>0&&!z.swing).sort((a,b)=>a.x-b.x);
   const target=threats.find(z=>z.x<650);if(target){const root=g.plants.find(p=>p.kind==='escaperoot'&&p.rootGrown&&p.animation==='Idle');const p=root??g.plants.find(p=>p.kind==='threepeater'&&Math.abs(p.row-target.row)<=1);if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`reason ${g.lossReason}, time ${g.time}, wave ${g.wave}`);
});
test('Pirate 28 completes with garden boosts within 2000 sun and 15 simultaneous plants',()=>{
 const g=create(28);g.sun+=25;g.foodLimit=4;g.boosts=new Set(['sunflower','kernelpult','snapdragon','spikeweed']);
 for(let frame=0;frame<60*1600&&g.phase==='playing';frame++){
  for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   const put=(kind:Parameters<Game['plant']>[0],r:number,c:number)=>{if(g.plants.length<15&&g.sunSpent+g.seedCost(kind)<=2000)g.plant(kind,r,c);};
   const threats=g.zombies.filter(z=>z.hp>0&&!z.swing&&!z.parrot).sort((a,b)=>a.x-b.x);
   for(const row of [0,2,4])put('sunflower',row,0);
   for(const z of threats)if(z.kind==='pirate_barrel'&&z.x<850)put('spikeweed',z.row,4);
   for(const row of [1,3])put('snapdragon',row,2);
   for(const z of threats)put('kernelpult',z.row,1);
   const threat=threats.find(z=>z.x<620);if(threat){const snap=g.plants.find(p=>p.kind==='snapdragon'&&Math.abs(p.row-threat.row)<=1);if(snap)g.plantFood(snap.row,snap.column);}
   emergencyBombs(g,400);
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`reason ${g.lossReason}, time ${g.time}, wave ${g.wave}, spent ${g.sunSpent}`);
});
test('Pirate 29 completes with garden boosts, its five preset cards and twenty kills in eight seconds',()=>{
 const g=create(29);g.sun+=25;g.foodLimit=4;g.boosts=new Set(['sunflower','kernelpult']);
 for(let frame=0;frame<60*1600&&g.phase==='playing';frame++){
  for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   const threats=g.zombies.filter(z=>z.hp>0&&!z.swing&&!z.parrot).sort((a,b)=>a.x-b.x);
   emergencyBombs(g,650);
   for(const z of threats)if(!g.plants.some(p=>p.kind==='kernelpult'&&p.row===z.row))g.plant('kernelpult',z.row,2);
   for(const col of [0,1])for(let row=0;row<5;row++)g.plant('sunflower',row,col);
   for(const col of [2,3])for(let row=0;row<5;row++)g.plant('kernelpult',row,col);
   for(const col of [4,5,6])for(let row=0;row<5;row++)g.plant('spikeweed',row,col);
   if(threats.some(z=>z.x<750)){const p=g.plants.find(p=>p.kind==='kernelpult'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`reason ${g.lossReason}, time ${g.time}, wave ${g.wave}, challenge ${g.killChallengeComplete}`);
});

test('Escape Root matures after the authored ten seconds and cancellation resumes its idle state',()=>{
 const g=create(27);g['nextWave']=Infinity;g.conveyor.push({id:900,kind:'escaperoot',lane:0,position:0});g.plant('escaperoot',0,0,900);tick(g,9.9);assert.equal(g.plants[0].rootGrown,false);tick(g,.2);assert.equal(g.plants[0].animation,'Baby_End');tick(g,1.2);assert.ok(g.escape.select(0,0));g.escape.cancel();assert.equal(g.escape.selected,null);assert.equal(g.plants[0].animation,'Idle');
});
test('grapes keep horizontal direction on impact, turn between lanes and expire after five contacts',()=>{
 const g=create(27);g['nextWave']=Infinity;const z=g.spawnZombie('pirate',2,cellX(3));z.frozenUntil=100;
 const grape={id:-100,x:cellX(3)-10,y:rowY(2)-40,vx:100,vy:0,hits:0,lane:2,blocked:false,detected:[] as number[]};g.escape.grapes.push(grape);g.escape.tick(.01);
 assert.equal(grape.vx,100);assert.notEqual(grape.vy,0);assert.equal(grape.hits,1);assert.equal(grape.blocked,true);assert.deepEqual(grape.detected,[z.id]);
 grape.x=190;grape.vx=-100;grape.hits=4;g.escape.tick(.01);assert.equal(g.escape.grapes.length,0);
});
test('Pirate 27 and 30 grant the source pinatas once and retain cleared-map progress',()=>{
 const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}},progress=new ProgressStore(storage);
 for(const day of [27,30]){progress.finish('pirate',`pirate${day}`);progress.finishPresentation();progress.finish('pirate',`pirate${day}`);}
 const reopened=new ProgressStore(storage);assert.equal(reopened.campaignRewards().filter(r=>r.id==='spine_pirate').length,2);assert.ok(reopened.isComplete('pirate30'));
});

test('Pirate 31–35 retain last stands, protected Rotobagas, loss limit and second boss',()=>{
 assert.deepEqual([31,32,33,34,35].map(d=>level(d).waves.length),[10,15,16,10,0]);
 assert.deepEqual([31,32,33,34,35].map(d=>level(d).planks),[[],[1,2,3],[0,2,4],[0,1,2,3],[0,1,2,3,4]]);
 assert.deepEqual(level(31).lastStand,{sun:1850,food:1});assert.equal(level(31).flowerLine,4);
 assert.deepEqual(level(32).protectedPlants,[{kind:'xshot',column:2,row:1},{kind:'xshot',column:1,row:2},{kind:'xshot',column:2,row:3}]);
 assert.deepEqual(level(34).lastStand,{sun:1600,food:2});assert.equal(level(34).maxPlantsLost,1);assert.ok(level(34).blacklist.includes('sunflower'));assert.ok(level(34).blacklist.includes('iceburg'));
 const g=create(35);assert.equal(g.boss!.zombie.kind,'zombossmech_pirate2');assert.equal(g.boss!.zombie.hp,17000);assert.deepEqual(g.boss!.stages.map(s=>s.HitPoints),[1000,5000,11000]);
 assert.deepEqual(level(35).conveyor!.InitialPlantList.map(p=>p.PlantType),['chardguard','dandelion','jalapeno','lightningreed','spikeweed']);
});
test('Pirate 34 fails on the second plant lost, with sun producers excluded',()=>{
 const g=create(34);assert.equal(g.plant('sunflower',0,0),false);g.plant('wallnut',0,0);g.plant('wallnut',1,0);g.startLastStand();g['nextWave']=Infinity;
 g.plants[0].hp=0;tick(g,.1);assert.equal(g.phase,'playing');assert.equal(g.plantsLost,1);g.plants[0].hp=0;tick(g,.1);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'plantsLost');
});
test('Rotobaga shoots only along occupied diagonals and food fires four directions',()=>{
 const g=create(32);g['nextWave']=Infinity;const p=g.plants[1];
 const z=g.spawnZombie('pirate_armor4',3,cellX(2));z.frozenUntil=100;const armor=z.armor;tick(g,2);assert.ok(z.armor<armor);
 g.food=1;assert.ok(g.plantFood(p.row,p.column));tick(g,2);assert.ok(g.finale.shots.some(s=>s.food&&s.vx<0));assert.ok(g.finale.shots.some(s=>s.food&&s.vx>0));tick(g,3);assert.notEqual(p.action,'food');
});
function finalePlant(kind:'chardguard'|'dandelion'|'jalapeno'|'lightningreed',row=2,column=2){const g=create(35);g.boss= null;g.zombies=[];g.level.waves=[['pirate']];g['nextWave']=Infinity;g.conveyor.push({id:900,kind,lane:0,position:0});assert.ok(g.plant(kind,row,column,900));return g;}
test('Chard Guard spends a leaf, pushes three cells, repairs and restores leaves with food',()=>{
 const g=finalePlant('chardguard'),p=g.plants[0],z=g.spawnZombie('pirate',2,cellX(2)+30);z.frozenUntil=100;tick(g,1.3);assert.equal(p.leaves,2);assert.ok(z.leap);assert.equal(z.leap!.toX-z.leap!.fromX,246);
 g.conveyor.push({id:901,kind:'chardguard',lane:0,position:0});p.hp=300;assert.ok(g.plant('chardguard',2,2,901));assert.equal(p.hp,1500);assert.equal(p.leaves,3);
 p.leaves=0;g.food=1;assert.ok(g.plantFood(2,2));assert.equal(p.leaves,3);tick(g,3);assert.equal(p.action,'idle');
});
test('Lightning Reed chains to three neighbours, and the cloud expires after its native fade',()=>{
 const g=finalePlant('lightningreed'),p=g.plants[0],zs=[0,1,2,3,4].map(i=>g.spawnZombie('pirate',i%3+1,cellX(4)+i*15));for(const z of zs)z.frozenUntil=100;
 tick(g,.5);assert.equal(zs.filter(z=>z.hp===180).length,4);g.food=1;g.plantFood(p.row,p.column);tick(g,.6);assert.equal(g.finale.clouds.length,1);tick(g,16);assert.equal(g.finale.clouds.length,0);assert.equal(p.action,'idle');
});
test('Jalapeno fire spreads along its row and damages each surviving zombie once',()=>{
 const g=finalePlant('jalapeno'),z=g.spawnZombie('pirate_gargantuar',2,cellX(6)),other=g.spawnZombie('pirate',1,cellX(3));z.frozenUntil=100;other.frozenUntil=100;
 tick(g,.65);assert.equal(z.hp,3600);tick(g,.5);assert.equal(z.hp,1800);assert.equal(other.hp,190);tick(g,3);assert.equal(z.hp,1800);assert.equal(g.plants.length,0);tick(g,3);assert.equal(g.finale.fires.length,0);
});
test('Dandelion fires splash seeds and food drops three waves before recovering',()=>{
 const g=finalePlant('dandelion'),p=g.plants[0],z=g.spawnZombie('pirate_armor4',1,cellX(4));z.frozenUntil=100;tick(g,3);assert.ok(z.armor<2200);
 g.food=1;g.plantFood(p.row,p.column);tick(g,2);assert.ok(g.finale.shots.some(s=>s.food));tick(g,3);assert.notEqual(p.action,'food');assert.equal(p.burst,3);
});
test('Pirate 33 awards its second endless trophy once across reloads',()=>{
 const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
 const progress=new ProgressStore(storage);progress.finish('pirate','pirate33');progress.finishPresentation();progress.finish('pirate','pirate33');assert.equal(new ProgressStore(storage).campaignRewards().filter(r=>r.id==='dangerroom_pirate2').length,1);
});

test('Pirate 31 completes within its authored budget with garden-boosted Kernel-pults',()=>{
 const g=create(31);g.boosts=new Set(['kernelpult']);for(let row=0;row<5;row++)g.plant('wallnut',row,4);g.startLastStand();
 for(let frame=0;frame<60*1400&&g.phase==='playing';frame++){
  for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   const threats=g.zombies.filter(z=>z.hp>0&&!z.swing&&!z.leap).sort((a,b)=>a.x-b.x),target=threats.find(z=>z.x<800);
   const rows=target?[target.row,...[0,1,2,3,4].filter(r=>r!==target.row)]:[0,1,2,3,4];
   for(const col of [3,2,1,0])for(const row of rows)g.plant('kernelpult',row,col);
   if(target&&(target.butteredUntil??0)<=g.time&&target.frozenUntil<=g.time){const p=g.plants.find(p=>p.kind==='kernelpult'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`reason ${g.lossReason}, time ${g.time}, wave ${g.wave}`);assert.equal(g.sun,0);assert.equal(g.sunSpent,1850);
});
for(const seed of [1234,42,1])test(`Pirate 34 completes within 1600 sun with a garden boost (seed ${seed})`,()=>{
 const g=new Game(level(34),props,timing,z=>({x:z.x-25,y:rowY(z.row)-95}),seed);
 g.boosts=new Set(['kernelpult']);g.startLastStand();
 for(let frame=0;frame<60*600&&g.phase==='playing';frame++){
  playPirate34(g,frame);g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`reason ${g.lossReason}, time ${g.time}, wave ${g.wave}`);
 assert.equal(g.wave,10);assert.equal(g.plantsLost,0);assert.equal(g.sunSpent,1600);assert.equal(g.sun,0);
 assert.deepEqual([...g.usedBoosts],['kernelpult']);
});

// This is a losing strategy, deliberately retained to exercise the loss limit
// through the full source wave sequence; it is not a successful clear claim.
test('Pirate 34 stops on a second loss after reaching the final authored wave',()=>{
 const g=create(34);for(const col of [0,1,2])for(let row=0;row<5;row++)g.plant('kernelpult',row,col);g.plant('springbean',4,4);g.startLastStand();
 for(let frame=0;frame<60*1400&&g.phase==='playing';frame++){
  for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0&&g.zombies.some(z=>z.hp>0&&!z.swing&&z.x<560&&(z.butteredUntil??0)<=g.time&&z.frozenUntil<=g.time)){const p=g.plants.find(p=>p.kind==='kernelpult'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.wave,10);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'plantsLost');assert.equal(g.plantsLost,2);
});
for(const day of [32,35])test(`Pirate ${day} completes with original conveyor plants${day===32?", garden boosts":""} and collected food`,()=>{
 const g=new Game(level(day),props,timing,z=>({x:z.x,y:rowY(z.row)}),42);if(day===32)g.boosts=new Set(['kernelpult','snapdragon']);
 for(let frame=0;frame<60*1500&&g.phase==='playing';frame++){
  for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   for(const card of [...g.conveyor]){
    const cols=card.kind==='jalapeno'?[4,3,2,1,0]:card.kind==='chardguard'||card.kind==='wallnut'?[4,3,5]:card.kind==='potatomine'||card.kind==='spikeweed'?[5,4,3,2]:card.kind==='snapdragon'?[3,2,1]:[0,1,2,3];
    let placed=false;for(const col of cols){for(const row of [2,1,3,0,4]){
     if(card.kind==='jalapeno'&&!g.zombies.some(z=>z.hp>0&&g.inLane(z,row)))continue;
     if(g.plant(card.kind,row,col,card.id)){placed=true;break;}
    }if(placed)break;}
   }
   const threats=g.zombies.filter(z=>z.hp>0&&!z.swing).sort((a,b)=>a.x-b.x);
   if(threats.length){const p=g.plants.find(p=>p.kind===(day===35?'dandelion':'kernelpult')&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;g.finale.sounds.length=0;
 }
 assert.equal(g.phase,'won',`day ${day}, reason ${g.lossReason}, time ${g.time}, wave ${g.wave}, hp ${g.boss?.zombie.hp}`);
});
for(const day of [33])test(`Pirate ${day} completes with garden boosts, collected sun and earned food`,()=>{
 const g=create(day);g.sun+=25;g.foodLimit=4;g.boosts=new Set(['sunflower','kernelpult']);
 for(let frame=0;frame<60*1400&&g.phase==='playing';frame++){
  for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   const occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c),threats=g.zombies.filter(z=>z.hp>0&&!z.swing&&!z.parrot).sort((a,b)=>a.x-b.x);
   for(const z of threats)if(!g.plants.some(p=>p.row===z.row&&p.kind==='kernelpult'))g.plant('kernelpult',z.row,1);
   for(const z of threats)if(z.x<cellX(4)+90){g.plant('springbean',z.row,4);if(z.x<cellX(3)+45)g.plant('iceburg',z.row,3);}
   emergencyBombs(g,620);
   for(const col of [0])for(let row=0;row<5;row++)if(!occupied(row,col))g.plant('sunflower',row,col);
   for(const col of [1,2])for(let row=0;row<5;row++)if(!occupied(row,col))g.plant(col===2?'snapdragon':'kernelpult',row,col);
   for(let row=0;row<5;row++)if(!occupied(row,4))g.plant('springbean',row,4);
   const target=threats.find(z=>z.x<850);if(target){const p=g.plants.find(p=>p.row===target.row&&p.kind==='kernelpult');const bean=g.plants.find(p=>p.kind==='springbean');if(bean)g.plantFood(bean.row,bean.column);else if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`day ${day}, reason ${g.lossReason}, time ${g.time}, wave ${g.wave}`);
});

test('Pirate 34 counts shoveling during battle but refunds preparation without a loss',()=>{const g=create(34);g.plant('wallnut',0,0);g.shovel(0,0);assert.equal(g.plantsLost,0);assert.equal(g.sun,1600);g.plant('wallnut',0,0);g.plant('wallnut',1,0);g.startLastStand();g.shovel(0,0);assert.equal(g.plantsLost,1);g.shovel(1,0);assert.equal(g.lossReason,'plantsLost');assert.equal(g.phase,'lost');});

test('Pelicans use native health, ignore ground mines and fall to butter',()=>{
 const g=create(32);g['nextWave']=Infinity;const z=g.spawnZombie('pelican',2,cellX(4));z.frozenUntil=100;assert.equal(z.hp,270);
 g.conveyor.push({id:901,kind:'potatomine',lane:0,position:0});g.plant('potatomine',2,4,901);tick(g,16);assert.equal(z.hp,270);
 g.conveyor.push({id:902,kind:'kernelpult',lane:0,position:0});g.plant('kernelpult',2,0,902);g.food=1;g.plantFood(2,0);tick(g,4);assert.equal(g.zombies.some(q=>q.id===z.id),false);assert.ok(g.deaths.some(d=>d.zombie.id===z.id&&d.zombie.butteredUntil!==undefined));
});

test('Pirate 34 excludes an Imitater transformation, but counts its destruction',()=>{
 const g=create(34);g.imitateKind='kernelpult';g.plant('imitater',0,0);g.startLastStand();g['nextWave']=Infinity;tick(g,4);assert.equal(g.plants[0].kind,'kernelpult');assert.equal(g.plantsLost,0);
 const other=create(34);other.imitateKind='kernelpult';other.plant('imitater',0,0);other.startLastStand();other.plants[0].hp=0;tick(other,.1);assert.equal(other.plantsLost,1);
});

test('the second Pirate endless trophy uses its native shared reward animation',()=>{
 const c=read<{rewards:Record<string,{SPRITENAME:string}>}>('pirate/catalog.json');assert.equal(c.rewards.dangerroom_pirate2.SPRITENAME,'dangerroom_pirate');
 const battle=read<{rigs:Record<string,{rig:string;armature:string}>}>('battle/catalog.json'),reward=battle.rigs.reward;
 const skeleton=read<Skeleton>(`battle/rigs/${reward.rig}/skeleton.json`);assert.equal(BATTLE_LEVELS.pirate33.firstReward.animation,c.rewards.dangerroom_pirate2.SPRITENAME);assert.ok(skeleton.armature.find(a=>a.name===reward.armature)!.animation.some(a=>a.name===c.rewards.dangerroom_pirate2.SPRITENAME));
});
