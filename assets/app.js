(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $("#app");
  const state = {
    portal: localStorage.getItem("rr_portal") || "platform", // platform | brand | buyer | mp
    page: "login",
    roleLogin: "platform",
    selectedBrand: "HAIZHEN WANG",
    selectedGoods: null,
    selectedSel: RR.selections[0],
    selectedOrder: RR.orders[0],
    cart: (window.Store && Store.db.buyerSession.selections.map(x => x.sku)) || JSON.parse(localStorage.getItem("rr_cart") || "[]"),
    hearts: (window.Store && Store.db.buyerSession.selections.map(x => x.sku)) || JSON.parse(localStorage.getItem("rr_hearts") || "[]"),
    qty: { XS: 0, S: 2, M: 1, L: 0 },
    viewMode: "image", // image | code
    cartOpen: false,
    orderAction: "", // modify | invoice | voucher | whitelist | substore | return | deposit
    reconTab: "rate",
    toast: "",
    hasFirstOrder: true,
    replenishBlocked: false,
    selectedShip: null,
    selectedBuyer: null,
    selectedRole: null,
    listPage: 1,
    selAddOpen: false,
    cartBrandFilter: ""
  };

  function syncBuyerCart() {
    state.cart = Store.db.buyerSession.selections.map(x => x.sku);
    state.hearts = [...state.cart];
    saveCart();
  }

  function toast(msg) {
    state.toast = msg;
    let el = document.querySelector(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      (document.getElementById("app") || document.body).prepend(el);
    }
    el.textContent = msg;
    clearTimeout(state._toastTimer);
    state._toastTimer = setTimeout(() => {
      state.toast = "";
      if (el && el.parentNode) el.remove();
    }, 2200);
  }

  function saveCart() {
    localStorage.setItem("rr_cart", JSON.stringify(state.cart));
    localStorage.setItem("rr_hearts", JSON.stringify(state.hearts));
  }

  const routes = {
    platform: {
      top: [
        { id: "brand", label: "我的店铺" },
        { id: "goods", label: "商品管理" },
        { id: "order", label: "订单管理" },
        { id: "ship", label: "发货管理" },
        { id: "intent", label: "意向审核" },
        { id: "buyer", label: "买手管理" },
        { id: "role", label: "角色权限" }
      ],
      side: {
        brand: [
          { id: "brand-list", label: "品牌管理" },
          { id: "brand-discount", label: "设置优惠规则" },
          { id: "brand-size", label: "设置尺寸别名" },
          { id: "brand-fair", label: "订货会设置" },
          { id: "brand-pay", label: "收款设置" },
          { id: "brand-contract", label: "合同设置" },
          { id: "brand-edit", label: "品牌信息编辑" },
          { id: "brand-master-style", label: "风格资料维护" },
          { id: "brand-master-crowd", label: "适用人群维护" },
          { id: "brand-master-size", label: "平台标准尺码" }
        ],
        goods: [
          { id: "goods-restock", label: "补货/隐藏商品" },
          { id: "goods-look", label: "LOOK列表" },
          { id: "goods-add", label: "添加新商品" },
          { id: "goods-batch", label: "批量添加新商品" },
          { id: "goods-list", label: "商品信息管理" }
        ],
        order: [
          { id: "order-selection", label: "选款单管理" },
          { id: "order-list", label: "订单管理" },
          { id: "order-replenish", label: "补货单管理" },
          { id: "order-style", label: "款式汇总" },
          { id: "order-realtime", label: "实时订单汇总" },
          { id: "order-all-sel", label: "总选款单管理" },
          { id: "order-all", label: "总订单管理" },
          { id: "order-analysis", label: "订单分析" },
          { id: "order-appoint", label: "预约列表" },
          { id: "order-recon", label: "对账管理" }
        ],
        ship: [{ id: "ship-list", label: "发货管理" }],
        intent: [{ id: "intent-list", label: "意向管理" }],
        buyer: [
          { id: "buyer-list", label: "买手审核" },
          { id: "buyer-balance", label: "余额管理" },
          { id: "buyer-store", label: "查看店铺资料" },
          { id: "buyer-invoice", label: "修改发票信息" },
          { id: "buyer-address", label: "修改地址" },
          { id: "buyer-edit", label: "编辑资料" },
          { id: "buyer-sub", label: "查看子店铺信息" },
          { id: "buyer-add-brand", label: "添加品牌" },
          { id: "buyer-appoint", label: "添加预约" }
        ],
        role: [
          { id: "role-list", label: "角色管理" },
          { id: "role-perm", label: "权限管理" }
        ],
        account: [
          { id: "account-center", label: "账号管理" }
        ]
      },
      defaultPage: "goods-list"
    },
    brand: {
      top: [
        { id: "brand", label: "我的店铺" },
        { id: "goods", label: "商品管理" },
        { id: "order", label: "订单管理" },
        { id: "ship", label: "发货管理" },
        { id: "intent", label: "意向审核" }
      ],
      defaultPage: "brand-discount"
    },
    buyer: {
      top: [
        { id: "home", label: "品牌" },
        { id: "replenish", label: "补货" },
        { id: "selection", label: "我的选款单" },
        { id: "orders", label: "我的订单" },
        { id: "profile", label: "个人中心" }
      ],
      defaultPage: "buyer-home"
    }
  };

  function setPortal(p) {
    state.portal = p;
    localStorage.setItem("rr_portal", p);
    if (p === "mp") state.page = "mp-home";
    else if (p === "buyer") state.page = "buyer-home";
    else if (p === "brand") state.page = "brand-discount";
    else if (p === "audit") state.page = "coverage";
    else state.page = "goods-list";
    state.cartOpen = false;
    state.orderAction = "";
    render();
  }

  function go(page) {
    // 补货/隐藏：侧栏再次进入时回到品牌列表（非详情钻取）
    if (page === "goods-restock") {
      Store.db.ui.restockBrand = "";
      Store.db.ui.restockKind = "";
      Store.persist();
    }
    state.page = page;
    state.cartOpen = false;
    state.listPage = 1;
    state.selAddOpen = false;
    if (!page.startsWith("order-detail") && page !== "order-detail") state.orderAction = "";
    window.scrollTo(0, 0);
    render();
  }

  function topGroup(page) {
    if (page === "coverage" || page === "account-center") return "account";
    if (page.startsWith("brand")) return "brand";
    if (page.startsWith("goods")) return "goods";
    if (page.startsWith("order") || page.startsWith("selection") || page.startsWith("contract") || page.startsWith("oc-")) return "order";
    if (page.startsWith("ship")) return "ship";
    if (page.startsWith("intent")) return "intent";
    if (page.startsWith("buyer-") && state.portal !== "buyer") return "buyer";
    if (page.startsWith("role")) return "role";
    return "goods";
  }

  function btn(label, cls = "btn-primary", act = "") {
    const action = act || inferAct(label);
    return `<button type="button" class="btn ${cls}" data-act="${esc(action)}">${label}</button>`;
  }

  function link(label, act = "", cls = "") {
    const action = act || inferAct(label);
    return `<a href="javascript:;" class="${cls}" data-act="${esc(action)}">${label}</a>`;
  }

  function esc(s) {
    return String(s).replace(/"/g, "&quot;");
  }

  function inferAct(label) {
    const t = String(label || "").trim();
    const rules = [
      [/^筛选$/, "filter"],
      [/^清空条件$/, "clear-filter"],
      [/^返回列表$/, "go:goods-list"],
      [/^返回商品列表$/, "go:buyer-brand"],
      [/^返回订单$/, "go:order-detail"],
      [/^返回$/, "back"],
      [/^去选款单$/, "go:buyer-selection"],
      [/^加入订单$/, "add-to-order"],
      [/^获取验证码$/, "send-code"],
      [/^设置Carry Over$/, "go:goods-carry"],
      [/^保存商品$/, "save-goods"],
      [/^保存规则$/, "save-discount"],
      [/^保存品牌资料$/, "save-brand-profile"],
      [/^保存抽佣设置$/, "save-recon-rate"],
      [/^保存付款信息$/, "save-recon-pay"],
      [/^保存发货明细$/, "save-ship"],
      [/^保存权限$/, "save-role-perm"],
      [/^保存发票信息$/, "save-buyer-invoice"],
      [/^保存修改$/, "save-context"],
      [/^保存$/, "save-context"],
      [/^确认生成$/, "create-contract"],
      [/^确认发货并回写余额$/, "ship-confirm"],
      [/^确认发货$/, "ship-confirm"],
      [/^快速生成并下载$/, "create-oc"],
      [/^仅预览$/, "go:oc-preview"],
      [/^下载 PDF$/, "download:合同PDF"],
      [/^下载模板$/, "download:商品上传模板"],
      [/^上传 Excel$/, "upload:批量商品"],
      [/^下载总选款单$/, "download:总选款单"],
      [/^下载订单汇总$/, "download:订单汇总"],
      [/^下载预约记录$/, "download:预约记录"],
      [/^下载选款单$/, "download:选款单"],
      [/^下载 Excel$/, "download:订单Excel"],
      [/^下载订单$/, "download:订单"],
      [/^生成订单$/, "gen-order"],
      [/^取消选款单$/, "cancel-selection"],
      [/^取消订单$/, "cancel-selection"],
      [/^确认定金并确认订单$/, "confirm-deposit"],
      [/^确认尾款$/, "confirm-final"],
      [/^提交发票申请$/, "submit-invoice"],
      [/^提交凭证$/, "submit-voucher"],
      [/^设为白名单$/, "set-whitelist"],
      [/^确认分配$/, "submit-substore"],
      [/^提交退换货$/, "submit-return"],
      [/^添加阶梯$/, "add-stair"],
      [/^添加款式$/, "toast:请从商品库选择款式加入订单"],
      [/^新增分类$/, "add-category"],
      [/^创建角色$/, "create-role"],
      [/^添加买手$/, "go:buyer-add"],
      [/^新增地址$/, "add-address"],
      [/^新建子店铺$/, "add-substore"],
      [/^提交（示意）$/, "grant-brand"],
      [/^提交预约$/, "submit-appoint"],
      [/^确认提交$/, "buyer-confirm-order"],
      [/^确认订单$/, "buyer-confirm-sel"],
      [/^修改订单$/, "go:buyer-selection-edit"],
      [/^通过$/, "approve"],
      [/^拒绝$/, "reject"],
      [/^关闭权限$/, "reject"],
      [/^删款$/, "delete-style"],
      [/^取消删款$/, "restore-style"],
      [/^删除$/, "delete-stair"],
      [/^删除款式$/, "delete-sel-line"],
      [/^编辑$/, "edit-context"],
      [/^处理$/, "process-invoice"],
      [/^冲销$/, "clear-balance"],
      [/^一键生成$/, "create-contract"],
      [/^快速生成$/, "create-oc"],
      [/^预览$/, "go:contract-preview"],
      [/^下载$/, "download:文件"],
      [/^查看已上传合同$/, "go:order-contract"],
      [/^查看已上传凭证$/, "toast:已打开付款凭证列表（订单详情内可上传）"],
      [/^资料私隐及保安政策$/, "toast:打开《资料私隐及保安政策》"],
      [/^版权声明$/, "toast:打开《版权声明》"]
    ];
    for (const [re, act] of rules) {
      if (re.test(t)) return act;
    }
    if (/下载/.test(t)) return `download:${t}`;
    if (/上传/.test(t)) return `upload:${t}`;
    if (/保存|提交|确认|生成/.test(t)) return "save-context";
    return `toast:已执行「${t}」`;
  }

  function field(name, html) {
    return String(html).replace(/<(input|select|textarea)\b/i, `<$1 data-field="${name}"`);
  }

  function readFields(root = app) {
    const out = {};
    (root || app).querySelectorAll("[data-field]").forEach(el => {
      const k = el.getAttribute("data-field");
      if (el.type === "checkbox") out[k] = el.checked;
      else out[k] = el.value;
    });
    return out;
  }

  function vals(root = app) {
    return [...(root || app).querySelectorAll("input:not([type=checkbox]),select,textarea")].map(el => el.value);
  }

  /** 原站：brand_goodsFilter > goods_filter > item_inner(label+控件) + oto_btn */
  function filterPanel(fields, extras = "", submitLabel = "筛选", submitAct = "filter") {
    const cols = fields.length >= 6 ? "cols-4" : (fields.length <= 2 ? "cols-2" : "cols-3");
    const rows = fields.map(([lab, ctrl]) =>
      `<div class="item_inner"><label>${lab}</label>${ctrl}</div>`
    ).join("");
    const showClear = submitAct === "filter";
    return `<div class="brand_goodsFilter">
      <div class="goods_filter ${cols}">
        <div class="filter-items">${rows}</div>
        <div class="item item_submit">
          <button type="button" class="oto_btn" data-act="${submitAct}">${submitLabel}</button>
          ${showClear ? link("清空条件", "clear-filter", "btn-ghost") : ""}
          ${extras}
        </div>
      </div>
    </div>`;
  }

  function subTitle(text) {
    return `<div class="sub_title"><h4>${text}</h4></div>`;
  }

  function pageWrap(title, body) {
    return `<div class="brand_goodsList-container">${subTitle(title)}${body}</div>`;
  }

  function select(opts, ph = "全部", selected) {
    const cur = selected == null ? ph : selected;
    const all = ph ? [ph, ...opts.filter(o => o !== ph)] : opts;
    return `<select>${all.map(o => `<option${o === cur ? " selected" : ""}>${o}</option>`).join("")}</select>`;
  }

  function input(ph = "", val = "") {
    return `<input placeholder="${ph}" value="${val || ""}" />`;
  }

  /** 原站日期控件：日历选择，不用 YYYY-MM-DD 文本框 */
  function dateInput(val = "") {
    return `<input type="date" value="${val || ""}" />`;
  }

  /** 原站日期+时间：datetime-local */
  function datetimeInput(val = "") {
    const v = String(val || "").trim().replace(" ", "T").slice(0, 16);
    return `<input type="datetime-local" value="${v}" />`;
  }

  function footer() {
    return `<footer class="oto-foot site-footer">
      <div class="oto_container foot-container">
        <div class="foot_logo">
          <div class="flogo">ROOMROOM</div>
          <div class="foot_link">
            <a href="javascript:;" data-act="toast:打开《资料私隐及保安政策》">资料私隐及保安政策</a>
            <a href="javascript:;" data-act="toast:打开《版权声明》">版权声明</a>
          </div>
        </div>
        <div class="foot_info"><p>沪ICP备17050349号-2</p><p>© Ontimeshow. All Rights Reserved</p></div>
      </div>
    </footer>`;
  }

  function protoBar() {
    const items = [
      ["platform", "平台端"],
      ["brand", "品牌端"],
      ["buyer", "买手端"],
      ["mp", "预约小程序"]
    ];
    return `<div class="proto-bar">
      <strong>ROOMROOM 原型确认</strong>
      <span>|</span>
      ${items.map(([id, lab]) =>
        `<a href="javascript:;" class="${state.portal === id ? "on" : ""}" data-portal="${id}">${lab}</a>`
      ).join("")}
      <span>|</span>
      <a href="javascript:;" class="${state.page === "coverage" ? "on" : ""}" data-go="coverage">覆盖核对</a>
      <span style="margin-left:12px;opacity:.6">菜单≈90% · 业务闭环见核对页</span>
    </div>`;
  }

  function topnav(portal) {
    if (portal === "buyer") {
      /* 原站：header.oto-nav > nav-container > logo_area + ul.nav_menu + login_area(铃铛/人) */
      const items = [
        ["buyer-home", "品牌", state.page === "buyer-home" || state.page.startsWith("buyer-brand") || state.page === "buyer-detail"],
        ["buyer-replenish", "补货", state.page === "buyer-replenish"],
        ["buyer-selection", "我的选款单", state.page.startsWith("buyer-selection")],
        ["buyer-orders", "我的订单", state.page.startsWith("buyer-order")]
      ];
      return `<header class="oto-nav buyer-oto-nav" id="navTop">
        <div class="oto_container nav-container">
          <div class="logo_area"><a href="javascript:;" data-go="buyer-home">ROOMROOM</a></div>
          <ul class="nav_menu">
            ${items.map(([id, lab, on]) => `<li class="${on ? "active" : ""}"><a href="javascript:;" data-go="${id}">${lab}</a></li>`).join("")}
          </ul>
          <div class="login_area">
            <a class="bell_tip" href="javascript:;" data-go="buyer-message" title="消息"><span class="iconfont ots_icon-tongzhi"></span></a>
            <a class="nav_person" href="javascript:;" data-go="buyer-profile" title="个人中心"><span class="iconfont ots_icon-person"></span></a>
          </div>
        </div>
      </header>`;
    }

    const cfg = portal === "brand" ? routes.brand : routes.platform;
    const group = topGroup(state.page);
    const firstPage = {
      brand: state.portal === "brand" ? "brand-discount" : "brand-list",
      goods: "goods-list",
      order: "order-selection",
      ship: "ship-list",
      intent: "intent-list",
      buyer: "buyer-list",
      role: "role-list"
    };
    /* 原站：nav#ots_order-nav.ots_order-nav > .ots_order-width.nav-bar > logo + ul.uk-navbar-nav + 账户中心 */
    return `<nav class="topnav ots_order-nav" id="ots_order-nav"><div class="topnav-inner ots_order-width nav-bar">
      <a class="logo" href="javascript:;" data-go="${cfg.defaultPage}">ROOMROOM</a>
      <ul class="nav-links uk-navbar-nav">${cfg.top.map(t =>
        `<li><a href="javascript:;" class="${group === t.id ? "active" : ""}" data-go="${firstPage[t.id]}">${t.label}</a></li>`
      ).join("")}</ul>
      <div class="nav-right ots_order-nav_person">
        <span class="role-chip">${portal === "brand" ? "品牌端 · HAIZHEN WANG" : "平台端 · 高级管理员"}</span>
        <span class="avatar">管</span>
        <a class="uk-button" href="javascript:;" data-go="account-center">账户中心</a>
      </div>
    </div></nav>`;
  }

  function sidebar() {
    // 原站：品牌列表 + 品牌设置子页均为 no-sidebars（从品牌行链接进入）
    const brandNoSide = [
      "brand-list", "brand-discount", "brand-size",
      "brand-pay", "brand-contract", "brand-edit",
      "buyer-list", "ship-list"
    ];
    if (brandNoSide.includes(state.page)) return "";
    // 原站季节页：左侧仅「季节控制」
    if (state.page === "brand-fair") {
      return `<div class="public_left-container sidebar">
        <ul class="mine_side"><li class="active"><a href="javascript:;" data-go="brand-fair">季节控制</a></li></ul>
      </div>`;
    }
    const group = topGroup(state.page);
    let items = (routes.platform.side[group] || []);
    // 主数据页：侧栏仅保留品牌列表 + 三项主数据
    if (/^brand-master-/.test(state.page)) {
      items = [
        { id: "brand-list", label: "品牌管理" },
        { id: "brand-master-style", label: "风格资料维护" },
        { id: "brand-master-crowd", label: "适用人群维护" },
        { id: "brand-master-size", label: "平台标准尺码" }
      ];
    }
    if (state.portal === "brand") {
      if (group === "buyer" || group === "role" || group === "account") items = [];
      if (group === "brand") {
        // 品牌端无「全品牌列表」，直接进本品牌配置
        items = items.filter(i => i.id !== "brand-list" && !/^brand-master-/.test(i.id));
      }
      if (group === "order") {
        items = items.filter(i => !["order-recon", "order-appoint"].includes(i.id));
      }
      if (group === "goods") {
        items = items.filter(i => !["goods-cat", "goods-look"].includes(i.id));
      }
    }
    if (!items.length) return "";
    /* 原站：public_left-container > ul.mine_side > li.active > a */
    return `<div class="public_left-container sidebar">
      <ul class="mine_side">
        ${items.map(i => `<li class="${state.page === i.id ? "active" : ""}"><a href="javascript:;" data-go="${i.id}">${i.label}</a></li>`).join("")}
      </ul>
    </div>`;
  }

  function toastHtml() {
    return state.toast ? `<div class="toast">${state.toast}</div>` : "";
  }

  /* ---------- Pages ---------- */

  function pageLogin() {
    return `${protoBar()}
    <div class="login-page">
      <div class="login-card">
        <h1>ROOMROOM</h1>
        <div class="sub">订货管理系统 · 手机验证码登录</div>
        <div class="role-pick">
          <button class="${state.roleLogin === "platform" ? "on" : ""}" data-role="platform">平台端</button>
          <button class="${state.roleLogin === "brand" ? "on" : ""}" data-role="brand">品牌端</button>
          <button class="${state.roleLogin === "buyer" ? "on" : ""}" data-role="buyer">买手端</button>
        </div>
        <div class="login-field"><label>手机号</label><input placeholder="请输入手机号" value="13800000000" /></div>
        <div class="login-field"><label>验证码</label>
          <div class="row"><input placeholder="6位验证码" value="888888" /><button type="button" class="code-btn" data-act="send-code">获取验证码</button></div>
        </div>
        <button class="btn btn-primary btn-block" id="do-login">登录</button>
        <p style="margin-top:16px;font-size:12px;color:#999;text-align:center">根据账号身份权限自动进入对应端口（需求：统一登录页）</p>
      </div>
    </div>`;
  }

  function pagination(total, pageSize = 10) {
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const cur = Math.min(state.listPage || 1, pages);
    state.listPage = cur;
    const nums = [];
    for (let i = 1; i <= Math.min(pages, 12); i++) nums.push(i);
    return `<div class="pagination"><ul>
      ${nums.map(n => `<li class="${n === cur ? "uk-active" : ""}"><a href="javascript:;" data-page="${n}">${n}</a></li>`).join("")}
      ${pages > 12 ? `<li><a href="javascript:;" data-page="${Math.min(pages, cur + 1)}">下一页 ›</a></li>` : ""}
    </ul><span style="color:#999;font-size:12px;margin-left:12px">共 ${total} 条</span></div>`;
  }

  function pageSlice(list, pageSize = 10) {
    const cur = state.listPage || 1;
    const start = (cur - 1) * pageSize;
    return list.slice(start, start + pageSize);
  }

  function pageGoodsList() {
    const all = Store.filteredGoods();
    const list = pageSlice(all, 10);
    const f = Store.db.ui.goodsFilter;
    /* 原站：brand_goodsList > items > item_goods-row（SKU 行 + goods_name/img + sizes + oto_btn） */
    const rows = list.map(g => `
      <div class="item_goods-row goods-card">
        <div class="goods_sku goods-meta">SKU:<span>${g.sku}</span>　品牌<span>${g.brand}</span>　季节<span>${g.season}</span>${g.carry ? '　<span class="badge">Carry Over</span>' : ""}</div>
        <div class="goods-row">
          <div class="goods_name goods-info">
            <div class="thumb ph">IMG</div>
            <p>${g.title}</p>
          </div>
          <div class="goods_small sizes">${(g.sizes || []).map(s => `<p>${s}</p>`).join("")}</div>
          <div class="goods_small"><p>${g.retail}</p></div>
          <div class="goods_small"><p>${g.wholesale}</p></div>
          <div class="goods_small ${g.status === "已删款" ? "status-del" : "status-ok"}"><p>${g.status}</p></div>
          <div class="goods_small ops uk-flex-column">
            <a href="javascript:;" class="oto_btn" data-go="goods-add">编辑</a>
            <a href="javascript:;" class="oto_btn" data-go="goods-view">查看</a>
            <a href="javascript:;" class="oto_btn" data-act="${g.status === "已删款" ? "toast:已取消删款" : "toast:已删款"}">${g.status === "已删款" ? "取消删款" : "删款"}</a>
          </div>
        </div>
      </div>`).join("") || '<div class="note">无匹配商品，请调整筛选条件</div>';

    return `<div class="brand_goodsList-container">
      ${subTitle("商品信息管理")}
      ${filterPanel([
        ["Carry Over", select(["是", "否"], "全部", f.carry)],
        ["LineSheet", input("", f.linesheet)],
        ["SKU", input("", f.sku)],
        ["品类", select(["女装", "男装", "男女装", "配饰", "生活方式"], "全部", f.cat)],
        ["二级品类", select(["外套", "连衣裙", "裤装", "裙装", "上衣", "包袋"], "全部", f.subcat)],
        ["选择品牌", select(RR.brands.map(b => b.name), "全部", f.brand === "全部" ? "全部" : f.brand)],
        ["款式名称", input("", f.title)],
        ["选择季节", select(RR.seasons, "全部", f.season)]
      ], `<a href="javascript:;" class="oto_btn" data-act="go:goods-carry">设置Carry Over</a>`)}
      <div class="brand_goodsList">
        <div class="items head_items"><div class="item_goods-row table-head">
          <h4>商品信息</h4><h4>可选尺寸</h4><h4>零售价(RMB)</h4><h4>买手价(RMB)</h4><h4>状态</h4><h4>操作</h4>
        </div></div>
        <div class="items">${rows}</div>
      </div>
      ${pagination(all.length, 10)}
    </div>`;
  }

  function pageGoodsAdd() {
    /* 原站：sub_title「修改商品信息」；波段=text；季节/色/尺码/品类=select；Carry=checkbox；发货时间=text 控件（原型用 date） */
    return `${subTitle("添加新商品")}
      <div class="ots_order-form ots_order-form-column goods-add-form">
        <div class="form_item-long"><label class="req">所属品牌 *</label><div>${field("brand", select(RR.brands.map(b => b.name), "选择品牌", "JUNLI"))}</div></div>
        <div class="form_item-long"><label class="req">款式名称 *</label><div>${field("title", input("款式名称"))}</div></div>
        <div class="form_item-long"><label class="req">sku *</label><div>${field("sku", input("SKU"))}</div></div>
        <div class="form_item-long"><label>波段</label><div>${field("band", input("波段名称"))}</div></div>
        <div class="form_item-long"><label>预计发货时间</label><div>${field("shipAt", dateInput(""))}</div></div>
        <div class="form_item-long"><label class="req">季节 *</label><div>${field("season", select(RR.seasons, null, "2026SS"))}</div></div>
        <div class="form_item-long"><label>Carry Over</label><div><label class="check-inline"><input type="checkbox" data-field="carry" /></label></div></div>
        <div class="form_item-long"><label>可补货</label><div><label class="check-inline"><input type="checkbox" data-field="restock" checked /></label></div></div>
        <div class="form_item-long"><label class="req">尺寸列表 *</label><div>${checkGroup("sizes", Store.db.standardSizes || ["XS", "S", "M", "L", "XL"], ["S", "M", "L"])}</div></div>
        <div class="form_item-long"><label>面料/材质</label><div>${field("fabric", input())}</div></div>
        <div class="form_item-long"><label class="req">品类 *</label><div>${field("cat", select(["女装", "男装", "男女装", "配饰", "生活方式"], null, "女装"))}</div></div>
        <div class="form_item-long"><label>二级品类</label><div>${field("subcat", select(["外套", "连衣裙", "裤装", "裙装"], null, "外套"))}</div></div>
        <div class="form_item-long"><label class="req">建议零售价 *</label><div>${field("retail", input("CNY", "3000"))}</div></div>
        <div class="form_item-long"><label class="req">订货价 *</label><div>${field("wholesale", input("CNY", "1350"))}</div></div>
        <div class="form_item-long"><label>颜色</label><div>${field("color", select(RR.colors, "请选择", "黑色"))}</div></div>
        <div class="form_item-long"><label>最小起订量</label><div>${field("moq", input("件", "1"))}</div></div>
        <div class="form_item-long"><label>缩略图</label><div class="upload-box"><div class="plus">+</div>缩略图 · &lt;5MB</div></div>
        <div class="form_item-long"><label>白底图</label><div class="upload-box"><div class="plus">+</div>白底图 · &lt;5MB</div></div>
        <div class="form_item-long"><label>商品图片</label><div class="upload-box"><div class="plus">+</div>多图上传</div></div>
        <div class="form_item-long"><label>视频</label><div class="upload-box"><div class="plus">+</div>mp4 · &lt;8MB</div></div>
        <div class="form_item-long"><label>视频封面</label><div class="upload-box"><div class="plus">+</div>封面图</div></div>
        <div class="form_item-long"><label>商品详情</label><div><textarea data-field="detail" placeholder="商品材质信息与详情描述…"></textarea></div></div>
        <div class="submit_area action-bar">
          <a href="javascript:;" class="oto_btn" data-act="save-context">保存商品</a>
          <a href="javascript:;" class="oto_btn" data-act="go:goods-list">返回列表</a>
        </div>
      </div>`;
  }

  function pageGoodsBatch() {
    /* 原站：ots_order-form ots_order-addlist；商家/分类 select；上传区；下载三模板 + 确认提交 */
    return `${subTitle("批量添加商品")}
      <div class="ots_order-form ots_order-addlist uk-margin-large-top">
        <p>商家:</p>
        ${field("brand", select(RR.brands.map(b => b.name), "选择品牌", "JUNLI"))}
        <p>商家</p>
        ${field("cat", select(["服饰", "配饰/生活方式"], "请选择", "服饰"))}
        <div class="form_item-long upload_file">
          <label>批量导入商品</label>
          <div class="custom-prefix-upload upload-box" data-act="upload:批量商品"><div class="plus">+</div></div>
          <h6 class="font-red">温馨提示：导入前请先下载模板，然后按照要求填写，模板内容红色标题的为必填项，紫色为必填选项，灰色为非必填项。</h6>
        </div>
      </div>
      <div class="submit_area">
        <a href="javascript:;" class="btn_addmore btn_download" data-act="download:服饰模板">下载服饰模板</a>
        <a href="javascript:;" class="btn_addmore btn_download" data-act="download:配饰模板">下载配饰模板</a>
        <a href="javascript:;" class="btn_addmore btn_download" data-act="download:生活方式模板">下载生活方式模板</a>
        <button type="button" class="ots_order-btn" data-act="upload:批量商品">确认提交</button>
      </div>`;
  }

  function pageGoodsRestock() {
    const ui = Store.db.ui;
    const brand = ui.restockBrand;
    const kind = ui.restockKind;
    if (!brand || !kind) {
      /* 原站：补货/隐藏管理 · 每行品牌 + 补货设置 / 隐藏设置 */
      return `<div class="boduan-container">
        ${subTitle("补货/隐藏管理")}
        <div class="edit_boduan">
          <div class="items head_items"><div class="item_boduan-row">
            <h4>品牌名称</h4><h4>补货设置</h4><h4>隐藏设置</h4>
          </div></div>
          <div class="edit_boduan-list">
            ${RR.brands.map(b => `
              <div class="item uk-flex-nowrap">
                <div class="g-name"><h4>${b.name}</h4></div>
                <h4><a href="javascript:;" data-act="restock-open:${b.name}:restock">设置补货</a></h4>
                <h4><a href="javascript:;" data-act="restock-open:${b.name}:hide">设置隐藏</a></h4>
              </div>`).join("")}
          </div>
        </div>
      </div>`;
    }
    const season = ui.restockSeason || "全部";
    const list = Store.db.goods.filter(g => g.brand === brand && (season === "全部" || g.season === season) && g.status !== "已删款");
    const seasons = [...new Set(Store.db.goods.filter(g => g.brand === brand).map(g => g.season))];
    return `<div class="sub_title"><h4>${kind === "hide" ? "设置隐藏" : "设置补货"} · ${brand}</h4></div>
      <div class="note">${kind === "hide" ? "隐藏后买手端完全不可见，不区分首单/补货。" : "关闭补货后买手端该款不可下补货单。"} 可按季度批量修改。</div>
      <div class="action-bar">
        <button type="button" class="btn btn-outline" data-act="restock-back">返回品牌列表</button>
        ${seasons.map(s => `<button type="button" class="btn btn-sm ${season === s ? "btn-primary" : "btn-outline"}" data-act="restock-season:${s}">${s}</button>`).join("")}
        <button type="button" class="btn btn-sm ${season === "全部" ? "btn-primary" : "btn-outline"}" data-act="restock-season:全部">全部季度</button>
      </div>
      <div class="action-bar">
        ${kind === "restock"
          ? `${btn("本季全部可补货", "btn-outline", "restock-batch:1")}${btn("本季全部不可补货", "btn-outline", "restock-batch:0")}`
          : `${btn("本季全部隐藏", "btn-outline", "restock-batch:1")}${btn("本季全部取消隐藏", "btn-outline", "restock-batch:0")}`}
        ${btn("保存勾选", "btn-primary", "save-restock")}
      </div>
      <table class="data-table" id="restock-table">
        <thead><tr><th>SKU</th><th>商品</th><th>季节</th><th>${kind === "hide" ? "隐藏（全不可见）" : "可补货"}</th></tr></thead>
        <tbody>
          ${list.map(g => `<tr data-sku="${g.sku}">
            <td>${g.sku}</td><td>${g.title}</td><td>${g.season}</td>
            <td>${kind === "hide"
              ? field("hide-" + g.sku, select(["否", "是"], null, g.hideAll ? "是" : "否"))
              : field("restock-" + g.sku, select(["是", "否"], null, g.restock !== false ? "是" : "否"))}</td>
          </tr>`).join("") || '<tr><td colspan="4">该季度暂无商品</td></tr>'}
        </tbody>
      </table>`;
  }

  function pageGoodsLook() {
    const looks = Store.db.looks;
    return `${subTitle("LOOK 列表")}
      <div class="note">需求备注：待定。原型保留可增删 LOOK，绑定季节与关联 SKU。</div>
      <div class="action-bar">${btn("新增 LOOK", "btn-outline", "add-look")}</div>
      <div class="product-grid">
        ${looks.map(l => `<div class="product-card" data-act="toast:LOOK ${l.id} · ${l.skus.length} 款 · ${l.season}" style="cursor:pointer">
          <div class="cover">LOOK ${l.id}</div>
          <div class="name">${l.title}</div>
          <div class="meta">${l.season} · ${l.skus.length} SKU</div>
        </div>`).join("")}
      </div>`;
  }

  function pageGoodsCat() {
    return `${subTitle("商品分类")}
      <div class="note">平台端：设置商品分类，用于商品资料与买手端筛选</div>
      <table class="data-table">
        <thead><tr><th>一级分类</th><th>二级分类</th><th>商品数</th><th>操作</th></tr></thead>
        <tbody>
          ${Store.db.categories.map(c => `<tr>
            <td>${c.name}</td>
            <td>${c.children.join(" / ")}</td>
            <td>${c.count}</td>
            <td>${link("编辑", "edit-category:" + c.name)}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <div style="margin-top:16px">${btn("新增分类")}</div>`;
  }

  function pageBrandList() {
    /* 原站：edit_boduan > head item_boduan-row + edit_boduan-list > item（无左侧 mine_side、非 table） */
    return `<div class="brand_goodsList-container edit_boduan">
      ${subTitle("品牌管理")}
      <div class="items head_items">
        <div class="item_boduan-row">
          <h4>品牌名称</h4><h4>阶梯优惠规则</h4><h4>尺寸别名</h4><h4>订货会设置</h4><h4>收款设置</h4><h4>合同设置</h4><h4>编辑</h4>
        </div>
      </div>
      <div class="edit_boduan-list">
        ${RR.brands.map(b => `
          <div class="item uk-flex-nowrap">
            <div class="g-name"><h4>${b.name}</h4></div>
            <h4><a href="javascript:;" data-go="brand-discount" data-brand="${b.name}">设置优惠规则</a></h4>
            <h4><a href="javascript:;" data-go="brand-size" data-brand="${b.name}">设置尺寸别名</a></h4>
            <h4><a href="javascript:;" data-go="brand-fair" data-brand="${b.name}">订货会设置</a></h4>
            <h4><a href="javascript:;" data-go="brand-pay" data-brand="${b.name}">收款设置</a></h4>
            <h4><a href="javascript:;" data-go="brand-contract" data-brand="${b.name}">合同设置</a></h4>
            <h4><a href="javascript:;" data-go="brand-edit" data-brand="${b.name}">编辑</a></h4>
          </div>`).join("")}
      </div>
      ${state.portal === "platform" ? `<div class="note" style="margin-top:24px">平台主数据：
        <a href="javascript:;" data-go="brand-master-style">风格资料维护</a> ·
        <a href="javascript:;" data-go="brand-master-crowd">适用人群维护</a> ·
        <a href="javascript:;" data-go="brand-master-size">平台标准尺码</a>
      </div>` : ""}
    </div>`;
  }

  function pageBrandDiscount() {
    const seasons = Object.keys(Store.db.brandRules.bySeason || {}).length
      ? Object.keys(Store.db.brandRules.bySeason)
      : RR.seasons.slice(-8);
    const season = Store.db.ui.discountSeason || Store.db.brandRules.season || seasons[0];
    Store.ensureSeasonRules(season);
    const mode = (Store.db.ui.discountMode || "first") === "replenish" ? "replenish" : "first";
    const rules = Store.getDiscountRules(season, mode);
    const tabs = [["first", "首单规则"], ["replenish", "补货单规则"]];
    /* 原站：无侧栏；h1.title_underline 店铺设置；季度 ul + 首单/补货 pill；form 纵向 h5+input */
    return `<h1 class="title_underline">店铺设置</h1>
      <div class="ots_order-form">
        <div class="form_item-long"><label>品牌:</label><div>${state.selectedBrand || "JUNLI"}</div></div>
        <div class="rule_season season-tabs">
          <ul>${seasons.map(s => `<li class="${season === s ? "uk-active" : ""}"><a href="javascript:;" data-act="discount-season:${s}">${s}</a></li>`).join("")}</ul>
        </div>
        <ul class="uk-subnav discount-step tabs">
          ${tabs.map(([id, lab]) => `<li class="${mode === id ? "uk-active on" : ""}"><a href="javascript:;" data-tabsoft data-mode="${id}">${lab.replace("规则", "")}</a></li>`).join("")}
        </ul>
        <div class="form_item-long">
          <h5>最小起订金额(吊牌价）</h5>
          <div>${field("minAmount", input("请输入金额", String(rules.minAmount || 30000)))}</div>
          <h5>服饰统一折扣（需设置统一折扣阶梯折扣才会生效）</h5>
          <div>${field("cloth", input("请输入金额", String(rules.cloth || 0.45)))}</div>
          <h5>配饰统一折扣（需设置统一折扣阶梯折扣才会生效）</h5>
          <div>${field("accessory", input("请输入金额", String(rules.accessory || 0.5)))}</div>
          <h5>生活方式统一折扣（需设置统一折扣阶梯折扣才会生效）</h5>
          <div>${field("lifestyle", input("请输入金额", String(rules.lifestyle || 0.55)))}</div>
          <div class="action-bar">${btn("保存", "btn-primary", "save-discount")}</div>
        </div>
        <hr/>
        <div class="form_item-long">
          <label>阶梯优惠设置</label>
          <div>${field("ruleType", select(["金额生效"], null, "金额生效"))}</div>
          <label>选择分类</label>
          <div>${field("stairCat", select(["服饰", "配饰", "生活方式"], null, "服饰"))}</div>
        </div>
        <table class="data-table" id="stair-table">
          <thead><tr><th>满额（吊牌价）</th><th>折扣</th><th></th></tr></thead>
          <tbody>
            ${(rules.stairs || []).map((st, i) => `<tr>
              <td>${field("stair-amt-" + i, input("请输入金额(吊牌价）", String(st.amount)))}</td>
              <td>${field("stair-disc-" + i, input("折扣", String(st.discount)))}</td>
              <td>${link("删除", "delete-stair:" + i)}</td>
            </tr>`).join("")}
          </tbody>
        </table>
        <div class="submit_area action-bar">${btn("添加阶梯", "btn-outline", "add-stair")}${btn("确认提交", "btn-primary", "save-discount")}</div>
      </div>`;
  }

  function pageBrandSize() {
    /* 原站：h1.title_underline 店铺设置；尺寸 select + 别名 text；sale_info 当前别名 */
    const list = Store.db.sizeAliasList || [];
    const standards = Store.db.standardSizes || [];
    return `<h1 class="title_underline">店铺设置</h1>
      <div class="ots_order-form ots_order-form-column">
        <div><label>品牌:</label> ${state.selectedBrand || "JUNLI"}</div>
        <div class="form_item-long">
          <label>选择尺寸</label>
          ${field("aliasStd", select(standards, "请选择", standards[0] || ""))}
        </div>
        <div class="form_item-withtext">
          <div>${field("aliasName", input("请输入别名"))}</div>
        </div>
      </div>
      <div class="submit_area">
        <button type="button" class="ots_order-btn" data-act="add-size-alias">确认提交</button>
      </div>
      <div class="sale_info-container">
        <h1>当前别名</h1>
        <div class="sale_info items">
          <div class="item sale_info-head">
            <div><h5>尺寸</h5></div><div><h5>别名</h5></div><div><h5>操作</h5></div>
          </div>
          ${list.map((x, i) => `
            <div class="item sale_info-row">
              <div>${x.standard}</div><div>${x.alias}</div>
              <div><a href="javascript:;" data-act="del-size-alias:${i}">删除</a></div>
            </div>`).join("") || '<div class="item"><div>暂无别名</div></div>'}
        </div>
      </div>`;
  }

  function pageBrandFair() {
    /* 原站：季节开启状态 · season-row + checkbox 首单/补货（非 select） */
    return `<div class="boduan-container">
      ${subTitle("季节开启状态")}
      <div class="season_crtl-container">
        <div class="season_crtl">
          <div class="items head_items uk-width-1-1">
            <div class="season-row uk-width-1-1"><h4>季节</h4><h4>首单</h4><h4>补货</h4></div>
          </div>
          <div class="items uk-width-1-1" id="fair-table">
            ${RR.seasons.map(s => {
              const f = Store.db.fairs[s] || { first: true, replenish: true };
              return `<div class="season-row" data-season="${s}">
                <div><h4>${s}</h4></div>
                <div><input type="checkbox" class="uk-checkbox" data-field="fair-first-${s}" ${f.first ? "checked" : ""} /></div>
                <div><input type="checkbox" class="uk-checkbox" data-field="fair-rep-${s}" ${f.replenish ? "checked" : ""} /></div>
              </div>`;
            }).join("")}
          </div>
        </div>
        <div class="submit_area action-bar"><a href="javascript:;" class="oto_btn" data-act="save-fair">保存</a></div>
      </div>
    </div>`;
  }

  function pageBrandPay() {
    /* 原站：bank_payment · 公司名称/收款账户名称/开户行/账号/支行/地址 + 双公章 */
    const p = Store.db.payInfo || {};
    return `<div class="bank_payment-container">
      <div class="bank_payment uk-width-1-1">
        <h6 class="sub_title">收款信息</h6>
        <div class="items">
          <div class="item"><h6>公司名称</h6>${field("company", input("请输入公司名称", p.company || p.account || ""))}</div>
          <div class="item"><h6>收款账户名称</h6>${field("account", input("请输入开户名称", p.account || ""))}</div>
          <div class="item"><h6>开户行</h6>${field("bank", input("请输入开户行", p.bank || ""))}</div>
          <div class="item"><h6>账号</h6>${field("no", input("请输入账号", p.no || ""))}</div>
          <div class="item"><h6>支行</h6>${field("branch", input("请输入支行", p.branch || ""))}</div>
          <div class="item item_long"><h6>地址</h6>${field("addr", input("请输入银行地址", p.addr || ""))}</div>
          <div class="item setLicense"><label>合同公章上传(1张)</label>
            <div class="file_area upload-box"><div class="plus">+</div>${p.sealContract ? "已上传公章" : "上传"}</div>
          </div>
          <div class="item setLicense"><label>OC公章上传(1张)</label>
            <div class="file_area upload-box"><div class="plus">+</div>${p.sealOc ? "已上传 OC 章" : "上传"}</div>
          </div>
          <div class="item submit_area">
            <a href="javascript:;" class="oto_btn" data-act="toast:已清空表单">清空</a>
            <a href="javascript:;" class="oto_btn" data-act="save-pay">提交</a>
          </div>
        </div>
      </div>
    </div>`;
  }

  function pageBrandContract() {
    /* 原站：编辑合同信息 · season_filter · 合同类型链接 · 发货周期 text · date×3 */
    const c = Store.db.contractSettings || {};
    const season = c.season || RR.seasons[RR.seasons.length - 1];
    const types = ["经销商合同", "三方代收代付合同", "返佣合同"];
    const curType = c.type || types[0];
    return `<div class="addr-container contact_edit-container">
      <div class="sub_title">编辑合同信息</div>
      <div class="addr_edit contact_edit">
        <div class="items">
          <div class="season_filter uk-margin-medium-bottom uk-margin-medium-top">
            <ul>${RR.seasons.slice(-9).map(s =>
              `<li class="${season === s ? "uk-active" : ""}"><a href="javascript:;" data-act="contract-season:${s}">${s}</a></li>`
            ).join("")}</ul>
          </div>
          <div class="item">
            <div class="order_invoice">
              <label>合同类型</label>
              <div class="invoice_type">
                ${types.map(t => `<a href="javascript:;" class="${curType === t ? "on" : ""}" data-act="contract-type:${t}">${t}</a>`).join("")}
              </div>
              <input type="hidden" data-field="type" value="${curType}" />
              <input type="hidden" data-field="season" value="${season}" />
            </div>
          </div>
          <div class="item"><label>设置发货周期</label>${field("cycle", `<input type="tel" placeholder="请输入发货周期" value="${c.cycle || ""}" />`)}</div>
          <div class="item"><label>合同联系人</label>${field("contact", input("请输入合同联系人", c.contact || ""))}</div>
          <div class="item"><label>联系人手机</label>${field("phone", `<input type="tel" placeholder="请输入联系人手机" value="${c.phone || ""}" />`)}</div>
          <div class="item"><label>联系人邮箱</label>${field("email", input("请输入联系人邮箱", c.email || ""))}</div>
          <div class="item"><label>合同签订日期</label>${field("signDate", dateInput(c.signDate))}</div>
          <div class="item"><label>授权起始日期</label>${field("authStart", dateInput(c.authStart))}</div>
          <div class="item"><label>授权结束日期</label>${field("authEnd", dateInput(c.authEnd))}</div>
        </div>
        <div class="action_area"><a href="javascript:;" class="oto_btn" data-act="save-contract-settings">保存</a></div>
      </div>
    </div>`;
  }

  function checkGroup(name, options, selected) {
    const sel = selected || [];
    return `<div class="check-group" data-checkgroup="${name}">
      ${options.map(o => {
        const val = typeof o === "string" ? o : o.name;
        const on = sel.includes(val);
        return `<label class="check-pill"><input type="checkbox" data-check="${name}" value="${val}" ${on ? "checked" : ""} style="width:auto;height:auto" /> ${val}</label>`;
      }).join("")}
    </div>`;
  }

  function pageBrandEdit() {
    /* 原站：店铺信息 · 品类/风格/人群 checkbox · 成立年份 · Logo/LookBook */
    const b = Store.db.brandProfile || RR.brands[0];
    const cats = Store.db.catsMaster || ["女装", "男装", "男女装", "配饰", "生活方式"];
    return `<div class="ots_order-form ots_order-form-column brand-edit-form">
      <h1 class="title_underline">店铺信息</h1>
      <div class="form_item-long"><label class="req">品牌名 *</label><div>${field("name", input("品牌名称", b.name))}</div></div>
      <div class="form_item-long"><label>成立年份</label><div>${field("year", select(RR.years, null, String(b.year || "2015")))}</div></div>
      <div class="form_item-long"><h5>品类 *</h5><div>${checkGroup("cats", cats, b.cats || [b.cat].filter(Boolean))}</div></div>
      <div class="form_item-long"><label>官网</label><div>${field("site", input("官网", b.site || ""))}</div></div>
      <div class="form_item-long"><label>预计发货时间</label><div>${field("shipAt", input("预计发货时间", b.shipAt || ""))}</div></div>
      <div class="form_item-long"><h5>风格</h5><div>${checkGroup("styles", Store.db.stylesMaster || [], b.styles || [])}</div></div>
      <div class="form_item-long"><h5>适用人群</h5><div>${checkGroup("crowds", Store.db.crowdsMaster || [], b.crowds || [])}</div></div>
      <div class="form_item-long"><label>设计师文字介绍</label><div><textarea data-field="designer">${b.designer || ""}</textarea></div></div>
      <div class="form_item-long"><label>品牌故事</label><div><textarea data-field="about">${b.about || ""}</textarea></div></div>
      <div class="form_item-long"><label>品牌Logo</label><div class="upload-box"><div class="plus">+</div>Logo</div></div>
      <div class="form_item-long"><label>LookBook</label><div class="upload-box"><div class="plus">+</div>宣传图</div></div>
      <div class="form_item-long"><label>缩写</label><div>${field("abbr", input("缩写", b.abbr || ""))}</div></div>
      <div class="form_item-long"><label class="req">货币 *</label><div>${field("currency", select(["CNY", "USD", "EUR", "HKD"], null, b.currency || "CNY"))}</div></div>
      <div class="form_item-long"><label>文字颜色</label><div>${field("textColor", select(["黑色", "白色", "品牌色"], null, b.textColor || "黑色"))}</div></div>
      <div class="submit_area"><a href="javascript:;" class="oto_btn" data-act="save-brand-profile">保存</a></div>
    </div>`;
  }

  function pageMaster(kind) {
    const title = kind === "styles" ? "风格资料维护" : kind === "crowds" ? "适用人群维护" : "平台标准尺码维护";
    const note = kind === "sizes"
      ? "作为品牌尺码别名下拉的选项来源，可增删改。"
      : "作为品牌信息编辑时的勾选基础数据，可增删改。";
    const rows = kind === "sizes"
      ? (Store.db.standardSizes || []).map(n => ({ id: n, name: n }))
      : (kind === "styles" ? Store.db.stylesMaster : Store.db.crowdsMaster) || [];
    return `<div class="sub_title"><h4>${title}</h4></div>
      <div class="note">${note}（意见 #6，现网无参考页，按主体 UI 自设计）</div>
      <div class="form-grid" style="max-width:560px">
        <label>新增</label><div>${field("masterName", input("输入名称"))}</div>
      </div>
      <div class="action-bar">${btn("添加", "btn-primary", "add-master:" + kind)}</div>
      <table class="data-table">
        <thead><tr><th>名称</th><th>操作</th></tr></thead>
        <tbody>
          ${rows.map(r => `<tr>
            <td>${r.name}</td>
            <td class="ops">
              <a href="javascript:;" data-act="edit-master:${kind}:${r.id}">修改</a>
              <a href="javascript:;" data-act="del-master:${kind}:${r.id}">删除</a>
            </td>
          </tr>`).join("") || '<tr><td colspan="2">暂无数据</td></tr>'}
        </tbody>
      </table>`;
  }

  function orderTable(rows, actions = "查看 / 下载 / 生成订单") {
    return `<table class="data-table">
      <thead><tr><th>单号</th><th>品牌</th><th>季节</th><th>店铺</th><th>金额</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${r.id}</td><td>${r.brand}</td><td>${r.season}</td>
        <td>${r.store}${r.city ? " · " + r.city : ""}</td>
        <td>${r.amount}</td><td><span class="badge">${r.status}</span></td>
        <td class="ops"><a href="javascript:;" data-go="order-detail">查看</a>${link("下载", "download:选款单")}</td>
      </tr>`).join("")}</tbody>
    </table>
    <p style="color:#999;font-size:12px;margin-top:8px">操作示例：${actions}</p>`;
  }

  function pageOrderSelection() {
    const all = Store.filteredSelections();
    const list = pageSlice(all, 10);
    const f = Store.db.ui.selectionFilter;
    /* 原站选款筛选：品牌/季节=select；国家/省/店铺名=text（非下拉） */
    return `<div class="brand_goodsList-container">
      ${subTitle("选款单管理")}
      ${filterPanel([
        ["选择品牌", select(RR.brands.map(b => b.name), "全部", f.brand)],
        ["季节", select(RR.seasons, "全部", f.season)],
        ["国家", input("输入国家")],
        ["省", input("输入省")],
        ["店铺名", input("输入店铺名", f.store)]
      ])}
      <div class="brand_ordersList">
      <div class="items head_items"><div class="item_order-row sel-head-row">
        <h4>买手</h4><h4>季节</h4><h4>总金额</h4><h4>总件数</h4><h4>操作</h4>
      </div></div>
      ${list.map(s => `
        <div class="sel-card">
          <div class="sel-card-head">
            <span class="brand-logo" style="width:40px;height:40px;font-size:8px;display:inline-flex;align-items:center;justify-content:center">${(s.brand || "").split(" ")[0]}</span>
            <strong>${s.brand}</strong>
            <span>下单时间：${s.time}</span>
          </div>
          <div class="sel-card-body">
            <div><h5 style="margin:0">${s.store}</h5></div>
            <div>${s.season}</div>
            <div><strong>${s.amount}</strong></div>
            <div>件数：${s.pieces}<br/>SKU数：${s.skus}</div>
            <div class="ops" style="flex-direction:column;align-items:stretch;gap:6px">
              <a class="oto_btn" href="javascript:;" data-go="selection-detail" data-sel="${s.id}">查看详情</a>
              <a class="oto_btn" href="javascript:;" data-gen-order="${s.id}">生成订单</a>
              <a class="oto_btn" href="javascript:;" data-act="cancel-selection" data-sel="${s.id}">取消订单</a>
              <a class="oto_btn" href="javascript:;" data-act="download:选款单">下载选款单</a>
            </div>
          </div>
        </div>`).join("") || '<div class="note">无匹配选款单</div>'}
      </div>
      ${pagination(all.length, 10)}
    </div>`;
  }

  function renderSelQuoteBar(quote, brand) {
    const typeBlocks = (quote.types || []).map(t => `
      <div class="sel-quote-type">
        <div><strong>${t.name}</strong> 已选 ${t.pieces} · 已享受 ${t.discountLabel}</div>
        ${t.nextGap > 0 ? `<div class="muted">距离 ${t.nextDiscountLabel} 还差 ¥${Store.money(t.nextGap)}（吊牌价）</div>` : `<div class="muted">已达当前最高阶梯</div>`}
      </div>`).join("") || `<div class="muted">暂无分类汇总</div>`;
    return `<div class="sel-quote-bar sticky-quote">
      <div class="sel-quote-main">
        <strong>${brand || ""}</strong>
        <span>总吊牌价 <b>¥${Store.money(quote.retail)}</b></span>
        <span>总批发价 <b class="purple">¥${Store.money(quote.wholesale)}</b></span>
        <span>${quote.minGap > 0 ? `距离起订金额还差 <b>¥${Store.money(quote.minGap)}</b>` : "已达到起订金额"}</span>
      </div>
      <div class="sel-quote-types">${typeBlocks}</div>
    </div>`;
  }

  function renderSelectionLines(lines, opts = {}) {
    const locked = !!opts.locked;
    const draft = !!opts.draft;
    const qtyAttr = draft ? "data-draft-qty" : "data-line-qty";
    return (lines || []).map(l => {
      const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
      const retail = Store.parseMoney(l.retail) * qty;
      const price = Store.parseMoney(l.price);
      const sizeKeys = Object.keys(l.sizes || {});
      return `<div class="sel-line-card" data-sku-row="${l.sku}">
        <div class="sel-line-left">
          <div class="thumb ph">IMG</div>
          <div>
            <div class="sel-line-title">${l.title}</div>
            <div class="sel-line-meta">颜色：${l.color || "—"} · 样衣尺码：${l.sampleSize || "—"} · 编号：${l.code || "—"}</div>
            <div class="sel-line-meta">SKU：${l.sku}${l.goodsType ? " · " + l.goodsType : ""}</div>
            <div class="size-editor">
              ${sizeKeys.map(sz => `
                <div class="size-row" style="border:none;padding:4px 0">
                  <span style="min-width:52px">${sz}</span>
                  <div class="qty">
                    <button type="button" ${qtyAttr}="${l.sku}" data-size="${sz}" data-d="-1" ${locked ? "disabled" : ""}>−</button>
                    <input value="${l.sizes[sz] || 0}" readonly />
                    <button type="button" ${qtyAttr}="${l.sku}" data-size="${sz}" data-d="1" ${locked ? "disabled" : ""}>+</button>
                  </div>
                </div>`).join("")}
            </div>
          </div>
        </div>
        <div class="sel-line-right">
          <div class="sel-line-amt">¥${Store.money(retail || price * qty)}</div>
          <div class="sel-line-meta">吊牌价：¥${Store.money(l.retail || price / 0.45)}</div>
          <div class="sel-line-meta">买手价：¥${Store.money(price)}</div>
          <div class="sel-line-meta">已选 ${qty} 件</div>
          ${locked ? "" : `<button type="button" class="btn btn-outline btn-sm" data-act="${draft ? "delete-draft-line:" + l.sku : "delete-sel-line:" + l.sku}">删除</button>`}
        </div>
      </div>`;
    }).join("") || '<div class="note">暂无款式，请添加</div>';
  }

  function renderSelectionWorkbench(s, opts = {}) {
    const lines = s.lines || [];
    const quote = Store.selectionQuote(lines);
    const back = opts.backAct || "go:order-selection";
    const showGen = opts.showGen !== false;
    const addOpen = state.selAddOpen;
    const candidates = Store.db.goods.filter(g => g.brand === s.brand && g.status !== "已删款" && !(lines || []).some(l => l.sku === g.sku));
    return `
      ${renderSelQuoteBar(quote, s.brand)}
      <div class="sel-work-head">
        <div>
          <div class="sub_title"><h4>选款单详情（件数: ${quote.pieces}, SKU 数: ${quote.skus}）</h4></div>
          <div class="sel-work-sub">${s.id || ""} · ${s.store || ""} · ${s.season || ""} · <span class="badge">${s.status || ""}</span>${s.locked ? " · 已锁定" : ""}</div>
        </div>
        <div class="action-bar" style="margin:0">
          ${s.locked ? "" : btn("添加款式", "btn-primary", "toggle-sel-add")}
          ${showGen ? btn("生成订单", "btn-primary", "gen-order") : ""}
          ${opts.showConfirm ? btn("确认选款单", "btn-primary", "save-selection-lines") : btn("保存修改", "btn-outline", "save-selection-lines")}
          ${opts.showCancel !== false ? btn("取消选款单", "btn-outline", "cancel-selection") : ""}
          ${btn("下载选款单", "btn-outline")}
          ${btn("返回", "btn-outline", back)}
        </div>
      </div>
      ${addOpen && !s.locked ? `<div class="modal-panel sel-add-panel">
        <h3>添加本品牌款式</h3>
        <div class="note">选款单按品牌独立，仅可添加 ${s.brand}</div>
        <div class="sel-add-list">
          ${candidates.slice(0, 24).map(g => `
            <div class="sel-add-item">
              <div><strong>${g.title}</strong><div class="sel-line-meta">${g.sku} · 编号 ${g.code} · ¥${g.wholesale}</div></div>
              <button type="button" class="btn btn-outline btn-sm" data-act="add-sel-line:${g.sku}">加入</button>
            </div>`).join("") || '<div class="note">无可添加款式</div>'}
        </div>
        <div class="action-bar">${btn("关闭", "btn-outline", "toggle-sel-add")}</div>
      </div>` : ""}
      <div class="sel-lines">${renderSelectionLines(lines, { locked: s.locked })}</div>
      <p style="color:#999;font-size:12px;margin-top:12px">生成订单后选款单锁定；若需再改，需后台驳回订单后重选。平台端与买手端详情展示一致。</p>`;
  }

  function pageSelectionDetail() {
    const s = state.selectedSel || Store.db.selections[0];
    return renderSelectionWorkbench(s, { backAct: "go:order-selection", showGen: true });
  }

  function pageOrderList(forceType) {
    const all = Store.filteredOrders(forceType || null);
    const list = pageSlice(all, 10);
    const f = Store.db.ui.orderFilter;
    const title = forceType === "补货单" ? "补货单管理" : "订单管理";
    /* 原站订单管理筛选：品牌/季节/状态=select；国家/省/城市/店铺/订单号=text */
    const filters = forceType
      ? [
          ["选择品牌", select(RR.brands.map(b => b.name), "全部", f.brand)],
          ["季节", select(RR.seasons, "全部", f.season)],
          ["订单状态", select(["买手未确认", "买手已确认待品牌确认", "定金确认", "尾款确认", "已完成", "已驳回"], "全部", f.status)],
          ["国家", input("输入国家")],
          ["省", input("输入省")],
          ["城市", input("输入城市")],
          ["店铺名", input("", f.store)],
          ["订单号", input("", f.id)]
        ]
      : [
          ["选择品牌", select(RR.brands.map(b => b.name), "全部", f.brand)],
          ["季节", select(RR.seasons, "全部", f.season)],
          ["订单类型", select(["首单", "补货单"], "全部", f.type)],
          ["订单状态", select(["买手未确认", "买手已确认待品牌确认", "定金确认", "尾款确认", "已完成", "已驳回"], "全部", f.status)],
          ["国家", input("输入国家")],
          ["省", input("输入省")],
          ["城市", input("输入城市")],
          ["店铺名", input("", f.store)],
          ["订单号", input("", f.id)]
        ];
    return `<div class="brand_goodsList-container">
      ${subTitle(title)}
      <div class="note">${forceType ? "订单与补货单独立管理，本页不展示订单类型字段。" : "总订单视图可按类型筛选；日常请用左侧「订单管理 / 补货单管理」。"}</div>
      ${filterPanel(filters)}
      <div class="order-live-list">
        ${list.map(o => {
          const tips = Store.orderPendingTips(o);
          const pieces = (o.lines || []).reduce((a, l) => a + Object.values(l.sizes || {}).reduce((x, y) => x + Number(y || 0), 0), 0);
          const paid = Store.parseMoney(o.paidDeposit);
          const dep = Store.parseMoney(o.deposit);
          const due = Math.max(0, dep - paid);
          return `<div class="order-live-card">
            <div class="order-live-head">
              <div class="order-live-brand">
                <span class="brand-logo" style="width:36px;height:36px;font-size:8px;border-radius:0">${(o.brand || "").split(" ")[0]}</span>
                <strong>${o.brand}</strong>
                <span class="muted">下单时间：${o.createdAt || "—"}</span>
                <span class="muted">订单号：${o.id}</span>
              </div>
              <div class="order-live-toplinks">
                <a href="javascript:;" data-order-action="return" data-go="order-detail" data-oid="${o.id}">退换货</a>
                <a href="javascript:;" data-act="download:订单">下载订单</a>
                <a href="javascript:;" data-go="order-detail" data-oid="${o.id}">查看详情</a>
                <a href="javascript:;" data-go="order-detail" data-oid="${o.id}">修改订单</a>
              </div>
            </div>
            <div class="order-live-body">
              <div class="order-live-main">
                <div class="col"><div class="k">店铺</div><div class="v purple">${o.store}</div></div>
                <div class="col"><div class="k">季节</div><div class="v">${o.season}</div></div>
                <div class="col"><div class="k">折扣</div><div class="v">${o.discountLabel || "服饰:4.5折"}</div></div>
                <div class="col"><div class="k">商品总数</div><div class="v">${pieces || "—"}</div></div>
                <div class="col money">
                  <div>吊牌价：${o.retailAmount || "—"}</div>
                  <div>批发价：<span class="purple">${o.amount}</span></div>
                  <div>定金：${o.deposit} / ${dep ? Math.round(paid / dep * 100) : 0}%</div>
                  <div>已付：${o.paidDeposit || "0.00"} · 待付：${Store.money(due)}</div>
                </div>
                <div class="col tips">
                  ${tips.map(t => `<div>· ${t}</div>`).join("") || `<div class="muted">· ${o.status}</div>`}
                  <div class="badge" style="margin-top:8px">${o.status}${o.whitelist ? " · 白名单" : ""}</div>
                </div>
              </div>
              <div class="order-live-actions">
                <button type="button" class="oto_btn" data-act="reject-order" data-oid="${o.id}">驳回订单</button>
                <button type="button" class="oto_btn" data-go="order-detail" data-oid="${o.id}" data-order-action="modify">设置折扣</button>
                <button type="button" class="oto_btn" data-go="order-detail" data-oid="${o.id}" data-order-action="deposit">修改定金</button>
                <button type="button" class="oto_btn" data-go="order-detail" data-oid="${o.id}" data-order-action="deposit">确认定金</button>
                <button type="button" class="oto_btn" data-go="order-detail" data-oid="${o.id}" data-order-action="voucher">上传付款凭证</button>
                <button type="button" class="oto_btn" data-go="buyer-sub">查看子店铺信息</button>
                <button type="button" class="oto_btn purple-text" data-go="order-detail" data-oid="${o.id}" data-order-action="invoice">发票信息</button>
                <button type="button" class="oto_btn" data-go="order-detail" data-oid="${o.id}" data-order-action="substore">选择子店铺</button>
                <button type="button" class="oto_btn" data-go="order-detail" data-oid="${o.id}" data-order-action="whitelist">设为白名单</button>
              </div>
            </div>
          </div>`;
        }).join("") || '<div class="note">无匹配订单</div>'}
      </div>
      ${pagination(all.length, 10)}
    </div>`;
  }

  function pageOrderDetail() {
    const o = state.selectedOrder || Store.db.orders[0];
    const action = state.orderAction;
    const rules = Store.getDiscountRules();
    const lines = o.lines || [];
    const skuCount = lines.length;
    const panels = {
      modify: `<div class="modal-panel"><h3>修改订单 · 增减款 / 设置折扣</h3>
        <table class="data-table"><thead><tr><th>SKU</th><th>尺码</th><th>数量合计</th><th>单款折扣</th><th></th></tr></thead>
        <tbody>
          ${lines.map((l, i) => {
            const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
            return `<tr data-line="${i}">
              <td>${l.sku}</td><td>${Object.keys(l.sizes || {}).join("/")}</td>
              <td>${field("qty-" + i, input("", String(qty)))}</td>
              <td>${field("disc-" + i, input("", String(l.discount || 1)))}</td>
              <td>${link("删款", "remove-order-line:" + i)}</td>
            </tr>`;
          }).join("")}
        </tbody></table>
        <div class="action-bar">${btn("添加款式", "btn-outline")}${btn("保存修改", "btn-primary", "save-order-modify")}</div></div>`,
      invoice: `<div class="modal-panel"><h3>申请发票</h3>
        <div class="form-grid"><label>抬头</label><div>${field("invTitle", input("", (o.invoice && o.invoice.title) || o.store))}</div>
        <label>税号</label><div>${field("invTax", input("", (o.invoice && o.invoice.tax) || ""))}</div>
        <label>金额</label><div>${field("invAmt", input("", o.amount))}</div>
        <label>类型</label><div>${field("invType", select(["增值税专用发票", "普通发票"], null, "普通发票"))}</div></div>
        <div class="action-bar">${btn("提交发票申请")}</div>
        ${o.invoice ? `<div class="note">已申请：${o.invoice.title} · ${o.invoice.type} · ¥${o.invoice.amount}</div>` : ""}</div>`,
      voucher: `<div class="modal-panel"><h3>上传付款凭证</h3>
        <div class="upload-box"><div class="plus">+</div>上传转账截图 / PDF</div>
        <div class="form-grid" style="margin-top:16px"><label>付款金额</label><div>${field("voucherAmt", input("", o.deposit))}</div>
        <label>付款时间</label><div>${field("voucherAt", dateInput(new Date().toISOString().slice(0, 10)))}</div></div>
        <div class="action-bar">${btn("提交凭证")}</div>
        ${o.voucher ? `<div class="note">已上传凭证：¥${o.voucher.amount} · ${o.voucher.at}</div>` : ""}</div>`,
      whitelist: `<div class="modal-panel"><h3>白名单特殊处理</h3>
        <div class="note">订单未达起订量时，可设为白名单允许继续流转。当前白名单：${o.whitelist ? "是" : "否"}</div>
        <div class="form-grid"><label>当前金额</label><div>¥${o.amount}</div>
        <label>起订额</label><div>¥${Store.money(rules.minAmount)}</div>
        <label>原因</label><div class="span2"><textarea data-field="wlReason">VIP 买手特批</textarea></div></div>
        <div class="action-bar">${btn("设为白名单")}</div></div>`,
      substore: `<div class="modal-panel"><h3>分配订单到子店铺</h3>
        <table class="data-table"><thead><tr><th>子店铺</th><th>分配金额</th><th>SKU 数</th></tr></thead>
        <tbody>
          <tr><td>Liora Amour 静安</td><td>${field("subAmt1", input("", "60000"))}</td><td>${field("subSku1", input("", "10"))}</td></tr>
          <tr><td>Liora Amour 主店</td><td>${field("subAmt2", input("", "68600"))}</td><td>${field("subSku2", input("", "8"))}</td></tr>
        </tbody></table>
        <div class="action-bar">${btn("确认分配")}</div></div>`,
      return: `<div class="modal-panel"><h3>退换货</h3>
        <div class="form-grid"><label>类型</label><div>${field("retType", select(["退货", "换货"]))}</div>
        <label>关联 SKU</label><div>${field("retSku", select(lines.length ? lines.map(l => l.sku) : ["暂无 SKU"], null, lines[0] ? lines[0].sku : "暂无 SKU"))}</div>
        <label>数量</label><div>${field("retQty", input("", "1"))}</div>
        <label>原因</label><div>${field("retReason", input())}</div></div>
        <div class="action-bar">${btn("提交退换货")}</div>
        ${(o.returns || []).map(r => `<div class="note">${r.type} ${r.sku}×${r.qty} · ${r.reason || ""}</div>`).join("")}</div>`,
      deposit: `<div class="modal-panel"><h3>品牌确认 · 设置定金</h3>
        <div class="form-grid"><label>订单金额</label><div>¥${o.amount}</div>
        <label>定金比例</label><div>${field("depRatio", select(RR.depositRatios, null, "30%"))}</div>
        <label>应收定金</label><div>${field("depAmt", input("", o.deposit))}</div></div>
        <div class="action-bar">${btn("确认定金并确认订单")}</div></div>`
    };

    return `${subTitle("订单详情")}
      <div class="detail-sticky">
        <strong>${o.brand}</strong>
        <span class="badge">${o.type}</span>
        <span>最小起订额 ¥${Store.money(rules.minAmount)}</span>
        <span>品类折扣 服饰 ${rules.cloth}</span>
        <span>已选金额 ¥${o.amount}</span>
        <span class="badge gray">${o.status}${o.whitelist ? " · 白名单" : ""}</span>
      </div>
      <div class="stat-row">
        <div class="stat"><div class="l">订单金额</div><div class="n">¥${o.amount}</div></div>
        <div class="stat"><div class="l">应收定金</div><div class="n">¥${o.deposit}</div></div>
        <div class="stat"><div class="l">实收定金</div><div class="n">¥${o.paidDeposit || "0.00"}</div></div>
        <div class="stat"><div class="l">SKU 数</div><div class="n">${skuCount}</div></div>
      </div>
      <div class="form-section">
        <h3>订单操作（点击展开子流程）</h3>
        <div class="action-bar">
          <button class="btn btn-primary" data-order-action="deposit">确认定金并确认订单</button>
          <button class="btn btn-outline" data-order-action="modify">增减款 / 设折扣</button>
          <button class="btn btn-outline" data-order-action="voucher">上传付款凭证</button>
          <button class="btn btn-outline" data-order-action="invoice">申请发票</button>
          <button class="btn btn-outline" data-act="confirm-final">确认尾款</button>
          <button class="btn btn-outline" data-order-action="substore">分配子店铺</button>
          <button class="btn btn-outline" data-order-action="return">退换货</button>
          <button class="btn btn-outline" data-order-action="whitelist">白名单</button>
          <button class="btn btn-outline" data-act="create-contract">生成合同</button>
          <button class="btn btn-outline" data-act="create-oc">生成 OC</button>
          <button class="btn btn-outline" data-act="reject-order">驳回订单</button>
          <button class="btn btn-outline" data-act="download:订单">下载订单</button>
        </div>
        ${action ? panels[action] || "" : '<div class="note">请选择上方操作查看完整子流程。</div>'}
      </div>
      <table class="data-table">
        <thead><tr><th>SKU</th><th>款式</th><th>尺码明细</th><th>数量</th><th>买手价</th><th>小计</th></tr></thead>
        <tbody>
          ${lines.map(l => {
            const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
            const sub = qty * Number(l.price || 0) * Number(l.discount || 1);
            return `<tr><td>${l.sku}</td><td>${l.title}</td>
              <td>${Object.entries(l.sizes || {}).map(([k, v]) => k + "×" + v).join(" / ")}</td>
              <td>${qty}</td><td>${Store.money(l.price)}</td><td>${Store.money(sub)}</td></tr>`;
          }).join("")}
        </tbody>
      </table>`;
  }

  function pageOrderReplenish() {
    return pageOrderList("补货单");
  }

  function pageOrderContract() {
    return `${subTitle("合同管理")}
      <div class="note">根据订单生成在线合同；企业信息及公章自动取自品牌资料</div>
      <table class="data-table">
        <thead><tr><th>合同号</th><th>关联订单</th><th>品牌</th><th>季度</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${Store.db.contracts.map(c => `<tr>
            <td>${c.id}</td><td>${c.orderId}</td><td>${c.brand}</td><td>${c.season}</td>
            <td><span class="badge ${c.status === "已生成" ? "green" : ""}">${c.status}</span></td>
            <td class="ops">
              <a href="javascript:;" data-go="contract-preview" data-oid="${c.orderId}">预览</a>
              ${c.status !== "已生成" ? `<a href="javascript:;" data-act="create-contract" data-oid="${c.orderId}">一键生成</a>` : link("下载", "download:合同")}
            </td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  }

  function pageOrderOC() {
    return `${subTitle("OC 管理")}
      <div class="note">根据订单快速生成 OC（企业信息 + 商品信息及图片），支持快速下载</div>
      <table class="data-table">
        <thead><tr><th>OC 号</th><th>订单</th><th>品牌</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${Store.db.ocs.map(oc => `<tr>
            <td>${oc.id}</td><td>${oc.orderId}</td><td>${oc.brand}</td>
            <td><span class="badge green">${oc.status}</span></td>
            <td class="ops">
              <a href="javascript:;" data-go="oc-preview" data-oid="${oc.orderId}">快速生成</a>
              ${link("下载", "download:OC")}
            </td>
          </tr>`).join("") || '<tr><td colspan="5">暂无 OC，可在订单详情生成</td></tr>'}
        </tbody>
      </table>`;
  }

  function pageOrderStyle() {
    const dim = Store.db.ui.styleDim || "sku";
    const f = Store.db.ui.styleFilter || {};
    const rows = Store.styleSummary(dim, f);
    const expand = Store.db.ui.styleExpand || "";
    const totalPieces = rows.reduce((a, r) => a + (r.pieces || 0), 0);
    const totalAmt = rows.reduce((a, r) => a + Store.parseMoney(r.amount), 0);
    let body = "";
    if (dim === "buyer") {
      body = `<table class="data-table">
        <thead><tr><th>店铺名称</th><th>补货/下单总金额(RMB)</th><th>总件数</th><th>总次数</th></tr></thead>
        <tbody>
          ${rows.map(r => `<tr>
            <td>${r.store}</td><td>${r.amount}</td><td>${r.pieces}</td><td>${r.times}</td>
          </tr>`).join("") || '<tr><td colspan="4">暂无汇总数据</td></tr>'}
        </tbody>
      </table>`;
    } else {
      body = `<div class="style-sum-list">
        <div class="note">总数：${totalPieces}；总金额：${Store.money(totalAmt)}</div>
        ${rows.map(r => `
          <div class="style-sum-card">
            <div class="style-sum-head">
              <div class="thumb ph" style="width:64px;height:80px">IMG</div>
              <div>
                <div><strong>款号</strong> ${r.sku}</div>
                <div><strong>款名</strong> ${r.title}</div>
                <div class="muted">颜色：${r.color || "—"}</div>
              </div>
              <div class="style-sum-tot">
                <div>总数: ${r.pieces}</div>
                <div class="purple">总计: ¥${r.amount}</div>
                <button type="button" class="btn btn-outline btn-sm" data-act="style-expand:${r.sku}">${expand === r.sku ? "收起" : "展开"}</button>
              </div>
            </div>
            <div class="style-sum-row muted">码数：${r.sizeText || "—"} · 合计 ${r.pieces} · 单价 ¥${r.unit} · 金额 ¥${r.amount} · 渠道名：总计</div>
            ${expand === r.sku ? `<table class="data-table" style="margin-top:10px">
              <thead><tr><th>码数</th><th>合计</th><th>单价(RMB)</th><th>金额(RMB)</th><th>渠道名</th></tr></thead>
              <tbody>
                <tr><td>${r.sizeText}</td><td>${r.pieces}</td><td>${r.unit}</td><td>${r.amount}</td><td>总计</td></tr>
                ${(r.buyerRows || []).map(b => `<tr>
                  <td>${b.sizeText}</td><td>${b.pieces}</td><td>${r.unit}</td><td>${b.amount}</td><td>${b.store}</td>
                </tr>`).join("")}
              </tbody>
            </table>` : ""}
          </div>`).join("") || '<div class="note">暂无汇总数据</div>'}
      </div>`;
    }
    /* 原站款式汇总：date×2 + 品牌 select + 款号 text + 季节/类型/状态 select；按钮「查询」 */
    return `${subTitle("汇总")}
      ${filterPanel([
        ["开始时间", field("styleStart", dateInput(f.start))],
        ["结束时间", field("styleEnd", dateInput(f.end))],
        ["品牌", field("styleBrand", select(RR.brands.map(b => b.name), "全部", f.brand || "全部"))],
        ["款号", field("styleSku", input("", f.sku || ""))],
        ["季节", field("styleSeason", select(RR.seasons, "全部", f.season || "全部"))],
        ["订单类型", field("styleType", select(["全部", "首单", "补货单"], null, f.type || "全部"))],
        ["订单状态", field("styleStatus", select(["全部", "买手已确认", "品牌已确认", "定金已确认", "尾款已确认"], null, f.status || "全部"))]
      ], "", "查询", "style-filter")}
      <div class="tabs brand_orders-filter">
        <button type="button" class="${dim === "sku" ? "on" : ""}" data-tabsoft data-style-dim="sku">SKU维度</button>
        <button type="button" class="${dim === "buyer" ? "on" : ""}" data-tabsoft data-style-dim="buyer">买手维度</button>
      </div>
      ${body}`;
  }

  function pageOrderRealtime() {
    /* 原站标题「汇总」；筛：开始/结束 date、季节、订单类型(首单/补单)、状态；按钮「查询」 */
    const f = Store.db.ui.realtimeFilter || {};
    const rows = Store.realtimeSummary(f);
    return `<div class="filter-container brand_goodsList-container">
      ${subTitle("汇总")}
      ${filterPanel([
        ["开始时间:", field("rtStart", dateInput(f.start))],
        ["结束时间:", field("rtEnd", dateInput(f.end))],
        ["季节:", field("rtSeason", select(RR.seasons, null, f.season || RR.seasons[RR.seasons.length - 1]))],
        ["订单类型:", field("rtType", select(["全部", "首单", "补单"], null, f.type === "补货单" ? "补单" : (f.type || "全部")))],
        ["订单状态:", field("rtStatus", select(["全部", "订单已确认", "已设置定金", "定金已确认", "尾款已确认"], null, f.status || "全部"))]
      ], "", "查询", "realtime-filter")}
      <div class="filter_details-conainer rt-sum-list">
        ${rows.map(r => `
          <div class="rt-sum-row item">
            <strong>${r.brand}</strong>
            <span>订单数：${r.count}</span>
            <span>总件数：${r.pieces}</span>
            <span>零售总额：${r.retail}</span>
            <span>总金额：${r.amount}</span>
            <span>应收定金：${r.deposit}</span>
            <span>实收定金：${r.paidDeposit}</span>
            <span>实收总额：${r.paidTotal}</span>
            <a href="javascript:;" class="oto_btn" data-act="toast:查看 ${r.brand} 明细（示意）">查看</a>
          </div>`).join("") || '<div class="note">筛选范围内暂无订单</div>'}
      </div>
    </div>`;
  }

  function pageOrderAllSel() {
    return `${subTitle("总选款单管理")}
      <div class="note">选择指定品牌 + 季度，下载该品牌指定季度总选款单</div>
      ${filterPanel([
        ["品牌", select(RR.brands.map(b => b.name))],
        ["季度", select(RR.seasons)]
      ], "", "下载总选款单", "download:总选款单")}`;
  }

  function pageOrderAll() {
    return `${subTitle("总订单管理")}
      ${filterPanel([
        ["品牌", select(RR.brands.map(b => b.name))],
        ["季节", select(RR.seasons)],
        ["订单类型", select(["首单", "补货单"])],
        ["开始时间", dateInput("")],
        ["结束时间", dateInput("")]
      ], "", "下载订单汇总", "download:订单汇总")}`;
  }

  function pageOrderAnalysis() {
    const st = Store.analysisStats("全部", "全部");
    return `${subTitle("订单分析")}
      ${filterPanel([
        ["品牌", select(RR.brands.map(b => b.name))],
        ["季度", select(RR.seasons)]
      ])}
      <div class="stat-row">
        <div class="stat"><div class="l">订单数</div><div class="n">${st.count}</div></div>
        <div class="stat"><div class="l">总金额</div><div class="n">¥${st.amount}</div></div>
        <div class="stat"><div class="l">客单价</div><div class="n">¥${st.avg}</div></div>
        <div class="stat"><div class="l">买手数</div><div class="n">${st.buyers}</div></div>
      </div>
      <div class="chart-ph">
        ${(st.bars.length ? st.bars : [40, 65, 50, 80, 72, 90, 60, 85]).map(h => `<div class="bar" style="height:${h}%"></div>`).join("")}
      </div>
      <p style="color:#999;font-size:12px;margin-top:8px">按当前订单库实时汇总</p>`;
  }

  function pageOrderAppoint() {
    /* 原站：预约列表 · 选择品牌 select + 店铺名 text · 表头含预约日期/时间/人数/手机/提交/签到 */
    return `<div class="brand_goodsList-container">
      ${subTitle("预约列表")}
      ${filterPanel([
        ["选择品牌:", select(RR.brands.map(b => b.name), "全部")],
        ["店铺名:", input("店铺名")]
      ], "", "筛选", "filter")}
      <table class="data-table">
        <thead><tr>
          <th>品牌</th><th>店铺名</th><th>预约日期</th><th>预约时间</th><th>人数</th><th>手机号</th><th>提交时间</th><th>签到时间</th><th>操作</th>
        </tr></thead>
        <tbody>${Store.db.appointments.map(a => `<tr>
          <td>${a.brand}</td><td>${a.store}</td><td>${(a.date || "").split(" ")[0] || a.date}</td>
          <td>${a.time || (a.date || "").split(" ")[1] || "—"}</td>
          <td>${a.people || 1}</td><td>${a.phone}</td>
          <td>${a.submitAt || a.date || "—"}</td><td>${a.checkin || "—"}</td>
          <td class="ops"><a href="javascript:;" data-act="download:预约记录">下载</a></td>
        </tr>`).join("") || '<tr><td colspan="9">暂无预约</td></tr>'}</tbody>
      </table>
    </div>`;
  }

  function pageOrderRecon() {
    const tab = state.reconTab;
    const r = Store.db.recon;
    const tabs = [
      ["rate", "抽佣设置"],
      ["bill", "抽佣单"],
      ["invoice", "代/抽发票"],
      ["balance", "挂帐余额"],
      ["payinfo", "品牌付款信息"]
    ];
    const bodies = {
      rate: `<div class="form-grid">
        <label>品牌</label><div>${field("rateBrand", select(RR.brands.map(b => b.name), null, r.rate.brand))}</div>
        <label>季节</label><div>${field("rateSeason", select(RR.seasons, null, r.rate.season))}</div>
        <label>基础抽佣比例</label><div>${field("rateBase", select(RR.commissionRates, null, r.rate.base || "5%"))}</div>
        <label>阶梯抽佣</label><div>${field("rateStair", select(["无", "满50万→4%", "满100万→4%", "满100万→3%", "满200万→3%"], null, r.rate.stair || "满100万→4%"))}</div>
      </div><div class="action-bar">${btn("保存抽佣设置")}</div>`,
      bill: `<table class="data-table"><thead><tr><th>抽佣单号</th><th>品牌</th><th>季节</th><th>基数</th><th>比例</th><th>抽佣额</th><th>状态</th></tr></thead>
        <tbody>${r.bills.map(b => `<tr><td>${b.id}</td><td>${b.brand}</td><td>${b.season}</td><td>${Store.money(b.base)}</td><td>${b.rate}</td><td>${Store.money(b.amount)}</td><td><span class="badge">${b.status}</span></td></tr>`).join("")}</tbody></table>`,
      invoice: `<table class="data-table"><thead><tr><th>类型</th><th>品牌</th><th>金额</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${r.invoices.map(i => `<tr data-brand="${i.brand}" data-type="${i.type}"><td>${i.type}</td><td>${i.brand}</td><td>${Store.money(i.amount)}</td><td>${i.status}</td>
            <td>${i.status === "待开" ? link("处理", "process-invoice") : link("下载", "download:抽佣发票")}</td></tr>`).join("")}
        </tbody></table>`,
      balance: `<table class="data-table"><thead><tr><th>品牌</th><th>买手</th><th>挂帐余额</th><th>操作</th></tr></thead>
        <tbody>${r.balances.map(b => `<tr data-brand="${b.brand}" data-store="${b.store}"><td>${b.brand}</td><td>${b.store}</td><td>${Store.money(b.amount)}</td><td>${link("冲销", "clear-balance")}</td></tr>`).join("")}</tbody></table>`,
      payinfo: `<div class="form-grid">
        <label>品牌</label><div>${field("payBrand", select(RR.brands.map(b => b.name), null, r.payinfo.brand))}</div>
        <label>收款账户</label><div>${field("payAccount", input("", r.payinfo.account))}</div>
        <label>开户行</label><div>${field("payBank", input("", r.payinfo.bank))}</div>
        <label>账号</label><div>${field("payNo", input("", r.payinfo.no))}</div>
      </div><div class="action-bar">${btn("保存付款信息")}</div>`
    };
    return `${subTitle("对账管理")}
      <div class="note">需求：抽佣比例/阶梯、品牌付款信息、抽佣单、代/抽发票、挂帐余额。</div>
      <div class="tabs">${tabs.map(([id, lab]) =>
        `<button class="${tab === id ? "on" : ""}" data-recon="${id}">${lab}</button>`
      ).join("")}</div>
      ${bodies[tab]}`;
  }

  function pageShip() {
    /* 原站发货入口先是品牌列表（edit_boduan）；原型保留发货单明细能力 */
    const mode = Store.db.ui.shipMode || "list";
    if (mode !== "orders") {
      return `<div class="boduan-container ship-brand-2col">
        ${subTitle("品牌管理")}
        <div class="edit_boduan">
          <div class="items head_items"><div class="item_boduan-row"><h4>品牌名称</h4><h4>设置</h4></div></div>
          <div class="edit_boduan-list">
            ${RR.brands.map(b => `
              <div class="item uk-flex-nowrap">
                <div class="g-name"><h4>${b.name}</h4></div>
                <h4><a href="javascript:;" data-act="ship-brand:${b.name}">设置发货</a></h4>
              </div>`).join("")}
          </div>
        </div>
      </div>`;
    }
    return `${subTitle("发货管理")}
      <div class="action-bar"><a href="javascript:;" class="oto_btn" data-act="ship-back">返回品牌列表</a></div>
      ${filterPanel([
        ["订单号", input()],
        ["品牌", select(RR.brands.map(b => b.name))],
        ["状态", select(["待发货", "部分发货", "已发货"])],
        ["物流单号", input()]
      ])}
      <table class="data-table">
        <thead><tr><th>发货单号</th><th>订单</th><th>品牌</th><th>店铺</th><th>物流单号</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          ${Store.db.shipments.map(sh => `<tr>
            <td>${sh.id}</td><td>${sh.orderId}</td><td>${sh.brand}</td><td>${sh.store}</td>
            <td>${field("track-" + sh.id, input("SF…", sh.tracking || ""))}</td>
            <td><span class="badge">${sh.status}</span></td>
            <td class="ops">
              <a href="javascript:;" data-go="ship-detail" data-ship="${sh.id}">编辑发货内容</a>
              <a href="javascript:;" data-act="ship-confirm" data-ship="${sh.id}">确认发货</a>
            </td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  }

  function pageShipDetail() {
    const sh = state.selectedShip || Store.db.shipments[0];
    return `${subTitle("发货明细")}
      <div class="detail-sticky">
        <strong>${sh.id}</strong>
        <span>订单 ${sh.orderId}</span>
        <span>${sh.brand} · ${sh.store}</span>
      </div>
      <table class="data-table" id="ship-lines">
        <thead><tr><th>SKU</th><th>尺码</th><th>应发</th><th>实发</th><th>差额</th></tr></thead>
        <tbody>
          ${(sh.lines || []).map((l, i) => `<tr data-idx="${i}">
            <td>${l.sku}</td><td>${l.size}</td><td>${l.should}</td>
            <td>${field("actual-" + i, input("", String(l.actual)))}</td>
            <td>${Math.max(0, Number(l.should) - Number(l.actual))} → 转余额</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <div class="form-grid" style="margin-top:16px">
        <label>物流单号</label><div>${field("tracking", input("", sh.tracking || ""))}</div>
        <label>发货备注</label><div>${field("shipNote", input("", sh.note || ""))}</div>
      </div>
      <div class="action-bar">${btn("保存发货明细")}${btn("确认发货并回写余额", "btn-outline")}</div>`;
  }

  function pageContractPreview() {
    return `${subTitle("合同预览 / 生成")}
      <div class="note">企业信息与公章自动取自品牌资料（收款设置中的合同公章）。</div>
      <div class="brand_goodsFilter" style="min-height:320px;line-height:1.9">
        <strong>经销合同 · 2026SS</strong><br/><br/>
        甲方：JUNLI<br/>
        乙方：B1OCK<br/>
        关联订单：ORD-20260319-088<br/>
        合同类型：经销 · 发货周期：45-60天<br/>
        授权期：2026-03-01 ~ 2026-09-30<br/><br/>
        <div style="width:120px;height:120px;border:1px dashed #999;display:flex;align-items:center;justify-content:center;color:#999">公章</div>
      </div>
      <div class="action-bar">${btn("确认生成")}${btn("下载 PDF", "btn-outline")}${btn("返回订单", "btn-outline")}</div>`;
  }

  function pageOCPreview() {
    return `${subTitle("OC 快速生成")}
      <div class="note">需求强调：OC 需快速生成及下载；含企业信息 + 商品信息及图片。</div>
      <div class="brand_goodsFilter">
        <div style="display:flex;justify-content:space-between;margin-bottom:16px">
          <div><strong>OC-20260319-088</strong><div style="color:#666;font-size:13px">JUNLI · B1OCK · 2026SS</div></div>
          <div class="brand-logo" style="width:64px;height:64px">OC章</div>
        </div>
        <table class="data-table">
          <thead><tr><th>图</th><th>SKU</th><th>款式</th><th>数量</th><th>单价</th></tr></thead>
          <tbody>
            <tr><td><div class="thumb ph" style="width:48px;height:60px">IMG</div></td><td>JL26SS001</td><td>羊毛大衣</td><td>6</td><td>3,960.00</td></tr>
          </tbody>
        </table>
      </div>
      <div class="action-bar">${btn("快速生成并下载")}${btn("仅预览", "btn-outline")}</div>`;
  }

  function pageIntent() {
    return `${subTitle("意向管理")}
      <div class="note">品牌审核买手是否可查看本品牌商品</div>
      <table class="data-table">
        <thead><tr><th>店铺名</th><th>申请品牌</th><th>申请日期</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>${Store.db.intentions.map(i => `<tr>
          <td>${i.store}</td><td>${i.brand}</td><td>${i.date}</td>
          <td><span class="badge ${i.status === "已通过" ? "green" : i.status === "已拒绝" ? "red" : ""}">${i.status}</span></td>
          <td class="ops">${i.status === "待审核" ? `${btn("通过", "btn-outline btn-sm")}${btn("拒绝", "btn-outline btn-sm")}` : "—"}</td>
        </tr>`).join("")}</tbody>
      </table>`;
  }

  function pageBuyerList() {
    /* 原站：h1.title_underline 买手列表；级别 select + 手机/店/省/市/品牌 text；invite 行列表；无侧栏 */
    const tab = (Store.db.ui.buyerFilter && Store.db.ui.buyerFilter.levelTab) || "全部";
    const f = Store.db.ui.buyerFilter || {};
    let all = Store.db.buyers.slice();
    if (tab === "待审核") all = all.filter(b => b.status === "待审核");
    else if (tab !== "全部") all = all.filter(b => b.level === tab);
    const phone = f.phone || "";
    const name = f.keyword || f.name || "";
    const province = f.province || "";
    const city = f.city || "";
    const brand = f.brand || "";
    if (phone) all = all.filter(b => (b.phone || "").includes(phone));
    if (name) all = all.filter(b => b.name.includes(name));
    if (province) all = all.filter(b => (b.province || b.city || "").includes(province));
    if (city) all = all.filter(b => (b.city || "").includes(city));
    if (brand) all = all.filter(b => (b.brands || []).join(",").includes(brand) || true);
    const list = pageSlice(all, 10);
    return `<div class="public-main-container buyer-list-page">
      <h1 class="title_underline">买手列表</h1>
      <div class="ots_order-form ots_order-managegoods uk-margin-large-top">
        <div><label>级别</label>${field("buyerLevel", select(["全部", "A", "B", "C", "D", "待审核"], null, tab))}</div>
        <div><label>手机号</label>${field("buyerPhone", input("", phone))}</div>
        <div><label>店铺名</label>${field("buyerName", input("", name))}</div>
        <div><label>省</label>${field("buyerProvince", input("", province))}</div>
        <div><label>市</label>${field("buyerCity", input("", city))}</div>
        <div><label>在售品牌</label>${field("buyerBrand", input("", brand))}</div>
      </div>
      <div class="submit_area uk-margin-small-top">
        <button type="button" class="ots_order-btn" data-act="buyer-search">搜索</button>
      </div>
      <div class="submit_area uk-margin-small-top">
        <a href="javascript:;" class="ots_order-btn" data-go="buyer-add">添加买手</a>
      </div>
      <div class="ots_order-invite-detail">
        <div class="items">
          <div class="item invite_title">
            <div>店铺名</div><div>手机号</div><div>店铺级别</div><div>巡店图</div><div>操作</div>
          </div>
          ${list.map(b => `
            <div class="item">
              <div>${b.name}<br/>${b.province || ""}<br/>${b.city || ""}</div>
              <div>${b.phone}</div>
              <div class="level_detail">${b.status === "待审核" ? "待审核" : b.level}</div>
              <div><div class="thumb ph" style="width:48px;height:36px">图</div></div>
              <div class="ops">
                ${b.status === "待审核" ? `<a href="javascript:;" data-act="approve">通过</a><a href="javascript:;" data-act="reject">取消权限</a>` : ""}
                <a href="javascript:;" data-go="buyer-balance">余额管理</a>
                <a href="javascript:;" data-go="buyer-store">查看店铺资料</a>
                <a href="javascript:;" data-go="buyer-invoice">修改发票信息</a>
                <a href="javascript:;" data-go="buyer-address">修改地址</a>
                <a href="javascript:;" data-go="buyer-edit">编辑资料</a>
                <a href="javascript:;" data-go="buyer-sub">查看子店铺信息</a>
                <a href="javascript:;" data-go="buyer-add-brand">添加品牌</a>
                <a href="javascript:;" data-go="buyer-appoint">添加预约</a>
              </div>
            </div>`).join("") || '<div class="item"><div>暂无买手</div></div>'}
        </div>
      </div>
      ${pagination(all.length, 10)}
    </div>`;
  }

  function pageBuyerBalance() {
    const rows = [];
    Store.db.buyers.forEach(b => {
      Object.entries(b.balances || {}).forEach(([brand, amt]) => rows.push({ name: b.name, brand, amt }));
      if (!b.balances || !Object.keys(b.balances).length) rows.push({ name: b.name, brand: "JUNLI", amt: 0 });
    });
    return `${subTitle("余额管理")}
      <div class="note">实发少于应发时，差额转为品牌账户余额，可抵扣下次订单；支持手动编辑</div>
      <table class="data-table">
        <thead><tr><th>买手店铺</th><th>品牌</th><th>余额(CNY)</th><th>操作</th></tr></thead>
        <tbody>
          ${rows.map((r, i) => `<tr data-buyer="${r.name}" data-brand="${r.brand}">
            <td>${r.name}</td><td>${r.brand}</td>
            <td>${field("bal-" + i, input("", String(r.amt)))}</td>
            <td>${btn("保存", "btn-outline btn-sm", "save-balance:" + i)}</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  }

  function simpleFormPage(title, note, fields) {
    return `<div class="sub_title"><h4>${title}</h4></div>
      ${note ? `<div class="note">${note}</div>` : ""}
      <div class="form-grid">${fields}</div>
      <div style="margin-top:20px">${btn("保存")}</div>`;
  }

  function pageRoleList() {
    return `${subTitle("角色管理")}
      <div class="note">创建自定义角色；预设角色见下表（需求清单）</div>
      ${btn("创建角色", "btn-outline")}
      <table class="data-table" style="margin-top:16px">
        <thead><tr><th>角色</th><th>品牌范围</th><th>权限概要</th><th>操作</th></tr></thead>
        <tbody>${RR.roles.map(r => `<tr>
          <td>${r.name}</td><td>${r.scope}</td><td>${r.perms}</td>
          <td><a href="javascript:;" data-go="role-perm" data-role-name="${r.name}">配置权限</a></td>
        </tr>`).join("")}</tbody>
      </table>`;
  }

  function pageRolePerm() {
    const perms = ["商品管理", "订单确认", "定金确认", "意向审核", "买手管理", "发票", "结佣", "财务审核"];
    const roleName = state.selectedRole || (Store.db.roles[0] && Store.db.roles[0].name);
    const role = Store.db.roles.find(r => r.name === roleName) || Store.db.roles[0];
    return `${subTitle("权限管理")}
      <div class="note">为指定角色开关功能权限</div>
      <div class="form-grid">
        <label>选择角色</label><div>${field("roleName", select(Store.db.roles.map(r => r.name), null, role.name))}</div>
      </div>
      <table class="data-table" style="margin-top:16px">
        <thead><tr><th>功能</th><th>开启</th></tr></thead>
        <tbody>${perms.map(p => `<tr><td>${p}</td><td><input type="checkbox" data-perm="${p}" ${role.flags && role.flags[p] ? "checked" : ""} style="width:auto;height:auto" /></td></tr>`).join("")}</tbody>
      </table>
      <div style="margin-top:16px">${btn("保存权限")}</div>`;
  }

  function buyerCatSide(extra = "") {
    /* 原站：public_left > filter_list.filter_type > sub_title.line_circle 分类筛选 > ul.uk-tab-right */
    const cat = Store.db.buyerSession.cat || "全部";
    const cats = ["全部", "女装", "男装", "男女装", "配饰"];
    return `<div class="public_left-container buyer-cat-side">
      <div class="filter_list filter_type">
        <div class="sub_title line_circle">分类筛选</div>
        <ul class="uk-tab-right items">
          ${cats.map(c => `<li class="${cat === c ? "uk-active" : ""}"><a href="javascript:;" data-act="cat:${c}">${c}</a></li>`).join("")}
        </ul>
        ${extra}
      </div>
    </div>`;
  }

  function floatSelTab(label) {
    /* 原站：side_action > 我的选款单 / 我的补货单 */
    syncBuyerCart();
    const lab = label || (state.page === "buyer-replenish" ? "我的补货单" : "我的选款单");
    return `<div class="side_action float-sel-tab">
      <ul><li><div data-toggle-cart>${lab}${state.cart.length ? `<span class="dot">${state.cart.length}</span>` : ""}</div></li></ul>
    </div>`;
  }

  function pageBuyerHome() {
    const brands = Store.buyerBrands(Store.db.buyerSession.cat || "全部");
    syncBuyerCart();
    /* 原站：brand_list-container > left 分类 + right brand_list grid item_inner */
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container brand_list-container">
        ${buyerCatSide()}
        <div class="public_right-container">
          <div class="mob-sub_title"><h5>品牌列表</h5></div>
          <div class="brand_list">
            <div class="items uk-grid-medium brand-grid-live">
              ${brands.map(b => {
                const noAuth = b.accept === false;
                return `<div class="item">
                  <div class="item_inner">
                    ${noAuth ? '<div class="accept_state">暂无权限</div>' : ""}
                    <a href="javascript:;" data-go="buyer-brand" data-brand="${b.name}">
                      <div class="brand-logo-rect">${b.name}</div>
                      <p>${b.name}</p>
                    </a>
                    ${noAuth ? '<div class="get_accept" data-act="toast:已提交权限申请">申请权限</div>' : ""}
                  </div>
                </div>`;
              }).join("") || '<div class="note">该分类下暂无品牌</div>'}
            </div>
          </div>
        </div>
      </div>
      <div class="public_side_bg"></div>
      ${floatSelTab()}
    </div>`;
  }

  function pageBuyerBrand() {
    /* 原站 /goods/list/{nid}：left 分类筛选 + brand_info + sku_box + season_filter + goods_list item_inner */
    const brand = state.selectedBrand;
    const bmeta = RR.brands.find(b => b.name === brand) || { about: "", style: "" };
    const s = Store.db.buyerSession;
    const seasons = Store.buyerSeasons(brand);
    /* 切品牌后若当前季节无货，落到该品牌最近有货季（避免空列表缺 brand_like/item_inner） */
    if (!s.season || s.season === "全部" || (seasons.length && !seasons.includes(s.season))) {
      if (seasons[0]) { s.season = seasons[0]; Store.persist(); }
    }
    let list = Store.buyerGoods(brand);
    if (!list.length && seasons.length) {
      for (const sea of seasons) {
        s.season = sea;
        list = Store.buyerGoods(brand);
        if (list.length) { Store.persist(); break; }
      }
    }
    syncBuyerCart();
    state.cartBrandFilter = brand;
    const imageView = `<div class="items uk-grid-medium product-grid">
        ${list.map(g => `
          <div class="item">
            <div class="item_inner">
              <div class="brand_like goods_check ${state.hearts.includes(g.sku) ? "has_checked heart_stay" : "no_checked"}" data-heart="${g.sku}"><span class="iconfont ${state.hearts.includes(g.sku) ? "ots_icon-heart" : "ots_icon-heart-o"}"></span></div>
              <a href="javascript:;" data-go="buyer-detail" data-sku="${g.sku}">
                <div class="cover">LOOK</div>
                <p>${g.title}</p>
                <p>${g.sku}</p>
                <p>${g.code || ""}</p>
                <h2>¥<span>${g.wholesale}</span></h2>
              </a>
            </div>
          </div>`).join("") || '<div class="note">无匹配商品</div>'}
      </div>`;
    const codeView = `<div class="items uk-grid-small code-grid-live">
        ${list.map(g => `
          <div class="item item_small">
            <div class="item_inner item_sku">
              <div class="brand_like goods_check ${state.hearts.includes(g.sku) ? "has_checked" : "no_checked"}" data-heart="${g.sku}"><span class="iconfont ${state.hearts.includes(g.sku) ? "ots_icon-heart" : "ots_icon-heart-o"}"></span></div>
              <div class="sku_item" data-go="buyer-detail" data-sku="${g.sku}"><p></p><p>${g.code || g.sku.slice(-3)}</p></div>
            </div>
          </div>`).join("") || '<div class="note">无匹配商品</div>'}
      </div>`;
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container brand_list-container">
        ${buyerCatSide(`<div style="margin-top:16px"><a href="javascript:;" data-act="go:buyer-home">返回品牌列表</a></div>`)}
        <div class="public_right-container">
          <div class="mob-sub_title"><h5>商品列表</h5></div>
          <div class="brand_info">
            <div class="brand-logo-rect lg">${brand}</div>
            <div class="brand_brief">
              <p>${(bmeta.about || (bmeta.style + " · " + (bmeta.crowd || ""))).slice(0, 180)}${(bmeta.about || "").length > 180 ? "…" : ""}</p>
              <a href="javascript:;" data-go="buyer-brand-about">查看全部</a>
            </div>
          </div>
          <div class="sku_box">
            <button type="button" class="uk-button uk-button-link icon-btn ${state.viewMode === "code" ? "on" : ""}" data-view="code" title="编码视图"><span class="filter_icon view-list ${state.viewMode === "code" ? "active" : ""}"></span></button>
            <button type="button" class="uk-button uk-button-link icon-btn ${state.viewMode === "image" ? "on" : ""}" data-view="image" title="图片视图"><span class="filter_icon view-thumbs ${state.viewMode === "image" ? "active" : ""}"></span></button>
          </div>
          <div class="brand_list goods_list">
            <div class="season_filter uk-margin-medium-bottom">
              <ul>${seasons.map(sea => `<li class="${s.season === sea ? "uk-active" : ""}"><a href="javascript:;" data-act="season:${sea}">${sea}</a></li>`).join("")}</ul>
            </div>
            <div class="searchCarry">
              <div class="search_box">
                ${field("buyerSearch", input("search", s.search || ""))}
                <button type="button" data-act="buyer-filter" title="搜索"><span class="iconfont ots_icon-search"></span></button>
              </div>
              <div class="carry_filter">
                <div><input class="uk-checkbox" type="checkbox" id="carry" data-field="buyerCarry" ${s.carryOnly ? "checked" : ""} /><label for="carry">Carry Over</label></div>
              </div>
            </div>
            ${state.viewMode === "code" ? codeView : imageView}
          </div>
        </div>
      </div>
      ${floatSelTab()}
    </div>`;
  }

  function cartDrawer() {
    if (!state.cartOpen) return "";
    syncBuyerCart();
    const brand = state.cartBrandFilter || state.selectedBrand || (Store.db.buyerSession.selections[0] && Store.db.buyerSession.selections[0].brand) || "";
    const draft = Store.draftQuote(brand);
    const q = draft.quote;
    const lines = draft.lines;
    /* 原站：balck_bg + selection_side-container */
    return `<div class="rr-drawer-root">
      <div class="balck_bg rr-drawer-mask" data-toggle-cart></div>
      <div class="selection_side-container active rr-drawer rr-drawer-wide" role="dialog" aria-label="快捷选款单">
        <div class="side_cancel" data-toggle-cart title="关闭"><span class="close-x"></span></div>
        <div class="selection_detail-list selection_side">
          <div class="sub_title">${state.page === "buyer-replenish" ? "我的补货单" : "我的选款单"}(件数：${q.pieces},SKU数：${draft.items.length})</div>
          <div class="selection_brand">
            <div class="brand-logo-rect" style="width:48px;height:48px">${brand || "—"}</div>
            <h6>${brand || "未选品牌"}</h6>
            <div>总吊牌价:¥<h4>${Store.money(q.retail)}</h4></div>
            <div>总批发价 <span>¥${Store.money(q.wholesale)}</span></div>
          </div>
          ${(q.types || []).map(t => `<p class="drawer-disc">${t.name} 已选${t.pieces} · 已享受${t.discountLabel}${t.nextGap > 0 ? ` · 距离${t.nextDiscountLabel}还差${Store.money(t.nextGap)}元(吊牌价)` : ""}</p>`).join("")}
          <div class="rr-drawer-body">
            ${renderSelectionLines(lines, { draft: true }) || '<p style="color:#999;padding:24px 0;text-align:center">暂无选款，请先点红心</p>'}
          </div>
          <div class="rr-drawer-foot">
            <a href="javascript:;" class="oto_btn" data-act="go:buyer-selection">查看选款单</a>
            ${brand ? `<a href="javascript:;" class="oto_btn" data-act="buyer-confirm-one-brand" data-brand="${brand}">确认本品牌</a>` : ""}
          </div>
        </div>
      </div>
    </div>`;
  }

  function pageBuyerSelection() {
    const store = Store.db.buyerSession.store;
    const list = Store.db.selections.filter(s => s.store === store || true);
    const hearts = Store.db.buyerSession.selections;
    /* 原站：selection-container > selection_list > item > selection_info */
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container selection-container">
        <div class="public_left-container"><div class="filter_list filter_type"></div></div>
        <div class="public_right-container">
          <div class="addr-container selection_list-container">
            <div class="sub_title">选款单</div>
            ${hearts.length ? `<div class="action-bar">${btn("按品牌确认选款单", "btn-primary", "buyer-confirm-hearts")}</div>` : ""}
            <div class="addr_list selection_list">
              <div class="items">
                ${list.map(s => `
                  <div class="item">
                    <div class="selection_info">
                      <h6>${s.createdAt || s.date || "—"}</h6>
                      <h6>${s.season}</h6>
                      <div class="selection_brand">
                        <div class="brand-logo-rect" style="width:40px;height:40px">${(s.brand || "").slice(0, 4)}</div>
                        <h6>${s.brand}&nbsp;</h6>
                      </div>
                      <div class="selection_price">
                        <h2 style="font-size:14px">吊牌价:¥${s.retail || s.amount}</h2>
                        <p>¥${s.amount}</p>
                        <p>${s.skus} SKU</p>
                      </div>
                      <div class="total_num"><p>总数:${s.pieces}</p></div>
                      <div class="selection_action">
                        ${s.locked ? "已取消" : `
                          <a href="javascript:;" data-go="buyer-selection-edit" data-sel="${s.id}">修改</a>
                          <span>|</span>
                          <a href="javascript:;" data-act="download:选款单">下载</a>
                          <span>|</span>
                          <a href="javascript:;" data-act="buyer-confirm-sel" data-sel="${s.id}">确认订单</a>`}
                      </div>
                    </div>
                  </div>`).join("") || '<div class="note">暂无选款单</div>'}
              </div>
            </div>
          </div>
        </div>
      </div>
      ${floatSelTab()}
    </div>`;
  }

  function pageBuyerSelectionEdit() {
    const s = state.selectedSel || Store.db.selections[0];
    return renderSelectionWorkbench(s, {
      backAct: "go:buyer-selection",
      showGen: false,
      showConfirm: true,
      showCancel: false
    });
  }

  function pageBuyerOrders() {
    const tab = Store.db.buyerSession.orderTab || "全部";
    const list = Store.buyerOrders(tab);
    /* 原站：order-container > left 我的订单 tabs + order_list item */
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container order-container">
        <div class="public_left-container">
          <div class="filter_list filter_type">
            <div class="sub_title line_circle">我的订单</div>
            <ul class="uk-tab-right items">
              ${["全部", "已完成", "未完成"].map(t =>
                `<li class="${tab === t ? "uk-active" : ""}"><a href="javascript:;" data-tabsoft data-order-tab="${t}">${t}</a></li>`
              ).join("")}
            </ul>
          </div>
        </div>
        <div class="public_right-container">
          <div class="order_list-container">
            <div class="sub_title"><h4>我的订单</h4></div>
            <div class="order_list">
              <div class="items">
                ${list.map(o => `
                  <div class="item">
                    <div class="order_info">
                      ${o.type === "补货单" ? '<div class="order_type-add"><p>补货单</p></div>' : ""}
                      <h6>订单编号:${o.id} <span></span> 下单时间:${o.createdAt || "—"} <span></span> 订货季:${o.season}</h6>
                      <div class="order_brand">
                        <div class="brand-logo-rect" style="width:40px;height:40px">${(o.brand || "").slice(0, 4)}</div>
                        <h6>${o.brand}&nbsp;</h6>
                      </div>
                      <div class="order_state"><p>${o.status}</p><p>¥${o.amount}</p></div>
                      <div class="order_action ops">
                        <a href="javascript:;" class="oto_btn" data-go="buyer-order-detail" data-oid="${o.id}">查看</a>
                        <a href="javascript:;" data-act="download:订单Excel">下载</a>
                        ${o.status.includes("未确认") || o.status.includes("驳回")
                          ? `<a href="javascript:;" data-go="buyer-selection-edit" data-sel="${o.fromSelection || ""}">修改</a>` : ""}
                        <a href="javascript:;" data-act="buyer-confirm-order" data-oid="${o.id}">确认提交</a>
                      </div>
                    </div>
                  </div>`).join("") || '<div class="note">暂无订单</div>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function pageBuyerOrderDetail() {
    /* 原站订单详情沿用 order-container 壳 + order_info / order_action / 进度 */
    const o = state.selectedOrder || Store.db.orders[0];
    const steps = Store.ORDER_FLOW.filter(s => s !== "已完成");
    const idx = Math.max(0, steps.findIndex(s => o.status === s || o.status.includes(s.slice(0, 4))));
    const lines = o.lines || [];
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container order-container order_detail-container">
        <div class="public_left-container">
          <div class="filter_list filter_type">
            <div class="sub_title line_circle">我的订单</div>
            <ul class="uk-tab-right items">
              <li><a href="javascript:;" data-go="buyer-orders">返回列表</a></li>
            </ul>
          </div>
        </div>
        <div class="public_right-container">
          <div class="order_list-container">
            <div class="sub_title"><h4>订单详情</h4></div>
            <div class="order_list">
              <div class="item">
                <div class="order_info">
                  ${o.type === "补货单" ? '<div class="order_type-add"><p>补货单</p></div>' : ""}
                  <h6>订单编号:${o.id} <span></span> 下单时间:${o.createdAt || "—"} <span></span> 订货季:${o.season}</h6>
                  <div class="order_brand">
                    <div class="brand-logo-rect" style="width:40px;height:40px">${(o.brand || "").slice(0, 4)}</div>
                    <h6>${o.brand}&nbsp;</h6>
                  </div>
                  <div class="order_state"><p>${o.status}</p><p>¥${o.amount}</p></div>
                  <div class="order_action ops">
                    <a href="javascript:;" data-act="download:订单Excel">下载订单</a>
                    ${o.status.includes("未确认") || o.status.includes("驳回")
                      ? `<a href="javascript:;" data-go="buyer-selection-edit" data-sel="${o.fromSelection || ""}">修改</a>` : ""}
                    <a href="javascript:;" class="oto_btn" data-act="buyer-confirm-order" data-oid="${o.id}">确认提交</a>
                  </div>
                </div>
              </div>
            </div>
            <div class="order_progress">
              <div class="sub_title">订单进度</div>
              <div class="timeline">
                ${steps.map((s, i) => `
                  <div class="timeline-item ${i < idx ? "done" : ""} ${i === idx ? "on" : ""}">
                    <div class="timeline-dot"></div>
                    <div><strong>${s}</strong><div style="color:#999;font-size:12px">${i <= idx ? "已到达" : "未到达"}</div></div>
                  </div>`).join("")}
              </div>
            </div>
            <table class="data-table">
              <thead><tr><th>SKU</th><th>款式</th><th>数量</th><th>金额</th></tr></thead>
              <tbody>
                ${lines.map(l => {
                  const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
                  return `<tr><td>${l.sku}</td><td>${l.title}</td><td>${qty}</td><td>${Store.money(qty * Number(l.price || 0) * Number(l.discount || 1))}</td></tr>`;
                }).join("") || "<tr><td colspan=4>无明细</td></tr>"}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>`;
  }

  function pageCoverage() {
    const rows = [
      ["登录（身份分流）", "有", "有", "闭合", "ok"],
      ["品牌规则配置", "有", "有", "字段已对齐现网折扣结构", "ok"],
      ["商品列表/增删改/CO", "有", "有", "闭合（示意）", "ok"],
      ["选款单详情工作台(#8/#14)", "有", "有", "P0：悬浮折扣条/改数量/增删款", "ok"],
      ["订单/补货卡片(#9)", "有", "有", "P0：独立卡片+右侧操作", "ok"],
      ["买手选货/快捷选款(#12/#13)", "有", "有", "P0：左分类/编码视图/快捷选款单", "ok"],
      ["订单全操作链", "有（深）", "有", "已补子流程面板", "ok"],
      ["合同/OC", "弱/内嵌", "要求独立能力", "已补预览生成页", "partial"],
      ["对账管理", "有入口", "有", "Tab 内容已补", "ok"],
      ["发货管理", "现网空页", "有", "按需求补明细", "partial"],
      ["角色权限", "现网未见", "有", "原型增量页", "partial"],
      ["买手选货/双视图/红心", "未用买手号验证", "有", "已补编码视图+悬浮选款单", "partial"],
      ["买手选款单修改/订单进度", "—", "有", "已补", "ok"],
      ["LOOK / 添加品牌", "有入口", "待定/不清", "保留入口+说明", "miss"],
      ["金蝶对接", "无页", "有", "不做 UI", "miss"]
    ];
    return `${subTitle("覆盖核对（实事求是）")}
      <div class="note">结论：信息架构基本闭合；业务操作闭环本次已补强，但<strong>并非 100%</strong>。金蝶、LOOK、添加品牌、买手现网对照仍开放。</div>
      <table class="data-table gap-table">
        <thead><tr><th>能力</th><th>现网</th><th>需求</th><th>原型现状</th><th>状态</th></tr></thead>
        <tbody>${rows.map(r => `<tr>
          <td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td>
          <td class="${r[4]}">${r[4] === "ok" ? "闭合" : r[4] === "partial" ? "部分" : "未闭合"}</td>
        </tr>`).join("")}</tbody>
      </table>
      <p style="color:#666;font-size:13px;margin-top:16px">详细说明见仓库 <code>COVERAGE.md</code>。</p>`;
  }

  function pageGoodsCarry() {
    return `${subTitle("设置 Carry Over")}
      <div class="note">每季可勾选延续款；保存后买手端可筛 Carry Over</div>
      <table class="data-table">
        <thead><tr><th>勾选</th><th>SKU</th><th>款式</th><th>品牌</th><th>季节</th></tr></thead>
        <tbody>
          ${Store.db.goods.map(g => `<tr>
            <td><input type="checkbox" data-carry-sku="${g.sku}" ${g.carry ? "checked" : ""} style="width:auto;height:auto" /></td>
            <td>${g.sku}</td><td>${g.title}</td><td>${g.brand}</td><td>${g.season}</td>
          </tr>`).join("")}
        </tbody>
      </table>
      <div class="action-bar">${btn("保存", "btn-primary", "save-carry")}</div>`;
  }

  function pageBuyerAdd() {
    return `${subTitle("添加买手")}
      <div class="form-grid">
        <label>店铺名</label><div>${field("buyerName", input())}</div>
        <label>手机号</label><div>${field("buyerPhone", input())}</div>
        <label>城市</label><div>${field("buyerCity", select(RR.cities, null, "上海市 / 上海市"))}</div>
        <label>级别</label><div>${field("buyerLevel", select(["A", "B", "C"], null, "B"))}</div>
      </div>
      <div style="margin-top:20px">${btn("保存", "btn-primary", "add-buyer")}</div>`;
  }

  function pageAccount() {
    return `${subTitle("账号管理")}
      <div class="form-grid">
        <label>登录手机</label><div>13800000000</div>
        <label>角色</label><div>${state.portal === "brand" ? "品牌管理员" : "高级管理员"}</div>
        <label>修改手机</label><div>${input()}</div>
        <label></label><div>${btn("保存", "btn-outline")}</div>
      </div>`;
  }

  function readFilterPanel() {
    const panel = app.querySelector(".brand_goodsFilter, .filter-panel");
    if (!panel) return {};
    const vals = {};
    /* 原站 item_inner：label + 控件同级；旧版 filter-label + 下一格 */
    panel.querySelectorAll(".item_inner").forEach(box => {
      const lab = box.querySelector("label");
      const ctrl = box.querySelector("input,select");
      const key = lab ? (lab.textContent || "").trim().replace(/[:：]$/, "") : "";
      if (key && ctrl) vals[key] = ctrl.value;
    });
    panel.querySelectorAll(".filter-label").forEach(lab => {
      const key = (lab.textContent || "").trim().replace(/[:：]$/, "");
      const ctrl = lab.nextElementSibling && lab.nextElementSibling.querySelector("input,select");
      if (key && ctrl) vals[key] = ctrl.value;
    });
    return vals;
  }

  function applyGoodsFilterFromDom() {
    const v = readFilterPanel();
    Store.setGoodsFilter({
      carry: v["Carry Over"] || "全部",
      linesheet: v["LineSheet"] || "",
      sku: v["SKU"] || "",
      cat: v["品类"] || "全部",
      subcat: v["二级品类"] || "全部",
      brand: v["选择品牌"] || "全部",
      title: v["款式名称"] || "",
      season: v["选择季节"] || "全部"
    });
  }

  function applyOrderFilterFromDom() {
    const v = readFilterPanel();
    Store.setOrderFilter({
      brand: v["品牌"] || v["选择品牌"] || "全部",
      season: v["季节"] || v["选择季节"] || "全部",
      type: v["订单类型"] || "全部",
      status: v["订单状态"] || v["状态"] || "全部",
      store: v["店铺"] || v["店铺名"] || "",
      id: v["订单号"] || ""
    });
  }

  function applySelectionFilterFromDom() {
    const v = readFilterPanel();
    Store.db.ui.selectionFilter = {
      brand: v["选择品牌"] || v["品牌"] || "全部",
      season: v["季节"] || "全部",
      store: v["店铺名"] || ""
    };
    Store.persist();
  }

  function downloadCsv(name, rows) {
    Store.downloadText(name, "\uFEFF" + rows.join("\n"));
  }

  function handleAct(act, el) {
    if (!act) return;
    if (act.startsWith("go:")) { go(act.slice(3)); return; }
    if (act.startsWith("toast:")) { toast(act.slice(6)); return; }

    if (act.startsWith("cat:")) {
      Store.db.buyerSession.cat = act.slice(4);
      Store.persist();
      render();
      toast(`分类：${act.slice(4)}`);
      return;
    }

    if (act.startsWith("download:")) {
      const what = act.slice(9);
      if (what.includes("选款单") || what === "选款单") {
        const list = Store.filteredSelections();
        downloadCsv("selections.csv", ["单号,品牌,店铺,季节,金额,状态"].concat(list.map(s => `${s.id},${s.brand},${s.store},${s.season},${s.amount},${s.status}`)));
      } else if (what.includes("订单")) {
        downloadCsv("orders.csv", ["订单号,品牌,类型,店铺,金额,状态"].concat(Store.db.orders.map(o => `${o.id},${o.brand},${o.type},${o.store},${o.amount},${o.status}`)));
      } else if (what.includes("预约")) {
        downloadCsv("appointments.csv", ["品牌,店铺,联系人,手机,时间,季节"].concat(Store.db.appointments.map(a => `${a.brand},${a.store},${a.contact},${a.phone},${a.date},${a.season}`)));
      } else if (what.includes("模板")) {
        downloadCsv("goods_template.csv", ["SKU,款式名称,品牌,季节,品类,零售价,订货价,尺寸"]);
      } else if (what.includes("总选款")) {
        downloadCsv("total_selection.csv", ["品牌,季节,SKU数,总件数,总金额"].concat(Store.db.selections.map(s => `${s.brand},${s.season},${s.skus},${s.pieces},${s.amount}`)));
      } else if (what.includes("汇总")) {
        downloadCsv("order_summary.csv", ["品牌,订单数,总金额"].concat(RR.brands.map(b => {
          const os = Store.db.orders.filter(o => o.brand === b.name);
          const sum = os.reduce((a, o) => a + Store.parseMoney(o.amount), 0);
          return `${b.name},${os.length},${Store.money(sum)}`;
        })));
      } else if (what.includes("合同") || what.includes("PDF")) {
        const o = state.selectedOrder || Store.db.orders[0];
        downloadCsv(`contract_${o.id}.txt`, [`合同-关联订单 ${o.id}`, `品牌 ${o.brand}`, `金额 ${o.amount}`]);
      } else if (what.includes("OC")) {
        const o = state.selectedOrder || Store.db.orders[0];
        downloadCsv(`OC_${o.id}.txt`, [`OC-关联订单 ${o.id}`, `品牌 ${o.brand}`]);
      } else {
        downloadCsv(`${what || "export"}.csv`, ["导出内容", what]);
      }
      toast(`已下载：${what}`);
      return;
    }

    if (act.startsWith("upload:")) {
      const brand = (app.querySelector("select") || {}).value || "JUNLI";
      const cat = "女装";
      toast(Store.batchImport(brand, cat, 3));
      render();
      return;
    }

    if (act.startsWith("delete-stair:")) {
      const i = Number(act.split(":")[1]);
      const rules = JSON.parse(JSON.stringify(Store.getDiscountRules()));
      rules.stairs = rules.stairs || [];
      rules.stairs.splice(i, 1);
      Store.saveDiscountRules(rules);
      toast("已删除阶梯");
      render();
      return;
    }
    if (act.startsWith("discount-season:")) {
      Store.setDiscountSeason(act.slice("discount-season:".length));
      toast("已切换季度：" + Store.db.ui.discountSeason);
      render();
      return;
    }
    if (act.startsWith("restock-open:")) {
      const parts = act.split(":");
      Store.db.ui.restockBrand = parts[1];
      Store.db.ui.restockKind = parts[2];
      Store.db.ui.restockSeason = "全部";
      Store.persist();
      render();
      return;
    }
    if (act === "restock-back") {
      Store.db.ui.restockBrand = "";
      Store.db.ui.restockKind = "";
      Store.persist();
      render();
      return;
    }
    if (act.startsWith("restock-season:")) {
      Store.db.ui.restockSeason = act.slice("restock-season:".length);
      Store.persist();
      render();
      return;
    }
    if (act.startsWith("restock-batch:")) {
      const val = act.split(":")[1] === "1";
      toast(Store.batchSetRestock(Store.db.ui.restockBrand, Store.db.ui.restockSeason, Store.db.ui.restockKind, val));
      render();
      return;
    }
    if (act.startsWith("del-size-alias:")) {
      toast(Store.removeSizeAlias(Number(act.split(":")[1])));
      render();
      return;
    }
    if (act.startsWith("add-master:")) {
      const kind = act.split(":")[1];
      const f = readFields();
      const r = Store.addMasterItem(kind, f.masterName);
      toast(r.msg);
      render();
      return;
    }
    if (act.startsWith("del-master:")) {
      const [, kind, id] = act.split(":");
      toast(Store.removeMasterItem(kind, id));
      render();
      return;
    }
    if (act.startsWith("edit-master:")) {
      const parts = act.split(":");
      const kind = parts[1];
      const id = parts.slice(2).join(":");
      let cur = id;
      if (kind === "styles") cur = ((Store.db.stylesMaster.find(x => x.id === id) || {}).name) || id;
      if (kind === "crowds") cur = ((Store.db.crowdsMaster.find(x => x.id === id) || {}).name) || id;
      const name = prompt("修改名称", cur);
      if (name == null) return;
      const r = Store.renameMasterItem(kind, id, name);
      toast(r.msg);
      render();
      return;
    }
    if (act.startsWith("style-expand:")) {
      const sku = act.slice("style-expand:".length);
      Store.db.ui.styleExpand = Store.db.ui.styleExpand === sku ? "" : sku;
      Store.persist();
      render();
      return;
    }
    if (act.startsWith("remove-order-line:")) {
      const i = Number(act.split(":")[1]);
      const o = state.selectedOrder || Store.db.orders[0];
      const lines = (o.lines || []).slice();
      lines.splice(i, 1);
      const r = Store.advanceOrder(o.id, "modify", { lines });
      toast(r.msg);
      state.selectedOrder = Store.db.orders.find(x => x.id === o.id);
      render();
      return;
    }
    if (act.startsWith("delete-sel-line:")) {
      const sku = act.split(":")[1];
      const sel = state.selectedSel || Store.db.selections[0];
      const r = Store.removeSelectionLine(sel.id, sku);
      toast(r.msg);
      state.selectedSel = Store.db.selections.find(x => x.id === sel.id);
      render();
      return;
    }
    if (act.startsWith("delete-draft-line:")) {
      const sku = act.split(":")[1];
      toast(Store.toggleHeart(sku));
      syncBuyerCart();
      render();
      return;
    }
    if (act.startsWith("add-sel-line:")) {
      const sku = act.split(":")[1];
      const sel = state.selectedSel || Store.db.selections[0];
      const r = Store.addSelectionLine(sel.id, sku);
      toast(r.msg);
      state.selectedSel = Store.db.selections.find(x => x.id === sel.id);
      state.selAddOpen = false;
      render();
      return;
    }
    if (act.startsWith("season:")) {
      Store.db.buyerSession.season = act.slice("season:".length);
      Store.persist();
      render();
      return;
    }
    if (act.startsWith("edit-category:")) {
      const name = act.slice("edit-category:".length);
      const cur = (Store.db.categories.find(c => c.name === name) || { children: [] }).children.join(" / ");
      const children = prompt("二级分类（用 / 分隔）", cur);
      if (children != null) toast(Store.saveCategory(name, children.split(/[/／,，]/).map(x => x.trim()).filter(Boolean)));
      render();
      return;
    }
    if (act.startsWith("save-balance:")) {
      const row = el && el.closest("tr");
      const i = act.split(":")[1];
      const f = readFields();
      toast(Store.saveBuyerBalance(row.getAttribute("data-buyer"), row.getAttribute("data-brand"), Store.parseMoney(f["bal-" + i])));
      render();
      return;
    }
    if (act.startsWith("edit-address:")) {
      const i = Number(act.split(":")[1]);
      const addr = Store.db.buyerSession.addresses[i];
      const name = prompt("收货人", addr && addr.name);
      if (name == null) return;
      const phone = prompt("电话", addr && addr.phone);
      const a = prompt("地址", addr && addr.addr);
      Store.db.buyerSession.addresses[i] = { name, phone, addr: a };
      Store.persist();
      toast("地址已更新");
      render();
      return;
    }

    if (act.startsWith("save:")) {
      handleAct("save-context", el);
      return;
    }

    const selId = (el && el.getAttribute("data-sel")) || (state.selectedSel && state.selectedSel.id);
    const orderId = (el && el.getAttribute("data-oid")) || (state.selectedOrder && state.selectedOrder.id);
    const shipId = (el && el.getAttribute("data-ship")) || (state.selectedShip && state.selectedShip.id);
    if (orderId) state.selectedOrder = Store.db.orders.find(o => o.id === orderId) || state.selectedOrder;
    if (selId) state.selectedSel = Store.db.selections.find(s => s.id === selId) || state.selectedSel;

    switch (act) {
      case "toggle-sel-add":
        state.selAddOpen = !state.selAddOpen;
        render();
        break;
      case "buyer-confirm-one-brand": {
        const brand = (el && el.getAttribute("data-brand")) || state.selectedBrand;
        const r = Store.buyerConfirmSelection(brand);
        toast(r.msg);
        syncBuyerCart();
        state.cartOpen = false;
        if (r.ok) {
          state.selectedSel = Store.db.selections.find(s => s.id === r.id);
          go("buyer-selection-edit");
        } else render();
        break;
      }
      case "filter": {
        state.listPage = 1;
        if (state.page === "goods-list" || state.page.startsWith("goods")) { applyGoodsFilterFromDom(); go(state.page); toast(`筛选到 ${Store.filteredGoods().length} 条商品`); }
        else if (state.page === "order-selection") { applySelectionFilterFromDom(); render(); toast(`筛选到 ${Store.filteredSelections().length} 条选款单`); }
        else if (state.page === "order-list" || state.page === "order-replenish") { applyOrderFilterFromDom(); render(); toast(`筛选到 ${Store.filteredOrders(state.page === "order-replenish" ? "补货单" : null).length} 条订单`); }
        else { toast("已按条件筛选"); render(); }
        break;
      }
      case "buyer-search": {
        const f = readFields();
        Store.db.ui.buyerFilter = Store.db.ui.buyerFilter || {};
        Store.db.ui.buyerFilter.levelTab = f.buyerLevel || "全部";
        Store.db.ui.buyerFilter.phone = f.buyerPhone || "";
        Store.db.ui.buyerFilter.keyword = f.buyerName || f.buyerKw || "";
        Store.db.ui.buyerFilter.province = f.buyerProvince || "";
        Store.db.ui.buyerFilter.city = f.buyerCity || "";
        Store.db.ui.buyerFilter.brand = f.buyerBrand || "";
        Store.persist();
        state.listPage = 1;
        render();
        toast("已搜索买手");
        break;
      }
      case "ship-brand": {
        Store.db.ui.shipMode = "orders";
        Store.db.ui.shipBrand = act.split(":")[1] || "";
        Store.persist();
        render();
        toast("已进入发货单列表");
        break;
      }
      case "ship-back": {
        Store.db.ui.shipMode = "list";
        Store.persist();
        render();
        break;
      }
      case "buyer-brand-tab": {
        Store.db.ui.buyerBrandTab = act.split(":")[1] || "intro";
        Store.persist();
        render();
        break;
      }
      case "buyer-mine-tab": {
        Store.db.ui.buyerMineTab = act.split(":")[1] || "info";
        Store.persist();
        render();
        break;
      }
      case "clear-filter":
        Store.setGoodsFilter({ carry: "全部", linesheet: "", sku: "", cat: "全部", subcat: "全部", brand: "全部", title: "", season: "全部" });
        Store.setOrderFilter({ brand: "全部", season: "全部", type: "全部", status: "全部", store: "", id: "" });
        Store.db.ui.selectionFilter = { brand: "全部", season: "全部", store: "" };
        Store.persist();
        render();
        toast("已清空筛选条件");
        break;
      case "back":
        go(state.portal === "buyer" ? "buyer-home" : "goods-list");
        break;
      case "send-code": {
        let n = 60;
        el.disabled = true;
        el.textContent = `${n}s`;
        const timer = setInterval(() => {
          n -= 1;
          if (n <= 0) { clearInterval(timer); el.disabled = false; el.textContent = "获取验证码"; }
          else el.textContent = `${n}s`;
        }, 1000);
        toast("验证码已发送：888888");
        break;
      }
      case "add-to-order": {
        const g = Store.db.goods.find(x => x.sku === (state.selectedGoods || RR.goods[0].sku)) || Store.db.goods[0];
        const total = Object.values(state.qty).reduce((a, b) => a + b, 0);
        if (!total) { toast("请先选择尺码数量"); return; }
        const check = Store.canOrder(g.brand, g.season, state.page === "buyer-replenish" ? "补货单" : "首单");
        if (!check.ok) { toast(check.msg); return; }
        Store.toggleHeart(g.sku);
        // also ensure in hearts with sizes remembered on selection lines later
        const exist = Store.db.buyerSession.selections.find(x => x.sku === g.sku);
        if (exist) exist.sizes = { ...state.qty };
        Store.persist();
        state.cart = Store.db.buyerSession.selections.map(x => x.sku);
        state.hearts = [...state.cart];
        saveCart();
        toast(`已加入选款/订单意向：${g.sku} 共 ${total} 件`);
        render();
        break;
      }
      case "gen-order": {
        const id = selId || (el && el.getAttribute("data-gen-order"));
        const r = Store.genOrderFromSelection(id || (Store.db.selections[0] && Store.db.selections[0].id));
        toast(r.msg);
        if (r.ok) {
          state.selectedOrder = Store.db.orders.find(o => o.id === r.orderId);
          go("order-detail");
        } else render();
        break;
      }
      case "cancel-selection":
        toast(Store.cancelSelection(selId || Store.db.selections[0].id));
        render();
        break;
      case "confirm-deposit": {
        const f = readFields();
        const ratio = Number(String(f.depRatio || "30").replace("%", "")) / 100 || 0.3;
        const r = Store.advanceOrder(orderId || Store.db.orders[0].id, "depositConfirm", { ratio });
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === (orderId || Store.db.orders[0].id));
        state.orderAction = "";
        render();
        break;
      }
      case "confirm-final": {
        const r = Store.advanceOrder(orderId || Store.db.orders[0].id, "finalConfirm");
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === (orderId || Store.db.orders[0].id));
        render();
        break;
      }
      case "reject-order": {
        const r = Store.advanceOrder(orderId || Store.db.orders[0].id, "reject");
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === (orderId || Store.db.orders[0].id));
        render();
        break;
      }
      case "submit-invoice": {
        const f = readFields();
        const r = Store.advanceOrder(orderId || Store.db.orders[0].id, "invoice", { title: f.invTitle, tax: f.invTax, type: f.invType });
        toast(r.ok ? "发票申请已提交" : r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === (orderId || Store.db.orders[0].id));
        state.orderAction = "";
        render();
        break;
      }
      case "submit-voucher": {
        const f = readFields();
        const r = Store.advanceOrder(orderId || Store.db.orders[0].id, "voucher", { amount: f.voucherAmt, at: f.voucherAt });
        toast(r.ok ? "付款凭证已提交" : r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === (orderId || Store.db.orders[0].id));
        state.orderAction = "";
        render();
        break;
      }
      case "set-whitelist": {
        const r = Store.advanceOrder(orderId || Store.db.orders[0].id, "whitelist");
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === (orderId || Store.db.orders[0].id));
        state.orderAction = "";
        render();
        break;
      }
      case "submit-substore": {
        const f = readFields();
        const r = Store.advanceOrder(orderId || Store.db.orders[0].id, "substore", {
          rows: [
            { name: "Liora Amour 静安", amount: f.subAmt1, skus: f.subSku1 },
            { name: "Liora Amour 主店", amount: f.subAmt2, skus: f.subSku2 }
          ]
        });
        toast(r.ok ? "已分配到子店铺" : r.msg);
        state.orderAction = "";
        render();
        break;
      }
      case "submit-return": {
        const f = readFields();
        const r = Store.advanceOrder(orderId || Store.db.orders[0].id, "return", { type: f.retType, sku: f.retSku, qty: f.retQty, reason: f.retReason });
        toast(r.ok ? "退换货已提交" : r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === (orderId || Store.db.orders[0].id));
        render();
        break;
      }
      case "save-order-modify": {
        const o = state.selectedOrder || Store.db.orders[0];
        const f = readFields();
        const lines = (o.lines || []).map((l, i) => {
          const qty = Number(f["qty-" + i] || 0);
          const sizes = { ...(l.sizes || {}) };
          const keys = Object.keys(sizes);
          if (keys.length) {
            const per = Math.floor(qty / keys.length);
            let rem = qty - per * keys.length;
            keys.forEach(k => { sizes[k] = per + (rem > 0 ? 1 : 0); rem -= 1; });
          }
          return { ...l, sizes, discount: Number(f["disc-" + i] || l.discount || 1) };
        });
        const r = Store.advanceOrder(o.id, "modify", { lines });
        toast(r.ok ? "订单修改已保存" : r.msg);
        state.selectedOrder = Store.db.orders.find(x => x.id === o.id);
        state.orderAction = "";
        render();
        break;
      }
      case "create-contract": {
        const id = orderId || (el && el.getAttribute("data-oid")) || Store.db.orders[0].id;
        const r = Store.createContract(id);
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === id);
        go("contract-preview");
        break;
      }
      case "create-oc": {
        const id = orderId || (el && el.getAttribute("data-oid")) || Store.db.orders[0].id;
        const r = Store.createOc(id);
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === id);
        go("oc-preview");
        break;
      }
      case "ship-confirm": {
        const id = shipId || Store.db.shipments[0].id;
        const f = readFields();
        if (f.tracking != null || f["track-" + id]) {
          Store.saveShipment(id, { tracking: f.tracking || f["track-" + id] });
        }
        const r = Store.confirmShipment(id);
        toast(r.msg);
        render();
        break;
      }
      case "save-ship": {
        const sh = state.selectedShip || Store.db.shipments[0];
        const f = readFields();
        const lines = (sh.lines || []).map((l, i) => ({ ...l, actual: Number(f["actual-" + i] || l.actual) }));
        toast(Store.saveShipment(sh.id, { tracking: f.tracking, note: f.shipNote, lines }));
        state.selectedShip = Store.db.shipments.find(x => x.id === sh.id);
        render();
        break;
      }
      case "delete-style":
      case "restore-style":
        toast(Store.toggleDelete(el.getAttribute("data-sku")));
        render();
        break;
      case "approve": {
        if (state.page === "intent-list") {
          const row = el.closest("tr");
          toast(Store.setIntention(row.children[0].textContent, row.children[1].textContent, "已通过"));
        } else {
          const row = el.closest("tr") || el.closest(".item");
          const name = row ? (row.querySelector("div") || row.children[0]).textContent.split("\n")[0].trim() : "";
          toast(Store.setBuyerStatus(name, "已通过"));
        }
        render();
        break;
      }
      case "reject": {
        if (state.page === "intent-list") {
          const row = el.closest("tr");
          toast(Store.setIntention(row.children[0].textContent, row.children[1].textContent, "已拒绝"));
        } else {
          const row = el.closest("tr") || el.closest(".item");
          const name = row
            ? String((row.querySelector("div") || row.children[0]).textContent || "").split("\n")[0].trim()
            : "";
          toast(Store.setBuyerStatus(name, "已关闭"));
        }
        render();
        break;
      }
      case "save-carry": {
        const map = {};
        app.querySelectorAll("[data-carry-sku]").forEach(cb => { map[cb.getAttribute("data-carry-sku")] = cb.checked; });
        toast(Store.setCarry(map));
        go("goods-list");
        break;
      }
      case "save-goods": {
        const f = readFields();
        const sizes = [...app.querySelectorAll('[data-check="sizes"]:checked')].map(x => x.value);
        const r = Store.addGoods({
          brand: f.brand, title: f.title, sku: f.sku, season: f.season,
          sizes: sizes.length ? sizes : ["S", "M", "L"],
          retail: f.retail, wholesale: f.wholesale, cat: f.cat, subcat: f.subcat,
          carry: !!f.carry || f.carry === "是",
          restock: f.restock !== false && f.restock !== "否",
          linesheet: f.band || "", color: f.color || "",
          shipAt: f.shipAt || ""
        });
        toast(r.msg);
        if (r.ok) go("goods-list");
        break;
      }
      case "save-discount": {
        const f = readFields();
        const stairs = [];
        Object.keys(f).forEach(k => {
          if (k.startsWith("stair-amt-")) {
            const i = k.replace("stair-amt-", "");
            stairs.push({ amount: Number(f[k] || 0), discount: Number(f["stair-disc-" + i] || 0) });
          }
        });
        toast(Store.saveDiscountRules({
          minAmount: Number(f.minAmount || 0),
          cloth: Number(f.cloth || 0),
          accessory: Number(f.accessory || 0),
          lifestyle: Number(f.lifestyle || 0),
          stairs
        }));
        render();
        break;
      }
      case "add-stair": {
        const rules = JSON.parse(JSON.stringify(Store.getDiscountRules()));
        rules.stairs = rules.stairs || [];
        rules.stairs.push({ amount: 0, discount: 0.4 });
        Store.saveDiscountRules(rules);
        toast("已添加阶梯行，请填写后保存");
        render();
        break;
      }
      case "save-size":
      case "add-size-alias": {
        const f = readFields();
        const r = Store.addSizeAlias(f.aliasStd, f.aliasName);
        toast(r.msg);
        render();
        break;
      }
      case "style-filter": {
        const f = readFields();
        Store.db.ui.styleFilter = {
          start: f.styleStart || "", end: f.styleEnd || "",
          brand: f.styleBrand || "全部", season: f.styleSeason || "全部",
          sku: f.styleSku || "", status: f.styleStatus || "全部", type: f.styleType || "全部"
        };
        Store.persist();
        render();
        toast(`已筛选，共 ${Store.styleSummary(Store.db.ui.styleDim, Store.db.ui.styleFilter).length} 条`);
        break;
      }
      case "realtime-filter": {
        const f = readFields();
        Store.db.ui.realtimeFilter = {
          start: f.rtStart || "", end: f.rtEnd || "",
          season: f.rtSeason || "全部", type: f.rtType || "全部", status: f.rtStatus || "全部"
        };
        Store.persist();
        render();
        toast(`已筛选，共 ${Store.realtimeSummary().length} 个品牌有数据`);
        break;
      }
      case "save-fair": {
        const f = readFields();
        RR.seasons.forEach(season => {
          Store.setFair(season, {
            first: !!f["fair-first-" + season],
            replenish: !!f["fair-rep-" + season]
          });
        });
        toast("季节开启状态已保存");
        render();
        break;
      }
      case "save-pay": {
        const f = readFields();
        toast(Store.savePayInfo({
          company: f.company, account: f.account, bank: f.bank, no: f.no,
          branch: f.branch, addr: f.addr
        }));
        break;
      }
      case "contract-season": {
        const s = act.split(":")[1];
        Store.db.contractSettings = Store.db.contractSettings || {};
        Store.db.contractSettings.season = s;
        Store.persist();
        render();
        break;
      }
      case "contract-type": {
        const t = act.split(":").slice(1).join(":");
        Store.db.contractSettings = Store.db.contractSettings || {};
        Store.db.contractSettings.type = t;
        Store.persist();
        render();
        break;
      }
      case "save-contract-settings": {
        const f = readFields();
        toast(Store.saveContractSettings(f));
        render();
        break;
      }
      case "save-brand-profile": {
        const f = readFields();
        const cats = [...app.querySelectorAll('[data-check="cats"]:checked')].map(x => x.value);
        const styles = [...app.querySelectorAll('[data-check="styles"]:checked')].map(x => x.value);
        const crowds = [...app.querySelectorAll('[data-check="crowds"]:checked')].map(x => x.value);
        toast(Store.saveBrandProfile({
          name: f.name, year: Number(f.year || 0), designer: f.designer || "", about: f.about || "",
          cats, styles, crowds
        }));
        render();
        break;
      }
      case "save-restock": {
        const f = readFields();
        const brand = Store.db.ui.restockBrand;
        const kind = Store.db.ui.restockKind;
        const season = Store.db.ui.restockSeason || "全部";
        const list = Store.db.goods.filter(g => g.brand === brand && (season === "全部" || g.season === season));
        const rows = list.map(g => kind === "hide"
          ? { sku: g.sku, hideAll: (f["hide-" + g.sku] || "否") === "是" }
          : { sku: g.sku, restock: (f["restock-" + g.sku] || "是") === "是" });
        toast(Store.saveRestock(rows));
        render();
        break;
      }
      case "add-look":
        toast(Store.addLook());
        render();
        break;
      case "add-category": {
        const name = prompt("一级分类名称");
        if (!name) break;
        toast(Store.saveCategory(name, []));
        render();
        break;
      }
      case "create-role": {
        const name = prompt("角色名称");
        if (!name) break;
        toast(Store.addRole(name));
        render();
        break;
      }
      case "save-role-perm": {
        const f = readFields();
        const flags = {};
        app.querySelectorAll("[data-perm]").forEach(cb => { flags[cb.getAttribute("data-perm")] = cb.checked; });
        toast(Store.saveRoleFlags(f.roleName || state.selectedRole, flags));
        render();
        break;
      }
      case "save-recon-rate": {
        const f = readFields();
        toast(Store.saveRecon("rate", { brand: f.rateBrand, season: f.rateSeason, base: f.rateBase, stair: f.rateStair }));
        render();
        break;
      }
      case "save-recon-pay": {
        const f = readFields();
        toast(Store.saveRecon("payinfo", { brand: f.payBrand, account: f.payAccount, bank: f.payBank, no: f.payNo }));
        render();
        break;
      }
      case "process-invoice": {
        const row = el.closest("tr");
        toast(Store.saveRecon("processInvoice", { brand: row.getAttribute("data-brand"), type: row.getAttribute("data-type") }));
        render();
        break;
      }
      case "clear-balance": {
        const row = el.closest("tr");
        toast(Store.saveRecon("clearBalance", { brand: row.getAttribute("data-brand"), store: row.getAttribute("data-store") }));
        render();
        break;
      }
      case "save-buyer-invoice": {
        const f = readFields();
        toast(Store.saveBuyerProfile({ invoice: { title: f.invTitle, tax: f.invTax } }));
        break;
      }
      case "add-address": {
        Store.db.buyerSession.addresses = Store.db.buyerSession.addresses || [];
        Store.db.buyerSession.addresses.push({ name: "新收货人", phone: Store.db.buyerSession.phone, addr: "请编辑地址" });
        Store.persist();
        toast("已新增地址，请编辑完善");
        render();
        break;
      }
      case "add-substore":
        toast("已新增子店铺草稿");
        break;
      case "add-buyer": {
        const f = readFields();
        const r = Store.addBuyer({ name: f.buyerName, phone: f.buyerPhone, city: f.buyerCity, level: f.buyerLevel });
        toast(r.msg);
        if (r.ok) go("buyer-list");
        break;
      }
      case "grant-brand": {
        const brand = (app.querySelector("select") || {}).value;
        toast(Store.grantBrandToBuyer(Store.db.buyers[0].name, brand));
        break;
      }
      case "submit-appoint": {
        const f = readFields();
        if (!f.mpStore || !f.mpPhone) { toast("请填写店铺名和手机号"); break; }
        const date = String(f.mpDate || "").replace("T", " ");
        toast(Store.addAppointment({
          brand: f.mpBrand, store: f.mpStore, contact: f.mpContact || f.mpStore,
          phone: f.mpPhone, date, season: f.mpSeason
        }));
        break;
      }
      case "buyer-filter": {
        const f = readFields();
        if (f.buyerSeason) Store.db.buyerSession.season = f.buyerSeason;
        Store.db.buyerSession.search = f.buyerSearch || "";
        Store.db.buyerSession.carryOnly = !!document.querySelector('[data-field="buyerCarry"]:checked');
        Store.persist();
        render();
        toast("已搜索（名称 / SKU / 编号）");
        break;
      }
      case "buyer-confirm-hearts": {
        const brands = [...new Set(Store.db.buyerSession.selections.map(x => x.brand))];
        let last = null;
        brands.forEach(b => { last = Store.buyerConfirmSelection(b); });
        toast(last ? last.msg : "无待确认选款");
        syncBuyerCart();
        render();
        break;
      }
      case "buyer-confirm-sel": {
        const id = selId || (el && el.getAttribute("data-sel"));
        const r = Store.genOrderFromSelection(id);
        toast(r.msg);
        if (r.ok) {
          state.selectedOrder = Store.db.orders.find(o => o.id === r.orderId);
          go("buyer-orders");
        } else render();
        break;
      }
      case "buyer-confirm-order": {
        const id = orderId || (el && el.getAttribute("data-oid"));
        const r = Store.advanceOrder(id, "buyerConfirm");
        toast(r.msg);
        render();
        break;
      }
      case "save-selection-lines": {
        const sel = state.selectedSel || Store.db.selections[0];
        toast(Store.saveSelectionLines(sel.id, sel.lines || []).msg);
        state.selectedSel = Store.db.selections.find(x => x.id === sel.id);
        if (state.portal === "buyer" && state.page === "buyer-selection-edit") go("buyer-selection");
        else render();
        break;
      }
      case "save-context": {
        const page = state.page;
        if (page === "goods-add" || page === "goods-view") { handleAct("save-goods", el); break; }
        if (page === "brand-discount") { handleAct("save-discount", el); break; }
        if (page === "brand-size") { handleAct("save-size", el); break; }
        if (page === "brand-fair") { handleAct("save-fair", el); break; }
        if (page === "brand-pay") { handleAct("save-pay", el); break; }
        if (page === "brand-contract") { handleAct("save-contract-settings", el); break; }
        if (page === "brand-edit") { handleAct("save-brand-profile", el); break; }
        if (page === "goods-restock") { handleAct("save-restock", el); break; }
        if (page === "ship-detail") { handleAct("save-ship", el); break; }
        if (page === "role-perm") { handleAct("save-role-perm", el); break; }
        if (page === "buyer-profile") { handleAct("save-buyer-invoice", el); break; }
        if (page === "buyer-selection-edit") { handleAct("save-selection-lines", el); break; }
        if (page === "order-detail" && state.orderAction === "modify") { handleAct("save-order-modify", el); break; }
        if (page === "order-recon" && state.reconTab === "rate") { handleAct("save-recon-rate", el); break; }
        if (page === "order-recon" && state.reconTab === "payinfo") { handleAct("save-recon-pay", el); break; }
        if (page === "contract-preview") { handleAct("create-contract", el); break; }
        if (page === "buyer-balance") {
          const row = el && el.closest("tr");
          if (row) {
            const inp = row.querySelector("input");
            toast(Store.saveBuyerBalance(row.getAttribute("data-buyer"), row.getAttribute("data-brand"), Store.parseMoney(inp && inp.value)));
            render();
            break;
          }
        }
        toast("已保存");
        break;
      }
      default:
        toast(`已执行：${act}`);
    }
  }

  function wireUniversalClicks() {
    // Explicit data-act (including on div cards)
    app.querySelectorAll("[data-act]").forEach(el => {
      if (el.dataset.wiredAct) return;
      el.dataset.wiredAct = "1";
      el.addEventListener("click", (e) => {
        if (el.hasAttribute("data-heart") || el.hasAttribute("data-go") || el.hasAttribute("data-portal")) return;
        e.preventDefault();
        e.stopPropagation();
        handleAct(el.getAttribute("data-act"), el);
      });
    });

    // Catch-all: any remaining button / javascript link without special attrs
    app.querySelectorAll("button, a[href='javascript:;'], a[href=\"javascript:;\"], a[href='javascript:void(0)']").forEach(el => {
      if (el.dataset.wiredCatch) return;
      const special = ["data-go", "data-portal", "data-role", "data-act", "data-heart", "data-qty",
        "data-order-action", "data-action-toast", "data-gen-order", "data-confirm-sel",
        "data-toggle-rule", "data-view", "data-toggle-cart", "data-recon", "data-tabsoft",
        "data-line-qty", "data-draft-qty", "data-carry-sku", "data-page", "data-buyer-tab"];
      if (special.some(a => el.hasAttribute(a))) return;
      if (el.id === "do-login") return;
      el.dataset.wiredCatch = "1";
      el.addEventListener("click", (e) => {
        e.preventDefault();
        const label = (el.textContent || "").trim().replace(/\s+/g, " ");
        if (!label) return;
        handleAct(inferAct(label), el);
      });
    });

    // Upload boxes
    app.querySelectorAll(".upload-box").forEach(box => {
      if (box.dataset.wiredUp) return;
      box.dataset.wiredUp = "1";
      box.style.cursor = "pointer";
      box.addEventListener("click", () => toast("文件选择器已打开（原型模拟上传成功）"));
    });

    // Checkboxes feedback
    app.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      if (cb.dataset.wiredCb) return;
      cb.dataset.wiredCb = "1";
      cb.addEventListener("change", () => {
        if (cb.hasAttribute("data-carry-sku")) return;
        toast(cb.checked ? "已开启该项" : "已关闭该项");
      });
    });
  }

  function pageBuyerBrandAbout() {
    /* 原站：brand_detail-container · 品牌介绍/LOOKBOOK · brand_info 字段 */
    const b = RR.brands.find(x => x.name === state.selectedBrand) || RR.brands[0];
    const tab = Store.db.ui.buyerBrandTab || "intro";
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container brand_detail-container">
        <div class="brand_swiper-container">
          <div class="brand-logo-rect lg" style="width:100%;max-width:400px;height:240px;margin:0 auto">${b.name}</div>
        </div>
        <div class="brand_detail">
          <div class="filter_link">
            <div class="collect_link">
              <a href="javascript:;" class="${tab === "intro" ? "uk-active on" : ""}" data-act="buyer-brand-tab:intro">品牌介绍</a>
              <a href="javascript:;" class="${tab === "look" ? "uk-active on" : ""}" data-act="buyer-brand-tab:look">LOOKBOOK</a>
            </div>
            ${tab === "intro" ? `
              <div class="brand_info">
                <h6 class="sub_title">品牌信息</h6>
                <div class="uk-column-1-2 brand-info-grid">
                  <div><h5>品牌名</h5><p>${b.name}</p></div>
                  <div><h5>成立时间</h5><p>${b.year || "—"}</p></div>
                  <div><h5>官网</h5><p>${b.site || "—"}</p></div>
                  <div><h5>最小起订量</h5><p>${b.moq || Store.db.brandRules.minAmount || 50000}</p></div>
                </div>
                <h6 class="sub_title">品牌故事</h6>
                <p style="color:#555;line-height:1.8">${b.about || "由平台端/品牌端在品牌信息中维护。"}</p>
                <div class="meta" style="margin-top:16px;color:#888;font-size:13px">品类 ${b.cat || "—"} · 风格 ${b.style || "—"} · 人群 ${b.crowd || "—"}</div>
              </div>` : `
              <div class="lookbook-container product-grid">
                ${(Store.db.looks || []).filter(l => !l.brand || l.brand === b.name).slice(0, 6).map(l =>
                  `<div class="product-card"><div class="cover">LOOK ${l.id}</div><div class="name">${l.title}</div></div>`
                ).join("") || '<div class="note">暂无 LOOKBOOK</div>'}
              </div>`}
          </div>
          <div class="submit_area"><a href="javascript:;" class="oto_btn" data-act="go:buyer-brand">返回商品列表</a></div>
        </div>
      </div>
    </div>`;
  }

  function pageBuyerDetail() {
    /* 原站商品详情：goods_detail-container / goods_info / size 加减 / 加入选款 */
    const g = Store.db.goods.find(x => x.sku === state.selectedGoods) || Store.db.goods[0];
    const sizes = g.sizes && g.sizes.length ? g.sizes : ["XS", "S", "M", "L"];
    const price = Store.parseMoney(g.wholesale);
    const totalQty = sizes.reduce((a, sz) => a + (state.qty[sz] || 0), 0);
    const totalAmt = sizes.reduce((a, sz) => a + (state.qty[sz] || 0) * price, 0);
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container goods_detail-container">
        <div class="detail-sticky">
          <strong>${g.brand}</strong>
          <div class="brand-logo-rect" style="width:36px;height:36px;font-size:8px">${(g.brand || "").slice(0, 2)}</div>
          <span>最小起订 ¥${Store.money(Store.getDiscountRules().minAmount)}</span>
          <span>已选订量 ¥${Store.money(totalAmt)}</span>
        </div>
        <div class="goods_detail detail-layout">
          <div class="goods_gallery">
            <div class="cover" style="aspect-ratio:3/4;background:#eee;display:flex;align-items:center;justify-content:center;color:#aaa;margin-bottom:12px">商品大图</div>
            <div class="thumbs" style="display:flex;gap:8px">
              ${[1, 2, 3, 4].map(i => `<div class="thumb ph" style="width:64px;height:80px">${i}</div>`).join("")}
            </div>
          </div>
          <div class="goods_info">
            <h1>${g.title}</h1>
            <div class="meta">SKU ${g.sku}</div>
            <div class="price_retail">建议零售价 <strong>¥${g.retail}</strong></div>
            <div class="price_wholesale">订货价 <strong>¥${g.wholesale}</strong></div>
            <div class="size_list">
              ${sizes.map(sz => `
                <div class="size-row item">
                  <div class="size_name">${sz}</div>
                  <div class="qty">
                    <button data-qty="${sz}" data-d="-1">−</button>
                    <input value="${state.qty[sz] || 0}" readonly />
                    <button data-qty="${sz}" data-d="1">+</button>
                  </div>
                  <div class="line_amt">¥${Store.money((state.qty[sz] || 0) * price)}</div>
                </div>`).join("")}
            </div>
            <div class="total_num"><p>合计 ${totalQty} 件</p></div>
            <div class="submit_area"><a href="javascript:;" class="oto_btn" data-act="toast:已加入选款（示意）">加入选款单</a>
              <a href="javascript:;" class="oto_btn" data-act="go:buyer-brand">返回列表</a></div>
            <div class="goods_desc">
              <h6 class="sub_title">材质信息</h6>
              <p>主面料 100% Wool · 里料 100% Cupro</p>
              <p>富文本商品详情区域…</p>
            </div>
          </div>
        </div>
      </div>
      ${floatSelTab()}
    </div>`;
  }

  function pageBuyerMessage() {
    /* 原站 /buyer/message：message_list */
    const msgs = Store.db.ui.buyerMessages || [
      { title: "订单状态更新", time: "2026-07-28 10:20", body: "您的选款单已生成订单，请及时确认。" },
      { title: "品牌权限通过", time: "2026-07-20 15:01", body: "您申请的品牌权限已通过。" }
    ];
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container message-container">
        <div class="public_right-container" style="width:100%">
          <div class="sub_title">消息</div>
          <div class="message_list">
            <div class="items">
              ${msgs.map(m => `
                <div class="item">
                  <div class="message_info">
                    <h6>${m.title}</h6>
                    <p>${m.body}</p>
                    <span>${m.time}</span>
                  </div>
                </div>`).join("")}
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function pageBuyerProfile() {
    /* 原站 /mine：mine-container > mine_side + mine_info-container */
    const s = Store.db.buyerSession;
    const tab = Store.db.ui.buyerMineTab || "info";
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container mine-container">
        <div class="public_left-container">
          <ul class="mine_side">
            <li class="${tab === "info" ? "active" : ""}"><a href="javascript:;" data-act="buyer-mine-tab:info">个人信息</a></li>
            <li class="${tab === "addr" ? "active" : ""}"><a href="javascript:;" data-act="buyer-mine-tab:addr">收货地址管理</a></li>
            <li class="${tab === "inv" ? "active" : ""}"><a href="javascript:;" data-act="buyer-mine-tab:inv">发票地址管理</a></li>
          </ul>
          <a href="javascript:;" class="mine_logout" data-act="toast:已登出（示意）">登出</a>
        </div>
        <div class="public_right-container">
          <div class="mine_info-container">
            ${tab === "info" ? `
              <div class="account_info">
                <div class="sub_title">登录信息</div>
                <div>手机号: <span>${s.phone}</span></div>
              </div>
              <div class="shop_info">
                <div class="sub_title">店铺信息</div>
                <div class="items">
                  <div class="item"><p>姓名:</p><p>${s.contact || "—"}</p></div>
                  <div class="item"><p>店铺名称:</p><p>${s.store}</p></div>
                  <div class="item"><p>店铺地址:</p><p>${s.city || "—"}</p></div>
                  <div class="item"><p>店铺级别:</p><p>${s.level || "—"}</p></div>
                </div>
              </div>` : ""}
            ${tab === "addr" ? `
              <div class="sub_title">收货地址管理</div>
              <table class="data-table">
                <thead><tr><th>收货人</th><th>电话</th><th>地址</th><th>操作</th></tr></thead>
                <tbody>${(s.addresses || []).map((a, i) => `<tr><td>${a.name}</td><td>${a.phone}</td><td>${a.addr}</td><td>${link("编辑", "edit-address:" + i)}</td></tr>`).join("")}</tbody>
              </table>
              <div style="margin-top:12px">${btn("新增地址", "btn-outline")}</div>` : ""}
            ${tab === "inv" ? `
              <div class="sub_title">发票地址管理</div>
              <div class="form-grid">
                <label>发票抬头</label><div>${field("invTitle", input("", (s.invoice && s.invoice.title) || ""))}</div>
                <label>税号</label><div>${field("invTax", input("", (s.invoice && s.invoice.tax) || ""))}</div>
              </div>
              <div style="margin-top:12px">${btn("保存发票信息")}</div>` : ""}
          </div>
        </div>
      </div>
    </div>`;
  }

  function pageBuyerReplenish() {
    /* 原站 /replenish：与首页同构 brand_list-container，侧栏分类 + 品牌格子；侧边栏文案为「我的补货单」 */
    const brands = Store.buyerBrands(Store.db.buyerSession.cat || "全部");
    syncBuyerCart();
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container brand_list-container">
        ${buyerCatSide(`<div class="note" style="margin-top:16px;font-size:12px">无首单或上一补货未完成时，确认订单拦截。<br/><a href="javascript:;" data-toggle-rule="first">${state.hasFirstOrder ? "模拟：无首单" : "模拟：已有首单"}</a></div>`)}
        <div class="public_right-container">
          <div class="mob-sub_title"><h5>补货品牌</h5></div>
          <div class="brand_list">
            <div class="items uk-grid-medium brand-grid-live">
              ${brands.map(b => {
                const noAuth = b.accept === false;
                return `<div class="item">
                  <div class="item_inner">
                    ${noAuth ? '<div class="accept_state">暂无权限</div>' : ""}
                    <a href="javascript:;" data-go="buyer-brand" data-brand="${b.name}">
                      <div class="brand-logo-rect">${b.name}</div>
                      <p>${b.name}</p>
                    </a>
                    ${noAuth ? '<div class="get_accept" data-act="toast:已提交权限申请">申请权限</div>' : ""}
                  </div>
                </div>`;
              }).join("") || '<div class="note">该分类下暂无品牌</div>'}
            </div>
          </div>
        </div>
      </div>
      <div class="public_side_bg"></div>
      ${floatSelTab("我的补货单")}
    </div>`;
  }

  function pageMP() {
    return `${protoBar()}
      <div style="background:#f0f0f0;min-height:100vh;padding:20px 0 60px">
        <div class="mp-frame">
          <div class="mp-status">ROOMROOM 订货会预约</div>
          <div class="mp-body">
            <h2>在线预约参展</h2>
            <p>填写信息后同步至后台「预约列表」</p>
            <div class="login-field"><label>品牌</label>${field("mpBrand", select(RR.brands.map(b => b.name)))}</div>
            <div class="login-field"><label>店铺名</label>${field("mpStore", input())}</div>
            <div class="login-field"><label>联系人</label>${field("mpContact", input())}</div>
            <div class="login-field"><label>手机号</label>${field("mpPhone", input())}</div>
            <div class="login-field"><label>预约场次</label>${field("mpSeason", select(RR.seasons.slice(-8), null, "2026SS"))}</div>
            <div class="login-field"><label>预约时间</label>${field("mpDate", datetimeInput("2026-04-08T14:00"))}</div>
            <button class="btn btn-primary btn-block" data-act="submit-appoint">提交预约</button>
          </div>
        </div>
      </div>`;
  }

  const pages = {
    login: pageLogin,
    coverage: pageCoverage,
    "account-center": pageAccount,
    "goods-carry": pageGoodsCarry,
    "goods-list": pageGoodsList,
    "goods-add": pageGoodsAdd,
    "goods-view": pageGoodsAdd,
    "goods-batch": pageGoodsBatch,
    "goods-restock": pageGoodsRestock,
    "goods-look": pageGoodsLook,
    "goods-cat": pageGoodsCat,
    "brand-list": pageBrandList,
    "brand-discount": pageBrandDiscount,
    "brand-size": pageBrandSize,
    "brand-fair": pageBrandFair,
    "brand-pay": pageBrandPay,
    "brand-contract": pageBrandContract,
    "brand-edit": pageBrandEdit,
    "brand-master-style": () => pageMaster("styles"),
    "brand-master-crowd": () => pageMaster("crowds"),
    "brand-master-size": () => pageMaster("sizes"),
    "order-selection": pageOrderSelection,
    "selection-detail": pageSelectionDetail,
    "order-list": () => pageOrderList("首单"),
    "order-detail": pageOrderDetail,
    "order-replenish": pageOrderReplenish,
    "order-contract": pageOrderContract,
    "order-oc": pageOrderOC,
    "contract-preview": pageContractPreview,
    "oc-preview": pageOCPreview,
    "order-style": pageOrderStyle,
    "order-realtime": pageOrderRealtime,
    "order-all-sel": pageOrderAllSel,
    "order-all": pageOrderAll,
    "order-analysis": pageOrderAnalysis,
    "order-appoint": pageOrderAppoint,
    "order-recon": pageOrderRecon,
    "ship-list": pageShip,
    "ship-detail": pageShipDetail,
    "intent-list": pageIntent,
    "buyer-list": pageBuyerList,
    "buyer-add": pageBuyerAdd,
    "buyer-balance": pageBuyerBalance,
    "buyer-store": () => simpleFormPage("查看店铺资料", "查看买手提交的店铺信息", `
      <label>店铺名</label><div>Liora Amour</div>
      <label>级别</label><div>B</div>
      <label>城市</label><div>北京市</div>
      <label>简介</label><div class="span2">独立买手店，聚焦先锋女装。</div>`),
    "buyer-invoice": () => simpleFormPage("修改发票信息", "", `
      <label>抬头</label><div>${field("title", input())}</div><label>税号</label><div>${field("tax", input())}</div>`),
    "buyer-address": () => simpleFormPage("修改地址", "", `
      <label>收货人</label><div>${field("name", input())}</div><label>电话</label><div>${field("phone", input())}</div>
      <label>地址</label><div class="span2">${field("addr", input())}</div>`),
    "buyer-edit": () => simpleFormPage("编辑店铺资料", "", `
      <label>店铺名</label><div>${field("name", input("Liora Amour", "Liora Amour"))}</div>
      <label>级别</label><div>${field("level", select(["A", "B", "C"], null, "B"))}</div>`),
    "buyer-sub": () => `${subTitle("查看/添加子店铺")}
      <table class="data-table"><thead><tr><th>子店铺</th><th>城市</th><th>操作</th></tr></thead>
      <tbody><tr><td>Liora Amour 静安</td><td>上海</td><td>${link("编辑", "toast:编辑子店铺")}</td></tr></tbody></table>
      <div style="margin-top:16px">${btn("新建子店铺")}</div>`,
    "buyer-add-brand": () => `${subTitle("添加品牌")}
      <div class="note">需求备注：暂不清楚需求。保留入口待客户确认业务含义。</div>
      <div class="form-grid"><label>选择品牌</label><div>${select(RR.brands.map(b => b.name))}</div>
      <label>备注</label><div>${input()}</div></div>
      <div class="action-bar">${btn("提交（示意）", "btn-outline")}</div>`,
    "buyer-appoint": () => simpleFormPage("添加预约", "代买手创建展会预约", `
      <label>品牌</label><div>${field("mpBrand", select(RR.brands.map(b => b.name)))}</div>
      <label>季节</label><div>${field("mpSeason", select(RR.seasons.slice(-8), null, "2026SS"))}</div>
      <label>时间</label><div>${field("mpDate", datetimeInput("2026-04-08T14:00"))}</div>`),
    "role-list": pageRoleList,
    "role-perm": pageRolePerm,
    "buyer-home": pageBuyerHome,
    "buyer-brand": pageBuyerBrand,
    "buyer-brand-about": pageBuyerBrandAbout,
    "buyer-detail": pageBuyerDetail,
    "buyer-selection": pageBuyerSelection,
    "buyer-selection-edit": pageBuyerSelectionEdit,
    "buyer-orders": pageBuyerOrders,
    "buyer-order-detail": pageBuyerOrderDetail,
    "buyer-profile": pageBuyerProfile,
    "buyer-message": pageBuyerMessage,
    "buyer-replenish": pageBuyerReplenish,
    "mp-home": pageMP
  };

  function render() {
    if (state.page === "login") {
      app.innerHTML = toastHtml() + pageLogin();
      bind();
      return;
    }
    if (state.portal === "mp" && state.page !== "coverage") {
      app.innerHTML = toastHtml() + pageMP();
      bind();
      return;
    }
    if (state.page === "coverage") {
      app.innerHTML = toastHtml() + protoBar() + `<div class="shell full-main"><div class="main">${pageCoverage()}</div></div>` + footer();
      bind();
      return;
    }

    const isBuyer = state.portal === "buyer";
    let body = (pages[state.page] || pageGoodsList)();
    /* 统一包一层现网右侧容器 class（已自带 brand_goodsList-container 的不重复包） */
    if (!isBuyer && !/brand_goodsList-container|ots_order-form|title_underline|buyer-layout/.test(body)) {
      body = `<div class="brand_goodsList-container">${body}</div>`;
    }
    const drawer = (isBuyer && state.cartOpen) ? cartDrawer() : "";
    /* 买手端页面自带 oto-main_container（对齐原站），勿再包 order-container 壳 */
    if (isBuyer) {
      const selfShell = /oto-main_container|buyer-fe/.test(body);
      if (!selfShell) {
        body = `<div class="oto-main_container buyer-fe"><div class="oto_container order-container"><div class="public_right-container main">${body}</div></div></div>`;
      }
      app.innerHTML = toastHtml() + protoBar() + topnav("buyer") +
        `<div class="ots_order-outer-container">${body}</div>` + footer() + drawer;
    } else {
      const side = sidebar();
      app.innerHTML = toastHtml() + protoBar() + topnav(state.portal) +
        `<div class="ots_order-outer-container"><div class="oto-main_container"><div class="oto_container order-container shell ${side ? "" : "full-main"}">
          ${side || ""}
          <div class="public_right-container main">${body}</div>
        </div></div></div>` + footer();
    }
    bind();
  }

  function bind() {
    app.querySelectorAll("[data-portal]").forEach(el => {
      el.addEventListener("click", () => setPortal(el.getAttribute("data-portal")));
    });
    app.querySelectorAll("[data-go]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const page = el.getAttribute("data-go");
        const brand = el.getAttribute("data-brand");
        const sel = el.getAttribute("data-sel");
        const oid = el.getAttribute("data-oid");
        if (brand) {
          state.selectedBrand = brand;
          state.cartBrandFilter = brand;
          /* 从品牌卡进入商品列表时复位分类，避免上一筛选导致空列表 */
          if (page === "buyer-brand") {
            Store.db.buyerSession.cat = "全部";
            Store.db.buyerSession.carryOnly = false;
            Store.db.buyerSession.search = "";
            Store.persist();
          }
        }
        if (sel) state.selectedSel = Store.db.selections.find(s => s.id === sel) || state.selectedSel;
        if (oid) state.selectedOrder = Store.db.orders.find(o => o.id === oid) || state.selectedOrder;
        const ship = el.getAttribute("data-ship");
        const sku = el.getAttribute("data-sku");
        if (ship) state.selectedShip = Store.db.shipments.find(x => x.id === ship) || state.selectedShip;
        if (sku) state.selectedGoods = sku;
        if (el.getAttribute("data-role-name")) state.selectedRole = el.getAttribute("data-role-name");
        const oa = el.getAttribute("data-order-action");
        if (oa) state.orderAction = oa;
        if (page === "order-detail" && (el.textContent || "").includes("白名单")) state.orderAction = "whitelist";
        if (page === "order-detail" && (el.textContent || "").includes("改单")) state.orderAction = "modify";
        if (page === "selection-detail" || page === "buyer-selection-edit") state.selAddOpen = false;
        if (page === "goods-restock") {
          Store.db.ui.restockBrand = "";
          Store.db.ui.restockKind = "";
          Store.persist();
        }
        go(page);
      });
    });
    app.querySelectorAll("[data-role]").forEach(el => {
      el.addEventListener("click", () => {
        state.roleLogin = el.getAttribute("data-role");
        render();
      });
    });
    const loginBtn = $("#do-login");
    if (loginBtn) {
      loginBtn.addEventListener("click", () => {
        state.portal = state.roleLogin;
        localStorage.setItem("rr_portal", state.portal);
        state.page = state.portal === "buyer" ? "buyer-home" : state.portal === "brand" ? "brand-discount" : "goods-list";
        render();
      });
    }
    app.querySelectorAll("[data-qty]").forEach(el => {
      el.addEventListener("click", () => {
        const s = el.getAttribute("data-qty");
        const d = Number(el.getAttribute("data-d"));
        state.qty[s] = Math.max(0, (state.qty[s] || 0) + d);
        render();
      });
    });
    app.querySelectorAll("[data-line-qty]").forEach(el => {
      el.addEventListener("click", () => {
        const sku = el.getAttribute("data-line-qty");
        const size = el.getAttribute("data-size");
        const d = Number(el.getAttribute("data-d"));
        const selObj = state.selectedSel || Store.db.selections[0];
        const r = Store.bumpSelectionQty(selObj.id, sku, size, d);
        if (!r.ok) toast(r.msg);
        state.selectedSel = Store.db.selections.find(x => x.id === selObj.id) || selObj;
        render();
      });
    });
    app.querySelectorAll("[data-draft-qty]").forEach(el => {
      el.addEventListener("click", () => {
        Store.bumpDraftQty(el.getAttribute("data-draft-qty"), el.getAttribute("data-size"), Number(el.getAttribute("data-d")));
        render();
      });
    });
    app.querySelectorAll("[data-tabsoft]").forEach(btnEl => {
      btnEl.addEventListener("click", () => {
        const mode = btnEl.getAttribute("data-mode");
        const styleDim = btnEl.getAttribute("data-style-dim");
        const orderTab = btnEl.getAttribute("data-order-tab");
        if (mode) { Store.setDiscountMode(mode); render(); toast("已切换：" + btnEl.textContent.trim()); return; }
        if (styleDim) { Store.setStyleDim(styleDim); render(); toast("已切换：" + btnEl.textContent.trim()); return; }
        if (orderTab) { Store.setBuyerOrderTab(orderTab); render(); toast("已切换：" + orderTab); return; }
        const buyerTab = btnEl.getAttribute("data-buyer-tab");
        if (buyerTab) {
          Store.db.ui.buyerFilter = Store.db.ui.buyerFilter || {};
          Store.db.ui.buyerFilter.levelTab = buyerTab;
          Store.persist();
          state.listPage = 1;
          render();
          toast("已切换：" + buyerTab);
          return;
        }
        btnEl.parentElement.querySelectorAll("button").forEach(b => b.classList.remove("on"));
        btnEl.classList.add("on");
        toast(`已切换：${btnEl.textContent.trim()}`);
      });
    });
    app.querySelectorAll("[data-page]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        state.listPage = Number(el.getAttribute("data-page")) || 1;
        render();
      });
    });
    app.querySelectorAll("[data-recon]").forEach(btnEl => {
      btnEl.addEventListener("click", () => {
        state.reconTab = btnEl.getAttribute("data-recon");
        render();
      });
    });
    app.querySelectorAll("[data-order-action]").forEach(btnEl => {
      btnEl.addEventListener("click", () => {
        state.orderAction = btnEl.getAttribute("data-order-action");
        render();
      });
    });
    app.querySelectorAll("[data-action-toast]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        toast(el.getAttribute("data-action-toast"));
      });
    });
    app.querySelectorAll("[data-gen-order]").forEach(el => {
      el.addEventListener("click", () => handleAct("gen-order", el));
    });
    app.querySelectorAll("[data-confirm-sel]").forEach(el => {
      el.addEventListener("click", () => handleAct("buyer-confirm-sel", el));
    });
    app.querySelectorAll("[data-toggle-rule]").forEach(el => {
      el.addEventListener("click", () => {
        const season = "2026SS";
        Store.db.buyerSession.hasFirstOrderBySeason[season] = !Store.db.buyerSession.hasFirstOrderBySeason[season];
        state.hasFirstOrder = !!Store.db.buyerSession.hasFirstOrderBySeason[season];
        Store.persist();
        toast(state.hasFirstOrder ? "已恢复：存在首单" : "已模拟：无首单（确认将被拦截）");
        render();
      });
    });
    app.querySelectorAll("[data-view]").forEach(el => {
      el.addEventListener("click", () => {
        state.viewMode = el.getAttribute("data-view");
        render();
      });
    });
    app.querySelectorAll("[data-toggle-cart]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        if (el.classList.contains("btn-primary") || (el.textContent || "").includes("去选款单")) {
          go("buyer-selection");
          return;
        }
        state.cartOpen = !state.cartOpen;
        render();
      });
    });
    app.querySelectorAll("[data-heart]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        const sku = el.getAttribute("data-heart");
        toast(Store.toggleHeart(sku));
        syncBuyerCart();
        render();
      });
    });
    app.querySelectorAll(".nav-right a").forEach(a => {
      if ((a.textContent || "").includes("账户中心")) {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          if (state.portal === "buyer") go("buyer-profile");
          else go("account-center");
        });
      }
    });

    wireUniversalClicks();
  }

  // boot
  if (location.hash === "#app") {
    state.page = state.portal === "buyer" ? "buyer-home" : "goods-list";
  } else {
    state.page = "login";
  }
  render();
})();
