"""Extract adventure dialogue and shop HUD from the pinned source resources.
Usage: python3 tools/import-campaign-assets.py RUSLAN_REPO
"""
import hashlib, importlib.util, json, re, sys, shutil
from pathlib import Path
from PIL import Image
repo=Path(sys.argv[1]);root=Path(__file__).resolve().parents[1]
out=root/'public/assets/runtime/original';sources={}
def record(p):sources[str(p.relative_to(repo))]=hashlib.sha256(p.read_bytes()).hexdigest()
english=repo/'SexyAppFramework/DebugVS2005/properties/LawnStrings.txt'
chinese=repo/'SexyAppFramework/properties/LawnStrings.txt'
record(english);record(chinese)
def parse(p,enc):return dict(re.findall(r'\[([^\]]+)\]\s*([^[]*)',p.read_text(enc)))
en=parse(english,'utf-8-sig');zh=parse(chinese,'gb18030')
starts=[201,301,401,501,701,801,1101,1201,1304,1401,1501,1510,1520,1551,1560,1570,1601,2300,2400,2410,2500,2700,2800,601]
lines={}
for n in starts:
 while 'CRAZY_DAVE_'+str(n) in en:
  key='CRAZY_DAVE_'+str(n);lines[str(n)]={'text':re.sub(r'\{(?!PLAYER_NAME|MONEY|UPGRADE_COST)[^}]*\}','',zh[key]).replace('\n','').strip(),'original':en[key].strip()};n+=1
# This mirror's Chinese taco/decline lines were modified; translate the canonical English lines.
translations={601:'你找到了我的魔法玉米卷！',602:'我一定要得到它！我出 $1000！',603:'太好了！玉米卷归我啦！',604:'为什么我要花这么多钱买一个玉米卷？',605:'因为我疯——狂——啊！',606:'看看我的小店吧！我又进了一些新货！',1520:'真扫兴啊，邻居！',1570:'真扫兴啊，邻居！'}
for n,text in translations.items():lines[str(n)]['text']=text
(root/'src/game/data/adventure-dialogue.json').write_text(json.dumps(lines,ensure_ascii=False,indent=2)+'\n')
for source,name in [('Store_Background.jpg','shop-background'),('Store_SpeechBubble.png','dave-bubble'),('Store_PacketUpgrade.png','shop-slots'),('Store_FirstAidWallnutIcon.png','shop-firstaid'),('icon_roofcleaner.png','shop-roof')]:
 p=repo/'images'/source;record(p);Image.open(p).save(out/(name+'.webp'),quality=92,method=6)
spec=importlib.util.spec_from_file_location('reanim',root/'tools/reanim-frames.py');mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
p=repo/'SexyAppFramework/reanim'
work=root/'artifacts/campaign-import';work.mkdir(parents=True,exist_ok=True)
for source in p.glob('CrazyDave*'):
 record(source)
 if source.suffix in ['.png','.reanim']:shutil.copyfile(source,work/source.name)
 if source.suffix=='.jpg':
  im=Image.open(source).convert('RGBA');mask=source.with_name(source.stem+'_.png');record(mask);im.putalpha(Image.open(mask).convert('L'));im.save(work/(source.stem+'.png'))
frames=mod.render_clip(work,'CrazyDave','anim_idle',(1000,1200),(500,0),lambda path:None)
Image.open(p/'Diamond.png').resize((Image.open(p/'Diamond.png').width*2,Image.open(p/'Diamond.png').height*2)).save(out/'coin-diamond.webp',lossless=True,method=6);record(p/'Diamond.png')
im=frames[0];im=im.crop(im.getbbox());im.save(out/'crazy-dave.webp',quality=94,method=6)
# Eight original rake poses at 20 fps; fixed origin preserves the ground contact.
frames=mod.render_clip(p,'Rake','Layer 1',(160,140),(70,35),record)
atlas=Image.new('RGBA',(160*2*len(frames),280))
for i,frame in enumerate(frames):atlas.paste(frame.resize((320,280),Image.Resampling.LANCZOS),(i*320,0))
atlas.save(out/'rake.webp',quality=94,method=6)
frames[0].crop(frames[0].getbbox()).save(out/'shop-rake.webp',quality=94,method=6)
frames=mod.render_clip(p,'RoofCleaner','RoofCleaner_body1',(200,180),(50,40),record)
im=frames[0];im=im.crop(im.getbbox());im.resize((im.width*2,im.height*2),Image.Resampling.LANCZOS).save(out/'roof-cleaner.webp',quality=94,method=6)
projectile=p/'CobCannon_cob.png';record(projectile);im=Image.open(projectile);im.resize((im.width*2,im.height*2),Image.Resampling.LANCZOS).save(out/'cannon-projectile.webp',quality=94,method=6)
(root/'docs/campaign-assets.json').write_text(json.dumps(sources,indent=2)+'\n')
