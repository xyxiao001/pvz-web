import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Game} from '../src/game/model';
import {readLevel,cellX,rowY,type Properties,type SourceLevel,type AnimationTiming} from '../src/game/level';
import {animationTimeline,specialAnimationTiming,bonkAnimationTiming,type Skeleton} from '../src/rendering/presentation';
import type {CampaignCatalog} from '../src/rendering/battle-art';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import type {WorldMap} from '../src/shell/types';
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
 for(let day=1;day<=15;day++){const id=`pirate${day}`;progress.finish('pirate',id);for(const event of completionEvents(map,id,progress.completed(map),progress.rewardNodes('pirate')))if(event.action==='reward')progress.award('pirate',map.islands.find(n=>n.node===event.node)!);progress.finishPresentation();}
 assert.ok(progress.ownedPlants().has(30));assert.ok(progress.ownedPlants().has(59));assert.ok(progress.ownedPlants().has(37));assert.ok(progress.ownedPlants().has(32));assert.ok(progress.ownedPlants().has(57));assert.ok(progress.ownedPlants().has(17));assert.ok(progress.ownedUpgrades().has(6));assert.equal(progress.battleBonuses().shovelRefund,.25);assert.equal(progress.worldKeys(),1);assert.equal(progress.isComplete('egypt1'),false);
 assert.equal(new ProgressStore(storage).worldUnlocked('pirate'),true);
 assert.deepEqual(progress.campaignRewards().filter(r=>r.level.startsWith('pirate')).map(r=>r.id),['dangerroom_pirate','spine_pirate','note_pirate','worldkey']);
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
