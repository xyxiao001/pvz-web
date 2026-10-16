import './shell/style.css';
import { WorldShell } from './shell/controller';

const app = document.querySelector<HTMLElement>('#app')!;
app.innerHTML = '<main class="world-shell"></main><div class="battle-app" hidden></div>';
const host = app.querySelector<HTMLElement>('.world-shell')!;
const battleHost = app.querySelector<HTMLElement>('.battle-app')!;
let battle: ReturnType<typeof import('./battle').createBattle>;
const shell = new WorldShell(host, async () => {
  if (!battle) {
    const { createBattle } = await import('./battle');
    battle = createBattle(battleHost, () => { void shell.resume(); });
  }
  await battle.enter();
});
void shell.init();
