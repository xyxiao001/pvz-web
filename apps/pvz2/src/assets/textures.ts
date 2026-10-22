import { Assets, type Texture } from 'pixi.js';
import { ResourcePool, ResourceScope } from './resource-pool';
import { textureResolution } from './quality';
const pool=new ResourcePool<Texture>(path=>Assets.load<Texture>({src:path,data:{resolution:textureResolution(path)}}),path=>Assets.unload(path));
export const textureScope=()=>new ResourceScope(pool);
