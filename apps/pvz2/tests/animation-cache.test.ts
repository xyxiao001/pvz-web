import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Texture, TextureSource } from 'pixi.js';
import { PixiFactory, EventObject } from 'pixi-dragonbones-runtime';

const read=(path:string)=>JSON.parse(readFileSync(new URL('../public/assets/'+path,import.meta.url),'utf8'));

for(const [name,armature,animation] of [
  ['peashooter','Peashooter','Shoot'],['sunflower','Sunflower','Produce'],['wallnut','Wall-nut','Food'],
] as const)test(`${name} cached animation preserves frame events and completion`,()=>{
  const factory=new PixiFactory(null,false),skeleton=read(`actors/${name}/skeleton.json`),atlas=read(`actors/${name}/atlas.json`);
  const texture=new Texture({source:new TextureSource({resource:{width:atlas.width,height:atlas.height}})});
  for(const key of ['uncached','cached']){factory.parseDragonBonesData(skeleton,key);factory.parseTextureAtlasData(atlas,texture,key);}
  const plain=factory.buildArmatureDisplay(armature,'uncached')!,cached=factory.buildArmatureDisplay(armature,'cached')!;
  plain.armature.clock=cached.armature.clock=null;cached.armature.cacheFrameRate=60;
  let frame=0;const events:[string[],string[]]=[[],[]];
  for(const [index,rig] of [plain,cached].entries()){
    rig.addDBEventListener(EventObject.FRAME_EVENT,event=>events[index].push(`${frame}:${event.name}`),null);
    rig.animation.play(animation,1);
  }
  for(frame=0;frame<360;frame++){
    plain.armature.advanceTime(1/60);cached.armature.advanceTime(1/60);PixiFactory.advanceTime(0);
    assert.equal(cached.animation.isCompleted,plain.animation.isCompleted,`completion at ${frame}`);
  }
  assert.ok(events[0].length>0);assert.deepEqual(events[1],events[0]);
  // Slot overrides used for armour/costumes must still take effect with cached transforms.
  const slot=cached.armature.getSlots()[0],index=slot.displayIndex;
  slot.displayIndex=-1;assert.equal(slot.displayIndex,-1);slot.displayIndex=index;assert.equal(slot.displayIndex,index);
  plain.dispose();cached.dispose();PixiFactory.advanceTime(0);factory.clear(false);PixiFactory.advanceTime(0);texture.destroy(true);
});
