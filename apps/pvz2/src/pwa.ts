import './pwa.css';
type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
type Status = { type: string; bytes: number; total: number; count: number; files: number; release: string; message?: string };
let registration: ServiceWorkerRegistration;
let installPrompt: InstallPrompt | undefined;
let reloadRequested = false;
let message = import.meta.env.PROD ? '正在准备离线服务…' : '开发预览不启用缓存；请使用生产预览测试安装和离线。';
const dialog = document.createElement('dialog');
dialog.className = 'pvz2-pwa-panel';
dialog.setAttribute('aria-label', '植物大战僵尸 2 安装与更新');
dialog.innerHTML = `<img src="${import.meta.env.BASE_URL}icons/app.svg" alt="植物大战僵尸 2 应用图标"/><h2>安装与更新</h2><p>植物大战僵尸 2 · 安装后可从桌面直接打开。iPhone 请使用浏览器分享菜单中的“添加到主屏幕”。</p><button id="pwa-install" disabled>使用浏览器的安装菜单</button><p>游玩过的资源会自动缓存。完整离线游玩前，可下载本版本全部关卡素材和音效。仅管理植物大战僵尸 2，存档保留在当前浏览器。</p><h3>离线资源</h3><p id="pwa-status" role="status"></p><progress id="pwa-progress" value="0" max="1"></progress><button id="pwa-download" disabled>下载离线资源</button><h3>版本更新</h3><button id="pwa-update" disabled>检查更新</button><p id="pwa-release" role="status"></p><button id="pwa-close">返回</button>`;
document.body.append(dialog);
// A waiting release is offered above the game; activation remains an explicit click.
const updateNotice = document.createElement('aside');
updateNotice.className = 'pvz2-update-notice'; updateNotice.hidden = true;
updateNotice.setAttribute('aria-label', '游戏更新');
updateNotice.innerHTML = '<div><strong>植物大战僵尸 2 有更新</strong><span>新版已就绪，更新会重新加载游戏，请先完成当前关卡。</span></div><button id="update-now">立即更新</button><button id="update-later">稍后</button>';
document.body.append(updateNotice);
function offerUpdate() {
  button('pwa-update').textContent = '更新并重新加载';
  release.textContent = '新版已准备好，点击更新后重新加载。';
  updateNotice.hidden = false;
}
function activateUpdate() { reloadRequested = true; registration.waiting!.postMessage('ACTIVATE'); }
updateNotice.querySelector<HTMLButtonElement>('#update-now')!.onclick = activateUpdate;
updateNotice.querySelector<HTMLButtonElement>('#update-later')!.onclick = () => { updateNotice.hidden = true; };
// Fullscreen only paints descendants of the fullscreen element.
document.addEventListener('fullscreenchange', () => {
  (document.fullscreenElement ?? document.body).append(updateNotice, dialog);
});

const button = (id: string) => dialog.querySelector<HTMLButtonElement>(`#${id}`)!;
const status = dialog.querySelector<HTMLElement>('#pwa-status')!;
const release = dialog.querySelector<HTMLElement>('#pwa-release')!;
const progress = dialog.querySelector<HTMLProgressElement>('#pwa-progress')!;
const showStatus = (text: string) => { message = text; status.textContent = text; };
const size = (n: number) => `${(n / 1048576).toFixed(1)} MiB`;
function renderStatus(value: Status) {
  progress.max = value.total; progress.value = value.bytes;
  showStatus(value.count === value.files ? `离线资源已就绪 · ${size(value.bytes)}` : `已缓存 ${value.count}/${value.files} 项 · ${size(value.bytes)} / ${size(value.total)}`);
  release.textContent = `当前版本 ${value.release}${registration.waiting ? ' · 新版本已就绪' : ''}`;
}
function request(action: 'DOWNLOAD' | 'STATUS') {
  return new Promise<void>((resolve, reject) => {
    const channel = new MessageChannel();
    channel.port1.onmessage = ({ data }: MessageEvent<Status>) => {
      if (data.type === 'error') { channel.port1.close(); reject(new Error(data.message)); return; }
      renderStatus(data);
      if (data.type === 'done') { channel.port1.close(); resolve(); }
    };
    registration.active!.postMessage(action, [channel.port2]);
  });
}
button('pwa-close').onclick = () => dialog.close();
dialog.addEventListener('keydown', event => event.stopPropagation());
window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); installPrompt = event as InstallPrompt; button('pwa-install').disabled = false; button('pwa-install').textContent = '安装到桌面'; });
window.addEventListener('appinstalled', () => { installPrompt = undefined; button('pwa-install').disabled = true; button('pwa-install').textContent = '已安装到桌面'; });
button('pwa-install').onclick = async () => { await installPrompt!.prompt(); await installPrompt!.userChoice; installPrompt = undefined; button('pwa-install').disabled = true; };
button('pwa-download').onclick = async () => {
  button('pwa-download').disabled = true;
  try { await request('DOWNLOAD'); } catch (error) { showStatus(`离线资源下载失败：${String(error)}`); }
  finally { button('pwa-download').disabled = false; }
};
button('pwa-update').onclick = async () => {
  try {
    if (registration.waiting) activateUpdate();
    else { await registration.update(); release.textContent = registration.installing ? '正在下载新版启动文件…' : '检查完成，当前没有待安装更新。'; }
  } catch (error) { release.textContent = `更新失败：${String(error)}`; }
};
function observe(worker: ServiceWorker) {
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && registration.active) offerUpdate();
  });
}
export async function registerPwa() {
  if (!import.meta.env.PROD) return;
  try {
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloadRequested && navigator.serviceWorker.controller?.scriptURL === new URL('sw.js', new URL(import.meta.env.BASE_URL, location.href)).href) location.reload(); });
    registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' });
    if (registration.installing) observe(registration.installing);
    registration.addEventListener('updatefound', () => observe(registration.installing!));
    // A root PVZ1 worker can still control this page on the first visit.
    // Wait for this registration, not navigator.serviceWorker.ready (which may be PVZ1).
    if (!registration.active) {
      const worker = registration.installing!;
      await new Promise<void>((resolve, reject) => {
        const changed = () => {
          if (worker.state === 'activated' || worker.state === 'redundant') {
            worker.removeEventListener('statechange', changed);
            if (worker.state === 'activated') resolve();
            else reject(new Error('植物大战僵尸 2 离线服务安装失败'));
          }
        };
        worker.addEventListener('statechange', changed);
        changed();
      });
    }
    button('pwa-download').disabled = false; button('pwa-update').disabled = false;
    if (registration.waiting) offerUpdate();
    await request('STATUS');
  } catch (error) { showStatus(`离线服务启动失败：${String(error)}`); }
}
export function showPwa() { status.textContent = message; dialog.showModal(); if (registration?.active) void request('STATUS').catch(error => showStatus(String(error))); }
