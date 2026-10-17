import './style.css';
import { json, assetUrl } from './assets/load';
import { readAudio, saveAudio, audioControls } from './audio';
import { BOARD, rowY, plantLabels, readLevel, type PlantKind, type Properties, type SourceLevel, type ZombieProperties } from './game/level';
import { Game, type PowerKind } from './game/model';
import type { ProgressStore } from './shell/progression';
import { availablePlants, type BattleLevel } from './game/levels';
import type { Scene } from './rendering/scene';
import { cubicInOut, introCamera } from './rendering/presentation';

const DESCRIPTIONS: Record<PlantKind,string> = {
  repeater:'双发射手连续发射两颗豌豆。',kernelpult:'玉米投手抛射玉米粒，偶尔用黄油定住僵尸。',melonpult:'西瓜投手的西瓜能伤害落点周围的僵尸。',
  bonkchoy:'菜问快速拳击前后靠近的僵尸。',
  gravebuster:'噬碑藤吞噬墓碑，为种植腾出空间。',
  twinsunflower:'双胞向日葵一次生产双倍阳光。',
  iceweed:'冰地刺伤害并减速踩在上面的僵尸。',
  peashooter:'豌豆射手向前发射豌豆，攻击所在行的僵尸。',
  sunflower:'向日葵为你生产额外的阳光。',
  wallnut:'坚果用坚硬的外壳保护身后的植物。',
  cabbagepult:'卷心菜投手能够越过墓碑，将卷心菜投向僵尸。',
  bloomerang:'回旋镖射手的回旋镖可以穿过三个目标，并在返回时再次造成伤害。',
  iceburg:'冰冻生菜会冻住靠近的僵尸，为其他植物争取时间。',
  potatomine:'土豆地雷需要时间准备，然后炸飞靠近的僵尸。',
};

export function createBattle(host: HTMLElement, onReturn: () => void, levelConfig: BattleLevel, progress: ProgressStore) {
  const listeners=new AbortController();
  host.dataset.mode=levelConfig.mode;
  const title = `${levelConfig.worldName} - 第${levelConfig.day}天`;
  let cardOrder: PlantKind[] = [];
  const $ = <T extends HTMLElement>(selector: string) => host.querySelector<T>(selector)!;
  host.innerHTML = `<section class="battle-frame" aria-label="${title}">
    <div id="canvas-host"></div>
    <div id="hud" hidden>
      <div class="sun-counter"><img alt="阳光"><b id="sun-count">50</b></div>
      <div class="seed-bank">${Array.from({length:6},(_,i)=>`<button class="seed" data-slot="${i}" aria-label="空卡槽" disabled><img alt=""><span class="seed-price"></span><span class="seed-cooldown"></span></button>`).join('')}</div>
      <button id="speed" class="battle-icon" aria-label="切换二倍速" aria-pressed="false"></button>
      <button id="pause" class="battle-icon" aria-label="暂停游戏"></button>
      <button id="shovel" class="battle-icon" aria-label="使用铲子"><img alt="铲子"></button>
      <button id="plant-food" aria-label="使用能量豆" hidden><img alt="能量豆"><b>0 / 3</b></button>
      <div id="conveyor" hidden aria-label="传送带"></div>
      <div id="powerups" hidden>${(['fire','snow','toss','zap','cherry'] as const).map((kind,i)=>`<button data-power="${kind}" aria-label="${['火焰','雪球','抛掷','闪电','樱桃炸弹'][i]}" title="${['按住并拖动喷火','按住并拖动投掷雪球','划过僵尸将它推离庭院','按住并拖动释放闪电','点击庭院使用樱桃炸弹'][i]}"><img alt="${['火焰','雪球','抛掷','闪电','樱桃炸弹'][i]}"></button>`).join('')}<progress id="power-time" max="1" value="1"></progress></div>
      <button id="laststand-start" class="battle-button" hidden>开始进攻</button><div id="game-tip" role="status" hidden></div>
      <div class="challenge-objective" hidden></div>
      <div class="level-name">${title}</div>
      <div id="wave-hud"><div id="wave-fill"></div><span id="wave-label"></span></div>
    </div>
    <button id="narrative" aria-label="继续对白" hidden><span class="speech"><span id="speech-line"></span><small>点击继续</small></span></button>
    <div id="seed-chooser" hidden>
      <section class="chooser-window" aria-label="选择植物">
        <div class="plant-description"><img id="plant-portrait" alt=""><div><h2 id="plant-name"></h2><p id="plant-description"></p></div></div>
        <p class="challenge-objective chooser-objective" hidden></p>
        <div class="chooser-cards"></div>
      </section>
      <button id="ready-back" class="battle-button">返回地图</button><button id="start" class="battle-button" disabled>开始战斗</button>
    </div>
    <div id="battle-announcement" role="status" hidden></div>
    <div id="overlay" hidden></div>
  </section><div class="battle-caption"><span>${title}</span><span>${levelConfig.mode==='match'?'翻开骆驼牌 · 配对相同图案':levelConfig.mode==='powerups'?'选择道具 · 按住或拖动攻击':levelConfig.mode==='conveyor'?'点击传送带植物 · 点击地块种植':'1–6 选卡 · 点击阳光收集'} · 空格暂停</span></div>`;

  let scene: Scene, properties: Properties, source: SourceLevel, game: Game;
  let selected: PlantKind | 'shovel' | 'food' | null = null;
  let screen: 'menu'|'loading'|'npc-enter'|'narrative'|'npc-exit'|'survey'|'returning'|'choosing'|'countdown'|'playing'|'pause'|'ending'|'result' = 'menu';
  let deck: PlantKind[] = [];
  let packetId:number|undefined;
  let pointerDown=false;
  let tipUntil=0;
  let foodTipShown=false;
  let narrativeLines:typeof scene.art.catalog.intro=[];
  let narrativeIndex=0;
  let outro=false;
  let transitionTime=0;
  let voice:HTMLAudioElement|null=null;
  let accumulator = 0, countdown = 0, speed = 1, warningUntil = 0;
  let preferences = readAudio();
  const cards = new Map<PlantKind,string>();
  const portraits = new Map<PlantKind,string>();
  const clips = new Map<string,HTMLAudioElement[]>();
  const music = new Audio(); music.loop = true; music.preload = 'none';
  const panel = (title: string, body: string) => {
    $('#overlay').innerHTML = `<section class="battle-window" role="dialog" aria-modal="true" aria-label="${title}"><h2>${title}</h2>${body}</section>`;
    $('#overlay').hidden = false;
  };
  const sound = (name: string) => {
    const variants = clips.get(name)!;
    const clip = variants[Math.floor(Math.random()*variants.length)];
    clip.volume=preferences.effects; clip.currentTime=0; if (clip.volume>0) void clip.play();
    return clip;
  };
  const playMusic = () => { music.volume=preferences.music; if(music.volume>0) void music.play(); };

  async function enter() {
    host.hidden=false; screen='loading'; host.dataset.screen=screen; preferences=readAudio();
    $('#overlay').innerHTML = `<section class="battle-loading" aria-label="${title}加载中">
      <img class="loading-scenery" src="${assetUrl('egypt/preview.webp')}" alt="">
      <div class="loading-destination"><span class="loading-chapter">时空之旅</span><h2>${levelConfig.worldName}</h2><span class="loading-day">第${levelConfig.day}天</span></div>
      <div class="loading-progress"><p id="load-status" role="status">正在准备庭院…</p><progress id="load-progress" aria-label="关卡资源加载进度" max="7" value="0"></progress></div>
    </section>`;
    $('#overlay').hidden = false;
    cardOrder=availablePlants(levelConfig,progress.ownedPlants());

    if (!scene) {
      const [{ Scene },props,level,flag,campaign] = await Promise.all([import('./rendering/scene'),json<Properties>('levels/properties.json'),json<SourceLevel>(levelConfig.source),json<ZombieProperties>('battle/flag.json'),levelConfig.day>1?json<Properties>('campaign/properties.json'):Promise.resolve(null)]);
      if(campaign){Object.assign(props.plants,campaign.plants);Object.assign(props.zombies,campaign.zombies);Object.assign(props.armors,campaign.armors);Object.assign(props,{grave:campaign.grave,projectiles:campaign.projectiles,powerups:campaign.powerups,plantAnimations:campaign.plantAnimations});}
      properties=props; properties.zombies.mummy_flag=flag; source=level; scene=new Scene();
      const parsed=readLevel(source);
      cardOrder=cardOrder.filter(kind=>!parsed.blacklist.includes(kind));
      const actorPlants=[...new Set([...(parsed.preset??(parsed.conveyor?parsed.conveyor.InitialPlantList.map(p=>p.PlantType):parsed.match||parsed.powerups?[]:cardOrder)),...parsed.initialPlants.map(p=>p.kind),...parsed.protectedPlants.map(p=>p.kind)])];
      await scene.init($('#canvas-host'),(done,total)=>{
        $('#load-status').textContent=`正在准备植物与庭院 ${done} / ${total}`;
        const progress=$<HTMLProgressElement>('#load-progress');progress.max=total;progress.value=done;
      },levelConfig.day,actorPlants,parsed);
      scene.onPoint=(x,y)=>{pointerDown=true;interact(x,y);};scene.onHover=hover;scene.onRelease=()=>{pointerDown=false;if(game?.power)game.powerPointer(game.power.x,game.power.y,false);};scene.onTick=tick;
      scene.onSound=sound;
      scene.onNPCEvent=(character,event)=>{
        const sounds:Record<string,string>={enter:'Enter',exit:'Exit',enter_brake:'Enter_Brake',exit_brake:'Exit_Brake',enter_shake:'Enter_Shake',exit_shake:'Exit_Shake'};
        if(event in sounds)sound(character+'/'+sounds[event]);
      };
      for(const [name,art] of Object.entries(scene.art.catalog.ui)) host.style.setProperty(`--art-${name}`,`url('${assetUrl(art.image)}')`);
      host.style.setProperty('--art-emptySlot',`url('${scene.art.image(scene.app,'cards','emptyslot','emptyslot')}')`);
      for(const kind of [...new Set([...actorPlants,...(levelConfig.firstReward.plant?[levelConfig.firstReward.plant]:[])])]){cards.set(kind,scene.art.card(scene.app,kind));if(actorPlants.includes(kind))portraits.set(kind,scene.portrait(kind));}

      $<HTMLImageElement>('.sun-counter img').src=scene.art.image(scene.app,'sunIcon');
      $<HTMLImageElement>('#shovel img').src=scene.art.image(scene.app,'shovel','Idle');
      for(const [name,paths] of Object.entries(scene.art.catalog.sounds)) clips.set(name,paths.map(path=>{const audio=new Audio(assetUrl(path));audio.preload='none';return audio;}));
      music.src=assetUrl(levelConfig.night||levelConfig.mode==='preset'||levelConfig.day===15?'campaign/minigame.mp3':'egypt/music.mp3');
      if(levelConfig.day>1){
        $<HTMLImageElement>('#plant-food img').src=scene.art.image(scene.app,'food','Idle');
        if(levelConfig.mode==='powerups')for(const kind of ['fire','snow','toss','zap','cherry'])$<HTMLImageElement>(`[data-power="${kind}"] img`).src=assetUrl(scene.art.catalog.ui['power-'+kind].image);

      }
    }
    cardOrder = availablePlants(levelConfig,progress.ownedPlants()).filter(kind=>!readLevel(source).blacklist.includes(kind));
    $('.chooser-cards').innerHTML = cardOrder.map(kind=>`<button data-choose="${kind}" class="seed choose-card" aria-label="选择${plantLabels[kind]}" aria-pressed="false"><img alt="${plantLabels[kind]}" src="${cards.get(kind)!}"><span class="seed-price">${properties.plants[kind].SunCost}</span></button>`).join('');
    for(const kind of cardOrder)$(`[data-choose="${kind}"]`).onclick=()=>{
      describe(kind);const index=deck.indexOf(kind);if(index===-1&&deck.length<6){deck.push(kind);sound('cardChosen');}else if(index!==-1){deck.splice(index,1);sound('cardCancel');}updateDeck();
    };
    $('#overlay').hidden=true;
    narrativeLines=levelConfig.narrative===null?[]:levelConfig.day===1?scene.art.catalog.intro:scene.art.campaign.narratives[levelConfig.day===5&&progress.isComplete(levelConfig.id)?'POWERUPS_TUTORIAL_REPEAT':levelConfig.narrative];
    if(!narrativeLines.length||progress.isComplete(levelConfig.id)&&levelConfig.day!==5)survey();else {narrativeIndex=0;screen='npc-enter';host.dataset.screen=screen;scene.enterNarrative();}
  }
  function nextNarrative() {
    voice?.pause();voice=null;
    const lines=narrativeLines.filter(step=>step.Lines);
    const step=lines[narrativeIndex++];
    if(!step){$('#narrative').hidden=true;screen='npc-exit';host.dataset.screen=screen;scene.exitNarrative();return;}
    screen='narrative';host.dataset.screen=screen;$('#overlay').hidden=true;$('#hud').hidden=true;
    $('#narrative').hidden=false;$('#narrative').dataset.character=step.Character;
    $('#speech-line').textContent=step.Lines!.zh;scene.narrative(step.Character,step.Animation!);voice=sound(step.Voice!);
  }
  function prepareGame(){
    game=new Game(readLevel(source),properties,scene.timing,zombie=>scene.absorptionTarget(zombie),Date.now()>>>0,!progress.isComplete(levelConfig.id));
    game.foodLimit=progress.rewards().some(r=>r.kind==='upgrade'&&r.id===2)?4:3;
    if(!game.level.lastStand&&progress.rewards().some(r=>r.kind==='upgrade'&&r.id===0))game.sun+=25;
    const objective=[game.level.mold.length?'霉菌覆盖的地块不能种植':'',game.level.mustProtect?`保护好 ${game.level.mustProtect} 株植物`:'',game.level.maxPlants!==null?`同时种植不超过 ${game.level.maxPlants} 株植物`:'',game.level.lastStand?`用 ${game.level.lastStand.sun} 阳光布置防线，再开始进攻`:''].filter(Boolean).join(' · ');
    for(const element of host.querySelectorAll<HTMLElement>('.challenge-objective')){element.textContent=objective;element.hidden=!objective;}
  }
  function survey() {
    prepareGame();
    screen='survey';host.dataset.screen=screen;transitionTime=0;
    $('#hud').hidden=true;$('#overlay').hidden=true;$('#seed-chooser').hidden=true;
    scene.preview(game.level.waves.flat(),game.graves,game.plants,game.level);scene.start();playMusic();
  }
  function describe(kind: PlantKind) {
    $('#plant-name').textContent=plantLabels[kind];$('#plant-description').textContent=DESCRIPTIONS[kind];
    $<HTMLImageElement>('#plant-portrait').src=portraits.get(kind)!;
  }
  function updateDeck() {
    for (let i=0;i<6;i++) {
      const button=$<HTMLButtonElement>(`[data-slot="${i}"]`),kind=deck[i];
      button.disabled=screen==='choosing'?!kind:!kind||game.sun<properties.plants[kind].SunCost||!game.preparing&&game.cooldowns[kind]>0;
      button.classList.toggle('empty',!kind);button.classList.toggle('selected',selected===kind);
      button.setAttribute('aria-label',kind?`${screen==='choosing'?'移除':'选择'}${plantLabels[kind]}`:'空卡槽');
      const image=button.querySelector<HTMLImageElement>('img')!;image.hidden=!kind;if(kind)image.src=cards.get(kind)!;
      button.querySelector<HTMLElement>('.seed-price')!.textContent=kind?String(properties.plants[kind].SunCost):'';
      const cooldown=button.querySelector<HTMLElement>('.seed-cooldown')!;
      cooldown.style.height=kind&&screen!=='choosing'?`${game.cooldowns[kind]/properties.plants[kind].Cooldown*100}%`:'0';
    }
    for(const kind of cardOrder) $(`[data-choose="${kind}"]`).setAttribute('aria-pressed',String(deck.includes(kind)));
    $<HTMLButtonElement>('#start').disabled=deck.length===0;
  }
  function chooseSeeds() {
    prepareGame();
    scene.preview(game.level.waves.flat(),game.graves,game.plants,game.level);scene.setCamera(scene.art.catalog.presentation.seedChoosingCameraX);scene.start();openChooser();
  }
  function openChooser() {
    if(levelConfig.mode!=='seedbank'){deck=readLevel(source).preset??[];start();return;}
    screen='choosing';deck=[];selected=null;speed=1;
    $('#overlay').hidden=true;$('#hud').hidden=false;$('#seed-chooser').hidden=false;$('#battle-announcement').hidden=true;
    host.dataset.screen=screen;$('#sun-count').textContent=String(game.sun);
    describe(cardOrder[0]);updateDeck();
    sound('cardChosen');playMusic();
  }
  function start() {
    selected=null;packetId=undefined;foodTipShown=false;tipUntil=0;$('#game-tip').hidden=true;pointerDown=false;
    accumulator=0;countdown=0;speed=1;screen='returning';transitionTime=0;host.dataset.screen=screen;
    $('#seed-chooser').hidden=true;$('#overlay').hidden=true;$('#battle-announcement').hidden=true;$('#hud').hidden=false;
    $('#plant-food').hidden=levelConfig.day===1||levelConfig.mode==='powerups'||levelConfig.mode==='match';$('#powerups').hidden=levelConfig.mode!=='powerups';$('#conveyor').hidden=levelConfig.mode!=='conveyor';
    $('#speed').setAttribute('aria-pressed','false');sound('letsRock');sound('cameraMove');
  }
  function menu() {
    scene.stop();scene.reset();music.pause();screen='menu';selected=null;
    $('#hud').hidden=true;$('#overlay').hidden=true;$('#seed-chooser').hidden=true;host.hidden=true;onReturn();
  }
  function updateHud() {
    $('#sun-count').textContent=String(game.sun);if(levelConfig.mode==='seedbank'||levelConfig.mode==='preset')updateDeck();
    $('#plant-food b').textContent=`${game.food} / ${game.foodLimit}`;$('#plant-food').classList.toggle('selected',selected==='food');
    if(levelConfig.mode==='conveyor')updateConveyor();
    for(const button of host.querySelectorAll<HTMLButtonElement>('[data-power]')){button.classList.toggle('selected',game.power?.kind===button.dataset.power);button.disabled=!!game.power&&game.power.remaining>0;}
    $<HTMLProgressElement>('#power-time').value=game.power&&game.power.remaining>0?game.power.remaining/game.power.total:1;
    if(game.time>tipUntil)$('#game-tip').hidden=true;
    if(levelConfig.day===2&&!foodTipShown&&game.pickups.some(p=>p.kind==='food')){foodTipShown=true;tip('点击发光的能量豆收集，再点击左下角能量豆，对植物使用。',12);}
    $('#shovel').classList.toggle('selected',selected==='shovel');
    $('#wave-label').textContent=game.wave===0?'':`${game.wave} / ${game.level.waves.length}`;
    $('#wave-fill').style.width=`${game.wave/game.level.waves.length*100}%`;
  }
  function hover(x: number,y: number) {
    if(screen!=='playing')return;
    if(game.power){game.powerPointer(x,y,pointerDown);return;}
    scene.highlightCell(selected?Math.floor((y-BOARD.top)/BOARD.cellHeight):-1,Math.floor((x-BOARD.left)/BOARD.cellWidth),selected==='shovel'?0xedb56a:0xe7fbb0);
  }
  function interact(x: number,y: number) {
    if(screen!=='playing')return;
    if(game.level.match){const z=[...game.zombies].sort((a,b)=>b.row-a.row).find(z=>Math.abs(z.x-x)<32&&y>rowY(z.row)-145&&y<rowY(z.row));if(z)game.flipCamel(z.id);return;}
    if(game.power){game.powerPointer(x,y,true,true);return;}
    const pickup=game.pickups.find(p=>Math.hypot(x-p.x,y-p.y)<38);
    if(pickup){game.collectPickup(pickup.id);sound('collect');updateHud();return;}
    const sun=[...game.suns].reverse().find(s=>Math.hypot(x-s.x,y-s.y)<38);
    if(sun){game.collect(sun.id);updateHud();return;}
    const column=Math.floor((x-BOARD.left)/BOARD.cellWidth),row=Math.floor((y-BOARD.top)/BOARD.cellHeight);
    if(selected==='shovel'){game.shovel(row,column);sound('shovelDig');}
    else if(selected==='food'){if(game.plantFood(row,column)){selected=null;scene.highlightCell(-1,-1,0);}}
    else if(selected&&game.plant(selected,row,column,packetId)){selected=null;scene.highlightCell(-1,-1,0);}
    updateHud();
  }
  function tick(dt: number) {
    if(screen==='npc-enter'||screen==='npc-exit') {
      if(scene.narrativeTick(dt)){if(screen==='npc-enter')nextNarrative();else if(outro){outro=false;finish();}else survey();}return;
    }
    if(screen==='narrative'){scene.narrativeTick(dt);return;}
    if(screen==='survey') {
      const intro=scene.art.catalog.presentation.camera,previous=transitionTime;transitionTime+=dt;
      if(previous<intro.PanLeftDuration&&transitionTime>=intro.PanLeftDuration)sound('cameraMove');
      scene.setCamera(introCamera(transitionTime,intro,scene.art.catalog.presentation.seedChoosingCameraX));scene.previewTick(dt);
      if(transitionTime>=intro.PanLeftDuration+intro.PanMoveRightTime+intro.PanRightDuration+intro.PanMoveLeftTime)openChooser();return;
    }
    if(screen==='returning') {
      const presentation=scene.art.catalog.presentation;transitionTime+=dt;
      const t=Math.min(1,transitionTime/presentation.camera.PanMoveLeftTime);
      scene.frameCombat(cubicInOut(t));scene.previewTick(dt);
      if(t===1){scene.reset();scene.frameCombat();scene.sync(game,0);updateHud();screen=game.preparing?'playing':'countdown';host.dataset.screen=screen;$('#laststand-start').hidden=!game.preparing;$('#battle-announcement').hidden=game.preparing;$('#battle-announcement').textContent='准备…';scene.start();if(!game.preparing)sound('readySetPlant');playMusic();}return;
    }
    if(screen==='choosing'){scene.previewTick(dt);return;}
    if(screen==='countdown') {
      const [ready,set,plant]=scene.art.catalog.presentation.readySetPlant;
      countdown+=dt;$('#battle-announcement').textContent=countdown<ready?'准备…':countdown<ready+set?'安放…':'种植！';scene.sync(game,dt);
      if(countdown>=ready+set+plant){screen='playing';host.dataset.screen=screen;$('#battle-announcement').hidden=true;if(levelConfig.mode==='match')tip('翻开骆驼牌，找到两张相同图案即可消除。',10);if(levelConfig.mode==='conveyor')tip('点击传送带上的植物，再点击地块种植。',8);if(levelConfig.mode==='powerups')tip('选择下方道具，按住并拖动手指来攻击僵尸。',10);}
      return;
    }
    if(screen==='ending'){scene.sync(game,dt);if(!scene.hasDeathAnimations){if(game.phase==='won'&&levelConfig.outro&&!progress.isComplete(levelConfig.id)){outro=true;narrativeLines=scene.art.campaign.narratives[levelConfig.outro];narrativeIndex=0;screen='npc-enter';host.dataset.screen=screen;$('#hud').hidden=true;scene.enterNarrative();}else finish();}return;}
    if(screen!=='playing')return;
    accumulator+=Math.min(dt,.1)*speed;let advanced=0;
    while(accumulator>=1/60&&game.phase==='playing'){game.tick(1/60);accumulator-=1/60;advanced+=1/60;}
    scene.sync(game,advanced);updateHud();
    for(const event of game.events) {
      if(event.type==='flip')sound('camelTouch/flipSound');
      if(event.type==='match')sound('camelTouch/matchSound');
      if(event.type==='plant')sound('plantOnFloor');
      if(event.type==='shot')sound('shoot');
      if(event.type==='sun')sound('collect');
      if(event.type==='explode')sound('spudow');
      if(event.type==='sprout')tip('获得植物幼苗！通关时一起领取。',7);
      if(event.type==='storm'){sound('awooga');tip('沙尘暴来袭！',5);}
      if(event.type==='wave'&&(game.wave===1||game.wave===game.level.waves.length)){
        sound(game.wave===game.level.waves.length?'finalWave':'awooga');
        $('#battle-announcement').textContent=game.wave===game.level.waves.length?'最后一波！':'僵尸来了！';$('#battle-announcement').hidden=false;warningUntil=game.time+3;
      }
    }
    if(game.time>warningUntil)$('#battle-announcement').hidden=true;
    game.events.length=0;
    if(game.phase==='won'){screen='ending';host.dataset.screen=screen;}else if(game.phase==='lost')finish();
  }
  function tip(text:string,duration:number){$('#game-tip').textContent=text;$('#game-tip').hidden=false;tipUntil=game.time+duration;}
  function updateConveyor(){
    const element=$('#conveyor');
    for(const button of element.querySelectorAll<HTMLButtonElement>('[data-packet]'))if(!game.conveyor.some(c=>String(c.id)===button.dataset.packet))button.remove();
    for(const packet of game.conveyor){
      let button=element.querySelector<HTMLButtonElement>(`[data-packet="${packet.id}"]`);
      if(!button){button=document.createElement('button');button.className='seed';button.dataset.packet=String(packet.id);button.setAttribute('aria-label',`选择${plantLabels[packet.kind]}`);button.innerHTML=`<img src="${cards.get(packet.kind)!}" alt="${plantLabels[packet.kind]}">`;button.onclick=()=>{selected=packet.kind;packetId=packet.id;updateHud();};element.append(button);}
      button.style.left=`${packet.position*19}%`;button.style.top=`${packet.lane*50}%`;button.classList.toggle('selected',packetId===packet.id&&selected===packet.kind);
    }
  }
  function bindAudio() {
    for(const input of host.querySelectorAll<HTMLInputElement>('[data-volume]'))input.oninput=()=>{
      preferences[input.dataset.volume as 'music'|'effects']=Number(input.value);saveAudio(preferences);
    };
  }
  function pause() {
    if(screen!=='playing')return;
    game.phase='paused';screen='pause';scene.stop();music.pause();sound('pause');
    panel('暂停',`<p>${title}</p>${audioControls(preferences)}<div class="pause-actions"><button id="exit" class="battle-button">退出地图</button><button id="restart" class="battle-button">重新开始</button><button id="resume" class="battle-button">继续</button></div>`);
    $('#resume').onclick=resume;$('#restart').onclick=chooseSeeds;$('#exit').onclick=menu;bindAudio();
  }
  function resume() {game.phase='playing';screen='playing';accumulator=0;$('#overlay').hidden=true;playMusic();scene.start();}
  function finish() {
    screen='result';scene.stop();scene.render();music.pause();$('#battle-announcement').hidden=true;
    if(game.phase==='won') {
      const first=!progress.isComplete(levelConfig.id);
      const reward=levelConfig.firstReward;
      const rewardImage=first?(reward.plant?cards.get(reward.plant)!:levelConfig.day===7?assetUrl(scene.art.catalog.ui['note-egypt'].image):scene.art.image(scene.app,'reward',levelConfig.day===4?'powerups':[6,11,15,22].includes(levelConfig.day)?'Pinata':reward.image,[6,11,15,22].includes(levelConfig.day)?'Upgrades':[17,21].includes(levelConfig.day)?'Upgrades':[10,14,16,18,20].includes(levelConfig.day)?'CoinBag':undefined)):'';
      const sprouts=game.sprouts+game.pickups.filter(p=>p.kind==='sprout').length;
      panel('关卡完成',`${first?`<img class="map-reward" src="${rewardImage}" alt="${levelConfig.firstReward.label}"><p>获得${levelConfig.firstReward.label}</p>`:`<p>${title}</p>`}${sprouts>0?`<p>植物幼苗 × ${sprouts}</p>`:''}<button id="result-map" class="battle-button">继续</button>`);
      $('#result-map').onclick=()=>{progress.finish(levelConfig.world,levelConfig.id,sprouts);menu();};
    } else {
      panel(game.lossReason==='plants'?'植物数量超过了关卡限制！':game.lossReason==='sun'?'消耗的阳光超过了关卡限制！':game.lossReason==='protected'?'需要保护的植物被吃掉了！':'僵尸吃掉了你的脑子！','<button id="again" class="battle-button">重新开始</button><button id="result-map" class="battle-button">返回地图</button>');
      $('#again').onclick=chooseSeeds;$('#result-map').onclick=menu;
    }
  }
  $('#plant-food').onclick=()=>{if(screen==='playing'&&game.food>0){selected=selected==='food'?null:'food';updateHud();}};
  for(const button of host.querySelectorAll<HTMLButtonElement>('[data-power]'))button.onclick=()=>{if(screen==='playing'&&game.selectPower(button.dataset.power as PowerKind)){selected=null;const soundName:Partial<Record<PowerKind,string>>={fire:'powerUpFlameStart',snow:'powerUpSnowStart',zap:'powerUpWizardStart',cherry:'powerUpCherryStart'};const name=soundName[button.dataset.power as PowerKind];if(name)sound(name);tip(button.title,5);updateHud();}};
  $('#narrative').onclick=nextNarrative;
  $('#laststand-start').onclick=()=>{game.startLastStand();screen='countdown';host.dataset.screen=screen;countdown=0;$('#laststand-start').hidden=true;$('#battle-announcement').hidden=false;$('#battle-announcement').textContent='准备…';sound('readySetPlant');};
  $('#pause').onclick=pause;$('#start').onclick=start;$('#ready-back').onclick=menu;
  $('#speed').onclick=()=>{if(screen==='playing'){speed=speed===1?2:1;$('#speed').setAttribute('aria-pressed',String(speed===2));}};
  $('#shovel').onclick=()=>{if(screen==='playing'){selected=selected==='shovel'?null:'shovel';updateHud();}};
  for(let i=0;i<6;i++)$(`[data-slot="${i}"]`).onclick=()=>{
    if(screen==='choosing'){deck.splice(i,1);sound('cardCancel');updateDeck();}
    else if(screen==='playing'){selected=selected===deck[i]?null:deck[i];updateHud();}
  };
  window.addEventListener('keydown',event=>{
    if(host.hidden||event.repeat)return;
    if(event.code==='Space'&&(screen==='playing'||screen==='pause')){event.preventDefault();screen==='playing'?pause():resume();}
    if(event.key==='Escape'){if(screen==='pause')resume();else if(screen==='playing'){selected=null;if(game.power?.remaining===0)game.power=null;scene.highlightCell(-1,-1,0);}}
    if(screen!=='playing')return;
    if((levelConfig.mode==='seedbank'||levelConfig.mode==='preset')&&'123456'.includes(event.key)&&event.key.length===1){const i=Number(event.key)-1;if(!$<HTMLButtonElement>(`[data-slot="${i}"]`).disabled)selected=deck[i];}
    updateHud();
  },{signal:listeners.signal});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();},{signal:listeners.signal});
  return {enter,dispose(){listeners.abort();voice?.pause();music.pause();for(const variants of clips.values())for(const clip of variants)clip.pause();scene.dispose();host.innerHTML='';}};
}
