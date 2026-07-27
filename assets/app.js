(() => {
  const $ = (sel, el = document) => el.querySelector(sel);
  const app = $("#app");
  const state = {
    portal: localStorage.getItem("rr_portal") || "platform", // platform | brand | buyer | mp
    page: "login",
    roleLogin: "platform",
    selectedBrand: "HAIZHEN WANG",
    selectedGoods: null,
    cart: JSON.parse(localStorage.getItem("rr_cart") || "[]"),
    qty: { XS: 0, S: 2, M: 1, L: 0 },
    toast: ""
  };

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
          { id: "buyer-appoint", label: "添加预约" }
        ],
        role: [
          { id: "role-list", label: "角色管理" },
          { id: "role-perm", label: "权限管理" }
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
      side: null, // reuse platform side filtered
      defaultPage: "brand-list"
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
    else if (p === "brand") state.page = "brand-list";
    else state.page = "goods-list";
    render();
  }

  function go(page) {
    state.page = page;
    window.scrollTo(0, 0);
    render();
  }

  function topGroup(page) {
    if (page.startsWith("brand")) return "brand";
    if (page.startsWith("goods")) return "goods";
    if (page.startsWith("order")) return "order";
    if (page.startsWith("ship")) return "ship";
    if (page.startsWith("intent")) return "intent";
    if (page.startsWith("buyer-") && state.portal !== "buyer") return "buyer";
    if (page.startsWith("role")) return "role";
    if (page.startsWith("buyer-")) return page.replace("buyer-", "").split("-")[0] === "home" ? "home" : page.split("-")[1] || "home";
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
      <span style="margin-left:12px;opacity:.6">基于 order.roomroom.com.cn 现网风格</span>
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
      brand: "brand-list",
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
      // brand端去掉平台独占项
      if (group === "buyer" || group === "role") items = [];
      if (group === "order") {
        items = items.filter(i => !["order-recon"].includes(i.id));
      }
      if (group === "goods") {
        items = items.filter(i => i.id !== "goods-cat");
      }
    }
    if (!items.length) return "";
    return `<aside class="sidebar"><ul>
      ${items.map(i => `<li><a href="javascript:;" class="${state.page === i.id ? "active" : ""}" data-go="${i.id}">${i.label}</a></li>`).join("")}
    </ul></aside>`;
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
      <div class="note">首单 / 补货单分别设置最小起订金额；分类统一折扣；金额阶梯折扣；订货会场次单独配置</div>
      <div class="tabs">
        <button class="on">首单规则</button><button>补货单规则</button>
      </div>
      <div class="form-section">
        <h3>最小起订金额</h3>
        <div class="form-grid">
          <label>首单起订额</label><div>${input("例如 30000")}</div>
          <label>补货起订额</label><div>${input("例如 10000")}</div>
        </div>
      </div>
      <div class="form-section">
        <h3>分类统一折扣</h3>
        <table class="data-table">
          <thead><tr><th>品类</th><th>折扣</th></tr></thead>
          <tbody>
            <tr><td>女装</td><td>${input("0.45")}</td></tr>
            <tr><td>配饰</td><td>${input("0.50")}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="form-section">
        <h3>金额阶梯折扣</h3>
        <table class="data-table">
          <thead><tr><th>满额</th><th>折扣</th><th></th></tr></thead>
          <tbody>
            <tr><td>${input("50000")}</td><td>${input("0.43")}</td><td><a href="javascript:;">删除</a></td></tr>
            <tr><td>${input("100000")}</td><td>${input("0.40")}</td><td><a href="javascript:;">删除</a></td></tr>
          </tbody>
        </table>
        ${btn("添加阶梯", "btn-outline")}
      </div>
      ${btn("保存规则")}`;
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
      ${filterPanel([
        ["品牌", select(RR.brands.map(b => b.name))],
        ["季节", select(RR.seasons)],
        ["国家", input("输入国家")],
        ["省", input("输入省")],
        ["城市", input("输入城市")],
        ["店铺名", input("输入店铺名")]
      ])}
      ${orderTable(RR.selections, "查看详情 · 直接生成订单 · 取消选款单 · 下载")}`;
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
            <a href="javascript:;" data-go="order-detail">详情</a>
            <a href="javascript:;">下载</a>
            <a href="javascript:;">改单</a>
            <a href="javascript:;">白名单</a>
          </td>
        </tr>`).join("")}</tbody>
      </table>`;
  }

  function pageOrderDetail() {
    const o = RR.orders[0];
    return `<h1 class="page-title">订单详情</h1>
      <div class="detail-sticky">
        <strong>${o.brand}</strong>
        <span class="badge">${o.type}</span>
        <span>最小起订额 ¥30,000</span>
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
        <h3>订单操作</h3>
        <div class="ops">
          ${btn("确认定金并确认订单")}
          ${btn("增减款 / 设折扣", "btn-outline")}
          ${btn("上传付款凭证", "btn-outline")}
          ${btn("申请发票", "btn-outline")}
          ${btn("确认尾款", "btn-outline")}
          ${btn("分配子店铺", "btn-outline")}
          ${btn("退换货", "btn-outline")}
          ${btn("生成合同", "btn-outline")}
          ${btn("生成 OC", "btn-outline")}
        </div>
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
    return `<h1 class="page-title">对账管理</h1>
      <div class="note">抽佣比例 / 阶梯抽佣、品牌付款信息、抽佣单、代/抽发票、挂帐余额等财务功能</div>
      <div class="tabs">
        <button class="on">抽佣设置</button><button>抽佣单</button><button>发票</button><button>挂帐余额</button>
      </div>
      <div class="form-grid">
        <label>品牌</label><div>${select(RR.brands.map(b => b.name))}</div>
        <label>季节</label><div>${select(RR.seasons)}</div>
        <label>基础抽佣比例</label><div>${input("5%")}</div>
        <label>阶梯抽佣</label><div>${input("满 100万 → 4%")}</div>
      </div>
      <div style="margin-top:20px">${btn("保存")}</div>`;
  }

  function pageShip() {
    return `<h1 class="page-title">发货管理</h1>
      <div class="note">订单发货时生成发货单并关联订单，记录发货内容，可填物流单号</div>
      ${filterPanel([
        ["订单号", input()],
        ["品牌", select(RR.brands.map(b => b.name))],
        ["状态", select(["待发货", "部分发货", "已发货"])],
        ["物流单号", input()]
      ])}
      <table class="data-table">
        <thead><tr><th>发货单号</th><th>订单</th><th>品牌</th><th>店铺</th><th>物流单号</th><th>状态</th><th>操作</th></tr></thead>
        <tbody>
          <tr><td>SH-260321-01</td><td>ORD-20260319-088</td><td>JUNLI</td><td>B1OCK</td><td>${input("填写单号")}</td>
            <td><span class="badge">待发货</span></td>
            <td class="ops"><a href="javascript:;">编辑发货内容</a><a href="javascript:;">确认发货</a></td></tr>
        </tbody>
      </table>`;
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
    const goods = RR.goods.filter(g => g.brand === brand || brand === "HAIZHEN WANG");
    return `<div class="detail-sticky">
        <div class="brand-logo" style="width:48px;height:48px;font-size:9px">${brand.split(" ")[0]}</div>
        <div>
          <strong>${brand}</strong>
          <div style="font-size:12px;color:#666">先锋解构女装 · <a href="javascript:;" data-go="buyer-brand-about">查看全部介绍</a></div>
        </div>
        <div style="margin-left:auto;display:flex;gap:12px;align-items:center">
          ${select(RR.seasons, "选择季节")}
          <button class="btn btn-outline btn-sm">图片视图</button>
          <button class="btn btn-outline btn-sm">编码视图</button>
          ${input("搜索商品 / SKU")}
        </div>
      </div>
      <div class="product-grid">
        ${(goods.length ? goods : RR.goods).map(g => `
          <div class="product-card" data-go="buyer-detail" data-sku="${g.sku}">
            <button class="heart on" title="选款">♥</button>
            <div class="cover">LOOK</div>
            <div class="name">${g.title}</div>
            <div class="meta">${g.sku} · ¥${g.wholesale}</div>
          </div>`).join("")}
      </div>
      <div class="float-cart" data-go="buyer-selection">选款单 <span class="dot">3</span></div>`;
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

  function pageBuyerSelection() {
    return `<h1 class="page-title">我的选款单</h1>
      <div class="note">按品牌拆分卡片；同季无首单不可下补货；上一补货未完成不可新开</div>
      <div class="order-cards">
        ${RR.selections.map(s => `
          <div class="order-card">
            <div>
              <div class="title">${s.brand} · ${s.season}</div>
              <div class="meta">
                <span>${s.id}</span><span>${s.styles} 款</span><span>¥${s.amount}</span>
                <span class="badge">${s.status}</span>
              </div>
            </div>
            <div class="ops" style="flex-direction:column">
              ${btn("修改选款", "btn-outline btn-sm")}
              ${btn("下载", "btn-outline btn-sm")}
              ${btn("确认订单", "btn-primary btn-sm")}
            </div>
          </div>`).join("")}
      </div>`;
  }

  function pageBuyerOrders() {
    return `<h1 class="page-title">我的订单</h1>
      <div class="tabs">
        <button class="on">全部</button><button>未完成</button><button>已完成</button>
      </div>
      <div class="order-cards">
        ${RR.orders.map(o => `
          <div class="order-card">
            <div>
              <div class="title">${o.brand}</div>
              <div class="meta">
                <span>${o.id}</span><span>${o.season}</span><span>${o.type}</span>
                <span>¥${o.amount}</span><span class="badge">${o.status}</span>
              </div>
            </div>
            <div class="ops" style="flex-direction:column">
              ${btn("查看", "btn-outline btn-sm")}
              ${btn("下载 Excel", "btn-outline btn-sm")}
              ${o.status.includes("未确认") || o.status.includes("驳回") ? btn("修改", "btn-outline btn-sm") : ""}
              ${btn("确认提交", "btn-primary btn-sm")}
            </div>
          </div>`).join("")}
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
      <div class="note">同品牌板块结构；受首单/补货开关与订单完成状态约束</div>
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
            ${btn("提交预约", "btn-primary btn-block")}
          </div>
        </div>
      </div>`;
  }

  const pages = {
    login: pageLogin,
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
    "order-list": pageOrderList,
    "order-detail": pageOrderDetail,
    "order-replenish": () => {
      const html = pageOrderList();
      return html.replace(">订单管理<", ">补货单管理<").replace("订单管理</h1>", "补货单管理</h1>");
    },
    "order-contract": pageOrderContract,
    "order-oc": pageOrderOC,
    "order-style": pageOrderStyle,
    "order-realtime": pageOrderRealtime,
    "order-all-sel": pageOrderAllSel,
    "order-all": pageOrderAll,
    "order-analysis": pageOrderAnalysis,
    "order-appoint": pageOrderAppoint,
    "order-recon": pageOrderRecon,
    "ship-list": pageShip,
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
    "buyer-orders": pageBuyerOrders,
    "buyer-profile": pageBuyerProfile,
    "buyer-replenish": pageBuyerReplenish,
    "mp-home": pageMP
  };

  function render() {
    if (state.page === "login") {
      app.innerHTML = pageLogin();
      bind();
      return;
    }
    if (state.portal === "mp") {
      app.innerHTML = pageMP();
      bind();
      return;
    }

    const isBuyer = state.portal === "buyer";
    const body = (pages[state.page] || pageGoodsList)();
    if (isBuyer) {
      app.innerHTML = `${protoBar()}${topnav("buyer")}
        <div class="shell full-main"><div class="main">${body}</div></div>${footer()}`;
    } else {
      app.innerHTML = `${protoBar()}${topnav(state.portal)}
        <div class="shell">${sidebar()}<div class="main">${body}</div></div>${footer()}`;
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
        const brand = el.getAttribute("data-brand");
        if (brand) state.selectedBrand = brand;
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
        state.page = state.portal === "buyer" ? "buyer-home" : state.portal === "brand" ? "brand-list" : "goods-list";
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
    // tab buttons cosmetic
    app.querySelectorAll(".tabs button").forEach(btn => {
      btn.addEventListener("click", () => {
        btn.parentElement.querySelectorAll("button").forEach(b => b.classList.remove("on"));
        btn.classList.add("on");
      });
    });
  }

  // boot: show login first for client walkthrough
  if (location.hash === "#app") {
    state.page = state.portal === "buyer" ? "buyer-home" : "goods-list";
  } else {
    state.page = "login";
  }
  render();
})();
