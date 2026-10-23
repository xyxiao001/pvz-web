"""Export Modern 1–30 from the pinned Cocos build."""
import hashlib, importlib.util, json, math, io
from pathlib import Path
from PIL import Image
import cocos as c
spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
e.OUT=c.OUT/'modern';e.OUT.mkdir(parents=True,exist_ok=True)
def walk(x):
    if isinstance(x,dict):
        yield x
        for v in x.values():yield from walk(v)
    elif isinstance(x,list):
        for v in x:yield from walk(v)
def rig(path):
    co=next(x for x in walk(e.read(path).objects) if x.get('type')=='dragonBones.ArmatureDisplay' and '_dragonAsset' in x)
    return {'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co.get('_animationName',''),'group':'modern'}
def props(path,names):
    objs=e.read('json/Objects/'+path).objects[0]['json']['objects']
    return {n:next(o['objdata'] for o in objs if n in o.get('aliases',[])) for n in names}
paths={'grimrose':'plants/GrimrosePLANT','dusklobber':'plants/DuskLobberPLANT','nightshade':'plants/NightShadePLANT','shrinkingviolet':'plants/ShrinkingVioletPLANT','modern':'zombies/BasicZOMBIE','modernFlag':'zombies/BasicFlagZOMBIE','modernImp':'zombies/ImpZOMBIE','modernGargantuar':'zombies/GargantuarZOMBIE','modernNewspaper':'zombies/ModernNewspaperZOMBIE'}
actors={n:rig(p) for n,p in paths.items()}
rigpaths={'grimBeam':'6e85a039-f963-4e38-be39-23bca7b72a49','grimFoot':'dc85567c-219c-423d-9818-eb8a5ad85d6b','grimFade':'fb4b927c-a034-4f9b-9c6e-97147ab6d612','modernSliderUp':'tiles/SliderUpModernTILE','modernSliderDown':'tiles/SliderDownModernTILE','duskShot':'projectiles/Dusk0PRJ','duskFood':'projectiles/DuskFoodPRJ','duskSplat':'eb97f21b-9be5-42ab-a6fc-8d65a41c3f3f','duskFoodSplat':'44f8face-51fa-4452-b98d-090c302deeeb','modernLawn':'lawns/ModernLAWN','mower':'projectiles/ModernMowerPRJ','modernCone':'armors/BasicConeARMOR','modernBucket':'armors/BasicBucketARMOR','portal':'acc6bcdd-f971-4507-9c1e-9874201050fe','violetShrink':'254f65cc-953f-4577-a233-4c4c93b35fc0','paperDestroy':'588e78a8-3802-40e1-9a56-65a6cd515efe','nightshadeShot':'projectiles/NightShadeStartPRJ','nightshadeFood':'projectiles/NightShadeFoodPRJ','nightshadeMega':'projectiles/NightShadeStartMegaPRJ','nightshadeFoodMega':'projectiles/NightShadeFoodMegaPRJ'}
for name in ['Up','Down']:
    co=next(x for x in walk(e.read('tiles/Slider'+name+'ModernTILE').objects) if 'BG' in x)
    rigpaths['modernSlider'+name+'Back']=co['BG']['asset']
rigs={n:rig(p) for n,p in rigpaths.items()}
properties={'plants':props('PlantProps',['nightshade','shrinkingviolet','dusklobber','grimrose']),'zombies':props('ZombieProps',['tutorial','tutorial_flag','tutorial_armor1','tutorial_armor2','tutorial_imp','tutorial_gargantuar']),'armors':props('ArmorProps',['modern_armor1','modern_armor2']),'projectiles':props('ProjectileProps',['nightshade','nightshade_mega','nightshade_pf','nightshade_pf_mega','dusklobber','dusklobber_pf']),'plantAnimations':{}}
properties['zombies'].update(props('ZombieProps',['beghouled_newspaper']))
properties['zombies']['modern_newspaper']=props('ZombieProps',['newspaper'])['newspaper']
properties['zombies'].update(props('ZombieProps',['iceage_troglobite_1block','iceage_troglobite_2block']))
c.write_json(e.OUT/'portals.json',props('PortalProps',['egypt','pirate','future','beach','dark','iceage','dino','eighties']))
for name,description in {**actors,**rigs}.items():
    sk=json.loads((e.OUT/'rigs'/description['rig']/'skeleton.json').read_text());arm=next(a for a in sk['armature'] if a['name']==description['armature']);timelines={}
    for animation in arm['animation']:
        frame=0;events=[]
        for f in animation.get('frame',[]):
            for event in f.get('events',[]):events.append({'name':event['name'],'at':frame/arm['frameRate']})
            frame+=f.get('duration',1)
        timelines[animation['name']]={'duration':animation.get('duration',1)/arm['frameRate'],'events':events}
    properties['plantAnimations'][name]=timelines
for day in range(1,31):c.write_json(e.OUT/f'modern{day}.source.json',e.read(f'levels/modern{day}').objects[0]['json'])
co=next(x for x in walk(e.read('lawns/ModernLAWN').objects) if x.get('type')=='dragonBones.ArmatureDisplay')
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
        if 'soundEvents' in obj:
            for event in obj['soundEvents']:sound(name+'/'+event['eventName'],event['clips'])
        if 'soundRes' in obj:
            for key,value in obj['soundRes'].items():
                if key not in ['type','volumeScale']:sound(name+'/'+key,value)
for name,uuid in [('start','9b3a66eb-d069-4b95-ba98-a86c967db9fc'),('loop','b25ae004-cd9f-4c4f-a748-b6625077e79e'),('end','d754eacb-9686-4463-a852-3735d64a7369')]:sound('portal/'+name,{'asset':uuid})
common=e.read('resouce_prefabs/SoundsRP').objects[1]['_components'][0]
for name in ['beghouledMatch','beghouledMatchFail','beghouledShovel','beghouledRefresh']:sound(name,common[name])
npc=e.read('b697cdfd-e783-4f80-abbe-ac197db6cf97');narratives={}
for name in ['MODERN_1_INTRO','MODERN_2_INTRO','MODERN_3_INTRO','MODERN_5_INTRO','BEGHOULED_INTRO','MODERN_9_INTRO','MODERN_11_INTRO','MODERN_15_OUTRO','MODERN_16_INTRO','MODERN_17_INTRO','MODERN_19_INTRO','MODERN_OUTRO_DANGER_ROOM_KEY','MODERN_21_INTRO','MODERN_22_INTRO','MODERN_23_INTRO','MODERN_24_INTRO']:
    flow=next(o['objdata']['Flow'] for o in e.read('json/Objects/NarrativeList').objects[0]['json']['objects'] if name in o.get('aliases',[]))
    for step in flow:
        if 'Lines' in step:
            length=max(1,min(3,math.floor(len(step['Lines']['zh'])*3.1/21+.5)));step['Animation']=['Say_Small','Say_Medium','Say_Long'][length-1]
            key=('Say' if step['Action']=='SAY' else 'Playful')+'_'+['Short','Med','Long'][length-1];step['Voice']=step['Character']+'/'+key
            if step['Character']=='zombossicon':step['Animation']='Idle'
            sound(step['Voice'],npc.objects[{'crazydave':35,'winnie':39,'zombossicon':31}[step['Character']]][key])
    narratives[name]=flow
for name,path in [('music','modern/CYS_LP_Modern'),('minigame','modern/MG_Modern')]:
    (e.OUT/(name+'.mp3')).write_bytes(c.native(c.config['uuids'][c.path_index['music/inGame/'+path]],'mp3'))
# Native upgrade prices are distinct from ordinary seed costs.
costs={n:d['BeghouledCost'] for n,d in props('PlantProps',['firepeashooter','repeater','threepeater','tallnut','endurian','pepperpult','melonpult','wintermelon','coldsnapdragon','laser_bean','primalpeashooter','fumeshroom','applemortar']).items()}
# Electric blueberry omits this field; the native PlantProps constructor sets 500.
costs['electricblueberry']=500
c.write_json(e.OUT/'beghouled-costs.json',costs)
c.write_json(e.OUT/'properties.json',properties)
c.write_json(e.OUT/'catalog.json',{'actors':actors,'rigs':rigs,'sounds':sounds,'narratives':narratives,'ui':{}})
c.write_json(c.ROOT/'apps/pvz2/modern-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(e.OUT.rglob('*')) if p.is_file()}})
print('Exported Modern 1–30')
