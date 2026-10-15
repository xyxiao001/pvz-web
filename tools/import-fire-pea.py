"""Bake original FirePea Reanim tracks into one small 2x WebP atlas.
Usage: python3 tools/import-fire-pea.py RUSLAN_REPO
Projectile.cpp::ConvertToFireball uses this Reanim at 50–80 fps.
"""
import hashlib, importlib.util, json, math, sys
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1]
source = Path(sys.argv[1]) / 'SexyAppFramework/reanim'
spec = importlib.util.spec_from_file_location('reanim', Path(__file__).with_name('reanim-frames.py'))
module = importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
inputs = {}
def record(path): inputs[path.name] = hashlib.sha256(path.read_bytes()).hexdigest()
frames = module.render_clip(source, 'FirePea', 'FirePea_flames', (160,128), (60,30), record)
boxes = [im.getbbox() for im in frames]
bounds = (min(b[0] for b in boxes),min(b[1] for b in boxes),max(b[2] for b in boxes),max(b[3] for b in boxes))
w,h = bounds[2]-bounds[0]+4,bounds[3]-bounds[1]+4
atlas = Image.new('RGBA',(w*2*5,h*2*math.ceil(len(frames)/5)))
for i,frame in enumerate(frames):
    cell=Image.new('RGBA',(w,h));cell.paste(frame.crop(bounds),(2,2))
    atlas.paste(cell.resize((w*2,h*2),Image.Resampling.LANCZOS),((i%5)*w*2,(i//5)*h*2))
output=root/'public/assets/runtime/original/fire-pea.webp'
atlas.save(output,quality=92,method=6,exact=True)
metadata={'frames':len(frames),'columns':5,'width':w,'height':h,'anchor':[(100-bounds[0]+2)/w,(70-bounds[1]+2)/h]}
(root/'src/rendering/fire-pea.json').write_text(json.dumps(metadata,indent=2)+'\n')
(root/'docs/fire-pea-assets.json').write_text(json.dumps({'source':'ruslan831/PlantsVsZombies-decompilation','files':inputs,'atlas':metadata,'bytes':output.stat().st_size},indent=2)+'\n')
print(json.dumps(metadata),output.stat().st_size)
