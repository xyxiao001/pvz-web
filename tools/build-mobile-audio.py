"""Build browser sound effects, preserving the imported originals."""
from pathlib import Path
import subprocess

root = Path(__file__).resolve().parents[1] / 'public/assets/original'
for name in ['fume', 'mindcontrolled', 'frozen', 'blover', 'vase_breaking', 'bonk', 'thunder', 'bungee_scream', 'coffee']:
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(root / (name + '.ogg')),
                    '-map_metadata', '-1', '-codec:a', 'libmp3lame', '-q:a', '4', str(root / (name + '.mp3'))], check=True)

# iPhone Safari 26.5.2 rejects the imported victory MP3. The same device
# successfully decoded this 44.1 kHz / 96 kbps encoding in the audio probe.
subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(root / 'winmusic.mp3'),
                '-map_metadata', '-1', '-ar', '44100', '-codec:a', 'libmp3lame', '-b:a', '96k',
                str(root / 'winmusic-web.mp3')], check=True)
