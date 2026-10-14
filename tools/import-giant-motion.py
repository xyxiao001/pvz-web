"""Export Gargantuar's original image tracks and one 2x part atlas.
Usage: python3 tools/import-giant-motion.py RUSLAN_REPO
Keeps the existing Web clip durations, origins and post-throw hidden tracks.
"""
from pathlib import Path
import hashlib, json, subprocess, sys
import xml.etree.ElementTree as ET
from PIL import Image

root = Path(__file__).resolve().parents[1]
repo = Path(sys.argv[1]); directory = repo / 'SexyAppFramework/reanim'
output = root / 'public/assets/runtime/giant-motion'; output.mkdir(parents=True, exist_ok=True)
work = root / 'artifacts/hd-work/giant-motion'; inputs = work / 'input'; results = work / 'output'
inputs.mkdir(parents=True, exist_ok=True); results.mkdir(parents=True, exist_ok=True)
sources = {}
def record(path): sources[str(path.relative_to(repo))] = hashlib.sha256(path.read_bytes()).hexdigest()
path = directory / 'Zombie_gargantuar.reanim'; record(path)
xml = ET.fromstring('<root>' + path.read_text() + '</root>')
tracks = {}; fields = ['x','y','sx','sy','kx','ky','f','a','i']
for track in xml.findall('track'):
    state = dict(x=0,y=0,sx=1,sy=1,kx=0,ky=0,f=0,a=1,i=''); poses = []
    for frame in track.findall('t'):
        for child in frame:
            if child.tag in state: state[child.tag] = child.text.removeprefix('IMAGE_REANIM_') if child.tag == 'i' else float(child.text)
        poses.append([state[f] for f in fields])
    tracks[track.findtext('name')] = poses
clips = {}
for key, layer in [('walk','anim_walk'),('smash','anim_smash'),('throw','anim_throw'),('die','anim_death')]:
    active = [i for i,p in enumerate(tracks[layer]) if p[6] >= 0]
    selected = []
    for name, poses in tracks.items():
        frames = [poses[i] for i in active]
        if any(p[8] and p[6] >= 0 and p[7] > 0 for p in frames): selected.append({'name':name,'poses':frames})
    clips[key] = {'duration':len(active)*10,'length':len(active),'tracks':selected}
used = sorted({p[8] for clip in clips.values() for t in clip['tracks'] for p in t['poses'] if p[8]})
images = {p.stem.upper():p for p in directory.glob('*.png')}
for name in used:
    path = images[name]; record(path); Image.open(path).convert('RGBA').save(inputs/(name+'.png'))
engine = root / 'artifacts/hd-work/runtime/realesrgan-ncnn-vulkan'
subprocess.run([str(engine),'-i',str(inputs),'-o',str(results),'-m',str(engine.parent/'models'),'-n','realesr-animevideov3','-s','2','-f','png'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
entries = []; x=2; y=2; row=0
for name in used:
    image = Image.open(results/(name+'.png')).convert('RGBA'); w,h=image.size
    if x+w+2 > 1024: x=2; y+=row+4; row=0
    entries.append((name,image,x,y)); x+=w+4; row=max(row,h)
atlas = Image.new('RGBA',(1024,y+row+2)); rects={}
for name,image,x,y in entries:
    atlas.paste(image,(x,y)); rects[name]=[x/2,y/2,image.width/2,image.height/2]
atlas.save(output/'gargantuar.webp',lossless=True,method=6,exact=True)
(output/'gargantuar.json').write_text(json.dumps({'origin':[-50,-145],'clips':clips,'frames':rects},separators=(',',':')))
(root/'docs/giant-motion-assets.json').write_text(json.dumps({'repository':'https://github.com/ruslan831/PlantsVsZombies-decompilation','commit':subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip(),'sources':sources,'scaling':'Real-ESRGAN animevideov3 2x per source part; packed without resampling'},indent=2)+'\n')
print(atlas.size,len(rects),'parts',[(key,value['length']) for key,value in clips.items()])
