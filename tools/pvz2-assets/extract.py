"""Extract the first playable PVZ2 slice from one pinned Gardendless build.

Run: python3 tools/pvz2-assets/extract.py
Requires Pillow. Downloads are cached in ignored artifacts/, never in PVZ1 assets.
"""
import hashlib
import io
import json
from pathlib import Path
from urllib.request import urlopen

from PIL import Image

COMMIT = '0e4a05348b6de328e2902a57afa24a3a454a4205'
BASE = f'https://raw.githubusercontent.com/Gzh0821/pvzge_web/{COMMIT}/'
ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / 'artifacts/pvz2-source' / COMMIT
OUT = ROOT / 'apps/pvz2/public/assets'
ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
SOURCES = {}


def download(path):
    file = CACHE / path
    if not file.exists():
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(urlopen(BASE + path, timeout=60).read())
    data = file.read_bytes()
    SOURCES[path] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    return data


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')


def decode_uuid(value):
    parts = value.split('@')
    value = parts[0]
    if len(value) == 22:
        hex_value = value[:2] + ''.join(
            f'{ALPHABET.index(value[i]) * 64 + ALPHABET.index(value[i + 1]):03x}'
            for i in range(2, 22, 2))
        value = '-'.join([hex_value[:8], hex_value[8:12], hex_value[12:16],
                          hex_value[16:20], hex_value[20:]])
    return value + ('@' + parts[1] if len(parts) > 1 else '')


config = json.loads(download('docs/assets/resources/config.json'))
uuid_index = {decode_uuid(u): i for i, u in enumerate(config['uuids'])}
path_index = {v[0]: int(i) for i, v in config['paths'].items()}
pack_index = {i: p for p, ids in config['packs'].items() for i in ids}


def asset(index):
    uuid = decode_uuid(config['uuids'][index])
    name = pack_index[index] if index in pack_index else uuid
    data = json.loads(download(f'docs/assets/resources/import/{name[:2]}/{name}.json'))
    # Cocos compiled serialization: a pack has shared tables and one record per UUID.
    record = data[5][config['packs'][name].index(index)] if index in pack_index else data[5:]
    return data, record


def strings(value):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for item in value:
            yield from strings(item)


def embedded(record, key):
    return next(obj for text in strings(record) if text.startswith('{')
                for obj in [json.loads(text)] if key in obj)


def native(uuid, extension):
    uuid = decode_uuid(uuid).split('@')[0]
    return download(f'docs/assets/resources/native/{uuid[:2]}/{uuid}.{extension}')


def export_rig(name, path):
    data, record = asset(path_index[path])
    # The selected prefabs explicitly reference skeleton and atlas as their first two deps.
    sk_data, sk_record = asset(uuid_index[decode_uuid(data[1][0])])
    at_data, at_record = asset(uuid_index[decode_uuid(data[1][1])])
    skeleton = embedded(sk_record, 'armature')
    atlas = embedded(at_record, 'SubTexture')
    texture_id = at_data[1][at_record[-1][0]]
    pixels = Image.open(io.BytesIO(native(texture_id, 'png'))).convert('RGBA')
    target = OUT / 'actors' / name
    target.mkdir(parents=True, exist_ok=True)
    pixels.save(target / 'texture.webp', quality=90, method=6)
    atlas['imagePath'] = 'texture.webp'
    write_json(target / 'skeleton.json', skeleton)
    write_json(target / 'atlas.json', atlas)
    print(name, [a['name'] for a in skeleton['armature']], flush=True)
    return skeleton, atlas, pixels


for name, path in [
    ('peashooter', 'plants/PeashooterPLANT'), ('sunflower', 'plants/SunflowerPLANT'),
    ('wallnut', 'plants/WallnutPLANT'), ('potatomine', 'plants/PotatoMinePLANT'),
    ('mummy', 'zombies/EgyptBasicZOMBIE'), ('ra', 'zombies/EgyptRaZOMBIE'),
]:
    export_rig(name, path)

# The lawn pack keeps its DragonBones data inline. Export only its static lawn image.
lawn_data, _ = asset(path_index['lawns/EgyptLAWN'])
lawn_atlas = embedded(lawn_data[5], 'SubTexture')
texture_id = next(u for u in lawn_data[1] if u.endswith('@6c48a'))
pixels = Image.open(io.BytesIO(native(texture_id, 'png')))
rect = next(t for t in lawn_atlas['SubTexture'] if t['name'] == 'Lawn')
lawn = pixels.crop((rect['x'], rect['y'], rect['x'] + rect['width'], rect['y'] + rect['height']))
(OUT / 'egypt').mkdir(parents=True, exist_ok=True)
lawn.resize((1974, 768), Image.Resampling.LANCZOS).save(OUT / 'egypt/lawn.webp', quality=88, method=6)
# A small, separate menu preview; entering the menu never loads gameplay assets.
lawn.resize((790, 307), Image.Resampling.LANCZOS).save(OUT / 'egypt/preview.webp', quality=80, method=6)


def json_asset(path):
    _, record = asset(path_index[path])
    return record[0][0][2]


def properties(path, names):
    data = json_asset(path)
    return {name: next(o['objdata'] for o in data['objects'] if name in o.get('aliases', []))
            for name in names}


level = json_asset('levels/egypt1')
write_json(OUT / 'levels/egypt1.source.json', level)
write_json(OUT / 'levels/properties.json', {
    'plants': properties('json/Objects/PlantProps', ['peashooter', 'sunflower', 'wallnut', 'potatomine']),
    'zombies': properties('json/Objects/ZombieProps', ['mummy', 'mummy_armor1', 'ra']),
    'armors': properties('json/Objects/ArmorProps', ['egypt_armor1']),
})

music_id = config['uuids'][path_index['music/inGame/egypt/P1_LP_Egypt']]
(OUT / 'egypt/music.mp3').write_bytes(native(music_id, 'mp3'))
license_data = download('LICENSE')
(ROOT / 'apps/pvz2/UPSTREAM-LICENSE').write_bytes(license_data)
write_json(ROOT / 'apps/pvz2/asset-provenance.json', {
    'repository': 'https://github.com/Gzh0821/pvzge_web', 'commit': COMMIT,
    'transformations': ['Cocos UUID and pack extraction', 'PNG to WebP', 'Static lawn resize'],
    'sources': SOURCES,
    'outputs': {str(p.relative_to(OUT)): {'bytes': p.stat().st_size,
                'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}
                for p in sorted(OUT.rglob('*')) if p.is_file()},
})
print('Extracted assets:', sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file()), 'bytes')
