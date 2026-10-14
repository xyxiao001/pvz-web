"""Render the original MO3 tunes with libopenmpt and ffmpeg.
Usage: python3 tools/build-music.py RUSLAN_REPO LIBOPENMPT_DYLIB
Order offsets follow Portable Lawn/System/Music.cpp (PlayMusic / StartGameMusic).
"""
import ctypes as c
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import wave

repo = Path(sys.argv[1])
source = repo / 'SexyAppFramework/sounds/mainmusic.mo3'
lib = c.CDLL(sys.argv[2])
root = Path(__file__).resolve().parents[1]
output = root / 'public/assets/music'
output.mkdir(parents=True, exist_ok=True)

def bind(name, args, result):
    f = getattr(lib, 'openmpt_module_' + name)
    f.argtypes, f.restype = args, result
    return f

ptr, integer = c.c_void_p, c.c_int32
create = bind('create_from_memory2', [ptr,c.c_size_t,ptr,ptr,ptr,ptr,ptr,ptr,ptr], ptr)
select = bind('select_subsong', [ptr,integer], c.c_int)
seek = bind('set_position_order_row', [ptr,integer,integer], c.c_double)
read = bind('read_interleaved_stereo', [ptr,integer,c.c_size_t,ptr], c.c_size_t)
ctl = bind('ctl_set_text', [ptr,c.c_char_p,c.c_char_p], c.c_int)
destroy = bind('destroy', [ptr], None)
# name: subsong, original start order, loop order, title
tracks = {
    'menu': (7, 0x98, 0x98, 'Crazy Dave'),
    'choose': (5, 0x7A, 0x7B, 'Choose Your Seeds'),
    'day': (0, 0, 12, 'Grasswalk'),
    'night': (1, 0x30, 0x30, 'Moongrains'),
    'roof': (11, 0xB8, 0xB9, 'Graze the Roof'),
    'pool': (4, 0x5E, 0x5E, 'Watery Graves'),
    'fog': (6, 0x7D, 0x7E, 'Rigor Mormist'),
    'minigame': (9, 0xA6, 0xA6, 'Loonboon'),
    'puzzle': (10, 0xB1, 0xB1, 'Cerebrawl'),
    'conveyor': (12, 0xD4, 0xD5, 'Ultimate Battle'),
}
data = source.read_bytes()
filebuffer = c.create_string_buffer(data)
metadata = {}
for name, (subsong, start, loop, title) in tracks.items():
    mod = create(filebuffer, len(data), None, None, None, None, None, None, None)
    select(mod, subsong)
    ctl(mod, b'play.at_end', b'continue')
    loop_seconds = seek(mod, loop, 0)
    start_seconds = seek(mod, start, 0)
    rate, frames, block = 44100, 0, (c.c_int16 * (4096 * 2))()
    with tempfile.TemporaryDirectory() as temp:
        wav = Path(temp) / 'track.wav'
        with wave.open(str(wav), 'wb') as stream:
            stream.setnchannels(2); stream.setsampwidth(2); stream.setframerate(rate)
            while count := read(mod, rate, 4096, block):
                stream.writeframes(c.string_at(block, count * 4)); frames += count
        dest = output / (name + '.mp3')
        subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-codec:a','libmp3lame','-q:a','4',str(dest)],check=True)
    destroy(mod)
    metadata[name] = {'title':title, 'file':name+'.mp3', 'loopStart':round(loop_seconds-start_seconds,6), 'duration':frames/rate,
                      'subsong':subsong, 'startOrder':start, 'loopOrder':loop, 'bytes':dest.stat().st_size,
                      'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}
    print(name, frames/rate, metadata[name]['loopStart'], flush=True)
(root/'src/platform/music-tracks.json').write_text(json.dumps({name:{'file':t['file'],'loopStart':t['loopStart']} for name,t in metadata.items()},indent=2)+'\n')
(root/'docs/music-assets.json').write_text(json.dumps({'repository':'https://github.com/ruslan831/PlantsVsZombies-decompilation',
    'commit':subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip(),
    'source':str(source.relative_to(repo)), 'sourceSha256':hashlib.sha256(data).hexdigest(),
    'reference':'PvZ-Portable 141c1476: src/Lawn/System/Music.cpp',
    'renderer':'libopenmpt, 44100 Hz stereo; main music layer only (no dynamic drum/hihat layering)', 'tracks':metadata},indent=2)+'\n')
