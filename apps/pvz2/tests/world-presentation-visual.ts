import {Graphics,Sprite} from 'pixi.js';
import {json} from '../src/assets/load';
import {BATTLE_LEVELS} from '../src/game/levels';
import {BOARD,cellX,rowY,readLevel,type Properties,type SourceLevel,type PlantKind} from '../src/game/level';
import {Game} from '../src/game/model';
import {Scene} from '../src/rendering/scene';

const host=document.querySelector<HTMLDivElement>('#scene')!,status=document.querySelector<HTMLOutputElement>('#status')!;
let scene:Scene|undefined;
const variants=Object.values(BATTLE_LEVELS).filter((config,index,all)=>all.findIndex(c=>c.presentation.lawn===config.presentation.lawn)===index).map(config=>config.id);
async function render(id:string){
 if(scene){await scene.dispose();host.replaceChildren();}
 status.value=`正在检查 ${id}`;
 const config=BATTLE_LEVELS[id],level=readLevel(await json<SourceLevel>(config.source));
 const props=await json<Properties>('levels/properties.json');
 for(const bundle of [...(config.assets==='campaign'?['campaign']:[]),...(config.bundles??[])]){
  const extra=await json<Properties>(`${bundle}/properties.json`);
  if(bundle==='campaign')Object.assign(props,{grave:extra.grave,powerups:extra.powerups});
  for(const key of ['plants','zombies','armors','projectiles','plantAnimations'] as const)Object.assign(props,{[key]:{...props[key],...extra[key]}});
 }
 props.zombies.mummy_flag=await json('battle/flag.json');
 const plants=[...new Set<PlantKind>(['peashooter','sunflower','wallnut',...(level.chooserPlants??[]),...(level.preset??[]),...level.initialPlants.map(p=>p.kind),...level.protectedPlants.map(p=>p.kind),...(level.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...level.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 scene=new Scene();await scene.init(host,()=>{},config,plants,level);
 const game=new Game(level,props,scene.timing,z=>scene!.absorptionTarget(z),1234,false);
 for(const row of [0,2,4])game.addPlant('sunflower',row,0);
 scene.frameCombat();scene.sync(game,0);
 const grid=new Graphics();
 for(let row=0;row<BOARD.rows;row++)for(let column=0;column<BOARD.columns;column++){
  grid.rect(BOARD.left+column*BOARD.cellWidth,BOARD.top+row*BOARD.cellHeight,BOARD.cellWidth,BOARD.cellHeight).stroke({color:0xfff05a,width:1,alpha:.8});
  grid.circle(cellX(column),rowY(row),2).fill(0xff30f0);
 }
 const world=scene.app.stage.children[0];
 const staticLawns=world.children.filter(child=>child instanceof Sprite).length;
 world.addChild(grid);scene.render();
 if(staticLawns!==(config.world==='egypt'?1:0))throw new Error(`${id}: duplicate static lawn (${staticLawns})`);
 const result={id,world:config.world,night:config.night,staticLawns,columns:BOARD.columns,rows:BOARD.rows};
 status.value=JSON.stringify(result);return result;
}
for(const id of variants){const button=document.createElement('button');button.textContent=id;button.onclick=()=>{void render(id).catch(error=>{status.value=String(error);console.error(error);});};document.querySelector('#controls')!.append(button);}
Object.assign(window,{worldAudit:{variants,render}});
