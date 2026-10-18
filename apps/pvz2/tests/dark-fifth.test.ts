import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,tick} from './dark-fixture';
import {playDarkFifth} from './dark-fifth-strategy';
import type {PlantKind} from '../src/game/level';
for(const day of [21,23,24,25])test(`Dark Ages ${day} ${day===21||day===25?"garden-assisted":"ordinary"} replay`,()=>{
 const g=create(day,day===23?1:day===24?5:1234);if(day===21||day===25){g.boosts.add('sunshroom');g.boosts.add(day===21?'wintermelon':'scaredyshroom');if(day===25)g.boosts.add('magnetshroom');g.boosts.add('gravebuster');}const used=new Set<PlantKind>(),plant=g.plant.bind(g);g.plant=(kind,r,c,p)=>{const ok=plant(kind,r,c,p);if(ok)used.add(kind);return ok;};
 for(let f=0;f<90000&&g.phase==='playing';f++){playDarkFifth(g,f);g.tick(1/60);g.events.length=0;}
 console.log('dark'+day,g.phase,g.lossReason,g.time,g.wave,[...used],g.sun,g.plantsLost);assert.equal(g.phase,'won');assert.ok(used.size<=6);if(g.level.preset)for(const kind of used)assert.ok(g.level.preset.includes(kind));
});

import {cellX} from '../src/game/level';
import {DARK_LEVELS} from '../src/game/worlds/dark';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
function empty(){const g=create(25);g['nextWave']=Infinity;g.graves=[];g.dark.potions=[];return g;}
test('Dark 21–25 source modes and pending malformed challenge remain explicit',()=>{
 assert.deepEqual([21,23,24,25].map(d=>level(d).waves.length),[12,12,12,16]);
 assert.deepEqual(level(23).preset,['sunflower','scaredyshroom','iceburg','magnetshroom','gravebuster']);
 assert.equal(DARK_LEVELS.dark24.mode,'conveyor');assert.equal(DARK_LEVELS.dark22,undefined);assert.throws(()=>level(22),TypeError);
 assert.equal(props.armors.dark_armor4.Toughness,2200);assert.equal(props.zombies.dark_wizard_veteran.Toughness,630);
 assert.ok(battleActors(level(25),[]).includes('darkWizardVeteran'));
 for(const effect of ['wizardSheep','wizardHit','wizardLink','scaredyShot','scaredyFood'])assert.ok(battleEffects(level(25),['scaredyshroom']).includes(effect));
});
test('Scaredy hides nearby, recovers, and shares forty-shot food only with adjacent plants',()=>{
 const g=empty();g.addPlant('scaredyshroom',2,2);g.addPlant('scaredyshroom',1,3);g.addPlant('scaredyshroom',4,2);
 const p=g.plants[0],near=g.spawnZombie('dark',2,cellX(3));near.frozenUntil=100;tick(g,1);assert.equal(p.animation,'Hiding');near.hp=0;tick(g,2);assert.equal(g.darkPlants.states.get(p.id)!.hiding,false);
 g.food=1;assert.ok(g.plantFood(2,2));assert.equal(g.food,0);assert.equal(g.plants[1].action,'food');assert.notEqual(g.plants[2].action,'food');
 let count=0;const ids=new Set<number>();for(let i=0;i<150;i++){g.tick(1/60);for(const s of g.darkPlants.spores)if(!ids.has(s.id)){ids.add(s.id);count++;}}
 assert.equal(count,80);assert.notEqual(p.action,'food');tick(g,4);assert.equal(g.darkPlants.spores.length,0);
});
test('Chomper digests two zombies and swallows them without corpses; giants take bite damage',()=>{
 const g=empty();g.addPlant('chomper',2,2);const p=g.plants[0];
 const a=g.spawnZombie('dark',2,cellX(3)),b=g.spawnZombie('dark_armor4',2,cellX(3)+10);a.frozenUntil=b.frozenUntil=100;
 tick(g,4);assert.equal(a.deathCause,'swallow');assert.equal(b.deathCause,'swallow');assert.equal(g.darkPlants.states.get(p.id)!.chews.length,2);
 tick(g,19);assert.equal(g.darkPlants.states.get(p.id)!.chews.length,0);
 const giant=g.spawnZombie('dark_gargantuar',2,cellX(3));giant.frozenUntil=100;const hp=giant.hp;tick(g,2);assert.ok(giant.hp<hp);assert.notEqual(giant.deathCause,'swallow');
});
test('Flowerpot stacks under plants, protects the cell from veteran wizard and moves only when empty',()=>{
 const g=empty();g.sun=1000;assert.ok(g.plant('floawerPot',2,2));assert.ok(g.plant('scaredyshroom',2,2));
 const pot=g.plants.find(p=>p.kind==='floawerPot')!,plant=g.plants.find(p=>p.kind==='scaredyshroom')!;
 const wizard=g.spawnZombie('dark_wizard_veteran',2,cellX(8));tick(g,12);assert.equal(plant.sheep,undefined);assert.equal(pot.sheep,undefined);
 g.shovel(2,2);assert.ok(g.plants.includes(pot));assert.ok(!g.plants.includes(plant));g.food=1;assert.ok(g.plantFood(2,2));tick(g,3);assert.equal(pot.hp,props.plants.floawerPot.ToughnessPlantfooded);
 assert.ok(g.darkPlants.select(2,2));assert.ok(g.darkPlants.move(3,3));assert.ok(g.darkPlants.states.get(pot.id)!.moving);tick(g,3);assert.equal(g.darkPlants.states.get(pot.id)!.moving,undefined);assert.deepEqual([pot.row,pot.column],[3,3]);wizard.hp=0;
});
test('Scaredy knockback leaves the immovable king on its native square',()=>{
 const g=empty(),king=g.spawnZombie('dark_king',2,cellX(8));tick(g,4);const x=king.x;
 g.darkPlants.spores.push({id:900,row:2,x:x-25,y:0,speed:480,knockback:true});g.darkPlants.tick(1/60);assert.equal(king.x,x);
});

test('Chomper food ends after pull and push without moving a king',()=>{
 const g=empty();g.addPlant('chomper',2,2);const p=g.plants[0],king=g.spawnZombie('dark_king',2,cellX(8));tick(g,4);const x=king.x;g.food=1;g.plantFood(2,2);tick(g,10);assert.notEqual(p.action,'food');assert.equal(king.x,x);
});
