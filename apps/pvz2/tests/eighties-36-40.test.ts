import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './eighties-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS,availablePlants} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [36,37,38,39,40])test(`Eighties ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);if(g.preparing)g.startLastStand();
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`eighties${day}`],`eighties${day}`);
 const config=BATTLE_LEVELS[`eighties${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});

import {ProgressStore} from '../src/shell/progression';
test('36–40 preserve challenges, presets, no mowers, last stand and second trophy',()=>{
 assert.equal(Object.keys(BATTLE_LEVELS).length,382);assert.deepEqual([36,37,38,39,40].map(d=>level(d).waves.length),[12,14,16,15,10]);
 assert.equal(level(36).flowerLine,6);assert.equal(level(37).maxPlantsLost,5);assert.deepEqual(level(37).protectedPlants,[0,2,4].map(row=>({kind:'phatbeet',row,column:4})));
 assert.deepEqual(level(37).preset,['twinsunflower','peapod','imitater','sapfling','wallnut','empea']);assert.equal(BATTLE_LEVELS.eighties37.mode,'preset');
 assert.deepEqual(level(39).preset,['caulipower','sunflower','phatbeet','wallnut']);assert.equal(level(39).maxPlants,15);assert.equal(BATTLE_LEVELS.eighties39.mode,'preset');
 assert.ok(read('eighties/catalog.json').narratives.EIGHTIES_39_INTRO.length);assert.equal(BATTLE_LEVELS.eighties39.firstReward.plant,undefined);assert.ok(!availablePlants(BATTLE_LEVELS.eighties40,new Set([178])).includes('caulipower'));
 for(const day of [36,37,38,39,40])assert.equal(level(day).mowers,false);
 const g=create(40);assert.equal(g.sun,2400);assert.equal(g.food,2);assert.equal(g.preparing,true);assert.equal(g.level.sunDrops,false);assert.ok(g.level.blacklist.includes('sunflower'));assert.ok(g.level.blacklist.includes('twinsunflower'));
 assert.equal(BATTLE_LEVELS.eighties38.firstReward.animation,'dangerroom_eighties2');
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});store.finish('eighties','eighties38',0);store.finish('eighties','eighties38',0);assert.deepEqual(store.campaignRewards().map(r=>r.id),['dangerroom_eighties2']);
});
const isolated=()=>{const g=create(39);Object.assign(g,{nextWave:Infinity});g.plants=[];g.sun=5000;return g;};
test('heavy armor has 2200 durability, absorbs damage and is restored by thyme warp',()=>{
 const g=isolated(),z=g.spawnZombie('eighties_armor4',2,cellX(7));assert.equal(z.hp,190);assert.equal(z.armor,2200);g.damage(z,1000);assert.equal(z.hp,190);assert.equal(z.armor,1200);
 g.addPlant('thymewarp',0,0);assert.equal(z.armor,2200);
});
test('veteran summons after half a second, follows, releases on punk music and keeps kicking',()=>{
 const g=isolated(),z=g.spawnZombie('eighties_punk_veteran',2,cellX(7));tick(g,.4);assert.equal(g.eighties.skunk.followers.size,0);tick(g,.2);assert.equal(g.eighties.skunk.followers.size,1);
 const child=g.zombies.find(q=>q.kind==='eighties_skunk')!,f=g.eighties.skunk.followers.get(child.id)!;tick(g,1);assert.equal(child.row,2+f.y);assert.ok(Math.abs(child.x-(z.x+f.x*82))<30);
 g.eighties.jam='jam_punk';tick(g,.1);assert.equal(g.eighties.skunk.followers.size,0);assert.equal(g.eighties.skunk.speed(child),1.5/.23125);assert.equal(child.reversed,z.reversed);
 g.addPlant('wallnut',2,3);assert.equal(g.eighties.kick(z,g.plants[0]),true);assert.equal(g.plants[0].column,2);
 tick(g,4);assert.ok(g.zombies.filter(q=>q.kind==='eighties_skunk').length>=2);
});
test('veteran death releases followers; skunks fart initially, every three seconds and on death',()=>{
 const g=isolated(),z=g.spawnZombie('eighties_punk_veteran',2,cellX(7));tick(g,.6);const child=g.zombies.find(q=>q.kind==='eighties_skunk')!;g.damage(z,10000);tick(g,.1);assert.equal(g.eighties.skunk.followers.size,0);
 g.addPlant('wallnut',child.row,4);const p=g.plants[0];child.x=cellX(4)+20;child.eating=true;tick(g,1);assert.ok(g.eighties.skunk.blocked(p));
 g.food=1;assert.equal(g.plantFood(p.row,p.column),true);assert.equal(g.eighties.skunk.blocked(p),false);
 tick(g,3);assert.ok(g.beach.sounds.filter(s=>s==='eightiesSkunk/fartSounds').length>=2);g.damage(child,100);tick(g,.1);assert.ok(g.beach.sounds.filter(s=>s==='eightiesSkunk/fartSounds').length>=3);
});
test('caulipower charges ten seconds, homes across lanes, preserves armor and drops held food',()=>{
 const g=isolated();g.addPlant('caulipower',0,0);const p=g.plants[0],z=g.spawnZombie('eighties_armor4',4,cellX(7));z.frozenUntil=100;z.food=true;
 tick(g,9.9);assert.equal(g.westFinale.allies.length,0);tick(g,2);assert.ok(g.westFinale.allies.includes(z));assert.equal(z.armor,2200);assert.equal(z.hp,190);assert.equal(z.reversed,true);assert.equal(g.kills,1);assert.ok(g.pickups.some(p=>p.kind==='food'));assert.ok(p.nextAction>g.time+10);
});
test('caulipower target categories choose their leftmost eligible zombie, and shots retarget',()=>{
 const g=isolated(),far=g.spawnZombie('eighties',0,cellX(7)),near=g.spawnZombie('eighties_armor4',4,cellX(5)),v=g.spawnZombie('eighties_punk_veteran',3,cellX(6));
 g.random=()=>0;assert.equal(g.eighties.cauli.target(),near);g.random=()=>.99;assert.equal(g.eighties.cauli.target(),v);v.hp=0;g.random=()=>0;
 g.addPlant('caulipower',0,0);g.eighties.cauli.shots.push({id:999,x:cellX(4),y:600,angle:0,target:v});g.eighties.cauli.tick(.01);assert.equal(g.eighties.cauli.shots[0].target,near);assert.ok(!g.westFinale.allies.includes(far));
});
test('caulipower food flicks five targets and pushes toss-immune targets three columns',()=>{
 const g=isolated();g.addPlant('caulipower',0,0);for(let i=0;i<6;i++){const z=g.spawnZombie('eighties',i%5,cellX(7));z.frozenUntil=100;}g.food=1;assert.equal(g.plantFood(0,0),true);tick(g,2.6);assert.equal(g.kills,5);assert.equal(g.zombies.length,1);assert.notEqual(g.plants[0].action,'food');
 g.zombies=[];const z=g.spawnZombie('eighties_gargantuar',2,cellX(7));z.frozenUntil=100;g.food=1;g.plantFood(0,0);tick(g,1);assert.equal(z.hp,props.zombies.eighties_gargantuar.Toughness);assert.equal(z.leap!.toX-z.leap!.fromX,246);
});
test('37 protected plants and loss cap, 39 plant cap, and 36 flower line remain enforced',()=>{
 const protectedGame=create(37);protectedGame.plants[0].hp=0;tick(protectedGame,.1);assert.equal(protectedGame.phase,'lost');
 const loss=create(37);for(let i=0;i<6;i++){loss.addPlant('wallnut',1,i);loss.plants.at(-1)!.hp=0;}tick(loss,.1);assert.equal(loss.phase,'lost');
 const cap=isolated();for(let i=0;i<15;i++)cap.addPlant('wallnut',Math.floor(i/9),i%9);assert.equal(cap.plant('wallnut',4,4),true);tick(cap,.1);assert.equal(cap.phase,'lost');
 const flowers=create(36);flowers.spawnZombie('eighties',2,190+6*82);tick(flowers,.1);assert.equal(flowers.phase,'lost');
});
test('converted veteran releases enemy followers and summons allied skunks that can fight enemies',()=>{
 const g=isolated(),z=g.spawnZombie('eighties_punk_veteran',2,cellX(6));tick(g,.7);const enemyChild=g.zombies.find(q=>q.kind==='eighties_skunk')!;
 g.eighties.cauli.shots.push({id:999,x:z.x,y:400,angle:0,target:z});g.eighties.cauli.tick(1);tick(g,.1);assert.ok(g.westFinale.allies.includes(z));assert.ok(g.zombies.includes(enemyChild));assert.ok(!g.eighties.skunk.followers.has(enemyChild.id));enemyChild.frozenUntil=100;
 tick(g,5);const ally=g.westFinale.allies.find(q=>q.kind==='eighties_skunk')!;assert.ok(ally);assert.equal(g.eighties.skunk.followers.get(ally.id)!.parent,z);
 g.eighties.jam='jam_punk';tick(g,.1);const foe=g.spawnZombie('eighties',ally.row,ally.x+25),hp=foe.hp;tick(g,.2);assert.ok(foe.hp<hp);
});
