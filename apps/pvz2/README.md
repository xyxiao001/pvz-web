# PVZ2 · 神秘埃及

独立的 TypeScript / PixiJS 应用，部署在 `/pvz2/`。目前移植埃及第一关：四种植物、普通木乃伊／路障木乃伊／太阳神僵尸、十波敌人，包含种植、阳光、铲子、能量豆、推车、暂停、重开和胜负结算。

## 与 PVZ1 的边界

- PVZ1 保留在根项目，PVZ2 的代码、素材、依赖声明、测试和构建配置都在本目录。
- 不导入 PVZ1 的游戏逻辑、渲染器或资源。沿用固定步长模拟、模型与渲染分离、按需加载和纹理预上传的设计。
- 两个入口通过页面跳转切换。离开页面后释放当前运行环境，不同时运行两套游戏。
- 本应用只用 `pvz2-web:egypt1-complete` 保存首关通关记录；不读取或修改 PVZ1 存档，不保存未完成战局。
- PVZ1 的 Service Worker 按资源清单拦截；PVZ2 在它生成清单后才拼入发布目录，不进入 PVZ1 的离线下载。PVZ2 当前需要网络，不注册自己的 Service Worker。

## 运行与验证

在仓库根目录执行：

```sh
pnpm install
pnpm dev             # PVZ1 :5173；PVZ2 :5174，经 :5173/pvz2/ 代理访问
pnpm dev:pvz2        # 单独启动 PVZ2，访问 http://127.0.0.1:5174/pvz2/
pnpm test:pvz2
pnpm build:pvz2      # 独立输出 apps/pvz2/dist/
pnpm build           # 两个应用分别构建，组合到 dist/ 与 dist/pvz2/
```

`pnpm test` 继续运行 PVZ1 测试。根目录 `pnpm preview` 可预览组合构建。

## 加载与渲染

菜单只加载入口代码、CSS 和约 55 KB 的背景预览图。点击冒险后动态导入 PixiJS / DragonBones 渲染模块，再加载本关配置、庭院和六套角色骨骼；角色按两组并发加载，每组内并行获取骨骼、图集和纹理。开始种植后才播放并请求音乐。

当前素材合计约 3.1 MB（原始文件大小，含约 1.8 MB 音乐，不含脚本）；没有携带整个上游资源包，也没有加载上游的 Cocos、Bullet 或 Spine WASM。这个体积只代表首关的内容量，不能作为全游戏移植后的体积承诺。

`src/game/` 用 60 Hz 固定步长推进战斗；`src/rendering/scene.ts` 用 PixiJS 8 和 `pixi-dragonbones-runtime` 播放原素材的部件、骨骼和变形动画。射击／产阳光时点来自骨骼事件帧。头像直接从相同骨骼生成，不增加独立头像素材。

## 来源与提取

来源：[PvZ2 Gardendless](https://github.com/Gzh0821/pvzge_web)，固定提交 `0e4a05348b6de328e2902a57afa24a3a454a4205`。本次从 Cocos 构建产物提取明确使用的资源，并按可见规则重新实现战斗；没有还原原始 TypeScript 工程。

`asset-provenance.json` 记录原文件路径、固定提交、输入／输出 SHA-256 和大小；`UPSTREAM-LICENSE` 保留上游仓库许可证文本。该文件不等于对所有第三方游戏美术、音乐权利的另行授权。

可重复提取（需要 Python 3 与 Pillow）：

```sh
python3 tools/pvz2-assets/extract.py
```

脚本解码 Cocos UUID 和 pack 索引，提取 DragonBones JSON、图集、纹理、关卡与属性，转换为 WebP；下载缓存位于忽略目录 `artifacts/pvz2-source/`，输出只写本应用。无需下载整个仓库或反编译 WASM。

## 当前移植范围

保留上游埃及第一关的十波出怪名单，以及所用植物和僵尸的基础属性。首版固定四张卡，初始 150 阳光和一颗能量豆；天空阳光、波次间隔、能量豆获取和部分技能表现采用本应用的首关规则。推车、子弹、阳光与特效用矢量绘制，短音效用 Web Audio 合成，背景音乐来自上游。

这不是完整 PVZ2：其他世界、后续关卡、解锁／升级系统、教程、墓碑及完整原作技能细节尚未移植。测试覆盖资源一致性、事件帧、核心战斗规则和正常资源条件下的十波通关。
