import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,tick} from './kongfu-fixture';
import {cellX,type ZombieKind} from '../src/game/level';
import {rackHP} from '../src/game/kongfu-combat';
import {battleActors,zombieRig} from '../src/rendering/resource-plan';

// Gardendless 0e4a053: KongfuBasicZombie / MonkBasicZombie / AbbotBasicZombie.
// Only an intact Kongfu helmet prevents pickup; cones and buckets do not.
const weapons:Record<string,Record<string,ZombieKind>>={
 kongfu:{torch:'kongfu_torch',hammer:'kongfu_hammer',bomb:'kongfu_bomb',flag:'kongfu_flag'},
 monk:{torch:'monk_torch',blade:'monk_blade',nunchaku:'monk_nunchaku',flag:'monk_flag'},
 abbot:{torch:'abbot_torch',fan:'abbot_fan','3section_staff':'abbot_3section_staff',flag:'abbot_flag'},
};
function rackGame(weapon:string){
 const g=create(2);g.graves=[];g.plants=[];g.zombies=[];
 g.graves.push({id:g.nextEntityId(),row:2,column:5,hp:rackHP(`kongfu_rack_${weapon}`),stage:0,kind:`kongfu_rack_${weapon}`});
 return g;
}
for(const [family,allowed] of Object.entries(weapons)){
 for(const [weapon,result] of Object.entries(allowed)){
  for(const armor of ['', '_armor1','_armor2'])test(`${family}${armor} walks into ${weapon} rack and equips it`,()=>{
   const g=rackGame(weapon),z=g.spawnZombie(`${family}${armor}` as ZombieKind,2,cellX(5)+55);
   tick(g,2);
   assert.equal(z.kind,result);assert.equal(z.armor,0);assert.equal(g.graves.length,0);
   assert.equal(z.hp,props.zombies[result].Toughness);
   if(weapon==='flag')assert.equal(g.zombies.length,4);
  });
 }
 test(`${family}: helmet stages, missing arm, frozen state and incompatible racks`,()=>{
  const g=rackGame('torch'),z=g.spawnZombie(`${family}_armor3` as ZombieKind,2,cellX(5));
  tick(g,.1);assert.equal(z.kind,`${family}_armor3`);
  g.damage(z,z.armor-Math.floor(props.armors.kongfu_armor3.Toughness/3));
  tick(g,.1);assert.equal(z.kind,`${family}_torch`);assert.equal(z.armor,0);
  const wounded=rackGame('torch'),w=wounded.spawnZombie(family as ZombieKind,2,cellX(5));
  wounded.damage(w,w.hp/2);tick(wounded,.1);assert.equal(w.kind,family);assert.equal(wounded.graves.length,1);
  const helmet=rackGame('helmet'),h=helmet.spawnZombie(`${family}_armor1` as ZombieKind,2,cellX(5));
  h.hp=props.zombies[h.kind].Toughness/2;tick(helmet,.1);
  assert.equal(h.kind,`${family}_armor3`);assert.equal(h.armor,props.armors.kongfu_armor3.Toughness);
  const frozen=rackGame('torch'),f=frozen.spawnZombie(`${family}_armor2` as ZombieKind,2,cellX(5));
  frozen.freeze(f,.5);tick(frozen,.2);assert.equal(f.kind,`${family}_armor2`);
  tick(frozen,.5);assert.equal(f.kind,`${family}_torch`);
  for(const weapon of ['torch','hammer','bomb','flag','blade','nunchaku','fan','3section_staff']){
   if(weapon in allowed)continue;
   const incompatible=rackGame(weapon),i=incompatible.spawnZombie(family as ZombieKind,2,cellX(5));
   tick(incompatible,.1);assert.equal(i.kind,family);assert.equal(incompatible.graves.length,1);
  }
 });
}
test('destroyed rack cannot be picked up; a rack only equips one zombie',()=>{
 const g=rackGame('torch');g.graves[0].hp=0;
 const z=g.spawnZombie('kongfu_armor1',2,cellX(5));tick(g,.1);assert.equal(z.kind,'kongfu_armor1');
 const other=rackGame('torch'),a=other.spawnZombie('kongfu_armor1',2,cellX(5)),b=other.spawnZombie('kongfu_armor2',2,cellX(5));
 tick(other,.1);assert.equal(a.kind,'kongfu_torch');assert.equal(b.kind,'kongfu_armor2');
});
test('nonfatal TNT explosion damages once and removes the barrel',()=>{
 const g=create(6);g.plants=[];g.graves=[];g.zombies=[];
 g.level.tnt!.TriggerGameLose=false;g.level.tnt!.DamagesToPlants=true;g.level.tnt!.DamagesToZombies=true;
 const t=g.kongfu.tnt[2];g.kongfu.tnt=[t];t.lit=true;t.length=.001;
 g.addPlant('wallnut',t.row,t.column);const p=g.plants.at(-1)!;
 const hp=p.hp;tick(g,.5);
 assert.equal(g.phase,'playing');assert.equal(p.hp,hp-1800);assert.equal(g.kongfu.tnt.length,0);
 tick(g,1);assert.equal(p.hp,hp-1800);
});
test('all 48 Kongfu levels preload torch and flag transformations for their zombie families',()=>{
 for(let day=1;day<=48;day++){
  const l=level(day),actors=battleActors(l,[]),kinds=[...l.waves.flat(),...l.bronzeStatues.flatMap(s=>s.ZombiesToSpawn)];
  const racks=[...l.graves.map(t=>t.kind),...l.actions.flat().flatMap(a=>a.graveTypes??[])];
  for(const [family,allowed] of Object.entries(weapons))if(kinds.some(k=>k===family||k.startsWith(`${family}_armor`))){
   for(const [weapon,result] of Object.entries(allowed))if(racks.includes(`kongfu_rack_${weapon}`)){
    assert.ok(actors.includes(zombieRig(result)),`kongfu${day}: ${family} + ${weapon} requires ${zombieRig(result)}`);
   }
  }
 }
});
