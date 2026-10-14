# PvZ Web 源码基线与当前实现

行为基线锁定 [PvZ-Portable 141c1476dd462ac3526f796e303177616f4de6bc](https://github.com/wszqkzqk/PvZ-Portable/tree/141c1476dd462ac3526f796e303177616f4de6bc)。以下来自源码静态阅读；本项目是选择性 TypeScript 移植，没有嵌入 Portable 二进制，也没有完成 GOTY 全量移植。

## 已实现的对应规则

| 当前实现 | 源码依据 |
| --- | --- |
| 800×600 视口，格子横向 80、纵向 100，草坪原点 (40,80) | [GameConstants.h L28](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/GameConstants.h#L28)；[Board.cpp GridToPixelX/Y L8846](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L8846) |
| 固定 10 ms 模拟步长 | [SexyAppBase.cpp L239](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/SexyAppFramework/SexyAppBase.cpp#L239) |
| 首关只开放 row 2；第二、三关开放 row 1、2、3；第四关开放五排 | [Board.cpp L987](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L987) |
| 1–1 初始阳光 150，普通关卡 50 | [Board.cpp L1340](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L1340) |
| 豌豆射手 100、向日葵 50；冷却 750 tick，生命 300；射击间隔 150−Rand(15) | [Plant.cpp L48](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L48)、[初始化 L133](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L133)、[UpdateShooter L945](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L945) |
| 豌豆伤害 20，直线速度 3.33 / tick | [Projectile.cpp 定义 L37](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Projectile.cpp#L37)、[移动 L718](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Projectile.cpp#L718) |
| 普通僵尸生命 270；速度参数 .23–.37 经 _ground 周期均速换算为约 .1104–.1777 px/tick（见下方属性复核） | [Zombie.cpp L238](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L238)、[L1215](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L1215) |
| 低于 90 生命停止啃食，随后概率性掉血；濒死者不触发进屋失败 | [Zombie.cpp UpdateDamageStates L3904](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L3904)、[UpdatePlaying L4657](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L4657)、[CheckForBoardEdge L4533](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L4533) |
| 选行保留最近两次历史；割草机使用后，行权重暂时为 .01 / .5 / 1 | [Board.cpp L2546](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L2546)、[PvzpCommon.cpp L174](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/PvzpLib/PvzpCommon.cpp#L174) |
| 普通波间隔 2500+Rand(600)；波龄超过 400 tick 且血量降至初始值的 .5–.65 时缩短倒计时至 200 tick | [Board.cpp 常量 L59](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L59)、[UpdateZombieSpawning L5335](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L5335) |
| 天降阳光间隔 min(950,425+数量×10)+Rand(275) | [Board.cpp L5209](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L5209) |
| 首关没有旗帜波；首关奖励向日葵 | [Board.cpp IsFlagWave L525](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L525)、[LawnApp.cpp GetAwardSeedForLevel L2236](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/LawnApp.cpp#L2236) |

## 本轮新增对应规则

| 当前实现 | 已阅读的 Portable 源码 |
| --- | --- |
| 樱桃炸弹 150 阳光 / 5000 tick 冷却，坚果 50 / 3000 | [Plant.cpp L48–52](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L48) |
| 坚果生命 4000 | [Plant.cpp L289](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L289) |
| 樱桃半径参数 115、跨相邻行；本版以横向距离和行差近似 | [Plant.cpp L4308](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L4308) |
| 路障护甲 370；旗帜速度参数 .45 | [Zombie.cpp L263](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L263)、[L1197](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L1197) |
| 啃食每 4 tick 造成 4 点伤害 | [Zombie.cpp L67](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L67) |
| 前四关 4、6、8、10 波 | [Challenge.h gZombieWaves L259](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.h#L259) |
| 首次冒险普通波预算为整数 `wave / 3 + 1`，路障消耗 2 点 | [Board.cpp L648](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L648)；现在由 `waves.ts` 按源码生成，不再使用手工数量列表 |

## 当前明确简化的部分

- 当前迁移范围为首次冒险 1–1 至 1–7 的波次规则，包括 1–5 保龄球；没有实现二周目和范围外模式的选怪分支。原版使用随机预算生成，当前 RNG 仍不同于原版，所以不声称相同种子会生成完全相同序列。
- 普通草坪关卡在首次种植后启动首波 1800 tick 倒计时，用短提示替代原版教程状态机。向日葵首次生产 300–1250 tick，之后 2350–2500 tick；樱桃固定 100 tick 后爆炸，未绑定原版动画事件。
- 豌豆、啃食、割草机和爆炸采用简化碰撞区间。护甲采用先扣护甲、溢出扣生命；没有完整伤害标志系统。
- 僵尸使用 `_ground` 周期平均速度匀速行走，原版 [Zombie.cpp UpdateZombieWalking L4104](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L4104) 会从 Reanim `_ground` 轨道提取位移，所以这里不能视为原版精确移动速度。割草机固定 3.5 / tick。
- 阳光、普通烧焦的 PNG 节拍及所有角色锚点由本版配置；其余动画采用 GIF，图集保留源文件逐帧时长；僵尸步行播放倍率按源码步伐周期换算。坚果在约 2/3、1/3 生命切换受损图片。普通、路障和旗帜僵尸共用无头/死亡素材；缺少完整断肢、头部抛物线、粒子和 Reanim 混合。
- RNG 为 32 位 LCG，与原版调用序列不同。DOM 实现菜单和 HUD，不兼容原版存档。
- MP3 音效来自资源仓库；射击和命中使用合成音，无背景音乐。菜单中的选关、图鉴、帮助文字及布局按当前功能编排，不声称逐像素还原全部原版界面。

## 原版素材接入证据

这里验证的是仓库中实际存在的文件，未将 README 声明当作完成证明。

- [PythonPlantsVsZombies afc4ae12](https://github.com/marblexu/PythonPlantsVsZombies/tree/afc4ae12c7a19bee5aaa2c20e9d765e1afcccd80/resources/graphics)：实际读取 `Plants/Peashooter`、`SunFlower`、`CherryBomb`、`WallNut`、`Sun` 和 `Zombies/NormalZombie`、`ConeheadZombie`、`FlagZombie` PNG 序列，筛选成 16 个片段、248 帧。使用 `Screen/MainMenu.png`、`Screen/Adventure_0.png` 和四张 `Cards/card_*.png`。
- [ruslan831 325b2229](https://github.com/ruslan831/PlantsVsZombies-decompilation/tree/325b2229a7225d73870bb69322eefcda3a45bf8d/images)：使用 `SeedBank.png`、`PvZ_Logo.jpg` 与灰度透明度文件 `PvZ_Logo_.png`，以及奖杯；没有构建该仓库。
- [New-Plants-vs-Zombies-JavaScript 592dfbe1](https://github.com/jiangnangame/New-Plants-vs-Zombies-JavaScript/tree/592dfbe16b9b43a795d1c774e62ebad965fb0c1c)：读取 `images/interface/FlagMeter*.png`、`LawnCleaner1.png`、`OptionsMenuback32.png`、`Button.png` 与 `audio/*.mp3`。不采用带 JavaScript 改版标题的 Logo 和主菜单合成图。
- `tools/import-assets.py` 不重绘角色，只打包原 RGBA 帧并合并 Logo 的 RGB/alpha。所有输入文件路径、commit 与 SHA-256 见 `original-assets.json`；本地已保存结果，不在游戏运行时访问 GitHub。

## 验证及后续边界

上一轮执行 TypeScript 检查、生产构建和 19 个模拟测试；其中四关分别以 1、23、123456 三组种子通过正常种植/收集命令通关，未修改对局阳光、血量或波次来强制通关。独立规则测试会注入状态以隔离护甲、爆炸、啃食和旗帜转换。另在浏览器实际检查主菜单、进入关卡、种植、收集、暂停与画布缩放。

当前仍没有 PAK、resources.xml、`.reanim.compiled` 解析器，也没有 GOTY 全量关卡。后续若继续扩展，可先替换为 Reanim 轨道动画，再扩展白天后续植物及场景。WASM 尚未进入运行时。

## 2026-10-14：原版波次、倍速与性能

`tools/import-level-data.py` 直接解析 `Challenge.h` 的 `gZombieWaves`、`gZombieAllowedLevels` 以及 `Zombie.cpp` 的 `gZombieDefs`，导出到 `src/game/data/portable-adventure.json`。前四关仅允许普通和路障参与随机抽取；旗帜权重为 0，由旗帜波显式插入。没有依靠 README 或第三方整理的关卡表。

`src/game/waves.ts` 对应以下源码分支：

- [Board.cpp L519–532](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L519)：1–1 无旗帜；首次冒险少于 10 波时最后一波为旗帜波。
- [Board.cpp L648–664](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L648)：普通波整数预算；旗帜波预算乘 2.5 后截断，再预放普通僵尸与旗帜并扣预算。
- [Board.cpp L689–731](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L689)：新僵尸在中间波和末波强制登场；末波补齐该关允许且尚未出现的类型。因此 1–3 路障必定出现在第 5 波和第 8 波，其他有预算的波也可随机出现。
- [Board.cpp L2336–2369](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L2336)、[L2399–2492](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L2399)：资格与首次波限制、剩余预算、权重抽取。
- [Board.cpp L4880–4892](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L4880)、[L5335–5378](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L5335)：波次血量排除濒死僵尸；旗帜前的提前刷新阈值为 0，计时 4500；倒计时到 5 触发 750 tick 大波预警。
- [Zombie.cpp L161](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L161)、[L233](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L233)、[L595](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L595)：普通出场 X 随机偏移 0–39、旗帜波再偏移 40，旗帜本体覆盖为棋盘宽度。本版追加 30 px 以适配现有身体锚点，仍不是 Reanim 矩形精确碰撞移植。

倍速仅改变墙钟时间进入固定 10 ms 模拟的速率；测试证明 1× / 2× / 4× 在相同游戏时间下得到相同状态与事件，且暂停不累积追赶时间。视图对最后两个模拟位置插值，贴图帧仅发生变化时才切换，暂停／菜单停止渲染。位置插值不会生成 Reanim 中间姿态；步行动画现已切换为更完整的 GIF 姿态序列，见下方动画连贯性调整。

性能对照使用独立开发测试页、同一浏览器和实体数量，优化前后各运行 360 帧，CPU 指标丢弃前 60 帧预热。45 个受损植物、30 僵尸、20 豌豆、10 阳光以及 5 台割草机；种子冷却持续变化，其余 HUD 状态不变。更新、HUD 和绘制提交的 CPU 均值 0.446 → 0.253 ms，P95 0.8 → 0.4 ms，HUD MutationObserver 记录 3246 → 375。短测不代表所有实际战斗的掉帧情况，未测 GPU 完成时间；原始结果在本地 `artifacts/performance-results.json`。

## 2026-10-14：白天关卡扩展至 1–7

以下源码均实际读取于上述锁定 commit，本轮只修改独立 PvZ 工程。

| 接入内容 | 源码证据 |
| --- | --- |
| 前七关波数 `[4,6,8,10,8,10,20]`；撑杆在 1–6 首次出现、价值 2、权重 2000、常规第 5 波起允许 | [Challenge.h L259](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.h#L259) 的波数与邻近资格表；[Zombie.cpp L84](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L84) |
| 1–5 首次冒险使用普通冒险资格；旗帜预填后剩余预算乘 4 | [Board.cpp L1137](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L1137)、[L648–674](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L648)；没有采用 `ChallengeInitZombieWaves` 的独立保龄球怪物列表 |
| 保龄球首波 200 tick、初始坚果、传送带倒计时 400；坚果/爆炸坚果权重 85/15；积压时出卡间隔 400/425/500/1000 | [Challenge.cpp L218](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L218)、[L1378–1406](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L1378)、[L1518](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L1518) |
| 保龄球限前三列，红线 (268,77)，旗帜前使用普通波间隔 | [Challenge.cpp L2153](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L2153)、[L2198](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L2198)、[Board.cpp L5360](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L5360) |
| 坚果撞击带头盔目标 900、普通目标 1800；上下移动 2/tick；红坚果附近爆炸 | [Plant.cpp UpdateBowling L2361–2510](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L2361) |
| 土豆雷 25/3000，埋下 1500 tick；爆炸半径 60、不跨行 | [Plant.cpp L53](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L53)、[L337](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L337)、[L1144](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L1144)、[L4371](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L4371) |
| 寒冰射手 175/750；寒冷 1000 tick，速度系数 .4，啃食间隔加倍 | [Plant.cpp L54](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L54)、[Zombie.cpp L70](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L70)、[ApplyChill L7520](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L7520) |
| 撑杆生命 500；奔跑、一次起跳、落地后步行 | [Zombie.cpp L377](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L377)、[UpdateZombiePolevaulter L1709](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L1709) |
| 传送带 6 帧、每 4 tick 换帧；卡片每 4 tick 左移 1 px | [SeedPacket.cpp L948](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/SeedPacket.cpp#L948)、[AddSeed L1018](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/SeedPacket.cpp#L1018)、[UpdateConveyorBelt L1147](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/SeedPacket.cpp#L1147) |

新增素材读取 JS 仓库的 `Plants/PotatoMine/PotatoMine.gif`、透明 `PotatoMineNotReady.gif`（实为 PNG）、`Plants/WallNut/*Roll.gif`、`Zombies/PoleVaultingZombie/*.gif`，Python 仓库 `Plants/SnowPea` 及两张新种子卡，ruslan 仓库的铲子、传送带、红线、冰豌豆和空种子包。所有输入记录进 `original-assets.json`。撑杆有独立跑动、行走、啃食、起跳、落地、无头、倒地、烧焦片段。

图集在打包时裁掉透明边缘并记录每帧偏移，播放时锚点扣除偏移。新增素材未经裁边需要 7 张 2048² 图集，裁边后 29 段／541 帧仅 2 张；两张 RGBA 基础纹理约 32 MiB，不含 GPU mipmap/驱动开销。本轮未重新测全设备帧率，不把图集压缩宣称为 FPS 保证。

明确差异：普通坚果横速取 3.3/tick，未移植 Reanim `_ground`；撑杆按现有 GIF 的 116+52 tick、总位移 150 适配，碰撞仍是简化横向区间；未加入高坚果等未实现对象的特殊跳跃分支。土豆雷 1500 tick 后直接武装，省略原版起身动画的额外时间。爆炸沿用现有简化光圈与音效。1–4 奖励铲子，省略 1–5 的铲子教程；工具从 1–6 开放。1–7 原本奖励食人花，此处以“待续”结束，未冒称后续植物已经可用。

本轮 `pnpm test` 28 项通过；七关均用种子 1、23、123456 通过正常命令通关，保龄球只用传送带发放的卡。没有给整关通关测试注入阳光、改血量或删除僵尸；独立规则测试注入状态覆盖武装、减速、撑杆、铲除、弹跳和爆炸。`pnpm build` 通过；未运行 lint。浏览器验证新关入口、传送带/红线/倍速、六卡 HUD、铲子和双旗帜。开发验证服务使用隔离的存档模块，不改用户已有进度；不进入生产构建。


## 动画连贯性调整（2026-10-14）

问题来自姿态采样率：旧导入器给豌豆射手等 PNG 序列配置每帧 10 tick，普通／路障／旗帜步行为 15 tick；因此分别只有 10 fps 和约 6.7 fps，即使每次刷新都绘制，也会反复显示同一姿态。

实际读取 [JS 素材仓库固定版本](https://github.com/jiangnangame/New-Plants-vs-Zombies-JavaScript/tree/592dfbe16b9b43a795d1c774e62ebad965fb0c1c/images) 的 GIF 帧及 duration，替换如下：

| 片段 | 输入文件（images/ 下） | 帧数 / 帧时长 |
|---|---|---|
| 豌豆、寒冰射手 | Plants/Peashooter/Peashooter.gif、Plants/SnowPea/SnowPea.gif | 各 25 / 40 ms |
| 向日葵 | Plants/SunFlower/SunFlower1.gif | 25 / 40 ms；SunFlower.gif 是双倍高度的状态图，未采用 |
| 坚果与两种损伤 | Plants/WallNut/WallNut.gif、Wallnut_cracked1.gif、Wallnut_cracked2.gif | 各 17 / 40 ms |
| 樱桃 | Plants/CherryBomb/CherryBomb.gif | 14 / 40 ms |
| 普通走路、无头、啃食、死亡 | Zombies/Zombie/Zombie.gif、ZombieLostHead.gif、ZombieAttack.gif、ZombieDie.gif | 47、47、40、39 / 40 ms |
| 路障、旗帜走路与啃食 | Zombies/ConeheadZombie/ConeheadZombie[Attack].gif、Zombies/FlagZombie/FlagZombie[Attack].gif | 各 47、40 / 40 ms |

这些是仓库提供的帧素材，不能视为 PC GOTY 的精确 Reanim 时序。以源 GIF 周期播放，部分视觉周期会比旧 PNG 配置短；射击、产阳光、樱桃爆炸、移动、出怪和倍速的模拟逻辑未改变。普通／路障／旗帜的新 GIF 共用 166×144 画布，统一身体锚点为 [107,144]。静态图鉴、菜单植物图片继续使用原 PNG。

打包器先裁透明空白，再按帧高度分配并复用图集行空间。807 帧仍在两张 2048² 图集中；检查全部裁后帧与源图逐像素一致，所有矩形互不重叠。未增加运行时 GIF 解码、叠帧淡化或新纹理页。

独立测试页包含 45 植物、30 僵尸、20 豌豆、10 阳光、5 割草机，不读写存档。对照相同渲染代码和新旧素材，1×／2×／4× 各绘制 240 帧、丢弃前 60 帧；每帧推进 1/60 秒模拟时间。1× 的 180 次采样内，豌豆姿态切换从 30 次增至 75 次。当前素材的更新与绘制提交 CPU 均值分别约 0.205、0.237、0.251 ms，P95 分别约 0.3、0.4、0.5 ms。该测试不含 HUD、不测 GPU 完成时间，不代表全部设备 FPS；本地原始结果为 `artifacts/animation-performance-results.json`。28 项逻辑测试与生产构建通过。

仍保留：阳光 12.5 fps、普通烧焦约 8.3 fps、爆炸坚果 10 fps 的原有序列；未使用缺失有效帧时长的 Sun.gif，也未改写撑杆跳跃时序。整体仍是逐帧姿态加位置插值，并非 60 fps Reanim 轨道动画。


## 植物与僵尸属性复核（2026-10-14）

### 结论与修正

发现实质移速错误，不是显示 FPS 驱动模拟。旧代码直接每 10 ms 减去 `mVelX`，而原版会先通过步行动画换算。截图的 2× 还会将这一错误加倍。上一轮更换完整 GIF 又把普通僵尸视觉周期从 3.3 秒缩短为 1.88 秒：并未改变位移，但让步伐显得过快。本次将移动和步伐统一到源码周期，保留完整姿态帧。

源码依据（Portable 固定版本同上）：

- [Zombie.cpp L1165](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L1165)：普通／路障速度参数 0.23–0.37，旗帜 0.45，撑杆起跳前 0.66–0.68。
- [Zombie.cpp L6642](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L6642)：`animRate = mVelX * frameCount / groundDistance * 47 / scale`。
- [Reanimator.cpp L430](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/PvzpLib/Reanimator.cpp#L430)、[L904](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/PvzpLib/Reanimator.cpp#L904)、[L1238](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/PvzpLib/Reanimator.cpp#L1238)：动画每 tick 推进 `.01 * animRate / frameCount`；普通 LOOP 映射到 `frameCount - 1` 个区间；实际移动取 `_ground` 相邻帧 X 差乘 `.01 * animRate`。
- 实际解析 [Zombie.reanim](https://github.com/ruslan831/PlantsVsZombies-decompilation/blob/325b2229a7225d73870bb69322eefcda3a45bf8d/SexyAppFramework/reanim/Zombie.reanim) 的 anim_walk（44–90）、anim_walk2（91–137），各 47 帧，地面 X 差 49.8；[Zombie_polevaulter.reanim](https://github.com/ruslan831/PlantsVsZombies-decompilation/blob/325b2229a7225d73870bb69322eefcda3a45bf8d/SexyAppFramework/reanim/Zombie_polevaulter.reanim) 的 anim_run（13–49）37 帧／30 像素、anim_walk（93–137）45 帧／67.8 像素。省略的 x/f 字段按前帧继承。

由此推导，普通尺寸角色的周期平均位移为 `mVelX * .47 * N / (N - 1)` 像素/tick；周期时长为 `groundDistance / (mVelX * .47)` tick。`zombie-motion.ts` 应用这一平均值，`scene.ts` 使用“GIF 周期时长 / 源码周期时长”调整步行动画播放率。尚未恢复每一步的加减速曲线，因此这是源码周期均速近似，不是完整 Reanim 轨道移植。

| 僵尸 | 生命 / 护甲 | 修正后的 1× 行走速度（逻辑像素/秒） |
|---|---|---|
| 普通 | 270 / 0 | 11.04–17.77；中间参数 .3 时 14.41，原错误实现为 30 |
| 路障 | 270 / 370 | 同普通 |
| 旗帜 | 270 / 0 | 21.61，原错误实现为 45 |
| 撑杆，持杆 | 500 / 0 | 31.88–32.85，原错误实现为 66–68 |
| 撑杆，落地 | 500 / 0 | 约 11.06–17.79 |

生命与护甲对应 Zombie.cpp L238、L263、L377。啃食是每 4 tick 扣 4 生命，即 100/秒；寒冷时每 8 tick 扣 4，移动为正常的 40%，寒冰豌豆减速持续 1000 tick。核对 Zombie.cpp L67–68、L6859、L7099、L7517，原实现数值正确。撑杆跳跃位移和时长仍按现有适配逻辑，不在本次均速换算中。

### 植物属性核对

以下秒数均为游戏时间（1×）；2× 墙钟时间减半。种子价格／冷却来自 Plant.cpp L49–54，普通生命 L133，坚果生命 L289；投射物伤害来自 Projectile.cpp L38–39。

| 植物 | 阳光 | 冷却（秒） | 生命 | 攻击 / 生产 |
|---|---:|---:|---:|---|
| 豌豆射手 | 100 | 7.5 | 300 | 每发 20；攻击检查周期 1.36–1.50 秒 |
| 向日葵 | 50 | 7.5 | 300 | 每次 25 阳光；首产 3–12.5 秒，后续 23.5–25 秒 |
| 樱桃炸弹 | 150 | 50 | 300 | 1800 爆炸伤害；当前固定 1 秒引爆，范围仍简化 |
| 坚果墙 | 50 | 30 | 4000 | 只阻挡，无攻击 |
| 土豆雷 | 25 | 30 | 300 | 15 秒基础武装，1800 伤害；仍省略额外起身动画 |
| 寒冰射手 | 175 | 7.5 | 300 | 每发 20；攻击检查周期同豌豆，附带减速 |

向日葵原实现固定首产 6 秒、之后 25 秒，已经改回 [Plant.cpp L189](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L189)、[L1032](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L1032) 的随机范围。射手首次攻击检查计数也从固定 50 tick 改回 0–150 tick；后续 `150 - Rand(15)` 原先正确。首发开火动作事件尚未精确迁移。阳光掉落递增间隔与 Board.cpp L5209 相符。

爆炸坚果只用于保龄球传送带，本项目 cost/cooldown 为 0 表示不走阳光购买与种子冷却流程，不宣称是普通种子包属性。碰撞、爆炸形状、伤害标志仍有先前记录的简化，不能将此表解读为全部行为已精确还原。

### 验证

34 项测试及生产构建通过。新增实际模拟验证 10 秒走路距离、寒冷 40% 位移、六种植物价格/生命/冷却、向日葵随机产出范围；30/60/120/144 Hz × 1×/2×/4× 在相同 30 秒游戏时间后对局状态完全相同。前七关的正常操作通关回归通过。此次未改时钟步长、倍速按钮、出怪数据、伤害和生命值，也未增加异常兜底或运行时校验。


## 1–8、1–9 迁移与原版细节清单（2026-10-14）

### 本轮接入

`import-level-data.py` 从相同 Portable commit 扩展提取前九关；源文件 SHA-256 随表保留。1–8 为 10 波，1–9 为 20 波；铁桶 cost=4、startingLevel=8、firstAllowedWave=1、weight=3000。1–8 禁用撑杆，1–9 允许撑杆。不是手写一份固定出怪列表。

| 内容 | 实现与源码依据 |
|---|---|
| 波数与出现资格 | [Challenge.h L259](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.h#L259) 的 gZombieWaves / gZombieAllowedLevels；[Zombie.cpp L85](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L85) 的铁桶定义。1–8 第 6 波及末波强制引入铁桶；其余仍按预算与权重抽取。 |
| 食人花 | 150 阳光、750 tick 卡片冷却、300 生命，见 [Plant.cpp L55](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L55)。就绪→咬合 70 tick→吞掉一只→消化 4000 tick；目标消失或撑杆跳跃则咬空恢复；见 [UpdateChomper L1751](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L1751)。消化期间依然会被啃食。 |
| 双发射手 | 200 阳光、750 tick 冷却、300 生命、150 基础攻击周期，见 [Plant.cpp L56](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L56)。在发射倒计时 25 和 0 时各重新检查目标并发射一颗 20 伤害豌豆，见 [L945](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L945)、[L986](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L986)。 |
| 铁桶僵尸 | 270 身体生命、1100 护甲，见 [Zombie.cpp L238](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L238)、[L266](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L266)；步行用普通僵尸已修正的周期平均速度。掉盔后切普通动画；被食人花吞掉时不播放倒地死亡。 |
| 奖励衔接 | 1–7 奖励食人花、1–8 奖励双发射手，见 [LawnApp.cpp L2236](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/LawnApp.cpp#L2236)。1–9 当前以“待续”结束；并未开放 1–10。 |

自动收集是用户要求的 Web 便捷选项，默认 false，并非原版规则。沿用 collectSun 的 25 阳光入账与事件，固定模拟步中收取，暂停/结束不会收取。勾选状态在本次页面内保留，不写 localStorage；在新关卡初始化时读取同一个勾选框。位置在倍速左侧。

新素材实际读取 JS 仓库 `Plants/Chomper/{Chomper,ChomperAttack,ChomperDigest}.gif`、`Plants/Repeater/Repeater.gif`、`Zombies/BucketheadZombie/{BucketheadZombie,BucketheadZombieAttack}.gif` 和 `audio/chomp.mp3`。卡片来自 Python 仓库 `card_chomper.png`、`card_repeaterpea.png`。commit、路径和散列仍在 original-assets.json。新增 178 帧逐像素核对一致；全图集 985 个矩形检查无重叠，现为 3 张图集。

边界：食人花使用本项目的同排横向碰撞区间（身体锚点差 -10…100），并非 [Plant.cpp L5175](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L5175) 的完整矩形碰撞。咬合 GIF 映射到 70 tick；成功后立即进入 4000 tick 消化，省略原版咬合尾段等待和独立吞咽收尾。咬空额外等待 30 tick。尚不支持范围外僵尸（巨人/蹦极等）的特殊分支，也没有完整射击头部动画事件。

### 原版细节清单（选卡与传送带已在下节接入）

| 优先级 | 缺项及当前差异 | 实际源码入口 |
|---|---|---|
| 已接入 | **1–8 起选卡**：最新版本改为七选六 / 八选六，限制实际可携带卡片，见下节。 | [Board::ChooseSeedsOnCurrentLevel L1611](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L1611) 明确 first adventure 的 level>7；[SeedChooserScreen.cpp L1012](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Widget/SeedChooserScreen.cpp#L1012) 按槽位数量控制开始。 |
| 已接入 | **1–10 植物传送带**：普通植物种植、不扣阳光、专用卡池、重复供卡降权与关卡过渡，见下节。 | [Challenge.cpp L1410](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L1410)：豌豆/樱桃/坚果/双发/寒冰/食人花/土豆雷权重依次 20/20/15/20/10/5/10；[Board.cpp L8547](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L8547) 列出独立传送带模式。 |
| 表现 | **阳光飞入计数器**：当前收集后直接消失、入账与 +25，自动收集也一样；原版有飞行、缩放与抵达处理。 | [Coin::UpdateCollected L605](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Coin.cpp#L605)、[Coin::GetColor L772](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Coin.cpp#L772)。 |
| 表现 | **路障/铁桶两档破损、掉盔、断臂与掉头**：当前只有护甲存在/消失和无头整体贴图。 | [Zombie::GetHelmDamageIndex L5797](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L5797) 的 2/3、1/3 阈值；[UpdateDamageStates L3904](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L3904)。 |
| 动作一致性 | **射击、咬合尾段、吞咽、土豆起身、爆炸粒子与步行动画轨道**：当前为图集帧、简化状态时长和平均移速。 | Plant::UpdateChomper（上方链接）；[Zombie::UpdateZombieWalking L4104](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L4104)。需先接入 Reanim 轨道/事件，才能减少动作与逻辑的时间差。 |
| 后续章节 | **夜晚与蘑菇、墓碑、后续场景**：当前仍只有白天庭院，不应只换背景并复用白天产阳光规则。 | [Board.cpp L5192](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L5192) 的天空阳光条件；Plant.cpp 的夜间睡眠/蘑菇分支。 |

验证：39 项测试通过，八个普通关卡各用三个种子正常种植/收集通关，保龄球回归通过；新增独立测试覆盖食人花吞铁桶、消化中受伤、咬空、双发 25 tick 间隔、原版新波次资格和自动收集暂停/关闭/防重复入账。浏览器实测 1×、4× 自动入账及 8 卡布局；角色同屏验证使用单独端口的临时对局夹具，不改用户进度。新图集约 48 MiB 基础 RGBA，相比前版多一张；本轮未重新测全设备 FPS。


## 1–10 传送带与六槽选卡（2026-10-14，续）

最新可玩范围为 1–1 至 1–10；上节“九关终点 / 全部 7、8 卡直接带入”是此前版本记录，现已被本节替代。

### 六槽选卡

- [Board.cpp L1611](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L1611)：传送带不选卡；首次冒险从 level > 7 开始选卡。对应 1–8 七选六、1–9 八选六，1–1 至 1–7 保留固定植物。
- [Board.cpp L8618](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L8618)：种子槽数量为购买扩展数 + 6，并受可用种子数限制。本项目尚无商店，使用默认六槽。
- [SeedChooserScreen.cpp L1012](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Widget/SeedChooserScreen.cpp#L1012)：装满槽位才能开始。实现选择、退选、去重、六槽上限，按选择顺序进入战斗和数字键 1–6；未携带植物不能种植。重新开始回到空选卡盘。
- 界面复用原版植物卡片、战斗种子栏和按钮；选卡面板本身使用当前 Web 样式，不宣称原版选卡页面逐像素还原。未接入敌阵镜头预览、卡片飞入槽位动画及推荐选卡提示。

### 1–10 原版数据与行为

| 内容 | 实现与源码依据 |
|---|---|
| 波次 | [Challenge.h L259](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.h#L259)：20 波，第 10、20 波旗帜，普通、路障、撑杆、铁桶及旗手。提取脚本扩至十关，保留源文件 SHA-256。 |
| 出怪预算 | [Board.cpp L675](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L675) 与 [LawnApp.cpp L2141](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/LawnApp.cpp#L2141)：1–10 是 mini-boss level，在旗帜波预放普通僵尸/旗手后，对剩余预算乘 3。不是套用保龄球的乘 4。 |
| 供卡池 | [Challenge.cpp L1410](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L1410)：豌豆、樱桃、坚果、双发、寒冰、食人花、土豆雷，权重依次 20/20/15/20/10/5/10。直接解析 C++ 表到 portable-adventure.json，并新增 Challenge.cpp 散列。 |
| 降权 | [Challenge.cpp L1660](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L1660)：同种卡积压至少 4 张权重为 1、至少 3 张为 5，否则连续同种卡权重整除 2。沿用本项目随机数生成器，不保证与原版相同种子序列。 |
| 节奏 | [Challenge.cpp L76](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L76)、[L1380](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L1380)：开始首步供卡，按积压数量使用 400/425/500/1000 tick 间隔，上限十张；传送带沿用每 4 tick 移动 1 px。普通植物可放全部九列空格，消费选中的那一张，不扣阳光、不使用种子冷却；不产生天空阳光。 |
| 开场与旗帜间隔 | [Board.cpp L1183](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L1183) 普通首波 1800 tick；[Challenge.cpp L218](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L218) 的 200 tick 只用于保龄球。1–10 保留 1800，旗帜前 4500 tick 和 750 tick 提示沿用 [Board.cpp L5337](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L5337) 的普通分支。 |
| 植物计时 | 免费供卡不代表植物动作立即完成；土豆雷仍有 1500 tick 武装、食人花仍消化 4000 tick、樱桃仍倒计时爆炸，复用植物逻辑。土豆初始化见 [Plant.cpp L340](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L340)。 |

1–9 胜利进入 1–10；1–10 胜利为本版白天篇终点。原版 1–9 僵尸信件、1–10 小喷菇奖励、夜晚 2–1、剧情镜头与对话尚未迁移，当前用文字过渡，不伪装为已解锁蘑菇或夜晚章节。现有碰撞区间、角色图集动作与随机数差异仍适用。

验证：46 项测试通过，包含六槽完整选择/退选/排序/禁用未携带卡、供卡与波次数据、传送带免费种植、占位失败不消耗卡、土豆武装、倍速一致和暂停。十关均用三个随机种子通过正常操作命令通关，1–10 未增加阳光、改怪属性或注入供卡；单项隔离测试的固定卡片只存在测试文件中。TypeScript 检查与 Vite 生产构建通过，未运行 lint。浏览器实测选择六卡、退选到五卡按钮禁用、数字键对应顺序、种植、重新选卡及 1–10 实际供卡和种植；使用隔离端口的进度夹具，不修改用户存档，战斗使用真实 Game。浏览器无 error/warn。

## 2× 素材样板与全关卡接入（2026-10-14）

先用 1–2 涉及的 10 组动画、352 帧建立同场景原图 / 2× 对照，再扩展到目前 1–1 至 1–10 共用的全部 35 组动画、985 帧，以及 41 张背景、菜单、卡片和 HUD 静态图。样板是固定阵容的渲染夹具，不是一次完整关卡通关；实际关卡另以真实 Game 和隔离存档入口验证。

### 生成与接入

- 工具：`tools/build-hd-assets.py`，使用 [Real-ESRGAN 官方 v0.2.5.0 发行包](https://github.com/xinntao/Real-ESRGAN/releases/tag/v0.2.5.0) 中 20220424 macOS ncnn-vulkan 与 `realesr-animevideov3-x2` 模型；不在浏览器内推理。输入、可执行文件及模型散列保存在 `public/assets/hd/manifest.json`。
- 985 帧去重为 956 张 RGBA 图，逐帧加透明边距、分别超分、移除边距后重打包成三张 4096² 图集。保持原帧时长、锚点、逻辑宽高、裁剪偏移；只改变图片像素及图集位置。RGB 使用超分网络，透明通道使用该工具的双三次插值，不宣称透明边缘也是神经网络重建。
- `src/rendering/scene.ts` 以 Pixi `resolution: 2` 加载纹理，世界坐标仍为 800×600；画布 backing resolution 按显示宽度 × DPR 计算。`src/main.ts` 图片路径和 `src/style.css` 背景路径统一切换到 `assets/hd/`。音频路径和游戏逻辑未改。
- 总 PNG 为 59,815,440 bytes（约 57.0 MiB）。三张角色图集基础 RGBA 为 192 MiB，原先为 48 MiB；不含其他纹理、解码副本、GPU 缓冲或可能生成的 mipmap。原图保留供对照，没有新增自动降级、质量档位或失败重试。
- 目视对照：角色轮廓、卡片和 HUD 放大后的锯齿减轻；背景细碎纹理有平滑。这是原素材超分，不是原生高清资源；不能恢复缺失的动画帧或保证所有细节均与原画一致。

### 实测与边界

Apple M3 Pro 本机浏览器，压力夹具含 45 株植物、30 只僵尸、20 发豌豆、10 个阳光和 5 台割草机。每项 180 次 rAF，前 30 次预热，统计后 150 次；仅渲染固定阵容，按 1× / 2× / 4× 推进动画时间。不是长时完整对局性能测试，也不是 GPU 计时。

| 倍速 | 原图 CPU 提交均值 / P95 | 2× CPU 提交均值 / P95 | 原图 / 2× rAF 间隔 P95 |
|---|---|---|---|
| 1× | 0.191 / 0.300 ms | 0.228 / 0.400 ms | 9.2 / 9.0 ms |
| 2× | 0.225 / 0.400 ms | 0.183 / 0.300 ms | 9.1 / 9.1 ms |
| 4× | 0.197 / 0.300 ms | 0.215 / 0.400 ms | 9.0 / 8.8 ms |

本机短时对照没有测出明显帧时间退化；小幅差异不应解释为高清更快。低显存设备、移动端、长时显存压力和不同浏览器尚未验证。样板截图与记录：`artifacts/hd-sample-comparison.png`、`hd-sample-performance.json`、`hd-stress-performance.json`；可通过开发服务器打开 `artifacts/hd-check.html` 对照。

50 项测试和生产构建通过，未运行 lint。新增四项测试覆盖全部帧元数据不变、41 张静态图片严格 2×、图集边界 / 不同帧无重叠、源图散列一致。浏览器验证 1–9 六槽选择与种植、1–10 真实供卡与种植，未记录 error/warn；没有修改玩家进度。当前可见画布宽约 845.33 CSS px、DPR=2，backing 宽为 1691 px，符合渲染分辨率设置。浏览器尺寸覆盖接口未改变该测试标签页的实测尺寸，因此跨窗口尺寸交互仍未完成实测，不能据此宣称已通过多尺寸验证。

## 夜晚 2–1 至 2–4：四关批量迁移（2026-10-14）

最新可玩范围为 1–1 至 2–4 共 14 关；1–10 奖励小喷菇并进入夜晚。本节替代此前“夜晚未迁移 / 十关终点”的当前范围说明，之前各节保留为历史记录。此轮不包含 2–5 打僵尸小游戏及其后的章节。

### 原版数据及实现

仍以 Portable `141c1476dd462ac3526f796e303177616f4de6bc` 为参考，实际读取本地固定 checkout。`tools/import-level-data.py` 提取前 14 关波数、七种僵尸的资格 / 价值 / 起始波 / 权重，并从 Board.cpp 提取夜晚墓碑列数。输出及七个源文件 SHA-256 保存在 `src/game/data/portable-adventure.json`。

| 关卡 | 波数 | 开场墓碑（列从 0 计） | 常规敌人（另有旗手） | 奖励 |
|---|---|---|---|---|
| 2–1 | 10 | 6 列 1 块、7 列 1 块、8 列 2 块 | 普通、报纸 | 阳光菇 |
| 2–2 | 20 | 同上，共 4 块 | 普通、路障、铁桶、报纸 | 大喷菇 |
| 2–3 | 10 | 同上，共 4 块 | 普通、路障、铁栅门 | 墓碑吞噬者 |
| 2–4 | 20 | 5 列 1 块、6 列 1 块、7 列 2 块、8 列 3 块 | 普通、路障、撑杆、铁栅门 | 本版阶段结束 |

- 波数 / 资格：[Challenge.h L259](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.h#L259)。报纸 cost=2、level=11、firstWave=1、weight=1000；铁栅门 cost=4、level=13、firstWave=5、weight=3500，见 [Zombie.cpp L86](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L86)。新敌人强制出现在该关中间和末波，沿用 Board::PickZombieWaves；没有为夜晚另写固定出怪列表。
- 墓碑：[Board.cpp L1098](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L1098) 的列数；列内从未占用行随机选择。普通植物不能种墓碑，墓碑吞噬者必须种墓碑，见 [L2717](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L2717)。沿用本项目 RNG，不声称相同种子与原版墓碑位置一致。
- 墓碑出怪：末波设置 200 tick 倒计时，[Board.cpp L4943](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L4943)、[L5258](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L5258)。每块剩余墓碑各出一只，普通 / 路障按资格及等权抽取，2–1 只能出普通，见 [L2371](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L2371)、[L4832](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L4832)。起身 150 tick，见 [Zombie.cpp L8184](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L8184)；完成前不行走、啃食或被本版直射攻击命中，胜利等待墓碑计时和清怪。
- 夜晚不生成天空阳光：[Board.cpp L5179](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L5179)。仍可使用向日葵。阳光实体新增实际价值，手动和自动收集均按 15 / 25 入账，特效文字对应实际值。
- 新植物：[Plant.cpp L57](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L57)：小喷菇 0、阳光菇 25、大喷菇 75、墓碑吞噬者 75，冷却均 750 tick，生命均按基础植物 300；喷射基础周期 150 tick。小喷菇攻击矩形宽 230、大喷菇宽 340，见 [L5180](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L5180)，在本版身体锚点坐标中采用前方 250 / 360 px 窗口；仍不是完整矩形碰撞还原。
- 小喷菇孢子 20 伤害、75 tick 生命周期：[Projectile.cpp L42](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Projectile.cpp#L42)、[L266](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Projectile.cpp#L266)。大喷菇每轮对范围内所有落地目标造成 20 伤害，绕过盾牌但保留头盔吸收，[Plant.cpp L4478](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L4478)、[Zombie.cpp L7970](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L7970)。
- 阳光菇：初产 300–1250 tick、后续 2350–2500 tick，12000 tick 后成长；生长期暂停生产计时。[Plant.cpp L192](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L192)、[L388](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L388)、[L1076](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L1076)。小阳光 15，大阳光 25，见 [Coin.cpp L1299](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Coin.cpp#L1299)。成长固定为 92 tick，是参考原 SunShroom.reanim 的 12 帧 / 12 fps、11 个区间后取整的本版适配；画面直接切成熟 GIF，未移植成长 Reanim。
- 墓碑吞噬者：[Plant.cpp L1104](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L1104) 啃食 400 tick 后移除墓碑和自身。当前省略原版独立降落阶段及掉金币，不新增金币系统；铲掉吞噬者或其被吃掉会中止清碑。普通啃食仍适用 Zombie::CanTargetPlant（L6343），没有套用 JS 移植中不可被吃的差异规则。
- 报纸盾 150、铁栅门盾 1100：[Zombie.cpp L610](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L610)、[L274](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L274)。破报后播 gasp，再以 0.89–0.91 的原始速度参数行走，[L7557](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L7557)、[L1688](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L1688)、[L1208](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L1208)。本版 gasp 150 tick 来自 Zombie_paper.reanim 的 13 帧、8 fps（12 个区间）；行走以 47 帧、57.8 px `_ground` 轨道同步平均移速，避免把 mVelX 直接当每 tick 位移。盾牌完全吸收的冰豌豆不减速，伤害穿透盾后才附加寒冰，见 TakeShieldDamage / TakeBodyDamage。

### 资源、界面与验证

新增原版夜景、墓碑、孢子图，及小喷菇、阳光菇小 / 大形态、大喷菇、墓碑吞噬者、报纸完整 / 破报 / 无报 / 濒死 / 死亡 / 烧焦、门盾行走 / 啃食。来自原已固定的 JavaScript 与 ruslan 仓库；来源散列在 `docs/original-assets.json`。大喷菇攻击源文件是单张姿态，喷雾是八格竖向图，本版切为 8 帧、每帧 4 tick；未伪称原 GIF 动画。补接原版 fume.ogg。大喷菇和墓碑吞噬者卡片使用原空卡框、植物肖像及 DOM 价格组合，非原版完整卡片扫描图。

2× 全量重新打包为 52 组 / 1426 帧（新增 441 帧）、4 张 4096² 图集；50 张静态图，PNG 共 83,267,667 bytes（约 79.4 MiB）。角色图集基础 RGBA 256 MiB，较前一版增加 64 MiB；低显存设备未测。原版 GIF 帧时长保留，模拟仍 100 Hz。夜晚当前没有昼夜切换，也没有把蘑菇开放到旧白天选卡池，因此尚未接入蘑菇白天睡眠 / 咖啡豆。

62 项测试与 TypeScript / Vite 生产构建通过，未执行 lint。白天十关回归继续通过；新增四关各用 3 个随机种子，通过正常六槽选择、收阳光和种植命令通关，未注入阳光、植物、减血或移除僵尸。隔离单项测试覆盖波数 / 资格、无天空阳光、墓碑占位、小喷菇射程与弹丸寿命、阳光菇成长和小阳光收集、大喷菇穿盾 / 不穿头盔、报纸破损停顿 / 加速、门盾阻挡寒冰、清碑 / 铲除中断、末波起身 / 胜利等待、倍速一致与暂停。

浏览器使用隔离存档端口验证十四关入口、十二选六、夜景、阳光菇 / 小喷菇种植、自动阳光、墓碑吞噬者种植。另用 `artifacts/night-visual.html` 固定阵容查看新植物、门盾和报纸各状态、喷雾；此页明确标为动画夹具，不是完整实战。未记录 console error/warn。新动画夹具 200 帧 CPU 渲染提交均值约 0.15 ms / P95 0.30 ms，仅本机短时数据，不代表完整游戏 FPS 或 GPU 时间。

仍有简化：随机序列、矩形碰撞、射击动作事件；墓碑起身使用可见性及纵向展开近似，未接原版裁剪粒子；盾牌缺两档破损碎片；报纸缺撕裂音效与头部独立轨道；2–4 原版图鉴奖励流程未复刻（本版图鉴一直可从主菜单查看）。2–5 需要独立打僵尸模式，未用普通种植冒充小游戏。

## 白天庭院无尽（先行版）

本次只新增生存入口和无尽循环，不推进冒险编号，不改既有植物 / 僵尸数值或高清资源。目标是可持续玩的白天草坪版本，**不是完整泳池无尽**。对应 Portable `GAMEMODE_SURVIVAL_ENDLESS_STAGE_1` 的白天背景分支：[Board.cpp L882](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L882)。以下结论来自固定 commit 的实际代码读取。

### 已接规则与证据

- 50 初始阳光来自 [Board.cpp L1338](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L1338)。本版明确开放八种已迁移白天植物、六槽，不依赖冒险存档；蘑菇白天睡眠尚未实现，因此不在这个模式的可选池中。
- 每轮 20 波来自 `GetNumWavesPerSurvivalStage`：[Board.cpp L9342](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L9342)。每十波旗帜，末轮不会终止：`IsFinalSurvivalStage` 只为普通 / 困难模式返回终点，[L5139](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L5139)。本版清场进入 `intermission`，不发冒险 `win` 事件，因此不授予冒险奖励、不更新冒险进度。
- 零基轮次 `stage=0` 预算 `floor(wave/3)+1`，之后 `floor((stage*20+wave)*2/5)+1`；旗帜波预算乘 2.5 取整，先预留最多 8 只普通及旗帜僵尸，再按各僵尸 cost / weight 支出。[Board.cpp L633](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L633)、[L762](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L762)。每波上限 50 是原版规则，[Board.h L44](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.h#L44)，不是新增性能降级。没有套用冒险的“新僵尸强制介绍 / 末波补齐所有种类”。
- 首轮普通 / 路障 / 铁桶：[Challenge.cpp L2293](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L2293)。后续轮普通必选，1/5 选报纸、4/5 选路障，再抽其他种类：[L2248](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L2248)。**本版适配**：其他种类限定为路障、撑杆、铁桶、报纸、铁栅门，去重选 `min(stage+1, 剩余种类数)` 个；不为未实现巨人等生成替代敌人。每轮选卡界面列出该轮类型。
- 生存加权衰减及无尽出场门槛：[Board.cpp L2401](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L2401)。按本轮开始时已完成旗数计算：10–50 旗普通权重降至 1/10、路障至 1/4；18–50 旗首次允许波数最多提前 15（下限 1）。线性曲线和整数四舍五入对应 [PvzpCommon.cpp L376](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/PvzpLib/PvzpCommon.cpp#L376)。巨人等专用数量规则未实现，因为角色池不含它们。
- 轮间沿用同一 Board，再增轮次、重新初始化波次：[LawnApp.cpp L1457](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/LawnApp.cpp#L1457)、[Board.cpp L1249](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L1249)。本版复用 Game 和渲染场景，保留植物、伤害、计时、阳光、场上弹丸 / 阳光及割草机状态；清空携带卡、取消手持卡 / 铲子、重置本轮波次与波次计时、重置割草后出怪权重，保留行选择历史。已消耗割草机不会刷新。
- 重选保留卡片剩余冷却：[SeedChooserScreen.cpp L180](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Widget/SeedChooserScreen.cpp#L180)、[L1095](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Widget/SeedChooserScreen.cpp#L1095)。本版卡片按植物种类保留冷却，未携带卡片的冷却不走时；选卡与轮间暂停模拟。没有升级植物加价。
- 后续轮首波 600 tick / 6 秒：[Board.cpp L1204](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L1204)，常量在 L61。首轮采用现有 1800 tick；无尽无需先种一株植物才启动天空阳光与出怪计时。
- HUD 已完成旗数不预先计入正在战斗的旗帜波，依据 [Board.cpp L5009](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L5009)。失败面板报告本次旗数与击杀数。没有移植 L5021 的最高成绩存储，也没有中途存档。

### 验证与适配边界

`pnpm build` 与 70 项测试通过，未执行 lint。原 62 项冒险 / 数值 / 资源测试继续通过。新增测试覆盖首轮配置、候选组合、原版波次预算 / 50 只上限 / 旗帜、每轮出场门槛及高旗数提前、末波等待清场、植物受损及卡片冷却 / 割草机继承、选卡冻结、连续 55 轮阶段切换，以及 30 / 60 / 120 Hz 和 1× / 2× / 4× 相同游戏时间状态一致。55 轮测试隔离战斗、手动设定清场状态，只证明阶段循环，不声称实战守住 110 旗。

另外 3 个随机种子（1、23、123456）均以普通六槽选卡、正常种植指令及自动收集实际生成阳光，连续通过三轮 / 六旗；未注入资源、植物或伤害，没有移除僵尸。第六旗完成时分别保留 37、38、24 株植物；第三个种子消耗一台割草机。只证明前六旗可玩，不是长时难度平衡结论。

浏览器在隔离存档端口检查菜单入口、六槽选卡、倍速与自动收阳光；另将普通操作模拟生成的第一轮结束快照载入明确标记的“续关 UI 测试夹具”，检查两旗轮间面板、第二轮重新选卡、保留防线 / 阳光并继续作战。夹具仅位于忽略目录 `artifacts/`，生产包没有调试入口或自动通关代码。普通无尽页面也检查了暂停后重新开始，确实回到无尽第 1 轮 / 0 旗 / 50 阳光选卡；两页均未记录 console error / warn。

原版轮间有 500 tick 过场，本版直接显示冻结面板，由玩家点击后重新选卡；没有平移预览僵尸、续关存档、最高旗数、夜晚 / 泳池 / 迷雾 / 屋顶无尽、全植物与全僵尸、巨人专用规则、升级加价及原版 9990 阳光上限。随机序列仍使用现有 LCG，未声称同种子能复现原版；受限敌人池达到每波 50 只后，后期难度会与完整原版明显不同。

## 夜晚扩展：2–5 至 2–7（2026-10-14）

当前冒险终点推进到 2–7，共 17 关；以下是本次新增内容。前文“2–4 为终点”“2–5 未实现”是历史阶段记录。本次实际读取固定 Portable commit `141c1476dd462ac3526f796e303177616f4de6bc`，没有把 README 当作行为证据。关卡提取工具扩展到前 17 关，增加橄榄球僵尸资格 / 价值 / 权重，来源文件散列仍在 `src/game/data/portable-adventure.json`。

| 关卡 | 波数 | 开场墓碑 | 新内容 |
|---|---|---|---|
| 2–5 | 8 | 9 块，零基列 3–8 | 独立打僵尸模式；固定三张辅助卡，奖励魅惑菇 |
| 2–6 | 10 | 7 块：列 5/6/7/8 分别 1/1/2/3 | 十三选六、魅惑菇、橄榄球僵尸，奖励胆小菇 |
| 2–7 | 20 | 11 块：列 4/5/6/7/8 分别 1/2/2/3/3 | 十四选六、胆小菇；本版终点 |

### 行为来源与实现

- 2–5 使用专门波数覆盖：[Board.cpp L576](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L576)。开场九块墓碑在 [L1077](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L1077)，初始阳光为零在 L1338；固定土豆雷 / 墓碑吞噬者 / 樱桃炸弹在 L1495。不是普通种植关的出怪列表，也不使用传送带。
- 木槌：[Challenge.cpp L945](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L945) 使用以点击 y−20 为中心、半径 45 的圆与身体碰撞，取最上层目标；有头盔时单独扣 900 头盔生命，无头盔直接击杀。因此普通 / 路障 / 铁桶分别一 / 二 / 三锤，溢出的头盔伤害不扣身体。选择辅助卡时点击改为种植，取消后恢复木槌。
- 出怪时间与组合：[Challenge.cpp L2534](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L2534)。开场 200 tick，每轮 2000 tick，末轮延迟 300 tick 后批量出怪；按源码阶段概率表抽取单 / 双 / 三只及路障 / 铁桶，末组尝试从最多 20 块合格墓碑出怪。每组不重复墓碑，排除正在被墓碑吞噬者清理的格子。起身 50 tick；速度 / 出怪间隔随轮次采用源码曲线，原始速度仍通过现有地面轨道平均移速换算。
- 每轮末尾增加墓碑：[Challenge.cpp L2491](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L2491)，空格权重 100000、植物格权重 1，选中植物格则移除植物。掉落概率读取 [Board.cpp L9036](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L9036) 及 L9064：按僵尸价值和现有阳光量决定三枚 25 点阳光掉落，仍先落下再自动收集。本版省略金币掉落。
- 后两关墓碑列数：[Board.cpp L1104](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L1104)、L1111；普通波次仍由原冒险预算 / 资格生成，末波墓碑出怪沿用已迁移流程。
- 橄榄球僵尸：[Zombie.cpp L88](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L88)，价值 7、介绍关 16、最早波 5、权重 2000；[L341](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L341) 头盔 1400，身体基础 270；L1199 原始速度 0.66–0.68。固定 ruslan 资源 `Zombie_football.reanim` 中 anim_walk 为 21–50 共 30 帧，`_ground` 从 −59.8 到 −29.8，平均位移为 `speed × .47 × 30 / 29` 每 tick。本次不扩大白天无尽的敌人池。
- 魅惑菇：[Plant.cpp L61](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L61) 75 阳光、3000 tick 冷却、基础生命 300。[Zombie.cpp L4831](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L4831) 消耗蘑菇、控制僵尸并将速度参数设为 0.17。友军保留身体 / 头盔 / 盾牌剩余值，右行，不触发割草机或失败，不被植物攻击，不阻止清场获胜。相反阵营互咬参考 L6443、L6859、[L7127](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L7127)：4 tick 造成 4 伤害，伤害标记 `9U` 绕过盾牌，但头盔仍吸收。
- 胆小菇：[Plant.cpp L62](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L62) 25 阳光、750 tick 冷却、150 tick 基础攻击周期；[L1313](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L1313) 检查周围 120 半径身体碰撞，包含相邻行并排除被魅惑 / 死亡目标，躲藏停止发射。本版孢子 20 伤害、整排射程，单独保留长程标记，避免误用小喷菇 75 tick 消失限制。

### 高清资源和已验证范围

沿用固定来源的原 GIF / PNG，新增魅惑菇、胆小菇正常 / 躲藏，橄榄球完整 / 掉盔的行走 / 啃食、濒死、死亡，以及两张原卡片、木槌和 bonk / mindcontrolled 音效。原文件、commit、SHA-256 写入 `docs/original-assets.json`。离线 Real-ESRGAN 2× 后，现有所有关卡共 61 组动画、1654 帧（新增 228）、1593 张去重帧、55 张静态图、5 张 4096² 图集。PNG 共 96,253,827 bytes，约 91.8 MiB；角色图集基础 RGBA 为 320 MiB，较前一阶段多 64 MiB。浏览器无在线放大模型，保留原 GIF 帧时长，100 Hz 模拟与显示帧率继续解耦。

`pnpm test` 79 项通过，`pnpm build` 通过，未执行 lint。新增测试覆盖打僵尸初始 / 计时 / 头盔锤数 / 暂停、原始资格与墓碑数、魅惑友军交互及门盾绕过、胆小菇射程 / 躲藏、橄榄球移速、1×/2×/4× 一致。新增三关各以种子 1、23、123456 通过正常操作通关：打僵尸只点击目标和收阳光；2–6 / 2–7 使用正常六槽选择、种植指令与收集实际阳光，没有注入资源或伤害。单项规则测试另有直接设定的隔离场景，不混称实战。

浏览器隔离存档端口检查 17 关入口、打僵尸开场 / 点击 / 掉落、2–7 十四选六和胆小菇种植扣费。独立固定阵容页面检查魅惑朝向 / 紫色、胆小菇躲藏、橄榄球行走 / 啃食 / 掉盔 / 濒死贴图；该页只在忽略的 artifacts 目录，不进入生产入口。两页无 console error / warn。动画夹具 200 帧的 CPU 渲染提交均值约 0.26 ms、P95 0.50 ms；不是实战 FPS、GPU 完成时间或低显存设备保证。

仍有明确适配：木槌与胆小菇使用本版身体矩形；木槌是点击时短动画，未接完整跟随光标 Reanim。魅惑在第一次啃食扣血 tick 生效，未等原 Reanim chew 事件；胆小菇直接切躲藏 / 站立 GIF，省略完整起落轨道。橄榄球头盔只有完整 / 掉盔两态，烧焦复用普通烧焦动画。打僵尸省略金币和原版得奖过场。2–8 的寒冰菇 / 舞王召唤及 2–9、2–10 尚未开放，不用重复关卡替代。

## 六关扩展与四场景无尽（2026-10-14）

本节为最新状态，覆盖前文“未接泳池 / 舞王”“不保存中途进度”等历史限制。新增冒险 **2–8、2–9、2–10、3–1、3–2、3–3**，冒险共 23 关；无尽扩为白天、夜晚、泳池、迷雾。没有接入巨人、屋顶或完整后期单位池。以下依据是实际读取固定 Portable commit `141c1476dd462ac3526f796e303177616f4de6bc` 的源码，以及固定 ruslan commit 的 Reanim 数据，不是 README 声明。

### 关卡与战斗规则

| 新增关卡 | 波数 | 开场 | 本轮实现 |
|---|---:|---|---|
| 2–8 | 10 | 11 墓碑，十五选六 | 寒冰菇；舞王和四名伴舞、补召唤 |
| 2–9 | 20 | 11 墓碑，十六选六 | 毁灭菇、爆炸、三分钟弹坑 |
| 2–10 | 20 | 13 墓碑，七种传送带植物 | 三倍出怪预算，通关获得睡莲 |
| 3–1 | 10 | 六行，十七选六 | 两条水路、睡莲、鸭子圈、末波池底出怪 |
| 3–2 | 20 | 六行，十八选六 | 窝瓜四阶段跳压 |
| 3–3 | 20 | 六行，十九选六 | 三线射手与潜水僵尸 |

- 波数和逐关资格、僵尸成本 / 权重由 `tools/import-level-data.py` 扩展提取到 23 关；固定源文件哈希见 `src/game/data/portable-adventure.json`。2–10 七种供卡与权重来自 [Challenge.cpp L1428](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L1428)，依次墓碑吞噬者 20、寒冰菇 15、毁灭菇 15、魅惑菇 10、胆小菇 15、大喷菇 15、小喷菇 10。墓碑列数来自 [Board.cpp L1086](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L1086)：2–10 列 3–8 为 1/2/2/2/3/3。
- 六种新植物的成本和刷新周期来自 [Plant.cpp L63–74](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L63)：寒冰菇 75 / 5000 tick、毁灭菇 125 / 5000、睡莲 25 / 750、窝瓜 50 / 3000、三线射手 325 / 750、路灯花 25 / 3000。三线射手沿用 150−Rand(15) tick 攻击间隔，检测本行及相邻行，只要有目标就同时发射三行。
- 寒冰菇全场伤害 20、绕过盾牌，并冻结后减速；[Plant.cpp L4203](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L4203)、[Zombie.cpp L8384](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L8384)。冻结普通目标 400–600 tick、已受寒目标 300–400、水中 300；减速 2000 tick 见 L7519。池底出怪冻结计时为 300 tick。冻结期间移动、啃食及姿态时钟停止，显示帧率不改变效果时长。
- 毁灭菇范围 250、最多跨三行、1800 伤害，移除所在格植物与睡莲并留下 18000 tick 弹坑：[Plant.cpp L4322](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L4322)。窝瓜观察 80、准备 45、升空 50、落地 10 tick：[Plant.cpp L1493](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L1493)；本版用现有身体碰撞范围适配落点，造成 1800 伤害。
- 水路是零基行 2、3，行高 85：[Board.cpp L8879](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L8879)。上下层植物、优先啃食上层、优先铲除上层、睡莲承载以及土豆雷不能种水路已实现；白天 / 白天泳池的蘑菇保持睡眠。水中允许的僵尸类型及前五波普通僵尸不可下水来自 [Board.cpp L2491](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L2491)；鸭子圈和潜水只选水路，舞王 / 伴舞等只走陆地。
- 池底末波出怪来源 [Board.cpp L4710](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L4710)：3–1 / 3–2 两只，3–3 起三只，水路列 5–8 不重复格，寒冰菇池底冻结时取消。本版复用已有 200 tick 延迟和 50 tick 起身表现，候选普通 / 路障各半。夜晚仍等墓碑起身及清场后才结算。
- 舞王 500 身体生命：[Zombie.cpp L648](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L648)；四方召唤、伴舞起身 150 tick 与魅惑继承见 [L2810](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L2810)。开场 300+Rand(12) tick、指向动作按源 10 帧 / 24 fps 取 38 tick，召唤后等待 200 tick；缺员计时 100、等舞步周期第 12 拍才补召唤，见 L2950。全局舞步每 20 tick 一拍，共 23 拍，前 12 拍移动，后 11 拍抬手停步：[L6160](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L6160)、L3960。群组遇到啃食 / 冻结会停步，避免错误地持续前进和持续刷新伴舞。
- 步行仍使用地面轨道平均速度换算。`Zombie_disco.reanim` / `Zombie_backup.reanim` walk 为 21 帧、地面差 28.6；`Zombie_snorkle.reanim` walk 为 37 帧、地面差 59.9。没有把 GIF 帧数当作逻辑速度。潜水泳行中避开豌豆目标和碰撞，啃食时浮出；大喷菇继续可命中。
- 迷雾无尽起始雾列 5 见 [Board.cpp L8693](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L8693)。雾片使用原版 8 格 210×190 图片与透明蒙版，参考 L7320；路灯花清雾范围参考 [L7240](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L7240)。本版按灯花所在格重建可见雾片，照明变化才重建，不逐帧创建纹理。

### 无尽保存与恢复

四场景延续已有每轮 20 波、轮间重选和防线继承，按场景决定天空阳光、墓碑、水路及植物池。后续候选扩大到橄榄球、舞王；泳池 / 迷雾加入潜水。依旧只抽取已经迁移的单位，没有把巨人替换成普通僵尸；因此后期难度不等同完整原版。

保存属于本次 Web 功能，不宣称兼容 C++ 原版存档格式。`src/platform/storage.ts` 使用 `pvz-web:survival:v1:<scene>` 独立键，用户点暂停菜单 / 轮间 / 选卡页的“保存退出”时写入；直接关页不自动存。保存完整 Game 状态、随机生成器、选行历史、实体与计时、六槽顺序和冷却、倍速及自动收集设置。读档从暂停 / 选卡 / 轮间对应状态恢复，战斗暂停状态必须点继续；视觉缓存会重新建立，因此并不保证读档瞬间 GIF 姿态与保存前同一帧。冒险解锁键不变。新开局、重开和失败会清除对应无尽旧存档，不影响其他场景。

### 高清、验证与边界

沿用原资源导入和 Real-ESRGAN 2× 离线流程，新增 29 组 / 748 帧。当前共 **90 组、2402 帧、2286 张去重帧、72 张静态图片、6 张 4096² 图集**，PNG 139,413,362 bytes（约 133 MiB），角色图集基础 RGBA **384 MiB**。保留原 GIF 帧时长、锚点和逻辑尺寸；`ZombieDuckyDie.gif` 的全透明末帧保留为 1×1 透明纹素，维持原帧时长。路灯花 / 窝瓜的静态图鉴肖像去掉透明留白，动作帧锚点不变。来源与散列仍在 `docs/original-assets.json`，高清输出记录在 `public/assets/hd/manifest.json`。

94 项测试及 TypeScript / Vite 生产构建通过，未执行 lint。六个新增关卡各用种子 1、123456，通过正常六槽 / 传送带选择、实际阳光收集、种植及铲除完成，未注入资源、植物或伤害。四种无尽各以正常指令守住首轮两旗（泳池种子 23，其他种子 1），然后保存轮间、重选到一半再次保存、恢复并推进到第二轮出怪；结果和不中断的模拟一致。不同策略和随机种子会失败；这些验证不保证任意策略通关，也不代表长时无尽平衡。

隔离规则测试覆盖水路上下层、冰冻 / 解冻 / 盾牌、毁灭菇弹坑、白天睡眠、舞王补召唤 / 舞步停顿、潜水豌豆免疫、三行射击、窝瓜跳压和四场景存档隔离。四场景在 1× / 2× / 4× 的 JSON 往返恢复后，完整状态 / 随机序列 / 计时与未中断模拟一致；暂停时保持冻结。原有白天、夜晚及六旗无尽测试继续通过。

浏览器在隔离冒险进度端口验证 23 关选择、2–10 传送带、泳池六槽及水路种植、迷雾六槽与路灯花清雾；泳池实战保存、刷新、恢复暂停、继续到后续波次均已检查。舞王等新增动画另用 `artifacts/scenes-visual.html` 的固定阵容查看，该页不写存档、不进入生产包。没有修改 KR 项目。

仍有适配：角色 GIF 不是原版 Reanim 骨骼 / 事件；舞王使用素材仓库的 disco GIF，尚未与 GOTY 全部动作逐帧对照；舞王开场 / 群组位置同步、部分受损 / 濒死动作、潜水出入水、毁灭菇爆炸粒子与音效仍是近似表现。泳池水面为静态背景，雾片未接完整漂移和渐隐。无咖啡豆、水草、屋顶、巨人 / 红眼与完整后期植物，冒险 3–4 以后未开放。低显存和高旗数长时运行还没有全面验证。

本轮浏览器验证未记录 console error / warn。新增动画固定阵容 200 帧 CPU 渲染提交均值约 0.31 ms、P95 0.40 ms；仅是本机这一阵容的提交耗时，不是 GPU 耗时、完整 FPS 或高旗数性能保证。

## 3–4、3–5 与 PWA（2026-10-14）

本节更新至 25 关，覆盖前文“3–4 以后未开放 / 无水草”的历史限制。本次只推进两关、缠绕海草及 PWA / 应用图标，没有修改 KR 工作区。

### 实际源码依据

仍以 Portable commit `141c1476dd462ac3526f796e303177616f4de6bc` 为准。提取脚本扩为 25 关，`portable-adventure.json` 保留输入哈希；3–4 为 30 波，3–5 为 20 波。

- 缠绕海草 25 阳光、3000 tick 冷却：[Plant.cpp L68](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L68)。直接种空水面、不能叠在睡莲上：[Board.cpp L2773](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L2773)。不可被僵尸啃食：[Zombie.cpp L6348](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L6348)。
- 抓取共 100 tick，第 50 tick 拖下水，结束杀死目标及自身：[Plant.cpp L1197](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L1197)。铲除已抓取海草同样处理目标：[L4933](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L4933)。排除濒死、已被其他海草抓住和非水路目标见 L4789、L4875。Web 版沿用自身坐标 / 碰撞，横向 60 像素搜索；抓取图片加下沉淡出，尚未还原 Reanim 藤条与原版水花事件。
- 3–5 是 LittleTrouble，而不是普通种植关：[LawnApp.cpp L2106](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/LawnApp.cpp#L2106)。传送带睡莲 / 坚果 / 射手 / 樱桃基础权重 25 / 15 / 25 / 35：[Challenge.cpp L1526](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L1526)。僵尸候选为普通 / 路障 / 橄榄球 / 潜水，另保留旗帜波规则：[L2345](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L2345)。出怪预算四倍：[Board.cpp L671](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L671)。
- 小僵尸尺寸 0.5，身体 / 护甲 / 盾牌整数除以 4：[Zombie.cpp L871](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L871)。动画速率除以尺寸 [L6690](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L6690)，地面位移乘以尺寸 L4129，因此世界平均移速不因缩小翻倍，步伐周期减半。Web 版也缩放濒死阈值，避免 67 生命的普通小僵尸出生即被判濒死。

海草加入 3–4 及泳池 / 迷雾无尽卡池。现有无尽快照的 cooldowns 整体恢复逻辑保持不变；旧存档没有新增海草字段，本次未加入缺字段替代或自动迁移，因此旧局新选海草不能种植，体验该植物需新开局。冒险解锁进度不受影响。

### 资源、验证和边界

海草浮动 22 帧及抓取静态姿态来自已固定的素材库，新增肖像 / 卡片组合并进入原 Real-ESRGAN 2× 流程。当前 92 组、2425 帧、2308 张去重帧、73 张静态图、6 张 4096² 图集；PNG 140,299,057 bytes（133.8 MiB），角色图集基础 RGBA 仍为 384 MiB。

104 项测试及 TypeScript / Vite 生产构建通过，未运行 lint。3–4 / 3–5 分别使用种子 1 和 123456，正常收集、选卡、种植 / 铲除或消费传送带卡通关，没有注入战斗资源。新增隔离测试覆盖海草空水面、潜水抓取、100 tick / 暂停、铲除处理、迷你生命与步速、关卡入口集合与数据表一致性。浏览器独立存档端口核对 25 关入口、六槽海草选卡、空水面种植（50→25 阳光）及小僵尸传送带画面，未记录 console error / warn。

PWA 参考 KR 的 `tools/build/pwa.ts`、`packages/asset-runtime/src/pwa-worker.ts`、`packages/game-web/src/pwa.ts`、`tools/import/pwa-icons.ts`；实现只包含本项目所需的 manifest、图标、文件版本缓存、下载进度和主动更新。没有搬入 KR 的缓存管理 / 重试分支。离线规则单元测试与实际停服重载验证、图标提示词和安装步骤见 [PWA.md](PWA.md)。巨人、屋顶、3–6 及后续冒险仍未接入；本轮没有宣称完整原版无尽。

## 按需加载与动画资源优化（2026-10-14）

本轮按用户选择优化加载和动画，没有推进关卡、修改战斗规则、重试或缺失资源降级。主菜单不再等待 `Scene.init` 下载所有背景与六张 4096² 图集。`src/main.ts` 动态导入战斗模块：先准备对应场景，再展示选卡；开战时准备六槽所选植物和本轮敌人的动作；存档保留植物及实体也进入资源计划，空防线暂停存档在恢复时同样准备角色。所有下载 / GPU 上传发生在模拟开始前；切关及无尽换轮加载前停止模拟，仍沿用固定 10 ms 逻辑。

`src/rendering/asset-plan.ts` 明确包含普通本体、护甲脱落、死亡 / 烧焦、舞王伴舞、水路鸭子圈形态、打僵尸独立池、大喷菇烟雾、旧防线和滚动坚果，按动作名称选择资源。未使用的旧角色图集通过 Pixi `Assets.unload` 释放；未播完的效果所需图集保留至后续资源准备。静态背景在访问后留在纹理缓存中，不宣称完全固定显存。

`tools/build-runtime-assets.py` 从既有高清 PNG 裁出动作帧，独立打包为最大 2048² 的无损 WebP，保留帧时长、锚点、透明像素、逻辑裁边和尺寸；`tools/check-runtime-assets.py` 检查全部 2425 帧及 73 张静态图 RGBA 完全一致。没有再做 AI 推理或提高 / 降低原动作采样率。运行时文件总量 116,377,058 bytes（111.0 MiB）；如果把所有独立动作图集同时解码，基础 RGBA 约 428.6 MiB，因此核心是按需加载并释放，不是把整套资源都常驻显存。

首关选择 7 组动作（豌豆、阳光、普通行走 / 啃食 / 濒死 / 死亡 / 烧焦），文件总量 7,568,522 bytes（7.2 MiB），图集基础 RGBA 31,821,824 bytes（30.3 MiB）；此前六张角色 PNG 共 102.8 MiB / 基础 RGBA 384 MiB。这里的纹理数字不含背景、浏览器解码副本及渲染缓冲。

浏览器生产构建的首屏记录 2,366,402 bytes（2.26 MiB），0 canvas，仅入口 JS；首屏图片是菜单、Logo、冒险按钮和应用图标。此数来自同源 iframe 的 Resource Timing，不包含 Service Worker 后台预缓存、Pixi Worker 内部请求或浏览器协议开销，不当作首关全部流量或特定网络下的加载速度。PWA 构建插件只预缓存入口及静态依赖，动态渲染模块和角色包不会被启动缓存提前拉取；一键离线包含所有动态文件，约 112.5 MiB / 203 项，较前版 135.3 MiB 减少约 17%。旧缓存的保留规则未改变。

动画每帧改为二分定位动作帧、预计算每帧锚点、每植物只计算一次睡眠状态、每帧建立一次海草抓取映射。首次下载后的纹理在进入战斗前通过 Pixi Prepare 上传，避免首个可见角色触发整张大图上传。没有添加姿态混合 / 自动降画质或修改僵尸速度。

验证：108 项测试和生产构建通过，未运行 lint；原有时间 / 倍速 / 多关卡通关测试保留。新测试覆盖动作依赖、所有关卡及生存候选、帧边界和元数据完整性。浏览器固定阵容遍历 25 个冒险关卡、四场景无尽及恢复 / 下一轮，均成功加载和绘制，无 console error / warn；这是渲染资源回归，不混称正常游戏通关。另通过实际菜单操作验证空局保存、刷新、恢复暂停、继续后首次种植向日葵（50→0）；停服后完整离线刷新并进入首关种植（150→50）。

45 植物 / 30 僵尸 / 20 豌豆 / 10 阳光同机短测，每档 150 帧 CPU 绘制提交均值：1× 0.315→0.301 ms、2× 0.309→0.229 ms、4× 0.229→0.267 ms。4× 均值略增，不能宣称所有档位 FPS 提高；这些数据也不包含 GPU 完成时间。主要确定收益是下载 / 常驻资源减少和把首帧上传移到准备阶段。记录在忽略的 `artifacts/lazy-animation-results.json`、`lazy-scenes.txt`、`lazy-menu-production.json`、`lazy-offline.png`。低显存手机和长时高旗数仍未全面测量。

## 新增十关：3–6 至 4–5

本次从 25 关扩为 35 关，关卡选择直接开放全部已实现关卡，继续冒险和通关记录保留。新增范围是 3–6、3–7、3–8、3–9、3–10、4–1、4–2、4–3、4–4、4–5；没有扩充四场景无尽的敌人池，也没有接入屋顶或巨人。

### 源码依据与实际接入

基线仍为 Portable `141c1476dd462ac3526f796e303177616f4de6bc`，下列结论来自实际读取的源码。`tools/import-level-data.py` 提取到第 35 关，输入路径和 SHA-256 留在 `portable-adventure.json`。

- [Challenge.h L259](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.h#L259) 的原始波数表第 26–35 项为 20 / 30 / 20 / 30 / 30 / 10 / 20 / 10 / 20 / 20；资格矩阵位于 L360 起。4–5 走砸罐特殊流程，实际界面为三轮，不把表里的 20 当作砸罐波数。[Zombie.cpp L93](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L93) 提供冰车、雪橇队、海豚、玩偶匣、气球的预算、引入关卡与权重。
- [Challenge.cpp L1446](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L1446) 的 3–10 传送带为睡莲 25、窝瓜 5、三线射手 25、海草 5、辣椒 10、地刺 10、树桩 10、高坚果 10；新增关卡使用这些权重与三面旗帜。
- 新七种植物的价格和冷却来自 [Plant.cpp L69](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L69)。高坚果 8000 生命见 L301；地刺 20 伤害及 100 tick 周期见 L1267；三叶草启动 50 tick 见 L201，驱雾 4000 tick 见 L4258；辣椒整排 1800 伤害及清冰见 L4336。已实现这些核心效果，以及高坚果阻止撑杆 / 海豚跨越、海蘑菇空水面种植和仙人掌防空。
- [Projectile.cpp L44](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Projectile.cpp#L44) 的火豌豆为 40 伤害，L1197 / L1221 描述豌豆点火与寒冰先融化。Web 已接入两步转换、同排小范围火焰伤害与解除冰冻。
- 冰车 1350 生命、海豚和玩偶匣 500 生命、气球身体 270 / 气球 20 见 [Zombie.cpp L399](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L399) 起的初始化分支。冰车速度 / 冰道 3000 tick 见 L4023；雪橇四成员、护甲和滑行见 L521。冰道条件见 [Board.cpp L2597](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L2597)，没有合适冰道时换为四只普通僵尸是 L4927 的明确原版行为。
- 海豚跳跃阶段见 [Zombie.cpp L1812](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L1812)；玩偶匣 110 tick 开匣与爆炸见 L2031。Web 已接入冰车碾压 / 地刺爆胎、冰道禁种、雪橇滑行 / 散队、海豚越过第一道防线、气球绕过地面火力 / 水中落地沉没、开匣范围爆炸及砸罐连锁。
- 4–1 从第 6 列起雾、4–2 至 4–4 从第 5 列起雾，依据 [Board.cpp L8693](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L8693)。路灯花和三叶草分别局部 / 暂时全场驱雾。
- [Challenge.cpp L3551](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L3551) 的三轮砸罐配方已经提取：15 罐（射手 5、窝瓜 5、普通 4、铁桶 1）；20 罐（射手 4、寒冰 5、窝瓜 4、普通 5、铁桶 1、橄榄球 1）；25 罐（射手 / 寒冰 / 魅惑各 5、普通 6、铁桶 2、舞王 / 玩偶匣各 1）。绿罐数量 0 / 2 / 3，分别从第 6 / 5 / 4 列开始放置。L3757、L3873、L3930 的清场、掉卡、连锁和换轮清理也已接入；掉卡保留 1500 tick，依据 [Coin.cpp L1495](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Coin.cpp#L1495)。不使用正常六槽、阳光生产或割草机。

### 素材、音乐和加载

新增 GIF / 原始贴图沿用已固定的 JavaScript、Python 和 ruslan 素材仓库，路径及输入散列在 `docs/original-assets.json`。三叶草和雪橇队没有直接采用 GIF，使用 `tools/reanim-frames.py` 读取原 `.reanim` 的继承字段和仿射变换并离线采样；变换依据 ruslan `SexyAppFramework/todlib/Reanimator.cpp` 的 `GetTransformAtTime` / `MatrixFromTransform`，这不是完整运行时骨骼系统。

新增 35 组动作，当前共 127 组、3161 帧、3005 张去重帧、84 张静态图片。新增素材进入 Real-ESRGAN 2× 和独立 WebP 动作包流程。完整角色 PNG 母图共八张 4096²，基础 RGBA 512 MiB；它们不整包加载，实际战斗仍按当前植物 / 敌人准备和释放。砸罐提前准备三轮所有可能角色及衍生伴舞，避免中途开罐才下载。运行时 WebP 文件总量约 139.6 MiB；这不是每关下载量。

砸罐新增 Cerebrawl，依据 [Music.cpp L338](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/System/Music.cpp#L338) 的 order 0xB1 和 L607 的模式选择。沿用原 MO3 → libopenmpt → MP3 的离线流程，只新增这一曲，保留现有八首文件。音乐按场景切换并按需加载；首次播放仍需要用户操作。完整 PWA 离线包约 156.9 MiB / 260 项，启动预缓存仍是 11 项。

### 验证与边界

143 项测试、TypeScript 检查和 Vite 生产构建通过；未执行 lint。九个正常 / 传送带关使用种子 123456，三轮砸罐使用种子 1、123456，通过正常选择、实际阳光收集、种植、铲除、传送带或开罐拾卡通关，没有注入战斗资源或直接伤害。测试玩家保存在 `tests/helpers/late-adventure.ts`；额外人工运行的砸罐种子 42、100 也通关。隔离测试覆盖新植物 / 僵尸互动、冷却、暂停、三轮配方、卡片过期、延迟加载，以及 30 / 60 / 144 Hz 下相同的固定模拟结果。

3161 动画帧和 84 静态图经 `tools/check-runtime-assets.py` 核对，WebP 与 2× PNG 的 RGBA 逐像素相同。浏览器验证全部 35 个入口开放、砸罐 / 拾卡 / 免费种植，以及泳池和迷雾新增角色固定阵容；固定阵容只用于视觉检查，不作为通关证据。

保留的简化：冰车减速、雪橇队散队 / 碰撞、海豚入水及跳跃轨迹、仙人掌升降时序仍非原版逐帧复刻；部分受损 / 死亡动作复用现有角色动作，火豌豆使用染色弹丸，雾仍非完整原版漂移 / 渐隐。砸罐没有戴夫对话、摆罐过场、完整碎片粒子，也尚未发放供 4–6 使用的裂荚射手。4–6 及后续未开放，不能将本次新增角色视为完整无尽内容。

## 新增十关：4–6 至 5–5

范围：第一轮冒险第 36–45 关，总计 45 关直接开放。波数依次为 **10 / 20 / 10 / 20 / 20 / 10 / 20 / 20 / 30 / 20**。本批没有增加屋顶无尽、商店、巨人或 Boss，也没有改变已有四种无尽的敌人池。

所有下列 Portable 引用固定在 `141c1476dd462ac3526f796e303177616f4de6bc` 的实际检出源码。数据生成器追加第 36–45 关，并记录 CutScene 和 Music 的源文件哈希。

| 行为 | 已阅读的 Portable 源码证据 |
| --- | --- |
| 波数、敌人首次关卡、权重与资格表 | [Zombie.cpp:98](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L98)；[Board.cpp:1137](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L1137) 采用冒险资格表，4–10 不走独立 StormyNight 的 InitZombieWaves 名单 |
| 4–10 预算三倍，5–5 两倍；矿工第七波及末波固定出现；5–5 非末旗帜波只有五只偷取型蹦极 | [Board.cpp:624–714](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L624) |
| 新植物价格与冷却；裂荚 / 杨桃 150 tick、投手 300 tick 发射周期 | [Plant.cpp:77–85](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L77)；南瓜 4000、大蒜 400 生命见初始化 |
| 卷心菜 40、玉米 20、黄油 40 伤害；投射黄油概率与定身 | [Projectile.cpp:44](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Projectile.cpp#L44)；Plant.cpp:804；Zombie.cpp 的 ApplyButter |
| 磁力菇吸装备与 1500 tick 再充能；咖啡唤醒 | [Plant.cpp:1855](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Plant.cpp#L1855)、2050–2100、4387 |
| 矿工、跳跳、蹦极、梯子生命与初始状态 | [Zombie.cpp:289](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Zombie.cpp#L289)、303、353；移动参数见 1165 起，出土见 2695，跳跳见 1430，放梯见 4067 |
| 屋顶五行、85 像素行距、坡面坐标与 25 / 20 / 15 预置花盆 | [Board.cpp:8863](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L8863)；[CutScene.cpp:1055](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/CutScene.cpp#L1055) |
| 屋顶末波空投、5–5 用蹦极运送波次敌人 | [Board.cpp:4770](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L4770)、4794、4898、4943；蹦极下降、等待、偷取优先级见 Zombie.cpp:1280–1370 |
| 4–10 八种、5–5 四种传送带；睡莲/花盆随已用数量降低权重 | [Challenge.cpp:1466](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L1466)、1552、1630–1636 |
| 雷雨与音乐 | [Challenge.cpp:1710](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L1710)；[Music.cpp:591](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/System/Music.cpp#L591) 雷雨夜停止音乐、屋顶 Graze the Roof、蹦极突袭 Loonboon |

实现边界：保留固定 10 ms 模拟，渲染不驱动移速。新投手使用固定一秒的预测落点弧线与近距离命中判定，不是原版弹道求解器；黄油定身 400 tick。杨桃使用五方向二维弹丸与矩形碰撞。跳跳用连续位移加周期抬升表现跳跃，高坚果及磁力菇解除跳跃；并非完整逐格跳跃状态机。矿工左侧出土采用 230 tick、被吸镐采用 330 tick 过渡；部分后续步态复用现有地面均速换算。梯子放置采用 100 tick，普通僵尸经过带梯格跳过啃食，未还原攀爬轨道。蹦极保留下降 / 偷取等待 / 上升与保护层关系，死亡使用现有姿态；偷取目标、空投位置和末波种类选择仍为本移植的简化采样。屋顶没有购买式屋顶清扫车。咖啡豆用 100 tick 完成唤醒与消耗；雷雨用暗场、150 tick 亮场渐变和雨线表现，未实现原版全部随机闪电状态与雨粒子。

素材继续使用现有仓库资产：裂荚、杨桃、南瓜、花盆、咖啡豆、大蒜取源 GIF；卷心菜 / 玉米 / 磁力菇和四种新僵尸从 ruslan 的 Reanim 图片及仿射轨道离线采样。屋顶必须使用 ruslan `images/background5.jpg`；JavaScript 素材仓库的同名文件实际是水族馆，不能按文件名直接对应。各文件路径和 SHA-256 见 `original-assets.json`。新增音乐由原 MO3 的 0xB8 开始、0xB9 循环位置生成，循环起点实际测得为 4 秒，见 `music-assets.json`。

资源现为 160 组 / 3993 帧、101 张静态图。2× PNG 母图共十页；客户端仍按所选植物及本关敌人加载独立 WebP 动作包，首关不会加载屋顶、矿工、跳跳或投手动作。每一帧和静态图片均通过 HD 与无损 WebP 的 RGBA 逐像素比较。新关沿用六槽选卡、倍速、自动阳光落地后收集、暂停与返回菜单。

验证：169 项测试覆盖旧关回归、新十关正常操作完整通关、来源数据、保护层、出土反击、五向弹丸、吸铁、屋顶坡面、黄油、咖啡、放梯、蹦极偷取与空投；30 / 60 / 144 Hz 下新战斗与天气状态一致。正常操作脚本没有修改阳光、冷却、僵尸生命、波次或胜负状态；只证明所测固定种子可通关，不代表所有策略或种子都能通关。浏览器另检查屋顶六槽选卡、预置花盆、HUD、三种新场景切换与资源加载。
