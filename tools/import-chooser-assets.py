"""Losslessly encode the pinned original chooser HUD; usage: python3 tools/import-chooser-assets.py RUSLAN_REPO."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
from PIL import Image

repo = Path(sys.argv[1])
root = Path(__file__).resolve().parents[1]
output = root / 'public/assets/runtime/ui'
output.mkdir(parents=True, exist_ok=True)
files = {}
for source, name in [('SeedChooser_Background.png', 'seed-chooser'), ('SeedChooser_Button.png', 'seed-start'), ('SeedChooser_Button_Disabled.png', 'seed-start-disabled'), ('SeedPacketSilhouette.png', 'seed-silhouette')]:
    path = repo / 'images' / source
    image = Image.open(path)
    image.save(output / f'{name}.webp', lossless=True, exact=True, method=6)
    files[f'{name}.webp'] = {'source': f'images/{source}', 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'size': list(image.size)}
(root / 'docs/chooser-assets.json').write_text(json.dumps({'repository': 'https://github.com/ruslan831/PlantsVsZombies-decompilation', 'commit': subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip(), 'encoding': 'lossless WebP, original dimensions', 'files': files}, indent=2) + '\n')
