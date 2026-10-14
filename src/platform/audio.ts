import type { GameEvent } from '../game/model';

const files = { plant: 'plant_water', sun: 'points', mower: 'lawnmower', wave: 'finalwave', flag: 'hugewave',
  win: 'winmusic', lose: 'losemusic', explode: 'cherrybomb', swallow: 'chomp', fume: 'fume', whack: 'bonk', hypnotize: 'mindcontrolled', freeze: 'frozen' } as const;
export class GameAudio {
  private context: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private loading: Promise<void> | null = null;
  private output: GainNode | null = null;
  private isMuted = false;
  get muted() { return this.isMuted; }
  set muted(value: boolean) {
    this.isMuted = value;
    if (this.output) this.output.gain.value = value ? 0 : 1;
  }

  async unlock() {
    this.context ??= new AudioContext();
    if (!this.output) {
      this.output = this.context.createGain();
      this.output.gain.value = this.muted ? 0 : 1;
      this.output.connect(this.context.destination);
    }
    await this.context.resume();
    this.loading ??= Promise.all(Object.entries(files).map(async ([key, file]) => {
      const data = await (await fetch(`${import.meta.env.BASE_URL}assets/original/${file}.${['fume', 'whack', 'hypnotize', 'freeze'].includes(key) ? 'ogg' : 'mp3'}`)).arrayBuffer();
      this.buffers.set(key, await this.context!.decodeAudioData(data));
    })).then(() => {});
    await this.loading;
  }

  play(kind: GameEvent['kind']) {
    if (!this.context || this.muted) return;
    if (kind === 'shoot' || kind === 'hit') {
      const oscillator = this.context.createOscillator(); const gain = this.context.createGain();
      oscillator.frequency.setValueAtTime(kind === 'shoot' ? 420 : 130, this.context.currentTime);
      gain.gain.setValueAtTime(.02, this.context.currentTime);
      gain.gain.exponentialRampToValueAtTime(.001, this.context.currentTime + .08);
      oscillator.connect(gain); gain.connect(this.output!);
      oscillator.start(); oscillator.stop(this.context.currentTime + .09);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      return;
    }
    const source = this.context.createBufferSource(); source.buffer = this.buffers.get(kind)!;
    source.connect(this.output!); source.start(); source.onended = () => source.disconnect();
  }
}
