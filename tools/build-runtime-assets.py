"""Pack lossless, per-animation WebP atlases from the existing 2x PNG masters.
Run after build-hd-assets.py. No AI inference or pose/timing changes.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image
import hashlib, json
import importlib.util
spec = importlib.util.spec_from_file_location("atlas_layout", Path(__file__).with_name("atlas-layout.py"))
layout_module = importlib.util.module_from_spec(spec); spec.loader.exec_module(layout_module)
root = Path(__file__).resolve().parents[1]
source, output = root / 'public/assets/hd', root / 'public/assets/runtime'
(output / 'clips').mkdir(parents=True, exist_ok=True)
metadata = json.loads((source / 'original/animations.json').read_text())
masters = [Image.open(source / f'original/actors-{i}.png').convert('RGBA') for i in range(metadata['pages'])]

def pack(item):
    name, clip = item
    poses = {tuple(f[:5]): f for f in clip['frames']}
    placements, extents = layout_module.compact_layout(list(poses))
    pages = [Image.new('RGBA', (w*2,h*2)) for w,h in extents]
    for rect in poses:
        page, x, y, w, h = rect
        image = masters[page].crop((x*2,y*2,(x+w)*2,(y+h)*2))
        dest, dx, dy = placements[rect]
        pages[dest].paste(image,(dx*2,dy*2))
    files, sizes = [], []
    for i,page in enumerate(pages):
        path=f'clips/{name}-{i}.webp'
        page.save(output/path,lossless=True,quality=90,method=6,exact=True)
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
# Remove pages superseded by the new layout from this generated directory.
used={p for clip in animations.values() for p in clip['pages']}
for page in (output/'clips').glob('*.webp'):
    if page.relative_to(output).as_posix() not in used: page.unlink()
manifest={'sourceAnimationSha256':hashlib.sha256((source/'original/animations.json').read_bytes()).hexdigest(),'encoding':'lossless WebP','frames':sum(len(c['frames']) for c in animations.values()),'clips':len(animations),'staticImages':len(static_files),'outputBytes':sum(p.stat().st_size for p in output.rglob('*.webp')),'atlasRgbaBytes':sum(w*h*4 for c in animations.values() for w,h in c['sizes'])}
(output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps(manifest,indent=2))
