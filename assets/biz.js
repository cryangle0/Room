/**
 * ROOMROOM prototype business store
 * Implements requirement-driven stateful operations (persisted in localStorage).
 */
(() => {
  const KEY = "rr_biz_v2";

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

  function defaultDb() {
    return {
      goods: clone(RR.goods).map(g => ({
        ...g,
        cat: g.brand === "PRIVATE POLICY" ? "男装" : (g.brand === "ROOMROOM" ? "生活方式" : "女装"),
        subcat: "外套",
        restock: true,
        hideInFirst: false,
        linesheet: ""
      })),
      selections: clone(RR.selections).map(s => ({ ...s, locked: s.status === "已生成订单", lines: clone(RR.selectionLines) })),
      orders: clone(RR.orders).map(o => ({
        ...o,
        whitelist: false,
        paidDeposit: o.status === "定金确认" || o.status === "尾款确认" || o.status === "已完成" ? o.deposit : "0.00",
        paidTotal: o.status === "尾款确认" || o.status === "已完成" ? o.amount : "0.00",
        invoice: null,
        voucher: null,
        substores: [],
        returns: [],
        lines: [
          { sku: "121BZX122", title: "LUNE——双v面包西服", sizes: { S: 2, M: 1 }, price: 2745, discount: 1 },
          { sku: "121DRX037G", title: "抹胸连衣裙", sizes: { XS: 1, S: 2 }, price: 2205, discount: 1 }
        ],
        createdAt: "2026-03-20 10:00"
      })),
      buyers: clone(RR.buyers).map(b => ({ ...b, balances: { "HAIZHEN WANG": b.name === "Liora Amour" ? 2480 : 0, JUNLI: 0 }, addresses: [{ name: "收货人", phone: b.phone, addr: b.city }], invoice: { title: b.name, tax: "" }, substores: [] })),
      intentions: clone(RR.intentions),
      appointments: clone(RR.appointments),
      contracts: [
        { id: "CT-2026SS-088", orderId: "ORD-20260319-088", brand: "JUNLI", season: "2026SS", status: "已生成" },
        { id: "CT-2026SS-102", orderId: "ORD-20260320-102", brand: "HAIZHEN WANG", season: "2026SS", status: "待生成" }
      ],
      ocs: [
        { id: "OC-20260319-088", orderId: "ORD-20260319-088", brand: "JUNLI", status: "可下载" }
      ],
      shipments: [
        {
          id: "SH-260321-01", orderId: "ORD-20260319-088", brand: "JUNLI", store: "B1OCK",
          tracking: "", status: "待发货",
          lines: [
            { sku: "JL26SS001", size: "M", should: 4, actual: 4 },
            { sku: "JL26SS001", size: "L", should: 2, actual: 2 }
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
        mode: "first", // first | replenish | fair
        first: { minAmount: 30000, cloth: 0.45, accessory: 0.5, lifestyle: 0.55, stairs: [{ amount: 50000, discount: 0.43 }, { amount: 100000, discount: 0.4 }] },
        replenish: { minAmount: 10000, cloth: 0.48, accessory: 0.52, lifestyle: 0.58, stairs: [{ amount: 30000, discount: 0.45 }] },
        fair: {}
      },
      sizeAlias: { XS: "2", S: "4", M: "6", L: "8", XL: "10" },
      fairs: Object.fromEntries((RR.seasons || []).map(s => [s, { first: true, replenish: true }])),
      payInfo: { account: "ROOMROOM 贸易有限公司", bank: "招商银行上海分行", no: "1219 **** **** 8899", sealContract: true, sealOc: true },
      contractSettings: { season: "2026SS", type: "经销", cycle: "45-60天", contact: "张经理", phone: "13800001111", email: "contract@roomroom.com", signDate: "2026-03-01", authStart: "2026-03-01", authEnd: "2026-09-30" },
      brandProfile: clone(RR.brands[0]),
      recon: {
        rate: { brand: "JUNLI", season: "2026SS", base: "5%", stair: "满100万→4%" },
        bills: [{ id: "CM-2026SS-01", brand: "JUNLI", season: "2026SS", base: 960000, rate: "5%", amount: 48000, status: "待确认" }],
        invoices: [
          { type: "代开发票", brand: "JUNLI", amount: 48000, status: "待开" },
          { type: "抽佣发票", brand: "HAIZHEN WANG", amount: 32000, status: "已开" }
        ],
        balances: [{ brand: "JUNLI", store: "B1OCK", amount: 12400 }],
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
        orderTab: "全部",
        addresses: [{ name: "王女士", phone: "13681383088", addr: "北京市朝阳区…" }],
        invoice: { title: "Liora Amour 商贸有限公司", tax: "" },
        selections: [],
        hasFirstOrderBySeason: { "2026SS": true, "2025AW": true, "2027PS": false },
        openReplenish: {}
      },
      ui: {
        goodsFilter: { carry: "全部", linesheet: "", sku: "", cat: "全部", subcat: "全部", brand: "全部", title: "", season: "全部" },
        orderFilter: { brand: "全部", season: "全部", type: "全部", status: "全部", store: "", id: "" },
        selectionFilter: { brand: "全部", season: "全部", store: "" },
        buyerFilter: { keyword: "" },
        styleDim: "sku",
        discountMode: "first"
      }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return defaultDb();
      const db = JSON.parse(raw);
      const base = defaultDb();
      return { ...base, ...db, ui: { ...base.ui, ...(db.ui || {}) }, buyerSession: { ...base.buyerSession, ...(db.buyerSession || {}) } };
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
        g.restock = r.restock;
        g.hideInFirst = r.hideInFirst;
      });
      save(); syncLegacy();
      return "补货/隐藏设置已保存";
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
    setDiscountMode(mode) { db.ui.discountMode = mode; db.brandRules.mode = mode; save(); },
    saveDiscountRules(rules) {
      const mode = db.ui.discountMode || "first";
      db.brandRules[mode] = rules;
      save();
      return `${mode === "first" ? "首单" : mode === "replenish" ? "补货单" : "订货会"}规则已保存`;
    },
    saveSizeAlias(alias) { db.sizeAlias = alias; save(); return "尺寸别名已保存"; },
    setFair(season, patch) {
      db.fairs[season] = { ...(db.fairs[season] || { first: true, replenish: true }), ...patch };
      save();
      return `${season} 订货会设置已更新`;
    },
    savePayInfo(info) { Object.assign(db.payInfo, info); save(); return "收款设置已保存"; },
    saveContractSettings(info) { Object.assign(db.contractSettings, info); save(); return "合同设置已保存"; },
    saveBrandProfile(info) { Object.assign(db.brandProfile, info); save(); return "品牌资料已保存"; },

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
      s.lines = lines;
      let pieces = 0;
      let amount = 0;
      lines.forEach(l => {
        const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
        pieces += qty;
        amount += qty * parseMoney(l.price);
      });
      s.pieces = pieces;
      s.skus = lines.length;
      s.amount = money(amount);
      save(); syncLegacy();
      return { ok: true, msg: "选款单已保存" };
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
      return RR.brands.filter(b => !c || b.cat === c);
    },
    buyerGoods(brand) {
      const s = db.buyerSession;
      return db.goods.filter(g => {
        if (g.status === "已删款") return false;
        if (brand && g.brand !== brand) return false;
        if (s.season && s.season !== "全部" && g.season !== s.season) return false;
        if (s.carryOnly && !g.carry) return false;
        if (s.search) {
          const q = s.search.toLowerCase();
          if (!g.sku.toLowerCase().includes(q) && !g.title.toLowerCase().includes(q)) return false;
        }
        // fair closed: still visible
        return true;
      });
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
        if (g) list.push({ sku, brand: g.brand, title: g.title, season: g.season, wholesale: g.wholesale });
      }
      save();
      return idx >= 0 ? "已取消选款" : "已加入选款单（仅款式）";
    },
    buyerConfirmSelection(brand) {
      const items = db.buyerSession.selections.filter(x => x.brand === brand);
      if (!items.length) return { ok: false, msg: "该品牌暂无选款" };
      const season = items[0].season;
      const check = Store.canOrder(brand, season, "首单");
      if (!check.ok) return check;
      const id = uid("SEL");
      db.selections.unshift({
        id, brand, season, store: db.buyerSession.store, time: new Date().toISOString().slice(0, 16).replace("T", " "),
        amount: money(items.length * 5000), pieces: items.length, skus: items.length, status: "待确认", buyer: db.buyerSession.store,
        locked: false,
        lines: items.map(i => ({ sku: i.sku, title: i.title, sizes: { S: 1, M: 1 }, price: i.wholesale }))
      });
      db.buyerSession.selections = db.buyerSession.selections.filter(x => x.brand !== brand);
      save(); syncLegacy();
      return { ok: true, msg: `已生成选款单 ${id}`, id };
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

    styleSummary(dim) {
      const map = {};
      db.orders.forEach(o => {
        (o.lines || []).forEach(l => {
          const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
          const key = dim === "buyer" ? `${o.store}|${l.sku}` : l.sku;
          if (!map[key]) map[key] = { sku: l.sku, title: l.title, buyers: new Set(), pieces: 0, amount: 0, store: o.store };
          map[key].buyers.add(o.store);
          map[key].pieces += qty;
          map[key].amount += qty * Number(l.price || 0) * Number(l.discount || 1);
        });
      });
      return Object.values(map).map(r => ({ ...r, buyers: r.buyers.size, amount: money(r.amount) }));
    },
    realtimeSummary() {
      return RR.brands.map(b => {
        const os = db.orders.filter(o => o.brand === b.name);
        const amount = os.reduce((a, o) => a + parseMoney(o.amount), 0);
        const deposit = os.reduce((a, o) => a + parseMoney(o.deposit), 0);
        const paidDep = os.reduce((a, o) => a + parseMoney(o.paidDeposit), 0);
        const paidTot = os.reduce((a, o) => a + parseMoney(o.paidTotal), 0);
        return { brand: b.name, count: os.length, amount: money(amount), deposit: money(deposit), paidDeposit: money(paidDep), paidTotal: money(paidTot) };
      });
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
      if (!b) return "买手不存在";
      b.brands = b.brands || [];
      if (!b.brands.includes(brand)) b.brands.push(brand);
      save(); syncLegacy();
      return `已为「${b.name}」开通品牌 ${brand}`;
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
