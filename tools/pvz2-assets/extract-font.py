"""Refresh the native font subset for migrated shell, battle UI and narratives."""
import hashlib
import importlib.util
import io
import json
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
import cocos as c
spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
font=e.read('86615cb2-9939-4358-b8e2-ec2d020efeea').objects[0]
data=c.download('docs/assets/resources/native/86/86615cb2-9939-4358-b8e2-ec2d020efeea/'+font['_native'])
text=''.join(chr(i) for i in range(32,127))
for path in (c.ROOT/'apps/pvz2/src').rglob('*.ts'):text+=path.read_text()
for group in ['shell','battle','campaign']:text+=json.dumps(json.loads((c.OUT/group/'catalog.json').read_text()),ensure_ascii=False)
text+=json.dumps(json.loads((c.OUT/'shell/store.json').read_text()),ensure_ascii=False)
options=subset.Options();options.flavor='woff2'
font=TTFont(io.BytesIO(data),recalcTimestamp=False);subsetter=subset.Subsetter(options=options);subsetter.populate(text=text);subsetter.subset(font);font.flavor='woff2'
output=c.OUT/'shell/map-font.woff2';font.save(output)
manifest=c.ROOT/'apps/pvz2/shell-provenance.json';provenance=json.loads(manifest.read_text());provenance['outputs']['shell/map-font.woff2']={'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()};c.write_json(manifest,provenance)
print('Font subset:',output.stat().st_size,'bytes')
