(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $("#app");
  const state = {
    portal: localStorage.getItem("rr_portal") || "platform", // platform | brand | buyer | mp
    page: "login",
    roleLogin: "platform",
    selectedBrand: "HAIZHEN WANG",
    selectedFair: "",
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
    selectedAppoint: null,
    selectedMsg: null,
    selectedLook: null,
    listPage: 1,
    selAddOpen: false,
    cartBrandFilter: "",
    navStack: []
  };

  /* 子页默认上级（无浏览历史时回退）；侧栏直达的顶层页不注入返回 */
  const PAGE_PARENT = {
    "goods-add": "goods-list",
    "goods-view": "goods-list",
    "goods-carry": "goods-list",
    "goods-batch": "goods-list",
    "brand-add": "brand-list",
    "brand-discount": "brand-list",
    "brand-size": "brand-list",
    "brand-pay": "brand-list",
    "brand-contract": "brand-list",
    "brand-deposit": "brand-list",
    "brand-audit-set": "brand-list",
    "brand-edit": "brand-list",
    "brand-fair": "brand-list",
    "brand-fair-new": "fair-list",
    "fair-add": "fair-list",
    "brand-master-style": "brand-list",
    "brand-master-crowd": "brand-list",
    "brand-master-size": "brand-list",
    "selection-detail": "order-selection",
    "order-detail": "order-list",
    "order-contract": "order-list",
    "order-oc": "order-list",
    "contract-preview": "order-detail",
    "oc-preview": "order-oc",
    "ship-detail": "ship-list",
    "buyer-add": "buyer-list",
    "buyer-store": "buyer-list",
    "buyer-invoice": "buyer-list",
    "buyer-address": "buyer-list",
    "buyer-edit": "buyer-list",
    "buyer-sub": "buyer-list",
    "buyer-add-brand": "buyer-list",
    "buyer-appoint": "buyer-list",
    "appoint-list": "fair-list",
    "appoint-audit": "fair-list",
    "fair-appoint": "fair-list",
    "fair-slots": "fair-list",
    "fair-checkin": "fair-list",
    "goods-preview": "goods-list",
    "buyer-subs": "buyer-list",
    "mp-qr": "buyer-profile",
    "mp-scan": "buyer-profile",
    "role-perm": "account-list",
    "account-center": "account-list",
    "account-list": "account-list",
    "role-list": "account-list",
    "buyer-brand": "buyer-home",
    "buyer-brand-about": "buyer-brand",
    "buyer-detail": "buyer-brand",
    "buyer-selection-edit": "buyer-selection",
    "buyer-order-detail": "buyer-orders",
    "buyer-message": "buyer-profile",
    "buyer-message-detail": "buyer-message",
    "buyer-profile": "buyer-home",
    "buyer-intent": "buyer-profile",
    "buyer-appoint-apply": "buyer-profile",
    "buyer-appoint-detail": "buyer-appoint-apply",
    "buyer-look-detail": "buyer-brand-about",
    "buyer-intent-detail": "buyer-intent",
    "buyer-cart": "buyer-brand",
    "buyer-replenish-cart": "buyer-replenish",
    register: "login",
    "register-status": "login"
  };

  function isRootNavEl(el) {
    /* 顶栏铃铛/个人中心属于子页入口，不当作顶层导航 */
    if (el && el.closest(".login_area, .bell_tip, .nav_person")) return false;
    return !!(el && el.closest(".mine_side, .uk-navbar-nav, .proto-bar, .nav_menu, .logo_area, .ots_order-nav > .topnav-inner > .logo, .rr-mp-tabbar"));
  }

  function resolveBackTarget() {
    if (state.navStack.length) return state.navStack[state.navStack.length - 1];
    const parent = PAGE_PARENT[state.page];
    if (!parent) return "";
    /* 品牌端店铺设置页即顶层，不强制回品牌列表 */
    if (state.portal === "brand" && /^brand-(discount|size|fair|pay|contract|edit)/.test(state.page)) return "";
    if (state.portal === "mp" && (state.page === "buyer-home" || state.page === "buyer-replenish")) return "buyer-order-hub";
    if (state.portal === "brand" && parent === "goods-list") return "brand-discount";
    return parent;
  }

  function pageBackBar() {
    if (!resolveBackTarget()) return "";
    return `<div class="page-back-bar"><a href="javascript:;" class="page-back" data-act="back">← 返回上一级</a></div>`;
  }

  function bodyHasBack(html) {
    return /data-act="(?:back|restock-back|ship-back)"|返回上一级|返回(?:品牌列表|商品列表|订单列表|列表|订单|登录)/.test(html || "");
  }

  /* 把返回条注入内容壳内部，避免贴在视口最左侧、与居中内容错位 */
  function withPageBack(html) {
    if (bodyHasBack(html) || !resolveBackTarget()) return html || "";
    const bar = pageBackBar();
    const patterns = [
      /(<div class="oto_container[^"]*"[^>]*>)/,
      /(<div class="brand_goodsList-container"[^>]*>)/,
      /(<div class="brand_detail-container"[^>]*>)/,
      /(<div class="goods_detail-container"[^>]*>)/,
      /(<div class="public_right-container[^"]*"[^>]*>)/,
      /(<div class="register-card"[^>]*>)/,
      /(<div class="login-card"[^>]*>)/
    ];
    for (const re of patterns) {
      if (re.test(html)) return html.replace(re, `$1${bar}`);
    }
    return bar + html;
  }

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
        { id: "brand", label: "品牌管理" },
        { id: "fair", label: "订货会管理" },
        { id: "goods", label: "商品管理" },
        { id: "order", label: "订单管理" },
        /* #8 平台端隐藏「发货管理」；#37 预约管理并进订货会 */
        { id: "intent", label: "意向审核" },
        { id: "buyer", label: "买手管理" },
        /* #17 角色权限 + 账户中心 → 账号权限 */
        { id: "account", label: "账号权限" }
      ],
      side: {
        brand: [
          { id: "brand-list", label: "品牌列表" },
          { id: "brand-add", label: "添加品牌" },
          { id: "brand-discount", label: "设置优惠规则" },
          { id: "brand-size", label: "设置尺寸别名" },
          { id: "brand-pay", label: "收款设置" },
          { id: "brand-contract", label: "合同设置" },
          { id: "brand-fair", label: "订货会设置" },
          { id: "brand-deposit", label: "订单首付比例" },
          { id: "brand-audit-set", label: "下单需审核买手" },
          { id: "brand-edit", label: "品牌信息编辑" },
          { id: "brand-master-style", label: "风格资料维护" },
          { id: "brand-master-crowd", label: "适用人群维护" },
          { id: "brand-master-size", label: "平台标准尺码" }
        ],
        fair: [
          { id: "fair-list", label: "订货会列表" },
          { id: "fair-add", label: "添加订货会" },
          { id: "appoint-audit", label: "审核预约" },
          { id: "appoint-list", label: "预约列表" },
          { id: "fair-checkin", label: "签到记录" }
        ],
        goods: [
          { id: "goods-restock", label: "补货/隐藏商品" },
          { id: "goods-cat", label: "商品分类" },
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
          /* #14 订单管理下去掉预约列表 */
          { id: "order-recon", label: "对账管理" },
          { id: "order-kingdee", label: "金蝶同步" }
        ],
        ship: [{ id: "ship-list", label: "发货管理" }],
        /* #27 审核预约要保留；预约列表只展示已通过 */
        appoint: [
          { id: "appoint-list", label: "预约列表" },
          { id: "appoint-audit", label: "审核预约" }
        ],
        intent: [{ id: "intent-list", label: "意向管理" }],
        buyer: [
          { id: "buyer-list", label: "买手审核" },
          { id: "buyer-subs", label: "子账号管理" },
          { id: "buyer-balance", label: "余额管理" },
          { id: "buyer-store", label: "查看店铺资料" },
          { id: "buyer-invoice", label: "修改发票信息" },
          { id: "buyer-address", label: "修改地址" },
          { id: "buyer-edit", label: "编辑资料" },
          { id: "buyer-sub", label: "查看子店铺信息" },
          { id: "buyer-add-brand", label: "添加品牌" },
          { id: "buyer-appoint", label: "添加预约" }
        ],
        account: [
          { id: "account-list", label: "账号列表" },
          { id: "role-perm", label: "权限设置" }
        ],
        role: [
          { id: "account-list", label: "账号列表" },
          { id: "role-perm", label: "权限设置" }
        ]
      },
      defaultPage: "brand-list"
    },
    brand: {
      top: [
        { id: "brand", label: "品牌设置" },
        { id: "goods", label: "商品管理" },
        { id: "order", label: "订单管理" },
        /* #8/#19 品牌端隐藏发货 */
        { id: "intent", label: "意向审核" }
      ],
      defaultPage: "brand-list"
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

  function selPlatformOpts() {
    return { platform: state.portal === "platform" || state.portal === "brand" };
  }

  function setPortal(p) {
    state.portal = p;
    localStorage.setItem("rr_portal", p);
    state.navStack = [];
    if (p === "mp") state.page = Store.db.buyerSession.role === "checker" ? "mp-scan" : "buyer-order-hub";
    else if (p === "buyer") state.page = "buyer-home";
    else if (p === "brand") state.page = "brand-list";
    else if (p === "audit") state.page = "coverage";
    else state.page = "brand-list";
    state.cartOpen = false;
    state.orderAction = "";
    render();
  }

  function go(page, opts = {}) {
    // 补货/隐藏：侧栏再次进入时回到品牌列表（非详情钻取）
    if (page === "goods-restock") {
      Store.db.ui.restockBrand = "";
      Store.db.ui.restockKind = "";
      Store.persist();
    }
    /* 品牌下「订货会设置」走品牌二级页，不再跳到订货会创建 */
    if (page === "brand-fair-new") page = "fair-add";
    if (page === "goods-look") page = "goods-list";
    if (page === "goods-add") { state.goodsSpecs = null; state.goodsDraft = null; }

    if (opts.replace) {
      state.navStack = [];
    } else if (opts.back) {
      /* 已由调用方 pop */
    } else if (page && page !== state.page) {
      state.navStack.push(state.page);
      if (state.navStack.length > 24) state.navStack.shift();
    }

    state.page = page;
    state.cartOpen = false;
    state.listPage = 1;
    state.selAddOpen = false;
    if (page !== "order-detail" && page !== "buyer-order-detail") state.orderAction = "";
    window.scrollTo(0, 0);
    render();
  }

  function topGroup(page) {
    if (page === "coverage" || page.startsWith("account") || page.startsWith("role")) return "account";
    if (page.startsWith("appoint") || page.startsWith("fair")) return "fair";
    if (page.startsWith("brand")) return "brand";
    if (page.startsWith("goods")) return "goods";
    if (page.startsWith("order") || page.startsWith("selection") || page.startsWith("contract") || page.startsWith("oc-")) return "order";
    if (page.startsWith("ship")) return "ship";
    if (page.startsWith("intent")) return "intent";
    if (page.startsWith("buyer-") && state.portal !== "buyer") return "buyer";
    return "brand";
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
      [/^查看已上传凭证$/, "open-vouchers"],
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
      /* #24 预约小程序 → 小程序（内容与买手端一致） */
      ["mp", "小程序"]
    ];
    return `<div class="proto-bar">
      <strong>ROOMROOM 原型确认</strong>
      <span>|</span>
      ${items.map(([id, lab]) =>
        `<a href="javascript:;" class="${state.portal === id ? "on" : ""}" data-portal="${id}">${lab}</a>`
      ).join("")}
      <span>|</span>
      <a href="javascript:;" class="${state.page === "coverage" ? "on" : ""}" data-go="coverage">覆盖核对</a>
      <a href="javascript:;" class="${state.page === "login" ? "on" : ""}" data-go="login">登录/注册</a>
      ${state.portal === "mp" ? `<a href="javascript:;" data-act="toggle-checker">${Store.db.buyerSession.role === "checker" ? "签到员✓" : "签到员"}</a>` : ""}
    </div>`;
  }

  function topnav(portal) {
    if (portal === "buyer" || portal === "mp") {
      /* #22 预约申请挪到补货后边；#24 小程序顶栏与买手端一致 */
      const items = [
        ["buyer-home", "品牌", state.page === "buyer-home" || state.page.startsWith("buyer-brand") || state.page === "buyer-detail"],
        ["buyer-replenish", "补货", state.page === "buyer-replenish"],
        ["buyer-appoint-apply", "预约申请", state.page === "buyer-appoint-apply"],
        ["buyer-selection", "我的选款单", state.page.startsWith("buyer-selection")],
        ["buyer-orders", "我的订单", state.page.startsWith("buyer-order")],
        ["buyer-intent", "意向品牌", state.page === "buyer-intent"]
      ];
      return `<header class="oto-nav buyer-oto-nav" id="navTop">
        <div class="oto_container nav-container">
          <div class="logo_area"><a href="javascript:;" data-go="buyer-home">ROOMROOM${portal === "mp" ? `<span class="mp-tag">小程序</span>` : ""}</a></div>
          <ul class="nav_menu">
            ${items.map(([id, lab, on]) => `<li class="${on ? "active" : ""}"><a href="javascript:;" data-go="${id}">${lab}</a></li>`).join("")}
          </ul>
          <div class="login_area">
            <a class="bell_tip" href="javascript:;" data-go="buyer-message" title="消息通知" aria-label="消息通知">
              <svg class="nav-ico" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 22a2.2 2.2 0 0 0 2.2-2.2h-4.4A2.2 2.2 0 0 0 12 22zm7-5.2V11a7 7 0 0 0-5-6.7V3.8a2 2 0 1 0-4 0v.5A7 7 0 0 0 5 11v5.8L3.4 18.4A1 1 0 0 0 4.1 20h15.8a1 1 0 0 0 .7-1.6L19 16.8z"/></svg>
              ${Store.unreadMessageCount() ? `<i class="msg-badge">${Store.unreadMessageCount()}</i>` : ""}
            </a>
            <a class="nav_person" href="javascript:;" data-go="buyer-profile" title="个人中心" aria-label="个人中心">
              <svg class="nav-ico" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 12a4.5 4.5 0 1 0-4.5-4.5A4.5 4.5 0 0 0 12 12zm0 2.2c-3.6 0-8 1.8-8 5.3V21a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-1.5c0-3.5-4.4-5.3-8-5.3z"/></svg>
            </a>
          </div>
        </div>
      </header>`;
    }

    const cfg = portal === "brand" ? routes.brand : routes.platform;
    const group = topGroup(state.page);
    const firstPage = {
      brand: "brand-list",
      fair: "fair-list",
      goods: "goods-list",
      order: "order-selection",
      ship: "ship-list",
      appoint: "appoint-list",
      intent: "intent-list",
      buyer: "buyer-list",
      account: "account-list",
      role: "account-list"
    };
    /* #17 平台账号权限；#21 品牌端去掉账户中心/账号权限入口 */
    return `<nav class="topnav ots_order-nav" id="ots_order-nav"><div class="topnav-inner ots_order-width nav-bar">
      <a class="logo" href="javascript:;" data-go="${cfg.defaultPage}">ROOMROOM</a>
      <ul class="nav-links uk-navbar-nav">${cfg.top.map(t =>
        `<li><a href="javascript:;" class="${group === t.id ? "active" : ""}" data-go="${firstPage[t.id]}">${t.label}</a></li>`
      ).join("")}</ul>
      <div class="nav-right ots_order-nav_person">
        <span class="avatar">管</span>
        ${state.portal === "platform"
          ? `<a class="uk-button" href="javascript:;" data-go="account-list">账号权限</a>`
          : ""}
      </div>
    </div></nav>`;
  }

  function sidebar() {
    // 原站：品牌列表 + 品牌设置子页均为 no-sidebars（从品牌行链接进入）
    const brandNoSide = [
      "brand-list", "brand-discount", "brand-size",
      "brand-pay", "brand-contract", "brand-deposit", "brand-audit-set", "brand-edit",
      "brand-add",
      "buyer-list", "ship-list"
    ];
    if (brandNoSide.includes(state.page)) return "";
    const group = topGroup(state.page);
    let items = (routes.platform.side[group] || []);
    // 主数据页：侧栏仅保留品牌列表 + 三项主数据
    if (/^brand-master-/.test(state.page)) {
      items = [
        { id: "brand-list", label: "品牌列表" },
        { id: "brand-master-style", label: "风格资料维护" },
        { id: "brand-master-crowd", label: "适用人群维护" },
        { id: "brand-master-size", label: "平台标准尺码" }
      ];
    }
    if (state.portal === "brand") {
      if (group === "buyer" || group === "role" || group === "account") items = [];
      if (group === "brand") {
        /* #18 品牌端店铺设置用品牌列表行样式，侧栏隐藏，仅当前品牌 */
        items = [];
      }
      if (group === "order") {
        items = items.filter(i => !["order-recon", "order-appoint"].includes(i.id));
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
    const isBuyer = state.roleLogin === "buyer";
    const isBrand = state.roleLogin === "brand";
    const defPhone = isBuyer ? (Store.db.buyerSession.phone || "13681383088")
      : isBrand ? ((Store.db.brandSession && Store.db.brandSession.phone) || "13800000001")
      : "13800000000";
    return `${protoBar()}
    <div class="login-page">
      <div class="login-card">
        <h1>ROOMROOM</h1>
        <div class="sub">订货管理系统 · 手机号 + 验证码登录</div>
        <div class="role-pick">
          <button class="${state.roleLogin === "platform" ? "on" : ""}" data-role="platform">平台端</button>
          <button class="${isBrand ? "on" : ""}" data-role="brand">品牌端</button>
          <button class="${isBuyer ? "on" : ""}" data-role="buyer">买手端</button>
        </div>
        <div class="login-field"><label>手机号</label>${field("loginPhone", input("请输入手机号", defPhone))}</div>
        <div class="login-field"><label>验证码</label>
          <div class="row">${field("loginCode", input("6位验证码", "888888"))}<button type="button" class="code-btn" data-act="send-code">获取验证码</button></div>
        </div>
        <button class="btn btn-primary btn-block" id="do-login">登录</button>
        ${isBuyer ? `<div class="login-links">
          <a href="javascript:;" data-go="register">买手注册</a>
          <span>·</span>
          <a href="javascript:;" data-go="register-status">查询审核进度</a>
        </div>
        <div class="note login-note">买手端需<strong>平台审核通过</strong>后才能登录（《注册流程图》）。<br/>
          可试：<code>13681383088</code> 已通过 · <code>18659515999</code> 待审核（登录被拦截）</div>`
        : isBrand ? `<div class="note login-note">品牌端用添加品牌时填写的<strong>联系手机</strong>作为登录账号。<br/>
          可试：<code>${(RR.brands[0] && RR.brands[0].phone) || "13800000001"}</code> ${(RR.brands[0] && RR.brands[0].name) || "HAIZHEN WANG"}</div>`
        : `<p class="login-note-min">根据账号身份权限自动进入对应端口（统一登录页）</p>`}
      </div>
    </div>`;
  }

  /* 《注册流程图》买手端：填写资料注册 → 提交申请 */
  function pageBuyerRegister() {
    const reg = Store.db.regSession || {};
    const prev = reg.phone ? Store.buyerRegStatus(reg.phone) : { found: false };
    const b = (prev.found && prev.buyer) || {};
    const rejected = prev.found && prev.status === "已拒绝";
    /* 校验失败重渲染时保留已填内容 */
    const d = state.regDraft || {};
    const dv = (k, fallback) => (d[k] === undefined || d[k] === "" ? fallback : d[k]);
    return `${protoBar()}
    <div class="login-page register-page">
      <div class="login-card register-card">
        <h1>买手注册</h1>
        <div class="sub">手机号 + 验证码注册，提交后由平台审核（审核通过才可登录买手端）</div>
        ${rejected ? `<div class="reject-tip">上次申请被拒绝：${b.reason || "资料不符合要求"}<br/>请修改资料后重新提交。</div>` : ""}
        <div class="reg-grid">
          <div class="login-field"><label>手机号 *</label>
            <div class="row">${field("regPhone", input("11 位手机号", dv("regPhone", b.phone || reg.phone || "")))}<button type="button" class="code-btn" data-act="send-code">获取验证码</button></div>
          </div>
          <div class="login-field"><label>验证码 *</label>${field("regCode", input("6位验证码", "888888"))}</div>
          <div class="login-field"><label>店铺名 *</label>${field("regStore", input("买手店/集合店名称", dv("regStore", b.name || reg.store || "")))}</div>
          <div class="login-field"><label>联系人 *</label>${field("regContact", input("联系人姓名", dv("regContact", b.contact || "")))}</div>
          <div class="login-field"><label>所在城市 *</label>${field("regCity", select(RR.cities, "请选择", dv("regCity", b.city || "上海市 / 上海市")))}</div>
          <div class="login-field"><label>店铺地址</label>${field("regAddr", input("详细地址", dv("regAddr", (b.addresses && b.addresses[0] && b.addresses[0].addr) || "")))}</div>
          <div class="login-field"><label>发票抬头</label>${field("regInvoice", input("公司名称", dv("regInvoice", (b.invoice && b.invoice.title) || "")))}</div>
          <div class="login-field"><label>税号</label>${field("regTax", input("纳税人识别号", dv("regTax", (b.invoice && b.invoice.tax) || "")))}</div>
          <div class="login-field"><label>意向品牌</label>${field("regIntent", select(RR.brands.map(x => x.name), "暂不选择", dv("regIntent", b.intent || "暂不选择")))}</div>
          <div class="login-field"><label>门店照片</label><div class="upload-box sm"><div class="plus">+</div>巡店图 · &lt;5MB</div></div>
        </div>
        <label class="check-inline reg-agree"><input type="checkbox" data-field="regAgree" checked /> 已阅读并同意《平台服务协议》</label>
        <button class="btn btn-primary btn-block" data-act="submit-register">提交申请</button>
        <div class="login-links">
          <a href="javascript:;" data-go="login">返回登录</a><span>·</span>
          <a href="javascript:;" data-go="register-status">查询审核进度</a>
        </div>
      </div>
    </div>`;
  }

  /* 《注册流程图》：审核拒绝 → 回到填写资料；审核通过 → 登录买手端 */
  function pageRegisterStatus() {
    const reg = Store.db.regSession || {};
    const r = Store.buyerRegStatus(state.regQueryPhone || reg.phone || "");
    const st = r.found ? r.status : "";
    const badge = st === "已通过" ? "green" : st === "已拒绝" || st === "已关闭" ? "red" : "";
    return `${protoBar()}
    <div class="login-page">
      <div class="login-card">
        <h1>注册审核进度</h1>
        <div class="sub">平台端「买手管理 · 买手审核」处理后，此处状态同步更新</div>
        <div class="login-field"><label>手机号</label>
          <div class="row">${field("queryPhone", input("注册手机号", r.phone || ""))}<button type="button" class="code-btn" data-act="query-reg">查询</button></div>
        </div>
        ${r.found ? `<div class="reg-status-box">
          <div class="row"><span>店铺名</span><b>${r.store}</b></div>
          <div class="row"><span>提交时间</span><b>${r.at || "—"}</b></div>
          <div class="row"><span>审核状态</span><b class="badge ${badge}">${st}</b></div>
          ${r.reason ? `<div class="row"><span>拒绝原因</span><b class="red-text">${r.reason}</b></div>` : ""}
        </div>
        ${st === "已通过"
          ? `<button class="btn btn-primary btn-block" data-act="login-as-buyer:${r.phone}">登录买手端</button>`
          : st === "已拒绝" || st === "已关闭"
            ? `<button class="btn btn-primary btn-block" data-go="register">修改资料重新提交</button>`
            : `<div class="note">审核中：平台端可在「买手管理 → 买手审核」通过或拒绝本申请。</div>`}`
        : `<div class="note">未查询到该手机号的注册记录，请先<a href="javascript:;" data-go="register">提交注册资料</a>。</div>`}
        <div class="login-links"><a href="javascript:;" data-go="login">返回登录</a></div>
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
        <div class="goods_sku goods-meta">SKU:<span>${g.sku}</span>　SKC:<span>${g.skc || g.sku}</span>${g.color ? `　颜色<span>${g.color}</span>` : ""}　品牌<span>${g.brand}</span>　季节<span>${g.season}</span>${g.carry ? '　<span class="badge">Carry Over</span>' : ""}</div>
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
            <a href="javascript:;" class="oto_btn" data-go="goods-add" data-sku="${g.skc || g.sku}">编辑</a>
            <a href="javascript:;" class="oto_btn" data-go="goods-preview" data-sku="${g.skc || g.sku}">预览</a>
            <a href="javascript:;" class="oto_btn" data-act="sync-goods-price:${g.skc || g.sku}">同步价格到订单</a>
            <a href="javascript:;" class="oto_btn" data-act="toggle-delete:${g.skc || g.sku}">${g.status === "已删款" ? "取消删款" : "删款"}</a>
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

  /* 《功能点思维导图》添加新商品：编号可重复 / 支持多规格 / skc编号 */
  function goodsSpecRows() {
    const sizes = Store.db.standardSizes || ["XS", "S", "M", "L", "XL"];
    const specs = state.goodsSpecs && state.goodsSpecs.length ? state.goodsSpecs : [{ color: "", skc: "", sizes: ["S", "M", "L"] }];
    state.goodsSpecs = specs;
    /* #6 颜色改为手填，不再用固定色下拉 */
    return `<div class="spec-list">
      ${specs.map((sp, i) => `<div class="spec-row" data-spec="${i}">
        <div class="spec-idx">规格 ${i + 1}</div>
        <div class="spec-f spec-color"><label>颜色</label>${field("specColor-" + i, input("手填颜色，如 黑色 / 酒红", sp.color || ""))}</div>
        <div class="spec-f spec-skc"><label>SKC 编号</label>${field("specSkc-" + i, input("留空自动生成，如 JL26SS001-01", sp.skc || ""))}</div>
        <div class="spec-f spec-sizes"><label>尺寸</label>${checkGroup("specSizes-" + i, sizes, sp.sizes && sp.sizes.length ? sp.sizes : ["S", "M", "L"])}</div>
        <div class="spec-ops">${specs.length > 1 ? `<a href="javascript:;" class="oto_btn sm" data-act="del-spec:${i}">删除</a>` : ""}</div>
      </div>`).join("")}
    </div>
    <div class="action-bar"><a href="javascript:;" class="oto_btn" data-act="add-spec">+ 添加规格（颜色）</a></div>`;
  }

  function pageGoodsAdd() {
    /* 原站：sub_title「修改商品信息」；波段=text；季节/色/尺码/品类=select；Carry=checkbox；发货时间=text 控件（原型用 date） */
    const d = state.goodsDraft || {};
    const dv = (k, fallback) => (d[k] === undefined || d[k] === "" ? fallback : d[k]);
    /* #7 二层商品分类：一级 → 二级联动 */
    const cats = Store.db.categories || [];
    const catNames = cats.map(c => c.name);
    const catName = dv("cat", catNames[0] || "女装");
    const catObj = cats.find(c => c.name === catName) || cats[0] || { children: [] };
    const subOptions = (catObj.children && catObj.children.length) ? catObj.children : ["未分类"];
    const subName = subOptions.includes(dv("subcat", "")) ? dv("subcat", subOptions[0]) : subOptions[0];
    return `${subTitle("添加新商品")}
      <div class="note">商品编号（款号）<strong>允许重复</strong>；每个「款 + 色」为一条 <strong>SKC</strong>，SKC 编号在平台内唯一，留空按「编号-序号」自动生成。颜色请<strong>手填</strong>；品类为二层分类。</div>
      <div class="ots_order-form ots_order-form-column goods-add-form">
        <div class="form_item-long"><label class="req">所属品牌 *</label><div>${field("brand", select(RR.brands.map(b => b.name), "选择品牌", dv("brand", "JUNLI")))}</div></div>
        <div class="form_item-long"><label class="req">款式名称 *</label><div>${field("title", input("款式名称", dv("title", "")))}</div></div>
        <div class="form_item-long"><label class="req">商品编号(sku) *</label><div>${field("sku", input("商品编号，可与已有商品重复", dv("sku", "")))}</div></div>
        <div class="form_item-long"><label>波段</label><div>${field("band", input("波段名称", dv("band", "")))}</div></div>
        <div class="form_item-long"><label>预计发货时间</label><div>${field("shipAt", dateInput(dv("shipAt", "")))}</div></div>
        <div class="form_item-long"><label class="req">季节 *</label><div>${field("season", select(RR.seasons, null, dv("season", "2026SS")))}</div></div>
        <div class="form_item-long"><label>Carry Over</label><div><label class="check-inline"><input type="checkbox" data-field="carry" /></label></div></div>
        <div class="form_item-long"><label>可补货</label><div><label class="check-inline"><input type="checkbox" data-field="restock" checked /></label></div></div>
        <div class="form_item-long"><label class="req">规格（颜色 + SKC 编号 + 尺寸）*</label><div>${goodsSpecRows()}</div></div>
        <div class="form_item-long"><label>面料/材质</label><div>${field("fabric", input("", dv("fabric", "")))}</div></div>
        <div class="form_item-long"><label class="req">一级分类 *</label><div>${field("cat", `<select data-act-change="goods-cat-change">${catNames.map(n => `<option value="${n}" ${n === catName ? "selected" : ""}>${n}</option>`).join("")}</select>`)}</div></div>
        <div class="form_item-long"><label class="req">二级分类 *</label><div>${field("subcat", select(subOptions, null, subName))}</div></div>
        <div class="form_item-long"><label class="req">建议零售价 *</label><div>${field("retail", input("CNY", dv("retail", "3000")))}</div></div>
        <div class="form_item-long"><label class="req">订货价 *</label><div>${field("wholesale", input("CNY", dv("wholesale", "1350")))}<div class="muted" style="margin-top:6px">改价后回到商品列表，点「同步价格到订单」会更新所有未完成订单中此商品的价格并重算折扣。</div></div></div>
        <div class="form_item-long"><label>最小起订量</label><div>${field("moq", input("件", dv("moq", "1")))}</div></div>
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
        <thead><tr><th>图片</th><th>SKU</th><th>商品</th><th>季节</th><th>${kind === "hide" ? "隐藏（全不可见）" : "可补货"}</th></tr></thead>
        <tbody>
          ${list.map(g => `<tr data-sku="${g.skc || g.sku}">
            <td>${goodsThumb("sm")}</td><td>${g.skc || g.sku}</td><td>${g.title}${g.color ? ` · ${g.color}` : ""}</td><td>${g.season}</td>
            <td>${kind === "hide"
              ? field("hide-" + (g.skc || g.sku), select(["否", "是"], null, g.hideAll ? "是" : "否"))
              : field("restock-" + (g.skc || g.sku), select(["是", "否"], null, g.restock !== false ? "是" : "否"))}</td>
          </tr>`).join("") || '<tr><td colspan="5">该季度暂无商品</td></tr>'}
        </tbody>
      </table>`;
  }

  function pageGoodsLook() {
    const looks = Store.db.looks || [];
    const openId = Store.db.ui.lookEditId;
    const open = looks.find(l => String(l.id) === String(openId));
    return `${subTitle("LOOK 列表")}
      <div class="note">可新增 / 绑定 SKU / 删除；买手端品牌介绍 LOOKBOOK 同步读取。</div>
      <div class="action-bar">${btn("新增 LOOK", "btn-outline", "add-look")}</div>
      <div class="product-grid">
        ${looks.map(l => `<div class="product-card">
          <div class="cover" data-act="look-open:${l.id}">LOOK ${l.id}</div>
          <div class="name">${l.title}</div>
          <div class="meta">${l.season} · ${(l.skus || []).length} SKU</div>
          <div class="ops" style="margin-top:8px">
            <a href="javascript:;" data-act="look-open:${l.id}">编辑</a>
            <a href="javascript:;" data-act="look-del:${l.id}">删除</a>
          </div>
        </div>`).join("") || '<div class="note">暂无 LOOK</div>'}
      </div>
      ${open ? `<div class="form-section" style="margin-top:24px">
        <h3>编辑 LOOK ${open.id}</h3>
        <div class="form-grid">
          <label>标题</label><div>${field("lookTitle", input("", open.title))}</div>
          <label>季节</label><div>${field("lookSeason", select(RR.seasons, null, open.season))}</div>
          <label>关联 SKU</label><div class="span2">${field("lookSkus", input("", (open.skus || []).join(",")))}</div>
        </div>
        <div class="action-bar">
          ${btn("保存 LOOK", "btn-primary", "look-save:" + open.id)}
          ${btn("关闭", "btn-outline", "look-close")}
        </div>
      </div>` : ""}`;
  }

  function pageGoodsCat() {
    /* #7 二层商品分类维护 */
    return `${subTitle("商品分类")}
      <div class="note">商品分类为<strong>二层</strong>：一级分类下挂二级；添加商品时关联一级 + 二级。</div>
      <table class="data-table">
        <thead><tr><th>一级分类</th><th>二级分类</th><th>商品数</th><th>操作</th></tr></thead>
        <tbody>
          ${Store.db.categories.map(c => `<tr>
            <td>${c.name}</td>
            <td>${(c.children || []).join(" / ") || "—"}</td>
            <td>${c.count}</td>
            <td class="ops"><a href="javascript:;" data-act="edit-category:${c.name}">编辑二级</a></td>
          </tr>`).join("")}
        </tbody>
      </table>
      <div style="margin-top:16px">${btn("新增分类", "btn-outline", "add-category")}</div>`;
  }

  function pageBrandList() {
    /* 品牌列表含订货会设置；#3 首付比例/审核为二级页链接；#18 品牌端仅当前账号品牌 */
    const isPlatform = state.portal === "platform";
    const mine = state.selectedBrand || (RR.brands[0] && RR.brands[0].name) || "HAIZHEN WANG";
    const brands = isPlatform ? RR.brands : RR.brands.filter(b => b.name === mine);
    return `<div class="brand_goodsList-container edit_boduan brand-list-v2">
      ${subTitle(isPlatform ? "品牌列表" : "店铺设置")}
      <div class="note">${isPlatform
        ? "「下单需审核买手」开启后，买手须在意向品牌提交申请并由平台通过，才能查看该品牌商品并下单。"
        : `当前账号品牌：<strong>${mine}</strong>。点击右侧链接进入优惠 / 尺码 / 收款 / 合同等设置。`}</div>
      <div class="action-bar" style="margin-bottom:12px">
        ${isPlatform ? `<a href="javascript:;" class="oto_btn" data-go="brand-add">添加品牌</a>` : ""}
      </div>
      <div class="items head_items">
        <div class="item_boduan-row">
          <h4>品牌名称</h4><h4>阶梯优惠规则</h4><h4>尺寸别名</h4><h4>收款设置</h4><h4>合同设置</h4><h4>订货会设置</h4><h4>订单首付比例(定金)</h4><h4>下单需审核买手</h4><h4>编辑</h4>
        </div>
      </div>
      <div class="edit_boduan-list">
        ${brands.map(b => `
          <div class="item uk-flex-nowrap">
            <div class="g-name"><h4>${b.name}</h4></div>
            <h4><a href="javascript:;" data-go="brand-discount" data-brand="${b.name}">设置优惠规则</a></h4>
            <h4><a href="javascript:;" data-go="brand-size" data-brand="${b.name}">设置尺寸别名</a></h4>
            <h4><a href="javascript:;" data-go="brand-pay" data-brand="${b.name}">收款设置</a></h4>
            <h4><a href="javascript:;" data-go="brand-contract" data-brand="${b.name}">合同设置</a></h4>
            <h4><a href="javascript:;" data-go="brand-fair" data-brand="${b.name}">订货会设置</a></h4>
            <h4><a href="javascript:;" data-go="brand-deposit" data-brand="${b.name}">订单首付比例</a></h4>
            <h4><a href="javascript:;" data-go="brand-audit-set" data-brand="${b.name}">下单需审核买手</a></h4>
            <h4><a href="javascript:;" data-go="brand-edit" data-brand="${b.name}">编辑</a></h4>
          </div>`).join("")}
      </div>
      ${isPlatform ? `<div class="note" style="margin-top:24px">平台主数据：
        <a href="javascript:;" data-go="brand-master-style">风格资料维护</a> ·
        <a href="javascript:;" data-go="brand-master-crowd">适用人群维护</a> ·
        <a href="javascript:;" data-go="brand-master-size">平台标准尺码</a>
      </div>` : ""}
    </div>`;
  }

  function brandProfileForm(mode) {
    /* #2 添加/编辑字段一致；#3 可设首付与审核；#4 联系人/联系手机必填 */
    const isAdd = mode === "add";
    const name = state.selectedBrand || (RR.brands[0] && RR.brands[0].name);
    const raw = isAdd ? {} : (Store.getBrandProfile(name) || Store.db.brandProfile || {});
    const b = {
      name: isAdd ? "" : (raw.name || name || ""),
      year: raw.year || "2015",
      cats: raw.cats || [raw.cat].filter(Boolean),
      site: raw.site || "",
      shipAt: raw.shipAt || "",
      styles: raw.styles || [],
      crowds: raw.crowds || [],
      designer: raw.designer || "",
      about: raw.about || "",
      abbr: raw.abbr || "",
      currency: raw.currency || "CNY",
      textColor: raw.textColor || "黑色",
      contact: raw.contact || "",
      phone: raw.phone || "",
      discountBase: raw.discountBase || Store.brandDiscountBase(raw.name || name) || "retail"
    };
    const cats = Store.db.catsMaster || ["女装", "男装", "男女装", "配饰", "生活方式"];
    const ratio = Math.round(Store.brandDepositRatio(b.name || name) * 100) + "%";
    const need = b.name ? Store.brandNeedAudit(b.name) : false;
    const title = isAdd ? "添加品牌" : "店铺信息";
    const saveAct = isAdd ? "add-brand" : "save-brand-profile";
    return `<div class="ots_order-form ots_order-form-column brand-edit-form">
      <h1 class="title_underline">${title}</h1>
      <div class="note">${isAdd
        ? "添加与编辑品牌字段一致；联系手机将作为品牌端登录账号。"
        : "与添加品牌字段一致；可同时调整首付比例与下单审核。"}</div>
      <div class="form_item-long"><label class="req">品牌名 *</label><div>${field("name", input("品牌名称", b.name))}</div></div>
      <div class="form_item-long"><label class="req">联系人 *</label><div>${field("contact", input("联系人姓名", b.contact))}</div></div>
      <div class="form_item-long"><label class="req">联系手机 *</label><div>${field("phone", `<input type="tel" placeholder="品牌端登录手机号" value="${b.phone || ""}" data-field="phone" />`)}</div></div>
      <div class="form_item-long"><label>成立年份</label><div>${field("year", select(RR.years, null, String(b.year || "2015")))}</div></div>
      <div class="form_item-long"><h5>品类 *</h5><div>${checkGroup("cats", cats, b.cats)}</div></div>
      <div class="form_item-long"><label>官网</label><div>${field("site", input("官网", b.site))}</div></div>
      <div class="form_item-long"><label>预计发货时间</label><div>${field("shipAt", input("预计发货时间", b.shipAt))}</div></div>
      <div class="form_item-long"><h5>风格</h5><div>${checkGroup("styles", Store.db.stylesMaster || [], b.styles)}</div></div>
      <div class="form_item-long"><h5>适用人群</h5><div>${checkGroup("crowds", Store.db.crowdsMaster || [], b.crowds)}</div></div>
      <div class="form_item-long"><label>设计师文字介绍</label><div><textarea data-field="designer">${b.designer || ""}</textarea></div></div>
      <div class="form_item-long"><label>品牌故事</label><div><textarea data-field="about">${b.about || ""}</textarea></div></div>
      <div class="form_item-long"><label>品牌Logo</label><div class="upload-box"><div class="plus">+</div>Logo</div></div>
      <div class="form_item-long"><label>LookBook</label><div class="upload-box"><div class="plus">+</div>宣传图</div></div>
      <div class="form_item-long"><label>缩写</label><div>${field("abbr", input("缩写", b.abbr))}</div></div>
      <div class="form_item-long"><label class="req">货币 *</label><div>${field("currency", select(["CNY", "USD", "EUR", "HKD"], null, b.currency || "CNY"))}</div></div>
      <div class="form_item-long"><label>文字颜色</label><div>${field("textColor", select(["黑色", "白色", "品牌色"], null, b.textColor || "黑色"))}</div></div>
      <div class="form_item-long"><label>订单首付比例(定金)</label><div>${field("nbRatio", select(RR.depositRatios, null, ratio))}</div></div>
      <div class="form_item-long"><label>下单需审核买手</label><div><label class="check-inline"><input type="checkbox" data-field="nbAudit" ${need ? "checked" : ""} /> 开启后买手需先提交品牌申请</label></div></div>
      <div class="form_item-long"><label class="req">买手折扣计算基数 *</label><div>${field("discountBase", select(["零售价", "订货价"], null, b.discountBase === "wholesale" ? "订货价" : "零售价"))}<div class="muted" style="margin-top:6px">按零售价：吊牌价 × 折扣 = 买手价。按订货价：订货价 × 折扣 = 买手价。</div></div></div>
      <div class="submit_area">
        <a href="javascript:;" class="oto_btn" data-act="${saveAct}">${isAdd ? "保存并加入品牌列表" : "保存"}</a>
        <a href="javascript:;" class="oto_btn" data-go="brand-list">返回品牌列表</a>
      </div>
    </div>`;
  }

  /* 《平台运营后台》品牌管理 · 添加品牌 */
  function pageBrandAdd() {
    return brandProfileForm("add");
  }

  function pageBrandDeposit() {
    /* #3 二级页样式对齐合同设置；仅设首付比例，无收货/收款 */
    const brand = state.selectedBrand || RR.brands[0].name;
    const ratio = Math.round(Store.brandDepositRatio(brand) * 100) + "%";
    return `<div class="addr-container contact_edit-container">
      <div class="sub_title">订单首付比例(定金)</div>
      <div class="addr_edit contact_edit">
        <div class="items">
          <div class="item"><label>品牌</label>
            <div>${brand}${field("depBrand", `<input type="hidden" value="${brand}" />`)}</div>
          </div>
          <div class="item"><label class="req">订单首付比例(定金)</label>${field("depBrandRatio", select(RR.depositRatios, null, ratio))}</div>
        </div>
        <div class="action_area">
          <a href="javascript:;" class="oto_btn" data-act="save-brand-ratio">保存</a>
          <a href="javascript:;" class="oto_btn" data-go="brand-list">返回品牌列表</a>
        </div>
      </div>
    </div>`;
  }

  function pageBrandAuditSet() {
    /* #3 二级页样式对齐合同设置；仅设审核开关，无收货设置 */
    const brand = state.selectedBrand || RR.brands[0].name;
    const need = Store.brandNeedAudit(brand);
    return `<div class="addr-container contact_edit-container">
      <div class="sub_title">下单需审核买手</div>
      <div class="addr_edit contact_edit">
        <div class="items">
          <div class="item"><label>品牌</label>
            <div>${brand}${field("auditBrand", `<input type="hidden" value="${brand}" />`)}</div>
          </div>
          <div class="item"><label>当前状态</label>
            <div><span class="badge ${need ? "" : "green"}">${need ? "需审核" : "免审核"}</span></div>
          </div>
          <div class="item"><label>设置</label>
            <div><label class="check-inline"><input type="checkbox" data-field="auditNeed" ${need ? "checked" : ""} /> 下单需审核买手</label></div>
          </div>
        </div>
        <div class="action_area">
          <a href="javascript:;" class="oto_btn" data-act="save-brand-audit-set">保存</a>
          <a href="javascript:;" class="oto_btn" data-go="brand-list">返回品牌列表</a>
        </div>
      </div>
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

  function goodsThumb(cls = "") {
    return `<div class="goods-thumb ${cls}" aria-hidden="true">LOOK</div>`;
  }

  function pageBrandFair() {
    /* 品牌管理 · 订货会设置：全部场次，每场独立开关首单/补货 */
    const brand = state.selectedBrand || (RR.brands[0] && RR.brands[0].name);
    const sessions = Store.listOrderingSessions();
    const keyOf = f => String(f.id || f.season).replace(/[^A-Za-z0-9_-]/g, "_");
    return `<div class="boduan-container">
      ${subTitle("订货会设置")}
      <div class="note">品牌 <strong>${esc(brand)}</strong>。展示全部订货会场次，每个场次可单独开启或关闭<strong>首单</strong> / <strong>补货</strong>。关闭后买手端对应商品仍可见，但不支持下单。</div>
      <div class="season_crtl-container">
        <div class="season_crtl fair-set">
          <div class="items head_items uk-width-1-1">
            <div class="season-row uk-width-1-1"><h4>订货会名称</h4><h4>订货会</h4><h4>首单</h4><h4>补货</h4></div>
          </div>
          <div class="items uk-width-1-1" id="fair-table">
            ${sessions.map(f => {
              const flags = Store.fairFlags(brand, f.season);
              const key = keyOf(f);
              return `<div class="season-row" data-season="${esc(f.season)}" data-fair-key="${key}">
                <div><h4>${esc(f.name)}</h4></div>
                <div>${esc(f.season || "—")}</div>
                <div><input type="checkbox" class="uk-checkbox" data-field="fair-first-${key}" ${flags.first ? "checked" : ""} /></div>
                <div><input type="checkbox" class="uk-checkbox" data-field="fair-rep-${key}" ${flags.replenish ? "checked" : ""} /></div>
              </div>`;
            }).join("") || `<div class="note">暂无订货会场次，请先在「订货会管理」添加</div>`}
          </div>
        </div>
        <div class="submit_area action-bar">
          <a href="javascript:;" class="oto_btn" data-act="save-fair">保存</a>
          <a href="javascript:;" class="oto_btn" data-go="brand-list">返回品牌列表</a>
        </div>
      </div>
    </div>`;
  }

  function pageBrandFairNew() {
    /* #33 可预约时间 + 订货会开始时间；#32 不再在此设首单/补货 */
    const brandNames = RR.brands.map(b => b.name);
    return `<div class="boduan-container fair-create-page">
      ${subTitle("添加订货会")}
      <div class="note">手写季节并勾选参与品牌。首单 / 补货请到品牌「订货会设置」按场次开关。买手端只展示<strong>可预约时间范围内</strong>的场次。</div>
      <div class="form-grid">
        <label class="req">订货会名称</label><div>${field("fairName", input("例如：2028SS 订货会"))}</div>
        <label class="req">季节</label><div>${field("fairSeason", input("手写，例如 2028SS / 2028AW", RR.seasons[RR.seasons.length - 1]))}</div>
        <label class="req">可预约开始</label><div>${field("fairBookFrom", dateInput("2026-08-01"))}</div>
        <label class="req">可预约结束</label><div>${field("fairBookTo", dateInput("2026-11-30"))}</div>
        <label>订货会开始</label><div>${field("fairFrom", dateInput("2026-09-08"))}</div>
        <label>订货会结束</label><div>${field("fairTo", dateInput("2026-09-12"))}</div>
        <label class="req">参与品牌</label><div class="span2">${checkGroup("fairBrands", brandNames, brandNames.slice(0, 3))}</div>
        <label>封面/宣传图</label><div class="span2"><div class="file_area upload-box" data-act="toast:已选择宣传图（示意）"><div class="plus">+</div>上传图文封面</div></div>
        <label>图文介绍</label><div class="span2"><textarea data-field="fairIntro" placeholder="订货会说明、亮点、场次信息等" rows="5"></textarea></div>
      </div>
      <div class="action-bar" style="margin-top:16px">
        ${btn("创建订货会", "btn-primary", "create-ordering-fair")}
        ${btn("返回列表", "btn-outline", "go:fair-list")}
      </div>
    </div>`;
  }

  function currentFair() {
    const id = state.selectedFair || ((Store.db.orderingFairs || [])[0] && Store.db.orderingFairs[0].id);
    return (Store.db.orderingFairs || []).find(f => f.id === id) || (Store.db.orderingFairs || [])[0] || null;
  }

  function pageFairAppoint() {
    const fair = currentFair();
    if (!fair) return `${subTitle("查看预约")}<div class="note">请先创建订货会</div>`;
    const rows = Store.fairAppointSummary(fair.id);
    const ap = Store.appointmentsByFair(fair.id);
    return `<div class="boduan-container">
      ${subTitle("查看预约 · " + fair.name)}
      <div class="note">按参与品牌汇总预约人数。点品牌进入该品牌的时段与接待上限。</div>
      <table class="data-table">
        <thead><tr><th>品牌</th><th>预约条数</th><th>已通过</th><th>通过人数</th><th>时段接待上限</th><th>操作</th></tr></thead>
        <tbody>${rows.map(r => `<tr>
          <td>${r.brand}</td><td>${r.total}</td><td>${r.passed}</td><td>${r.people}</td>
          <td>${r.cap || "未设"}（${r.slots} 个时段）</td>
          <td class="ops"><a href="javascript:;" data-go="fair-slots" data-fair="${fair.id}" data-brand="${r.brand}">维护时段</a></td>
        </tr>`).join("") || '<tr><td colspan="6">该场次暂无参与品牌</td></tr>'}</tbody>
      </table>
      <div class="sub_title" style="margin-top:24px"><h4>预约明细</h4></div>
      <table class="data-table">
        <thead><tr><th>品牌</th><th>店铺</th><th>时间</th><th>人数</th><th>状态</th></tr></thead>
        <tbody>${ap.map(a => `<tr>
          <td>${a.brand}</td><td>${a.store}</td><td>${a.date || "—"}</td><td>${a.people || 1}</td>
          <td><span class="badge ${a.status === "已通过" ? "green" : ""}">${a.status || "待审核"}</span></td>
        </tr>`).join("") || '<tr><td colspan="5">暂无预约</td></tr>'}</tbody>
      </table>
      <div class="action-bar">${btn("返回列表", "btn-outline", "go:fair-list")}</div>
    </div>`;
  }

  function pageFairSlots() {
    const fair = currentFair();
    if (!fair) return `${subTitle("预约时段")}<div class="note">请先创建订货会</div>`;
    const brand = state.selectedBrand && (fair.brands || []).includes(state.selectedBrand)
      ? state.selectedBrand
      : (fair.brands || [])[0];
    const slots = Store.fairSlotsOf(fair.id, brand);
    const tpl = "日期,开始,结束,上限\\n2026-09-08,08:30,09:30,200\\n2026-09-08,09:30,11:30,150";
    return `<div class="boduan-container">
      ${subTitle("预约时段 · " + fair.name)}
      <div class="note">品牌 <strong>${esc(brand || "—")}</strong>。例：8:30-9:30 可接待 200 人；9:30-11:30 可接待 150 人。可下载模板后批量导入。</div>
      <div class="form-grid">
        <label>选择品牌</label><div>${field("slotBrand", select(fair.brands || [], null, brand))}</div>
      </div>
      <div class="action-bar">${btn("切换品牌", "btn-outline", "fair-slot-brand")}${btn("下载导入模板", "btn-outline", "download:预约时段模板")}</div>
      <table class="data-table">
        <thead><tr><th>日期</th><th>开始</th><th>结束</th><th>接待上限</th><th>已约</th><th></th></tr></thead>
        <tbody>${slots.map(s => `<tr>
          <td>${s.date}</td><td>${s.from}</td><td>${s.to}</td><td>${s.cap}</td><td>${s.booked || 0}</td>
          <td class="ops"><a href="javascript:;" data-act="del-fair-slot:${s.id}">删除</a></td>
        </tr>`).join("") || '<tr><td colspan="6">暂无时段</td></tr>'}</tbody>
      </table>
      <div class="sub_title" style="margin-top:16px"><h4>新增时段</h4></div>
      <div class="form-grid">
        <label>日期</label><div>${field("slotDate", dateInput(fair.fairFrom || "2026-09-08"))}</div>
        <label>开始</label><div>${field("slotFrom", input("08:30", "08:30"))}</div>
        <label>结束</label><div>${field("slotTo", input("09:30", "09:30"))}</div>
        <label>接待上限</label><div>${field("slotCap", input("200", "200"))}</div>
      </div>
      <div class="action-bar">${btn("保存时段", "btn-primary", "save-fair-slot")}</div>
      <div class="sub_title" style="margin-top:16px"><h4>批量导入</h4></div>
      <textarea data-field="slotImport" rows="5" placeholder="${tpl.replace(/\\n/g, "&#10;")}">日期,开始,结束,上限</textarea>
      <div class="action-bar">${btn("导入时段", "btn-outline", "import-fair-slots")}${btn("返回查看预约", "btn-outline", "go:fair-appoint")}</div>
    </div>`;
  }

  function pageFairCheckin() {
    const list = Store.db.checkins || [];
    const tab = (Store.db.ui.checkinTab || "全部");
    const shown = list.filter(c => tab === "全部" || c.kind === tab);
    return `<div class="boduan-container">
      ${subTitle("签到记录")}
      <div class="note">分别记录预约人员与非预约（现场）人员在各品牌的签到。扫码签到来自小程序。</div>
      <div class="tabs" style="margin:12px 0">${["全部", "预约", "现场"].map(t =>
        `<a href="javascript:;" class="oto_btn ${tab === t ? "" : ""}" data-act="checkin-tab:${t}">${t === "全部" ? "全部" : t + "签到"}</a>`
      ).join("")}</div>
      <table class="data-table">
        <thead><tr><th>时间</th><th>类型</th><th>品牌</th><th>买手/访客</th><th>手机</th><th>时段</th></tr></thead>
        <tbody>${shown.map(c => `<tr>
          <td>${c.at}</td><td><span class="badge ${c.kind === "预约" ? "green" : ""}">${c.kind}</span></td>
          <td>${c.brand}</td><td>${c.store}</td><td>${c.phone}</td><td>${c.slot || "—"}</td>
        </tr>`).join("") || '<tr><td colspan="6">暂无签到</td></tr>'}</tbody>
      </table>
      <div class="sub_title" style="margin-top:20px"><h4>补录现场签到</h4></div>
      <div class="form-grid">
        <label>品牌</label><div>${field("ckBrand", select(RR.brands.map(b => b.name)))}</div>
        <label>手机号</label><div>${field("ckPhone", input("现场访客手机"))}</div>
        <label>姓名/店铺</label><div>${field("ckStore", input("可选"))}</div>
      </div>
      <div class="action-bar">${btn("登记现场签到", "btn-primary", "add-walkin-checkin")}</div>
    </div>`;
  }

  function pageFairList() {
    /* #32 订货会不再设首单/补货；#36 查看预约 */
    const list = Store.db.orderingFairs || [];
    return `<div class="boduan-container">
      ${subTitle("订货会列表")}
      <div class="note">首单 / 补货开关在品牌管理「订货会设置」里按品牌场次配置。本列表维护场次、预约窗口和预约情况。</div>
      <div class="action-bar" style="margin-bottom:12px">
        <a href="javascript:;" class="oto_btn" data-go="fair-add">添加订货会</a>
      </div>
      <table class="data-table">
        <thead><tr><th>名称</th><th>季节</th><th>参与品牌</th><th>可预约时间</th><th>订货会时间</th><th>介绍</th><th>操作</th></tr></thead>
        <tbody>
          ${list.map(f => {
            const brands = (f.brands && f.brands.length) ? f.brands.join("、") : "全部";
            const book = (f.bookFrom || f.bookTo) ? `${f.bookFrom || "—"} ~ ${f.bookTo || "—"}` : "未设";
            const open = (f.fairFrom || f.fairTo) ? `${f.fairFrom || "—"} ~ ${f.fairTo || "—"}` : "未设";
            const live = Store.isFairBookable(f);
            return `<tr>
            <td>${f.name}${live ? ' <span class="badge green">可预约</span>' : ' <span class="badge">非预约期</span>'}</td>
            <td>${f.season || "—"}</td>
            <td>${brands}</td>
            <td>${book}</td>
            <td>${open}</td>
            <td>${(f.intro || "—").slice(0, 24)}${(f.intro || "").length > 24 ? "…" : ""}</td>
            <td class="ops">
              <a href="javascript:;" data-go="fair-appoint" data-fair="${f.id}">查看预约</a>
              <a href="javascript:;" data-go="fair-slots" data-fair="${f.id}">预约时段</a>
            </td>
          </tr>`;
          }).join("") || '<tr><td colspan="7">暂无订货会，请先添加</td></tr>'}
        </tbody>
      </table>
    </div>`;
  }

  function pageBrandPay() {
    /* 收款设置：仅银行账户/公章，首付比例改走 brand-deposit 二级页 */
    const p = Store.db.payInfo || {};
    return `<div class="bank_payment-container">
      <div class="bank_payment uk-width-1-1">
        ${subTitle("收款信息")}
        <div class="note">本页仅维护收款账户与公章。订单首付比例请在品牌列表「设置首付比例」进入二级页配置。</div>
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
    return brandProfileForm("edit");
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
        <h4>买手</h4><h4>季节</h4><h4>总金额</h4><h4>状态</h4><h4>操作</h4>
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
            <div><span class="badge ${s.status === "待审核" ? "" : s.status === "已生成订单" ? "green" : s.status === "已驳回" ? "red" : ""}">${s.status || "待审核"}</span><br/>件数：${s.pieces} · SKU ${s.skus}</div>
            <div class="ops" style="flex-direction:column;align-items:stretch;gap:6px">
              <a class="oto_btn" href="javascript:;" data-go="selection-detail" data-sel="${s.id}">${s.status === "待审核" ? "审核 / 编辑" : "查看详情"}</a>
              ${s.status === "待审核" || s.status === "待确认" ? `<a class="oto_btn" href="javascript:;" data-gen-order="${s.id}">审核通过并生成订单</a>
              <a class="oto_btn" href="javascript:;" data-act="reject-selection" data-sel="${s.id}">审核驳回</a>` : ""}
              ${s.status === "已生成订单" ? `<span class="badge green">已生成订单</span>` : ""}
              ${s.status === "已驳回" ? `<span class="badge red">已驳回，待买手修改</span>` : ""}
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
    const locked = !!opts.locked && !opts.platformCanEdit;
    const draft = !!opts.draft;
    const hideSpecs = !!opts.hideSpecs;
    const qtyAttr = draft ? "data-draft-qty" : "data-line-qty";
    return (lines || []).map(l => {
      const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
      const retail = Store.parseMoney(l.retail) * qty;
      const price = Store.parseMoney(l.price);
      const sizeKeys = Object.keys(l.sizes || {});
      return `<div class="sel-line-card${isMp() ? " rr-mp-card-tap" : ""}" data-sku-row="${l.sku}"${isMp() ? ` data-go="buyer-detail" data-sku="${esc(l.sku)}"` : ""}>
        <div class="sel-line-left">
          <div class="thumb ph">IMG</div>
          <div>
            <div class="sel-line-title">${l.title}</div>
            ${hideSpecs
              ? `<div class="sel-line-meta">${l.sku} · 已选 ${qty} 件</div>`
              : `<div class="sel-line-meta">颜色：${l.color || "—"} · 样衣尺码：${l.sampleSize || "—"} · 编号：${l.code || "—"}</div>
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
            </div>`}
          </div>
        </div>
        <div class="sel-line-right">
          <div class="sel-line-amt">¥${Store.money(retail || price * qty)}</div>
          <div class="sel-line-meta">吊牌价：¥${Store.money(l.retail || price / 0.45)}</div>
          <div class="sel-line-meta">买手价：¥${Store.money(price)}</div>
          ${!hideSpecs ? `<div class="sel-line-meta">已选 ${qty} 件</div>` : ""}
          ${locked ? "" : `<button type="button" class="btn btn-outline btn-sm" data-act="${draft ? "delete-draft-line:" + l.sku : "delete-sel-line:" + l.sku}">删除</button>`}
        </div>
      </div>`;
    }).join("") || '<div class="note">暂无款式，请添加</div>';
  }

  function renderSelectionWorkbench(s, opts = {}) {
    const lines = s.lines || [];
    const quote = Store.selectionQuote(lines, null, s.season, s.brand);
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
          ${(!s.locked || opts.platformCanEdit) ? btn("添加款式", "btn-primary", "toggle-sel-add") : ""}
          ${showGen && (s.status === "待审核" || s.status === "待确认") ? btn("审核通过并生成订单", "btn-primary", "gen-order") : ""}
          ${s.status === "待审核" || s.status === "待确认" ? btn("审核驳回", "btn-outline", "reject-selection") : ""}
          ${opts.showConfirm ? btn("确认提交选款单", "btn-primary", "submit-selection") : btn("保存修改", "btn-outline", "save-selection-lines")}
          ${opts.showCancel !== false ? btn("取消选款单", "btn-outline", "cancel-selection") : ""}
          ${btn("下载选款单", "btn-outline")}
          ${btn("返回", "btn-outline", back)}
        </div>
      </div>
      ${addOpen && (!s.locked || opts.platformCanEdit) ? `<div class="modal-panel sel-add-panel">
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
      <div class="sel-lines">${renderSelectionLines(lines, { locked: s.locked, hideSpecs: !!opts.hideSpecs, platformCanEdit: !!opts.platformCanEdit })}</div>
      <p style="color:#999;font-size:12px;margin-top:12px">${opts.hideSpecs ? "买手端选款单按款式记录，不展示颜色/尺码等规格明细。" : "生成订单后选款单锁定；若需再改，需后台驳回订单后重选。平台端与买手端详情展示一致。"}</p>`;
  }

  function pageSelectionDetail() {
    const s = state.selectedSel || Store.db.selections[0];
    return renderSelectionWorkbench(s, { backAct: "go:order-selection", showGen: true, platformCanEdit: true });
  }

  function pageOrderList(forceType) {
    const all = Store.filteredOrders(forceType || null);
    const list = pageSlice(all, 10);
    const f = Store.db.ui.orderFilter;
    const title = forceType === "补货单" ? "补货单管理" : "订单管理";
    /* 原站订单管理筛选：品牌/季节/状态=select；国家/省/城市/店铺/订单号=text */
    /* 订单状态取值＝《订单流程图》节点 */
    const statusOpts = Store.ORDER_FLOW.concat([Store.ORDER_ST.rejected, Store.ORDER_ST.canceled]);
    const filters = forceType
      ? [
          ["选择品牌", select(RR.brands.map(b => b.name), "全部", f.brand)],
          ["季节", select(RR.seasons, "全部", f.season)],
          ["订单状态", select(statusOpts, "全部", f.status)],
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
          ["订单状态", select(statusOpts, "全部", f.status)],
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
          const pay = Store.paymentStats(o);
          const acts = Store.orderActions(o, "platform");
          return `<div class="order-live-card">
            <div class="order-live-head">
              <div class="order-live-brand">
                <span class="brand-logo" style="width:36px;height:36px;font-size:8px;border-radius:0">${(o.brand || "").split(" ")[0]}</span>
                <strong>${o.brand}</strong>
                <span class="muted">下单时间：${o.createdAt || "—"}</span>
                <span class="muted">订单号：${o.id}</span>
              </div>
              <div class="order-live-toplinks">
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
                  <div>已核对：${Store.money(pay.confirmed)} · 未付：${Store.money(pay.unpaid)}</div>
                </div>
                <div class="col tips">
                  ${tips.map(t => `<div>· ${t}</div>`).join("") || `<div class="muted">· ${o.status}</div>`}
                  <div class="badge" style="margin-top:8px">${o.status}${o.whitelist ? " · 白名单" : ""}</div>
                </div>
              </div>
              <div class="order-live-actions">
                ${acts.filter(a => !a.wait && a.act !== "download:订单").map(a => {
                  const detailPanel = a.act.startsWith("open-order-panel:") ? a.act.slice("open-order-panel:".length) : "";
                  return detailPanel
                    ? `<button type="button" class="oto_btn" data-go="order-detail" data-oid="${o.id}" data-order-action="${detailPanel}">${a.label}</button>`
                    : `<button type="button" class="oto_btn ${a.primary ? "primary-text" : ""}" data-act="${a.act}" data-oid="${o.id}">${a.label}</button>`;
                }).join("")}
                ${acts.filter(a => a.wait).map(a => `<span class="wait-chip">${a.label}</span>`).join("")}
                <button type="button" class="oto_btn purple-text" data-go="order-detail" data-oid="${o.id}">流程详情</button>
              </div>
            </div>
          </div>`;
        }).join("") || '<div class="note">无匹配订单</div>'}
      </div>
      ${pagination(all.length, 10)}
    </div>`;
  }

  /* 订单流程节点条（平台端/买手端共用） */
  function orderFlowSteps(o) {
    const nodes = Store.orderFlowNodes(o);
    const st = o.status;
    const ended = st === Store.ORDER_ST.rejected || st === Store.ORDER_ST.canceled;
    return `${ended ? `<div class="flow-ended">当前：${st}${o.rejectReason ? " · " + o.rejectReason : ""}${o.cancelReason ? " · " + o.cancelReason : ""}</div>` : ""}
      <div class="flow-steps">
        ${nodes.map((n, i) => `<div class="fstep ${n.done ? "done" : ""} ${n.current ? "cur" : ""}">
          <i>${i + 1}</i><b>${n.name}</b><em>${n.owner}</em>
        </div>`).join("")}
      </div>`;
  }

  /* 付款凭证表：平台核对通过 / 不通过（不通过退回买手重新上传） */
  function paymentTable(o, side) {
    const list = o.payments || [];
    const platform = side !== "buyer";
    return `<table class="data-table pay-table">
      <thead><tr><th>类型</th><th>金额</th><th>付款日期</th><th>凭证</th><th>核对状态</th>${platform ? "<th>操作</th>" : ""}</tr></thead>
      <tbody>
        ${list.map((p, i) => `<tr>
          <td>${p.kind}</td><td>¥${p.amount}</td><td>${p.at}</td><td>${p.file}</td>
          <td><span class="badge ${p.status === "已核对" ? "green" : p.status === "不通过" ? "red" : ""}">${p.status}</span>${p.note ? `<div class="muted">${p.note}</div>` : ""}</td>
          ${platform ? `<td class="ops">${p.status === "待核对"
            ? `<a href="javascript:;" data-act="check-pay:${i}:pass" data-oid="${o.id}">核对通过</a>
               <a href="javascript:;" data-act="check-pay:${i}:fail" data-oid="${o.id}">不通过</a>`
            : "—"}</td>` : ""}
        </tr>`).join("") || `<tr><td colspan="${platform ? 6 : 5}">暂无付款凭证</td></tr>`}
      </tbody>
    </table>`;
  }

  function pageOrderDetail() {
    const o = state.selectedOrder || Store.db.orders[0];
    const action = state.orderAction;
    const rules = Store.getDiscountRules();
    const lines = o.lines || [];
    const skuCount = lines.length;
    const pay = Store.paymentStats(o);
    const actions = Store.orderActions(o, "platform");
    const panels = {
      reject: `<div class="modal-panel"><h3>驳回订单</h3>
        <div class="note">驳回后选款单自动解锁，买手可修改后重新下单（对应流程图「驳回 → 下单页」）。</div>
        <div class="form-grid"><label>驳回原因</label><div class="span2">${field("rejReason", input("如：起订额不足 / 款式需调整", "起订额不足，请补充款式"))}</div></div>
        <div class="action-bar">${btn("确认驳回", "btn-primary", "reject-order")}</div></div>`,
      check: `<div class="modal-panel"><h3>核对付款凭证</h3>
        <div class="note">核对通过进入下一节点；不通过退回买手重新上传（尾款支持分批次，未付清将回到「待支付尾款」）。</div>
        <div class="form-grid"><label>不通过原因</label><div class="span2">${field("checkNote", input("如：转账金额与应付不符"))}</div></div>
        ${paymentTable(o, "platform")}
        <div class="pay-sum">应付合计 ¥${Store.money(pay.total)} · 已核对 ¥${Store.money(pay.confirmed)} · 待核对 ¥${Store.money(pay.pending)} · 未付 ¥${Store.money(pay.unpaid)}</div></div>`,
      voucher: `<div class="modal-panel"><h3>代买手上传付款凭证</h3>
        <div class="upload-box"><div class="plus">+</div>上传转账截图 / PDF</div>
        <div class="form-grid" style="margin-top:16px">
          <label>凭证类型</label><div>${field("payKind", select(["定金", "尾款"], null, Store.orderStage(o) >= 6 ? "尾款" : "定金"))}</div>
          <label>付款金额</label><div>${field("payAmt", input("", Store.orderStage(o) >= 6 ? Store.money(pay.unpaid) : o.deposit))}</div>
          <label>付款时间</label><div>${field("payAt", dateInput(new Date().toISOString().slice(0, 10)))}</div>
        </div>
        <div class="action-bar">${btn("提交凭证", "btn-primary", "submit-pay")}</div></div>`,
      modify: (() => {
        /* #13 订单折扣按一级分类（服饰/配饰/生活方式），仅对本单生效 */
        const catDisc = o.catDiscount || { cloth: 0.45, accessory: 0.5, lifestyle: 0.55 };
        return `<div class="modal-panel"><h3>修改订单 · 增减款 / 设置分类折扣</h3>
        <div class="note">分类折扣仅对<strong>本订单</strong>生效，不影响品牌店铺设置里的分类折扣。</div>
        <div class="form-grid">
          <label>服饰统一折扣</label><div>${field("odCloth", input("如 0.45", String(catDisc.cloth)))}</div>
          <label>配饰统一折扣</label><div>${field("odAccessory", input("如 0.5", String(catDisc.accessory)))}</div>
          <label>生活方式统一折扣</label><div>${field("odLifestyle", input("如 0.55", String(catDisc.lifestyle)))}</div>
        </div>
        <div class="action-bar" style="margin:12px 0">${btn("应用分类折扣到本单", "btn-primary", "set-order-cat-discount")}</div>
        <table class="data-table"><thead><tr><th>SKU</th><th>一级分类</th><th>尺码</th><th>数量合计</th><th>本单折扣</th><th></th></tr></thead>
        <tbody>
          ${lines.map((l, i) => {
            const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
            const g = (Store.db.goods || []).find(x => (x.skc || x.sku) === l.sku || x.sku === l.sku);
            const l1 = Store.goodsL1Cat(g && g.cat) || l.l1Cat || "服饰";
            return `<tr data-line="${i}">
              <td>${l.sku}</td><td>${l1}</td><td>${Object.keys(l.sizes || {}).join("/")}</td>
              <td>${field("qty-" + i, input("", String(qty)))}</td>
              <td>${l.discount || 1}</td>
              <td>${link("删款", "remove-order-line:" + i)}</td>
            </tr>`;
          }).join("")}
        </tbody></table>
        <div class="form-grid">
          <label>新增商品</label><div>${field("addOrderSku", select((Store.db.goods || []).filter(g => g.brand === o.brand && g.status !== "已删款").map(g => g.skc || g.sku), "选择 SKU"))}</div>
        </div>
        <div class="action-bar">${btn("加入本单", "btn-outline", "add-order-line")}${btn("保存修改", "btn-primary", "save-order-modify")}</div></div>`;
      })(),
      invoice: `<div class="modal-panel"><h3>申请发票</h3>
        <div class="form-grid"><label>抬头</label><div>${field("invTitle", input("", (o.invoice && o.invoice.title) || o.store))}</div>
        <label>税号</label><div>${field("invTax", input("", (o.invoice && o.invoice.tax) || ""))}</div>
        <label>金额</label><div>${field("invAmt", input("", o.amount))}</div>
        <label>类型</label><div>${field("invType", select(["增值税专用发票", "普通发票"], null, "普通发票"))}</div></div>
        <div class="action-bar">${btn("提交发票申请")}</div>
        ${o.invoice ? `<div class="note">已申请：${o.invoice.title} · ${o.invoice.type} · ¥${o.invoice.amount}</div>` : ""}</div>`,
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
      deposit: `<div class="modal-panel"><h3>设置定金 · 首付比例</h3>
        <div class="note">按品牌首付比例设置应收定金，提交后进入「待买手确认定金」。</div>
        <div class="form-grid"><label>订单金额</label><div>¥${o.amount}</div>
        <label>首付比例</label><div>${field("depRatio", select(RR.depositRatios, null, Math.round(Number(o.depositRatio || 0.3) * 100) + "%"))}</div>
        <label>应收定金</label><div>¥${o.deposit}（按比例自动计算）</div></div>
        <div class="action-bar">${btn("确认定金比例", "btn-primary", "confirm-deposit")}</div>
        <hr/>
        <div class="form-grid"><label>整单折扣</label><div>${field("orderDiscount", input("如 0.45", "0.45"))}</div></div>
        <div class="action-bar">${btn("设置折扣", "btn-outline", "set-order-discount")}</div></div>`,
      wave: (() => {
        const rows = Store.orderPriceWave(o.id);
        return `<div class="modal-panel"><h3>商品价格波动</h3>
        <div class="note">对照商品管理当前吊牌价 / 订货价。若有变动，可用「同步价格到订单」把未完成订单改成新价并重算折扣。</div>
        <table class="data-table">
          <thead><tr><th>SKU</th><th>商品</th><th>下单时零售/订货</th><th>当前零售/订货</th><th></th></tr></thead>
          <tbody>${rows.map(r => `<tr>
            <td>${r.sku}</td><td>${r.title || "—"}</td>
            <td>¥${Store.money(r.oldRetail)} / ¥${Store.money(r.oldWholesale)}</td>
            <td>¥${Store.money(r.nowRetail)} / ¥${Store.money(r.nowWholesale)}</td>
            <td>${r.changed ? '<span class="badge red">有变动</span>' : '<span class="badge green">无变动</span>'}</td>
          </tr>`).join("") || '<tr><td colspan="5">无商品</td></tr>'}</tbody>
        </table></div>`;
      })()
    };

    return `${subTitle("订单详情")}
      <div class="detail-sticky">
        <strong>${o.brand}</strong>
        <span class="badge">${o.type}</span>
        <span>最小起订额 ¥${Store.money(rules.minAmount)}</span>
        <span>已选金额 ¥${o.amount}</span>
        <span class="badge gray">${o.status}${o.whitelist ? " · 白名单" : ""}</span>
      </div>
      ${orderFlowSteps(o)}
      <div class="stat-row">
        <div class="stat"><div class="l">订单金额</div><div class="n">¥${o.amount}</div></div>
        <div class="stat"><div class="l">应收定金(${Math.round(Number(o.depositRatio || 0.3) * 100)}%)</div><div class="n">¥${o.deposit}</div></div>
        <div class="stat"><div class="l">已核对付款</div><div class="n">¥${Store.money(pay.confirmed)}</div></div>
        <div class="stat"><div class="l">未付金额</div><div class="n">¥${Store.money(pay.unpaid)}</div></div>
        <div class="stat"><div class="l">付款差额</div><div class="n">${o.settleDiff !== "" && o.settleDiff != null ? "¥" + o.settleDiff : "¥" + Store.money(pay.diff)}</div></div>
        <div class="stat"><div class="l">SKU 数</div><div class="n">${skuCount}</div></div>
      </div>
      <div class="form-section">
        <h3>当前节点可执行操作 · ${o.status}</h3>
        <div class="action-bar flow-actions">
          ${actions.map(a => a.wait
            ? `<span class="wait-chip">${a.label}</span>`
            : `<button class="btn ${a.primary ? "btn-primary" : "btn-outline"}" data-act="${a.act}" data-oid="${o.id}">${a.label}</button>`).join("")}
        </div>
        <div class="action-bar sub-actions">
          <span class="muted">其他操作：</span>
          <button class="btn btn-outline" data-act="open-order-panel:voucher" data-oid="${o.id}">上传付款凭证</button>
          <button class="btn btn-outline" data-act="open-order-panel:substore" data-oid="${o.id}">分配子店铺</button>
          ${o.ocId ? `<button class="btn btn-outline" data-act="download:OC-${o.ocId}">下载 OC ${o.ocId}</button>` : ""}
        </div>
        ${action ? panels[action] || "" : '<div class="note">未完成订单可同时设置折扣、定金、编辑商品、生成 OC、查看价格波动、完成或驳回。点「订单完成」后不可再操作。</div>'}
      </div>
      <div class="form-section">
        <h3>付款凭证与核对</h3>
        ${paymentTable(o, "platform")}
        <div class="pay-sum">应付 ¥${Store.money(pay.total)}（定金 ¥${Store.money(pay.deposit)} + 尾款 ¥${Store.money(pay.finalDue)}） ·
          已核对 ¥${Store.money(pay.confirmed)} · 待核对 ¥${Store.money(pay.pending)} · 差额 ¥${Store.money(pay.diff)}</div>
      </div>
      <div class="form-section">
        <h3>流程记录</h3>
        <ul class="flow-log">${(o.flowLog || []).map(l => `<li><span>${l.at}</span>${l.text}</li>`).join("") || "<li>暂无记录</li>"}</ul>
      </div>
      <table class="data-table">
        <thead><tr><th>图片</th><th>SKU</th><th>款式</th><th>尺码明细</th><th>数量</th><th>买手价</th><th>小计</th></tr></thead>
        <tbody>
          ${lines.map(l => {
            const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
            const sub = qty * Number(l.price || 0) * Number(l.discount || 1);
            return `<tr>
              <td>${goodsThumb("sm")}</td>
              <td>${l.sku}</td><td>${l.title}</td>
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
            <a href="javascript:;" class="oto_btn" data-act="realtime-detail:${r.brand}">查看</a>
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
    /* #27 预约列表 = 审核通过的预约，不出现待审核 */
    const list = (Store.db.appointments || []).filter(a => a.status === "已通过" || a.status === "已预约");
    return `<div class="brand_goodsList-container">
      ${subTitle("预约列表")}
      <div class="note">本页只显示<strong>审核通过</strong>的预约。待审核请到侧栏「审核预约」处理。</div>
      ${filterPanel([
        ["选择品牌:", select(RR.brands.map(b => b.name), "全部")],
        ["店铺名:", input("店铺名")]
      ], "", "筛选", "filter")}
      <table class="data-table">
        <thead><tr>
          <th>品牌</th><th>店铺名</th><th>预约日期</th><th>预约时间</th><th>人数</th><th>手机号</th><th>提交时间</th><th>签到时间</th><th>状态</th>
        </tr></thead>
        <tbody>${list.map((a) => `<tr>
          <td>${a.brand}</td><td>${a.store}</td><td>${(a.date || "").split(" ")[0] || a.date}</td>
          <td>${a.time || (a.date || "").split(" ")[1] || "—"}</td>
          <td>${a.people || 1}</td><td>${a.phone}</td>
          <td>${a.submitAt || a.date || "—"}</td><td>${a.checkin || "—"}</td>
          <td><span class="badge green">${a.status || "已通过"}</span></td>
        </tr>`).join("") || '<tr><td colspan="9">暂无已通过预约</td></tr>'}</tbody>
      </table>
    </div>`;
  }

  /* 《平台运营后台》预约管理 · 审核预约 */
  function pageAppointAudit() {
    const list = Store.db.appointments.map((a, i) => ({ ...a, index: i }));
    const pending = list.filter(a => (a.status || "待审核") === "待审核");
    const rejectIdx = Store.db.ui.rejectAppoint;
    return `${subTitle("审核预约")}
      <div class="note">买手在「预约申请」提交后进入待审核；通过后计入订货会到场名额，拒绝需填写原因并通知买手。</div>
      <div class="stat-row">
        <div class="stat"><div class="l">待审核</div><div class="n">${pending.length}</div></div>
        <div class="stat"><div class="l">已通过</div><div class="n">${list.filter(a => a.status === "已通过").length}</div></div>
        <div class="stat"><div class="l">已拒绝</div><div class="n">${list.filter(a => a.status === "已拒绝").length}</div></div>
      </div>
      ${rejectIdx !== "" && rejectIdx != null ? `<div class="reject-panel">
        <h4>拒绝预约 · ${(Store.db.appointments[rejectIdx] || {}).store || ""}</h4>
        <div class="form-grid">
          <label>拒绝原因</label><div>${field("appointReason", input("如：该场次名额已满，请改约"))}</div>
        </div>
        <div class="action-bar">${btn("确认拒绝", "btn-primary", "submit-reject-appoint")}${btn("取消", "btn-outline", "cancel-reject-appoint")}</div>
      </div>` : ""}
      <table class="data-table">
        <thead><tr><th>店铺名</th><th>品牌</th><th>场次</th><th>预约时间</th><th>人数</th><th>手机号</th><th>提交时间</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>${list.map(a => `<tr>
          <td>${a.store}</td><td>${a.brand}</td><td>${a.season || "—"}</td><td>${a.date || "—"}</td>
          <td>${a.people || 1}</td><td>${a.phone}</td><td>${a.submitAt || "—"}</td>
          <td><span class="badge ${a.status === "已通过" ? "green" : a.status === "已拒绝" ? "red" : ""}">${a.status || "待审核"}</span>
            ${a.reason ? `<div class="red-text" style="font-size:12px">${a.reason}</div>` : ""}</td>
          <td class="ops">${(a.status || "待审核") === "待审核"
            ? `<a href="javascript:;" data-act="approve-appoint:${a.index}">通过</a>
               <a href="javascript:;" data-act="reject-appoint:${a.index}">拒绝</a>`
            : `<a href="javascript:;" data-act="approve-appoint:${a.index}">重新通过</a>`}</td>
        </tr>`).join("") || '<tr><td colspan="9">暂无预约</td></tr>'}</tbody>
      </table>`;
  }

  /* 《买手采购端》预约申请：申请线下参加订货会 */
  function pageBuyerFairAppoint() {
    const mine = Store.buyerAppointments();
        const fairs = Store.bookableFairs();
        const fairOpts = fairs.length ? fairs.map(f => `${f.name}（${f.season}）`) : ["当前无可预约订货会"];
        const form = `<div class="form-grid">
            <label>订货会</label><div>${field("apFair", select(fairOpts, "请选择订货会"))}</div>
            <label>品牌</label><div>${field("apBrand", select(RR.brands.map(b => b.name), "请选择品牌"))}</div>
            <label>到场日期时间</label><div>${field("apDate", datetimeInput("2026-04-08T14:00"))}</div>
            <label>到场人数</label><div>${field("apPeople", input("如 2", "2"))}</div>
            <label>联系人手机号</label><div>${field("apPhone", input("手机号", Store.db.buyerSession.phone || ""))}</div>
          </div>`;
    if (isMp()) {
      const ui = mpUi();
      const q = (ui.q["buyer-appoint-apply"] || "").trim().toLowerCase();
      const tab = ui.appointTab || "全部";
      const shown = mine.filter(a => {
        if (tab !== "全部" && (a.status || "待审核") !== tab) return false;
        if (!q) return true;
        return `${a.brand} ${a.season} ${a.status}`.toLowerCase().includes(q);
      });
      return mpPage(
        `${mpChipRow(["全部", "待审核", "已通过", "已拒绝"], tab, "mp-chip:appointTab:")}${mpSearch("搜索品牌 / 季节", ui.q["buyer-appoint-apply"] || "")}`,
        `<article class="rr-mp-card rr-mp-form">
          <p class="rr-mp-lead">提交后待平台审核，通过后可到场看款。</p>
          ${form}
          <button type="button" class="rr-mp-cta" data-act="submit-buyer-appoint">提交预约申请</button>
        </article>
        <h3 class="rr-mp-sec">我的预约</h3>
        ${shown.map(a => `<article class="rr-mp-card rr-mp-card-tap" data-go="buyer-appoint-detail" data-aid="${a.index}">
          <header class="rr-mp-card-hd">
            <div class="rr-mp-avatar">${esc((a.brand || "").slice(0, 2))}</div>
            <div class="rr-mp-card-ttl">
              <b>${a.brand}</b>
              <small>${a.season || "—"} · ${a.date || "—"}</small>
            </div>
            <span class="rr-mp-pill">${a.status || "待审核"}</span>
            <span class="rr-mp-chevron">›</span>
          </header>
          <div class="rr-mp-metrics">
            <span><em>${a.people || 1}</em>人</span>
            <span>${a.reason || (a.status === "已拒绝" ? "" : "可到场看款")}</span>
          </div>
        </article>`).join("") || `<div class="rr-mp-empty">暂无预约记录</div>`}`
      );
    }
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container content-page">
        ${subTitle("预约申请 · 线下参加订货会")}
        <div class="note">提交后进入<strong>待审核</strong>；平台在「审核预约」通过后才会出现在预约列表，届时可以到场看款。</div>
        <div class="form-section intent-apply">
          ${form}
          <div class="action-bar">${btn("提交预约申请", "btn-primary", "submit-buyer-appoint")}</div>
        </div>
        ${subTitle("我的预约")}
        <table class="data-table">
          <thead><tr><th>订货会/品牌</th><th>到场时间</th><th>人数</th><th>状态</th><th>说明</th></tr></thead>
          <tbody>${mine.map(a => `<tr>
            <td>${a.season || "—"} · ${a.brand}</td><td>${a.date || "—"}</td><td>${a.people || 1}</td>
            <td><span class="badge ${a.status === "已通过" ? "green" : a.status === "已拒绝" ? "red" : ""}">${a.status || "待审核"}</span></td>
            <td>${a.reason || (a.status === "已拒绝" ? "" : "可到场看款")}</td>
          </tr>`).join("") || '<tr><td colspan="5">暂无预约记录</td></tr>'}</tbody>
        </table>
      </div>
    </div>`;
  }

  function pageOrderKingdee() {
    const k = Store.db.kingdee || { status: "未同步", logs: [] };
    return `${subTitle("金蝶同步")}
      <div class="note">原型内模拟金蝶推送/拉取（写入本地 Store，非真实金蝶 API）。用于确认财务对接入口与操作结果。</div>
      <div class="form-section">
        <div class="form-grid">
          <label>同步状态</label><div><span class="badge">${k.status || "未同步"}</span></div>
          <label>上次推送</label><div>${k.lastPush || "—"}</div>
          <label>上次拉取</label><div>${k.lastPull || "—"}</div>
          <label>本地订单数</label><div>${Store.db.orders.length}</div>
        </div>
        <div class="action-bar">
          ${btn("推送订单到金蝶", "btn-primary", "kingdee:push")}
          ${btn("从金蝶拉取收款", "btn-outline", "kingdee:pull")}
        </div>
      </div>
      <table class="data-table">
        <thead><tr><th>时间</th><th>动作</th><th>结果</th></tr></thead>
        <tbody>${(k.logs || []).map(l => `<tr><td>${l.at}</td><td>${l.action}</td><td>${l.msg}</td></tr>`).join("") || '<tr><td colspan="3">暂无同步日志</td></tr>'}</tbody>
      </table>`;
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
    /* #11 按品牌筛选 + 时间倒序；#12 申请说明列；#20 品牌端仅当前品牌 */
    const mine = state.selectedBrand || (RR.brands[0] && RR.brands[0].name);
    const isBrand = state.portal === "brand";
    const brandFilter = isBrand ? mine : ((Store.db.ui && Store.db.ui.intentBrand) || "全部");
    let rows = (Store.db.intentions || []).slice();
    if (brandFilter && brandFilter !== "全部") rows = rows.filter(i => i.brand === brandFilter);
    rows.sort((a, b) => String(b.date || b.at || "").localeCompare(String(a.date || a.at || "")));
    return `${subTitle(isBrand ? `意向申请 · ${mine}` : "意向申请 · 审核买手提交的品牌申请")}
      <div class="note">${isBrand
        ? `仅显示申请当前账号品牌「${mine}」的记录。`
        : `审核通过后买手才能查看并下单该品牌商品；「免审核」品牌无需申请，买手可直接选款。品牌是否需审核在 <a href="javascript:;" data-go="brand-list">品牌列表</a> 设置。列表按申请时间<strong>倒序</strong>。`}</div>
      ${isBrand ? "" : filterPanel([
        ["选择品牌:", field("intentFilterBrand", select(RR.brands.map(b => b.name), "全部", brandFilter))]
      ], "", "筛选", "intent-filter")}
      <table class="data-table">
        <thead><tr><th>店铺名</th><th>申请品牌</th><th>申请日期</th><th>申请说明</th><th>品牌下单要求</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>${rows.map(i => `<tr>
          <td>${i.store}</td><td>${i.brand}</td><td>${i.date || (i.at || "").slice(0, 10) || "—"}</td>
          <td>${i.note || "—"}</td>
          <td>${Store.brandNeedAudit(i.brand) ? '<span class="badge">需审核买手</span>' : '<span class="badge green">免审核</span>'}</td>
          <td><span class="badge ${i.status === "已通过" ? "green" : i.status === "已拒绝" ? "red" : ""}">${i.status}</span></td>
          <td class="ops">${i.status === "待审核" ? `${btn("通过", "btn-outline btn-sm")}${btn("拒绝", "btn-outline btn-sm")}` : "—"}</td>
        </tr>`).join("") || '<tr><td colspan="7">暂无意向申请</td></tr>'}</tbody>
      </table>`;
  }

  function pageBuyerList() {
    /* 原站：h1.title_underline 买手列表；级别 select + 手机/店/省/市/品牌 text；invite 行列表；无侧栏 */
    const tab = (Store.db.ui.buyerFilter && Store.db.ui.buyerFilter.levelTab) || "全部";
    const f = Store.db.ui.buyerFilter || {};
    let all = Store.db.buyers.filter(b => b.role !== "checker");
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
      ${Store.db.ui.rejectBuyer ? `<div class="modal-panel reject-panel">
        <h3>拒绝买手注册申请 · ${Store.db.ui.rejectBuyer}</h3>
        <div class="note">拒绝后买手端「审核进度」显示原因，可修改资料重新提交（《注册流程图》审核拒绝分支）。</div>
        <div class="form-grid"><label>拒绝原因</label><div class="span2">${field("rejectReason", input("如：营业执照/门店照片不清晰", "门店照片不清晰，请重新上传"))}</div></div>
        <div class="action-bar">${btn("提交拒绝", "btn-primary", "submit-reject-buyer")}${btn("取消", "btn-outline", "cancel-reject-buyer")}</div>
      </div>` : ""}
      <div class="ots_order-invite-detail">
        <div class="items">
          <div class="item invite_title">
            <div>店铺名</div><div>手机号</div><div>审核状态</div><div>注册来源/时间</div><div>操作</div>
          </div>
          ${list.map(b => `
            <div class="item">
              <div>${b.name}<br/>${b.province || ""}<br/>${b.city || ""}</div>
              <div>${b.phone}</div>
              <div class="level_detail">
                <span class="badge ${b.status === "已通过" ? "green" : b.status === "待审核" ? "" : "red"}">${b.status}</span>
                ${b.status === "已通过" ? `<div class="muted">级别 ${b.level || "—"}</div>` : ""}
                ${b.reason ? `<div class="muted red-text">${b.reason}</div>` : ""}
              </div>
              <div>${b.source || "平台录入"}<br/><span class="muted">${b.regAt || "—"}</span></div>
              <div class="ops">
                ${b.status === "待审核"
                  ? `<a href="javascript:;" data-act="approve-buyer:${b.name}">通过</a><a href="javascript:;" data-act="reject-buyer:${b.name}">拒绝</a>`
                  : b.status === "已拒绝"
                    ? `<a href="javascript:;" data-act="approve-buyer:${b.name}">改为通过</a>`
                    : `<a href="javascript:;" data-act="reject-buyer:${b.name}">关闭权限</a>`}
                <a href="javascript:;" data-go="buyer-balance" data-buyer="${b.name}">余额管理</a>
                <a href="javascript:;" data-go="buyer-store" data-buyer="${b.name}">查看店铺资料</a>
                <a href="javascript:;" data-go="buyer-invoice" data-buyer="${b.name}">修改发票信息</a>
                <a href="javascript:;" data-go="buyer-address" data-buyer="${b.name}">修改地址</a>
                <a href="javascript:;" data-go="buyer-edit" data-buyer="${b.name}">编辑资料</a>
                <a href="javascript:;" data-go="buyer-sub">查看子店铺信息</a>
                <a href="javascript:;" data-go="buyer-add-brand">添加品牌</a>
                <a href="javascript:;" data-go="buyer-appoint">添加预约</a>
                <a href="javascript:;" data-go="buyer-subs" data-buyer="${b.name}">子账号管理</a>
                ${b.status === "已通过" ? `<label class="check-inline" style="display:inline-flex;margin-top:6px"><input type="checkbox" data-act="toggle-self-sub:${b.name}" ${b.allowSelfSub ? "checked" : ""} /> 允许自行添加子账号</label>` : ""}
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

  function pageRolePerm() {
    const perms = ["商品管理", "订单确认", "定金确认", "意向审核", "买手管理", "发票", "结佣", "财务审核"];
    const roleName = state.selectedRole || (Store.db.roles[0] && Store.db.roles[0].name);
    const role = Store.db.roles.find(r => r.name === roleName) || Store.db.roles[0];
    return `${subTitle("权限设置")}
      <div class="note">为指定角色开关功能权限；账号在「账号列表」中关联角色。</div>
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

  function pageBuyerOrderHub() {
    if (!isMp()) return pageBuyerHome();
    return `<div class="rr-mp-stack">
      <p class="rr-mp-lead">选择本次要做的事</p>
      <button type="button" class="rr-mp-hero-btn" data-go="buyer-home">
        <b>品牌</b><small>看款 · 加入选款单</small>
      </button>
      <button type="button" class="rr-mp-hero-btn alt" data-go="buyer-replenish">
        <b>补货</b><small>已下过首单的品牌补货</small>
      </button>
    </div>`;
  }

  function pageBuyerHome() {
    const brands = Store.buyerBrands(Store.db.buyerSession.cat || "全部");
    syncBuyerCart();
    if (isMp()) return mpBrandGrid(brands);
    /* 原站：brand_list-container > left 分类 + right brand_list grid item_inner */
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container brand_list-container">
        ${buyerCatSide()}
        <div class="public_right-container">
          <div class="mob-sub_title"><h5>品牌列表</h5></div>
          <div class="note buyer-access-note">仅可进入<strong>已审核通过</strong>或<strong>不需要审核</strong>的品牌商品（《注册流程图》）；需审核品牌请先在
            <a href="javascript:;" data-go="buyer-intent">意向品牌</a>提交申请。</div>
          <div class="brand_list">
            <div class="items uk-grid-medium brand-grid-live">
              ${brands.map(b => {
                const noAuth = b.accept === false;
                const pending = b.pending;
                return `<div class="item">
                  <div class="item_inner">
                    ${noAuth ? `<div class="accept_state">${pending ? "申请中" : b.denied ? "申请被拒绝" : "需申请"}</div>` : b.needAudit ? '<div class="accept_state ok">已通过</div>' : ""}
                    <a href="javascript:;" data-go="${noAuth ? "buyer-intent" : "buyer-brand"}" data-brand="${b.name}">
                      <div class="brand-logo-rect">${b.name}</div>
                      <p>${b.name}</p>
                    </a>
                    ${noAuth && !pending ? `<div class="get_accept" data-act="apply-brand:${b.name}">${b.denied ? "重新申请" : "申请权限"}</div>` : ""}
                    ${pending ? '<div class="get_accept" style="color:#999;cursor:default">已提交申请</div>' : ""}
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
    /* 《注册流程图》：只能查看已审核通过或不需要审核的品牌商品 */
    const gate = Store.brandOrderable(brand);
    if (!gate.ok) {
      if (isMp()) {
        return `<div class="rr-mp-stack">
          <article class="rr-mp-card">
            <div class="rr-mp-brand-mark">${esc(brand)}</div>
            <h3>${gate.msg}</h3>
            <p class="rr-mp-lead">该品牌开启了「下单需审核买手」，需平台审核通过后才能查看商品并加入选款单。</p>
            ${gate.pending
              ? '<span class="rr-mp-pill mute">品牌申请审核中</span>'
              : `<button type="button" class="rr-mp-cta" data-act="apply-brand:${esc(brand)}">${gate.denied ? "重新提交申请" : "提交品牌申请"}</button>`}
            <footer class="rr-mp-card-ft">
              <a href="javascript:;" data-go="buyer-intent">查看我的品牌申请</a>
              <a href="javascript:;" data-go="buyer-home">返回品牌列表</a>
            </footer>
          </article>
        </div>`;
      }
      return `<div class="oto-main_container buyer-fe">
        <div class="oto_container brand_list-container">
          ${buyerCatSide(`<div style="margin-top:16px"><a href="javascript:;" data-act="go:buyer-home">返回品牌列表</a></div>`)}
          <div class="public_right-container">
            <div class="brand-gate">
              <div class="brand-logo-rect lg">${brand}</div>
              <h3>${gate.msg}</h3>
              <p>该品牌开启了「下单需审核买手」，需平台审核通过后才能查看商品并加入选款单。</p>
              <div class="action-bar">
                ${gate.pending
                  ? '<span class="wait-chip">品牌申请审核中</span>'
                  : `<button class="btn btn-primary" data-act="apply-brand:${brand}">${gate.denied ? "重新提交申请" : "提交品牌申请"}</button>`}
                <button class="btn btn-outline" data-go="buyer-intent">查看我的品牌申请</button>
                <button class="btn btn-outline" data-go="buyer-home">返回品牌列表</button>
              </div>
            </div>
          </div>
        </div>
      </div>`;
    }
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
    /* 原站：图片视图分页；编号(list)视图一次展示全量 */
    const pageSize = 12;
    const paged = state.viewMode === "image" ? pageSlice(list, pageSize) : list;
    const listIcon = `<svg class="filter_icon view-list ${state.viewMode === "code" ? "active" : ""}" width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="4" width="16" height="1.8" fill="currentColor"/><rect x="2" y="9" width="16" height="1.8" fill="currentColor"/><rect x="2" y="14" width="16" height="1.8" fill="currentColor"/></svg>`;
    const thumbsIcon = `<svg class="filter_icon view-thumbs ${state.viewMode === "image" ? "active" : ""}" width="18" height="18" viewBox="0 0 20 20" aria-hidden="true"><rect x="2" y="2" width="7" height="7" fill="currentColor"/><rect x="11" y="2" width="7" height="7" fill="currentColor"/><rect x="2" y="11" width="7" height="7" fill="currentColor"/><rect x="11" y="11" width="7" height="7" fill="currentColor"/></svg>`;
    const imageView = `<div class="items uk-grid-medium product-grid uk-child-width-1-2 uk-child-width-1-3@m uk-child-width-1-4@l">
        ${paged.map(g => `
          <div class="item">
            <div class="item_inner">
              <div class="brand_like goods_check ${state.hearts.includes(g.skc || g.sku) ? "has_checked heart_stay" : "no_checked"}" data-heart="${g.skc || g.sku}" title="加入选款单"><span class="heart-mark">${state.hearts.includes(g.skc || g.sku) ? "♥" : "♡"}</span></div>
              <a href="javascript:;" data-go="buyer-detail" data-sku="${g.skc || g.sku}">
                <div class="cover">${g.isNew ? '<span class="badge-new">New</span>' : ""}LOOK</div>
                <p>${g.title}</p>
                <p>${g.sku}</p>
                <p>${g.code || ""}</p>
                <h2>¥<span>${g.wholesale}</span></h2>
              </a>
            </div>
          </div>`).join("") || '<div class="note">无匹配商品</div>'}
      </div>
      ${list.length ? pagination(list.length, pageSize) : ""}`;
    const codeView = `<div class="items uk-grid-small code-grid-live">
        ${list.map(g => `
          <div class="item item_small">
            <div class="item_inner item_sku">
              <div class="brand_like goods_check ${state.hearts.includes(g.skc || g.sku) ? "has_checked heart_stay" : "no_checked"}" data-heart="${g.skc || g.sku}" title="选款"><span class="heart-mark">${state.hearts.includes(g.skc || g.sku) ? "♥" : "♡"}</span></div>
              <div class="sku_item" data-go="buyer-detail" data-sku="${g.skc || g.sku}"><p class="sku_code">${g.code || g.sku.slice(-3)}</p></div>
            </div>
          </div>`).join("") || '<div class="note">无匹配商品（可取消 New / Carry Over 筛选）</div>'}
      </div>`;
    if (isMp()) {
      const sess = Store.db.buyerSession;
      const filter = `
        ${mpChipRow(seasons, s.season, "season:")}
        <div class="rr-mp-search">
          ${field("buyerSearch", input("搜索款号 / 名称", sess.search || ""))}
          <button type="button" class="rr-mp-search-btn" data-act="buyer-filter">搜索</button>
        </div>
        <div class="rr-mp-chips">
          <button type="button" class="rr-mp-seg-btn ${state.viewMode === "image" ? "on" : ""}" data-view="image">图片</button>
          <button type="button" class="rr-mp-seg-btn ${state.viewMode === "code" ? "on" : ""}" data-view="code">编号</button>
          <button type="button" class="rr-mp-seg-btn ${sess.newOnly ? "on" : ""}" data-act="mp-toggle-new">New</button>
          <button type="button" class="rr-mp-seg-btn ${sess.carryOnly ? "on" : ""}" data-act="mp-toggle-carry">Carry Over</button>
        </div>`;
      const intro = `<article class="rr-mp-card rr-mp-card-tap" data-go="buyer-brand-about">
          <header class="rr-mp-card-hd">
            <div class="rr-mp-avatar">${esc((brand || "").slice(0, 2))}</div>
            <div class="rr-mp-card-ttl">
              <b>${esc(brand)}</b>
              <small>${esc((bmeta.about || bmeta.style || "品牌介绍 / LOOKBOOK").slice(0, 42))}</small>
            </div>
            <span class="rr-mp-chevron">›</span>
          </header>
        </article>`;
      const grid = state.viewMode === "code"
        ? `<div class="rr-mp-code-grid">${list.map(g => {
            const id = g.skc || g.sku;
            const on = state.hearts.includes(id);
            return `<div class="rr-mp-code-wrap">
              <button type="button" class="rr-mp-heart sm ${on ? "on" : ""}" data-heart="${esc(id)}" title="加入选款单">${on ? "♥" : "♡"}</button>
              <button type="button" class="rr-mp-code-cell" data-go="buyer-detail" data-sku="${esc(id)}">${esc(g.code || g.sku.slice(-3))}</button>
            </div>`;
          }).join("") || `<div class="rr-mp-empty">无匹配商品</div>`}</div>`
        : `<div class="rr-mp-grid2">${list.map(g => `
            <article class="rr-mp-card rr-mp-card-tap rr-mp-goods" data-go="buyer-detail" data-sku="${esc(g.skc || g.sku)}">
              <button type="button" class="rr-mp-heart ${state.hearts.includes(g.skc || g.sku) ? "on" : ""}" data-heart="${esc(g.skc || g.sku)}">${state.hearts.includes(g.skc || g.sku) ? "♥" : "♡"}</button>
              <div class="rr-mp-cover">${g.isNew ? '<span class="rr-mp-new">New</span>' : ""}LOOK</div>
              <b>${esc(g.title)}</b>
              <small>${esc(g.sku)}</small>
              <em>¥${g.wholesale}</em>
            </article>`).join("") || `<div class="rr-mp-empty">无匹配商品</div>`}</div>`;
      return mpPage(filter, intro + grid);
    }
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
            <button type="button" class="uk-button uk-button-link icon-btn ${state.viewMode === "code" ? "on" : ""}" data-view="code" title="编号视图（原站列表图标）">${listIcon}</button>
            <button type="button" class="uk-button uk-button-link icon-btn ${state.viewMode === "image" ? "on" : ""}" data-view="image" title="图片视图（原站缩略图图标）">${thumbsIcon}</button>
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
                <div><input class="uk-checkbox" type="checkbox" id="goodsNew" data-field="buyerNew" ${s.newOnly ? "checked" : ""} /><label for="goodsNew">New</label></div>
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
    return `<div class="rr-drawer-root${isMp() ? " rr-mp-sheet" : ""}">
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
            ${renderSelectionLines(lines, { draft: true, hideSpecs: true }) || '<p style="color:#999;padding:24px 0;text-align:center">暂无选款，请先点红心</p>'}
          </div>
          <div class="rr-drawer-foot">
            <a href="javascript:;" class="oto_btn" data-act="go:buyer-selection">查看选款单</a>
            ${brand ? `<a href="javascript:;" class="oto_btn" data-act="buyer-confirm-one-brand" data-brand="${brand}">确认本品牌</a>` : ""}
          </div>
        </div>
      </div>
    </div>`;
  }

  function isMp() { return state.portal === "mp"; }

  function mpUi() {
    Store.db.ui.mp = Store.db.ui.mp || { selTab: "全部", appointTab: "全部", intentTab: "全部", msgTab: "全部", q: {} };
    Store.db.ui.mp.q = Store.db.ui.mp.q || {};
    return Store.db.ui.mp;
  }

  function mpPage(filter, body) {
    return `<div class="rr-mp-page">
      ${filter ? `<div class="rr-mp-filter">${filter}</div>` : ""}
      <div class="rr-mp-body">${body}</div>
    </div>`;
  }

  function mpSearch(placeholder, value, act) {
    return `<div class="rr-mp-search">
      ${field("mpListQ", input(placeholder, value || ""))}
      <button type="button" class="rr-mp-search-btn" data-act="${act || "mp-list-filter"}">搜索</button>
    </div>`;
  }

  function mpChipRow(items, current, actPrefix) {
    return `<div class="rr-mp-chips">${items.map(it => {
      const v = Array.isArray(it) ? it[0] : it;
      const lab = Array.isArray(it) ? it[1] : it;
      return `<button type="button" class="rr-mp-seg-btn ${String(current) === String(v) ? "on" : ""}" data-act="${actPrefix}${v}">${lab}</button>`;
    }).join("")}</div>`;
  }

  function mpKv(rows) {
    return `<dl class="rr-mp-kv">${(rows || []).map(([k, v]) => `<div><dt>${k}</dt><dd>${v == null || v === "" ? "—" : v}</dd></div>`).join("")}</dl>`;
  }

  function mpBrandGrid(brands) {
    const cat = Store.db.buyerSession.cat || "全部";
    const cats = ["全部", "女装", "男装", "男女装", "配饰"];
    const q = (mpUi().q[state.page] || "").trim().toLowerCase();
    const shown = (brands || []).filter(b => !q || String(b.name || "").toLowerCase().includes(q));
    return mpPage(
      `${mpChipRow(cats, cat, "cat:")}${mpSearch("搜索品牌", mpUi().q[state.page] || "")}`,
      `<div class="rr-mp-grid2">${shown.map(b => {
        const noAuth = b.accept === false;
        const pending = b.pending;
        const go = noAuth ? "buyer-intent" : "buyer-brand";
        const tag = noAuth ? (pending ? "申请中" : b.denied ? "被拒绝" : "需申请") : "";
        return `<article class="rr-mp-card rr-mp-card-tap rr-mp-brand-tile" data-go="${go}" data-brand="${esc(b.name)}">
          ${tag ? `<span class="rr-mp-pill mute">${tag}</span>` : ""}
          <div class="rr-mp-brand-mark">${esc(b.name)}</div>
          <b>${esc(b.name)}</b>
        </article>`;
      }).join("") || `<div class="rr-mp-empty">${q ? "无匹配品牌" : "该分类下暂无品牌"}</div>`}</div>`
    );
  }

  function mpFabCart(label) {
    syncBuyerCart();
    const restock = mpTabId() === "buyer-replenish";
    const go = restock ? "buyer-replenish-cart" : "buyer-cart";
    const lab = label || (restock ? "我的补货单" : "我的选款单");
    return `<button type="button" class="rr-mp-fab" data-go="${go}">${lab}${state.cart.length ? `<i>${state.cart.length}</i>` : ""}</button>`;
  }

  function pageBuyerCart() {
    syncBuyerCart();
    const replenish = state.page === "buyer-replenish-cart";
    const brand = state.cartBrandFilter || state.selectedBrand || (Store.db.buyerSession.selections[0] && Store.db.buyerSession.selections[0].brand) || "";
    const draft = Store.draftQuote(brand);
    const q = draft.quote || {};
    const lines = draft.lines || [];
    const brands = [...new Set((Store.db.buyerSession.selections || []).map(x => x.brand).filter(Boolean))];
    const ui = mpUi();
    const qtext = (ui.q[state.page] || "").trim().toLowerCase();
    const shown = (lines || []).filter(l => !qtext || `${l.title || ""} ${l.sku || ""}`.toLowerCase().includes(qtext));
    const filter = `${brands.length ? mpChipRow(brands, brand, "cart-brand:") : ""}${mpSearch("搜索款号 / 名称", ui.q[state.page] || "")}`;
    const body = `<article class="rr-mp-card">
        <header class="rr-mp-card-hd">
          <div class="rr-mp-avatar">${esc((brand || "—").slice(0, 2))}</div>
          <div class="rr-mp-card-ttl"><b>${esc(brand || "未选品牌")}</b><small>${replenish ? "补货草稿" : "选款草稿"}</small></div>
        </header>
        ${mpKv([
          ["件数", q.pieces || 0],
          ["SKU", (draft.items || []).length],
          ["总吊牌价", "¥" + Store.money(q.retail)],
          ["总批发价", "¥" + Store.money(q.wholesale)]
        ])}
      </article>
      ${(shown || []).map(l => {
        const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
        return `<article class="rr-mp-card rr-mp-card-tap" data-go="buyer-detail" data-sku="${esc(l.sku)}">
          <header class="rr-mp-card-hd">
            <div class="rr-mp-cover sm">图</div>
            <div class="rr-mp-card-ttl"><b>${esc(l.title || l.sku)}</b><small>${esc(l.sku)} · ${qty} 件</small></div>
            <span class="rr-mp-chevron">›</span>
          </header>
        </article>`;
      }).join("") || `<div class="rr-mp-empty">${qtext ? "无匹配款式" : "暂无款式，请添加"}</div>`}
      <div class="rr-mp-actions">
        <button type="button" class="rr-mp-cta" data-act="go:buyer-selection">查看选款单</button>
        ${brand ? `<button type="button" class="rr-mp-cta" data-act="buyer-confirm-one-brand" data-brand="${esc(brand)}">确认本品牌</button>` : ""}
      </div>`;
    return mpPage(filter, body);
  }

  function pageBuyerAppointDetail() {
    const a = state.selectedAppoint || Store.buyerAppointments()[0] || {};
    return `<div class="rr-mp-stack">
      <article class="rr-mp-card">
        <header class="rr-mp-card-hd">
          <div class="rr-mp-avatar">${esc((a.brand || "").slice(0, 2))}</div>
          <div class="rr-mp-card-ttl"><b>${esc(a.brand || "预约详情")}</b><small>${esc(a.season || "")}</small></div>
          <span class="rr-mp-pill">${a.status || "待审核"}</span>
        </header>
        ${mpKv([
          ["订货会", a.season],
          ["到场时间", a.date],
          ["人数", a.people || 1],
          ["联系人", a.contact],
          ["手机", a.phone],
          ["店铺", a.store],
          ["说明", a.reason || (a.status === "已拒绝" ? "" : "可到场看款")]
        ])}
      </article>
    </div>`;
  }

  function pageBuyerMessageDetail() {
    const m = state.selectedMsg || (Store.db.buyerMessages || [])[0] || { title: "消息", body: "暂无内容", time: "" };
    if (m) m.read = true;
    Store.persist && Store.persist();
    return `<div class="rr-mp-stack">
      <article class="rr-mp-card">
        <header class="rr-mp-card-hd">
          <div class="rr-mp-card-ttl"><b>${esc(m.title || "消息")}</b><small>${esc(m.time || "")}</small></div>
        </header>
        <p class="rr-mp-lead" style="color:#1c1c1e">${esc(m.body || "")}</p>
      </article>
    </div>`;
  }

  function pageBuyerLookDetail() {
    const b = RR.brands.find(x => x.name === state.selectedBrand) || RR.brands[0];
    const look = (Store.db.looks || []).find(l => String(l.id) === String(state.selectedLook))
      || (Store.db.looks || []).find(l => !l.brand || l.brand === (b && b.name))
      || { id: state.selectedLook, title: "LOOK", skus: [], season: "" };
    const goods = (look.skus || []).map(sku => Store.db.goods.find(g => g.sku === sku || g.skc === sku)).filter(Boolean);
    if (isMp()) {
      const ui = mpUi();
      const q = (ui.q["buyer-look-detail"] || "").trim().toLowerCase();
      const shown = goods.filter(g => !q || `${g.title} ${g.sku} ${g.code || ""}`.toLowerCase().includes(q));
      return mpPage(
        mpSearch("搜索款号 / 名称", ui.q["buyer-look-detail"] || ""),
        `<article class="rr-mp-card">
          <div class="rr-mp-cover lg">LOOK ${esc(look.id || "")}</div>
          <header class="rr-mp-card-hd">
            <div class="rr-mp-card-ttl"><b>${esc(look.title || "LOOKBOOK")}</b><small>${esc(look.season || "")} · ${esc((b && b.name) || "")}</small></div>
          </header>
        </article>
        <h3 class="rr-mp-sec">相关款式</h3>
        <div class="rr-mp-grid2">${shown.map(g => `
          <article class="rr-mp-card rr-mp-card-tap rr-mp-goods" data-go="buyer-detail" data-sku="${esc(g.skc || g.sku)}">
            <div class="rr-mp-cover">LOOK</div>
            <b>${esc(g.title)}</b>
            <small>${esc(g.sku)}</small>
            <em>¥${g.wholesale}</em>
          </article>`).join("") || `<div class="rr-mp-empty">${q ? "无匹配款式" : "该 LOOK 暂未绑定款式"}</div>`}</div>`
      );
    }
    return `<div class="rr-mp-stack">
      <article class="rr-mp-card">
        <div class="rr-mp-cover lg">LOOK ${esc(look.id || "")}</div>
        <header class="rr-mp-card-hd">
          <div class="rr-mp-card-ttl"><b>${esc(look.title || "LOOKBOOK")}</b><small>${esc(look.season || "")} · ${esc((b && b.name) || "")}</small></div>
        </header>
      </article>
      <h3 class="rr-mp-sec">相关款式</h3>
      <div class="rr-mp-grid2">${goods.map(g => `
        <article class="rr-mp-card rr-mp-card-tap rr-mp-goods" data-go="buyer-detail" data-sku="${esc(g.skc || g.sku)}">
          <div class="rr-mp-cover">LOOK</div>
          <b>${esc(g.title)}</b>
          <small>${esc(g.sku)}</small>
          <em>¥${g.wholesale}</em>
        </article>`).join("") || `<div class="rr-mp-empty">该 LOOK 暂未绑定款式</div>`}</div>
    </div>`;
  }

  function pageBuyerIntentDetail() {
    const brand = state.selectedBrand;
    const row = (Store.buyerIntentions() || []).find(r => r.brand === brand) || { brand, status: "待审核" };
    return `<div class="rr-mp-stack">
      <article class="rr-mp-card">
        <header class="rr-mp-card-hd">
          <div class="rr-mp-avatar">${esc((row.brand || "").slice(0, 2))}</div>
          <div class="rr-mp-card-ttl"><b>${esc(row.brand || "意向详情")}</b><small>${esc(row.date || row.at || "")}</small></div>
          <span class="rr-mp-pill">${row.status || "待审核"}</span>
        </header>
        ${mpKv([["状态", row.status], ["申请说明", row.note || row.reason || "—"]])}
        <footer class="rr-mp-card-ft">
          ${row.status === "已通过" ? `<a class="on" href="javascript:;" data-go="buyer-brand" data-brand="${esc(row.brand)}">查看商品</a>` : ""}
          ${row.status === "已拒绝" ? `<a href="javascript:;" data-act="apply-brand:${esc(row.brand)}">重新申请</a>` : `<span>审核中</span>`}
        </footer>
      </article>
    </div>`;
  }

  function pageBuyerSelection() {
    const store = Store.db.buyerSession.store;
    const list = Store.db.selections.filter(s => s.store === store || true);
    const hearts = Store.db.buyerSession.selections;
    if (isMp()) {
      const ui = mpUi();
      const q = (ui.q["buyer-selection"] || "").trim().toLowerCase();
      const tab = ui.selTab || "全部";
      const shown = list.filter(s => {
        const st = s.locked ? "已取消" : "待确认";
        if (tab !== "全部" && st !== tab) return false;
        if (!q) return true;
        return `${s.brand} ${s.id} ${s.season}`.toLowerCase().includes(q);
      });
      return mpPage(
        `${mpChipRow(["全部", "待确认", "已取消"], tab, "mp-chip:selTab:")}${mpSearch("搜索品牌 / 单号", ui.q["buyer-selection"] || "")}`,
        `${hearts.length ? `<button type="button" class="rr-mp-cta" data-act="buyer-confirm-hearts">按品牌确认选款单</button>` : ""}
        ${shown.map(s => `<article class="rr-mp-card rr-mp-card-tap" data-go="buyer-selection-edit" data-sel="${s.id}">
          <header class="rr-mp-card-hd">
            <div class="rr-mp-avatar">${esc((s.brand || "").slice(0, 2))}</div>
            <div class="rr-mp-card-ttl">
              <b>${s.brand}</b>
              <small>${s.season} · ${s.createdAt || s.date || s.time || "—"}</small>
            </div>
            ${s.locked ? `<span class="rr-mp-pill mute">已取消</span>` : `<span class="rr-mp-pill">待确认</span>`}
            <span class="rr-mp-chevron">›</span>
          </header>
          <div class="rr-mp-metrics">
            <span><em>¥${s.amount}</em>买手价</span>
            <span><em>${s.skus}</em>SKU</span>
            <span><em>${s.pieces}</em>件数</span>
          </div>
          ${s.locked ? "" : `<footer class="rr-mp-card-ft">
            <a href="javascript:;" data-go="buyer-selection-edit" data-sel="${s.id}">修改</a>
            <a href="javascript:;" data-act="download:选款单">下载</a>
            <a href="javascript:;" class="on" data-act="buyer-confirm-sel" data-sel="${s.id}">确认订单</a>
          </footer>`}
        </article>`).join("") || `<div class="rr-mp-empty">暂无选款单</div>`}`
      );
    }
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
                      <h6>${s.createdAt || s.date || s.time || "—"}</h6>
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
    const html = renderSelectionWorkbench(s, {
      backAct: "go:buyer-selection",
      showGen: false,
      showConfirm: true,
      showCancel: false,
      hideSpecs: true
    });
    return isMp() ? `<div class="rr-mp-work">${html}</div>` : html;
  }

  function pageBuyerOrders() {
    const tab = Store.db.buyerSession.orderTab || "全部";
    const list = Store.buyerOrders(tab);
    if (isMp()) {
      const ui = mpUi();
      const q = (ui.q["buyer-orders"] || "").trim().toLowerCase();
      const shown = list.filter(o => !q || `${o.brand} ${o.id} ${o.season} ${o.status}`.toLowerCase().includes(q));
      const typeTab = Store.db.buyerSession.orderType || "全部";
      return mpPage(
        `${mpChipRow(["全部", "首单", "补货单"], typeTab, "order-type:")}${mpChipRow(["全部", "已完成", "未完成"], tab, "order-tab:")}${mpSearch("搜索品牌 / 订单号", ui.q["buyer-orders"] || "")}`,
        shown.map(o => {
          const acts = Store.orderActions(o, "buyer");
          const pay = Store.paymentStats(o);
          const extras = [
            o.status === Store.ORDER_ST.rejected
              ? `<a href="javascript:;" data-go="buyer-selection-edit" data-sel="${o.fromSelection || ""}">修改重下</a>` : "",
            ...acts.filter(a => !a.wait && a.act !== "download:订单").map(a => {
              const panel = a.act.startsWith("open-order-panel:") ? a.act.slice("open-order-panel:".length) : "";
              if (panel) return `<a href="javascript:;" data-go="buyer-order-detail" data-oid="${o.id}" data-order-action="${panel}">${a.label}</a>`;
              if (a.act.startsWith("go:")) return `<a href="javascript:;" data-act="${a.act}">${a.label}</a>`;
              return `<a href="javascript:;" data-act="${a.act}" data-oid="${o.id}">${a.label}</a>`;
            })
          ].filter(Boolean);
          const waits = acts.filter(a => a.wait).map(a => `<span class="wait-chip">${a.label}</span>`).join("");
          return `<article class="rr-mp-card rr-mp-card-tap" data-go="buyer-order-detail" data-oid="${o.id}">
            <header class="rr-mp-card-hd">
              <div class="rr-mp-avatar">${esc((o.brand || "").slice(0, 2))}</div>
              <div class="rr-mp-card-ttl">
                <b>${o.brand}${o.type === "补货单" ? " · 补货" : ""}</b>
                <small>${o.season} · ${o.createdAt || "—"}</small>
              </div>
              <span class="rr-mp-pill">${o.status}</span>
              <span class="rr-mp-chevron">›</span>
            </header>
            <div class="rr-mp-metrics">
              <span><em>¥${o.amount}</em>订单</span>
              <span><em>¥${Store.money(pay.confirmed)}</em>已付</span>
              <span><em>¥${Store.money(pay.unpaid)}</em>待付</span>
            </div>
            <div class="rr-mp-id">${o.id}</div>
            ${extras.length || waits ? `<footer class="rr-mp-card-ft">${extras.join("")}${waits}</footer>` : ""}
          </article>`;
        }).join("") || `<div class="rr-mp-empty">暂无订单</div>`
      );
    }
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
                ${list.map(o => {
                  const acts = Store.orderActions(o, "buyer");
                  const pay = Store.paymentStats(o);
                  return `
                  <div class="item">
                    <div class="order_info">
                      ${o.type === "补货单" ? '<div class="order_type-add"><p>补货单</p></div>' : ""}
                      <h6>订单编号:${o.id} <span></span> 下单时间:${o.createdAt || "—"} <span></span> 订货季:${o.season}</h6>
                      <div class="order_brand">
                        <div class="brand-logo-rect" style="width:40px;height:40px">${(o.brand || "").slice(0, 4)}</div>
                        <h6>${o.brand}&nbsp;</h6>
                      </div>
                      <div class="order_state">
                        <p>${o.status}</p><p>¥${o.amount}</p>
                        <p class="muted">已付 ¥${Store.money(pay.confirmed)} · 待付 ¥${Store.money(pay.unpaid)}</p>
                      </div>
                      <div class="order_action ops">
                        <a href="javascript:;" class="oto_btn" data-go="buyer-order-detail" data-oid="${o.id}">查看</a>
                        <a href="javascript:;" data-act="download:订单Excel">下载</a>
                        ${o.status === Store.ORDER_ST.rejected
                          ? `<a href="javascript:;" data-go="buyer-selection-edit" data-sel="${o.fromSelection || ""}">修改重下</a>` : ""}
                        ${acts.filter(a => !a.wait && a.act !== "download:订单").map(a => {
                          const panel = a.act.startsWith("open-order-panel:") ? a.act.slice("open-order-panel:".length) : "";
                          if (panel) return `<a href="javascript:;" data-go="buyer-order-detail" data-oid="${o.id}" data-order-action="${panel}">${a.label}</a>`;
                          if (a.act.startsWith("go:")) return `<a href="javascript:;" data-act="${a.act}">${a.label}</a>`;
                          return `<a href="javascript:;" data-act="${a.act}" data-oid="${o.id}">${a.label}</a>`;
                        }).join("")}
                        ${acts.filter(a => a.wait).map(a => `<span class="wait-chip">${a.label}</span>`).join("")}
                      </div>
                    </div>
                  </div>`;
                }).join("") || '<div class="note">暂无订单</div>'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function pageBuyerOrderDetail() {
    /* Excel #19：订单详情带商品图 + 支付统计，对齐原站结构 */
    const o = state.selectedOrder || Store.db.orders[0];
    const lines = o.lines || [];
    const paid = Store.parseMoney(o.paidTotal || o.paidDeposit || 0);
    const total = Store.parseMoney(o.amount);
    const unpaid = Math.max(0, total - paid);
    const retail = Store.parseMoney(o.retailAmount) || lines.reduce((a, l) => {
      const qty = Object.values(l.sizes || {}).reduce((x, y) => x + Number(y || 0), 0);
      return a + qty * Number(l.retail || l.price || 0);
    }, 0);
    const inv = o.invoice || Store.db.buyerSession.invoice || {};
    const addr = (Store.db.buyerSession.addresses && Store.db.buyerSession.addresses[0]) || { name: "—", phone: "—", addr: "—" };
    const stats = Store.paymentStats(o);
    const acts = Store.orderActions(o, "buyer");
    const panel = state.orderAction;
    const payPanels = {
      cancel: `<div class="modal-panel"><h3>取消订单</h3>
        <div class="note">未完成订单买手可主动取消；取消后选款单退回「已驳回」，可修改后重新提交。</div>
        <div class="form-grid"><label>取消原因</label><div class="span2">${field("cancelReason", input("如：本季调整采购计划", "本季调整采购计划"))}</div></div>
        <div class="action-bar">${btn("确认取消订单", "btn-primary", "buyer-cancel-order")}</div></div>`,
      "pay-deposit": `<div class="modal-panel"><h3>上传定金付款凭证</h3>
        <div class="upload-box"><div class="plus">+</div>上传转账截图 / PDF</div>
        <div class="form-grid" style="margin-top:16px">
          <label>付款类型</label><div>${field("payKind", select(["定金"], null, "定金"))}</div>
          <label>付款金额</label><div>${field("payAmt", input("", o.deposit))}</div>
          <label>付款时间</label><div>${field("payAt", dateInput(new Date().toISOString().slice(0, 10)))}</div>
        </div>
        <div class="action-bar">${btn("提交凭证", "btn-primary", "submit-pay")}</div></div>`,
      "pay-final": `<div class="modal-panel"><h3>上传尾款付款凭证（支持分批次）</h3>
        <div class="note">可一次全额支付，也可分批次上传；平台核对通过且付清后进入「待完成结算」。</div>
        <div class="upload-box"><div class="plus">+</div>上传转账截图 / PDF</div>
        <div class="form-grid" style="margin-top:16px">
          <label>付款类型</label><div>${field("payKind", select(["尾款"], null, "尾款"))}</div>
          <label>本次金额</label><div>${field("payAmt", input("可小于未付金额（分批次）", Store.money(stats.unpaid)))}</div>
          <label>付款时间</label><div>${field("payAt", dateInput(new Date().toISOString().slice(0, 10)))}</div>
        </div>
        <div class="action-bar">${btn("提交凭证", "btn-primary", "submit-pay")}</div>
        <div class="pay-sum">未付金额 ¥${Store.money(stats.unpaid)}（已核对 ¥${Store.money(stats.confirmed)}）</div></div>`
    };
    if (isMp()) {
      return `<div class="rr-mp-stack rr-mp-detail">
        <article class="rr-mp-card">${orderFlowSteps(o)}</article>
        <article class="rr-mp-card">
          <header class="rr-mp-card-hd">
            <div class="rr-mp-avatar">${esc((o.brand || "").slice(0, 2))}</div>
            <div class="rr-mp-card-ttl"><b>${esc(o.brand || "")}${o.type === "补货单" ? " · 补货" : ""}</b><small>${esc(o.id)}</small></div>
            <span class="rr-mp-pill">${o.status}</span>
          </header>
          ${mpKv([
            ["下单时间", o.createdAt],
            ["订单金额", "¥ " + o.amount],
            ["应付定金", `¥ ${o.deposit}（${Math.round(Number(o.depositRatio || 0.3) * 100)}%）`],
            ["已付金额", "¥ " + Store.money(stats.confirmed)],
            ["待付金额", "¥ " + Store.money(stats.unpaid)]
          ])}
          <footer class="rr-mp-card-ft">
            ${acts.filter(a => !a.wait && a.act !== "download:订单").map(a => {
              const p = a.act.startsWith("open-order-panel:") ? a.act.slice("open-order-panel:".length) : "";
              if (p) return `<a href="javascript:;" class="on" data-act="open-order-panel:${p}" data-oid="${o.id}">${a.label}</a>`;
              return `<a href="javascript:;" data-act="${a.act}" data-oid="${o.id}">${a.label}</a>`;
            }).join("")}
            ${acts.filter(a => a.wait).map(a => `<span class="wait-chip">${a.label}</span>`).join("")}
            <a href="javascript:;" data-act="download:订单Excel">下载</a>
          </footer>
        </article>
        ${payPanels[panel] || ""}
        <article class="rr-mp-card">
          <h3 class="rr-mp-sec">付款凭证</h3>
          ${(o.payments || []).map(p => `<div class="rr-mp-pay-row"><b>${p.kind}</b><span>¥${p.amount}</span><span class="rr-mp-pill ${p.status === "已核对" ? "" : "mute"}">${p.status}</span></div>`).join("") || `<p class="rr-mp-lead">暂无付款凭证</p>`}
        </article>
        <article class="rr-mp-card">
          <h3 class="rr-mp-sec">流程记录</h3>
          <ul class="flow-log">${(o.flowLog || []).map(l => `<li><span>${l.at}</span>${l.text}</li>`).join("") || "<li>暂无记录</li>"}</ul>
        </article>
        <article class="rr-mp-card">
          <h3 class="rr-mp-sec">收货地址</h3>
          <p class="rr-mp-lead" style="color:#1c1c1e">${addr.name} ${addr.phone}<br/>${addr.addr}</p>
          <footer class="rr-mp-card-ft"><a href="javascript:;" data-go="buyer-profile" data-mine-tab="addr">管理地址</a></footer>
        </article>
        <article class="rr-mp-card">
          <h3 class="rr-mp-sec">开票信息</h3>
          ${mpKv([["类型", inv.type || "企业发票"], ["抬头", inv.title || o.store], ["税号", inv.tax]])}
        </article>
        ${(lines || []).map(l => {
          const g = Store.db.goods.find(x => x.sku === l.sku) || {};
          const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
          const buyerPrice = qty * Number(l.price || 0) * Number(l.discount || 1);
          const sizeText = Object.entries(l.sizes || {}).map(([k, v]) => `${k}:${v}`).join(" ");
          return `<article class="rr-mp-card rr-mp-card-tap" data-go="buyer-detail" data-sku="${esc(l.sku)}">
            <header class="rr-mp-card-hd">
              <div class="rr-mp-cover sm">图</div>
              <div class="rr-mp-card-ttl"><b>${esc(l.title || g.title || l.sku)}</b><small>SKU ${esc(l.sku)} · ${esc(sizeText || "—")}</small></div>
              <span class="rr-mp-chevron">›</span>
            </header>
            <div class="rr-mp-metrics">
              <span><em>¥${Store.money(buyerPrice)}</em>买手价</span>
              <span><em>${qty}</em>件</span>
            </div>
          </article>`;
        }).join("") || `<div class="rr-mp-empty">无商品明细</div>`}
        <article class="rr-mp-card">
          ${mpKv([
            ["总计", "¥ " + Store.money(total)],
            ["已付金额", "¥ " + Store.money(paid)],
            ["待付金额", "¥ " + Store.money(unpaid)],
            ["零售总价", "¥ " + Store.money(retail)],
            ["商品定金", "¥ " + (o.deposit || "0.00")],
            ["商品尾款", "¥ " + Store.money(Math.max(0, total - Store.parseMoney(o.deposit)))]
          ])}
        </article>
      </div>`;
    }
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container order-container order_detail-container buyer-order-detail">
        <div class="public_right-container" style="width:100%">
          <div class="sub_title order-detail-head">
            <h4>订单详情</h4>
            <a href="javascript:;" data-go="buyer-orders">返回订单列表</a>
          </div>
          ${orderFlowSteps(o)}
          <div class="order-block order-info-block">
            <div class="order-info-main">
              <div class="row"><span>订单编号:</span><b>${o.id}</b></div>
              <div class="row"><span>下单时间:</span>${o.createdAt || "—"}</div>
              <div class="row"><span>订单金额:</span>¥ ${o.amount}</div>
              <div class="row"><span>应付定金:</span>¥ ${o.deposit}（${Math.round(Number(o.depositRatio || 0.3) * 100)}%）</div>
              <div class="row"><span>已付金额:</span>¥ ${Store.money(stats.confirmed)}</div>
              <div class="row"><span>待付金额:</span>¥ ${Store.money(stats.unpaid)}</div>
            </div>
            <div class="order-info-side">
              <p class="status">${o.status}</p>
              ${acts.filter(a => !a.wait && a.act !== "download:订单").map(a => {
                const p = a.act.startsWith("open-order-panel:") ? a.act.slice("open-order-panel:".length) : "";
                if (p) return `<a href="javascript:;" class="oto_btn" data-act="open-order-panel:${p}" data-oid="${o.id}">${a.label}</a>`;
                return `<a href="javascript:;" class="oto_btn" data-act="${a.act}" data-oid="${o.id}">${a.label}</a>`;
              }).join("")}
              ${acts.filter(a => a.wait).map(a => `<span class="wait-chip">${a.label}</span>`).join("")}
              <a href="javascript:;" data-act="download:订单Excel">下载</a>
            </div>
          </div>
          ${payPanels[panel] || ""}
          <div class="order-block">
            <div class="block-head"><span>付款凭证</span><span class="muted">定金 ¥${Store.money(stats.deposit)} · 尾款 ¥${Store.money(stats.finalDue)}</span></div>
            ${paymentTable(o, "buyer")}
          </div>
          <div class="order-block">
            <div class="block-head"><span>流程记录</span></div>
            <ul class="flow-log">${(o.flowLog || []).map(l => `<li><span>${l.at}</span>${l.text}</li>`).join("") || "<li>暂无记录</li>"}</ul>
          </div>
          <div class="order-block">
            <div class="block-head"><span>收货地址</span><a href="javascript:;" data-go="buyer-profile" data-mine-tab="addr">+ 新建收货地址</a></div>
            <div class="addr-line">${addr.name} ${addr.phone}<br/>${addr.addr}</div>
          </div>
          <div class="order-block">
            <div class="block-head"><span>开票信息</span></div>
            <div class="invoice-type-row">
              <label><input type="radio" name="invKind" ${inv.type !== "个人发票" ? "checked" : ""} disabled /> 企业发票</label>
              <label><input type="radio" name="invKind" ${inv.type === "个人发票" ? "checked" : ""} disabled /> 个人发票</label>
            </div>
            <div class="invoice-grid">
              <div><label>公司名称</label><div>${inv.title || o.store || "—"}</div></div>
              <div><label>税号</label><div>${inv.tax || "—"}</div></div>
            </div>
          </div>
          <div class="order-goods-list">
            <div class="brand-line">${o.brand}</div>
            ${lines.map(l => {
              const g = Store.db.goods.find(x => x.sku === l.sku) || {};
              const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
              const buyerPrice = qty * Number(l.price || 0) * Number(l.discount || 1);
              const tag = qty * Number(l.retail || g.retail && Store.parseMoney(g.retail) || l.price || 0);
              const sizeText = Object.entries(l.sizes || {}).map(([k, v]) => `${k}:${v}`).join(" ");
              return `<div class="order-goods-item">
                ${goodsThumb("order")}
                <div class="meta">
                  <h6>${l.title || g.title || l.sku}</h6>
                  <p>SKU:${l.sku}</p>
                  <p>颜色:${l.color || g.color || "—"}</p>
                  <p>尺码:${sizeText || "—"}</p>
                  <div class="ops"><a href="javascript:;" data-act="toast:已提交退货申请">退货</a><a href="javascript:;" data-act="toast:已提交换货申请">换货</a></div>
                </div>
                <div class="price">
                  <div class="now">¥${Store.money(buyerPrice)}</div>
                  <div class="tag">吊牌价: ¥${Store.money(tag)}</div>
                </div>
              </div>`;
            }).join("") || '<div class="note">无商品明细</div>'}
          </div>
          <div class="order-pay-summary">
            <div><span>总计</span><b>¥ ${Store.money(total)}</b></div>
            <div><span>已付金额</span><b>¥ ${Store.money(paid)}</b></div>
            <div><span>待付金额</span><b>¥ ${Store.money(unpaid)}</b></div>
            <div><span>零售总价</span><b>¥ ${Store.money(retail)}</b></div>
            <div><span>服饰</span><b>${(o.discountLabel || "服饰:4.5折").split("/")[0].trim()}</b></div>
            <div><span>商品定金</span><b>¥ ${o.deposit || "0.00"}</b></div>
            <div><span>商品尾款</span><b>¥ ${Store.money(Math.max(0, total - Store.parseMoney(o.deposit)))}</b></div>
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
      ["合同/OC", "弱/内嵌", "要求独立能力", "已补预览生成页", "ok"],
      ["对账管理", "有入口", "有", "Tab 内容已补", "ok"],
      ["发货管理", "现网空页", "有", "按需求补明细", "ok"],
      ["角色权限", "现网未见", "有", "原型增量页", "ok"],
      ["买手选货/双视图/红心", "有", "有", "编码视图+悬浮选款+详情入选款", "ok"],
      ["买手选款单修改/订单进度", "—", "有", "已补", "ok"],
      ["LOOK / 添加品牌", "有入口", "有", "LOOK 增删绑 SKU；添加品牌开通权限", "ok"],
      ["金蝶对接", "无页", "有", "已补「金蝶同步」本地模拟页", "ok"]
    ];
    /* 《功能点思维导图》三张图逐项对照 */
    const mind = [
      ["平台", "买手管理：审核 / 修改资料 / 余额 / 发票 / 地址 / 添加品牌 / 添加预约", "买手管理各子页", "ok"],
      ["平台", "品牌管理：添加品牌", "品牌管理 → 添加品牌", "ok"],
      ["平台", "品牌列表：优惠规则 / 尺寸别名 / 订货会 / 收款 / 合同 / 编辑", "品牌列表行内链接", "ok"],
      ["平台", "设置品牌订单首付比例（定金）", "品牌列表列 + 收款设置内保存比例", "ok"],
      ["平台", "设置品牌商品下单是否需要审核买手", "品牌列表「下单需审核买手」开关", "ok"],
      ["平台", "风格 / 适用人群 / 平台标准尺码配置", "品牌管理主数据三页", "ok"],
      ["平台", "预约管理：预约列表 / 审核预约", "预约管理分组（通过·拒绝含原因）", "ok"],
      ["平台", "意向申请：审核买手提交的品牌申请", "意向审核", "ok"],
      ["平台", "订货会管理：创建订货会（含首单/补货开关）/ 订货会列表", "创建新订货会（原季节控制已并入）", "ok"],
      ["平台", "商品管理：补货/隐藏、批量导入、列表", "商品管理分组", "ok"],
      ["平台", "添加新商品：商品编号可重复 / 支持多规格 / SKC 编号", "添加新商品页多规格编辑器（SKC 唯一校验+自动生成）", "ok"],
      ["平台", "订单管理：驳回 / 折扣 / 首付比例 / 付款凭证 / 生成OC / 下载", "订单详情动态操作区", "ok"],
      ["平台", "订单完成：不考虑发货，人工点完成并统计付款差额", "「完成结算」按钮 + 付款差额", "ok"],
      ["平台", "选款单管理：修改 / 生成订单 / 下载 / 取消", "选款单管理 + 详情", "ok"],
      ["平台", "款式汇总 / 实时订单汇总 / 总选款单 / 总订单 / 订单分析", "订单管理分组各页", "ok"],
      ["平台", "平台运营账号管理：账号管理 / 角色权限", "账户中心 + 角色权限", "ok"],
      ["品牌", "品牌设置：优惠 / 尺寸别名 / 订货会 / 收款 / 合同（非订单合同模板）/ 编辑 / 首付比例 / 风格 / 人群", "品牌端「品牌设置」分组", "ok"],
      ["品牌", "意向申请 / 商品管理 / 订单管理 / 补货单 / 汇总统计 / 预约列表", "品牌端各分组", "ok"],
      ["买手", "买手注册 / 手机号+验证码登录", "注册页 + 审核进度 + 登录门槛", "ok"],
      ["买手", "预约申请（申请线下参加订货会）", "买手端「预约申请」", "ok"],
      ["买手", "订货会采购：仅已通过或免审核品牌可加入选款单（仅加款式）", "品牌门槛 + 选款单", "ok"],
      ["买手", "补货采购 / 选款单（修改·下载·生成订单）", "补货页 + 我的选款单", "ok"],
      ["买手", "我的订单：订货会订单（取消 / 确认定金 / 上传付款凭证）+ 补货订单", "我的订单动态操作区", "ok"],
      ["买手", "意向品牌：申请品牌 / 已通过品牌列表", "买手端「意向品牌」", "ok"]
    ];
    return `${subTitle("覆盖核对（实事求是）")}
      <div class="note">结论：主业务与开放项已在本地 Store 闭环；仍<strong>不接真实现网/金蝶 HTTP</strong>，下载为 CSV 导出，上传为批量导入模拟。</div>
      <h3 style="margin:20px 0 8px;font-size:16px">功能点思维导图逐项对照（平台端 / 品牌端 / 买手端）</h3>
      <table class="data-table gap-table">
        <thead><tr><th>端</th><th>思维导图功能点</th><th>原型落点</th><th>状态</th></tr></thead>
        <tbody>${mind.map(r => `<tr>
          <td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td>
          <td class="${r[3]}">${r[3] === "ok" ? "已覆盖" : "部分"}</td>
        </tr>`).join("")}</tbody>
      </table>
      <h3 style="margin:24px 0 8px;font-size:16px">现网 / 需求差异</h3>
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
    /* #17 账号列表：添加账号 + 列表，账号关联权限角色 */
    const accounts = Store.db.accounts || [
      { phone: "13800000000", name: "平台管理员", role: "高级管理员", status: "启用" },
      { phone: "13900000001", name: "运营小王", role: "订单管理员", status: "启用" },
      { phone: "13700000002", name: "财务小李", role: "财务管理员", status: "启用" }
    ];
    Store.db.accounts = accounts;
    const roles = (Store.db.roles || []).map(r => r.name);
    return `${subTitle("账号列表")}
      <div class="note">「账号权限」模块：本页添加/查看账号；侧栏「权限设置」配置角色权限，账号关联角色。</div>
      <div class="form-section">
        <h3>添加账号</h3>
        <div class="form-grid">
          <label>姓名</label><div>${field("accName", input("姓名"))}</div>
          <label>手机号 *</label><div>${field("accPhone", input("登录手机号"))}</div>
          <label>关联权限</label><div>${field("accRole", select(roles.length ? roles : ["高级管理员"], null, roles[0] || "高级管理员"))}</div>
        </div>
        <div class="action-bar">${btn("添加账号", "btn-primary", "add-account")}</div>
      </div>
      <table class="data-table" style="margin-top:16px">
        <thead><tr><th>姓名</th><th>手机号</th><th>关联权限</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>${accounts.map((a, i) => `<tr>
          <td>${a.name}</td><td>${a.phone}</td><td>${a.role}</td>
          <td><span class="badge green">${a.status || "启用"}</span></td>
          <td class="ops"><a href="javascript:;" data-go="role-perm" data-role-name="${a.role}">查看权限</a>
            <a href="javascript:;" data-act="disable-account:${i}">停用</a></td>
        </tr>`).join("")}</tbody>
      </table>`;
  }

  function pageRoleList() {
    /* 兼容旧入口：跳转到账号列表说明 */
    return pageAccount();
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
    if (act.startsWith("go:")) {
      const target = act.slice(3);
      if (isRootNavEl(el)) { go(target, { replace: true }); return; }
      const stackTop = state.navStack[state.navStack.length - 1];
      const parent = PAGE_PARENT[state.page];
      if (target === stackTop || target === parent) {
        if (state.navStack.length && state.navStack[state.navStack.length - 1] === target) state.navStack.pop();
        else state.navStack = [];
        go(target, { back: true });
        return;
      }
      go(target);
      return;
    }
    if (act.startsWith("toast:")) { toast(act.slice(6)); return; }

    if (act.startsWith("order-type:")) {
      Store.setBuyerOrderType(act.slice("order-type:".length));
      render();
      toast("已筛选：" + act.slice("order-type:".length));
      return;
    }
    if (act.startsWith("order-tab:")) {
      Store.setBuyerOrderTab(act.slice("order-tab:".length));
      render();
      toast("已切换：" + act.slice("order-tab:".length));
      return;
    }
    if (act.startsWith("sync-goods-price:")) {
      toast(Store.syncGoodsPriceToOrders(act.slice("sync-goods-price:".length)).msg);
      render();
      return;
    }
    if (act.startsWith("toggle-self-sub:")) {
      const name = act.slice("toggle-self-sub:".length);
      const b = Store.db.buyers.find(x => x.name === name);
      toast(Store.setBuyerAllowSelfSub(name, !(b && b.allowSelfSub)));
      render();
      return;
    }
    if (act.startsWith("del-fair-slot:")) {
      const fair = currentFair();
      const brand = state.selectedBrand || (fair && fair.brands && fair.brands[0]);
      toast(Store.removeFairSlot(fair && fair.id, brand, act.slice("del-fair-slot:".length)));
      render();
      return;
    }
    if (act.startsWith("checkin-tab:")) {
      Store.db.ui.checkinTab = act.slice("checkin-tab:".length);
      Store.persist();
      render();
      return;
    }
    if (act === "toggle-checker") {
      Store.db.buyerSession.role = Store.db.buyerSession.role === "checker" ? "buyer" : "checker";
      Store.persist();
      if (state.portal === "mp") state.page = Store.db.buyerSession.role === "checker" ? "mp-scan" : "buyer-order-hub";
      toast(Store.db.buyerSession.role === "checker" ? "已切换为平台签到员（仅子账号 + 扫一扫）" : "已切回买手账号");
      render();
      return;
    }
    if (act.startsWith("cat:")) {
      Store.db.buyerSession.cat = act.slice(4);
      Store.persist();
      render();
      toast(`分类：${act.slice(4)}`);
      return;
    }
    if (act.startsWith("toggle-delete:")) {
      toast(Store.toggleDelete(act.slice("toggle-delete:".length)));
      render();
      return;
    }
    if (act.startsWith("apply-brand:")) {
      const brand = act.slice("apply-brand:".length);
      const r = Store.applyBrandAccess(brand);
      toast(r.msg);
      render();
      return;
    }
    if (act.startsWith("realtime-detail:")) {
      const brand = act.slice("realtime-detail:".length);
      Store.db.ui.realtimeBrand = brand;
      Store.setOrderFilter({ ...(Store.db.ui.orderFilter || {}), brand, type: "全部", status: "全部" });
      Store.persist();
      state.selectedBrand = brand;
      go("order-list");
      toast(`已打开「${brand}」订单明细`);
      return;
    }
    if (act.startsWith("look-open:")) {
      Store.db.ui.lookEditId = act.slice("look-open:".length);
      Store.persist();
      render();
      return;
    }
    if (act.startsWith("look-del:")) {
      const r = Store.removeLook(act.slice("look-del:".length));
      toast(r.msg);
      if (String(Store.db.ui.lookEditId) === act.slice("look-del:".length)) Store.db.ui.lookEditId = "";
      Store.persist();
      render();
      return;
    }
    if (act.startsWith("look-save:")) {
      const id = act.slice("look-save:".length);
      const f = readFields();
      const look = Store.db.looks.find(l => String(l.id) === String(id));
      if (look) {
        look.title = f.lookTitle || look.title;
        look.season = f.lookSeason || look.season;
        Store.persist();
      }
      const r = Store.bindLookSkus(id, f.lookSkus);
      toast(r.msg);
      render();
      return;
    }
    if (act.startsWith("edit-substore:")) {
      const i = Number(act.split(":")[1]);
      const row = (Store.db.buyerSession.substores || [])[i];
      if (!row) { toast("子店铺不存在"); return; }
      const name = prompt("子店铺名", row.name);
      if (name == null) return;
      const city = prompt("城市", row.city || "");
      if (city == null) return;
      toast(Store.updateSubstore(i, { name, city }).msg);
      render();
      return;
    }
    if (act.startsWith("kingdee:")) {
      const r = Store.syncKingdee(act.slice("kingdee:".length));
      toast(r.msg);
      render();
      return;
    }

    if (act.startsWith("download:")) {
      const what = act.slice(9);
      if (what.includes("选款单") || what === "选款单") {
        const list = Store.filteredSelections();
        downloadCsv("selections.csv", ["单号,品牌,店铺,季节,金额,状态"].concat(list.map(s => `${s.id},${s.brand},${s.store},${s.season},${s.amount},${s.status}`)));
      } else if (what.includes("订单")) {
        downloadCsv("orders.csv", ["订单号,品牌,类型,店铺,金额,状态"].concat(Store.db.orders.map(o => `${o.id},${o.brand},${o.type},${o.store},${o.amount},${o.status}`)));
      } else if (what.includes("预约时段")) {
        downloadCsv("fair_slots_template.csv", ["日期,开始,结束,上限", "2026-09-08,08:30,09:30,200", "2026-09-08,09:30,11:30,150"]);
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
    if (act.startsWith("toggle-fair:")) {
      const [, season, kind] = act.split(":");
      const cur = Store.db.fairs[season] || { first: true, replenish: true };
      const patch = kind === "first"
        ? { first: !cur.first }
        : { replenish: !cur.replenish };
      toast(Store.setFair(season, patch));
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
      const r = Store.removeSelectionLine(sel.id, sku, selPlatformOpts());
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
      const r = Store.addSelectionLine(sel.id, sku, selPlatformOpts());
      toast(r.msg);
      state.selectedSel = Store.db.selections.find(x => x.id === sel.id);
      state.selAddOpen = false;
      render();
      return;
    }
    if (act.startsWith("season:")) {
      Store.db.buyerSession.season = act.slice("season:".length);
      state.listPage = 1;
      Store.persist();
      render();
      return;
    }
    if (act.startsWith("mp-chip:")) {
      const rest = act.slice("mp-chip:".length);
      const i = rest.indexOf(":");
      if (i > 0) {
        mpUi()[rest.slice(0, i)] = rest.slice(i + 1);
        Store.persist();
        render();
      }
      return;
    }
    if (act.startsWith("cart-brand:")) {
      state.cartBrandFilter = act.slice("cart-brand:".length);
      state.selectedBrand = state.cartBrandFilter;
      render();
      return;
    }
    if (act.startsWith("disable-account:")) {
      const i = Number(act.split(":")[1]);
      if (Store.db.accounts && Store.db.accounts[i]) {
        Store.db.accounts[i].status = "停用";
        Store.persist();
        toast("账号已停用");
      }
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
    if (act.startsWith("buyer-mine-tab:")) {
      Store.db.ui.buyerMineTab = act.split(":")[1] || "info";
      Store.persist();
      render();
      return;
    }
    if (act.startsWith("save-buyer-admin:")) {
      const mode = act.split(":")[1] || "profile";
      const f = readFields();
      const buyerName = state.selectedBuyer || (Store.db.buyers[0] && Store.db.buyers[0].name);
      if (mode === "invoice") {
        toast(Store.saveBuyerAdmin(buyerName, { invoice: { title: f.title, tax: f.tax } }));
      } else if (mode === "address") {
        toast(Store.saveBuyerAdmin(buyerName, { addresses: [{ name: f.name, phone: f.phone, addr: f.addr }] }));
      } else {
        const patch = { name: f.name, level: f.level, city: f.city, phone: f.phone, about: f.about };
        toast(Store.saveBuyerAdmin(buyerName, patch));
        if (f.name && f.name !== buyerName) state.selectedBuyer = f.name;
      }
      render();
      return;
    }

    if (act.startsWith("save:")) {
      handleAct("save-context", el);
      return;
    }

    /* ---------- 注册流程（图1） ---------- */
    if (act.startsWith("flow-tab:")) {
      state.flowTab = act.split(":")[1] || "register";
      render();
      return;
    }
    if (act.startsWith("login-as-buyer:")) {
      const phone = act.slice("login-as-buyer:".length);
      const r = Store.buyerLogin(phone, "888888");
      toast(r.msg);
      if (r.ok) {
        state.portal = "buyer";
        state.roleLogin = "buyer";
        localStorage.setItem("rr_portal", "buyer");
        go("buyer-home");
      } else render();
      return;
    }
    if (act.startsWith("approve-buyer:") || act.startsWith("reject-buyer:")) {
      const pass = act.startsWith("approve-buyer:");
      const name = act.slice(act.indexOf(":") + 1);
      if (!pass) {
        Store.db.ui.rejectBuyer = name;
        Store.persist();
        render();
        toast("请填写拒绝原因后提交");
        return;
      }
      toast(Store.setBuyerStatus(name, "已通过"));
      render();
      return;
    }
    if (act.startsWith("del-spec:")) {
      const idx = Number(act.split(":")[1]);
      const f = readFields();
      const cur = [...app.querySelectorAll("[data-spec]")].map(row => {
        const i = row.getAttribute("data-spec");
        const color = f["specColor-" + i];
        return {
          color: color === "请选择" ? "" : color,
          skc: f["specSkc-" + i] || "",
          sizes: [...row.querySelectorAll(`[data-check="specSizes-${i}"]:checked`)].map(x => x.value)
        };
      });
      state.goodsSpecs = cur.filter((_, i) => i !== idx);
      state.goodsDraft = f;
      render();
      return;
    }
    if (act.startsWith("brand-audit:")) {
      const [, brand, val] = act.split(":");
      toast(Store.setBrandAudit(brand, val === "1"));
      render();
      return;
    }
    /* ---------- 预约管理 · 审核预约 ---------- */
    if (act.startsWith("approve-appoint:")) {
      toast(Store.auditAppointment(act.split(":")[1], true));
      Store.db.ui.rejectAppoint = "";
      Store.persist();
      render();
      return;
    }
    if (act.startsWith("reject-appoint:")) {
      Store.db.ui.rejectAppoint = act.split(":")[1];
      Store.persist();
      render();
      toast("请填写拒绝原因后提交");
      return;
    }

    /* ---------- 订单流程（图2） ---------- */
    if (act.startsWith("open-order-panel:")) {
      state.orderAction = act.slice("open-order-panel:".length);
      const oid = el && el.getAttribute("data-oid");
      if (oid) state.selectedOrder = Store.db.orders.find(o => o.id === oid) || state.selectedOrder;
      render();
      return;
    }
    if (act.startsWith("check-pay:")) {
      const [, idx, verdict] = act.split(":");
      const oid = (el && el.getAttribute("data-oid")) || (state.selectedOrder && state.selectedOrder.id);
      const f = readFields();
      const r = Store.advanceOrder(oid, "checkVoucher", {
        index: idx, pass: verdict === "pass", note: f.checkNote || ""
      });
      toast(r.msg);
      state.selectedOrder = Store.db.orders.find(o => o.id === oid) || state.selectedOrder;
      state.orderAction = "";
      render();
      return;
    }

    const selId = (el && el.getAttribute("data-sel")) || (state.selectedSel && state.selectedSel.id);
    const orderId = (el && el.getAttribute("data-oid")) || (state.selectedOrder && state.selectedOrder.id);
    const shipId = (el && el.getAttribute("data-ship")) || (state.selectedShip && state.selectedShip.id);
    if (orderId) state.selectedOrder = Store.db.orders.find(o => o.id === orderId) || state.selectedOrder;
    if (selId) state.selectedSel = Store.db.selections.find(s => s.id === selId) || state.selectedSel;

    switch (act) {
      case "mp-list-filter": {
        mpUi().q[state.page] = readFields().mpListQ || "";
        Store.persist();
        render();
        break;
      }
      case "mp-toggle-new":
        Store.db.buyerSession.newOnly = !Store.db.buyerSession.newOnly;
        state.listPage = 1;
        Store.persist();
        render();
        break;
      case "mp-toggle-carry":
        Store.db.buyerSession.carryOnly = !Store.db.buyerSession.carryOnly;
        state.listPage = 1;
        Store.persist();
        render();
        break;
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
        Store.db.ui.intentBrand = "全部";
        Store.persist();
        render();
        toast("已清空筛选条件");
        break;
      case "back": {
        const target = resolveBackTarget();
        if (!target) {
          toast("已在顶层页面");
          break;
        }
        if (state.navStack.length) state.navStack.pop();
        go(target, { back: true });
        break;
      }
      case "send-code": {
        const f = readFields();
        const r = Store.sendSmsCode(f.regPhone || f.loginPhone || f.queryPhone);
        if (!r.ok) { toast(r.msg); break; }
        let n = 60;
        el.disabled = true;
        el.textContent = `${n}s`;
        const timer = setInterval(() => {
          n -= 1;
          if (n <= 0) { clearInterval(timer); el.disabled = false; el.textContent = "获取验证码"; }
          else el.textContent = `${n}s`;
        }, 1000);
        toast(r.msg);
        break;
      }
      case "add-to-order": {
        const g = Store.db.goods.find(x => x.sku === (state.selectedGoods || RR.goods[0].sku)) || Store.db.goods[0];
        const total = Object.values(state.qty).reduce((a, b) => a + Number(b || 0), 0);
        if (!total) { toast("请先选择尺码数量"); return; }
        const check = Store.canOrder(g.brand, g.season, state.page === "buyer-replenish" ? "补货单" : "首单");
        if (!check.ok) { toast(check.msg); return; }
        const r = Store.upsertDraftSelection(g.sku, { ...state.qty });
        toast(r.msg);
        if (r.ok) {
          syncBuyerCart();
          state.cartOpen = true;
        }
        render();
        break;
      }
      case "logout": {
        localStorage.removeItem("rr_portal");
        state.portal = "platform";
        state.page = "login";
        state.cartOpen = false;
        toast("已登出");
        render();
        break;
      }
      case "reject-selection": {
        const id = selId || (el && el.getAttribute("data-sel")) || (state.selectedSel && state.selectedSel.id);
        const r = Store.rejectSelection(id, "请修改后重新提交");
        toast(r.msg || r);
        render();
        break;
      }
      case "submit-selection": {
        const sel = state.selectedSel || Store.db.selections[0];
        toast((Store.submitSelection(sel && sel.id) || {}).msg || "已提交");
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
      /* ---- 订单流程动作（图2） ---- */
      case "platform-confirm-order": {
        const id = orderId || Store.db.orders[0].id;
        const r = Store.advanceOrder(id, "platformConfirm");
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === id);
        state.orderAction = r.ok ? "modify" : state.orderAction;
        render();
        break;
      }
      case "confirm-discount": {
        const id = orderId || Store.db.orders[0].id;
        const r = Store.advanceOrder(id, "confirmDiscount");
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === id);
        state.orderAction = r.ok ? "deposit" : "";
        render();
        break;
      }
      case "set-order-cat-discount": {
        const f = readFields();
        const id = orderId || (state.selectedOrder && state.selectedOrder.id) || Store.db.orders[0].id;
        const r = Store.advanceOrder(id, "setDiscount", {
          catDiscount: {
            cloth: f.odCloth,
            accessory: f.odAccessory,
            lifestyle: f.odLifestyle
          }
        });
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === id);
        render();
        break;
      }
      case "intent-filter": {
        const f = readFields();
        Store.db.ui.intentBrand = f.intentFilterBrand || "全部";
        Store.persist();
        render();
        toast(Store.db.ui.intentBrand === "全部" ? "已显示全部品牌" : `已筛选：${Store.db.ui.intentBrand}`);
        break;
      }
      case "confirm-deposit": {
        const f = readFields();
        const ratio = Number(String(f.depRatio || "30").replace("%", "")) / 100 || 0.3;
        const id = orderId || Store.db.orders[0].id;
        const r = Store.advanceOrder(id, "setDeposit", { ratio });
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === id);
        state.orderAction = "";
        render();
        break;
      }
      case "set-order-discount": {
        const f = readFields();
        const id = orderId || Store.db.orders[0].id;
        const r = Store.advanceOrder(id, "setDiscount", { discount: Number(f.orderDiscount) });
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === id);
        render();
        break;
      }
      case "buyer-confirm-deposit": {
        const id = orderId || Store.db.orders[0].id;
        const r = Store.advanceOrder(id, "buyerConfirmDeposit");
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === id);
        render();
        break;
      }
      case "submit-pay": {
        const f = readFields();
        const id = orderId || Store.db.orders[0].id;
        const kind = f.payKind || (state.orderAction === "pay-final" ? "尾款" : "定金");
        const r = Store.advanceOrder(id, "uploadVoucher", { kind, amount: f.payAmt, at: f.payAt });
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === id);
        state.orderAction = "";
        render();
        break;
      }
      case "gen-oc": {
        const id = orderId || Store.db.orders[0].id;
        const r = Store.advanceOrder(id, "genOc");
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === id);
        render();
        break;
      }
      case "settle-order": {
        const id = orderId || Store.db.orders[0].id;
        const r = Store.advanceOrder(id, "settle");
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === id);
        render();
        break;
      }
      case "confirm-final": {
        const id = orderId || Store.db.orders[0].id;
        const r = Store.advanceOrder(id, "finalConfirm");
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === id);
        render();
        break;
      }
      case "reject-order": {
        const f = readFields();
        const id = orderId || Store.db.orders[0].id;
        const r = Store.advanceOrder(id, "reject", { reason: f.rejReason });
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === id);
        state.orderAction = "";
        render();
        break;
      }
      case "buyer-cancel-order": {
        const f = readFields();
        const id = orderId || Store.db.orders[0].id;
        const r = Store.advanceOrder(id, "cancel", { reason: f.cancelReason });
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === id);
        state.orderAction = "";
        render();
        break;
      }
      /* ---- 注册流程动作（图1） ---- */
      case "submit-register": {
        const f = readFields();
        state.regDraft = f;
        if (!f.regAgree) { toast("请先勾选同意《平台服务协议》"); render(); break; }
        const r = Store.submitBuyerRegister({
          store: f.regStore, phone: f.regPhone, code: f.regCode, contact: f.regContact,
          city: f.regCity === "请选择" ? "" : f.regCity, addr: f.regAddr,
          invoiceTitle: f.regInvoice, tax: f.regTax,
          intent: f.regIntent === "暂不选择" ? "" : f.regIntent
        });
        toast(r.msg);
        if (r.ok) {
          state.regQueryPhone = f.regPhone;
          state.regDraft = null;
          go("register-status");
        } else render();
        break;
      }
      case "query-reg": {
        const f = readFields();
        state.regQueryPhone = f.queryPhone || "";
        const r = Store.buyerRegStatus(state.regQueryPhone);
        toast(r.found ? `${r.store}：${r.status}` : "未查询到注册记录");
        render();
        break;
      }
      case "submit-reject-buyer": {
        const f = readFields();
        const name = Store.db.ui.rejectBuyer;
        toast(Store.setBuyerStatus(name, "已拒绝", f.rejectReason));
        Store.db.ui.rejectBuyer = "";
        Store.persist();
        render();
        break;
      }
      case "cancel-reject-buyer": {
        Store.db.ui.rejectBuyer = "";
        Store.persist();
        render();
        break;
      }
      case "submit-reject-appoint": {
        const f = readFields();
        toast(Store.auditAppointment(Store.db.ui.rejectAppoint, false, f.appointReason));
        Store.db.ui.rejectAppoint = "";
        Store.persist();
        render();
        break;
      }
      case "cancel-reject-appoint": {
        Store.db.ui.rejectAppoint = "";
        Store.persist();
        render();
        break;
      }
      case "submit-buyer-appoint": {
        const f = readFields();
        if (!f.apPhone) { toast("请填写联系人手机号"); break; }
        if (!f.apBrand || f.apBrand === "请选择品牌") { toast("请选择品牌"); break; }
        const fair = (Store.db.orderingFairs || []).find(x => `${x.name}（${x.season}）` === f.apFair);
        toast(Store.addAppointment({
          brand: f.apBrand, store: Store.db.buyerSession.store,
          contact: Store.db.buyerSession.store, phone: f.apPhone,
          date: String(f.apDate || "").replace("T", " "),
          season: (fair && fair.season) || (Store.db.buyerSession.season !== "全部" && Store.db.buyerSession.season) || "2026SS",
          people: f.apPeople
        }));
        render();
        break;
      }
      case "add-brand": {
        const f = readFields();
        const cats = [...app.querySelectorAll('[data-check="cats"]:checked')].map(x => x.value);
        const styles = [...app.querySelectorAll('[data-check="styles"]:checked')].map(x => x.value);
        const crowds = [...app.querySelectorAll('[data-check="crowds"]:checked')].map(x => x.value);
        if (!String(f.contact || "").trim()) { toast("请填写联系人"); break; }
        if (!/^1\d{10}$/.test(String(f.phone || "").trim())) { toast("请填写 11 位联系手机（品牌端登录账号）"); break; }
        const r = Store.addBrand({
          name: f.name,
          cat: cats[0] || "女装",
          cats, styles, crowds,
          year: Number(f.year || 0),
          site: f.site || "",
          shipAt: f.shipAt || "",
          designer: f.designer || "",
          about: f.about || "",
          abbr: f.abbr || "",
          currency: f.currency || "CNY",
          textColor: f.textColor || "黑色",
          contact: f.contact,
          phone: f.phone,
          needAudit: !!f.nbAudit,
          discountBase: f.discountBase === "订货价" ? "wholesale" : "retail",
          ratio: (Number(String(f.nbRatio).replace("%", "")) || 30) / 100
        });
        toast(r.msg);
        if (r.ok) go("brand-list");
        break;
      }
      case "save-brand-audit-set": {
        const f = readFields();
        const brand = f.auditBrand || state.selectedBrand;
        state.selectedBrand = brand;
        toast(Store.setBrandAudit(brand, !!f.auditNeed));
        render();
        break;
      }
      case "save-brand-ratio": {
        const f = readFields();
        toast(Store.setBrandDepositRatio(f.depBrand, f.depBrandRatio));
        state.selectedBrand = f.depBrand || state.selectedBrand;
        render();
        break;
      }
      case "submit-intent": {
        const f = readFields();
        const brand = f.intentBrand;
        if (!brand || brand === "暂无可申请品牌") { toast("当前没有需要申请的品牌"); break; }
        const r = Store.applyBrandAccess(brand, f.intentNote);
        toast(r.msg);
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
        toast(Store.toggleDelete(el.getAttribute("data-sku") || (el.closest("[data-sku]") && el.closest("[data-sku]").getAttribute("data-sku"))));
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
        /* 多规格：每行「颜色 + SKC + 尺寸」生成一条 SKC */
        const specs = [...app.querySelectorAll("[data-spec]")].map(row => {
          const i = row.getAttribute("data-spec");
          const color = f["specColor-" + i];
          return {
            color: color === "请选择" ? "" : color,
            skc: f["specSkc-" + i] || "",
            sizes: [...row.querySelectorAll(`[data-check="specSizes-${i}"]:checked`)].map(x => x.value)
          };
        });
        state.goodsSpecs = specs.length ? specs : state.goodsSpecs;
        state.goodsDraft = f;
        const r = Store.addGoods({
          brand: f.brand, title: f.title, sku: f.sku, season: f.season,
          specs,
          retail: f.retail, wholesale: f.wholesale, cat: f.cat, subcat: f.subcat,
          carry: !!f.carry || f.carry === "是",
          restock: f.restock !== false && f.restock !== "否",
          linesheet: f.band || "",
          shipAt: f.shipAt || ""
        });
        toast(r.msg);
        if (r.ok) {
          state.goodsSpecs = null;
          state.goodsDraft = null;
          go("goods-list");
        } else render();
        break;
      }
      case "add-spec": {
        const f = readFields();
        const cur = [...app.querySelectorAll("[data-spec]")].map(row => {
          const i = row.getAttribute("data-spec");
          const color = f["specColor-" + i];
          return {
            color: color === "请选择" ? "" : (color || ""),
            skc: f["specSkc-" + i] || "",
            sizes: [...row.querySelectorAll(`[data-check="specSizes-${i}"]:checked`)].map(x => x.value)
          };
        });
        /* #6 新手填规格，颜色默认空 */
        state.goodsSpecs = [...cur, { color: "", skc: "", sizes: ["S", "M", "L"] }];
        state.goodsDraft = f;
        render();
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
        const brand = state.selectedBrand || (RR.brands[0] && RR.brands[0].name);
        const f = readFields();
        Store.listOrderingSessions().forEach(sess => {
          const key = String(sess.id || sess.season).replace(/[^A-Za-z0-9_-]/g, "_");
          Store.setBrandFair(brand, sess.season, {
            first: !!f["fair-first-" + key],
            replenish: !!f["fair-rep-" + key]
          });
        });
        toast("订货会设置已保存（关闭后商品可见不可下单）");
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
        if (!String(f.contact || "").trim()) { toast("请填写联系人"); break; }
        if (!/^1\d{10}$/.test(String(f.phone || "").trim())) { toast("请填写 11 位联系手机（品牌端登录账号）"); break; }
        toast(Store.saveBrandProfile({
          name: f.name, year: Number(f.year || 0), designer: f.designer || "", about: f.about || "",
          site: f.site || "", shipAt: f.shipAt || "", abbr: f.abbr || "",
          currency: f.currency || "CNY", textColor: f.textColor || "黑色",
          contact: f.contact, phone: f.phone,
          cats, styles, crowds,
          needAudit: !!f.nbAudit,
          discountBase: f.discountBase === "订货价" ? "wholesale" : "retail",
          ratio: (Number(String(f.nbRatio).replace("%", "")) || 30) / 100
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
          ? { sku: g.skc || g.sku, hideAll: (f["hide-" + (g.skc || g.sku)] || "否") === "是" }
          : { sku: g.skc || g.sku, restock: (f["restock-" + (g.skc || g.sku)] || "是") === "是" });
        toast(Store.saveRestock(rows));
        render();
        break;
      }
      case "add-look":
        toast(Store.addLook());
        Store.db.ui.lookEditId = (Store.db.looks[Store.db.looks.length - 1] || {}).id;
        Store.persist();
        render();
        break;
      case "look-close":
        Store.db.ui.lookEditId = "";
        Store.persist();
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
        toast(Store.saveBuyerProfile({
          invoice: {
            title: f.invTitle, tax: f.invTax, phone: f.invPhone,
            addr: f.invAddr, bank: f.invBank, account: f.invAccount,
            type: f.invKind || "企业发票"
          }
        }));
        break;
      }
      case "save-buyer-profile": {
        const f = readFields();
        toast(Store.saveBuyerProfile({ phone: f.phone, contact: f.contact, store: f.store, city: f.city }));
        render();
        break;
      }
      case "save-buyer-addresses": {
        const f = readFields();
        const addrs = (Store.db.buyerSession.addresses || []).map((a, i) => ({
          name: f["addrName-" + i] || a.name,
          phone: f["addrPhone-" + i] || a.phone,
          addr: f["addrDetail-" + i] || a.addr
        }));
        toast(Store.saveBuyerProfile({ addresses: addrs }));
        render();
        break;
      }
      case "create-ordering-fair": {
        const f = readFields();
        const brands = [...app.querySelectorAll('[data-check="fairBrands"]:checked')].map(x => x.value);
        if (!String(f.fairSeason || "").trim()) { toast("请手写填写季节，例如 2028SS"); break; }
        if (!brands.length) { toast("请至少选择一个参与品牌"); break; }
        const r = Store.createOrderingFair({
          name: f.fairName,
          season: String(f.fairSeason).trim(),
          intro: f.fairIntro,
          cover: true,
          bookFrom: f.fairBookFrom,
          bookTo: f.fairBookTo,
          fairFrom: f.fairFrom,
          fairTo: f.fairTo,
          brands
        });
        toast(r.msg || r);
        if (r.ok) go("fair-list");
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
      case "add-account": {
        const f = readFields();
        if (!String(f.accPhone || "").trim()) { toast("请填写手机号"); break; }
        Store.db.accounts = Store.db.accounts || [];
        Store.db.accounts.unshift({
          name: f.accName || "未命名",
          phone: String(f.accPhone).trim(),
          role: f.accRole || "高级管理员",
          status: "启用"
        });
        Store.persist();
        toast("账号已添加");
        render();
        break;
      }
      case "add-buyer": {
        const f = readFields();
        const r = Store.addBuyer({ name: f.buyerName, phone: f.buyerPhone, city: f.buyerCity, level: f.buyerLevel });
        toast(r.msg);
        if (r.ok) go("buyer-list");
        break;
      }
      case "add-sub-account": {
        const f = readFields();
        const owner = state.selectedBuyer || (Store.db.buyers[0] && Store.db.buyers[0].name);
        const r = Store.addBuyerSubAccount(owner, { name: f.subAccName, phone: f.subAccPhone });
        toast(r.msg);
        render();
        break;
      }
      case "save-fair-slot": {
        const f = readFields();
        const fair = currentFair();
        const brand = f.slotBrand || state.selectedBrand || (fair && fair.brands && fair.brands[0]);
        const r = Store.saveFairSlot(fair && fair.id, brand, { date: f.slotDate, from: f.slotFrom, to: f.slotTo, cap: f.slotCap });
        toast(r.msg);
        if (brand) state.selectedBrand = brand;
        render();
        break;
      }
      case "import-fair-slots": {
        const f = readFields();
        const fair = currentFair();
        const brand = f.slotBrand || state.selectedBrand || (fair && fair.brands && fair.brands[0]);
        toast(Store.importFairSlots(fair && fair.id, brand, f.slotImport).msg);
        render();
        break;
      }
      case "fair-slot-brand": {
        const f = readFields();
        if (f.slotBrand) state.selectedBrand = f.slotBrand;
        render();
        break;
      }
      case "add-walkin-checkin": {
        const f = readFields();
        toast(Store.addCheckin({ brand: f.ckBrand, phone: f.ckPhone, store: f.ckStore, kind: "现场" }).msg);
        render();
        break;
      }
      case "scan-checkin": {
        const f = readFields();
        const phone = String(f.scanPhone || "").split(" ")[0];
        const fair = (Store.db.orderingFairs || []).find(x => x.name === f.scanFair);
        const hasAp = (Store.db.appointments || []).some(a =>
          (a.phone === phone || a.store === ((Store.db.buyers || []).find(b => b.phone === phone) || {}).name)
          && a.brand === f.scanBrand
          && (a.status === "已通过" || a.status === "已预约")
        );
        toast(Store.addCheckin({ fairId: fair && fair.id, brand: f.scanBrand, phone, kind: hasAp ? "预约" : "现场" }).msg);
        render();
        break;
      }
      case "add-order-line": {
        const f = readFields();
        const oid = (state.selectedOrder && state.selectedOrder.id) || (Store.db.orders[0] && Store.db.orders[0].id);
        const r = Store.addOrderLine(oid, f.addOrderSku);
        toast(r.msg);
        state.selectedOrder = Store.db.orders.find(o => o.id === oid);
        state.orderAction = "modify";
        render();
        break;
      }
      case "add-checker-sub": {
        const f = readFields();
        const owner = (Store.db.buyers.find(b => b.role === "checker") || {}).name || "平台签到员";
        toast(Store.addBuyerSubAccount(owner, { name: f.subAccName, phone: f.subAccPhone }).msg);
        render();
        break;
      }
      case "grant-brand": {
        const f = readFields();
        const r = Store.grantBrandToBuyer(f.grantBuyer || (Store.db.buyers[0] && Store.db.buyers[0].name), f.grantBrand);
        toast(r.msg || r);
        render();
        break;
      }
      case "add-substore":
      case "add-buyer-substore": {
        const f = readFields();
        const r = Store.addSubstore(f.subName, f.subCity);
        toast(r.msg);
        if (r.ok) {
          Store.db.ui.buyerMineTab = "sub";
          Store.persist();
        }
        render();
        break;
      }
      case "open-vouchers": {
        const o = state.selectedOrder || Store.db.orders.find(x => x.voucher) || Store.db.orders[0];
        state.selectedOrder = o;
        state.orderAction = "voucher";
        go("order-detail");
        toast(o && o.voucher ? `已打开凭证：${o.voucher.file || "已上传"}` : "订单暂无凭证，可在此上传");
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
        if (!isMp()) {
          Store.db.buyerSession.carryOnly = !!document.querySelector('[data-field="buyerCarry"]:checked');
          Store.db.buyerSession.newOnly = !!document.querySelector('[data-field="buyerNew"]:checked');
        }
        state.listPage = 1;
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
        toast(Store.saveSelectionLines(sel.id, sel.lines || [], selPlatformOpts()).msg);
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
        if (page === "buyer-appoint") {
          const f = readFields();
          const buyer = Store.db.buyers[0] || {};
          const date = String(f.mpDate || "").replace("T", " ");
          toast(Store.addAppointment({
            brand: f.mpBrand,
            store: buyer.name || "代约店铺",
            contact: buyer.contact || buyer.name || "联系人",
            phone: buyer.phone || "13800000000",
            date,
            season: f.mpSeason,
            people: f.mpPeople
          }));
          render();
          break;
        }
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
    const looks = (Store.db.looks || []).filter(l => !l.brand || l.brand === b.name).slice(0, 6);
    if (isMp()) {
      return `<div class="rr-mp-stack">
        <div class="rr-mp-cover hero">${esc(b.name)}</div>
        <div class="rr-mp-seg">
          <button type="button" class="rr-mp-seg-btn ${tab === "intro" ? "on" : ""}" data-act="buyer-brand-tab:intro">品牌介绍</button>
          <button type="button" class="rr-mp-seg-btn ${tab === "look" ? "on" : ""}" data-act="buyer-brand-tab:look">LOOKBOOK</button>
        </div>
        ${tab === "intro" ? `<article class="rr-mp-card">
            ${mpKv([
              ["品牌名", b.name],
              ["成立时间", b.year],
              ["官网", b.site],
              ["最小起订量", b.moq || Store.db.brandRules.minAmount || 50000],
              ["品类", b.cat],
              ["风格", b.style],
              ["人群", b.crowd]
            ])}
            <p class="rr-mp-lead" style="color:#1c1c1e">${esc(b.about || "由平台端/品牌端在品牌信息中维护。")}</p>
          </article>` : `<div class="rr-mp-grid2">${looks.map(l => `
            <article class="rr-mp-card rr-mp-card-tap rr-mp-goods" data-go="buyer-look-detail" data-look="${l.id}">
              <div class="rr-mp-cover">LOOK ${l.id}</div>
              <b>${esc(l.title)}</b>
              <small>${esc(l.season || "")}</small>
            </article>`).join("") || `<div class="rr-mp-empty">暂无 LOOKBOOK</div>`}</div>`}
      </div>`;
    }
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
    const g = Store.db.goods.find(x => x.sku === state.selectedGoods || x.skc === state.selectedGoods) || Store.db.goods[0];
    const sizes = g.sizes && g.sizes.length ? g.sizes : ["XS", "S", "M", "L"];
    const price = Store.parseMoney(g.wholesale);
    const totalQty = sizes.reduce((a, sz) => a + (state.qty[sz] || 0), 0);
    const totalAmt = sizes.reduce((a, sz) => a + (state.qty[sz] || 0) * price, 0);
    if (isMp()) {
      return `<div class="rr-mp-stack rr-mp-goods-detail">
        <div class="rr-mp-cover hero">商品大图</div>
        <div class="rr-mp-thumbs">${[1, 2, 3, 4].map(i => `<span>${i}</span>`).join("")}</div>
        <article class="rr-mp-card">
          <header class="rr-mp-card-hd">
            <div class="rr-mp-avatar">${esc((g.brand || "").slice(0, 2))}</div>
            <div class="rr-mp-card-ttl"><b>${esc(g.title)}</b><small>SKU ${esc(g.sku)}</small></div>
          </header>
          <div class="rr-mp-metrics">
            <span><em>¥${g.retail}</em>零售</span>
            <span><em>¥${g.wholesale}</em>订货</span>
            <span><em>${totalQty}</em>已选</span>
          </div>
          <div class="size_list">${sizes.map(sz => `
            <div class="size-row item">
              <div class="size_name">${sz}</div>
              <div class="qty">
                <button data-qty="${sz}" data-d="-1">−</button>
                <input value="${state.qty[sz] || 0}" readonly />
                <button data-qty="${sz}" data-d="1">+</button>
              </div>
              <div class="line_amt">¥${Store.money((state.qty[sz] || 0) * price)}</div>
            </div>`).join("")}</div>
          <p class="rr-mp-lead">最小起订 ¥${Store.money(Store.getDiscountRules().minAmount)} · 已选 ¥${Store.money(totalAmt)}</p>
          <button type="button" class="rr-mp-cta" data-act="add-to-order">加入选款单</button>
        </article>
        <article class="rr-mp-card">
          <h3 class="rr-mp-sec">材质信息</h3>
          <p class="rr-mp-lead" style="color:#1c1c1e">主面料 100% Wool · 里料 100% Cupro</p>
        </article>
      </div>`;
    }
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
            <div class="submit_area"><a href="javascript:;" class="oto_btn" data-act="add-to-order">加入选款单</a>
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
    /* Excel #20：站内消息 */
    const msgs = Store.db.buyerMessages || [];
    Store.markMessagesRead();
    if (isMp()) {
      const ui = mpUi();
      const q = (ui.q["buyer-message"] || "").trim().toLowerCase();
      const shown = msgs.filter(m => !q || `${m.title} ${m.body}`.toLowerCase().includes(q));
      return mpPage(
        mpSearch("搜索消息", ui.q["buyer-message"] || ""),
        shown.map(m => `
          <article class="rr-mp-card rr-mp-card-tap ${m.read ? "" : "unread"}" data-go="buyer-message-detail" data-mid="${esc(m.id)}">
            <header class="rr-mp-card-hd">
              <div class="rr-mp-card-ttl">
                <b>${esc(m.title)}${m.read ? "" : ' <span class="rr-mp-pill">新</span>'}</b>
                <small>${esc(m.time)}</small>
              </div>
              <span class="rr-mp-chevron">›</span>
            </header>
            <p class="rr-mp-lead">${esc(m.body)}</p>
          </article>`).join("") || `<div class="rr-mp-empty">暂无消息</div>`
      );
    }
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container message-container content-page">
        <div class="public_right-container" style="width:100%">
          ${subTitle("消息通知")}
          <div class="message_list">
            <div class="items">
              ${msgs.map(m => `
                <div class="item ${m.read ? "" : "unread"}">
                  <div class="message_info">
                    <h6>${m.title}${m.read ? "" : ' <span class="badge">新</span>'}</h6>
                    <p>${m.body}</p>
                    <span>${m.time}</span>
                  </div>
                </div>`).join("") || '<div class="note">暂无消息</div>'}
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }

  function pageBuyerProfile() {
    /* #23 补余额查看（按品牌）+ 子店铺管理 */
    const s = Store.db.buyerSession;
    const tab = Store.db.ui.buyerMineTab || "info";
    const buyer = Store.db.buyers.find(b => b.name === s.store || b.phone === s.phone) || {};
    const balances = buyer.balances || s.balances || {};
    const balRows = Object.keys(balances).length
      ? Object.keys(balances).map(brand => ({ brand, amount: balances[brand] }))
      : RR.brands.slice(0, 5).map((b, i) => ({ brand: b.name, amount: i === 0 ? 2480 : 0 }));
    const substores = s.substores || buyer.substores || [];
    if (isMp() && s.role === "checker") {
      const list = (Store.db.buyers.find(b => b.role === "checker") || buyer).subAccounts || [];
      return mpPage("", `<p class="rr-mp-lead">签到员账号：只能管理子账号，并用扫一扫识别买手签到。</p>
        <div class="rr-mp-stack">${list.map(x => `<article class="rr-mp-card">
          <header class="rr-mp-card-hd"><div class="rr-mp-card-ttl"><b>${esc(x.name)}</b><small>${esc(x.phone)}</small></div></header>
        </article>`).join("") || `<div class="rr-mp-empty">暂无子账号</div>`}</div>
        <article class="rr-mp-card rr-mp-form">
          <label class="rr-mp-lab">姓名</label>${field("subAccName", input("子账号姓名"))}
          <label class="rr-mp-lab">手机号</label>${field("subAccPhone", input("11 位手机号"))}
          <button type="button" class="rr-mp-cta" data-act="add-checker-sub">添加子账号</button>
        </article>`);
    }
    if (isMp()) {
      const chips = `<div class="rr-mp-chips">${[
        ["info", "个人信息"], ["balance", "余额"], ["sub", "子店铺"], ["addr", "地址"], ["inv", "发票"]
      ].map(([id, lab]) => `<button type="button" class="rr-mp-seg-btn ${tab === id ? "on" : ""}" data-act="buyer-mine-tab:${id}">${lab}</button>`).join("")}</div>`;
      let pane = "";
      if (tab === "info") {
        pane = `<article class="rr-mp-card rr-mp-form">
          <h3 class="rr-mp-sec">登录信息</h3>
          <label class="rr-mp-lab">手机号</label>${field("phone", input("", s.phone || ""))}
          <h3 class="rr-mp-sec">店铺信息</h3>
          <label class="rr-mp-lab">姓名</label>${field("contact", input("", s.contact || ""))}
          <label class="rr-mp-lab">店铺名称</label>${field("store", input("", s.store || ""))}
          <label class="rr-mp-lab">店铺地址</label>${field("city", input("", s.city || ""))}
          <label class="rr-mp-lab">店铺级别</label><div class="rr-mp-static">${s.level || "—"}</div>
          <button type="button" class="rr-mp-cta" data-act="save-buyer-profile">保存资料</button>
        </article>`;
      } else if (tab === "balance") {
        pane = `<p class="rr-mp-lead">各品牌可用余额，点卡片看该品牌商品。</p>
          <div class="rr-mp-stack">${balRows.map(r => `<article class="rr-mp-card rr-mp-card-tap" data-go="buyer-brand" data-brand="${esc(r.brand)}">
            <header class="rr-mp-card-hd">
              <div class="rr-mp-avatar">${esc((r.brand || "").slice(0, 2))}</div>
              <div class="rr-mp-card-ttl"><b>${esc(r.brand)}</b><small>可用余额</small></div>
              <em class="rr-mp-amt">¥${Store.money(r.amount)}</em>
              <span class="rr-mp-chevron">›</span>
            </header>
          </article>`).join("")}</div>`;
      } else if (tab === "sub") {
        pane = `<p class="rr-mp-lead">管理本账号下的子店铺。</p>
          <div class="rr-mp-stack">${(substores.length ? substores : []).map((x, i) => `<article class="rr-mp-card">
            <header class="rr-mp-card-hd">
              <div class="rr-mp-card-ttl"><b>${esc(x.name)}</b><small>${esc(x.city || "—")}</small></div>
            </header>
            <footer class="rr-mp-card-ft"><a href="javascript:;" data-act="edit-substore:${i}">编辑</a></footer>
          </article>`).join("") || `<div class="rr-mp-empty">暂无子店铺</div>`}</div>
          <article class="rr-mp-card rr-mp-form">
            <label class="rr-mp-lab">子店铺名</label>${field("subName", input("子店铺名称"))}
            <label class="rr-mp-lab">城市</label>${field("subCity", input("城市"))}
            <button type="button" class="rr-mp-cta" data-act="add-buyer-substore">新建子店铺</button>
          </article>`;
      } else if (tab === "addr") {
        pane = `<div class="rr-mp-stack">${(s.addresses || []).map((a, i) => `<article class="rr-mp-card rr-mp-form">
            <label class="rr-mp-lab">收货人</label>${field("addrName-" + i, input("", a.name))}
            <label class="rr-mp-lab">电话</label>${field("addrPhone-" + i, input("", a.phone))}
            <label class="rr-mp-lab">地址</label>${field("addrDetail-" + i, input("", a.addr))}
            <footer class="rr-mp-card-ft"><a class="on" href="javascript:;" data-act="save-buyer-addresses">保存</a></footer>
          </article>`).join("") || `<div class="rr-mp-empty">暂无地址</div>`}
          <button type="button" class="rr-mp-cta" data-act="add-address">新增地址</button>`;
      } else {
        pane = `<article class="rr-mp-card rr-mp-form">
          <div class="rr-mp-checks" style="margin-bottom:8px">
            <label><input type="radio" name="buyerInvKind" data-field="invKind" value="企业发票" checked /> 企业发票</label>
            <label><input type="radio" name="buyerInvKind" data-field="invKind" value="个人发票" /> 个人发票</label>
          </div>
          <label class="rr-mp-lab">公司名称/抬头</label>${field("invTitle", input("", (s.invoice && s.invoice.title) || ""))}
          <label class="rr-mp-lab">税号</label>${field("invTax", input("", (s.invoice && s.invoice.tax) || ""))}
          <label class="rr-mp-lab">电话</label>${field("invPhone", input("", (s.invoice && s.invoice.phone) || s.phone || ""))}
          <label class="rr-mp-lab">地址</label>${field("invAddr", input("", (s.invoice && s.invoice.addr) || ""))}
          <label class="rr-mp-lab">开户行</label>${field("invBank", input("", (s.invoice && s.invoice.bank) || ""))}
          <label class="rr-mp-lab">银行账号</label>${field("invAccount", input("", (s.invoice && s.invoice.account) || ""))}
          <button type="button" class="rr-mp-cta" data-act="save-buyer-invoice">保存发票信息</button>
        </article>`;
      }
      return mpPage(`${mpMineHub()}${chips}`, `${pane}
        <button type="button" class="rr-mp-logout" data-act="logout">登出</button>`);
    }
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container mine-container content-page">
        <div class="public_left-container">
          <ul class="mine_side">
            <li class="${tab === "info" ? "active" : ""}"><a href="javascript:;" data-act="buyer-mine-tab:info">个人信息</a></li>
            <li class="${tab === "balance" ? "active" : ""}"><a href="javascript:;" data-act="buyer-mine-tab:balance">余额查看</a></li>
            <li class="${tab === "sub" ? "active" : ""}"><a href="javascript:;" data-act="buyer-mine-tab:sub">子店铺管理</a></li>
            <li class="${tab === "addr" ? "active" : ""}"><a href="javascript:;" data-act="buyer-mine-tab:addr">收货地址管理</a></li>
            <li class="${tab === "inv" ? "active" : ""}"><a href="javascript:;" data-act="buyer-mine-tab:inv">发票地址管理</a></li>
          </ul>
          <a href="javascript:;" class="mine_logout" data-act="logout">登出</a>
        </div>
        <div class="public_right-container">
          <div class="mine_info-container">
            ${tab === "info" ? `
              <div class="account_info">
                <div class="sub_title">登录信息</div>
                <div class="form-grid">
                  <label>手机号</label><div>${field("phone", input("", s.phone || ""))}</div>
                </div>
              </div>
              <div class="shop_info">
                <div class="sub_title">店铺信息</div>
                <div class="form-grid">
                  <label>姓名</label><div>${field("contact", input("", s.contact || ""))}</div>
                  <label>店铺名称</label><div>${field("store", input("", s.store || ""))}</div>
                  <label>店铺地址</label><div class="span2">${field("city", input("", s.city || ""))}</div>
                  <label>店铺级别</label><div>${s.level || "—"}</div>
                </div>
                <div style="margin-top:16px">${btn("保存资料", "btn-primary", "save-buyer-profile")}</div>
              </div>` : ""}
            ${tab === "balance" ? (isMp() ? `
              <p class="rr-mp-lead">各品牌可用余额，点卡片看该品牌商品。</p>
              <div class="rr-mp-stack">${balRows.map(r => `<article class="rr-mp-card rr-mp-card-tap" data-go="buyer-brand" data-brand="${esc(r.brand)}">
                <header class="rr-mp-card-hd">
                  <div class="rr-mp-avatar">${esc((r.brand || "").slice(0, 2))}</div>
                  <div class="rr-mp-card-ttl"><b>${esc(r.brand)}</b><small>可用余额</small></div>
                  <em class="rr-mp-amt">¥${Store.money(r.amount)}</em>
                  <span class="rr-mp-chevron">›</span>
                </header>
              </article>`).join("")}</div>` : `
              <div class="sub_title">余额查看</div>
              <div class="note">显示本买手在各品牌下的可用余额（发货差额 / 多付款转入等）。</div>
              <table class="data-table">
                <thead><tr><th>品牌</th><th>可用余额（元）</th></tr></thead>
                <tbody>${balRows.map(r => `<tr>
                  <td>${r.brand}</td>
                  <td>¥${Store.money(r.amount)}</td>
                </tr>`).join("")}</tbody>
              </table>`) : ""}
            ${tab === "sub" ? (isMp() ? `
              <p class="rr-mp-lead">管理本账号下的子店铺。</p>
              <div class="rr-mp-stack">${(substores.length ? substores : []).map((x, i) => `<article class="rr-mp-card">
                <header class="rr-mp-card-hd">
                  <div class="rr-mp-card-ttl"><b>${esc(x.name)}</b><small>${esc(x.city || "—")}</small></div>
                </header>
                <footer class="rr-mp-card-ft"><a href="javascript:;" data-act="edit-substore:${i}">编辑</a></footer>
              </article>`).join("") || `<div class="rr-mp-empty">暂无子店铺</div>`}</div>
              <article class="rr-mp-card rr-mp-form">
                <div class="form-grid">
                  <label>子店铺名</label><div>${field("subName", input("子店铺名称"))}</div>
                  <label>城市</label><div>${field("subCity", input("城市"))}</div>
                </div>
                <button type="button" class="rr-mp-cta" data-act="add-buyer-substore">新建子店铺</button>
              </article>` : `
              <div class="sub_title">子店铺管理</div>
              <div class="note">管理本账号下的子店铺，用于订单分配。</div>
              <table class="data-table">
                <thead><tr><th>子店铺</th><th>城市</th><th>操作</th></tr></thead>
                <tbody>${(substores.length ? substores : []).map((x, i) => `<tr>
                  <td>${x.name}</td><td>${x.city || "—"}</td>
                  <td class="ops"><a href="javascript:;" data-act="edit-substore:${i}">编辑</a></td>
                </tr>`).join("") || '<tr><td colspan="3">暂无子店铺</td></tr>'}</tbody>
              </table>
              <div class="form-grid" style="margin-top:16px">
                <label>子店铺名</label><div>${field("subName", input("子店铺名称"))}</div>
                <label>城市</label><div>${field("subCity", input("城市"))}</div>
              </div>
              <div style="margin-top:12px">${btn("新建子店铺", "btn-primary", "add-buyer-substore")}</div>`) : ""}
            ${tab === "addr" ? (isMp() ? `
              <div class="rr-mp-stack">${(s.addresses || []).map((a, i) => `<article class="rr-mp-card rr-mp-form">
                <div class="form-grid">
                  <label>收货人</label><div>${field("addrName-" + i, input("", a.name))}</div>
                  <label>电话</label><div>${field("addrPhone-" + i, input("", a.phone))}</div>
                  <label>地址</label><div>${field("addrDetail-" + i, input("", a.addr))}</div>
                </div>
                <footer class="rr-mp-card-ft"><a class="on" href="javascript:;" data-act="save-buyer-addresses">保存</a></footer>
              </article>`).join("") || `<div class="rr-mp-empty">暂无地址</div>`}
              <button type="button" class="rr-mp-cta" data-act="add-address">新增地址</button>` : `
              <div class="sub_title">收货地址管理</div>
              <table class="data-table">
                <thead><tr><th>收货人</th><th>电话</th><th>地址</th><th>操作</th></tr></thead>
                <tbody>${(s.addresses || []).map((a, i) => `<tr>
                  <td>${field("addrName-" + i, input("", a.name))}</td>
                  <td>${field("addrPhone-" + i, input("", a.phone))}</td>
                  <td>${field("addrDetail-" + i, input("", a.addr))}</td>
                  <td><a href="javascript:;" data-act="save-buyer-addresses">保存</a></td>
                </tr>`).join("")}</tbody>
              </table>
              <div style="margin-top:12px">${btn("新增地址", "btn-outline", "add-address")}</div>`) : ""}
            ${tab === "inv" ? `
              <div class="sub_title">发票地址管理</div>
              <div class="invoice-type-row" style="margin-bottom:12px">
                <label><input type="radio" name="buyerInvKind" data-field="invKind" value="企业发票" checked /> 企业发票</label>
                <label><input type="radio" name="buyerInvKind" data-field="invKind" value="个人发票" /> 个人发票</label>
              </div>
              <div class="form-grid">
                <label>公司名称/抬头</label><div>${field("invTitle", input("", (s.invoice && s.invoice.title) || ""))}</div>
                <label>税号</label><div>${field("invTax", input("", (s.invoice && s.invoice.tax) || ""))}</div>
                <label>电话</label><div>${field("invPhone", input("", (s.invoice && s.invoice.phone) || s.phone || ""))}</div>
                <label>地址</label><div>${field("invAddr", input("", (s.invoice && s.invoice.addr) || ""))}</div>
                <label>开户行</label><div>${field("invBank", input("", (s.invoice && s.invoice.bank) || ""))}</div>
                <label>银行账号</label><div>${field("invAccount", input("", (s.invoice && s.invoice.account) || ""))}</div>
              </div>
              <div style="margin-top:12px">${btn("保存发票信息", "btn-primary", "save-buyer-invoice")}</div>` : ""}
          </div>
        </div>
      </div>
    </div>`;
  }

  function pageBuyerAdminForm(mode) {
    /* Excel #21：平台端买手资料可编辑 */
    const name = state.selectedBuyer || (Store.db.buyers[0] && Store.db.buyers[0].name);
    const b = Store.db.buyers.find(x => x.name === name) || Store.db.buyers[0] || {};
    const title = mode === "edit" ? "编辑店铺资料" : mode === "invoice" ? "修改发票信息" : mode === "address" ? "修改地址" : "查看店铺资料";
    if (mode === "invoice") {
      return `${subTitle(title)}
        <div class="note">买手：${b.name || "—"}</div>
        <div class="form-grid">
          <label>抬头</label><div>${field("title", input("", (b.invoice && b.invoice.title) || b.name || ""))}</div>
          <label>税号</label><div>${field("tax", input("", (b.invoice && b.invoice.tax) || ""))}</div>
        </div>
        <div style="margin-top:20px">${btn("保存", "btn-primary", "save-buyer-admin:invoice")}${btn("返回", "btn-outline", "go:buyer-list")}</div>`;
    }
    if (mode === "address") {
      const a = (b.addresses && b.addresses[0]) || { name: "", phone: b.phone || "", addr: b.city || "" };
      return `${subTitle(title)}
        <div class="note">买手：${b.name || "—"}</div>
        <div class="form-grid">
          <label>收货人</label><div>${field("name", input("", a.name))}</div>
          <label>电话</label><div>${field("phone", input("", a.phone))}</div>
          <label>地址</label><div class="span2">${field("addr", input("", a.addr))}</div>
        </div>
        <div style="margin-top:20px">${btn("保存", "btn-primary", "save-buyer-admin:address")}${btn("返回", "btn-outline", "go:buyer-list")}</div>`;
    }
    return `${subTitle(title)}
      <div class="note">${mode === "edit" ? "编辑买手提交的店铺信息" : "查看买手提交的店铺信息（可直接修改后保存）"}</div>
      <div class="form-grid">
        <label>店铺名</label><div>${field("name", input("", b.name || ""))}</div>
        <label>级别</label><div>${field("level", select(["A", "B", "C", "D", "—"], null, b.level || "—"))}</div>
        <label>城市</label><div>${field("city", input("", b.city || ""))}</div>
        <label>手机号</label><div>${field("phone", input("", b.phone || ""))}</div>
        <label>简介</label><div class="span2"><textarea data-field="about" rows="3">${b.about || "独立买手店，聚焦先锋女装。"}</textarea></div>
      </div>
      <div style="margin-top:20px">${btn("保存", "btn-primary", "save-buyer-admin:profile")}${btn("返回列表", "btn-outline", "go:buyer-list")}</div>`;
  }

  function pageBuyerReplenish() {
    /* 原站 /replenish：与首页同构 brand_list-container，侧栏分类 + 品牌格子；侧边栏文案为「我的补货单」 */
    const brands = Store.buyerBrands(Store.db.buyerSession.cat || "全部");
    syncBuyerCart();
    if (isMp()) return mpBrandGrid(brands);
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container brand_list-container">
        ${buyerCatSide()}
        <div class="public_right-container">
          <div class="mob-sub_title"><h5>补货品牌</h5></div>
          <div class="brand_list">
            <div class="items uk-grid-medium brand-grid-live">
              ${brands.map(b => {
                const noAuth = b.accept === false;
                const pending = b.pending;
                return `<div class="item">
                  <div class="item_inner">
                    ${noAuth ? `<div class="accept_state">${pending ? "申请中" : b.denied ? "申请被拒绝" : "需申请"}</div>` : ""}
                    <a href="javascript:;" data-go="${noAuth ? "buyer-intent" : "buyer-brand"}" data-brand="${b.name}">
                      <div class="brand-logo-rect">${b.name}</div>
                      <p>${b.name}</p>
                    </a>
                    ${noAuth && !pending ? `<div class="get_accept" data-act="apply-brand:${b.name}">${b.denied ? "重新申请" : "申请权限"}</div>` : ""}
                    ${pending ? '<div class="get_accept" style="color:#999;cursor:default">已提交申请</div>' : ""}
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

  /* 买手端「意向品牌」：申请品牌 + 已申请通过的品牌列表（思维导图 · 买手采购） */
  function pageBuyerIntent() {
    const rows = Store.buyerIntentions();
    const brands = Store.buyerBrands("全部");
    const needAudit = brands.filter(b => b.needAudit);
    const canApply = needAudit.filter(b => !b.accept && !b.pending);
    const granted = brands.filter(b => b.needAudit && b.accept);
    const free = brands.filter(b => !b.needAudit);
    const badge = st => st === "已通过" ? "green" : st === "已拒绝" ? "red" : "";
    if (isMp()) {
      const ui = mpUi();
      const q = (ui.q["buyer-intent"] || "").trim().toLowerCase();
      const tab = ui.intentTab || "全部";
      const shown = rows.filter(r => {
        if (tab !== "全部" && r.status !== tab) return false;
        if (!q) return true;
        return `${r.brand} ${r.status}`.toLowerCase().includes(q);
      });
      return mpPage(
        `${mpChipRow(["全部", "待审核", "已通过", "已拒绝"], tab, "mp-chip:intentTab:")}${mpSearch("搜索品牌", ui.q["buyer-intent"] || "")}`,
        `<article class="rr-mp-card rr-mp-form">
          <p class="rr-mp-lead">需审核品牌先申请，通过后才能看货下单。</p>
          <label class="rr-mp-lab">申请品牌</label>${field("intentBrand", select(canApply.length ? canApply.map(b => b.name) : ["暂无可申请品牌"], null, canApply[0] ? canApply[0].name : "暂无可申请品牌"))}
          <label class="rr-mp-lab">申请说明</label>${field("intentNote", input("门店定位 / 采购计划"))}
          <button type="button" class="rr-mp-cta" data-act="submit-intent">提交品牌申请</button>
        </article>
        ${shown.map(r => `<article class="rr-mp-card rr-mp-card-tap" data-go="${r.status === "已通过" ? "buyer-brand" : "buyer-intent-detail"}" data-brand="${esc(r.brand)}">
          <header class="rr-mp-card-hd">
            <div class="rr-mp-avatar">${esc((r.brand || "").slice(0, 2))}</div>
            <div class="rr-mp-card-ttl">
              <b>${r.brand}</b>
              <small>${r.date || r.at || "—"}</small>
            </div>
            <span class="rr-mp-pill">${r.status}</span>
            <span class="rr-mp-chevron">›</span>
          </header>
          <footer class="rr-mp-card-ft">${r.status === "已通过"
            ? `<a class="on" href="javascript:;" data-go="buyer-brand" data-brand="${r.brand}">查看商品</a>`
            : r.status === "已拒绝" ? `<a href="javascript:;" data-act="apply-brand:${r.brand}">重新申请</a>` : `<span>审核中</span>`}</footer>
        </article>`).join("") || `<div class="rr-mp-empty">暂无申请记录</div>`}`
      );
    }
    return `<div class="oto-main_container buyer-fe">
      <div class="oto_container order-container">
        <div class="public_right-container" style="width:100%">
          <div class="sub_title"><h4>意向品牌</h4></div>
          <div class="note">需审核的品牌，提交申请并由平台通过后才能查看商品并下单；免审核品牌可直接选款。</div>
          <div class="intent-apply">
            <div class="form-grid">
              <label>申请品牌</label><div>${field("intentBrand", select(canApply.length ? canApply.map(b => b.name) : ["暂无可申请品牌"], null, canApply[0] ? canApply[0].name : "暂无可申请品牌"))}</div>
              <label>申请说明</label><div>${field("intentNote", input("门店定位 / 采购计划"))}</div>
            </div>
            <div class="action-bar">${btn("提交品牌申请", "btn-primary", "submit-intent")}</div>
          </div>
          <div class="sub_title"><h4>我的品牌申请</h4></div>
          <table class="data-table">
            <thead><tr><th>品牌</th><th>申请时间</th><th>状态</th><th>操作</th></tr></thead>
            <tbody>${rows.map(r => `<tr>
              <td>${r.brand}</td><td>${r.date || r.at || "—"}</td>
              <td><span class="badge ${badge(r.status)}">${r.status}</span></td>
              <td class="ops">${r.status === "已通过"
                ? `<a href="javascript:;" data-go="buyer-brand" data-brand="${r.brand}">查看商品</a>`
                : r.status === "已拒绝" ? `<a href="javascript:;" data-act="apply-brand:${r.brand}">重新申请</a>` : "审核中"}</td>
            </tr>`).join("") || '<tr><td colspan="4">暂无申请记录</td></tr>'}</tbody>
          </table>
          <div class="sub_title"><h4>已申请通过的品牌（${granted.length}）</h4></div>
          <div class="intent-brand-chips">
            ${granted.map(b => `<a href="javascript:;" class="chip green" data-go="buyer-brand" data-brand="${b.name}">${b.name}</a>`).join("") || '<span class="note">暂无</span>'}
          </div>
          <div class="sub_title"><h4>免审核品牌（${free.length}）· 可直接选款</h4></div>
          <div class="intent-brand-chips">
            ${free.map(b => `<a href="javascript:;" class="chip" data-go="buyer-brand" data-brand="${b.name}">${b.name}</a>`).join("")}
          </div>
        </div>
      </div>
    </div>`;
  }

  function fnode(s) {
    const kind = s.kind || "node";
    const inner = `${s.text}${s.hint ? `<em>${s.hint}</em>` : ""}`;
    return `<div class="fnode ${kind} ${s.page ? "linkable" : ""}" ${s.page ? `data-go="${s.page}"` : ""}>${inner}</div>`;
  }

  function flowChart(steps) {
    return `<div class="flow-chart">
      <div class="flow-head"><span>平台端</span><span>买手端</span></div>
      ${steps.map((s, i) => `<div class="frow">
        <div class="fcol">${s.side === "platform" ? fnode(s) : (s.branch && s.branch.side === "platform" ? `<div class="fbranch">${s.branch.label}</div>` : "")}</div>
        <div class="fcol">${s.side === "buyer" ? fnode(s) : (s.branch && s.branch.side === "buyer" ? `<div class="fbranch">${s.branch.label}</div>` : "")}</div>
        ${i < steps.length - 1 ? `<div class="fdown ${s.side}">↓</div>` : ""}
      </div>`).join("")}
    </div>`;
  }

  /* 业务流程：注册流程图 / 订单流程图 → 原型页面映射 */
  function pageFlowMap() {
    const tab = state.flowTab || "register";
    const register = [
      { side: "buyer", kind: "start", text: "开始" },
      { side: "buyer", text: "买手填写资料注册", hint: "手机号 + 验证码", page: "register" },
      { side: "buyer", text: "提交申请", hint: "写入平台待审核列表", page: "register" },
      { side: "platform", kind: "decision", text: "审核买手", hint: "买手管理 · 买手审核", page: "buyer-list", branch: { side: "buyer", label: "审核拒绝 → 退回修改资料后重新提交" } },
      { side: "buyer", text: "登录买手端", hint: "审核通过才放行", page: "login", branch: { side: "platform", label: "审核通过 → 允许登录" } },
      { side: "buyer", text: "提交品牌申请", hint: "意向品牌 · 申请品牌", page: "buyer-intent" },
      { side: "platform", kind: "decision", text: "审核品牌申请", hint: "意向审核", page: "intent-list" },
      { side: "buyer", text: "查看已审核通过或不需要审核的品牌商品", hint: "品牌列表按权限展示", page: "buyer-home" },
      { side: "buyer", kind: "end", text: "结束" }
    ];
    const order = [
      { side: "buyer", kind: "start", text: "开始" },
      { side: "buyer", text: "登录", page: "login" },
      { side: "buyer", text: "查看订货会，选择已通过或免审核品牌商品加入选款单", page: "buyer-home" },
      { side: "buyer", text: "修改 / 下载 / 生成选款单", page: "buyer-selection" },
      { side: "buyer", text: "生成订单", page: "buyer-selection", branch: { side: "platform", label: "买手可取消订单 → 结束" } },
      { side: "platform", kind: "decision", text: "确认订单", hint: "订单管理", page: "order-list", branch: { side: "buyer", label: "驳回 → 选款单解锁，修改后重新下单" } },
      { side: "platform", text: "设置定金（可先设置折扣 / 首付比例）", page: "order-list" },
      { side: "buyer", text: "确认定金", page: "buyer-orders" },
      { side: "buyer", text: "上传支付凭证", page: "buyer-orders" },
      { side: "platform", kind: "decision", text: "核对支付凭证", hint: "不通过 → 退回重新上传", page: "order-list" },
      { side: "platform", text: "生成 OC（可下载）", page: "order-list" },
      { side: "buyer", text: "上传尾款支付凭证（全额或分批次）", page: "buyer-orders" },
      { side: "platform", kind: "decision", text: "核对尾款凭证", hint: "不通过 → 退回重新上传", page: "order-list" },
      { side: "platform", text: "统计付款差额（系统暂不考虑发货）", page: "order-list" },
      { side: "platform", text: "运营人员手动点击订单完成", page: "order-list" },
      { side: "platform", kind: "end", text: "订单完成 → 结束" }
    ];
    const tabs = [["register", "注册流程图"], ["order", "订单流程图"]];
    const statusRow = Store.ORDER_FLOW.map((s, i) => `<span class="chip">${i + 1}. ${s}</span>`).join("");
    return `${subTitle("业务流程（按客户流程图落地）")}
      <div class="note">点击流程节点可直接跳到对应原型页面；订单状态取值与流程节点一一对应。</div>
      <ul class="uk-subnav tabs flow-tabs">
        ${tabs.map(([id, lab]) => `<li class="${tab === id ? "uk-active on" : ""}"><a href="javascript:;" data-act="flow-tab:${id}">${lab}</a></li>`).join("")}
      </ul>
      ${flowChart(tab === "register" ? register : order)}
      ${tab === "order" ? `<div class="flow-status-legend">
        <h4>订单状态机（10 个节点 + 已驳回 / 已取消）</h4>
        <div class="chips">${statusRow}</div>
      </div>` : `<div class="flow-status-legend">
        <h4>门槛规则</h4>
        <div class="chips">
          <span class="chip">买手状态：待审核 → 不可登录</span>
          <span class="chip">已拒绝 → 提示原因并可改资料重提</span>
          <span class="chip">品牌需审核 → 未通过不可看商品/下单</span>
          <span class="chip">品牌免审核 → 直接选款下单</span>
        </div>
      </div>`}`;
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

  function pageGoodsPreview() {
    const sku = state.selectedGoods;
    const g = Store.db.goods.find(x => (x.skc || x.sku) === sku || x.sku === sku) || Store.db.goods[0];
    state.selectedGoods = g.sku;
    const prevPortal = state.portal;
    state.portal = "buyer";
    const body = pageBuyerDetail();
    state.portal = prevPortal;
    return `<div class="mall-preview-page">
      <div class="note">商城商品详情预览（买手端展示效果，只看不改）</div>
      ${body.replace('data-act="add-to-order"', 'data-act="toast:预览模式不可加入选款单"')
        .replace('data-act="go:buyer-brand"', 'data-act="go:goods-list"')
        .replace(">返回列表<", ">返回商品列表<")}
      <div class="action-bar">${btn("返回商品列表", "btn-outline", "go:goods-list")}</div>
    </div>`;
  }

  function pageBuyerSubs() {
    const name = state.selectedBuyer || (Store.db.buyers[0] && Store.db.buyers[0].name);
    const b = Store.db.buyers.find(x => x.name === name) || Store.db.buyers[0] || {};
    const list = b.subAccounts || [];
    return `${subTitle("子账号管理 · " + (b.name || ""))}
      <div class="note">子账号与主账号共享订单、选款单。登录方式同样为手机号 + 验证码。默认<strong>不允许</strong>买手自行添加，由平台在此开通。</div>
      <p>自行添加子账号：<strong>${b.allowSelfSub ? "允许" : "不允许"}</strong>
        <a href="javascript:;" data-act="toggle-self-sub:${b.name}">${b.allowSelfSub ? "改为不允许" : "改为允许"}</a></p>
      <table class="data-table">
        <thead><tr><th>姓名</th><th>手机号</th><th>添加日期</th></tr></thead>
        <tbody>${list.map(s => `<tr><td>${s.name}</td><td>${s.phone}</td><td>${s.at || "—"}</td></tr>`).join("") || "<tr><td colspan=3>暂无子账号</td></tr>"}</tbody>
      </table>
      <div class="form-grid" style="margin-top:16px">
        <label>姓名</label><div>${field("subAccName", input("店员姓名"))}</div>
        <label>手机号</label><div>${field("subAccPhone", input("11 位手机号"))}</div>
      </div>
      <div class="action-bar">${btn("新增子账号", "btn-primary", "add-sub-account")}${btn("返回买手列表", "btn-outline", "go:buyer-list")}</div>`;
  }

  function pageMpQr() {
    const s = Store.db.buyerSession;
    return `<div class="rr-mp-stack">
      <article class="rr-mp-card" style="text-align:center">
        <h3 class="rr-mp-sec">我的签到码</h3>
        <p class="rr-mp-lead">${esc(s.store)} · ${esc(s.phone)}</p>
        <div class="rr-mp-qr" aria-hidden="true">${esc((s.phone || "").slice(-4))}</div>
        <p class="rr-mp-lead">给现场签到员扫描，记录本账号在各品牌的到场。</p>
      </article>
    </div>`;
  }

  function pageMpScan() {
    const fairs = Store.db.orderingFairs || [];
    const fair = fairs[0];
    const buyers = (Store.db.buyers || []).filter(b => b.role !== "checker" && b.status === "已通过");
    return `<div class="rr-mp-stack">
      <article class="rr-mp-card rr-mp-form">
        <h3 class="rr-mp-sec">扫码签到</h3>
        <p class="rr-mp-lead">原型示意：识别买手手机号后写入该品牌签到记录。</p>
        <label class="rr-mp-lab">订货会</label>${field("scanFair", select(fairs.map(f => f.name), null, fair && fair.name))}
        <label class="rr-mp-lab">品牌</label>${field("scanBrand", select(RR.brands.map(b => b.name)))}
        <label class="rr-mp-lab">买手手机号</label>${field("scanPhone", select(buyers.map(b => b.phone + " " + b.name), null, buyers[0] && (buyers[0].phone + " " + buyers[0].name)))}
        <button type="button" class="rr-mp-cta" data-act="scan-checkin">确认签到</button>
      </article>
    </div>`;
  }

  const pages = {
    login: pageLogin,
    register: pageBuyerRegister,
    "register-status": pageRegisterStatus,
    "flow-map": pageFlowMap,
    coverage: pageCoverage,
    "account-center": pageAccount,
    "account-list": pageAccount,
    "role-list": pageAccount,
    "goods-carry": pageGoodsCarry,
    "goods-list": pageGoodsList,
    "goods-add": pageGoodsAdd,
    "goods-view": pageGoodsAdd,
    "goods-preview": pageGoodsPreview,
    "goods-batch": pageGoodsBatch,
    "goods-restock": pageGoodsRestock,
    "goods-look": pageGoodsLook,
    "goods-cat": pageGoodsCat,
    "brand-list": pageBrandList,
    "brand-add": pageBrandAdd,
    "appoint-list": pageOrderAppoint,
    "appoint-audit": pageAppointAudit,
    "buyer-appoint-apply": pageBuyerFairAppoint,
    "brand-discount": pageBrandDiscount,
    "brand-size": pageBrandSize,
    "brand-fair": pageBrandFair,
    "brand-fair-new": pageBrandFairNew,
    "fair-list": pageFairList,
    "fair-add": pageBrandFairNew,
    "fair-appoint": pageFairAppoint,
    "fair-slots": pageFairSlots,
    "fair-checkin": pageFairCheckin,
    "brand-pay": pageBrandPay,
    "brand-contract": pageBrandContract,
    "brand-deposit": pageBrandDeposit,
    "brand-audit-set": pageBrandAuditSet,
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
    "order-kingdee": pageOrderKingdee,
    "ship-list": pageShip,
    "ship-detail": pageShipDetail,
    "intent-list": pageIntent,
    "buyer-list": pageBuyerList,
    "buyer-add": pageBuyerAdd,
    "buyer-balance": pageBuyerBalance,
    "buyer-store": () => pageBuyerAdminForm("store"),
    "buyer-invoice": () => pageBuyerAdminForm("invoice"),
    "buyer-address": () => pageBuyerAdminForm("address"),
    "buyer-edit": () => pageBuyerAdminForm("edit"),
    "buyer-sub": () => {
      const list = Store.db.buyerSession.substores || [];
      return `${subTitle("查看/添加子店铺")}
      <table class="data-table"><thead><tr><th>子店铺</th><th>城市</th><th>操作</th></tr></thead>
      <tbody>${list.map((s, i) => `<tr><td>${s.name}</td><td>${s.city || "—"}</td><td><a href="javascript:;" data-act="edit-substore:${i}">编辑</a></td></tr>`).join("") || "<tr><td colspan=3>暂无子店铺</td></tr>"}</tbody></table>
      <div class="form-grid" style="margin-top:16px">
        <label>子店铺名</label><div>${field("subName", input())}</div>
        <label>城市</label><div>${field("subCity", input())}</div>
      </div>
      <div style="margin-top:16px">${btn("新建子店铺", "btn-primary", "add-substore")}</div>`;
    },
    "buyer-add-brand": () => `${subTitle("添加品牌")}
      <div class="note">为买手开通品牌权限；提交后写入买手品牌列表，并同步意向/买手端 brandAccess。</div>
      <div class="form-grid">
        <label>买手店铺</label><div>${field("grantBuyer", select(Store.db.buyers.map(b => b.name), null, Store.db.buyers[0] && Store.db.buyers[0].name))}</div>
        <label>选择品牌</label><div>${field("grantBrand", select(RR.brands.map(b => b.name)))}</div>
        <label>备注</label><div>${field("grantNote", input())}</div>
      </div>
      <div class="action-bar">${btn("确认开通", "btn-primary", "grant-brand")}</div>`,
    "buyer-appoint": () => simpleFormPage("添加预约", "代买手创建展会预约", `
      <label>品牌</label><div>${field("mpBrand", select(RR.brands.map(b => b.name)))}</div>
      <label>季节</label><div>${field("mpSeason", select(RR.seasons.slice(-8), null, "2026SS"))}</div>
      <label>时间</label><div>${field("mpDate", datetimeInput("2026-04-08T14:00"))}</div>
      <label>人数 *</label><div>${field("mpPeople", input("到场人数", "1"))}</div>`),
    "role-perm": pageRolePerm,
    "buyer-home": pageBuyerHome,
    "buyer-order-hub": pageBuyerOrderHub,
    "buyer-brand": pageBuyerBrand,
    "buyer-brand-about": pageBuyerBrandAbout,
    "buyer-detail": pageBuyerDetail,
    "buyer-selection": pageBuyerSelection,
    "buyer-selection-edit": pageBuyerSelectionEdit,
    "buyer-orders": pageBuyerOrders,
    "buyer-order-detail": pageBuyerOrderDetail,
    "buyer-profile": pageBuyerProfile,
    "buyer-message": pageBuyerMessage,
    "buyer-message-detail": pageBuyerMessageDetail,
    "buyer-intent": pageBuyerIntent,
    "buyer-intent-detail": pageBuyerIntentDetail,
    "buyer-appoint-detail": pageBuyerAppointDetail,
    "buyer-look-detail": pageBuyerLookDetail,
    "buyer-replenish": pageBuyerReplenish,
    "buyer-cart": pageBuyerCart,
    "buyer-replenish-cart": pageBuyerCart,
    "buyer-subs": pageBuyerSubs,
    "mp-qr": pageMpQr,
    "mp-scan": pageMpScan,
    "mp-home": pageMP
  };

  const MP_TAB_ICO = {
    brand: '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="7" height="7" rx="1.6"/><rect x="13" y="4" width="7" height="7" rx="1.6"/><rect x="4" y="13" width="7" height="7" rx="1.6"/><rect x="13" y="13" width="7" height="7" rx="1.6"/></svg>',
    restock: '<svg viewBox="0 0 24 24"><path d="M4 7h16v12H4z"/><path d="M8 7V5h8v2"/><path d="M4 11h16"/></svg>',
    sel: '<svg viewBox="0 0 24 24"><path d="M7 4h10l1 16H6L7 4z"/><path d="M9 9h6M9 13h6"/></svg>',
    appoint: '<svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16"/><path d="M9 14h2M13 14h2M9 17h6"/></svg>',
    mine: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.4"/><path d="M5.5 19.2a6.5 6.5 0 0 1 13 0"/></svg>'
  };

  function mpTabId() {
    const p = state.page || "";
    if (p === "buyer-order-hub" || p === "buyer-home" || p === "buyer-brand" || p === "buyer-brand-about" || p === "buyer-detail" || p === "buyer-replenish" || p === "buyer-replenish-cart" || p === "buyer-cart") return "buyer-order-hub";
    if (p.startsWith("buyer-selection")) return "buyer-selection";
    if (p === "buyer-appoint-apply" || p === "buyer-appoint-detail") return "buyer-appoint-apply";
    if (p.startsWith("buyer-order")) return "buyer-orders";
    if (p === "mp-scan" || p === "mp-qr") return "buyer-profile";
    return "buyer-profile";
  }

  function mpTitle() {
    const p = state.page || "";
    if (p === "buyer-order-hub") return "去订货";
    if (p === "buyer-home") return "品牌";
    if (p === "buyer-brand" || p === "buyer-brand-about") return state.selectedBrand || "品牌";
    if (p === "buyer-detail") return "商品详情";
    if (p === "buyer-replenish") return "补货";
    if (p === "buyer-cart") return "我的选款单";
    if (p === "buyer-replenish-cart") return "我的补货单";
    if (p.startsWith("buyer-selection")) return "选款单";
    if (p.startsWith("buyer-order")) return "我的订单";
    if (p === "buyer-appoint-apply") return "预约申请";
    if (p === "buyer-appoint-detail") return "预约详情";
    if (p === "buyer-intent") return "意向品牌";
    if (p === "buyer-intent-detail") return "申请详情";
    if (p === "buyer-message") return "消息";
    if (p === "buyer-message-detail") return "消息详情";
    if (p === "buyer-look-detail") return "LOOKBOOK";
    if (p === "mp-qr") return "我的签到码";
    if (p === "mp-scan") return "扫一扫";
    if (p === "buyer-profile") return Store.db.buyerSession.role === "checker" ? "子账号" : "我的";
    return "ROOMROOM";
  }

  function mpMineHub() {
    const unread = Store.unreadMessageCount();
    const items = [
      ["buyer-intent", "意向品牌", "申请可订品牌"],
      ["buyer-message", "消息通知", unread ? `${unread} 条未读` : "暂无未读"],
      ["mp-qr", "我的签到码", "给现场扫码签到"],
      ["mp-scan", "扫一扫", "识别买手签到"]
    ];
    return `<div class="rr-mp-hub">
      ${items.map(([id, t, s]) => `<a class="rr-mp-hub-item" href="javascript:;" data-go="${id}">
        <span><b>${t}</b><small>${s}</small></span><i>›</i>
      </a>`).join("")}
    </div>`;
  }

  function mpShell(inner) {
    const checker = Store.db.buyerSession.role === "checker";
    const tab = mpTabId();
    const tabs = checker
      ? [
          ["mp-scan", "扫一扫", "appoint"],
          ["buyer-profile", "子账号", "mine"]
        ]
      : [
          ["buyer-order-hub", "去订货", "brand"],
          ["buyer-selection", "选款", "sel"],
          ["buyer-appoint-apply", "预约申请", "appoint"],
          ["buyer-orders", "订单", "restock"],
          ["buyer-profile", "我的", "mine"]
        ];
    const rootPages = checker
      ? ["mp-scan", "buyer-profile"]
      : ["buyer-order-hub", "buyer-selection", "buyer-appoint-apply", "buyer-orders", "buyer-profile"];
    const canBack = !rootPages.includes(state.page);
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, "0");
    const mm = String(now.getMinutes()).padStart(2, "0");
    const showFab = ["buyer-home", "buyer-brand", "buyer-replenish", "buyer-detail"].includes(state.page);
    return `<div class="rr-mp-stage">
      <div class="rr-mp-phone">
        <div class="rr-mp-glass">
          <div class="rr-mp-status"><span>${hh}:${mm}</span><span class="rr-mp-notch"></span><span>5G ▮▮▮</span></div>
          <div class="rr-mp-head">
            ${canBack ? `<a class="rr-mp-back" href="javascript:;" data-act="back">‹</a>` : `<span class="rr-mp-back-ph"></span>`}
            <strong>${mpTitle()}</strong>
            <a class="rr-mp-bell" href="javascript:;" data-go="buyer-message" aria-label="消息">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 22a2.2 2.2 0 0 0 2.2-2.2h-4.4A2.2 2.2 0 0 0 12 22zm7-5.2V11a7 7 0 0 0-5-6.7V3.8a2 2 0 1 0-4 0v.5A7 7 0 0 0 5 11v5.8L3.4 18.4A1 1 0 0 0 4.1 20h15.8a1 1 0 0 0 .7-1.6L19 16.8z"/></svg>
              ${Store.unreadMessageCount() ? `<i>${Store.unreadMessageCount()}</i>` : ""}
            </a>
          </div>
          <div class="rr-mp-scroll">${inner}</div>
        </div>
        <nav class="rr-mp-tabbar" aria-label="小程序导航">
          ${tabs.map(([id, lab, ico]) => `<button type="button" class="rr-mp-tab ${tab === id ? "on" : ""}" data-go="${id}">
            <span class="rr-mp-ico">${MP_TAB_ICO[ico]}</span><span>${lab}</span>
          </button>`).join("")}
        </nav>
        ${showFab ? mpFabCart() : ""}
      </div>
      <p class="rr-mp-hint">小程序 · 苹果风玻璃态 · 内容与买手端一致</p>
    </div>`;
  }

  function render() {
    if (state.portal === "mp" && !["coverage", "flow-map", "login", "register", "register-status"].includes(state.page)) {
      /* #24 小程序原型：内容与买手端一致 */
      if (!String(state.page || "").startsWith("buyer-") && !String(state.page || "").startsWith("mp-")) {
        state.page = Store.db.buyerSession.role === "checker" ? "mp-scan" : "buyer-order-hub";
      }
      if (Store.db.buyerSession.role === "checker") {
        const allow = ["mp-scan", "buyer-profile", "coverage", "flow-map", "login"];
        if (!allow.includes(state.page)) state.page = "mp-scan";
      }
    }
    if (["login", "register", "register-status"].includes(state.page)) {
      const authBody = withPageBack(pages[state.page]());
      app.innerHTML = toastHtml() + authBody;
      bind();
      return;
    }
    if (state.page === "coverage" || state.page === "flow-map") {
      const body = withPageBack(state.page === "flow-map" ? pageFlowMap() : pageCoverage());
      app.innerHTML = toastHtml() + protoBar() + `<div class="shell full-main"><div class="main">${body}</div></div>` + footer();
      bind();
      return;
    }

    const isBuyer = state.portal === "buyer" || state.portal === "mp";
    let rawPage = (pages[state.page] || pageGoodsList)();
    let body = state.portal === "mp" ? rawPage : withPageBack(rawPage);
    /* 统一包一层现网右侧容器 class（已自带 brand_goodsList-container 的不重复包） */
    if (!isBuyer && !/brand_goodsList-container|ots_order-form|title_underline|buyer-layout/.test(body)) {
      body = `<div class="brand_goodsList-container">${body}</div>`;
    }
    const drawer = (isBuyer && state.cartOpen) ? cartDrawer() : "";
    /* 买手端/小程序页面自带 oto-main_container（对齐原站），勿再包 order-container 壳 */
    if (isBuyer) {
      const selfShell = /oto-main_container|buyer-fe|rr-mp-stack|rr-mp-work|rr-mp-page/.test(body);
      if (!selfShell) {
        body = `<div class="oto-main_container buyer-fe"><div class="oto_container order-container"><div class="public_right-container main">${body}</div></div></div>`;
      }
      if (state.portal === "mp") {
        /* #28 小程序：手机框 + 玻璃态底栏，不再套买手桌面顶栏 */
        app.innerHTML = toastHtml() + protoBar() + mpShell(body);
      } else {
        app.innerHTML = toastHtml() + protoBar() + topnav("buyer") +
          `<div class="ots_order-outer-container">${body}</div>` + footer() + drawer;
      }
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
        const buyerName = el.getAttribute("data-buyer");
        if (buyerName) state.selectedBuyer = buyerName;
        const mineTab = el.getAttribute("data-mine-tab");
        if (mineTab) {
          Store.db.ui.buyerMineTab = mineTab;
          Store.persist();
        }
        const ship = el.getAttribute("data-ship");
        const sku = el.getAttribute("data-sku");
        if (ship) state.selectedShip = Store.db.shipments.find(x => x.id === ship) || state.selectedShip;
        if (sku) state.selectedGoods = sku;
        const fairId = el.getAttribute("data-fair");
        if (fairId) state.selectedFair = fairId;
        const aid = el.getAttribute("data-aid");
        if (aid != null && aid !== "") {
          const a = Store.db.appointments[Number(aid)];
          if (a) state.selectedAppoint = { ...a, index: Number(aid) };
        }
        const mid = el.getAttribute("data-mid");
        if (mid) state.selectedMsg = (Store.db.buyerMessages || []).find(m => String(m.id) === String(mid)) || state.selectedMsg;
        const look = el.getAttribute("data-look");
        if (look) state.selectedLook = look;
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
        go(page, { replace: isRootNavEl(el) });
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
        /* 买手端：手机号 + 验证码，且须平台审核通过（《注册流程图》） */
        if (state.roleLogin === "buyer") {
          const f = readFields();
          const r = Store.buyerLogin(f.loginPhone, f.loginCode);
          toast(r.msg);
          if (!r.ok) {
            state.regQueryPhone = String(f.loginPhone || "").trim();
            if (r.code === "unregistered") go("register");
            else if (["pending", "rejected"].includes(r.code)) go("register-status");
            return;
          }
        }
        if (state.roleLogin === "brand") {
          const f = readFields();
          const r = Store.brandLogin(f.loginPhone, f.loginCode);
          toast(r.msg);
          if (!r.ok) return;
          state.selectedBrand = r.brand;
        }
        state.portal = state.roleLogin;
        localStorage.setItem("rr_portal", state.portal);
        state.page = state.portal === "buyer" ? "buyer-home" : state.portal === "brand" ? "brand-list" : "brand-list";
        render();
      });
    }
    app.querySelectorAll("[data-qty]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const s = el.getAttribute("data-qty");
        const d = Number(el.getAttribute("data-d"));
        state.qty[s] = Math.max(0, (state.qty[s] || 0) + d);
        render();
      });
    });
    app.querySelectorAll("[data-line-qty]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        const sku = el.getAttribute("data-line-qty");
        const size = el.getAttribute("data-size");
        const d = Number(el.getAttribute("data-d"));
        const selObj = state.selectedSel || Store.db.selections[0];
        const r = Store.bumpSelectionQty(selObj.id, sku, size, d, selPlatformOpts());
        if (!r.ok) toast(r.msg);
        state.selectedSel = Store.db.selections.find(x => x.id === selObj.id) || selObj;
        render();
      });
    });
    app.querySelectorAll("[data-draft-qty]").forEach(el => {
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        Store.bumpDraftQty(el.getAttribute("data-draft-qty"), el.getAttribute("data-size"), Number(el.getAttribute("data-d")));
        render();
      });
    });
    app.querySelectorAll("[data-tabsoft]").forEach(btnEl => {
      btnEl.addEventListener("click", (e) => {
        e.stopPropagation();
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
        if (state.viewMode === "image") state.listPage = 1;
        render();
      });
    });
    /* New / Carry 勾选即时筛选（对齐现网 change_new / change_carry） */
    app.querySelectorAll('[data-field="buyerNew"], [data-field="buyerCarry"]').forEach(el => {
      el.addEventListener("change", () => {
        Store.db.buyerSession.newOnly = !!document.querySelector('[data-field="buyerNew"]:checked');
        Store.db.buyerSession.carryOnly = !!document.querySelector('[data-field="buyerCarry"]:checked');
        state.listPage = 1;
        Store.persist();
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
        if (isMp()) {
          go(mpTabId() === "buyer-replenish" ? "buyer-replenish-cart" : "buyer-cart");
          return;
        }
        state.cartOpen = !state.cartOpen;
        render();
      });
    });
    app.querySelectorAll(".rr-mp-search input").forEach(inp => {
      if (inp.dataset.wiredEnter) return;
      inp.dataset.wiredEnter = "1";
      inp.addEventListener("keydown", (e) => {
        if (e.key !== "Enter") return;
        e.preventDefault();
        const btn = inp.closest(".rr-mp-search") && inp.closest(".rr-mp-search").querySelector("[data-act]");
        if (btn) handleAct(btn.getAttribute("data-act"), btn);
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
      if ((a.textContent || "").includes("账号权限") || (a.textContent || "").includes("账户中心") || (a.textContent || "").includes("品牌资料")) {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          if (state.portal === "buyer") go("buyer-profile");
          else if (state.portal === "brand") go("brand-edit");
          else go("account-list");
        });
      }
    });

    /* #7 一级分类切换时刷新二级选项 */
    app.querySelectorAll('[data-act-change="goods-cat-change"]').forEach(sel => {
      if (sel.dataset.wiredCat) return;
      sel.dataset.wiredCat = "1";
      sel.addEventListener("change", () => {
        const f = readFields();
        const cat = Store.db.categories.find(c => c.name === f.cat);
        const kids = (cat && cat.children) || [];
        f.subcat = kids[0] || "";
        state.goodsDraft = f;
        const specs = [...app.querySelectorAll("[data-spec]")].map(row => {
          const i = row.getAttribute("data-spec");
          return {
            color: f["specColor-" + i] || "",
            skc: f["specSkc-" + i] || "",
            sizes: [...row.querySelectorAll(`[data-check="specSizes-${i}"]:checked`)].map(x => x.value)
          };
        });
        if (specs.length) state.goodsSpecs = specs;
        render();
      });
    });

    wireUniversalClicks();
  }

  // boot
  if (location.hash === "#app") {
    state.page = state.portal === "buyer" ? "buyer-home" : state.portal === "brand" ? "brand-discount" : "brand-list";
  } else {
    state.page = "login";
  }
  render();
})();
