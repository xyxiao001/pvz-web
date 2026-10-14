"""Export interpolated idle Reanim tracks and 2x part atlases for common and upgrade plants.
Usage: python3 tools/import-plant-motion.py RUSLAN_REPO
Preserves the existing Web idle cycle duration; never changes combat timing.
"""
from pathlib import Path
import hashlib, json, math, subprocess, sys
import xml.etree.ElementTree as ET
from PIL import Image
root = Path(__file__).resolve().parents[1]
repo = Path(sys.argv[1]); directory = repo / 'SexyAppFramework/reanim'
output = root / 'public/assets/runtime/plant-motion'; output.mkdir(parents=True, exist_ok=True)
work = root / 'artifacts/hd-work/plant-motion'; inputs = work / 'input'; results = work / 'output'
inputs.mkdir(parents=True, exist_ok=True); results.mkdir(parents=True, exist_ok=True)
images = {p.stem.upper(): p for p in directory.glob('*.png')}
sources = {}; definitions = {}; fields = ['x','y','sx','sy','kx','ky','f','a','i']
def record(path): sources[str(path.relative_to(repo))] = hashlib.sha256(path.read_bytes()).hexdigest()
for key, name, layer, duration in [('peashooter','PeaShooter','anim_full_idle',100),('sunflower','SunFlower','anim_idle',100),('threepeater','ThreePeater','anim_idle',144),('gatlingpea','GatlingPea','anim_idle',144),('twinsunflower','TwinSunflower','anim_idle',144)]:
    path = directory / (name+'.reanim'); record(path)
    xml = ET.fromstring('<root>'+path.read_text()+'</root>'); tracks = {}
    for track in xml.findall('track'):
        state=dict(x=0,y=0,sx=1,sy=1,kx=0,ky=0,f=0,a=1,i=''); poses=[]
        for frame in track.findall('t'):
            for child in frame:
                if child.tag in state: state[child.tag] = child.text.removeprefix('IMAGE_REANIM_') if child.tag=='i' else float(child.text)
            poses.append([state[f] for f in fields])
        tracks[track.findtext('name')]=poses
    def group(layer, attachment=None):
        active=[i for i,p in enumerate(tracks[layer]) if p[6]>=0]; start=active[0]; count=len(active)
        selected=[]
        for name,poses in tracks.items():
            frames=poses[start:start+count]
            if any(p[8] and p[6]>=0 and p[7]>0 for p in frames): selected.append({'name':name,'poses':frames})
        result={'tracks':selected,'length':count}
        if attachment:
            body=[i for i,p in enumerate(tracks['anim_idle']) if p[6]>=0]
            result['attachment']=tracks[attachment][body[0]:body[-1]+1]
        return result
    groups=[group(layer)]
    if key=='gatlingpea': groups.append(group('anim_head_idle','anim_idle'))
    if key=='threepeater': groups += [group('anim_head_idle'+i,'anim_head'+i) for i in ['1','3','2']]
    used=sorted({p[8] for g in groups for t in g['tracks'] for p in t['poses'] if p[8]})
    definitions[key]={'duration':duration,'origin':[-40,-74 if key!='threepeater' else -80],'groups':groups,'images':used}
    for name in used:
        path=images[name];record(path);Image.open(path).convert('RGBA').save(inputs/(name+'.png'))
engine=root/'artifacts/hd-work/runtime/realesrgan-ncnn-vulkan'
subprocess.run([str(engine),'-i',str(inputs),'-o',str(results),'-m',str(engine.parent/'models'),'-n','realesr-animevideov3','-s','2','-f','png'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for key,definition in definitions.items():
    entries=[];x=2;y=2;row=0
    for name in definition.pop('images'):
        image=Image.open(results/(name+'.png')).convert('RGBA');w,h=image.size
        if x+w+2>1024:x=2;y+=row+4;row=0
        entries.append((name,image,x,y));x+=w+4;row=max(row,h)
    atlas=Image.new('RGBA',(1024,y+row+2));rects={}
    for name,image,x,y in entries:
        atlas.paste(image,(x,y));rects[name]=[x/2,y/2,image.width/2,image.height/2]
    atlas.save(output/(key+'.webp'),lossless=True,method=6,exact=True)
    definition['frames']=rects
    (output/(key+'.json')).write_text(json.dumps(definition,separators=(',',':')))
    if key in ['gatlingpea','twinsunflower']:
        portrait=Image.new('RGBA',(320,320))
        for g in definition['groups']:
            for t in g['tracks']:
                x,y,sx,sy,kx,ky,f,alpha,name=t['poses'][0]
                if not name or f<0 or alpha<=0: continue
                im=Image.open(results/(name+'.png')).convert('RGBA')
                a=math.cos(math.radians(kx))*sx;b=-math.sin(math.radians(ky))*sy
                c=math.sin(math.radians(kx))*sx;d=math.cos(math.radians(ky))*sy
                det=a*d-b*c;x=x*2+60;y=y*2+80
                if det==0: continue
                part=im.transform(portrait.size,Image.Transform.AFFINE,(d/det,-b/det,(b*y-d*x)/det,-c/det,a/det,(c*x-a*y)/det),Image.Resampling.BICUBIC)
                portrait.alpha_composite(part)
        portrait.crop(portrait.getbbox()).save(root/'public/assets/runtime/original'/(key+'.webp'),lossless=True,method=6)
    print(key,atlas.size,len(rects),'parts',len(definition['groups']),'groups')
(root/'docs/plant-motion-assets.json').write_text(json.dumps({'repository':'https://github.com/ruslan831/PlantsVsZombies-decompilation','commit':subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip(),'sources':sources,'scaling':'Real-ESRGAN animevideov3 2x per source part; packed without resampling'},indent=2)+'\n')
