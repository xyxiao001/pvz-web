// Each view owns a lease. Loading and unloading the same URL are serialized,
// so returning to a scene cannot race the previous scene's GPU cleanup.
export class ResourcePool<T> {
  private entries=new Map<string,{refs:number;value:Promise<T>;released?:Promise<void>}>();
  constructor(private load:(path:string)=>Promise<T>,private unload:(path:string)=>Promise<void>){}
  acquire(path:string):Promise<T>{
    const previous=this.entries.get(path);
    if(previous&&!previous.released){previous.refs++;return previous.value;}
    const value=previous?previous.released!.then(()=>this.load(path)):this.load(path);
    this.entries.set(path,{refs:1,value});return value;
  }
  release(path:string):Promise<void>{
    const entry=this.entries.get(path)!;
    if(--entry.refs>0)return Promise.resolve();
    entry.released=entry.value.then(()=>this.unload(path)).then(()=>{if(this.entries.get(path)===entry)this.entries.delete(path);});
    return entry.released;
  }
}
export class ResourceScope<T>{
  private owned=new Map<string,Promise<T>>();
  constructor(private pool:ResourcePool<T>){}
  load(path:string){
    if(!this.owned.has(path))this.owned.set(path,this.pool.acquire(path));
    return this.owned.get(path)!;
  }
  release(path:string){this.owned.delete(path);return this.pool.release(path);}
  values(){return Promise.all(this.owned.values());}
  async dispose(){await Promise.all([...this.owned.keys()].map(path=>this.release(path)));}
}
