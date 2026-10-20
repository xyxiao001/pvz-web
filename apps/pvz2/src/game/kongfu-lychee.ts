import {BOARD,cellX} from './level';
import type {Game,Plant} from './model';
import native from '../../public/assets/kongfu/properties.json';
const prop=native.plants.lychee;
export class KongfuLychee {
 states=new Map<number,{hp:number;stage:number;fooded:boolean}>();
 hits:{id:number;row:number;column:number;metal:boolean;at:number}[]=[];
 constructor(private g:Game){}
 add(p:Plant){if(p.kind==='lychee'){this.states.set(p.id,{hp:p.hp,stage:0,fooded:false});p.animation='Idle';}}
 scale(p:Plant){return this.states.get(p.id)!.fooded?prop.PlantfoodDamageReceiveMult:1;}
 repair(p:Plant){p.hp=prop.Toughness;const s=this.states.get(p.id)!;s.hp=p.hp;s.stage=0;}
 food(p:Plant){this.repair(p);this.states.get(p.id)!.fooded=true;p.action='idle';p.animation='Idle';this.g.beach.sounds.push('lychee/food');}
 tick(p:Plant){if(p.action==='shoot'&&this.g.time-p.actionAt>=native.plantAnimations.lychee.Shoot.duration){p.action='idle';p.animation='Idle';}}
 settle(){const g=this.g;this.hits=this.hits.filter(h=>g.time-h.at<native.plantAnimations.lycheeHit.Play0.duration);
  for(const p of g.plants){if(p.kind!=='lychee')continue;const s=this.states.get(p.id)!,hp=Math.max(0,p.hp),interval=s.fooded?prop.HealthBetweenHitsPlantfood:prop.HealthBetweenHits;
   // Native Lychee counts crossed health intervals, including the lethal hit.
   const hits=Math.max(0,Math.floor(s.hp/interval)-Math.floor(hp/interval));s.hp=hp;s.stage=Math.max(0,5-Math.floor(hp/prop.Toughness*6));
   if(!hits)continue;const damage=hits*(s.fooded?prop.DamagePerHitPlantfood:prop.DamagePerHit);
   for(const z of g.zombies)if(z.hp>0&&Math.abs(z.row-p.row)<=1&&Math.abs(z.x-cellX(p.column))<=BOARD.cellWidth*1.5)g.damage(z,damage);
   for(const t of g.graves)if(t.hp>0&&Math.abs(t.row-p.row)<=1&&Math.abs(t.column-p.column)<=1)t.hp-=damage;
   p.action='shoot';p.animation='Shoot';p.actionAt=g.time;g.beach.sounds.push('lychee/hit');if(s.fooded)g.beach.sounds.push('lychee/metal');
   this.hits.push({id:g.nextEntityId(),row:p.row,column:p.column,metal:s.fooded,at:g.time});
  }
 }
}
