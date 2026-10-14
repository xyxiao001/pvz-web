import { PLANTS, type PlantKind } from '../game/config';
import type { Game } from '../game/model';

type SeedView = { packet: number; kind: PlantKind; button: HTMLButtonElement; cover: HTMLElement; number: HTMLElement };

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
    this.seeds = Array.from(this.root.querySelectorAll<HTMLButtonElement>('[data-plant]'), button => ({
      kind: button.dataset.plant as PlantKind, packet: Number(button.dataset.packet), button,
      cover: button.querySelector('.cooldown-cover')!, number: button.querySelector('.cooldown-number')!,
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
    this.text(this.level, game.scenario === 'endless' ? ` ${game.config.title} · 第 ${game.survivalStage + 1} 轮 · 已守住 ${game.survivalFlags} 旗` : `冒险模式 ${game.config.label}`);
    this.text(this.sun, String(game.sun));
    if (game.hasConveyor) {
      const frame = Math.floor(game.ticks / 4) % 6;
      this.write(this.belt, 'frame', String(frame), () => { this.belt.style.backgroundPositionY = `${frame * 20}%`; });
    }
    for (const { kind, packet, button, cover, number } of this.seeds) {
      if (game.hasConveyor) {
        const position = game.conveyor.find(p => p.id === packet)!.x;
        this.write(button, 'position', String(position), () => { button.style.left = `${position / 8}cqw`; });
      }
      const remaining = game.cooldowns[kind]; const selected = game.hasConveyor ? game.selectedPacket === packet : game.selected === kind;
      this.class(button, 'selected', selected);
      this.class(button, 'unavailable', !game.hasConveyor && game.sun < PLANTS[kind].cost);
      this.write(button, 'disabled', game.phase !== 'playing', () => { button.disabled = game.phase !== 'playing'; });
      this.write(button, 'pressed', selected, () => button.setAttribute('aria-pressed', String(selected)));
      const height = game.hasConveyor ? '0%' : `${(remaining / PLANTS[kind].cooldown * 100).toFixed(1)}%`;
      this.write(cover, 'height', height, () => { cover.style.height = height; });
      this.text(number, remaining > 0 ? String(Math.ceil(remaining / 100)) : '');
    }
    const shovel = this.shovel;
    this.class(shovel, 'selected', game.digging);
    this.write(shovel, 'pressed', game.digging, () => shovel.setAttribute('aria-pressed', String(game.digging)));
    this.write(shovel, 'disabled', game.phase !== 'playing', () => { shovel.disabled = game.phase !== 'playing'; });
    const disabled = game.phase !== 'playing' && game.phase !== 'paused';
    this.write(this.pause, 'disabled', disabled, () => { this.pause.disabled = disabled; });
    this.text(this.wave, game.wave === 0 ? '准备种植' : `第 ${game.wave} / ${game.config.waveCount} 波`);
    const progress = game.wave / game.config.waveCount;
    this.write(this.fill, 'width', String(progress), () => { this.fill.style.width = `${progress * 100}%`; });
    this.write(this.head, 'right', String(progress), () => { this.head.style.right = `${progress * 84}%`; });
    this.text(this.advice, advice); this.class(this.advice, 'visible', !!advice);
  }
}
