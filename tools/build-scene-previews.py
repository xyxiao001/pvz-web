"""Small scene-picker images. Full 2x battle backgrounds remain unchanged."""
from pathlib import Path
from PIL import Image
import json
root = Path(__file__).resolve().parents[1] / 'public/assets/runtime'
out = root / 'previews'
out.mkdir(exist_ok=True)
report = []
for scene in ['day','night','pool','fog','roof']:
    source = root / 'original' / ('menu.webp' if scene == 'day' else scene+'.webp')
    image = Image.open(source)
    image.thumbnail((800,800), Image.Resampling.LANCZOS)
    target = out / (scene+'.webp')
    image.save(target, lossless=True, quality=90, method=6, exact=True)
    report.append({'scene':scene,'sourceBytes':source.stat().st_size,'previewBytes':target.stat().st_size,'size':image.size})
print(json.dumps(report,indent=2))
