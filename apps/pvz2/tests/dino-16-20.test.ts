import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './dino-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [16,17,18,19,20])test(`Dino ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);if(day===20)for(let row=0;row<5;row++)for(let col=0;col<4;col++)g.addPlant('primalsunflower',row,col);
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`dino${day}`],`dino${day}`);
 const config=BATTLE_LEVELS[`dino${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.chooserPlants??[]),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});
test('Dino 16–20 preserve authored modes, waves, challenges, rewards and narratives',()=>{
 assert.deepEqual([16,17,18,19,20].map(d=>level(d).waves.length),[12,10,9,10,10]);
 assert.deepEqual([16,17,18,19,20].map(d=>level(d).flagInterval),[4,5,3,5,5]);
 assert.deepEqual([16,17,18,19,20].map(d=>BATTLE_LEVELS[`dino${d}`].mode),['conveyor','seedbank','seedbank','conveyor','seedbank']);
 assert.ok(battleEffects(level(16),[]).includes('zombossicon'));assert.equal(level(16).mowers,false);assert.equal(level(16).sunDrops,false);assert.equal(level(19).flowerLine,5.5);assert.equal(level(19).sunDrops,false);assert.equal(level(20).targetSun,2000);
 assert.deepEqual(level(16).conveyor!.InitialPlantList.map(p=>p.PlantType),['primalpeashooter','primalwallnut']);
 assert.deepEqual(level(19).conveyor!.InitialPlantList.map(p=>p.PlantType),['coldsnapdragon']);
 assert.deepEqual(level(19).actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[]),['primalwallnut','spikerock']);
 assert.deepEqual(level(17).chooserPlants,['primalsunflower']);assert.equal(BATTLE_LEVELS.dino17.firstReward.plant,'primalsunflower');
 assert.equal(BATTLE_LEVELS.dino16.firstReward.image,'worldkey');assert.equal(BATTLE_LEVELS.dino20.firstReward.image,'dangerroom_dino');
 for(const name of ['DINO_16_INTRO','DINO_17_INTRO','DINO_OUTRO_DANGER_ROOM_KEY'])assert.ok(read('dino/catalog.json').narratives[name].some((s:{Lines?:unknown})=>s.Lines));
 assert.ok(read('shell/progression.json').plants[146].length);assert.ok(Object.keys(BATTLE_LEVELS).length>=404);
 assert.equal(Object.values(BATTLE_LEVELS).filter(l=>l.world==='dino'&&l.day<=20).length,20);
});
const isolated=()=>{const g=create(18);Object.assign(g,{nextWave:Infinity});g.plants=[];return g;};
test('Primal Sunflower produces 75 sun and three food suns at native events then resumes production',()=>{
 const g=isolated();g.addPlant('primalsunflower',0,2);const p=g.plants[0];assert.ok(p.nextAction>=5&&p.nextAction<=10);p.nextAction=0;
 tick(g,.65);assert.equal(g.sunProduced,0);tick(g,.1);assert.equal(g.sunProduced,75);assert.equal(g.suns[0].value,75);assert.ok(p.nextAction>=23.5&&p.nextAction<=25.1);
 tick(g,1);g.food=1;assert.ok(g.plantFood(0,2));tick(g,.8);assert.equal(g.sunProduced,75);tick(g,.4);assert.equal(g.sunProduced,300);tick(g,.9);assert.equal(p.action,'idle');assert.ok(p.nextAction>=g.time+4.8&&p.nextAction<=g.time+10);
 tick(g,12);assert.equal(g.sunProduced,375);
});
test('Tyranno roars once, restores the leftward direction and accelerates its row fourfold',()=>{
 const g=isolated();g.dino.add({kind:'tyranno',row:2,delay:0});const z=g.spawnZombie('dino',2,cellX(6)),other=g.spawnZombie('dino',1,cellX(6));z.reversed=true;
 tick(g,3.95);assert.equal(z.scaredByTyranno,undefined);tick(g,.2);assert.equal(z.scaredByTyranno,true);assert.equal(z.reversed,false);assert.equal(other.scaredByTyranno,undefined);
 const x=z.x;tick(g,.5);assert.ok(Math.abs(x-z.x-props.zombies.dino.WalkSPS*82*4*.5)<.001);assert.equal(g.dino.tyranno.items[0].roars,0);
 tick(g,5);assert.equal(g.dino.tyranno.items.length,0);
});
test('Cold, freeze, perfume slowing and sap cancel Tyranno fear without restoring its old direction',()=>{
 for(const field of ['chilledUntil','frozenUntil','perfumeUntil','sappedUntil'] as const){const g=isolated(),z=g.spawnZombie('dino',2,cellX(7));z.scaredByTyranno=true;z[field]=g.time+.5;tick(g,.1);assert.equal(z.scaredByTyranno,false);tick(g,.6);assert.equal(z.scaredByTyranno,false);}
});
test('Perfumed Tyranno swallows five nearby targets including giants and then leaves',()=>{
 const g=isolated();g.dino.add({kind:'tyranno',row:2,delay:0});tick(g,.7);g.addPlant('perfumeshroom',2,5);tick(g,1);const d=g.dino.tyranno.items[0];assert.equal(d.charmed,true);
 const targets=Array.from({length:6},(_,i)=>g.spawnZombie(i===0?'dino_gargantuar':'dino',2,cellX(6)));for(const z of targets)z.stunnedUntil=Infinity;
 const elsewhere=g.spawnZombie('dino',1,cellX(6));elsewhere.stunnedUntil=Infinity;
 tick(g,.4);assert.ok(targets.every(z=>z.hp>0));tick(g,8);assert.equal(targets.filter(z=>z.hp===0).length,5);assert.equal(targets[0].deathCause,'swallow');assert.ok(elsewhere.hp>0);assert.equal(g.dino.tyranno.items.length,0);
});
test('Idle Tyranno leaves after its native waiting period',()=>{const g=isolated();g.dino.add({kind:'tyranno',row:0,delay:0});tick(g,39);assert.equal(g.dino.tyranno.items.length,1);tick(g,5);assert.equal(g.dino.tyranno.items.length,0);});
test('Dino 19 flower line and Dino 20 production goal keep their failure conditions',()=>{
 const g=create(19);Object.assign(g,{nextWave:Infinity});g.spawnZombie('dino',2,cellX(5));tick(g,.1);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'flowers');
 const h=create(20);h.dropSun(cellX(0),100,2000,'sky');assert.equal(h.sunProduced,0);
 for(let i=0;i<30000&&h.phase==='playing';i++){h.tick(1/60);for(const z of h.zombies)h.damage(z,100000,'water');}
 assert.equal(h.phase,'lost');assert.equal(h.lossReason,'sunProduced');
});
test('Dino first twenty map nodes unlock and new plant and trophy rewards are claimed only once',async()=>{
 const {ProgressStore,completionEvents}=await import('../src/shell/progression'),{islandStates}=await import('../src/shell/navigation');
 const map=read('shell/maps/dino.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=20;day++){
  const id=`dino${day}`,node=map.islands.find((n:{levels:string[]})=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('dino')).get(node.node),'open',id);
  p.finish('dino',id);const events=completionEvents(map,id,p.completed(map),p.rewardNodes('dino'));for(const e of events)if(e.action==='reward')p.award('dino',map.islands.find((n:{node:number})=>n.node===e.node)!);p.finishPresentation();
  const rewards=JSON.stringify([p.rewards(),p.campaignRewards()]);p.finish('dino',id);for(const e of events)if(e.action==='reward')p.award('dino',map.islands.find((n:{node:number})=>n.node===e.node)!);assert.equal(JSON.stringify([p.rewards(),p.campaignRewards()]),rewards);
 }
 assert.deepEqual(p.rewards().map(r=>r.id),[18,41,160,146]);assert.equal(p.completed(map).size,20);assert.deepEqual(p.campaignRewards().filter(r=>r.id==='spine_dino').map(r=>r.level),['dino12','dino14']);assert.deepEqual(p.campaignRewards().filter(r=>r.type==='worldtrophy').map(r=>r.id),['worldkey','dangerroom_dino']);
});
