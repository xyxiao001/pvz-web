import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './dino-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS,availablePlants} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [1,2,3,4,5])test(`Dino ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`dino${day}`],`dino${day}`);
 const config=BATTLE_LEVELS[`dino${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.chooserPlants??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});
test('Dino 1–5 preserve authored modes, dinosaur rows, wave counts and plant unlocks',()=>{
 assert.deepEqual([1,2,3,4,5].map(d=>level(d).waves.length),[10,10,10,12,10]);
 assert.deepEqual([1,2,3,4,5].map(d=>level(d).sunDrops),[true,true,false,true,true]);
 assert.ok([1,2,3,4,5].every(d=>level(d).mowers));
 assert.deepEqual(level(1).chooserPlants,['primalpeashooter']);assert.deepEqual(level(5).chooserPlants,['primalwallnut']);
 assert.deepEqual(level(3).conveyor!.InitialPlantList.map(p=>p.PlantType),['grapeshot']);
 assert.deepEqual(level(3).actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[]),['garlic','melonpult']);
 assert.deepEqual(level(2).actions.flatMap((w,i)=>w.flatMap(a=>a.dinosaur?[[i+1,a.dinosaur.row]]:[])),[[3,4],[5,2],[8,3],[10,4]]);
 assert.deepEqual(level(3).actions.flatMap((w,i)=>w.flatMap(a=>a.dinosaur?[[i+1,a.dinosaur.row]]:[])),[[2,2],[5,0],[8,2],[10,0],[10,4]]);
 assert.equal(BATTLE_LEVELS.dino1.firstReward.plant,'primalpeashooter');assert.equal(BATTLE_LEVELS.dino4.firstReward.plant,'primalwallnut');
 assert.equal(BATTLE_LEVELS.dino3.presentation.music,'dino/minigame.mp3');
 assert.ok(!availablePlants(BATTLE_LEVELS.dino4,new Set([41])).includes('primalwallnut'));assert.ok(availablePlants(BATTLE_LEVELS.dino5,new Set([41])).includes('primalwallnut'));
 assert.ok(Object.keys(BATTLE_LEVELS).length>=389);assert.equal(Object.values(BATTLE_LEVELS).filter(l=>l.world==='dino'&&l.day<=5).length,5);
 const catalog=read('dino/catalog.json');for(const d of [1,2])assert.ok(catalog.narratives[`DINO_${d}_INTRO`].some((s:{Lines?:unknown})=>s.Lines));
 const rewards=read('shell/progression.json');for(const id of [18,41])assert.ok(rewards.plants[id].some((d:{kind:string})=>d.kind==='rig'));
});
const isolated=()=>{const g=create(5);Object.assign(g,{nextWave:Infinity});g.plants=[];g.graves=[];return g;};
test('Raptor enters on its wave row, turns, kicks three columns and respects the repeat cooldown',()=>{
 const g=isolated();g.dino.add({kind:'raptor',row:2,delay:0});tick(g,1/60);
 const r=g.dino.raptors[0];assert.equal(r.row,2);assert.equal(r.left,5);
 r.x=cellX(7);r.detect=true;
 const z=g.spawnZombie('dino_armor3',2,r.x-25),other=g.spawnZombie('dino',1,r.x-25);z.frozenUntil=other.frozenUntil=Infinity;
 const from=z.x;tick(g,.75);assert.ok(z.leap);assert.equal(z.leap!.toX,from-3*82);assert.equal(other.leap,null);assert.equal(r.left,4);assert.equal(z.hp,props.zombies.dino_armor3.Toughness);
 tick(g,.6);assert.equal(z.leap,null);assert.equal(z.x,from-3*82);
 r.x=cellX(7);z.x=r.x-25;tick(g,1);assert.equal(r.left,4);
 tick(g,4);r.x=cellX(7);r.direction=1;r.animation='Walk';r.elapsed=0;z.x=r.x-25;tick(g,.8);assert.equal(r.left,3);
});
test('Raptor kick stops at column 2 and five kicks or idle timeout sends it away',()=>{
 const g=isolated();g.dino.add({kind:'raptor',row:0,delay:1});tick(g,.5);assert.equal(g.dino.raptors.length,0);tick(g,.6);
 const r=g.dino.raptors[0];r.x=cellX(4)+10;r.detect=true;r.left=1;
 const z=g.spawnZombie('dino',0,r.x-25);z.frozenUntil=Infinity;tick(g,.75);assert.equal(z.leap!.toX,cellX(2));assert.equal(r.left,0);
 tick(g,1.5);assert.equal(r.leaving,true);assert.equal(r.direction,-1);tick(g,10);assert.equal(g.dino.raptors.length,0);
 g.dino.add({kind:'raptor',row:4,delay:0});tick(g,1/60);const idle=g.dino.raptors[0];idle.leaveAt=g.time;tick(g,.6);assert.equal(idle.leaving,true);
});
test('Grapeshot detonates at its native frame, damages 3×3 and emits eight bouncing grapes',()=>{
 const g=isolated();g.addPlant('grapeshot',2,4);const z=g.spawnZombie('dino_armor3',1,cellX(5));z.hp=5000;z.armor=0;z.frozenUntil=Infinity;
 tick(g,.5);assert.equal(z.hp,5000);assert.equal(g.escape.grapes.length,0);tick(g,.18);assert.equal(z.hp,3200);assert.equal(g.escape.grapes.length,8);assert.equal(g.plants.length,0);
 const grape=g.escape.grapes.find(p=>p.vx<0&&p.vy===0)!;grape.x=190.1;g.escape.tick(.01);assert.ok(grape.vx>0);assert.equal(grape.hits,1);
 g.escape.grapes=[grape];const target=g.spawnZombie('dino',2,cellX(6));target.hp=2000;target.frozenUntil=Infinity;
 grape.x=target.x-1;grape.y=160+2*98+40;grape.vx=100;grape.vy=0;grape.lane=2;grape.detected=[];grape.blocked=false;g.escape.tick(.01);
 assert.equal(target.hp,2000-props.projectiles.grapeshot.Damage);assert.equal(grape.hits,2);assert.notEqual(grape.vy,0);
});
test('Primal Wall-nut blocks bites, repairs with first aid and restores health and armor through food',()=>{
 const g=isolated();g.addPlant('primalwallnut',2,4);const p=g.plants[0];g.spawnZombie('dino',2,cellX(4)+20);tick(g,1);assert.ok(p.hp<4000);assert.ok(p.hp>3800);
 g.food=1;assert.ok(g.plantFood(2,4));assert.equal(p.hp,4000);tick(g,.9);assert.equal(p.action,'idle');assert.ok(p.armor>3900);g.food=1;assert.equal(g.plantFood(2,4),false);
 p.hp=2000;p.armor=0;g.zombies=[];g.sun=1000;g.wallnutFirstAid=true;assert.ok(g.plant('primalwallnut',2,4));assert.equal(p.hp,4000);assert.equal(g.plants.length,1);
 g.food=1;assert.ok(g.plantFood(2,4));tick(g,.9);assert.equal(p.armor,4000);assert.equal(p.action,'idle');
});
test('Dino exported files match the pinned provenance',async()=>{
 const {readFileSync}=await import('node:fs'),{createHash}=await import('node:crypto');
 const manifest=JSON.parse(readFileSync(new URL('../dino-provenance.json',import.meta.url),'utf8'));
 assert.equal(manifest.commit,'0e4a05348b6de328e2902a57afa24a3a454a4205');
 for(const [path,entry] of Object.entries(manifest.outputs) as [string,{sha256:string;bytes:number}][]){const data=readFileSync(new URL('../public/assets/'+path,import.meta.url));assert.equal(data.length,entry.bytes,path);assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256,path);}
});
test('Dino first five map nodes advance and award the two plants only once',async()=>{
 const {ProgressStore,completionEvents}=await import('../src/shell/progression'),{islandStates}=await import('../src/shell/navigation');
 const map=read('shell/maps/dino.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=5;day++){
  const id=`dino${day}`,node=map.islands.find((n:{levels:string[]})=>n.levels.includes(id))!;
  assert.equal(islandStates(map,p.completed(map),p.rewardNodes('dino')).get(node.node),'open',id);
  p.finish('dino',id);const events=completionEvents(map,id,p.completed(map),p.rewardNodes('dino'));
  for(const e of events)if(e.action==='reward')p.award('dino',map.islands.find((n:{node:number})=>n.node===e.node)!);
  p.finishPresentation();const rewards=JSON.stringify(p.rewards());p.finish('dino',id);
  for(const e of events)if(e.action==='reward')p.award('dino',map.islands.find((n:{node:number})=>n.node===e.node)!);
  assert.equal(JSON.stringify(p.rewards()),rewards);assert.equal(p.pending(),null);
 }
 assert.equal(p.completed(map).size,5);assert.deepEqual(p.rewards().map(r=>r.id),[18,41]);
});
