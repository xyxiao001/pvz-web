import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PlantDecoding, ArcadeProgress } from '../src/outer/arcade';
import { GardenProgress, GARDEN_KEY, GROWTH_TIME, stageOf } from '../src/outer/garden';
import { Tickets } from '../src/outer/tickets';
import { LocalStore } from '../src/shell/store';
import { ProgressStore } from '../src/shell/progression';
import type { OuterCatalog } from '../src/outer/types';
const catalog:OuterCatalog=JSON.parse(readFileSync(new URL('../public/assets/outer/catalog.json',import.meta.url),'utf8'));
const memory=()=>{const map=new Map<string,string>();return{getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v);},removeItem:(k:string)=>{map.delete(k);}};};
test('decoding uses source merges, locks exact matches and rewards once daily',()=>{
 const game=new PlantDecoding(catalog.arcade.features,5,4,()=>.3);
 for(const [index,code] of game.codes.entries()){
  const pair=catalog.arcade.features.MERGES.find(m=>m.Target===code)!;
  game.pickBase(pair.PlantA);game.place(index);game.pickBase(pair.PlantB);game.place(index);
 }
 assert.equal(game.ready,true);game.confirm();assert.equal(game.won,true);assert.equal(game.step,1);assert.equal(game.reward,20);
 game.clear(0);assert.equal(game.slots[0],game.codes[0]);game.confirm();assert.equal(game.step,1);
 const storage=memory(),arcade=new ArcadeProgress(storage);assert.equal(arcade.start('2026-10-17'),true);arcade.finish(20);assert.equal(new ArcadeProgress(storage).start('2026-10-17'),false);assert.equal(arcade.read().reward,20);assert.equal(arcade.start('2026-10-18'),true);
});
test('decoding differentiates misplaced and partially matching plants',()=>{
 const game=new PlantDecoding({BASES:['a','b','c'],MERGES:[{PlantA:'a',PlantB:'a',Target:'aa'},{PlantA:'a',PlantB:'b',Target:'ab'},{PlantA:'b',PlantB:'b',Target:'bb'},{PlantA:'c',PlantB:'c',Target:'cc'}]},3,3,()=>.999);
 assert.deepEqual(game.codes,['aa','ab','bb']);game.slots=['ab','aa','cc'];game.confirm();assert.deepEqual(game.signs,['change','change','fault']);game.slots=['aa','ab','ab'];game.confirm();assert.deepEqual(game.signs,['correct','correct','half']);
});
test('garden purchases, campaign sprouts, care and offline growth persist without skipping stages',()=>{
 const storage=memory(),wallet=new LocalStore(storage),garden=new GardenProgress(storage,catalog.garden.gardens,wallet);
 garden.claim([{level:'egypt5',type:'sprout',count:1}]);garden.claim([{level:'egypt5',type:'sprout',count:1}]);assert.equal(garden.read().sprouts,1);
 assert.equal(garden.buy(3,15),true);assert.equal(wallet.read().gem,99984);
 const owned=catalog.plants.filter(p=>p.id===0);assert.equal(garden.plant(0,0,owned,1000,()=>.5),true);assert.equal(garden.read().sprouts,3);
 assert.equal(garden.plant(0,0,owned,1000),false);
 for(let i=0;i<4;i++){assert.equal(garden.water(0,0,1000+i*10000,()=>0),true);assert.equal(garden.water(0,0,1001+i*10000),false);garden.update(11000+i*10000,()=>0);}
 assert.equal(garden.read().areas[0][0].plant!.requirement,'fertilizerPar');garden.grow(0,0,41000);assert.equal(wallet.read().coin,50);
 garden.update(41000+GROWTH_TIME*5,()=>0);const p=garden.read().areas[0][0].plant!;assert.equal(p.stuck,true);assert.equal(stageOf(p),1);assert.equal(p.grown,GROWTH_TIME/2-1);
 const reopened=new GardenProgress(storage,catalog.garden.gardens,wallet);assert.deepEqual(reopened.read(),garden.read());
 garden.grow(0,0,41000+GROWTH_TIME*5);assert.equal(wallet.read().coin,550);
 garden.update(41000+GROWTH_TIME*6);garden.grow(0,0,41000+GROWTH_TIME*6);assert.equal(wallet.read().gem,99985);assert.equal(garden.remove(0,0),true);assert.equal(garden.read().boosts.peashooter,1);
 const progress=new ProgressStore(storage);progress.consumeGardenBoosts(new Set(['peashooter']));assert.equal(garden.read().boosts.peashooter,0);
});
test('garden slot unlock and cart preserve plant growth across areas',()=>{
 const storage=memory(),wallet=new LocalStore(storage),garden=new GardenProgress(storage,catalog.garden.gardens,wallet);
 assert.equal(garden.unlock(0,4),false);wallet.credit('coin',4000);assert.equal(garden.unlock(0,4),true);assert.equal(wallet.read().coin,0);
 garden.buy(1,5);garden.plant(0,0,catalog.plants.filter(p=>p.id===0),0,()=>.5);assert.equal(garden.cart(0,0,catalog.plants),false);
 garden.grow(0,0,100);assert.equal(garden.move(0,0,1,catalog.plants),true);assert.equal(garden.cart(0,1,catalog.plants),true);assert.equal(garden.read().cart!.kind,'peashooter');
 assert.equal(garden.cart(0,4,catalog.plants),true);assert.equal(stageOf(garden.read().areas[0][4].plant!),1);assert.equal(garden.read().cart,null);
 garden.remove(0,4);assert.deepEqual(JSON.parse(storage.getItem(GARDEN_KEY)!).boosts,{});
});
test('tickets follow Saturday reset and retain same-week local balance',()=>{
 const storage=memory(),wallet=new LocalStore(storage),tickets=new Tickets(storage,wallet);
 tickets.refresh(new Date(2026,9,16,23));wallet.credit('ticket',100);tickets.refresh(new Date(2026,9,16,23,59));assert.equal(wallet.read().ticket,100);
 tickets.refresh(new Date(2026,9,17,0));assert.equal(wallet.read().ticket,0);wallet.credit('ticket',100);tickets.refresh(new Date(2026,9,18));assert.equal(wallet.read().ticket,100);
});
test('all decoding recipes resolve to exported native plant portraits',()=>{
 const kinds=new Set(catalog.plants.map(p=>p.kind));for(const merge of catalog.arcade.features.MERGES)for(const kind of [merge.PlantA,merge.PlantB,merge.Target])assert.ok(kinds.has(kind),kind);
});

test('exported almanac cards use existing native armatures and background animations',()=>{
 const rig=(key:string,group:string)=>JSON.parse(readFileSync(new URL(`../public/assets/${catalog.rigGroups[key]??group}/rigs/${key}/skeleton.json`,import.meta.url),'utf8'));
 const cards=rig('91731241-49e8-4db3-bb69-f04d4f4762d6','shell');
 const animations=(data:{armature:{name:string;animation:{name:string}[]}[]},armature:string)=>new Set(data.armature.find(a=>a.name===armature)!.animation.map(a=>a.name));
 const backgrounds=animations(cards,'background'),plants=animations(cards,'plants'),zombieSpec=catalog.almanac.zombieCards.find(r=>r.armature==='Zombie')!,zombies=animations(rig(zombieSpec.rig,'outer'),'Zombie');
 for(const p of catalog.plants){assert.ok(backgrounds.has(p.background),p.kind);assert.ok(plants.has(p.card),p.kind);}
 for(const z of catalog.zombies){assert.ok(backgrounds.has(z.background),z.kind);assert.ok(zombies.has(z.card),z.kind);}
 assert.equal(catalog.garden.rigs.waterpourPar.scale,.5);assert.equal(catalog.garden.rigs.fertilizerPar.scale,.5);
});
