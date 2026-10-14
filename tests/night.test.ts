import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, type Zombie } from '../src/game/model';
import { cellX, LEVELS, type LevelId, type PlantKind } from '../src/game/config';
import { generateWaves } from '../src/game/waves';
import data from '../src/game/data/portable-adventure.json';
import { walkingSpeed } from '../src/game/zombie-motion';
import { GameClock, type GameSpeed } from '../src/game/clock';
const tick = (g: Game, n: number) => { for (let i = 0; i < n; i++) { g.step(); g.drainEvents(); } };
const loadout: PlantKind[] = ['puffshroom', 'sunshroom', 'fumeshroom', 'gravebuster', 'repeater', 'wallnut'];
function play(level: LevelId = 14, seed = 1, seeds = loadout) {
  const g = new Game(level, seed); for (const k of seeds) g.chooseSeed(k); g.start(); return g;
}
function plant(g: Game, kind: PlantKind, column: number, row: number) { g.select(kind); return g.plant(column, row); }
function zombie(kind: Zombie['kind'], x: number, row = 2): Zombie {
  return { id: 1000 + row, kind, row, x, health: 270, armor: kind === 'bucket' ? 1100 : 0,
    shield: kind === 'door' ? 1100 : kind === 'newspaper' ? 150 : 0, speed: 0, rageIn: 0, riseIn: 0,
    biteIn: 4, eating: false, wave: 0, hitAt: -100, chillIn: 0, hasPole: false, vaultIn: 0, animationTime: 0 };
}
test('night tables retain Portable waves, introductions and exact eligibility', () => {
  assert.deepEqual(data.waveCounts.slice(10,14), [10,20,10,20]);
  assert.deepEqual(data.zombies.cone.allowedLevels.slice(10,14), [0,1,1,1]);
  assert.deepEqual(data.zombies.pole.allowedLevels.slice(10,14), [0,0,0,1]);
  assert.deepEqual(data.zombies.door.allowedLevels.slice(10,14), [0,0,1,1]);
  assert.deepEqual(data.zombies.newspaper.allowedLevels.slice(10,14), [1,1,0,0]);
  assert.equal(data.zombies.newspaper.value, 2); assert.equal(data.zombies.door.value, 4);
  assert.equal(data.zombies.door.firstAllowedWave, 5);
  for (const level of [11,12,13,14] as const) {
    const waves = generateWaves(level, () => .999);
    for (const kind of waves.flat()) assert.equal(data.zombies[kind].allowedLevels[level - 1], 1);
    assert.equal(waves.length, LEVELS[level].waveCount);
  }
  assert.ok(generateWaves(11, () => 0)[5].includes('newspaper'));
  assert.ok(generateWaves(13, () => 0)[5].includes('door'));
  assert.equal(LEVELS[10].reward, 'puffshroom');
});
test('night has source grave columns and no sky sun; daytime remains unchanged', () => {
  for (const level of [11,12,13,14] as const) {
    const choices: PlantKind[] = ['puffshroom','sunflower','peashooter','wallnut','repeater','potatomine'];
    const g = play(level, 21, choices);
    assert.deepEqual(g.graves.map(g => g.column), level === 14 ? [5,6,7,7,8,8,8] : [6,7,8,8]);
    assert.equal(new Set(g.graves.map(g => `${g.column},${g.row}`)).size, g.graves.length);
    plant(g, 'puffshroom', 0, 2); tick(g, 1200); assert.equal(g.suns.length, 0); assert.equal(g.sun, 50);
    const grave = g.graves[0]; assert.equal(g.canPlant('peashooter', grave.column, grave.row), false);
  }
});
test('puffshroom is free, has a 750-tick cooldown, short range and 75-tick spores', () => {
  const g = play(); plant(g,'puffshroom',0,2); assert.equal(g.sun,50); assert.equal(g.cooldowns.puffshroom,750);
  const p=g.plants[0];g.zombies=[zombie('normal',cellX(0)+260)];p.actionIn=1;g.step();assert.equal(g.peas.length,0);
  g.zombies[0].x=cellX(0)+220;p.actionIn=1;g.step();assert.equal(g.peas.length,1);assert.equal(g.peas[0].puff,true);
  tick(g,65);assert.equal(g.zombies[0].health,250);assert.equal(g.peas.length,0);
  g.peas=[{id:700,row:1,x:200,ice:false,puff:true,age:74}];g.step();assert.equal(g.peas.length,0);
});
test('sunshroom produces 15 then 25 sun after growth; auto collection uses the actual value', () => {
  const g=play();plant(g,'sunshroom',0,0);const p=g.plants[0];p.actionIn=1;g.step();assert.equal(g.suns[0].value,15);
  g.autoCollectSun=true;g.step();assert.equal(g.sun,25);assert.equal(g.collected,0);
  tick(g,60);assert.equal(g.sun,40);assert.equal(g.collected,15);
  // Isolate the growth boundary without running waves in this unit case.
  g.ticks=11999;p.actionIn=1;tick(g,92);assert.equal(p.actionIn,1);
  g.step();assert.equal(g.sun,40);assert.equal(g.suns[0].value,25);
  tick(g,61);assert.equal(g.sun,65);assert.equal(g.collected,40);assert.equal(g.suns.length,0);
});
test('fumes hit several grounded targets, bypass paper/door shields but not bucket armor', () => {
  const g=play();g.sun=75;plant(g,'fumeshroom',0,2);const p=g.plants[0];
  g.zombies=[zombie('door',200),{...zombie('newspaper',250),id:1005},{...zombie('bucket',300),id:1006},zombie('normal',220,1),{...zombie('normal',460),id:1007}];
  p.actionIn=1;g.step();assert.deepEqual(g.zombies.map(z=>z.health),[250,250,270,270,270]);
  assert.equal(g.zombies[0].shield,1100);assert.equal(g.zombies[1].shield,150);assert.equal(g.zombies[2].armor,1080);
  assert.ok(g.events.some(e=>e.kind==='fume'));
});
test('paper shield breaks before body, gasp freezes it for 150 ticks, then source mad speed applies', () => {
  const g=play();plant(g,'puffshroom',0,0);const z=zombie('newspaper',300);z.shield=10;g.zombies=[z];
  g.peas=[{id:9,row:2,x:280,ice:false,puff:false,age:0}];g.step();assert.equal(z.shield,0);assert.equal(z.health,260);assert.equal(z.rageIn,150);
  tick(g,149);assert.equal(z.x,300);assert.equal(z.rageIn,1);g.step();assert.equal(z.rageIn,0);assert.ok(z.speed>=.89&&z.speed<=.91);
  g.step();assert.ok(Math.abs(300-z.x-walkingSpeed(z))<1e-8);
});
test('door blocks snow-pea chill while its shield survives', () => {
  const g=play();plant(g,'puffshroom',0,0);const z=zombie('door',300);g.zombies=[z];
  g.peas=[{id:9,row:2,x:280,ice:true,puff:false,age:0}];g.step();assert.equal(z.shield,1080);assert.equal(z.health,270);assert.equal(z.chillIn,0);
  z.shield=20;g.peas=[{id:10,row:2,x:280,ice:true,puff:false,age:0}];g.step();assert.equal(z.shield,0);assert.equal(z.chillIn,0);
  g.peas=[{id:11,row:2,x:280,ice:true,puff:false,age:0}];g.step();assert.equal(z.health,250);assert.equal(z.chillIn,1000);
});
test('gravebuster requires a grave, consumes it after 400 ticks, and shoveling cancels removal', () => {
  const g=play();g.sun=200;assert.equal(plant(g,'gravebuster',0,0),false);g.cancelSelection();const grave=g.graves[0];
  assert.equal(plant(g,'gravebuster',grave.column,grave.row),true);assert.equal(g.sun,125);
  assert.equal(g.canPlant('puffshroom',grave.column,grave.row),false);tick(g,399);assert.ok(g.graves.includes(grave));g.step();assert.ok(!g.graves.includes(grave));assert.equal(g.plants.length,0);
  assert.equal(plant(g,'puffshroom',grave.column,grave.row),true);
  tick(g,350);const next=g.graves[0];assert.equal(plant(g,'gravebuster',next.column,next.row),true);g.toggleShovel();g.dig(next.column,next.row);tick(g,400);assert.ok(g.graves.includes(next));
});
test('a gravebuster can be eaten before finishing, leaving its grave intact', () => {
  const g=play();g.sun=75;const grave=g.graves[0];plant(g,'gravebuster',grave.column,grave.row);
  g.zombies=[zombie('normal',cellX(grave.column)+20,grave.row)];tick(g,300);
  assert.equal(g.plants.length,0);assert.ok(g.graves.includes(grave));tick(g,101);assert.ok(g.graves.includes(grave));
});
test('final wave waits for graves, rises only once and excludes graves already removed', () => {
  const g=play(11,1,['puffshroom','sunflower','peashooter','wallnut','repeater','potatomine']);plant(g,'puffshroom',0,0);
  let finalAt=0;
  for(let i=0;i<70000;i++) {
    g.step();g.drainEvents();g.zombies=[];
    if(g.wave===g.config.waveCount){finalAt=g.ticks;break;}
  }
  assert.ok(finalAt>0);g.graves.splice(0,1);tick(g,199);assert.equal(g.phase,'playing');assert.equal(g.zombies.length,0);
  g.step();assert.equal(g.zombies.length,3);assert.ok(g.zombies.every(z=>z.kind==='normal'&&z.riseIn===150));
  const x=g.zombies[0].x;const health=g.zombies[0].health;g.peas=[{id:9000,row:g.zombies[0].row,x:x-20,ice:false,puff:false,age:0}];g.step();assert.equal(g.zombies[0].health,health);tick(g,148);assert.equal(g.zombies[0].x,x);g.step();assert.equal(g.zombies[0].riseIn,0);
  g.zombies=[];g.step();assert.equal(g.phase,'won');
});
test('night sun, tombstones, waves and movement remain identical at 1x/2x/4x and pause', () => {
  function run(speed:GameSpeed) {const g=play();plant(g,'sunshroom',0,0);g.autoCollectSun=true;const c=new GameClock();c.speed=speed;for(let n=0;n<3000/speed;n++)c.advance(g,20,()=>{});return g;}
  const g=run(1);assert.deepEqual(run(2),g);assert.deepEqual(run(4),g);g.drainEvents();g.pause();const before=JSON.stringify(g);tick(g,100);assert.equal(JSON.stringify(g),before);
});
test('all four night levels can be won with ordinary six-slot selection, sun collection and planting', () => {
  for(const level of [11,12,13,14] as const) for(const seed of [1,23,123456]) {
    const production:PlantKind=level===11?'sunflower':'sunshroom';
    const attack:PlantKind=level>=13?'fumeshroom':'peashooter';
    const utility:PlantKind=level===14?'gravebuster':'potatomine';
    const g=play(level,seed,['puffshroom',production,attack,'repeater','wallnut',utility]);
    const place=(k:PlantKind,c:number,r:number)=> { if(g.canPlant(k,c,r)) return plant(g,k,c,r);return false; };
    for(let n=0;n<100000&&g.phase==='playing';n++) {
      for(const sun of [...g.suns])g.collectSun(sun.id);
      const rows=[...g.config.rows].sort((a,b)=>{
        const pressure=(r:number)=>g.plants.filter(p=>p.row===r&&p.kind==='puffshroom').length*900+Math.min(900,...g.zombies.filter(z=>z.row===r&&z.health>=90).map(z=>z.x));return pressure(a)-pressure(b);
      });
      for(const row of rows) {let planted=false;for(const column of [5,4,6,3,7,2,8])if(place('puffshroom',column,row)){planted=true;break;}if(planted)break;}
      for(const row of g.config.rows) if(place(production,0,row))break;
      const producers=g.plants.filter(p=>p.kind===production).length;
      if(producers>=4) {
        for(const row of rows) if(place('repeater',1,row))break;
        for(const row of rows) if(place(attack,2,row))break;
        if(level===14)for(const grave of g.graves)if(place('gravebuster',grave.column,grave.row))break;
      }
      g.step();g.drainEvents();
    }
    assert.equal(g.phase,'won',`level ${level} seed ${seed} wave ${g.wave} ticks ${g.ticks} kills ${g.kills}`);
    assert.ok(g.kills>=g.waves.flat().length);assert.ok(g.sun>=0);
  }
});
