"""Copy the original desktop cursor and update the existing shell provenance."""
import hashlib
import json
import cocos as c

uuid = c.config['uuids'][c.path_index['cursor']]
data = c.native(uuid, 'png')
target = c.OUT / 'shell/cursor.png'
target.write_bytes(data)
manifest = c.ROOT / 'apps/pvz2/shell-provenance.json'
provenance = json.loads(manifest.read_text())
provenance['sources'].update(c.SOURCES)
provenance['outputs']['shell/cursor.png'] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
c.write_json(manifest, provenance)
