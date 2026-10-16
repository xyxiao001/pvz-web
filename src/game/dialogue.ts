import lines from './data/adventure-dialogue.json';
import type { Game } from './model';
import type { ProfileData } from '../platform/profile';
export const DIALOGUE = lines as Record<string,{text:string;original:string}>;
export function bossHint(game: Game) {
  if (!game.boss || game.phase !== 'playing') return '';
  if (game.boss.ball) return game.boss.ball.kind === 'fire' ? '火球来袭！使用寒冰菇消除' : '冰球来袭！在同排使用火爆辣椒';
  if (['headBefore','spit','headAfter'].includes(game.boss.phase)) return '僵王低头了！集中攻击，寒冰菇可以延长攻击时间';
  return game.ticks < 800 ? '传送带供应植物 · 保留寒冰菇与辣椒应对冰火球' : '';
}
// CutScene::StartLevelIntro, in original branch priority order.
export function adventureDialogue(game: Game, profile: ProfileData) {
  if (game.isSurvival) return null;
  const level=game.level, first=!game.repeatAdventure;
  if (first && level===11) return 201;
  if (first && level===12) return 1401;
  if (first && level>=13 && level<=24 && ![15,20,21].includes(level) && profile.declinedSlots<2) {
    if (profile.purchases.slots===0 && profile.money>=750) return 1501;
    if (level>=16 && profile.purchases.slots===1 && profile.money>=5000) return 1551;
  }
  if (level===5) return first?2400:2411;
  if (first && level===21) return 501;
  if (level===15) return 401;
  if (level===25) return 701;
  if (first && level===31) return 801;
  if (level===35) return 2500;
  if (level===40) return 1101;
  if (first && level===41) return 1201;
  // Garden-specific 1301–1303 are intentionally deferred with the Zen Garden.
  if (level===45) return 1304;
  if (!first && level===1) return 1601;
  if (level===50) return 2300;
  return null;
}
// Hints and highlights describe the same currently available action.
export function tutorialHighlight(game: Game): string | null {
  if (game.phase !== 'playing') return null;
  if (game.tutorial === 'shovel') return game.digging ? null : '#shovel';
  const kind = game.tutorial === 'pea' ? 'peashooter' : game.tutorial === 'sunflower' || game.tutorial === 'more-sun' ? 'sunflower' : null;
  if (!kind || game.selected || game.sun < game.plantCost(kind) || game.cooldown(kind) > 0) return null;
  return `[data-plant=${kind}]`;
}
export function tutorialHint(game: Game) {
  if (game.phase !== 'playing') return '';
  if (game.tutorial==='shovel') return game.digging ? '点击豌豆射手，把草坪上的三株植物全部铲掉！' : '点击铲子，清理草坪上的三株植物！';
  if (game.tutorial==='pea') {
    if (game.sun<100) return '点击落下的阳光，收集到 100 阳光再种一株！';
    if (game.cooldown('peashooter')>0) return '种得不错！等种子包恢复后，再种一株豌豆射手。';
    if (game.selected==='peashooter') return '点击中间的草坪，种下豌豆射手！';
    if (game.planted===0) return '点击豌豆射手种子包！';
    return '阳光够了！点击种子包，再种一株豌豆射手！';
  }
  if (game.tutorial==='sunflower'||game.tutorial==='more-sun') {
    if (game.sun<50) return '先收集阳光，凑够 50 阳光再种向日葵。';
    if (game.cooldown('sunflower')>0) return '等向日葵种子包恢复后，继续种植。试着种至少三株！';
    return game.selected==='sunflower' ? '点击空草地种下向日葵。试着种至少三株！' : '向日葵非常重要！试着种至少三株，为防线提供阳光。';
  }
  return '';
}
