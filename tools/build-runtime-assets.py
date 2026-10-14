"""Pack lossless, per-animation WebP atlases from the existing 2x PNG masters.
Run after build-hd-assets.py. No AI inference or pose/timing changes.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image
import hashlib, json, math
root = Path(__file__).resolve().parents[1]
source, output = root / 'public/assets/hd', root / 'public/assets/runtime'
(output / 'clips').mkdir(parents=True, exist_ok=True)
metadata = json.loads((source / 'original/animations.json').read_text())
masters = [Image.open(source / f'original/actors-{i}.png').convert('RGBA') for i in range(metadata['pages'])]

def pack(item):
    name, clip = item
    poses = {tuple(f[:5]): f for f in clip['frames']}
    area = sum(f[3]*f[4] for f in poses.values())
    width = min(1024, max(max(f[3]+4 for f in poses.values()), math.ceil(math.sqrt(area)/64)*64))
    pages, placements, shelves = [], {}, []
    for rect, frame in sorted(poses.items(), key=lambda item: -item[1][4]):
        page, x, y, w, h = rect
        shelf = next((s for s in shelves if s['h'] >= h and s['x'] + w + 4 <= width), None)
        if shelf is None:
            bottom = shelves[-1]['y'] + shelves[-1]['h'] + 4 if shelves else 0
            if not pages or bottom + h + 4 > 1024:
                pages.append(Image.new('RGBA',(width*2,2048)))
                bottom = 0
            shelf = {'p':len(pages)-1,'x':0,'y':bottom,'h':h}; shelves.append(shelf)
        image = masters[page].crop((x*2,y*2,(x+w)*2,(y+h)*2))
        pages[shelf['p']].paste(image,(shelf['x']*2,shelf['y']*2))
        placements[rect] = [shelf['p'],shelf['x'],shelf['y']]
        shelf['x'] += w+4
    files, sizes = [], []
    for i,page in enumerate(pages):
        height=max(s['y']+s['h']+4 for s in shelves if s['p']==i)*2
        page=page.crop((0,0,width*2,height))
        path=f'clips/{name}-{i}.webp'
        page.save(output/path,lossless=True,quality=90,method=4,exact=True)
        files.append(path); sizes.append(list(page.size))
    return name, {**clip, 'pages':files, 'sizes':sizes, 'frames':[placements[tuple(f[:5])] + f[3:] for f in clip['frames']]}

with ThreadPoolExecutor(max_workers=4) as pool:
    animations=dict(pool.map(pack,metadata['animations'].items()))
static_files=[p for p in source.rglob('*.png') if not p.name.startswith('actors-')]
def convert(path):
    relative=path.relative_to(source).with_suffix('.webp');dest=output/relative;dest.parent.mkdir(parents=True,exist_ok=True)
    Image.open(path).save(dest,lossless=True,quality=90,method=4,exact=True)
with ThreadPoolExecutor(max_workers=4) as pool:
    list(pool.map(convert,static_files))
(output/'animations.json').write_text(json.dumps({'animations':animations},separators=(',',':')))
manifest={'sourceAnimationSha256':hashlib.sha256((source/'original/animations.json').read_bytes()).hexdigest(),'encoding':'lossless WebP','frames':sum(len(c['frames']) for c in animations.values()),'clips':len(animations),'staticImages':len(static_files),'outputBytes':sum(p.stat().st_size for p in output.rglob('*.webp')),'atlasRgbaBytes':sum(w*h*4 for c in animations.values() for w,h in c['sizes'])}
(output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
