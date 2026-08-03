/**
 * ROOMROOM prototype business store
 * Implements requirement-driven stateful operations (persisted in localStorage).
 */
(() => {
  const KEY = "rr_biz_v5";

  const DEFAULT_RULE = () => ({
    minAmount: 30000, cloth: 0.45, accessory: 0.5, lifestyle: 0.55,
    stairs: [{ amount: 50000, discount: 0.43 }, { amount: 100000, discount: 0.4 }]
  });
  const DEFAULT_REP_RULE = () => ({
    minAmount: 10000, cloth: 0.48, accessory: 0.52, lifestyle: 0.58,
    stairs: [{ amount: 30000, discount: 0.45 }]
  });

  const ORDER_FLOW = ["买手未确认", "买手已确认待品牌确认", "定金确认", "尾款确认", "已完成"];

  function uid(prefix) {
    const t = new Date();
    const stamp = `${t.getFullYear()}${String(t.getMonth() + 1).padStart(2, "0")}${String(t.getDate()).padStart(2, "0")}-${String(Math.floor(Math.random() * 900) + 100)}`;
    return `${prefix}-${stamp}`;
  }

  function money(n) {
    return Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function parseMoney(s) {
    return Number(String(s || "0").replace(/,/g, "")) || 0;
  }

  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }

  function inferGoodsType(g) {
    if (g.goodsType) return g.goodsType;
    if (g.cat === "配饰" || (g.brand || "").includes("KHIHO")) return "配饰";
    if (g.cat === "生活方式" || g.brand === "ROOMROOM" || g.brand === "OUDE WAAG") return "生活方式";
    return "服饰";
  }

  function enrichGoods(g, idx) {
    const cat = g.cat || (g.brand === "PRIVATE POLICY" || g.brand === "XIMONLEE" ? "男装"
      : (g.brand === "ROOMROOM" || g.brand === "OUDE WAAG" ? "生活方式"
        : (g.brand === "KHIHO" ? "配饰" : (g.brand === "ANGEL CHEN" ? "男女装" : "女装"))));
    return {
      ...g,
      cat,
      subcat: g.subcat || "外套",
      restock: g.restock !== false,
      hideInFirst: !!g.hideInFirst,
      hideAll: !!g.hideAll,
      linesheet: g.linesheet || "",
      color: g.color || ["藏青", "黑色", "米白", "灰色", "卡其", "酒红"][idx % 6],
      code: g.code || String(100 + (idx % 90)).padStart(3, "0"),
      sampleSize: g.sampleSize || (g.sizes && g.sizes[0]) || "M",
      goodsType: inferGoodsType({ ...g, cat }),
      carry: !!g.carry,
      isNew: g.isNew != null ? !!g.isNew : idx % 5 === 0
    };
  }

  function enrichLine(l, idx) {
    const g = (RR.goods || []).find(x => x.sku === l.sku) || {};
    const eg = enrichGoods({ ...g, ...l }, idx || 0);
    const sizes = l.sizes || Object.fromEntries((eg.sizes || ["S", "M", "L"]).map(sz => [sz, 0]));
    return {
      sku: l.sku || eg.sku,
      title: l.title || eg.title || l.sku,
      sizes: clone(sizes),
      price: l.price != null ? l.price : eg.wholesale,
      retail: l.retail != null ? l.retail : (eg.retail || money(parseMoney(eg.wholesale) / 0.45)),
      color: l.color || eg.color,
      sampleSize: l.sampleSize || eg.sampleSize,
      code: l.code || eg.code,
      goodsType: l.goodsType || eg.goodsType
    };
  }

  function linesForBrand(brand) {
    const gs = (RR.goods || []).filter(g => g.brand === brand && g.status !== "已删款").slice(0, 5);
    if (!gs.length) return clone(RR.selectionLines).map((l, i) => enrichLine(l, i));
    return gs.map((g, i) => enrichLine({
      sku: g.sku,
      title: g.title,
      sizes: Object.fromEntries((g.sizes || ["S", "M"]).map((sz, j) => [sz, j < 2 ? 1 : 0])),
      price: g.wholesale,
      retail: g.retail
    }, i));
  }

  function defaultDb() {
    return {
      goods: clone(RR.goods).map((g, i) => enrichGoods(g, i)),
      selections: clone(RR.selections).map((s, i) => ({
        ...s,
        createdAt: s.createdAt || s.date || s.time || "",
        locked: s.status === "已生成订单",
        lines: (s.brand === "IAN HYLTON" && i === 0
          ? clone(RR.selectionLines)
          : linesForBrand(s.brand)).map((l, j) => enrichLine(l, j))
      })),
      orders: clone(RR.orders).map((o, oi) => ({
        ...o,
        whitelist: false,
        paidDeposit: o.status === "定金确认" || o.status === "尾款确认" || o.status === "已完成" ? o.deposit : "0.00",
        paidTotal: o.status === "尾款确认" || o.status === "已完成" ? o.amount : "0.00",
        invoice: o.status === "尾款确认" || o.status === "已完成" ? { title: o.store, tax: "", amount: o.amount, type: "普通发票" } : null,
        voucher: o.status === "定金确认" || o.status === "尾款确认" || o.status === "已完成" ? { amount: o.deposit, at: "2026-07-20", file: "付款凭证.pdf" } : null,
        contractUploaded: o.status === "定金确认" || o.status === "尾款确认" || o.status === "已完成",
        materialsOk: o.status !== "买手未确认",
        substores: [],
        returns: [],
        discountLabel: o.brand === "KHIHO" ? "服饰:4.4折 / 配饰:4.4折" : "服饰:4.5折 / 配饰:5.0折",
        retailAmount: money(parseMoney(o.amount) / 0.45),
        lines: linesForBrand(o.brand).map((l, j) => ({
          sku: l.sku, title: l.title, sizes: clone(l.sizes), price: parseMoney(l.price), discount: 1,
          retail: parseMoney(l.retail), goodsType: l.goodsType, color: l.color, code: l.code, sampleSize: l.sampleSize
        })),
        createdAt: o.createdAt || ["2026-03-20 10:00", "2026-07-29 12:46", "2026-07-15 10:40"][oi % 3]
      })),
      buyers: clone(RR.buyers).map(b => ({ ...b, balances: { "HAIZHEN WANG": b.name === "Liora Amour" ? 2480 : 0, JUNLI: 0 }, addresses: [{ name: "收货人", phone: b.phone, addr: b.city }], invoice: { title: b.name, tax: "" }, substores: [] })),
      intentions: clone(RR.intentions),
      appointments: clone(RR.appointments),
      contracts: [
        { id: "CT-2026SS-088", orderId: "ORD-20260319-088", brand: "JUNLI", season: "2026SS", status: "已生成" },
        { id: "CT-2026SS-102", orderId: "ORD-20260320-102", brand: "HAIZHEN WANG", season: "2026SS", status: "待生成" },
        { id: "CT-2027PS-040", orderId: "ORD-20260715-040", brand: "IAN HYLTON", season: "2027PS", status: "已生成" },
        { id: "CT-2026SS-077", orderId: "ORD-20260628-077", brand: "SUSAN FANG", season: "2026SS", status: "已生成" },
        { id: "CT-2026SS-008", orderId: "ORD-20260501-008", brand: "self-portrait", season: "2026SS", status: "待生成" }
      ],
      ocs: [
        { id: "OC-20260319-088", orderId: "ORD-20260319-088", brand: "JUNLI", status: "可下载" },
        { id: "OC-20260715-040", orderId: "ORD-20260715-040", brand: "IAN HYLTON", status: "可下载" },
        { id: "OC-20260628-077", orderId: "ORD-20260628-077", brand: "SUSAN FANG", status: "可下载" },
        { id: "OC-20260320-102", orderId: "ORD-20260320-102", brand: "HAIZHEN WANG", status: "待生成" }
      ],
      shipments: [
        {
          id: "SH-260321-01", orderId: "ORD-20260319-088", brand: "JUNLI", store: "B1OCK",
          tracking: "SF1388291001", status: "待发货",
          lines: [
            { sku: "JL26SS001", size: "M", should: 4, actual: 4 },
            { sku: "JL26SS001", size: "L", should: 2, actual: 2 },
            { sku: "JL26SS014", size: "S", should: 3, actual: 2 },
            { sku: "JL26SS028", size: "M", should: 5, actual: 5 }
          ]
        },
        {
          id: "SH-260322-02", orderId: "ORD-20260320-102", brand: "HAIZHEN WANG", store: "Liora Amour",
          tracking: "", status: "待发货",
          lines: [
            { sku: "121BZX122", size: "S/6", should: 6, actual: 6 },
            { sku: "121DRX037G", size: "XS/4", should: 3, actual: 3 },
            { sku: "121PAX055", size: "M/8", should: 4, actual: 3 }
          ]
        },
        {
          id: "SH-260710-03", orderId: "ORD-20260715-040", brand: "IAN HYLTON", store: "IAN HYLTON POP-UP",
          tracking: "YT9988120033", status: "部分发货",
          lines: [
            { sku: "IH27PS001", size: "M", should: 20, actual: 18 },
            { sku: "IH27PS035", size: "L", should: 12, actual: 12 },
            { sku: "IH27PS022", size: "S", should: 15, actual: 10 }
          ]
        },
        {
          id: "SH-260601-04", orderId: "ORD-20260530-019", brand: "RENLI SU", store: "识季",
          tracking: "ZTO7788123456", status: "已发货",
          lines: [
            { sku: "RS26SS009", size: "M", should: 8, actual: 8 }
          ]
        }
      ],
      categories: [
        { name: "女装", children: ["外套", "连衣裙", "裤装", "裙装"], count: 1284 },
        { name: "男装", children: ["外套", "裤装", "上衣"], count: 642 },
        { name: "男女装", children: ["外套", "配饰交叉"], count: 318 },
        { name: "配饰", children: ["包袋", "鞋履", "首饰"], count: 520 },
        { name: "生活方式", children: ["香氛", "家居"], count: 210 }
      ],
      looks: [
        { id: 1, season: "2026SS", title: "Lookbook #1", skus: ["JL26SS001", "121BZX122"] },
        { id: 2, season: "2026SS", title: "Lookbook #2", skus: ["AC26SS088"] },
        { id: 3, season: "2025AW", title: "Lookbook #3", skus: ["MS26AW012"] },
        { id: 4, season: "2027PS", title: "Lookbook #4", skus: [] }
      ],
      roles: clone(RR.roles).map(r => ({
        ...r,
        flags: {
          商品管理: true,
          订单确认: r.name !== "商品管理员",
          定金确认: ["订单管理员", "品牌管理员", "高级管理员", "财务管理员"].includes(r.name),
          意向审核: ["品牌管理员", "高级管理员"].includes(r.name),
          买手管理: ["高级管理员"].includes(r.name),
          发票: ["品牌管理员", "财务管理员", "高级管理员"].includes(r.name),
          结佣: ["品牌管理员", "财务管理员", "高级管理员"].includes(r.name),
          财务审核: r.name === "财务管理员" || r.name === "高级管理员"
        }
      })),
      brandRules: {
        season: "2026SS",
        mode: "first", // first | replenish（已去掉订货会单独规则）
        bySeason: Object.fromEntries((RR.seasons || []).slice(-8).map(s => [s, {
          first: DEFAULT_RULE(),
          replenish: DEFAULT_REP_RULE()
        }]))
      },
      standardSizes: ["XS", "S", "M", "L", "XL", "XXL", "2", "4", "6", "8", "10", "34", "36", "38", "40", "均码"],
      sizeAliasList: [
        { standard: "XS", alias: "2" },
        { standard: "S", alias: "4" },
        { standard: "M", alias: "6" },
        { standard: "L", alias: "8" },
        { standard: "XL", alias: "10" }
      ],
      stylesMaster: [
        { id: "st1", name: "解构 / 先锋" },
        { id: "st2", name: "都市极简" },
        { id: "st3", name: "东方当代" },
        { id: "st4", name: "优雅实用" },
        { id: "st5", name: "梦幻材质" },
        { id: "st6", name: "英伦结构" },
        { id: "st7", name: "法式" },
        { id: "st8", name: "街头高级" }
      ],
      crowdsMaster: [
        { id: "cr1", name: "独立买手店" },
        { id: "cr2", name: "年轻买手" },
        { id: "cr3", name: "概念店" },
        { id: "cr4", name: "精品百货" },
        { id: "cr5", name: "集合店" },
        { id: "cr6", name: "潮流买手" },
        { id: "cr7", name: "生活馆" }
      ],
      catsMaster: ["女装", "男装", "男女装", "配饰", "生活方式"],
      fairs: Object.fromEntries((RR.seasons || []).map(s => [s, { first: true, replenish: true }])),
      orderingFairs: [
        { id: "FAIR-2027PS", name: "2027 Pre-Spring 订货会", season: "2027PS", cover: true, intro: "春季订货会图文介绍（展示位置待确认）", createdAt: "2026-06-01" },
        { id: "FAIR-2026SS", name: "2026 Spring/Summer 订货会", season: "2026SS", cover: true, intro: "夏季订货会说明", createdAt: "2025-11-12" }
      ],
      buyerMessages: [
        { id: "m1", title: "订单状态更新", time: "2026-07-28 10:20", body: "您的选款单已生成订单，请及时确认。", read: false },
        { id: "m2", title: "品牌权限通过", time: "2026-07-20 15:01", body: "您申请的品牌权限已通过。", read: true },
        { id: "m3", title: "系统通知", time: "2026-07-18 09:12", body: "新订货会已开放，欢迎选款。", read: false }
      ],
      payInfo: { account: "ROOMROOM 贸易有限公司", bank: "招商银行上海分行", no: "1219 **** **** 8899", sealContract: true, sealOc: true },
      contractSettings: { season: "2026SS", type: "经销", cycle: "45-60天", contact: "张经理", phone: "13800001111", email: "contract@roomroom.com", signDate: "2026-03-01", authStart: "2026-03-01", authEnd: "2026-09-30" },
      brandProfile: (() => {
        const b = clone(RR.brands[0]);
        return {
          ...b,
          cats: [b.cat].filter(Boolean),
          styles: String(b.style || "").split(/[/／、,，]/).map(x => x.trim()).filter(Boolean),
          crowds: String(b.crowd || "").split(/[/／、,，]/).map(x => x.trim()).filter(Boolean),
          designer: b.designer || "",
          about: b.about || ""
        };
      })(),
      recon: {
        rate: { brand: "JUNLI", season: "2026SS", base: "5%", stair: "满100万→4%" },
        bills: [
          { id: "CM-2026SS-01", brand: "JUNLI", season: "2026SS", base: 960000, rate: "5%", amount: 48000, status: "待确认" },
          { id: "CM-2026SS-02", brand: "HAIZHEN WANG", season: "2026SS", base: 1286000, rate: "5%", amount: 64300, status: "已确认" },
          { id: "CM-2027PS-01", brand: "IAN HYLTON", season: "2027PS", base: 1843120, rate: "4.5%", amount: 82940, status: "待确认" },
          { id: "CM-2026SS-03", brand: "SUSAN FANG", season: "2026SS", base: 156800, rate: "5%", amount: 7840, status: "已确认" }
        ],
        invoices: [
          { type: "代开发票", brand: "JUNLI", amount: 48000, status: "待开" },
          { type: "抽佣发票", brand: "HAIZHEN WANG", amount: 64300, status: "已开" },
          { type: "代开发票", brand: "IAN HYLTON", amount: 82940, status: "待开" },
          { type: "抽佣发票", brand: "SUSAN FANG", amount: 7840, status: "已开" }
        ],
        balances: [
          { brand: "JUNLI", store: "B1OCK", amount: 12400 },
          { brand: "HAIZHEN WANG", store: "Liora Amour", amount: 2480 },
          { brand: "IAN HYLTON", store: "IAN HYLTON POP-UP", amount: 18600 },
          { brand: "ANGEL CHEN", store: "Felix", amount: 0 }
        ],
        payinfo: { brand: "JUNLI", account: "", bank: "", no: "" }
      },
      buyerSession: {
        store: "Liora Amour",
        phone: "13681383088",
        level: "B",
        city: "北京市",
        cat: "全部",
        season: "全部",
        search: "",
        carryOnly: false,
        newOnly: false,
        orderTab: "全部",
        addresses: [{ name: "王女士", phone: "13681383088", addr: "北京市朝阳区…" }],
        invoice: { title: "Liora Amour 商贸有限公司", tax: "" },
        selections: [],
        hasFirstOrderBySeason: { "2026SS": true, "2025AW": true, "2027PS": false },
        openReplenish: {},
        /* granted | pending | denied — 缺省视为 granted */
        brandAccess: { "PRIVATE POLICY": "denied", "XIMONLEE": "denied" },
        substores: [{ name: "Liora Amour 静安", city: "上海" }]
      },
      kingdee: {
        lastPush: "",
        lastPull: "",
        status: "未同步",
        logs: []
      },
      ui: {
        goodsFilter: { carry: "全部", linesheet: "", sku: "", cat: "全部", subcat: "全部", brand: "全部", title: "", season: "全部" },
        orderFilter: { brand: "全部", season: "全部", type: "全部", status: "全部", store: "", id: "" },
        selectionFilter: { brand: "全部", season: "全部", store: "" },
        buyerFilter: { keyword: "", levelTab: "全部" },
        styleDim: "sku",
        styleExpand: "",
        styleFilter: { start: "", end: "", brand: "全部", season: "全部", status: "全部", type: "全部" },
        realtimeFilter: { start: "2026-07-01", end: "2026-07-30", season: "全部", type: "全部", status: "全部" },
        discountMode: "first",
        discountSeason: "2026SS",
        restockBrand: "",
        restockKind: "", // restock | hide
        restockSeason: "全部",
        listPage: 1,
        realtimeBrand: ""
      }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultDb();
      const db = JSON.parse(raw);
      const base = defaultDb();
      const merged = { ...base, ...db, ui: { ...base.ui, ...(db.ui || {}) }, buyerSession: { ...base.buyerSession, ...(db.buyerSession || {}) } };
      if (!merged.buyerSession.brandAccess) merged.buyerSession.brandAccess = clone(base.buyerSession.brandAccess);
      if (!merged.buyerSession.substores) merged.buyerSession.substores = clone(base.buyerSession.substores);
      if (!merged.kingdee) merged.kingdee = clone(base.kingdee);
      // 兼容旧 brandRules（无 bySeason）
      if (!merged.brandRules || !merged.brandRules.bySeason) {
        merged.brandRules = base.brandRules;
      }
      if (!merged.sizeAliasList) merged.sizeAliasList = base.sizeAliasList;
      if (!merged.standardSizes) merged.standardSizes = base.standardSizes;
      if (!merged.stylesMaster) merged.stylesMaster = base.stylesMaster;
      if (!merged.crowdsMaster) merged.crowdsMaster = base.crowdsMaster;
      if (!merged.catsMaster) merged.catsMaster = base.catsMaster;
      if (!merged.orderingFairs) merged.orderingFairs = clone(base.orderingFairs || []);
      if (!merged.buyerMessages) merged.buyerMessages = clone(base.buyerMessages || []);
      if (merged.buyerSession.newOnly == null) merged.buyerSession.newOnly = false;
      if (Array.isArray(merged.goods)) {
        const have = new Set(merged.goods.map(g => g.sku));
        (base.goods || []).forEach(g => {
          if (!have.has(g.sku)) merged.goods.push(clone(g));
        });
        merged.goods = merged.goods.map((g, i) => ({
          ...g,
          carry: !!g.carry,
          isNew: g.isNew != null ? !!g.isNew : i % 5 === 0,
          code: g.code || enrichGoods(g, i).code
        }));
      }
      if (merged.brandProfile && !Array.isArray(merged.brandProfile.cats)) {
        const b = merged.brandProfile;
        merged.brandProfile = {
          ...b,
          cats: b.cats || [b.cat].filter(Boolean),
          styles: b.styles || String(b.style || "").split(/[/／、,，]/).map(x => x.trim()).filter(Boolean),
          crowds: b.crowds || String(b.crowd || "").split(/[/／、,，]/).map(x => x.trim()).filter(Boolean)
        };
      }
      return merged;
    } catch (e) {
      return defaultDb();
    }
  }

  let db = load();

  function save() {
    localStorage.setItem(KEY, JSON.stringify(db));
  }

  function syncLegacy() {
    // keep window.RR mirrors for pages still reading RR.*
    RR.goods = db.goods;
    RR.selections = db.selections;
    RR.orders = db.orders;
    RR.buyers = db.buyers;
    RR.intentions = db.intentions;
    RR.appointments = db.appointments;
    RR.roles = db.roles;
    RR.selectionLines = (db.selections[0] && db.selections[0].lines) || RR.selectionLines;
  }

  const Store = {
    ORDER_FLOW,
    money,
    parseMoney,
    get db() { return db; },
    reset() { db = defaultDb(); save(); syncLegacy(); },
    persist() { save(); syncLegacy(); },

    // ----- filters -----
    setGoodsFilter(patch) { Object.assign(db.ui.goodsFilter, patch); save(); },
    filteredGoods() {
      const f = db.ui.goodsFilter;
      return db.goods.filter(g => {
        if (f.carry === "是" && !g.carry) return false;
        if (f.carry === "否" && g.carry) return false;
        if (f.sku && !g.sku.toLowerCase().includes(f.sku.toLowerCase())) return false;
        if (f.title && !g.title.toLowerCase().includes(f.title.toLowerCase())) return false;
        if (f.brand !== "全部" && g.brand !== f.brand) return false;
        if (f.season !== "全部" && g.season !== f.season) return false;
        if (f.cat !== "全部" && g.cat !== f.cat) return false;
        if (f.linesheet && !(g.linesheet || "").includes(f.linesheet)) return false;
        return true;
      });
    },

    setOrderFilter(patch) { Object.assign(db.ui.orderFilter, patch); save(); },
    filteredOrders(forceType) {
      const f = db.ui.orderFilter;
      return db.orders.filter(o => {
        if (forceType && o.type !== forceType) return false;
        if (!forceType && f.type !== "全部" && o.type !== f.type) return false;
        if (f.brand !== "全部" && o.brand !== f.brand) return false;
        if (f.season !== "全部" && o.season !== f.season) return false;
        if (f.status !== "全部" && o.status !== f.status) return false;
        if (f.store && !o.store.includes(f.store)) return false;
        if (f.id && !o.id.includes(f.id)) return false;
        return true;
      });
    },

    filteredSelections() {
      const f = db.ui.selectionFilter;
      return db.selections.filter(s => {
        if (f.brand !== "全部" && s.brand !== f.brand) return false;
        if (f.season !== "全部" && s.season !== f.season) return false;
        if (f.store && !s.store.includes(f.store)) return false;
        return true;
      });
    },

    // ----- goods -----
    toggleDelete(sku) {
      const g = db.goods.find(x => x.sku === sku);
      if (!g) return "商品不存在";
      g.status = g.status === "已删款" ? "正常" : "已删款";
      save(); syncLegacy();
      return g.status === "已删款" ? `已删款 ${sku}` : `已取消删款 ${sku}`;
    },
    setCarry(map) {
      db.goods.forEach(g => { if (map.hasOwnProperty(g.sku)) g.carry = !!map[g.sku]; });
      save(); syncLegacy();
      return "Carry Over 已保存";
    },
    saveRestock(rows) {
      rows.forEach(r => {
        const g = db.goods.find(x => x.sku === r.sku);
        if (!g) return;
        if (r.restock != null) g.restock = r.restock;
        if (r.hideAll != null) g.hideAll = r.hideAll;
        // 兼容旧字段：隐藏不区分首单补单
        if (r.hideAll) g.hideInFirst = true;
      });
      save(); syncLegacy();
      return "补货/隐藏设置已保存";
    },
    batchSetRestock(brand, season, kind, value) {
      let n = 0;
      db.goods.forEach(g => {
        if (g.brand !== brand) return;
        if (season && season !== "全部" && g.season !== season) return;
        if (kind === "restock") g.restock = !!value;
        if (kind === "hide") {
          g.hideAll = !!value;
          g.hideInFirst = !!value;
        }
        n += 1;
      });
      save(); syncLegacy();
      return `已批量更新 ${n} 款（${brand}${season && season !== "全部" ? " · " + season : ""}）`;
    },
    addGoods(payload) {
      if (!payload.sku || !payload.title || !payload.brand) return { ok: false, msg: "请填写品牌、款式名称、SKU" };
      if (db.goods.some(g => g.sku === payload.sku)) return { ok: false, msg: "SKU 已存在" };
      db.goods.unshift({
        sku: payload.sku,
        brand: payload.brand,
        season: payload.season || "2026SS",
        title: payload.title,
        sizes: (payload.sizes || "S,M,L").split(/[,，\s]+/).filter(Boolean),
        retail: money(payload.retail || 0),
        wholesale: money(payload.wholesale || 0),
        status: "正常",
        carry: !!payload.carry,
        cat: payload.cat || "女装",
        subcat: payload.subcat || "",
        restock: true,
        hideInFirst: false,
        linesheet: payload.linesheet || ""
      });
      save(); syncLegacy();
      return { ok: true, msg: `商品 ${payload.sku} 已添加` };
    },
    batchImport(brand, cat, count = 3) {
      for (let i = 0; i < count; i++) {
        const sku = `BAT${Date.now().toString().slice(-6)}${i}`;
        db.goods.unshift({
          sku, brand, season: "2026SS", title: `批量导入款 ${i + 1}`,
          sizes: ["S", "M", "L"], retail: "3,000.00", wholesale: "1,350.00",
          status: "正常", carry: false, cat, subcat: "", restock: true, hideInFirst: false, linesheet: "BATCH"
        });
      }
      save(); syncLegacy();
      return `已批量导入 ${count} 个商品到 ${brand}/${cat}`;
    },

    // ----- brand settings -----
    ensureSeasonRules(season) {
      const s = season || db.ui.discountSeason || db.brandRules.season || "2026SS";
      db.brandRules.bySeason = db.brandRules.bySeason || {};
      if (!db.brandRules.bySeason[s]) {
        db.brandRules.bySeason[s] = { first: DEFAULT_RULE(), replenish: DEFAULT_REP_RULE() };
      }
      return s;
    },
    getDiscountRules(season, mode) {
      const s = Store.ensureSeasonRules(season || db.ui.discountSeason || db.brandRules.season);
      const m = mode || db.ui.discountMode || db.brandRules.mode || "first";
      const pack = db.brandRules.bySeason[s];
      return pack[m === "replenish" ? "replenish" : "first"] || DEFAULT_RULE();
    },
    setDiscountMode(mode) {
      if (mode === "fair") mode = "first";
      db.ui.discountMode = mode;
      db.brandRules.mode = mode;
      save();
    },
    setDiscountSeason(season) {
      db.ui.discountSeason = season;
      db.brandRules.season = season;
      Store.ensureSeasonRules(season);
      save();
    },
    saveDiscountRules(rules) {
      const season = Store.ensureSeasonRules(db.ui.discountSeason || db.brandRules.season);
      const mode = (db.ui.discountMode || "first") === "replenish" ? "replenish" : "first";
      db.brandRules.bySeason[season][mode] = rules;
      save();
      return `${season} · ${mode === "first" ? "首单" : "补货单"}规则已保存`;
    },
    saveSizeAliasList(list) {
      db.sizeAliasList = list || [];
      // 兼容旧 map 读取
      db.sizeAlias = Object.fromEntries(db.sizeAliasList.map(x => [x.standard, x.alias]));
      save();
      return "尺寸别名已保存";
    },
    addSizeAlias(standard, alias) {
      if (!standard || !alias) return { ok: false, msg: "请选择标准尺码并填写别名" };
      db.sizeAliasList = db.sizeAliasList || [];
      if (db.sizeAliasList.some(x => x.standard === standard && x.alias === alias)) {
        return { ok: false, msg: "该别名已存在" };
      }
      db.sizeAliasList.push({ standard, alias: String(alias).trim() });
      return { ok: true, msg: Store.saveSizeAliasList(db.sizeAliasList) };
    },
    removeSizeAlias(idx) {
      db.sizeAliasList.splice(idx, 1);
      Store.saveSizeAliasList(db.sizeAliasList);
      return "已删除别名，可重新提交";
    },
    saveMasterList(kind, list) {
      if (kind === "styles") db.stylesMaster = list;
      if (kind === "crowds") db.crowdsMaster = list;
      if (kind === "sizes") db.standardSizes = list;
      save();
      return "主数据已保存";
    },
    addMasterItem(kind, name) {
      const n = String(name || "").trim();
      if (!n) return { ok: false, msg: "请输入名称" };
      if (kind === "styles") {
        if (db.stylesMaster.some(x => x.name === n)) return { ok: false, msg: "风格已存在" };
        db.stylesMaster.push({ id: "st" + Date.now(), name: n });
      } else if (kind === "crowds") {
        if (db.crowdsMaster.some(x => x.name === n)) return { ok: false, msg: "人群已存在" };
        db.crowdsMaster.push({ id: "cr" + Date.now(), name: n });
      } else if (kind === "sizes") {
        if (db.standardSizes.includes(n)) return { ok: false, msg: "尺码已存在" };
        db.standardSizes.push(n);
      } else return { ok: false, msg: "未知主数据类型" };
      save();
      return { ok: true, msg: "已新增" };
    },
    removeMasterItem(kind, idOrName) {
      if (kind === "styles") db.stylesMaster = db.stylesMaster.filter(x => x.id !== idOrName && x.name !== idOrName);
      else if (kind === "crowds") db.crowdsMaster = db.crowdsMaster.filter(x => x.id !== idOrName && x.name !== idOrName);
      else if (kind === "sizes") db.standardSizes = db.standardSizes.filter(x => x !== idOrName);
      save();
      return "已删除";
    },
    renameMasterItem(kind, idOrName, newName) {
      const n = String(newName || "").trim();
      if (!n) return { ok: false, msg: "名称不能为空" };
      if (kind === "styles") {
        const row = db.stylesMaster.find(x => x.id === idOrName || x.name === idOrName);
        if (!row) return { ok: false, msg: "未找到" };
        if (db.stylesMaster.some(x => x.name === n && x.id !== row.id)) return { ok: false, msg: "风格已存在" };
        row.name = n;
      } else if (kind === "crowds") {
        const row = db.crowdsMaster.find(x => x.id === idOrName || x.name === idOrName);
        if (!row) return { ok: false, msg: "未找到" };
        if (db.crowdsMaster.some(x => x.name === n && x.id !== row.id)) return { ok: false, msg: "人群已存在" };
        row.name = n;
      } else if (kind === "sizes") {
        const i = db.standardSizes.indexOf(idOrName);
        if (i < 0) return { ok: false, msg: "未找到" };
        if (db.standardSizes.includes(n) && n !== idOrName) return { ok: false, msg: "尺码已存在" };
        db.standardSizes[i] = n;
        // 同步别名列表中的标准尺码名
        (db.sizeAliasList || []).forEach(a => { if (a.standard === idOrName) a.standard = n; });
      } else return { ok: false, msg: "未知主数据类型" };
      save();
      return { ok: true, msg: "已修改" };
    },
    setFair(season, patch) {
      db.fairs[season] = { ...(db.fairs[season] || { first: true, replenish: true }), ...patch };
      save();
      return `${season} 订货会设置已更新`;
    },
    createOrderingFair(payload) {
      const name = String(payload.name || "").trim();
      if (!name) return { ok: false, msg: "请填写订货会名称" };
      const id = uid("FAIR");
      db.orderingFairs = db.orderingFairs || [];
      db.orderingFairs.unshift({
        id,
        name,
        season: payload.season || (RR.seasons && RR.seasons[RR.seasons.length - 1]) || "",
        cover: !!payload.cover,
        intro: payload.intro || "",
        createdAt: new Date().toISOString().slice(0, 10)
      });
      save();
      return { ok: true, msg: `已创建订货会 ${name}`, id };
    },
    markMessagesRead() {
      (db.buyerMessages || []).forEach(m => { m.read = true; });
      save();
    },
    unreadMessageCount() {
      return (db.buyerMessages || []).filter(m => !m.read).length;
    },
    savePayInfo(info) { Object.assign(db.payInfo, info); save(); return "收款设置已保存"; },
    saveContractSettings(info) { Object.assign(db.contractSettings, info); save(); return "合同设置已保存"; },
    saveBrandProfile(info) {
      const cats = info.cats || db.brandProfile.cats || [];
      const styles = info.styles || db.brandProfile.styles || [];
      const crowds = info.crowds || db.brandProfile.crowds || [];
      Object.assign(db.brandProfile, info, {
        cats, styles, crowds,
        cat: cats[0] || info.cat || db.brandProfile.cat,
        style: styles.join(" / "),
        crowd: crowds.join(" / ")
      });
      // sync into RR.brands for buyer about
      const rb = RR.brands.find(x => x.name === db.brandProfile.name);
      if (rb) Object.assign(rb, { about: db.brandProfile.about, cat: db.brandProfile.cat, style: db.brandProfile.style, crowd: db.brandProfile.crowd });
      save();
      return "品牌资料已保存";
    },

    // ----- selections / orders -----
    genOrderFromSelection(selId) {
      const s = db.selections.find(x => x.id === selId);
      if (!s) return { ok: false, msg: "选款单不存在" };
      if (s.locked || s.status === "已生成订单") return { ok: false, msg: "选款单已生成订单，不可重复生成" };
      if (s.status === "已取消") return { ok: false, msg: "选款单已取消" };

      // replenishment rule if season has no first order for this store (platform mock: check buyerSession for Liora, else allow)
      const fair = db.fairs[s.season] || { first: true, replenish: true };
      if (!fair.first && !fair.replenish) return { ok: false, msg: `${s.season} 订货会已关闭，不可下单` };

      const orderId = uid("ORD");
      const amountNum = parseMoney(s.amount);
      const depositNum = amountNum * 0.3;
      db.orders.unshift({
        id: orderId,
        brand: s.brand,
        season: s.season,
        store: s.store,
        type: "首单",
        amount: money(amountNum),
        deposit: money(depositNum),
        status: "买手未确认",
        whitelist: false,
        paidDeposit: "0.00",
        paidTotal: "0.00",
        invoice: null,
        voucher: null,
        substores: [],
        returns: [],
        lines: clone(s.lines || []).map(l => ({
          sku: l.sku, title: l.title, sizes: clone(l.sizes), price: parseMoney(l.price), discount: 1
        })),
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        fromSelection: s.id
      });
      s.status = "已生成订单";
      s.locked = true;
      save(); syncLegacy();
      return { ok: true, msg: `已生成订单 ${orderId}`, orderId };
    },
    cancelSelection(selId) {
      const s = db.selections.find(x => x.id === selId);
      if (!s) return "选款单不存在";
      if (s.locked) return "已生成订单的选款单不可取消，需先驳回订单";
      s.status = "已取消";
      save(); syncLegacy();
      return `选款单 ${selId} 已取消`;
    },
    saveSelectionLines(selId, lines) {
      const s = db.selections.find(x => x.id === selId);
      if (!s) return { ok: false, msg: "选款单不存在" };
      if (s.locked) return { ok: false, msg: "选款单已锁定，需后台驳回订单后才能修改" };
      s.lines = (lines || []).map((l, i) => enrichLine(l, i));
      const q = Store.selectionQuote(s.lines);
      s.pieces = q.pieces;
      s.skus = s.lines.length;
      s.amount = money(q.wholesale);
      s.retailAmount = money(q.retail);
      save(); syncLegacy();
      return { ok: true, msg: "选款单已保存", quote: q };
    },
    bumpSelectionQty(selId, sku, size, d) {
      const s = db.selections.find(x => x.id === selId);
      if (!s) return { ok: false, msg: "选款单不存在" };
      if (s.locked) return { ok: false, msg: "选款单已锁定" };
      const line = (s.lines || []).find(x => x.sku === sku);
      if (!line) return { ok: false, msg: "款式不存在" };
      line.sizes = line.sizes || {};
      line.sizes[size] = Math.max(0, Number(line.sizes[size] || 0) + Number(d || 0));
      return Store.saveSelectionLines(selId, s.lines);
    },
    removeSelectionLine(selId, sku) {
      const s = db.selections.find(x => x.id === selId);
      if (!s) return { ok: false, msg: "选款单不存在" };
      return Store.saveSelectionLines(selId, (s.lines || []).filter(l => l.sku !== sku));
    },
    addSelectionLine(selId, sku) {
      const s = db.selections.find(x => x.id === selId);
      if (!s) return { ok: false, msg: "选款单不存在" };
      if (s.locked) return { ok: false, msg: "选款单已锁定" };
      if ((s.lines || []).some(l => l.sku === sku)) return { ok: false, msg: "该款已在选款单中" };
      const g = db.goods.find(x => x.sku === sku);
      if (!g) return { ok: false, msg: "商品不存在" };
      if (g.brand !== s.brand) return { ok: false, msg: "只能添加本品牌款式（选款单按品牌独立）" };
      const sizes = Object.fromEntries((g.sizes || ["S", "M", "L"]).map(sz => [sz, sz === (g.sampleSize || "M") || sz === "M" ? 1 : 0]));
      s.lines = s.lines || [];
      s.lines.push(enrichLine({ sku: g.sku, title: g.title, sizes, price: g.wholesale, retail: g.retail }, s.lines.length));
      return Store.saveSelectionLines(selId, s.lines);
    },
    selectionQuote(lines, ruleMode, season) {
      const rules = Store.getDiscountRules(season || db.ui.discountSeason, ruleMode);
      const groups = {
        服饰: { key: "cloth", pieces: 0, retail: 0 },
        配饰: { key: "accessory", pieces: 0, retail: 0 },
        生活方式: { key: "lifestyle", pieces: 0, retail: 0 }
      };
      (lines || []).forEach(l => {
        const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
        const type = l.goodsType || "服饰";
        const g = groups[type] || groups["服饰"];
        g.pieces += qty;
        g.retail += qty * parseMoney(l.retail != null ? l.retail : (parseMoney(l.price) / 0.45));
      });
      const retail = Object.values(groups).reduce((a, g) => a + g.retail, 0);
      const pieces = Object.values(groups).reduce((a, g) => a + g.pieces, 0);
      const stairs = [...(rules.stairs || [])].sort((a, b) => a.amount - b.amount);
      const activeStair = [...stairs].reverse().find(st => retail >= st.amount) || null;
      const nextStair = stairs.find(st => retail < st.amount) || null;
      const types = Object.entries(groups).map(([name, g]) => {
        const base = Number(rules[g.key] || 0.45);
        const disc = activeStair ? Number(activeStair.discount) : base;
        return {
          name,
          pieces: g.pieces,
          retail: g.retail,
          discount: disc,
          discountLabel: (disc * 10).toFixed(1).replace(/\.0$/, "") + "折",
          nextGap: nextStair ? Math.max(0, nextStair.amount - retail) : 0,
          nextDiscountLabel: nextStair ? (Number(nextStair.discount) * 10).toFixed(1).replace(/\.0$/, "") + "折" : ""
        };
      }).filter(t => t.pieces > 0 || t.retail > 0);
      let wholesale = 0;
      types.forEach(t => { wholesale += t.retail * t.discount; });
      // lines with 0 type still count via fallback
      if (!types.length) {
        (lines || []).forEach(l => {
          const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
          wholesale += qty * parseMoney(l.price);
        });
      }
      return {
        pieces,
        skus: (lines || []).length,
        retail,
        wholesale,
        minAmount: Number(rules.minAmount || 0),
        minGap: Math.max(0, Number(rules.minAmount || 0) - retail),
        types,
        nextStair,
        activeStair
      };
    },
    draftQuote(brand) {
      const items = db.buyerSession.selections.filter(x => !brand || x.brand === brand);
      const toLine = (i, idx, forceOne) => {
        const g = db.goods.find(x => x.sku === i.sku) || i;
        let sizes = i.sizes || Object.fromEntries((g.sizes || ["S", "M", "L"]).map(sz => [sz, 0]));
        const hasQty = Object.values(sizes).some(v => Number(v) > 0);
        if (forceOne && !hasQty) {
          sizes = Object.fromEntries(Object.keys(sizes).map((sz, j) => [sz, j === 0 ? 1 : 0]));
        }
        return enrichLine({
          sku: i.sku, title: i.title || g.title, sizes,
          price: i.wholesale || g.wholesale, retail: g.retail, goodsType: g.goodsType,
          color: g.color, sampleSize: g.sampleSize, code: g.code
        }, idx);
      };
      const lines = items.map((i, idx) => toLine(i, idx, false));
      const quoteLines = items.map((i, idx) => toLine(i, idx, true));
      return { items, lines, quote: Store.selectionQuote(quoteLines), brand: brand || (items[0] && items[0].brand) || "" };
    },
    bumpDraftQty(sku, size, d) {
      const item = db.buyerSession.selections.find(x => x.sku === sku);
      if (!item) return { ok: false, msg: "未在选款中" };
      const g = db.goods.find(x => x.sku === sku);
      item.sizes = item.sizes || Object.fromEntries((g && g.sizes || ["S", "M", "L"]).map(sz => [sz, 0]));
      item.sizes[size] = Math.max(0, Number(item.sizes[size] || 0) + Number(d || 0));
      save();
      return { ok: true, msg: "数量已更新" };
    },
    orderPendingTips(o) {
      const tips = [];
      if (!o) return tips;
      if (o.status === "买手未确认" || o.status.includes("驳回")) tips.push("待买手确认订单");
      if (o.status === "买手已确认待品牌确认") tips.push("待确认定金和合同");
      if (!o.materialsOk && o.status !== "已完成") tips.push("待补充材料");
      if (!o.contractUploaded && !["尾款确认", "已完成"].includes(o.status)) tips.push("待上传合同");
      if (!o.voucher && !["尾款确认", "已完成"].includes(o.status)) tips.push("待上传付款凭证");
      if (o.status === "定金确认") tips.push("待确认尾款");
      return tips;
    },

    advanceOrder(orderId, action, payload = {}) {
      const o = db.orders.find(x => x.id === orderId);
      if (!o) return { ok: false, msg: "订单不存在" };

      if (action === "buyerConfirm") {
        if (o.status !== "买手未确认" && !o.status.includes("驳回")) return { ok: false, msg: "当前状态不可买手确认" };
        o.status = "买手已确认待品牌确认";
      } else if (action === "depositConfirm") {
        if (!o.status.includes("待品牌确认") && o.status !== "买手已确认待品牌确认") return { ok: false, msg: "需买手已确认后才能设定金" };
        const ratio = Number(payload.ratio || 0.3);
        o.deposit = money(parseMoney(o.amount) * ratio);
        o.paidDeposit = o.deposit;
        o.status = "定金确认";
      } else if (action === "finalConfirm") {
        if (o.status !== "定金确认") return { ok: false, msg: "需定金确认后才能确认尾款" };
        o.paidTotal = o.amount;
        o.status = "尾款确认";
      } else if (action === "reject") {
        o.status = "已驳回";
        if (o.fromSelection) {
          const s = db.selections.find(x => x.id === o.fromSelection);
          if (s) { s.locked = false; s.status = "待确认"; }
        }
      } else if (action === "whitelist") {
        o.whitelist = true;
        return { ok: true, msg: "已设为白名单，允许低于起订量继续流转" };
      } else if (action === "invoice") {
        o.invoice = { title: payload.title || o.store, tax: payload.tax || "", amount: o.amount, type: payload.type || "普通发票", at: new Date().toISOString() };
      } else if (action === "voucher") {
        o.voucher = { amount: payload.amount || o.deposit, at: payload.at || new Date().toISOString().slice(0, 10), file: "付款凭证.pdf" };
        if (o.status === "定金确认" || o.status === "买手已确认待品牌确认") {
          o.paidDeposit = payload.amount || o.deposit;
        }
      } else if (action === "substore") {
        o.substores = payload.rows || [];
      } else if (action === "return") {
        o.returns = o.returns || [];
        o.returns.push({ type: payload.type || "退货", sku: payload.sku, qty: Number(payload.qty || 1), reason: payload.reason || "", at: new Date().toISOString() });
      } else if (action === "modify") {
        o.lines = payload.lines || o.lines;
        let amount = 0;
        o.lines.forEach(l => {
          const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
          amount += qty * Number(l.price || 0) * Number(l.discount || 1);
        });
        o.amount = money(amount);
        o.deposit = money(amount * 0.3);
      } else if (action === "complete") {
        o.status = "已完成";
      } else {
        return { ok: false, msg: "未知操作" };
      }
      save(); syncLegacy();
      return { ok: true, msg: `订单 ${o.id} → ${o.status}` };
    },

    createContract(orderId) {
      const o = db.orders.find(x => x.id === orderId);
      if (!o) return { ok: false, msg: "订单不存在" };
      let c = db.contracts.find(x => x.orderId === orderId);
      if (!c) {
        c = { id: uid("CT"), orderId, brand: o.brand, season: o.season, status: "已生成" };
        db.contracts.unshift(c);
      } else c.status = "已生成";
      save();
      return { ok: true, msg: `合同 ${c.id} 已生成`, id: c.id };
    },
    createOc(orderId) {
      const o = db.orders.find(x => x.id === orderId);
      if (!o) return { ok: false, msg: "订单不存在" };
      let oc = db.ocs.find(x => x.orderId === orderId);
      if (!oc) {
        oc = { id: uid("OC"), orderId, brand: o.brand, status: "可下载" };
        db.ocs.unshift(oc);
      } else oc.status = "可下载";
      save();
      return { ok: true, msg: `OC ${oc.id} 已生成，可下载`, id: oc.id };
    },

    // ----- ship -----
    saveShipment(id, patch) {
      const s = db.shipments.find(x => x.id === id);
      if (!s) return "发货单不存在";
      Object.assign(s, patch);
      save();
      return "发货明细已保存";
    },
    confirmShipment(id) {
      const s = db.shipments.find(x => x.id === id);
      if (!s) return { ok: false, msg: "发货单不存在" };
      s.status = "已发货";
      // balance for short ship
      let diff = 0;
      (s.lines || []).forEach(l => {
        const short = Math.max(0, Number(l.should || 0) - Number(l.actual || 0));
        diff += short;
      });
      if (diff > 0) {
        const buyer = db.buyers.find(b => b.name === s.store);
        if (buyer) {
          buyer.balances = buyer.balances || {};
          buyer.balances[s.brand] = (buyer.balances[s.brand] || 0) + diff * 100; // mock amount
        }
      }
      save(); syncLegacy();
      return { ok: true, msg: diff ? `已发货，差额 ${diff} 件已转余额` : "已确认发货" };
    },

    // ----- buyers / intentions -----
    setIntention(store, brand, status) {
      const i = db.intentions.find(x => x.store === store && x.brand === brand);
      if (!i) return "意向不存在";
      i.status = status;
      if (store === db.buyerSession.store || store === "Liora Amour") {
        db.buyerSession.brandAccess = db.buyerSession.brandAccess || {};
        if (status === "已通过") db.buyerSession.brandAccess[brand] = "granted";
        if (status === "已拒绝") db.buyerSession.brandAccess[brand] = "denied";
      }
      save(); syncLegacy();
      return `意向已${status}`;
    },
    setBuyerStatus(name, status) {
      const b = db.buyers.find(x => x.name === name);
      if (!b) return "买手不存在";
      b.status = status;
      save(); syncLegacy();
      return `买手「${name}」→ ${status}`;
    },
    saveBuyerBalance(name, brand, amount) {
      const b = db.buyers.find(x => x.name === name);
      if (!b) return "买手不存在";
      b.balances = b.balances || {};
      b.balances[brand] = Number(amount) || 0;
      save(); syncLegacy();
      return "余额已保存";
    },
    addBuyer(payload) {
      if (!payload.name || !payload.phone) return { ok: false, msg: "请填写店铺名和手机号" };
      db.buyers.unshift({
        name: payload.name, city: payload.city || "—", phone: payload.phone,
        level: payload.level || "—", status: "待审核", balances: {}, addresses: [], invoice: { title: payload.name, tax: "" }, substores: []
      });
      save(); syncLegacy();
      return { ok: true, msg: "买手已添加，待审核" };
    },
    addAppointment(payload) {
      db.appointments.unshift({
        brand: payload.brand, store: payload.store, contact: payload.contact,
        phone: payload.phone, date: payload.date, season: payload.season || "2026SS"
      });
      save(); syncLegacy();
      return "预约已提交并同步至预约列表";
    },

    // ----- roles -----
    addRole(name) {
      if (!name) return "请输入角色名";
      if (db.roles.some(r => r.name === name)) return "角色已存在";
      db.roles.push({ name, scope: "本品牌", perms: "自定义", flags: { 商品管理: false, 订单确认: false, 定金确认: false, 意向审核: false, 买手管理: false, 发票: false, 结佣: false, 财务审核: false } });
      save(); syncLegacy();
      return `角色「${name}」已创建`;
    },
    saveRoleFlags(name, flags) {
      const r = db.roles.find(x => x.name === name);
      if (!r) return "角色不存在";
      r.flags = flags;
      save(); syncLegacy();
      return "权限已保存";
    },

    // ----- recon -----
    saveRecon(section, data) {
      if (section === "rate") Object.assign(db.recon.rate, data);
      if (section === "payinfo") Object.assign(db.recon.payinfo, data);
      if (section === "processInvoice") {
        const inv = db.recon.invoices.find(x => x.brand === data.brand && x.type === data.type);
        if (inv) inv.status = "已开";
      }
      if (section === "clearBalance") {
        const row = db.recon.balances.find(x => x.brand === data.brand && x.store === data.store);
        if (row) row.amount = 0;
      }
      save();
      return "对账数据已更新";
    },

    // ----- buyer portal -----
    buyerBrands(cat) {
      const map = { 全部: null, 女装: "女装", 男装: "男装", 男女装: "男女装", 配饰: "配饰", 生活方式: "生活方式" };
      const c = map[cat || db.buyerSession.cat];
      const access = db.buyerSession.brandAccess || {};
      return RR.brands.filter(b => !c || b.cat === c).map(b => {
        const st = access[b.name] || "granted";
        return { ...b, access: st, accept: st === "granted", pending: st === "pending" };
      });
    },
    applyBrandAccess(brand, note) {
      if (!brand) return { ok: false, msg: "请选择品牌" };
      db.buyerSession.brandAccess = db.buyerSession.brandAccess || {};
      const cur = db.buyerSession.brandAccess[brand] || "granted";
      if (cur === "granted") return { ok: false, msg: "已有该品牌权限" };
      db.buyerSession.brandAccess[brand] = "pending";
      db.intentions = db.intentions || [];
      if (!db.intentions.some(i => i.store === db.buyerSession.store && i.brand === brand && i.status === "待审核")) {
        db.intentions.unshift({
          store: db.buyerSession.store, brand, status: "待审核",
          note: note || "买手申请品牌权限", at: new Date().toISOString().slice(0, 16).replace("T", " ")
        });
      }
      save(); syncLegacy();
      return { ok: true, msg: `已提交「${brand}」权限申请` };
    },
    upsertDraftSelection(sku, sizes) {
      const g = db.goods.find(x => x.sku === sku);
      if (!g) return { ok: false, msg: "商品不存在" };
      if (g.status === "已删款" || g.hideAll) return { ok: false, msg: "商品不可选" };
      const list = db.buyerSession.selections;
      let item = list.find(x => x.sku === sku);
      if (!item) {
        item = {
          sku, brand: g.brand, title: g.title, season: g.season, wholesale: g.wholesale,
          retail: g.retail, color: g.color, sampleSize: g.sampleSize, code: g.code, goodsType: g.goodsType,
          sizes: {}
        };
        list.push(item);
      }
      item.sizes = { ...(sizes || {}) };
      Object.keys(item.sizes).forEach(k => { item.sizes[k] = Math.max(0, Number(item.sizes[k] || 0)); });
      save();
      const qty = Object.values(item.sizes).reduce((a, b) => a + Number(b || 0), 0);
      return { ok: true, msg: `已加入选款单：${sku} 共 ${qty} 件`, item };
    },
    removeLook(id) {
      const i = db.looks.findIndex(l => String(l.id) === String(id));
      if (i < 0) return { ok: false, msg: "LOOK 不存在" };
      db.looks.splice(i, 1);
      save();
      return { ok: true, msg: `已删除 LOOK ${id}` };
    },
    bindLookSkus(id, skuText) {
      const l = db.looks.find(x => String(x.id) === String(id));
      if (!l) return { ok: false, msg: "LOOK 不存在" };
      const skus = String(skuText || "").split(/[,，\s]+/).map(s => s.trim()).filter(Boolean);
      const bad = skus.filter(s => !db.goods.some(g => g.sku === s));
      if (bad.length) return { ok: false, msg: "无效 SKU：" + bad.join(",") };
      l.skus = skus;
      save();
      return { ok: true, msg: `LOOK ${id} 已绑定 ${skus.length} 款` };
    },
    syncKingdee(action) {
      db.kingdee = db.kingdee || { lastPush: "", lastPull: "", status: "未同步", logs: [] };
      const now = new Date().toISOString().slice(0, 19).replace("T", " ");
      const nOrders = db.orders.length;
      if (action === "push") {
        db.kingdee.lastPush = now;
        db.kingdee.status = "已推送";
        db.kingdee.logs.unshift({ at: now, action: "push", msg: `推送 ${nOrders} 笔订单到金蝶（示意成功）` });
      } else {
        db.kingdee.lastPull = now;
        db.kingdee.status = "已拉取";
        db.kingdee.logs.unshift({ at: now, action: "pull", msg: `从金蝶拉取收款状态（示意成功）` });
      }
      db.kingdee.logs = db.kingdee.logs.slice(0, 30);
      save();
      return { ok: true, msg: db.kingdee.logs[0].msg };
    },
    addSubstore(name, city) {
      db.buyerSession.substores = db.buyerSession.substores || [];
      if (!name) return { ok: false, msg: "请填写子店铺名" };
      if (db.buyerSession.substores.some(s => s.name === name)) return { ok: false, msg: "子店铺已存在" };
      db.buyerSession.substores.push({ name, city: city || "" });
      save();
      return { ok: true, msg: `已添加子店铺 ${name}` };
    },
    updateSubstore(index, patch) {
      const list = db.buyerSession.substores || [];
      if (!list[index]) return { ok: false, msg: "子店铺不存在" };
      Object.assign(list[index], patch || {});
      save();
      return { ok: true, msg: "子店铺已保存" };
    },
    buyerGoods(brand) {
      const s = db.buyerSession;
      return db.goods.filter(g => {
        if (g.status === "已删款") return false;
        if (g.hideAll) return false;
        if (brand && g.brand !== brand) return false;
        if (s.season && s.season !== "全部" && g.season !== s.season) return false;
        if (s.carryOnly && !g.carry) return false;
        if (s.newOnly && !g.isNew) return false;
        if (s.search) {
          const q = s.search.toLowerCase();
          const code = String(g.code || "").toLowerCase();
          if (!g.sku.toLowerCase().includes(q) && !g.title.toLowerCase().includes(q) && !code.includes(q)) return false;
        }
        return true;
      });
    },
    buyerSeasons(brand) {
      const set = new Set(db.goods.filter(g => (!brand || g.brand === brand) && g.status !== "已删款").map(g => g.season));
      // 近→远：按 seasons 数组倒序（末尾更新）
      const order = RR.seasons || [];
      return order.filter(s => set.has(s)).reverse().concat([...set].filter(s => !order.includes(s)));
    },
    canOrder(brand, season, type) {
      const fair = db.fairs[season] || { first: true, replenish: true };
      if (type === "首单" && !fair.first) return { ok: false, msg: `${season} 首单已关闭（商品可见不可下单）` };
      if (type === "补货单" && !fair.replenish) return { ok: false, msg: `${season} 补货已关闭` };
      if (type === "补货单" && !db.buyerSession.hasFirstOrderBySeason[season]) {
        return { ok: false, msg: "本季未下过首单，不允许下补货单" };
      }
      const openRep = db.orders.find(o => o.store === db.buyerSession.store && o.brand === brand && o.type === "补货单" && !["尾款确认", "已完成", "已取消"].includes(o.status));
      if (type === "补货单" && openRep) return { ok: false, msg: "上一补货单未完成，不可新开" };
      return { ok: true };
    },
    toggleHeart(sku) {
      const list = db.buyerSession.selections;
      const idx = list.findIndex(x => x.sku === sku);
      if (idx >= 0) list.splice(idx, 1);
      else {
        const g = db.goods.find(x => x.sku === sku);
        if (g) {
          const sizes = Object.fromEntries((g.sizes || ["S", "M", "L"]).map(sz => [sz, 0]));
          list.push({
            sku, brand: g.brand, title: g.title, season: g.season, wholesale: g.wholesale,
            retail: g.retail, color: g.color, sampleSize: g.sampleSize, code: g.code, goodsType: g.goodsType, sizes
          });
        }
      }
      save();
      return idx >= 0 ? "已取消选款" : "已加入选款单（仅款式，详情内改数量）";
    },
    buyerConfirmSelection(brand) {
      const items = db.buyerSession.selections.filter(x => x.brand === brand);
      if (!items.length) return { ok: false, msg: "该品牌暂无选款" };
      const season = items[0].season;
      const check = Store.canOrder(brand, season, "首单");
      if (!check.ok) return check;
      const id = uid("SEL");
      const lines = items.map((i, idx) => {
        const g = db.goods.find(x => x.sku === i.sku) || {};
        let sizes = i.sizes || {};
        if (!Object.values(sizes).some(v => Number(v) > 0)) {
          sizes = Object.fromEntries((g.sizes || ["S", "M"]).map((sz, j) => [sz, j < 2 ? 1 : 0]));
        }
        return enrichLine({
          sku: i.sku, title: i.title || g.title, sizes, price: i.wholesale || g.wholesale, retail: g.retail,
          color: g.color, sampleSize: g.sampleSize, code: g.code, goodsType: g.goodsType
        }, idx);
      });
      const q = Store.selectionQuote(lines);
      db.selections.unshift({
        id, brand, season, store: db.buyerSession.store, time: new Date().toISOString().slice(0, 16).replace("T", " "),
        amount: money(q.wholesale), retailAmount: money(q.retail), pieces: q.pieces, skus: lines.length,
        status: "待确认", buyer: db.buyerSession.store, locked: false, lines
      });
      db.buyerSession.selections = db.buyerSession.selections.filter(x => x.brand !== brand);
      save(); syncLegacy();
      return { ok: true, msg: `已生成选款单 ${id}（按品牌独立）`, id };
    },
    buyerOrders(tab) {
      const store = db.buyerSession.store;
      return db.orders.filter(o => {
        if (o.store !== store && store !== "Liora Amour") {
          // demo: show all for Liora, else filter
        }
        if (tab === "未完成") return !["尾款确认", "已完成"].includes(o.status);
        if (tab === "已完成") return ["尾款确认", "已完成"].includes(o.status);
        return true;
      }).filter(o => o.store === store || true);
    },
    downloadText(filename, content) {
      const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    },

    styleSummary(dim, filter) {
      const f = filter || db.ui.styleFilter || {};
      const orders = db.orders.filter(o => {
        if (f.brand && f.brand !== "全部" && o.brand !== f.brand) return false;
        if (f.season && f.season !== "全部" && o.season !== f.season) return false;
        if (f.type && f.type !== "全部" && o.type !== f.type) return false;
        if (f.status && f.status !== "全部") {
          if (f.status === "已确认") {
            if (["买手未确认", "已驳回"].includes(o.status)) return false;
          } else if (o.status !== f.status) return false;
        }
        if (f.start && (o.createdAt || "") < f.start) return false;
        if (f.end && (o.createdAt || "").slice(0, 10) > f.end) return false;
        return true;
      });

      if (dim === "buyer") {
        const map = {};
        orders.forEach(o => {
          const key = o.store;
          if (!map[key]) map[key] = { store: o.store, amount: 0, pieces: 0, times: 0 };
          map[key].times += 1;
          map[key].amount += parseMoney(o.amount);
          (o.lines || []).forEach(l => {
            map[key].pieces += Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
          });
        });
        return Object.values(map).map(r => ({
          ...r, amount: money(r.amount), amountNum: r.amount
        })).sort((a, b) => b.amountNum - a.amountNum);
      }

      // SKU 维度：按款汇总 + 买手明细
      const map = {};
      orders.forEach(o => {
        (o.lines || []).forEach(l => {
          const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
          const price = Number(l.price || 0) * Number(l.discount || 1);
          if (!map[l.sku]) {
            const g = db.goods.find(x => x.sku === l.sku) || {};
            map[l.sku] = {
              sku: l.sku, title: l.title || g.title, color: g.color || "—",
              sizes: {}, pieces: 0, amount: 0, unit: price,
              buyers: {}, buyerCount: 0
            };
          }
          const row = map[l.sku];
          Object.entries(l.sizes || {}).forEach(([sz, n]) => {
            row.sizes[sz] = (row.sizes[sz] || 0) + Number(n || 0);
          });
          row.pieces += qty;
          row.amount += qty * price;
          if (!row.buyers[o.store]) row.buyers[o.store] = { store: o.store, sizes: {}, pieces: 0, amount: 0 };
          const br = row.buyers[o.store];
          Object.entries(l.sizes || {}).forEach(([sz, n]) => {
            br.sizes[sz] = (br.sizes[sz] || 0) + Number(n || 0);
          });
          br.pieces += qty;
          br.amount += qty * price;
        });
      });
      return Object.values(map).map(r => ({
        ...r,
        buyerCount: Object.keys(r.buyers).length,
        buyerRows: Object.values(r.buyers).map(b => ({
          ...b,
          sizeText: Object.entries(b.sizes).map(([k, v]) => `${k}:${v}`).join(", "),
          amount: money(b.amount)
        })),
        sizeText: Object.entries(r.sizes).map(([k, v]) => `${k}:${v}`).join(", "),
        amount: money(r.amount),
        unit: money(r.unit)
      }));
    },
    realtimeSummary(filter) {
      const f = filter || db.ui.realtimeFilter || {};
      const osAll = db.orders.filter(o => {
        if (f.season && f.season !== "全部" && o.season !== f.season) return false;
        if (f.type && f.type !== "全部" && o.type !== f.type) return false;
        if (f.status && f.status !== "全部" && o.status !== f.status) return false;
        if (f.start && (o.createdAt || "") < f.start) return false;
        if (f.end && (o.createdAt || "").slice(0, 10) > f.end) return false;
        return true;
      });
      return RR.brands.map(b => {
        const os = osAll.filter(o => o.brand === b.name);
        if (!os.length) return null;
        const amount = os.reduce((a, o) => a + parseMoney(o.amount), 0);
        const retail = os.reduce((a, o) => a + parseMoney(o.retailAmount || 0), 0);
        const deposit = os.reduce((a, o) => a + parseMoney(o.deposit), 0);
        const paidDep = os.reduce((a, o) => a + parseMoney(o.paidDeposit), 0);
        const paidTot = os.reduce((a, o) => a + parseMoney(o.paidTotal), 0);
        const pieces = os.reduce((a, o) => a + (o.lines || []).reduce((x, l) => x + Object.values(l.sizes || {}).reduce((p, q) => p + Number(q || 0), 0), 0), 0);
        return {
          brand: b.name, count: os.length, pieces,
          retail: money(retail || amount / 0.45),
          amount: money(amount), deposit: money(deposit),
          paidDeposit: money(paidDep), paidTotal: money(paidTot)
        };
      }).filter(Boolean);
    },
    analysisStats(brand, season) {
      let os = db.orders.slice();
      if (brand && brand !== "全部") os = os.filter(o => o.brand === brand);
      if (season && season !== "全部") os = os.filter(o => o.season === season);
      const amount = os.reduce((a, o) => a + parseMoney(o.amount), 0);
      const stores = new Set(os.map(o => o.store));
      return {
        count: os.length,
        amount: money(amount),
        avg: money(os.length ? amount / os.length : 0),
        buyers: stores.size,
        bars: os.slice(0, 8).map(o => Math.max(12, Math.min(95, Math.round(parseMoney(o.amount) / 2000))))
      };
    },
    saveBuyerProfile(patch) {
      Object.assign(db.buyerSession, patch);
      if (patch.invoice) db.buyerSession.invoice = { ...db.buyerSession.invoice, ...patch.invoice };
      if (patch.addresses) db.buyerSession.addresses = patch.addresses;
      save();
      return "个人中心资料已保存";
    },
    saveCategory(name, children) {
      const c = db.categories.find(x => x.name === name);
      if (!c) {
        db.categories.push({ name, children: children || [], count: 0 });
      } else if (children) c.children = children;
      save();
      return `分类「${name}」已保存`;
    },
    addLook(title, season) {
      const id = (db.looks.reduce((m, l) => Math.max(m, l.id), 0) || 0) + 1;
      db.looks.push({ id, season: season || "2026SS", title: title || `Lookbook #${id}`, skus: [] });
      save();
      return `已新增 LOOK ${id}`;
    },
    setBuyerOrderTab(tab) { db.buyerSession.orderTab = tab; save(); },
    setStyleDim(dim) { db.ui.styleDim = dim; save(); },
    grantBrandToBuyer(buyerName, brand) {
      const b = db.buyers.find(x => x.name === buyerName) || db.buyers[0];
      if (!b) return { ok: false, msg: "买手不存在" };
      if (!brand) return { ok: false, msg: "请选择品牌" };
      b.brands = b.brands || [];
      if (!b.brands.includes(brand)) b.brands.push(brand);
      if (b.name === db.buyerSession.store || buyerName === db.buyerSession.store) {
        db.buyerSession.brandAccess = db.buyerSession.brandAccess || {};
        db.buyerSession.brandAccess[brand] = "granted";
      }
      const intent = (db.intentions || []).find(i => i.store === b.name && i.brand === brand && i.status === "待审核");
      if (intent) intent.status = "已通过";
      save(); syncLegacy();
      return { ok: true, msg: `已为「${b.name}」开通品牌 ${brand}` };
    },
    saveBuyerAdmin(name, patch) {
      const b = db.buyers.find(x => x.name === name) || db.buyers[0];
      if (!b) return "买手不存在";
      Object.assign(b, patch);
      save(); syncLegacy();
      return "买手资料已保存";
    }
  };

  syncLegacy();
  window.Store = Store;
})();
