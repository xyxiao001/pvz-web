import './shell/style.css';
import './cursor.css';
import { BATTLE_LEVELS } from './game/levels';
import { WorldShell } from './shell/controller';

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = '<main class="world-shell"></main><div class="battle-app" hidden></div>';
const host = app.querySelector<HTMLElement>('.world-shell')!;
const battleHost = app.querySelector<HTMLElement>('.battle-app')!;
let battle: ReturnType<typeof import('./battle').createBattle>|undefined;
const shell = new WorldShell(host, async (level, progress) => {
  battle?.dispose();
  const { createBattle } = await import('./battle');
  battle = createBattle(battleHost, () => { battle!.dispose();battle=undefined;void shell.resume(); }, BATTLE_LEVELS[level], progress);
  await battle.enter();
});
void shell.init();
