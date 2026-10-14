type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };
type Status = { type: string; bytes: number; total: number; count: number; files: number; release: string; message?: string };
let registration: ServiceWorkerRegistration;
let installPrompt: InstallPrompt | undefined;
let reloadRequested = false;
let message = import.meta.env.PROD ? '正在准备离线服务…' : '开发预览不启用缓存；请使用生产预览测试安装和离线。';
const dialog = document.createElement('dialog');
dialog.className = 'pwa-panel';
dialog.innerHTML = `<img src="${import.meta.env.BASE_URL}icons/icon-192.png" alt="豌豆射手应用图标"/><h2>把庭院带到桌面</h2><p>安装后可从桌面直接打开。iPhone 请使用浏览器分享菜单中的“添加到主屏幕”。</p><button id="pwa-install" disabled>使用浏览器的安装菜单</button><p>首次离线游玩前，下载全部高清素材和音效。存档仍保留在当前浏览器。</p><p id="pwa-status" role="status"></p><progress id="pwa-progress" value="0" max="1"></progress><button id="pwa-download" disabled>下载离线资源</button><button id="pwa-update" disabled>检查更新</button><p id="pwa-release" role="status"></p><button id="pwa-close">返回</button>`;
document.body.append(dialog);
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
    if (registration.waiting) { reloadRequested = true; registration.waiting.postMessage('ACTIVATE'); }
    else { await registration.update(); release.textContent = registration.installing ? '正在下载新版启动文件…' : '检查完成，当前没有待安装更新。'; }
  } catch (error) { release.textContent = `更新失败：${String(error)}`; }
};
function observe(worker: ServiceWorker) {
  worker.addEventListener('statechange', () => {
    if (worker.state === 'installed' && navigator.serviceWorker.controller) { button('pwa-update').textContent = '更新并重新加载'; release.textContent = '新版已准备好，点击更新后重新加载。'; }
  });
}
export async function registerPwa() {
  if (!import.meta.env.PROD) return;
  try {
    navigator.serviceWorker.addEventListener('controllerchange', () => { if (reloadRequested) location.reload(); });
    registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, { scope: import.meta.env.BASE_URL, updateViaCache: 'none' });
    if (registration.installing) observe(registration.installing);
    registration.addEventListener('updatefound', () => observe(registration.installing!));
    await navigator.serviceWorker.ready;
    button('pwa-download').disabled = false; button('pwa-update').disabled = false;
    if (registration.waiting) button('pwa-update').textContent = '更新并重新加载';
    await request('STATUS');
  } catch (error) { showStatus(`离线服务启动失败：${String(error)}`); }
}
export function showPwa() { status.textContent = message; dialog.showModal(); if (registration?.active) void request('STATUS').catch(error => showStatus(String(error))); }
