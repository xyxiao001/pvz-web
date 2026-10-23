import {ENDLESS_LEVELS} from './game/endless';
import './shell/style.css';
import './cursor.css';
import './errors.css';
import { registerPwa } from './pwa';
import { installErrorReporting } from './errors';
import { BATTLE_LEVELS } from './game/levels';
import { WorldShell } from './shell/controller';

installErrorReporting();
const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = '<main class="world-shell"></main><div class="battle-app" hidden></div>';
const host = app.querySelector<HTMLElement>('.world-shell')!;
const battleHost = app.querySelector<HTMLElement>('.battle-app')!;
let battle: ReturnType<typeof import('./battle').createBattle>|undefined;
const shell = new WorldShell(host, async (level, progress) => {
  await battle?.dispose();
  const { createBattle } = await import('./battle');
  battle = createBattle(battleHost, async () => { await battle!.dispose();battle=undefined;await shell.resume(); }, (BATTLE_LEVELS[level]??ENDLESS_LEVELS[level]), progress);
  await battle.enter();
});
void shell.init();

void registerPwa();
