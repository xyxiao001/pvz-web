"""Export the thirteen standard Danger Rooms from the pinned native build."""
import hashlib, importlib.util, json, re
from pathlib import Path
import cocos as c
spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
e.OUT=c.OUT/'endless';e.OUT.mkdir(parents=True,exist_ok=True)
worlds='egypt pirate cowboy future dark beach iceage lostcity kongfu eighties dino sky modern'.split()
def table(name):return e.read('json/Objects/'+name).objects[0]['json']['objects']
mods=table('LevelModules'); sheets=table('PropertySheets'); types=table('ZombieTypes'); props=table('ZombieProps'); portals=table('PortalProps')
def get(items,name):return next(o for o in items if name in o.get('aliases',[]))
def ref(s):return s[5:s.index('@')]
shared={};sources={};names=set()
def resolve(v):
 if isinstance(v,dict):
  for x in v.values():resolve(x)
 elif isinstance(v,list):
  for x in v:resolve(x)
 elif isinstance(v,str) and v.startswith('RTID('):
  n=ref(v)
  if '@ZombieTypes)' in v:names.add(n)
  if '@LevelModules)' in v and n not in shared:
   matches=[o for o in mods if n in o.get('aliases',[])]
   if matches:shared[n]=matches[0];resolve(matches[0])
for w in worlds:
 d=e.read('levels/'+w+'_dangerroom').objects[0]['json'];sources[w]=d;c.write_json(e.OUT/(w+'.source.json'),d)
 m=next(o['objdata'] for o in d['objects'] if o['objclass']=='DangerRoomModuleProperties')
 for r in m['LevelDesigners']:
  if '@LevelModules)' in r:resolve(r)
 resolve([o for o in d['objects'] if o['objclass']!='LevelDefinition'])
portal_data={n:get(portals,n)['objdata'] for n in get(mods,'PortalDesigner')['objdata']['PortalOptions']}
for p in portal_data.values():
 for z in p['ZombieTypesToSpawn']:names.add(z['ZombieTypeName'])
zmeta={}
for n in sorted(names):
 t=get(types,n)['objdata'];p=get(props,ref(t['Properties']))['objdata'];zmeta[n]={'cost':p.get('WavePointCost',100),'weight':p.get('Weight',1000),'jam':p.get('JamStyle','jam_clear')}
c.write_json(e.OUT/'designers.json',shared);c.write_json(e.OUT/'zombies.json',zmeta);c.write_json(e.OUT/'portals.json',portal_data)
# Native run starts with four plant choices, level 1, no plant food and all five mowers.
c.write_json(e.OUT/'runs.json',{w:next(o['objdata'] for o in d['objects'] if o['objclass']=='DangerRoomModuleProperties') for w,d in sources.items()})
# Only three extra enemy prefabs are required by the standard Modern pool.
def walk(x):
 if isinstance(x,dict):
  yield x
  for v in x.values():yield from walk(v)
 elif isinstance(x,list):
  for v in x:yield from walk(v)
actors={};sounds={};animations={}
paths={'modernBalloon':'zombies/BalloonZOMBIE','modernAllstar':'zombies/AllstarZOMBIE','modernSuperfan':'zombies/ModernSuperFanZOMBIE'}
for key,path in paths.items():
 prefab=e.read(path)
 co=next(x for x in walk(prefab.objects) if x.get('type')=='dragonBones.ArmatureDisplay' and '_dragonAsset' in x)
 actors[key]={'rig':e.rig(co['_dragonAsset']['asset'],co['_dragonAtlasAsset']['asset']),'armature':co['_armatureName'],'animation':co.get('_animationName',''),'group':'endless'}
 skeleton_path=e.OUT/'rigs'/actors[key]['rig']/'skeleton.json'
 skeleton=json.loads(skeleton_path.read_text())
 # DragonBones display-frame value is zero when omitted in the compact source.
 for item in walk(skeleton):
  for frame in item.get('displayFrame',[]):
   if 'value' not in frame:frame['value']=0
 c.write_json(skeleton_path,skeleton)
 arm=next(a for a in skeleton['armature'] if a['name']==co['_armatureName']);timelines={}
 for a in arm['animation']:
  frame=0;events=[]
  for f in a.get('frame',[]):
   for ev in f.get('events',[]):events.append({'name':ev['name'],'at':frame/arm['frameRate']})
   frame+=f.get('duration',1)
  timelines[a['name']]={'duration':a.get('duration',1)/arm['frameRate'],'events':events}
 animations[key]=timelines
 for o in walk(prefab.objects):
  for k,v in o.items():
   if k.lower().endswith(('sound','sounds')) and v:
    clips=[]
    for ref in v if isinstance(v,list) else [v]:
     clip=e.read(ref['asset']);ext=clip.objects[0]['_native'];target=e.OUT/'audio'/(ref['asset']+ext);target.parent.mkdir(exist_ok=True);target.write_bytes(c.native(ref['asset'],ext.lstrip('.')));clips.append(str(target.relative_to(c.OUT)))
    sounds[key+'/'+k]=clips
c.write_json(e.OUT/'catalog.json',{'actors':actors,'rigs':{},'sounds':sounds,'narratives':{},'ui':{}})
c.write_json(e.OUT/'properties.json',{'plants':{},'zombies':{n:get(props,n)['objdata'] for n in ['modern_balloon','modern_allstar','modern_superfanimp']},'armors':{},'projectiles':{},'plantAnimations':animations})
c.write_json(c.ROOT/'apps/pvz2/endless-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(e.OUT.rglob('*')) if p.is_file()}})
print('Exported standard endless data:',len(sources),'worlds,',len(shared),'shared objects,',len(zmeta),'zombies')
