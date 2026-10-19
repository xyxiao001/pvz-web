import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick,props} from './beach-fixture';
import {cellX} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {ProgressStore} from '../src/shell/progression';

test('Beach 11–15 preserve original modes, objectives, rewards and wave counts',()=>{
 assert.deepEqual([11,12,13,14,15].map(d=>level(d).waves.length),[15,10,12,14,16]);
 assert.deepEqual(level(11).chooserPlants,['sunflower','bowlingbulb','potatomine','wallnut','lilypad']);
 assert.equal(BATTLE_LEVELS.beach11.firstReward.plant,'bowlingbulb');
 assert.deepEqual(level(12).lastStand,{sun:1750,food:3});assert.equal(level(12).sunDrops,false);
 assert.equal(level(13).targetSun,2000);assert.equal(level(13).maxPlants,16);
 assert.equal(BATTLE_LEVELS.beach14.mode,'preset');assert.deepEqual(level(14).preset,['sunflower','lilypad','tanglekelp','wallnut','bowlingbulb','chomper']);
 assert.equal(level(15).protectedPlants.length,5);assert.equal(level(15).mustProtect,5);
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const d of [12,14,15]){store.finish('beach','beach'+d);store.finish('beach','beach'+d);}
 assert.deepEqual(store.campaignRewards().map(r=>r.id),['spine_beach','spine_beach','note_beach']);
});
for(const day of [11,12,13,14,15])test(`Beach ${day} wave and settlement smoke with controlled damage`,()=>{
 const g=create(day);
 if(day===12){tick(g,1);assert.equal(g.time,0);assert.equal(g.sun,1750);assert.ok(g.plant('bowlingbulb',2,0));g.startLastStand();}
 if(day===13)for(let row=0;row<5;row++)g.addPlant('sunflower',row,0);
 for(let i=0;i<60000&&g.phase==='playing';i++){
  g.tick(1/60);
  for(const z of g.zombies){if(day===13&&g.wave===g.level.waves.length&&g.sunProduced<2000)z.stunnedUntil=g.time+100;else g.damage(z,100000);}
 }
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
 if(day===13)assert.ok(g.sunProduced>=2000);
});
test('surfer rides past ordinary plants but falls at a tallnut and leaves a board on stabbing',()=>{
 const g=create(11);g.addPlant('lilypad',2,6);g.addPlant('wallnut',2,6);
 const z=g.spawnZombie('beach_surfer',2,cellX(7)),start=z.x;tick(g,1);
 assert.ok(z.surfer!.surfing);assert.ok(Math.abs(start-z.x-props.zombies.beach_surfer.WalkSPS*3*82)<1);
 assert.ok(g.plants.some(p=>p.kind==='wallnut'&&p.hp===props.plants.wallnut.Toughness));
 g.addPlant('lilypad',2,5);g.addPlant('tallnut',2,5);z.x=cellX(5)+40;tick(g,.1);assert.equal(z.surfer!.animation,'Fall');
 tick(g,4);assert.equal(z.surfer!.surfing,false);assert.equal(z.surfer!.board,0);
 assert.ok(g.graves.some(b=>b.kind==='surfboard'&&b.column===5&&b.hp===700));assert.ok(!g.plants.some(p=>p.column===5&&p.row===2));
});
test('carried board absorbs peas, dying on land leaves a destructible board, bowling clears it',()=>{
 const g=create(11);g.addPlant('peashooter',3,0);const z=g.spawnZombie('beach_surfer',3,cellX(2));z.stunnedUntil=100;
 tick(g,4);assert.equal(z.hp,350);assert.ok(z.surfer!.board<700&&z.surfer!.board>0);
 g.damage(z,10000);tick(g,.1);const board=g.graves.find(b=>b.kind==='surfboard')!;assert.ok(board);assert.equal(board.column,1);
 g.sun=10000;assert.equal(g.plant('wallnut',3,1),false);
 g.beach.bowling.roll('bowling_pf',3,cellX(0),6);tick(g,.4);g.beach.bowling.roll('bowling2',3,cellX(0),6);tick(g,.4);
 assert.ok(!g.graves.some(b=>b.id===board.id));assert.ok(g.plant('wallnut',3,1));
});
test('Beach 13 plant limit and Beach 15 protected mines can fail their objectives',()=>{
 const limited=create(13);limited.sun=100000;
 for(let row=0;row<5;row++)for(let column=0;column<2;column++)limited.addPlant('sunflower',row,column);
 limited.addPlant('lilypad',0,2);limited.addPlant('peashooter',0,2);tick(limited,.1);
 assert.equal(limited.phase,'lost');assert.equal(limited.lossReason,'plants');
 const protectedGame=create(15);protectedGame.plants.find(p=>p.endangered)!.hp=0;tick(protectedGame,.1);
 assert.equal(protectedGame.phase,'lost');assert.equal(protectedGame.lossReason,'protected');
});
