"""Build switchable PVZ2 texture packs from the pinned original PNGs.

python3 tools/pvz2-assets/build-quality-packs.py
Requires Pillow and the repository's Real-ESRGAN ncnn executable/model.
Existing light textures, animation data and gameplay coordinates are untouched.
"""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import io
import json
from pathlib import Path
import subprocess
import threading

from PIL import Image
import cocos as c

WORK = c.ROOT / 'artifacts/pvz2-quality'
OUT = c.OUT / 'quality'
ENGINE = c.ROOT / 'artifacts/hd-work/runtime/realesrgan-ncnn-vulkan'
MODEL = ENGINE.parent / 'models/realesr-animevideov3-x2.bin'
GPU = threading.Semaphore(1)
LAWNS = {
    'egypt/lawn.webp': ('EgyptLAWN', 'Lawn'),
    'campaign/night.webp': ('EgyptNightLAWN', 'Lawn_Night'),
    'pirate/lawn.webp': ('PirateLAWN', 'Lawn'),
    'cowboy/lawn.webp': ('CowboyLAWN', 'Lawn'),
    'future/lawn.webp': ('FutureLAWN', 'Lawn'),
    'future/lawn-night.webp': ('FutureNightLAWN', 'LawnNight'),
    'dark/lawn.webp': ('DarkLAWN', 'Lawn'),
    'beach/lawn.webp': ('BeachLAWN', 'Lawn'),
    'iceage/lawn.webp': ('IceageLAWN', 'Lawn'),
    'lostcity/lawn.webp': ('LostCityLAWN', 'Lawn'),
    'lostcity/lawn-night.webp': ('LostCityNightLAWN', 'LawnNight'),
    'kongfu/lawn.webp': ('KongfuLAWN', 'mid'),
    'eighties/lawn.webp': ('EightiesLAWN', 'Lawn'),
    'dino/lawn.webp': ('DinoLAWN', 'Lawn'),
}


def walk(value):
    yield value
    if isinstance(value, dict):
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def signature(atlas):
    return json.dumps(atlas['SubTexture'], sort_keys=True)


def source_atlases():
    """Resolve the same compiled records as the existing Cocos importers."""
    indexed = {}
    for path in (c.CACHE / 'docs/assets/resources/import').rglob('*.json'):
        data = json.loads(path.read_text())
        if not isinstance(data, list) or len(data) < 6:
            continue
        records = data[5] if len(data) == 6 else [data[5:]]
        for record in records:
            for value in walk(record):
                if isinstance(value, str) and value.startswith('{') and '"SubTexture"' in value:
                    atlas = json.loads(value)
                    if 'SubTexture' in atlas:
                        indexed[signature(atlas)] = {'native': data[1][record[5][0]], 'atlas': atlas}
    return indexed


def native_image(native):
    return Image.open(io.BytesIO(c.native(native, 'png'))).convert('RGBA')


def rectangle(image, rect):
    return image.crop((rect['x'], rect['y'], rect['x'] + rect['width'], rect['y'] + rect['height']))


def sources():
    indexed = source_atlases()
    for path in sorted(c.OUT.rglob('texture.webp')):
        relative = path.relative_to(c.OUT).as_posix()
        atlas = json.loads(path.with_name('atlas.json').read_text())
        if relative == 'beach/rigs/2b09d193-b39b-4390-98ed-8cbaf29a48d0/texture.webp':
            # The existing importer adds two tide splash pieces to the shark.
            base = next(v for v in indexed.values() if v['atlas']['SubTexture'] == atlas['SubTexture'][:-2])
            tide_atlas = json.loads((c.OUT / 'beach/rigs/28fcbad6-752c-4b2e-9927-5d49c000da40/atlas.json').read_text())
            tide = indexed[signature(tide_atlas)]
            image = Image.new('RGBA', (atlas['width'], atlas['height']))
            image.paste(native_image(base['native']), (0, 0))
            water = native_image(tide['native'])
            for target in atlas['SubTexture'][-2:]:
                original = next(r for r in tide['atlas']['SubTexture'] if r['name'] == target['name'])
                image.paste(rectangle(water, original), (target['x'], target['y']))
            origin = [base['native'], tide['native']]
        else:
            source = indexed[signature(atlas)]
            image = native_image(source['native'])
            origin = [source['native']]
        assert image.size == Image.open(path).size, relative
        yield relative, image, origin
    for name, (prefab, part) in LAWNS.items():
        asset = c.Asset('lawns/' + prefab)
        display = next(v for v in walk(asset.objects) if isinstance(v, dict) and v.get('type') == 'dragonBones.ArmatureDisplay')
        source = c.Asset(display['_dragonAtlasAsset']['asset'])
        atlas = json.loads(source.objects[0]['_atlasJson'])
        native = source.data[1][source.rec[5][0]]
        rect = next(r for r in atlas['SubTexture'] if r['name'] == part)
        image = rectangle(native_image(native), rect)
        assert image.size == Image.open(c.OUT / name).size, name
        yield name, image, [native]


def build(item):
    key, spec = item
    source = WORK / 'source' / (key + '.png')
    original = OUT / 'original' / (key + '.webp')
    enhanced = OUT / 'enhanced' / (key + '.webp')
    image = Image.open(source).convert('RGBA')
    if not original.exists():
        image.save(original, lossless=True, method=4, exact=True)
    result = WORK / 'enhanced' / (key + '.png')
    if not enhanced.exists():
        if not result.exists():
            with GPU, (WORK / 'logs' / (key + '.log')).open('w') as log:
                subprocess.run([str(ENGINE), '-i', str(source), '-o', str(result), '-m', str(MODEL.parent),
                                '-n', 'realesr-animevideov3', '-s', '2', '-t', '128', '-j', '1:1:1', '-f', 'png'],
                               stdout=log, stderr=log, check=True)
        hd = Image.open(result).convert('RGBA')
        assert hd.size == (image.width * 2, image.height * 2)
        # Alpha stays aligned to the original atlas; the network only supplies RGB.
        hd.putalpha(image.getchannel('A').resize(hd.size, Image.Resampling.LANCZOS))
        hd.save(enhanced, lossless=True, method=4, exact=True)
    assert Image.open(original).convert('RGBA').tobytes() == image.tobytes()
    print(key, spec['width'], spec['height'], original.stat().st_size, enhanced.stat().st_size, flush=True)
    return key, {**spec, 'originalBytes': original.stat().st_size, 'enhancedBytes': enhanced.stat().st_size,
                 'originalSha256': hashlib.sha256(original.read_bytes()).hexdigest(),
                 'enhancedSha256': hashlib.sha256(enhanced.read_bytes()).hexdigest()}


def main():
    for path in [WORK / 'source', WORK / 'enhanced', WORK / 'logs', OUT / 'original', OUT / 'enhanced']:
        path.mkdir(parents=True, exist_ok=True)
    model_hash = hashlib.sha256(MODEL.read_bytes()).hexdigest()
    assets, unique = {}, {}
    for name, image, origin in sources():
        digest = hashlib.sha256(image.tobytes()).hexdigest()
        key = hashlib.sha256(f'{digest}:{image.size}:{model_hash}:alpha-lanczos-v1'.encode()).hexdigest()[:24]
        assets[name] = {'original': f'quality/original/{key}.webp', 'enhanced': f'quality/enhanced/{key}.webp'}
        if key not in unique:
            source = WORK / 'source' / (key + '.png')
            if not source.exists():
                image.save(source)
            unique[key] = {'width': image.width, 'height': image.height, 'sourcePixelSha256': digest, 'native': origin}
    print(f'{len(assets)} game textures, {len(unique)} unique source images', flush=True)
    (WORK / 'assets.json').write_text(json.dumps(assets, indent=2) + '\n')
    with ThreadPoolExecutor(max_workers=2) as executor:
        records = dict(executor.map(build, unique.items()))
    (c.ROOT / 'apps/pvz2/src/assets/quality-manifest.json').write_text(json.dumps(assets, indent=2) + '\n')
    provenance = {'sourceCommit': c.COMMIT, 'sourceRepository': 'https://github.com/Gzh0821/pvzge_web',
                  'engine': 'Real-ESRGAN ncnn', 'model': 'realesr-animevideov3-x2', 'modelSha256': model_hash,
                  'engineSha256': hashlib.sha256(ENGINE.read_bytes()).hexdigest(),
                  'modelParamSha256': hashlib.sha256(MODEL.with_suffix('.param').read_bytes()).hexdigest(),
                  'scale': 2, 'alpha': 'original alpha resized with Lanczos', 'encoding': 'lossless WebP',
                  'assets': assets, 'images': records}
    (c.ROOT / 'apps/pvz2/quality-provenance.json').write_text(json.dumps(provenance, indent=2) + '\n')


if __name__ == '__main__':
    main()
