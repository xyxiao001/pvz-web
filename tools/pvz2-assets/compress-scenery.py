"""Compress PVZ2 scenery from pinned PNG masters, keeping image geometry and alpha.

Run with Python + Pillow, numpy and scikit-image. Without --apply, candidates and
the audit go to artifacts/pvz2-scenery-compression. --apply also replaces images,
updates their provenance hashes and saves apps/pvz2/scenery-compression.json.
Text, cards, controls, characters and mixed UI atlases are deliberately excluded.
"""
from concurrent.futures import ThreadPoolExecutor
import hashlib
import io
import json
from pathlib import Path
import sys

import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity
import cocos as c

ARTIFACTS = c.ROOT / 'artifacts/pvz2-scenery-compression'
APPLY = '--apply' in sys.argv
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
}
BACKGROUND_SPRITES = {
    'shell/ui/c118ee76-c9ad-4762-ad34-f8d2a9a66bec_f9941.webp',
    'outer/ui/136824b0-14ad-4f99-b368-796504aee6fd_f9941.webp',
}


def walk(value):
    yield value
    if isinstance(value, dict):
        for child in value.values():
            yield from walk(child)
    elif isinstance(value, list):
        for child in value:
            yield from walk(child)


def pixels(texture):
    return Image.open(io.BytesIO(c.native(texture, 'png'))).convert('RGBA')


def crop(image, rect):
    return image.crop((rect['x'], rect['y'], rect['x'] + rect['width'], rect['y'] + rect['height']))


def master(path, category):
    relative = path.relative_to(c.OUT).as_posix()
    if category == 'lawn':
        prefab, name = LAWNS[relative]
        asset = c.Asset('lawns/' + prefab)
        display = next(v for v in walk(asset.objects) if isinstance(v, dict) and v.get('type') == 'dragonBones.ArmatureDisplay')
        atlas_asset = c.Asset(display['_dragonAtlasAsset']['asset'])
        atlas = json.loads(atlas_asset.objects[0]['_atlasJson'])
        rect = next(r for r in atlas['SubTexture'] if r['name'] == name)
        return crop(pixels(atlas_asset.data[1][atlas_asset.rec[5][0]]), rect), []
    if category == 'background-sprite':
        data, record = c.asset(c.uuid_index[path.stem.replace('_', '@')])
        frame = record[0][0]
        assert not frame['rotated'], relative
        return crop(pixels(data[1][record[5][0]]), frame['rect']), []
    # Skeleton and atlas share a compiled source pack. Match the exact atlas
    # rectangles, then resolve that atlas record's native PNG dependency.
    atlas = json.loads(path.with_name('atlas.json').read_text())
    data = c.Asset(path.parent.name).data
    records = data[5] if len(data) == 6 else [data[5:]]
    matches = [(record, json.loads(v)) for record in records for v in walk(record)
               if isinstance(v, str) and v.startswith('{') and '"SubTexture"' in v
               and json.loads(v).get('SubTexture') == atlas['SubTexture']]
    assert len(matches) == 1, relative
    record, original_atlas = matches[0]
    image = pixels(data[1][record[5][0]])
    return image, sorted(original_atlas['SubTexture'], key=lambda r: r['width'] * r['height'], reverse=True)[:6]


def similarity(reference, candidate, rectangles):
    # Score whole art plus the largest atlas pieces separately: empty atlas
    # padding must not hide degradation. Compare at the game's roughly 0.5 scale.
    regions = [(reference, candidate)]
    regions.extend((crop(reference, r), crop(candidate, r)) for r in rectangles if min(r['width'], r['height']) >= 32)
    scores = []
    for before, after in regions:
        size = (max(8, before.width // 2), max(8, before.height // 2))
        for color in ('#15232d', '#ede1bd'):
            bg = Image.new('RGBA', before.size, color)
            a = Image.alpha_composite(bg, before).convert('RGB').resize(size, Image.Resampling.LANCZOS)
            b = Image.alpha_composite(bg, after).convert('RGB').resize(size, Image.Resampling.LANCZOS)
            scores.append(float(structural_similarity(np.asarray(a), np.asarray(b), channel_axis=2, data_range=255)))
    return min(scores)


def optimize(item):
    path, category = item
    relative = path.relative_to(c.OUT).as_posix()
    original = path.read_bytes()
    reference = Image.open(io.BytesIO(original)).convert('RGBA')
    source, rectangles = master(path, category)
    assert source.size == reference.size, relative
    assert source.getchannel('A').tobytes() == reference.getchannel('A').tobytes(), relative
    chosen, quality, score = original, None, 1.
    # Loading backdrops and live scenery retain full dimensions. Choose the
    # smallest qualifying encode; all encodes originate from the same PNG.
    qualities = (80, 85, 90) if category == 'lawn' and not relative.startswith(('egypt/', 'campaign/')) else (85, 90)
    for q in qualities:
        buffer = io.BytesIO()
        source.save(buffer, format='WEBP', quality=q, method=6, exact=True)
        encoded = buffer.getvalue()
        if len(encoded) >= len(chosen):
            continue
        decoded = Image.open(io.BytesIO(encoded)).convert('RGBA')
        assert decoded.size == reference.size and decoded.getchannel('A').tobytes() == reference.getchannel('A').tobytes(), relative
        metric = similarity(source, decoded, rectangles)
        if metric >= .98:
            chosen, quality, score = encoded, q, metric
            break
    if chosen != original:
        for folder, contents in [('before', original), ('after', chosen)]:
            target = ARTIFACTS / folder / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(contents)
        if APPLY:
            path.write_bytes(chosen)
    result = {'file': relative, 'category': category, 'width': reference.width, 'height': reference.height,
              'before': len(original), 'after': len(chosen), 'quality': quality,
              'sourceDisplayScaleSsim': round(score, 6) if quality is not None else None,
              'alphaSha256': hashlib.sha256(reference.getchannel('A').tobytes()).hexdigest(),
              'sha256': hashlib.sha256(chosen).hexdigest()}
    print(relative, len(original), '->', len(chosen), 'q', quality, flush=True)
    return result


def main():
    images = [p for p in c.OUT.rglob('*') if p.suffix.lower() in ('.webp', '.png', '.jpg', '.jpeg')]
    total_before = sum(p.stat().st_size for p in images)
    selected = [(c.OUT / name, 'lawn') for name in LAWNS]
    selected += [(c.OUT / name, 'background-sprite') for name in sorted(BACKGROUND_SPRITES)]
    for path in sorted(c.OUT.rglob('texture.webp')):
        names = {a['name'] for a in json.loads(path.with_name('skeleton.json').read_text())['armature']}
        category = None
        if names & {'Lawn', 'LawnNight'}:
            category = 'lawn-atlas'
        elif 'PlayerHouse' in names:
            category = 'world-map'
        elif names in ({'BG'}, {'GardenBG'}, {'Lower', 'Upper', 'FireFlies'}):
            category = 'background-atlas'
        elif path.parent.name == 'bd09174c-adbd-4254-97f4-793e917b0f6b':
            category = 'world-chooser'
        if category:
            selected.append((path, category))
    with ThreadPoolExecutor(max_workers=2) as pool:
        report = list(pool.map(optimize, selected))
    changed = {r['file']: r for r in report if r['after'] < r['before']}
    saved = sum(r['before'] - r['after'] for r in report)
    summary = {'sourceCommit': c.COMMIT, 'imagesAudited': len(images), 'candidates': len(selected),
               'changed': len(changed), 'totalBefore': total_before, 'totalAfter': total_before - saved,
               'bytesSaved': saved, 'minimumSourceDisplayScaleSsim': .98,
               'protected': 'Text, letter artwork, cards, controls, characters and mixed UI atlases',
               'files': report}
    ARTIFACTS.mkdir(parents=True, exist_ok=True)
    (ARTIFACTS / 'report.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
    if APPLY:
        for path in (c.ROOT / 'apps/pvz2').glob('*provenance.json'):
            manifest = json.loads(path.read_text())
            affected = set(manifest['outputs']) & changed.keys()
            if affected:
                for name in affected:
                    manifest['outputs'][name] = {'bytes': changed[name]['after'], 'sha256': changed[name]['sha256']}
                c.write_json(path, manifest)
        (c.ROOT / 'apps/pvz2/scenery-compression.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: v for k, v in summary.items() if k != 'files'}), flush=True)


if __name__ == '__main__':
    main()
