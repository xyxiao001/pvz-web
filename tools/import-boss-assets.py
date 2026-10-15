"""Export original boss Reanim tracks for interpolated Pixi rendering, plus 2x parts.
Usage: python3 tools/import-boss-assets.py RUSLAN_REPO
"""
from pathlib import Path
import hashlib, json, subprocess, sys
import xml.etree.ElementTree as ET
from PIL import Image
root = Path(__file__).resolve().parents[1]
repo = Path(sys.argv[1]); directory = repo / 'SexyAppFramework/reanim'
output = root / 'public/assets/runtime/boss'; output.mkdir(parents=True, exist_ok=True)
work = root / 'artifacts/hd-work/boss'; inputs = work / 'input'; results = work / 'output'
inputs.mkdir(parents=True, exist_ok=True); results.mkdir(parents=True, exist_ok=True)
images = {p.stem.upper():p for p in directory.glob('*.png')}
images['ZOMBIE_BOSS_NECK'] = directory / 'Zombie_boss_neck_.png'
images['ZOMBIE_BOSS_UPPERBODY'] = directory / 'Zombie_boss_upperbody_.png'
sources = {}; used = set(); definitions = {}
fields = ['x','y','sx','sy','kx','ky','f','a','i']
def record(path): sources[str(path.relative_to(repo))] = hashlib.sha256(path.read_bytes()).hexdigest()
for key, name in [('body','Zombie_boss'),('driver','Zombie_Boss_driver'),('fire','Zombie_boss_fireball'),('ice','Zombie_boss_iceball')]:
    path = directory / (name + '.reanim'); record(path)
    xml = ET.fromstring('<root>' + path.read_text() + '</root>'); tracks = []; clips = {}
    for track in xml.findall('track'):
        label = track.findtext('name'); state = dict(x=0,y=0,sx=1,sy=1,kx=0,ky=0,f=0,a=1,i=''); poses=[]
        for frame in track.findall('t'):
            for child in frame:
                if child.tag in state: state[child.tag] = child.text if child.tag == 'i' else float(child.text)
            pose = [state[f] for f in fields]; pose[8] = pose[8].removeprefix('IMAGE_REANIM_'); poses.append(pose)
            if pose[8]: used.add(pose[8])
        if label.startswith('anim_'):
            active = [i for i,p in enumerate(poses) if p[6] >= 0]
            clips[label] = [active[0],len(active)]
        elif any(p[8] for p in poses): tracks.append({'name':label,'poses':poses})
    definitions[key] = {'clips':clips,'tracks':tracks}
for name in sorted(used):
    path = images[name];record(path);image=Image.open(path).convert('RGBA')
    if name in ['ZOMBIE_BOSS_NECK','ZOMBIE_BOSS_UPPERBODY']:
        color=path.with_name(path.stem[:-1]+'.jpg');record(color)
        image=Image.open(color).convert('RGBA');image.putalpha(Image.open(path).convert('L'))
    image.save(inputs / (name+'.png'))
background = repo / 'images/background6boss.jpg';record(background);Image.open(background).convert('RGBA').save(inputs/'background.png')
engine = root / 'artifacts/hd-work/runtime/realesrgan-ncnn-vulkan'
subprocess.run([str(engine),'-i',str(inputs),'-o',str(results),'-m',str(engine.parent/'models'),'-n','realesr-animevideov3','-s','2','-f','png'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
for name in [*sorted(used),'background']:
    Image.open(results/(name+'.png')).save(output/(name+'.webp'),lossless=name!='background',quality=90,method=6 if name=='background' else 4,exact=True)
(output/'tracks.json').write_text(json.dumps(definitions,separators=(',',':')))
(root/'src/game/data/boss-clips.json').write_text(json.dumps(definitions['body']['clips'],indent=2)+'\n')
(root/'docs/boss-assets.json').write_text(json.dumps({'repository':'https://github.com/ruslan831/PlantsVsZombies-decompilation','commit':subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip(),'sources':sources,'scaling':'Real-ESRGAN animevideov3 2x, per source part; transforms remain in original coordinates'},indent=2)+'\n')
print(f'{len(used)} boss parts and background exported')
