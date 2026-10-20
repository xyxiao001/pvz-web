"""Export Lost City 1–33 from the pinned Cocos build."""
import hashlib, importlib.util, json, math, io
from pathlib import Path
from PIL import Image
import cocos as c
spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
e.OUT=c.OUT/'lostcity';e.OUT.mkdir(parents=True,exist_ok=True)
def walk(x):
    if isinstance(x,dict):
        yield x
        for v in x.values():yield from walk(v)
    elif isinstance(x,list):
        for v in x:yield from walk(v)
def rig(path):
    co=next(x for x in walk(e.read(path).objects) if x.get('type')=='dragonBones.ArmatureDisplay' and '_dragonAsset' in x)
    return {'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co.get('_animationName',''),'group':'lostcity'}
def props(path,names):
    objs=e.read('json/Objects/'+path).objects[0]['json']['objects']
    return {n:next(o['objdata'] for o in objs if n in o.get('aliases',[])) for n in names}
paths={'boss':'zombies/LostcityZombossMechZOMBIE','lostCrystal':'zombies/LostcityCrystalSkullZOMBIE','toadstool':'plants/ToadstoolPLANT','lostRelic':'zombies/LostcityRelicHunterZOMBIE','lostPorter':'zombies/LostcityImpPorterZOMBIE','lostGargantuar':'zombies/LostcityGargantuarZOMBIE','akee':'plants/AKEEPLANT','lostExcavator':'zombies/LostcityExcavatorZOMBIE','lostJane':'zombies/LostcityJaneZOMBIE','lostImp':'zombies/LostcityImpZOMBIE','lostcity':'zombies/LostcityBasicZOMBIE','lostcityFlag':'zombies/LostcityFlagZOMBIE','lostPilot':'zombies/LostcityLostPilotZOMBIE'}
actors={n:rig(p) for n,p in paths.items()}
rigpaths={'sandbag':'projectiles/LostcityZombossSandbagPRJ','planeShade':'11f3e4ca-6cec-468f-a528-edfdb969b8c4','crystalRay':'934810f1-439d-49e5-9cb1-d69b0ac70b79','toadTongue':'dade81c9-9a29-466e-b2cc-f10eb8b10a81','trapFlame':'tiles/FlameSpreaderTILE','trapBoulder':'tiles/BoulderTrapTILE','boulder':'projectiles/BoulderPRJ','lostTent':'tombstones/TentTOMB','lostBackpack':'tombstones/BackpackTOMB','akeeShot':'projectiles/AKEEPRJ','akeeFood':'projectiles/AKEEFoodPRJ','shovelDrop':'78e304ad-6f07-45a7-97ed-8512ba2c563d','lostcityLawn':'lawns/LostCityLAWN','lostcityNightLawn':'lawns/LostCityNightLAWN','mower':'projectiles/LostcityMowerPRJ','lostcityCone':'armors/LostcityConeARMOR','lostcityBucket':'armors/LostcityBucketARMOR'}
rigs={n:rig(p) for n,p in rigpaths.items()}
properties={'plants':props('PlantProps',['akee','toadstool']),'zombies':props('ZombieProps',['zombossmech_lostcity','lostcity_crystalskull','lostcity_relichunter','lostcity_impporter','lostcity_bug','lostcity_bug_armor1','lostcity_bug_armor2','lostcity_gargantuar','lostcity_excavator','lostcity_jane','lostcity_imp','lostcity','lostcity_armor1','lostcity_armor2','lostcity_flag','lostcity_lostpilot']),'armors':props('ArmorProps',['lostcity_armor1','lostcity_armor2']),'projectiles':props('ProjectileProps',['zomboss_lostcity_sandbag','akee','akee_pf']),'tombs':props('TombstoneProps',['tent','backpack']),'tiles':props('TileProps',['flame_spreader_trap','boulder_trap_falling_forward']),'plantAnimations':{}}
for name,description in {**actors,**rigs}.items():
    sk=json.loads((e.OUT/'rigs'/description['rig']/'skeleton.json').read_text());arm=next(a for a in sk['armature'] if a['name']==description['armature']);timelines={}
    for animation in arm['animation']:
        frame=0;events=[]
        for f in animation.get('frame',[]):
            if name=='boss' and 'action' in f:events.append({'name':f['action'],'at':frame/arm['frameRate']})
            for event in f.get('events',[]):events.append({'name':event['name'],'at':frame/arm['frameRate']})
            frame+=f.get('duration',1)
        if name=='lostCrystal' and animation['name'] in ['AbsorbStart','AbsorbEnd']:
            elapsed=0
            for f in animation['frame']:
                if 'action' in f:
                    properties.setdefault('crystalTransitions',{})[animation['name']]={'at':elapsed/arm['frameRate'],'animation':f['action']};break
                elapsed+=f.get('duration',1)
        timelines[animation['name']]={'duration':animation.get('duration',1)/arm['frameRate'],'events':events}
    properties['plantAnimations'][name]=timelines
for day in range(1,34):c.write_json(e.OUT/f'lostcity{day}.source.json',e.read(f'levels/lostcity{day}').objects[0]['json'])
for name,path in [('lawn','lawns/LostCityLAWN'),('lawn-night','lawns/LostCityNightLAWN')]:
    co=next(x for x in walk(e.read(path).objects) if x.get('type')=='dragonBones.ArmatureDisplay')
    at=e.read(co['_dragonAtlasAsset']['asset']);atlas=json.loads(at.objects[0]['_atlasJson']);rect=next(x for x in atlas['SubTexture'] if x['name']==('LawnNight' if name=='lawn-night' else 'Lawn'))
    pixels=Image.open(io.BytesIO(c.native(at.data[1][at.rec[5][0]],'png')))
    pixels.crop((rect['x'],rect['y'],rect['x']+rect['width'],rect['y']+rect['height'])).save(e.OUT/(name+'.webp'),quality=95,method=6)
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
for name in ['LOSTCITY_1_INTRO','LOSTCITY_2_INTRO','LOSTCITY_3_INTRO','LOSTCITY_4_INTRO','LOSTCITY_16_INTRO','LOSTCITY_17_INTRO','LOSTCITY_22_INTRO','LOSTCITY_OUTRO_DANGER_ROOM_KEY','LOSTCITY_INTRO_ZOMBOSS','LOSTCITY_OUTRO_ZOMBOSS','LOSTCITY_33_INTRO']:
    flow=next(o['objdata']['Flow'] for o in e.read('json/Objects/NarrativeList').objects[0]['json']['objects'] if name in o.get('aliases',[]))
    for step in flow:
        if 'Lines' in step:
            length=max(1,min(3,math.floor(len(step['Lines']['zh'])*3.1/21+.5)));step['Animation']=['Say_Small','Say_Medium','Say_Long'][length-1]
            key=('Say' if step['Action']=='SAY' else 'Playful')+'_'+['Short','Med','Long'][length-1];step['Voice']=step['Character']+'/'+key
            if step['Character']=='zombossicon':step['Animation']='Idle'
            sound(step['Voice'],npc.objects[{'crazydave':35,'winnie':39,'zombossicon':31}[step['Character']]][key])
    narratives[name]=flow
for name,path in [('music','P1_LP_Lostcity'),('minigame','MG_Lostcity'),('ultimate','UB_Lostcity')]:
    (e.OUT/(name+'.mp3')).write_bytes(c.native(c.config['uuids'][c.path_index['music/inGame/lostcity/'+path]],'mp3'))
c.write_json(e.OUT/'properties.json',properties)
c.write_json(e.OUT/'catalog.json',{'actors':actors,'rigs':rigs,'sounds':sounds,'narratives':narratives,'ui':{'note-lostcity':e.sprite(c.decode_uuid(c.config['uuids'][c.path_index['note/lostcity/spriteFrame']]))}})
c.write_json(c.ROOT/'apps/pvz2/lostcity-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(e.OUT.rglob('*')) if p.is_file()}})
print('Exported Lost City 1–33')
