"""Export costume counts and existing plant rigs from the pinned native features."""
import json
import cocos as c

features = c.Asset('json/Features/PlantFeatures').objects[0]['json']['PLANTS']
actors = {}
for group in ['campaign', 'pirate', 'cowboy', 'future', 'dark']:
    actors.update(json.loads((c.OUT / group / 'catalog.json').read_text())['actors'])
for name in ['peashooter', 'sunflower', 'wallnut', 'potatomine']:
    skeleton = json.loads((c.OUT / 'actors' / name / 'skeleton.json').read_text())
    actors[name] = {'armature': skeleton['armature'][0]['name'], 'path': f'actors/{name}', 'animation': 'Idle'}
plants = []
for feature in features:
    kind = feature['CODENAME']
    if kind not in actors or not feature.get('COSTUME', 0):
        continue
    rig = actors[kind]
    path = rig['path'] if 'path' in rig else f"{rig['group']}/rigs/{rig['rig']}"
    skeleton = json.loads((c.OUT / path / 'skeleton.json').read_text())
    armature = next(a for a in skeleton['armature'] if a['name'] == rig['armature'])
    for costume in range(feature['COSTUME']):
        assert any(s['name'] == f'COS{costume}' or s['name'].startswith(f'COS{costume}_') for s in armature['slot']), (kind, costume)
    plants.append({'id': feature['ID'], 'kind': kind, 'name': feature['NAME']['zh'], 'count': feature['COSTUME'],
                   'path': path, 'armature': rig['armature'], 'animation': rig['animation']})
c.write_json(c.OUT / 'shell/costumes.json', plants)
print(f'Exported {len(plants)} plants with native costumes')
