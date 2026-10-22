import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,read,tick} from './dino-fixture';
import {type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {DinoBoss} from '../src/game/dino-boss';
import {cellX,rowY} from '../src/game/level';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [31,32,33,34,35])test(`Dino ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');if(day!==32)assert.equal(g.wave,g.level.waves.length);else assert.equal(g.boss!.defeated,true);assert.equal(LEVEL_ROUTES[`dino${day}`],`dino${day}`);
 const config=BATTLE_LEVELS[`dino${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.chooserPlants??[]),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});
test('Dino 31–35 source modes, narratives, restricted planting and rewards',()=>{
 assert.deepEqual([31,33,34,35].map(d=>level(d).waves.length),[9,9,15,10]);assert.deepEqual([31,33,34,35].map(d=>level(d).flagInterval),[9,3,5,5]);
 assert.deepEqual([31,32,33,34,35].map(d=>BATTLE_LEVELS[`dino${d}`].mode),['preset','conveyor','seedbank','preset','conveyor']);
 assert.deepEqual(level(31).preset,['primalsunflower','primalpeashooter','primalpotatomine','perfumeshroom','coldsnapdragon']);
 assert.deepEqual(level(34).preset,['torchwood','primalpeashooter','sunshroom','splitpea','goldbloom']);assert.equal(level(34).maxPlantsLost,10);assert.equal(level(34).mowers,false);
 assert.equal(level(35).flowerLine,4.5);assert.equal(level(35).mowers,false);assert.equal(level(35).sunDrops,false);assert.deepEqual(level(35).conveyor!.InitialPlantList.map(p=>p.PlantType),['primalpeashooter']);
 assert.ok(level(35).actions.flat().some(a=>a.add?.some(p=>p.PlantType==='perfumeshroom'&&p.MaxDelivered===1)));
 for(const day of [31,32,33,34,35]){const d=read(`dino/dino${day}.source.json`).objects.find((o:{objclass:string})=>o.objclass==='LevelDefinition').objdata,c=BATTLE_LEVELS[`dino${day}`];assert.equal(c.narrative,d.FirstIntroNarrative??null);assert.equal(c.outro,d.FirstOutroNarrative);assert.equal(c.presentation.music,`dino/${day===33?'music':'minigame'}.mp3`);}
 assert.equal(Object.values(BATTLE_LEVELS).filter(l=>l.world==='dino'&&l.day<=35).length,35);assert.ok(Object.keys(BATTLE_LEVELS).length>=419);
 const g=create(32);assert.ok(g.boss instanceof DinoBoss);assert.equal(g.boss.zombie.hp,21500);assert.deepEqual(g.boss.stages.map(s=>s.HitPoints),[5000,9500,7000]);assert.equal(g.level.boss!.reserved,3);assert.equal(g.plant('primalpeashooter',0,6),false);
 const reward=BATTLE_LEVELS.dino32.firstReward,asset=read('battle/catalog.json').rigs.reward;assert.ok(read(`battle/rigs/${asset.rig}/skeleton.json`).armature.find((a:{name:string})=>a.name===asset.armature).animation.some((a:{name:string})=>a.name===reward.animation));
});
const bossGame=()=>{const g=create(32);tick(g,10);g.zombies=g.zombies.filter(z=>z===g.boss!.zombie);return g;};
const force=(g:ReturnType<typeof create>,name:string,dino?:string)=>{const b=g.boss as DinoBoss;const a=b.current.Actions.find(a=>a.actionName===name&&a.summonProps.dinoType===dino)!;assert.ok(a);b.zombie.x=cellX(6);Object.assign(b,{previous:a,repeatLeft:1,motion:null,restLeft:0,animation:'Idle'});tick(g,.02);};
test('Dino boss summons the authored dinosaurs and zombies into the same lane',()=>{
 for(const [stage,kind] of [[0,'raptor'],[0,'stego'],[1,'ptero'],[2,'ankylo'],[2,'tyranno']] as const){const g=bossGame(),b=g.boss as DinoBoss;b.stage=stage;b.zombie.hp=b.stages.slice(stage).reduce((n,s)=>n+s.HitPoints,0);force(g,'summon',kind);tick(g,1.6);const ds=[...g.dino.raptors,...g.dino.visitors.items,...g.dino.tyranno.items,...g.dino.ankylo.items];assert.equal(ds.length,1);const spawned=g.zombies.filter(z=>z!==b.zombie);assert.ok(spawned.length>0);assert.ok(spawned.every(z=>z.row===ds[0].row));assert.ok(spawned.every(z=>b.current.Actions.find(a=>a.summonProps.dinoType===kind)!.summonProps.zombieList.includes(z.kind)));}
});
test('Dino boss missiles damage adjacent plants and crack the target for ten seconds',()=>{
 const g=bossGame(),b=g.boss as DinoBoss;g.level.conveyor=null;g.sun=10000;for(let r=0;r<5;r++){g.cooldowns.primalwallnut=0;assert.ok(g.plant('primalwallnut',r,2));}
 force(g,'shoot');assert.equal(b.targets.length,2);const t={...b.targets[0]};g.cooldowns.primalwallnut=0;g.plants=g.plants.filter(p=>p.row!==t.row);assert.ok(g.plant('primalwallnut',t.row,t.column));const side=t.column===5?4:t.column+1;g.cooldowns.primalwallnut=0;assert.ok(g.plant('primalwallnut',t.row,side));const p=g.plants.find(p=>p.row===t.row&&p.column===side)!,hp=p.hp;
 tick(g,4.2);assert.ok(b.cracks.some(c=>c.row===t.row&&c.column===t.column));assert.ok(p.hp<=hp-250);g.cooldowns.primalwallnut=0;assert.equal(g.plant('primalwallnut',t.row,t.column),false);
 Object.assign(b,{restLeft:Infinity,animation:'Idle'});tick(g,10.1);g.cooldowns.primalwallnut=0;assert.ok(g.plant('primalwallnut',t.row,t.column));
});
test('Dino laser sweeps two lanes, burns non-boss zombies, and can be interrupted by 1000 damage',()=>{
 const g=bossGame(),b=g.boss as DinoBoss;b.stage=1;b.zombie.hp=16500;g.level.conveyor=null;g.sun=10000;assert.ok(g.plant('primalwallnut',b.zombie.row,2));const victim=g.spawnZombie('dino_bully',b.zombie.row,cellX(5));force(g,'rush');tick(g,2);assert.notEqual(b.laserColumn,null);assert.ok(b.cracks.length>=2);assert.ok(victim.hp<=0);assert.ok(b.cracks.every(c=>b.covers(c.row)));const before=b.zombie.hp;b.hit(999);assert.notEqual(b.laserColumn,null);b.hit(1);assert.equal(b.laserColumn,null);assert.equal(b.animation,'StunStart');assert.equal(b.zombie.hp,before-1000);
});
test('Dino boss survives dinosaur fear and charm, then completes its death and escape',()=>{
 const g=bossGame(),b=g.boss as DinoBoss;g.dino.add({kind:'tyranno',row:b.zombie.row,delay:0});tick(g,3);assert.equal(!!b.zombie.scaredByTyranno,false);const t=g.dino.tyranno.items[0];g.dino.tyranno.charm(t);tick(g,4);assert.ok(b.zombie.hp>0);
 b.hit(100000);assert.equal(b.stage,1);b.hit(100000);assert.equal(b.stage,2);b.hit(100000);assert.equal(b.zombie.hp,0);assert.equal(b.defeated,false);tick(g,18);assert.equal(b.defeated,true);assert.equal(g.phase,'won');
});
test('Dino 34 losses and Dino 35 flower crossing fail at their authored boundaries',()=>{
 const a=create(34);a.plantsLost=11;tick(a,.1);assert.equal(a.lossReason,'plantsLost');
 const b=create(35);b.spawnZombie('dino',0,cellX(4));tick(b,.1);assert.equal(b.lossReason,'flowers');
});
test('Dino 1–35 unlock in order, with the boss trophy and day 33 pinata awarded once',async()=>{
 const {ProgressStore,completionEvents}=await import('../src/shell/progression'),{islandStates}=await import('../src/shell/navigation');const map=read('shell/maps/dino.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=35;day++){const id=`dino${day}`,node=map.islands.find((n:{levels:string[]})=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('dino')).get(node.node),'open',id);p.finish('dino',id);for(const e of completionEvents(map,id,p.completed(map),p.rewardNodes('dino')))if(e.action==='reward')p.award('dino',map.islands.find((n:{node:number})=>n.node===e.node)!);p.finishPresentation();const before=JSON.stringify(p.campaignRewards());p.finish('dino',id);assert.equal(JSON.stringify(p.campaignRewards()),before);}
 assert.equal(p.completed(map).size,35);assert.deepEqual(p.campaignRewards().filter(r=>['dino32','dino33'].includes(r.level)),[{level:'dino32',type:'worldtrophy',id:'worldtrophy_dino',count:1},{level:'dino33',type:'pinata',id:'spine_dino',count:1}]);
});
test('Gold Bloom produces 100, 125 and 150 sun, disappears without a lost plant and cannot use food',()=>{
 const g=create(34);Object.assign(g,{nextWave:Infinity});assert.ok(g.plant('goldbloom',2,2));g.food=1;assert.equal(g.plantFood(2,2),false);tick(g,2);assert.equal(g.sunProduced,375);assert.equal(g.plants.length,0);assert.equal(g.plantsLost,0);assert.ok(g.cooldowns.goldbloom>70);
});
test('Torchwood ignites normal and primal peas, upgrades permanently and burns a cross on death',()=>{
 const g=create(34);Object.assign(g,{nextWave:Infinity});g.sun=10000;assert.ok(g.plant('torchwood',2,2));const p=g.plants[0];const pea={row:2,x:cellX(2)+1,y:rowY(2)-48,damage:20};g.dino.plants.ignite(pea,cellX(2)-1);assert.equal(pea.damage,40);g.dino.plants.ignite(pea,cellX(2)-1);assert.equal(pea.damage,40);g.food=2;assert.ok(g.plantFood(2,2));tick(g,5.1);assert.equal(p.animation,'Idle_Blue');assert.equal(g.plantFood(2,2),false);g.dino.plants.ignite(pea,cellX(2)-1);assert.equal(pea.damage,60);
 const z=g.spawnZombie('dino_bully',2,cellX(4)),hp=z.hp;g.iceageCombat.primalPeas.push({id:g.nextEntityId(),row:2,x:cellX(2)-1,y:rowY(2)-48,kind:'pea_primal'});tick(g,.3);assert.equal(z.hp,hp-180);assert.ok(z.stunnedUntil!>g.time);
 const near=g.spawnZombie('dino_bully',2,cellX(2)),before=near.hp;tick(g,.1);assert.equal(near.hp,before-18.75);p.hp=0;tick(g,1.1);assert.ok(g.dino.plants.fires.length>0);assert.ok(near.hp<=before-18.75-450);
});

test('Gold Bloom is not interrupted by a Jurassic Gargantuar while producing sun',()=>{
 const g=create(34);Object.assign(g,{nextWave:Infinity});assert.ok(g.plant('goldbloom',2,2));g.spawnZombie('dino_gargantuar',2,cellX(2)+30);tick(g,2);assert.equal(g.sunProduced,375);assert.equal(g.plantsLost,0);
});

test('Dino boss completes its queued repeat even after the first laser clears its lanes',()=>{
 const g=bossGame(),b=g.boss as DinoBoss;b.stage=2;b.zombie.hp=7000;assert.equal(g.plants.length,0);force(g,'rush');assert.equal(b.animation,'RushStart');tick(g,5);assert.ok(b.cracks.length>0);
});
