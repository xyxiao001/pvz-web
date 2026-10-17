"""Export Wild West 1–10 from the pinned source build."""
import hashlib, importlib.util, json, math, io
from pathlib import Path
from PIL import Image
import cocos as c
spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
e.OUT=c.OUT/'cowboy';e.OUT.mkdir(parents=True,exist_ok=True)
def walk(x):
    if isinstance(x,dict):
        yield x
        for v in x.values():yield from walk(v)
    elif isinstance(x,list):
        for v in x:yield from walk(v)
def rig(path):
    co=next(x for x in walk(e.read(path).objects) if x.get('type')=='dragonBones.ArmatureDisplay' and '_dragonAsset' in x)
    return {'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co.get('_animationName',''),'group':'cowboy'}
def props(path,names):
    objs=e.read('json/Objects/'+path).objects[0]['json']['objects']
    return {n:next(o['objdata'] for o in objs if n in o.get('aliases',[])) for n in names}
actors={n:rig(p) for n,p in {'wintermelon':'plants/WinterMelonPLANT','cowboyGargantuar':'zombies/CowboyGargantuarZOMBIE','cowboyImp':'zombies/CowboyImpZOMBIE','chickenFarmer':'zombies/CowboyChickenFarmerZOMBIE','chicken':'zombies/CowboyChickenZOMBIE','chickenPumpkin':'zombies/CowboyChickenPumpkinZOMBIE','cowboy':'zombies/CowboyBasicZOMBIE','cowboyFlag':'zombies/CowboyFlagZOMBIE','prospector':'zombies/CowboyProspectorZOMBIE','piano':'zombies/CowboyPianoZOMBIE','poncho':'zombies/CowboyPonchoZOMBIE','splitpea':'plants/SplitPeaPLANT','chilibean':'plants/ChiliBeanPLANT'}.items()}
rigs={n:rig(p) for n,p in {'winter_melon':'projectiles/MelonWinter0PRJ','winter_melon_pf':'projectiles/MelonWinterMegaPRJ','cowboyLawn':'lawns/CowboyLAWN','mower':'projectiles/CowboyMowerPRJ','cowboyCone':'armors/CowboyConeARMOR','cowboyBucket':'armors/CowboyBucketARMOR','rail':'tiles/RailTILE','cart':'tiles/CartTILE'}.items()}
for p,fields in [('zombies/CowboyProspectorZOMBIE',{'prospectorSmoke':'explSmokePar','prospectorTail':'smokeTailPar'}),('zombies/CowboyPonchoZOMBIE',{'ponchoBreak':'ponchoBreakPar','plateDrop':'plateDrop'}),('zombies/CowboyBasicZOMBIE',{'cowboyHat':'zombieHat'})]:
    co=next(x for x in walk(e.read(p).objects) if next(iter(fields.values())) in x)
    for n,k in fields.items():rigs[n]=rig(co[k]['asset'])
particles=e.read('resouce_prefabs/ParticlesRP').objects[1]['_components'][0]
for name,key in [('chiliFart','zombieFart'),('chiliStun','zombieChiliBeanStun')]:rigs[name]=rig(particles[key]['asset'])
for name,key in [('fenceHere','FenceHere'),('fenceThere','FenceThere')]:rigs[name]=rig(particles['cowboyFence'][key]['asset'])
co=next(x for x in walk(e.read('zombies/CowboyChickenFarmerZOMBIE').objects) if 'chickenAsh' in x)
rigs['chickenAsh']=rig(co['chickenAsh']['asset'])
rigs['megaPea']=rig('projectiles/PeaMegaPRJ')
for day in range(1,11):c.write_json(e.OUT/f'cowboy{day}.source.json',e.read(f'levels/cowboy{day}').objects[0]['json'])
properties={'plants':props('PlantProps',['splitpea','chilibean','wintermelon']),'zombies':props('ZombieProps',['cowboy_gargantuar','west_bullrider','chicken_farmer','chicken','chicken_pumpkin','cowboy','cowboy_armor1','cowboy_armor2','cowboy_flag','prospector','piano','poncho','poncho_no_plate','poncho_plate']),'armors':props('ArmorProps',['cowboy_armor1','cowboy_armor2']),'projectiles':props('ProjectileProps',['pea_mega','winter_melon','winter_melon_pf']),'plantAnimations':{}}
for name,description in {**actors,**rigs}.items():
    sk=json.loads((e.OUT/'rigs'/description['rig']/'skeleton.json').read_text());arm=next(a for a in sk['armature'] if a['name']==description['armature']);timelines={}
    for animation in arm['animation']:
        frame=0;events=[]
        for f in animation.get('frame',[]):
            for event in f.get('events',[]):events.append({'name':event['name'],'at':frame/arm['frameRate']})
            frame+=f.get('duration',1)
        timelines[animation['name']]={'duration':animation.get('duration',1)/arm['frameRate'],'events':events}
    properties['plantAnimations'][name]=timelines
lawn=e.read('lawns/CowboyLAWN');co=next(x for x in walk(lawn.objects) if x.get('type')=='dragonBones.ArmatureDisplay')
at=e.read(co['_dragonAtlasAsset']['asset']);atlas=json.loads(at.objects[0]['_atlasJson']);rect=next(x for x in atlas['SubTexture'] if x['name']=='Lawn')
pixels=Image.open(io.BytesIO(c.native(at.data[1][at.rec[5][0]],'png')))
pixels.crop((rect['x'],rect['y'],rect['x']+rect['width'],rect['y']+rect['height'])).save(e.OUT/'lawn.webp',quality=95,method=6)
sounds={}
def sound(name,value):
    refs=value if isinstance(value,list) else [value];sounds[name]=[]
    for ref in refs:
        clip=e.read(ref['asset']);ext=clip.objects[0]['_native'];target=e.OUT/'audio'/(ref['asset']+ext);target.parent.mkdir(exist_ok=True)
        target.write_bytes(c.native(ref['asset'],ext.lstrip('.')));sounds[name].append(str(target.relative_to(c.OUT)))
for n,p in [('wintermelon','plants/WinterMelonPLANT'),('splitpea','plants/SplitPeaPLANT'),('chilibean','plants/ChiliBeanPLANT')]:
    co=next(x for x in walk(e.read(p).objects) if 'soundRes' in x)
    for key,value in co['soundRes'].items():
        if isinstance(value,(dict,list)) and value:sound(n+'/'+key,value)
for n,p,keys in [('cowboyGargantuar','zombies/CowboyGargantuarZOMBIE',['stepSounds','deathPoleSounds','deathFallSounds','swingSounds','smashSounds','afterSmashSaySounds','ImpThrowSaySounds','ImpThrowSounds','throwSounds']),('chickenFarmer','zombies/CowboyChickenFarmerZOMBIE',['chickenActionSound']),('prospector','zombies/CowboyProspectorZOMBIE',['landSound','explodeSound','explodeSaySound','igniteSound']),('cart','tiles/CartTILE',['moveSounds'])]:
    co=next(x for x in walk(e.read(p).objects) if keys[0] in x)
    for key in keys:sound(n+'/'+key,co[key])
sound('birdExpl',e.read('resouce_prefabs/SoundsRP').objects[1]['_components'][0]['birdExpl'])
sound('zombieFart',e.read('resouce_prefabs/SoundsRP').objects[1]['_components'][0]['zombieFart'])
npc=e.read('b697cdfd-e783-4f80-abbe-ac197db6cf97');narratives={}
for name in ['COWBOY_INTRO_FIRSTLEVEL','COWBOY_OUTRO_DANGER_ROOM_KEY','COWBOY_CHALLENGE_LASTSTAND_A','COWBOY_INTRO_LEVEL7','COWBOY_INTRO_GARGANTUAR','COWBOY_OUTRO_GARGANTUAR','COWBOY_CHALLENGE_PRESET_A']:
    flow=next(o['objdata']['Flow'] for o in e.read('json/Objects/NarrativeList').objects[0]['json']['objects'] if name in o.get('aliases',[]))
    for step in flow:
        if 'Lines' in step:
            length=max(1,min(3,math.floor(len(step['Lines']['zh'])*3.1/21+.5)));step['Animation']=['Say_Small','Say_Medium','Say_Long'][length-1]
            key=('Say' if step['Action']=='SAY' else 'Playful')+'_'+['Short','Med','Long'][length-1];step['Voice']=step['Character']+'/'+key
            if step['Character']=='zombossicon':step['Animation']='Idle'
            sound(step['Voice'],npc.objects[{'crazydave':35,'winnie':39,'zombossicon':31}[step['Character']]][key])
    narratives[name]=flow
for name,path in [('music','P1_LP_Cowboy'),('minigame','MG_Cowboy'),('piano','PIANO_Cowboy')]:
    (e.OUT/(name+'.mp3')).write_bytes(c.native(c.config['uuids'][c.path_index['music/inGame/cowboy/'+path]],'mp3'))
c.write_json(e.OUT/'properties.json',properties)
c.write_json(e.OUT/'catalog.json',{'actors':actors,'rigs':rigs,'sounds':sounds,'narratives':narratives,'ui':{'note-cowboy':e.sprite(c.decode_uuid(c.config['uuids'][c.path_index['note/cowboy/spriteFrame']]))}})
c.write_json(c.ROOT/'apps/pvz2/cowboy-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(e.OUT.rglob('*')) if p.is_file()}})
print('Exported Wild West 1–10')
