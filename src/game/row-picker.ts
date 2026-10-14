// PvZ-Portable Board::PickRowForNewZombie and PvzpCommon::PvzpCalcSmoothWeight.
// Preserve the original row history and post-mower spawn weights for day levels.
export class RowPicker {
  private rows: { row: number; last: number; secondLast: number; mowedWave: number }[];
  constructor(rows: readonly number[]) {
    this.rows = rows.map(row => ({ row, last: 0, secondLast: 0, mowedWave: -100 }));
  }
  snapshot() { return this.rows.map(row => ({ ...row })); }
  static restore(rows: ReturnType<RowPicker['snapshot']>) { const picker = new RowPicker([]); picker.rows = rows.map(row => ({ ...row })); return picker; }
  mowed(row: number, wave: number) { this.rows.find(item => item.row === row)!.mowedWave = wave; }
  beginSurvivalStage() { for (const row of this.rows) row.mowedWave = -100; }
  pick(wave: number, random: number, allowed: readonly number[] = this.rows.map(item => item.row)) {
    const weights: number[] = this.rows.map(item => {
      if (!allowed.includes(item.row)) return 0;
      const sinceMowed = wave - item.mowedWave;
      return sinceMowed <= 1 ? .01 : sinceMowed <= 2 ? .5 : 1;
    });
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    const adjusted = weights.map((weight, i) => {
      const normalized = weight / total;
      const first = 2 * normalized * (this.rows[i].last + 1) - 1;
      const second = normalized * (this.rows[i].secondLast + 1) - 1;
      return normalized * Math.max(.01, Math.min(100, .75 * first + .25 * second));
    });
    let choice = random * adjusted.reduce((sum, weight) => sum + weight, 0);
    let index = 0;
    while (index < this.rows.length - 1 && (adjusted[index] === 0 || choice >= adjusted[index])) choice -= adjusted[index++];
    for (const row of this.rows) { row.last++; row.secondLast++; }
    const picked = this.rows[index];
    picked.secondLast = picked.last; picked.last = 0;
    return picked.row;
  }
}
