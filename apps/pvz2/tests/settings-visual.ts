import { Container, Rectangle } from 'pixi.js';
import '../src/shell/style.css';
import '../src/style.css';
import {WorldShell} from '../src/shell/controller';
import {plantReward} from '../src/plant-reward';
import {assetUrl,json} from '../src/assets/load';
const prefix='pvz2-settings-preview:',storage={getItem:(k:string)=>localStorage.getItem(prefix+k),setItem:(k:string,v:string)=>localStorage.setItem(prefix+k,v),removeItem:(k:string)=>localStorage.removeItem(prefix+k)};
const map=document.querySelector<HTMLElement>('#map')!,battle=document.querySelector<HTMLElement>('#battle')!;
const shell=new WorldShell(map,async()=>{},storage);await shell.init();
document.querySelector<HTMLButtonElement>('#settings')!.onclick=()=>shell['settings']();
document.querySelector<HTMLButtonElement>('#reward')!.onclick=async()=>{
 const renderer=shell['renderer'];await renderer.worldDetails('pirate');
 const key=shell['catalog'].nodes.plantCard.find(d=>d.kind==='rig')!.rig!,root=new Container(),layers=[renderer['makeRig'](key,'background','pirate'),renderer['makeRig'](key,'plants','kernelpult'),renderer['makeRig'](key,'upper_dots','dotPrice')];
 for(const rig of layers){rig.armature.advanceTime(.001);root.addChild(rig);}
 const card=(renderer.app.renderer.extract.canvas({target:root,resolution:2,frame:new Rectangle(-119,-75,238,150)}) as HTMLCanvasElement).toDataURL('image/png');layers.forEach(r=>r.dispose());root.destroy({children:true});
 const catalog=await json<{ui:Record<string,{image:string}>}>('battle/catalog.json');
 for(const name of ['window','windowBorder','start'])battle.style.setProperty('--art-'+name,`url('${assetUrl(catalog.ui[name].image)}')`);
 map.hidden=true;battle.hidden=false;
 battle.innerHTML=`<section class="battle-frame" style="background:#193e35"><div id="overlay"><section class="battle-window plant-reward-window" role="dialog" aria-modal="true" aria-label="获得新植物"><h2>获得新植物</h2>${plantReward(card,'玉米投手','玉米投手抛射玉米粒，偶尔用黄油定住僵尸。')}<button class="battle-button" id="result-map">领取并继续</button></section></div></section>`;
 battle.querySelector<HTMLButtonElement>('#result-map')!.onclick=()=>{battle.hidden=true;map.hidden=false;};
};
