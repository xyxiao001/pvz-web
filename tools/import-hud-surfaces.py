"""Build resizable original HUD surfaces, keeping source art (no redrawn panels)."""
from pathlib import Path
from PIL import Image
import hashlib,json,sys
root=Path(__file__).resolve().parents[1];source=Path(sys.argv[1])/'images';out=root/'public/assets/runtime/ui';sources={}
def read(n):
 p=source/n;sources[n]=hashlib.sha256(p.read_bytes()).hexdigest();return Image.open(p).convert('RGBA')
# Nine original dialog slices, center stretched independently from the corners.
sheet=Image.new('RGBA',(360,320))
xs=[0,107,240];ys=[0,97,206];ws=[107,133,120];hs=[97,109,114]
for r,row in enumerate(['top','center','bottom']):
 for c,col in enumerate(['left','middle','right']):
  im=read(f'dialog_{row}{col}.png').resize((ws[c],hs[r]),Image.Resampling.LANCZOS);sheet.paste(im,(xs[c],ys[r]))
sheet.save(out/'stone-panel.webp',lossless=True,method=6,exact=True)
for n,target in [('options_checkbox0.png','checkbox-off'),('options_checkbox1.png','checkbox-on'),('Challenge_Window.png','challenge-window'),('Almanac_PlantCard.png','almanac-card'),('SeedChooser_Button2.png','parchment-button'),('Challenge_Background.jpg','challenge-background')]:
 im=read(n);im.save(out/(target+'.webp'),lossless=not n.endswith('.jpg'),quality=94,method=6,exact=True)
(root/'docs/hud-surfaces.json').write_text(json.dumps(sources,indent=2)+'\n')
