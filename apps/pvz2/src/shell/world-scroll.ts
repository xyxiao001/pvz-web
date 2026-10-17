// Trackpad momentum belongs to the same gesture until wheel events stop arriving.
export class WorldScrollGesture {
  private lastTime = -Infinity;
  private distance = 0;
  private stepped = false;

  step(delta: number, time: number): number {
    if (time - this.lastTime > 180) {
      this.distance = 0;
      this.stepped = false;
    }
    this.lastTime = time;
    this.distance += delta;
    if (this.stepped || Math.abs(this.distance) < 48) return 0;
    this.stepped = true;
    return Math.sign(this.distance);
  }
}
