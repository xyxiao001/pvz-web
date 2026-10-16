"""Lazy world-description banner and plant list from the native unlock window."""
import hashlib
import importlib.util
from pathlib import Path
import cocos as c
spec=importlib.util.spec_from_file_location('shell_export',Path(__file__).with_name('extract-shell.py'))
e=importlib.util.module_from_spec(spec);spec.loader.exec_module(e)
window=e.read('a332a35e-0622-46cd-9528-151a1eea3820')
background=e.component(window,window.objects[8],'dragonBones.ArmatureDisplay')
rig=e.rig(background['_dragonAsset']['asset'],background['_dragonAtlasAsset']['asset'])
features=e.read('json/Features/WorldmapFeatures').objects[0]['json']['WORLDMAPS']
plants=e.read('03000899-5d49-4cef-a2b6-3b1b17f96c65').objects[0]['json']['PLANTS']
worlds={}
for f in features:
    if f['CODENAME'] in ['egypt','pirate','cowboy','future','dark','beach','iceage','lostcity','kongfu','eighties','dino','sky','modern']:
        epic=next(v for v in features if v['CODENAME']==f['EPIC_TARGET'])
        worlds[f['CODENAME']]=[next(i for i,p in enumerate(plants) if p['CODENAME']==name) for name in f['PLANTS']+epic['PLANTS']]
c.write_json(e.OUT/'window.json',{'rig':rig,'worlds':worlds})
files=list((e.OUT/'rigs'/rig).iterdir())+[e.OUT/'window.json']
c.write_json(c.ROOT/'apps/pvz2/window-provenance.json',{'commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in files}})
