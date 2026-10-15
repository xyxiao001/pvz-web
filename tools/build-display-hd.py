"""Build display-only 4x art with the existing Real-ESRGAN model.
Usage: python3 tools/build-display-hd.py
Targets/sources are pinned in tools/display-hd-targets.json. Gameplay atlases stay 2x.
Generated files are separate URLs; low-density clients and old releases keep their art.
"""
from pathlib import Path
from PIL import Image
import hashlib, json, subprocess, sys
root = Path(__file__).resolve().parents[1]
work = root / 'artifacts/hd4'
engine = root / 'artifacts/hd-work/runtime/realesrgan-ncnn-vulkan'
targets = json.loads((root/'tools/display-hd-targets.json').read_text())
for folder in ['input', 'output']:
    (work/folder).mkdir(parents=True, exist_ok=True)
for i, target in enumerate(targets):
    image = Image.open(root/target['source']).convert('RGBA')
    if 'crop' in target:
        image = image.crop(target['crop'])
    image.save(work/'input'/f'{i:03}.png')
if '--encode-only' not in sys.argv:
    with (work/'inference.log').open('w') as log:
        subprocess.run([str(engine), '-i', str(work/'input'), '-o', str(work/'output'),
                        '-m', str(engine.parent/'models'), '-n', 'realesr-animevideov3',
                        '-s', '4', '-t', '128', '-j', '1:1:1', '-f', 'png'],
                       stdout=log, stderr=log, check=True)
report = []
for i, target in enumerate(targets):
    image = Image.open(work/'output'/f'{i:03}.png')
    path = root/'public/assets/runtime/hd4'/target['file']
    path.parent.mkdir(parents=True, exist_ok=True)
    # Keep packet lettering/logo lossless; use Q97 for other HD surfaces and Q95 for scenery.
    # Always encode the inference PNG, never transcode an already-lossy WebP.
    background = target['role'] == 'scenery' or target['file'] in ['original/menu.webp','original/shop-background.webp','ui/challenge-background.webp']
    lossless = target['file'] in ['original/seed-packet.webp', 'original/logo.webp']
    image.save(path, lossless=lossless, quality=95 if background else 97, method=6, exact=True)
    report.append({**target, 'size':list(image.size), 'bytes':path.stat().st_size,
                   'sourceSha256':hashlib.sha256((root/target['source']).read_bytes()).hexdigest(),
                   'sha256':hashlib.sha256(path.read_bytes()).hexdigest()})
    print(target['file'], image.size, path.stat().st_size, flush=True)
manifest = {'model':'realesr-animevideov3-x4',
            'engineSha256':hashlib.sha256(engine.read_bytes()).hexdigest(),
            'modelSha256':hashlib.sha256((engine.parent/'models/realesr-animevideov3-x4.bin').read_bytes()).hexdigest(),
            'bytes':sum(item['bytes'] for item in report), 'files':report}
(root/'docs/display-hd-assets.json').write_text(json.dumps(manifest,indent=2)+'\n')
