import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,tick} from './dark-fixture';
import {playDark} from './dark-strategy';
import {cellX,rowY,type PlantKind} from '../src/game/level';
for(const day of [1,2,3,4,5,6,7,8,9,10])test(`Dark Ages ${day} legal replay`,()=>{
 const g=create(day),used=new Set<PlantKind>(),plant=g.plant.bind(g);g.plant=(kind,r,c,p)=>{const ok=plant(kind,r,c,p);if(ok)used.add(kind);return ok;};
 for(let f=0;f<90000&&g.phase==='playing';f++){playDark(g,f);g.tick(1/60);g.events.length=0;}
 console.log('dark'+day,g.phase,g.time,g.wave,[...used]);assert.equal(g.phase,'won');assert.ok(used.size<=6);assert.ok(!used.has('fumeshroom')||day>=5);
});
const quiet=()=>{const g=create(5);g['nextWave']=Infinity;g.graves=[];return g;};
test('Special graves produce 100 sun or one food pickup, including gravebuster removal',()=>{
 const g=quiet();g.graves=[{id:100,row:0,column:4,hp:0,stage:0,kind:'gravestoneSunOnDestruction'},{id:101,row:1,column:4,hp:0,stage:0,kind:'gravestonePlantfoodOnDestruction'}];tick(g,.1);assert.equal(g.suns.reduce((s,p)=>s+p.value,0),100);assert.equal(g.sunProduced,0);assert.equal(g.pickups.length,1);tick(g,1);assert.equal(g.pickups.length,1);
 g.graves.push({id:102,row:2,column:4,hp:700,stage:0,kind:'gravestoneSunOnDestruction'});g.addPlant('gravebuster',2,4);tick(g,10);assert.equal(g.graves.length,0);assert.ok(g.suns.some(s=>s.value===100));
});
test('Fume pierces a line, is not reflected, and finishes its three-second food stream',()=>{
 const g=quiet();g.addPlant('fumeshroom',2,1);const a=g.spawnZombie('dark_juggler',2,cellX(4)),b=g.spawnZombie('dark_armor2',2,cellX(5));a.frozenUntil=b.frozenUntil=100;tick(g,.5);assert.equal(a.hp,props.zombies.dark_juggler.Toughness-40);assert.equal(b.armor,props.armors.dark_armor2.Toughness-40);assert.equal(g.dark.reflected.length,0);
 g.food=1;g.plantFood(2,1);tick(g,5);assert.equal(g.plants[0].action,'idle');assert.equal(g.dark.fumes.size,0);assert.equal(g.dark.visuals.length,0);assert.equal(g.zombies.length,0);
});
test('Jester catches peas, returns damage to plants and stops rotating; freeze prevents catching',()=>{
 const g=quiet();g.addPlant('wallnut',2,1);const z=g.spawnZombie('dark_juggler',2,cellX(6));g.peas.push({id:99,row:2,x:z.x-25,y:rowY(2)-45,damage:20,powered:false});tick(g,.1);assert.equal(g.peas.length,0);assert.equal(z.hp,420);assert.equal(g.dark.reflected.length,1);assert.equal(g.dark.jesters.get(z.id)!.animation,'RotateStart');tick(g,4);assert.equal(g.plants[0].hp,props.plants.wallnut.Toughness-20);assert.equal(g.dark.reflected.length,0);assert.equal(g.dark.jesters.get(z.id)!.animation,'Walk');
 z.frozenUntil=g.time+5;g.peas.push({id:100,row:2,x:z.x-25,y:rowY(2)-45,damage:20,powered:false});tick(g,.1);assert.equal(z.hp,400);assert.equal(g.dark.reflected.length,0);
});
test('Dark stages are night chooser levels with typed graves, native mowers and finite grave summon waits',()=>{
 for(const day of [1,2,3,4,5]){const l=level(day);assert.equal(l.world,'dark');assert.equal(l.sunDrops,false);assert.equal(l.mowers,true);assert.equal(l.preset,null);assert.ok(l.graves.every(t=>t.kind));for(const a of l.actions.flat())if(a.mode==='graveZombies')assert.ok(Number.isFinite(a.wait));}
 const g=quiet();g.graves=[{id:100,row:0,column:5,hp:700,stage:0,kind:'gravestoneSunOnDestruction'},{id:101,row:1,column:5,hp:700,stage:0,kind:'gravestone_dark'}];g['pendingGraveSpawns']=[{at:0,action:{mode:'graveZombies',gridTypes:['gravestone_dark'],zombies:[{kind:'dark_imp',row:null}],food:0,columnStart:0,columnEnd:8,groupSize:1,interval:0}}];tick(g,.1);assert.equal(g.zombies.length,1);assert.equal(g.zombies[0].row,1);assert.equal(g.graves.length,2);
});

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DARK_LEVELS} from '../src/game/worlds/dark';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore} from '../src/shell/progression';
test('Pinned dark resources, conveyor introduction and map plant rewards are wired',()=>{
 const read=(p:string)=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8')),manifest=read('dark-provenance.json'),catalog=read('public/assets/dark/catalog.json');
 for(const [path,info] of Object.entries(manifest.outputs) as [string,{sha256:string}][])assert.equal(createHash('sha256').update(readFileSync(new URL('../public/assets/'+path,import.meta.url))).digest('hex'),info.sha256,path);
 assert.deepEqual([1,2,3,4,5].map(d=>level(d).waves.length),[14,12,12,14,16]);assert.equal(DARK_LEVELS.dark4.mode,'conveyor');assert.equal(DARK_LEVELS.dark4.narrative,'DARK_INTRO_HYPNOSHROOM');assert.deepEqual(level(2).chooserPlants,['sunshroom','puffshroom']);
 for(const day of [1,2,3,4,5]){assert.equal(DARK_LEVELS['dark'+day].source,`dark/dark${day}.source.json`);assert.equal(new Set(DARK_LEVELS['dark'+day].plants.map(p=>p.kind)).size,DARK_LEVELS['dark'+day].plants.length);}
 for(const n of ['dark','darkJester','darkFlag'])assert.ok(battleActors(level(5),[]).includes(n));for(const n of ['graveSun','graveFood','darkLawn','fumeShot','fumeFood'])assert.ok(battleEffects(level(5),['fumeshroom']).includes(n)&&catalog.rigs[n]);
 const map=read('public/assets/shell/maps/dark.json'),progression=read('public/assets/shell/progression.json'),data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}},store=new ProgressStore(storage);
 for(const day of [1,2,4]){store.finish('dark','dark'+day);store.finishPresentation();}
 for(const id of [24,51,11]){const node=map.islands.find((i:{plant?:number})=>i.plant===id);assert.ok(node);store.award('dark',node);assert.ok(progression.plants[id]);}
 assert.ok([24,51,11].every(id=>store.ownedPlants().has(id)));assert.ok(new ProgressStore(storage).ownedPlants().has(11));
});
test('Empowered hypnoshroom converts dark zombies into native dark giants and preloads their imp',()=>{
 const g=quiet();g.addPlant('hypnoshroom',2,3);g.food=1;g.plantFood(2,3);tick(g,3);const z=g.spawnZombie('dark_armor2',2,cellX(3)+20);tick(g,1);const ally=g.westFinale.allies[0];assert.equal(ally.kind,'dark_gargantuar');assert.equal(props.zombies.dark_gargantuar.Toughness,3600);assert.ok(ally.hp>3500);const foe=g.spawnZombie('dark_armor2',2,ally.x+60);foe.stunnedUntil=100;tick(g,4);assert.ok(Number.isFinite(foe.hp));assert.ok(foe.hp+foe.armor<props.zombies.dark_armor2.Toughness+props.armors.dark_armor2.Toughness);assert.ok(!g.zombies.includes(z));
 const names=battleActors(level(4),['hypnoshroom']);assert.ok(names.includes('darkGargantuar'));assert.ok(names.includes('darkImp'));
});
test('Removing a food-powered fume clears its stream; jester cannot catch a non-reversible citron blast',()=>{
 const g=quiet();g.addPlant('fumeshroom',2,1);g.food=1;g.plantFood(2,1);tick(g,1.2);assert.equal(g.dark.fumes.size,1);assert.ok(g.dark.visuals.some(v=>v.name==='fumeFood'));g.shovel(2,1);tick(g,.1);assert.equal(g.dark.fumes.size,0);assert.ok(g.dark.visuals.every(v=>v.name!=='fumeFood'));
 const z=g.spawnZombie('dark_juggler',2,cellX(6));g.future.shots.push({id:101,x:z.x-30,y:rowY(2)-45,row:2,food:true,hits:new Set()});tick(g,.1);assert.equal(g.dark.reflected.length,0);assert.ok(z.hp<=0);
});

test('Dark 6–10 retain original setup, preset, potions, helmets, giant and rewards',()=>{
 assert.deepEqual([6,7,8,9,10].map(d=>level(d).waves.length),[10,16,12,16,18]);
 assert.deepEqual(level(6).lastStand,{sun:2000,food:4});assert.ok(level(6).blacklist.includes('sunbean'));
 assert.deepEqual(level(8).preset,['sunshroom','sunbean','fumeshroom','wallnut','hypnoshroom','gravebuster']);
 assert.deepEqual(level(9).potions,{InitialPotionCount:4,MaxPotionCount:15,PotionSpawnTimer:{Max:8,Min:4},PotionTypes:['zombiepotion_speed','zombiepotion_toughness']});
 assert.equal(DARK_LEVELS.dark9.presentation.music,'dark/minigame.mp3');assert.equal(DARK_LEVELS.dark10.presentation.music,'dark/ultimate.mp3');assert.ok(battleEffects(level(10),[]).includes('zombossicon'));assert.equal(level(10).mowers,false);assert.ok(battleActors(level(10),[]).includes('darkImp'));
 const g=create(7),z=g.spawnZombie('dark_armor3',2,cellX(5));assert.equal(z.hp,190);assert.equal(z.armor,1600);g.damage(z,100);assert.equal(z.armor,1500);assert.equal(g.western['metal'](z)?.name,'darkHelmet');
 const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}},store=new ProgressStore(storage);
 for(let repeat=0;repeat<2;repeat++)for(const day of [8,9,10])store.finish('dark','dark'+day);
 assert.deepEqual(store.campaignRewards().map(r=>r.id),['spine_dark','note_dark','worldkey']);assert.equal(store.worldKeys(),1);
});
test('Sunbean converts actual damage into sun and empowered bean burns its eater once',()=>{
 const g=quiet();g.addPlant('sunbean',2,2);const z=g.spawnZombie('dark_armor3',2,cellX(2)+20);tick(g,.6);assert.ok(z.dark?.bean);assert.equal(g.plants.length,0);
 g.damage(z,24);tick(g,.1);assert.equal(g.suns.length,0);g.damage(z,26);tick(g,.1);assert.equal(g.suns.reduce((n,s)=>n+s.value,0),10);
 g.addPlant('sunbean',1,2);g.food=2;assert.equal(g.plantFood(1,2),true);tick(g,1.2);assert.equal(g.plants[0].animation,'FoodLoop');assert.equal(g.plantFood(1,2),false);
 const giant=g.spawnZombie('dark_armor3',1,cellX(2)+20);tick(g,.6);assert.ok(giant.dark?.blastAt!>g.time);tick(g,2);assert.ok(!g.zombies.includes(giant));assert.equal(g.suns.reduce((n,s)=>n+s.value,0),365);tick(g,2);assert.equal(g.dark.visuals.length,0);assert.equal(g.dark.beanFood.size,0);
});
test('Potions drop before consumption, cap buffs at three, modify speed and damage, then recycle',()=>{
 const g=create(9);g['nextWave']=Infinity;assert.equal(g.dark.potions.length,4);assert.ok(g.dark.potions.every(p=>p.column>=6&&p.column<=9));
 g.dark.potions=[];g.graves=[];const z=g.spawnZombie('dark',2,cellX(5)+8);z.frozenUntil=100;
 const add=(kind:'zombiepotion_speed'|'zombiepotion_toughness')=>{const p={id:g.nextEntityId(),kind,row:2,column:5,animation:'Spawn' as const,at:g.time,dropped:false};g.dark.potions.push(p);return p;};
 let potion=add('zombiepotion_speed');assert.equal(g.dark.eatPotion(z),false);tick(g,.8);assert.equal(g.dark.eatPotion(z),true);assert.equal(z.dark!.speed,1);assert.equal(potion.animation,'Consume');assert.equal(g.dark.blocks(2,5),false);
 for(let i=0;i<2;i++){add('zombiepotion_speed');tick(g,.8);assert.equal(g.dark.eatPotion(z),true);}add('zombiepotion_speed');tick(g,.8);assert.equal(g.dark.eatPotion(z),false);assert.equal(z.dark!.speed,3);
 g.dark.potions=[];for(let i=0;i<3;i++){add('zombiepotion_toughness');tick(g,.8);g.dark.eatPotion(z);}assert.equal(z.dark!.toughness,3);g.damage(z,100);assert.ok(Math.abs(z.hp-(190-100*.85**3))<1e-8);tick(g,2);assert.ok(g.dark.potions.every(p=>p.animation!=='Consume'));
 const start=z.x;z.frozenUntil=0;tick(g,.1);assert.ok(Math.abs(start-z.x-props.zombies.dark.WalkSPS*82*1.5**3*.1)<1e-7);assert.ok(Math.abs(g.dark.scale(z)-1.1**6)<1e-8);
});
