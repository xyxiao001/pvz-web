"""Export native Egypt map progression audio and its first two plant rewards."""
import hashlib
import importlib.util
import json
from pathlib import Path
import cocos as c

spec = importlib.util.spec_from_file_location('shell_export', Path(__file__).with_name('extract-shell.py'))
e = importlib.util.module_from_spec(spec)
spec.loader.exec_module(e)
plants = {}
for plant, name in [(4, 'CabbagePult'), (5, 'Bloomerang')]:
    asset = e.read('plants/' + name + 'DIS')
    # AnimationController.onEnable replaces the prefab scale with CharacterScale (.42).
    asset.objects[1]['_lscale'] = [1, .42, .42, 1]
    plants[plant] = e.flat_draws(asset)
    # AnimationController.playIdle initializes DIS prefabs even without a serialized animation.
    controller = e.component(asset, asset.objects[1], 'a97bbP1jrpAOKueZ/Uiwdhb')
    for draw in plants[plant]:
        if draw['kind'] == 'rig': draw['animation'] = controller.get('IdleAnim', 'Idle')
props = e.read('resouce_prefabs/SoundsRP').objects[1]['_components'][0]
sounds = {}
files = []
for name in ['levelNodeFinish', 'levelNodeReveal', 'levelPathPush', 'plantNodeUnlock']:
    refs = props[name] if isinstance(props[name], list) else [props[name]]
    sounds[name] = []
    for ref in refs:
        clip = e.read(ref['asset'])
        ext = clip.objects[0]['_native']
        target = c.OUT / 'shell/progression-audio' / (ref['asset'] + ext)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(c.native(ref['asset'], ext.lstrip('.')))
        sounds[name].append(str(target.relative_to(c.OUT)))
        files.append(target)
c.download('docs/assets/main/index.js')
path = c.OUT / 'shell/progression.json'
skeleton = e.read('c8bc39c9-9119-4717-bba6-5b54733e98d8')
rig = json.loads(skeleton.objects[0]['_dragonBonesJson'])
durations = {}
for action, armature, animation in [('finish', 'LevelNode', 'Finish'), ('open', 'LevelNode', 'Open'), ('path', 'Path', 'Push')]:
    arm = next(a for a in rig['armature'] if a['name'] == armature)
    anim = next(a for a in arm['animation'] if a['name'] == animation)
    durations[action] = anim['duration'] / arm.get('frameRate', rig['frameRate'])
c.write_json(path, {'plants': plants, 'sounds': sounds, 'durations': durations})
files.append(path)
for key in e.rigs:
    files.extend((e.OUT / 'rigs' / key).iterdir())
c.write_json(c.ROOT / 'apps/pvz2/progression-provenance.json', {
    'repository': 'https://github.com/Gzh0821/pvzge_web', 'commit': c.COMMIT,
    'sources': c.SOURCES,
    'outputs': {str(p.relative_to(c.OUT)): {'bytes': p.stat().st_size, 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in files},
})
