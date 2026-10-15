"""Small scene-picker images. Full 2x battle backgrounds remain unchanged."""
from pathlib import Path
from PIL import Image
import json
import shutil
root = Path(__file__).resolve().parents[1] / 'public/assets/runtime'
out = root / 'previews'
out.mkdir(exist_ok=True)
report = []
for scene in ['day','night','pool','fog','roof']:
    if scene == 'day':
        source = root.parent / 'lawn.jpg'
        target = out / 'day.jpg'
        shutil.copyfile(source, target)
        report.append({'scene':scene,'sourceBytes':source.stat().st_size,'previewBytes':target.stat().st_size,'size':Image.open(source).size})
        continue
    source = root / 'original' / (scene+'.webp')
    image = Image.open(source)
    image.thumbnail((800,800), Image.Resampling.LANCZOS)
    target = out / (scene+'.webp')
    image.save(target, quality=98, method=6, exact=True)
    report.append({'scene':scene,'sourceBytes':source.stat().st_size,'previewBytes':target.stat().st_size,'size':image.size})
print(json.dumps(report,indent=2))
