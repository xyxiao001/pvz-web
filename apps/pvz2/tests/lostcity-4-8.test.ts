import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick} from './lostcity-fixture';
import {BOARD,cellX} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {ProgressStore} from '../src/shell/progression';

test('Lost City 4–8 preserve waves, gold tiles, preset cards and rewards',()=>{
 assert.deepEqual([4,5,6,7,8].map(d=>level(d).waves.length),[10,12,12,12,12]);
 assert.deepEqual([4,5,6,7,8].map(d=>level(d).goldTiles.length),[6,0,5,3,7]);
 assert.deepEqual(level(4).initialPlants.map(p=>[p.kind,p.row,p.column]),[['wallnut',2,5]]);
 assert.deepEqual(level(6).chooserPlants,['akee']);assert.deepEqual(level(8).preset,['redstinger','akee','puffshroom','iceburg']);assert.equal(level(8).flowerLine,3);
 assert.equal(BATTLE_LEVELS.lostcity5.night,true);assert.equal(BATTLE_LEVELS.lostcity6.firstReward.plant,'akee');
 const data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const day of [4,8]){p.finish('lostcity','lostcity'+day);p.finish('lostcity','lostcity'+day);}assert.deepEqual(p.campaignRewards().map(r=>r.id),['spine_lostcity','spine_lostcity']);
});
for(const day of [4,5,6,7,8])test(`Lost City ${day} controlled-damage settlement smoke`,()=>{
 const g=create(day);for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
test('AKEE bounces through four enemies and plant food fires into all occupied lanes',()=>{
 const g=create(5);g.addPlant('akee',2,0);const zs=[2,3,4,5,6].map(c=>g.spawnZombie('lostcity_armor2',2,cellX(c)));for(const z of zs)z.stunnedUntil=100;
 tick(g,1.1);g.plants=[];tick(g,4);assert.deepEqual(zs.map(z=>g.props.armors.lostcity_armor2.Toughness-z.armor),[60,60,60,60,0]);
 g.zombies=[];g.addPlant('akee',2,0);const targets=[0,1,2,3,4].map(row=>g.spawnZombie('lostcity_armor2',row,cellX(4)));for(const z of targets)z.stunnedUntil=100;
 g.food=1;g.plantFood(2,0);tick(g,3);assert.ok(targets.every(z=>z.armor<=g.props.armors.lostcity_armor2.Toughness-450));
});
test('Excavator blocks straight shots, takes lobbed damage and throws plants two squares right',()=>{
 const g=create(4);g.plants=[];const z=g.spawnZombie('lostcity_excavator',2,cellX(3)+40);g.addPlant('wallnut',2,3);
 assert.equal(g.lostcity.blockShot(z,false,1),true);assert.equal(g.lostcity.blockShot(z,true,1),false);assert.equal(g.lostcity.blockShot(z,false,-1),false);
 tick(g,2.5);assert.equal(g.plants[0].column,5);assert.equal(g.plants[0].hp,g.props.plants.wallnut.Toughness);
 g.plants=[];g.addPlant('akee',2,0);z.x=cellX(7);z.stunnedUntil=100;tick(g,4);assert.ok(z.hp<350);
});
test('Parasol blocks lobbed seeds but takes direct shots, and flower line remains enforced',()=>{
 const g=create(7);const z=g.spawnZombie('lostcity_jane',2,cellX(5));z.stunnedUntil=100;g.addPlant('akee',2,0);tick(g,4);assert.equal(z.hp,350);
 g.plants=[];g.addPlant('peashooter',2,0);tick(g,4);assert.ok(z.hp<350);
 const flowers=create(8);flowers.spawnZombie('lostcity_imp',2,BOARD.left+3*BOARD.cellWidth);tick(flowers,.1);assert.equal(flowers.phase,'lost');assert.equal(flowers.lossReason,'flowers');
});
