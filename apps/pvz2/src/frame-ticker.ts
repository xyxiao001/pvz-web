import { Ticker, type Application } from 'pixi.js';

// Pixi's built-in limiter truncates elapsed milliseconds, losing cadence at 60/120 Hz.
// Keep fractional deadlines; simulation still receives all elapsed time via Ticker.
export class FrameTicker extends Ticker {
  private limit = 0;
  private frameTime: number | null = null;

  override get maxFPS() { return this.limit; }
  override set maxFPS(value: number) { this.limit=value; this.frameTime=null; }

  override update(now=performance.now()) {
    if(this.limit>0){
      const interval=1000/this.limit,previous=this.frameTime??this.lastTime,elapsed=now-previous;
      // Allow only floating-point rounding at the deadline, not a whole millisecond.
      const steps=Math.floor((elapsed+1e-6)/interval);
      if(steps<1)return;
      this.frameTime=previous+steps*interval;
    }
    super.update(now);
  }

  override stop() { super.stop(); this.frameTime=null; }
}

export function installFrameTicker(app: Application, limit: number) {
  const previous=app.ticker;
  app.ticker=new FrameTicker();
  app.ticker.maxFPS=limit;
  previous.destroy();
}
