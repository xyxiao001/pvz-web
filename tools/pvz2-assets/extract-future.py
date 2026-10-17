"""Export Far Future 1–10, with native power tiles and sun bombs, from the pinned build."""
import hashlib, importlib.util, json, math, io
from pathlib import Path
from PIL import Image
import cocos as c
spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
e.OUT=c.OUT/'future';e.OUT.mkdir(parents=True,exist_ok=True)
def walk(x):
    if isinstance(x,dict):
        yield x
        for v in x.values():yield from walk(v)
    elif isinstance(x,list):
        for v in x:yield from walk(v)
def rig(path):
    co=next(x for x in walk(e.read(path).objects) if x.get('type')=='dragonBones.ArmatureDisplay' and '_dragonAsset' in x)
    return {'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co.get('_animationName',''),'group':'future'}
def props(path,names):
    objs=e.read('json/Objects/'+path).objects[0]['json']['objects']
    return {n:next(o['objdata'] for o in objs if n in o.get('aliases',[])) for n in names}
paths={'powerplant_alpha':'plants/TileTurnipAlphaPLANT','powerplant_beta':'plants/TileTurnipBetaPLANT','citron':'plants/CitronPLANT','empea':'plants/EMPeachPLANT','futureGargantuar':'zombies/FutureGargantuarZOMBIE','discoMech':'zombies/FutureMechDiscoZOMBIE','discoJetpack':'zombies/FutureJetpackDiscoZOMBIE','laser_bean':'plants/LaserBeanPLANT','blover':'plants/BloverPLANT','future':'zombies/FutureBasicZOMBIE','futureFlag':'zombies/FutureFlagZOMBIE','futureJetpack':'zombies/FutureJetpackZOMBIE','futureShield':'zombies/FutureProtectorShieldZOMBIE','futureProtector':'zombies/FutureProtectorZOMBIE','futureImp':'zombies/FutureImpZOMBIE','mechCone':'zombies/FutureMechConeZOMBIE'}
actors={n:rig(p) for n,p in paths.items()}
rigs={n:rig(p) for n,p in {'citronShot':'projectiles/Citron0PRJ','citronFood':'projectiles/CitronFoodPRJ','futureLawn':'lawns/FutureLAWN','futureNightLawn':'lawns/FutureNightLAWN','mower':'projectiles/FutureMowerPRJ','futureCone':'armors/FutureConeARMOR','futureBucket':'armors/FutureBucketARMOR','futureShield':'zombies/FutureProtectorShieldZOMBIE','sunbomb':'9e2726a5-09b5-4f87-9977-f88aef61ecc6'}.items()}
particle=next(o for o in walk(e.read('resouce_prefabs/ParticlesRP').objects) if 'empEffect' in o)
rigs['empEffect']=rig(particle['empEffect']['asset'])
for group in ['alpha','beta','gamma','delta']:
    path='tiles/Power'+group.title()+'TILE';rigs['tile_'+group]=rig(path)
    co=next(x for x in walk(e.read(path).objects) if 'dotPar' in x)
    for suffix,key in [('Dot','dotPar'),('Flash','flashLight')]:rigs['tile_'+group+suffix]=rig(co[key]['asset'])
for path,fields in [('plants/CitronPLANT',{'citronLightning':'lightningPar'}),('plants/EMPeachPLANT',{'empBlast':'explParPrefab'}),('zombies/FutureGargantuarZOMBIE',{'gargEye':'eyePar','gargHit':'hitPar','gargRay':'rayPar'}),('projectiles/CitronFoodPRJ',{'citronToss':'tossPar'}),('plants/LaserBeanPLANT',{'laserBeam':'beamParticle','laserDirt':'dirtParticle'}),('9e2726a5-09b5-4f87-9977-f88aef61ecc6',{'sunbombRay':'rayPar','sunbombBlast':'blastPar'})]:
    co=next(x for x in walk(e.read(path).objects) if next(iter(fields.values())) in x)
    for n,k in fields.items():rigs[n]=rig(co[k]['asset'])
for name,path in [('citronHit','e48d11c2-3bb6-42cb-a19b-7c236f8502c9'),('citronFoodHit','5877ff03-ad16-4720-b9e6-2761ee8b2c4a')]:rigs[name]=rig(path)
properties={'plants':props('PlantProps',['laser_bean','blover','citron','empea','powerplant_alpha','powerplant_beta']),'zombies':props('ZombieProps',['future_gargantuar','disco_mech','future_jetpack_disco','future','future_armor1','future_armor2','future_flag','future_jetpack','future_protector','future_imp','mech_cone','future_protector_shield']),'armors':props('ArmorProps',['future_armor1','future_armor2']),'projectiles':props('ProjectileProps',['citron','citron_pf']),'plantAnimations':{}}
for name,description in {**actors,**rigs}.items():
    sk=json.loads((e.OUT/'rigs'/description['rig']/'skeleton.json').read_text());arm=next(a for a in sk['armature'] if a['name']==description['armature']);timelines={}
    for animation in arm['animation']:
        frame=0;events=[]
        for f in animation.get('frame',[]):
            for event in f.get('events',[]):events.append({'name':event['name'],'at':frame/arm['frameRate']})
            frame+=f.get('duration',1)
        timelines[animation['name']]={'duration':animation.get('duration',1)/arm['frameRate'],'events':events}
    properties['plantAnimations'][name]=timelines
# The food beam advances along this native bone curve (linear keyframe tweens).
laser=json.loads((e.OUT/'rigs'/actors['laser_bean']['rig']/'skeleton.json').read_text())['armature'][0]
frames=next(b for a in laser['animation'] if a['name']=='Food' for b in a['bone'] if b['name']=='foodHit')['translateFrame']
at=0;curve=[]
for f in frames:
    curve.append({'at':at/laser['frameRate'],'x':101.85+f.get('x',0)});at+=f.get('duration',1)
c.write_json(e.OUT/'laser-food-curve.json',curve)
for day in range(1,11):c.write_json(e.OUT/f'future{day}.source.json',e.read(f'levels/future{day}').objects[0]['json'])
for path,name in [('lawns/FutureLAWN','lawn'),('lawns/FutureNightLAWN','lawn-night')]:
    lawn=e.read(path);co=next(x for x in walk(lawn.objects) if x.get('type')=='dragonBones.ArmatureDisplay')
    at=e.read(co['_dragonAtlasAsset']['asset']);atlas=json.loads(at.objects[0]['_atlasJson']);rect=next(x for x in atlas['SubTexture'] if x['name']==('LawnNight' if name=='lawn-night' else 'Lawn'))
    pixels=Image.open(io.BytesIO(c.native(at.data[1][at.rec[5][0]],'png')))
    pixels.crop((rect['x'],rect['y'],rect['x']+rect['width'],rect['y']+rect['height'])).save(e.OUT/(name+'.webp'),quality=95,method=6)
sounds={}
def sound(name,value):
    refs=value if isinstance(value,list) else [value];sounds[name]=[]
    for ref in refs:
        clip=e.read(ref['asset']);ext=clip.objects[0]['_native'];target=e.OUT/'audio'/(ref['asset']+ext);target.parent.mkdir(exist_ok=True)
        target.write_bytes(c.native(ref['asset'],ext.lstrip('.')));sounds[name].append(str(target.relative_to(c.OUT)))
for name,path in {**paths,'citronShot':'projectiles/Citron0PRJ','citronFood':'projectiles/CitronFoodPRJ','futureShield':'zombies/FutureProtectorShieldZOMBIE','sunbomb':'9e2726a5-09b5-4f87-9977-f88aef61ecc6'}.items():
    for obj in walk(e.read(path).objects):
        for key,value in obj.items():
            if key.lower().endswith(('sound','sounds','musicclip','musicclipweak')) and value:sound(name+'/'+key,value)
npc=e.read('b697cdfd-e783-4f80-abbe-ac197db6cf97');narratives={}
for name in ['FUTURE_CHALLENGE_PRESET_A','FUTURE_INTRO_GARGANTUAR','FUTURE_INTRO_FIRSTLEVEL','FUTURE_CHALLENGE_SUNBOMBS_A','FUTURE_OUTRO_DANGER_ROOM_KEY']:
    flow=next(o['objdata']['Flow'] for o in e.read('json/Objects/NarrativeList').objects[0]['json']['objects'] if name in o.get('aliases',[]))
    for step in flow:
        if 'Lines' in step:
            length=max(1,min(3,math.floor(len(step['Lines']['zh'])*3.1/21+.5)));step['Animation']=['Say_Small','Say_Medium','Say_Long'][length-1]
            key=('Say' if step['Action']=='SAY' else 'Playful')+'_'+['Short','Med','Long'][length-1];step['Voice']=step['Character']+'/'+key
            if step['Character']=='zombossicon':step['Animation']='Idle'
            sound(step['Voice'],npc.objects[{'crazydave':35,'winnie':39,'zombossicon':31}[step['Character']]][key])
    narratives[name]=flow
for name,path in [('music','P1_LP_Future'),('minigame','MG_Future')]:
    (e.OUT/(name+'.mp3')).write_bytes(c.native(c.config['uuids'][c.path_index['music/inGame/future/'+path]],'mp3'))
c.write_json(e.OUT/'properties.json',properties)
c.write_json(e.OUT/'catalog.json',{'actors':actors,'rigs':rigs,'sounds':sounds,'narratives':narratives,'ui':{'note_future':e.sprite(c.decode_uuid(c.config['uuids'][c.path_index['note/future/spriteFrame']]))}})
c.write_json(c.ROOT/'apps/pvz2/future-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(e.OUT.rglob('*')) if p.is_file()}})
print('Exported Far Future 1–10')
