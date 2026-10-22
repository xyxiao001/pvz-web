"""Export Eighties 1–35 from the pinned Cocos build."""
import hashlib, importlib.util, json, math, io
from pathlib import Path
from PIL import Image
import cocos as c
spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
e.OUT=c.OUT/'eighties';e.OUT.mkdir(parents=True,exist_ok=True)
def walk(x):
    if isinstance(x,dict):
        yield x
        for v in x.values():yield from walk(v)
    elif isinstance(x,list):
        for v in x:yield from walk(v)
def rig(path):
    co=next(x for x in walk(e.read(path).objects) if x.get('type')=='dragonBones.ArmatureDisplay' and '_dragonAsset' in x)
    return {'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co.get('_animationName',''),'group':'eighties'}
def props(path,names):
    objs=e.read('json/Objects/'+path).objects[0]['json']['objects']
    return {n:next(o['objdata'] for o in objs if n in o.get('aliases',[])) for n in names}
paths={'eightiesBoss':'zombies/EightiesZombossMechZOMBIE','intensivecarrot':'plants/IntensiveCarrotPLANT','eightiesBoomBox':'zombies/EightiesBoomBoxZOMBIE','sporeshroom':'plants/SporeShroomPLANT','eightiesArcade':'zombies/EightiesArcadeZOMBIE','eighties8Bit':'zombies/Eighties8BitZOMBIE','garlic':'plants/GarlicPLANT','eightiesBreakDancer':'zombies/EightiesBreakDancerZOMBIE','eightiesGargantuar':'zombies/EightiesGargantuarZOMBIE','eightiesImp':'zombies/EightiesImpZOMBIE','thymewarp':'plants/ThymeWarpPLANT','eightiesGlitter':'zombies/EightiesGlitterZOMBIE','eightiesMC':'zombies/EightiesMCZOMBIE','phatbeet':'plants/PhatBeetPLANT','cactus':'plants/CactusPLANT','eighties':'zombies/EightiesBasicZOMBIE','eightiesFlag':'zombies/EightiesFlagZOMBIE','eightiesPunk':'zombies/EightiesPunkZOMBIE'}
actors={n:rig(p) for n,p in paths.items()}
rigpaths={'speaker':'tombstones/EightiesSpeakerTOMB','speakerWave':'projectiles/EightiesSpeakerWavePRJ','bandUp':'4feb644a-b93d-4a94-a8f9-80295cc38d5a','bandMid':'69879f3e-d03a-4563-8eb6-eedbb1b50a77','bandDown':'c702d643-5154-4f78-b247-c692055ea5ae','bossCostume':'6e573cfd-2260-4ed9-be41-297c6832581f','carrotRevive':'plants/IntensiveCarrotPLANT','boomboxLove':'8729d84f-fbef-48da-96f8-ee4badfaed89','arcadeBreak':'7f5a1d36-3a4a-4e8f-8be9-8e65b83da513','sporeShot':'projectiles/Spore0PRJ','sporeShot1':'projectiles/Spore1PRJ','sporeShot2':'projectiles/Spore2PRJ','sporeFood':'projectiles/SporeFoodPRJ','sporeSpawn':'a4ea0c2c-83be-4855-a73d-62fd28f2dda3','arcadeCabinet':'tombstones/EightiesArcadeCabinetTOMB','eighties8BitCone':'armors/Eighties8BitConeARMOR','eighties8BitBucket':'armors/Eighties8BitBucketARMOR','garlicDisgust':'68fab54f-6538-4457-939b-f26d6f2fec2e','metalWave':'projectiles/EightiesGargantuarWavePRJ','metalHit':'507da2a0-90a2-4a7f-976d-1eae1cfbad26','punkHead':'15c76516-48e7-4ec8-b4d1-17a9df1804ca','thymeTeleport':'9bd3ba42-e3c6-4135-aa9e-436cb27641f6','glitterTrail':'6df28bce-e93a-4e9c-8fdc-8bd7561d78f4','glitterHit':'39273825-cab5-4b56-b404-29ec11769c97','phatWave':'a498e40c-beeb-49b7-8ab0-0a41aa3630f8','phatHit':'d4c65092-cccb-479f-8995-23063f8caf7a','cactusShot':'projectiles/CactusThorn0PRJ','cactusShot1':'projectiles/CactusThorn1PRJ','cactusShot2':'projectiles/CactusThorn2PRJ','cactusFood':'projectiles/CactusThornFoodPRJ','eightiesLawn':'lawns/EightiesLAWN','mower':'projectiles/EightiesMowerPRJ','eightiesCone':'armors/EightiesConeARMOR','eightiesBucket':'armors/EightiesBucketARMOR'}
rigs={n:rig(p) for n,p in rigpaths.items()}
properties={'plants':props('PlantProps',['intensivecarrot','sporeshroom','phatbeet','cactus','thymewarp','garlic']),'zombies':props('ZombieProps',['zombossmech_eighties','eighties_boombox','eighties_arcade','eighties_8bit','eighties_8bit_armor1','eighties_8bit_armor2','eighties','eighties_armor1','eighties_armor2','eighties_flag','eighties_punk','eighties_glitter','eighties_mc','eighties_gargantuar','eighties_imp','eighties_breakdancer']),'armors':props('ArmorProps',['eighties_8bit_armor1','eighties_8bit_armor2','eighties_armor1','eighties_armor2']),'projectiles':props('ProjectileProps',['eighties_speaker_wave','sporeshroom_spore','sporeshroom_spore_pf','cactus','cactus_pf','eighties_gargantuar_wave']),'tombs':props('TombstoneProps',['speaker','eightiesarcadecabinet']),'plantAnimations':{}}
for name,description in {**actors,**rigs}.items():
    sk=json.loads((e.OUT/'rigs'/description['rig']/'skeleton.json').read_text());arm=next(a for a in sk['armature'] if a['name']==description['armature']);timelines={}
    for animation in arm['animation']:
        frame=0;events=[]
        for f in animation.get('frame',[]):
            for event in f.get('events',[]):events.append({'name':event['name'],'at':frame/arm['frameRate']})
            frame+=f.get('duration',1)
        timelines[animation['name']]={'duration':animation.get('duration',1)/arm['frameRate'],'events':events}
    properties['plantAnimations'][name]=timelines
for day in range(1,36):c.write_json(e.OUT/f'eighties{day}.source.json',e.read(f'levels/eighties{day}').objects[0]['json'])
co=next(x for x in walk(e.read('lawns/EightiesLAWN').objects) if x.get('type')=='dragonBones.ArmatureDisplay')
at=e.read(co['_dragonAtlasAsset']['asset']);atlas=json.loads(at.objects[0]['_atlasJson']);rect=next(x for x in atlas['SubTexture'] if x['name']=='Lawn')
pixels=Image.open(io.BytesIO(c.native(at.data[1][at.rec[5][0]],'png')))
pixels.crop((rect['x'],rect['y'],rect['x']+rect['width'],rect['y']+rect['height'])).save(e.OUT/'lawn.webp',quality=95,method=6)
sounds={}
def sound(name,value):
    refs=value if isinstance(value,list) else [value];sounds[name]=[]
    for ref in refs:
        clip=e.read(ref['asset']);ext=clip.objects[0]['_native'];target=e.OUT/'audio'/(ref['asset']+ext);target.parent.mkdir(exist_ok=True)
        target.write_bytes(c.native(ref['asset'],ext.lstrip('.')));sounds[name].append(str(target.relative_to(c.OUT)))
for name,path in {**paths,**rigpaths}.items():
    for obj in walk(e.read(path).objects):
        for key,value in obj.items():
            if key.lower().endswith(('sound','sounds')) and value:sound(name+'/'+key,value)
        if 'soundRes' in obj:
            for key,value in obj['soundRes'].items():
                if key not in ['type','volumeScale']:sound(name+'/'+key,value)
npc=e.read('b697cdfd-e783-4f80-abbe-ac197db6cf97');narratives={}
for name in ['EIGHTIES_32_INTRO','EIGHTIES_32_OUTRO','EIGHTIES_33_INTRO','EIGHTIES_35_INTRO','EIGHTIES_26_INTRO','EIGHTIES_22_INTRO','EIGHTIES_1_INTRO','EIGHTIES_2_INTRO','EIGHTIES_3_INTRO','EIGHTIES_15_OUTRO','EIGHTIES_16_INTRO','EIGHTIES_17_INTRO','EIGHTIES_OUTRO_DANGER_ROOM_KEY']:
    flow=next(o['objdata']['Flow'] for o in e.read('json/Objects/NarrativeList').objects[0]['json']['objects'] if name in o.get('aliases',[]))
    # The pinned day-17 dialogue spells this existing NPC with a capital W.
    if name=='EIGHTIES_17_INTRO':flow[3]['Character']='winnie'
    if name=='EIGHTIES_22_INTRO':
        for step in flow:
            if step.get('Character')=='crazyDave':step['Character']='crazydave'
    for step in flow:
        if 'Lines' in step:
            length=max(1,min(3,math.floor(len(step['Lines']['zh'])*3.1/21+.5)));step['Animation']=['Say_Small','Say_Medium','Say_Long'][length-1]
            key=('Say' if step['Action']=='SAY' else 'Playful')+'_'+['Short','Med','Long'][length-1];step['Voice']=step['Character']+'/'+key
            if step['Character']=='zombossicon':step['Animation']='Idle'
            sound(step['Voice'],npc.objects[{'crazydave':35,'winnie':39,'zombossicon':31}[step['Character']]][key])
    narratives[name]=flow
for name,path in [('jam_ballad','jam/Ballad_LP'),('jam_8bit','jam/8bit_LP'),('music','eighties/CYS_LP_Eighties'),('jam_punk','jam/Punk_LP'),('jam_rap','jam/Rap_LP0'),('jam_pop','jam/Pop_LP0'),('jam_metal','jam/Metal_LP0')]:
    (e.OUT/(name+'.mp3')).write_bytes(c.native(c.config['uuids'][c.path_index['music/inGame/'+path]],'mp3'))
c.write_json(e.OUT/'properties.json',properties)
c.write_json(e.OUT/'catalog.json',{'actors':actors,'rigs':rigs,'sounds':sounds,'narratives':narratives,'ui':{}})
c.write_json(c.ROOT/'apps/pvz2/eighties-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(e.OUT.rglob('*')) if p.is_file()}})
print('Exported Eighties 1–35')
