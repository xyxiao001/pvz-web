// Keep trackpad movement deliberate while allowing a sustained scroll to repeat.
export class WorldScrollGesture {
  private lastTime = -Infinity;
  private lastStep = -Infinity;
  private distanceStart = -Infinity;
  private distance = 0;

  step(delta: number, time: number): number {
    if (time - this.lastTime > 180) this.lastStep = -Infinity;
    if (time - this.lastTime > 180 || time - this.distanceStart > 180) {
      this.distance = 0;
      this.distanceStart = time;
    }
    this.lastTime = time;
    if (time - this.lastStep < 350) {
      this.distance = 0;
      this.distanceStart = time;
      return 0;
    }
    this.distance += delta;
    if (Math.abs(this.distance) < 48) return 0;
    const direction = Math.sign(this.distance);
    this.lastStep = time;
    this.distance = 0;
    this.distanceStart = time;
    return direction;
  }
}
