import { BOSS_HEALTH } from '../game/boss';
import { PLANTS, UPGRADES, isUpgrade, type PlantKind } from '../game/config';
import type { Game } from '../game/model';

type SeedView = { packet: number; kind: PlantKind; button: HTMLButtonElement; cover: HTMLElement; number: HTMLElement; price: HTMLElement | null; shortcut: number };

// Resolve DOM nodes once. Only changed values cross the DOM boundary.
export class Hud {
  private seeds: SeedView[] = [];
  private values = new WeakMap<HTMLElement, Map<string, string | boolean>>();
  private sun: HTMLElement;
  private belt: HTMLElement;
  private shovel: HTMLButtonElement;
  private pause: HTMLButtonElement;
  private wave: HTMLElement;
  private fill: HTMLElement;
  private head: HTMLElement;
  private advice: HTMLElement;
  private level: HTMLElement;
  constructor(private root: HTMLElement) {
    this.sun = root.querySelector('#sun-total')!;
    this.belt = root.querySelector('#conveyor-belt')!;
    this.shovel = root.querySelector('#shovel')!;
    this.pause = root.querySelector('#pause')!;
    this.wave = root.querySelector('#wave-label')!;
    this.fill = root.querySelector('#wave-fill')!;
    this.head = root.querySelector('#meter-head')!;
    this.advice = root.querySelector('#advice')!;
    this.level = root.querySelector('#level-label')!;
  }
  bindSeeds() {
    this.seeds = Array.from(this.root.querySelectorAll<HTMLButtonElement>('[data-plant]'), (button, index) => ({
      kind: button.dataset.plant as PlantKind, packet: Number(button.dataset.packet), button,
      cover: button.querySelector('.cooldown-cover')!, number: button.querySelector('.cooldown-number')!, price: button.querySelector('.packet-price'), shortcut: (index + 1) % 10,
    }));
  }
  private write(node: HTMLElement, key: string, value: string | boolean, apply: () => void) {
    let values = this.values.get(node);
    if (!values) { values = new Map(); this.values.set(node, values); }
    if (values.get(key) === value) return;
    values.set(key, value); apply();
  }
  private text(node: HTMLElement, text: string) { this.write(node, 'text', text, () => { node.textContent = text; }); }
  private class(node: HTMLElement, key: string, enabled: boolean) { this.write(node, key, enabled, () => node.classList.toggle(key, enabled)); }
  update(game: Game, advice: string) {
    this.text(this.level, game.isSurvival ? ` ${game.config.title} · 第 ${game.survivalStage + 1} 轮 · 已守住 ${game.survivalFlags}${game.survivalGoal === null ? '' : ` / ${game.survivalGoal}`} 旗` : `冒险模式 ${game.config.label}${game.seeds.includes('marigold')||game.money>0?` · 金币 ${game.money}`:''}`);
    this.text(this.sun, String(game.sun));
    if (game.hasConveyor) {
      const frame = Math.floor(game.ticks / 4) % 6;
      this.write(this.belt, 'frame', String(frame), () => { this.belt.style.backgroundPositionY = `${frame * 20}%`; });
    }
    for (const { kind, packet, button, cover, number, price, shortcut } of this.seeds) {
      if (game.hasConveyor) {
        const position = game.conveyor.find(p => p.id === packet)!.x;
        this.write(button, 'position', String(position), () => { button.style.left = `${position / 8}cqw`; });
      }
      const remaining = game.cooldown(kind); const selected = game.hasConveyor ? game.selectedPacket === packet : game.selected === kind;
      if (isUpgrade(kind)) {
        const cost = game.plantCost(kind); this.text(price!, String(cost));
        this.write(button, 'label', String(cost), () => { button.setAttribute('aria-label', `${PLANTS[kind].name}，${cost} 阳光`); button.title = `${PLANTS[kind].name} · ${cost} 阳光 · 需种在${PLANTS[UPGRADES[kind]].name}上 · 快捷键 ${shortcut}`; });
      }
      this.class(button, 'selected', selected);
      this.class(button, 'unavailable', !game.hasConveyor && game.sun < game.plantCost(kind));
      this.write(button, 'disabled', game.phase !== 'playing', () => { button.disabled = game.phase !== 'playing'; });
      this.write(button, 'pressed', selected, () => button.setAttribute('aria-pressed', String(selected)));
      const height = game.hasConveyor ? '0%' : `${(remaining / PLANTS[kind==='imitater'?game.imitaterTarget!:kind].cooldown * 100).toFixed(1)}%`;
      this.write(cover, 'height', height, () => { cover.style.height = height; });
      this.text(number, remaining > 0 ? String(Math.ceil(remaining / 100)) : '');
    }
    const shovel = this.shovel;
    this.class(shovel, 'selected', game.digging);
    this.write(shovel, 'pressed', game.digging, () => shovel.setAttribute('aria-pressed', String(game.digging)));
    this.write(shovel, 'disabled', game.phase !== 'playing', () => { shovel.disabled = game.phase !== 'playing'; });
    const disabled = game.phase !== 'playing' && game.phase !== 'paused';
    this.write(this.pause, 'disabled', disabled, () => { this.pause.disabled = disabled; });
    this.text(this.wave, game.boss ? `僵王生命 ${Math.ceil(game.boss.health / BOSS_HEALTH * 100)}%` : game.config.mode === 'vase' ? `第 ${game.vaseStage + 1} / 3 轮 · 剩余 ${game.vases.length} 罐` : game.wave === 0 ? '准备种植' : `第 ${game.wave} / ${game.config.waveCount} 波`);
    const progress = game.boss ? 1-game.boss.health/BOSS_HEALTH : game.wave / game.config.waveCount;
    this.write(this.fill, 'width', String(progress), () => { this.fill.style.width = `${progress * 100}%`; });
    this.write(this.head, 'right', String(progress), () => { this.head.style.right = `${progress * 84}%`; });
    this.text(this.advice, advice); this.class(this.advice, 'visible', !!advice);
  }
}
