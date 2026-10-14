"""Pack existing RGBA frames without redrawing them; retain source paths and hashes.

python3 tools/import-assets.py PYTHON_REPO JS_REPO RUSLAN_REPO
Requires Pillow. Runtime assets are committed; players do not need Python or these repos.
"""
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys
import runpy
from PIL import Image, ImageSequence

python_repo, js_repo, ruslan_repo = map(Path, sys.argv[1:])
root = Path(__file__).resolve().parents[1]
output = root / 'public/assets/original'
output.mkdir(parents=True, exist_ok=True)
graphics = python_repo / 'resources/graphics'
sources = {}

def record(path):
    for key, repo in [('python', python_repo), ('javascript', js_repo), ('ruslan', ruslan_repo)]:
        if path.is_relative_to(repo):
            return {'repository': key, 'path': str(path.relative_to(repo)), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()}

def copy(path, name):
    shutil.copyfile(path, output / name)
    sources[name] = record(path)

animations = {
    'zombie-burn': ('Zombies/NormalZombie/BoomDie', 'BoomDie', 12, [107, 144]),
    'sun': ('Plants/Sun', 'Sun', 8, [39, 39]),
}

pages = []
pending_frames = []
data = {}
def pack(images, durations, anchor):
    frames = []
    for image in images:
        bounds = image.getbbox()
        # DuckyTubeZombie1/Die.gif ends with an intentional fully transparent frame.
        # Represent that pose with one transparent texel while retaining its duration.
        left, top, right, bottom = (0, 0, 1, 1) if bounds is None else bounds
        image = image.crop((left, top, right, bottom))
        frame = [0, 0, 0, image.width, image.height, left, top]
        frames.append(frame)
        pending_frames.append((image, frame))
    return {'frames': frames, 'durations': durations, 'anchor': anchor}

def build_atlases():
    # Pack tall frames first and reuse shelf space across clips. More source poses
    # should not require more GPU texture pages just because clips differ in size.
    shelves = []
    for image, frame in sorted(pending_frames, key=lambda item: -item[0].height):
        w, h = image.size
        shelf = next((s for s in shelves if s['height'] >= h and s['x'] + w + 2 <= 2048), None)
        if shelf is None:
            bottom = shelves[-1]['y'] + shelves[-1]['height'] + 2 if shelves else 0
            if not pages or bottom + h + 2 > 2048:
                pages.append(Image.new('RGBA', (2048, 2048)))
                bottom = 0
            shelf = {'page': len(pages) - 1, 'x': 0, 'y': bottom, 'height': h}
            shelves.append(shelf)
        pages[shelf['page']].paste(image, (shelf['x'], shelf['y']))
        frame[:3] = [shelf['page'], shelf['x'], shelf['y']]
        shelf['x'] += w + 2

for key, (directory, prefix, tick, anchor) in animations.items():
    paths = sorted((graphics / directory).glob(prefix + '_*.png'), key=lambda p: int(p.stem.rsplit('_', 1)[1]))
    data[key] = pack([Image.open(path).convert('RGBA') for path in paths], [tick] * len(paths), anchor)
    for path in paths: sources[str(path.relative_to(graphics))] = record(path)
    if key in ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'sun', 'potatomine', 'snowpea']:
        copy(paths[0], key + '.png')

static_path = js_repo / 'images/Plants/PotatoMine/PotatoMineNotReady.gif'
data['potatomine-unarmed'] = pack([Image.open(static_path).convert('RGBA')], [8], [37, 55])
sources['Plants/PotatoMine/PotatoMineNotReady.gif'] = record(static_path)

gifs = {
    'splitpea': ('Plants/SplitPea/SplitPea.gif', [46, 70]),
    'starfruit': ('Plants/Starfruit/Starfruit.gif', [38, 68]),
    'pumpkin': ('Plants/PumpkinHead/PumpkinHead.gif', [48, 55]),
    'pumpkin-cracked1': ('Plants/PumpkinHead/pumpkin_damage1.gif', [48, 55]),
    'pumpkin-cracked2': ('Plants/PumpkinHead/Pumpkin_damage2.gif', [48, 55]),
    'garlic': ('Plants/Garlic/Garlic.gif', [30, 58]),
    'garlic-cracked1': ('Plants/Garlic/Garlic_body2.gif', [30, 58]),
    'garlic-cracked2': ('Plants/Garlic/Garlic_body3.gif', [30, 58]),
    'flowerpot': ('Plants/FlowerPot/FlowerPot.gif', [36, 56]),
    'coffeebean': ('Plants/CoffeeBean/CoffeeBeanEat.gif', [20, 90]),
    'jalapeno': ('Plants/Jalapeno/Jalapeno.gif', [34,89]),
    'jalapeno-fire': ('Plants/Jalapeno/JalapenoAttack.gif', [0,126]),
    'spikeweed': ('Plants/Spikeweed/Spikeweed.gif', [42,35]),
    'torchwood': ('Plants/Torchwood/Torchwood.gif', [36,87]),
    'tallnut': ('Plants/TallNut/TallNut.gif', [42,119]),
    'tallnut-cracked1': ('Plants/TallNut/TallnutCracked1.gif', [42,119]),
    'tallnut-cracked2': ('Plants/TallNut/TallnutCracked2.gif', [42,119]),
    'seashroom': ('Plants/SeaShroom/SeaShroom.gif', [24,90]),
    'cactus': ('Plants/Cactus/Cactus.gif', [45,150]),
    'cactus-tall': ('Plants/Cactus/Cactus2.gif', [45,150]),
    **{f'zomboni-{key}': (f'Zombies/Zomboni/{name}.gif', [210,279]) for key,name in {'walk':'1','damaged':'2','critical':'3','die':'5'}.items()},
    **{f'dolphin-{key}': (f'Zombies/DolphinRiderZombie/{name}.gif', ([65,200] if key in ['swim','eat'] else [150,200] if key=='walk' else [220,200])) for key,name in {'walk':'Walk1','ride':'Walk2','swim':'Walk3','jump':'Jump2','eat':'Attack','die':'Die'}.items()},
    **{f'jack-{key}': (f'Zombies/JackinTheBoxZombie/{name}.gif', [145,173]) for key,name in {'walk':'Walk','eat':'Attack','open':'OpenBox','headless':'LostHead','die':'Die'}.items()},
    **{f'balloon-{key}': (f'Zombies/BalloonZombie/{name}.gif', [58,197]) for key,name in {'fly':'1','walk':'Walk','eat':'Attack','pop':'Drop','die':'Die'}.items()},
    'tanglekelp': ('Plants/TangleKlep/Float.gif', [45,55]),
    'iceshroom': ('Plants/IceShroom/IceShroom.gif', [42,74]),
    'doomshroom': ('Plants/DoomShroom/DoomShroom.gif', [51,90]),
    'lilypad': ('Plants/LilyPad/LilyPad.gif', [40,50]),
    'squash': ('Plants/Squash/Squash.gif', [50,226]),
    'squash-attack': ('Plants/Squash/SquashAttack.gif', [50,226]),
    'threepeater': ('Plants/Threepeater/Threepeater.gif', [37,79]),
    'plantern': ('Plants/Plantern/Plantern.gif', [125,163]),
    **{f'dancer-{key}': (f'Zombies/DancingZombie/{name}.gif', [80,171]) for key,name in {
        'walk':'DancingZombie','eat':'Attack','summon':'Summon1','headless':'LostHead','die':'Die','burn':'BoomDie'}.items()},
    **{f'backup-{key}': (f'Zombies/BackupDancer/{name}.gif', [76,171]) for key,name in {
        'walk':'BackupDancer','eat':'Attack','headless':'LostHead','die':'Die','burn':'BoomDie'}.items()},
    **{f'ducky{index}-{key}': (f'Zombies/DuckyTubeZombie{index}/{name}.gif', [108,140]) for index in [1,2,3] for key,name in {'walk':'Walk1','eat':'Attack'}.items()},
    'ducky-die': ('Zombies/DuckyTubeZombie1/Die.gif',[108,140]),
    **{f'snorkel-{key}': (f'Zombies/SnorkelZombie/{name}.gif', [70,200]) for key,name in {
        'walk':'Walk1','swim':'Walk2','eat':'Attack','die':'Die'}.items()},
    'hypnoshroom': ('Plants/HypnoShroom/HypnoShroom.gif', [34, 76]),
    'scaredyshroom': ('Plants/ScaredyShroom/ScaredyShroom.gif', [28, 81]),
    'scaredyshroom-scared': ('Plants/ScaredyShroom/ScaredyShroomCry.gif', [28, 81]),
    **{f'football-{key}': (f'Zombies/FootballZombie/{name}.gif', [87, 160]) for key, name in {
        'walk': 'FootballZombie', 'eat': 'Attack', 'bare-walk': 'OrnLost', 'bare-eat': 'OrnLostAttack',
        'headless': 'LostHead', 'die': 'Die',
    }.items()},
    'puffshroom': ('Plants/PuffShroom/PuffShroom.gif', [20, 66]),
    'sunshroom': ('Plants/SunShroom/SunShroom2.gif', [30, 61]),
    'sunshroom-big': ('Plants/SunShroom/SunShroom.gif', [30, 61]),
    'fumeshroom': ('Plants/FumeShroom/FumeShroom.gif', [50, 88]),
    'gravebuster': ('Plants/GraveBuster/GraveBuster.gif', [50, 90]),
    **{f'newspaper-{key}': (f'Zombies/NewspaperZombie/{name}.gif', [95, 164]) for key, name in {
        'walk': 'HeadWalk1', 'eat': 'HeadAttack1', 'mad-walk': 'HeadWalk0', 'mad-eat': 'HeadAttack0',
        'gasp': 'LostNewspaper', 'headless': 'LostHeadWalk0', 'die': 'Die', 'burn': 'BoomDie',
    }.items()},
    'door-walk': ('Zombies/ScreenDoorZombie/HeadWalk1.gif', [88, 144]),
    'door-eat': ('Zombies/ScreenDoorZombie/HeadAttack1.gif', [88, 144]),
    'chomper': ('Plants/Chomper/Chomper.gif', [40, 114]),
    'chomper-bite': ('Plants/Chomper/ChomperAttack.gif', [40, 114]),
    'chomper-digest': ('Plants/Chomper/ChomperDigest.gif', [40, 114]),
    'repeater': ('Plants/Repeater/Repeater.gif', [36, 71]),
    'peashooter': ('Plants/Peashooter/Peashooter.gif', [35, 71]),
    # SunFlower.gif is a double-height state sheet; use the standalone idle clip.
    'sunflower': ('Plants/SunFlower/SunFlower1.gif', [36, 74]),
    'snowpea': ('Plants/SnowPea/SnowPea.gif', [35, 71]),
    'cherrybomb': ('Plants/CherryBomb/CherryBomb.gif', [56, 81]),
    'wallnut': ('Plants/WallNut/WallNut.gif', [32, 73]),
    'wallnut-cracked1': ('Plants/WallNut/Wallnut_cracked1.gif', [32, 73]),
    'wallnut-cracked2': ('Plants/WallNut/Wallnut_cracked2.gif', [32, 73]),
    **{f'zombie-{key}': (f'Zombies/Zombie/{name}.gif', [107, 144]) for key, name in {
        'walk': 'Zombie', 'eat': 'ZombieAttack', 'headless': 'ZombieLostHead', 'die': 'ZombieDie',
    }.items()},
    **{f'{kind}-{state}': (f'Zombies/{name}/{name}{suffix}.gif', [107, 144])
       for kind, name in [('cone', 'ConeheadZombie'), ('flag', 'FlagZombie'), ('bucket', 'BucketheadZombie')]
       for state, suffix in [('walk', ''), ('eat', 'Attack')]},
    'potatomine': ('Plants/PotatoMine/PotatoMine.gif', [37, 55]),
    'wallnut-roll': ('Plants/WallNut/WallNutRoll.gif', [35, 71]),
    'explodenut': ('Plants/WallNut/BoomWallNutRoll.gif', [35, 71]),
    **{f'pole-{key}': (f'Zombies/PoleVaultingZombie/{name}.gif', [240, 218]) for key, name in {
        'run': 'PoleVaultingZombie', 'walk': 'PoleVaultingZombieWalk', 'eat': 'PoleVaultingZombieAttack',
        'jump': 'PoleVaultingZombieJump', 'land': 'PoleVaultingZombieJump2',
        'headless': 'PoleVaultingZombieLostHeadWalk', 'die': 'PoleVaultingZombieDie', 'burn': 'BoomDie',
    }.items()},
}
for key, (relative, anchor) in gifs.items():
    path = js_repo / 'images' / relative
    gif = Image.open(path)
    frames, durations = [], []
    for frame in ImageSequence.Iterator(gif):
        frames.append(frame.convert('RGBA'))
        durations.append(frame.info['duration'] / 10)
    data[key] = pack(frames, durations, anchor)
    sources[relative] = record(path)
    if key in ['splitpea','starfruit','pumpkin','garlic','flowerpot','coffeebean','explodenut', 'potatomine', 'chomper', 'repeater', 'puffshroom', 'sunshroom', 'fumeshroom', 'gravebuster', 'hypnoshroom', 'scaredyshroom', 'iceshroom','doomshroom','lilypad','squash','threepeater','plantern','tanglekelp','jalapeno','spikeweed','torchwood','tallnut','seashroom','cactus']:
        portrait = frames[0].crop(frames[0].getbbox()) if key in ['squash','plantern','cactus'] else frames[0]
        portrait.save(output / (key + '.png'))
for key, relative, anchor in [('tanglekelp-grab', 'Plants/TangleKlep/Grab.png', [30,55]), ('fumeshroom-attack', 'Plants/FumeShroom/FumeShroomAttack.gif', [50, 88])]:
    path = js_repo / 'images' / relative
    data[key] = pack([Image.open(path).convert('RGBA')], [35], anchor)
    sources[relative] = record(path)
path = js_repo / 'images/Plants/FumeShroom/FumeShroomBullet.gif'
sheet = Image.open(path).convert('RGBA')
data['fume-cloud'] = pack([sheet.crop((0, i * 62, 343, (i + 1) * 62)) for i in range(8)], [4] * 8, [0, 31])
sources['Plants/FumeShroom/FumeShroomBullet.gif'] = record(path)
# Actors missing standalone GIFs use source Reanim transforms baked offline.
render_clip = runpy.run_path(str(root / 'tools/reanim-frames.py'))['render_clip']
reanim = ruslan_repo / 'SexyAppFramework/reanim'
def record_reanim(path): sources[str(path.relative_to(ruslan_repo))] = record(path)
for key, name, layer, size, offset, anchor in [
    ('umbrella', 'Umbrellaleaf', 'anim_idle', (240, 200), (75, 65), (115, 138)),
    ('umbrella-block', 'Umbrellaleaf', 'anim_block', (240, 200), (75, 65), (115, 138)),
    ('marigold', 'Marigold', 'anim_idle', (170, 160), (35, 40), (75, 113)),
    ('melonpult', 'Melonpult', 'anim_idle', (220, 200), (65, 70), (105, 143)),
    ('melonpult-attack', 'Melonpult', 'anim_shooting', (220, 200), (65, 70), (105, 143)),
    ('catapult-walk', 'Zombie_catapult', 'anim_walk', (360, 310), (90, 110), (140, 253)),
    ('catapult-shoot', 'Zombie_catapult', 'anim_shoot', (360, 310), (90, 110), (140, 253)),
    ('catapult-idle', 'Zombie_catapult', 'anim_idle', (360, 310), (90, 110), (140, 253)),
    ('catapult-die', 'Zombie_charred_catapult', 'charred', (360, 310), (90, 110), (140, 253)),
    ('gargantuar-walk', 'Zombie_gargantuar', 'anim_walk', (520, 450), (190, 180), (240, 325)),
    ('gargantuar-smash', 'Zombie_gargantuar', 'anim_smash', (520, 450), (190, 180), (240, 325)),
    ('gargantuar-throw', 'Zombie_gargantuar', 'anim_throw', (520, 450), (190, 180), (240, 325)),
    ('gargantuar-die', 'Zombie_gargantuar', 'anim_death', (520, 450), (190, 180), (240, 325)),
    ('gargantuar-bare-walk', 'Zombie_gargantuar', 'anim_walk', (520, 450), (190, 180), (240, 325)),
    ('gargantuar-bare-smash', 'Zombie_gargantuar', 'anim_smash', (520, 450), (190, 180), (240, 325)),
    ('gargantuar-bare-die', 'Zombie_gargantuar', 'anim_death', (520, 450), (190, 180), (240, 325)),
    ('imp-walk', 'Zombie_imp', 'anim_walk', (230, 250), (60, 90), (110, 220)),
    ('imp-eat', 'Zombie_imp', 'anim_eat', (230, 250), (60, 90), (110, 220)),
    ('imp-thrown', 'Zombie_imp', 'anim_thrown', (230, 250), (60, 90), (110, 220)),
    ('imp-land', 'Zombie_imp', 'anim_land', (230, 250), (60, 90), (110, 220)),
    ('imp-die', 'Zombie_imp', 'anim_death', (230, 250), (60, 90), (110, 220)),
    ('cabbagepult', 'Cabbagepult', 'anim_idle', (170, 160), (35, 40), (75, 113)),
    ('cabbagepult-attack', 'Cabbagepult', 'anim_shooting', (170, 160), (35, 40), (75, 113)),
    ('kernelpult', 'Cornpult', 'anim_idle', (170, 160), (35, 40), (75, 113)),
    ('kernelpult-attack', 'Cornpult', 'anim_shooting', (170, 160), (35, 40), (75, 113)),
    ('magnetshroom', 'Magnetshroom', 'anim_idle', (170, 160), (35, 40), (75, 113)),
    ('magnetshroom-attack', 'Magnetshroom', 'anim_shooting', (170, 160), (35, 40), (75, 113)),
    ('digger-walk', 'Zombie_digger', 'anim_walk', (230, 270), (60, 30), (110, 160)),
    ('digger-eat', 'Zombie_digger', 'anim_eat', (230, 270), (60, 30), (110, 160)),
    ('digger-die', 'Zombie_digger', 'anim_death', (230, 270), (60, 30), (110, 160)),
    ('digger-dig', 'Zombie_digger', 'anim_dig', (230, 270), (60, 30), (110, 160)),
    ('digger-rise', 'Zombie_digger', 'anim_drill', (230, 270), (60, 30), (110, 160)),
    ('pogo-walk', 'Zombie_pogo', 'anim_walk', (230, 270), (60, 30), (110, 160)),
    ('pogo-eat', 'Zombie_pogo', 'anim_eat', (230, 270), (60, 30), (110, 160)),
    ('pogo-die', 'Zombie_pogo', 'anim_death', (230, 270), (60, 30), (110, 160)),
    ('pogo-bounce', 'Zombie_pogo', 'anim_pogo', (230, 270), (60, 30), (110, 160)),
    ('ladder-walk', 'Zombie_ladder', 'anim_ladderwalk', (230, 270), (60, 30), (110, 160)),
    ('ladder-eat', 'Zombie_ladder', 'anim_laddereat', (230, 270), (60, 30), (110, 160)),
    ('ladder-bare', 'Zombie_ladder', 'anim_walk', (230, 270), (60, 30), (110, 160)),
    ('ladder-die', 'Zombie_ladder', 'anim_death', (230, 270), (60, 30), (110, 160)),
    ('ladder-place', 'Zombie_ladder', 'anim_placeladder', (230, 270), (60, 30), (110, 160)),
    ('bungee-idle', 'Zombie_bungi', 'anim_idle', (240, 320), (70, 40), (120, 135)),
    ('bungee-drop', 'Zombie_bungi', 'anim_drop', (240, 320), (70, 40), (120, 135)),
    ('bungee-die', 'Zombie_bungi', 'anim_hold', (240, 320), (70, 40), (120, 135)),
    ('blover','Blover','anim_blow',(140,130),(20,30),(60,110)),
    ('blover-loop','Blover','anim_loop',(140,130),(20,30),(60,110)),
    ('bobsled-walk','Zombie_bobsled','anim_walk',(220,210),(50,20),(100,180)),
    ('bobsled-eat','Zombie_bobsled','anim_eat',(220,210),(50,20),(100,180)),
    ('bobsled-die','Zombie_bobsled','anim_death',(220,210),(50,20),(100,180)),
]:
    frames = render_clip(reanim,name,layer,size,offset,record_reanim, hidden=('Zombie_imp','Zombie_gargantuar_whiterope') if key.startswith('gargantuar-bare') else ())
    data[key] = pack(frames,[5 if name=='Blover' else 10]*len(frames),list(anchor))
    if key in ['blover','cabbagepult','kernelpult','magnetshroom','umbrella','marigold','melonpult']: frames[0].crop(frames[0].getbbox()).save(output/(key+'.png'))
for name in ['Zombie_bobsled1.png','Scary_Pot.png']:
    copy(ruslan_repo/'images'/name, 'sled.png' if name.startswith('Zombie') else 'vases.png')
copy(js_repo/'images/Zombies/Zomboni/ice.png','ice-trail.png')
copy(js_repo/'images/Plants/Cactus/Projectile32.png','spike.png')
Image.open(ruslan_repo/'images/background5.jpg').convert('RGBA').save(output/'roof.png')
sources['roof.png']=record(ruslan_repo/'images/background5.jpg')
for source,target in [('BungeeTarget.png','bungee-target.png'),('BungeeCord.png','bungee-cord.png')]: copy(ruslan_repo/'images'/source,target)
for source,target in [('Melonpult_melon.png','melon.png'),('Zombie_catapult_basketball.png','basketball.png'),('coin_silver_dollar.png','coin-silver.png'),('coin_gold_dollar.png','coin-gold.png'),('Cabbagepult_cabbage.png','cabbage.png'),('Cornpult_kernal.png','kernel.png'),('Cornpult_butter.png','butter.png'),('Zombie_ladder_1.png','ladder.png')]: copy(reanim/source,target)
Image.open(js_repo/'images/Plants/Starfruit/Star.gif').convert('RGBA').save(output/'star.png')
sources['star.png']=record(js_repo/'images/Plants/Starfruit/Star.gif')
build_atlases()
for index, page in enumerate(pages):
    page.save(output / f'actors-{index}.png', optimize=True)
(output / 'animations.json').write_text(json.dumps({'pages': len(pages), 'animations': data}, separators=(',', ':')))

# Keep existing static menu/almanac artwork; only battle clips change source.
for key, relative in {
    'peashooter': 'Plants/Peashooter/Peashooter_0.png',
    'sunflower': 'Plants/SunFlower/SunFlower_0.png',
    'cherrybomb': 'Plants/CherryBomb/CherryBomb_0.png',
    'wallnut': 'Plants/WallNut/WallNut/WallNut_0.png',
    'snowpea': 'Plants/SnowPea/SnowPea_0.png',
}.items(): copy(graphics / relative, key + '.png')

for kind in ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'snowpea']:
    copy(graphics / f'Cards/card_{kind}.png', f'card-{kind}.png')
for kind in ['puffshroom', 'sunshroom', 'hypnoshroom', 'scaredyshroom']:
    copy(graphics / f'Cards/card_{kind}.png', f'card-{kind}.png')
for kind, source in {'iceshroom':'IceShroom', 'doomshroom':'DoomShroom','lilypad':'LilyPad','squash':'Squash','threepeater':'Threepeater','plantern':'Plantern'}.items():
    copy(js_repo / f'images/Card/Plants/{source}.png', f'card-{kind}.png')
for name, relative in {'pool':'interface/background3.jpg','fog':'interface/background4.jpg','pool-cleaner':'interface/PoolCleaner.png','crater':'Plants/DoomShroom/crater10.png'}.items():
    path=js_repo/'images'/relative
    Image.open(path).convert('RGBA').save(output/f'{name}.png')
    sources[f'{name}.png']=record(path)
copy(graphics / 'Cards/card_chomper.png', 'card-chomper.png')
copy(graphics / 'Cards/card_repeaterpea.png', 'card-repeater.png')
for name, path in {
    'seed-packet.png': ruslan_repo / 'images/SeedPacket_Larger.png',
    **{name: ruslan_repo / 'images' / original for name, original in {
        'shovel.png': 'Shovel.png', 'shovelbank.png': 'ShovelBank.png',
        'conveyor-back.png': 'ConveyorBelt_backdrop.png', 'conveyor.png': 'ConveyorBelt.png',
        'bowling-stripe.png': 'Wallnut_bowlingstripe.png', 'snow-pea.png': 'ProjectileSnowPea.png',
    }.items()},
    'hammer.png': ruslan_repo / 'SexyAppFramework/reanim/hammer_1.png',
    'night.jpg': js_repo / 'images/interface/background2.jpg',
    'grave.png': ruslan_repo / 'images/Night_grave_graphic.png',
    'puff.png': ruslan_repo / 'SexyAppFramework/particles/PuffShroom_puff1.png',
    'menu.png': graphics / 'Screen/MainMenu.png',
    'adventure.png': graphics / 'Screen/Adventure_0.png',
    'adventure-hover.png': graphics / 'Screen/Adventure_1.png',
    'seedbank.png': ruslan_repo / 'images/SeedBank.png',
    'award.jpg': ruslan_repo / 'images/AwardScreen_Back.jpg',
    'trophy.png': ruslan_repo / 'images/Sunflower_trophy.png',
    'button.png': js_repo / 'images/interface/Button.png',
    'dialog.png': js_repo / 'images/interface/OptionsMenuback32.png',
    'meter-empty.png': js_repo / 'images/interface/FlagMeterEmpty.png',
    'meter-full.png': js_repo / 'images/interface/FlagMeterFull.png',
    'meter-head.png': js_repo / 'images/interface/FlagMeterParts1.png',
    'meter-flag.png': js_repo / 'images/interface/FlagMeterParts2.png',
    'mower.png': js_repo / 'images/interface/LawnCleaner1.png',
}.items(): copy(path, name)

# PopCap ships this image as RGB + a separate grayscale alpha plane.
logo = Image.open(ruslan_repo / 'images/PvZ_Logo.jpg').convert('RGBA')
logo.putalpha(Image.open(ruslan_repo / 'images/PvZ_Logo_.png').convert('L'))
logo.save(output / 'logo.png')
sources['logo.png'] = [record(ruslan_repo / f'images/{name}') for name in ['PvZ_Logo.jpg', 'PvZ_Logo_.png']]
for sound in ['plant_water', 'points', 'lawnmower', 'hugewave', 'finalwave', 'winmusic', 'losemusic', 'cherrybomb', 'buttonclick', 'chomp']:
    copy(js_repo / f'audio/{sound}.mp3', sound + '.mp3')
for sound in ['fume', 'mindcontrolled', 'bonk', 'frozen', 'blover', 'vase_breaking', 'thunder', 'bungee_scream', 'coffee']:
    copy(ruslan_repo / f'SexyAppFramework/sounds/{sound}.ogg', sound + '.ogg')
fog = Image.open(ruslan_repo / 'images/fog.jpg').convert('RGBA')
fog.putalpha(Image.open(ruslan_repo / 'images/fog_.jpg').convert('L'))
fog.save(output / 'fog-cloud.png')
sources['fog-cloud.png'] = [record(ruslan_repo / f'images/{name}') for name in ['fog.jpg','fog_.jpg']]
manifest = {
    'repositories': {key: {'url': url, 'commit': subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip()}
      for key, repo, url in [('python', python_repo, 'https://github.com/marblexu/PythonPlantsVsZombies'),
        ('javascript', js_repo, 'https://github.com/jiangnangame/New-Plants-vs-Zombies-JavaScript'),
        ('ruslan', ruslan_repo, 'https://github.com/ruslan831/PlantsVsZombies-decompilation')]},
    'files': sources,
    'processing': 'PNG and composited GIF frames packed without resampling; GIF frame durations retained; original RGB logo combined with its alpha plane. Only sun and zombie-burn still use port-configured PNG timing; other animated clips preserve source GIF timing. Night fume attack is a static source pose; the eight-frame fume cloud sheet uses four ticks per frame for the port effect. Blover, bobsled, cabbagepult, kernelpult, magnetshroom, digger, pogo, bungee, ladder, umbrella, marigold, melonpult, catapult, gargantuar and imp clips are sampled offline from original Reanim affine tracks with tools/reanim-frames.py; other GIF clips retain their source timing. This is not a complete runtime Reanim implementation.'
}
(root / 'docs/original-assets.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
print(f'{len(data)} animations, {sum(len(a["frames"]) for a in data.values())} frames, {len(pages)} atlases')
