# ROOMROOM 原型 · 修改意见 / Bug 处理进度

> 来源：《Ontimeshowroom原型修改意见.xlsx》（序号 1–14，含买手端拆条）  
> 对照现网：`https://order.roomroom.com.cn/`  
> 原型发布：`https://cryangle0.github.io/Room/`  
> Store：`rr_biz_v5`  
> 更新：2026-08-01（买手 C 端 HTML 严格对齐现网 DOM）

## 总览（相对 Excel）

| 结论 | 说明 |
|------|------|
| **Excel 条目均已改** | #1–#14 均有对应实现 |
| **MCP 门禁** | 本地全量 **19/19 pass**（2026-07-31 清缓存复测） |
| **控件对齐（本轮）** | 原站枚举项改 `<select>`，日期改 `type=date` / `datetime-local`；不再用 YYYY-MM-DD 文本框 |
| **非 Excel 范围** | 像素级现网对照、金蝶、LOOK/添加品牌待定项 —— 不在本表 |

---

## Excel 逐条状态

| 序号 | 端 | 要求摘要 | 状态 | MCP |
|------|----|----------|------|-----|
| #1 | 平台 | 品牌管理首页无左侧导航 | 已改 | pass |
| #2 | 平台 | 折扣按季度单独配置；去掉订货会单独规则 | 已改 | pass |
| #3 | 平台 | 尺码别名：下拉标准尺码→命名→可删列表 | 已改 | pass |
| #4 | 平台 | 合同签订/授权日期日历选择 | 已改 | pass |
| #5 | 平台 | 品类/风格/人群多选勾选 | 已改 | pass |
| #6 | 平台 | 风格/人群/标准尺码主数据增删改 | 已改（补「修改」） | pass |
| #7 | 平台 | 补货/隐藏一行一品牌；按季批量；隐藏全不可见 | 已改 | pass |
| #8 | 平台 | 选款详情工作台（图/色/尺码/编号/加减/折扣条/增删款） | 已改 | pass |
| #9 | 平台 | 订单/补货独立卡片；无订单类型字段 | 已改 | pass |
| #10 | 平台 | 款式汇总 SKU/买手双维 + SKU 展开 | 已改 | pass |
| #11 | 平台 | 实时汇总：时间/季节/类型/状态筛选 | 已改 | pass |
| #12 | 买手 | 左分类、品牌卡、顶栏介绍、季度、编码视图、搜索 | 已改 | pass |
| #13 | 买手 | 快捷选款单对齐现网 | 已改 | pass |
| #14 | 买手 | 选款详情与平台 #8 一致 | 已改 | pass |

---

## HTML 布局对齐（相对现网 DOM，2026-07-31 · 全量子页 + 表单字段）

对照已登录现网 HTML（非截图），覆盖平台全部子页与关键表单：

| 结构 | 现网 class / 规则 |
|------|-------------------|
| 壳 | `ots_order-nav` / `oto-main_container` / `public_left>ul.mine_side` / `public_right` |
| 标题 | `sub_title>h4`；优惠/尺码/买手列表为 `h1.title_underline` |
| 筛选 | `brand_goodsFilter>item_inner`；查询按钮 `oto_btn` |
| 品牌列表 | `edit_boduan-list`，**无侧栏** |
| 品牌设置 | discount/alias/contract/pay/edit：**无侧栏**；季节页侧栏仅「季节控制」 |
| 尺码别名 | `title_underline` + 尺寸 select + 别名 text + `sale_info` 列表 |
| 合同 | `contact_edit` · 类型链接（经销商/三方代收代付/返佣）· 周期 tel · date×3 |
| 收款 | `bank_payment` · 公司/账户/行/账号/支行/地址 + 双公章 |
| 季节 | `season_crtl` · 首单/补货 **checkbox**（非 select） |
| 商品添加 | `ots_order-form-column`；波段 text；色/尺码/季节 select；Carry checkbox |
| 批量商品 | `ots_order-addlist` · 商家/分类 select · 三模板下载 |
| 补货隐藏 | `edit_boduan` 品牌行 |
| 发货入口 | 先品牌列表再进发货单 |
| 买手列表 | `title_underline` + 级别/手机/店/省/市/品牌筛 + `ots_order-invite-detail` |
| 买手品牌介绍 | `brand_detail-container` · 品牌介绍/LOOKBOOK |
| **买手 C 端壳** | `header.oto-nav` + `nav_menu`(品牌/补货/选款单/订单) + `login_area` |
| **买手首页/补货** | `brand_list-container` + `filter_type` 分类筛选 + `item_inner` 品牌格 |
| **买手商品列表** | `brand_info` + `sku_box` + `season_filter` + `searchCarry` + `goods_list`/`brand_like` |
| **买手选款单** | `selection-container` / `selection_list` / `selection_info`（修改\|下载\|确认订单） |
| **买手订单** | `order-container` 左「全部/已完成/未完成」+ `order_list`/`order_info` |
| **买手个人中心** | `mine-container` + `mine_side`（个人信息/地址/发票） |
| **快捷选款侧栏** | `side_action` + `selection_side-container` / `balck_bg` |
| 实时汇总 | 标题「汇总」；状态枚举对齐现网 |
| 预约列表 | 品牌 select + 店铺 text；日期/时间/人数/签到列 |

## 控件对齐（相对现网交互习惯，2026-07-31）

原站部分页曾拒绝访问；已用 chrome-mcp 已登录页 HTML 复核：

| 页面/字段 | 原（错误） | 现 |
|-----------|------------|----|
| 添加商品 · 预计发货 | 文本 YYYY-MM-DD | `date` |
| 添加商品 · 波段/颜色 | 文本 | 下拉 |
| 添加商品 · 尺寸列表 | 逗号文本 | 标准尺码多选勾选 |
| 合同 · 发货周期 | 文本 / 曾改下拉 | **text(tel)**（对齐现网 HTML） |
| 合同 · 签订/授权 | 已是 date，统一 helper | `date` |
| 品牌 · 成立年份 | 文本 | 年份下拉 |
| 选款筛选 · 国家/省 | 文本 | 下拉 |
| 总订单 · 时间区间 | 文本「起/止」 | 开始/结束 `date` |
| 定金比例 / 关联 SKU | 文本 | 下拉 |
| 付款时间 | 文本 | `date` |
| 抽佣比例 / 阶梯 | 文本 | 下拉 |
| 添加买手 · 城市 | 文本 | 下拉 |
| 预约时间 | 文本 | `datetime-local` |

仍保留文本：店名/SKU/手机/金额/备注等自由输入。

## 本轮复测揪出并已修的缺口

| 问题 | 处理 |
|------|------|
| #6 只有增删、缺「改」 | 增加 `edit-master` / `renameMasterItem` |
| #8 添加款式无候选（IAN HYLTON 仅 5 款且已全在单里） | 数据补 `IH27PS056/062` |
| #7 详情页再点侧栏不能回列表 | `go('goods-restock')` 时清空钻取状态 |
| #9 订单管理仍显示订单类型（早前） | `order-list` 强制首单视图 |

---

## MCP 实测日志

| 时间 | 环境 | 结果 | 说明 |
|------|------|------|------|
| 2026-07-31 | 本地 `127.0.0.1:8765` | **19/19 pass** | Chrome DevTools MCP；覆盖 #1–#14 关键断言（含 #7 回列表、#8 加款、#9 双入口、#14 买手详情） |
| 2026-07-31 | 本地表单对齐抽查 | **15/15 pass** | brand 6 表单 + goods 3 + realtime/appoint/ship/buyer-list + buyer brand_detail |
| 2026-07-31 | Pages | 需硬刷新 | CDN/浏览器缓存可能导致短暂旧包；以本地门禁为准，推送后请 `Ctrl+F5` |

### 未纳入「通过」的项（诚实边界）

- 与现网截图像素级一致：未做  
- 金蝶对接 / LOOK 业务待定 / 「添加品牌」需求不清：未做  
- 买手 C 端已按现网 HTML（买手登录后抓取）对齐 DOM class/结构；像素级未做  

- #10 买手维列名「补货/下单」语义：待客户确认（功能双维+展开已通）

---

## 自测提醒

1. 清 localStorage（或隐私窗口）后打开，确认 `rr_biz_v5`  
2. 平台：品牌管理无侧栏 → 折扣有季度 tab → 尺码别名增删 → 主数据可修改 → 补货隐藏品牌列表  
3. 选款详情：改数量、添加款式、折扣条变  
4. 订单管理 / 补货单管理：均无「订单类型」筛选  
5. 买手：左分类 → 品牌介绍/编码视图 → 快捷选款单 → 我的选款单详情同平台  

---

## 提交轨迹

| Commit | 内容 |
|--------|------|
| `69ea124` | P0 |
| `a4bb7cf` / `3ea4dfb` | P1 + #9 修复 |
| `e29cd7a` | #6 修改、#7 回列表、选款可加款数据；Excel 全量 MCP 19/19 |
| `8c32e23` / `c393160` | 管理端壳/筛选/侧栏 HTML 对齐 |
| （本轮） | 表单字段级 HTML：商品/品牌设置/合同收款/季节/买手列表/发货入口/买手品牌介绍 |
| （本轮） | 买手 C 端严格对齐：oto-nav / brand_list / goods_list / selection / order / mine / side_action |
