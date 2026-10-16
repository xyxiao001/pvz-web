"""Extract Egypt 1 UI and actors from the same pinned Cocos build as the maps."""
import hashlib
import importlib.util
import json
from pathlib import Path
import cocos as c

spec = importlib.util.spec_from_file_location('shell_export', Path(__file__).with_name('extract-shell.py'))
e = importlib.util.module_from_spec(spec)
spec.loader.exec_module(e)
e.OUT = c.OUT / 'battle'
e.OUT.mkdir(parents=True, exist_ok=True)
scene = e.read('scenes/inGameScene')

def art(asset, node):
    return e.sprite(e.component(asset, asset.objects[node], 'cc.Sprite')['_spriteFrame']['asset'])

def rig_node(asset, node):
    comp = e.component(asset, asset.objects[node], 'dragonBones.ArmatureDisplay')
    key = e.rig(comp['_dragonAsset']['asset'], comp['_dragonAtlasAsset']['asset'])
    return {'rig':key,'armature':comp['_armatureName'],'animation':comp.get('_animationName','')}

chooser = e.read('f7077909-e8e0-4555-9b95-048a684e94db')
slot = e.read('c55bce0c-af82-42bf-902c-90c1261b7f5b')
window = e.read('a332a35e-0622-46cd-9528-151a1eea3820')
ui = {name:art(scene,node) for name,node in {'start':9,'speed':13,'pause':14,'progressTrack':122,'progressFill':121}.items()}
ui.update({name:art(chooser,node) for name,node in {'chooserFrame':2,'chooserBorder':20,'chooserTop':4,'plantDisplay':27}.items()})
ui.update({'sunCounter':art(slot,3),'window':art(window,3),'windowBorder':art(window,4),'close':art(window,5),'button':art(window,2)})
rigs = {'shovel':rig_node(e.read('26c29140-145e-4efa-bd59-1725cd43cbcb'),1),'sunIcon':rig_node(slot,4),'sun':rig_node(e.read('2ca57a22-8169-4284-81e9-ebde2619ba92'),1), 'mower':rig_node(e.read('projectiles/EgyptMowerPRJ'),1), 'reward':rig_node(e.read('077cd1ab-0ddf-412d-bbc3-cdc4af68463a'),3)}
npc=e.read('b697cdfd-e783-4f80-abbe-ac197db6cf97')
rigs['crazydave']=rig_node(npc,25)
rigs['winnie']=rig_node(npc,26)
ui['speechBubble']=art(npc,10)
narrative=e.read('json/Objects/NarrativeList').objects[0]['json']['objects']
intro=next(o['objdata']['Flow'] for o in narrative if 'EGYPT_INTRO_FIRSTLEVEL' in o.get('aliases',[]))
# Cards reuse the atlas already required by the world map.
rigs['cards']={'rig':'91731241-49e8-4db3-bb69-f04d4f4762d6','armature':'plants','animation':'peashooter','group':'shell'}
for name,rig in rigs.items():
    if name != 'cards': print(name,e.rigs[rig['rig']]['armatures'])
modules=e.read('json/Objects/LevelModules').objects[0]['json']['objects']
modules=[o for o in modules if any(a in ['DefaultSunDropper','StandardIntro','EgyptMowers','DefaultZombieWinCondition'] for a in o.get('aliases',[]))]
zombie_props=e.read('json/Objects/ZombieProps').objects[0]['json']['objects']
flag=next(o['objdata'] for o in zombie_props if 'mummy_flag' in o.get('aliases',[]))
c.write_json(e.OUT/'flag.json',flag)
sounds = {}
sound_asset=e.read('resouce_prefabs/SoundsRP')
sound_props=sound_asset.objects[1]['_components'][0]
sound_props['shoot']=[{'asset':'d552833f-d03f-4f93-8377-c7ff7fbfcba4'}]
sound_props['collect']=[{'asset':uuid} for uuid in ['3473f3c0-cb03-4c91-8bf8-f9f048b56fc4','6090751a-f6a6-4ec5-b7c0-200bfd27aa29','ff4b9476-3eec-4532-90d6-7085710e5770','19b86297-d8d4-458f-a122-9723f11dc6df']]
for name in ['shoot','collect','plantOnFloor','spudow','awooga','finalWave','readySetPlant','cardChosen','cardCancel','pause','shovelDig','letsRock']:
    value=sound_props[name]
    ids=value if isinstance(value,list) else [value]
    sounds[name]=[]
    for ref in ids:
        clip=e.read(ref['asset']);ext=clip.objects[0]['_native']
        target=e.OUT/'audio'/(ref['asset']+ext);target.parent.mkdir(exist_ok=True)
        target.write_bytes(c.native(ref['asset'],ext.lstrip('.')))
        sounds[name].append(str(target.relative_to(c.OUT)))
c.write_json(e.OUT/'catalog.json',{'ui':ui,'rigs':rigs,'modules':modules,'sounds':sounds,'intro':intro})
files=[p for p in e.OUT.rglob('*') if p.is_file()]
c.write_json(c.ROOT/'apps/pvz2/battle-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files}})
