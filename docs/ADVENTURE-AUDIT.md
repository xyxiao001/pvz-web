# 冒险玩法复核（2026-10-15）

本轮先补齐首次冒险的玩法细节，不扩展独立小游戏或解谜系列。现有 1–1 至 5–10 共 50 关已有入口；“关卡已开放”不代表已逐项还原 PC GOTY。

## 核对方式

行为基线仍为 [PvZ-Portable 141c1476dd462ac3526f796e303177616f4de6bc](https://github.com/wszqkzqk/PvZ-Portable/tree/141c1476dd462ac3526f796e303177616f4de6bc)。实际阅读该提交下的 C++ 源码，并重新运行 `tools/import-level-data.py`；生成的 `src/game/data/portable-adventure.json` 没有变化，确认抽取的波数、僵尸资格表、传送带配方和砸罐子配方与当前基线一致。这不等于整个 TypeScript 模拟器与 C++ 行为等价。

入口与玩法对应在 `src/game/config.ts`、`src/game/model.ts`、`src/game/waves.ts` 和 `src/game/boss.ts`：

| 冒险范围 | 本轮检查覆盖 |
| --- | --- |
| 1–1 至 1–10 | 初始阳光、行数、奖励次序；1–5 保龄球、1–10 传送带的既有测试 |
| 2–1 至 2–10 | 夜晚与墓碑；2–5 打僵尸；2–10 墓碑吞噬者供卡修正 |
| 3–1 至 3–10 | 水路、睡莲；3–5 小僵尸及 3–10 传送带供卡修正 |
| 4–1 至 4–10 | 雾、4–5 三组砸罐子掉卡计时、4–10 雷雨三种闪电与雷声 |
| 5–1 至 5–10 | 花盆与土豆雷、5–4 至 5–9 奖励／选卡次序、5–5 蹦极突袭、5–10 僵王战 |

## 已补齐的五类差异

源码链接均指向上述固定提交，不以 README 声明作为验证结果。

1. **传送带按场上植物调整供卡。** 2–10 墓碑数量不多于场上／传送带墓碑吞噬者总数时，其权重为零，后续重复牌规则不能重新启用它。3–5、3–10 和 4–10 的睡莲都随总数量降权；花盆／睡莲曲线改为四舍五入。对应 `model.ts::nextConveyorSeed`。依据：[Challenge.cpp 1615–1678](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L1615)、[PvzpCommon.cpp 376](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/PvzpLib/PvzpCommon.cpp#L376)。
2. **恢复屋顶原版奖励次序。** 5–4 不给植物，5–5 给大蒜，5–6 给保护伞，5–7 给金盏花，5–8 给西瓜投手；各植物从下一关进入普通选卡。5–4 胜利面板改为提示蹦极突袭。对应 `config.ts::LEVELS`、`main.ts::phasePanel`。依据：[LawnApp.cpp 2236–2257](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/LawnApp.cpp#L2236)、[ConstEnums.h 1037–1076](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/ConstEnums.h#L1037)。
3. **屋顶花盆允许种土豆雷。** 保留花盆前置条件；水路仍不能种土豆雷，屋顶仍不能种地刺。共享的屋顶生存选卡同步开放土豆雷。对应 `config.ts` 和 `model.ts::canPlant`。依据：[Board.cpp 2786–2834](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Board.cpp#L2786)。
4. **4–5 掉落植物卡计时。** 拿在手里仍计时，但选中期间不会被删除；第一次放回地面至少保留 300 tick，反复拿起不能无限延长；持有已到期卡片仍可正常种植。对应 `model.ts::releaseSeedDrop`、`selectDrop`、`step`。依据：[Coin.cpp 645](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Coin.cpp#L645)、[1371–1380](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Coin.cpp#L1371)、[1495–1508](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Coin.cpp#L1495)。
5. **4–10 三种雷雨闪电。** 开场计时 400，强弱双闪／长闪／短闪，计时 300 和 150 的对应雷声，闪白后逐渐变暗。对应 `model.ts::step`、`rendering/storm.ts`、`scene.ts`。依据：[Challenge.cpp 201](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L201)、[1710–1759](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L1710)、[2764–2773](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L2764)、[2834–2864](https://github.com/wszqkzqk/PvZ-Portable/blob/141c1476dd462ac3526f796e303177616f4de6bc/src/Lawn/Challenge.cpp#L2834)。

## 验证与边界

本轮 `pnpm test`：266 项通过、0 项失败；`pnpm build`（TypeScript 检查与生产构建）通过。未主动运行 lint。

- 新增 `tests/adventure-audit.test.ts`，覆盖奖励、供卡、屋顶土豆雷、掉卡计时、闪电音画边界，以及 30/60/144 Hz、1/2/4 倍速和暂停的一致性。
- 既有普通／泳池／屋顶生存模拟的状态哈希保持不变（只排除新增且不参与这些场景玩法的 `stormFlash` 字段）。
- 普通操作自动玩家用于特殊关卡和后期屋顶的通关回归；因供卡／解锁次序修正，调整了测试玩家选卡和布局策略，没有改血量、跳波或直接赋予胜利。僵王仍以原测试种子 23 验证。
- 浏览器逐一加载 50 个冒险关卡的场景、角色并运行 200 tick，50/50 渲染通过，资源释放完成，无控制台错误。这是资源与渲染冒烟检查，不代表手动完整通关 50 次。
- 单独查看了花盆土豆雷武装后的画面与雷雨阶段。未在本轮重新做 Android／iOS 真机测试。
- 没有新增素材、网络重试、错误兜底或存档格式兼容分支；`timesDropped` 用于冒险掉卡，现有生存模式不产生这类卡片。

## 仍保留的简化

以下仍不能称为完整 GOTY 移植：二周目选卡／雪人、完整戴夫对话与教学、商店和屋顶清扫车购买流程、奖励拾取与结尾演出；僵尸平均移动、部分碰撞／投射轨迹和粒子效果仍采用现有 Web 模拟。独立小游戏及解谜系列留待后续。

雷雨的黑白亮度包络和声响时点已按源码接入，但噪声使用每 6 个模拟 tick 更新的确定性哈希而非原版 MTRand，雨线沿用现有绘制，HUD 保持可操作。Web 暂停会冻结全部模拟，与原版暂停时让闪电收尾的处理不同。游戏 RNG 与原版也不同，不声称相同种子产生相同出怪／供卡序列。

本记录更新了 `BASELINE.md` 历史条目中的屋顶土豆雷禁用、后期植物提前解锁和单一雷雨闪光描述；旧条目作为迭代记录保留。
