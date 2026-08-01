# Ontime 现网皮肤全站对齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现网 OntimeOrder 核心 CSS/字体/iconfont 本地化并挂到四端原型，使壳层观感与现网并排难辨，且不回退 Excel/买手业务门禁。

**Architecture:** 从已登录现网 Network 抓取实际加载的样式与字体 → 写入 `assets/vendor/ontime/` 并改写 `url(...)` → `index.html` 按 UIKit→主题→iconfont→`proto.css` 加载 → 按 W1–W5 修 HTML/削 `style.css` 冲突 → MCP 皮肤门禁 + Excel/买手回归。

**Tech Stack:** 静态 HTML/CSS/JS 原型；Chrome DevTools MCP 截图与 `evaluate_script`；Python 下载/改写脚本；GitHub Pages。

## Global Constraints

- 保真档 C：复用现网皮肤，非自研抄色。
- 端口：平台 + 品牌 + 买手 + 预约小程序。
- 核心 CSS/字体/icon **本地托管**；商品大图不进仓库。
- 不接真实现网 HTTP / 金蝶；不移植 Drupal。
- 业务门禁不回退：`_excel_gate.js`、买手全量门禁仍须 pass。
- 原型顶栏端口切换保留，仅由 `proto.css` 承载。
- Spec：`docs/superpowers/specs/2026-08-01-ontime-skin-parity-design.md`

---

## File map

| Path | Role |
|------|------|
| `assets/vendor/ontime/css/` | 本地化 UIKit + 主题 CSS |
| `assets/vendor/ontime/fonts/` | 字体文件 |
| `assets/vendor/ontime/iconfont/` | iconfont.css + 字体 |
| `assets/vendor/ontime/img/` | 壳层小图（logo 等） |
| `assets/vendor/ontime/SOURCES.md` | 来源 URL + 抓取日期 |
| `tools/vendor_ontime_skin.py` | 下载 CSS/字体并改写 url |
| `assets/proto.css` | 原型条 / 端口切换 / Mock |
| `assets/style.css` | 瘦身：去冲突，留独有补丁 |
| `index.html` | 样式加载顺序 |
| `_skin_gate.js` | 皮肤挂载与壳层 computed-style 门禁 |
| `assets/app.js` | 仅在某页 DOM 与现网壳不一致时改 markup |
| `COVERAGE.md` / `BUG-PROGRESS.md` | 视觉皮肤进度表 |

---

### Task 1: W0 — 抓取现网 CSS 清单并下载本地化

**Files:**
- Create: `tools/vendor_ontime_skin.py`
- Create: `assets/vendor/ontime/SOURCES.md`
- Create: `assets/vendor/ontime/css/`, `fonts/`, `iconfont/`, `img/`
- Modify: none yet

**Interfaces:**
- Consumes: 已登录 Chrome 会话访问 `https://order.roomroom.com.cn/`（管理端商品列表 + 若可得买手首页）
- Produces: 本地 CSS/字体文件；`SOURCES.md` 每行格式 `` `| url | local_path | date |` ``

- [ ] **Step 1: 在已登录现网页收集 stylesheet 绝对 URL**

用 Chrome DevTools MCP `evaluate_script`：

```javascript
() => [...document.querySelectorAll('link[rel~="stylesheet"], link[href*=".css"]')]
  .map(l => l.href)
  .filter(Boolean)
```

至少覆盖：管理端 `/manage/goods/list`（或当前默认管理首页）。将 URL 列表写入临时 `tools/_css_urls.json`。

- [ ] **Step 2: 写下载脚本（最小可用）**

创建 `tools/vendor_ontime_skin.py`，行为：

1. 读 `tools/_css_urls.json`（字符串数组）。
2. 对每个 URL：`requests.get`（带浏览器 User-Agent；如需 cookie 从环境变量 `ONTIME_COOKIE` 读取）。
3. 存到 `assets/vendor/ontime/css/<safe_name>.css`；iconfont 相关存 `iconfont/`。
4. 用正则找 `url(...)`，下载相对/绝对字体与小图到 `fonts/` 或 `img/`，并把 CSS 内路径改成相对路径（相对该 CSS 文件）。
5. 追加 `SOURCES.md`。

```python
# 核心改写逻辑示意（写入脚本时保持可运行）
import re, pathlib
URL_RE = re.compile(r"url\(\s*[\"']?([^\"')]+)[\"']?\s*\)")

def rewrite_css(text: str, css_path: pathlib.Path, asset_map: dict[str, str]) -> str:
    def repl(m):
        raw = m.group(1).strip()
        if raw.startswith("data:"):
            return m.group(0)
        key = raw.split("?")[0]
        local = asset_map.get(key) or asset_map.get(raw)
        if not local:
            return m.group(0)
        rel = pathlib.Path(local).relative_to(css_path.parent).as_posix()
        return f"url({rel})"
    return URL_RE.sub(repl, text)
```

- [ ] **Step 3: 跑脚本完成首批 vendor**

Run: `python tools/vendor_ontime_skin.py`

Expected: `assets/vendor/ontime/css/` 至少 1 个主题 CSS；`iconfont/` 有 css+字体；`SOURCES.md` 非空。

- [ ] **Step 4: 提交**

```bash
git add tools/vendor_ontime_skin.py tools/_css_urls.json assets/vendor/ontime
git commit -m "Vendor Ontime theme CSS, fonts, and iconfont locally."
```

---

### Task 2: W0 — 挂载 vendor + 抽出 proto.css

**Files:**
- Create: `assets/proto.css`
- Modify: `index.html`
- Modify: `assets/style.css`（仅移出原型条相关规则到 `proto.css`，本任务不做大瘦身）

**Interfaces:**
- Consumes: Task 1 产出的 vendor 文件路径（以 `SOURCES.md` 与目录实况为准）
- Produces: `index.html` 加载顺序固定为 vendor → proto →（暂留）style.css

- [ ] **Step 1: 写失败门禁片段（皮肤未挂时应 fail）**

创建 `_skin_gate.js` 初版断言（本步先写入，Task 2 结束前应仍可能因 style 冲突部分 fail，但「本地 stylesheet」必须 pass）：

```javascript
async () => {
  const hrefs = [...document.styleSheets]
    .map(s => s.href || "")
    .filter(Boolean);
  const localVendor = hrefs.some(h => h.includes("/assets/vendor/ontime/"));
  const hotlinkIcon = hrefs.some(h => h.includes("order.roomroom.com.cn") && h.includes("iconfont"));
  return {
    pass: localVendor && !hotlinkIcon,
    localVendor,
    hotlinkIcon,
    hrefs
  };
}
```

- [ ] **Step 2: 更新 `index.html`**

替换 head 中样式为（按实际文件名调整，不得再热链 iconfont）：

```html
<link rel="stylesheet" href="assets/vendor/ontime/css/uikit.min.css" />
<link rel="stylesheet" href="assets/vendor/ontime/css/ontime-theme.css" />
<link rel="stylesheet" href="assets/vendor/ontime/iconfont/iconfont.css" />
<link rel="stylesheet" href="assets/proto.css" />
<link rel="stylesheet" href="assets/style.css" />
```

若 Task 1 文件名不同：以目录实文件为准，但顺序必须是 **UIKit → 主题 → iconfont → proto → style**。

- [ ] **Step 3: 创建 `proto.css`**

从 `style.css` 剪出并迁入：`.proto-bar`（或现有端口切换条 class）、覆盖核对入口条、不影响业务区的 z-index。业务区选择器不要放进 `proto.css`。

- [ ] **Step 4: MCP 验证本地挂载**

打开 `http://127.0.0.1:8765/`，跑 Step 1 脚本。

Expected: `pass: true`，`hotlinkIcon: false`。

- [ ] **Step 5: 提交**

```bash
git add index.html assets/proto.css assets/style.css _skin_gate.js
git commit -m "Wire local Ontime vendor styles and proto.css overlay."
```

---

### Task 3: W0 — 爆版急救 + 皮肤壳门禁扩写

**Files:**
- Modify: `assets/style.css`
- Modify: `_skin_gate.js`
- Modify: `assets/proto.css`（若顶栏被顶歪）

**Interfaces:**
- Consumes: vendor 已挂载
- Produces: `_skin_gate.js` 导出完整 `runSkinGate({portal})`；平台商品列表页顶栏/侧栏可测

- [ ] **Step 1: 目视打开平台 `goods-list`，记录爆版点**

常见：双顶栏、宽度 100% 被自研 `*` reset 破坏、紫色按钮被覆盖。在 `style.css` **删除或注释**与现网冲突的全局规则（`body` 字体重置、`.topnav` 自研高度若与 vendor 打架则删自研）。

- [ ] **Step 2: 扩写 `_skin_gate.js` 壳断言**

```javascript
async () => {
  const cs = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, h: el.getBoundingClientRect().height, display: s.display };
  };
  const nav = cs("#ots_order-nav, nav.ots_order-nav, .ots_order-nav");
  const checks = [
    { name: "vendor-css", ok: [...document.styleSheets].some(s => (s.href || "").includes("/assets/vendor/ontime/")) },
    { name: "nav-exists", ok: !!nav },
    { name: "nav-dark", ok: !!nav && /rgb\(0,\s*0,\s*0\)|rgb\(17,\s*17,\s*17\)|rgb\(34,\s*34,\s*34\)/.test(nav.bg) },
    { name: "iconfont-font", ok: getComputedStyle(document.body).getPropertyValue("font-family") !== undefined /* placeholder: probe .iconfont */ }
  ];
  const icon = document.querySelector(".iconfont");
  if (icon) {
    const ff = getComputedStyle(icon).fontFamily;
    checks.push({ name: "iconfont-family", ok: /iconfont|ots|icomoon|FontAwesome/i.test(ff) || ff.length > 0 });
  }
  const miss = checks.filter(c => !c.ok).map(c => c.name);
  return { pass: miss.length === 0, miss, checks, nav };
}
```

按实测收紧颜色阈值（以现网 `getComputedStyle` 采样为准，写入门禁常量）。

- [ ] **Step 3: 跑门禁**

Expected: `pass: true` 于平台 `goods-list`。

- [ ] **Step 4: 提交**

```bash
git add assets/style.css _skin_gate.js assets/proto.css
git commit -m "Fix W0 layout blowups and expand skin shell gate."
```

---

### Task 4: W1 — 管理端壳对齐（顶栏/侧栏/筛选/主按钮）

**Files:**
- Modify: `assets/app.js`（`topnav`, `sidebar`, `filterPanel` 相关 markup，仅当 class 与现网不一致）
- Modify: `assets/style.css`（删除重复壳样式）
- Modify: `_skin_gate.js`（增加 W1 断言）

**Interfaces:**
- Consumes: Task 3 门禁
- Produces: 平台 `goods-list` + `brand-list` 并排截图可接受

- [ ] **Step 1: 现网采样 DOM class**

对现网商品列表记录：`#ots_order-nav`、`.public_left-container`、`.brand_goodsFilter`、`.oto_btn` 的存在性与关键 computed style（高度、背景、主色）。

- [ ] **Step 2: 修原型 markup/CSS 使同样选择器命中**

优先改 class 名对齐；能靠 vendor 的删自研 CSS。主色按钮应来自 vendor（约 `#9A37FE`），用门禁读 `getComputedStyle(.oto_btn).backgroundColor`。

- [ ] **Step 3: 更新门禁 W1**

断言：`#ots_order-nav` 存在；有侧栏页 `.public_left-container` 存在；`brand-list` 无侧栏；`.oto_btn` 或现网等价主按钮背景接近紫色。

- [ ] **Step 4: MCP 并排截图**

保存对照说明到 `BUG-PROGRESS.md`「视觉皮肤」小节（文字记录即可，大图可不入库）。

- [ ] **Step 5: 提交**

```bash
git add assets/app.js assets/style.css _skin_gate.js BUG-PROGRESS.md
git commit -m "Align admin shell with Ontime vendor styles (W1)."
```

---

### Task 5: W2 — 平台高频业务页（Excel 相关）

**Files:**
- Modify: `assets/app.js`（品牌设置/选款/订单/汇总页 markup class）
- Modify: `assets/style.css`
- Test: `_excel_gate.js`（回归，不改断言语义）

**Interfaces:**
- Consumes: W1 壳
- Produces: Excel 相关页皮肤可接受；`_excel_gate.js` 22/22

- [ ] **Step 1: 逐页打开并对照**

页面列表：`brand-list`, `brand-discount`, `brand-size`, `brand-contract`, `brand-edit`, `goods-restock`, `order-selection`→详情, `order-list`, `order-replenish`, `order-style`, `order-realtime`。

每页只修 class/结构缺口，不改 Store API。

- [ ] **Step 2: 跑 Excel 门禁**

Run（本地 8765，Chrome MCP）：

```javascript
async () => {
  const src = await (await fetch('/_excel_gate.js?t=' + Date.now())).text();
  const fn = eval('(' + src.trim().replace(/^\/\/[\s\S]*?\n/, '') + ')');
  return await fn();
}
```

Expected: `pass: true`, `passed: 22`.

- [ ] **Step 3: 提交**

```bash
git add assets/app.js assets/style.css BUG-PROGRESS.md
git commit -m "Skin platform Excel-critical pages with Ontime vendor (W2)."
```

---

### Task 6: W3 — 品牌端 + 其余管理页

**Files:**
- Modify: `assets/app.js`（品牌端侧栏过滤已存在则只调 class）
- Modify: `assets/style.css`
- Modify: `_skin_gate.js`（增加 brand portal 冒烟）

**Interfaces:**
- Consumes: W1 壳
- Produces: 品牌端顶栏/侧栏；发货/意向/买手/角色列表页不裸奔

- [ ] **Step 1: 切换 `data-portal=brand`，修减菜单后的壳**

确认品牌端无平台独占侧栏项；皮肤与平台同壳。

- [ ] **Step 2: 打开 `ship-list`, `intent-list`, `buyer-list`, `role-list`**

修爆版与明显自研卡片样式，让 vendor 表格/筛选生效。

- [ ] **Step 3: 门禁冒烟**

`_skin_gate.js` 增加 `portal=brand` 时 `nav-exists` + 无 `order-recon` 链（或保持现有产品过滤逻辑）。

- [ ] **Step 4: 提交**

```bash
git add assets/app.js assets/style.css _skin_gate.js
git commit -m "Skin brand portal and remaining admin list pages (W3)."
```

---

### Task 7: W4 — 买手 C 端皮肤

**Files:**
- Modify: `assets/app.js`（`topnav("buyer")`, `pageBuyerBrand`, drawer）
- Modify: `assets/style.css`（删除与 vendor 重复的 `.buyer-fe` 大段若冲突）
- Test: 既有买手门禁脚本（若有 `_buyer_full_gate.js` 则跑；否则用 `_skin_gate.js` buyer 段）

**Interfaces:**
- Consumes: vendor 中买手相关 CSS（若 Task 1 未抓到买手页，本任务须补抓买手 CSS 并更新 vendor）
- Produces: 买手首页/商品列表/侧栏选款观感接近现网

- [ ] **Step 1: 补抓买手 CSS（若缺）**

有买手会话：打开现网买手品牌列表，重复 Task 1 下载增量。无会话：用 `%TEMP%\rr_buyer_fe\` 或仓库内已有 scrape HTML 中的 `<link>` 列表补齐。

- [ ] **Step 2: 对齐 `header.oto-nav` / `brand_list-container` / `selection_side-container`**

保证 class 与现网一致；去掉挡住 vendor 的自研背景/圆角卡片。

- [ ] **Step 3: 皮肤门禁 buyer 段**

断言：`header.oto-nav` 存在；`.filter_type` 或分类侧栏存在；`[data-view=code]` 存在于商品列表；iconfont 心形/搜索非 tofu。

- [ ] **Step 4: 回归买手业务门禁（若文件存在）**

Run `_buyer_full_gate.js` 或等价；Expected pass。

- [ ] **Step 5: 提交**

```bash
git add assets/vendor/ontime assets/app.js assets/style.css _skin_gate.js
git commit -m "Skin buyer C-end with Ontime vendor styles (W4)."
```

---

### Task 8: W5 — 预约小程序页

**Files:**
- Modify: `assets/app.js`（`mp-home` 等小程序路由页）
- Create or Modify: `assets/vendor/ontime/css/mp-shell.css`（仅当现网无同构时的窄屏补丁；须在 SOURCES 标明「自研补丁」）
- Modify: `assets/proto.css` 或 `style.css`

**Interfaces:**
- Consumes: 现网小程序 H5 若可访问则对照；否则 Ontime 移动端风格自洽
- Produces: 窄屏（375）下可演示的预约表单页

- [ ] **Step 1: 定位小程序相关 page 函数**

在 `app.js` 中找到 `mp-` 路由，列出需皮肤的页面 id。

- [ ] **Step 2: 套窄屏壳**

容器最大宽度 ~375px 居中；顶栏/主色与 Ontime 一致；表单控件用 vendor 输入样式。

- [ ] **Step 3: MCP `resize_page` 到 375×812 截图验收**

Expected: 无横向滚动条（或仅内容区可接受的小幅）；主色按钮可见。

- [ ] **Step 4: 提交**

```bash
git add assets/app.js assets/vendor/ontime assets/style.css assets/proto.css
git commit -m "Skin mini-program appointment pages (W5)."
```

---

### Task 9: 文档收尾与全量回归

**Files:**
- Modify: `COVERAGE.md`
- Modify: `BUG-PROGRESS.md`
- Modify: `docs/superpowers/specs/2026-08-01-ontime-skin-parity-design.md`（状态改为「实现中/已完成」）

**Interfaces:**
- Consumes: W0–W5 完成态
- Produces: 进度表 + 门禁绿

- [ ] **Step 1: 跑全量门禁**

1. `_skin_gate.js`（platform + buyer）  
2. `_excel_gate.js` → 22/22  
3. 买手全量门禁（若有）

Expected: 全部 pass。

- [ ] **Step 2: 更新文档**

在 `COVERAGE.md` 将「像素级视觉 / 未做」改为「现网皮肤本地化 W0–W5：已做壳层对齐；商品图仍占位」。`BUG-PROGRESS.md` 增加视觉皮肤表与日期。

- [ ] **Step 3: 提交并推送（仅当用户要求 push）**

```bash
git add COVERAGE.md BUG-PROGRESS.md docs/superpowers/specs/2026-08-01-ontime-skin-parity-design.md
git commit -m "Document Ontime skin parity completion and gate results."
```

未明确要求时不要 `git push`。

---

## Spec coverage check

| Spec 项 | Task |
|---------|------|
| 本地 vendor CSS/字体/icon | Task 1–2 |
| 混合资源（大图不进库） | Task 1 规则 + 全程约束 |
| 加载顺序 | Task 2 |
| proto 条保留 | Task 2 |
| W0 爆版 | Task 3 |
| W1 管理壳 | Task 4 |
| W2 Excel 高频 | Task 5 |
| W3 品牌+其余管理 | Task 6 |
| W4 买手 | Task 7 |
| W5 小程序 | Task 8 |
| 门禁+文档 | Task 3/9 + 各波回归 |
| 业务不回退 | Task 5/7/9 跑 Excel/买手门禁 |

## Placeholder scan

无 TBD/TODO；文件名若与现网实际 CSS 不一致，Task 1/2 明确「以目录实文件为准」。
