import type { Game } from '../game/model';
import tracks from './music-tracks.json';

export type MusicTrack = keyof typeof tracks;
export function battleMusic(game: Game): MusicTrack | null {
  if (game.boss) return 'boss';
  if (game.scenario === 'adventure' && game.level === 40) return null;
  if (game.config.mode === 'vase') return 'puzzle';
  if (game.scenario==='adventure' && game.level===45 || game.config.mode === 'bowling' || game.config.mode === 'whack' || game.level === 25 && game.scenario === 'adventure') return 'minigame';
  if (game.config.mode === 'conveyor') return 'conveyor';
  return game.config.environment;
}

// One current tune in memory. HTTP/PWA caching handles revisits; no music is fetched before interaction.
export class GameMusic {
  private context: AudioContext | null = null;
  private gain: GainNode | null = null;
  private source: AudioBufferSourceNode | null = null;
  private track: MusicTrack | null = null;
  private loading: Promise<AudioBuffer> | null = null;
  private offset = 0;
  private startedAt = 0;
  private paused = false;
  private isEnabled = true;
  constructor(private base: string, private createContext = () => new AudioContext()) {}
  get enabled() { return this.isEnabled; }
  set enabled(value: boolean) {
    this.isEnabled = value;
    if (value) void this.start(); else this.stop();
  }
  async activate() {
    this.context ??= this.createContext();
    if (!this.gain) { this.gain = this.context.createGain(); this.gain.gain.value = .5; this.gain.connect(this.context.destination); }
    await this.context.resume();
    await this.start();
  }
  setTrack(track: MusicTrack | null) {
    if (this.track === track) return;
    this.stop(); this.track = track; this.offset = 0; this.loading = null;
    void this.start();
  }
  setPaused(paused: boolean) {
    if (this.paused === paused) return;
    this.paused = paused;
    if (paused) this.stop(); else void this.start();
  }
  private stop() {
    if (!this.source) return;
    const duration = this.source.buffer!.duration, loopStart = this.source.loopStart;
    const elapsed = this.context!.currentTime - this.startedAt;
    this.offset = elapsed < duration ? elapsed : loopStart + (elapsed - loopStart) % (duration - loopStart);
    this.source.stop(); this.source.disconnect(); this.source = null;
  }
  private async start() {
    if (!this.context || !this.track || !this.enabled || this.paused || this.source) return;
    const track = this.track;
    this.loading ??= fetch(`${this.base}assets/music/${tracks[track].file}`)
      .then(response => response.arrayBuffer()).then(data => this.context!.decodeAudioData(data));
    const buffer = await this.loading;
    // A menu/level change or pause can occur while this tune is downloading.
    if (this.track !== track || !this.enabled || this.paused || this.source) return;
    const source = this.context.createBufferSource(); source.buffer = buffer;
    source.loop = true; source.loopStart = tracks[track].loopStart;
    source.connect(this.gain!); source.start(0, this.offset);
    this.startedAt = this.context.currentTime - this.offset; this.source = source;
  }
}
