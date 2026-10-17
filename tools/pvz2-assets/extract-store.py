"""Export native store art and supported commodities from the pinned upstream build."""
import hashlib
import importlib.util
from pathlib import Path
import cocos as c
spec = importlib.util.spec_from_file_location('shell_export', Path(__file__).with_name('extract-shell.py'))
e = importlib.util.module_from_spec(spec); spec.loader.exec_module(e)
store = e.read('a1216cb7-88d7-42a8-bff7-55d200ce63e4')
commodity = e.read('4c29aa34-cfda-46bd-bc5f-ee463e69c022')
props = e.component(commodity, commodity.objects[1], '2d79ejWBKpGIYqDFe7Uya5/')
art = {name: e.sprite(props[name]['asset']) for name in ['plantWindow','upgradeWindow','gemWindow','coinWindow','gemButtonUp','gemButtonDown','coinButtonUp','coinButtonDown']}
for name in ['buyGemIcon','buyCoinIcon']:
    art[name] = e.sprite(commodity.ref(props[name])['_spriteFrame']['asset'])
rig = e.rig('23f33c1d-7985-44aa-bf7a-3200984a26bf','73dcba37-c5ec-45bb-acf0-5ad61b6adba2')
source = e.read('json/Features/StoreCommodityFeatures').objects[0]['json']
upgrades = e.read('json/Features/UpgradeFeatures').objects[0]['json']['UPGRADES']
plants = e.read('json/Features/PlantFeatures').objects[0]['json']['PLANTS']
items = []
for category in ['Plants','Upgrade','Coin','Gem']:
    for index, item in enumerate(source[category]):
        kind = item['CommodityType']; name = item.get('CommodityName','')
        if kind == 'plant' and name not in ['iceweed','snowdrop']: continue
        if kind == 'upgrade' and name not in ['upgrade_8_slots','upgrade_pf_slots_lvl2','upgrade_starting_sun_lvl2']: continue
        result = {'id': f'{category}-{index}', 'category': category, 'type': kind, 'name': name,
                  'currency': item['CurrencyType'], 'price': item['CurrencyRequired'], 'count': item.get('CommodityCount',1)}
        if 'UnlockLevel' in item: result['unlockLevel'] = item['UnlockLevel']
        if kind == 'plant':
            feature = next(p for p in plants if p['CODENAME']==name)
            result.update(label=feature['NAME']['zh'], plant=feature['ID'])
        elif kind == 'upgrade':
            feature = next(u for u in upgrades if u['CODENAME']==name)
            result.update(label=feature['NAME']['zh'], upgrade=upgrades.index(feature), description=feature['DESCRIPTION']['zh'], animation=feature['SPRITENAME'])
        else: result.update(label=item['CommodityDisplayName']['zh'], animation='stack'+str(item['StackLevel']))
        items.append(result)
output = c.OUT/'shell/store.json'
c.write_json(output, {'rig':rig,'art':art,'items':items})
files=[output]+[c.OUT/value['image'] for value in e.sprites.values()]
for key in e.rigs: files.extend((e.OUT/'rigs'/key).iterdir())
c.write_json(c.ROOT/'apps/pvz2/store-provenance.json', {'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files}})
