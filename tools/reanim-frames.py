"""Offline sampling of source Reanim image tracks used by the migrated actors.
Uses inherited XML transforms and layer visibility from Portable Reanimator.cpp.
No runtime Reanim parser or generated replacement artwork.
"""
import math
import xml.etree.ElementTree as ET
from PIL import Image

def render_clip(directory, name, layer, size, offset, record, hidden=()):
    path = directory / (name + '.reanim')
    record(path)
    xml = ET.fromstring('<root>' + path.read_text() + '</root>')
    tracks = {}
    for track in xml.findall('track'):
        state = dict(x=0., y=0., sx=1., sy=1., kx=0., ky=0., f=0., a=1., i='')
        poses = []
        for t in track.findall('t'):
            for child in t:
                if child.tag in state: state[child.tag] = child.text if child.tag == 'i' else float(child.text)
            poses.append(state.copy())
        tracks[track.findtext('name')] = poses
    images = {p.stem.upper(): p for p in directory.glob('*.png')}
    loaded = {}
    frames = []
    for index, marker in enumerate(tracks[layer]):
        if marker['f'] < 0: continue
        frame = Image.new('RGBA', size)
        for track_name, poses in tracks.items():
            if any(track_name.startswith(prefix) for prefix in hidden): continue
            t = poses[index]
            if not t['i'] or t['f'] < 0 or t['a'] == 0: continue
            image_name = t['i'].removeprefix('IMAGE_REANIM_')
            if image_name not in loaded:
                source = images[image_name]; record(source); loaded[image_name] = Image.open(source).convert('RGBA')
            im = loaded[image_name]
            x, y = t['x'] + offset[0], t['y'] + offset[1]
            a, b = math.cos(math.radians(t['kx']))*t['sx'], -math.sin(math.radians(t['ky']))*t['sy']
            c, d = math.sin(math.radians(t['kx']))*t['sx'], math.cos(math.radians(t['ky']))*t['sy']
            det = a*d-b*c
            if det == 0: continue  # source tracks intentionally collapse during transitions
            transform = (d/det, -b/det, (b*y-d*x)/det, -c/det, a/det, (c*x-a*y)/det)
            part = im.transform(size, Image.Transform.AFFINE, transform, Image.Resampling.BICUBIC)
            if t['a'] != 1: part.putalpha(part.getchannel('A').point(lambda value: round(value*t['a'])))
            frame.alpha_composite(part)
        frames.append(frame)
    return frames
