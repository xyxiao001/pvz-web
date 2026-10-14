# 安装、离线与应用图标

入口：主菜单 → 设置 → 安装与离线。生产构建 `pnpm build` 后 `pnpm preview`；开发模式不注册 Service Worker。将 dist 部署到 HTTPS 站点根目录，本地 localhost / 127.0.0.1 可测试。依据：[MDN PWA 安装条件](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable)、[Service Worker 生命周期](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)。

支持安装提示的浏览器可点击“安装到桌面”；未提供安装事件时使用浏览器自己的安装菜单。iPhone 使用分享菜单“添加到主屏幕”。本轮没有实际操作 Chrome / iOS 的系统安装界面。

首次离线前点击“下载离线资源”，等到“离线资源已就绪”，约 112.5 MiB / 203 项。包含高清图集、背景、HUD、音效及页面程序；原图和设计母图不预缓存。安装只预缓存 11 个启动文件，运行时按访问缓存资源；动态 Pixi / 战斗模块不在启动预缓存清单内，首次进入关卡才请求。缓存按文件 SHA-256 复用，新版本无需再次下载未变化的大图。旧版本文件暂留缓存，当前没有清理缓存按钮。

点击“检查更新”，新启动文件准备好后，按钮变为“更新并重新加载”。只有主动点按钮才激活等待中的更新并刷新，战斗期间不自动重载。离线下载失败会显示错误，不显示虚假的完整状态；当前没有自动重试。存档仍在当前浏览器，不因安装而跨浏览器同步。

## 实现文件

- `public/manifest.webmanifest`：名称、启动地址、独立窗口模式、主题色和安装图标。
- `index.html`：manifest、favicon PNG / ICO、Apple Touch 图标及移动安装元信息。
- `tools/build-pwa.ts`：构建时生成文件散列、大小、版本和启动清单。
- `tools/pwa-worker.js`：同源本应用文件缓存、下载进度、状态查询与主动激活。
- `src/platform/pwa.ts`：安装事件、下载和更新面板；样式位于 `src/style.css`。

参考 KR 项目的对应构建插件、pwa-worker、游戏安装面板及图标导出结构；未修改 KR。

## 图标设计与复现

采用单株豌豆射手、深绿背景、粗轮廓，无文字。母图由本轮内置 `image_gen` 生成，保存为 `public/icons/icon-master.png`。不是使用在线资源链接，也不是游戏素材高清处理的替代。

`python3 tools/build-icons.py` 使用 Pillow 将母图机械缩放输出：

| 文件 | 用途 |
|---|---|
| icon-16.png / icon-32.png / favicon.ico | HTML 标签页与快捷图标 |
| apple-touch-icon.png（180×180） | Apple 主屏幕 |
| icon-192.png / icon-512.png | PWA 安装 |
| maskable-512.png | 自适应遮罩图标，主体缩至中央安全区域 |

生成方式：内置 imagegen，文本生成新图、不透明背景、无参考图。使用的完整提示词：

> Use case: logo-brand. Asset type: square PWA game app icon, master art for 512px installed icon and favicon. Primary request: design an attractive Plants vs Zombies web game icon featuring a single recognizable bright green Peashooter head with its round trumpet snout pointing right, two friendly black eyes, curved stem and two leaves, on a deep forest green background with a subtle warm sunlight glow behind its head. Style: polished original PvZ-like playful hand-painted cartoon, bold dark clean outlines, simple broad highlights, crisp rounded silhouette, high readability at tiny sizes. Composition: single large centered character, all essential head and leaves within central 68 percent square for maskable icon cropping. Opaque full-bleed square background, no rounded outer corners (OS handles masking). No text, no letters, no logo lettering, no extra objects, no borders, no watermark. Output a single square icon, not a mockup or sheet.

## 验证记录

- 全部 104 项测试、TypeScript 检查及 Vite 构建通过；没有运行 lint。
- Worker 单元测试验证启动缓存、全量下载、同源范围、离线读取页面 / 贴图 / 音效、跨版本相同资源复用、只有 ACTIVATE 才 skipWaiting，以及下载失败不报完成。
- manifest / HTML 引用与各安装图标实际尺寸检查通过。
- 实际浏览器下载完成 126 项后停止生产服务器，再刷新页面，进入冒险 1–1 并种植射手，阳光从 150 扣至 50；资源及音效加载成功，无 console error / warn。截图：`artifacts/pwa-offline-battle.png`。
- 重启服务器并构建新版本，检查更新出现“更新并重新加载”，点击后成功加载新版本。最终面板截图：`artifacts/pwa-ready.png`。

开发端口与生产端口各有独立浏览器存档；验证未修改玩家冒险解锁记录。手机安装、低显存设备和长时间高旗数运行尚未实测。

## 按需资源版本更新

运行时资源已切换为 `assets/runtime` 的无损 WebP，旧 HD PNG 不再纳入新版离线包。完整下载仍包含所有动态代码、角色动作、背景和音效，保持未曾打开的关卡也可离线进入。旧安装用户点“检查更新”→“更新并重新加载”后使用新版资源；旧缓存仍按现有策略保留，因此 112.5 MiB 是新版所需文件总量，不是升级后浏览器全部占用。

本轮 108 项测试与生产构建通过；新版 203 项下载完成后停止本地服务器，刷新、动态加载战斗模块、进入首关并种植成功（150→50 阳光）。图像无损校验覆盖全部 2425 帧与 73 张静态图片。

### 战斗贴图与音效进一步按需加载

弹丸、孢子和弹坑贴图在确认选卡后准备，按所选植物、保留植物以及存档中的在途弹丸和弹坑决定加载内容。首关只需要普通豌豆，不请求冰豌豆、孢子和弹坑。开战前完成贴图上传，避免首次攻击时才等待下载。

音效也按选卡和模式准备：首次进入 1–1 只下载 7 项通用音效，原先为全部 13 项；选择食人花、大喷菇、魅惑菇、寒冰菇、爆炸植物或进入打僵尸模式时补载对应音效。已经下载、解码的音效在暂停恢复和切关时复用。完整离线下载的内容不变。

验证：111 项测试及生产构建通过，未运行 lint。浏览器实测首页没有战斗画布、角色图集或音效请求；1–1 开战后出现 7 项音效请求，暂停恢复后切到迷雾无尽并选取特殊植物，只新增 5 项对应音效，没有重复音效请求或控制台错误。存档恢复时保留弹丸、弹坑和旧植物的资源依赖由测试覆盖。
