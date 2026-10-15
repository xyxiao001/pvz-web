"""Export every remaining plant/zombie state from original Reanim image tracks.
Usage: python3 tools/import-actor-motion.py RUSLAN_REPO
Timing and combat remain owned by the existing Web simulation. Existing baked
Reanim states keep exact origins; former GIF families keep their idle footprint.
"""
import ast, hashlib, json, math, subprocess, sys
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image
root=Path(__file__).resolve().parents[1]; repo=Path(sys.argv[1]); source=repo/'SexyAppFramework/reanim'
out=root/'public/assets/runtime/actor-motion'; out.mkdir(parents=True,exist_ok=True)
work=root/'artifacts/hd-work/actor-motion'; inputs=work/'input'; results=work/'output'
inputs.mkdir(parents=True,exist_ok=True);results.mkdir(parents=True,exist_ok=True)
old=json.loads((root/'public/assets/runtime/animations.json').read_text())['animations']
existing={'peashooter','sunflower','threepeater','gatlingpea','twinsunflower','wintermelon','cabbagepult','kernelpult','melonpult'}
specs={}; sources={}; parsed={}; fields=['x','y','sx','sy','kx','ky','f','a','i']
images={p.stem.upper():p for p in source.glob('*.png')}
def add(key,name,layer,**kwargs): specs[key]={'source':name,'layer':layer,**kwargs}
# Reuse the original baked-Reanim mapping and its offset-anchor without changing alignment.
module=ast.parse((root/'tools/import-assets.py').read_text())
for node in module.body:
 if isinstance(node,ast.For) and isinstance(node.target,ast.Tuple) and [getattr(x,"id",None) for x in node.target.elts]==['key','name','layer','size','offset','anchor']:
  for key,name,layer,size,offset,anchor in ast.literal_eval(node.iter):
   if key.split('-')[0] in existing or key.startswith('gargantuar'):continue
   add(key,name,layer,origin=[offset[0]-anchor[0],offset[1]-anchor[1]])
plants={
 'wallnut':('Wallnut','anim_idle'),'snowpea':('SnowPea','anim_full_idle'), 'repeater':('PeaShooter','anim_full_idle'),
 'potatomine':('PotatoMine','anim_armed'),'potatomine-unarmed':('PotatoMine','anim_idle'),
 'chomper':('Chomper','anim_idle'),'chomper-bite':('Chomper','anim_bite'),'chomper-digest':('Chomper','anim_chew'),
 'cherrybomb':('CherryBomb','anim_explode'),'puffshroom':('PuffShroom','anim_idle'),'sunshroom':('SunShroom','anim_idle'),
 'sunshroom-big':('SunShroom','anim_bigidle'),'fumeshroom':('FumeShroom','anim_idle'),'fumeshroom-attack':('FumeShroom','anim_shooting'),
 'hypnoshroom':('HypnoShroom','anim_idle'),'scaredyshroom':('ScaredyShroom','anim_idle'),'scaredyshroom-scared':('ScaredyShroom','anim_scaredidle'),
 'iceshroom':('IceShroom','anim_idle'),'doomshroom':('DoomShroom','anim_idle'),'gravebuster':('Gravebuster','anim_idle'),
 'lilypad':('LilyPad','anim_idle'),'squash':('Squash','anim_idle'),'squash-attack':('Squash','anim_jumpdown'),
 'plantern':('Plantern','anim_idle'),'tanglekelp':('Tanglekelp','anim_idle'),'tanglekelp-grab':('Tanglekelp','anim_grab'),
 'jalapeno':('Jalapeno','anim_explode'),'spikeweed':('Caltrop','anim_idle'),'torchwood':('Torchwood','anim_idle'),
 'tallnut':('Tallnut','anim_idle'),'seashroom':('SeaShroom','anim_idle'),'cactus':('Cactus','anim_idle'),'cactus-tall':('Cactus','anim_idlehigh'),
 'splitpea':('SplitPea','anim_idle'),'starfruit':('Starfruit','anim_idle'),'pumpkin':('Pumpkin','anim_idle'),
 'garlic':('Garlic','anim_idle'),'flowerpot':('Pot','anim_idle'),'coffeebean':('Coffeebean','anim_crumble'),
}
for key,(name,layer) in plants.items():add(key,name,layer)
for key,track,prefix in [('wallnut','anim_face','WALLNUT_CRACKED'),('tallnut','anim_idle','TALLNUT_CRACKED'),('garlic','anim_face','GARLIC_BODY'),('pumpkin','Pumpkin_front','PUMPKIN_DAMAGE')]:
 for i in [1,2]:
  image=prefix+str(i+1 if key=='garlic' else 3 if key=='pumpkin' and i==2 else i)
  add(key+f'-cracked{i}',plants[key][0],plants[key][1],replace={track:image})
# Plain zombie accessories follow Zombie::SetupReanimLayers / SetupDoorArms.
plain_hide=['anim_cone','anim_bucket','anim_screendoor','Zombie_flaghand','Zombie_duckytube','anim_tongue','Zombie_mustache','Zombie_outerarm_screendoor','Zombie_innerarm_screendoor']
for kind in ['zombie','cone','bucket','flag','door','ducky1','ducky2','ducky3']:
 hidden=plain_hide.copy()
 if kind in ['cone','ducky2']:hidden.remove('anim_cone');hidden.append('anim_hair')
 if kind in ['bucket','ducky3']:hidden.remove('anim_bucket');hidden.append('anim_hair')
 if kind.startswith('ducky'):hidden.remove('Zombie_duckytube');hidden+=['Zombie_innerleg','Zombie_outerleg']
 if kind=='door':
  hidden=[x for x in hidden if 'screendoor' not in x];hidden+=['anim_innerarm','Zombie_outerarm_hand','Zombie_outerarm_lower','Zombie_outerarm_upper']
 if kind=='flag':hidden.remove('Zombie_flaghand');hidden.remove('Zombie_innerarm_screendoor');hidden+=['anim_innerarm','Zombie_innerarm_screendoor_hand']
 for state in ['walk','eat']:add(kind+'-'+state,'Zombie','anim_swim' if kind.startswith('ducky') and state=='walk' else 'anim_'+state,hidden=hidden,flag=kind=='flag')
add('zombie-headless','Zombie','anim_walk',hidden=plain_hide+['anim_head','anim_hair'])
add('zombie-die','Zombie','anim_death',hidden=plain_hide)
add('ducky-die','Zombie','anim_waterdeath',hidden=[x for x in plain_hide if x!='Zombie_duckytube']+['Zombie_innerleg','Zombie_outerleg'])
for kind,name,states in [
 ('football','Zombie_football',{'walk':'walk','eat':'eat','bare-walk':'walk','bare-eat':'eat','headless':'walk','die':'death'}),
 ('newspaper','Zombie_paper',{'walk':'walk','eat':'eat','mad-walk':'walk_nopaper','mad-eat':'eat_nopaper','gasp':'gasp','headless':'walk_nopaper','die':'death'}),
 ('pole','Zombie_polevaulter',{'run':'run','walk':'walk','eat':'eat','jump':'jump','land':'jump','headless':'walk','die':'death'}),
 ('dancer','Zombie_disco',{'walk':'walk','eat':'eat','summon':'point','headless':'walk','die':'death'}),
 ('backup','Zombie_backup',{'walk':'walk','eat':'eat','headless':'walk','die':'death'}),
 ('snorkel','Zombie_snorkle',{'walk':'walk','swim':'swim','eat':'eat','die':'death'}),
 ('dolphin','Zombie_dolphinrider',{'walk':'walkdolphin','ride':'ride','swim':'swim','jump':'dolphinjump','eat':'eat','die':'death'}),
 ('jack','Zombie_jackbox',{'walk':'walk','eat':'eat','open':'pop','headless':'walk','die':'death'}),
 ('balloon','Zombie_balloon',{'fly':'idle','walk':'walk','eat':'eat','pop':'pop','die':'death'}),
 ('zomboni','Zombie_zamboni',{'walk':'drive','damaged':'drive','critical':'drive'}),
]:
 for state,layer in states.items():
  hidden=[];replace={}
  if kind=='football' and not state.startswith('bare') and state!='headless':hidden+=['anim_hair']
  if state.startswith('bare') or kind=='football' and state=='headless':hidden+=['zombie_football_helmet']
  if state=='headless':hidden+=['anim_head','anim_hair','anim_tongue']
  if kind=='newspaper' and state not in ['walk','eat','gasp']:hidden+=['Zombie_paper_paper']
  if kind=='zomboni' and state in ['damaged','critical']:replace={f'Zombie_zamboni_{i}':f'ZOMBIE_ZAMBONI_{i}_DAMAGE{1 if state=="damaged" else 2}' for i in [1,2]}
  add(kind+'-'+state,name,'anim_'+layer,hidden=hidden,replace=replace)
# Split the vault at the same two Web states; do not play the entire jump twice.
specs['pole-jump']['slice']=[0,.58];specs['pole-land']['slice']=[.58,1]
for key in ['zombie-burn','dancer-burn','backup-burn','newspaper-burn','pole-burn']:add(key,'Zombie_charred','anim_crumble')
add('zomboni-die','Zombie_charred_zamboni','anim_crumble')

def read(name):
 if name in parsed:return parsed[name]
 path=source/(name+'.reanim');sources[str(path.relative_to(repo))]=hashlib.sha256(path.read_bytes()).hexdigest()
 xml=ET.fromstring('<root>'+path.read_text()+'</root>');tracks={}
 for track in xml.findall('track'):
  state=dict(x=0,y=0,sx=1,sy=1,kx=0,ky=0,f=0,a=1,i='');poses=[]
  for frame in track.findall('t'):
   for child in frame:
    if child.tag in state:state[child.tag]=child.text.removeprefix('IMAGE_REANIM_') if child.tag=='i' else float(child.text)
   poses.append([state[f] for f in fields])
  tracks[track.findtext('name')]=poses
 parsed[name]=tracks;return tracks

def group(tracks,layer,spec):
 ids=[i for i,p in enumerate(tracks[layer]) if p[6]>=0]
 if 'slice' in spec:a,b=spec['slice'];ids=ids[round(len(ids)*a):round(len(ids)*b)]
 selected=[]
 for name,poses in tracks.items():
  if any(name.startswith(prefix) for prefix in spec.get('hidden',[])):continue
  frames=[p.copy() for p in (poses[i] for i in ids)]
  for p in frames:
   if p[8] and name in spec.get('replace',{}):p[8]=spec['replace'][name]
  if any(p[8] and p[6]>=0 and p[7]>0 for p in frames):selected.append({'name':name,'poses':frames})
 return {'length':len(ids),'tracks':selected},ids

def bbox(groups):
 points=[]
 for g in groups:
  for t in g['tracks']:
   x,y,sx,sy,kx,ky,f,a,name=t['poses'][0]
   if not name or f<0 or a<=0:continue
   box=Image.open(images[name]).convert('RGBA').getbbox()
   if box:
    for u,v in [(box[0],box[1]),(box[2],box[1]),(box[0],box[3]),(box[2],box[3])]:points.append((x+math.cos(math.radians(kx))*sx*u-math.sin(math.radians(ky))*sy*v,y+math.sin(math.radians(kx))*sx*u+math.cos(math.radians(ky))*sy*v))
 return [min(p[0] for p in points),min(p[1] for p in points),max(p[0] for p in points),max(p[1] for p in points)]

families={};manifest={};needs_upscale=False
for key,spec in specs.items():
 tracks=read(spec['source']);g,ids=group(tracks,spec['layer'],spec);groups=[g]
 if key=='splitpea':
  for layer,attach in [('anim_head_idle','anim_idle'),('anim_splitpea_idle','anim_idle')]:
   head,_=group(tracks,layer,{});head['attachment']=[tracks[attach][i] for i in ids];groups.append(head)
 if spec.get('flag'):
  flag=read('Zombie_flagpole');fg,_=group(flag,'Zombie_flag',{});fg['attachment']=[tracks['Zombie_flaghand'][i] for i in ids];groups.append(fg)
 family=spec['source'].lower();clip={'duration':sum(old[key]['durations']),'groups':groups}
 if 'origin' in spec:clip['origin']=spec['origin'];clip['scale']=1
 families.setdefault(family,{'clips':{}})['clips'][key]=clip;manifest[key]=family
# Former GIF families use a common idle binding so damage/headless/action states do not resize.
for family,d in families.items():
 base=next((key for key in d['clips'] if key.endswith('-walk') or '-' not in key),next(iter(d['clips'])))
 clip=d['clips'][base];bounds=bbox(clip['groups']);meta=old[base];frame=meta['frames'][0];anchor=meta['anchor']
 scale=frame[4]/(bounds[3]-bounds[1]);origin=[frame[5]-anchor[0]+frame[3]/2-(bounds[0]+bounds[2])/2*scale,frame[6]-anchor[1]+frame[4]-bounds[3]*scale]
 for key,c in d['clips'].items():
  if 'origin' not in c:c['origin']=[round(x,5) for x in origin];c['scale']=round(scale,6)
  c['healthTop']=old[key]['frames'][0][6]-old[key]['anchor'][1]-10
 used=sorted({p[8] for c in d['clips'].values() for g in c['groups'] for t in g['tracks'] for p in t['poses'] if p[8]})
 d['images']=used
 for name in used:
  path=images[name];sources[str(path.relative_to(repo))]=hashlib.sha256(path.read_bytes()).hexdigest()
  if not (results/(name+'.png')).exists():
   Image.open(path).convert('RGBA').save(inputs/(name+'.png'));needs_upscale=True
engine=root/'artifacts/hd-work/runtime/realesrgan-ncnn-vulkan'
if needs_upscale:
 subprocess.run([str(engine),'-i',str(inputs),'-o',str(results),'-m',str(engine.parent/'models'),'-n','realesr-animevideov3','-s','2','-f','png'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for family,d in families.items():
 if len(sys.argv)>2 and family not in sys.argv[2:]:continue
 entries=[];x=2;y=2;row=0
 for name in d.pop('images'):
  im=Image.open(results/(name+'.png')).convert('RGBA');w,h=im.size
  if x+w+2>2048:x=2;y+=row+4;row=0
  entries.append((name,im,x,y));x+=w+4;row=max(row,h)
 atlas=Image.new('RGBA',(min(2048,max(x+2,max(xx+im.width+2 for _,im,xx,_ in entries))),y+row+2));rects={}
 for name,im,x,y in entries:atlas.paste(im,(x,y));rects[name]=[x/2,y/2,im.width/2,im.height/2]
 atlas.save(out/(family+'.webp'),quality=94,method=6,exact=True)
 d['frames']=rects;(out/(family+'.json')).write_text(json.dumps(d,separators=(',',':')))
 print(family,len(d['clips']),'clips',atlas.size,flush=True)
(root/'src/rendering/actor-motion-index.json').write_text(json.dumps(manifest,indent=2)+'\n')
(root/'docs/actor-motion-assets.json').write_text(json.dumps({'commit':subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip(),'clips':specs,'sources':sources},indent=2)+'\n')
print('Exported',len(specs),'states in',len(families),'families')
