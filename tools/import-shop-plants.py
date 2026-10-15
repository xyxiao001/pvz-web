"""Import original shop plant part tracks; no runtime frame baking. Usage: ... RUSLAN_REPO"""
from pathlib import Path
import hashlib, importlib.util, json, math, sys
import xml.etree.ElementTree as ET
from PIL import Image
root=Path(__file__).resolve().parents[1];repo=Path(sys.argv[1]);source=repo/'SexyAppFramework/reanim'
out=root/'public/assets/runtime/actor-motion';index=json.loads((root/'src/rendering/actor-motion-index.json').read_text());sources={}
def record(p):sources[str(p.relative_to(repo))]=hashlib.sha256(p.read_bytes()).hexdigest()
spec=importlib.util.spec_from_file_location('reanim',root/'tools/reanim-frames.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
specs=[('gloomshroom','GloomShroom',{'':'anim_idle','-attack':'anim_shooting'},14),('cattail','Cattail',{'':'anim_idle','-attack':'anim_shooting'},15),('goldmagnet','GoldMagnet',{'':'anim_idle','-attack':'anim_attract'},14),('spikerock','SpikeRock',{'':'anim_idle','-attack':'anim_attack'},14),('cobcannon','CobCannon',{'':'anim_idle','-unarmed':'anim_unarmed_idle','-charge':'anim_charge','-attack':'anim_shooting'},12),('imitater','Imitater',{'':'anim_idle','-morph':'anim_explode'},26)]
specs.append(('yeti','Zombie_yeti',{'-walk':'anim_walk','-eat':'anim_eat','-die':'anim_death'},12))
for key,name,layers,fps in specs:
 p=source/(name+'.reanim');record(p);xml=ET.fromstring('<root>'+p.read_text()+'</root>');tracks={}
 for track in xml.findall('track'):
  state=dict(x=0,y=0,sx=1,sy=1,kx=0,ky=0,f=0,a=1,i='');poses=[]
  for frame in track.findall('t'):
   for c in frame:
    if c.tag in state:state[c.tag]=c.text.removeprefix('IMAGE_REANIM_') if c.tag=='i' else float(c.text)
   poses.append(list(state.values()))
  tracks[track.findtext('name')]=poses
 clips={}
 for suffix,layer in layers.items():
  ids=[i for i,p in enumerate(tracks[layer]) if p[6]>=0];selected=[]
  for n,poses in tracks.items():
   frames=[poses[i] for i in ids]
   if any(p[8] and p[6]>=0 and p[7]>0 for p in frames):selected.append({'name':n,'poses':frames})
  clips[key+suffix]={'duration':len(ids)/fps*100,'groups':[{'length':len(ids),'tracks':selected}]}
 if key=='yeti':
  import copy
  for action in ['walk','eat']:
   clip=copy.deepcopy(clips['yeti-'+action]);clip['groups'][0]['tracks']=[t for t in clip['groups'][0]['tracks'] if not t['name'].startswith('anim_head')];clips['yeti-headless-'+action]=clip
 # Derive one shared anchor from the original idle pose so attack tracks never jump.
 portrait=mod.render_clip(source,name,layers['-walk'] if key=='yeti' else layers[''],(700,700),(300,300),record)[0];box=portrait.getbbox();w,h=box[2]-box[0],box[3]-box[1]
 scale=min(1,(150 if key=='cobcannon' else 115 if key=='yeti' else 80)/w,(140 if key=='yeti' else 90)/h)
 origin=[-(box[0]+box[2]-600)/2*scale+(40 if key=='cobcannon' else 0),-(box[3]-300)*scale]
 for clip in clips.values():clip.update(origin=origin,scale=scale,healthTop=-h*scale-10)
 used=sorted({p[8] for c in clips.values() for g in c['groups'] for t in g['tracks'] for p in t['poses'] if p[8]})
 images={p.stem.upper():p for p in source.glob('*.png')};entries=[];x=y=2;row=0;rects={}
 for n in used:
  p=images[n];record(p);im=Image.open(p).convert('RGBA');im=im.resize((im.width*2,im.height*2),Image.Resampling.LANCZOS)
  if x+im.width+2>2048:x=2;y+=row+4;row=0
  entries.append((n,im,x,y));rects[n]=[x/2,y/2,im.width/2,im.height/2];x+=im.width+4;row=max(row,im.height)
 atlas=Image.new('RGBA',(max(xx+im.width+2 for _,im,xx,_ in entries),y+row+2))
 for _,im,x,y in entries:atlas.paste(im,(x,y))
 family=name.lower();atlas.save(out/(family+'.webp'),quality=94,method=6)
 (out/(family+'.json')).write_text(json.dumps({'clips':clips,'frames':rects},separators=(',',':')))
 for c in clips:index[c]=family
 portrait.crop(box).save(root/'public/assets/runtime/original'/f'{key}.webp',quality=94,method=6)
 print(key,atlas.size)
(root/'src/rendering/actor-motion-index.json').write_text(json.dumps(index,indent=2)+'\n')
(root/'docs/shop-plant-assets.json').write_text(json.dumps(sources,indent=2)+'\n')
