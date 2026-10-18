import { playAudio } from '../audio';
import { Rectangle } from 'pixi.js';
import { EventObject, type PixiArmatureDisplay } from 'pixi-dragonbones-runtime';
import { json, assetUrl } from '../assets/load';
import { readAudio } from '../audio';
import { NativeStage, cardSpec, plantCard } from './stage';
import { ArcadeProgress, PlantDecoding, localDate } from './arcade';
import { GardenProgress, stageOf } from './garden';
import { Tickets, ticketWeek } from './tickets';
import type { OuterCatalog, AlmanacEntry } from './types';
import type { ProgressStore } from '../shell/progression';
import type { Catalog } from '../shell/types';
import './style.css';
export type Feature='arcade'|'almanac'|'garden'|'tickets';
const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const signs:Record<string,string>={normal:'',merged:'',correct:'完全正确',change:'栏位错误',half:'部分正确',fault:'完全错误'};
const outerFont=new FontFace('PvZOuter',`url('${assetUrl('outer/outer-font.woff2')}')`).load().then(font=>{document.fonts.add(font);});
export class OuterFeatures {
  private catalog!:OuterCatalog;
  private stage!:NativeStage;
  private images=new Map<string,string>();
  private timer=0;
  private music=new Audio();
  private musicPlay:Promise<void>|null=null;
  private sounds=new Set<HTMLAudioElement>();
  private arcade:ArcadeProgress;
  private garden!:GardenProgress;
  private game:PlantDecoding|null=null;
  private eligible=false;
  private gardenIndex=0;
  private tool:'care'|'glove'|'cart'|'shovel'='care';
  private moving:number|null=null;
  private pending=new Set<Promise<unknown>>();
  private pots=new Map<number,PixiArmatureDisplay>();
  private plants=new Map<number,PixiArmatureDisplay>();
  private careRigs=new Map<number,PixiArmatureDisplay>();
  private carePlaying=new Set<number>();
  private $=<T extends HTMLElement>(selector:string)=>this.host.querySelector<T>(selector)!;
  constructor(private host:HTMLElement,private progress:ProgressStore,private storage:Pick<Storage,'getItem'|'setItem'>,private shell:Catalog,private exit:()=>Promise<void>){this.arcade=new ArcadeProgress(storage);}
  async open(feature:Feature){
    this.host.innerHTML='<div class="outer-canvas"></div><div class="outer-content"></div><button class="native-close outer-close" aria-label="返回地图"></button>';
    this.host.className='outer-feature';this.host.dataset.feature=feature;
    this.$<HTMLButtonElement>('.outer-close').disabled=true;
    [this.catalog]=await Promise.all([json<OuterCatalog>('outer/catalog.json'),outerFont]);
    this.stage=new NativeStage(this.$('.outer-canvas'),this.catalog.rigGroups);await this.stage.init();
    if(feature==='arcade'||feature==='almanac')await this.stage.load(cardSpec('plants','peashooter'));
    if(feature==='arcade')this.arcadeMenu();
    if(feature==='almanac')await this.almanac('plants',0);
    if(feature==='garden'){
      this.garden=new GardenProgress(this.storage,this.catalog.garden.gardens,this.progress.shop());this.garden.claim(this.progress.campaignRewards());
      await this.gardenArea();this.playMusic(this.catalog.garden.music);this.timer=window.setInterval(()=>this.gardenTick(),1000);
    }
    if(feature==='tickets')this.tickets();
    this.$<HTMLButtonElement>('.outer-close').disabled=false;this.$('.outer-close').onclick=()=>{void this.exit();};
  }
  private run(task:Promise<unknown>){this.host.inert=true;this.pending.add(task);void task.finally(()=>{this.pending.delete(task);if(this.pending.size===0)this.host.inert=false;});}
  private playMusic(path:string){this.music.loop=true;this.music.volume=readAudio().music;this.music.src=assetUrl(path);if(this.music.volume)this.musicPlay=playAudio(this.music);}
  private sound(path:string){const clip=new Audio(assetUrl(path));clip.volume=readAudio().effects;if(!clip.volume)return;this.sounds.add(clip);clip.onended=()=>this.sounds.delete(clip);void playAudio(clip);}
  private picture(entry:AlmanacEntry,zombie=false){const key=(zombie?'z:':'p:')+entry.kind;if(!this.images.has(key))this.images.set(key,zombie?this.stage.capture([cardSpec('background',entry.background),{...this.catalog.almanac.zombieCards.find(r=>r.armature==='Zombie')!,animation:entry.card},cardSpec('upper_dots','dotsNoPrice')],new Rectangle(-119,-75,238,150)):plantCard(this.stage,entry.card,entry.background));return this.images.get(key)!;}
  private plant(kind:string){return this.catalog.plants.find(p=>p.kind===kind)!;}
  private wallet(){const w=this.progress.shop().read();return `<div class="outer-wallet" aria-live="polite">金币 ${w.coin.toLocaleString('en-US')}　钻石 ${w.gem.toLocaleString('en-US')}</div>`;}
  private content(html:string){this.$('.outer-content').innerHTML=html;}
  private tickets(){const tickets=new Tickets(this.storage,this.progress.shop());tickets.refresh();const hours=Math.ceil((ticketWeek(new Date())+7*86400000-Date.now())/3600000);this.content(`<section class="outer-panel ticket-panel"><h2>门票</h2><img class="ticket-image" src="${assetUrl(this.shell.toolbar.find(d=>d.name==='TicketCounter')!.image!)}" alt="门票"><strong class="ticket-balance" aria-live="polite">${this.progress.shop().read().ticket}</strong><p>本周剩余 ${Math.floor(hours/24)} 天 ${hours%24} 小时</p><button class="native-button" data-collect>领取 100 张门票</button></section>`);this.$('[data-collect]').onclick=()=>{tickets.collect();this.tickets();};}
  private arcadeMenu(){
    this.music.pause();this.stage.clear();const saved=this.arcade.read();this.content(`<section class="outer-panel arcade-menu"><h2>附加小游戏！</h2><h3>植物解码</h3><div class="arcade-settings"><label>植物数量 <output>${saved.baseCount}</output><input aria-label="植物数量" type="range" min="3" max="10" value="${saved.baseCount}" data-base></label><label>密码长度 <output>${saved.codeCount}</output><input aria-label="密码长度" type="range" min="3" max="10" value="${saved.codeCount}" data-code></label></div><p class="arcade-help">选择两株植物，合成为密码植物。根据反馈调整栏位，解开全部密码。</p><p>${saved.date===localDate()?(saved.reward?`你今天已获得 ${saved.reward} 颗钻石！`:'你错过了今天的钻石！'):'每日首次挑战可获得钻石'}</p><button class="native-button" data-start>开始</button></section>`);
    for(const input of this.host.querySelectorAll<HTMLInputElement>('input'))input.oninput=()=>{input.previousElementSibling!.textContent=input.value;this.arcade.settings(+this.$<HTMLInputElement>('[data-base]').value,+this.$<HTMLInputElement>('[data-code]').value);};
    this.$('[data-start]').onclick=()=>{const settings=this.arcade.read();this.eligible=this.arcade.start(localDate());this.game=new PlantDecoding(this.catalog.arcade.features,settings.baseCount,settings.codeCount);this.playMusic(this.catalog.arcade.music);this.renderDecode(true);};
  }
  private decodeCard(kind:string,sign='normal'){
    const entry=this.plant(kind),key='decode:'+kind;
    if(!this.images.has(key))this.images.set(key,this.stage.capture([cardSpec('plants',entry.card)],new Rectangle(-119,-75,238,150)));
    const signKey='sign:'+sign;
    if(!this.images.has(signKey))this.images.set(signKey,this.stage.capture([cardSpec('sign',sign==='normal'||sign==='merged'?'none':sign)],new Rectangle(-35,-35,70,70)));
    const art=this.catalog.arcade.cardArt;
    return `<span class="decode-card" style="background-image:url('${assetUrl(art[sign].image)}')"><img class="decode-plant" src="${this.images.get(key)}" alt="${entry.name}"><img class="decode-frame" src="${assetUrl(art.frame.image)}" alt=""><img class="decode-mark" src="${this.images.get(signKey)}" alt="${signs[sign]}"></span>`;
  }
  private renderDecode(door=false){
    const game=this.game!,art=this.catalog.arcade.art;this.content(`<section class="decode-game" style="background-image:url('${assetUrl(art['78'].image)}')"><header><button class="native-button" data-menu>返回</button><b>植物解码</b><span>推测次数：${game.step}</span></header><div class="decode-bases" style="--bases:${game.bases.length}">${game.bases.map(kind=>`<button data-base-plant="${kind}" aria-label="选择${this.plant(kind).name}" aria-pressed="${!!game.picked&&'base' in game.picked&&game.picked.base===kind}">${this.decodeCard(kind)}</button>`).join('')}</div><div class="decode-main"><div class="decode-history" aria-label="推测记录">${game.history.map(row=>`<div>${row.plants.map((kind,i)=>`<span>${this.decodeCard(kind,row.signs[i])}</span>`).join('')}</div>`).join('')}</div><div class="decode-slots" style="--columns:${game.codes.length};background-image:url('${assetUrl(art['29'].image)}')">${game.slots.map((kind,i)=>`<button data-slot="${i}" aria-label="密码栏位 ${i+1}${kind?' '+this.plant(kind).name:''} ${signs[game.signs[i]]}" aria-pressed="${!!game.picked&&'slot' in game.picked&&game.picked.slot===i}" ${game.signs[i]==='correct'?'disabled':''}>${kind?this.decodeCard(kind,game.signs[i]):`<img src="${assetUrl(art['61'].image)}" alt="待解码">`}</button>`).join('')}</div><div class="decode-actions"><span>右键清空栏位</span><button data-confirm class="native-button" style="background-image:url('${assetUrl(art['3'].image)}')" ${game.ready&&!game.won?'':'disabled'}>确认</button></div></div>${door?`<div class="decode-door" style="background-image:url('${assetUrl(art['34'].image)}')"></div>`:''}</section>`);
    this.$('[data-menu]').onclick=()=>{this.music.pause();this.arcadeMenu();};
    for(const button of this.host.querySelectorAll<HTMLButtonElement>('[data-base-plant]'))button.onclick=()=>{game.pickBase(button.dataset.basePlant!);this.sound(this.catalog.arcade.sounds.pick);this.renderDecode();};
    for(const button of this.host.querySelectorAll<HTMLButtonElement>('[data-slot]')){button.onclick=()=>{game.place(+button.dataset.slot!);this.sound(this.catalog.arcade.sounds[game.signs[+button.dataset.slot!]==='merged'?'merge':'release']);this.renderDecode();};button.oncontextmenu=event=>{event.preventDefault();game.clear(+button.dataset.slot!);this.sound(this.catalog.arcade.sounds.remove);this.renderDecode();};}
    this.$('[data-confirm]').onclick=()=>{game.confirm();this.renderDecode();const sound=this.catalog.arcade.sounds[game.won?'correct':'half'];if(sound)this.sound(sound);if(game.won){const reward=this.eligible?game.reward:0;if(this.eligible){this.arcade.finish(reward);this.progress.shop().credit('gem',reward);this.eligible=false;}const result=document.createElement('div');result.className='decode-result outer-panel';result.innerHTML=`<h2>完全正确！</h2><p>推测次数：${game.step}</p><p>${reward?`获得 ${reward} 颗钻石`:'今日奖励已结算'}</p><button class="native-button">返回小游戏</button>`;this.$('.decode-game').append(result);result.querySelector('button')!.onclick=()=>this.arcadeMenu();}};
    this.$('.decode-history').scrollTop=this.$('.decode-history').scrollHeight;
  }
  private async almanac(category:'plants'|'zombies'|'upgrades',page:number){
    const zombie=category==='zombies';if(zombie)await this.stage.load(this.catalog.almanac.zombieCards.find(r=>r.armature==='Zombie')!);
    const upgradeRig=this.shell.nodes.upgrade.find(d=>d.kind==='rig')!;
    if(category==='upgrades')await this.stage.load({rig:upgradeRig.rig!,armature:'Upgrades',animation:'',group:'shell'});
    const entries=category==='upgrades'?this.catalog.upgrades.map((p,index)=>({id:index,kind:p.CODENAME,name:p.NAME.zh,card:p.SPRITENAME,world:'',background:'',stats:[],description:{Introduction:p.DESCRIPTION,Special:[],Chat:{zh:''},Elements:[]}})):this.catalog[category];
    const visible=entries.slice(page*24,page*24+24);
    const image=(entry:AlmanacEntry)=>category==='upgrades'?this.stage.capture([{rig:upgradeRig.rig!,armature:'Upgrades',animation:entry.card,group:'shell'}]):this.picture(entry,zombie);
    this.content(`<section class="outer-panel almanac"><h2>图鉴</h2><nav>${(['plants','zombies','upgrades'] as const).map((key,i)=>`<button class="native-button" data-category="${key}" aria-pressed="${key===category}">${['植物','僵尸','升级'][i]}</button>`).join('')}</nav><div class="almanac-grid" aria-label="图鉴卡片">${visible.map(p=>`<button data-entry="${p.kind}" aria-label="${p.name}"><img src="${image(p)}" alt=""><span>${p.name}</span></button>`).join('')}</div><article class="almanac-detail" aria-live="polite"></article><footer><button class="native-button" data-page="-1" ${page===0?'disabled':''}>上一页</button><span>${page+1} / ${Math.ceil(entries.length/24)}</span><button class="native-button" data-page="1" ${(page+1)*24>=entries.length?'disabled':''}>下一页</button></footer></section>`);
    const show=(entry:AlmanacEntry)=>{const d=entry.description;this.$('.almanac-detail').innerHTML=`<h3>${escape(entry.name)}</h3><img class="almanac-portrait" src="${image(entry)}" alt="${entry.name}"><p>${escape(d.Introduction.zh)}</p>${entry.stats.map(stat=>`<p><b>${escape(stat.label)}</b>：${escape(stat.value)}</p>`).join('')}${d.Special.map(s=>`<p><b>${escape(s.NAME.zh)}</b> ${escape(s.DESCRIPTION.zh)}</p>`).join('')}<p class="almanac-chat">${escape(d.Chat.zh)}</p>`;this.$('.almanac-detail').scrollTop=0;for(const button of this.host.querySelectorAll<HTMLButtonElement>('[data-entry]'))button.setAttribute('aria-pressed',String(button.dataset.entry===entry.kind));};
    for(const button of this.host.querySelectorAll<HTMLButtonElement>('[data-entry]'))button.onclick=()=>show(entries.find(p=>p.kind===button.dataset.entry)!);
    for(const button of this.host.querySelectorAll<HTMLButtonElement>('[data-category]'))button.onclick=()=>{this.$('.outer-content').inert=true;this.run(this.almanac(button.dataset.category as typeof category,0).then(()=>{this.$('.outer-content').inert=false;}));};
    for(const button of this.host.querySelectorAll<HTMLButtonElement>('[data-page]'))button.onclick=()=>{this.run(this.almanac(category,page+Number(button.dataset.page)));};show(visible[0]);
  }
  private async gardenArea(){
    this.tool='care';this.content('');this.stage.clear();this.pots.clear();this.plants.clear();this.careRigs.clear();this.carePlaying.clear();this.moving=null;
    const area=this.catalog.garden.gardens[this.gardenIndex];
    await this.stage.draw(area.draws);
    for(const key of ['flowerpot','floater','sproutPar','waterpourPar','fertilizerPar','jukeboxPar','pesticidePar','next','glove','cart','shovel'])await this.stage.load(this.catalog.garden.rigs[key]);
    const data=this.garden.read();
    for(const slot of data.areas[area.id])if(slot.plant)await this.stage.load(this.catalog.garden.actors[slot.plant.kind]);
    this.content(`<div class="garden-head"><h2>${area.name}</h2>${this.wallet()}<button class="native-button" data-sprouts>幼苗 ${data.sprouts} ＋</button></div><div class="garden-tools">${['next','glove','cart','shovel'].map((tool,i)=>`<button data-tool="${tool}" aria-label="${['切换花园','移动植物','手推车','铲除植物'][i]}"><img src="${this.stage.capture([this.catalog.garden.rigs[tool]])}" alt=""></button>`).join('')}</div><div class="garden-slots">${area.slots.map((slot,index)=>`<button class="garden-slot" data-garden-slot="${index}" style="left:${slot.x/10.24}%;top:${slot.y/6.4}%"></button>`).join('')}</div><p class="garden-status" role="status"></p><div class="garden-dialog" hidden></div>`);
    area.slots.forEach((slot,index)=>{if(slot.pot||slot.floater){const pot=this.stage.rig(this.catalog.garden.rigs[slot.pot?'flowerpot':'floater'],'Idle');pot.position.set(slot.x,slot.y);pot.scale.set(area.scale);this.stage.root.addChild(pot);this.pots.set(index,pot);}this.$(`[data-garden-slot="${index}"]`).onclick=()=>{this.run(this.gardenClick(index));};});
    this.$('[data-sprouts]').onclick=()=>this.sproutShop();
    for(const button of this.host.querySelectorAll<HTMLButtonElement>('[data-tool]'))button.onclick=()=>{const tool=button.dataset.tool!;if(tool==='next'){this.host.inert=true;this.gardenIndex=(this.gardenIndex+1)%this.catalog.garden.gardens.length;this.run(this.gardenArea().then(()=>{this.host.inert=false;}));}else{this.tool=this.tool===tool?'care':tool as typeof this.tool;this.moving=null;for(const other of this.host.querySelectorAll('[data-tool]'))other.setAttribute('aria-pressed',String(other===button&&this.tool!=='care'));}};
    this.gardenTick();await this.renderGardenPlants();
  }
  private gardenTick(){if(!this.host.querySelector('.garden-slots'))return;this.garden.update(Date.now());const area=this.catalog.garden.gardens[this.gardenIndex],data=this.garden.read();for(const tool of this.host.querySelectorAll<HTMLButtonElement>('[data-tool]'))tool.setAttribute('aria-pressed',String(tool.dataset.tool===this.tool));this.$('[data-sprouts]').textContent=`幼苗 ${data.sprouts} ＋`;this.$('.outer-wallet').outerHTML=this.wallet();
    area.slots.forEach((_,index)=>{const slot=data.areas[area.id][index],p=slot.plant,button=this.$<HTMLButtonElement>(`[data-garden-slot="${index}"]`);const pot=this.pots.get(index);if(pot){pot.tint=slot.unlocked?0xffffff:0x7a7a7a;const animation=p&&!p.stuck?'Idle_Golden':'Idle';if(pot.animation.lastAnimationName!==animation)pot.animation.play(animation,0);}button.innerHTML=!slot.unlocked?`<span class="garden-price" style="background-image:url('${assetUrl(this.catalog.garden.priceTag.image)}')">4000</span>`:'';button.setAttribute('aria-label',!slot.unlocked?`购买花盆 ${index+1}，4000 金币`:p?`${this.plant(p.kind).name}，${p.stuck?(p.cooldown>0?'等待照料':'需要'+({waterpourPar:'浇水',fertilizerPar:'施肥',jukeboxPar:'音乐',pesticidePar:'除虫'}[p.requirement])):stageOf(p)>=3?'可收获爆发':'生长中'}`:`种植幼苗 ${index+1}`);
      if(p?.stuck&&p.cooldown===0&&!this.carePlaying.has(index)){const current=this.careRigs.get(index);if(!current){const rig=this.stage.rig(this.catalog.garden.rigs[p.requirement],'Idle');rig.position.set(area.slots[index].x,area.slots[index].y);rig.scale.set(area.scale*this.catalog.garden.rigs[p.requirement].scale);this.stage.root.addChild(rig);this.careRigs.set(index,rig);}}
    });
  }
  private async renderGardenPlants(){const area=this.catalog.garden.gardens[this.gardenIndex],data=this.garden.read();for(const rig of this.plants.values())this.stage.remove(rig);this.plants.clear();
    for(const [index,slot] of data.areas[area.id].entries())if(slot.unlocked){const p=slot.plant,stage=p?stageOf(p):0;if(p&&stage>0)await this.stage.load(this.catalog.garden.actors[p.kind]);const spec=p&&stage>0?this.catalog.garden.actors[p.kind]:this.catalog.garden.rigs.sproutPar;const rig=this.stage.rig(spec,p?(stage>0?spec.animation:'Idle'):(data.sprouts>0?'Empty':'Null'));rig.scale.set(area.scale*(stage===0?1:stage===1?.7:stage===2?1:1.3));rig.position.set(area.slots[index].x,area.slots[index].y);this.stage.root.addChild(rig);this.plants.set(index,rig);}
    for(const rig of this.careRigs.values()){rig.removeFromParent();this.stage.root.addChild(rig);}
  }
  private async gardenClick(index:number,gold=true){
    const area=this.catalog.garden.gardens[this.gardenIndex],slot=this.garden.read().areas[area.id][index],p=slot.plant;
    if(!slot.unlocked){if(this.garden.unlock(area.id,index)){await this.renderGardenPlants();this.gardenTick();}return;}
    if(this.tool==='shovel'){if(p)this.shovelDialog(index);return;}
    if(this.tool==='glove'){if(this.moving===null){if(p&&!p.stuck&&stageOf(p)>0){this.moving=index;this.$('.garden-status').textContent='请选择空花盆';}}else if(this.garden.move(area.id,this.moving,index,this.catalog.plants)){this.moving=null;this.tool='care';await this.renderGardenPlants();this.gardenTick();this.$('.garden-status').textContent='';}return;}
    if(this.tool==='cart'){if(this.garden.cart(area.id,index,this.catalog.plants)){this.tool='care';await this.renderGardenPlants();this.gardenTick();this.$('.garden-status').textContent=this.garden.read().cart?'植物已放入手推车，切换花园后可放下':'植物已放下';}return;}
    if(!p){const owned=this.progress.ownedPlants();if(this.garden.plant(area.id,index,this.catalog.plants.filter(p=>owned.has(p.id!)),Date.now())){this.sound(this.catalog.garden.sounds.sproutBirthSound);await this.renderGardenPlants();this.plants.get(index)!.animation.play('Birth',1);this.gardenTick();}return;}
    if(!p.stuck||p.cooldown>0||this.carePlaying.has(index))return;
    const rig=this.careRigs.get(index)!;this.carePlaying.add(index);
    if(p.requirement==='waterpourPar'){
      this.garden.water(area.id,index,Date.now());
      if(gold)for(const [neighbor,position] of area.slots.entries())if(neighbor!==index&&Math.abs(position.x-area.slots[index].x)<240*area.scale&&Math.abs(position.y-area.slots[index].y)<240*area.scale){
        const plant=this.garden.read().areas[area.id][neighbor].plant;
        if(plant?.stuck&&plant.cooldown===0&&plant.requirement==='waterpourPar')this.run(this.gardenClick(neighbor,false));
      }
    }
    rig.animation.play(p.requirement==='waterpourPar'&&gold?'Play_Gold':'Play',1);
    const event=(event:EventObject)=>{const name=event.name;
      const sounds:Record<string,string>={water_pour:'waterPourSound',fertilizer_drop:'fertilizerFallSound',fertilizer_blast:'fertilizerBlastSound',jukebox_smash:'jukeboxFallSound',jukebox_play:'jukeboxPlaySound',pesticide_shoot:'pesticideSound'};
      if(sounds[name])this.sound(this.catalog.garden.sounds[sounds[name]]);
      if(name==='grow'){this.garden.grow(area.id,index,Date.now());this.sound(this.catalog.garden.sounds.plantGrowthSound);this.run(this.growVisual(index));}
      if(name==='die'){this.stage.remove(rig);this.careRigs.delete(index);this.carePlaying.delete(index);this.gardenTick();}
    };
    rig.addDBEventListener(EventObject.FRAME_EVENT,event,this);
  }
  private async growVisual(index:number){
    const area=this.catalog.garden.gardens[this.gardenIndex],p=this.garden.read().areas[area.id][index].plant!,stage=stageOf(p),spec=this.catalog.garden.actors[p.kind];
    await this.stage.load(spec);
    const old=this.plants.get(index)!;this.stage.remove(old);
    const rig=this.stage.rig(spec,spec.animation);rig.position.set(area.slots[index].x,area.slots[index].y);this.stage.root.addChild(rig);this.plants.set(index,rig);
    const from=stage===1?0:area.scale*(stage===2?.7:1),to=area.scale*(stage===1?.7:stage===2?1:1.3);this.stage.grow(rig,from,to);
  }
  private dialog(html:string){const dialog=this.$('.garden-dialog');dialog.hidden=false;dialog.innerHTML=`<section class="outer-panel">${html}<button class="native-button" data-cancel>返回花园</button></section>`;this.$('[data-cancel]').onclick=()=>{dialog.hidden=true;};return dialog;}
  private sproutShop(){this.dialog(`<h2>幼苗</h2>${this.wallet()}<div class="sprout-products">${this.catalog.garden.sproutBundles.map((p,i)=>`<button class="native-button" data-bundle="${i}" ${this.progress.shop().read().gem<p.CurrencyRequired?'disabled':''}>${p.CommodityCount} 株幼苗<br>${p.CurrencyRequired} 钻石</button>`).join('')}</div>`);for(const button of this.host.querySelectorAll<HTMLButtonElement>('[data-bundle]'))button.onclick=()=>{const bundle=this.catalog.garden.sproutBundles[+button.dataset.bundle!];if(this.garden.buy(bundle.CommodityCount,bundle.CurrencyRequired)){this.sproutShop();this.run(this.renderGardenPlants());this.gardenTick();}};}
  private shovelDialog(index:number){const area=this.catalog.garden.gardens[this.gardenIndex],p=this.garden.read().areas[area.id][index].plant!,boost=!p.stuck&&stageOf(p)>=3;const dialog=this.dialog(`<h2>你确定吗？</h2><p>你将会失去${this.plant(p.kind).name}，${boost?'并为它争取到一次爆发！':'并且什么也得不到！'}</p><button class="native-button" data-remove>确定</button>`);this.$('[data-remove]').onclick=()=>{if(this.garden.remove(area.id,index))this.sound(this.catalog.garden.sounds.boostSound);else this.sound(this.catalog.garden.sounds.plantDisappearSound);const care=this.careRigs.get(index);if(care){this.stage.remove(care);this.careRigs.delete(index);this.carePlaying.delete(index);}dialog.hidden=true;this.tool='care';this.run(this.renderGardenPlants());this.gardenTick();};}
  async back(){const dialog=this.host.querySelector<HTMLElement>('.garden-dialog');if(dialog&&!dialog.hidden){dialog.hidden=true;return;}await this.exit();}
  async dispose(){clearInterval(this.timer);this.host.inert=true;this.stage.app.stop();await Promise.all(this.pending);if(this.musicPlay)await this.musicPlay;this.music.pause();for(const sound of this.sounds)sound.pause();await this.stage.dispose();this.host.remove();}
}
