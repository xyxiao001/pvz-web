import { reportError } from './errors';

export async function playAudio(clip: HTMLMediaElement, report = reportError): Promise<void> {
  try { await clip.play(); }
  catch (error) {
    // pause()/source changes intentionally cancel an in-flight play request.
    if (error instanceof Error && error.name === 'AbortError') return;
    report(error, `音频播放失败：${clip.currentSrc || clip.src}`);
  }
}

// PVZ2 preferences are shared by its map and battle, independent of PVZ1 saves.
const KEY = 'pvz2-web:audio';
export interface AudioSettings { music: number; effects: number }
export function readAudio(): AudioSettings {
  const value = localStorage.getItem(KEY);
  return value === null ? { music: .25, effects: .6 } : JSON.parse(value);
}
export function saveAudio(settings: AudioSettings) { localStorage.setItem(KEY,JSON.stringify(settings)); }
export function audioControls(settings: AudioSettings) {
  return `<div class="audio-settings">${(['music','effects'] as const).map(kind=>{
    const label=kind==='music'?'音乐':'音效',percent=Math.round(settings[kind]*100);
    return `<label class="volume-option"><span>${label}</span><input aria-label="${label}音量" data-volume="${kind}" type="range" min="0" max="1" step="0.05" value="${settings[kind]}" style="--volume:${percent}%"><output>${percent}%</output></label>`;
  }).join('')}</div>`;
}
export function updateVolumeControl(input: HTMLInputElement) {
  const percent=Math.round(Number(input.value)*100);
  input.style.setProperty('--volume',`${percent}%`);
  input.parentElement!.querySelector('output')!.textContent=`${percent}%`;
}
