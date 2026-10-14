from pathlib import Path
from PIL import Image
import json
root=Path(__file__).resolve().parents[1]/'public/assets'
a=json.loads((root/'hd/original/animations.json').read_text())
b=json.loads((root/'runtime/animations.json').read_text())
masters=[Image.open(root/f'hd/original/actors-{i}.png').convert('RGBA') for i in range(a['pages'])]
count=0
for name,clip in b['animations'].items():
    pages=[Image.open(root/'runtime'/p).convert('RGBA') for p in clip['pages']]
    for before,after in zip(a['animations'][name]['frames'],clip['frames']):
        p,x,y,w,h=before[:5];q,u,v=after[:3]
        assert masters[p].crop((x*2,y*2,(x+w)*2,(y+h)*2)).tobytes()==pages[q].crop((u*2,v*2,(u+w)*2,(v+h)*2)).tobytes(),name
        count+=1
static_count=0
for path in (root/'hd').rglob('*.png'):
    if path.name.startswith('actors-'):continue
    image=Image.open(path).convert('RGBA');packed=Image.open(root/'runtime'/path.relative_to(root/'hd').with_suffix('.webp')).convert('RGBA')
    assert image.tobytes()==packed.tobytes(),path
    static_count+=1
print(f'{count} animation frames and {static_count} static images are pixel-identical (RGBA).')
