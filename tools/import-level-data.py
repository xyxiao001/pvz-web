"""Extract the supported first-adventure tables from a pinned Portable checkout.
Usage: python3 tools/import-level-data.py PORTABLE_REPO
No C++ build or README-derived data.
"""
import hashlib
import json
from pathlib import Path
import re
import subprocess
import sys

repo = Path(sys.argv[1])
challenge = (repo / 'src/Lawn/Challenge.h').read_text()
zombies = (repo / 'src/Lawn/Zombie.cpp').read_text()
counts = [int(n) for n in re.search(r'gZombieWaves\[NUM_LEVELS\]\s*=\s*\{(.*?)\}', challenge, re.S)[1].replace(',', ' ').split()]
types = {'normal': 'ZOMBIE_NORMAL', 'flag': 'ZOMBIE_FLAG', 'cone': 'ZOMBIE_TRAFFIC_CONE', 'pole': 'ZOMBIE_POLEVAULTER', 'bucket': 'ZOMBIE_PAIL', 'newspaper': 'ZOMBIE_NEWSPAPER', 'door': 'ZOMBIE_DOOR', 'football': 'ZOMBIE_FOOTBALL', 'dancer': 'ZOMBIE_DANCER', 'backup': 'ZOMBIE_BACKUP_DANCER', 'ducky': 'ZOMBIE_DUCKY_TUBE', 'snorkel': 'ZOMBIE_SNORKEL', 'zomboni': 'ZOMBIE_ZAMBONI', 'bobsled': 'ZOMBIE_BOBSLED', 'dolphin': 'ZOMBIE_DOLPHIN_RIDER', 'jack': 'ZOMBIE_JACK_IN_THE_BOX', 'balloon': 'ZOMBIE_BALLOON', 'digger':'ZOMBIE_DIGGER', 'pogo':'ZOMBIE_POGO', 'bungee':'ZOMBIE_BUNGEE', 'ladder':'ZOMBIE_LADDER'}
definitions = {}
for kind, name in types.items():
    definition = re.search(r'\{ \.mZombieType = ' + name + r',[^\n]+', zombies)[0]
    allowed = re.search(r'\{ ' + name + r',\s*\{(.*?)\}', challenge, re.S)[1]
    definitions[kind] = {key: int(re.search(r'\.' + field + r' = (\d+)', definition)[1]) for key, field in
                        [('value', 'mZombieValue'), ('startingLevel', 'mStartingLevel'), ('firstAllowedWave', 'mFirstAllowedWave'), ('weight', 'mPickWeight')]}
    definitions[kind]['allowedLevels'] = [int(n) for n in allowed.replace(',', ' ').split()][:45]
conveyor_source = (repo / 'src/Lawn/Challenge.cpp').read_text()
conveyor_ten = re.search(r'if \(mBoard->mLevel == 10\)\s*\{(.*?)\n\t\}', conveyor_source, re.S)[1]
seed_names = {'PEASHOOTER': 'peashooter', 'CHERRYBOMB': 'cherrybomb', 'WALLNUT': 'wallnut', 'REPEATER': 'repeater', 'SNOWPEA': 'snowpea', 'CHOMPER': 'chomper', 'POTATOMINE': 'potatomine'}
conveyor = [{'kind': seed_names[name], 'weight': int(weight)} for name, weight in re.findall(r'mItem = SEED_(\w+);\s*aSeedPickArray\[\d+\].mWeight = (\d+);', conveyor_ten)]
conveyor_twenty = re.search(r'else if \(mBoard->mLevel == 20\)\s*\{(.*?)\n\t\}', conveyor_source, re.S)[1]
night_names = {name.upper(): name for name in ['gravebuster','iceshroom','doomshroom','hypnoshroom','scaredyshroom','fumeshroom','puffshroom']}
conveyor20 = [{'kind': night_names[name], 'weight': int(weight)} for name, weight in re.findall(r'mItem = SEED_(\w+);\s*aSeedPickArray\[\d+\].mWeight = (\d+);', conveyor_twenty)]
little = re.search(r'else if \(mApp->IsLittleTroubleLevel\(\)\)\s*\{(.*?)\n\t\}', conveyor_source, re.S)[1]
little_names = {'LILYPAD':'lilypad','WALLNUT':'wallnut','PEASHOOTER':'peashooter','CHERRYBOMB':'cherrybomb'}
conveyor25 = [{'kind':little_names[name], 'weight':int(weight)} for name,weight in re.findall(r'mItem = SEED_(\w+);\s*aSeedPickArray\[\d+\].mWeight = (\d+);', little)]
conveyor_thirty = re.search(r'else if \(mBoard->mLevel == 30\)\s*\{(.*?)\n\t\}', conveyor_source, re.S)[1]
pool_names = {name.upper(): name for name in ['lilypad','squash','threepeater','tanglekelp','jalapeno','spikeweed','torchwood','tallnut']}
conveyor30 = [{'kind':pool_names[name], 'weight':int(weight)} for name,weight in re.findall(r'mItem = SEED_(\w+);\s*aSeedPickArray\[\d+\].mWeight = (\d+);', conveyor_thirty)]
late_names = {name.upper():name for name in ['lilypad','seashroom','magnetshroom','blover','cactus','starfruit','splitpea','flowerpot','chomper','cherrybomb']}
late_names['PUMPKINSHELL'] = 'pumpkin'
def conveyor_block(pattern):
    block = re.search(pattern + r'\s*\{(.*?)\n\t\}', conveyor_source, re.S)[1]
    return [{'kind':late_names[name], 'weight':int(weight)} for name,weight in re.findall(r'mItem = SEED_(\w+);\s*aSeedPickArray\[\d+\].mWeight = (\d+);', block)]
conveyor40 = conveyor_block(r'else if \(mBoard->mLevel == 40\)')
conveyor45 = conveyor_block(r'else if \(mApp->IsBungeeBlitzLevel\(\)\)')
vase_source = conveyor_source.split('if (mApp->IsAdventureMode() && mBoard->mLevel == 35)', 1)[1].split('\n\telse', 1)[0]
vases = []
for stage in range(3):
    block = re.search(r'case ' + str(stage) + r':(.*?)break;', vase_source, re.S)[1]
    contents = []
    for content, zombie, seed, count in re.findall(r'ScaryPotterPlacePot\(SCARYPOT_(SEED|ZOMBIE), ZOMBIE_(\w+), SEED_(\w+), (\d+),', block):
        kind = {'PAIL':'bucket','JACK_IN_THE_BOX':'jack','HYPNOSHROOM':'hypnoshroom'}.get(zombie if content == 'ZOMBIE' else seed, (zombie if content == 'ZOMBIE' else seed).lower())
        contents.append({'type':content.lower(), 'kind':kind, 'count':int(count)})
    green = re.search(r'ScaryPotterChangePotType\(GRIDITEM_STATE_SCARY_POT_LEAF, (\d+)\)', block)
    vases.append({'firstColumn':max(map(int,re.findall(r'ScaryPotterDontPlaceInCol\((\d+)',block)))+1, 'green':int(green[1]) if green else 0, 'contents':contents})
board = (repo / 'src/Lawn/Board.cpp').read_text()
graves = [[] for _ in range(45)]
for levels in ['mLevel == 11 || mLevel == 12 || mLevel == 13', 'mLevel == 14 || mLevel == 16', 'mLevel == 17 || mLevel == 18 || mLevel == 19']:
    block = re.search(r'else if \(' + re.escape(levels) + r'\)\s*\{(.*?)\}', board, re.S)[1]
    columns = [[int(column), int(count)] for column, count in re.findall(r'AddGraveStones\((\d+), (\d+), aLevelRNG\)', block)]
    for level in map(int, re.findall(r'mLevel == (\d+)', levels)):
        if level <= 45: graves[level - 1] = columns
block20 = re.search(r'else if \(mLevel >= 20\)\s*\{(.*?)\}', board, re.S)[1]
graves[19] = [[int(c), int(n)] for c,n in re.findall(r'AddGraveStones\((\d+), (\d+), aLevelRNG\)', block20)]
counts[14] = 8  # Board::PickZombieWaves overrides the adventure table for Whack-a-Zombie.
paths = ['src/Lawn/Plant.cpp', 'src/Lawn/CutScene.cpp', 'src/Lawn/System/Music.cpp', 'src/Lawn/Coin.cpp', 'src/Lawn/Projectile.cpp', 'src/Lawn/Challenge.cpp' , 'src/Lawn/Challenge.h', 'src/Lawn/Zombie.cpp', 'src/Lawn/Board.cpp']
data = {'source': {'repository': 'https://github.com/wszqkzqk/PvZ-Portable',
                   'commit': subprocess.check_output(['git', '-C', str(repo), 'rev-parse', 'HEAD'], text=True).strip(),
                   'files': {p: hashlib.sha256((repo / p).read_bytes()).hexdigest() for p in paths}},
        'waveCounts': counts[:45], 'zombies': definitions, 'conveyorTen': conveyor, 'conveyorTwenty': conveyor20, 'conveyorTwentyFive': conveyor25, 'conveyorThirty': conveyor30, 'conveyorForty':conveyor40, 'conveyorFortyFive':conveyor45, 'vaseStages': vases, 'graveColumns': graves}
output = Path(__file__).resolve().parents[1] / 'src/game/data/portable-adventure.json'
output.write_text(json.dumps(data, indent=2) + '\n')
print(output)
