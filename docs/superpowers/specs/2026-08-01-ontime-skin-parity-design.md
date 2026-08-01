# Ontime 现网皮肤全站对齐设计

> 日期：2026-08-01  
> 原型：`prototype/` · 发布：`https://cryangle0.github.io/Room/`  
> 现网：`https://order.roomroom.com.cn/`  
> 状态：实现完成（分支 `feat/ontime-skin-parity`；皮肤门禁 17/17 + Excel 22/22）

## 1. 背景与决策

客户要求原型**和现网看起来一样**，范围**全站**（平台 + 品牌 + 买手 + 预约小程序）。

已确认：

| 项 | 选择 |
|----|------|
| 保真档 | **C**：尽量复用现网皮肤（CSS / UIKit / iconfont / 字体） |
| 端口 | **3**：平台 + 品牌 + 买手 + 预约小程序 |
| 资源策略 | **混合**：核心 CSS/字体/icon **本地托管**；商品大图占位或按需外链 |
| 落地路径 | **分层皮肤（方案 2）**：vendor 挂载 → 按壳分层修 HTML → 截图对照 |

此前已完成：Excel #1–#14 功能/DOM 门禁、买手 C 端 class 对齐。本设计只解决**视觉皮肤**，不回退业务 Store 闭环。

## 2. 目标与非目标

### 目标

- 四端观感贴近现网：顶栏、侧栏、列表、筛选、表单、卡片、icon、字体、主色。
- 核心皮肤资源本地托管于 `assets/vendor/ontime/`，GitHub Pages 不依赖现网在线。
- 商品实拍 / LOOK 大图不进仓库；继续 LOOK 色块占位或按需外链。
- Excel / 买手业务门禁不回退。

### 非目标

- 不接真实现网 HTTP / 金蝶。
- 不移植 Drupal 后端。
- 不承诺 100% 像素叠图（字体子集、图、列表数据密度会有差）。
- 验收标准：并排截图时，客户难一眼分辨**壳层**差异。

### 原型专用 UI

顶部「端口切换 / 覆盖核对」保留，由薄层 `proto.css` 叠加，不破坏业务区现网观感。

## 3. 资源目录与加载顺序

```
prototype/assets/vendor/ontime/
  css/           # 主题 + UIKit 等（本地化，url 已改写）
  fonts/         # woff/ttf
  iconfont/      # iconfont.css + 字体（停止热链现网）
  img/           # 仅壳层小图（如 logo）
  SOURCES.md     # 来源 URL + 抓取日期
prototype/assets/proto.css    # 原型条 / 端口切换 / Mock 提示
prototype/assets/style.css    # 瘦身：删除与 vendor 重复/冲突规则；保留独有页补丁
```

### `index.html` 加载顺序

1. vendor：UIKit（若依赖）→ 主题主 CSS → iconfont  
2. `proto.css`  
3. JS 不变：`data.js` → `biz.js` → `app.js`

### 抓取规则

- 登录现网后从 Network 收集实际 CSS/字体并下载。
- 改写所有 `url(...)` 为相对 `assets/vendor/ontime/`。
- 只打包实际用到的分包，不整站镜像 Drupal。
- 商品图 / LOOK 大图不下载。

### 与 `style.css` 关系

- W0 挂上 vendor 后，删除/降级自研重置（顶栏、主色、按钮等与现网冲突处）。
- 保留：覆盖核对、金蝶模拟、小程序无现网同构时的补丁。

## 4. 分波实施

| 波次 | 范围 | 对照 |
|------|------|------|
| **W0** | 抓取本地化 vendor；挂皮肤；修爆版 | 管理页 + 买手首页（有会话时） |
| **W1** | 管理端壳：顶栏 / 侧栏 / 主区 / 筛选 / 主按钮 | `/manage` 商品列表、品牌列表 |
| **W2** | 平台高频页：品牌设置、选款、订单/补货、汇总 | Excel 相关页 |
| **W3** | 品牌端（同壳减菜单）+ 发货/意向/买手/角色等 | 品牌或平台等价页 |
| **W4** | 买手 C 端全链路 | 买手前台；无账号则用已存 HTML/截图 |
| **W5** | 预约小程序窄屏壳 | 有则对照；无则 Ontime 移动端风格自洽 |

每波循环：**改壳 → 并排截图 → 修 → 下一波**。

## 5. 验收

每页（MCP）：

1. 原型 vs 现网（或存档截图）并排截图。  
2. 检查顶栏高度/色、侧栏宽、主色（约 `#9A37FE`）、筛选区、行高、iconfont 非方框。  
3. 回归：`_excel_gate.js`、买手全量门禁。

风险退路：

- 无买手登录：W4 用 scrape / Excel 附图，有账号后再补色差。  
- 现网空页/权限页：保留原型能力，皮肤跟相邻页。

## 6. 交付物

- `assets/vendor/ontime/` + `SOURCES.md`
- `proto.css` + 瘦身 `style.css` + 更新 `index.html`
- `COVERAGE.md` / `BUG-PROGRESS.md` 增加「视觉皮肤」进度表
- 需要时：关键页对照截图目录（不强制进 git 大图）

## 7. 明确不做的变体

- 方案 1（整包无序搬主题、一次大改 HTML）：周期不可控，否决为默认路径。  
- 方案 3（只加深自研 CSS）：达不到档 C，否决。
