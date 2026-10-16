import './style.css';
import { json, assetUrl } from './assets/load';
import { readAudio, saveAudio, audioControls } from './audio';
import { BOARD, PLANT_KINDS, plantLabels, readLevel, type PlantKind, type Properties, type SourceLevel, type ZombieProperties } from './game/level';
import { Game } from './game/model';
import { COMPLETE_KEY } from './shell/navigation';
import type { Scene } from './rendering/scene';
import { cubicInOut, introCamera } from './rendering/presentation';

const DESCRIPTIONS: Record<PlantKind,string> = {
  peashooter:'豌豆射手向前发射豌豆，攻击所在行的僵尸。',
  sunflower:'向日葵为你生产额外的阳光。',
  wallnut:'坚果用坚硬的外壳保护身后的植物。',
  potatomine:'土豆地雷需要时间准备，然后炸飞靠近的僵尸。',
};
const CARD_ORDER: PlantKind[] = ['peashooter','sunflower','wallnut','potatomine'];

export function createBattle(host: HTMLElement, onReturn: () => void) {
  const $ = <T extends HTMLElement>(selector: string) => host.querySelector<T>(selector)!;
  host.innerHTML = `<section class="battle-frame" aria-label="神秘埃及第1天">
    <div id="canvas-host"></div>
    <div id="hud" hidden>
      <div class="sun-counter"><img alt="阳光"><b id="sun-count">50</b></div>
      <div class="seed-bank">${Array.from({length:6},(_,i)=>`<button class="seed" data-slot="${i}" aria-label="空卡槽" disabled><img alt=""><span class="seed-price"></span><span class="seed-cooldown"></span></button>`).join('')}</div>
      <button id="speed" class="battle-icon" aria-label="切换二倍速" aria-pressed="false"></button>
      <button id="pause" class="battle-icon" aria-label="暂停游戏"></button>
      <button id="shovel" class="battle-icon" aria-label="使用铲子"><img alt="铲子"></button>
      <div class="level-name">神秘埃及 - 第1天</div>
      <div id="wave-hud"><div id="wave-fill"></div><span id="wave-label"></span></div>
    </div>
    <button id="narrative" aria-label="继续对白" hidden><span class="speech"><span id="speech-line"></span><small>点击继续</small></span></button>
    <div id="seed-chooser" hidden>
      <section class="chooser-window" aria-label="选择植物">
        <div class="plant-description"><img id="plant-portrait" alt=""><div><h2 id="plant-name"></h2><p id="plant-description"></p></div></div>
        <div class="chooser-cards">${CARD_ORDER.map(kind=>`<button data-choose="${kind}" class="seed choose-card" aria-label="选择${plantLabels[kind]}" aria-pressed="false"><img alt="${plantLabels[kind]}"><span class="seed-price"></span></button>`).join('')}</div>
      </section>
      <button id="ready-back" class="battle-button">返回地图</button><button id="start" class="battle-button" disabled>开始战斗</button>
    </div>
    <div id="battle-announcement" role="status" hidden></div>
    <div id="overlay" hidden></div>
  </section><div class="battle-caption"><span>神秘埃及 · 第1天</span><span>1–4 选卡 · 点击阳光收集 · 空格暂停</span></div>`;

  let scene: Scene, properties: Properties, source: SourceLevel, game: Game;
  let selected: PlantKind | 'shovel' | null = null;
  let screen: 'menu'|'loading'|'npc-enter'|'narrative'|'npc-exit'|'survey'|'returning'|'choosing'|'countdown'|'playing'|'pause'|'ending'|'result' = 'menu';
  let deck: PlantKind[] = [];
  let narrativeIndex=0;
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
    $('#overlay').innerHTML = `<section class="battle-loading" aria-label="神秘埃及第1天加载中">
      <img class="loading-scenery" src="${assetUrl('egypt/preview.webp')}" alt="">
      <div class="loading-destination"><span class="loading-chapter">时空之旅</span><h2>神秘埃及</h2><span class="loading-day">第1天</span></div>
      <div class="loading-progress"><p id="load-status" role="status">正在准备庭院…</p><progress id="load-progress" aria-label="关卡资源加载进度" max="7" value="0"></progress></div>
    </section>`;
    $('#overlay').hidden = false;
    if (!scene) {
      const [{ Scene },props,level,flag] = await Promise.all([import('./rendering/scene'),json<Properties>('levels/properties.json'),json<SourceLevel>('levels/egypt1.source.json'),json<ZombieProperties>('battle/flag.json')]);
      properties=props; properties.zombies.mummy_flag=flag; source=level; scene=new Scene();
      await scene.init($('#canvas-host'),(done,total)=>{
        $('#load-status').textContent=`正在准备植物与庭院 ${done} / ${total}`;
        const progress=$<HTMLProgressElement>('#load-progress');progress.max=total;progress.value=done;
      });
      scene.onPoint=interact;scene.onHover=hover;scene.onTick=tick;
      scene.onSound=sound;
      scene.onNPCEvent=(character,event)=>{
        const sounds:Record<string,string>={enter:'Enter',exit:'Exit',enter_brake:'Enter_Brake',exit_brake:'Exit_Brake',enter_shake:'Enter_Shake',exit_shake:'Exit_Shake'};
        if(event in sounds)sound(character+'/'+sounds[event]);
      };
      for(const [name,art] of Object.entries(scene.art.catalog.ui)) host.style.setProperty(`--art-${name}`,`url('${assetUrl(art.image)}')`);
      host.style.setProperty('--art-emptySlot',`url('${scene.art.image(scene.app,'cards','emptyslot','emptyslot')}')`);
      for(const kind of PLANT_KINDS) {cards.set(kind,scene.art.card(scene.app,kind));portraits.set(kind,scene.portrait(kind));}
      for(const kind of CARD_ORDER) {
        $<HTMLImageElement>(`[data-choose="${kind}"] img`).src=cards.get(kind)!;
        $(`[data-choose="${kind}"] .seed-price`).textContent=String(properties.plants[kind].SunCost);
      }
      $<HTMLImageElement>('.sun-counter img').src=scene.art.image(scene.app,'sunIcon');
      $<HTMLImageElement>('#shovel img').src=scene.art.image(scene.app,'shovel','Idle');
      for(const [name,paths] of Object.entries(scene.art.catalog.sounds)) clips.set(name,paths.map(path=>{const audio=new Audio(assetUrl(path));audio.preload='none';return audio;}));
      music.src=assetUrl('egypt/music.mp3');
    }
    $('#overlay').hidden=true;
    if(localStorage.getItem(COMPLETE_KEY)==='1')survey();else {narrativeIndex=0;screen='npc-enter';host.dataset.screen=screen;scene.enterNarrative();}
  }
  function nextNarrative() {
    voice?.pause();voice=null;
    const lines=scene.art.catalog.intro.filter(step=>step.Lines);
    const step=lines[narrativeIndex++];
    if(!step){$('#narrative').hidden=true;screen='npc-exit';host.dataset.screen=screen;scene.exitNarrative();return;}
    screen='narrative';host.dataset.screen=screen;$('#overlay').hidden=true;$('#hud').hidden=true;
    $('#narrative').hidden=false;$('#narrative').dataset.character=step.Character;
    $('#speech-line').textContent=step.Lines!.zh;scene.narrative(step.Character,step.Animation!);voice=sound(step.Voice!);
  }
  function survey() {
    screen='survey';host.dataset.screen=screen;transitionTime=0;
    $('#hud').hidden=true;$('#overlay').hidden=true;$('#seed-chooser').hidden=true;
    scene.preview();scene.start();playMusic();
  }
  function describe(kind: PlantKind) {
    $('#plant-name').textContent=plantLabels[kind];$('#plant-description').textContent=DESCRIPTIONS[kind];
    $<HTMLImageElement>('#plant-portrait').src=portraits.get(kind)!;
  }
  function updateDeck() {
    for (let i=0;i<6;i++) {
      const button=$<HTMLButtonElement>(`[data-slot="${i}"]`),kind=deck[i];
      button.disabled=screen==='choosing'?!kind:!kind||game.sun<properties.plants[kind].SunCost||game.cooldowns[kind]>0;
      button.classList.toggle('empty',!kind);button.classList.toggle('selected',selected===kind);
      button.setAttribute('aria-label',kind?`${screen==='choosing'?'移除':'选择'}${plantLabels[kind]}`:'空卡槽');
      const image=button.querySelector<HTMLImageElement>('img')!;image.hidden=!kind;if(kind)image.src=cards.get(kind)!;
      button.querySelector<HTMLElement>('.seed-price')!.textContent=kind?String(properties.plants[kind].SunCost):'';
      const cooldown=button.querySelector<HTMLElement>('.seed-cooldown')!;
      cooldown.style.height=kind&&screen!=='choosing'?`${game.cooldowns[kind]/properties.plants[kind].Cooldown*100}%`:'0';
    }
    for(const kind of CARD_ORDER) $(`[data-choose="${kind}"]`).setAttribute('aria-pressed',String(deck.includes(kind)));
    $<HTMLButtonElement>('#start').disabled=deck.length===0;
  }
  function chooseSeeds() {
    scene.preview();scene.setCamera(scene.art.catalog.presentation.seedChoosingCameraX);scene.start();openChooser();
  }
  function openChooser() {
    screen='choosing';deck=[];selected=null;speed=1;
    $('#overlay').hidden=true;$('#hud').hidden=false;$('#seed-chooser').hidden=false;$('#battle-announcement').hidden=true;
    host.dataset.screen=screen;$('#sun-count').textContent='50';
    describe('peashooter');updateDeck();
    sound('cardChosen');playMusic();
  }
  function start() {
    game=new Game(readLevel(source),properties,scene.timing,zombie=>scene.absorptionTarget(zombie),Date.now()>>>0);
    selected=null;accumulator=0;countdown=0;speed=1;screen='returning';transitionTime=0;host.dataset.screen=screen;
    $('#seed-chooser').hidden=true;$('#overlay').hidden=true;$('#battle-announcement').hidden=true;
    $('#speed').setAttribute('aria-pressed','false');sound('letsRock');sound('cameraMove');
  }
  function menu() {
    scene.stop();scene.reset();music.pause();screen='menu';selected=null;
    $('#hud').hidden=true;$('#overlay').hidden=true;$('#seed-chooser').hidden=true;host.hidden=true;onReturn();
  }
  function updateHud() {
    $('#sun-count').textContent=String(game.sun);updateDeck();
    $('#shovel').classList.toggle('selected',selected==='shovel');
    $('#wave-label').textContent=game.wave===0?'':`${game.wave} / ${game.level.waves.length}`;
    $('#wave-fill').style.width=`${game.wave/game.level.waves.length*100}%`;
  }
  function hover(x: number,y: number) {
    if(screen!=='playing')return;
    scene.highlightCell(selected?Math.floor((y-BOARD.top)/BOARD.cellHeight):-1,Math.floor((x-BOARD.left)/BOARD.cellWidth),selected==='shovel'?0xedb56a:0xe7fbb0);
  }
  function interact(x: number,y: number) {
    if(screen!=='playing')return;
    const sun=[...game.suns].reverse().find(s=>Math.hypot(x-s.x,y-s.y)<38);
    if(sun){game.collect(sun.id);updateHud();return;}
    const column=Math.floor((x-BOARD.left)/BOARD.cellWidth),row=Math.floor((y-BOARD.top)/BOARD.cellHeight);
    if(selected==='shovel'){game.shovel(row,column);sound('shovelDig');}
    else if(selected&&game.plant(selected,row,column)){selected=null;scene.highlightCell(-1,-1,0);}
    updateHud();
  }
  function tick(dt: number) {
    if(screen==='npc-enter'||screen==='npc-exit') {
      if(scene.narrativeTick(dt)){if(screen==='npc-enter')nextNarrative();else survey();}return;
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
      if(t===1){scene.reset();scene.frameCombat();scene.sync(game,0);updateHud();screen='countdown';host.dataset.screen=screen;$('#battle-announcement').hidden=false;$('#battle-announcement').textContent='准备…';scene.start();sound('readySetPlant');playMusic();}return;
    }
    if(screen==='choosing'){scene.previewTick(dt);return;}
    if(screen==='countdown') {
      const [ready,set,plant]=scene.art.catalog.presentation.readySetPlant;
      countdown+=dt;$('#battle-announcement').textContent=countdown<ready?'准备…':countdown<ready+set?'安放…':'种植！';scene.sync(game,dt);
      if(countdown>=ready+set+plant){screen='playing';host.dataset.screen=screen;$('#battle-announcement').hidden=true;}
      return;
    }
    if(screen==='ending'){scene.sync(game,dt);if(!scene.hasDeathAnimations)finish();return;}
    if(screen!=='playing')return;
    accumulator+=Math.min(dt,.1)*speed;let advanced=0;
    while(accumulator>=1/60&&game.phase==='playing'){game.tick(1/60);accumulator-=1/60;advanced+=1/60;}
    scene.sync(game,advanced);updateHud();
    for(const event of game.events) {
      if(event.type==='plant')sound('plantOnFloor');
      if(event.type==='shot')sound('shoot');
      if(event.type==='sun')sound('collect');
      if(event.type==='explode')sound('spudow');
      if(event.type==='wave'&&(game.wave===1||game.wave===10)){
        sound(game.wave===10?'finalWave':'awooga');
        $('#battle-announcement').textContent=game.wave===10?'最后一波！':'僵尸来了！';$('#battle-announcement').hidden=false;warningUntil=game.time+3;
      }
    }
    if(game.time>warningUntil)$('#battle-announcement').hidden=true;
    game.events.length=0;
    if(game.phase==='won'){screen='ending';host.dataset.screen=screen;}else if(game.phase==='lost')finish();
  }
  function bindAudio() {
    for(const input of host.querySelectorAll<HTMLInputElement>('[data-volume]'))input.oninput=()=>{
      preferences[input.dataset.volume as 'music'|'effects']=Number(input.value);saveAudio(preferences);
    };
  }
  function pause() {
    if(screen!=='playing')return;
    game.phase='paused';screen='pause';scene.stop();music.pause();sound('pause');
    panel('暂停',`<p>神秘埃及 - 第1天</p>${audioControls(preferences)}<div class="pause-actions"><button id="exit" class="battle-button">退出地图</button><button id="restart" class="battle-button">重新开始</button><button id="resume" class="battle-button">继续</button></div>`);
    $('#resume').onclick=resume;$('#restart').onclick=chooseSeeds;$('#exit').onclick=menu;bindAudio();
  }
  function resume() {game.phase='playing';screen='playing';accumulator=0;$('#overlay').hidden=true;playMusic();scene.start();}
  function finish() {
    screen='result';scene.stop();scene.render();music.pause();$('#battle-announcement').hidden=true;
    if(game.phase==='won') {
      const first=localStorage.getItem(COMPLETE_KEY)!=='1';
      panel('关卡完成',`${first?`<img class="map-reward" src="${scene.art.image(scene.app,'reward','map')}" alt="世界地图奖励"><p>获得世界地图</p>`:'<p>神秘埃及 - 第1天</p>'}<button id="result-map" class="battle-button">继续</button>`);
      $('#result-map').onclick=()=>{localStorage.setItem(COMPLETE_KEY,'1');menu();};
    } else {
      panel('僵尸吃掉了你的脑子！','<button id="again" class="battle-button">重新开始</button><button id="result-map" class="battle-button">返回地图</button>');
      $('#again').onclick=chooseSeeds;$('#result-map').onclick=menu;
    }
  }
  $('#narrative').onclick=nextNarrative;
  $('#pause').onclick=pause;$('#start').onclick=start;$('#ready-back').onclick=menu;
  $('#speed').onclick=()=>{if(screen==='playing'){speed=speed===1?2:1;$('#speed').setAttribute('aria-pressed',String(speed===2));}};
  $('#shovel').onclick=()=>{if(screen==='playing'){selected=selected==='shovel'?null:'shovel';updateHud();}};
  for(const kind of CARD_ORDER)$(`[data-choose="${kind}"]`).onclick=()=>{
    describe(kind);const index=deck.indexOf(kind);if(index===-1){deck.push(kind);sound('cardChosen');}else{deck.splice(index,1);sound('cardCancel');}updateDeck();
  };
  for(let i=0;i<6;i++)$(`[data-slot="${i}"]`).onclick=()=>{
    if(screen==='choosing'){deck.splice(i,1);sound('cardCancel');updateDeck();}
    else if(screen==='playing'){selected=selected===deck[i]?null:deck[i];updateHud();}
  };
  window.addEventListener('keydown',event=>{
    if(host.hidden||event.repeat)return;
    if(event.code==='Space'&&(screen==='playing'||screen==='pause')){event.preventDefault();screen==='playing'?pause():resume();}
    if(event.key==='Escape'){if(screen==='pause')resume();else if(screen==='playing'){selected=null;scene.highlightCell(-1,-1,0);}}
    if(screen!=='playing')return;
    if('123456'.includes(event.key)&&event.key.length===1){const i=Number(event.key)-1;if(!$<HTMLButtonElement>(`[data-slot="${i}"]`).disabled)selected=deck[i];}
    updateHud();
  });
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
  return {enter};
}
