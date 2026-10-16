import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { EGYPT_RULES } from '../src/game/rules';
import type { BattleCatalog } from '../src/rendering/battle-art';
const root = new URL('../public/assets/',import.meta.url);
const read = (path:string)=>JSON.parse(readFileSync(new URL(path,root),'utf8'));

test('new battle and world-window assets match their pinned provenance',()=>{
  for(const name of ['battle','window']) {
    const provenance=JSON.parse(readFileSync(new URL(`../${name}-provenance.json`,import.meta.url),'utf8'));
    assert.equal(provenance.commit,'0e4a05348b6de328e2902a57afa24a3a454a4205');
    for(const [path,info] of Object.entries(provenance.outputs) as [string,{sha256:string;bytes:number}][]) {
      const bytes=readFileSync(new URL(path,root));
      assert.equal(bytes.length,info.bytes,path);
      assert.equal(createHash('sha256').update(bytes).digest('hex'),info.sha256,path);
    }
  }
});
test('first-level narrative and sun dropper retain the referenced upstream module data',()=>{
  const catalog=read('battle/catalog.json');
  assert.deepEqual(catalog.intro.filter((s:{Lines?:object})=>s.Lines).map((s:{Character:string})=>s.Character),['winnie','winnie','crazydave','crazydave','crazydave']);
  const sun=catalog.modules.find((m:{objclass:string})=>m.objclass==='SunDropperProperties').objdata;
  assert.deepEqual([EGYPT_RULES.initialSunDelay,EGYPT_RULES.sunBase,EGYPT_RULES.sunRange,EGYPT_RULES.sunIncrease,EGYPT_RULES.sunMax],
    [sun.InitialSunDropDelay,sun.SunCountdownBase,sun.SunCountdownRange,sun.SunCountdownIncreasePerSun,sun.SunCountdownMax]);
});
test('all runtime UI and first-level character animation names resolve',()=>{
  const catalog:BattleCatalog=read('battle/catalog.json');
  const animations:Record<string,string[]>={sun:['Normal'],mower:['Idle','Attack'],shovel:['Idle'],sunIcon:['sun'],reward:['map'],crazydave:['Idle','Say_Small','Say_Medium','Say_Long'],winnie:['Idle','Say_Small','Say_Medium','Say_Long']};
  for(const [name,names] of Object.entries(animations)) {
    const ref=catalog.rigs[name],skeleton=read(`battle/rigs/${ref.rig}/skeleton.json`);
    const armature=skeleton.armature.find((a:{name:string})=>a.name===ref.armature);
    for(const animation of names)assert.ok(armature.animation.some((a:{name:string})=>a.name===animation),`${name}/${animation}`);
  }
  const cards=read(`shell/rigs/${catalog.rigs.cards.rig}/skeleton.json`);
  assert.ok(cards.armature.find((a:{name:string})=>a.name==='upper_dots').animation.some((a:{name:string})=>a.name==='dotPrice'));
});
