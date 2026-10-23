import {cellX,rowY,type PlantKind,type ZombieKind} from './level';
import type {Game,Plant} from './model';
import costs from '../../public/assets/modern/beghouled-costs.json';

// Native Beghouled occupies the first eight columns; the ninth is the approach lane.
export class Beghouled {
 matches=0;combo=0;stage=0;nextSpawn=5;settleAt=0;selected:Plant|null=null;
 current:PlantKind[]=[];holes=new Set<string>();hint:Plant[]=[];hintAt=3;
 constructor(private g:Game){}
 get config(){return this.g.level.beghouled!;}
 init(){this.current=[...this.config.InitialPlants];this.shuffle();}
 at(row:number,column:number){return this.g.plants.find(p=>p.hp>0&&p.row===row&&p.column===column);}
 private key(row:number,column:number){return `${row}:${column}`;}
 private drop(p:Plant,fromRow:number){p.leap={x:cellX(p.column),y:rowY(fromRow),at:this.g.time,duration:.5};}
 shuffle(){
  const g=this.g;g.plants=[];this.selected=null;this.hint=[];
  for(let row=0;row<5;row++)for(let column=0;column<8;column++){
   if(this.holes.has(this.key(row,column)))continue;
   const choices=this.current.filter(k=>this.at(row-1,column)?.kind!==k&&this.at(row,column-1)?.kind!==k);
   g.addPlant(choices[Math.floor(g.random()*choices.length)],row,column);this.drop(g.plants.at(-1)!,row-7);
  }
  this.settleAt=g.time+.5;this.hintAt=g.time+3;g.beach.sounds.push('beghouledRefresh');
 }
 groups(){
  const groups:Plant[][]=[];
  for(const p of this.g.plants){if(p.hp<=0||p.column>=8||p.action==='food')continue;
   for(const [dr,dc] of [[0,1],[1,0]]){
    if(this.at(p.row-dr,p.column-dc)?.kind===p.kind)continue;
    const line=[p];for(let n=1;;n++){const q=this.at(p.row+dr*n,p.column+dc*n);if(!q||q.kind!==p.kind||q.action==='food')break;line.push(q);}
    if(line.length>=3)groups.push(line);
   }
  }
  // A cross is one match, as the native detection unions both axes at the pivot.
  for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++)if(groups[i].some(p=>groups[j].includes(p))){groups[i]=[...new Set([...groups[i],...groups[j]])];groups.splice(j--,1);}
  return groups;
 }
 private exchange(a:Plant,b:Plant){const r=a.row,c=a.column;a.row=b.row;a.column=b.column;b.row=r;b.column=c;}
 moves(){
  const result:[Plant,Plant][]=[];
  for(const a of this.g.plants)if(a.hp>0&&a.column<8&&a.action!=='food')for(const [dr,dc] of [[0,1],[1,0]]){const b=this.at(a.row+dr,a.column+dc);if(!b||b.column>=8||b.action==='food'||b.kind===a.kind)continue;this.exchange(a,b);const valid=this.groups().some(line=>line.includes(a)||line.includes(b));this.exchange(a,b);if(valid)result.push([a,b]);}
  return result;
 }
 swap(a:Plant,b:Plant){
  if(this.g.phase!=='playing'||this.g.time<this.settleAt||Math.abs(a.row-b.row)+Math.abs(a.column-b.column)!==1||a.column>=8||b.column>=8||a.action==='food'||b.action==='food')return false;
  this.exchange(a,b);const groups=this.groups();if(!groups.some(line=>line.includes(a)||line.includes(b))){this.exchange(a,b);this.g.beach.sounds.push('beghouledMatchFail');return false;}
  this.combo=0;this.resolve(groups,false);return true;
 }
 click(row:number,column:number){const p=this.at(row,column);if(!p||column>=8)return;const old=this.selected;this.selected=p;if(old&&old!==p&&this.swap(old,p))this.selected=null;}
 private resolve(groups:Plant[][],cascade:boolean){
  const g=this.g;for(const line of groups){
   this.combo=cascade?this.combo+1:0;this.matches=Math.min(this.config.MatchesToWin,this.matches+1);
   const pivot=line[0],extra=line.filter(p=>p.armor>0).length;
   g.dropSun(cellX(pivot.column),rowY(pivot.row)-40,50*(this.combo+line.length-2+extra),'plant');
   if(line.length>=4)g.plantFood(pivot.row,pivot.column,true);
   for(const p of line)if(p.action!=='food')g.plants=g.plants.filter(q=>q!==p);
   g.beach.sounds.push('beghouledMatch');
  }
  this.stage=0;for(const s of this.config.MatchCountsToStageAdvance)if(this.matches>s.MatchCount)this.stage=s.StageNumber;
  this.hint=[];this.hintAt=g.time+3;this.settleAt=g.time+.5;
  if(this.matches===this.config.MatchesToWin){g.phase='won';g.events.push({type:'win'});}
 }
 get upgrades(){return this.current.flatMap(k=>this.config.UpgradeMap.filter(u=>u.BasePlant===k).map(u=>u.UpgradedPlant)).slice(0,8);}
 cost(kind:PlantKind){return costs[kind as keyof typeof costs];}
 upgrade(kind:PlantKind){
  if(this.g.phase!=='playing'||!this.upgrades.includes(kind)||this.g.sun<this.cost(kind))return false;
  const base=this.config.UpgradeMap.find(u=>u.UpgradedPlant===kind)!.BasePlant;this.g.sun-=this.cost(kind);this.current[this.current.indexOf(base)]=kind;
  for(const p of [...this.g.plants])if(p.kind===base){this.g.plants=this.g.plants.filter(q=>q!==p);this.g.addPlant(kind,p.row,p.column);}return true;
 }
 shovel(row:number,column:number){const p=this.at(row,column);if(p)this.g.plants=this.g.plants.filter(q=>q!==p);this.holes.delete(this.key(row,column));this.g.beach.sounds.push('beghouledShovel');}
 recordDeaths(){for(const p of this.g.plants)if(p.hp<=0)this.holes.add(this.key(p.row,p.column));}
 tick(dt:number){
  const g=this.g;this.nextSpawn-=dt;if(this.nextSpawn<=0){const stage=this.config.Stages[this.stage],name=stage.Types[Math.floor(g.random()*stage.Types.length)].ZombieType;
   const kind=(name==='beghouled'?'tutorial':name==='beghouled_armor1'?'tutorial_armor1':name==='beghouled_armor2'?'tutorial_armor2':name) as ZombieKind;
   g.spawnZombie(kind,Math.floor(g.random()*5),cellX(10));this.nextSpawn=stage.SpawnDelay;
  }
  if(g.time<this.settleAt)return;
  let dropped=false;
  for(let row=4;row>=0;row--)for(let column=0;column<8;column++)if(!this.at(row,column)&&!this.holes.has(this.key(row,column))){
   let p:Plant|undefined;for(let r=row-1;r>=0;r--){p=this.at(r,column);if(p&&p.action!=='food')break;p=undefined;}
   if(p){const r=p.row;p.row=row;this.drop(p,r);}else{g.addPlant(this.current[Math.floor(g.random()*this.current.length)],row,column);this.drop(g.plants.at(-1)!,row-7);}dropped=true;
  }
  if(dropped){this.settleAt=g.time+.5;return;}
  const groups=this.groups();if(groups.length){this.resolve(groups,true);return;}
  if(g.plants.some(p=>p.action==='food'))return;
  const moves=this.moves();if(!moves.length){this.shuffle();return;}if(g.time>=this.hintAt){this.hint=moves[0];this.hintAt=g.time+5;}
 }
}
