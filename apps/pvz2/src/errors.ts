type Recovery = { retry: () => Promise<void>; back: () => Promise<void> };
let panel: HTMLDialogElement | undefined;
let detail: HTMLTextAreaElement;
let actions: HTMLElement;
let status: HTMLElement;
const seen = new Set<string>();

export function errorDetails(error: unknown, context: string) {
  return `${context}\n${error instanceof Error ? `${error.name}: ${error.message}\n${error.stack ?? ''}` : String(error)}`;
}

/** Keep reporting outside the game DOM so disposing a scene cannot remove it. */
export function reportError(error: unknown, context = '游戏运行错误', recovery?: Recovery) {
  const text = errorDetails(error, context);
  if (seen.has(text) && !recovery) return;
  console.error(text);
  if (!panel) {
    panel = document.createElement('dialog');
    panel.className = 'pvz2-error-panel';
    panel.setAttribute('aria-labelledby', 'pvz2-error-title');
    panel.innerHTML = `<h2 id="pvz2-error-title">遇到一个问题</h2><p>可以复制错误详情反馈，或关闭此窗口。</p><textarea readonly aria-label="错误详情"></textarea><p role="status"></p><div class="error-actions"></div>`;
    document.body.append(panel);
    detail = panel.querySelector('textarea')!;
    status = panel.querySelector('[role="status"]')!;
    actions = panel.querySelector('.error-actions')!;
  }
  if (!seen.has(text)) {
    seen.add(text);
    detail.value += `${detail.value ? '\n\n' : ''}${new Date().toISOString()}\n${text}\n页面：${location.href}`;
  }
  actions.replaceChildren();
  status.textContent = '';
  const button = (label: string, action: () => void) => {
    const b = document.createElement('button'); b.textContent = label; b.onclick = action; actions.append(b);
  };
  button('复制错误详情', () => {
    void navigator.clipboard.writeText(detail.value).then(() => { status.textContent = '已复制'; }, () => {
      detail.focus(); detail.select(); status.textContent = '复制未成功，请按 ⌘C 或 Ctrl+C 复制已选中的详情。';
    });
  });
  if (recovery) {
    const run = (action: () => Promise<void>) => { panel!.close(); void action().catch(e => reportError(e, '恢复地图失败', recovery)); };
    button('重试地图', () => run(recovery.retry));
    button('返回世界选择', () => run(recovery.back));
  }
  button('关闭', () => panel!.close());
  // Non-modal: the map/battle remains interactive and is never paused by reporting.
  if (!panel.open) panel.show();
  detail.setSelectionRange(0, 0); detail.scrollTop = 0;
}

export function installErrorReporting() {
  window.addEventListener('error', event => reportError(event.error ?? event.message, '游戏运行错误'));
  window.addEventListener('unhandledrejection', event => reportError(event.reason, '异步操作失败'));
}
