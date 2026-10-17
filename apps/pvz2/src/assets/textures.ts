import { Assets, type Texture } from 'pixi.js';
import { ResourcePool, ResourceScope } from './resource-pool';
const pool=new ResourcePool<Texture>(path=>Assets.load<Texture>(path),path=>Assets.unload(path));
export const textureScope=()=>new ResourceScope(pool);
