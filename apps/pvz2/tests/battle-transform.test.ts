import test from 'node:test';
import assert from 'node:assert/strict';
import { Sprite, Texture, TextureSource } from 'pixi.js';
import { PixiFactory } from 'pixi-dragonbones-runtime';
import { readFileSync } from 'node:fs';
import { BattleFactory, BoneSprite } from '../src/rendering/battle-factory';

const matrix = (sprite: Sprite) => {
  sprite.updateLocalTransform();
  const {a,b,c,d,tx,ty}=sprite.localTransform;
  return [a,b,c,d,tx,ty];
};

test('batched bone transforms preserve Pixi matrices, including skew, pivot and reflections', () => {
  const plain=new Sprite(),batched=new BoneSprite();
  for(let i=0;i<360;i++){
    const options={x:i*.7,y:-i*.3,scaleX:Math.sin(i)*2,scaleY:Math.cos(i)*3,rotation:i*.1,skewX:Math.sin(i*.3),skewY:Math.cos(i*.2),pivotX:i%9,pivotY:i%7,originX:i%3,originY:i%5};
    plain.updateTransform(options);batched.updateTransform(options);
    assert.deepEqual(matrix(batched),matrix(plain));
    // Direct changes between animation updates (e.g. slots/attachments) still notify Pixi.
    plain.rotation+=.5;batched.rotation+=.5;
    plain.position.set(2,3);batched.position.set(2,3);
    assert.deepEqual(matrix(batched),matrix(plain));
  }
  plain.destroy();batched.destroy();
});

test('a complete slot transform recomputes skew once and unchanged transforms do no work',()=>{
  const sprite=new BoneSprite();let updates=0;
  const original=sprite['_updateSkew'];sprite['_updateSkew']=function(){updates++;original.call(this);};
  const transform={x:10,y:20,scaleX:2,scaleY:3,rotation:.3,skewX:.2,skewY:.1};
  sprite.updateTransform(transform);assert.equal(updates,1);
  const tick=sprite._didContainerChangeTick;
  sprite.updateTransform(transform);assert.equal(updates,1);assert.equal(sprite._didContainerChangeTick,tick);
  sprite.destroy();
});

for(const [name,armature,animation] of [
  ['peashooter','Peashooter','Shoot'],['sunflower','Sunflower','Produce'],['wallnut','Wall-nut','Food'],['mummy','EgyptBasicZombie','Walk'],
] as const)test(`${name} optimized slots match original animation transforms and visibility`,()=>{
  const read=(file:string)=>JSON.parse(readFileSync(new URL(`../public/assets/actors/${name}/${file}.json`,import.meta.url),'utf8'));
  const skeleton=read('skeleton'),atlas=read('atlas');
  const texture=new Texture({source:new TextureSource({resource:{width:atlas.width,height:atlas.height}})});
  const factories=[new PixiFactory(null,false),new BattleFactory(null,false)];
  const rigs=factories.map(factory=>{factory.parseDragonBonesData(skeleton,name);factory.parseTextureAtlasData(atlas,texture,name);const rig=factory.buildArmatureDisplay(armature,name)!;rig.armature.clock=null;rig.armature.cacheFrameRate=60;rig.animation.play(animation,0);return rig;});
  for(let frame=0;frame<180;frame++){
    for(const rig of rigs)rig.armature.advanceTime(1/60);
    const [plain,optimized]=rigs.map(rig=>rig.armature.getSlots());
    for(let i=0;i<plain.length;i++){
      assert.equal(optimized[i].displayIndex,plain[i].displayIndex);
      if(plain[i].display){assert.deepEqual(matrix(optimized[i].display),matrix(plain[i].display));assert.equal(optimized[i].display.visible,plain[i].display.visible);}
    }
  }
  for(const rig of rigs)rig.dispose();PixiFactory.advanceTime(0);
  for(const factory of factories)factory.clear(false);PixiFactory.advanceTime(0);texture.destroy(true);
});
