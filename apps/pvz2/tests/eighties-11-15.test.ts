import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './eighties-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [11,12,13,14,15])test(`Eighties ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);if(g.preparing)g.startLastStand();
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`eighties${day}`],`eighties${day}`);
 const config=BATTLE_LEVELS[`eighties${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});

import {ProgressStore} from '../src/shell/progression';
test('authored presets, last stand, protected plants, outro and one-time pinatas',()=>{
 assert.deepEqual([11,12,13,14,15].map(d=>level(d).waves.length),[10,10,10,10,10]);
 assert.deepEqual(level(11).preset,['sunflower','cherry_bomb','threepeater','potatomine','thymewarp','stallia']);
 assert.deepEqual(level(14).preset,['sunshroom','cactus','celerystalker','thymewarp']);assert.equal(BATTLE_LEVELS.eighties14.mode,'preset');
 assert.deepEqual(level(13).lastStand,{sun:2000,food:2});assert.equal(level(13).sunDrops,false);assert.equal(props.plants.wintermelon.SunCost,500);
 assert.equal(level(15).mustProtect,5);assert.ok(level(15).protectedPlants.every(p=>p.kind==='phatbeet'&&p.column===4));
 assert.equal(BATTLE_LEVELS.eighties15.outro,'EIGHTIES_15_OUTRO');assert.equal(read('eighties/catalog.json').narratives.EIGHTIES_15_OUTRO.filter((s:{Lines?:unknown})=>s.Lines).length,3);
 assert.deepEqual(level(12).actions[9].flatMap(a=>a.jams??[]),['jam_metal']);
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const d of [12,14]){assert.equal(BATTLE_LEVELS[`eighties${d}`].firstReward.image,'spine_eighties');store.finish('eighties',`eighties${d}`,0);store.finish('eighties',`eighties${d}`,0);}
 assert.equal(store.campaignRewards().filter(r=>r.id==='spine_eighties').length,2);
});
const isolated=()=>{const g=create(12);Object.assign(g,{nextWave:Infinity});g.plants=[];g.graves=[];return g;};
test('Metal giant throws one original imp at half health and uses the authored throw event',()=>{
 const g=isolated(),z=g.spawnZombie('eighties_gargantuar',2,cellX(7));z.hp=1700;tick(g,.8);assert.equal(g.zombies.filter(z=>z.kind==='eighties_imp').length,0);tick(g,.3);
 const imp=g.zombies.find(z=>z.kind==='eighties_imp')!;assert.ok(imp.leap);assert.equal(imp.leap.toX,cellX(2));assert.equal(z.west!.imp,false);tick(g,3);assert.equal(imp.leap,null);assert.equal(g.zombies.filter(z=>z.kind==='eighties_imp').length,1);
});
test('Metal music triggers timed smashes and a single-hit wave that reaches hidden plants',()=>{
 const g=isolated(),z=g.spawnZombie('eighties_gargantuar',2,cellX(7));g.eighties.gargCountdown.set(z.id,.1);tick(g,.3);assert.equal(z.west!.animation,'Walk');assert.equal(g.eighties.waves.length,0);
 g.addPlant('celerystalker',2,4);g.addPlant('wallnut',2,2);const celery=g.plants[0];celery.hp=2000;celery.hidden=true;g.eighties.jam='jam_metal';tick(g,.2);assert.equal(z.west!.animation,'Smash');tick(g,1.2);assert.equal(g.eighties.waves.length,0);tick(g,.2);assert.equal(g.eighties.waves.length,1);tick(g,.5);assert.equal(celery.hp,1000);assert.equal(g.plants[1].hp,4000);assert.equal(g.eighties.waves.length,0);
 g.eighties.jam='jam_pop';tick(g,7);assert.equal(g.eighties.waves.length,0);
});
test('Last Stand waits for the start command and protected plants retain loss condition',()=>{
 const g=create(13);assert.equal(g.preparing,true);assert.equal(g.sun,2000);assert.equal(g.food,2);tick(g,20);assert.equal(g.wave,0);g.startLastStand();tick(g,30);assert.ok(g.wave>0);
 const h=create(15);h.plants[0].hp=0;tick(h,.1);assert.equal(h.phase,'lost');assert.equal(h.lossReason,'protected');
});
