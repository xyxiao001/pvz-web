import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './eighties-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS,availablePlants} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [31,32,33,34,35])test(`Eighties ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);if(g.preparing)g.startLastStand();if(day===34)g.sunProduced=7000;
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`eighties${day}`],`eighties${day}`);
 const config=BATTLE_LEVELS[`eighties${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 if(day===32)actors.boss=actors.eightiesBoss;
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});

import {ProgressStore} from '../src/shell/progression';
import {EightiesBoss} from '../src/game/eighties-boss';
test('31–35 configs, five-stage boss, speaker waves, conveyor changes and trophy',()=>{
 assert.equal(Object.keys(BATTLE_LEVELS).length,377);
 assert.deepEqual([31,32,33,34,35].map(d=>level(d).waves.length),[10,0,12,14,15]);
 assert.deepEqual(level(31).preset,['sunshroom','electricblueberry','sporeshroom','wallnut','intensivecarrot']);
 assert.equal(level(32).boss!.kind,'zombossmech_eighties');assert.equal(level(32).boss!.reserved,3);assert.deepEqual(level(32).graves,[]);assert.equal(level(32).mowers,true);assert.equal(level(32).sunDrops,false);
 assert.deepEqual(level(32).conveyor!.InitialPlantList.map(p=>p.PlantType),['cactus','celerystalker','garlic','phatbeet','sporeshroom','stunion']);
 assert.deepEqual(props.zombies.zombossmech_eighties.ZombossStages.map(s=>s.HitPoints),[2500,3000,3500,4000,5500]);
 assert.deepEqual(level(33).blacklist,['hurrikale','blover']);
 assert.deepEqual(level(34).preset,['goldleaf','phatbeet','celerystalker','stunion','iceburg']);assert.equal(level(34).targetSun,7000);
 assert.deepEqual(level(34).actions.flatMap((as,i)=>as.filter(a=>a.mode==='graves').map(a=>[i+1,a.graveCount])),[[2,3],[4,2],[6,5],[8,5],[10,5],[14,5]]);
 assert.equal(level(35).mowers,false);assert.equal(level(35).sunDrops,false);assert.equal(level(35).mold.length,10);assert.ok(level(35).mold.every(c=>c.column<2));
 assert.deepEqual(level(35).actions.flatMap((as,i)=>as.filter(a=>a.mode==='conveyor').map(a=>[i+1,a.add?.map(p=>p.PlantType),a.remove])),[[2,['coconutcannon'],['sporeshroom']],[4,['coconutcannon'],[]],[5,['starfruit'],['coconutcannon']],[8,['intensivecarrot'],['starfruit']]]);
 for(const day of [32,33,35])assert.ok(read('eighties/catalog.json').narratives[BATTLE_LEVELS[`eighties${day}`].narrative!].length);
 assert.equal(BATTLE_LEVELS.eighties32.outro,'EIGHTIES_32_OUTRO');assert.equal(BATTLE_LEVELS.eighties32.firstReward.animation,'worldtrophy_eighties');
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});store.finish('eighties','eighties32',0);store.finish('eighties','eighties32',0);assert.deepEqual(store.campaignRewards().map(r=>r.id),['worldtrophy_eighties']);
});
const isolated=()=>{const g=create(34);Object.assign(g,{nextWave:Infinity});g.plants=[];g.graves=[];g.sun=5000;return g;};
test('speaker spawns at native smash event, beats for 10 damage, and phat beet is immune',()=>{
 const g=isolated();g.addPlant('wallnut',2,5);g.addPlant('phatbeet',2,4);g.addPlant('wallnut',2,6);const [nut,beet,crushed]=g.plants,t=g.eighties.speaker.spawn(2,6);assert.equal(t.hp,500);tick(g,.1);assert.ok(crushed.hp>0);tick(g,.1);assert.equal(crushed.hp,0);
 tick(g,2.2);assert.ok(nut.hp<props.plants.wallnut.Toughness);assert.equal(beet.hp,props.plants.phatbeet.Toughness);
 t.hp=299;g.eighties.speaker.damage(t);assert.equal(t.stage,3);assert.equal(g.plant('gravebuster',2,6),false);
});
test('charged speaker wave kills its lane, including phat beet, and spares other lanes',()=>{
 const g=isolated();g.addPlant('wallnut',1,1);g.addPlant('phatbeet',2,3);g.addPlant('wallnut',2,4);const [safe,beet,nut]=g.plants,t=g.eighties.speaker.spawn(2,6);g.eighties.speaker.charge(t);const z=g.spawnZombie('eighties',2,cellX(5));z.frozenUntil=100;
 // Charge is queued until Spawn ends; wave occurs 3.1667 seconds into Charge.
 tick(g,3.8);assert.ok(nut.hp>0);tick(g,.6);assert.equal(nut.hp,0);assert.equal(beet.hp,0);assert.ok(safe.hp>0);assert.ok(z.hp<=0);tick(g,.4);assert.equal(g.eighties.speaker.waves.length,0);
});
test('five boss stages switch jams, retain full-lane targeting, summon and finish through Escape',()=>{
 const g=create(32),boss=g.boss as EightiesBoss;assert.equal(boss.zombie.hp,18500);assert.deepEqual([0,1,2,3,4].map(r=>g.inLane(boss.zombie,r)),[true,true,true,true,true]);
 tick(g,4);assert.equal(g.eighties.jam,'jam_punk');assert.equal(g.graves.length,5);assert.ok(g.graves.every(t=>t.kind==='speaker'&&t.column===6));
 tick(g,5);assert.ok(g.zombies.length>1||boss.targets.length||[...g.eighties.speaker.states.values()].some(s=>s.animation==='Charge'||s.charge));
 for(const jam of ['jam_pop','jam_rap','jam_8bit','jam_metal']){g.damage(boss.zombie,100000);tick(g,3.2);assert.equal(g.eighties.jam,jam);assert.equal(g.phase,'playing');for(const z of g.zombies)if(z!==boss.zombie)g.damage(z,100000,'water');}
 g.damage(boss.zombie,100000);assert.equal(boss.animation,'DeathStart');assert.equal(g.graves.length,0);tick(g,12);assert.equal(boss.animation,'Escape');assert.equal(g.phase,'won');
});
test('wave speakers smash in place without bouncing plants; sun objective still fails below 7000',()=>{
 const g=isolated();const a=g.level.actions[1].find(a=>a.mode==='graves')!;for(const c of a.positions!)g.addPlant('wallnut',c.row,c.column);
 Object.assign(g,{nextWave:0,wave:1});tick(g,.3);const speakers=g.graves.filter(t=>t.kind==='speaker');assert.equal(speakers.length,3);assert.ok(speakers.every(t=>!g.plants.some(p=>p.row===t.row&&p.column===t.column)));assert.ok(g.plants.every(p=>!p.leap));
 const fail=create(34);Object.assign(fail,{wave:14,nextWave:Infinity});tick(fail,.1);assert.equal(fail.phase,'lost');assert.equal(fail.lossReason,'sunProduced');
});

test('native turnip absorbs the charged wave and dies, protecting plants behind it',()=>{
 const g=isolated();g.addPlant('wallnut',2,1);g.addPlant('turnip',2,3);const [nut,turnip]=g.plants,t=g.eighties.speaker.spawn(2,6);g.eighties.speaker.charge(t);tick(g,4.6);assert.equal(turnip.hp,0);assert.equal(nut.hp,4000);assert.equal(g.eighties.speaker.waves.length,0);
});
test('boss action timer summons, targets a speaker drop for two seconds, and charges a lane',()=>{
 const g=create(32),boss=g.boss as EightiesBoss;tick(g,4);
 const act=(name:string)=>{Object.assign(boss,{previous:boss.current.Actions.find(a=>a.actionName===name),repeatLeft:1,restLeft:0});tick(g,1/60);};
 act('summon');tick(g,1.1);assert.ok(g.zombies.some(z=>z!==boss.zombie&&z.kind==='eighties_punk'));
 act('shoot');assert.equal(boss.targets.length,1);const target={...boss.targets[0]};tick(g,1.8);assert.equal(boss.targets.length,1);assert.ok(!g.graves.some(t=>t.row===target.row&&t.column===target.column));tick(g,.3);assert.equal(boss.targets.length,0);assert.ok(g.graves.some(t=>t.kind==='speaker'&&t.row===target.row&&t.column===target.column));
 act('rush');assert.ok([...g.eighties.speaker.states.values()].some(s=>s.animation==='Charge'||s.charge));
});
