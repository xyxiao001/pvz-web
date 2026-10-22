import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './eighties-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS,availablePlants} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [26,27,28,29,30])test(`Eighties ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);if(g.preparing)g.startLastStand();
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`eighties${day}`],`eighties${day}`);
 const config=BATTLE_LEVELS[`eighties${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});

import {ProgressStore} from '../src/shell/progression';
test('26–30 configs, rewards, hinted carrot, wave-five conveyor addition and limits',()=>{
 assert.equal(Object.keys(BATTLE_LEVELS).length,372);
 assert.deepEqual([26,27,28,29,30].map(d=>level(d).waves.length),[10,10,10,10,12]);
 assert.equal(level(26).mustProtect,4);assert.deepEqual(level(26).protectedPlants.map(p=>[p.kind,p.row,p.column]),[0,1,3,4].map(r=>['sporeshroom',r,6]));
 assert.equal(BATTLE_LEVELS.eighties26.narrative,'EIGHTIES_26_INTRO');assert.equal(read('eighties/catalog.json').narratives.EIGHTIES_26_INTRO.length,5);
 assert.equal(BATTLE_LEVELS.eighties26.firstReward.plant,'intensivecarrot');assert.ok(!BATTLE_LEVELS.eighties26.plants.some(p=>p.kind==='intensivecarrot'));assert.ok(BATTLE_LEVELS.eighties27.plants.some(p=>p.kind==='intensivecarrot'&&p.id===145));
 assert.equal(BATTLE_LEVELS.eighties27.mode,'conveyor');assert.equal(level(27).sunDrops,false);assert.deepEqual(level(27).conveyor!.InitialPlantList.map(p=>p.PlantType),['cherry_bomb','fumeshroom','garlic','sporeshroom']);assert.equal(level(27).actions[4].flatMap(a=>a.add??[])[0].PlantType,'intensivecarrot');
 assert.equal(BATTLE_LEVELS.eighties28.mode,'seedbank');assert.equal(level(28).preset,null);assert.equal(level(30).maxPlants,15);assert.equal(level(30).flagInterval,4);
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});store.finish('eighties','eighties29',0);store.finish('eighties','eighties29',0);assert.deepEqual(store.campaignRewards().map(r=>r.id),['spine_eighties']);
 store.finish('eighties','eighties26');const carrotReward=read('shell/maps/eighties.json').islands.find((n:{plant:number})=>n.plant===145);store.award('eighties',carrotReward);store.award('eighties',carrotReward);assert.equal(store.rewards().length,1);assert.ok(availablePlants(BATTLE_LEVELS.eighties28,store.ownedPlants()).includes('intensivecarrot'));
 const g=create(26);g.plants[0].hp=0;tick(g,.1);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'protected');
 const limited=create(30);for(let i=0;i<15;i++)limited.addPlant('wallnut',i%5,Math.floor(i/5));tick(limited,.1);assert.equal(limited.phase,'playing');limited.addPlant('wallnut',0,4);tick(limited,.1);assert.equal(limited.phase,'lost');
});
const isolated=()=>{const g=create(28);Object.assign(g,{nextWave:Infinity});g.plants=[];g.graves=[];g.sun=5000;return g;};
test('carrot costs 100, revives half health, opens at the original event and cannot reuse its cell',()=>{
 const g=isolated();g.addPlant('wallnut',2,2);g.plants[0].hp=0;tick(g,.1);assert.equal(g.plants.length,0);assert.equal(g.eighties.carrot.at(2,2)!.kind,'wallnut');
 const sun=g.sun;assert.equal(g.plant('intensivecarrot',2,1),false);assert.equal(g.sun,sun);assert.equal(g.plant('intensivecarrot',2,2),true);assert.equal(g.sun,sun-100);assert.ok(g.cooldowns.intensivecarrot>19);
 const p=g.plants[0];assert.equal(p.kind,'wallnut');assert.equal(p.hp,props.plants.wallnut.Toughness*.5);assert.equal(g.eighties.carrot.at(2,2),undefined);assert.ok(g.eighties.carrot.blocked(p));g.food=1;assert.equal(g.plantFood(2,2),false);
 const z=g.spawnZombie('eighties',2,cellX(2)+40);tick(g,1.5);assert.equal(p.hp,2000);assert.ok(g.eighties.carrot.blocked(p));tick(g,.2);assert.equal(g.eighties.carrot.blocked(p),false);assert.ok(p.hp<2000);assert.ok(z.hp>0);
});
test('planting replaces the death record; consumed bombs and shoveled plants do not leave resurrection targets',()=>{
 const g=isolated();g.addPlant('peashooter',2,2);g.plants[0].hp=0;tick(g,.1);g.addPlant('sunflower',2,2);assert.equal(g.eighties.carrot.at(2,2),undefined);g.shovel(2,2);assert.equal(g.eighties.carrot.at(2,2),undefined);
 g.addPlant('cherry_bomb',1,1);tick(g,2);assert.equal(g.eighties.carrot.at(1,1),undefined);
});
test('ballad pauses captured plants, spares phat beet and later plants, and restores the underlying jam',()=>{
 const g=isolated();g.eighties.jam='jam_rap';g.addPlant('peashooter',2,0);g.addPlant('phatbeet',3,0);const p=g.plants[0],beet=g.plants[1];const z=g.spawnZombie('eighties_boombox',2,cellX(5));
 tick(g,.5);assert.equal(g.eighties.boombox.blocked(p),false);tick(g,.3);assert.ok(g.eighties.boombox.blocked(p));assert.equal(g.eighties.boombox.blocked(beet),false);assert.equal(g.eighties.musicJam,'jam_ballad');assert.equal(g.eighties.jam,'jam_rap');
 g.addPlant('wallnut',4,0);const fresh=g.plants.at(-1)!;tick(g,.1);assert.equal(g.eighties.boombox.blocked(fresh),false);const elapsed=g.time-p.actionAt,next=p.nextAction-g.time;tick(g,1);assert.ok(Math.abs(g.time-p.actionAt-elapsed)<1e-8);assert.ok(Math.abs(p.nextAction-g.time-next)<1e-8);
 tick(g,7.5);assert.equal(g.eighties.boombox.blocked(p),false);assert.equal(g.eighties.musicJam,'jam_rap');const x=z.x;tick(g,1);assert.ok(z.x<x);assert.equal(g.eighties.boombox.states.has(z.id),false);
});
test('plant food breaks one captured plant out; freezing the boombox ends playback without rearming it',()=>{
 const g=isolated();g.addPlant('wallnut',1,0);g.addPlant('wallnut',3,0);const p=g.plants[0],q=g.plants[1],z=g.spawnZombie('eighties_boombox',2,cellX(5));tick(g,1.1);g.food=1;assert.equal(g.plantFood(1,0),true);tick(g,.1);assert.equal(g.eighties.boombox.blocked(p),false);assert.equal(g.eighties.boombox.blocked(q),true);
 z.frozenUntil=g.time+1;tick(g,.1);assert.equal(g.eighties.boombox.states.get(z.id)!.animation,'SingEnd');tick(g,.6);assert.equal(g.eighties.boombox.blocked(q),false);assert.equal(g.eighties.musicJam,'jam_clear');tick(g,2);assert.equal(g.eighties.boombox.states.has(z.id),false);
});
test('boombox death releases captured plants after the half-second native tail',()=>{
 const g=isolated();g.addPlant('wallnut',0,0);const p=g.plants[0],z=g.spawnZombie('eighties_boombox',2,cellX(5));tick(g,1);g.damage(z,10000);tick(g,.6);assert.equal(g.eighties.boombox.blocked(p),false);assert.equal(g.eighties.musicJam,'jam_clear');
});
