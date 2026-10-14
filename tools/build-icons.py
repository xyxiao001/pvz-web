"""Export installation and HTML icon sizes from the generated master image."""
from pathlib import Path
from PIL import Image
root = Path(__file__).resolve().parents[1] / 'public/icons'
master = Image.open(root / 'icon-master.png').convert('RGB')
for size in [16, 32, 180, 192, 512]:
    name = 'apple-touch-icon.png' if size == 180 else f'icon-{size}.png'
    master.resize((size, size), Image.Resampling.LANCZOS).save(root / name)
master.save(root / 'favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
# Maskable icons keep the whole illustration inside the central safe circle.
mask = Image.new('RGB', (512, 512), '#164522')
mask.paste(master.resize((320, 320), Image.Resampling.LANCZOS), (96, 96))
mask.save(root / 'maskable-512.png')
