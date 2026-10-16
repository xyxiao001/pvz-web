"""Encode reviewed native-rig zombie portraits from committed PNG masters.
Regenerate masters with portrait-export.html and import-portraits.py.
The reviewed baked imp portrait remains unchanged.
"""
import json
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1]
entries = json.loads((root / 'docs/portrait-assets.json').read_text())['files']
portraits = [entry for entry in entries if entry['file'].startswith('almanac/') or entry['file'] == 'original/yeti.webp']
for entry in portraits:
    Image.open(root / entry['master']).save(root / 'public/assets/runtime' / entry['file'], quality=97, method=6, exact=True)
print(f'{len(portraits)} native-rig portraits encoded at Q97 with lossless alpha')
