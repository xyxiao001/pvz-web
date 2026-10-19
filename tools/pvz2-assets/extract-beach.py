"""Export Big Wave Beach 1–42 from the pinned Cocos build."""
import hashlib, importlib.util, json, math, io
from pathlib import Path
from PIL import Image
import cocos as c
spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
e.OUT=c.OUT/'beach';e.OUT.mkdir(parents=True,exist_ok=True)
def walk(x):
    if isinstance(x,dict):
        yield x
        for v in x.values():yield from walk(v)
    elif isinstance(x,list):
        for v in x:yield from walk(v)
def rig(path):
    co=next(x for x in walk(e.read(path).objects) if x.get('type')=='dragonBones.ArmatureDisplay' and '_dragonAsset' in x)
    return {'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co.get('_animationName',''),'group':'beach'}
def props(path,names):
    objs=e.read('json/Objects/'+path).objects[0]['json']['objects']
    return {n:next(o['objdata'] for o in objs if n in o.get('aliases',[])) for n in names}
paths={'lilypad':'plants/LilyPadPLANT','tanglekelp':'plants/TangleKelpPLANT','beach':'zombies/BeachBasicZOMBIE','beachFemale':'zombies/BeachFemaleZOMBIE','beachFlag':'zombies/BeachFlagZOMBIE','beachImp':'zombies/BeachImpZOMBIE'}
paths.update({'homingthistle':'plants/HomingThistlePLANT','beachFisher':'zombies/BeachFisherZOMBIE','bowlingbulb':'plants/BowlingBulbPLANT','beachSurfer':'zombies/BeachSurferZOMBIE','beachSurferVeteran':'zombies/BeachSurferVeteranZOMBIE','beachOctopus':'zombies/BeachOctopusZOMBIE','beachSnorkel':'zombies/BeachSnorkelZOMBIE','beachGargantuar':'zombies/BeachGargantuarZOMBIE'})
for suffix,prefab in [('1','1'),('2','2'),('3','3'),('_explode','Food')]:paths['tool_projectile_bowlingbulb'+suffix]='plants/BowlingSpawner'+prefab+'PLANT'
paths.update({'missiletoe':'plants/MissileToePLANT','seashroom':'plants/SeaShroomPLANT','boss':'zombies/BeachZombossMechZOMBIE'})
paths.update({'moonflower':'plants/MoonflowerPLANT','goldleaf':'plants/GoldLeafPLANT','ghostpepper':'plants/GhostPepperPLANT','coldsnapdragon':'plants/ColdSnapDragonPLANT','seashooter':'plants/SeashooterPLANT','pineapple':'plants/PineapplePLANT'})
actors={n:rig(p) for n,p in paths.items()}
rigs={n:rig(p) for n,p in {'beachLawn':'lawns/BeachLAWN','mower':'projectiles/BeachMowerPRJ','beachCone':'armors/BeachConeARMOR','beachBucket':'armors/BeachBucketARMOR','tide':'49827fe8-1df8-422b-9d8d-47f286d0a319','tideLine':'07cfb36b-3301-4faa-a82f-9f0f7bf63368','tideSign':'f1a88de5-d4a9-4b50-bd1e-d4d11fc17681'}.items()}
rigs.update({n:rig(p) for n,p in {'bowling0':'projectiles/Bowling0PRJ','bowling1':'projectiles/Bowling1PRJ','bowling2':'projectiles/Bowling2PRJ','bowling_pf':'projectiles/BowlingFoodPRJ','bowlingLine':'20497fce-3f85-464e-8c0b-b4db1cd820b8','bowlingSign':'aa9336ab-5d4f-4d64-914b-4e8086ad332b'}.items()})
rigs.update({n:rig(p) for n,p in {'seaPea':'projectiles/SeaPea0PRJ','moonShield':'zombies/ModernMoonflowerShieldZOMBIE','goldtile':'tiles/GoldTILE','coldBreath':'21895368-c0dd-461a-8abf-09ef3f3e103f','coldFood':'dbd73de5-56c5-47dd-9ec0-2e65e620ac82','ghost':'6c0a261d-59af-49a0-a383-3259745de63c','ghostFog':'7d91dfd4-912f-49ba-a16a-dca1dbc0f555'}.items()})
kelp=next(o for o in walk(e.read(paths['tanglekelp']).objects) if 'kelphands' in o);rigs['kelpHands']=rig(kelp['kelphands']['asset'])
surfer=next(o for o in walk(e.read(paths['beachSurfer']).objects) if 'bdBreakPar' in o)
rigs.update({'surfboard':rig('tombstones/SurfboardTOMB'),'surfboardBreak':rig(surfer['bdBreakPar']['asset']),'surfboardThrow':rig(surfer['bdSpawnerPar']['asset'])})
veteran=next(o for o in walk(e.read(paths['beachSurferVeteran']).objects) if 'bdBreakPar' in o)
rigs.update({'surfboardVeteran':rig('tombstones/SurfboardVeteranTOMB'),'surfboardBreakVeteran':rig(veteran['bdBreakPar']['asset']),'surfboardThrowVeteran':rig(veteran['bdSpawnerPar']['asset'])})
rigs.update({'octopus':rig('tombstones/OctopusTOMB'),'octopusShot':rig('projectiles/OctopusPRJ')})
rigs.update({'thistle':rig('projectiles/Thistle0PRJ'),'thistleFood':rig('projectiles/ThistleFoodPRJ'),'fisherHook':rig('projectiles/FisherHookPRJ')})
rigs['fisherWire']={**actors['beachFisher'],'armature':'wire','animation':'idle'}
rigs.update({n:rig(p) for n,p in {'beachBricks':'armors/BeachBricksARMOR','missiletoeShot':'projectiles/MissileToeArrow0PRJ','seashroom_spore':'projectiles/SeaSpore0PRJ','missiletoeTarget':'c3c751ec-2a82-45c4-9bd0-e932436e8877'}.items()})
for name,path in [('missiletoe','projectiles/MissileToeArrow0PRJ'),('seashroom_spore','projectiles/SeaSpore0PRJ')]:
    co=next(x for x in walk(e.read(path).objects) if 'PopParticle' in x)
    rigs[name+'Hit']=rig(co['PopParticle'][0]['asset'])
boss=e.read(paths['boss']);bossco=next(x for x in walk(boss.objects) if 'sharkPF' in x)
for name,key in [('bossEscape','portalEscape'),('bossPortal','portalSummon')]:
    co=boss.ref(bossco[key]);rigs[name]={'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co['_animationName'],'group':'beach'}
for name,key in [('beachShark','sharkPF'),('bossDive','divingDirtPF'),('bossCut','plantCutParticle'),('bossSuction','suctionSplash')]:rigs[name]=rig(bossco[key]['asset'])
# Shark's splash lives in the beach tide skeleton/atlas. Bundle its two textures
# with the shark so the isolated battle-art factory can resolve the child armature.
sharkdir=e.OUT/'rigs'/rigs['beachShark']['rig'];giantdir=e.OUT/'rigs'/rigs['tide']['rig']
sharksk=json.loads((sharkdir/'skeleton.json').read_text());giantsk=json.loads((giantdir/'skeleton.json').read_text())
splash=next(a for a in giantsk['armature'] if a['name']=='_gargSplash');sharksk['armature'].append(splash)
sharkat=json.loads((sharkdir/'atlas.json').read_text());giantat=json.loads((giantdir/'atlas.json').read_text())
textures={d.get('path',d['name']) for skin in splash['skin'] for slot in skin['slot'] for d in slot.get('display',[])}
old=Image.open(sharkdir/'texture.webp').convert('RGBA');giant=Image.open(giantdir/'texture.webp').convert('RGBA')
rects=[r for r in giantat['SubTexture'] if r['name'] in textures]
canvas=Image.new('RGBA',(max(old.width,sum(r['width'] for r in rects)),old.height+max(r['height'] for r in rects)))
canvas.paste(old,(0,0));x=0
for r in rects:
    canvas.paste(giant.crop((r['x'],r['y'],r['x']+r['width'],r['y']+r['height'])),(x,old.height))
    sharkat['SubTexture'].append({**r,'x':x,'y':old.height});x+=r['width']
sharkat['width']=canvas.width;sharkat['height']=canvas.height
canvas.save(sharkdir/'texture.webp',quality=95,method=6)
c.write_json(sharkdir/'atlas.json',sharkat);c.write_json(sharkdir/'skeleton.json',sharksk)
# The terminal Nope command stops native playback; it is not an animation.
file=e.OUT/'rigs'/actors['boss']['rig']/'skeleton.json';data=json.loads(file.read_text())
for obj in walk(data):
    if obj.get('action')=='Nope':del obj['action']
c.write_json(file,data)
properties={'plants':props('PlantProps',['moonflower','goldleaf','ghostpepper','coldsnapdragon','seashooter','pineapple','missiletoe','seashroom','homingthistle','lilypad','tanglekelp','bowlingbulb',*[n for n in paths if n.startswith('tool_')]]),'zombies':props('ZombieProps',['zombossmech_beach2','zombossmech_beach','beach_armor4','beach_fem_armor4','beach','beach_armor1','beach_armor2','beach_fem','beach_fem_armor1','beach_fem_armor2','beach_flag','beach_imp','beach_snorkel','beach_gargantuar','beach_surfer','beach_surfer_veteran','beach_octopus','beach_fisherman']),'armors':props('ArmorProps',['beach_armor4','beach_armor1','beach_armor2']),'projectiles':props('ProjectileProps',['pea','sea_pea','missiletoe','seashroom_spore','bowling0','bowling1','bowling2','bowling_pf','homing_thistle','homing_thistle_pf']),'plantAnimations':{}}
for name,description in {**actors,**rigs}.items():
    sk=json.loads((e.OUT/'rigs'/description['rig']/'skeleton.json').read_text());arm=next(a for a in sk['armature'] if a['name']==description['armature']);timelines={}
    for animation in arm['animation']:
        frame=0;events=[]
        for f in animation.get('frame',[]):
            for event in f.get('events',[]):events.append({'name':event['name'],'at':frame/arm['frameRate']})
            frame+=f.get('duration',1)
        timelines[animation['name']]={'duration':animation.get('duration',1)/arm['frameRate'],'events':events}
    properties['plantAnimations'][name]=timelines
for day in range(1,43):
    source=e.read(f'levels/beach{day}').objects[0]['json']
    # The final-wave octopus event mistakenly repeats the wave-16 alias upstream.
    # Restore its referenced wave-18 name; retain both events and all spawn values.
    if day==35:
        [o for o in source['objects'] if o.get('aliases')==['Wave16LowTideEvent0']][-1]['aliases']=['Wave18LowTideEvent0']
    c.write_json(e.OUT/f'beach{day}.source.json',source)
lawn=e.read('lawns/BeachLAWN');co=next(x for x in walk(lawn.objects) if x.get('type')=='dragonBones.ArmatureDisplay')
at=e.read(co['_dragonAtlasAsset']['asset']);atlas=json.loads(at.objects[0]['_atlasJson']);rect=next(x for x in atlas['SubTexture'] if x['name']=='Lawn')
pixels=Image.open(io.BytesIO(c.native(at.data[1][at.rec[5][0]],'png')))
pixels.crop((rect['x'],rect['y'],rect['x']+rect['width'],rect['y']+rect['height'])).save(e.OUT/'lawn.webp',quality=95,method=6)
sounds={}
def sound(name,value):
    refs=value if isinstance(value,list) else [value];sounds[name]=[]
    for ref in refs:
        clip=e.read(ref['asset']);ext=clip.objects[0]['_native'];target=e.OUT/'audio'/(ref['asset']+ext);target.parent.mkdir(exist_ok=True)
        target.write_bytes(c.native(ref['asset'],ext.lstrip('.')));sounds[name].append(str(target.relative_to(c.OUT)))
for name,path in {**paths,'missiletoeProjectile':'projectiles/MissileToeArrow0PRJ','seashroomProjectile':'projectiles/SeaSpore0PRJ','beachShark':bossco['sharkPF']['asset'],'octopus':'tombstones/OctopusTOMB','octopusShot':'projectiles/OctopusPRJ','surfboard':'tombstones/SurfboardTOMB','surfboardVeteran':'tombstones/SurfboardVeteranTOMB'}.items():
    for obj in walk(e.read(path).objects):
        for key,value in obj.items():
            if key.lower().endswith(('sound','sounds')) and value:sound(name+'/'+key,value)
        if 'soundRes' in obj:
            for key,value in obj['soundRes'].items():
                if key!='type':sound(name+'/'+key,value)
npc=e.read('b697cdfd-e783-4f80-abbe-ac197db6cf97');narratives={}
for name in ['BEACH_42_INTRO','BEACH_42_OUTRO','BEACH_38_INTRO','BEACH_INTRO_ZOMBOSS','BEACH_OUTRO_ZOMBOSS','BEACH_33_INTRO','BEACH_INTRO_FIRSTLEVEL','BEACH_INTRO_TIDES','BEACH_INTRO_CHOMPER','BEACH_INTRO_BOWLING','BEACH_INTRO_GARGANTUAR_ALT','BEACH_INTRO_GUACODILE','BEACH_OUTRO_DANGER_ROOM_KEY','BEACH_INTRO_HOMINGTHISTLE','BEACH_INTRO_BANANA']:
    flow=next(o['objdata']['Flow'] for o in e.read('json/Objects/NarrativeList').objects[0]['json']['objects'] if name in o.get('aliases',[]))
    for step in flow:
        if 'Lines' in step:
            length=max(1,min(3,math.floor(len(step['Lines']['zh'])*3.1/21+.5)));step['Animation']=['Say_Small','Say_Medium','Say_Long'][length-1]
            key=('Say' if step['Action']=='SAY' else 'Playful')+'_'+['Short','Med','Long'][length-1];step['Voice']=step['Character']+'/'+key
            if step['Character']=='zombossicon':step['Animation']='Idle'
            sound(step['Voice'],npc.objects[{'crazydave':35,'winnie':39,'zombossicon':31}[step['Character']]][key])
    narratives[name]=flow
for name,path in [('music','P1_LP_Beach'),('minigame','MG_Beach'),('ultimate','UB_Beach')]:
    (e.OUT/(name+'.mp3')).write_bytes(c.native(c.config['uuids'][c.path_index['music/inGame/beach/'+path]],'mp3'))
c.write_json(e.OUT/'plant-tags.json',{f['CODENAME']:f['TAGS'] for f in e.read('03000899-5d49-4cef-a2b6-3b1b17f96c65').objects[0]['json']['PLANTS']})
c.write_json(e.OUT/'octopus.json',props('TombstoneProps',['planttarget_squid'])['planttarget_squid'])
c.write_json(e.OUT/'properties.json',properties)
c.write_json(e.OUT/'catalog.json',{'actors':actors,'rigs':rigs,'sounds':sounds,'narratives':narratives,'ui':{'note_beach':e.sprite(c.decode_uuid(c.config['uuids'][c.path_index['note/beach/spriteFrame']]))}})
c.write_json(c.ROOT/'apps/pvz2/beach-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(e.OUT.rglob('*')) if p.is_file()}})
print('Exported Big Wave Beach 1–42')
