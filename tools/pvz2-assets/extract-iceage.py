"""Export Frostbite Caves 1–13 from the pinned Cocos build."""
import hashlib, importlib.util, json, math, io
from pathlib import Path
from PIL import Image
import cocos as c
spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
e.OUT=c.OUT/'iceage';e.OUT.mkdir(parents=True,exist_ok=True)
def walk(x):
    if isinstance(x,dict):
        yield x
        for v in x.values():yield from walk(v)
    elif isinstance(x,list):
        for v in x:yield from walk(v)
def rig(path):
    co=next(x for x in walk(e.read(path).objects) if x.get('type')=='dragonBones.ArmatureDisplay' and '_dragonAsset' in x)
    return {'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co.get('_animationName',''),'group':'iceage'}
def props(path,names):
    objs=e.read('json/Objects/'+path).objects[0]['json']['objects']
    return {n:next(o['objdata'] for o in objs if n in o.get('aliases',[])) for n in names}
paths={'iceageDodo':'zombies/IceageDodoRiderZOMBIE','iceageGargantuar':'zombies/IceageGargantuarZOMBIE','iceage':'zombies/IceageBasicZOMBIE','iceageFlag':'zombies/IceageFlagZOMBIE','hotpotato':'plants/HotPotatoPLANT','pepperpult':'plants/PepperPultPLANT','iceageHunter':'zombies/IceageHunterZOMBIE','iceageImp':'zombies/IceageImpZOMBIE'}
actors={n:rig(p) for n,p in paths.items()}
rigpaths={'pepper':'projectiles/Pepper0PRJ','pepper_pf':'projectiles/PepperFoodPRJ','hunterSnowball':'projectiles/HunterSnowballPRJ','iceageHelmet':'armors/IceageHelmetARMOR','plantHeat':'59769182-6623-445b-9854-436c819b1d5b','snowstorm':'e3665cb0-62c9-435f-83d8-8efd6f3ff54e','frostWind':'fd7ee129-9b50-4adb-8916-186f9fbca1e4','icePrepare':'b70e9172-16cb-44be-9b8d-8913365cfffe','iceageLawn':'lawns/IceageLAWN','mower':'projectiles/IceageMowerPRJ','iceageCone':'armors/IceageConeARMOR','iceageBucket':'armors/IceageBucketARMOR','sliderUp':'tiles/SliderUpTILE','sliderDown':'tiles/SliderDownTILE','icePlant':'tombstones/IceblockPlantTOMB','iceZombie':'tombstones/IceblockZombieTOMB','icePlantBack':'e065093b-8af4-4590-9569-5135edd1dd0a','iceZombieBack':'7dfb7272-28ae-4d65-ae22-bf8d32b7d6a9','iceBreak':'0949e4ef-695a-4992-8860-e51883cecc87','hotVapour':'bcd8c21f-8aa5-495d-8f79-00ec51e398ca','hotPuddle':'4e5c6a43-15d4-469a-b7cc-f9c48b2f083f'}
for name in ['Up','Down']:
    co=next(x for x in walk(e.read('tiles/Slider'+name+'TILE').objects) if 'BG' in x)
    rigpaths['slider'+name+'Back']=co['BG']['asset']
rigs={n:rig(p) for n,p in rigpaths.items()}
properties={'plants':props('PlantProps',['hotpotato','pepperpult']),'zombies':props('ZombieProps',['iceage_dodo','iceage_gargantuar','iceage','iceage_armor1','iceage_armor2','iceage_flag','iceage_hunter','iceage_imp','iceage_armor3']),'armors':props('ArmorProps',['iceage_armor1','iceage_armor2','iceage_armor3']),'projectiles':props('ProjectileProps',['pepper','pepper_pf','hunter_snowball']),'plantAnimations':{}}
# Omitted hunter fields use IceageHunterZombie's native class defaults.
properties['zombies']['iceage_hunter'].update({'NearAttackRange':1,'TimeBeforeFirst':7,'TimeBeforeFirstAddtional':2,'TimeBetweenBarrages':9,'TimeBetweenBarragesAddtional':3})
# Dodo flight distance uses the native class defaults.
properties['zombies']['iceage_dodo'].update({'SquaresToFlyOver':1,'SquaresToFlyOverAdditional':1})
for name,description in {**actors,**rigs}.items():
    sk=json.loads((e.OUT/'rigs'/description['rig']/'skeleton.json').read_text());arm=next(a for a in sk['armature'] if a['name']==description['armature']);timelines={}
    for animation in arm['animation']:
        frame=0;events=[]
        for f in animation.get('frame',[]):
            for event in f.get('events',[]):events.append({'name':event['name'],'at':frame/arm['frameRate']})
            frame+=f.get('duration',1)
        timelines[animation['name']]={'duration':animation.get('duration',1)/arm['frameRate'],'events':events}
    properties['plantAnimations'][name]=timelines
for day in range(1,14):c.write_json(e.OUT/f'iceage{day}.source.json',e.read(f'levels/iceage{day}').objects[0]['json'])
lawn=e.read('lawns/IceageLAWN');co=next(x for x in walk(lawn.objects) if x.get('type')=='dragonBones.ArmatureDisplay')
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
                if key!='type':sound(name+'/'+key,value)
npc=e.read('b697cdfd-e783-4f80-abbe-ac197db6cf97');narratives={}
for name in ['ICEAGE_INTRO_FIRSTLEVEL','ICEAGE_INTRO_ICEBLOCKS','ICEAGE_INTRO_HURRIKALE','ICEAGE_INTRO_PEPPERPULT','ICEAGE_INTRO_FLAMETHROWER','ICEAGE_INTRO_CHARDGUARD']:
    flow=next(o['objdata']['Flow'] for o in e.read('json/Objects/NarrativeList').objects[0]['json']['objects'] if name in o.get('aliases',[]))
    for step in flow:
        if 'Lines' in step:
            length=max(1,min(3,math.floor(len(step['Lines']['zh'])*3.1/21+.5)));step['Animation']=['Say_Small','Say_Medium','Say_Long'][length-1]
            key=('Say' if step['Action']=='SAY' else 'Playful')+'_'+['Short','Med','Long'][length-1];step['Voice']=step['Character']+'/'+key
            sound(step['Voice'],npc.objects[{'crazydave':35,'winnie':39}[step['Character']]][key])
    narratives[name]=flow
for name,path in [('music','P1_LP_Iceage'),('ultimate','UB_Iceage'),('minigame','MG_Iceage')]:
    (e.OUT/(name+'.mp3')).write_bytes(c.native(c.config['uuids'][c.path_index['music/inGame/iceage/'+path]],'mp3'))
c.write_json(e.OUT/'ice.json',props('TombstoneProps',['planttarget_iceblock','zombietarget_iceblock']))
c.write_json(e.OUT/'properties.json',properties)
c.write_json(e.OUT/'catalog.json',{'actors':actors,'rigs':rigs,'sounds':sounds,'narratives':narratives,'ui':{}})
c.write_json(c.ROOT/'apps/pvz2/iceage-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(e.OUT.rglob('*')) if p.is_file()}})
print('Exported Frostbite Caves 1–13')
