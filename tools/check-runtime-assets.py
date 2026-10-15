from pathlib import Path
from PIL import Image
import json
from skimage.metrics import structural_similarity
import numpy as np
report=json.loads((Path(__file__).resolve().parents[1]/'docs/image-compression-2026-10-15.json').read_text())
compressed={row['file'] for row in report['files'] if row['mode'].startswith('webp-q')}
root=Path(__file__).resolve().parents[1]/'public/assets'
a=json.loads((root/'hd/original/animations.json').read_text())
b=json.loads((root/'runtime/animations.json').read_text())
masters=[Image.open(root/f'hd/original/actors-{i}.png').convert('RGBA') for i in range(a['pages'])]
count=0
for name,clip in b['animations'].items():
    pages=[Image.open(root/'runtime'/p).convert('RGBA') for p in clip['pages']]
    for before,after in zip(a['animations'][name]['frames'],clip['frames']):
        p,x,y,w,h=before[:5];q,u,v=after[:3]
        assert masters[p].crop((x*2,y*2,(x+w)*2,(y+h)*2)).getchannel('A').tobytes()==pages[q].crop((u*2,v*2,(u+w)*2,(v+h)*2)).getchannel('A').tobytes(),name
        count+=1
static_count=0
for path in (root/'hd').rglob('*.png'):
    if path.name.startswith('actors-'):continue
    image=Image.open(path).convert('RGBA');packed=Image.open(root/'runtime'/path.relative_to(root/'hd').with_suffix('.webp')).convert('RGBA')
    background=path.relative_to(root/'hd').as_posix() in ['yard.png','lawn.png','original/menu.png','original/pool.png','original/night.png','original/fog.png','original/roof.png']
    assert image.size==packed.size,path
    assert image.getchannel('A').tobytes()==packed.getchannel('A').tobytes(),path
    optimized=('assets/runtime/'+path.relative_to(root/'hd').with_suffix('.webp').as_posix()) in compressed
    if optimized:
        for color in ['#47752b','#eee1b0']:
            bg=Image.new('RGBA',image.size,color)
            before=np.asarray(Image.alpha_composite(bg,image).convert('RGB'))
            after=np.asarray(Image.alpha_composite(bg,packed).convert('RGB'))
            assert structural_similarity(before,after,channel_axis=2,data_range=255)>=.985,path
    elif not background:
        assert image.tobytes()==packed.tobytes(),path
    static_count+=1
print(f'{count} animation frames and {static_count} static images retain exact alpha; lossless HUD retains exact RGBA; compressed static art passes SSIM >= 0.985.')
