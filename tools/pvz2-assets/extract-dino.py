"""Export Dino 1–10 from the pinned Cocos build."""
import hashlib, importlib.util, json, math, io
from pathlib import Path
from PIL import Image
import cocos as c
spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
e.OUT=c.OUT/'dino';e.OUT.mkdir(parents=True,exist_ok=True)
def walk(x):
    if isinstance(x,dict):
        yield x
        for v in x.values():yield from walk(v)
    elif isinstance(x,list):
        for v in x:yield from walk(v)
def rig(path):
    co=next(x for x in walk(e.read(path).objects) if x.get('type')=='dragonBones.ArmatureDisplay' and '_dragonAsset' in x)
    return {'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co.get('_animationName',''),'group':'dino'}
def props(path,names):
    objs=e.read('json/Objects/'+path).objects[0]['json']['objects']
    return {n:next(o['objdata'] for o in objs if n in o.get('aliases',[])) for n in names}
paths={'perfumeshroom':'plants/PerfumeShroomPLANT','grapeshot':'plants/GrapeShotPLANT','primalwallnut':'plants/PrimalWallnutPLANT','dino':'zombies/DinoBasicZOMBIE','dinoFlag':'zombies/DinoFlagZOMBIE','dinoImp':'zombies/DinoImpZOMBIE'}
actors={n:rig(p) for n,p in paths.items()}
rigpaths={'stego':'dinosaurs/StegoDINOSAUR','ptero':'dinosaurs/PteroDINOSAUR','perfumeFire':'f05a1ef6-85a9-4568-a3a5-a18ddcab1dc7','raptor':'dinosaurs/RaptorDINOSAUR','dinoLawn':'lawns/DinoLAWN','mower':'projectiles/DinoMowerPRJ','dinoCone':'armors/DinoConeARMOR','dinoBucket':'armors/DinoBucketARMOR','dinoHelmet':'armors/DinoHelmetARMOR'}
rigs={n:rig(p) for n,p in rigpaths.items()}
rigs['dinoCharm']={'rig':e.rig('812b98dd-10c7-4a58-9075-03799556fd98','e6399a6e-28e3-4e94-9700-7e809f1c496f'),'armature':'Buff','animation':'Start','group':'dino'}
properties={'plants':props('PlantProps',['grapeshot','primalwallnut','perfumeshroom']),'zombies':props('ZombieProps',['dino','dino_armor1','dino_armor2','dino_armor3','dino_flag','dino_imp']),'armors':props('ArmorProps',['dino_armor1','dino_armor2','dino_armor3']),'projectiles':{},'plantAnimations':{}}
c.write_json(e.OUT/'dinosaurs.json',{**props('DinosaurProps',['raptor','stego','ptero']),'attackRect':props('RectangleProps',['DinoRaptorAttackRect'])['DinoRaptorAttackRect']['Values']})
for name,description in {**actors,**rigs}.items():
    sk=json.loads((e.OUT/'rigs'/description['rig']/'skeleton.json').read_text());arm=next(a for a in sk['armature'] if a['name']==description['armature']);timelines={}
    for animation in arm['animation']:
        frame=0;events=[]
        for f in animation.get('frame',[]):
            for event in f.get('events',[]):events.append({'name':event['name'],'at':frame/arm['frameRate']})
            frame+=f.get('duration',1)
        timelines[animation['name']]={'duration':animation.get('duration',1)/arm['frameRate'],'events':events}
    properties['plantAnimations'][name]=timelines
for day in range(1,11):c.write_json(e.OUT/f'dino{day}.source.json',e.read(f'levels/dino{day}').objects[0]['json'])
co=next(x for x in walk(e.read('lawns/DinoLAWN').objects) if x.get('type')=='dragonBones.ArmatureDisplay')
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
for name in ['DINO_1_INTRO','DINO_2_INTRO','DINO_6_INTRO','DINO_8_INTRO','DINO_9_INTRO']:
    flow=next(o['objdata']['Flow'] for o in e.read('json/Objects/NarrativeList').objects[0]['json']['objects'] if name in o.get('aliases',[]))
    for step in flow:
        if 'Lines' in step:
            length=max(1,min(3,math.floor(len(step['Lines']['zh'])*3.1/21+.5)));step['Animation']=['Say_Small','Say_Medium','Say_Long'][length-1]
            key=('Say' if step['Action']=='SAY' else 'Playful')+'_'+['Short','Med','Long'][length-1];step['Voice']=step['Character']+'/'+key
            if step['Character']=='zombossicon':step['Animation']='Idle'
            sound(step['Voice'],npc.objects[{'crazydave':35,'winnie':39,'zombossicon':31}[step['Character']]][key])
    narratives[name]=flow
for name,path in [('music','dino/CYS_LP_Dino'),('minigame','dino/MG_Dino')]:
    (e.OUT/(name+'.mp3')).write_bytes(c.native(c.config['uuids'][c.path_index['music/inGame/'+path]],'mp3'))
c.write_json(e.OUT/'properties.json',properties)
c.write_json(e.OUT/'catalog.json',{'actors':actors,'rigs':rigs,'sounds':sounds,'narratives':narratives,'ui':{}})
c.write_json(c.ROOT/'apps/pvz2/dino-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(e.OUT.rglob('*')) if p.is_file()}})
print('Exported Dino 1–10')
