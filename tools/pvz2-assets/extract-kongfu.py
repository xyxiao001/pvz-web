"""Export Kongfu 1–11 from the pinned Cocos build."""
import hashlib, importlib.util, json, math, io
from pathlib import Path
from PIL import Image
import cocos as c
spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
e.OUT=c.OUT/'kongfu';e.OUT.mkdir(parents=True,exist_ok=True)
def walk(x):
    if isinstance(x,dict):
        yield x
        for v in x.values():yield from walk(v)
    elif isinstance(x,list):
        for v in x:yield from walk(v)
def rig(path):
    co=next(x for x in walk(e.read(path).objects) if x.get('type')=='dragonBones.ArmatureDisplay' and '_dragonAsset' in x)
    return {'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co.get('_animationName',''),'group':'kongfu'}
def props(path,names):
    objs=e.read('json/Objects/'+path).objects[0]['json']['objects']
    return {n:next(o['objdata'] for o in objs if n in o.get('aliases',[])) for n in names}
paths={'bambooshoot':'plants/BambooShootPLANT','kongfuBomb':'zombies/KongfuBombZOMBIE','kongfuDrink':'zombies/KongfuDrinkZOMBIE','kongfuGong':'zombies/KongfuGongZOMBIE','kongfuStatue':'zombies/KongfuBronzeStatueZOMBIE','kongfuStrong':'zombies/KongfuBronzeStrongZOMBIE','kongfu':'zombies/KongfuBasicZOMBIE','kongfuFlag':'zombies/KongfuFlagZOMBIE','kongfuTorch':'zombies/KongfuTorchZOMBIE','kongfuHammer':'zombies/KongfuHammerZOMBIE','kongfuRocket':'zombies/RocketImpZOMBIE'}
actors={n:rig(p) for n,p in paths.items()}
rigpaths={'bamboo':'46b9fef7-31a0-4593-ab48-9375b8bb74fa','bambooPF':'fa930119-b900-49cc-b1ca-5383a03e398f','kongfuHelmet':'armors/KongfuHelmetARMOR','kongfuLawn':'lawns/KongfuLAWN','mower':'projectiles/KongfuMowerPRJ','kongfuCone':'armors/KongfuConeARMOR','kongfuBucket':'armors/KongfuBucketARMOR','taichi':'tiles/TaichiTILE','kongfuRack':'tombstones/KongfuArmRackTOMB','kongfuTNT':'tombstones/KongfuTNTTOMB'}
rigs={n:rig(p) for n,p in rigpaths.items()}
for co in walk(e.read('tombstones/KongfuTNTTOMB').objects):
    if co.get('type')=='dragonBones.ArmatureDisplay' and co.get('_armatureName') in ['Rope','Roll','Spark']:
        rigs['tnt'+co['_armatureName']]={'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co['_animationName'],'group':'kongfu'}
properties={'plants':props('PlantProps',['bambooshoot']),'zombies':props('ZombieProps',['kongfu_bomb','kongfu_drink','kongfu_gong','kongfu_bronze_statue','kongfu_bronze_strong','kongfu_armor3','kongfu','kongfu_armor1','kongfu_armor2','kongfu_flag','kongfu_torch','kongfu_hammer','kongfu_rocket_imp']),'armors':props('ArmorProps',['kongfu_armor3','kongfu_armor1','kongfu_armor2']),'tombs':props('TombstoneProps',['kongfu_rack_torch','kongfu_rack_hammer','kongfu_rack_bomb','kongfu_rack_flag','kongfu_rack_helmet']),'tiles':props('TileProps',['taichitile']),'projectiles':{},'plantAnimations':{}}
for name,description in {**actors,**rigs}.items():
    sk=json.loads((e.OUT/'rigs'/description['rig']/'skeleton.json').read_text());arm=next(a for a in sk['armature'] if a['name']==description['armature']);timelines={}
    for animation in arm['animation']:
        frame=0;events=[]
        for f in animation.get('frame',[]):
            for event in f.get('events',[]):events.append({'name':event['name'],'at':frame/arm['frameRate']})
            frame+=f.get('duration',1)
        timelines[animation['name']]={'duration':animation.get('duration',1)/arm['frameRate'],'events':events}
    properties['plantAnimations'][name]=timelines
for day in range(1,12):c.write_json(e.OUT/f'kongfu{day}.source.json',e.read(f'levels/kongfu{day}').objects[0]['json'])
co=next(x for x in walk(e.read('lawns/KongfuLAWN').objects) if x.get('type')=='dragonBones.ArmatureDisplay')
at=e.read(co['_dragonAtlasAsset']['asset']);atlas=json.loads(at.objects[0]['_atlasJson']);rect=next(x for x in atlas['SubTexture'] if x['name']=='mid')
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
for name in ['KONGFU_1_INTRO','KONGFU_2_INTRO','KONGFU_4_INTRO','KONGFU_6_INTRO','KONGFU_8_INTRO','KONGFU_11_INTRO']:
    flow=next(o['objdata']['Flow'] for o in e.read('json/Objects/NarrativeList').objects[0]['json']['objects'] if name in o.get('aliases',[]))
    for step in flow:
        if 'Lines' in step:
            length=max(1,min(3,math.floor(len(step['Lines']['zh'])*3.1/21+.5)));step['Animation']=['Say_Small','Say_Medium','Say_Long'][length-1]
            key=('Say' if step['Action']=='SAY' else 'Playful')+'_'+['Short','Med','Long'][length-1];step['Voice']=step['Character']+'/'+key
            if step['Character']=='zombossicon':step['Animation']='Idle'
            sound(step['Voice'],npc.objects[{'crazydave':35,'winnie':39,'zombossicon':31}[step['Character']]][key])
    narratives[name]=flow
(e.OUT/'music.mp3').write_bytes(c.native(c.config['uuids'][c.path_index['music/inGame/kongfu/P1_LP_Kongfu']],'mp3'))
(e.OUT/'minigame.mp3').write_bytes(c.native(c.config['uuids'][c.path_index['music/inGame/kongfu/MG_Kongfu']],'mp3'))
c.write_json(e.OUT/'properties.json',properties)
c.write_json(e.OUT/'catalog.json',{'actors':actors,'rigs':rigs,'sounds':sounds,'narratives':narratives,'ui':{}})
c.write_json(c.ROOT/'apps/pvz2/kongfu-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(e.OUT.rglob('*')) if p.is_file()}})
print('Exported Kongfu 1–11')
