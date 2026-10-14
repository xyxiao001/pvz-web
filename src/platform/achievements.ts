import type { Game } from '../game/model';

// Rules: Portable Board::AddSunMoney / StartLevel and LawnApp::UpdatePlayerProfileForFinishingLevel.
export const ACHIEVEMENTS = [
  { id: 'home-security', name: '庭院保卫者', original: 'Home Lawn Security', description: '击败冒险模式 5–10 的僵王博士。', achieved: (game: Game) => game.scenario === 'adventure' && game.level === 50 && game.phase === 'won' },
  { id: 'sunny-days', name: '阳光满屋', original: 'Sunny Days', description: '在一局中同时持有 8000 点阳光。', achieved: (game: Game) => game.sun >= 8000 },
  { id: 'immortal', name: '不朽防线', original: 'Immortal', description: '在任一场景的无尽生存中守住 20 面旗帜。', achieved: (game: Game) => game.scenario === 'endless' && game.survivalFlags >= 20 },
] as const;
export type AchievementId = typeof ACHIEVEMENTS[number]['id'];
const KEY = 'pvz-web:achievements:v1';

export class Achievements {
  readonly earned: Partial<Record<AchievementId, number>>;
  constructor(private storage: Storage) {
    const record = storage.getItem(KEY);
    this.earned = record === null ? {} : JSON.parse(record);
  }
  update(game: Game) {
    if (game.phase !== 'playing' && game.phase !== 'won' && game.phase !== 'intermission') return [];
    const unlocked = ACHIEVEMENTS.filter(item => this.earned[item.id] === undefined && item.achieved(game));
    if (unlocked.length) {
      const now = Date.now();
      for (const item of unlocked) this.earned[item.id] = now;
      this.storage.setItem(KEY, JSON.stringify(this.earned));
    }
    return unlocked;
  }
}
