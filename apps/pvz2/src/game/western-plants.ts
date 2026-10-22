import {DarkBoss} from './dark-boss';
import {BOARD,cellX,rowY,type PlantKind} from './level';
import type {Game,Plant,Zombie} from './model';
import {swinging} from './pirate';

interface Shot {id:number;kind:string;x:number;y:number;vx:number;vy:number;age:number;nextShock:number;contacts:number[];damage:number;armor?:Metal;dead:boolean}
interface Visual {id:number;name:string;animation:string;x:number;y:number;at:number;duration:number;toX?:number;toY?:number}
interface Metal {consumeRate?:number;name:string;animation:string;armature?:string}
interface Absorbed extends Metal {id:number;plant:number;zombie:number;x:number;y:number;fromX:number;fromY:number;at:number;food:boolean}
interface Magnet {restUntil:number;absorbUntil:number;shootRate:number}
interface Beam {plant:number;at:number;until:number;target:number|null;x:number;y:number;toX:number;toY:number;producers:number[]}
export class WesternPlants {
  shots:Shot[]=[];
  visuals:Visual[]=[];
  metals:Absorbed[]=[];
  beams:Beam[]=[];
  sounds:string[]=[];
  magnets=new Map<number,Magnet>();
  private serial=0;
  #game:Game;
  constructor(game:Game){this.#game=game;}
  handles(kind:PlantKind){return ['electricpeashooter','magnetshroom','magnifyinggrass'].includes(kind);}
  private play(p:Plant,animation:string,action:Plant['action']='shoot'){p.animation=animation;p.action=action;p.actionAt=this.#game.time;p.eventIndex=0;}
  rate(p:Plant){return p.animation==='AbsorbStart'?1.3:p.kind==='magnetshroom'&&p.animation==='FoodShoot'?this.magnets.get(p.id)!.shootRate:p.kind==='magnifyinggrass'&&p.animation!.startsWith('Shoot')?Math.max(1,.4/this.#game.props.plants.magnifyinggrass.ShootInterval):1;}
  private visual(name:string,animation:string,x:number,y:number,toX?:number,toY?:number){this.visuals.push({id:++this.serial,name,animation,x,y,toX,toY,at:this.#game.time,duration:this.#game.props.plantAnimations[name][animation].duration});}
  private targets(){return this.#game.zombies.filter(z=>z.hp>0&&!z.leap&&!swinging(z,this.#game.time));}
  fire(row:number,column:number){
    const g=this.#game,p=g.plants.find(p=>p.kind==='magnifyinggrass'&&p.row===row&&p.column===column&&p.hp>0);
    if(!p||g.phase!=='playing'||g.preparing||p.action==='food'||p.action==='shoot'&&!p.fired||g.time<p.nextAction||g.sun<g.props.plants.magnifyinggrass.ShootSunCost)return false;
    const props=g.props.plants.magnifyinggrass;g.sun-=props.ShootSunCost;g.sunSpent+=props.ShootSunCost;p.nextAction=g.time+props.ShootInterval;p.fired=false;
    this.play(p,g.random()<.5?'Shoot0':'Shoot1');return true;
  }
  food(p:Plant){
    const g=this.#game,props=g.props.plants[p.kind];this.play(p,p.kind==='electricpeashooter'?'Food':'FoodStart','food');
    if(p.kind==='magnetshroom'){
      if(g.boss instanceof DarkBoss)g.boss.magnetize();
      this.metals=this.metals.filter(m=>m.plant!==p.id);this.magnets.set(p.id,{restUntil:0,absorbUntil:g.time+props.PlantfoodAbsorbDuration,shootRate:1});this.sounds.push('magnetshroom/foodSound');
    }else if(p.kind==='magnifyinggrass'){
      const producers=g.plants.filter(q=>q.hp>0&&props.SunProducerList.includes(q.kind)).map(q=>q.id);
      this.beams.push({plant:p.id,at:g.time,until:g.time+props.PlantfoodDuration+producers.length*props.PlantfoodDurationExtendPerProducer,target:null,x:cellX(p.column),y:rowY(p.row)-45,toX:cellX(p.column),toY:rowY(p.row)-45,producers});this.sounds.push('magnifyinggrass/foodStartSounds');
    }else this.sounds.push('electricpeashooter/foodSound');
  }
  private shot(kind:string,x:number,y:number,vx:number,vy:number,armor?:Metal){
    this.shots.push({id:++this.serial,kind,x,y,vx,vy,age:0,nextShock:0,contacts:[],damage:armor?this.#game.props.plants.magnetshroom.PlantfoodThrowDamage:this.#game.props.projectiles[kind].Damage,armor,dead:false});
  }
  private metal(z:Zombie):Metal|null {
    if(z.kind==='eighties_punk')return {name:'punkHead',animation:'Idle',consumeRate:5};
    if(z.kind==='eighties_armor2'&&z.armor>0){const max=this.#game.props.armors.eighties_armor2.Toughness;return {name:'eightiesBucket',animation:`Broken${z.armor>max*2/3?0:z.armor>max/3?1:2}`};}
    if(z.armor>0&&(z.kind==='kongfu_armor2'||z.kind==='kongfu_armor3')){const max=this.#game.props.armors[z.kind].Toughness;return {name:z.kind==='kongfu_armor3'?'kongfuHelmet':'kongfuBucket',animation:`Broken${z.armor>max*2/3?0:z.armor>max/3?1:2}`};}
    if(z.west?.plate){const fraction=z.west.plate/this.#game.props.zombies[z.kind].ShieldToughness;return {name:'plateDrop',animation:`Broken${fraction>2/3?0:fraction>1/3?1:2}`};}
    if(z.armor>0&&(z.knighted||z.kind==='cowboy_armor2'||z.kind==='dark_armor2'||z.kind==='dark_armor3')){
      const max=this.#game.props.armors[z.knighted||z.kind==='dark_armor3'?'dark_armor3':z.kind==='dark_armor2'?'dark_armor2':'cowboy_armor2'].Toughness;
      return {name:z.knighted||z.kind==='dark_armor3'?'darkHelmet':z.kind==='dark_armor2'?'darkBucket':'cowboyBucket',animation:`Broken${z.armor>max*2/3?0:z.armor>max/3?1:2}`};
    }return null;
  }
  private absorb(p:Plant,z:Zombie,food:boolean){
    const metal=this.metal(z)!;
    if(z.kind==='eighties_punk'){z.hp=0;z.magnetized=true;}else if(z.west?.plate)z.west.plate=0;else {z.armor=0;z.magnetized=true;}
    this.metals.push({...metal,id:++this.serial,plant:p.id,zombie:z.id,x:z.x,y:rowY(z.row)-75,fromX:z.x,fromY:rowY(z.row)-75,at:this.#game.time,food});
  }
  private tickMagnet(p:Plant){
    const g=this.#game;
    if(!this.magnets.has(p.id))this.magnets.set(p.id,{restUntil:0,absorbUntil:0,shootRate:1});
    const state=this.magnets.get(p.id)!;
    if(p.action==='food'&&g.time<state.absorbUntil)for(const z of this.targets())if(this.metal(z))this.absorb(p,z,true);
    if(p.action==='food'&&g.time>=state.absorbUntil&&['FoodStart','FoodLoop'].includes(p.animation!)){
      state.shootRate=Math.min(5,Math.max(1,this.metals.filter(m=>m.plant===p.id).length/20));this.play(p,'FoodShoot','food');
    }
    if(p.action==='idle'&&p.animation==='Resting'&&g.time>=state.restUntil){this.metals=this.metals.filter(m=>m.plant!==p.id);this.play(p,'Recover');this.sounds.push('magnetshroom/catchSound');}
    if(p.action==='idle'&&p.animation==='Idle'){
      const targets=this.targets().filter(z=>this.metal(z)&&Math.abs(z.row-p.row)<=2&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth*(Math.abs(z.row-p.row)<=1?3.5:2.5)+25);
      if(targets.length){const z=targets[Math.floor(g.random()*targets.length)];this.absorb(p,z,false);this.play(p,'AbsorbStart');this.sounds.push('magnetshroom/absorbSound');}
    }
    const caught=this.metals.find(m=>m.plant===p.id&&!m.food&&g.time-m.at>=.2);
    if(caught&&p.animation==='AbsorbStart'){state.restUntil=g.time+g.props.plants.magnetshroom.RestTime/(caught.consumeRate??1);this.play(p,'AbsorbEnd');this.sounds.push('magnetshroom/catchSound');}
  }
  tickPlant(p:Plant,_dt:number){
    const g=this.#game,props=g.props.plants[p.kind];
    if(p.kind==='magnetshroom')this.tickMagnet(p);
    if(p.kind==='electricpeashooter'&&p.action==='idle'&&g.time>=p.nextAction&&(this.targets().some(z=>z.row===p.row&&z.x>cellX(p.column)-25)||g.graves.some(q=>q.hp>0&&q.row===p.row&&q.column>p.column))){
      this.play(p,'Shoot');p.nextAction=g.time+props.ShootInterval+g.random()*props.ShootIntervalAdditional;
    }
    if(p.kind==='magnifyinggrass'&&p.action==='food'&&p.animation!=='FoodEnd'){
      const beam=this.beams.find(b=>b.plant===p.id)!;
      if(g.time>=beam.until){this.play(p,'FoodEnd','food');this.sounds.push('magnifyinggrass/foodEndSounds');}
    }
    if(p.action==='idle')return;
    const timeline=g.props.plantAnimations[p.kind][p.animation!],elapsed=(g.time-p.actionAt)*this.rate(p);
    while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
      const name=timeline.events[p.eventIndex!++].name,x=cellX(p.column)+18,y=rowY(p.row)-48;
      if(p.kind==='electricpeashooter'){
        if(name==='shootStart')this.sounds.push('electricpeashooter/shootStartSounds');
        if(name==='Shoot'){this.shot('electricpea',x,y,3*BOARD.cellWidth,0);this.sounds.push('electricpeashooter/shootSound');}
        if(name==='foodShoot'){
          const targets=this.targets().filter(z=>z.x>x).sort((a,b)=>a.x-b.x);
          for(let i=0;i<props.PlantfoodPeaCount;i++){
            const chosen=targets[Math.floor(g.random()*targets.length)],z=chosen&&targets.find(z=>z.row===chosen.row),angle=z?Math.atan2(rowY(z.row)-48-y,z.x-x):Math.atan2(g.random()-.5,1);
            this.shot('electricpea_pf',x,y,Math.cos(angle)*11*BOARD.cellWidth,Math.sin(angle)*11*BOARD.cellWidth);
          }this.sounds.push('electricpeashooter/foodShootSounds');
        }
      }else if(p.kind==='magnetshroom'&&name==='Shoot'){
        const metal=this.metals.find(m=>m.plant===p.id&&g.time-m.at>=.2);
        if(metal){this.shot('metal',x,y,8*BOARD.cellWidth,0,metal);this.metals=this.metals.filter(m=>m!==metal);this.sounds.push('magnetshroom/shootSound');}
        else {this.play(p,'FoodEnd','food');return;}
      }else if(p.kind==='magnifyinggrass'){
        if(name==='Shoot'){this.shot('magnifying_grass',x,y,8*BOARD.cellWidth,0);p.fired=true;this.sounds.push('magnifyinggrass/shootSounds');}
        if(name==='foodStart'){this.play(p,'Fooding','food');this.sounds.push('magnifyinggrass/foodingSounds');return;}
      }
      if(name==='foodEnd'){this.play(p,'Idle','idle');return;}
    }
    if(elapsed>=timeline.duration){
      if(p.animation==='FoodShoot'){this.play(p,'FoodShoot','food');return;}
      if(p.animation==='FoodStart'&&p.kind==='magnetshroom'){this.play(p,'FoodLoop','food');return;}
      if(['FoodLoop','Fooding'].includes(p.animation!))return;
      if(p.animation==='AbsorbEnd'){this.play(p,'Resting','idle');return;}
      this.play(p,'Idle','idle');
    }
  }
  private pop(s:Shot){
    if(s.armor){this.sounds.push('magnetshroom/hitSounds');return;}
    const name=({electricpea:'electricHit',electricpea_pf:'electricBigHit',electricpea_small:'electricSmallHit',magnifying_grass:'grassHit'} as Record<string,string>)[s.kind];this.visual(name,'Play',s.x,s.y);
    if(s.kind==='electricpea_pf')for(let i=0;i<this.#game.props.projectiles.electricpea_pf.ChildCount;i++){const a=this.#game.random()*Math.PI*2;this.shot('electricpea_small',s.x,s.y,Math.cos(a)*8*BOARD.cellWidth,Math.sin(a)*8*BOARD.cellWidth);}
  }
  tick(dt:number){
    const g=this.#game;
    for(const s of [...this.shots]){
      s.age+=dt;s.x+=s.vx*dt;s.y+=s.vy*dt;
      const targets=this.targets(),contacts=targets.filter(z=>Math.abs(z.x-s.x)<28&&Math.abs(rowY(z.row)-48-s.y)<38);
      for(const z of contacts){if(s.contacts.includes(z.id))continue;g.damage(z,s.damage,s.kind.startsWith('electric')?'electric':'normal');this.pop(s);if(s.kind!=='electricpea'){s.dead=true;break;}}
      s.contacts=contacts.map(z=>z.id);
      const grave=g.graves.find(q=>q.hp>0&&Math.abs(cellX(q.column)-s.x)<25&&Math.abs(rowY(q.row)-48-s.y)<38);
      if(!s.dead&&grave){grave.hp-=s.damage;this.pop(s);s.dead=true;}
      if(s.kind==='electricpea'&&s.age>=s.nextShock){
        const props=g.props.projectiles.electricpea,near=targets.filter(z=>Math.abs(z.x-s.x)<BOARD.cellWidth+25&&Math.abs(rowY(z.row)-48-s.y)<BOARD.cellHeight+38);
        if(near.length){for(let i=0;i<props.ElectricTargetCount&&near.length;i++){const z=near.splice(Math.floor(g.random()*near.length),1)[0];g.damage(z,props.ElectricDamage,'electric');this.visual('electricLink','Play',s.x,s.y,z.x,rowY(z.row)-48);this.visual('electricHit','Play',z.x,rowY(z.row)-48);}s.nextShock=s.age+props.ElectricInterval;}
      }
    }
    this.shots=this.shots.filter(s=>!s.dead&&s.age<30&&s.x>BOARD.left-100&&s.x<1250&&s.y>0&&s.y<800);
    for(const m of this.metals){const p=g.plants.find(p=>p.id===m.plant&&p.hp>0);if(!p)continue;const t=Math.min(1,(g.time-m.at)/.2),angle=g.time*3+m.id*2;const x=cellX(p.column)+(m.food?30*Math.cos(angle):0),y=rowY(p.row)-(m.food?45:70)+(m.food?15*Math.sin(angle):0);m.x=m.fromX+(x-m.fromX)*t;m.y=m.fromY+(y-m.fromY)*t;}
    this.metals=this.metals.filter(m=>g.plants.some(p=>p.id===m.plant&&p.hp>0));
    for(const [id] of this.magnets)if(!g.plants.some(p=>p.id===id&&p.hp>0))this.magnets.delete(id);
    for(const b of this.beams){
      const p=g.plants.find(p=>p.id===b.plant&&p.hp>0);if(!p||g.time>=b.until)continue;
      b.x=cellX(p.column);b.y=rowY(p.row)-45;
      let target=this.targets().find(z=>z.id===b.target);if(!target){target=this.targets().sort((a,b)=>a.x-b.x)[0];b.target=target?.id??null;}
      if(target){b.toX=target.x;b.toY=rowY(target.row)-45;g.damage(target,g.props.plants.magnifyinggrass.PlantfoodDPS*dt);}
      else {const grave=g.graves.filter(q=>q.hp>0).sort((a,b)=>a.column-b.column)[0];if(grave){b.target=-grave.id;b.toX=cellX(grave.column);b.toY=rowY(grave.row)-45;grave.hp-=g.props.plants.magnifyinggrass.PlantfoodDPS*dt;}}
    }
    this.beams=this.beams.filter(b=>g.time<b.until+g.props.plantAnimations.grassFrom.End.duration&&g.plants.some(p=>p.id===b.plant&&p.hp>0));
    this.visuals=this.visuals.filter(v=>g.time-v.at<v.duration);
  }
}
