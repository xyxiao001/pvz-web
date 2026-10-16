"""Import the reviewed output downloaded from tools/portrait-export.html.

Usage: python3 tools/import-portraits.py /path/to/portraits.json
Then run: python3 tools/build-display-hd.py --encode-only
PNG masters are authoring-only. Runtime files use Q97 WebP with lossless alpha.
"""
import base64
import hashlib
import json
from pathlib import Path
import sys
from PIL import Image

root = Path(__file__).resolve().parents[1]
entries = json.loads(Path(sys.argv[1]).read_text())
targets = json.loads((root / 'tools/display-hd-targets.json').read_text())
report = []
for entry in entries:
    relative = Path(entry['file'])
    master = root / 'public/assets/portraits' / relative.with_suffix('.png')
    master.parent.mkdir(parents=True, exist_ok=True)
    master.write_bytes(base64.b64decode(entry['png'].split(',')[1]))
    path = root / 'public/assets/runtime' / relative
    Image.open(master).save(path, quality=97, method=6, exact=True)
    if relative.parts[0] == 'hd4':
        target = next(t for t in targets if t['file'] == relative.relative_to('hd4').as_posix())
        targets[targets.index(target)] = {
            'file': target['file'], 'source': master.relative_to(root).as_posix(),
            'role': target['role'], 'rendered': True,
        }
    sources = {f'public/assets/runtime/{p}': hashlib.sha256((root / 'public/assets/runtime' / p).read_bytes()).hexdigest() for p in entry['sources']}
    report.append({k: v for k, v in entry.items() if k != 'png'} | {
        'sources': sources, 'master': master.relative_to(root).as_posix(),
        'masterSha256': hashlib.sha256(master.read_bytes()).hexdigest(),
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'bytes':path.stat().st_size,
    })
(root / 'tools/display-hd-targets.json').write_text(json.dumps(targets, indent=2) + '\n')
(root / 'docs/portrait-assets.json').write_text(json.dumps({
    'rendering':'Existing Pixi rigs at tick 0, 4 pixels per logical unit; original 2x parts; Q97 WebP with lossless alpha',
    'files':report,
}, indent=2) + '\n')
print(f'Imported {len(report)} portraits, {sum(item["bytes"] for item in report):,} runtime bytes')
