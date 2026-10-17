"""Native almanac, plant-decoding arcade and Zen Garden assets for local outer features."""
import hashlib,importlib.util,json,shutil
from pathlib import Path
import cocos as c
spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
e.OUT=c.OUT/'outer';e.OUT.mkdir(exist_ok=True)
rig_groups={};export_rig=e.rig
def shared_rig(skeleton,atlas):
    for group in ['shell','battle','campaign']:
        if (c.OUT/group/'rigs'/skeleton/'skeleton.json').exists():
            rig_groups[skeleton]=group
            if (e.OUT/'rigs'/skeleton).exists():shutil.rmtree(e.OUT/'rigs'/skeleton)
            return skeleton
    key=export_rig(skeleton,atlas);rig_groups[key]='outer';return key
e.rig=shared_rig
def comp(asset,node,kind):return e.component(asset,asset.objects[node],kind)
def rig_node(asset,node):
    p=comp(asset,node,'dragonBones.ArmatureDisplay');key=e.rig(p['_dragonAsset']['asset'],p['_dragonAtlasAsset']['asset'])
    return {'rig':key,'armature':p['_armatureName'],'animation':p.get('_animationName',''),'group':'outer','scale':asset.objects[node].get('_lscale',[1,1,1,1])[1]}
def audio(ref):
    uuid=ref['asset'];a=e.read(uuid);ext=a.objects[0]['_native'];path=e.OUT/'audio'/(uuid+ext);path.parent.mkdir(exist_ok=True);path.write_bytes(c.native(uuid,ext.lstrip('.')));return str(path.relative_to(c.OUT))
def art(asset,node):return e.sprite(comp(asset,node,'cc.Sprite')['_spriteFrame']['asset'])
def zh(value):return value.get('zh','')
lyrics=e.read('json/multilanguages/InGameLyrics').objects[0]['json']
plant_props=e.read('json/Objects/PlantProps').objects[0]['json']['objects']
zombie_props=e.read('json/Objects/ZombieProps').objects[0]['json']['objects']
labels={'TOUGHNESS':'Toughness','SUNCOST':'SunCost','RECHARGE':'Recharge','GROWTIME':'GrowTime','DURATION':'Duration','DAMAGE':'Damage','FAMILY':'Family','RANGE':'Range','AREA':'Area','ARMINGTIME':'ArmingTime','PLANTFOOD':'PlantFood','SUNPRODUCTION':'SunProduction','SPEED':'Speed','SPECIAL':'Special'}
def stats(feature,description,zombie=False):
    if not description['Elements']:return []
    alias=feature['PROPS'][5:].split('@')[0]
    props=next(o['objdata'] for o in (zombie_props if zombie else plant_props) if alias in o.get('aliases',[]))
    result=[]
    for item in description['Elements']:
        kind=item['TYPE'];value=item.get('VALUE')
        if not zombie and kind in ['SUNCOST','RECHARGE','TOUGHNESS']:value=props[{'SUNCOST':'SunCost','RECHARGE':'Cooldown','TOUGHNESS':'Toughness'}[kind]] if feature['CODENAME']!='imitater' else '???'
        if kind=='FAMILY':value=lyrics['PlantFamily'][props['Family']]['zh']
        if kind=='SPEED' and not zombie:value=props['Speed']
        if 'SORT' in item:value=item['SORT']['zh']
        if value is not None:result.append({'label':item['NAME']['zh'] if 'NAME' in item else lyrics['Almanac'][labels[kind]]['zh'],'value':str(value)})
    return result
features=e.read('json/Features/PlantFeatures').objects[0]['json']['PLANTS']
pa=e.read('json/Objects/PlantAlmanac').objects[0]['json']['objects'];za=e.read('json/Objects/ZombieAlmanac').objects[0]['json']['objects']
plants=[]
for p in features:
    alias=p['ALMANAC'][5:].split('@')[0];matches=[o['objdata'] for o in pa if alias in o.get('aliases',[])]
    if not matches: continue
    d=matches[0]
    plants.append({'id':p['ID'],'kind':p['CODENAME'],'name':zh(p['NAME']),'card':p['_CARDSPRITENAME'],'world':p['OBTAINWORLD'],'garden':p.get('ZENGARDEN',{}),'boost':p.get('BOOST',0),'description':d,'stats':stats(p,d)})
zombies=[]
for p in e.read('json/Features/ZombieFeatures').objects[0]['json']['ZOMBIES']:
    alias=p['ALMANAC'][5:].split('@')[0];matches=[o['objdata'] for o in za if alias in o.get('aliases',[])]
    if not matches: continue
    d=matches[0]
    zombies.append({'kind':p['CODENAME'],'name':zh(p['NAME']),'card':p['_CARDSPRITENAME'],'world':p['OBTAINWORLD'],'description':d,'stats':stats(p,d,True)})
# Plants.getBGAnm: seasonal/unknown-world cards deliberately use the native homeless skin.
backgrounds={'egypt','pirate','cowboy','kongfu','future','dark','beach','ice','lostcity','eighties','sky','dino','modern','frontyard','mint','epic','lod'}
for item in plants+zombies:
    world=item['world'];item['background']=world if world in backgrounds else {'water':'beach','market':'prenium'}.get(world,'homeless')
# Almanac native pages and zombie card armatures.
almanac=e.read('3023d103-0685-4ce1-a3b7-aad0b253fde7');zcard=e.read('d623da9f-fa2e-43a9-ad01-048af897cbb4')
zrigs=[rig_node(zcard,i) for i,o in enumerate(zcard.objects) if o.get('type')=='cc.Node' and any((zcard.ref(p) if 'ref' in p else p)['type']=='dragonBones.ArmatureDisplay' and '_dragonAsset' in (zcard.ref(p) if 'ref' in p else p) for p in o.get('_components',[]))]
page_art={str(i):art(almanac,i) for i,o in enumerate(almanac.objects) if o.get('type')=='cc.Node' and any((almanac.ref(p) if 'ref' in p else p)['type']=='cc.Sprite' and '_spriteFrame' in (almanac.ref(p) if 'ref' in p else p) for p in o.get('_components',[]))}
# Only native backgrounds are flattened; labels/cards remain interactive DOM/runtime objects.
pages={str(n):[d for d in e.flat_draws(almanac,n) if d['kind']=='sprite'] for n in [2,3,6]}
arcade=e.read('scenes/arcadePlantDecoding');ap=comp(arcade,1,'e2f75gnVbRCMKEr7zdxLX1V')
arcade_features=e.read(ap['FeatureJson']['asset']).objects[0]['json']
# Three authored merge targets use card animation names, not plant codenames.
for merge in arcade_features['MERGES']:
    for field in ['PlantA','PlantB','Target']:
        merge[field]={'cherribomb':'cherry_bomb','glacierShroom':'glaciershroom','scaredyShroom':'scaredyshroom'}.get(merge[field],merge[field])
arcade_art={str(n):art(arcade,n) for n in [3,29,34,48,52,61,78,80]}
arcade_rigs={'line':rig_node(arcade,50),'top':rig_node(arcade,60)}
arcade_card=e.read(ap['card']['asset']);arcade_card_draws=e.flat_draws(arcade_card)
card_component=next(p for node in arcade_card.objects for p in node.get('_components',[]) if isinstance(p,dict) and 'bg_normal' in p)
card_art={name:e.sprite(card_component['bg_'+name]['asset']) for name in ['normal','merged','fault','change','half','correct']}
card_art['frame']=art(arcade_card,5)
lyrics=e.read('json/multilanguages/InGameLyrics').objects[0]['json']
zen=e.read('scenes/zenGardenScene');zp=comp(zen,1,'28f67d8p+VHj4E+vcc2h1Ka')
gardens=[]
for uuid,name in [('b1c0bc2c-b450-44e2-8a1c-2a58bee25800','禅境花园'),('afae4f52-8f06-427b-8c89-5c15370470c6','夜间花园'),('95c85e53-dbb8-4707-97c2-34361896856e','蘑菇花园'),('1340f1f2-6f51-4ecc-91b1-dea852fe2b5c','水族花园')]:
    a=e.read(uuid);p=comp(a,1,'2b2a9iG5A5L1JexYuHSHIIe');scale=a.objects[1]['_lscale'][1];slots=[]
    for slot in p['slots']:
        node=a.ref(slot['node']);pos=node['_lpos'];slots.append({'x':512+pos[1]*scale,'y':320-pos[2]*scale,'pot':slot.get('addPot',True),'floater':slot.get('addFloater',False),'ground':slot.get('groundType',0),'unlocked':slot.get('unlockOnInit',False)})
    draws=e.flat_draws(a);gardens.append({'id':p.get('ID',0),'name':name,'scale':scale,'slots':slots,'draws':draws,'ambience':audio(p['ambience'])})
zen_price=e.sprite(e.read(zp['SlotPriceTag']['asset']).objects[4]['_spriteFrame']['asset'])
zen_rigs={}
for name in ['sproutPar','jukeboxPar','pesticidePar','fertilizerPar','waterpourPar','selectionUI','flowerpot','floater']:
    zen_rigs[name]=rig_node(e.read(zp[name]['asset']),1)
for name,node in [('next',55),('glove',56),('cart',57),('shovel',15)]:zen_rigs[name]=rig_node(zen,node)
# Native requirement events decide when a care action is applied.
zen_sounds={k:audio(v) for k,v in zp.items() if k.endswith('Sound')}
upgrades=e.read('json/Features/UpgradeFeatures').objects[0]['json']['UPGRADES']
actors={k:v for k,v in json.loads((c.OUT/'campaign/catalog.json').read_text())['actors'].items() if any(p['kind']==k for p in plants)}
for name in ['peashooter','sunflower','wallnut','potatomine']:
    skeleton=json.loads((c.OUT/'actors'/name/'skeleton.json').read_text())
    actors[name]={'rig':name,'armature':skeleton['armature'][0]['name'],'animation':'Idle','group':'actors'}
marigold=e.read('plants/MariGoldPLANT')
for i,node in enumerate(marigold.objects):
    if node.get('type')=='cc.Node' and any((marigold.ref(p) if 'ref' in p else p).get('_dragonAsset') for p in node.get('_components',[])):
        actors['marigold']=rig_node(marigold,i);break
for kind,actor in actors.items():actor['animation']='Idle1' if kind=='wallnut' else 'Idle'
output={'rigGroups':rig_groups,'plants':plants,'zombies':zombies,'upgrades':upgrades,'almanac':{'pages':pages,'art':page_art,'zombieCards':zrigs},'arcade':{'features':arcade_features,'art':arcade_art,'rigs':arcade_rigs,'card':arcade_card_draws,'cardArt':card_art,'sounds':{k:audio(v) for k,v in ap['soundRes'].items() if k!='type'},'music':audio(arcade.ref(ap['MusicPlayer'])['_clip'])},'garden':{'priceTag':zen_price,'actors':actors,'gardens':gardens,'rigs':zen_rigs,'sounds':zen_sounds,'music':audio(zp['musics'][0]),'sproutBundles':e.read('json/Features/StoreCommodityFeatures').objects[0]['json']['Zen']},'lyrics':{k:lyrics[k] for k in ['Arcade','ZenGarden','Almanac']}}
c.write_json(e.OUT/'catalog.json',output)
files=[p for p in e.OUT.rglob('*') if p.is_file()]
c.write_json(c.ROOT/'apps/pvz2/outer-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files}})
