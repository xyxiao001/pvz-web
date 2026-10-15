import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { PlayerProfile, SHOP } from '../src/platform/profile';
import { Game, type Zombie } from '../src/game/model';
import { PLANTS, LEVEL_IDS, cellX, type PlantKind, type LevelId } from '../src/game/config';
import { adventureDialogue, DIALOGUE } from '../src/game/dialogue';
import { animationNames, combatTextureFiles } from '../src/rendering/asset-plan';
import { zombieHealthFraction } from '../src/rendering/zombie-health';
import { ACTOR_MOTION } from '../src/rendering/actor-motion';
import animations from '../public/assets/runtime/animations.json';
function storage() { const values=new Map<string,string>();return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}}; }
function profile(run=1) {const p=new PlayerProfile(storage());p.data.run=run;return p;}
function battle(kinds:PlantKind[],level:LevelId=1) {
  const p=profile(2);p.data.purchases.slots=4;for(const item of SHOP)if(item.id in PLANTS)p.data.purchases[item.id]=1;
  const g=new Game(level,52,'adventure','day',p.rules());g.seeds=kinds;g.phase='playing';g.sun=50000;return g;
}
function plant(g:Game,kind:PlantKind,c=0,r=0){g.cancelSelection();g.select(kind);assert.ok(g.plant(c,r),`${kind} at ${c},${r}`);return g.plants.at(-1)!;}
function ticks(g:Game,n:number){for(let i=0;i<n;i++)g.step();}
function zombie(id:number,row=0,extra:Partial<Zombie>={}):Zombie{return {id,kind:'normal',row,x:650,health:270,armor:0,shield:0,speed:0,biteIn:4,eating:false,wave:0,hitAt:-100,chillIn:0,hasPole:false,vaultIn:0,animationTime:0,rageIn:0,riseIn:0,...extra};}

test('profile imports existing progress once and persists wallet, purchases and next playthrough',()=>{
  const s=storage();s.setItem('pvz-web:adventure:v1','1-34-complete');const p=new PlayerProfile(s);
  assert.equal(p.data.nextLevel,35);assert.equal(p.data.run,1);p.addMoney(10000);assert.ok(p.buy('slots'));assert.ok(p.buy('gloomshroom'));
  const reloaded=new PlayerProfile(s);assert.equal(reloaded.data.money,1750);assert.equal(reloaded.rules().slots,7);assert.deepEqual(new Game(1,1,'adventure','day',reloaded.rules()).seeds,['peashooter']);assert.deepEqual(reloaded.rules().upgrades,['gloomshroom']);
  reloaded.finish(50,1);assert.equal(new PlayerProfile(s).data.run,2);assert.equal(new PlayerProfile(s).data.nextLevel,1);
  reloaded.finish(50,1);assert.equal(reloaded.data.run,2);
  const cleared=storage();cleared.setItem('pvz-web:adventure:v1','1-50-complete');assert.equal(new PlayerProfile(cleared).data.run,2);
});
test('shop unlocks, progressive slot prices, repeat purchases and first slot offer',()=>{
  const p=profile();p.addMoney(200000);assert.equal(p.buy('slots'),false);assert.equal(p.buy('roofCleaner'),false);
  assert.ok(p.buy('slots',true));assert.equal(p.price('slots'),5000);p.data.nextLevel=25;assert.ok(p.buy('poolCleaner'));assert.equal(p.buy('poolCleaner'),false);
  assert.ok(p.buy('rake'));assert.equal(p.data.purchases.rake,3);assert.equal(p.buy('rake'),false);p.data.purchases.rake=0;assert.ok(p.buy('rake'));
  assert.equal(p.buy('cobcannon'),false);p.data.run=2;assert.ok(p.buy('cobcannon'));
  for(const price of [5000,20000,80000]){assert.equal(p.price('slots'),price);assert.ok(p.buy('slots'));}assert.equal(p.rules().slots,10);assert.equal(p.buy('slots'),false);
  p.data.money=0;assert.equal(p.buy('imitater'),false);
});
test('second adventure uses full lawn, harder waves and exactly three locked legal Dave cards',()=>{
  const p=profile(2);
  for(const level of LEVEL_IDS){const g=new Game(level,30,'adventure','day',p.rules());
    if(g.config.mode==='lawn'){assert.equal(g.davePicks.length,3);assert.equal(new Set(g.davePicks).size,3);for(const kind of g.davePicks){g.chooseSeed(kind);assert.ok(g.seeds.includes(kind));assert.ok(!Object.keys(p.data.purchases).includes(kind));}}
    assert.equal(g.config.reward,null);
  }
  const g=new Game(1,30,'adventure','day',p.rules());assert.equal(g.config.rows.length,5);assert.equal(g.config.waveCount,20);assert.equal(g.sun,50);assert.ok(g.isFlagWave(9));
  assert.equal(new Game(8,30,'adventure','day',p.rules()).config.waveCount,20);
  assert.equal(new Game(10,30,'adventure','day',p.rules()).config.waveCount,20);
  assert.ok(new Game(5,30,'adventure','day',p.rules()).waves.flat().includes('newspaper'));
  assert.ok(new Game(40,30,'adventure','day',p.rules()).waves.flat().includes('yeti'));
  assert.ok(!new Game(40,30).waves.flat().includes('yeti'));
});
test('adventure fills purchased slots; survival still permits six through ten',()=>{
  const p=profile(2);p.data.purchases.slots=1;const g=new Game(1,3,'adventure','day',p.rules());
  for(const kind of g.config.seeds){if(!g.seeds.includes(kind))g.chooseSeed(kind);if(g.seeds.length===6)break;}assert.equal(g.canStart,false);
  g.chooseSeed(g.config.seeds.find(k=>!g.seeds.includes(k))!);assert.ok(g.canStart);
  const s=new Game(49,3,'endless');for(const kind of s.config.seeds.slice(0,6))s.chooseSeed(kind);assert.ok(s.canStart);
});
test('first level waits for two peas, sunflower lesson ends after three, shovel pauses combat',()=>{
  const p=profile();const g=new Game(1,4,'adventure','day',p.rules());g.start();plant(g,'peashooter',0,2);ticks(g,2000);assert.equal(g.wave,0);assert.ok(g.suns.length>0);
  g.sun=100;plant(g,'peashooter',1,2);assert.equal(g.tutorial,'off');ticks(g,100);assert.equal(g.wave,1);
  const f=new Game(2,4,'adventure','day',p.rules());f.start();f.sun=500;for(let c=0;c<3;c++){f.cooldowns.sunflower=0;plant(f,'sunflower',c,2);}assert.equal(f.tutorial,'off');
  const s=new Game(5,4,'adventure','day',p.rules());s.beginShovelLesson();ticks(s,1000);assert.equal(s.ticks,0);assert.equal(s.wave,0);
  for(const q of [...s.plants]){s.toggleShovel();s.dig(q.column,q.row);}assert.equal(s.phase,'ready');assert.equal(s.tutorial,'shovel-done');
});
test('dialogue follows source introduction priority and excludes garden-only lines',()=>{
  const p=profile();for(const [level,id] of [[5,2400],[11,201],[12,1401],[15,401],[21,501],[25,701],[31,801],[35,2500],[40,1101],[41,1201],[45,1304],[50,2300]])assert.equal(adventureDialogue(new Game(level as LevelId,0,'adventure','day',p.rules()),p.data),id);
  p.data.money=750;assert.equal(adventureDialogue(new Game(13,0,'adventure','day',p.rules()),p.data),1501);
  assert.ok(DIALOGUE['2700']);assert.ok(DIALOGUE['2800']);assert.ok(!DIALOGUE['1301']);assert.ok(!DIALOGUE['2100']);assert.match(DIALOGUE['602'].text,/1000/);
});
test('cleaners and first aid change real battle behavior',()=>{
  const p=profile(2);assert.equal(new Game(49,1,'adventure','day',p.rules()).mowers.length,0);p.data.purchases.roofCleaner=1;assert.equal(new Game(49,1,'adventure','day',p.rules()).mowers.length,5);
  for(const owns of [false,true]){p.data.purchases.poolCleaner=Number(owns);const g=new Game(21,1,'adventure','day',p.rules());g.phase='playing';const m=g.mowers.find(m=>m.row===2)!;m.state='moving';m.x=80;g.step();assert.equal(m.state,owns?'moving':'spent');}
  const g=battle(['wallnut']);const nut=plant(g,'wallnut');g.cooldowns.wallnut=0;nut.health=100;assert.equal(g.canPlant('wallnut',0,0),false);g.campaign!.firstAid=true;assert.ok(g.canPlant('wallnut',0,0));plant(g,'wallnut');assert.equal(g.plants.length,1);assert.equal(g.plants[0].health,4000);
});
test('rake lures first incoming zombie and delivers one 1800 hit',()=>{
  const p=profile(2);p.data.purchases.rake=3;const g=new Game(1,4,'adventure','day',p.rules());g.seeds=g.config.seeds.slice(0,6);g.start();assert.ok(g.rake);const r=g.rake!;
  const z=zombie(800,r.row,{x:cellX(r.column),health:2000});g.zombies=[z];ticks(g,30);assert.equal(z.health,200);ticks(g,180);assert.equal(g.rake,null);
});
test('gloom upgrades awake fume and damages nearby rows through shields',()=>{
  const g=battle(['fumeshroom','gloomshroom'],11);g.graves=[];plant(g,'fumeshroom',2,2);const plantG=plant(g,'gloomshroom',2,2);plantG.actionIn=1;
  const z=zombie(800,1,{x:cellX(2)+80,shield:1100,kind:'door'}),outside=zombie(801,0,{x:cellX(2)});g.zombies=[z,outside];ticks(g,200);
  assert.equal(z.health,190);assert.equal(z.shield,1100);assert.equal(outside.health,270);
});
test('cattail consumes empty lily, targets flying zombies across rows and pops balloons',()=>{
  const g=battle(['lilypad','cattail'],21);plant(g,'lilypad',1,2);const cat=plant(g,'cattail',1,2);assert.deepEqual(g.plants.map(p=>p.kind),['cattail']);cat.actionIn=1;
  const z=zombie(800,0,{kind:'balloon',flying:true,x:350});g.zombies=[z];ticks(g,150);assert.equal(z.flying,false);assert.ok(z.health<270);
});
test('gold magnet collects at most five landed coins, spikerock deals double pulses',()=>{
  const g=battle(['magnetshroom','goldmagnet']);plant(g,'magnetshroom');const gold=plant(g,'goldmagnet');gold.actionIn=0;
  g.coins=Array.from({length:6},(_,i)=>({id:800+i,x:250+i,y:300,targetY:300,born:0,expiresIn:1000,value:50}));g.step();assert.equal(g.coins.filter(c=>c.magnet!==undefined).length,5);ticks(g,100);assert.equal(g.money,250);
  const s=battle(['spikeweed','spikerock']);plant(s,'spikeweed',2);const spike=plant(s,'spikerock',2);spike.actionIn=100;const z=zombie(900,0,{x:cellX(2)});s.zombies=[z];ticks(s,100);assert.equal(z.health,230);assert.equal(spike.health,450);
});
test('cannon consumes two kernels and hits aimed area after flight; reload blocks immediate firing',()=>{
  const g=battle(['kernelpult','cobcannon']);plant(g,'kernelpult',0);g.cooldowns.kernelpult=0;plant(g,'kernelpult',1);const cannon=plant(g,'cobcannon',0);assert.equal(g.plants.length,1);assert.equal(g.canPlant('kernelpult',1,0),false);
  cannon.actionIn=0;assert.ok(g.aimCannon(1,0));g.select('kernelpult');assert.equal(g.cannonTarget,null);g.cancelSelection();assert.ok(g.aimCannon(1,0));g.fireCannon(600,g.rowY(2));assert.equal(g.aimCannon(0,0),false);
  const z=zombie(800,2,{x:600,health:2500}),out=zombie(801,4,{x:600});g.zombies=[z,out];ticks(g,380);assert.equal(z.health,700);assert.equal(out.health,270);
});
test('imitater copies cost and cooldown independently and transforms after the source animation',()=>{
  const g=battle(['potatomine','imitater']);g.imitaterTarget='potatomine';assert.equal(g.plantCost('imitater'),25);const mimic=plant(g,'imitater');assert.equal(g.cooldown('imitater'),3000);assert.equal(g.cooldown('potatomine'),0);
  ticks(g,318);assert.equal(mimic.kind,'imitater');g.step();assert.equal(mimic.kind,'potatomine');assert.equal(mimic.actionIn,1500);assert.ok(mimic.imitated);
});
test('all campaign assets resolve with bought upgrades, target copies and Yeti across 100 stages',()=>{
  const p=profile(2);for(const item of SHOP)p.data.purchases[item.id]=1;
  const available=[...new Set([...Object.keys(animations.animations),...Object.keys(ACTOR_MOTION)])];
  for(const run of [1,2])for(const level of LEVEL_IDS){p.data.run=run;const g=new Game(level,30,'adventure','day',p.rules());g.seeds=[...g.config.seeds];g.imitaterTarget='potatomine';
    for(const file of Object.values(combatTextureFiles(g)))assert.ok(existsSync(`public/assets/runtime/${file}`),file);
    for(const name of animationNames(g,available))assert.ok(name in ACTOR_MOTION||name in animations.animations,name);
  }
});

test('taco handoff persists across leaving the victory screen and Yeti health matches its body pool',()=>{
  const s=storage(),p=new PlayerProfile(s);p.finish(34,1);assert.ok(new PlayerProfile(s).data.tacoPending);
  p.data.tacoReceived=true;p.data.tacoPending=false;p.save();p.finish(34,1);assert.equal(new PlayerProfile(s).data.tacoPending,false);
  assert.equal(zombieHealthFraction(zombie(100,0,{kind:'yeti',health:675})),.5);
});
