"""Export Sky 1–20 from the pinned Cocos build."""
import hashlib, importlib.util, json, math, io, copy
from pathlib import Path
from PIL import Image
import cocos as c
spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
e.OUT=c.OUT/'sky';e.OUT.mkdir(parents=True,exist_ok=True)
def walk(x):
    if isinstance(x,dict):
        yield x
        for v in x.values():yield from walk(v)
    elif isinstance(x,list):
        for v in x:yield from walk(v)
def rig(path):
    co=next(x for x in walk(e.read(path).objects) if x.get('type')=='dragonBones.ArmatureDisplay' and '_dragonAsset' in x)
    return {'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co.get('_animationName',''),'group':'sky'}
def props(path,names):
    objs=e.read('json/Objects/'+path).objects[0]['json']['objects']
    return {n:next(o['objdata'] for o in objs if n in o.get('aliases',[])) for n in names}
paths={'skyDroneMaker':'zombies/SkyDroneMakerZOMBIE','skyDrone':'zombies/SkyDroneZOMBIE','skyAirRaidTwin':'zombies/SkyAirRaidTwinZOMBIE','skyElectric':'zombies/SkyElectricZOMBIE','skyGargantuar':'zombies/SkyGargantuarZOMBIE','moonbean':'plants/MoonBeanPLANT','anthurium':'plants/AnthuriumPLANT','skyTwinLower':'zombies/SkyTwinLowerZOMBIE','skyTwinUpper':'zombies/SkyTwinUpperZOMBIE','skyshooter':'plants/SkyshooterPLANT','asparagus':'plants/AsparagusPLANT','sky':'zombies/SkyBasicZOMBIE','skyFlag':'zombies/SkyFlagZOMBIE','skyImp':'zombies/SkyImpZOMBIE','skyBattlePlane':'zombies/SkyBattlePlaneZOMBIE','skyDropShip':'zombies/SkyDropShipZOMBIE'}
actors={n:rig(p) for n,p in paths.items()}
rigpaths={'skyAirRaidStar':'projectiles/ShootingstarFoodPRJ','skyHelmet':'armors/SkyHelmetARMOR','skyBoltPositive':'projectiles/SkyBoltPositivePRJ','skyBoltNegative':'projectiles/SkyBoltNegativePRJ','skyBoltHitPositive':'0e18f96c-a237-4fd2-9f61-eefb043d6dab','skyBoltHitNegative':'c97f66f1-b418-4ff9-ade1-f10c4ad4eb92','airRaid0':'projectiles/AirRaid0PRJ','airRaid1':'projectiles/AirRaid1PRJ','anthuriumBolt':'projectiles/AnthuriumBoltPRJ','anthuriumBoltBig':'projectiles/AnthuriumBoltBigPRJ','moonRay':'7d1e180f-39b8-4591-beed-2cbd85b3b4c5','anthuriumLightning':'06be3526-5cb9-48f5-9a46-4aab440cc191','anthuriumLink':'b0971120-c2ab-46ef-8655-53c432487c30','skyCharge':'c2c4b103-a3d7-458b-b38c-551176983865','skyThunderPositive':'08a23eea-b37f-4f05-b988-0a108d9f3deb','skyThunderNegative':'40259c54-1114-457f-ab37-e9808bc32544','skyThunderLinkPositive':'52e48de6-5ebe-4e7e-a557-c29ae6832abd','skyThunderLinkNegative':'f033f80c-64d4-4bbd-92f1-bfefe4a021e5','skyThunderHitPositive':'a0727d9a-a7af-4535-8ccb-d75adf6b1635','skyThunderHitNegative':'b81ae882-7046-45a1-af0c-8c1bea7625ff','skyCone':'armors/SkyConeARMOR','skyBucket':'armors/SkyBucketARMOR','skyBullet':'projectiles/SkyBattlePlaneBulletPRJ','skyPea0':'projectiles/PeaSky0PRJ','skyPea1':'projectiles/PeaSky1PRJ','skyPea2':'projectiles/PeaSky2PRJ'}
for obj in walk(e.read('plants/AsparagusPLANT').objects):
    for key in ['hitParYellowPFB','hitParBluePFB','shootParYellowPFB','shootParBluePFB']:
        if key in obj:rigpaths['asparagus_'+key]=obj[key]['asset']
rigs={n:rig(p) for n,p in rigpaths.items()}
for co in e.read('lawns/SkyLAWN').objects:
    if co.get('type')=='dragonBones.ArmatureDisplay' and '_dragonAsset' in co:
        rigs['sky'+co['_armatureName']]={'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co['_animationName'],'group':'sky'}
for co in e.read('lawns/SkyShiplessNightLAWN').objects:
    if co.get('type')=='dragonBones.ArmatureDisplay' and '_dragonAsset' in co:
        rigs['airRaid'+co['_armatureName']]={'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co['_animationName'],'group':'sky'}
for arm in ['Back','Front']:
    rigs['airRaidShip'+arm]={'rig':e.rig('697c04b1-c1c7-4b49-986f-76bfc21eadb6','9d157db8-e850-4fd3-9509-88e2ef231ce4'),'armature':arm,'animation':'Idle','group':'sky'}
rigs['skyDropShip']=actors['skyDropShip']
for index,ref in enumerate(e.read('resouce_prefabs/ParticlesRP').objects[1]['_components'][0]['sky_shields']):
    rigs[f'skyShield{index}']=rig(ref['asset'])
for co in walk(e.read('zombies/SkyBasicZOMBIE').objects):
    if co.get('type')=='dragonBones.ArmatureDisplay' and co.get('_armatureName')=='GunFire':
        rigs['skyFire']={'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co['_animationName'],'group':'sky'}
for name,path in [('skyElectricFire','zombies/SkyElectricZOMBIE'),('skyGargantuarFire','zombies/SkyGargantuarZOMBIE')]:
    co=next(o for o in walk(e.read(path).objects) if o.get('type')=='dragonBones.ArmatureDisplay' and o.get('_armatureName')=='GunFire')
    rigs[name]={'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':'GunFire','animation':'Idle','group':'sky'}
# The plane references the shared jetpack flame, whose image is already in its own atlas.
plane=e.OUT/'rigs'/actors['skyBattlePlane']['rig']/'skeleton.json'
skeleton=json.loads(plane.read_text())
shared=json.loads(e.read('a8e1a224-cdc8-4f9b-b80b-7b9a454cd02e').objects[0]['_dragonBonesJson'])
skeleton['armature'].append(copy.deepcopy(next(a for a in shared['armature'] if a['name']=='backFire_blue')))
c.write_json(plane,skeleton)
properties={'plants':props('PlantProps',['skyshooter','asparagus','moonbean','anthurium']),'zombies':props('ZombieProps',['sky_dronemaker','sky_drone','sky_airraid_twin','sky_electric','sky_gargantuar','sky','sky_flag','sky_armor1','sky_armor2','sky_imp','sky_battleplane','sky_dropship','sky_twin','sky_twin_upper']),'armors':props('ArmorProps',['sky_armor1','sky_armor2','sky_armor3']),'projectiles':props('ProjectileProps',['airraid_2','shootingstar_pf','sky_bolt_positive','sky_bolt_negative','pea_sky','pea_sky1','pea_sky2','sky_battleplane_bullet','anthurium_bolt','anthurium_bolt_big','airraid_0','airraid_1']),'plantAnimations':{}}
properties['plants']['moonbean']['PlantfoodSunbombCount']=3 # MoonBean class default
c.write_json(e.OUT/'flying-plants.json',[p['CODENAME'] for p in e.read('json/Features/PlantFeatures').objects[0]['json']['PLANTS'] if 'fly' in p['TAGS']])
c.write_json(e.OUT/'ship.json',props('LevelModules',['SkyCityShipDefault'])['SkyCityShipDefault'])
for name,description in {**actors,**rigs}.items():
    sk=json.loads((e.OUT/'rigs'/description['rig']/'skeleton.json').read_text());arm=next(a for a in sk['armature'] if a['name']==description['armature']);timelines={}
    for animation in arm['animation']:
        frame=0;events=[]
        for f in animation.get('frame',[]):
            for event in f.get('events',[]):events.append({'name':event['name'],'at':frame/arm['frameRate']})
            frame+=f.get('duration',1)
        timelines[animation['name']]={'duration':animation.get('duration',1)/arm['frameRate'],'events':events}
    properties['plantAnimations'][name]=timelines
for day in range(1,21):c.write_json(e.OUT/f'sky{day}.source.json',e.read(f'levels/sky{day}').objects[0]['json'])
# Loading image is the original deck texture; runtime composes the native sky, clouds and deck rigs.
at=e.read('097b988c-e632-44a0-8075-a26e69fd3a8f');atlas=json.loads(at.objects[0]['_atlasJson']);rect=next(x for x in atlas['SubTexture'] if x['name']=='land')
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
for name in ['SKYCITY_1_INTRO','SKYCITY_2_INTRO','SKYCITY_3_INTRO','SKYCITY_5_INTRO','SKYCITY_8_INTRO','SKYCITY_9_INTRO','SKYCITY_10_INTRO','SKYCITY_16_INTRO','SKYCITY_18_INTRO','SKYCITY_20_OUTRO']:
    flow=next(o['objdata']['Flow'] for o in e.read('json/Objects/NarrativeList').objects[0]['json']['objects'] if name in o.get('aliases',[]))
    for step in flow:
        if 'Lines' in step:
            length=max(1,min(3,math.floor(len(step['Lines']['zh'])*3.1/21+.5)));step['Animation']=['Say_Small','Say_Medium','Say_Long'][length-1]
            key=('Say' if step['Action']=='SAY' else 'Playful')+'_'+['Short','Med','Long'][length-1];step['Voice']=step['Character']+'/'+key
            if step['Character']=='zombossicon':step['Animation']='Idle'
            sound(step['Voice'],npc.objects[{'crazydave':35,'winnie':39,'zombossicon':31}[step['Character']]][key])
    narratives[name]=flow
for name,path in [('music','sky/CYS_LP_Sky'),('minigame','sky/MG_Sky'),('ultimate','sky/UB_Sky')]:
    (e.OUT/(name+'.mp3')).write_bytes(c.native(c.config['uuids'][c.path_index['music/inGame/'+path]],'mp3'))
c.write_json(e.OUT/'properties.json',properties)
c.write_json(e.OUT/'catalog.json',{'actors':actors,'rigs':rigs,'sounds':sounds,'narratives':narratives,'ui':{}})
c.write_json(c.ROOT/'apps/pvz2/sky-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(e.OUT.rglob('*')) if p.is_file()}})
print('Exported Sky 1–20')
