import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Game,type Zombie} from '../src/game/model';
import {readLevel,cellX,rowY,type Properties,type SourceLevel,type AnimationTiming} from '../src/game/level';
import {animationTimeline,type Skeleton} from '../src/rendering/presentation';
import type {CampaignCatalog} from '../src/rendering/battle-art';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import {islandStates} from '../src/shell/navigation';
import type {WorldMap} from '../src/shell/types';
const read=<T>(path:string):T=>JSON.parse(readFileSync(new URL('../public/assets/'+path,import.meta.url),'utf8'));
const base=read<Properties>('levels/properties.json'),extra=read<Properties>('campaign/properties.json');
const props:Properties={...extra,plants:{...base.plants,...extra.plants},zombies:{...base.zombies,...extra.zombies,mummy_flag:read('battle/flag.json')},armors:{...base.armors,...extra.armors}};
const catalog=read<CampaignCatalog>('campaign/catalog.json');
const timeline=(actor:string,animation:string)=>animationTimeline(read<Skeleton>(`campaign/rigs/${catalog.actors[actor].rig}/skeleton.json`),catalog.actors[actor].armature,animation);
const timing:AnimationTiming={shoot:.5,shootDuration:26/30,produce:23/30,produceDuration:40/30,mineGrow:.6,mineExplode:14/30,mineDeath:.5,raStart:25/30,raEnd:25/30,
 campaign:{cabbage:timeline('cabbagepult','Lob').events.Lob,cabbageDuration:timeline('cabbagepult','Lob').duration,cabbageFood:timeline('cabbagepult','Food').events.lobFood,cabbageFoodEnd:timeline('cabbagepult','Food').events.foodEnd,
 boomerang:timeline('bloomerang','Shoot').events.Shoot,boomerangDuration:timeline('bloomerang','Shoot').duration,boomerangCatch:timeline('bloomerang','Catch').duration,ice:timeline('iceburg','Death').events.explode,iceDuration:timeline('iceburg','Death').duration,iceFood:timeline('iceburg','Food').events.foodExplode/.8,iceFoodEnd:timeline('iceburg','Food').events.foodEnd/.8}};
const level=(day:number)=>readLevel(read<SourceLevel>(`campaign/egypt${day}.source.json`));
const create=(day:number)=>new Game(level(day),props,timing,z=>({x:z.x-25,y:rowY(z.row)-95}),1234);
const tick=(g:Game,n:number)=>{for(let i=0;i<Math.round(n*60);i++)g.tick(1/60);};
let serial=9000;
const zombie=(row:number,x:number):Zombie=>({id:serial++,kind:'mummy',row,x,hp:190,armor:0,eating:false,absorbed:0,absorbUntil:0,absorbState:'idle',absorbAt:0,deathCause:'normal',frozenUntil:0,chilledUntil:0,food:false,entry:'walk',entryAt:0,entryX:x,camelPart:0,team:0,leap:null});

test('five source levels retain their different wave counts, forced rows, night rules and graves',()=>{
 assert.deepEqual([2,3,4,5,6].map(day=>level(day).waves.length),[9,12,10,5,10]);
 assert.deepEqual(level(2).actions[0][0].zombies,[{kind:'mummy',row:2}]);
 assert.equal(level(2).actions[0][0].food,1);
 assert.deepEqual([2,3,4,5,6].map(d=>level(d).graves.length),[0,3,10,0,5]);
 assert.equal(level(4).sunDrops,false);assert.equal(level(5).mowers,false);assert.equal(level(5).powerups,true);
 assert.equal(level(4).minHealth,.5);assert.equal(level(6).maxHealth,.65);
 assert.equal(level(3).actions[11][1].mode,'storm');
});

test('Egypt 2 tutorial gives its pea, and only marked zombies drop collectible plant food',()=>{
 const g=create(2);assert.equal(g.plants[0].row,2);assert.equal(g.plants[0].column,2);assert.equal(g.sun,50);
 tick(g,15.6);assert.equal(g.zombies[0].row,2);assert.equal(g.zombies[0].food,true);
 g.zombies[0].hp=0;tick(g,.1);assert.equal(g.food,0);assert.equal(g.pickups.length,1);
 const id=g.pickups[0].id;g.collectPickup(id);g.collectPickup(id);assert.equal(g.food,1);
 assert.equal(g.plantFood(2,2),true);assert.equal(g.food,0);
});

test('graves block planting and peas; cabbage targets a zombie behind a grave',()=>{
 const g=create(3);g.sun=500;assert.equal(g.plant('wallnut',1,5),false);
 g.plant('cabbagepult',1,1);const z=zombie(1,cellX(8));g.zombies.push(z);
 const grave=g.graves.find(g=>g.row===1&&g.column===5)!;
 g.peas.push({id:8000,row:1,x:cellX(5)-35,y:rowY(1)-48,damage:20,powered:false});
 tick(g,3);assert.ok(z.hp<190);assert.equal(grave.hp,680);
});

test('boomerang damages outbound and returning targets, iceberg freezes without being eaten',()=>{
 const g=create(6);g.sun=500;g.graves=[];g.plant('bloomerang',2,1);
 const z=zombie(2,600);g.zombies.push(z);tick(g,3.5);assert.ok(z.hp<=150);
 g.plant('iceburg',2,4);z.x=cellX(4)+25;tick(g,1);
 assert.ok(z.frozenUntil>g.time);const x=z.x;tick(g,2);assert.equal(z.x,x);assert.ok(!g.plants.some(p=>p.kind==='iceburg'));
});

test('storm groups arrive on their authored delays and camel boards reveal three inner mummies',()=>{
 const l=level(6);l.actions=[l.actions[9]];l.waves=[l.waves[9]];l.flagInterval=100;
 const g=new Game(l,props,timing,z=>({x:z.x,y:rowY(z.row)}),4);tick(g,15.6);
 assert.equal(g.zombies.filter(z=>z.entry==='storm').length,0);tick(g,3.1);assert.equal(g.zombies.filter(z=>z.entry==='storm').length,1);
 tick(g,6);assert.equal(g.zombies.filter(z=>z.entry==='storm').length,3);
 const camelLevel=level(6),action=camelLevel.actions.flat().find(a=>a.zombies.some(z=>z.kind==='camel_onehump'))!;
 camelLevel.actions=[[{...action,zombies:[{kind:'camel_onehump',row:2}]}]];camelLevel.waves=[['camel_onehump']];camelLevel.flagInterval=100;
 const camel=new Game(camelLevel,props,timing,z=>({x:z.x,y:rowY(z.row)}),4);tick(camel,15.6);
 assert.equal(camel.zombies.length,3);assert.equal(new Set(camel.zombies.map(z=>z.team)).size,1);
 const z=camel.zombies[0];z.x=700;camel.peas.push({id:8000,row:2,x:675,y:rowY(2)-48,damage:260,powered:false});tick(camel,.1);
 assert.equal(z.kind,'mummy');assert.equal(z.armor,0);assert.equal(z.hp,180);
});

test('conveyor packets are free, consumed individually, refill on source delays and never generate sun',()=>{
 const g=create(4);tick(g,.1);assert.equal(g.conveyor.length,1);assert.equal(g.suns.length,0);
 const packet=g.conveyor[0];assert.equal(g.plant(packet.kind,2,0,packet.id),true);assert.equal(g.sun,50);assert.equal(g.conveyor.length,0);
 assert.equal(g.plant(packet.kind,2,1,packet.id),false);tick(g,7.1);assert.equal(g.conveyor.length,1);assert.equal(g.suns.length,0);
});

test('powerup tutorial has timed pointer attacks, no planting or mowers, and one collectible sprout',()=>{
 const g=create(5);assert.ok(g.mowers.every(m=>m.spent));g.sun=999;assert.equal(g.plant('peashooter',0,0),false);
 const z=zombie(2,600);z.kind='ra';z.hp=300;g.zombies.push(z);
 g.selectPower('zap');g.powerPointer(600,rowY(2)-50,true);tick(g,.25);
 assert.equal(g.zombies.length,0);assert.equal(g.pickups[0].kind,'sprout');g.collectPickup(g.pickups[0].id);assert.equal(g.sprouts,1);
 assert.equal(g.selectPower('fire'),false);tick(g,3);assert.equal(g.power,null);assert.equal(g.selectPower('fire'),true);
});

for(const day of [2,3,4,5,6])test(`Egypt ${day} can finish with legal planting, collection and available powerups`,()=>{
 const g=create(day);
 for(let frame=0;frame<60*700&&g.phase==='playing';frame++){
  for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   const occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c);
   const threats=[...g.zombies].sort((a,b)=>a.x-b.x);
   if(day===5){
    if(!g.power&&threats.length)g.selectPower('zap');
    if(g.power)g.powerPointer(threats[0]?.x??cellX(4),threats[0]?rowY(threats[0].row)-50:rowY(2),true);
   }else if(day===4){
    for(const card of [...g.conveyor]){
     const counts=Array.from({length:5},(_,r)=>g.plants.filter(p=>p.row===r&&['bloomerang','cabbagepult'].includes(p.kind)).length);
     const rows=[0,1,2,3,4].sort((a,b)=>counts[a]-counts[b]||Number(threats.some(z=>z.row===b))-Number(threats.some(z=>z.row===a)));
     for(const row of rows){const cols=card.kind==='wallnut'?[4,3,2,1,0]:card.kind==='potatomine'?[3,4,2,1,0]:[0,1,2,3,4];if(cols.some(c=>g.plant(card.kind,row,c,card.id)))break;}
    }
   }else{
    for(const z of threats)if(!g.plants.some(p=>p.row===z.row&&['peashooter','cabbagepult','bloomerang'].includes(p.kind)))g.plant(day===2?'peashooter':'cabbagepult',z.row,2);
    for(let row=0;row<5;row++)if(!occupied(row,0))g.plant('sunflower',row,0);
    for(let row=0;row<5;row++)if(!occupied(row,1))g.plant('sunflower',row,1);
    for(const c of [2,3,4])for(let row=0;row<5;row++)if(!occupied(row,c))g.plant(day===2?'peashooter':day===6?'bloomerang':'cabbagepult',row,c);
    for(const z of threats)if(z.x<700){g.plant('wallnut',z.row,5);if(day===6)g.plant('iceburg',z.row,Math.floor((z.x-190)/82));}
   }
   const target=threats.find(z=>z.x<1000);
   if(target){const p=g.plants.find(p=>p.row===target.row&&['peashooter','cabbagepult','bloomerang'].includes(p.kind));if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`day ${day}, time ${g.time}, wave ${g.wave}, kills ${g.kills}, sun ${g.sun}`);
 assert.equal(g.wave,g.level.waves.length);
});

test('five first clears persist their rewards and open only the original following nodes',()=>{
 const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
 const progress=new ProgressStore(storage),map=read<WorldMap>('shell/maps/egypt.json');progress.finish('egypt','egypt1');
 for(let day=2;day<=6;day++){
  const id=`egypt${day}`;progress.finish('egypt',id,day===5?1:0);
  for(const event of completionEvents(map,id,progress.completed(map),progress.rewardNodes('egypt')))if(event.action==='reward')progress.award('egypt',map.islands.find(n=>n.node===event.node)!);
  progress.finishPresentation();progress.finish('egypt',id,1);assert.equal(progress.pending(),null);
 }
 assert.deepEqual([...progress.ownedPlants()],[0,1,2,3,4,5,6]);
 assert.equal(progress.campaignRewards().length,3);assert.equal(new ProgressStore(storage).campaignRewards()[1].count,1);
 const seven=map.islands.find(n=>n.kind===0&&n.levels.includes('egypt7'))!;
 assert.equal(islandStates(map,progress.completed(map),progress.rewardNodes('egypt')).get(seven.node),'open');
});

test('campaign assets, source rows, and event timings match the pinned extraction manifest',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../campaign-provenance.json',import.meta.url),'utf8'));
 for(const [path,expected] of Object.entries(manifest.outputs) as [string,{bytes:number;sha256:string}][]){const data=readFileSync(new URL('../public/assets/'+path,import.meta.url));assert.equal(data.length,expected.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),expected.sha256);}
 assert.ok(timing.campaign!.cabbage>0);assert.ok(timing.campaign!.ice>0);assert.ok(timing.campaign!.iceFood>0);
 for(const spec of Object.values(catalog.rigs)){const skeleton=read<Skeleton>(`campaign/rigs/${spec.rig}/skeleton.json`);assert.ok(skeleton.armature.find(a=>a.name===spec.armature));}
});

test('cherry affects the clicked 3×3 area and does not explode again while held',()=>{
 const g=create(5),near=zombie(2,cellX(4)),far=zombie(0,cellX(0));near.hp=2000;far.hp=2000;g.zombies.push(near,far);
 g.selectPower('cherry');g.powerPointer(cellX(4),rowY(2)-50,true,true);
 assert.equal(near.hp,200);assert.equal(far.hp,2000);tick(g,.25);assert.equal(near.hp,200);
 g.powerPointer(cellX(4),rowY(2)-50,false);g.powerPointer(cellX(0),rowY(0)-50,true,true);assert.equal(far.hp,200);
});

test('snow direct hit excludes that target from splash and chills neighboring lanes',()=>{
 const g=create(5),direct=zombie(2,cellX(4)),neighbor=zombie(1,cellX(4)),far=zombie(0,cellX(0));
 direct.hp=1000;neighbor.hp=1000;g.zombies.push(direct,neighbor,far);
 g.selectPower('snow');g.powerPointer(cellX(4),rowY(2)-50,true);tick(g,1/60);g.powerPointer(cellX(4),rowY(2)-50,false);tick(g,.8);
 assert.equal(direct.hp,650);assert.equal(neighbor.hp,995);assert.equal(far.hp,190);
 assert.ok(direct.chilledUntil>g.time);assert.ok(neighbor.chilledUntil>g.time);assert.equal(far.chilledUntil,0);
});

test('toss lifts once per swipe and a second rightward swipe throws the airborne zombie away',()=>{
 const g=create(5),z=zombie(2,600);g.zombies.push(z);g.selectPower('toss');
 g.powerPointer(580,rowY(2)-60,false);g.powerPointer(600,rowY(2)-60,true,true);assert.ok(z.leap);
 g.powerPointer(620,rowY(2)-60,true);assert.equal(z.hp,190);
 g.powerPointer(590,rowY(2)-60,false);g.powerPointer(610,rowY(2)-60,true,true);tick(g,.05);
 assert.equal(g.zombies.length,0);assert.equal(g.deaths[0].cause,'toss');
});

test('grave debris follows damage stages rather than spawning on every pea impact',()=>{
 const g=create(3),grave=g.graves[0];
 const hit=(damage:number)=>{g.effects=[];g.peas.push({id:serial++,row:grave.row,x:cellX(grave.column)-35,y:rowY(grave.row)-48,damage,powered:false});tick(g,.05);return g.effects.filter(e=>e.kind==='graveHit').map(e=>e.stage);};
 assert.deepEqual(hit(20),[1]);assert.deepEqual(hit(20),[]);assert.deepEqual(hit(200),[2]);assert.deepEqual(hit(500),[4]);
 assert.ok(!g.graves.includes(grave));
});

test('campaign combat and particle animation names resolve in the exported native rigs',()=>{
 const rigs:[string,string|undefined,string[]][]=[
  ['grave',undefined,['Idle']],['grave','Particle',['Play1','Play2','Play3','Play4']],
  ['sandstorm',undefined,['Idle','Die']],['conveyor',undefined,['Idle']],['dirtSpawn',undefined,['Play']],
  ['food',undefined,['Idle']],['sprout',undefined,['Idle']],['iceTrap',undefined,['Idle','Die']],
  ['powerSnow',undefined,['Idle']],['snowHit',undefined,['Play']],['cherryExplosion',undefined,['Play']],
  ['wizardFinger',undefined,['Idle']],['wizardPoint',undefined,['Idle']],['tossPar',undefined,['Play']],
  ['flameFinger',undefined,['Idle']],['flameSquare',undefined,['Play']],
  ['cabbage','Projectile1',['Idle']],['cabbage','Projectile2',['Idle']],['cabbage','Particle1',['Pop']],
  ['boomerang','Projectile0',['Idle']],['boomerang','Projectile1',['Idle']],['boomerang','Particle0',['Hit']],
 ];
 for(const [name,armature,animations] of rigs){const spec=catalog.rigs[name],skeleton=read<Skeleton>(`campaign/rigs/${spec.rig}/skeleton.json`);for(const animation of animations)assert.ok(skeleton.armature.find(a=>a.name===(armature??spec.armature))!.animation.some(a=>a.name===animation),`${name}/${animation}`);}
 for(const [name,animations] of Object.entries({cabbagepult:['Idle','Lob','Food','Death'],bloomerang:['Idle','Shoot','Catch','Food','Death'],iceburg:['Idle','Death','Food'],camel:['Walk','Eat','Death']}))for(const animation of animations)assert.ok(timeline(name,animation).duration>0,`${name}/${animation}`);
});
