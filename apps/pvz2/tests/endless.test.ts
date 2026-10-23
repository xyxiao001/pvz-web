import test from 'node:test';
import assert from 'node:assert/strict';
import {read,props as previous} from './modern-fixture';
import {timing} from './future-fixture';
import {Game} from '../src/game/model';
import {readLevel,rowY,type Properties} from '../src/game/level';
import {generateEndless} from '../src/game/endless-generator';
import {ENDLESS_WORLDS,ENDLESS_LEVELS,newEndlessRun,offerEndlessPlants,advanceEndless} from '../src/game/endless';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore} from '../src/shell/progression';
const extra=read('endless/properties.json');
export const props:Properties={...previous,zombies:{...previous.zombies,...extra.zombies},plantAnimations:{...previous.plantAnimations,...extra.plantAnimations}};
for(const world of ENDLESS_WORLDS)test(`${world} standard endless generates playable rounds with native resources`,()=>{
 const raw=read(`endless/${world}.source.json`),unchanged=JSON.stringify(raw),config=ENDLESS_LEVELS[`endless_${world}`],catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 for(const round of [1,8,30,100])for(const seed of [1234,8675]){
  const source=generateEndless(raw,round,seed),l=readLevel(source),initial=newEndlessRun(world,seed).plants;
  assert.deepEqual(source,generateEndless(raw,round,seed));assert.ok(l.waves.length>=10&&l.waves.length<=40);assert.equal(l.waves.length%10,0);assert.equal(l.boss,null);assert.equal(l.conveyor,null);assert.equal(l.day,0);
  for(const z of [...l.waves.flat(),...l.frozenZombies.map(z=>z.kind)])assert.ok(props.zombies[z],z);
  for(const name of battleActors(l,initial)){const a=actors[name];assert.ok(a||['peashooter','sunflower','wallnut','potatomine','mummy','ra'].includes(name),`${world}: ${name}`);}
  for(const name of battleEffects(l,initial))assert.ok(rigs[name],`${world}: ${name}`);
  const game=new Game(l,props,timing,z=>({x:z.x,y:rowY(z.row)-95}),seed,false);for(let i=0;i<180;i++)game.tick(1/60);assert.ok(Number.isFinite(game.sun));
  for(const action of l.actions.flat())for(const z of action.zombies)assert.ok(z.row===null||Number.isFinite(z.row));
 }
 assert.equal(JSON.stringify(raw),unchanged);
});
test('endless checkpoints preserve draft, food and mowers without modifying mainline progress',()=>{
 const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}},store=new ProgressStore(storage);
 store.finish('pirate','pirate4',0);assert.ok(store.endlessUnlocked('pirate'));assert.ok(!store.endlessUnlocked('egypt'));
 const mainline=[...data],run=store.startEndless('pirate',71);offerEndlessPlants('pirate',run,new Set(['peashooter','sunflower','wallnut','kernelpult','melonpult','spikeweed','gravebuster','tanglekelp','lilypad']));assert.equal(run.choices.length,3);assert.ok(!run.choices.includes('gravebuster'));store.saveEndless('pirate',run);assert.deepEqual(new ProgressStore(storage).endlessRun('pirate'),run);
 run.plants.push(run.choices[0]);run.choices=[];run.chosen=true;advanceEndless(run,3,[true,false,true,false,true]);store.saveEndless('pirate',run);const saved=store.endlessRun('pirate')!;assert.equal(saved.round,2);assert.equal(saved.best,1);assert.equal(saved.food,3);assert.equal(saved.mowers.filter(Boolean).length,3);for(const [k,v] of mainline)assert.equal(data.get(k),v);const reset=store.startEndless('pirate',5);assert.equal(reset.round,1);assert.equal(reset.best,1);assert.equal(reset.food,0);assert.ok(reset.mowers.every(Boolean));
});
for(const world of ENDLESS_WORLDS)test(`${world} endless round settles after controlled removal of enemies`,()=>{
 const l=readLevel(generateEndless(read(`endless/${world}.source.json`),12,8521)),g=new Game(l,props,timing,z=>({x:z.x,y:rowY(z.row)-95}),8521,false);
 for(let i=0;i<45000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,1000000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,l.waves.length);assert.equal(g.modern.pending,false);
});
test('modern endless enemies use balloon armor, Allstar charge and kicked Superfan explosion',()=>{
 const l=readLevel(generateEndless(read('endless/modern.source.json'),1,1234)),g=new Game(l,props,timing,z=>({x:z.x,y:rowY(z.row)-95}),1234,false);Object.assign(g,{nextWave:Infinity});
 const balloon=g.spawnZombie('modern_balloon',0,600),health=balloon.hp;g.damage(balloon,600);assert.equal(balloon.hp,health);assert.equal(balloon.balloon,50);g.damage(balloon,80);assert.equal(balloon.hp,health-30);assert.equal(g.modern.animation(balloon),'Land');
 const star=g.spawnZombie('modern_allstar',2,700),imp=g.spawnZombie('modern_superfanimp',2,670);assert.equal(g.modern.speed(star),extra.zombies.modern_allstar.RunningSpeedScale);g.modern.zombie(star,1/60);assert.ok(imp.leap);assert.equal(g.modern.animation(imp),'Fly_Kicked');
 for(let i=0;i<300;i++)g.tick(1/60);assert.ok(imp.hp<=0);
 const cold=g.spawnZombie('modern_superfanimp',3,700);g.chill(cold,5);assert.equal(g.modern.enemies.states.get(cold.id)!.ignited,false);
});
test('endless portal count and draft choices persist exactly',()=>{
 const run=newEndlessRun('modern',1234);offerEndlessPlants('modern',run,new Set(['peashooter','sunflower','wallnut','potatomine','kernelpult','melonpult']));assert.equal(run.choices.length,4);const choices=[...run.choices];offerEndlessPlants('modern',run,new Set(['peashooter']));assert.deepEqual(run.choices,choices);
 const l=readLevel(generateEndless(read('endless/modern.source.json'),30,8521)),g=new Game(l,props,timing,z=>({x:z.x,y:rowY(z.row)-95}),1234,false);g.modern.portal({row:2,column:6,kind:'dangerroom_dino',count:2});assert.equal(g.modern.portals[0].queue.length,2);
});
test('standard endless outputs retain pinned resource hashes',async()=>{
 const {readFile}=await import('node:fs/promises'),{createHash}=await import('node:crypto');
 const provenance=JSON.parse(await readFile(new URL('../endless-provenance.json',import.meta.url),'utf8'));
 assert.equal(provenance.commit,'0e4a05348b6de328e2902a57afa24a3a454a4205');
 for(const [file,info] of Object.entries(provenance.outputs) as [string,{bytes:number;sha256:string}][]){const bytes=await readFile(new URL('../public/assets/'+file,import.meta.url));assert.equal(bytes.length,info.bytes,file);assert.equal(createHash('sha256').update(bytes).digest('hex'),info.sha256,file);}
});
