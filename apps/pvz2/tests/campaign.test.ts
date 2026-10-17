import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Game,type Zombie} from '../src/game/model';
import {readLevel,cellX,rowY,type Properties,type SourceLevel,type AnimationTiming} from '../src/game/level';
import {animationTimeline,specialAnimationTiming,bonkAnimationTiming,type Skeleton} from '../src/rendering/presentation';
import type {CampaignCatalog} from '../src/rendering/battle-art';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import {islandStates} from '../src/shell/navigation';
import type {WorldMap} from '../src/shell/types';
const read=<T>(path:string):T=>JSON.parse(readFileSync(new URL('../public/assets/'+path,import.meta.url),'utf8'));
const base=read<Properties>('levels/properties.json'),extra=read<Properties>('campaign/properties.json');
const props:Properties={...extra,plants:{...base.plants,...extra.plants},zombies:{...base.zombies,...extra.zombies,mummy_flag:read('battle/flag.json')},armors:{...base.armors,...extra.armors}};
const catalog=read<CampaignCatalog>('campaign/catalog.json');
const timeline=(actor:string,animation:string)=>animationTimeline(read<Skeleton>(`campaign/rigs/${catalog.actors[actor].rig}/skeleton.json`),catalog.actors[actor].armature,animation);
const nutFood=animationTimeline(read<Skeleton>('actors/wallnut/skeleton.json'),'Wall-nut','Food');
const timing:AnimationTiming={wallnutArmor:nutFood.events.wearArmor,wallnutFoodEnd:nutFood.events.foodEnd,shoot:.5,shootDuration:26/30,produce:23/30,produceDuration:40/30,mineGrow:.6,mineExplode:14/30,mineDeath:.5,raStart:25/30,raEnd:25/30,
 campaign:{cabbage:timeline('cabbagepult','Lob').events.Lob,cabbageDuration:timeline('cabbagepult','Lob').duration,cabbageFood:timeline('cabbagepult','Food').events.lobFood,cabbageFoodEnd:timeline('cabbagepult','Food').events.foodEnd,
 boomerang:timeline('bloomerang','Shoot').events.Shoot,boomerangDuration:timeline('bloomerang','Shoot').duration,boomerangCatch:timeline('bloomerang','Catch').duration,ice:timeline('iceburg','Death').events.explode,iceDuration:timeline('iceburg','Death').duration,iceFood:timeline('iceburg','Food').events.foodExplode/.8,iceFoodEnd:timeline('iceburg','Food').events.foodEnd/.8}};
timing.special=specialAnimationTiming(new Map(Object.entries(catalog.actors).map(([name,rig])=>[name,read<Skeleton>(`campaign/rigs/${rig.rig}/skeleton.json`)])));
timing.bonk=bonkAnimationTiming(read<Skeleton>(`campaign/rigs/${catalog.actors.bonkchoy.rig}/skeleton.json`));
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

test('Egypt 7–11 preserve authored modes, initial plants, random graves and preset cards',()=>{
 assert.deepEqual([7,8,9,10,11].map(d=>level(d).waves.length),[9,18,10,16,16]);
 assert.equal(level(7).match!.types,3);assert.equal(level(7).suppressFlag,true);assert.equal(level(7).mowers,false);
 assert.deepEqual(level(7).actions[0][0].zombies[0],{kind:'camel_onehump_touch',row:3,column:6});
 assert.ok(level(8).conveyor!.InitialPlantList.some(p=>p.PlantType==='iceburg'));
 assert.equal(level(9).initialPlants.length,4);const nine=create(9);assert.equal(nine.plants.length,4);assert.equal(nine.plants.filter(p=>p.kind==='iceweed').length,2);
 const eleven=create(11);assert.equal(eleven.graves.length,4);assert.equal(new Set(eleven.graves.map(g=>`${g.row}/${g.column}`)).size,4);assert.ok(eleven.graves.every(g=>g.column>=6&&g.column<=8));
 assert.deepEqual(level(11).preset,['sunflower','twinsunflower','wallnut','potatomine','peashooter','bloomerang']);
});

test('camel pairs flip back after a mismatch, match in two stages, pause, and complete all nine waves',()=>{
 const g=create(7);tick(g,6);assert.equal(g.zombies.length,6);assert.equal(g.suns.length,0);assert.equal(g.plant('peashooter',0,0),false);
 const first=g.zombies[0],different=g.zombies.find(z=>g.camelCards.get(z.id)!.face!==g.camelCards.get(first.id)!.face)!;
 assert.ok(g.flipCamel(first.id));assert.ok(g.flipCamel(different.id));tick(g,3.1);assert.equal(g.camelCards.get(first.id)!.state,'back');
 const memory=new Map<number,number>();
 for(let frame=0;frame<60*450&&g.phase==='playing';frame++){
  if(frame%8===0){
   const face=g.zombies.filter(z=>g.camelCards.get(z.id)!.state==='face');for(const z of face)memory.set(z.id,g.camelCards.get(z.id)!.face);
   const back=g.zombies.filter(z=>g.camelCards.get(z.id)!.state==='back'&&g.time-z.entryAt>1.35);
   if(face.length===1){const match=back.find(z=>memory.get(z.id)===memory.get(face[0].id));if(match)g.flipCamel(match.id);else {const unseen=back.find(z=>!memory.has(z.id));if(unseen)g.flipCamel(unseen.id);else if(back.length)g.flipCamel(back[0].id);};}
   else if(!face.length){let next=back.find(z=>memory.has(z.id)&&back.some(other=>other!==z&&memory.get(other.id)===memory.get(z.id)));next??=back.find(z=>!memory.has(z.id))??back[0];if(next)g.flipCamel(next.id);}
  }
  g.tick(1/60);g.events=[];
 }
 assert.equal(g.phase,'won',`time ${g.time}, wave ${g.wave}, remaining ${g.zombies.length}`);assert.equal(g.wave,9);
});

test('Gargantuar throws one imp below half health, smashes plants on the authored frame and can be frozen',()=>{
 const l=level(8);l.actions=[[{...l.actions[0][0],zombies:[{kind:'egypt_gargantuar',row:2}],food:0}]];l.waves=[['egypt_gargantuar']];l.flagInterval=100;
 const g=new Game(l,props,timing,z=>({x:z.x,y:rowY(z.row)}),42);tick(g,15.6);
 const garg=g.zombies[0];garg.x=cellX(4);garg.hp=1799;tick(g,timing.special!.gargThrow+.1);assert.equal(g.zombies.filter(z=>z.kind==='egypt_imp').length,1);assert.equal(g.specialZombies.get(garg.id)!.imp,false);
 tick(g,1.6);assert.equal(g.zombies.filter(z=>z.kind==='egypt_imp').length,1);const packet=g.conveyor[0];g.conveyor=[{...packet,kind:'wallnut'}];g.plant('wallnut',2,3,packet.id);garg.x=cellX(3)+30;
 tick(g,.1);assert.equal(g.specialZombies.get(garg.id)!.action,'smash');const wall=g.plants[0];tick(g,timing.special!.gargSmash-.2);assert.ok(g.plants.includes(wall));tick(g,.3);assert.ok(!g.plants.includes(wall));
});

test('Explorer burns tall plants, ignores iceweed and permanently loses its torch when frozen',()=>{
 const l=level(9);l.actions=[[{...l.actions[0][0],zombies:[{kind:'explorer',row:2}]}]];l.waves=[['explorer']];l.flagInterval=100;
 const g=new Game(l,props,timing,z=>({x:z.x,y:rowY(z.row)}),42);tick(g,15.6);g.sun=500;g.plant('wallnut',2,2);const z=g.zombies[0];z.x=cellX(2)+20;tick(g,.1);assert.ok(!g.plants.some(p=>p.row===2&&p.column===2));
 g.plant('iceburg',2,2);tick(g,1);assert.equal(g.specialZombies.get(z.id)!.torch,false);assert.ok(z.frozenUntil>g.time);
});

test('Tomb Raiser throws two bones per group, creates graves and Grave Buster consumes only its target',()=>{
 const l=level(10);l.actions=[[{...l.actions[0][0],zombies:[{kind:'tomb_raiser',row:2}]}]];l.waves=[['tomb_raiser']];l.flagInterval=100;
 const g=new Game(l,props,timing,z=>({x:z.x,y:rowY(z.row)}),42);tick(g,15.6);const z=g.zombies[0];z.x=cellX(6);const count=g.graves.length;
 tick(g,13);assert.equal(g.graves.length,count+2);
 const grave=g.graves[0];assert.equal(g.plant('gravebuster',0,0),false);assert.equal(g.plant('gravebuster',grave.row,grave.column),true);const plant=g.plants.at(-1)!;
 tick(g,timing.special!.graveBust+timing.special!.graveFinish+.05);assert.ok(!g.graves.includes(grave));assert.ok(g.plants.includes(plant));tick(g,.6);assert.ok(!g.plants.includes(plant));
});

test('native repeated bust events use their first frame, and twin sunflower produces its authored sun value',()=>{
 assert.equal(timing.special!.graveBust,21/30);
 const g=create(11);g.sun=500;g.plant('twinsunflower',2,0);tick(g,11.5);assert.equal(g.suns.filter(s=>s.from==='plant').length,2);assert.ok(g.suns.filter(s=>s.from==='plant').every(s=>s.value===50));
 g.food=1;const before=g.suns.length;g.plantFood(2,0);assert.equal(g.suns.length,before);tick(g,.8);assert.equal(g.suns.length-before,6);assert.equal(g.suns.slice(-6).reduce((n,s)=>n+s.value,0),300);
});

test('Egypt 7 intermediary note node opens day 8, day 9 grants native Grave Buster ID 12, rewards persist once',()=>{
 const data=new Map<string,string>(),store={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
 const progress=new ProgressStore(store),map=read<WorldMap>('shell/maps/egypt.json');
 for(let day=1;day<=11;day++){
  const id=`egypt${day}`;progress.finish('egypt',id);
  const events=completionEvents(map,id,progress.completed(map),progress.rewardNodes('egypt'));
  if(day===7)assert.ok(events.some(e=>e.action==='open'&&map.islands.find(n=>n.node===e.node)!.levels.includes('egypt8')));
  for(const e of events)if(e.action==='reward')progress.award('egypt',map.islands.find(n=>n.node===e.node)!);
  progress.finishPresentation();progress.finish('egypt',id);assert.equal(progress.pending(),null);
 }
 assert.ok(progress.ownedPlants().has(12));assert.ok(!progress.ownedPlants().has(25));
 assert.deepEqual(progress.campaignRewards().map(r=>r.level),['egypt4','egypt6','egypt7','egypt8','egypt10','egypt11']);
});

for(const day of [8,9,10,11])test(`Egypt ${day} can finish with legal planting, collection and available powerups`,()=>{
 const g=create(day);
 for(let frame=0;frame<60*700&&g.phase==='playing';frame++){
  for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   const occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c);
   const threats=[...g.zombies].sort((a,b)=>a.x-b.x);
   if(day===5){
    if(!g.power&&threats.length)g.selectPower('zap');
    if(g.power)g.powerPointer(threats[0]?.x??cellX(4),threats[0]?rowY(threats[0].row)-50:rowY(2),true);
   }else if(day===8){
    for(const card of [...g.conveyor]){
     if(card.kind==='iceburg'){const target=threats.find(z=>z.x<cellX(8)&&z.frozenUntil<=g.time);if(target)g.plant(card.kind,target.row,Math.floor((target.x-190)/82),card.id);continue;}
     const counts=Array.from({length:5},(_,r)=>g.plants.filter(p=>p.row===r&&['bloomerang','cabbagepult'].includes(p.kind)).length);
     const rows=[0,1,2,3,4].sort((a,b)=>counts[a]-counts[b]||Number(threats.some(z=>z.row===b))-Number(threats.some(z=>z.row===a)));
     for(const row of rows){const cols=card.kind==='wallnut'?[4,5,3,2,1,0]:card.kind==='potatomine'?[5,4,3,6,2,1,0]:[0,1,2,3,4];if(cols.some(c=>g.plant(card.kind,row,c,card.id)))break;}
    }
   }else{
    for(const z of threats)if(!g.plants.some(p=>p.row===z.row&&['peashooter','cabbagepult','bloomerang'].includes(p.kind)))g.plant(day===11?'peashooter':'cabbagepult',z.row,2);
    for(let row=0;row<5;row++)if(!occupied(row,0))g.plant('sunflower',row,0);
    for(let row=0;row<5;row++)if(!occupied(row,1))g.plant('sunflower',row,1);
    for(const c of [2,3,4])for(let row=0;row<5;row++)if(!occupied(row,c))g.plant(day===2?'peashooter':day===11?'bloomerang':'cabbagepult',row,c);
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


test('matching timers stop while paused, and resumed matching removes both cards together',()=>{
 const g=create(7);tick(g,6);const a=g.zombies[0],b=g.zombies.find(z=>z.id!==a.id&&g.camelCards.get(z.id)!.face===g.camelCards.get(a.id)!.face)!;
 g.flipCamel(a.id);g.flipCamel(b.id);g.phase='paused';const time=g.time;tick(g,2);assert.equal(g.time,time);assert.equal(g.camelCards.get(a.id)!.state,'face');
 g.phase='playing';tick(g,.55);assert.equal(g.camelCards.get(a.id)!.state,'match');assert.ok(g.zombies.includes(a));tick(g,.5);assert.ok(!g.zombies.includes(a));assert.ok(!g.zombies.includes(b));
});

test('a Gargantuar coffin release waits for its native frame and keeps the final wave alive',()=>{
 const l=level(8);l.actions=[[{...l.actions[0][0],zombies:[{kind:'egypt_gargantuar',row:2}],food:0}]];l.waves=[['egypt_gargantuar']];l.flagInterval=100;
 let releases=0;
 for(let seed=1;seed<=12;seed++){
  const g=new Game(l,props,timing,z=>({x:z.x,y:rowY(z.row)}),seed);tick(g,15.6);const garg=g.zombies[0];garg.x=cellX(5);garg.hp=0;tick(g,.05);
  if(g.phase==='playing'){
   tick(g,timing.special!.gargPharaoh-.1);assert.equal(g.zombies.length,0);assert.equal(g.phase,'playing');tick(g,.15);
   assert.equal(g.zombies.length,1);assert.equal(g.zombies[0].reversed,true);assert.ok(g.pharaohs.has(garg.id));releases++;
  }
 }
 assert.ok(releases>0&&releases<12);
});

test('normal sunflower food follows the pinned three Produce events, rather than an immediate six-sun burst',()=>{
 const g=create(11);g.sun=500;g.plant('sunflower',2,0);g.food=1;g.plantFood(2,0);assert.equal(g.suns.length,0);tick(g,.8);
 assert.equal(g.suns.length,props.plants.sunflower.PlantfoodTime);assert.equal(g.suns.reduce((n,s)=>n+s.value,0),150);
});

for(const day of [16,23])test(`Egypt ${day} matching finishes all authored waves with remembered revealed faces`,()=>{
 const g=create(day);
 const memory=new Map<number,number>();
 for(let frame=0;frame<60*450&&g.phase==='playing';frame++){
  if(frame%8===0){
   const face=g.zombies.filter(z=>g.camelCards.get(z.id)!.state==='face');for(const z of face)memory.set(z.id,g.camelCards.get(z.id)!.face);
   const back=g.zombies.filter(z=>g.camelCards.get(z.id)!.state==='back'&&g.time-z.entryAt>1.35);
   if(face.length===1){const match=back.find(z=>memory.get(z.id)===memory.get(face[0].id));if(match)g.flipCamel(match.id);else {const unseen=back.find(z=>!memory.has(z.id));if(unseen)g.flipCamel(unseen.id);else if(back.length)g.flipCamel(back[0].id);};}
   else if(!face.length){let next=back.find(z=>memory.has(z.id)&&back.some(other=>other!==z&&memory.get(other.id)===memory.get(z.id)));next??=back.find(z=>!memory.has(z.id))??back[0];if(next)g.flipCamel(next.id);}
  }
  g.tick(1/60);g.events=[];
 }
 assert.equal(g.phase,'won',`time ${g.time}, wave ${g.wave}, remaining ${g.zombies.length}`);assert.equal(g.wave,g.level.waves.length);
});
test('Egypt 12–16 preserve authored waves, active objectives and native challenge plants',()=>{
 assert.deepEqual([12,13,14,15,16].map(day=>level(day).waves.length),[16,10,16,16,11]);
 assert.deepEqual([12,13,14].map(day=>level(day).graves.length),[11,5,11]);
 assert.equal(level(13).mold.length,10);assert.ok(level(13).mold.every(c=>c.column<2));
 assert.equal(level(15).mustProtect,3);assert.deepEqual(level(15).protectedPlants.map(p=>[p.row,p.column]),[[0,4],[2,4],[4,4]]);
 assert.equal(level(16).match!.types,4);assert.equal(level(16).mowers,false);assert.equal(level(16).sunDrops,false);
 assert.ok(level(16).waves.flat().includes('camel_manyhump_touch'));assert.deepEqual(props.zombies.camel_manyhump_touch.TeamMemberCount,[5,6,7]);
});

test('mold prevents planting without charging sun or cooldown, while adjacent ground stays usable',()=>{
 const g=create(13);g.sun=500;assert.equal(g.plant('peashooter',0,0),false);assert.equal(g.plant('sunflower',4,1),false);
 assert.equal(g.sun,500);assert.equal(g.cooldowns.peashooter,0);assert.equal(g.plant('peashooter',0,2),true);
});

test('protected sunflowers produce sun, cannot be shoveled, and losing any one ends the battle',()=>{
 const g=create(15),p=g.plants[0];assert.equal(g.plants.filter(p=>p.endangered).length,3);
 g.shovel(p.row,p.column);assert.ok(g.plants.includes(p));tick(g,11);assert.ok(g.suns.some(s=>s.from==='plant'));
 const z=zombie(p.row,cellX(p.column)+10);g.zombies.push(z);p.hp=5;tick(g,.1);
 assert.equal(g.phase,'lost');assert.equal(g.lossReason,'protected');assert.equal(g.events.filter(e=>e.type==='lose').length,1);
});

test('Pharaoh coffin absorbs the breaking hit then releases a faster full-health inner zombie',()=>{
 const l=level(12);l.actions=[[{...l.actions[0][0],zombies:[{kind:'pharaoh',row:2}],food:1}]];l.waves=[['pharaoh']];l.flagInterval=100;l.graves=[];
 const g=new Game(l,props,timing,z=>({x:z.x,y:rowY(z.row)}),42);tick(g,15.6);const z=g.zombies[0];z.x=cellX(6);
 assert.equal(z.armor,1200);assert.equal(z.hp,290);const before=z.x;tick(g,1);assert.ok(Math.abs(before-z.x-.185*82)<.01);
 g.peas.push({id:serial++,row:z.row,x:z.x-25,y:rowY(z.row)-48,damage:1800,powered:false});tick(g,.05);
 assert.equal(z.kind,'pharaoh_inner');assert.equal(z.hp,290);assert.equal(z.armor,0);assert.equal(g.phase,'playing');assert.equal(g.pickups.length,0);
 tick(g,3);const after=z.x;tick(g,1);assert.ok(Math.abs(after-z.x-.5*82)<.01);
 z.hp=0;tick(g,.1);assert.equal(g.phase,'won');assert.equal(g.pickups.length,1);
});

test('Bonk Choy punches on native attack frames in either direction and its food hits a 3x3 area 25 times',()=>{
 assert.equal(timing.bonk!.attack,4/30);assert.equal(timing.bonk!.heavy,1/30);assert.equal(timing.bonk!.foodStart,12/30);
 const g=create(14);g.graves=[];g.sun=500;g.plant('bonkchoy',2,3);const p=g.plants[0];
 const z=zombie(2,cellX(2));z.hp=10000;g.zombies.push(z);tick(g,.5);assert.equal(p.facing,-1);assert.equal(z.hp,10000);
 tick(g,.1);assert.equal(z.hp,9985);g.food=1;g.plantFood(2,3);
 const near=zombie(1,cellX(4)),far=zombie(0,cellX(3));near.hp=10000;far.hp=10000;g.zombies.push(near,far);
 z.frozenUntil=g.time+10;near.frozenUntil=g.time+10;far.frozenUntil=g.time+10;const hp=z.hp;tick(g,2.85);assert.equal(hp-z.hp,25*60);assert.equal(near.hp,8500);assert.equal(far.hp,10000);assert.equal(g.food,0);assert.equal(p.burst,0);assert.notEqual(p.action,'food');
});

test('Egypt 12 trophy and day 13 native plant reward progress through day 16 exactly once',()=>{
 const data=new Map<string,string>(),progress=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}}),map=read<WorldMap>('shell/maps/egypt.json');
 for(let day=1;day<=16;day++){
  const id=`egypt${day}`;progress.finish('egypt',id);
  const events=completionEvents(map,id,progress.completed(map),progress.rewardNodes('egypt'));
  for(const e of events)if(e.action==='reward')progress.award('egypt',map.islands.find(n=>n.node===e.node)!);
  if(day>=12&&day<16)assert.ok(events.some(e=>e.action==='open'&&map.islands.find(n=>n.node===e.node)!.levels.includes(`egypt${day+1}`)));
  progress.finishPresentation();progress.finish('egypt',id);assert.equal(progress.pending(),null);
 }
 assert.ok(progress.ownedPlants().has(7));assert.ok(!progress.ownedPlants().has(8));
 assert.deepEqual(progress.campaignRewards().filter(r=>Number(r.level.slice(5))>=12).map(r=>[r.level,r.id]),[['egypt12','dangerroom_egypt'],['egypt14','CoinBag'],['egypt15','spine_egypt'],['egypt16','CoinBag']]);
});

for(const day of [12,13,14,15])test(`Egypt ${day} can finish with legal planting, collection and its active objectives`,()=>{
 const g=create(day),offset=day===13?2:0;
 for(let frame=0;frame<60*900&&g.phase==='playing';frame++){
  for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   const occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c),threats=[...g.zombies].sort((a,b)=>a.x-b.x);
   for(const z of threats)if(!g.plants.some(p=>p.row===z.row&&p.kind==='bloomerang'))g.plant('bloomerang',z.row,offset+2);
   for(let row=0;row<5;row++)if(!occupied(row,offset))g.plant('sunflower',row,offset);
   for(const z of threats)if(z.x<cellX(7)){g.plant('wallnut',z.row,day===13?6:5);if(z.frozenUntil<=g.time)g.plant('iceburg',z.row,Math.floor((z.x-190)/82));}
   for(let row=0;row<5;row++)if(!occupied(row,offset+1))g.plant('sunflower',row,offset+1);
   for(const grave of g.graves)if(grave.column<=6)g.plant('gravebuster',grave.row,grave.column);
   for(const c of [offset+2,offset+3,offset+4])for(let row=0;row<5;row++)if(!occupied(row,c))g.plant('bloomerang',row,c);
   const target=threats.find(z=>z.x<1000);if(target){const p=g.plants.find(p=>p.row===target.row&&p.kind==='bloomerang');if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`day ${day}, time ${g.time}, wave ${g.wave}, reason ${g.lossReason}, plants ${g.plants.length}`);assert.equal(g.wave,g.level.waves.length);
});

test('new actor actions, challenge tiles and Egypt trophy resolve in native assets',()=>{
 for(const [actor,animations] of [['bonkchoy',['Idle','Attack','Defeat','FoodStart','Food','Death']],['pharaoh',['Idle','Walk','Eat','Death']],['pharaohInner',['Idle','Walk','Eat','Death']]] as const)
  for(const animation of animations)assert.ok(timeline(actor,animation).duration>0,`${actor}/${animation}`);
 for(const [name,animation] of [['mold','Idle'],['endangered','Idle_Floor']]){
  const rig=catalog.rigs[name];assert.ok(animationTimeline(read<Skeleton>(`campaign/rigs/${rig.rig}/skeleton.json`),rig.armature,animation).duration>0);
 }
 const reward=read<{rigs:Record<string,{rig:string;armature:string}>}>('battle/catalog.json').rigs.reward;
 assert.ok(animationTimeline(read<Skeleton>(`battle/rigs/${reward.rig}/skeleton.json`),reward.armature,'dangerroom_egypt'));
 assert.equal(read<{plants:Record<number,unknown>}>('shell/progression.json').plants[7]!==undefined,true);
 for(const name of ['EGYPT_OUTRO_DANGER_ROOM_KEY','EGYPT_CHALLENGE_PROTECTPLANTS_A'])for(const step of catalog.narratives[name])if(step.Lines){assert.ok(step.Voice);assert.ok(catalog.sounds[step.Voice!].every(path=>readFileSync(new URL('../public/assets/'+path,import.meta.url)).length>0));}
});

test('Egypt 17–24 preserve active limits, last-stand budgets, presets and authored mold locations',()=>{
 assert.deepEqual([17,18,19,20,21,22,23,24].map(d=>level(d).waves.length),[10,7,10,12,12,16,10,10]);
 assert.equal(level(17).maxPlants,14);assert.equal(level(19).maxPlants,12);assert.equal(level(22).maxPlants,15);
 assert.deepEqual(level(18).lastStand,{sun:2000,food:2});assert.deepEqual(level(24).lastStand,{sun:2250,food:3});
 assert.equal(level(19).mold.length,10);assert.equal(level(22).mold.length,10);
 assert.deepEqual(level(21).preset,['twinsunflower','wallnut','iceburg','cabbagepult','kernelpult','melonpult']);
 assert.equal(level(23).match!.types,5);assert.equal(level(20).mustProtect,4);
});

test('last stand pauses the simulation while preparing, refunds shovels and starts authored waves only on command',()=>{
 const g=create(18);tick(g,30);assert.equal(g.time,0);assert.equal(g.wave,0);assert.equal(g.suns.length,0);
 assert.equal(g.plant('sunflower',0,0),false);assert.equal(g.plant('iceburg',0,0),false);
 assert.equal(g.plant('bloomerang',0,0),true);assert.equal(g.plant('bloomerang',1,0),true);assert.equal(g.cooldowns.bloomerang,0);
 g.shovel(0,0);assert.equal(g.sun,1825);g.startLastStand();tick(g,4.6);assert.equal(g.wave,1);
 const balance=g.sun;g.shovel(1,0);assert.equal(g.sun,balance);
});

test('active plant limit fails the challenge instead of silently preventing planting',()=>{
 const g=create(17);g.sun=10000;g.graves=[];
 for(let i=0;i<15;i++){g.cooldowns.wallnut=0;assert.equal(g.plant('wallnut',i%5,Math.floor(i/5)),true);}
 assert.equal(g.phase,'lost');assert.equal(g.lossReason,'plants');
});

test('repeater emits both native Shoot events and ends plant food after FoodBig',()=>{
 const g=create(17);g.graves=[];g.sun=500;g.plant('repeater',2,1);g.zombies.push(zombie(2,1000));
 tick(g,.91);assert.equal(g.peas.length,1);tick(g,.1);assert.equal(g.peas.length,2);
 g.food=1;g.plantFood(2,1);tick(g,2.1);assert.equal(g.plants[0].animation,'FoodBig');
 tick(g,1.4);assert.equal(g.plants[0].action,'idle');assert.ok(g.peas.some(p=>p.damage===400));
});

test('kernel food launches butter at every target and melon damage splashes adjacent rows',()=>{
 const g=create(21);g.graves=[];g.sun=1000;g.plant('kernelpult',0,0);g.plant('melonpult',2,0);
 const target=zombie(2,cellX(5)),neighbor=zombie(1,cellX(5));target.hp=neighbor.hp=1000;g.zombies.push(target,neighbor);
 g.food=1;g.plantFood(0,0);tick(g,.4);assert.equal(g.missiles.filter(m=>m.projectile==='butter2').length,2);
 tick(g,2);assert.ok(target.butteredUntil!>g.time);assert.equal(target.frozenUntil,0);assert.ok(target.hp<=720);assert.ok(neighbor.hp<=760);
});

for(const day of [18,24])test(`Egypt ${day} last stand can finish from its authored starting budget`,()=>{
 const g=create(day),kind=day===18?'bloomerang':'repeater'; // Use the authored random grave arrangement.
 for(let r=0;r<5;r++){g.plant(kind,r,0);g.plant(kind,r,1);for(const c of [2,3,4])if(g.plant('wallnut',r,c))break;}
 assert.equal(g.sun,0);g.startLastStand();
 for(let frame=0;frame<60*900&&g.phase==='playing';frame++){
  for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%30===0){const z=[...g.zombies].sort((a,b)=>a.x-b.x)[0];if(z&&z.x<cellX(5)){const p=g.plants.find(p=>p.kind===kind&&p.row===z.row);if(p)g.plantFood(p.row,p.column);}}
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`day ${day}, time ${g.time}, wave ${g.wave}, reason ${g.lossReason}`);
});

for(const day of [17,19,20,21,22])test(`Egypt ${day} completes with legal cards and active challenge limits`,()=>{
 const g=create(day),offset=[19,22].includes(day)?2:0,preset=day===21;
 g.foodLimit=4;if(day>=22)g.sun+=25;
 for(let frame=0;frame<60*1000&&g.phase==='playing';frame++){
  for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   const occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c),threats=[...g.zombies].sort((a,b)=>a.x-b.x);
   const plant=(kind:Parameters<Game['plant']>[0],r:number,c:number)=>{if(g.level.maxPlants===null||g.plants.length<g.level.maxPlants)g.plant(kind,r,c);};
   const attack=preset?'cabbagepult':day===22?'repeater':'bloomerang',producer=preset?'twinsunflower':'sunflower';
   for(const z of threats)if(!g.plants.some(p=>p.row===z.row&&p.kind===attack))plant(attack,z.row,offset+1);
   for(let r=0;r<5;r++)if(!occupied(r,offset))plant(producer,r,offset);
   for(const z of threats)if(z.x<cellX(7)){
    if(!g.plants.some(p=>p.row===z.row&&p.kind==='wallnut'))plant('wallnut',z.row,offset+3);
    if(z.frozenUntil<=g.time)plant('iceburg',z.row,Math.floor((z.x-190)/82));
   }
   if(!preset)for(const grave of g.graves)if(grave.column<=6)plant('gravebuster',grave.row,grave.column);
   for(let r=0;r<5;r++)if(!occupied(r,offset+1))plant(attack,r,offset+1);
   if(g.level.maxPlants===null)for(const c of [offset+2,offset+3])for(let r=0;r<5;r++)if(!occupied(r,c))plant(preset?'melonpult':attack,r,c);
   const target=threats.find(z=>z.x<cellX(7));if(target){const p=g.plants.find(p=>p.row===target.row&&p.kind===attack);if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`day ${day} time ${g.time} wave ${g.wave} reason ${g.lossReason}`);
});

test('Egypt 17–24 map chain grants food slots, starting sun, Repeater and Twin Sunflower once',()=>{
 const data=new Map<string,string>(),progress=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}}),map=read<WorldMap>('shell/maps/egypt.json');
 for(let day=1;day<=24;day++){
  const id=`egypt${day}`;progress.finish('egypt',id);
  const events=completionEvents(map,id,progress.completed(map),progress.rewardNodes('egypt'));
  for(const e of events)if(e.action==='reward')progress.award('egypt',map.islands.find(n=>n.node===e.node)!);
  if(day>=17&&day<24)assert.ok(events.some(e=>e.action==='open'&&map.islands.find(n=>n.node===e.node)!.levels.includes(`egypt${day+1}`)));
  progress.finishPresentation();progress.finish('egypt',id);assert.equal(progress.pending(),null);
 }
 assert.ok(progress.ownedPlants().has(8));assert.ok(progress.ownedPlants().has(25));
 assert.ok(progress.rewards().some(r=>r.kind==='upgrade'&&r.id===2));assert.ok(progress.rewards().some(r=>r.kind==='upgrade'&&r.id===0));
});

test('Egypt 25–35 retain authored modes, boss stages and challenge constraints',()=>{
 assert.deepEqual(Array.from({length:11},(_,i)=>level(i+25).waves.length),[0,12,15,15,16,12,8,15,9,8,0]);
 assert.deepEqual([25,29,35].map(d=>!!level(d).conveyor),[true,true,true]);
 assert.equal(level(27).flowerLine,5);assert.equal(level(32).mustProtect,2);assert.equal(level(32).maxPlants,15);assert.equal(level(34).maxSun,1800);
 assert.deepEqual(level(33).lastStand,{sun:2250,food:2});assert.ok(level(28).preset!.includes('imitater'));assert.ok(level(34).preset!.includes('cherry_bomb'));
 for(const day of [25,35]){const g=create(day);assert.equal(g.boss!.zombie.hp,day===25?18500:39000);tick(g,2);assert.equal(g.phase,'playing');assert.equal(g.wave,0);assert.ok(g.conveyor.length);}
});

for(const day of [25,35])test(`Egypt ${day} boss takes three stages, converts freeze to chill and completes its escape`,()=>{
 const g=create(day),b=g.boss!;tick(g,2.1);b.animation='Idle';b.height=0;
 g.damage(b.zombie,1e6);assert.equal(b.stage,1);assert.equal(b.zombie.hp,b.stages.slice(1).reduce((n,s)=>n+s.HitPoints,0));assert.equal(b.animation,'StunStart');
 b.freeze();assert.equal(b.zombie.frozenUntil,0);assert.ok(b.zombie.chilledUntil>g.time);
 g.damage(b.zombie,1e6);assert.equal(b.stage,2);assert.equal(b.zombie.hp,b.stages[2].HitPoints);
 g.damage(b.zombie,1e6);assert.equal(b.zombie.hp,0);assert.equal(g.phase,'playing');tick(g,20);assert.equal(g.phase,'won');assert.equal(b.defeated,true);
});

test('boss summon and missile actions run on native events without an empty-wave win',()=>{
 for(const name of ['summon','shoot','rush'] as const){
  const g=new Game(level(25),structuredClone(props),timing,z=>({x:z.x,y:rowY(z.row)}),1234),b=g.boss!;
  // A dedicated properties copy keeps the other deterministic scenarios untouched.
  g.props.zombies.zombossmech_egypt={...g.props.zombies.zombossmech_egypt,ZombossStages:b.stages.map(s=>({...s,Actions:s.Actions.filter(a=>a.actionName===name)}))};
  b.zombie.x=cellX(7);g.conveyor.push({id:99999,kind:'wallnut',lane:0,position:0});g.plant('wallnut',b.zombie.row,0,99999);
  let summoned=false,missile=false,rush=false;
  for(let i=0;i<1800&&g.phase==='playing';i++){g.tick(1/60);summoned ||= g.zombies.length>1;missile ||= b.missiles.length>0;rush ||= b.animation==='Stomp';}
  assert.ok(name==='summon'?summoned:name==='shoot'?missile:rush,name);
 }
});

test('flower line checks foot contact, not zombies emerging behind the flowers',()=>{
 const g=create(27);g.graves=[];const behind=zombie(2,cellX(3));g.zombies.push(behind);tick(g,.2);assert.equal(g.phase,'playing');
 const crossing=zombie(2,190+5*82+5);g.zombies.push(crossing);tick(g,.1);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'flowers');
});

test('grave waves displace plants and delayed grave spawns use surviving tombstones only',()=>{
 const l=level(27),a=l.actions.flat().find(a=>a.mode==='graves'&&a.graveCount!>0)!;
 l.actions=[[a]];l.waves=[[]];l.graves=[];l.flagInterval=100;
 const g=new Game(l,props,timing,z=>({x:z.x,y:rowY(z.row)}),1234);g.sun=5000;
 for(const c of a.positions!){g.cooldowns.wallnut=0;g.plant('wallnut',c.row,c.column);}tick(g,15.6);
 assert.equal(g.graves.length,a.graveCount);assert.equal(g.plants.length,a.positions!.length);assert.ok(g.plants.every(p=>!g.graves.some(t=>t.row===p.row&&t.column===p.column)));
 const ll=level(28);ll.actions=[[ll.actions.flat().find(a=>a.mode==='graveZombies')!]];ll.waves=[['explorer']];ll.graves=[{row:2,column:7}];ll.flagInterval=100;
 const gg=new Game(ll,props,timing,z=>({x:z.x,y:rowY(z.row)}));tick(gg,15.6);assert.equal(gg.zombies.length,0);tick(gg,1);assert.equal(gg.zombies.length,1);assert.equal(gg.zombies[0].entry,'ground');assert.equal(gg.zombies[0].row,2);
});

test('finale plants preserve stacking, transformation, burst completion and blast timing',()=>{
 const g=create(28);g.graves=[];g.sun=10000;
 for(let i=0;i<5;i++){g.cooldowns.peapod=0;assert.equal(g.plant('peapod',0,0),true);}g.cooldowns.peapod=0;assert.equal(g.plant('peapod',0,0),false);assert.equal(g.plants[0].heads,5);
 g.imitateKind='snowdrop';g.plant('imitater',1,0);tick(g,4);assert.ok(g.plants.some(p=>p.kind==='snowdrop'&&p.row===1));assert.ok(!g.plants.some(p=>p.kind==='imitater'));
 g.food=3;g.plantFood(0,0);tick(g,8);assert.equal(g.plants.find(p=>p.kind==='peapod')!.action,'idle');
 g.plant('cherry_bomb',2,4);const z=zombie(2,cellX(5));z.hp=2000;g.zombies.push(z);tick(g,.5);assert.equal(z.hp,2000);tick(g,.3);assert.equal(z.hp,200);assert.ok(!g.plants.some(p=>p.kind==='cherry_bomb'));
});

test('celery hides, attacks behind itself and plant food summons three children',()=>{
 const g=create(28);g.graves=[];g.sun=1000;g.plant('celerystalker',2,4);const p=g.plants[0],z=zombie(2,cellX(3));z.hp=10000;g.zombies.push(z);
 tick(g,3);assert.ok(z.hp<10000);g.food=1;assert.equal(g.plantFood(2,4),true);tick(g,1);assert.equal(g.plants.filter(p=>p.kind==='celerystalker').length,4);assert.notEqual(p.action,'food');
});

test('parsnip food and sap expire without retaining powered animations',()=>{
 const g=create(28);g.graves=[];g.sun=1000;g.plant('parsnip',1,0);g.plant('sapfling',2,0);g.food=2;g.plantFood(1,0);g.plantFood(2,0);tick(g,10);
 assert.ok(g.plants.every(p=>p.action!=='food'));assert.equal(g.missiles.filter(m=>m.kind==='parsnip').length,0);assert.ok(g.sap.length>0);g.plants=[];tick(g,31);assert.equal(g.sap.length,0);
});

for(const day of [25,29])test(`Egypt ${day} completes through legal cards and source objectives`,()=>{
 const g=create(day);g.foodLimit=4;if(!g.level.lastStand)g.sun+=25;g.imitateKind='snowdrop';
 for(let frame=0;frame<60*1800&&g.phase==='playing';frame++){
  for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%15===0){
   const threats=g.zombies.filter(z=>z.hp>0).sort((a,b)=>a.x-b.x);
   if(g.level.conveyor){
    for(const card of [...g.conveyor]){
     const rows=[0,1,2,3,4].sort((a,b)=>g.plants.filter(p=>p.row===a&&!['wallnut','sapfling','iceburg','gravebuster'].includes(p.kind)).length-g.plants.filter(p=>p.row===b&&!['wallnut','sapfling','iceburg','gravebuster'].includes(p.kind)).length);
     if(card.kind==='gravebuster'){for(const t of g.graves)if(g.plant(card.kind,t.row,t.column,card.id))break;}
     else if(card.kind==='iceburg'){for(const z of threats)if(z.frozenUntil<=g.time&&g.plant(card.kind,z.row,Math.floor((z.x-190)/82),card.id))break;}
     else if(card.kind==='peapod'){const pods=g.plants.filter(p=>p.kind==='peapod').sort((a,b)=>a.heads!-b.heads!);if(pods.length>=5&&pods.some(p=>g.plant('peapod',p.row,p.column,card.id)))continue;for(const row of rows)if([0,1,2,3,4].some(c=>g.plant(card.kind,row,c,card.id)))break;}
     else {for(const row of rows){const cols=['wallnut','celerystalker','parsnip'].includes(card.kind)?[4,3,2,1,0]:[0,1,2,3,4,5,6];if(cols.some(c=>g.plant(card.kind,row,c,card.id)))break;}}
    }
   }
   const danger=threats.find(z=>z!==g.boss?.zombie&&z.x<cellX(6))??g.boss?.zombie;
   if(danger){const p=g.plants.find(p=>g.inLane(danger,p.row)&&['repeater','peashooter','bloomerang','cabbagepult','peapod','melonpult','parsnip'].includes(p.kind));if(p)g.plantFood(p.row,p.column);}
  }
  g.tick(1/60);g.events.length=0;
 }
 assert.equal(g.phase,'won',`day ${day} time ${g.time} wave ${g.wave} reason ${g.lossReason} boss ${g.boss?.zombie.hp} sun ${g.sun} spent ${g.sunSpent}`);
});

for(const day of [26,27,28,30,31,32,33,34])test(`Egypt ${day} authored wave lifecycle reaches victory after combat removes every group`,()=>{
 const g=create(day);if(g.preparing)g.startLastStand();const kinds=new Set<string>();let frame=0;
 // Exercise source spawn scheduling and win detection independently of a bot's strategy.
 for(;frame<60*1600&&g.phase==='playing';frame++){
  g.tick(1/60);
  for(const z of g.zombies){kinds.add(z.kind);if(g.time-z.entryAt>1.5)g.damage(z,100000,'potato');}
  g.events.length=0;
 }
 assert.equal(g.phase,'won',`day ${day}, wave ${g.wave}, time ${g.time}`);assert.equal(g.wave,g.level.waves.length);assert.ok(kinds.size>0);
 assert.ok(g.plants.filter(p=>p.endangered).every(p=>p.hp>0));
});

test('day 29 conveyor changes preserve delivered cards but change subsequent draws',()=>{
 const l=level(29),g=create(29);tick(g,15.6);assert.ok(g.conveyorPlants.some(p=>p.PlantType==='kernelpult'));
 const changes=l.actions.flat().filter(a=>a.mode==='conveyor');assert.deepEqual(changes.map(a=>a.remove),[[],['melonpult'],['peapod']]);
 for(let i=0;i<60*300&&g.wave<6;i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,1e6,'potato');}
 assert.ok(!g.conveyorPlants.some(p=>p.PlantType==='melonpult'||p.PlantType==='peapod'));assert.ok(g.conveyorPlants.some(p=>p.PlantType==='repeater'));
});

test('Egypt 25–35 completion opens the mainline and records each finale reward once',()=>{
 const data=new Map<string,string>(),progress=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}}),map=read<WorldMap>('shell/maps/egypt.json');
 for(let day=1;day<=35;day++){
  const id=`egypt${day}`;progress.finish('egypt',id);
  const events=completionEvents(map,id,progress.completed(map),progress.rewardNodes('egypt'));
  for(const e of events)if(e.action==='reward')progress.award('egypt',map.islands.find(n=>n.node===e.node)!);
  if(day>=25&&day<35)assert.ok(events.some(e=>e.action==='open'&&map.islands.find(n=>n.node===e.node)!.levels.includes(`egypt${day+1}`)),String(day));
  progress.finishPresentation();const rewards=structuredClone(progress.campaignRewards());progress.finish('egypt',id);assert.deepEqual(progress.campaignRewards(),rewards);assert.equal(progress.pending(),null);
 }
 assert.equal(progress.completed(map).size,35);assert.ok(progress.campaignRewards().some(r=>r.level==='egypt25'));assert.ok(progress.campaignRewards().some(r=>r.level==='egypt31'));
});

test('weak pharaoh passes coffin overkill to the occupant, regular pharaoh protects it',()=>{
 const g=create(34),weak=g.spawnZombie('pharaoh_weak',1,cellX(7)),regular=g.spawnZombie('pharaoh',2,cellX(7));
 g.damage(weak,1800,'potato');g.damage(regular,1800,'potato');assert.equal(weak.kind,'pharaoh_inner');assert.ok(weak.hp<=0);assert.ok(regular.hp>0);assert.equal(weak.deathCause,'potato');
});

test('boss upper occupied lane receives peas and 400 damage interrupts a rush',()=>{
 const p=structuredClone(props);p.zombies.zombossmech_egypt.ZombossStages.forEach(s=>{s.Actions=s.Actions.filter(a=>a.actionName==='rush');});
 const g=new Game(level(25),p,timing,z=>({x:z.x,y:rowY(z.row)}),1234),b=g.boss!;b.zombie.x=cellX(7);
 g.conveyor.push({id:99991,kind:'wallnut',lane:0,position:0});g.plant('wallnut',b.zombie.row,0,99991);tick(g,2.1);
 const hp=b.zombie.hp;g.peas.push({id:99992,row:b.zombie.row-1,x:b.zombie.x-35,y:rowY(b.zombie.row-1)-48,damage:20,powered:false});tick(g,.1);assert.equal(b.zombie.hp,hp-20);
 for(let i=0;i<600&&b.animation!=='WalkL';i++)g.tick(1/60);assert.equal(b.animation,'WalkL');
 g.damage(b.zombie,399);assert.equal(b.animation,'WalkL');g.damage(b.zombie,1);assert.equal(b.animation,'StunStart');
});

test('finale native rigs, rewards and NPC voices resolve without substitutions',()=>{
 for(const name of ['snowdrop','imitater','peapod','cherry_bomb','celerystalker','parsnip','sapfling','boss','torchlight','pharaohWeak']){
  const spec=catalog.actors[name],skeleton=read<Skeleton>(`campaign/rigs/${spec.rig}/skeleton.json`);assert.ok(skeleton.armature.some(a=>a.name===spec.armature),name);
 }
 for(const [key,animations] of [['bossTarget',['Start','Idle','Die']],['bossMissile',['Idle']],['bossEscape',['Play']],['bossPortal',['Idle']],['flower',['Idle','Nervous','Die','Grow']],['zombossicon',['Enter','Idle','Exit']],['sapTile',['Spawn','Idle','Fade']]] as [string,string[]][]){
  const r=catalog.rigs[key],s=read<Skeleton>(`campaign/rigs/${r.rig}/skeleton.json`);for(const animation of animations)assert.ok(animationTimeline(s,r.armature,animation).duration>=0,`${key}/${animation}`);
 }
 assert.notDeepEqual(catalog.sounds['zombossicon/Say_Long'],catalog.sounds['winnie/Say_Long']);
 const battle=read<{rigs:Record<string,{rig:string;armature:string}>}>('battle/catalog.json'),reward=battle.rigs.reward,s=read<Skeleton>(`battle/rigs/${reward.rig}/skeleton.json`);
 for(const animation of ['egypt','dangerroom_egypt'])assert.ok(animationTimeline(s,reward.armature,animation).duration>=0);
});

test('garden-boosted imitater applies its boost to the transformed plant',()=>{
 const g=create(28);g.graves=[];g.sun=2000;g.food=0;g.imitateKind='peashooter';g.boosts.add('imitater');
 assert.equal(g.plant('imitater',1,0),true);tick(g,4);
 const transformed=g.plants.find(p=>p.kind==='peashooter'&&p.row===1)!;
 assert.ok(transformed);assert.ok(g.events.some(e=>e.type==='food'));assert.equal(g.food,0);assert.deepEqual([...g.usedBoosts],['imitater']);
});


test('purchased imitater uses its chosen plant cost and an independent matching cooldown',()=>{
 const g=create(2);g.graves=[];g.imitateKind='wallnut';g.sun=49;
 assert.equal(g.seedCost('imitater'),props.plants.wallnut.SunCost);
 assert.equal(g.seedCooldown('imitater'),props.plants.wallnut.Cooldown);
 assert.equal(g.plant('imitater',0,0),false);
 g.sun=100;assert.equal(g.plant('imitater',0,0),true);
 assert.equal(g.sun,50);assert.equal(g.sunSpent,50);
 assert.equal(g.cooldowns.imitater,props.plants.wallnut.Cooldown);
 assert.equal(g.cooldowns.wallnut,0);
 assert.equal(g.plant('imitater',0,1),false);
 tick(g,4);assert.ok(g.plants.some(p=>p.kind==='wallnut'&&p.row===0&&p.column===0));
 assert.equal(g.plant('wallnut',0,1),true);
});

test('imitating gravebuster uses the target plant tombstone placement rule',()=>{
 const g=create(2);g.graves=[{id:9000,row:0,column:5,hp:200,stage:0}];g.imitateKind='gravebuster';
 assert.equal(g.plant('imitater',0,0),false);
 assert.equal(g.plant('imitater',0,5),true);
 tick(g,8);assert.equal(g.graves.length,0);
});
