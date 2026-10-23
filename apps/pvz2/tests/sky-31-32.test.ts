import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,read,tick} from './sky-fixture';
import {SkyBoss} from '../src/game/sky-boss';
import {cellX,type BossAction,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
for(const day of [31,32])test(`Sky ${day}: controlled settlement and resources`,()=>{
 const g=create(day);
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');if(day===32)assert.equal(g.boss!.defeated,true);
 const config=BATTLE_LEVELS[`sky${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.preset??[]),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name];if(spec)assert.ok(read(`${spec.group}/rigs/${spec.rig}/skeleton.json`).armature.some((a:{name:string})=>a.name===spec.armature),name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const s=rigs[name];assert.ok(read(`${s.group}/rigs/${s.rig}/skeleton.json`).armature.some((a:{name:string})=>a.name===s.armature),name);}
});
test('Sky31 preserves its six presets, two forbidden columns and twelve waves',()=>{
 const g=create(31),l=g.level;assert.deepEqual(l.preset,['sunflower','floawerPot','snapdragon','moonbean','chilibean','pineapple']);assert.equal(l.waves.length,12);assert.equal(l.mold.length,10);assert.equal(l.mustProtect,0);g.sun=10000;assert.equal(g.plant('sunflower',0,0),false);assert.equal(g.plant('sunflower',0,1),false);assert.ok(g.plant('sunflower',0,2));assert.ok(g.plant('floawerPot',1,4));assert.ok(g.plant('snapdragon',1,4));
});
test('Sky32 keeps authored stages, cards, dialogues and no invented trophy',()=>{
 const g=create(32),b=g.boss as SkyBoss;assert.ok(b instanceof SkyBoss);assert.equal(b.zombie.hp,44000);assert.deepEqual(b.stages.map(s=>s.HitPoints),[8000,16000,20000]);assert.equal(g.level.boss!.reserved,3);assert.equal(g.level.sunDrops,false);assert.equal(g.level.waves.length,0);assert.equal(g.level.mowers,false);
 assert.deepEqual(g.level.conveyor!.InitialPlantList.map(p=>p.PlantType),['skyshooter','anthurium','pineapple','asparagus','loquat','moonbean','peacommando']);
 assert.equal(BATTLE_LEVELS.sky32.narrative,'SKYCITY_INTRO_ZOMBOSS');assert.equal(BATTLE_LEVELS.sky32.outro,'SKYCITY_OUTRO_ZOMBOSS');assert.equal(BATTLE_LEVELS.sky32.firstReward.image,'');
 const c=read('sky/catalog.json');for(const [key,count] of [['SKYCITY_INTRO_ZOMBOSS',3],['SKYCITY_OUTRO_ZOMBOSS',5]] as const){const lines=c.narratives[key].filter((s:{Lines?:unknown})=>s.Lines);assert.equal(lines.length,count);for(const line of lines)assert.ok(c.sounds[line.Voice].length);}
});
const idle=()=>{const g=create(32);tick(g,5.4);const b=g.boss as SkyBoss;Object.assign(b,{restLeft:1000});return {g,b};};
const action=(b:SkyBoss,name:BossAction['actionName'])=>{const a=b.current.Actions.find(a=>a.actionName===name)!;Object.assign(b,{previous:a,repeatLeft:1,restLeft:0,motion:null,animation:b.shipped?'IdleShip':'Idle'});b.zombie.x=cellX(6);};
test('Sky boss summons from stage budget and stabs target on dive impact',()=>{
 const {g,b}=idle();action(b,'summon');tick(g,3);assert.ok(g.zombies.some(z=>z!==b.zombie));
 const h=idle();h.g.addPlant('skyshooter',1,2);const p=h.g.plants.at(-1)!;action(h.b,'shoot');tick(h.g,2.6);assert.ok(p.hp>0);tick(h.g,.3);assert.equal(p.hp,0);assert.equal(h.b.animation,'ShootEnd');tick(h.g,3);assert.equal(h.b.zombie.x,cellX(6));
});
test('Sky boss thunder queues native linked charges and storm removes plants',()=>{
 const {g,b}=idle();g.addPlant('skyshooter',2,3);g.addPlant('skyshooter',2,4);action(b,'rush2');tick(g,2);assert.ok(g.sky.thunder.charges.length>0);
 const h=idle();h.b.zombie.row=2;h.g.addPlant('skyshooter',2,4);const p=h.g.plants.at(-1)!;action(h.b,'rush');tick(h.g,3.5);assert.equal(p.hp,0);
});
test('Sky boss turns into ship, launches 160 bullets and interrupts at 400 damage',()=>{
 const {g,b}=idle();b.hit(8000);assert.equal(b.stage,1);b.hit(16000);assert.equal(b.stage,2);tick(g,.6);assert.equal(b.shipped,true);assert.equal(b.animation,'Trans');tick(g,3.1);g.addPlant('skyshooter',b.zombie.row,2);action(b,'rush');tick(g,3.6);assert.equal(b.animation,'RushLoopShip');tick(g,5);assert.equal((b as unknown as {barrageSent:number}).barrageSent,160);assert.equal(b.animation,'RushEndShip');
 action(b,'rush');tick(g,3.6);b.hit(400);assert.equal(b.animation,'StunStartShip');tick(g,.1);assert.equal((b as unknown as {barrageAge:number|null}).barrageAge,null);
});
test('Sky paired batteries damage all lanes between them and separate on death',()=>{
 const {g,b}=idle();b.stage=2;b.zombie.hp=20000;b.shipped=true;action(b,'shoot');tick(g,1.6);const upper=g.zombies.find(z=>z.kind==='sky_battery')!,lower=g.zombies.find(z=>z.kind==='sky_battery_lower')!;assert.ok(upper&&lower);assert.equal(upper.hp,1200);assert.equal(lower.hp,1200);
 upper.row=0;lower.row=4;upper.x=lower.x=cellX(3);g.addPlant('skyshooter',2,3);const p=g.plants.at(-1)!,hp=p.hp;tick(g,.3);assert.ok(p.hp<=hp-50);g.damage(upper,1200);tick(g,.02);assert.equal(b.batteries.get(lower.id)!.partner,null);assert.equal(lower.sky!.animation,'Trans');tick(g,1);assert.equal(lower.sky!.animation,'IdleSingle');
});
test('Sky commando can target the final mech and all stages end through escape',()=>{
 const {g,b}=idle();g.addPlant('peacommando',2,2);const hp=b.zombie.hp;tick(g,7);assert.ok(b.zombie.hp<hp);b.hit(100000);b.hit(100000);b.hit(100000);assert.equal(b.defeated,false);tick(g,24);assert.equal(b.defeated,true);assert.equal(g.phase,'won');
});

test('Sky boss cancels a repeated dive when the last target has gone',()=>{const {g,b}=idle();g.addPlant('skyshooter',1,2);action(b,'shoot');Object.assign(b,{repeatLeft:2});tick(g,12);assert.equal(g.phase,'playing');assert.ok(Number.isFinite(b.zombie.x));});
test('Sky storm is canceled by anthurium bolts and active loquat tornadoes',()=>{
 for(const mode of ['bolt','loquat']){const {g,b}=idle();b.storms.push({id:g.nextEntityId(),x:cellX(4),row:2,deadAt:null,hits:new Set()});if(mode==='bolt')g.sky.thunder.bolts.push({id:g.nextEntityId(),x:cellX(4),row:2,big:false});else g.eighties.finale.tornadoes.push({row:2,column:4,until:g.time+5});tick(g,.02);assert.notEqual(b.storms[0].deadAt,null);}
});
