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
    cart: JSON.parse(localStorage.getItem("rr_cart") || '["121BZX122","121DRX037G","JL26SS001"]'),
    hearts: JSON.parse(localStorage.getItem("rr_hearts") || '["121BZX122","121DRX037G","JL26SS001"]'),
    qty: { XS: 0, S: 2, M: 1, L: 0 },
    viewMode: "image", // image | code
    cartOpen: false,
    orderAction: "", // modify | invoice | voucher | whitelist | substore | return | deposit
    reconTab: "rate",
    toast: "",
    hasFirstOrder: true,
    replenishBlocked: false
  };

  function toast(msg) {
    state.toast = msg;
    render();
    setTimeout(() => { state.toast = ""; render(); }, 2200);
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
          { id: "brand-edit", label: "品牌信息编辑" }
        ],
        goods: [
          { id: "goods-restock", label: "补货/隐藏商品" },
          { id: "goods-look", label: "LOOK列表" },
          { id: "goods-add", label: "添加新商品" },
          { id: "goods-batch", label: "批量添加新商品" },
          { id: "goods-list", label: "商品信息管理" },
          { id: "goods-cat", label: "商品分类" }
        ],
        order: [
          { id: "order-selection", label: "选款单管理" },
          { id: "order-list", label: "订单管理" },
          { id: "order-replenish", label: "补货单管理" },
          { id: "order-contract", label: "合同管理" },
          { id: "order-oc", label: "OC管理" },
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
          { id: "buyer-edit", label: "编辑店铺资料" },
          { id: "buyer-sub", label: "查看/添加子店铺" },
          { id: "buyer-add-brand", label: "添加品牌（待定）" },
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
        { id: "home", label: "首页" },
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
    state.page = page;
    state.cartOpen = false;
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

  function btn(label, cls = "btn-primary", onclick = "") {
    return `<button class="btn ${cls}" onclick="${onclick}">${label}</button>`;
  }

  function filterPanel(fields, extras = "") {
    const rows = fields.map(([lab, ctrl]) =>
      `<div class="filter-label">${lab}</div><div>${ctrl}</div>`
    ).join("");
    return `<div class="filter-panel">
      <div class="filter-grid">${rows}</div>
      <div class="filter-actions">
        ${btn("筛选")}
        <a class="btn-ghost" href="javascript:;">清空条件</a>
        ${extras}
      </div>
    </div>`;
  }

  function select(opts, ph = "全部") {
    return `<select><option>${ph}</option>${opts.map(o => `<option>${o}</option>`).join("")}</select>`;
  }

  function input(ph = "") {
    return `<input placeholder="${ph}" />`;
  }

  function footer() {
    return `<footer class="site-footer">
      <div>
        <div class="flogo">ROOMROOM</div>
        <div>
          <a href="javascript:;">资料私隐及保安政策</a>
          <a href="javascript:;">版权声明</a>
        </div>
        <div style="margin-top:8px">沪ICP备17050349号-2 · © Ontimeshow. All Rights Reserved</div>
      </div>
      <div>客户确认原型 · 严格复刻现网 UI</div>
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
      const top = routes.buyer.top;
      const map = {
        home: "buyer-home",
        replenish: "buyer-replenish",
        selection: "buyer-selection",
        orders: "buyer-orders",
        profile: "buyer-profile"
      };
      return `<nav class="topnav buyer-top"><div class="topnav-inner">
        <a class="logo" href="javascript:;" data-go="buyer-home">ROOMROOM</a>
        <ul class="nav-links">${top.map(t =>
          `<li><a href="javascript:;" class="${state.page.startsWith("buyer-" + (t.id === "home" ? "home" : t.id)) || (t.id === "home" && state.page === "buyer-home") || (t.id === "home" && state.page.startsWith("buyer-brand")) || (t.id === "home" && state.page === "buyer-detail") ? "active" : ""}" data-go="${map[t.id]}">${t.label}</a></li>`
        ).join("")}</ul>
        <div class="nav-right">
          <span class="role-chip">买手 · Liora Amour</span>
          <span class="avatar">店</span>
          <a href="javascript:;" data-go="buyer-profile">账户中心</a>
        </div>
      </div></nav>`;
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
    return `<nav class="topnav"><div class="topnav-inner">
      <a class="logo" href="javascript:;" data-go="${cfg.defaultPage}">ROOMROOM</a>
      <ul class="nav-links">${cfg.top.map(t =>
        `<li><a href="javascript:;" class="${group === t.id ? "active" : ""}" data-go="${firstPage[t.id]}">${t.label}</a></li>`
      ).join("")}</ul>
      <div class="nav-right">
        <span class="role-chip">${portal === "brand" ? "品牌端 · HAIZHEN WANG" : "平台端 · 高级管理员"}</span>
        <span class="avatar">管</span>
        <a href="javascript:;">账户中心</a>
      </div>
    </div></nav>`;
  }

  function sidebar() {
    const group = topGroup(state.page);
    let items = (routes.platform.side[group] || []);
    if (state.portal === "brand") {
      if (group === "buyer" || group === "role" || group === "account") items = [];
      if (group === "brand") {
        // 品牌端无「全品牌列表」，直接进本品牌配置
        items = items.filter(i => i.id !== "brand-list");
      }
      if (group === "order") {
        items = items.filter(i => !["order-recon", "order-appoint"].includes(i.id));
      }
      if (group === "goods") {
        items = items.filter(i => !["goods-cat", "goods-look"].includes(i.id));
      }
    }
    if (!items.length) return "";
    return `<aside class="sidebar"><ul>
      ${items.map(i => `<li><a href="javascript:;" class="${state.page === i.id ? "active" : ""}" data-go="${i.id}">${i.label}</a></li>`).join("")}
    </ul></aside>`;
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
          <div class="row"><input placeholder="6位验证码" value="888888" /><button class="code-btn">获取验证码</button></div>
        </div>
        <button class="btn btn-primary btn-block" id="do-login">登录</button>
        <p style="margin-top:16px;font-size:12px;color:#999;text-align:center">根据账号身份权限自动进入对应端口（需求：统一登录页）</p>
      </div>
    </div>`;
  }

  function pageGoodsList() {
    const rows = RR.goods.map(g => `
      <div class="goods-card">
        <div class="goods-meta">
          <span>SKU:<strong>${g.sku}</strong></span>
          <span>品牌<strong>${g.brand}</strong></span>
          <span>季节<strong>${g.season}</strong></span>
          ${g.carry ? '<span class="badge">Carry Over</span>' : ""}
        </div>
        <div class="goods-row">
          <div class="goods-info">
            <div class="thumb ph">IMG</div>
            <div>${g.title}</div>
          </div>
          <div class="sizes">${g.sizes.join("<br/>")}</div>
          <div>${g.retail}</div>
          <div>${g.wholesale}</div>
          <div class="${g.status === "已删款" ? "status-del" : "status-ok"}">${g.status}</div>
          <div class="link-row">
            <button class="btn btn-outline btn-sm" data-go="goods-add">编辑</button>
            <button class="btn btn-outline btn-sm" data-go="goods-view">查看</button>
            <button class="btn btn-outline btn-sm">${g.status === "已删款" ? "取消删款" : "删款"}</button>
          </div>
        </div>
      </div>`).join("");

    return `<h1 class="page-title">商品信息管理</h1>
      <div class="note">对应现网「商品信息管理」：筛选 / Carry Over / 编辑·查看·删款（删款可恢复）</div>
      ${filterPanel([
        ["Carry Over", select(["是", "否"])],
        ["LineSheet", input()],
        ["SKU", input()],
        ["品类", select(["女装", "男装", "男女装", "配饰", "生活方式"])],
        ["二级品类", select(["外套", "连衣裙", "裤装"])],
        ["选择品牌", select(RR.brands.map(b => b.name), "选择品牌")],
        ["款式名称", input()],
        ["选择季节", select(RR.seasons, "选择季节")]
      ], `<a class="btn btn-outline" href="javascript:;" style="margin-left:auto">设置Carry Over</a>`)}
      <div class="table-head">
        <div>商品信息</div><div>可选尺寸</div><div>零售价(RMB)</div><div>买手价(RMB)</div><div>状态</div><div>操作</div>
      </div>
      ${rows}`;
  }

  function pageGoodsAdd() {
    return `<h1 class="page-title">添加新商品</h1>
      <div class="note">手动添加：基础信息 + 多类型图片/视频（固定排序位）+ 富文本详情</div>
      <div class="form-section">
        <h3>基础属性（标注 * 为必填）</h3>
        <div class="form-grid">
          <label class="req">所属品牌</label><div>${select(RR.brands.map(b => b.name), "选择品牌")}</div>
          <label class="req">款式名称</label><div>${input("款式名称")}</div>
          <label class="req">款式编码SKU</label><div>${input("SKU")}</div>
          <label>波段</label><div>${input()}</div>
          <label class="req">季节</label><div>${select(RR.seasons)}</div>
          <label>预计发货时间</label><div>${input("YYYY-MM-DD")}</div>
          <label>Carry Over</label><div>${select(["否", "是"])}</div>
          <label>可补货</label><div>${select(["是", "否"])}</div>
          <label class="req">尺寸列表</label><div>${input("XS,S,M,L")}</div>
          <label>面料/材质</label><div>${input()}</div>
          <label class="req">品类</label><div>${select(["女装", "男装", "男女装", "配饰", "生活方式"])}</div>
          <label>二级品类</label><div>${select(["外套", "连衣裙", "裤装", "裙装"])}</div>
          <label class="req">建议零售价</label><div>${input("CNY")}</div>
          <label class="req">订货价</label><div>${input("CNY")}</div>
          <label>颜色</label><div>${input()}</div>
          <label>最小起订量</label><div>${input("件")}</div>
        </div>
      </div>
      <div class="form-section">
        <h3>商品图片（固定排序定位）</h3>
        <div class="form-grid">
          <label>缩略图</label><div class="upload-box"><div class="plus">+</div>缩略图 · &lt;5MB</div>
          <label>白底图</label><div class="upload-box"><div class="plus">+</div>白底图 · &lt;5MB</div>
          <label>商品图片</label><div class="span2"><div class="upload-box"><div class="plus">+</div>多图上传 · 按固定位排序</div></div>
          <label>视频</label><div class="upload-box"><div class="plus">+</div>mp4 · &lt;8MB</div>
          <label>视频封面</label><div class="upload-box"><div class="plus">+</div>封面图</div>
        </div>
      </div>
      <div class="form-section">
        <h3>商品详情（富文本）</h3>
        <textarea placeholder="商品材质信息与详情描述…"></textarea>
      </div>
      <div style="display:flex;gap:12px">
        ${btn("保存商品")}
        ${btn("返回列表", "btn-outline", "void(0)")}
      </div>`;
  }

  function pageGoodsBatch() {
    return `<h1 class="page-title">批量添加新商品</h1>
      <div class="note">选择品牌与分类 → 下载对应 Excel 模板 → 上传批量导入（不同分类不同模板）</div>
      <div class="filter-panel">
        <div class="filter-grid">
          <div class="filter-label">选择品牌</div><div>${select(RR.brands.map(b => b.name), "选择品牌")}</div>
          <div class="filter-label">选择分类</div><div>${select(["女装", "男装", "男女装", "配饰", "生活方式"])}</div>
        </div>
        <div class="filter-actions">
          ${btn("下载模板", "btn-outline")}
          ${btn("上传 Excel")}
        </div>
      </div>
      <div class="upload-box" style="height:180px"><div class="plus">+</div>拖拽或点击上传 Excel 文件</div>`;
  }

  function pageGoodsRestock() {
    return `<h1 class="page-title">补货 / 隐藏商品</h1>
      <div class="note">按季节设置：是否可补货、是否在首单中隐藏（商品仍可见但不可下单逻辑联动订货会开关）</div>
      ${filterPanel([
        ["选择品牌", select(RR.brands.map(b => b.name))],
        ["选择季节", select(RR.seasons)],
        ["SKU", input()],
        ["状态", select(["可补货", "不可补货", "首单隐藏"])]
      ])}
      <table class="data-table">
        <thead><tr><th>SKU</th><th>商品</th><th>季节</th><th>可补货</th><th>首单隐藏</th><th>操作</th></tr></thead>
        <tbody>
          ${RR.goods.slice(0, 5).map(g => `<tr>
            <td>${g.sku}</td><td>${g.title}</td><td>${g.season}</td>
            <td>${select(["是", "否"])}</td><td>${select(["否", "是"])}</td>
            <td>${btn("保存", "btn-outline btn-sm")}</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  }

  function pageGoodsLook() {
    return `<h1 class="page-title">LOOK 列表</h1>
      <div class="note">需求备注：待定。原型保留入口，与现网「LOOK列表」对齐，供客户确认是否纳入本期。</div>
      <div class="product-grid">
        ${[1, 2, 3, 4].map(i => `<div class="product-card"><div class="cover">LOOK ${i}</div><div class="name">Lookbook #${i}</div><div class="meta">2026SS</div></div>`).join("")}
      </div>`;
  }

  function pageGoodsCat() {
    return `<h1 class="page-title">商品分类</h1>
      <div class="note">平台端：设置商品分类，用于商品资料与买手端筛选</div>
      <table class="data-table">
        <thead><tr><th>一级分类</th><th>二级分类</th><th>商品数</th><th>操作</th></tr></thead>
        <tbody>
          <tr><td>女装</td><td>外套 / 连衣裙 / 裤装 / 裙装 …</td><td>1,284</td><td><a href="javascript:;">编辑</a></td></tr>
          <tr><td>男装</td><td>外套 / 裤装 / 上衣 …</td><td>642</td><td><a href="javascript:;">编辑</a></td></tr>
          <tr><td>男女装</td><td>外套 / 配饰交叉 …</td><td>318</td><td><a href="javascript:;">编辑</a></td></tr>
          <tr><td>配饰</td><td>包袋 / 鞋履 / 首饰 …</td><td>520</td><td><a href="javascript:;">编辑</a></td></tr>
          <tr><td>生活方式</td><td>香氛 / 家居 …</td><td>210</td><td><a href="javascript:;">编辑</a></td></tr>
        </tbody>
      </table>
      <div style="margin-top:16px">${btn("新增分类")}</div>`;
  }

  function pageBrandList() {
    return `<h1 class="page-title">品牌管理</h1>
      <div class="note">展示全部品牌，并对品牌进行多维度规则配置（现网「我的店铺」）</div>
      <table class="data-table">
        <thead><tr>
          <th>品牌名称</th><th>阶梯优惠规则</th><th>尺寸别名</th><th>订货会设置</th><th>收款设置</th><th>合同设置</th><th>编辑</th>
        </tr></thead>
        <tbody>
          ${RR.brands.map(b => `<tr>
            <td><strong>${b.name}</strong></td>
            <td><a href="javascript:;" data-go="brand-discount">配置</a></td>
            <td><a href="javascript:;" data-go="brand-size">配置</a></td>
            <td><a href="javascript:;" data-go="brand-fair">配置</a></td>
            <td><a href="javascript:;" data-go="brand-pay">配置</a></td>
            <td><a href="javascript:;" data-go="brand-contract">配置</a></td>
            <td><a href="javascript:;" data-go="brand-edit">编辑</a></td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  }

  function pageBrandDiscount() {
    return `<h1 class="page-title">设置优惠规则</h1>
      <div class="note">对齐现网：最小起订金额（吊牌价）+ 服饰/配饰/生活方式统一折扣（需先设统一折扣，阶梯折扣才生效）+ 金额阶梯；首单/补货分别配置；订货会场次可单独覆盖。</div>
      <div class="tabs">
        <button class="on" data-tabsoft>首单规则</button>
        <button data-tabsoft>补货单规则</button>
        <button data-tabsoft>订货会单独规则</button>
      </div>
      <div class="form-section">
        <h3>最小起订金额（吊牌价）</h3>
        <div class="form-grid">
          <label>最小起订金额</label><div>${input("例如 30000")}</div>
        </div>
      </div>
      <div class="form-section">
        <h3>分类统一折扣</h3>
        <table class="data-table">
          <thead><tr><th>分类</th><th>统一折扣</th><th>说明</th></tr></thead>
          <tbody>
            <tr><td>服饰统一折扣</td><td>${input("0.45")}</td><td>需设置后阶梯折扣才生效</td></tr>
            <tr><td>配饰统一折扣</td><td>${input("0.50")}</td><td>需设置后阶梯折扣才生效</td></tr>
            <tr><td>生活方式统一折扣</td><td>${input("0.55")}</td><td>需设置后阶梯折扣才生效</td></tr>
          </tbody>
        </table>
      </div>
      <div class="form-section">
        <h3>金额阶梯折扣</h3>
        <table class="data-table">
          <thead><tr><th>满额（吊牌价）</th><th>折扣</th><th></th></tr></thead>
          <tbody>
            <tr><td>${input("50000")}</td><td>${input("0.43")}</td><td><a href="javascript:;">删除</a></td></tr>
            <tr><td>${input("100000")}</td><td>${input("0.40")}</td><td><a href="javascript:;">删除</a></td></tr>
          </tbody>
        </table>
        <div class="action-bar">${btn("添加阶梯", "btn-outline")}${btn("保存规则")}</div>
      </div>`;
  }

  function pageBrandSize() {
    return `<h1 class="page-title">设置尺寸别名</h1>
      <div class="note">平台标准尺寸下，品牌可配置别名（例：标准 XS → 别名 2）</div>
      <table class="data-table">
        <thead><tr><th>标准尺寸</th><th>品牌别名</th></tr></thead>
        <tbody>
          ${["XS", "S", "M", "L", "XL"].map((s, i) =>
            `<tr><td>${s}</td><td>${input(String(i + 2))}</td></tr>`
          ).join("")}
        </tbody>
      </table>
      <div style="margin-top:16px">${btn("保存")}</div>`;
  }

  function pageBrandFair() {
    return `<h1 class="page-title">订货会设置</h1>
      <div class="note">每场次含首单/补货两种类型；按季度开关。关闭后商品可见但不支持下单</div>
      <table class="data-table">
        <thead><tr><th>场次/季节</th><th>首单</th><th>补货</th><th>状态</th></tr></thead>
        <tbody>
          ${RR.seasons.map(s => `<tr>
            <td>${s}</td>
            <td>${select(["开启", "关闭"])}</td>
            <td>${select(["开启", "关闭"])}</td>
            <td><span class="badge green">进行中</span></td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  }

  function pageBrandPay() {
    return `<h1 class="page-title">收款设置</h1>
      <div class="form-grid">
        <label>收款账户名</label><div>${input("公司名称")}</div>
        <label>开户行</label><div>${input()}</div>
        <label>银行账号</label><div class="span2">${input()}</div>
        <label>合同公章</label><div class="upload-box"><div class="plus">+</div>上传公章图片</div>
        <label>OC 公章</label><div class="upload-box"><div class="plus">+</div>上传 OC 盖章图</div>
      </div>
      <div style="margin-top:20px">${btn("保存")}</div>`;
  }

  function pageBrandContract() {
    return `<h1 class="page-title">合同设置</h1>
      <div class="note">按季度配置：合同类型、发货周期、联系人/手机/邮箱、签订与授权起止时间</div>
      <div class="form-grid">
        <label>季度</label><div>${select(RR.seasons)}</div>
        <label>合同类型</label><div>${select(["经销", "代销", "买断"])}</div>
        <label>发货周期</label><div>${input("如 45-60 天")}</div>
        <label>合同联系人</label><div>${input()}</div>
        <label>手机</label><div>${input()}</div>
        <label>邮箱</label><div>${input()}</div>
        <label>签订时间</label><div>${input("YYYY-MM-DD")}</div>
        <label>授权起始</label><div>${input("YYYY-MM-DD")}</div>
        <label>授权结束</label><div>${input("YYYY-MM-DD")}</div>
      </div>
      <div style="margin-top:20px">${btn("保存")}</div>`;
  }

  function pageBrandEdit() {
    const b = RR.brands[0];
    return `<h1 class="page-title">品牌信息编辑</h1>
      <div class="form-grid">
        <label>品牌名</label><div>${input(b.name)}</div>
        <label>成立年份</label><div>${input(String(b.year))}</div>
        <label>品类</label><div>${input(b.cat)}</div>
        <label>风格</label><div>${input(b.style)}</div>
        <label>适用人群</label><div class="span2">${input(b.crowd)}</div>
        <label>设计师介绍</label><div class="span2"><textarea></textarea></div>
        <label>品牌介绍</label><div class="span2"><textarea></textarea></div>
        <label>Logo</label><div class="upload-box"><div class="plus">+</div>Logo</div>
        <label>宣传图</label><div class="upload-box"><div class="plus">+</div>品牌宣传图</div>
      </div>
      <div style="margin-top:20px">${btn("保存品牌资料")}</div>`;
  }

  function orderTable(rows, actions = "查看 / 下载 / 生成订单") {
    return `<table class="data-table">
      <thead><tr><th>单号</th><th>品牌</th><th>季节</th><th>店铺</th><th>金额</th><th>状态</th><th>操作</th></tr></thead>
      <tbody>${rows.map(r => `<tr>
        <td>${r.id}</td><td>${r.brand}</td><td>${r.season}</td>
        <td>${r.store}${r.city ? " · " + r.city : ""}</td>
        <td>${r.amount}</td><td><span class="badge">${r.status}</span></td>
        <td class="ops"><a href="javascript:;" data-go="order-detail">查看</a><a href="javascript:;">下载</a></td>
      </tr>`).join("")}</tbody>
    </table>
    <p style="color:#999;font-size:12px;margin-top:8px">操作示例：${actions}</p>`;
  }

  function pageOrderSelection() {
    return `<h1 class="page-title">选款单管理</h1>
      <div class="note">列表形态对齐现网：品牌 / 下单时间 / 店铺 / 季节 / 总金额 / 件数 / SKU 数；可进详情做生成订单、取消、下载。</div>
      ${filterPanel([
        ["选择品牌", select(RR.brands.map(b => b.name))],
        ["季节", select(RR.seasons)],
        ["国家", input("输入国家")],
        ["省", input("输入省")],
        ["城市", input("输入城市")],
        ["店铺名", input("输入店铺名")]
      ])}
      <div class="ops" style="margin-bottom:12px">
        <a href="javascript:;" data-action-toast="打开已上传合同列表">查看已上传合同</a>
        <a href="javascript:;" data-action-toast="打开已上传付款凭证">查看已上传凭证</a>
      </div>
      ${RR.selections.map(s => `
        <div class="sel-card">
          <div class="sel-card-head">
            <span>买手/店铺：<strong>${s.store}</strong></span>
            <span>下单时间：${s.time}</span>
            <span class="badge">${s.status}</span>
          </div>
          <div class="sel-card-body">
            <div>
              <div class="brand">${s.brand}</div>
              <div style="color:#999;font-size:12px;margin-top:4px">${s.id}</div>
            </div>
            <div>季节<br/><strong>${s.season}</strong></div>
            <div>总金额<br/><strong>${s.amount}</strong></div>
            <div>件数：${s.pieces}<br/>SKU数：${s.skus}</div>
            <div class="ops" style="flex-direction:column;align-items:stretch">
              <button class="btn btn-outline btn-sm" data-go="selection-detail" data-sel="${s.id}">查看详情</button>
              <button class="btn btn-primary btn-sm" data-gen-order="${s.id}">生成订单</button>
              <button class="btn btn-outline btn-sm" data-action-toast="已取消选款单 ${s.id}">取消选款单</button>
              <button class="btn btn-outline btn-sm" data-action-toast="开始下载选款单 Excel">下载</button>
            </div>
          </div>
        </div>`).join("")}`;
  }

  function pageSelectionDetail() {
    const s = state.selectedSel || RR.selections[0];
    return `<h1 class="page-title">选款单详情</h1>
      <div class="detail-sticky">
        <strong>${s.brand}</strong>
        <span>${s.store}</span>
        <span>${s.season}</span>
        <span>¥${s.amount}</span>
        <span class="badge">${s.status}</span>
      </div>
      <div class="action-bar">
        ${btn("生成订单", "btn-primary", "")}
        ${btn("取消选款单", "btn-outline")}
        ${btn("下载选款单", "btn-outline")}
        ${btn("返回列表", "btn-outline")}
      </div>
      <table class="data-table">
        <thead><tr><th>SKU</th><th>款式</th><th>尺码数量</th><th>买手价</th><th>小计示意</th></tr></thead>
        <tbody>${RR.selectionLines.map(l => {
          const qty = Object.values(l.sizes).reduce((a, b) => a + b, 0);
          return `<tr>
            <td>${l.sku}</td><td>${l.title}</td>
            <td>${Object.entries(l.sizes).map(([k, v]) => k + "×" + v).join(" / ")}</td>
            <td>${l.price}</td><td>${qty} 件</td>
          </tr>`;
        }).join("")}</tbody>
      </table>
      <p style="color:#999;font-size:12px">生成订单后选款单锁定；若需再改，需后台驳回订单后重选。</p>`;
  }

  function pageOrderList() {
    return `<h1 class="page-title">订单管理</h1>
      <div class="note">状态流：买手未确认 → 买手已确认待品牌确认（设定金）→ 定金确认 → 尾款确认。校验：无首单不可下补货；前一补货未完成不可新开。</div>
      ${filterPanel([
        ["品牌", select(RR.brands.map(b => b.name))],
        ["季节", select(RR.seasons)],
        ["订单类型", select(["首单", "补货单"])],
        ["状态", select(["买手未确认", "待品牌确认", "定金确认", "尾款确认"])],
        ["店铺", input()],
        ["订单号", input()]
      ])}
      <table class="data-table">
        <thead><tr><th>订单号</th><th>品牌</th><th>类型</th><th>店铺</th><th>金额</th><th>定金</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>${RR.orders.map(o => `<tr>
          <td>${o.id}</td><td>${o.brand}</td><td>${o.type}</td><td>${o.store}</td>
          <td>${o.amount}</td><td>${o.deposit}</td>
          <td><span class="badge">${o.status}</span></td>
          <td class="ops">
            <a href="javascript:;" data-go="order-detail" data-oid="${o.id}">详情</a>
            <a href="javascript:;" data-action-toast="下载订单">下载</a>
            <a href="javascript:;" data-go="order-detail" data-oid="${o.id}">改单</a>
            <a href="javascript:;" data-go="order-detail" data-oid="${o.id}">白名单</a>
          </td>
        </tr>`).join("")}</tbody>
      </table>`;
  }

  function pageOrderDetail() {
    const o = state.selectedOrder || RR.orders[0];
    const action = state.orderAction;
    const panels = {
      modify: `<div class="modal-panel"><h3>修改订单 · 增减款 / 设置折扣</h3>
        <table class="data-table"><thead><tr><th>SKU</th><th>尺码</th><th>数量</th><th>单款折扣</th><th></th></tr></thead>
        <tbody>
          <tr><td>121BZX122</td><td>S/M</td><td>${input("3")}</td><td>${input("1.00")}</td><td><a href="javascript:;">删款</a></td></tr>
          <tr><td>121DRX037G</td><td>XS/S</td><td>${input("3")}</td><td>${input("0.95")}</td><td><a href="javascript:;">删款</a></td></tr>
        </tbody></table>
        <div class="action-bar">${btn("添加款式", "btn-outline")}${btn("保存修改")}</div></div>`,
      invoice: `<div class="modal-panel"><h3>申请发票</h3>
        <div class="form-grid"><label>抬头</label><div>${input("Liora Amour 商贸")}</div>
        <label>税号</label><div>${input()}</div>
        <label>金额</label><div>${input(o.amount)}</div>
        <label>类型</label><div>${select(["增值税专用发票", "普通发票"])}</div></div>
        <div class="action-bar">${btn("提交发票申请")}</div></div>`,
      voucher: `<div class="modal-panel"><h3>上传付款凭证</h3>
        <div class="upload-box"><div class="plus">+</div>上传转账截图 / PDF</div>
        <div class="form-grid" style="margin-top:16px"><label>付款金额</label><div>${input(o.deposit)}</div>
        <label>付款时间</label><div>${input("2026-07-21")}</div></div>
        <div class="action-bar">${btn("提交凭证")}</div></div>`,
      whitelist: `<div class="modal-panel"><h3>白名单特殊处理</h3>
        <div class="note">订单未达起订量时，可设为白名单允许继续流转。</div>
        <div class="form-grid"><label>当前金额</label><div>¥${o.amount}</div>
        <label>起订额</label><div>¥30,000</div>
        <label>原因</label><div class="span2"><textarea>VIP 买手特批</textarea></div></div>
        <div class="action-bar">${btn("设为白名单")}</div></div>`,
      substore: `<div class="modal-panel"><h3>分配订单到子店铺</h3>
        <table class="data-table"><thead><tr><th>子店铺</th><th>分配金额</th><th>SKU 数</th></tr></thead>
        <tbody>
          <tr><td>Liora Amour 静安</td><td>${input("60,000")}</td><td>${input("10")}</td></tr>
          <tr><td>Liora Amour 主店</td><td>${input("68,600")}</td><td>${input("8")}</td></tr>
        </tbody></table>
        <div class="action-bar">${btn("确认分配")}</div></div>`,
      return: `<div class="modal-panel"><h3>退换货</h3>
        <div class="form-grid"><label>类型</label><div>${select(["退货", "换货"])}</div>
        <label>关联 SKU</label><div>${input("121BZX122")}</div>
        <label>数量</label><div>${input("1")}</div>
        <label>原因</label><div>${input()}</div></div>
        <div class="action-bar">${btn("提交退换货")}</div></div>`,
      deposit: `<div class="modal-panel"><h3>品牌确认 · 设置定金</h3>
        <div class="form-grid"><label>订单金额</label><div>¥${o.amount}</div>
        <label>定金比例</label><div>${input("30%")}</div>
        <label>应收定金</label><div>${input(o.deposit)}</div></div>
        <div class="action-bar">${btn("确认定金并确认订单")}</div></div>`
    };

    return `<h1 class="page-title">订单详情</h1>
      <div class="detail-sticky">
        <strong>${o.brand}</strong>
        <span class="badge">${o.type}</span>
        <span>最小起订额 ¥30,000</span>
        <span>品类折扣 服饰 0.45</span>
        <span>已选金额 ¥${o.amount}</span>
        <span class="badge gray">${o.status}</span>
      </div>
      <div class="stat-row">
        <div class="stat"><div class="l">订单金额</div><div class="n">¥${o.amount}</div></div>
        <div class="stat"><div class="l">应收定金</div><div class="n">¥${o.deposit}</div></div>
        <div class="stat"><div class="l">实收定金</div><div class="n">¥0.00</div></div>
        <div class="stat"><div class="l">SKU 数</div><div class="n">18</div></div>
      </div>
      <div class="form-section">
        <h3>订单操作（点击展开子流程）</h3>
        <div class="action-bar">
          <button class="btn btn-primary" data-order-action="deposit">确认定金并确认订单</button>
          <button class="btn btn-outline" data-order-action="modify">增减款 / 设折扣</button>
          <button class="btn btn-outline" data-order-action="voucher">上传付款凭证</button>
          <button class="btn btn-outline" data-order-action="invoice">申请发票</button>
          <button class="btn btn-outline" data-action-toast="确认尾款成功">确认尾款</button>
          <button class="btn btn-outline" data-order-action="substore">分配子店铺</button>
          <button class="btn btn-outline" data-order-action="return">退换货</button>
          <button class="btn btn-outline" data-order-action="whitelist">白名单</button>
          <button class="btn btn-outline" data-go="contract-preview">生成合同</button>
          <button class="btn btn-outline" data-go="oc-preview">生成 OC</button>
          <button class="btn btn-outline" data-action-toast="开始下载订单 Excel">下载订单</button>
        </div>
        ${action ? panels[action] || "" : '<div class="note">请选择上方操作查看完整子流程（此前版本仅有按钮文案，未闭合）。</div>'}
      </div>
      <table class="data-table">
        <thead><tr><th>SKU</th><th>款式</th><th>尺码明细</th><th>数量</th><th>买手价</th><th>小计</th></tr></thead>
        <tbody>
          <tr><td>121BZX122</td><td>LUNE——双v面包西服</td><td>S×2 / M×1</td><td>3</td><td>2,745.00</td><td>8,235.00</td></tr>
          <tr><td>121DRX037G</td><td>抹胸连衣裙</td><td>XS×1 / S×2</td><td>3</td><td>2,205.00</td><td>6,615.00</td></tr>
        </tbody>
      </table>`;
  }

  function pageOrderReplenish() {
    return `<h1 class="page-title">补货单管理</h1>
      <div class="note">能力与订单管理一致；额外校验：未下过首单不可补货；上一补货单未完成不可新下</div>
      ${pageOrderList().replace("订单管理", "补货单管理").replace(/page-title">[^<]+/, 'page-title">补货单管理')}`;
  }

  function pageOrderContract() {
    return `<h1 class="page-title">合同管理</h1>
      <div class="note">根据订单生成在线合同；企业信息及公章自动取自品牌资料</div>
      <table class="data-table">
        <thead><tr><th>合同号</th><th>关联订单</th><th>品牌</th><th>季度</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr><td>CT-2026SS-088</td><td>ORD-20260319-088</td><td>JUNLI</td><td>2026SS</td><td><span class="badge green">已生成</span></td>
            <td class="ops"><a href="javascript:;">预览</a><a href="javascript:;">下载</a></td></tr>
          <tr><td>CT-2026SS-102</td><td>ORD-20260320-102</td><td>HAIZHEN WANG</td><td>2026SS</td><td><span class="badge">待生成</span></td>
            <td class="ops"><a href="javascript:;">一键生成</a></td></tr>
        </tbody>
      </table>`;
  }

  function pageOrderOC() {
    return `<h1 class="page-title">OC 管理</h1>
      <div class="note">根据订单快速生成 OC（企业信息 + 商品信息及图片），支持快速下载</div>
      <table class="data-table">
        <thead><tr><th>OC 号</th><th>订单</th><th>品牌</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr><td>OC-20260319-088</td><td>ORD-20260319-088</td><td>JUNLI</td><td><span class="badge green">可下载</span></td>
            <td class="ops"><a href="javascript:;">快速生成</a><a href="javascript:;">下载</a></td></tr>
        </tbody>
      </table>`;
  }

  function pageOrderStyle() {
    return `<h1 class="page-title">款式汇总</h1>
      ${filterPanel([
        ["时间区间", input("起")],
        ["", input("止")],
        ["品牌", select(RR.brands.map(b => b.name))],
        ["季节", select(RR.seasons)],
        ["订单状态", select(["全部", "已确认"])],
        ["订单类型", select(["首单", "补货单"])]
      ])}
      <div class="tabs"><button class="on">SKU 维度</button><button>买手维度</button></div>
      <table class="data-table">
        <thead><tr><th>SKU</th><th>款式</th><th>下单买手数</th><th>总件数</th><th>总金额</th></tr></thead>
        <tbody>
          <tr><td>121BZX122</td><td>双v面包西服</td><td>24</td><td>186</td><td>510,570.00</td></tr>
          <tr><td>JL26SS001</td><td>羊毛大衣</td><td>18</td><td>92</td><td>364,320.00</td></tr>
        </tbody>
      </table>`;
  }

  function pageOrderRealtime() {
    return `<h1 class="page-title">实时订单汇总</h1>
      ${filterPanel([
        ["品牌", select(RR.brands.map(b => b.name))],
        ["季节", select(RR.seasons)]
      ])}
      <table class="data-table">
        <thead><tr><th>品牌</th><th>订单数</th><th>订单总金额</th><th>应收定金</th><th>实收定金</th><th>实收总额</th></tr></thead>
        <tbody>
          ${RR.brands.slice(0, 5).map((b, i) => `<tr>
            <td>${b.name}</td><td>${12 + i * 3}</td><td>${(80 + i * 20)},000.00</td>
            <td>${(24 + i * 6)},000.00</td><td>${(18 + i * 4)},000.00</td><td>${(50 + i * 10)},000.00</td>
          </tr>`).join("")}
        </tbody>
      </table>`;
  }

  function pageOrderAllSel() {
    return `<h1 class="page-title">总选款单管理</h1>
      <div class="note">选择指定品牌 + 季度，下载该品牌指定季度总选款单</div>
      <div class="filter-panel">
        <div class="filter-grid">
          <div class="filter-label">品牌</div><div>${select(RR.brands.map(b => b.name))}</div>
          <div class="filter-label">季度</div><div>${select(RR.seasons)}</div>
        </div>
        <div class="filter-actions">${btn("下载总选款单")}</div>
      </div>`;
  }

  function pageOrderAll() {
    return `<h1 class="page-title">总订单管理</h1>
      <div class="filter-panel">
        <div class="filter-grid">
          <div class="filter-label">品牌</div><div>${select(RR.brands.map(b => b.name))}</div>
          <div class="filter-label">季节</div><div>${select(RR.seasons)}</div>
          <div class="filter-label">订单类型</div><div>${select(["首单", "补货单"])}</div>
          <div class="filter-label">时间区间</div><div style="display:flex;gap:8px">${input("起")}${input("止")}</div>
        </div>
        <div class="filter-actions">${btn("下载订单汇总")}</div>
      </div>`;
  }

  function pageOrderAnalysis() {
    return `<h1 class="page-title">订单分析</h1>
      ${filterPanel([
        ["品牌", select(RR.brands.map(b => b.name))],
        ["季度", select(RR.seasons)]
      ])}
      <div class="stat-row">
        <div class="stat"><div class="l">订单数</div><div class="n">128</div></div>
        <div class="stat"><div class="l">总金额</div><div class="n">¥2.4M</div></div>
        <div class="stat"><div class="l">客单价</div><div class="n">¥18.7k</div></div>
        <div class="stat"><div class="l">买手数</div><div class="n">64</div></div>
      </div>
      <div class="chart-ph">
        ${[40, 65, 50, 80, 72, 90, 60, 85].map(h => `<div class="bar" style="height:${h}%"></div>`).join("")}
      </div>
      <p style="color:#999;font-size:12px;margin-top:8px">示意：按周订单金额趋势（正式环境接入真实图表）</p>`;
  }

  function pageOrderAppoint() {
    return `<h1 class="page-title">预约列表</h1>
      <div class="note">买手小程序预约订货会 → 同步至此，可按品牌/店铺筛选与下载</div>
      ${filterPanel([
        ["品牌", select(RR.brands.map(b => b.name))],
        ["店铺名", input()]
      ], btn("下载预约记录", "btn-outline"))}
      <table class="data-table">
        <thead><tr><th>品牌</th><th>店铺</th><th>联系人</th><th>手机</th><th>预约时间</th><th>季节</th></tr></thead>
        <tbody>${RR.appointments.map(a => `<tr>
          <td>${a.brand}</td><td>${a.store}</td><td>${a.contact}</td>
          <td>${a.phone}</td><td>${a.date}</td><td>${a.season}</td>
        </tr>`).join("")}</tbody>
      </table>`;
  }

  function pageOrderRecon() {
    const tab = state.reconTab;
    const tabs = [
      ["rate", "抽佣设置"],
      ["bill", "抽佣单"],
      ["invoice", "代/抽发票"],
      ["balance", "挂帐余额"],
      ["payinfo", "品牌付款信息"]
    ];
    const bodies = {
      rate: `<div class="form-grid">
        <label>品牌</label><div>${select(RR.brands.map(b => b.name))}</div>
        <label>季节</label><div>${select(RR.seasons)}</div>
        <label>基础抽佣比例</label><div>${input("5%")}</div>
        <label>阶梯抽佣</label><div>${input("满100万→4%")}</div>
      </div><div class="action-bar">${btn("保存抽佣设置")}</div>`,
      bill: `<table class="data-table"><thead><tr><th>抽佣单号</th><th>品牌</th><th>季节</th><th>基数</th><th>比例</th><th>抽佣额</th><th>状态</th></tr></thead>
        <tbody><tr><td>CM-2026SS-01</td><td>JUNLI</td><td>2026SS</td><td>960,000</td><td>5%</td><td>48,000</td><td><span class="badge">待确认</span></td></tr></tbody></table>`,
      invoice: `<table class="data-table"><thead><tr><th>类型</th><th>品牌</th><th>金额</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr><td>代开发票</td><td>JUNLI</td><td>48,000</td><td>待开</td><td><a href="javascript:;">处理</a></td></tr>
          <tr><td>抽佣发票</td><td>HAIZHEN WANG</td><td>32,000</td><td>已开</td><td><a href="javascript:;">下载</a></td></tr>
        </tbody></table>`,
      balance: `<table class="data-table"><thead><tr><th>品牌</th><th>买手</th><th>挂帐余额</th><th>操作</th></tr></thead>
        <tbody><tr><td>JUNLI</td><td>B1OCK</td><td>12,400.00</td><td><a href="javascript:;">冲销</a></td></tr></tbody></table>`,
      payinfo: `<div class="form-grid">
        <label>品牌</label><div>${select(RR.brands.map(b => b.name))}</div>
        <label>收款账户</label><div>${input()}</div>
        <label>开户行</label><div>${input()}</div>
        <label>账号</label><div>${input()}</div>
      </div><div class="action-bar">${btn("保存付款信息")}</div>`
    };
    return `<h1 class="page-title">对账管理</h1>
      <div class="note">需求：抽佣比例/阶梯、品牌付款信息、抽佣单、代/抽发票、挂帐余额。现网有入口；本页补齐 Tab 实质内容供确认。</div>
      <div class="tabs">${tabs.map(([id, lab]) =>
        `<button class="${tab === id ? "on" : ""}" data-recon="${id}">${lab}</button>`
      ).join("")}</div>
      ${bodies[tab]}`;
  }

  function pageShip() {
    return `<h1 class="page-title">发货管理</h1>
      <div class="note">现网发货入口当前几乎空白；按需求补齐：发货单关联订单、记录发货明细、填写物流单号。差额可转买手余额。</div>
      ${filterPanel([
        ["订单号", input()],
        ["品牌", select(RR.brands.map(b => b.name))],
        ["状态", select(["待发货", "部分发货", "已发货"])],
        ["物流单号", input()]
      ])}
      <table class="data-table">
        <thead><tr><th>发货单号</th><th>订单</th><th>品牌</th><th>店铺</th><th>物流单号</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr><td>SH-260321-01</td><td>ORD-20260319-088</td><td>JUNLI</td><td>B1OCK</td><td>${input("SF123…")}</td>
            <td><span class="badge">待发货</span></td>
            <td class="ops"><a href="javascript:;" data-go="ship-detail">编辑发货内容</a><a href="javascript:;" data-action-toast="已确认发货">确认发货</a></td></tr>
        </tbody>
      </table>`;
  }

  function pageShipDetail() {
    return `<h1 class="page-title">发货明细</h1>
      <div class="detail-sticky">
        <strong>SH-260321-01</strong>
        <span>订单 ORD-20260319-088</span>
        <span>JUNLI · B1OCK</span>
      </div>
      <table class="data-table">
        <thead><tr><th>SKU</th><th>尺码</th><th>应发</th><th>实发</th><th>差额</th></tr></thead>
        <tbody>
          <tr><td>JL26SS001</td><td>M</td><td>4</td><td>${input("3")}</td><td>1 → 转余额</td></tr>
          <tr><td>JL26SS001</td><td>L</td><td>2</td><td>${input("2")}</td><td>0</td></tr>
        </tbody>
      </table>
      <div class="form-grid" style="margin-top:16px">
        <label>物流单号</label><div>${input()}</div>
        <label>发货备注</label><div>${input()}</div>
      </div>
      <div class="action-bar">${btn("保存发货明细")}${btn("确认发货并回写余额", "btn-outline")}</div>`;
  }

  function pageContractPreview() {
    return `<h1 class="page-title">合同预览 / 生成</h1>
      <div class="note">企业信息与公章自动取自品牌资料（收款设置中的合同公章）。</div>
      <div class="filter-panel" style="min-height:320px;line-height:1.9">
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
    return `<h1 class="page-title">OC 快速生成</h1>
      <div class="note">需求强调：OC 需快速生成及下载；含企业信息 + 商品信息及图片。</div>
      <div class="filter-panel">
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
    return `<h1 class="page-title">意向管理</h1>
      <div class="note">品牌审核买手是否可查看本品牌商品</div>
      <table class="data-table">
        <thead><tr><th>店铺名</th><th>申请品牌</th><th>申请日期</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>${RR.intentions.map(i => `<tr>
          <td>${i.store}</td><td>${i.brand}</td><td>${i.date}</td>
          <td><span class="badge ${i.status === "已通过" ? "green" : i.status === "已拒绝" ? "red" : ""}">${i.status}</span></td>
          <td class="ops">${btn("通过", "btn-outline btn-sm")}${btn("拒绝", "btn-outline btn-sm")}</td>
        </tr>`).join("")}</tbody>
      </table>`;
  }

  function pageBuyerList() {
    return `<h1 class="page-title">买手审核</h1>
      <div style="margin-bottom:16px">${btn("添加买手", "btn-outline")}</div>
      <table class="data-table">
        <thead><tr><th>店铺名</th><th>地区</th><th>手机号</th><th>店铺级别</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>${RR.buyers.map(b => `<tr>
          <td>${b.name}</td><td>${b.city}</td><td>${b.phone}</td><td>${b.level}</td>
          <td><span class="badge ${b.status === "已通过" ? "green" : ""}">${b.status}</span></td>
          <td class="ops">
            <a href="javascript:;" data-go="buyer-balance">余额管理</a>
            <a href="javascript:;" data-go="buyer-store">店铺资料</a>
            <a href="javascript:;" data-go="buyer-invoice">发票</a>
            <a href="javascript:;" data-go="buyer-address">地址</a>
            <a href="javascript:;" data-go="buyer-edit">编辑</a>
            <a href="javascript:;" data-go="buyer-sub">子店铺</a>
            <a href="javascript:;" data-go="buyer-appoint">预约</a>
            ${b.status === "待审核" ? "<a href='javascript:;'>通过</a><a href='javascript:;'>关闭权限</a>" : ""}
          </td>
        </tr>`).join("")}</tbody>
      </table>`;
  }

  function pageBuyerBalance() {
    return `<h1 class="page-title">余额管理</h1>
      <div class="note">实发少于应发时，差额转为品牌账户余额，可抵扣下次订单；支持手动编辑</div>
      <table class="data-table">
        <thead><tr><th>买手店铺</th><th>品牌</th><th>余额(CNY)</th><th>操作</th></tr></thead>
        <tbody>
          <tr><td>Liora Amour</td><td>HAIZHEN WANG</td><td>${input("2,480.00")}</td><td>${btn("保存", "btn-outline btn-sm")}</td></tr>
          <tr><td>B1OCK</td><td>JUNLI</td><td>${input("0.00")}</td><td>${btn("保存", "btn-outline btn-sm")}</td></tr>
        </tbody>
      </table>`;
  }

  function simpleFormPage(title, note, fields) {
    return `<h1 class="page-title">${title}</h1>
      ${note ? `<div class="note">${note}</div>` : ""}
      <div class="form-grid">${fields}</div>
      <div style="margin-top:20px">${btn("保存")}</div>`;
  }

  function pageRoleList() {
    return `<h1 class="page-title">角色管理</h1>
      <div class="note">创建自定义角色；预设角色见下表（需求清单）</div>
      ${btn("创建角色", "btn-outline")}
      <table class="data-table" style="margin-top:16px">
        <thead><tr><th>角色</th><th>品牌范围</th><th>权限概要</th><th>操作</th></tr></thead>
        <tbody>${RR.roles.map(r => `<tr>
          <td>${r.name}</td><td>${r.scope}</td><td>${r.perms}</td>
          <td><a href="javascript:;" data-go="role-perm">配置权限</a></td>
        </tr>`).join("")}</tbody>
      </table>`;
  }

  function pageRolePerm() {
    const perms = ["商品管理", "订单确认", "定金确认", "意向审核", "买手管理", "发票", "结佣", "财务审核"];
    return `<h1 class="page-title">权限管理</h1>
      <div class="note">为指定角色开关功能权限</div>
      <div class="form-grid">
        <label>选择角色</label><div>${select(RR.roles.map(r => r.name))}</div>
      </div>
      <table class="data-table" style="margin-top:16px">
        <thead><tr><th>功能</th><th>开启</th></tr></thead>
        <tbody>${perms.map(p => `<tr><td>${p}</td><td><input type="checkbox" checked style="width:auto;height:auto" /></td></tr>`).join("")}</tbody>
      </table>
      <div style="margin-top:16px">${btn("保存权限")}</div>`;
  }

  /* Buyer portal */
  function pageBuyerHome() {
    return `<div class="cat-nav">
        <a class="active" href="javascript:;">全部</a>
        <a href="javascript:;">女装</a><a href="javascript:;">男装</a>
        <a href="javascript:;">男女装</a><a href="javascript:;">配饰</a>
      </div>
      <h1 class="page-title" style="font-size:22px">合作品牌</h1>
      <div class="brand-grid">
        ${RR.brands.map(b => `
          <div class="brand-card" data-go="buyer-brand" data-brand="${b.name}">
            <div class="brand-logo">${b.name.split(" ")[0]}</div>
            <div style="font-size:13px;font-weight:600">${b.name}</div>
          </div>`).join("")}
      </div>
      <div class="float-cart" data-go="buyer-selection">
        选款单 <span class="dot">${state.cart.length || 3}</span>
      </div>`;
  }

  function pageBuyerBrand() {
    const brand = state.selectedBrand;
    const goods = RR.goods.filter(g => g.brand === brand);
    const list = goods.length ? goods : RR.goods.filter(g => g.brand === "HAIZHEN WANG");
    const imageView = `<div class="product-grid">
        ${list.map(g => `
          <div class="product-card">
            <button class="heart ${state.hearts.includes(g.sku) ? "on" : ""}" data-heart="${g.sku}" title="选款（仅款式，不带尺码）">♥</button>
            <div class="cover" data-go="buyer-detail" data-sku="${g.sku}">LOOK</div>
            <div class="name" data-go="buyer-detail" data-sku="${g.sku}">${g.title}</div>
            <div class="meta">${g.sku} · ¥${g.wholesale}${g.carry ? " · Carry Over" : ""}</div>
          </div>`).join("")}
      </div>`;
    const codeView = `<div class="code-grid">
        ${list.map(g => `
          <div class="code-cell ${state.hearts.includes(g.sku) ? "on" : ""}" data-go="buyer-detail" data-sku="${g.sku}">
            <button class="heart ${state.hearts.includes(g.sku) ? "on" : ""}" data-heart="${g.sku}">♥</button>
            ${g.sku.slice(-4)}
          </div>`).join("")}
      </div>`;
    return `<div class="detail-sticky">
        <div class="brand-logo" style="width:48px;height:48px;font-size:9px">${brand.split(" ")[0]}</div>
        <div>
          <strong>${brand}</strong>
          <div style="font-size:12px;color:#666">先锋解构女装 · <a href="javascript:;" data-go="buyer-brand-about">查看全部介绍</a></div>
        </div>
        <div style="margin-left:auto;display:flex;gap:12px;align-items:center;flex-wrap:wrap">
          ${select(RR.seasons, "选择季节")}
          <button class="btn btn-outline btn-sm ${state.viewMode === "image" ? "" : ""}" data-view="image">图片视图</button>
          <button class="btn btn-outline btn-sm" data-view="code">编码视图</button>
          ${input("搜索商品 / SKU（不区分大小写）")}
          <label style="margin:0;display:flex;align-items:center;gap:6px;color:#666"><input type="checkbox" style="width:auto;height:auto" /> Carry Over</label>
        </div>
      </div>
      ${state.viewMode === "code" ? codeView : imageView}
      <div class="float-cart" data-toggle-cart>选款单 <span class="dot">${state.cart.length}</span></div>
      ${cartDrawer()}`;
  }

  function cartDrawer() {
    if (!state.cartOpen) return "";
    const items = RR.goods.filter(g => state.cart.includes(g.sku));
    return `<div class="drawer-mask" data-toggle-cart></div>
      <div class="drawer">
        <h3>选款单小窗</h3>
        <p style="color:#666;font-size:13px">选款只选款式，不带尺码；确认后再进详情/选款单改数量。</p>
        ${items.map(g => `
          <div style="display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #eee">
            <div class="thumb ph" style="width:48px;height:60px">IMG</div>
            <div style="flex:1">
              <div style="font-size:13px">${g.title}</div>
              <div style="color:#999;font-size:12px">${g.sku}</div>
            </div>
            <a href="javascript:;" data-heart="${g.sku}">移除</a>
          </div>`).join("") || "<p>暂无选款</p>"}
        <div class="action-bar" style="margin-top:20px">
          ${btn("去选款单", "btn-primary")}
          <button class="btn btn-outline" data-toggle-cart>关闭</button>
        </div>
      </div>`;
  }

  function pageBuyerSelection() {
    const block = !state.hasFirstOrder;
    return `<h1 class="page-title">我的选款单</h1>
      <div class="note">按品牌拆分卡片。规则：同季无首单不可下补货；上一补货未完成不可新开。</div>
      ${block ? `<div class="note" style="background:#fde8ee;color:#9f1239">拦截示例：本季尚未完成首单，补货选款单确认将被拒绝。</div>` : ""}
      <div class="order-cards">
        ${RR.selections.slice(0, 3).map(s => `
          <div class="order-card">
            <div>
              <div class="title">${s.brand} · ${s.season}</div>
              <div class="meta">
                <span>${s.id}</span><span>${s.skus} 款</span><span>¥${s.amount}</span>
                <span class="badge">${s.status}</span>
              </div>
            </div>
            <div class="ops" style="flex-direction:column">
              <button class="btn btn-outline btn-sm" data-go="buyer-selection-edit" data-sel="${s.id}">修改选款</button>
              <button class="btn btn-outline btn-sm" data-action-toast="下载选款单">下载</button>
              <button class="btn btn-primary btn-sm" data-confirm-sel="${s.id}">确认订单</button>
            </div>
          </div>`).join("")}
      </div>`;
  }

  function pageBuyerSelectionEdit() {
    return `<h1 class="page-title">选款单修改</h1>
      <div class="note">可增减款式、修改各尺码数量；确认生成订单后不可再改（需后台驳回）。</div>
      <table class="data-table">
        <thead><tr><th>SKU</th><th>款式</th><th>尺码数量</th><th></th></tr></thead>
        <tbody>${RR.selectionLines.map(l => `<tr>
          <td>${l.sku}</td><td>${l.title}</td>
          <td>${Object.keys(l.sizes).map(s => `
            <div class="size-row" style="border:none;padding:4px 0">
              <span style="width:28px">${s}</span>
              <div class="qty"><button>-</button><input value="${l.sizes[s]}" /><button>+</button></div>
            </div>`).join("")}</td>
          <td><a href="javascript:;">删除款式</a></td>
        </tr>`).join("")}</tbody>
      </table>
      <div class="action-bar">${btn("保存修改")}${btn("返回", "btn-outline")}</div>`;
  }

  function pageBuyerOrders() {
    return `<h1 class="page-title">我的订单</h1>
      <div class="tabs">
        <button class="on" data-tabsoft>全部</button>
        <button data-tabsoft>未完成</button>
        <button data-tabsoft>已完成</button>
      </div>
      <div class="order-cards">
        ${RR.orders.map(o => `
          <div class="order-card">
            <div>
              <div class="title">${o.brand}</div>
              <div class="meta">
                <span>${o.id}</span><span>下单时间 2026-03-20</span>
                <span>${o.season}</span><span>${o.type}</span>
                <span>¥${o.amount}</span><span class="badge">${o.status}</span>
              </div>
            </div>
            <div class="ops" style="flex-direction:column">
              <button class="btn btn-outline btn-sm" data-go="buyer-order-detail" data-oid="${o.id}">查看</button>
              <button class="btn btn-outline btn-sm" data-action-toast="下载订单 Excel">下载 Excel</button>
              ${o.status.includes("未确认") || o.status.includes("驳回")
                ? `<button class="btn btn-outline btn-sm" data-go="buyer-selection-edit">修改</button>` : ""}
              <button class="btn btn-primary btn-sm" data-action-toast="已确认提交，等待品牌/平台审核">确认提交</button>
            </div>
          </div>`).join("")}
      </div>`;
  }

  function pageBuyerOrderDetail() {
    const o = state.selectedOrder || RR.orders[0];
    const steps = ["买手未确认", "买手已确认待品牌确认", "定金确认", "尾款确认"];
    const cur = steps.findIndex(s => o.status.includes(s.slice(0, 4))) ;
    const idx = cur < 0 ? 1 : cur;
    return `<h1 class="page-title">订单查看</h1>
      <div class="detail-sticky">
        <strong>${o.brand}</strong>
        <div class="brand-logo" style="width:36px;height:36px;font-size:8px">LG</div>
        <span>最小起订额 ¥30,000</span>
        <span>品类折扣 服饰 0.45</span>
        <span class="badge">${o.status}</span>
      </div>
      <h3 style="font-size:15px">订单进度</h3>
      <div class="timeline">
        ${steps.map((s, i) => `
          <div class="timeline-item ${i < idx ? "done" : ""} ${i === idx ? "on" : ""}">
            <div class="timeline-dot"></div>
            <div><strong>${s}</strong><div style="color:#999;font-size:12px">${i <= idx ? "已到达" : "未到达"}</div></div>
          </div>`).join("")}
      </div>
      <div class="action-bar">
        ${btn("下载 Excel", "btn-outline")}
        ${o.status.includes("未确认") ? btn("修改订单", "btn-outline") : ""}
        ${btn("确认提交")}
      </div>
      <table class="data-table">
        <thead><tr><th>SKU</th><th>款式</th><th>数量</th><th>金额</th></tr></thead>
        <tbody>
          <tr><td>121BZX122</td><td>双v面包西服</td><td>3</td><td>8,235.00</td></tr>
        </tbody>
      </table>`;
  }

  function pageCoverage() {
    const rows = [
      ["登录（身份分流）", "有", "有", "闭合", "ok"],
      ["品牌规则配置", "有", "有", "字段已对齐现网折扣结构", "ok"],
      ["商品列表/增删改/CO", "有", "有", "闭合（示意）", "ok"],
      ["选款单管理", "有", "有", "已补详情/生成/取消/下载", "ok"],
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
    return `<h1 class="page-title">覆盖核对（实事求是）</h1>
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

  function pageAccount() {
    return `<h1 class="page-title">账号管理</h1>
      <div class="form-grid">
        <label>登录手机</label><div>13800000000</div>
        <label>角色</label><div>${state.portal === "brand" ? "品牌管理员" : "高级管理员"}</div>
        <label>修改手机</label><div>${input()}</div>
        <label></label><div>${btn("保存", "btn-outline")}</div>
      </div>`;
  }

  function pageBuyerBrandAbout() {
    const b = RR.brands.find(x => x.name === state.selectedBrand) || RR.brands[0];
    return `<h1 class="page-title">${b.name}</h1>
      <div class="form-grid" style="max-width:720px">
        <label>成立年份</label><div>${b.year}</div>
        <label>品类</label><div>${b.cat}</div>
        <label>风格</label><div>${b.style}</div>
        <label>适用人群</label><div>${b.crowd}</div>
        <label>品牌介绍</label><div class="span2" style="color:#666;line-height:1.8">品牌介绍信息由品牌后台维护，此处展示设计师介绍与品牌故事完整内容。</div>
      </div>
      <div style="margin-top:24px">${btn("返回商品列表", "btn-outline")}</div>`;
  }

  function pageBuyerDetail() {
    const g = RR.goods[0];
    const sizes = ["XS", "S", "M", "L"];
    return `<div class="detail-sticky">
        <strong>${g.brand}</strong>
        <div class="brand-logo" style="width:36px;height:36px;font-size:8px">HW</div>
        <span>最小起订 ¥30,000</span>
        <span>已选订量 ¥${(state.qty.S * 2745 + state.qty.M * 2745).toLocaleString()}.00</span>
      </div>
      <div class="detail-layout">
        <div>
          <div class="cover" style="aspect-ratio:3/4;background:#eee;display:flex;align-items:center;justify-content:center;color:#aaa;margin-bottom:12px">商品大图</div>
          <div style="display:flex;gap:8px">
            ${[1, 2, 3, 4].map(i => `<div class="thumb ph" style="width:64px;height:80px">${i}</div>`).join("")}
          </div>
        </div>
        <div>
          <h1 style="font-size:22px;margin:0 0 8px">${g.title}</h1>
          <div style="color:#666;margin-bottom:16px">SKU ${g.sku}</div>
          <div style="margin-bottom:8px">建议零售价 <strong>¥${g.retail}</strong></div>
          <div style="margin-bottom:20px">订货价 <strong style="color:var(--rr-purple)">¥${g.wholesale}</strong></div>
          ${sizes.map(s => `
            <div class="size-row">
              <div style="width:40px">${s}</div>
              <div class="qty">
                <button data-qty="${s}" data-d="-1">−</button>
                <input value="${state.qty[s] || 0}" readonly />
                <button data-qty="${s}" data-d="1">+</button>
              </div>
              <div style="color:#666;font-size:13px">¥${((state.qty[s] || 0) * 2745).toLocaleString()}.00</div>
            </div>`).join("")}
          <div style="margin:20px 0;font-weight:600">合计 ${(state.qty.XS + state.qty.S + state.qty.M + state.qty.L)} 件</div>
          ${btn("加入订单")}
          <div style="margin-top:28px;color:#666;font-size:13px;line-height:1.8">
            <strong style="color:#222">材质信息</strong><br/>
            主面料 100% Wool · 里料 100% Cupro<br/><br/>
            富文本商品详情区域…
          </div>
        </div>
      </div>`;
  }

  function pageBuyerProfile() {
    return `<h1 class="page-title">个人中心</h1>
      <div class="form-section">
        <h3>账号与店铺信息</h3>
        <div class="form-grid">
          <label>登录手机</label><div>13681383088</div>
          <label>店铺名</label><div>Liora Amour</div>
          <label>店铺级别</label><div>B</div>
          <label>所在城市</label><div>北京市</div>
        </div>
      </div>
      <div class="form-section">
        <h3>收货地址管理</h3>
        <table class="data-table">
          <thead><tr><th>收货人</th><th>电话</th><th>地址</th><th>操作</th></tr></thead>
          <tbody><tr><td>王女士</td><td>13681383088</td><td>北京市朝阳区…</td><td><a href="javascript:;">编辑</a></td></tr></tbody>
        </table>
        ${btn("新增地址", "btn-outline")}
      </div>
      <div class="form-section">
        <h3>发票信息管理</h3>
        <div class="form-grid">
          <label>发票抬头</label><div>${input("Liora Amour 商贸有限公司")}</div>
          <label>税号</label><div>${input()}</div>
        </div>
        <div style="margin-top:12px">${btn("保存发票信息")}</div>
      </div>`;
  }

  function pageBuyerReplenish() {
    return `<h1 class="page-title">补货</h1>
      <div class="note">同品牌板块结构。若无首单或上一补货未完成，确认订单时拦截。</div>
      <div class="action-bar">
        <button class="btn btn-outline" data-toggle-rule="first">${state.hasFirstOrder ? "模拟：无首单" : "模拟：已有首单"}</button>
      </div>
      ${pageBuyerHome()}`;
  }

  function pageMP() {
    return `${protoBar()}
      <div style="background:#f0f0f0;min-height:100vh;padding:20px 0 60px">
        <div class="mp-frame">
          <div class="mp-status">ROOMROOM 订货会预约</div>
          <div class="mp-body">
            <h2>在线预约参展</h2>
            <p>填写信息后同步至后台「预约列表」</p>
            <div class="login-field"><label>品牌</label>${select(RR.brands.map(b => b.name))}</div>
            <div class="login-field"><label>店铺名</label>${input()}</div>
            <div class="login-field"><label>联系人</label>${input()}</div>
            <div class="login-field"><label>手机号</label>${input()}</div>
            <div class="login-field"><label>预约场次</label>${select(["2026SS 上海", "2026SS 北京"])}</div>
            <div class="login-field"><label>预约时间</label>${input("2026-04-08 14:00")}</div>
            <button class="btn btn-primary btn-block" data-action-toast="预约已提交，已同步后台预约列表">提交预约</button>
          </div>
        </div>
      </div>`;
  }

  const pages = {
    login: pageLogin,
    coverage: pageCoverage,
    "account-center": pageAccount,
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
    "order-selection": pageOrderSelection,
    "selection-detail": pageSelectionDetail,
    "order-list": pageOrderList,
    "order-detail": pageOrderDetail,
    "order-replenish": () => pageOrderList().replaceAll("订单管理", "补货单管理"),
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
    "buyer-balance": pageBuyerBalance,
    "buyer-store": () => simpleFormPage("查看店铺资料", "查看买手提交的店铺信息", `
      <label>店铺名</label><div>Liora Amour</div>
      <label>级别</label><div>B</div>
      <label>城市</label><div>北京市</div>
      <label>简介</label><div class="span2">独立买手店，聚焦先锋女装。</div>`),
    "buyer-invoice": () => simpleFormPage("修改发票信息", "", `
      <label>抬头</label><div>${input()}</div><label>税号</label><div>${input()}</div>`),
    "buyer-address": () => simpleFormPage("修改地址", "", `
      <label>收货人</label><div>${input()}</div><label>电话</label><div>${input()}</div>
      <label>地址</label><div class="span2">${input()}</div>`),
    "buyer-edit": () => simpleFormPage("编辑店铺资料", "", `
      <label>店铺名</label><div>${input("Liora Amour")}</div>
      <label>级别</label><div>${select(["A", "B", "C"])}</div>`),
    "buyer-sub": () => `<h1 class="page-title">查看/添加子店铺</h1>
      <table class="data-table"><thead><tr><th>子店铺</th><th>城市</th><th>操作</th></tr></thead>
      <tbody><tr><td>Liora Amour 静安</td><td>上海</td><td><a href="javascript:;">编辑</a></td></tr></tbody></table>
      <div style="margin-top:16px">${btn("新建子店铺")}</div>`,
    "buyer-add-brand": () => `<h1 class="page-title">添加品牌</h1>
      <div class="note">需求备注：暂不清楚需求。保留入口待客户确认业务含义（给买手开通某品牌？还是新建品牌主体？）。</div>
      <div class="form-grid"><label>选择品牌</label><div>${select(RR.brands.map(b => b.name))}</div>
      <label>备注</label><div>${input()}</div></div>
      <div class="action-bar">${btn("提交（示意）", "btn-outline")}</div>`,
    "buyer-appoint": () => simpleFormPage("添加预约", "代买手创建展会预约", `
      <label>品牌</label><div>${select(RR.brands.map(b => b.name))}</div>
      <label>时间</label><div>${input()}</div>`),
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
    const body = (pages[state.page] || pageGoodsList)();
    if (isBuyer) {
      app.innerHTML = toastHtml() + protoBar() + topnav("buyer") +
        `<div class="shell full-main"><div class="main">${body}</div></div>` + footer();
    } else {
      app.innerHTML = toastHtml() + protoBar() + topnav(state.portal) +
        `<div class="shell">${sidebar()}<div class="main">${body}</div></div>` + footer();
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
        const brand = el.getAttribute("data-brand");
        const sel = el.getAttribute("data-sel");
        const oid = el.getAttribute("data-oid");
        if (brand) state.selectedBrand = brand;
        if (sel) state.selectedSel = RR.selections.find(s => s.id === sel) || state.selectedSel;
        if (oid) state.selectedOrder = RR.orders.find(o => o.id === oid) || state.selectedOrder;
        go(el.getAttribute("data-go"));
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
    app.querySelectorAll("[data-tabsoft]").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.parentElement.querySelectorAll("button").forEach(b => b.classList.remove("on"));
        btn.classList.add("on");
      });
    });
    app.querySelectorAll("[data-recon]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.reconTab = btn.getAttribute("data-recon");
        render();
      });
    });
    app.querySelectorAll("[data-order-action]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.orderAction = btn.getAttribute("data-order-action");
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
      el.addEventListener("click", () => toast("已从选款单生成订单，选款单锁定不可改"));
    });
    app.querySelectorAll("[data-confirm-sel]").forEach(el => {
      el.addEventListener("click", () => {
        if (!state.hasFirstOrder) toast("拦截：本季未下过首单，不允许确认补货相关订单");
        else toast("选款单已生成订单，等待品牌/平台审核");
      });
    });
    app.querySelectorAll("[data-toggle-rule]").forEach(el => {
      el.addEventListener("click", () => {
        state.hasFirstOrder = !state.hasFirstOrder;
        toast(state.hasFirstOrder ? "已恢复：存在首单" : "已模拟：无首单（确认将被拦截）");
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
        if (el.classList.contains("btn-primary") || el.textContent.includes("去选款单")) {
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
        if (state.hearts.includes(sku)) {
          state.hearts = state.hearts.filter(x => x !== sku);
          state.cart = state.cart.filter(x => x !== sku);
        } else {
          state.hearts.push(sku);
          if (!state.cart.includes(sku)) state.cart.push(sku);
        }
        saveCart();
        render();
      });
    });
    // account center link
    app.querySelectorAll(".nav-right a").forEach(a => {
      if ((a.textContent || "").includes("账户中心")) {
        a.addEventListener("click", (e) => {
          e.preventDefault();
          if (state.portal === "buyer") go("buyer-profile");
          else go("account-center");
        });
      }
    });
  }

  // boot
  if (location.hash === "#app") {
    state.page = state.portal === "buyer" ? "buyer-home" : "goods-list";
  } else {
    state.page = "login";
  }
  render();
})();
