export type DecodeSign='normal'|'merged'|'fault'|'change'|'correct'|'half';
export interface Merge {PlantA:string;PlantB:string;Target:string}
export interface DecodeFeatures {BASES:string[];MERGES:Merge[]}
export class PlantDecoding {
  readonly bases:string[];
  readonly codes:string[];
  slots:string[];
  signs:DecodeSign[];
  history:{plants:string[];signs:DecodeSign[]}[]=[];
  picked:{base:string}|{slot:number}|null=null;
  step=0;
  constructor(readonly features:DecodeFeatures,baseCount:number,codeCount:number,random:()=>number=Math.random){
    this.bases=features.BASES.slice(0,baseCount);
    const merges=features.MERGES.filter(m=>this.bases.includes(m.PlantA)&&this.bases.includes(m.PlantB));
    for(let i=merges.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[merges[i],merges[j]]=[merges[j],merges[i]];}
    this.codes=merges.slice(0,codeCount).map(m=>m.Target);this.slots=this.codes.map(()=> '');this.signs=this.codes.map(()=> 'normal');
  }
  get ready(){return this.slots.every(plant=>this.features.MERGES.some(m=>m.Target===plant));}
  get won(){return this.signs.every(sign=>sign==='correct');}
  get reward(){return Math.round(this.bases.length*this.codes.length*Math.exp(-Math.pow(this.step/8,2)));}
  pickBase(base:string){this.picked=this.picked&&'base' in this.picked&&this.picked.base===base?null:{base};}
  clear(slot:number){if(this.signs[slot]==='correct')return;this.slots[slot]='';this.signs[slot]='normal';this.picked=null;}
  place(slot:number){
    if(this.signs[slot]==='correct')return;
    if(!this.picked){if(this.slots[slot])this.picked={slot};return;}
    if('slot' in this.picked&&this.picked.slot===slot){this.picked=null;return;}
    const picked=this.picked,plant='base' in picked?picked.base:this.slots[picked.slot],old=this.slots[slot];
    const merged=this.features.MERGES.find(m=>m.PlantA===plant&&m.PlantB===old||m.PlantB===plant&&m.PlantA===old);
    if(merged){this.slots[slot]=merged.Target;this.signs[slot]='merged';if('slot' in picked){this.slots[picked.slot]='';this.signs[picked.slot]='normal';}}
    else if('slot' in picked){this.slots[slot]=plant;this.slots[picked.slot]=old;for(const index of [slot,picked.slot])this.signs[index]=this.features.MERGES.some(m=>m.Target===this.slots[index])?'merged':'normal';}
    else if(!old){this.slots[slot]=plant;this.signs[slot]='normal';}else return;
    this.picked=null;
  }
  confirm(){
    if(!this.ready||this.won)return;
    this.step++;this.picked=null;
    for(let i=0;i<this.codes.length;i++){
      if(this.signs[i]==='correct')continue;
      const plant=this.slots[i];
      if(plant===this.codes[i])this.signs[i]='correct';
      else if(this.codes.some((code,j)=>code===plant&&this.signs[j]!=='correct'))this.signs[i]='change';
      else {
        const target=this.features.MERGES.find(m=>m.Target===this.codes[i])!,guess=this.features.MERGES.find(m=>m.Target===plant)!;
        this.signs[i]=[guess.PlantA,guess.PlantB].some(p=>p===target.PlantA||p===target.PlantB)?'half':'fault';
      }
    }
    this.history.push({plants:[...this.slots],signs:[...this.signs]});
  }
}
export class ArcadeProgress {
  private key='pvz2-web:arcade';
  constructor(private storage:Pick<Storage,'getItem'|'setItem'>){if(storage.getItem(this.key)===null)this.save({baseCount:5,codeCount:4,date:'',reward:0});}
  read():{baseCount:number;codeCount:number;date:string;reward:number}{return JSON.parse(this.storage.getItem(this.key)!);}
  private save(value:ReturnType<ArcadeProgress['read']>){this.storage.setItem(this.key,JSON.stringify(value));}
  settings(baseCount:number,codeCount:number){this.save({...this.read(),baseCount,codeCount});}
  start(date:string){const data=this.read(),eligible=data.date!==date;this.save({...data,date,reward:eligible?0:data.reward});return eligible;}
  finish(reward:number){this.save({...this.read(),reward});}
}
export const localDate=(date=new Date())=>`${date.getFullYear()}-${date.getMonth()+1}-${date.getDate()}`;
