import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './dino-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [11,12,13,14,15])test(`Dino ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`dino${day}`],`dino${day}`);
 const config=BATTLE_LEVELS[`dino${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.chooserPlants??[]),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});
test('Dino 11–15 preserve wave, preset, challenge, narrative and reward configurations',()=>{
 assert.deepEqual([11,12,13,14,15].map(d=>level(d).waves.length),[10,10,10,10,10]);
 assert.ok([11,12,13,14,15].every(d=>level(d).mowers&&level(d).sunDrops&&level(d).flagInterval===5));
 assert.deepEqual([11,12,13,14,15].map(d=>BATTLE_LEVELS[`dino${d}`].mode),['seedbank','seedbank','seedbank','preset','seedbank']);
 assert.deepEqual(level(14).preset,['sunshroom','primalpeashooter','iceburg','perfumeshroom','grapeshot']);
 assert.equal(level(12).maxPlantsLost,6);assert.equal(level(15).mustProtect,2);
 assert.deepEqual(level(15).protectedPlants,[{kind:'primalwallnut',column:4,row:1},{kind:'primalwallnut',column:4,row:3}]);
 for(const day of [12,14,15])assert.equal(BATTLE_LEVELS[`dino${day}`].presentation.music,'dino/minigame.mp3');
 assert.equal(BATTLE_LEVELS.dino15.outro,'DINO_15_OUTRO');assert.ok(read('dino/catalog.json').narratives.DINO_15_OUTRO.some((s:{Lines?:unknown})=>s.Lines));
 for(const day of [12,14])assert.equal(BATTLE_LEVELS[`dino${day}`].firstReward.image,'spine_dino');
 // The pinned build has no Dino entry in NoteFeatures and no Dino note sprite.
 assert.equal(BATTLE_LEVELS.dino15.firstReward.image,'');
 assert.equal(Object.values(BATTLE_LEVELS).filter(l=>l.world==='dino'&&l.day<=15).length,15);assert.ok(Object.keys(BATTLE_LEVELS).length>=399);
});
const isolated=()=>{const g=create(12);Object.assign(g,{nextWave:Infinity});g.plants=[];return g;};
test('Dino giant throws one Dino imp below half health at its native event',()=>{
 const g=isolated(),z=g.spawnZombie('dino_gargantuar',2,cellX(7));assert.equal(z.hp,5400);z.hp=2700;tick(g,.2);assert.equal(z.west!.animation,'Walk');
 z.hp=2699;tick(g,.9);assert.equal(g.zombies.filter(z=>z.kind==='dino_imp').length,0);tick(g,.05);
 const imp=g.zombies.find(z=>z.kind==='dino_imp')!;assert.ok(imp.leap);assert.equal(imp.leap.toX,cellX(2));assert.equal(imp.row,2);assert.equal(z.west!.imp,false);
 tick(g,3);assert.equal(g.zombies.filter(z=>z.kind==='dino_imp').length,1);
});
test('Dino giant smashes ordinary plants but Primal Wall-nut survives three native strikes',()=>{
 const g=isolated();g.addPlant('primalwallnut',2,5);const p=g.plants[0];g.spawnZombie('dino_gargantuar',2,cellX(5)+40);
 tick(g,1.3);assert.equal(p.hp,4000);tick(g,.1);assert.equal(p.hp,3000);
 for(const hp of [2000,1000,0]){tick(g,3.05);assert.equal(p.hp,hp);}
 const h=isolated();h.addPlant('wallnut',2,5);const ordinary=h.plants[0];h.spawnZombie('dino_gargantuar',2,cellX(5)+40);tick(h,1.4);assert.equal(ordinary.hp,0);
});
test('Primal Wall-nut armor absorbs a smash, injured health drops to the next quarter and food protects',()=>{
 const g=isolated();g.addPlant('primalwallnut',2,5);const p=g.plants[0];p.armor=4000;p.hp=3500;
 g.spawnZombie('dino_gargantuar',2,cellX(5)+40);tick(g,1.4);assert.equal(p.armor,0);assert.equal(p.hp,3500);tick(g,3.05);assert.equal(p.hp,3000);
 g.zombies=[];g.food=1;g.plantFood(2,5);g.dino.smashNut(p);assert.equal(p.hp,4000);tick(g,.9);assert.equal(p.armor,4000);
 g.kongfu.peach.shields.set(p.id,g.time+2);g.dino.smashNut(p);assert.equal(p.armor,4000);
});
test('Dino giant cannot be kicked or carried by dinosaurs',()=>{
 const g=isolated();g.dino.add({kind:'raptor',row:2,delay:0});tick(g,.1);const r=g.dino.raptors[0];r.x=cellX(7);r.detect=true;
 const z=g.spawnZombie('dino_gargantuar',2,r.x-25);z.frozenUntil=Infinity;tick(g,1);assert.equal(z.leap,null);assert.equal(r.left,5);
 g.dino.add({kind:'ptero',row:2,delay:0});tick(g,14);assert.equal(z.dinoCarry,undefined);
});
test('Dino 12 plant-loss limit and Dino 15 protected nuts end the battle on failure',()=>{
 const g=create(12);Object.assign(g,{nextWave:Infinity});g.plantsLost=6;tick(g,.1);assert.equal(g.phase,'playing');g.plantsLost=7;tick(g,.1);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'plantsLost');
 const h=create(15);Object.assign(h,{nextWave:Infinity});h.plants[0].hp=0;tick(h,.1);assert.equal(h.phase,'lost');assert.equal(h.lossReason,'protected');
});
test('Dino first fifteen map nodes unlock and pinata rewards are claimed only once',async()=>{
 const {ProgressStore,completionEvents}=await import('../src/shell/progression'),{islandStates}=await import('../src/shell/navigation');
 const map=read('shell/maps/dino.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=15;day++){
  const id=`dino${day}`,node=map.islands.find((n:{levels:string[]})=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('dino')).get(node.node),'open',id);
  p.finish('dino',id);const events=completionEvents(map,id,p.completed(map),p.rewardNodes('dino'));for(const e of events)if(e.action==='reward')p.award('dino',map.islands.find((n:{node:number})=>n.node===e.node)!);p.finishPresentation();
  const rewards=JSON.stringify([p.rewards(),p.campaignRewards()]);p.finish('dino',id);for(const e of events)if(e.action==='reward')p.award('dino',map.islands.find((n:{node:number})=>n.node===e.node)!);assert.equal(JSON.stringify([p.rewards(),p.campaignRewards()]),rewards);
 }
 assert.deepEqual(p.rewards().map(r=>r.id),[18,41,160]);assert.equal(p.completed(map).size,15);assert.deepEqual(p.campaignRewards().filter(r=>r.id==='spine_dino').map(r=>r.level),['dino12','dino14']);
});
