import type { Draw, SpriteArt } from '../shell/types';
import type { Rig } from '../rendering/battle-art';
import type { DecodeFeatures } from './arcade';
export interface AlmanacEntry {
  id?:number; kind:string; name:string; card:string; world:string; background:string; boost?:number;
  garden?:{PlantPlace:string;FixedWeight?:number;Height?:number};
  stats:{label:string;value:string}[];
  description:{Introduction:{zh:string};Special:{NAME:{zh:string};DESCRIPTION:{zh:string}}[];Chat:{zh:string};Elements:{TYPE:string;VALUE?:number|string;SORT?:{zh:string};NAME?:{zh:string}}[]};
}
export interface GardenArea {id:number;name:string;scale:number;slots:{x:number;y:number;pot:boolean;floater:boolean;ground:number;unlocked:boolean}[];draws:Draw[];ambience:string}
export interface OuterCatalog {
  rigGroups:Record<string,string>;
  plants:AlmanacEntry[];zombies:AlmanacEntry[];
  upgrades:{CODENAME:string;SPRITENAME:string;NAME:{zh:string};DESCRIPTION:{zh:string}}[];
  almanac:{pages:Record<string,Draw[]>;art:Record<string,SpriteArt>;zombieCards:Rig[]};
  arcade:{features:DecodeFeatures;art:Record<string,SpriteArt>;rigs:Record<string,Rig>;card:Draw[];cardArt:Record<string,SpriteArt>;sounds:Record<string,string>;music:string};
  garden:{priceTag:SpriteArt;gardens:GardenArea[];rigs:Record<string,Rig&{scale:number}>;actors:Record<string,Rig>;sounds:Record<string,string>;music:string;sproutBundles:{CommodityCount:number;CurrencyRequired:number;StackLevel:number;CommodityDisplayName:{zh:string}}[]};
}
