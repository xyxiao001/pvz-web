import { Container, Sprite, Texture } from 'pixi.js';
import type { Zombie } from '../game/model';

// Display the combined body, helmet and shield health used by combat.
// Mini-zombie pools are rounded separately, matching Game.spawnZombie.
export function zombieHealthFraction(zombie: Pick<Zombie, 'kind' | 'mini' | 'health' | 'armor' | 'shield'>) {
  const kind = zombie.kind;
  const body = kind === 'gargantuar' ? 3000 : kind === 'catapult' ? 850 : kind === 'bungee' ? 450 : kind === 'zomboni' || kind==='yeti' ? 1350 : ['pole', 'dancer', 'dolphin', 'jack', 'ladder'].includes(kind) ? 500 : 270;
  const armor = kind === 'digger' ? 100 : kind === 'football' ? 1400 : kind === 'cone' ? 370 : kind === 'bucket' ? 1100 : 0;
  const shield = kind === 'ladder' ? 500 : kind === 'newspaper' ? 150 : kind === 'door' ? 1100 : 0;
  const maximum = zombie.mini ? Math.trunc(body / 4) + Math.trunc(armor / 4) + Math.trunc(shield / 4) : body + armor + shield;
  return (zombie.health + zombie.armor + zombie.shield) / maximum;
}

export class ZombieHealthBar {
  readonly root = new Container();
  private fill = new Sprite(Texture.WHITE);
  private health = -1;
  constructor() {
    const background = new Sprite(Texture.WHITE);
    background.position.set(-25, 0); background.width = 50; background.height = 6; background.tint = 0x20291b;
    this.fill.position.set(-24, 1); this.fill.height = 4; this.fill.tint = 0xa8dc4c;
    this.root.addChild(background, this.fill);
  }
  update(zombie: Zombie) {
    const health = zombie.health + zombie.armor + zombie.shield;
    if (health === this.health) return;
    this.health = health;
    this.fill.width = 48 * zombieHealthFraction(zombie);
  }
}
