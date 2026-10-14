import clips from './data/boss-clips.json';
import type { ZombieKind } from './config';

export const BOSS_HEALTH = 40000;
// Original anim_role ground displacement at 2 fps, averaged as for walking zombies.
export const BOSS_BALL_SPEED = { fire: 1036.9 / 56 * .02, ice: 1036.9 / 58 * .02 };
export const BOSS_ENEMIES: ZombieKind[] = ['cone','bucket','football','pole','jack','ladder','zomboni','catapult','pogo','newspaper','door','gargantuar'];
type Phase = 'enter' | 'idle' | 'spawn' | 'stomp' | 'bungee' | 'bungeeWait' | 'bungeeLeave' | 'rv' | 'headEnter' | 'headBefore' | 'spit' | 'headAfter' | 'headLeave' | 'death';
export interface Boss {
  health: number; phase: Phase; clip: keyof typeof clips; elapsed: number; duration: number; fps: number;
  mode: number; age: number; animationTime: number; summonIn: number; headIn: number; stompIn: number; bungeeIn: number;
  row: number; column: number; chillIn: number; frozenIn: number; hitAt: number;
  ball: { kind: 'fire' | 'ice'; row: number; x: number; age: number } | null;
  ballKind: 'fire' | 'ice';
}
export type BossAction = { kind: 'spawn'; zombie: ZombieKind; row: number } | { kind: 'crush'; row: number; column: number; columns: number } | { kind: 'bungee'; column: number } | { kind: 'won' };
function enter(b: Boss, phase: Phase, clip: keyof typeof clips, duration?: number) {
  if(['spawn','stomp','bungee','rv','death'].includes(phase))b.chillIn=0;
  b.phase = phase; b.clip = clip; b.elapsed = 0; b.fps = phase === 'rv' ? 16 : phase === 'death' || phase === 'bungeeLeave' ? 18 : 12;
  b.duration = duration === undefined ? Math.ceil(clips[clip][1] * 100 / b.fps) : duration;
}
export function createBoss(): Boss {
  const b: Boss = {health:BOSS_HEALTH,phase:'enter',clip:'anim_enter',elapsed:0,duration:0,fps:12,mode:0,age:0,animationTime:0,summonIn:500,headIn:5000,stompIn:-1,bungeeIn:-1,row:0,column:0,chillIn:0,frozenIn:0,hitAt:-100,ball:null,ballKind:'fire'};
  enter(b,'enter','anim_enter'); return b;
}
export const bossVulnerable = (b: Boss) => ['headBefore','spit','headAfter'].includes(b.phase);
export function damageBoss(b: Boss, amount: number, ticks: number) {
  if (!bossVulnerable(b)) return;
  b.health = Math.max(0,b.health-amount); b.hitAt = ticks;
}
// Portable Zombie.cpp:9751–10474. Timed contacts use source Reanim lengths.
export function stepBoss(b: Boss, random: () => number, stompRows: number[], bungeesDone: boolean): BossAction[] {
  const actions: BossAction[] = [];
  const range = (min: number,max: number) => min + Math.floor(random()*(max-min+1));
  if (b.ball) { b.ball.age++; if (b.ball.age>100) b.ball.x-=BOSS_BALL_SPEED[b.ball.kind]; if (b.ball.x < -100) b.ball=null; }
  if (b.health === 0 && b.phase !== 'death') { b.ball=null; b.frozenIn=0; enter(b,'death','anim_death'); }
  b.age++;
  if(b.chillIn>0)b.chillIn--;
  if (b.frozenIn>0) { b.frozenIn--; return actions; }
  b.animationTime++;
  for (const key of ['summonIn','headIn','stompIn','bungeeIn'] as const) if (b[key]>0) b[key]--;
  const before = b.elapsed;
  const timed = ['idle','headBefore','headAfter','bungeeWait'].includes(b.phase);
  b.elapsed += b.chillIn>0&&!timed?.5:1;
  if(b.phase==='headLeave'&&b.elapsed>b.duration*.23)b.chillIn=0;
  const contact = (fraction: number) => before < b.duration*fraction && b.elapsed >= b.duration*fraction;
  if (b.phase === 'spawn' && contact(.6)) {
    const list = b.row === 0 ? BOSS_ENEMIES.slice(0,-1) : BOSS_ENEMIES;
    actions.push({kind:'spawn',row:b.row,zombie:b.age<3500?'normal':b.age<8000?'cone':b.age<12500?'bucket':list[Math.floor(random()*list.length)]});
  }
  if (b.phase === 'stomp' && contact(b.row>=2?.55:.5)) actions.push({kind:'crush',row:b.row,column:5,columns:4});
  if (b.phase === 'rv' && contact(.65)) {
    actions.push({kind:'crush',row:b.row,column:b.column,columns:3});
    b.summonIn=500;b.headIn=5000;if(b.mode>=1)b.stompIn=4000;if(b.mode>=2)b.bungeeIn=6500;
  }
  if (b.phase === 'bungee' && contact(.4)) actions.push({kind:'bungee',column:b.column});
  if (b.phase === 'spit' && contact(.42)) b.ball={kind:b.ballKind,row:b.row,x:530,age:0};
  if (b.elapsed < b.duration) return actions;
  if (b.phase === 'death') { actions.push({kind:'won'}); return actions; }
  if (b.phase === 'bungee') enter(b,'bungeeWait','anim_bungee_1_enter',1);
  else if (b.phase === 'bungeeWait') { if(bungeesDone)enter(b,'bungeeLeave','anim_bungee_1_leave'); }
  else if (b.phase === 'headEnter') enter(b,'headBefore','anim_head_idle',500);
  else if (b.phase === 'headBefore') {
    b.row=range(0,4);b.ballKind=random()<.5?'fire':'ice';
    enter(b,'spit',`anim_head_attack_${b.row+1}` as keyof typeof clips);
  } else if (b.phase === 'spit') enter(b,'headAfter','anim_head_idle',300);
  else if (b.phase === 'headAfter') enter(b,'headLeave','anim_head_leave');
  else if (b.phase !== 'idle') enter(b,'idle','anim_idle',range(100,200));
  else {
    const mode=b.health<BOSS_HEALTH/3?2:b.health<BOSS_HEALTH*2/3?1:0;
    const rv = () => { b.row=range(0,3);b.column=range(0,2);enter(b,'rv','anim_RV_1'); };
    const bungee = () => { b.column=range(0,2);b.bungeeIn=range(4000,5000);enter(b,'bungee','anim_bungee_1_enter'); };
    if (mode !== b.mode) { b.mode=mode;if(mode===1)bungee();else rv(); }
    else if (b.stompIn===0) {
      b.stompIn=range(5500,6500);
      if(stompRows.length){b.row=stompRows[Math.floor(random()*stompRows.length)];enter(b,'stomp',`anim_stomp_${b.row+1}` as keyof typeof clips);}
      else enter(b,'idle','anim_idle',range(100,200));
    } else if (b.bungeeIn===0) { if(random()<.25)rv();else bungee(); }
    else if (b.headIn===0) { b.headIn=range(4000,5000);enter(b,'headEnter','anim_head_enter'); }
    else if (b.summonIn===0) {
      b.row=range(0,4);b.summonIn=b.mode===0?range(450,550):b.mode===1?range(350,450):range(150,250);
      enter(b,'spawn',`anim_spawn_${b.row+1}` as keyof typeof clips);
    } else enter(b,'idle','anim_idle',range(100,200));
  }
  return actions;
}
