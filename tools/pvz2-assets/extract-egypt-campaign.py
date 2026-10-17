"""Export Egypt days 2–16 from the pinned build; no assets from PVZ1 are used."""
import hashlib
import importlib.util
import io
import json
import math
from pathlib import Path
from PIL import Image
import cocos as c

spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
e.OUT=c.OUT/'campaign';e.OUT.mkdir(parents=True,exist_ok=True)

def walk(x):
    if isinstance(x,dict):
        yield x
        for v in x.values():yield from walk(v)
    elif isinstance(x,list):
        for v in x:yield from walk(v)

def rig(path,node=None):
    a=e.read(path)
    co=next(x for x in walk(a.objects if node is None else a.objects[node]) if x.get('type')=='dragonBones.ArmatureDisplay' and '_dragonAsset' in x)
    key=e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset'])
    return {'rig':key,'armature':co['_armatureName'],'animation':co.get('_animationName',''),'group':'campaign'}

def props(path,names):
    objects=e.read(path).objects[0]['json']['objects']
    return {name:next(o['objdata'] for o in objects if name in o.get('aliases',[])) for name in names}

actors={name:rig(path) for name,path in {
 'cabbagepult':'plants/CabbagePultPLANT','bloomerang':'plants/BloomerangPLANT',
 'iceburg':'plants/IcebergLettucePLANT','camel':'zombies/EgyptCamelZOMBIE',
 'bonkchoy':'plants/BonkChoyPLANT','pharaoh':'zombies/EgyptPharaohZOMBIE','pharaohInner':'zombies/EgyptPharaohInnerZOMBIE',
 'gravebuster':'plants/GraveBusterPLANT','twinsunflower':'plants/SunflowerTwinPLANT','iceweed':'plants/IceweedPLANT',
 'gargantuar':'zombies/EgyptGargantuarZOMBIE','imp':'zombies/EgyptImpZOMBIE','explorer':'zombies/EgyptExplorerZOMBIE','tombraiser':'zombies/EgyptTombRaiserZOMBIE','camelTouch':'zombies/EgyptCamelTouchZOMBIE'}.items()}
actors['camelTouch']['armature']='CamelZombie'
particles=e.read('resouce_prefabs/ParticlesRP').objects[1]['_components'][0]
drops=e.read('resouce_prefabs/DroppingsRP').objects[1]['_components'][0]
rigs={name:rig(path) for name,path in {
 'powerSnow':'projectiles/PowerSnowPRJ','cherryExplosion':particles['cherryExplosion']['asset'],'snowHit':'2f931027-eee6-47a6-a5f4-62e24a03be0e',
 'grave':'tombstones/EgyptTOMB','cabbage':'projectiles/Cabbage0PRJ','boomerang':'projectiles/Boomerang0PRJ',
 'food':drops['plantFood']['asset'],'sprout':drops['sprout']['asset'],
 'sandstorm':particles['SandStorm']['asset'],'dirtSpawn':particles['dirtSpawn']['asset'],
 'mold':'da10c95f-cce3-44e0-a653-f15670c2b52e','endangered':'tiles/EndangeredTILE',
 'iceTrap':particles['zombieIceTrap']['asset'],'iceSaw':'projectiles/IceweedSawPRJ'}.items()}
rigs['sprout']['armature']='Sprout'
power=e.read('25641b6a-95d5-418f-b213-e0829656f5dc')
powercomp=next(x for x in walk(power.objects) if 'pupjson' in x)
ui={}
for name in ['fire','snow','toss','zap','cherry']:
    button=power.ref(powercomp[name+'Button']);node=power.ref(button['node'])
    co=e.component(power,node,'cc.Sprite');ui['power-'+name]=e.sprite(co['_spriteFrame']['asset'])
for name in ['wizardFinger','wizardPoint','tossPar','flameFinger','flameSquare']:
    rigs[name]=rig(powercomp[name]['asset'])
rigs['conveyor']=rig('f096ce8b-f979-481a-b36a-5e43dcdae1a1')
# Day/night lawns have identical geometry and a separate native-resolution atlas.
lawn=e.read('lawns/EgyptNightLAWN')
co=e.component(lawn,lawn.objects[1],'dragonBones.ArmatureDisplay')
at=e.read(co['_dragonAtlasAsset']['asset']);atlas=json.loads(at.objects[0]['_atlasJson'])
rect=next(t for t in atlas['SubTexture'] if t['name']=='Lawn_Night')
texture_id=at.data[1][at.rec[5][0]]
pixels=Image.open(io.BytesIO(c.native(texture_id,'png')))
pixels.crop((rect['x'],rect['y'],rect['x']+rect['width'],rect['y']+rect['height'])).save(e.OUT/'night.webp',quality=95,method=6)
# Preserve the source level objects, including row assignments and wave action classes.
for day in range(2,17):c.write_json(e.OUT/f'egypt{day}.source.json',e.read(f'levels/egypt{day}').objects[0]['json'])
properties={'plants':props('json/Objects/PlantProps',['cabbagepult','bloomerang','iceburg','gravebuster','twinsunflower','iceweed','bonkchoy']),
 'zombies':props('json/Objects/ZombieProps',['mummy_armor2','camel_onehump','camel_twohump','camel_manyhump','camel_onehump_touch','camel_twohump_touch','camel_threehump_touch','egypt_gargantuar','egypt_imp','explorer','tomb_raiser','pharaoh','pharaoh_inner','camel_manyhump_touch']),
 'armors':props('json/Objects/ArmorProps',['egypt_armor2']),
 'grave':props('json/Objects/TombstoneProps',['gravestone_egypt'])['gravestone_egypt'],
 'projectiles':props('json/Objects/ProjectileProps',['cabbage','cabbage_pf','boomerang','powerup_snow','tombraiser_bone','iceweed_saw'])}
properties['powerups']={o['objdata']['TypeName']:o['objdata'] for o in e.read(powercomp['pupjson']['asset']).objects[0]['json']['objects'][:5]}
c.write_json(e.OUT/'properties.json',properties)
npc=e.read('b697cdfd-e783-4f80-abbe-ac197db6cf97')
narratives={}
sounds={}
def sound(name,value):
    refs=value if isinstance(value,list) else [value];sounds[name]=[]
    for ref in refs:
        clip=e.read(ref['asset']);ext=clip.objects[0]['_native'];target=e.OUT/'audio'/(ref['asset']+ext)
        target.parent.mkdir(exist_ok=True);target.write_bytes(c.native(ref['asset'],ext.lstrip('.')));sounds[name].append(str(target.relative_to(c.OUT)))
for name in ['EGYPT_CHALLENGE_CONVEYOR_INTRO','POWERUPS_TUTORIAL_INITIAL','POWERUPS_TUTORIAL_REPEAT','EGYPT_INTRO_GARGANTUAR','EGYPT_OUTRO_GARGANTUAR','EGYPT_CHALLENGE_PRESET_A','EGYPT_OUTRO_DANGER_ROOM_KEY','EGYPT_CHALLENGE_PROTECTPLANTS_A']:
    flow=next(o['objdata']['Flow'] for o in e.read('json/Objects/NarrativeList').objects[0]['json']['objects'] if name in o.get('aliases',[]))
    for step in flow:
        if 'Lines' in step:
            length=max(1,min(3,math.floor(len(step['Lines']['zh'])*3.1/21+.5)))
            step['Animation']=['Say_Small','Say_Medium','Say_Long'][length-1]
            key=('Say' if step['Action']=='SAY' else 'Playful')+'_'+['Short','Med','Long'][length-1]
            step['Voice']=step['Character']+'/'+key
            sound(step['Voice'],npc.objects[35 if step['Character']=='crazydave' else 39][key])
    narratives[name]=flow
for name,prefab in [('cabbagepult','CabbagePult'),('bloomerang','Bloomerang'),('bonkchoy','BonkChoy')]:
    co=next(x for x in walk(e.read('plants/'+prefab+'PLANT').objects) if 'soundRes' in x)
    for key,value in co['soundRes'].items():
        if isinstance(value,(dict,list)) and value:sound(name+'/'+key,value)
ice=next(x for x in walk(e.read('plants/IcebergLettucePLANT').objects) if 'deadSound' in x)
for key in ['deadSound','foodSound','foodBlastSound']:sound('iceburg/'+key,ice[key])
sound('power/flame',powercomp['flameLPSound'])
soundprops=e.read('resouce_prefabs/SoundsRP').objects[1]['_components'][0]
for key in ['powerUpSnowStart','powerUpCherryStart','powerUpWizardStart','powerUpFlameStart','powerUpEnd']:
    sound(key,soundprops[key])
for name,path,keys in [
 ('camelTouch','zombies/EgyptCamelTouchZOMBIE',['flipSound','matchSound']),
 ('gargantuar','zombies/EgyptGargantuarZOMBIE',['stepSounds','deathPoleSounds','deathFallSounds','swingSounds','smashSounds','afterSmashSaySounds','ImpThrowSaySounds','ImpThrowSounds','throwSounds']),
 ('tombraiser','zombies/EgyptTombRaiserZOMBIE',['pukeSound','throwSound']),
 ('gravebuster','plants/GraveBusterPLANT',['chompSound'])]:
    data=e.read(path)
    co=next(x for x in walk(data.objects) if keys[0] in x)
    for key in keys:
        if co.get(key):sound(name+'/'+key,co[key])
    if name=='gargantuar':rigs['pharaohBreak']=rig(co['pharaohBreakParticle']['asset'])
# The tomb bone uses its own projectile prefab and native trail/hit rig.
rigs['tombBone']=rig('projectiles/TombBonePRJ')
ui['note-egypt']=e.sprite(c.decode_uuid(c.config['uuids'][c.path_index['note/egypt/spriteFrame']]))
music='music/inGame/egypt/MG_Egypt' ;uuid=c.config['uuids'][c.path_index[music]]
(e.OUT/'minigame.mp3').write_bytes(c.native(uuid,'mp3'))
c.download('docs/assets/main/index.js')
c.write_json(e.OUT/'catalog.json',{'actors':actors,'rigs':rigs,'ui':ui,'sounds':sounds,'narratives':narratives})
c.write_json(c.ROOT/'apps/pvz2/campaign-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(e.OUT.rglob('*')) if p.is_file()}})
print('Exported',sum(p.stat().st_size for p in e.OUT.rglob('*') if p.is_file()),'bytes')
