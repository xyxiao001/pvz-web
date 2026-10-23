export type FrameLimit = 0 | 120 | 60 | 30;
export const FRAME_LIMIT_KEY = 'pvz2:frame-limit';

export function readFrameLimit(storage: Pick<Storage, 'getItem'>): FrameLimit {
  const saved = storage.getItem(FRAME_LIMIT_KEY);
  return saved === null ? 60 : Number(saved) as FrameLimit;
}

export function saveFrameLimit(storage: Pick<Storage, 'setItem'>, limit: FrameLimit) {
  storage.setItem(FRAME_LIMIT_KEY, String(limit));
}

export function frameLimitControl(limit: FrameLimit): string {
  return `<label class="frame-limit-option"><span>帧率上限</span><select data-frame-limit aria-label="帧率上限">${([0,120,60,30] as const).map(value=>`<option value="${value}"${value===limit?' selected':''}>${value===0?'无上限':value+' FPS'}</option>`).join('')}</select></label>`;
}
