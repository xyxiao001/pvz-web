import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,tick} from './dark-fixture';
import {playDarkFourth} from './dark-fourth-strategy';
import {cellX,type PlantKind} from '../src/game/level';
import {DarkBoss} from '../src/game/dark-boss';
import {DARK_LEVELS} from '../src/game/worlds/dark';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
for(const day of [16,17,18,19,20])test(`Dark Ages ${day} legal replay`,()=>{
 const g=create(day,day===20?4:1234),used=new Set<PlantKind>(),plant=g.plant.bind(g);g.plant=(kind,r,c,p)=>{const ok=plant(kind,r,c,p);if(ok)used.add(kind);return ok;};
 for(let f=0;f<90000&&g.phase==='playing';f++){playDarkFourth(g,f);g.tick(1/60);g.events.length=0;}
 console.log('dark'+day,g.phase,g.time,g.wave,[...used],g.boss?.zombie.hp);assert.equal(g.phase,'won');assert.ok(used.size<=6);
});
test('Dark 16–20 native modes, night, protection and dragon data',()=>{
 assert.deepEqual([16,17,18,19,20].map(d=>level(d).waves.length),[18,18,16,18,0]);
 for(const day of [16,17,18,19,20])assert.equal(level(day).sunDrops,false);
 assert.equal(DARK_LEVELS.dark18.mode,'preset');assert.equal(DARK_LEVELS.dark20.mode,'conveyor');assert.equal(DARK_LEVELS.dark20.outro,'DARK_OUTRO_ZOMBOSS');
 assert.deepEqual(level(18).preset,['sunshroom','fumeshroom','peanut','iceburg','kernelpult']);
 assert.equal(level(19).protectedPlants.length,3);assert.ok(level(19).protectedPlants.every(p=>p.kind==='magnetshroom'));
 assert.equal(level(20).boss!.kind,'zombossmech_dark');assert.equal(level(20).boss!.reserved,3);assert.deepEqual(props.zombies.zombossmech_dark.ZombossStages.map(s=>s.HitPoints),[7000,9000,11000]);
 for(const n of ['boss','dragonImp','darkWizard','darkJester','darkGargantuar'])assert.ok(battleActors(level(20),[]).includes(n));
 for(const n of ['wizardSheep','wizardHit','wizardLink','dragonFire','bossMissile'])assert.ok(battleEffects(level(20),[]).includes(n));
});
test('King stays on its square and grants a removable helmet on the native give event',()=>{
 const g=create(16);g['nextWave']=Infinity;g.graves=[];const king=g.spawnZombie('dark_king',2,cellX(10)),z=g.spawnZombie('dark_armor1',2,cellX(7));z.frozenUntil=100;
 tick(g,8);assert.equal(king.x,cellX(8));assert.equal(z.kind,'dark_armor3');assert.equal(z.armor,props.armors.dark_armor3.Toughness);assert.ok(g.dark.knightEffects.length>0||g.dark.kings.get(king.id)!.given===z.id);
 assert.equal(g.dark.canPlant('sunflower',2,8),false);assert.equal(g.dark.canPlant('cherry_bomb',2,8),true);
 g.addPlant('magnetshroom',2,5);tick(g,2);assert.equal(z.armor,0);
});
test('Dragon can be interrupted by boosted magnet and dies through native outro',()=>{
 const g=create(20),boss=g.boss as DarkBoss;tick(g,12);g.addPlant('magnetshroom',0,0);g.western.food(g.plants.find(p=>p.kind==='magnetshroom')!);assert.equal(boss.animation,'MagnetStart');tick(g,5);assert.ok(!boss.animation.startsWith('Magnet'));
 for(let stage=0;stage<3;stage++){boss.hit(boss.current.HitPoints*2);tick(g,5);}tick(g,20);assert.equal(g.phase,'won');assert.ok(boss.defeated);
});

test('Forced conveyor boost activates magnet without consuming plant food or garden boosts',()=>{
 const g=create(20);tick(g,12);g.conveyor.push({id:999,kind:'magnetshroom',lane:0,position:0,forceBoosted:true});const food=g.food;
 assert.ok(g.plant('magnetshroom',0,0,999));assert.equal(g.plants.find(p=>p.kind==='magnetshroom')!.action,'food');assert.equal(g.boss!.animation,'MagnetStart');assert.equal(g.food,food);assert.equal(g.usedBoosts.size,0);
});

import {readFileSync} from 'node:fs';
import {ProgressStore} from '../src/shell/progression';
test('New native rigs, narrative and reward presentations resolve; rewards persist once',()=>{
 const catalog=JSON.parse(readFileSync(new URL('../public/assets/dark/catalog.json',import.meta.url),'utf8'));
 for(const name of ['darkKing','dragonImp','boss','knightEffect','dragonFire','dragonShade','dragonIntroFire','bossMissile','bossEscape']){
  const rig=catalog.actors[name]??catalog.rigs[name],skeleton=JSON.parse(readFileSync(new URL(`../public/assets/dark/rigs/${rig.rig}/skeleton.json`,import.meta.url),'utf8'));
  assert.ok(skeleton.armature.some((a:{name:string})=>a.name===rig.armature),name);
 }
 for(const name of ['DARK_INTRO_MAGNETSHROOM','DARK_INTRO_ZOMBOSS','DARK_OUTRO_ZOMBOSS'])assert.ok(catalog.narratives[name].length);
 const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}},store=new ProgressStore(storage);
 for(const day of [18,20]){store.finish('dark','dark'+day);store.finishPresentation();store.finish('dark','dark'+day);store.finishPresentation();}
 assert.deepEqual(new ProgressStore(storage).campaignRewards().map(r=>r.id),['spine_dark','worldtrophy_dark']);
});
