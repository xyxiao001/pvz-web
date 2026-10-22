import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './dino-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS,availablePlants} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [6,7,8,9,10])test(`Dino ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`dino${day}`],`dino${day}`);
 const config=BATTLE_LEVELS[`dino${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.chooserPlants??[]),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});
test('Dino 6–10 preserve dinosaur kinds, modes, flower line, narratives and perfume reward',()=>{
 assert.deepEqual([6,7,8,9,10].map(d=>level(d).waves.length),[10,9,10,12,12]);
 assert.deepEqual([6,7,8,9,10].map(d=>BATTLE_LEVELS[`dino${d}`].mode),['seedbank','conveyor','seedbank','preset','seedbank']);
 assert.equal(level(7).flagInterval,9);assert.equal(level(7).flowerLine,5.5);assert.equal(level(7).sunDrops,false);
 assert.deepEqual(level(7).conveyor!.InitialPlantList.map(p=>p.PlantType),['primalwallnut']);
 assert.deepEqual(level(7).actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[]),['primalpeashooter','cherry_bomb','magnetshroom']);
 assert.deepEqual(level(9).preset,['sunshroom','primalpeashooter','primalwallnut','potatomine','perfumeshroom']);
 assert.deepEqual(level(8).chooserPlants,['perfumeshroom']);assert.equal(level(8).initialPlants.length,0); // Placement object is not an active module upstream.
 assert.deepEqual(level(6).actions.flatMap((w,i)=>w.flatMap(a=>a.dinosaur?[[i+1,a.dinosaur.kind,a.dinosaur.row]]:[])),[[3,'stego',2],[5,'raptor',1],[9,'stego',4]]);
 assert.deepEqual(level(7).actions[0].find(a=>a.dinosaur)?.dinosaur,{kind:'stego',row:0,delay:2});
 assert.equal(BATTLE_LEVELS.dino8.firstReward.plant,'perfumeshroom');assert.ok(availablePlants(BATTLE_LEVELS.dino9,new Set([160])).includes('perfumeshroom'));
 assert.equal(Object.values(BATTLE_LEVELS).filter(l=>l.world==='dino'&&l.day<=10).length,10);assert.ok(Object.keys(BATTLE_LEVELS).length>=394);
 for(const day of [6,8,9])assert.ok(read('dino/catalog.json').narratives[`DINO_${day}_INTRO`].some((s:{Lines?:unknown})=>s.Lines));
 assert.ok(read('shell/progression.json').plants[160].length);
});
const isolated=()=>{const g=create(10);Object.assign(g,{nextWave:Infinity});g.plants=[];return g;};
test('Stego annoys, raises its tail, collects at most three zombies and throws to columns 3–4',()=>{
 const g=isolated();g.dino.add({kind:'stego',row:2,delay:0});tick(g,.1);const d=g.dino.visitors.items[0];
 const zs=Array.from({length:4},()=>g.spawnZombie('dino',2,d.x));for(const z of zs)z.frozenUntil=Infinity;
 tick(g,4.7);assert.equal(d.animation,'Annoy');tick(g,6.7);assert.equal(d.animation,'Intro_Tail');tick(g,2.4);assert.equal(d.tail,true);
 tick(g,4.5);assert.equal(d.left,2);assert.ok(zs.slice(0,3).every(z=>z.x>=cellX(3)&&z.x<=cellX(4)));assert.equal(zs[3].x,d.x);
 assert.equal(d.held.length,0);
});
test('Perfume blooms on its authored frame, charms only its row and makes raptors toss enemies',()=>{
 const g=isolated();g.dino.add({kind:'raptor',row:2,delay:0});g.dino.add({kind:'raptor',row:3,delay:0});tick(g,.6);
 const r=g.dino.raptors[0];r.x=cellX(6);g.dino.raptors[1].x=cellX(6);g.addPlant('perfumeshroom',2,4);
 tick(g,.4);assert.equal(g.dino.perfumes.length,0);tick(g,.5);assert.equal(r.charmed,true);assert.equal(g.dino.raptors[1].charmed,false);assert.equal(r.direction,-1);
 const z=g.spawnZombie('dino_armor3',2,r.x+25);z.frozenUntil=Infinity;tick(g,.8);assert.equal(z.hp,0);assert.equal(z.deathCause,'toss');assert.equal(r.left,4);
 tick(g,9);assert.equal(g.dino.perfumes.length,0);assert.equal(r.charmed,true);assert.ok(!g.plants.some(p=>p.kind==='perfumeshroom'));
});
test('Charmed Stego crushes held zombies and splashes adjacent lanes',()=>{
 const g=isolated();g.dino.add({kind:'stego',row:2,delay:0});tick(g,.6);const d=g.dino.visitors.items[0];
 g.dino.visitors.charm(d);Object.assign(d,{tail:true,animation:'Idle_Tail',elapsed:0,event:0});
 const held=g.spawnZombie('dino',2,d.x),near=g.spawnZombie('dino',1,d.x),far=g.spawnZombie('dino',0,d.x);for(const z of [held,near,far]){z.hp=5000;z.frozenUntil=Infinity;}
 tick(g,3.7);assert.equal(held.hp,2300);assert.equal(near.hp,4800);assert.equal(far.hp,5000);assert.equal(d.left,2);
});
test('Ptero carries one zombie over plants, drops at the left edge and reverses its movement',()=>{
 const g=isolated();g.dino.add({kind:'ptero',row:2,delay:0});tick(g,.1);const d=g.dino.visitors.items[0];
 const z=g.spawnZombie('dino',2,cellX(7));g.addPlant('primalwallnut',2,4);
 tick(g,10.5);assert.ok(z.dinoCarry);assert.equal(z.reversed,true);assert.equal(g.inLane(z,2),false);const hp=z.hp;g.damage(z,999);assert.equal(z.hp,hp);
 tick(g,2.5);assert.equal(z.dinoCarry,undefined);assert.equal(z.reversed,true);assert.ok(z.x<cellX(2));assert.equal(g.plants[0].hp,4000);const x=z.x;tick(g,1);assert.ok(z.x>x);
});
test('Charmed Ptero removes carried zombies on its outward flight',()=>{
 const g=isolated();g.dino.add({kind:'ptero',row:2,delay:0});tick(g,.6);const d=g.dino.visitors.items[0];g.dino.visitors.charm(d);
 const z=g.spawnZombie('dino',2,cellX(5));z.stunnedUntil=Infinity;tick(g,20);assert.equal(z.hp,0);assert.equal(z.dinoCarry,undefined);assert.equal(d.left,2);
});
test('Dino first ten map nodes unlock and perfume reward is claimed only once',async()=>{
 const {ProgressStore,completionEvents}=await import('../src/shell/progression'),{islandStates}=await import('../src/shell/navigation');
 const map=read('shell/maps/dino.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=10;day++){
  const id=`dino${day}`,node=map.islands.find((n:{levels:string[]})=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('dino')).get(node.node),'open',id);
  p.finish('dino',id);const events=completionEvents(map,id,p.completed(map),p.rewardNodes('dino'));for(const e of events)if(e.action==='reward')p.award('dino',map.islands.find((n:{node:number})=>n.node===e.node)!);p.finishPresentation();
  const rewards=JSON.stringify(p.rewards());p.finish('dino',id);for(const e of events)if(e.action==='reward')p.award('dino',map.islands.find((n:{node:number})=>n.node===e.node)!);assert.equal(JSON.stringify(p.rewards()),rewards);
 }
 assert.deepEqual(p.rewards().map(r=>r.id),[18,41,160]);assert.equal(p.completed(map).size,10);
});
