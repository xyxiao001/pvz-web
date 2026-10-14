"""Build a deterministic 2x texture set with Real-ESRGAN animevideo-v3.

Usage: python3 tools/build-hd-assets.py ENGINE MODELS sample|all OUTPUT
Requires Pillow. ENGINE/MODELS are the official ncnn-vulkan runtime and model folder.
The sample contains all animation states used by adventure 1–2. Game rules are untouched.
"""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from PIL import Image

engine, models = (Path(value).resolve() for value in sys.argv[1:3])
mode = sys.argv[3]
output = Path(sys.argv[4]).resolve()
root = Path(__file__).resolve().parents[1]
source = root / 'public/assets'
work = root / 'artifacts/hd-work' / mode
inputs, results = work / 'input', work / 'output'
for directory in [inputs, results, output / 'original']:
    directory.mkdir(parents=True, exist_ok=True)
metadata = json.loads((source / 'original/animations.json').read_text())
source_pages = [Image.open(source / f'original/actors-{i}.png').convert('RGBA') for i in range(metadata['pages'])]
sample_clips = {'peashooter', 'sunflower', 'sun', 'zombie-walk', 'zombie-eat', 'zombie-headless', 'zombie-die', 'zombie-burn', 'flag-walk', 'flag-eat'}
clips = {key: value for key, value in metadata['animations'].items() if mode == 'all' or key in sample_clips}
unique = {}
frame_keys = {}
for name, clip in clips.items():
    keys = []
    for page, x, y, width, height, left, top in clip['frames']:
        frame = source_pages[page].crop((x, y, x + width, y + height))
        key = hashlib.sha256(f'{width},{height}:'.encode() + frame.tobytes()).hexdigest()
        if key not in unique:
            # Process each frame separately: adjacent atlas poses must not influence inference.
            padded = Image.new('RGBA', (width + 16, height + 16))
            padded.paste(frame, (8, 8))
            padded.save(inputs / f'{key}.png')
            unique[key] = (width, height)
        keys.append(key)
    frame_keys[name] = keys
static_files = sorted(p for p in (source / 'original').glob('*.png') if not p.name.startswith('actors-'))
static_files += [source / 'yard.jpg', source / 'lawn.jpg', source / 'pea.png', source / 'original/night.jpg']
static = []
for index, path in enumerate(static_files):
    im = Image.open(path).convert('RGBA')
    im.save(inputs / f'static-{index:03}.png')
    relative = path.relative_to(source).with_suffix('.png')
    static.append((relative, path, im.size))
print(f'{mode}: {len(clips)} clips, {sum(len(c["frames"]) for c in clips.values())} frames, {len(unique)} unique frames, {len(static)} static images', flush=True)
command = [str(engine), '-i', str(inputs), '-o', str(results), '-n', 'realesr-animevideov3', '-s', '2', '-m', str(models), '-j', '1:1:1', '-f', 'png']
with (work / 'inference.log').open('w') as log:
    subprocess.run(command, stdout=log, stderr=log, check=True)

# Atlas metadata stays in logical pixels; Pixi loads textures at resolution=2.
pages, shelves, placements = [], [], {}
for key, (width, height) in sorted(unique.items(), key=lambda item: -item[1][1]):
    shelf = next((s for s in shelves if s['height'] >= height and s['x'] + width + 4 <= 2048), None)
    if shelf is None:
        bottom = shelves[-1]['y'] + shelves[-1]['height'] + 4 if shelves else 0
        if not pages or bottom + height + 4 > 2048:
            pages.append(Image.new('RGBA', (4096, 4096)))
            bottom = 0
        shelf = {'page': len(pages) - 1, 'x': 0, 'y': bottom, 'height': height}
        shelves.append(shelf)
    upscaled = Image.open(results / f'{key}.png').convert('RGBA')
    image = upscaled.crop((16, 16, 16 + width * 2, 16 + height * 2))
    pages[shelf['page']].paste(image, (shelf['x'] * 2, shelf['y'] * 2))
    placements[key] = [shelf['page'], shelf['x'], shelf['y']]
    shelf['x'] += width + 4
for name, clip in clips.items():
    clip['frames'] = [placements[key] + frame[3:] for key, frame in zip(frame_keys[name], clip['frames'])]
for index, page in enumerate(pages):
    page.save(output / f'original/actors-{index}.png', optimize=True)
(output / 'original/animations.json').write_text(json.dumps({'pages': len(pages), 'animations': clips}, separators=(',', ':')))
for index, (relative, path, size) in enumerate(static):
    Image.open(results / f'static-{index:03}.png').save(output / relative, optimize=True)
manifest = {
    'scale': 2, 'model': 'realesr-animevideov3-x2', 'mode': mode,
    'engineSource': 'https://github.com/xinntao/Real-ESRGAN/releases/tag/v0.2.5.0',
    'engineSha256': hashlib.sha256(engine.read_bytes()).hexdigest(),
    'modelSha256': hashlib.sha256((models / 'realesr-animevideov3-x2.bin').read_bytes()).hexdigest(),
    'sourceAnimationSha256': hashlib.sha256((source / 'original/animations.json').read_bytes()).hexdigest(),
    'sourceAtlasSha256': [hashlib.sha256((source / f'original/actors-{i}.png').read_bytes()).hexdigest() for i in range(metadata['pages'])],
    'staticSources': {str(relative): {'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'size': list(size)} for relative, path, size in static},
    'frames': sum(len(clip['frames']) for clip in clips.values()), 'uniqueFrames': len(unique),
    'atlasPages': len(pages), 'atlasBaseRgbaMiB': len(pages) * 64,
    'outputBytes': sum(p.stat().st_size for p in output.rglob('*.png')),
}
(output / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
print(json.dumps({k: manifest[k] for k in ['frames', 'uniqueFrames', 'atlasPages', 'atlasBaseRgbaMiB', 'outputBytes']}), flush=True)
