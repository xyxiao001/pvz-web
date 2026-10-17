"""Export Pirate Seas 1–25 from the same pinned build as Egypt."""
import hashlib, importlib.util, json, math, io
from PIL import Image
from pathlib import Path
import cocos as c
spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
e.OUT=c.OUT/'pirate';e.OUT.mkdir(parents=True,exist_ok=True)
def walk(x):
    if isinstance(x,dict):
        yield x
        for v in x.values():yield from walk(v)
    elif isinstance(x,list):
        for v in x:yield from walk(v)
def rig(path):
    co=next(x for x in walk(e.read(path).objects) if x.get('type')=='dragonBones.ArmatureDisplay' and '_dragonAsset' in x)
    return {'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co.get('_animationName',''),'group':'pirate'}
def props(path,names):
    objs=e.read('json/Objects/'+path).objects[0]['json']['objects']
    return {n:next(o['objdata'] for o in objs if n in o.get('aliases',[])) for n in names}
actors={n:rig(p) for n,p in {'boss':'zombies/PirateZombossMechZOMBIE','spikerock':'plants/SpikerockPLANT','threepeater':'plants/ThreePeaterPLANT','pirateCaptain':'zombies/PirateCaptainZOMBIE','pirateParrot':'zombies/PirateCaptainParrotZOMBIE','spikeweed':'plants/SpikeweedPLANT','springbean':'plants/SpringBeanPLANT','barrelroller':'zombies/PirateBarrelPusherZOMBIE','pirateBarrel':'zombies/PirateBarrelZOMBIE','pirateGargantuar':'zombies/PirateGargantuarZOMBIE','pirateImp':'zombies/PirateImpZOMBIE','impCannon':'zombies/PirateImpCannonZOMBIE','pirate':'zombies/PirateBasicZOMBIE','pirateFlag':'zombies/PirateFlagZOMBIE','swashbuckler':'zombies/PirateSwashbucklerZOMBIE','seagull':'zombies/PirateSeagullZOMBIE','snapdragon':'plants/SnapDragonPLANT','coconutcannon':'plants/CoconutCannonPLANT'}.items()}
rigs={n:rig(p) for n,p in {'pirateLawn':'lawns/PirateLAWN','mower':'projectiles/PirateMowerPRJ','pirateCone':'armors/PirateConeARMOR','pirateBucket':'armors/PirateBucketARMOR','coconut':'projectiles/Coconut0PRJ'}.items()}
snap=next(x for x in walk(e.read('plants/SnapDragonPLANT').objects) if 'attPar' in x)
rigs['snapFire']=rig(snap['attPar']['asset']);rigs['snapFood']=rig(snap['foodPar']['asset'])
food=next(x for x in walk(e.read(snap['foodPar']['asset']).objects) if 'ballFire' in x)
rigs['snapBall']=rig(food['ballFire']['asset'])
spike=next(x for x in walk(e.read('plants/SpikeweedPLANT').objects) if 'pfSpikeParticle' in x)
rigs['seaSplash']=rig('1b090e7a-c264-4250-8633-42050181e159')
rigs['coconutFood']=rig('projectiles/CoconutFoodPRJ')
rigs['coconutFoodHit']=rig('71eec8f0-f872-417b-b967-78c67891a4e9')
rigs['spikeFood']=rig(spike['pfSpikeParticle']['asset'])
rock=next(x for x in walk(e.read('plants/SpikerockPLANT').objects) if 'pfSpikeParticle' in x)
rigs['rockFood']=rig(rock['pfSpikeParticle']['asset'])
# Preserve the animated native lawn; the cropped image is only the loading backdrop.
lawn=e.read('lawns/PirateLAWN');co=next(x for x in walk(lawn.objects) if x.get('type')=='dragonBones.ArmatureDisplay')
at=e.read(co['_dragonAtlasAsset']['asset']);atlas=json.loads(at.objects[0]['_atlasJson']);rect=next(x for x in atlas['SubTexture'] if x['name']=='Lawn')
pixels=Image.open(io.BytesIO(c.native(at.data[1][at.rec[5][0]],'png')))
pixels.crop((rect['x'],rect['y'],rect['x']+rect['width'],rect['y']+rect['height'])).save(e.OUT/'lawn.webp',quality=95,method=6)
rigs['coconutHit']=rig('d9bf60cc-4648-439d-831e-e964bd5cbabd')
for day in range(1,26):c.write_json(e.OUT/f'pirate{day}.source.json',e.read(f'levels/pirate{day}').objects[0]['json'])
properties={'plants':props('PlantProps',['snapdragon','coconutcannon','spikeweed','springbean','threepeater','spikerock']),'zombies':props('ZombieProps',['zombossmech_pirate','pirate','pirate_armor1','pirate_armor2','pirate_flag','swashbuckler','seagull','barrelroller','pirate_barrel','pirate_gargantuar','pirate_imp','cannon','pirate_captain','pirate_captain_parrot']),'armors':props('ArmorProps',['pirate_armor1','pirate_armor2']),'projectiles':props('ProjectileProps',['coconut','coconut_pf']),'plantAnimations':{}}
for name,description in {**actors,**rigs}.items():
    sk=json.loads((e.OUT/'rigs'/description['rig']/'skeleton.json').read_text());arm=next(a for a in sk['armature'] if a['name']==description['armature']);timelines={}
    for animation in arm['animation']:
        frame=0;events=[]
        for f in animation.get('frame',[]):
            for event in f.get('events',[]):events.append({'name':event['name'],'at':frame/arm['frameRate']})
            frame+=f.get('duration',1)
        timelines[animation['name']]={'duration':animation.get('duration',1)/arm['frameRate'],'events':events}
    properties['plantAnimations'][name]=timelines
sounds={}
def sound(name,value):
    refs=value if isinstance(value,list) else [value];sounds[name]=[]
    for ref in refs:
        clip=e.read(ref['asset']);ext=clip.objects[0]['_native'];target=e.OUT/'audio'/(ref['asset']+ext);target.parent.mkdir(exist_ok=True)
        target.write_bytes(c.native(ref['asset'],ext.lstrip('.')));sounds[name].append(str(target.relative_to(c.OUT)))
for n,p in [('spikerock','plants/SpikerockPLANT'),('threepeater','plants/ThreePeaterPLANT'),('spikeweed','plants/SpikeweedPLANT'),('springbean','plants/SpringBeanPLANT'),('snapdragon','plants/SnapDragonPLANT'),('coconutcannon','plants/CoconutCannonPLANT')]:
    co=next(x for x in walk(e.read(p).objects) if 'soundRes' in x)
    for key,value in co['soundRes'].items():
        if isinstance(value,(dict,list)) and value:sound(n+'/'+key,value)
for n,p,keys in [('pirateParrot','zombies/PirateCaptainParrotZOMBIE',['captureSound','deathSound','groanSound']),('impCannon','zombies/PirateImpCannonZOMBIE',['RollSound','ShootSound','ExplodeSound','ImpExplodeSounds']),('pirateGargantuar','zombies/PirateGargantuarZOMBIE',['steadySounds','stepSounds','deathPoleSounds','deathFallSounds','swingSounds','smashSounds','afterSmashSaySounds','ImpThrowSaySounds','ImpThrowSounds']),('swashbuckler','zombies/PirateSwashbucklerZOMBIE',['swingSounds']),('seagull','zombies/PirateSeagullZOMBIE',['seagullButteredSounds','seagullIdleSounds'])]:
    co=next(x for x in walk(e.read(p).objects) if keys[0] in x)
    for key in keys:sound(n+'/'+key,co[key])
boss=e.read('zombies/PirateZombossMechZOMBIE')
bossco=next(x for x in walk(boss.objects) if 'targetLocatorPrefab' in x)
for name,key in [('bossEscape','portalEscape'),('bossPortal','portalSummon')]:
    co=boss.ref(bossco[key]);rigs[name]={'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co['_animationName'],'group':'pirate'}
for key,value in bossco.items():
    if (key.endswith('Sound') or key.endswith('Sounds')) and value:sound('boss/'+key,value)
boss_file=e.OUT/'rigs'/actors['boss']['rig']/'skeleton.json'
boss_data=json.loads(boss_file.read_text())
# As in the Egyptian mech, native smoke loops reference an absent stop action.
for item in walk(boss_data):
    if item.get('action')=='Nope':del item['action']
c.write_json(boss_file,boss_data)
npc=e.read('b697cdfd-e783-4f80-abbe-ac197db6cf97');narratives={}
for name in ['PIRATE_INTRO_FIRSTLEVEL','PIRATE_OUTRO_DANGER_ROOM_KEY','PIRATE_CHALLENGE_PRESET_A','PIRATE_INTRO_GARGANTUAR','PIRATE_CHALLENGE_MINIGAME_A','PIRATE_CHALLENGE_LASTSTAND_A','PIRATE_CHALLENGE_PROTECTPLANTS_A','PIRATE_INTRO_ZOMBOSS','PIRATE_OUTRO_ZOMBOSS']:
    flow=next(o['objdata']['Flow'] for o in e.read('json/Objects/NarrativeList').objects[0]['json']['objects'] if name in o.get('aliases',[]))
    for step in flow:
        if 'Lines' in step:
            length=max(1,min(3,math.floor(len(step['Lines']['zh'])*3.1/21+.5)));step['Animation']=['Say_Small','Say_Medium','Say_Long'][length-1]
            key=('Say' if step['Action']=='SAY' else 'Playful')+'_'+['Short','Med','Long'][length-1];step['Voice']=step['Character']+'/'+key
            sound(step['Voice'],npc.objects[{'crazydave':35,'winnie':39,'zombossicon':31}[step['Character']]][key])
            if step['Character']=='zombossicon':step['Animation']='Idle'
    narratives[name]=flow
for name,path in [('music','music/inGame/pirate/P1_LP_Pirate'),('minigame','music/inGame/pirate/MG_Pirate'),('ultimate','music/inGame/pirate/UB_Pirate')]:
    (e.OUT/(name+'.mp3')).write_bytes(c.native(c.config['uuids'][c.path_index[path]],'mp3'))
c.write_json(e.OUT/'properties.json',properties)
c.write_json(e.OUT/'catalog.json',{'actors':actors,'rigs':rigs,'sounds':sounds,'narratives':narratives,'ui':{'note-pirate':e.sprite(c.decode_uuid(c.config['uuids'][c.path_index['note/pirate/spriteFrame']]))}})
c.write_json(c.ROOT/'apps/pvz2/pirate-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(e.OUT.rglob('*')) if p.is_file()}})
print('Exported Pirate Seas 1–25')
