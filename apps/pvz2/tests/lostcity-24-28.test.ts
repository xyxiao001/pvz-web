import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {create,level,tick} from './lostcity-fixture';
import {BOARD,cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore} from '../src/shell/progression';
const days=[24,25,26,27,28];
const read=(path:string)=>JSON.parse(readFileSync(new URL('../public/assets/'+path,import.meta.url),'utf8'));
test('Lost City 24–28 native configuration and rewards',()=>{
 assert.deepEqual(days.map(d=>level(d).waves.length),[10,10,12,12,12]);
 assert.deepEqual(days.map(d=>level(d).goldTiles.length),[8,4,1,3,10]);
 assert.equal(level(24).flowerLine,3);assert.equal(level(28).trapTiles.length,5);
 assert.deepEqual(level(28).preset,['sunflower','redstinger','akee','stallia','iceburg']);
 assert.equal(BATTLE_LEVELS.lostcity26.firstReward.plant,'goldleaf');assert.ok(BATTLE_LEVELS.lostcity26.plants.some(p=>p.kind==='goldleaf'&&p.id===132));
 assert.ok(days.every(d=>BATTLE_LEVELS['lostcity'+d].narrative===null));
 const data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 p.finish('lostcity','lostcity28');p.finish('lostcity','lostcity28');assert.deepEqual(p.campaignRewards().map(r=>r.id),['spine_lostcity']);
});
for(const day of days)test(`Lost City ${day} controlled-damage settlement smoke`,()=>{
 const g=create(day);for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
test('Day 24 flower boundary loses when crossed',()=>{
 const g=create(24);g.spawnZombie('lostcity',2,BOARD.left+3*BOARD.cellWidth);tick(g,.1);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'flowers');
});
test('Golden leaf creates a tile that produces sun under a plant',()=>{
 const g=create(26);g.addPlant('goldleaf',2,4);tick(g,3);assert.ok(g.beachFinale.tiles.some(t=>t.row===2&&t.column===4));g.addPlant('wallnut',2,4);tick(g,.1);assert.ok(g.suns.some(s=>s.from==='plant'&&s.value===50));
});
test('Crystal skull charges then hits front plants in its own lane',()=>{
 const g=create(27);g.addPlant('wallnut',2,3);g.addPlant('wallnut',1,3);const front=g.plants[0],other=g.plants[1];const z=g.spawnZombie('lostcity_crystalskull',2,cellX(6)-15);tick(g,1);assert.equal(g.lostcity.crystals.get(z.id)!.animation,'Absorbing');tick(g,5.4);assert.ok(front.hp<=0);assert.ok(other.hp>0);assert.equal(g.lostcity.crystalRays.length,1);tick(g,2);assert.equal(g.lostcity.crystalRays.length,0);
});
test('Crystal skull consumes sunlight to shorten charge and releases pending sun on death',()=>{
 const g=create(27);g.addPlant('wallnut',2,3);const z=g.spawnZombie('lostcity_crystalskull',2,cellX(6)-15);tick(g,.1);const state=g.lostcity.crystals.get(z.id)!;g.dropSun(z.x,200,250,'plant');tick(g,2);assert.ok(state.charge<2.95);assert.equal(z.absorbed,0);
 g.dropSun(cellX(0),200,50,'plant');tick(g,.1);assert.ok(g.suns.some(s=>s.absorber===z.id));g.damage(z,1000,'water');tick(g,.1);assert.ok(g.suns.every(s=>s.absorber===null));assert.ok(!g.suns.some(s=>s.from==='ra'));
});
for(const day of days)test(`Lost City ${day} required resource smoke`,()=>{
 const config=BATTLE_LEVELS[`lostcity${day}`],l=level(day),catalogs=['campaign',...config.bundles!].map(b=>read(b+'/catalog.json'));
 const actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.preset??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(sk.armature.length,name);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],name);
});
