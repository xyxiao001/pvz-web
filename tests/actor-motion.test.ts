import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Texture } from 'pixi.js';
import { ActorRig, ACTOR_MOTION, type ActorDefinition } from '../src/rendering/actor-motion';
import { hasPlantMotionClip } from '../src/rendering/plant-motion';
import { hasGiantMotion } from '../src/rendering/giant-motion';
import animations from '../public/assets/runtime/animations.json';
import { PLANTS, LEVEL_IDS, SURVIVAL_SCENES } from '../src/game/config';
import { Game } from '../src/game/model';
import { animationNames } from '../src/rendering/asset-plan';
const definitions = Object.fromEntries([...new Set(Object.values(ACTOR_MOTION))].map(family => [family, JSON.parse(readFileSync(new URL(`../public/assets/runtime/actor-motion/${family}.json`,import.meta.url),'utf8')) as ActorDefinition]));

test('all migrated actor states keep existing cycle durations and resolvable source parts', () => {
  for (const [name,family] of Object.entries(ACTOR_MOTION)) {
    const d = definitions[family], clip = d.clips[name];
    assert.equal(clip.duration, animations.animations[name as keyof typeof animations.animations].durations.reduce((a,b)=>a+b,0), name);
    assert.ok(clip.groups.length && Number.isFinite(clip.scale) && clip.scale > 0, name);
    for (const group of clip.groups) for (const track of group.tracks) {
      assert.equal(track.poses.length,group.length,name);
      for (const pose of track.poses) {
        assert.ok(pose.slice(0,8).every(n=>Number.isFinite(n)),name);
        if (pose[8]) assert.ok(d.frames[pose[8]],`${name}: ${pose[8]}`);
      }
    }
  }
});
test('all plant and zombie animations use native transforms except explicit frame effects and rolling nuts', () => {
  const frameEffects = new Set(['sun','fume-cloud','jalapeno-fire','wallnut-roll','explodenut']);
  for (const name of Object.keys(animations.animations))
    assert.ok(frameEffects.has(name)||hasPlantMotionClip(name)||hasGiantMotion(name)||name in ACTOR_MOTION,name);
  for (const kind of Object.keys(PLANTS)) if(kind!=='explodenut') assert.ok(hasPlantMotionClip(kind)||kind in ACTOR_MOTION,kind);
});
test('native rigs survive every attack, damage and death transition without allocating new parts', () => {
  for (const [family,definition] of Object.entries(definitions)) {
    const textures=Object.fromEntries(Object.keys(definition.frames).map(name=>[name,Texture.WHITE]));
    const rig=new ActorRig(family,{definition,textures});
    const count=()=>rig.root.children.reduce((sum,g)=>sum+g.children.length,0), initial=count();
    for(const [name,clip] of Object.entries(definition.clips)) for(const loop of [false,true]) for(const time of [0,.5,clip.duration/3,clip.duration-.001,clip.duration,clip.duration*3]) {
      rig.render(name,time,loop);
      assert.equal(count(),initial,name);
      for(const g of rig.root.children) for(const part of g.children) if(part.visible){part.updateLocalTransform(); for(const value of [part.localTransform.a,part.localTransform.b,part.localTransform.c,part.localTransform.d,part.localTransform.tx,part.localTransform.ty]) assert.ok(Number.isFinite(value),name);}
    }
    rig.root.destroy({children:true});
  }
});
test('accessory and damage states preserve their original visibility rules',()=>{
  const tracks=(name:string)=>definitions[ACTOR_MOTION[name]].clips[name].groups[0].tracks;
  assert.ok(!tracks('zombie-walk').some(t=>/cone|bucket|duckytube|screendoor/.test(t.name)));
  assert.ok(tracks('cone-walk').some(t=>t.name==='anim_cone'));
  assert.ok(tracks('bucket-eat').some(t=>t.name==='anim_bucket'));
  assert.ok(!tracks('zombie-headless').some(t=>t.name.startsWith('anim_head')));
  assert.ok(!tracks('football-bare-walk').some(t=>t.name.includes('helmet')));
  assert.ok(tracks('wallnut-cracked2').some(t=>t.poses.some(p=>p[8]==='WALLNUT_CRACKED2')));
  assert.ok(tracks('pumpkin-cracked2').some(t=>t.poses.some(p=>p[8]==='PUMPKIN_DAMAGE3')));
});
test('each level selects only its needed native actor families',()=>{
  for(const game of [...LEVEL_IDS.map(l=>new Game(l,1)),...SURVIVAL_SCENES.map(s=>new Game(9,1,'endless',s))]) {
    const names=animationNames(game,Object.keys(animations.animations));
    for(const name of names) if(name in ACTOR_MOTION) assert.ok(definitions[ACTOR_MOTION[name]].clips[name]);
  }
  const first=animationNames(new Game(1,1),Object.keys(animations.animations));
  assert.ok(!first.some(n=>ACTOR_MOTION[n]==='zombie_catapult'));
});

test('frozen actor pose is reused, then resumes and changes clips without stale parts',()=>{
  const definition=definitions[ACTOR_MOTION['zombie-walk']];
  const textures=Object.fromEntries(Object.keys(definition.frames).map(name=>[name,Texture.WHITE]));
  const rig=new ActorRig('zombie',{definition,textures});
  rig.render('zombie-walk',15,true);
  let updates=0;
  for(const group of rig.root.children)for(const part of group.children){
    const set=part.position.set.bind(part.position);
    part.position.set=(x:number,y?:number)=>{updates++;return set(x,y);};
  }
  rig.render('zombie-walk',15,true);assert.equal(updates,0);
  rig.render('zombie-walk',16,true);assert.ok(updates>0);
  updates=0;rig.render('zombie-eat',16,true);assert.ok(updates>0);
  rig.root.destroy({children:true});
});
