# 安装、离线与更新

## 使用入口

| 应用 | 页面入口 | 管理入口 |
| --- | --- | --- |
| PVZ1 | `/` | 主菜单 → 设置 → 安装与离线 |
| PVZ2 | `/pvz2/` | 世界地图 → 设置 → 安装与更新 |

在仓库根目录运行以下命令，预览同一站点下的两版应用：

```sh
pnpm build
pnpm preview
```

单独验证 PVZ2：

```sh
pnpm build:pvz2
pnpm --filter pvz2-web preview --port 4175
# 打开 http://127.0.0.1:4175/pvz2/
```

开发模式不注册 Service Worker。线上使用 HTTPS，本地可使用 localhost 或 127.0.0.1。开发与预览端口的存档、缓存分开；安装不会把存档同步到其他浏览器。

支持安装提示的浏览器可点击“安装到桌面”；未提供安装事件时使用浏览器自己的安装菜单。iPhone 使用分享菜单“添加到主屏幕”。当前尚未实际验证 Chrome／iOS 的系统安装界面。

## 离线资源与手动更新

启动只预缓存各自的入口文件、样式、清单和图标，其他资源按访问缓存。完整离线游玩前，点击“下载离线资源”，等待“离线资源已就绪”。PVZ2 本轮启动预缓存约 94 KiB、完整资源约 221 MiB；面板显示的是当前版本所需资源，实际数量与大小随构建变化。

点击“检查更新”，新版本准备好后，按钮变为“更新并重新加载”，同时显示更新提示。可选择“稍后”继续游玩；点击更新才激活等待中的 worker 并刷新页面，请先完成当前关卡。下载按文件 SHA-256 复用未变化的素材，升级不需要重新下载相同的大图。

下载失败会显示错误，不会显示完整就绪状态，也不会自动重试。旧版本文件暂留缓存，当前没有清理按钮，因此面板的资源总量不等于浏览器累计缓存占用。更新不修改游戏存档。

## PVZ1 与 PVZ2 的隔离

以下路径以站点根目录组合发布为准：

| 项目 | PVZ1 | PVZ2 |
| --- | --- | --- |
| manifest | `/manifest.webmanifest` | `/pvz2/manifest.webmanifest` |
| 应用 ID／启动地址 | `/`（清单使用相对路径 `./`） | `/pvz2/` |
| Service Worker | `/sw.js` | `/pvz2/sw.js` |
| worker scope | `/` | `/pvz2/` |
| 缓存名称 | `pvz-web:pwa:files-v1:/` | `pvz-web:pwa:files-v1:/pvz2/` |
| 版本与离线清单 | 根应用单独生成 | 二代单独生成 |

`tools/build-games.mjs` 先完成两版构建，再把二代输出复制到 `dist/pvz2/`。PVZ1 生成清单时不包含 PVZ2；根 worker 虽然作用域为 `/`，只处理自己的文件清单和根入口导航，不拦截二代导航或资源。PVZ2 的管理面板只向自身 registration 发消息，首次访问也等待自己的 worker 激活，不把已有 PVZ1 controller 当作二代服务。

## 实现文件

| 用途 | PVZ1 | PVZ2 |
| --- | --- | --- |
| 安装信息与图标 | `public/manifest.webmanifest`、`public/icons/` | `apps/pvz2/public/manifest.webmanifest`、`apps/pvz2/public/icons/app.svg` |
| 构建清单与版本 | `tools/build-pwa.ts` | `apps/pvz2/tools/build-pwa.ts` |
| 注册与管理面板 | `src/platform/pwa.ts` | `apps/pvz2/src/pwa.ts`、`apps/pvz2/src/pwa.css` |
| PWA 测试 | `tests/pwa.test.ts` | `apps/pvz2/tests/pwa.test.ts` |

两版构建插件共用 `tools/pwa-worker.js` 的文件缓存、进度查询和主动激活实现，各自注入资源清单与版本；不共享游戏逻辑或运行时存档。

## 本轮验证（2026-10-18）

功能提交：`3567e27`。17 项 PWA 与地图测试、TypeScript 检查及两版组合构建通过。测试覆盖作用域与缓存隔离、离线读取、版本变化、素材复用、手动激活，以及已有 PVZ1 controller 时初始化 PVZ2 的情况。

浏览器中下载 PVZ2 全部资源后，关闭生产预览服务器；刷新仍能打开世界地图、埃及地图及第一关开场。恢复服务并构建新版后，验证更新提示、“稍后”、手动重载和新版本号。同站点的 PVZ1 面板保持自己的版本与缓存统计。截图保存在本地 `artifacts/pvz2-pwa-settings.jpg`，未纳入 Git。

本轮未实际安装桌面应用，系统安装弹窗和 iOS 主屏幕仍待真机核对。PWA 更新不代表此前记录的所有关卡表现差异均已解决，迁移与还原状态见 [FIDELITY.md](../apps/pvz2/FIDELITY.md)。

## PVZ1 历史实现与验证

以下记录保留当时的资源数量、体积和测试结果，不作为当前版本统计。当前数据以各自管理面板为准。

### 图标设计与复现

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

### 验证记录

- 全部 104 项测试、TypeScript 检查及 Vite 构建通过；没有运行 lint。
- Worker 单元测试验证启动缓存、全量下载、同源范围、离线读取页面 / 贴图 / 音效、跨版本相同资源复用、只有 ACTIVATE 才 skipWaiting，以及下载失败不报完成。
- manifest / HTML 引用与各安装图标实际尺寸检查通过。
- 实际浏览器下载完成 126 项后停止生产服务器，再刷新页面，进入冒险 1–1 并种植射手，阳光从 150 扣至 50；资源及音效加载成功，无 console error / warn。截图：`artifacts/pwa-offline-battle.png`。
- 重启服务器并构建新版本，检查更新出现“更新并重新加载”，点击后成功加载新版本。最终面板截图：`artifacts/pwa-ready.png`。

开发端口与生产端口各有独立浏览器存档；验证未修改玩家冒险解锁记录。手机安装、低显存设备和长时间高旗数运行尚未实测。

### 按需资源版本更新

运行时资源已切换为 `assets/runtime` 的无损 WebP，旧 HD PNG 不再纳入新版离线包。完整下载仍包含所有动态代码、角色动作、背景和音效，保持未曾打开的关卡也可离线进入。旧安装用户点“检查更新”→“更新并重新加载”后使用新版资源；旧缓存仍按现有策略保留，因此 112.5 MiB 是新版所需文件总量，不是升级后浏览器全部占用。

本轮 108 项测试与生产构建通过；新版 203 项下载完成后停止本地服务器，刷新、动态加载战斗模块、进入首关并种植成功（150→50 阳光）。图像无损校验覆盖全部 2425 帧与 73 张静态图片。

#### 战斗贴图与音效进一步按需加载

弹丸、孢子和弹坑贴图在确认选卡后准备，按所选植物、保留植物以及存档中的在途弹丸和弹坑决定加载内容。首关只需要普通豌豆，不请求冰豌豆、孢子和弹坑。开战前完成贴图上传，避免首次攻击时才等待下载。

音效也按选卡和模式准备：首次进入 1–1 只下载 7 项通用音效，原先为全部 13 项；选择食人花、大喷菇、魅惑菇、寒冰菇、爆炸植物或进入打僵尸模式时补载对应音效。已经下载、解码的音效在暂停恢复和切关时复用。完整离线下载的内容不变。

验证：111 项测试及生产构建通过，未运行 lint。浏览器实测首页没有战斗画布、角色图集或音效请求；1–1 开战后出现 7 项音效请求，暂停恢复后切到迷雾无尽并选取特殊植物，只新增 5 项对应音效，没有重复音效请求或控制台错误。存档恢复时保留弹丸、弹坑和旧植物的资源依赖由测试覆盖。

### 背景音乐

新增 8 首原版主音乐层：Crazy Dave（首页）、Choose Your Seeds（战前/选卡）、Grasswalk、Moongrains、Watery Graves、Rigor Mormist、Loonboon（1–5 / 2–5 / 3–5）和 Ultimate Battle（1–10 / 2–10）。无尽模式按庭院场景选择音乐。来源与 SHA-256、原版 order 位置、循环点记录于 `music-assets.json`；`tools/build-music.py` 使用 libopenmpt 和 ffmpeg 从 Ruslan 仓库的 `mainmusic.mo3` 导出。参考 Portable `Music.cpp::PlayMusic`、`StartGameMusic`，当前未实现原版随战况动态混合的鼓点/踩镲层。

首次点击或按键激活 Web Audio，之前不请求音乐。浏览器限制未交互页面的有声自动播放，参见 [MDN 自动播放说明](https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay)。设置和暂停面板分别提供音乐、音效开关；音乐使用独立音量通道，播放速度不随游戏倍速变化。暂停和隐藏页面时停止音乐，恢复时从原位置继续；胜负结算停止背景音乐，保留结算音效。

只下载并解码当前曲目，换曲释放上一首播放器引用，循环按原曲 loop order 对应的时间点播放。播放器使用的定位与导出接口见 [libopenmpt 文档](https://lib.openmpt.org/doc/group__libopenmpt__c.html)。完整离线包更新为约 126.8 MiB / 211 项，8 个音乐文件不进入启动预缓存清单。
