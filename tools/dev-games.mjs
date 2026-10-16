import { spawn } from 'node:child_process';

const games = [
  spawn('pnpm', ['run', 'dev:pvz1'], { stdio: 'inherit' }),
  spawn('pnpm', ['run', 'dev:pvz2'], { stdio: 'inherit' }),
];
let stopping = false;
function stop(code) {
  if (stopping) return;
  stopping = true;
  for (const game of games) game.kill('SIGTERM');
  process.exitCode = code;
}
for (const game of games) game.on('exit', code => stop(code));
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));
