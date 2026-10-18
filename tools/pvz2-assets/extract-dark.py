"""Export Dark Ages 1–25, including graves and jester, from the pinned build."""
import hashlib, importlib.util, json, math, io
from pathlib import Path
from PIL import Image
import cocos as c
spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
e.OUT=c.OUT/'dark';e.OUT.mkdir(parents=True,exist_ok=True)
def walk(x):
    if isinstance(x,dict):
        yield x
        for v in x.values():yield from walk(v)
    elif isinstance(x,list):
        for v in x:yield from walk(v)
def rig(path):
    co=next(x for x in walk(e.read(path).objects) if x.get('type')=='dragonBones.ArmatureDisplay' and '_dragonAsset' in x)
    return {'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co.get('_animationName',''),'group':'dark'}
def props(path,names):
    objs=e.read('json/Objects/'+path).objects[0]['json']['objects']
    return {n:next(o['objdata'] for o in objs if n in o.get('aliases',[])) for n in names}
paths={'scaredyshroom':'plants/ScaredyShroomPLANT','chomper':'plants/ChomperPLANT','floawerPot':'plants/FloawerPotPLANT','darkWizardVeteran':'zombies/DarkWizardVeteranZOMBIE','darkKing':'zombies/DarkKingZOMBIE','dragonImp':'zombies/DragonImpZOMBIE','boss':'zombies/DarkZombossMechZOMBIE','peanut':'plants/PeanutPLANT','darkWizard':'zombies/DarkWizardZOMBIE','sunbean':'plants/SunBeanPLANT','fumeshroom':'plants/FumeShroomPLANT','dark':'zombies/DarkBasicZOMBIE','darkFlag':'zombies/DarkFlagZOMBIE','darkImp':'zombies/DarkImpZOMBIE','darkJester':'zombies/DarkJesterZOMBIE','darkGargantuar':'zombies/DarkGargantuarZOMBIE'}
actors={n:rig(p) for n,p in paths.items()}
rigs={n:rig(p) for n,p in {'scaredyShot':'projectiles/ScaredySpore0PRJ','scaredyFood':'projectiles/ScaredySpore2PRJ','darkBricks':'armors/DarkBricksARMOR','darkLawn':'lawns/DarkLAWN','mower':'projectiles/DarkMowerPRJ','darkCone':'armors/DarkConeARMOR','darkBucket':'armors/DarkBucketARMOR','darkHelmet':'armors/DarkHelmetARMOR','potionSpeed':'plants/PotionSpeedPLANT','potionToughness':'plants/PotionToughnessPLANT','grave':'tombstones/DarkTOMB','graveSun':'tombstones/DarkSunTOMB','graveFood':'tombstones/DarkPFTOMB'}.items()}
co=next(o for o in walk(e.read('plants/FumeShroomPLANT').objects) if 'shootParticle' in o)
for name,key in [('fumeShot','shootParticle'),('fumeFood','foodParticle'),('fumeHit','hitParticle')]:rigs[name]=rig(co[key]['asset'])
# The legacy terminal Stop action is not an animation; Play already ends here.
fume_path=e.OUT/'rigs'/actors['fumeshroom']['rig']/'skeleton.json'
fume=json.loads(fume_path.read_text())
attack=next(a for a in fume['armature'] if a['name']=='AttackParticle')
del attack['animation'][0]['frame'][-1]['action']
c.write_json(fume_path,fume)
rigs['sunbeanBlast']=rig(next(o['blastPar']['asset'] for o in walk(e.read('plants/SunBeanPLANT').objects) if 'blastPar' in o))
wizard=next(o for o in walk(e.read('zombies/DarkWizardZOMBIE').objects) if 'shootPFB' in o)
for name,key in [('wizardLink','shootPFB'),('wizardHit','hitPFB'),('wizardSheep','sheep')]:rigs[name]=rig(wizard[key]['asset'])
boss=e.read('zombies/DarkZombossMechZOMBIE')
bossco=next(x for x in walk(boss.objects) if 'fireSquarePar' in x)
for name,key in [('bossEscape','portalEscape'),('bossPortal','portalSummon')]:
    co=boss.ref(bossco[key]);rigs[name]={'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co['_animationName'],'group':'dark'}
for name,key in [('dragonFire','fireSquarePar'),('dragonIntroFire','introFirePar'),('dragonShade','introShadePar')]:rigs[name]=rig(bossco[key]['asset'])
rigs['bossMissile']=rig('projectiles/DarkZombossMissilePRJ')
king=next(o for o in walk(e.read('zombies/DarkKingZOMBIE').objects) if 'knightEffectPar' in o)
rigs['knightEffect']=rig(king['knightEffectPar']['asset'])
# Legacy armature terminal actions are playback commands, not animation names.
for actor in [actors['boss'],rigs['dragonFire']]:
    file=e.OUT/'rigs'/actor['rig']/'skeleton.json';data=json.loads(file.read_text())
    for obj in walk(data):
        if obj.get('action')=='Nope' or obj.get('action')=='Idle' and any(event['name']=='die' for event in obj.get('events',[])):del obj['action']
    c.write_json(file,data)
rigs['peanutShot']=rig('projectiles/PeanutPRJ')
properties={'plants':props('PlantProps',['scaredyshroom','chomper','floawerPot','fumeshroom','sunbean','peanut']),'zombies':props('ZombieProps',['dark_armor4','dark_wizard_veteran','dark_king','dark_imp_dragon','zombossmech_dark','dark','dark_armor1','dark_armor2','dark_armor3','dark_flag','dark_imp','dark_juggler','dark_gargantuar','dark_wizard']),'armors':props('ArmorProps',['dark_armor1','dark_armor2','dark_armor3','dark_armor4']),'projectiles':props('ProjectileProps',['zomboss_missile_dark','scaredyshroom_spore','scaredyshroom_spore2']),'plantAnimations':{}}
c.write_json(e.OUT/'graves.json',props('TombstoneProps',['gravestone_dark','gravestoneSunOnDestruction','gravestonePlantfoodOnDestruction']))
# ProjectileProps defaults allow jester reversal unless explicitly disabled.
c.write_json(e.OUT/'jester-projectiles.json',{a:{'reverse':not o['objdata'].get('CannotBeReversedByJester',False),'damage':o['objdata'].get('Damage',0)} for o in e.read('json/Objects/ProjectileProps').objects[0]['json']['objects'] for a in o.get('aliases',[])})
for name,description in {**actors,**rigs}.items():
    sk=json.loads((e.OUT/'rigs'/description['rig']/'skeleton.json').read_text());arm=next(a for a in sk['armature'] if a['name']==description['armature']);timelines={}
    for animation in arm['animation']:
        frame=0;events=[]
        for f in animation.get('frame',[]):
            for event in f.get('events',[]):events.append({'name':event['name'],'at':frame/arm['frameRate']})
            frame+=f.get('duration',1)
        timelines[animation['name']]={'duration':animation.get('duration',1)/arm['frameRate'],'events':events}
    properties['plantAnimations'][name]=timelines
for day in range(1,26):c.write_json(e.OUT/f'dark{day}.source.json',e.read(f'levels/dark{day}').objects[0]['json'])
lawn=e.read('lawns/DarkLAWN');co=next(x for x in walk(lawn.objects) if x.get('type')=='dragonBones.ArmatureDisplay')
at=e.read(co['_dragonAtlasAsset']['asset']);atlas=json.loads(at.objects[0]['_atlasJson']);rect=next(x for x in atlas['SubTexture'] if x['name']=='Lawn')
pixels=Image.open(io.BytesIO(c.native(at.data[1][at.rec[5][0]],'png')))
pixels.crop((rect['x'],rect['y'],rect['x']+rect['width'],rect['y']+rect['height'])).save(e.OUT/'lawn.webp',quality=95,method=6)
sounds={}
def sound(name,value):
    refs=value if isinstance(value,list) else [value];sounds[name]=[]
    for ref in refs:
        clip=e.read(ref['asset']);ext=clip.objects[0]['_native'];target=e.OUT/'audio'/(ref['asset']+ext);target.parent.mkdir(exist_ok=True)
        target.write_bytes(c.native(ref['asset'],ext.lstrip('.')));sounds[name].append(str(target.relative_to(c.OUT)))
for name,path in paths.items():
    for obj in walk(e.read(path).objects):
        for key,value in obj.items():
            if key.lower().endswith(('sound','sounds')) and value:sound(name+'/'+key,value)
for name,path in [('scaredyshroom','plants/ScaredyShroomPLANT'),('chomper','plants/ChomperPLANT'),('peanut','plants/PeanutPLANT'),('sunbean','plants/SunBeanPLANT'),('potionSpeed','plants/PotionSpeedPLANT'),('potionToughness','plants/PotionToughnessPLANT')]:
    for obj in walk(e.read(path).objects):
        if 'soundRes' in obj:
            for key,value in obj['soundRes'].items():
                if key!='type':sound(name+'/'+key,value)
npc=e.read('b697cdfd-e783-4f80-abbe-ac197db6cf97');narratives={}
for name in ['DARK_21_INTRO','DARK_24_INTRO','DARK_INTRO_MAGNETSHROOM','DARK_INTRO_ZOMBOSS','DARK_OUTRO_ZOMBOSS','DARK_INTRO_FIRSTLEVEL','DARK_INTRO_FUMESHROOM','DARK_INTRO_HYPNOSHROOM','DARK_INTRO_EVILPOTIONS','DARK_INTRO_GARGANTUAR','DARK_INTRO_PEANUT','DARK_OUTRO_DANGER_ROOM_KEY']:
    flow=next(o['objdata']['Flow'] for o in e.read('json/Objects/NarrativeList').objects[0]['json']['objects'] if name in o.get('aliases',[]))
    for step in flow:
        if 'Lines' in step:
            length=max(1,min(3,math.floor(len(step['Lines']['zh'])*3.1/21+.5)));step['Animation']=['Say_Small','Say_Medium','Say_Long'][length-1]
            key=('Say' if step['Action']=='SAY' else 'Playful')+'_'+['Short','Med','Long'][length-1];step['Voice']=step['Character']+'/'+key
            if step['Character']=='zombossicon':step['Animation']='Idle'
            sound(step['Voice'],npc.objects[{'crazydave':35,'winnie':39,'zombossicon':31}[step['Character']]][key])
    narratives[name]=flow
(e.OUT/'music.mp3').write_bytes(c.native(c.config['uuids'][c.path_index['music/inGame/dark/P1_LP_Dark']],'mp3'))
(e.OUT/'minigame.mp3').write_bytes(c.native(c.config['uuids'][c.path_index['music/inGame/dark/MG_Dark']],'mp3'))
(e.OUT/'ultimate.mp3').write_bytes(c.native(c.config['uuids'][c.path_index['music/inGame/dark/UB_Dark']],'mp3'))
c.write_json(e.OUT/'potions.json',props('PlantProps',['zombiepotion_speed','zombiepotion_toughness']))
c.write_json(e.OUT/'properties.json',properties)
c.write_json(e.OUT/'catalog.json',{'actors':actors,'rigs':rigs,'sounds':sounds,'narratives':narratives,'ui':{'note-dark':e.sprite(c.decode_uuid(c.config['uuids'][c.path_index['note/dark/spriteFrame']]))}})
c.write_json(c.ROOT/'apps/pvz2/dark-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(e.OUT.rglob('*')) if p.is_file()}})
print('Exported Dark Ages 1–25')
