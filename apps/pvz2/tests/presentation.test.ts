import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { animationTimeline, introCamera } from '../src/rendering/presentation';

const read=(path:string)=>JSON.parse(readFileSync(new URL(`../public/assets/${path}`,import.meta.url),'utf8'));
const catalog=read('battle/catalog.json');

test('zombie falls and fade cues preserve each native Death timeline, including terminal frames',()=>{
  for(const [rig,armature,fall,die] of [['mummy','EgyptBasicZombie',28,40],['mummy','EgyptFlagZombie',45,57],['ra','RaZombie',45,67]] as const){
    const timeline=animationTimeline(read(`actors/${rig}/skeleton.json`),armature,'Death');
    assert.equal(timeline.events.fall,fall/30);
    assert.equal(timeline.events.die,die/30);
  }
  assert.equal(catalog.presentation.corpseFadeDuration,.5);
  assert.equal(catalog.presentation.mowerDeathDuration,.5);
});

test('mine damage follows the Charging explode event, after Grow activates the mine',()=>{
  const skeleton=read('actors/potatomine/skeleton.json');
  assert.equal(animationTimeline(skeleton,'PotatoMine','Grow').events.activate,18/30);
  const charging=animationTimeline(skeleton,'PotatoMine','Charging');
  assert.equal(charging.events.explode,14/30);
  assert.equal(charging.events.die,15/30);
});

test('camera dwells, surveys the street and reaches the chooser at the original times',()=>{
  const {camera,seedChoosingCameraX}=catalog.presentation;
  assert.equal(introCamera(0,camera,seedChoosingCameraX),-40);
  assert.equal(introCamera(.9,camera,seedChoosingCameraX),-40);
  assert.equal(introCamera(2,camera,seedChoosingCameraX),200);
  assert.equal(introCamera(3.2,camera,seedChoosingCameraX),440);
  assert.equal(introCamera(5.5,camera,seedChoosingCameraX),230);
  assert.deepEqual(catalog.presentation.readySetPlant,[.6,.6,1]);
});

test('first-level NPC lines retain action-specific voices and Chinese graphical text length',()=>{
  const lines=catalog.intro.filter((step:{Lines?:object})=>step.Lines);
  for(const step of lines){
    const length=Math.max(1,Math.min(3,Math.round(step.Lines.zh.length*3.1/21)));
    assert.equal(step.Animation,['Say_Small','Say_Medium','Say_Long'][length-1]);
    assert.equal(step.Voice,`${step.Character}/${step.Action==='PLAYFUL'?'Playful':'Say'}_${['Short','Med','Long'][length-1]}`);
    assert.ok(catalog.sounds[step.Voice].length);
  }
  for(const name of ['crazydave','winnie']){
    const ref=catalog.rigs[name];
    for(const animation of ['Enter','Exit'])assert.ok(animationTimeline(read(`battle/rigs/${ref.rig}/skeleton.json`),ref.armature,animation).duration>0);
  }
});

test('native planting, removal, pea-hit and explosion animations resolve in their exported rigs',()=>{
  for(const [name,animations] of Object.entries({plantDirt:['Plant','Remove'],peaHit:['Play','Play1','Play2'],spudow:['Explode']})){
    const ref=catalog.rigs[name],skeleton=read(`battle/rigs/${ref.rig}/skeleton.json`);
    for(const animation of animations)assert.ok(animationTimeline(skeleton,ref.armature,animation).duration>0);
  }
});
