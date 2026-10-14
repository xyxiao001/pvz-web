import { performance } from 'node:perf_hooks';
import { createHash } from 'node:crypto';
import { denseGame } from '../tests/helpers/performance';
const results=[];
for(const scene of ['day','pool','roof'] as const){
  const runs=[];let hash='';
  for(let run=0;run<6;run++){
    const game=denseGame(scene),start=performance.now();
    for(let i=0;i<1000;i++){game.step();game.drainEvents();}
    runs.push(performance.now()-start);
    hash=createHash('sha256').update(JSON.stringify(game.snapshot())).digest('hex');
  }
  results.push({scene,medianMs:runs.slice(1).sort((a,b)=>a-b)[2],runs,hash});
}
console.log(JSON.stringify(results,null,2));
