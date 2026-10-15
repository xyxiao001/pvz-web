import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/model';
import { PLANTS, type PlantKind } from '../src/game/config';
import { PlayerProfile } from '../src/platform/profile';
import { bindSeedInspection } from '../src/platform/seed-inspection';

function chooser() {
  const p=new PlayerProfile({getItem:()=>null,setItem:()=>{}});p.data.run=2;p.data.purchases.imitater=1;
  const g=new Game(29,42,'adventure','day',p.rules());
  for(const kind of g.config.seeds) { if(g.seeds.length===g.seedCapacity)break; if(!g.seeds.includes(kind))g.chooseSeed(kind); }
  return g;
}
function battle(level: 9|29|41=9) {
  const g=new Game(level,42);g.phase='playing';g.seeds=Object.keys(PLANTS) as PlantKind[];g.sun=10000;g.graves=[];g.plants=[];return g;
}
function add(g:Game,kind:PlantKind,column=0,row=0) {
  const p={id:g.plants.length+1,kind,column,row,health:PLANTS[kind].health,actionIn:0,born:0,shotAt:0};g.plants.push(p);return p;
}

test('full-bank replacement preserves order, count and Dave cards',()=>{
  const g=chooser(),before=[...g.seeds],from=g.seeds.find(k=>!g.davePicks.includes(k))!,to=g.config.seeds.find(k=>!g.seeds.includes(k)&&k!=='imitater')!;
  g.replaceSeed(from,to);
  assert.deepEqual(g.seeds,before.map(k=>k===from?to:k));assert.ok(g.canStart);
  const after=[...g.seeds];g.replaceSeed(g.davePicks[0],from);assert.deepEqual(g.seeds,after);
  g.replaceSeed(to,g.seeds[0]);assert.deepEqual(g.seeds,after);
  g.phase='playing';g.replaceSeed(to,from);assert.deepEqual(g.seeds,after);
});
test('imitater can replace a slot without losing slots, including a partially filled bank',()=>{
  for(const full of [true,false]){
    const g=chooser();if(!full)g.chooseSeed(g.seeds.find(k=>!g.davePicks.includes(k))!);
    const from=g.seeds.find(k=>!g.davePicks.includes(k))!,index=g.seeds.indexOf(from),length=g.seeds.length;
    g.chooseImitater('peashooter',from);
    assert.equal(g.seeds[index],'imitater');assert.equal(g.seeds.length,length);assert.equal(g.imitaterTarget,'peashooter');
  }
});
test('planting feedback distinguishes resource, cooldown, terrain and upgrade requirements without spending',()=>{
  const g=battle();g.sun=0;assert.equal(g.plantingIssue('peashooter',0,0),'阳光不足');
  g.sun=1000;g.cooldowns.peashooter=100;assert.match(g.plantingIssue('peashooter',0,0)!,/冷却/);
  g.cooldowns.peashooter=0;assert.equal(g.plantingIssue('peashooter',0,0),null);
  assert.match(g.plantingIssue('gatlingpea',0,0)!,/双发射手/);
  add(g,'repeater');assert.equal(g.plantingIssue('gatlingpea',0,0),null);
  assert.equal(g.sun,1000);assert.equal(g.plants.length,1);
  const pool=battle(29);assert.match(pool.plantingIssue('peashooter',0,2)!,/睡莲/);
  add(pool,'lilypad',0,2);assert.equal(pool.plantingIssue('peashooter',0,2),null);
  assert.match(pool.plantingIssue('potatomine',0,2)!,/不能种在水上/);
  const roof=battle(41);assert.match(roof.plantingIssue('peashooter',0,0)!,/花盆/);
  add(roof,'flowerpot');assert.equal(roof.plantingIssue('peashooter',0,0),null);
});
test('shovel preview matches removal priority and the cannon right tile',()=>{
  const g=battle(29);const pad=add(g,'lilypad',0,2),pea=add(g,'peashooter',0,2),pumpkin=add(g,'pumpkin',0,2);
  for(const expected of [pumpkin,pea,pad]){g.digging=true;assert.equal(g.digTarget(0,2),expected);g.dig(0,2);assert.ok(!g.plants.includes(expected));}
  const cannon=add(g,'cobcannon',2,0);g.digging=true;assert.equal(g.digTarget(3,0),cannon);g.dig(3,0);assert.ok(!g.plants.includes(cannon));
});
class Button extends EventTarget {
  emit(type:string,properties:Record<string,unknown>={}) {const event=new Event(type,{cancelable:true});Object.assign(event,properties);this.dispatchEvent(event);}
}
test('touch hold inspects once and suppresses selection; a following tap still selects',t=>{
  t.mock.timers.enable({apis:['setTimeout']});const button=new Button();let inspected=0,selected=0;
  bindSeedInspection(button as unknown as HTMLButtonElement,()=>inspected++,()=>selected++);
  button.emit('pointerdown',{pointerType:'touch',clientX:10,clientY:10});t.mock.timers.tick(420);
  button.emit('pointerup');button.emit('click',{detail:1});assert.equal(inspected,1);assert.equal(selected,0);
  button.emit('pointerdown',{pointerType:'touch',clientX:10,clientY:10});button.emit('pointerup');button.emit('click',{detail:1});assert.equal(selected,1);
});
test('scrolling/cancel cancels inspection timer; keyboard and mouse can still inspect/select',t=>{
  t.mock.timers.enable({apis:['setTimeout']});const button=new Button();let inspected=0,selected=0;
  bindSeedInspection(button as unknown as HTMLButtonElement,()=>inspected++,()=>selected++);
  button.emit('pointerdown',{pointerType:'touch',clientX:0,clientY:0});button.emit('pointermove',{clientX:0,clientY:20});t.mock.timers.tick(500);assert.equal(inspected,0);
  button.emit('pointerdown',{pointerType:'touch',clientX:0,clientY:0});button.emit('pointercancel');t.mock.timers.tick(500);assert.equal(inspected,0);
  button.emit('focus');button.emit('click',{detail:0});assert.equal(selected,1);
  button.emit('pointerdown',{pointerType:'mouse'});button.emit('click',{detail:1});assert.equal(selected,2);
});

import { bindBattlePointer } from '../src/platform/battle-pointer';
class Canvas extends Button {
  captured:number|null=null;
  setPointerCapture(id:number){this.captured=id;}
  releasePointerCapture(){this.captured=null;}
  pointer(type:string,x=100,y=200,pointerType='touch') {this.emit(type,{pointerId:1,pointerType,button:0,clientX:x,clientY:y});}
}
function input() {
  const canvas=new Canvas(),calls:number[][]=[];let action:string|null='plant',enabled=true,collecting=false,preview:{x:number;y:number}|null=null;
  bindBattlePointer(canvas as unknown as HTMLCanvasElement,{
    point:e=>({x:e.clientX,y:e.clientY}),enabled:()=>enabled,action:()=>action,collecting:()=>collecting,
    preview:p=>{preview=p;},operate:(x,y)=>{calls.push([x,y]);},
  });
  return {canvas,calls,get preview(){return preview;},set action(v:string|null){action=v;},set enabled(v:boolean){enabled=v;},set collecting(v:boolean){collecting=v;}};
}
test('touch aims on movement and executes once on release; mouse and pickups stay immediate',()=>{
  const t=input();t.canvas.pointer('pointerdown');assert.equal(t.calls.length,0);assert.equal(t.canvas.captured,1);
  t.canvas.pointer('pointermove',200,300);assert.deepEqual(t.preview,{x:200,y:300});t.canvas.pointer('pointerup',200,300);assert.deepEqual(t.calls,[[200,300]]);assert.equal(t.preview,null);
  t.canvas.pointer('pointerup',200,300);assert.equal(t.calls.length,1);
  t.canvas.pointer('pointerdown',150,250,'mouse');assert.equal(t.calls.length,2);
  t.collecting=true;t.canvas.pointer('pointerdown');t.canvas.pointer('pointerup');assert.equal(t.calls.length,3);
});
test('cancel, leaving the field, pausing or changing the held action never place/fire on release',()=>{
  for(const mode of ['cancel','capture','outside','pause','switch']){
    const t=input();t.canvas.pointer('pointerdown');
    if(mode==='cancel')t.canvas.pointer('pointercancel');
    if(mode==='capture')t.canvas.pointer('lostpointercapture');
    if(mode==='pause')t.enabled=false;
    if(mode==='switch')t.action=null;
    t.canvas.pointer('pointerup',mode==='outside'?-1:100,200);
    assert.equal(t.calls.length,0,mode);assert.equal(t.preview,null,mode);
  }
});
test('touching a ready cannon selects it without firing on the same gesture',()=>{
  const t=input();t.action=null;t.canvas.pointer('pointerdown');t.action='cannon-12';t.canvas.pointer('pointerup');assert.equal(t.calls.length,1);
  t.canvas.pointer('pointerdown');assert.equal(t.calls.length,1);t.canvas.pointer('pointerup');assert.equal(t.calls.length,2);
});

import { tutorialHighlight, tutorialHint } from '../src/game/dialogue';
test('tutorial highlights only the action its hint requests, including cooldown and pause', () => {
  const g = new Game(1, 42); g.phase='playing'; g.tutorial='pea';
  assert.equal(tutorialHighlight(g),'[data-plant=peashooter]');
  g.sun=50;g.planted=1;g.cooldowns.peashooter=700;
  assert.equal(tutorialHighlight(g),null);assert.match(tutorialHint(g),/收集/);
  g.selected='peashooter';assert.match(tutorialHint(g),/收集/);
  g.sun=100;assert.match(tutorialHint(g),/恢复/);assert.equal(tutorialHighlight(g),null);
  g.cooldowns.peashooter=0;assert.match(tutorialHint(g),/中间的草坪/);
  g.selected=null;assert.equal(tutorialHighlight(g),'[data-plant=peashooter]');
  g.phase='paused';assert.equal(tutorialHint(g),'');assert.equal(tutorialHighlight(g),null);
  g.phase='playing';g.tutorial='sunflower';g.sun=25;
  assert.match(tutorialHint(g),/50 阳光/);assert.equal(tutorialHighlight(g),null);
  g.sun=50;g.cooldowns.sunflower=100;assert.match(tutorialHint(g),/恢复/);assert.equal(tutorialHighlight(g),null);
  g.cooldowns.sunflower=0;assert.equal(tutorialHighlight(g),'[data-plant=sunflower]');
});
