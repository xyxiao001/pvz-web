"""Export the upstream world chooser, maps and UI, without battle resources.
Run from the repository: python3 tools/pvz2-assets/extract-shell.py (requires Pillow, fonttools, brotli).
"""
import copy
from functools import lru_cache
import hashlib
import io
import json
import math
from pathlib import Path
from PIL import Image
import cocos as c

OUT = c.OUT / 'shell'
OUT.mkdir(parents=True, exist_ok=True)
rigs = {}
sprites = {}
read = lru_cache(None)(c.Asset)


def rig(skeleton_id, atlas_id):
    key = skeleton_id
    if key in rigs:
        return key
    sk = read(skeleton_id)
    at = read(atlas_id)
    skeleton = json.loads(sk.objects[0]['_dragonBonesJson'])
    atlas = json.loads(at.objects[0]['_atlasJson'])
    # The portal references LevelNode's ray armatures; its own atlas contains
    # the same named images. Resolve this explicit upstream dependency offline.
    if key == 'ce8294b0-7c76-4c91-939a-12540455d8f9':
        nodes = read('c8bc39c9-9119-4717-bba6-5b54733e98d8')
        shared = json.loads(nodes.objects[0]['_dragonBonesJson'])
        skeleton['armature'].extend(copy.deepcopy(a) for a in shared['armature'] if a['name'] in ['ray_green','ray_blue'])
    texture_id = at.data[1][at.rec[5][0]]
    pixels = Image.open(io.BytesIO(c.native(texture_id, 'png'))).convert('RGBA')
    folder = OUT / 'rigs' / key
    folder.mkdir(parents=True, exist_ok=True)
    # Encoding cache is keyed by the pinned source revision and texture hash.
    digest = hashlib.sha256(pixels.tobytes()).hexdigest()
    stamp = c.CACHE / ('webp-92-' + key + '.sha256')
    if not ((folder / 'texture.webp').exists() and stamp.exists() and stamp.read_text() == digest):
        pixels.save(folder / 'texture.webp', quality=92, method=6)
        stamp.write_text(digest)
    atlas['imagePath'] = 'texture.webp'
    c.write_json(folder / 'skeleton.json', skeleton)
    c.write_json(folder / 'atlas.json', atlas)
    rigs[key] = {'atlas': atlas_id, 'armatures': {a['name']: [x['name'] for x in a.get('animation', [])] for a in skeleton['armature']}}
    print('rig',key,pixels.size,flush=True)
    return key


def sprite(uuid):
    if uuid in sprites:
        return sprites[uuid]
    d, rec = c.asset(c.uuid_index[uuid])
    frame = rec[0][0]
    pixels = Image.open(io.BytesIO(c.native(d[1][rec[5][0]], 'png'))).convert('RGBA')
    box = frame['rect']
    w,h = box['width'],box['height']
    if frame['rotated']:w,h=h,w
    pixels = pixels.crop((box['x'],box['y'],box['x']+w,box['y']+h))
    if frame['rotated']:pixels=pixels.transpose(Image.Transpose.ROTATE_90)
    target = OUT / 'ui' / (uuid.replace('@','_')+'.webp')
    target.parent.mkdir(parents=True, exist_ok=True)
    pixels.save(target,lossless=True,method=6)
    result={'image':str(target.relative_to(c.OUT)), 'width':box['width'],'height':box['height'], 'insets':frame['capInsets'], 'name':frame['name']}
    sprites[uuid]=result
    return result


def component(asset, node, typename):
    return next(comp for value in node['_components'] for comp in [asset.ref(value) if 'ref' in value else value] if comp['type']==typename)


def flat_draws(asset, root=1, overrides=None):
    """Flatten source transforms and nested prefab overrides; keep source draw order."""
    objects = copy.deepcopy(asset.objects)
    def resolve(value):return objects[value['ref']] if 'ref' in value else value
    if overrides:
        targets={}
        def index(obj):
            if isinstance(obj,dict):
                prefab=obj.get('_prefab') or obj.get('__prefab')
                if prefab and 'fileId' in prefab:targets[prefab['fileId']]=obj
                for value in obj.values():index(value)
            elif isinstance(obj,list):
                for value in obj:index(value)
        index(objects)
        for item in overrides:
            local=item['targetInfo']['localID']
            if len(local)==1 and local[0] in targets and len(item['propertyPath'])==1:
                targets[local[0]][item['propertyPath'][0]]=item['value']
    draws=[]
    def walk(idx, parent=(0,0,1,1,0), inherited=True):
        node=objects[idx]
        if not node.get('_active',True) or not inherited:return
        prefab=node.get('_prefab')
        if prefab and isinstance(prefab.get('asset'),dict) and 'asset' in prefab['asset']:
            nested=read(prefab['asset']['asset'])
            edits=copy.deepcopy(prefab['instance']['propertyOverrides'])
            for item in edits:item['targetInfo']=resolve(item['targetInfo'])
            for draw in flat_draws(nested,overrides=edits):
                draw['x']=parent[0]+draw['x']*parent[2];draw['y']=parent[1]+draw['y']*parent[3]
                draw['sx']*=parent[2];draw['sy']*=parent[3];draw['rotation']+=parent[4]
                draw['owner']=idx
                draws.append(draw)
            return
        # Defaults below are cc.Node / cc.UITransform serialized defaults, not inferred layout.
        pos=node.get('_lpos',[1,0,0,0]);scale=node.get('_lscale',[1,1,1,1]);rotation=-node.get('_euler',[1,0,0,0])[3]*math.pi/180
        x=parent[0]+pos[1]*parent[2];y=parent[1]-pos[2]*parent[3]
        sx=parent[2]*scale[1];sy=parent[3]*scale[2];rotation+=parent[4]
        comps=[resolve(value) for value in node.get('_components',[])]
        ui=next((v for v in comps if v['type']=='cc.UITransform'),{})
        size=ui.get('_contentSize',[5,100,100]);anchor=ui.get('_anchorPoint',[0,.5,.5])
        for comp in comps:
            base={'owner':idx,'name':node.get('_name',''),'x':x,'y':y,'sx':sx,'sy':sy,'rotation':rotation}
            if comp['type']=='dragonBones.ArmatureDisplay' and '_dragonAsset' in comp:
                key=rig(comp['_dragonAsset']['asset'],comp['_dragonAtlasAsset']['asset'])
                draws.append({**base,'kind':'rig','rig':key,'armature':comp['_armatureName'],'animation':comp.get('_animationName','')})
            elif comp['type']=='cc.Sprite' and '_spriteFrame' in comp:
                draws.append({**base,'kind':'sprite',**sprite(comp['_spriteFrame']['asset']),'w':size[1],'h':size[2],'ax':anchor[1],'ay':1-anchor[2]})
            elif comp['type']=='cc.Label':
                draws.append({**base,'kind':'label','text':comp.get('_string',''),'size':comp.get('_fontSize',40),'w':size[1],'h':size[2]})
        for child in node.get('_children',[]):walk(child['ref'],(x,y,sx,sy,rotation))
    walk(root)
    # EndlessZoneEntrance.start() leaves labels empty and plays Idle_Locked
    # until its level progress unlocks; these modes are not connected in this port.
    for value in objects[root].get('_components', []):
        comp = resolve(value)
        if comp['type'] == '992c6fTKlBKvZA/ag/FgwVe':
            island_node = resolve(comp['islandDB'])['node']['ref']
            labels = {resolve(comp[key])['node']['ref'] for key in ['LevelNumberLabel','LevelNameLabel']}
            for draw in draws:
                if draw['owner'] == island_node and draw['kind'] == 'rig': draw['animation'] = 'Idle_Locked'
                if draw['owner'] in labels and draw['kind'] == 'label': draw['text'] = ''
    return draws


def main():
    lyrics=read('json/multilanguages/InGameLyrics').objects[0]['json']
    features=read('json/Features/WorldmapFeatures').objects[0]['json']['WORLDMAPS']
    chooser=read('worldmaps/WorldmapChooserWORLDMAP')
    chooser_comp=component(chooser,chooser.objects[1],'0afd7/QFy1OXrADNpaZkrno')
    chooser_draws=flat_draws(chooser)
    worlds=[]
    for index,icon in enumerate(chooser_comp['icons']):
        node=chooser.ref(icon['node']);draw=next(d for d in chooser_draws if d['owner']==icon['node']['ref'] and d['kind']=='rig')
        if not icon.get('enterable',True):
            worlds.append({'id':node['_name'].lower(),'name':'未知世界','description':'','difficulty':0,'enterable':False,'draw':draw,'night':False})
            continue
        feature=features[icon.get('enterTo',1)]
        strings=lyrics['WorldMapScene']['World'][{'LostCity':'Lostcity','IceAge':'Iceage'}.get(node['_name'],node['_name'])]
        worlds.append({'id':feature['CODENAME'],'name':strings['Name']['zh'],'description':strings['Description']['zh'],'difficulty':feature['DIFFICULTY'],'enterable':True,'night':icon.get('atNight',False),'draw':draw,'levels':feature['LEVELS']})

    scene=read('scenes/worldMapScene')
    background=component(scene,scene.objects[12],'dragonBones.ArmatureDisplay')
    background_key=rig(background['_dragonAsset']['asset'],background['_dragonAtlasAsset']['asset'])
    buttons={}
    for idx in [3,4,5,6,7,8]:
        node=scene.objects[idx];sp=component(scene,node,'cc.Sprite');bt=component(scene,node,'cc.Button');pos=node['_lpos'];ui=component(scene,node,'cc.UITransform')['_contentSize']
        buttons[node['_name']]={'x':512+pos[1],'y':320-pos[2],'w':ui[1]*.4,'h':ui[2]*.4,'normal':sprite(sp['_spriteFrame']['asset']), 'hover':sprite(bt['_hoverSprite']['asset']),'pressed':sprite(bt['_pressedSprite']['asset'])}
    # The original world-description window artwork, with its nine-slice border.
    window_asset=read('a332a35e-0622-46cd-9528-151a1eea3820')
    window_art={}
    for idx in [2,3,4,5]:
        node=window_asset.objects[idx];window_art[node['_name']]=sprite(component(window_asset,node,'cc.Sprite')['_spriteFrame']['asset'])
    lock=flat_draws(read(chooser_comp['lockPF']['asset']))
    node_resources=read('resouce_prefabs/LevelNodesRP').objects[1]['_components'][0]
    node_styles={key:flat_draws(read(node_resources[key]['asset'])) for key in ['normalNode','minigameNode','gargantuarNode','path','giftbox','epicPortal','zombossHead']}
    font=read('86615cb2-9939-4358-b8e2-ec2d020efeea').objects[0]
    font_bytes = c.download('docs/assets/resources/native/86/86615cb2-9939-4358-b8e2-ec2d020efeea/'+font['_native'])

    def audio(path, name):
        clip = read(path)
        uuid = c.decode_uuid(c.config['uuids'][c.path_index[path]]) if path in c.path_index else path
        target = OUT / (name + clip.objects[0]['_native'])
        target.write_bytes(c.native(uuid, clip.objects[0]['_native'].lstrip('.')))
        return str(target.relative_to(c.OUT))

    music = audio('music/worldMap/WorldMapMusic', 'world-map')
    sounds = {key: audio(chooser_comp[key]['asset'], key) for key in ['touchStartSound','touchEndSound']}
    toolbar = [draw for idx in [14,24,25,26] for draw in flat_draws(scene,root=idx)]
    # Accounts are independent: render the original counters with this port's zero balances.
    for draw in toolbar:
        if draw['kind'] == 'label': draw['text'] = '0'
    plant_features = read('03000899-5d49-4cef-a2b6-3b1b17f96c65').objects[0]['json']['PLANTS']
    card = flat_draws(read('f5b49039-25f1-495b-ab19-afac972d1467'))
    node_styles['plantCard'] = [d for d in card if d['name'] in ['Background','Plant']]
    node_styles['upgrade'] = flat_draws(read('8f6593f6-cd95-472c-a334-f9093e24256a'))
    upgrades = read('1f3bc896-e45b-4497-92b6-be280652a736').objects[0]['json']['UPGRADES']
    arrow = next(d for d in flat_draws(read('worldmaps/EgyptWORLDMAP')) if d['name']=='DeltaArrow')
    catalog={'worlds':worlds,'chooser':chooser_draws,'background':background_key,'buttons':buttons,'window':window_art,'lock':lock,'nodes':node_styles,'music':music,'sounds':sounds,'toolbar':toolbar,'arrow':arrow,'plantCards':{str(i):{'animation':f['_CARDSPRITENAME'],'background':{'market':'prenium','water':'beach'}.get(f['OBTAINWORLD'],f['OBTAINWORLD'])} for i,f in enumerate(plant_features)},'upgrades':[u['SPRITENAME'] for u in upgrades]}
    c.write_json(OUT/'catalog.json',catalog)

    for world in worlds:
        if not world['enterable']:continue
        feature=next(f for f in features if f['CODENAME']==world['id'])
        asset=read('worldmaps/'+feature['RESNAME']+'WORLDMAP')
        config=component(asset,asset.objects[1],'c950fgYqFxBG7Ic+A1nhlTR')
        def position(ref):
            obj=asset.ref(ref);p=obj.get('_lpos',[1,0,0,0]);return [p[1],-p[2]]
        islands=[]
        for item in config['levelIslands']:
            node=asset.ref(item['islandNode']);xy=position(item['islandNode'])
            next_islands=([item['nextIsland']['ref']] if item.get('nextIsland') else [])+[ref['ref'] for ref in item.get('otherNextIslands',[])]
            islands.append({'node':item['islandNode']['ref'],'name':item.get('levelNodeName',''),'kind':item.get('islandDisplay',0),'appearance':item.get('levelNodeAppearance',0),'levels':item.get('levelJsonsID',[]),'plant':item.get('plantDisplayed',0),'upgrade':item.get('upgradeDisplayed',0),'x':xy[0],'y':xy[1],'next':next_islands,'affectsBounds':item.get('affectsMaxX',True)})
        draws=flat_draws(asset)
        parents={i:o.get('_parent',{}).get('ref') for i,o in enumerate(asset.objects) if isinstance(o,dict) and o['type']=='cc.Node'}
        far={f['islandNode']['ref']:f.get('offsetScale',1) for f in config.get('farIslands',[])}
        moving={config['islandParent']['ref'],config['levelParent']['ref']}
        for draw in draws:
            owner=draw['owner'];draw['parallax']=0
            while owner is not None:
                if owner in far:draw['parallax']=far[owner];break
                if owner in moving:draw['parallax']=1;break
                owner=parents.get(owner)
        used=sorted({d['rig'] for d in draws if d['kind']=='rig'})
        c.write_json(OUT/'maps'/f"{world['id']}.json",{'id':world['id'],'draws':draws,'islands':islands,'rigs':used,'startingLevels':config['startingLevels']})
        print('map',world['id'],len(islands),'nodes',len(draws),'draws',flush=True)

    # Keep the upstream glyphs, subset to the shell's actual UI and world descriptions.
    from fontTools import subset
    from fontTools.ttLib import TTFont
    font = TTFont(io.BytesIO(font_bytes), recalcTimestamp=False)
    options = subset.Options()
    options.flavor = 'woff2'
    subsetter = subset.Subsetter(options=options)
    text = ''.join(chr(code) for code in range(32,127)) + ''.join(w['name']+w['description'] for w in worlds)
    text += (c.ROOT/'apps/pvz2/src/shell/controller.ts').read_text()
    subsetter.populate(text=text)
    subsetter.subset(font)
    font.flavor = 'woff2'
    font.save(OUT/'map-font.woff2')

    c.write_json(OUT/'rigs.json',rigs)
    c.write_json(c.ROOT/'apps/pvz2/shell-provenance.json',{'repository':'https://github.com/Gzh0821/pvzge_web','commit':c.COMMIT,'sources':c.SOURCES,'outputs':{str(p.relative_to(c.OUT)):{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in sorted(OUT.rglob('*')) if p.is_file()}})


if __name__ == '__main__':
    main()
