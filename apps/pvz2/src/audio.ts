// PVZ2 preferences are shared by its map and battle, independent of PVZ1 saves.
const KEY = 'pvz2-web:audio';
export interface AudioSettings { music: number; effects: number }
export function readAudio(): AudioSettings {
  const value = localStorage.getItem(KEY);
  return value === null ? { music: .25, effects: .6 } : JSON.parse(value);
}
export function saveAudio(settings: AudioSettings) { localStorage.setItem(KEY,JSON.stringify(settings)); }
export function audioControls(settings: AudioSettings) {
  return `<label class="volume-option">音乐<input aria-label="音乐音量" data-volume="music" type="range" min="0" max="1" step="0.05" value="${settings.music}"></label><label class="volume-option">音效<input aria-label="音效音量" data-volume="effects" type="range" min="0" max="1" step="0.05" value="${settings.effects}"></label>`;
}
