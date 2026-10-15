import { applyPose } from './plant-motion';
import { loadInBatches } from '../platform/load-queue';
import { Assets, Container, Sprite, Texture } from 'pixi.js';
import type { Game } from '../game/model';
type Pose = [number,number,number,number,number,number,number,number,string];
type Definition = { clips: Record<string, [number,number]>; tracks: { name: string; poses: Pose[] }[] };
type Rig = { root: Container; definition: Definition; parts: Sprite[] };
// Source transforms are interpolated at the display rate; simulation stays at 100 Hz.
export class BossArt {
  readonly root = new Container();
  private textures: Record<string,Texture> = {};
  private rigs!: Record<'body'|'driver'|'fire'|'ice',Rig>;
  async load(progress: (done:number,total:number)=>void) {
    const base = `${import.meta.env.BASE_URL}assets/runtime/boss/`;
    const definitions = await fetch(base+'tracks.json').then(r=>r.json()) as Record<'body'|'driver'|'fire'|'ice',Definition>;
    const names = [...new Set(Object.values(definitions).flatMap(d=>d.tracks.flatMap(t=>t.poses.map(p=>p[8]))))].filter(Boolean);
    let done=0;progress(done,names.length);
    await loadInBatches(names,4,async name=>{this.textures[name]=await Assets.load<Texture>({src:base+name+'.webp',data:{resolution:2}});progress(++done,names.length);});
    this.rigs = Object.fromEntries(Object.entries(definitions).map(([key,definition])=>{
      const root = new Container();this.root.addChild(root);
      const parts=definition.tracks.map(()=>{const sprite=new Sprite();root.addChild(sprite);return sprite;});
      return [key,{root,definition,parts}];
    })) as typeof this.rigs;
  }
  private pose(rig: Rig,index: number,frame: number,next: number,t: number) {
    const a=rig.definition.tracks[index].poses[frame],b=rig.definition.tracks[index].poses[next];
    const lerp=(i:number)=>(a[i] as number)+((b[i] as number)-(a[i] as number))*t;
    const sprite=rig.parts[index];sprite.visible=!!a[8]&&a[6]>=0&&a[7]>0;
    if(sprite.visible){
      sprite.texture=this.textures[a[8]];sprite.alpha=lerp(7);
      applyPose(sprite,a,b,t);
    }
    if(rig.definition.tracks[index].name==='Boss_head2')return [lerp(0),lerp(1),a[6]];
  }
  private draw(rig: Rig,clip: string,ticks: number,fps: number,loop: boolean) {
    const [start,length]=rig.definition.clips[clip];
    const position=loop?(ticks*fps/100)%length:Math.min(length-1,ticks*fps/100);
    const frame=Math.floor(position),next=loop?(frame+1)%length:Math.min(frame+1,length-1);
    let attachment: number[] | undefined;
    rig.definition.tracks.forEach((track,i)=>{
      const pose=this.pose(rig,i,start+frame,start+next,position-frame);
      if(track.name==='Boss_head2')attachment=pose;
    });
    return attachment;
  }
  render(game: Game,alpha: number) {
    const b=game.boss!;const timed=['idle','headBefore','headAfter','bungeeWait'].includes(b.phase);const delta=game.phase==='playing'&&b.frozenIn===0?alpha*(b.chillIn>0&&!timed?.5:1):0;
    const attachment=this.draw(this.rigs.body,b.clip,b.phase==='bungeeWait'?1000:b.elapsed+delta,b.fps*(b.chillIn>0&&timed?.5:1),['idle','headBefore','headAfter'].includes(b.phase));
    this.rigs.body.definition.tracks.forEach((track,i)=>{
      if(track.name.startsWith('Boss_innerarm')||track.name.startsWith('Boss_RV')){
        const part=this.rigs.body.parts[i];
        if(b.phase==='rv'){part.x+=b.column*80;part.y+=(b.row-1)*85-b.column*20;}
        else if(['bungee','bungeeWait','bungeeLeave'].includes(b.phase))part.x+=b.column*80-23;
      }
    });
    this.rigs.body.root.tint=b.frozenIn>0?0x8dcfff:0xffffff;
    // BossSetupReanim attaches the driver to Boss_head2 with (28,-84), scale 1.2.
    this.rigs.driver.root.visible=!!attachment&&attachment[2]>=0;
    if(attachment){this.rigs.driver.root.position.set(attachment[0]+28,attachment[1]-84);this.rigs.driver.root.scale.set(1.2);}
    this.draw(this.rigs.driver,b.phase==='death'?'anim_death':b.phase==='spit'?'anim_drive':'anim_idle',b.phase==='death'?b.elapsed:b.animationTime,b.phase==='spit'?36:18,b.phase!=='death');
    for(const kind of ['fire','ice'] as const){
      const rig=this.rigs[kind],ball=b.ball;rig.root.visible=ball?.kind===kind;
      if(ball&&ball.kind===kind){
        rig.root.position.set(ball.x-75,game.rowY(ball.row,ball.x)-120);
        this.draw(rig,ball.age<100?'anim_form':'anim_role',ball.age<100?ball.age:ball.age-100,ball.age<100?16:2,ball.age>=100);
      }
    }
  }
  async destroy() {
    this.root.destroy({children:true});
    await Promise.all(Object.keys(this.textures).map(name=>Assets.unload(`${import.meta.env.BASE_URL}assets/runtime/boss/${name}.webp`)));
  }
}
