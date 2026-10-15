"""Audit all shipped images; retain dimensions/alpha and keep only smaller encodings.
Lossless for text, cards, HUD and icons; high-quality WebP for large art.
Already-lossy art is not repeatedly transcoded. Authoring masters stay untouched.
"""
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image
from skimage.metrics import structural_similarity
import numpy as np
import hashlib,io,json
root=Path(__file__).resolve().parents[1];public=root/'public';backup=root/'artifacts/iteration-20261015/images-before'
paths=sorted([*public.joinpath('assets/runtime').rglob('*'),*public.joinpath('icons').glob('*')]);paths=[p for p in paths if p.suffix.lower() in ['.webp','.png','.jpg','.jpeg','.ico'] and p.name!='icon-master.png']

def work(p):
 relative=p.relative_to(public); original=p.read_bytes(); reference=Image.open(io.BytesIO(original)).convert('RGBA')
 protected=('/ui/' in relative.as_posix() or relative.parts[0]=='icons' or p.stem.startswith('card-') or p.stem in ['seed-packet','button','dialog','seedbank','meter-empty','meter-full','conveyor-back','shovelbank','logo'])
 chosen=original;mode='unchanged';score=1.
 if p.suffix=='.webp':
  # Repacking an already-lossy image as lossless never improves its original fidelity.
  lossless=b'VP8L' in original[:32]
  if lossless:
   candidate=io.BytesIO();reference.save(candidate,format='WEBP',lossless=True,method=6,exact=True)
   if len(candidate.getvalue())<len(chosen):chosen=candidate.getvalue();mode='lossless'
   if not protected and len(original)>20000:
    for quality in [94,97]:
     candidate=io.BytesIO();reference.save(candidate,format='WEBP',quality=quality,method=6,exact=True)
     encoded=candidate.getvalue()
     if len(encoded)>=len(chosen):continue
     decoded=Image.open(io.BytesIO(encoded)).convert('RGBA')
     assert decoded.size==reference.size and decoded.getchannel('A').tobytes()==reference.getchannel('A').tobytes(),relative
     # Compare visible RGB on the lawn and a light paper background, at native 2x.
     scores=[]
     for color in ['#47752b','#eee1b0']:
      bg=Image.new('RGBA',reference.size,color)
      a=np.asarray(Image.alpha_composite(bg,reference).convert('RGB'));b=np.asarray(Image.alpha_composite(bg,decoded).convert('RGB'))
      scores.append(float(structural_similarity(a,b,channel_axis=2,data_range=255)))
     metric=min(scores)
     if metric>=.985:chosen=encoded;mode=f'webp-q{quality}';score=metric;break
 elif p.suffix=='.png':
  candidate=io.BytesIO();reference.save(candidate,format='PNG',optimize=True)
  if len(candidate.getvalue())<len(chosen):chosen=candidate.getvalue();mode='lossless'
 # JPEG preview and ICO are already compressed; keep original bytes and format.
 if chosen!=original:
  dest=backup/relative;dest.parent.mkdir(parents=True,exist_ok=True)
  if not dest.exists():dest.write_bytes(original)
  p.write_bytes(chosen)
 return {'file':str(relative),'before':len(original),'after':len(chosen),'mode':mode,'ssim':round(score,6),'width':reference.width,'height':reference.height,'alphaSha256':hashlib.sha256(reference.getchannel('A').tobytes()).hexdigest()}
with ThreadPoolExecutor(max_workers=3) as pool:report=list(pool.map(work,paths))
summary={'images':len(report),'changed':sum(x['mode']!='unchanged' for x in report),'before':sum(x['before'] for x in report),'after':sum(x['after'] for x in report),'files':report}
(root/'docs/image-compression-2026-10-15.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps({k:v for k,v in summary.items() if k!='files'}),flush=True)
