import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/model';
import { GameClock } from '../src/game/clock';
import { SURVIVAL_SCENES, type PlantKind } from '../src/game/config';
import { generateSurvivalWaves, survivalRoster } from '../src/game/survival';
import { clearSurvival, completedLevel, completeLevel, loadSurvival, saveSurvival } from '../src/platform/storage';
import { animationNames } from '../src/rendering/asset-plan';
const modes = ['survival-normal','survival-hard'] as const;
const select = (g: Game) => { for (const p of g.config.seeds.slice(0,10)) g.chooseSeed(p); g.start(); };

test('ten finite survival challenges follow source rows, waves, flags and first-stage enemies', () => {
  for (const mode of modes) for (const scene of SURVIVAL_SCENES) {
    const g = new Game(9, 23, mode, scene); select(g);
    assert.equal(g.config.rows.length, scene==='pool'||scene==='fog'?6:5);
    assert.equal(g.config.waveCount, mode==='survival-normal'?10:20);
    assert.equal(g.survivalGoal, mode==='survival-normal'?5:10);
    assert.equal(g.sun,50); assert.equal(g.seeds.length,10);
    assert.deepEqual(g.survivalEnemies,mode==='survival-normal'?['normal','cone']:['normal','cone','bucket']);
    assert.equal(g.graves.length,scene==='night'?9:0);
    assert.equal(g.plants.filter(p=>p.kind==='flowerpot').length,scene==='roof'?15:0);
    assert.deepEqual(g.waves.flatMap((wave,i)=>wave.includes('flag')?[i+1]:[]),mode==='survival-normal'?[10]:[10,20]);
  }
});
test('finite survival budgets advance by 10/20 waves; normal excludes late types and hard excludes spawned units/non-roof bungees', () => {
  for(const mode of modes) for(const scene of SURVIVAL_SCENES) for(let stage=1;stage<5;stage++) for(const random of [0,.19,.2,.5,.999]){
    const roster=survivalRoster(stage,()=>random,scene,mode);
    assert.equal(roster.length,stage+3);assert.equal(new Set(roster).size,roster.length);
    assert.ok(!roster.includes('bobsled'));
    if(scene!=='roof')assert.ok(!roster.includes('bungee'));
    if(scene==='roof')assert.ok(!roster.includes('digger')&&!roster.includes('dancer'));
    if(scene==='night')assert.ok(!roster.includes('zomboni'));
    if(scene!=='pool'&&scene!=='fog')assert.ok(!roster.includes('snorkel')&&!roster.includes('dolphin'));
    if(mode==='survival-normal')assert.ok(roster.every(k=>['normal','cone','pole','bucket','newspaper','door','football','dancer','snorkel'].includes(k)));
    const waves=generateSurvivalWaves(stage,['normal'],()=>0,mode),count=mode==='survival-normal'?10:20;
    for(const [i,wave] of waves.entries()){
      const points=Math.floor((stage*count+i)*2/5)+1;
      assert.equal(wave.length,Math.min(50,i%10===9?Math.trunc(points*2.5):points));
    }
  }
});
test('all ten challenges retain the board between rounds and win once after the fifth cleared round', () => {
  for(const mode of modes)for(const scene of SURVIVAL_SCENES){
    const g=new Game(9,23,mode,scene);select(g);
    for(let stage=0;stage<5;stage++){
      g.wave=g.config.waveCount;g.zombies=[];g.step();
      assert.equal(g.phase,stage===4?'won':'intermission');
      assert.equal(g.survivalFlags,(stage+1)*g.config.waveCount/10);
      assert.equal(g.drainEvents().filter(e=>e.kind==='win').length,stage===4?1:0);
      const stable=g.snapshot();for(let i=0;i<10;i++)g.step();assert.deepEqual(g.snapshot(),stable);
      if(stage===4){g.nextSurvivalStage();assert.equal(g.phase,'won');continue;}
      const preserved={plants:structuredClone(g.plants),sun:g.sun,mowers:structuredClone(g.mowers),cooldowns:structuredClone(g.cooldowns)};
      g.nextSurvivalStage();assert.equal(g.phase,'ready');assert.equal(g.survivalStage,stage+1);
      assert.deepEqual({plants:g.plants,sun:g.sun,mowers:g.mowers,cooldowns:g.cooldowns},preserved);g.start();
    }
  }
});
test('a live final flag does not count as cleared, and finite upgrades keep their base cost', () => {
  const g=new Game(9,23,'survival-normal','day');select(g);g.survivalStage=4;g.wave=10;
  g['spawnZombie']('normal',2,700,9);g.step();assert.equal(g.phase,'playing');assert.equal(g.survivalFlags,4);
  g.plants.push({id:100,kind:'wintermelon',row:2,column:0,health:300,actionIn:100,born:0,shotAt:0});assert.equal(g.plantCost('wintermelon'),200);
  g.zombies=[];g.step();assert.equal(g.phase,'won');assert.equal(g.survivalFlags,5);
});
test('finite saves restore difficulty, stage, RNG and pause; all 15 save slots remain separate from adventure', () => {
  const records=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>records.get(k)??null,setItem:(k:string,v:string)=>records.set(k,v),removeItem:(k:string)=>records.delete(k)}});
  completeLevel(3);
  for(const mode of ['endless',...modes] as const)for(const scene of SURVIVAL_SCENES){
    const g=new Game(9,23,mode,scene);select(g);for(let t=0;t<2000;t++)g.step();g.drainEvents();g.pause();saveSurvival(g,2);
    const saved=loadSurvival(scene,mode)!;const restored=Game.restore(saved.game);
    assert.equal(saved.speed,2);assert.equal(restored.scenario,mode);assert.equal(restored.config.waveCount,g.config.waveCount);
    assert.deepEqual(restored.snapshot(),g.snapshot());g.resume();restored.resume();for(let t=0;t<100;t++){g.step();restored.step();}assert.deepEqual(restored.snapshot(),g.snapshot());
  }
  assert.equal(records.size,16);assert.equal(completedLevel(),3);
  clearSurvival('pool','survival-hard');assert.equal(loadSurvival('pool','survival-hard'),null);assert.ok(loadSurvival('pool','survival-normal'));assert.ok(loadSurvival('pool'));assert.equal(completedLevel(),3);
});
test('finite survival retains frame-rate/speed independence and loads only current roster assets', () => {
  for(const mode of modes){
    const run=(hz:number,speed:1|2|4)=>{const g=new Game(9,23,mode,'day');select(g);const clock=new GameClock();clock.speed=speed;for(let i=0;i<hz*20/speed;i++)clock.advance(g,1000/hz,()=>{});return g.snapshot();};
    for(const hz of [30,60,144])for(const speed of [1,2,4] as const)assert.deepEqual(run(hz,speed),run(60,1));
    const g=new Game(9,23,mode,'day');g.seeds=['sunflower','peashooter','wallnut','repeater','squash','cherrybomb'] satisfies PlantKind[];
    assert.ok(!animationNames(g,['gargantuar-walk','melonpult','zombie-walk']).includes('gargantuar-walk'));
    g.survivalStage=3;g.phase='intermission';g.nextSurvivalStage();assert.ok(g.waves.length===g.config.waveCount);
  }
});

test('finite roof final wave drops three zombies as in Board::SpawnZombiesFromSky', () => {
  for(const mode of modes){const g=new Game(9,23,mode,'roof');select(g);g.wave=g.config.waveCount;g['graveWaveIn']=1;g.step();assert.equal(g.zombies.length,3);}
});
