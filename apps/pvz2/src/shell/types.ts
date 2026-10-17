export interface SpriteArt { image: string; width: number; height: number; insets: number[]; name: string }
export interface Draw {
  owner: number; name: string; kind: 'rig' | 'sprite' | 'label';
  x: number; y: number; sx: number; sy: number; rotation: number; parallax?: number;
  rig?: string; armature?: string; animation?: string;
  image?: string; w?: number; h?: number; ax?: number; ay?: number; text?: string; size?: number;
}
export interface World { id: string; name: string; description: string; difficulty: number; enterable: boolean; night: boolean; draw: Draw; levels?: string[] }
export interface SourceButton { x: number; y: number; w: number; h: number; normal: SpriteArt; hover: SpriteArt; pressed: SpriteArt }
export interface Catalog { music: string; sounds: Record<string,string>; toolbar: Draw[]; arrow: Draw; plantCards: Record<number,{animation:string;background:string}>; upgrades: string[]; worlds: World[]; chooser: Draw[]; background: string; buttons: Record<string, SourceButton>; window: Record<string, SpriteArt>; lock: Draw[]; nodes: Record<string, Draw[]> }
export interface Island { node: number; name: string; kind: number; appearance: number; levels: string[]; plant: number; upgrade: number; x: number; y: number; next: number[]; affectsBounds: boolean }
export interface WorldMap { id: string; draws: Draw[]; islands: Island[]; rigs: string[]; startingLevels: string[] }

export interface ProgressionArt { durations: Record<'finish' | 'open' | 'path', number>; plants: Record<number, Draw[]>; sounds: Record<string, string[]> }
