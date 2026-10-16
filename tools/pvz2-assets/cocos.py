"""Read the pinned Cocos 3.8 compiled asset format without running game code.
Format reference: cocos-engine/v3.8.4/cocos/serialization/deserialize.ts.
Omitted serialized properties use their upstream class defaults at export sites.
"""
import hashlib
import json
from pathlib import Path
from urllib.request import urlopen

COMMIT = '0e4a05348b6de328e2902a57afa24a3a454a4205'
BASE = f'https://raw.githubusercontent.com/Gzh0821/pvzge_web/{COMMIT}/'
ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / 'artifacts/pvz2-source' / COMMIT
OUT = ROOT / 'apps/pvz2/public/assets'
ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
SOURCES = {}


def download(path):
    file = CACHE / path
    if not file.exists():
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(urlopen(BASE + path, timeout=60).read())
    data = file.read_bytes()
    SOURCES[path] = {'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest()}
    return data


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n')


def decode_uuid(value):
    parts = value.split('@')
    value = parts[0]
    if len(value) == 22:
        hex_value = value[:2] + ''.join(
            f'{ALPHABET.index(value[i]) * 64 + ALPHABET.index(value[i + 1]):03x}'
            for i in range(2, 22, 2))
        value = '-'.join([hex_value[:8], hex_value[8:12], hex_value[12:16],
                          hex_value[16:20], hex_value[20:]])
    return value + ('@' + parts[1] if len(parts) > 1 else '')


config = json.loads(download('docs/assets/resources/config.json'))
uuid_index = {decode_uuid(u): i for i, u in enumerate(config['uuids'])}
path_index = {v[0]: int(i) for i, v in config['paths'].items()}
pack_index = {i: p for p, ids in config['packs'].items() for i in ids}


def asset(index):
    uuid = decode_uuid(config['uuids'][index])
    name = pack_index[index] if index in pack_index else uuid
    data = json.loads(download(f'docs/assets/resources/import/{name[:2]}/{name}.json'))
    # Cocos compiled serialization: a pack has shared tables and one record per UUID.
    record = data[5][config['packs'][name].index(index)] if index in pack_index else data[5:]
    return data, record


def native(uuid, extension):
    uuid = decode_uuid(uuid).split('@')[0]
    return download(f'docs/assets/resources/native/{uuid[:2]}/{uuid}.{extension}')


class Asset:
    def __init__(self,path):
        self.data,self.rec=asset(path_index[path] if path in path_index else uuid_index[decode_uuid(path)])
        self.objects=[self.obj(v) if isinstance(v,list) else v for v in self.rec[0]]
        if self.rec[2]:
            for i in range(self.rec[2][-1]*3,len(self.rec[2])-1,3):
                owner,key,target=self.rec[2][i:i+3]
                self.objects[owner][self.data[2][key]]={'ref':target}
        for owner,key,dep in zip(self.rec[3],self.rec[4],self.rec[5]):
            if owner!=0:self.objects[owner][self.data[2][key]]={'asset':decode_uuid(self.data[1][dep])}
    def val(self,t,v):
        if t==0:return v
        if t==1:return {'ref':v if v>=0 else self.rec[2][(~v)*3+2]}
        if t in (2,3,9):return [self.val({2:1,3:6,9:4}[t],x) for x in v]
        if t==4:return self.obj(v)
        if t in (5,7,8):return v
        if t==6:return {'asset':decode_uuid(self.data[1][self.rec[5][v]])}
        if t==12:return [self.val(typ,x) for typ,x in zip(v[1:],v[0])]
        if t==11:
            result=dict(v[0])
            for i in range(1,len(v),3):result[v[i]]=self.val(v[i+1],v[i+2])
            return result
        if t==10:return {'custom':v}
        raise ValueError((t,v))
    def obj(self,v):
        mask=self.data[4][v[0]];cl=self.data[3][mask[0]]
        result={'type':cl[0]}
        for i,x in enumerate(v[1:],1):
            k=mask[i];typ=0 if i<mask[-1] else cl[k+cl[2]]
            result[cl[1][k]]=self.val(typ,x)
        return result
    def ref(self,v):return self.objects[v['ref']]
