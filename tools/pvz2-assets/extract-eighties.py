"""Export Eighties 1–5 from the pinned Cocos build."""
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
paths={'phatbeet':'plants/PhatBeetPLANT','cactus':'plants/CactusPLANT','eighties':'zombies/EightiesBasicZOMBIE','eightiesFlag':'zombies/EightiesFlagZOMBIE','eightiesPunk':'zombies/EightiesPunkZOMBIE'}
actors={n:rig(p) for n,p in paths.items()}
rigpaths={'phatWave':'a498e40c-beeb-49b7-8ab0-0a41aa3630f8','phatHit':'d4c65092-cccb-479f-8995-23063f8caf7a','cactusShot':'projectiles/CactusThorn0PRJ','cactusShot1':'projectiles/CactusThorn1PRJ','cactusShot2':'projectiles/CactusThorn2PRJ','cactusFood':'projectiles/CactusThornFoodPRJ','eightiesLawn':'lawns/EightiesLAWN','mower':'projectiles/EightiesMowerPRJ','eightiesCone':'armors/EightiesConeARMOR','eightiesBucket':'armors/EightiesBucketARMOR'}
rigs={n:rig(p) for n,p in rigpaths.items()}
properties={'plants':props('PlantProps',['phatbeet','cactus']),'zombies':props('ZombieProps',['eighties','eighties_armor1','eighties_armor2','eighties_flag','eighties_punk']),'armors':props('ArmorProps',['eighties_armor1','eighties_armor2']),'projectiles':props('ProjectileProps',['cactus','cactus_pf']),'plantAnimations':{}}
for name,description in {**actors,**rigs}.items():
    sk=json.loads((e.OUT/'rigs'/description['rig']/'skeleton.json').read_text());arm=next(a for a in sk['armature'] if a['name']==description['armature']);timelines={}
    for animation in arm['animation']:
        frame=0;events=[]
        for f in animation.get('frame',[]):
            for event in f.get('events',[]):events.append({'name':event['name'],'at':frame/arm['frameRate']})
            frame+=f.get('duration',1)
        timelines[animation['name']]={'duration':animation.get('duration',1)/arm['frameRate'],'events':events}
    properties['plantAnimations'][name]=timelines
for day in range(1,6):c.write_json(e.OUT/f'eighties{day}.source.json',e.read(f'levels/eighties{day}').objects[0]['json'])
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
for name in ['EIGHTIES_1_INTRO','EIGHTIES_2_INTRO','EIGHTIES_3_INTRO']:
    flow=next(o['objdata']['Flow'] for o in e.read('json/Objects/NarrativeList').objects[0]['json']['objects'] if name in o.get('aliases',[]))
    for step in flow:
        if 'Lines' in step:
            length=max(1,min(3,math.floor(len(step['Lines']['zh'])*3.1/21+.5)));step['Animation']=['Say_Small','Say_Medium','Say_Long'][length-1]
            key=('Say' if step['Action']=='SAY' else 'Playful')+'_'+['Short','Med','Long'][length-1];step['Voice']=step['Character']+'/'+key
            if step['Character']=='zombossicon':step['Animation']='Idle'
            sound(step['Voice'],npc.objects[{'crazydave':35,'winnie':39,'zombossicon':31}[step['Character']]][key])
    narratives[name]=flow
for name,path in [('music','eighties/CYS_LP_Eighties'),('jam_punk','jam/Punk_LP'),('jam_rap','jam/Rap_LP0'),('jam_pop','jam/Pop_LP0')]:
    (e.OUT/(name+'.mp3')).write_bytes(c.native(c.config['uuids'][c.path_index['music/inGame/'+path]],'mp3'))
c.write_json(e.OUT/'properties.json',properties)
c.write_json(e.OUT/'catalog.json',{'actors':actors,'rigs':rigs,'sounds':sounds,'narratives':narratives,'ui':{}})
c.write_json(c.ROOT/'apps/pvz2/eighties-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(e.OUT.rglob('*')) if p.is_file()}})
print('Exported Eighties 1–5')
