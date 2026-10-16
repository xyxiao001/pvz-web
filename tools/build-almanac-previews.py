"""Export static almanac portraits from the shipped animation atlas frames."""
import json
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1] / 'public/assets/runtime'
clips = json.loads((root / 'animations.json').read_text())['animations']
out = root / 'almanac'
out.mkdir(exist_ok=True)
poses = {
    'normal':'zombie-walk', 'flag':'flag-walk', 'cone':'cone-walk', 'pole':'pole-run',
    'bucket':'bucket-walk', 'newspaper':'newspaper-walk', 'door':'door-walk',
    'football':'football-walk', 'dancer':'dancer-walk', 'backup':'backup-walk',
    'ducky':'ducky1-walk', 'snorkel':'snorkel-walk', 'zomboni':'zomboni-walk',
    'bobsled':'bobsled-walk', 'dolphin':'dolphin-walk', 'jack':'jack-walk',
    'balloon':'balloon-fly', 'digger':'digger-walk', 'pogo':'pogo-bounce',
    'bungee':'bungee-idle', 'ladder':'ladder-walk', 'catapult':'catapult-walk',
    'gargantuar':'gargantuar-walk', 'imp':'imp-walk',
}
for kind, pose in poses.items():
    clip = clips[pose]
    page, x, y, width, height, *_ = clip['frames'][0]
    atlas = Image.open(root / clip['pages'][page]).convert('RGBA')
    portrait = atlas.crop((x*2, y*2, (x+width)*2, (y+height)*2))
    portrait.thumbnail((320, 360), Image.Resampling.LANCZOS)
    portrait.save(out / f'{kind}.webp', quality=95, method=6, exact=True)
print(f'{len(poses)} portraits, {sum(p.stat().st_size for p in out.glob("*.webp")):,} bytes')
