/**
 * ROOMROOM prototype business store
 * Implements requirement-driven stateful operations (persisted in localStorage).
 */
(() => {
  /* v6：订单流程按《订单流程图》重建 + 注册审核链路，旧结构不再兼容 */
  const KEY = "rr_biz_v11";

  /* #4 联系手机即品牌端登录账号；演示号 13800000001 起按品牌顺序分配 */
  (RR.brands || []).forEach((b, i) => {
    if (!b.phone) b.phone = String(13800000001 + i);
    if (!b.contact) b.contact = "品牌联系人";
  });

  const DEFAULT_RULE = () => ({
    minAmount: 30000, cloth: 0.45, accessory: 0.5, lifestyle: 0.55,
    stairs: [{ amount: 50000, discount: 0.43 }, { amount: 100000, discount: 0.4 }]
  });
  const DEFAULT_REP_RULE = () => ({
    minAmount: 10000, cloth: 0.48, accessory: 0.52, lifestyle: 0.58,
    stairs: [{ amount: 30000, discount: 0.45 }]
  });

  /* 订单流程（对齐《订单流程图》）：
     生成订单 → 平台确认订单(驳回/确认) → 设置定金(可设折扣) → 买手确认定金
     → 买手上传定金凭证 → 平台核对定金凭证(不通过退回) → 生成 OC
     → 买手支付尾款(全额或分批次) → 平台核对尾款凭证(不通过退回)
     → 统计付款差额 → 平台手动点击完成 → 订单完成 */
  const ORDER_ST = {
    /* #15 订单状态顺序 */
    confirm: "待确认订单",
    discount: "待确认折扣",
    deposit: "待确认定金",
    depositAck: "待买手确认定金",
    depositPay: "待买手上传支付凭证",
    depositCheck: "待平台确认定金",
    finalPay: "待买手上传尾款",
    done: "已完成",
    rejected: "已驳回",
    canceled: "已取消",
    /* 兼容旧节点名（映射用） */
    oc: "待生成OC",
    finalCheck: "待核对尾款凭证",
    settle: "待完成结算"
  };
  const ORDER_FLOW = [
    ORDER_ST.confirm, ORDER_ST.discount, ORDER_ST.deposit, ORDER_ST.depositAck,
    ORDER_ST.depositPay, ORDER_ST.depositCheck, ORDER_ST.finalPay, ORDER_ST.done
  ];
  /* 旧状态 → 新流程节点（历史 mock/本地数据兼容）
     注意：勿把现行正式状态名（如「待确认定金」）放进此表，否则会覆盖 ORDER_FLOW */
  const LEGACY_STATUS = {
    "买手未确认": ORDER_ST.confirm,
    "待平台确认": ORDER_ST.confirm,
    "买手已确认待品牌确认": ORDER_ST.discount,
    "待设置定金": ORDER_ST.deposit,
    "待买手确认定金": ORDER_ST.depositAck,
    "待上传定金凭证": ORDER_ST.depositPay,
    "待核对定金凭证": ORDER_ST.depositCheck,
    "定金确认": ORDER_ST.depositCheck,
    "待生成OC": ORDER_ST.depositCheck,
    "待支付尾款": ORDER_ST.finalPay,
    "待核对尾款凭证": ORDER_ST.finalPay,
    "待完成结算": ORDER_ST.finalPay,
    "尾款确认": ORDER_ST.finalPay,
    /* 旧版曾用「待确认定金」表示买手确认节点；现行 #15 该文案=平台设定金节点，由 ORDER_FLOW 优先识别 */
    "待品牌确认定金": ORDER_ST.depositAck
  };
  const SEL_ST = {
    draft: "待提交",
    confirm: "待确认",
    ordered: "已生成订单",
    canceled: "已取消"
  };
  const ORDER_VIEW = { open: "未完成", done: "已完成", canceled: "已取消" };
  function orderFrozen(status) {
    const st = normStatus(status);
    return st === ORDER_ST.done || st === ORDER_ST.canceled || st === ORDER_ST.rejected;
  }
  function orderViewStatus(o) {
    const st = normStatus(o && o.status);
    if (st === ORDER_ST.done) return ORDER_VIEW.done;
    if (st === ORDER_ST.canceled) return ORDER_VIEW.canceled;
    if (st === ORDER_ST.rejected) return null;
    return ORDER_VIEW.open;
  }
  function normSelStatus(s) {
    const t = String((s && s.status) || s || "").trim();
    if (t === "待审核") return SEL_ST.confirm;
    if (t === "已驳回") return SEL_ST.draft;
    if (t === SEL_ST.draft || t === SEL_ST.confirm || t === SEL_ST.ordered || t === SEL_ST.canceled) return t;
    if (t === "待确认") return SEL_ST.confirm;
    return SEL_ST.draft;
  }
  function timeInSlot(slot, dateStr) {
    const t = String(dateStr || "").replace("T", " ").slice(11, 16);
    if (!t || !slot || !slot.from || !slot.to) return true;
    return t >= slot.from && t < slot.to;
  }
  function normStatus(s) {
    const t = String(s || "").trim();
    /* 现行正式状态优先，避免被 LEGACY 误伤 */
    if (ORDER_FLOW.includes(t) || t === ORDER_ST.rejected || t === ORDER_ST.canceled) return t;
    if (LEGACY_STATUS[t]) return LEGACY_STATUS[t];
    if ([ORDER_ST.oc, ORDER_ST.finalCheck, ORDER_ST.settle].includes(t)) {
      if (t === ORDER_ST.oc) return ORDER_ST.depositCheck;
      return ORDER_ST.finalPay;
    }
    return ORDER_ST.confirm;
  }
  function stageOf(status) {
    return ORDER_FLOW.indexOf(normStatus(status));
  }

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

  /* syncLegacy 会把 RR.* 指向 db.*，重置必须回到 data.js 原始值，故先快照 */
  const SEED = {
    goods: clone(RR.goods || []),
    selections: clone(RR.selections || []),
    selectionLines: clone(RR.selectionLines || []),
    orders: clone(RR.orders || []),
    buyers: clone(RR.buyers || []),
    intentions: clone(RR.intentions || []),
    appointments: clone(RR.appointments || []),
    roles: clone(RR.roles || [])
  };

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
      /* 商品编号(sku/款号)允许重复，skc（款+色）才是唯一编号 */
      skc: g.skc || g.sku,
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

  /* skc 唯一，sku（款号）可重复：优先按 skc 命中 */
  function findGoods(key) {
    if (!key) return null;
    return db.goods.find(g => g.skc === key) || db.goods.find(g => g.sku === key) || null;
  }

  function enrichLine(l, idx) {
    const g = SEED.goods.find(x => x.skc === l.sku || x.sku === l.sku) || {};
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
    const gs = SEED.goods.filter(g => g.brand === brand && g.status !== "已删款").slice(0, 5);
    if (!gs.length) return clone(SEED.selectionLines).map((l, i) => enrichLine(l, i));
    return gs.map((g, i) => enrichLine({
      sku: g.sku,
      title: g.title,
      sizes: Object.fromEntries((g.sizes || ["S", "M"]).map((sz, j) => [sz, j < 2 ? 1 : 0])),
      price: g.wholesale,
      retail: g.retail
    }, i));
  }

  /* 按流程阶段回填付款凭证/OC/差额，使各状态订单都能演示后续动作 */
  function seedOrder(o, oi) {
    const status = normStatus(o.status);
    const stage = stageOf(status);
    const amount = parseMoney(o.amount);
    const deposit = parseMoney(o.deposit) || amount * 0.3;
    const payments = [];
    if (stage >= stageOf(ORDER_ST.depositCheck)) {
      payments.push({
        kind: "定金", amount: money(deposit), at: "2026-07-20", file: "定金凭证.pdf",
        status: stage === stageOf(ORDER_ST.depositCheck) ? "待核对" : "已核对", note: ""
      });
    }
    if (stage >= stageOf(ORDER_ST.done)) {
      payments.push({ kind: "尾款", amount: money(Math.max(0, amount - deposit)), at: "2026-07-26", file: "尾款凭证.pdf", status: "已核对", note: "" });
    } else if (stage >= stageOf(ORDER_ST.finalPay) && status === ORDER_ST.finalPay) {
      payments.push({ kind: "尾款", amount: money(Math.max(0, amount - deposit)), at: "2026-08-06", file: "尾款凭证.pdf", status: "待核对", note: "" });
    }
    const okPaid = payments.filter(p => p.status === "已核对").reduce((a, p) => a + parseMoney(p.amount), 0);
    const depositPaid = payments.filter(p => p.kind === "定金" && p.status === "已核对").reduce((a, p) => a + parseMoney(p.amount), 0);
    return {
      ...o,
      status,
      whitelist: false,
      depositRatio: amount ? Number((deposit / amount).toFixed(2)) : 0.3,
      deposit: money(deposit),
      payments,
      paidDeposit: money(depositPaid),
      paidTotal: money(okPaid),
      settleDiff: status === ORDER_ST.done ? money(amount - okPaid) : "",
      ocId: stage >= stageOf(ORDER_ST.finalPay) ? "OC-" + String(o.id || "").replace("ORD-", "") : "",
      rejectReason: "",
      cancelReason: "",
      invoice: stage >= stageOf(ORDER_ST.finalPay) ? { title: o.store, tax: "", amount: o.amount, type: "普通发票" } : null,
      voucher: payments[0] ? { amount: payments[0].amount, at: payments[0].at, file: payments[0].file } : null,
      contractUploaded: stage >= stageOf(ORDER_ST.depositCheck),
      materialsOk: stage > stageOf(ORDER_ST.confirm),
      substores: [],
      returns: [],
      discountLabel: o.brand === "KHIHO" ? "服饰:4.4折 / 配饰:4.4折" : "服饰:4.5折 / 配饰:5.0折",
      retailAmount: money(amount / 0.45),
      lines: linesForBrand(o.brand).map(l => ({
        sku: l.sku, title: l.title, sizes: clone(l.sizes), price: parseMoney(l.price), discount: 1,
        retail: parseMoney(l.retail), goodsType: l.goodsType, color: l.color, code: l.code, sampleSize: l.sampleSize
      })),
      createdAt: o.createdAt || ["2026-03-20 10:00", "2026-07-29 12:46", "2026-07-15 10:40"][oi % 3],
      flowLog: [{ at: o.createdAt || "2026-07-01 10:00", text: "买手生成订单，等待平台确认" }]
    };
  }

  function defaultDb() {
    return {
      goods: clone(SEED.goods).map((g, i) => enrichGoods(g, i)),
      selections: clone(SEED.selections).map((s, i) => {
        let status = s.status;
        if (status === "已驳回") status = SEL_ST.draft;
        if (status === "待审核" || status === "待确认" || !status) {
          status = (i % 3 === 0) ? SEL_ST.confirm : SEL_ST.draft;
        }
        return {
          ...s,
          status,
          createdAt: s.createdAt || s.date || s.time || "",
          locked: status === SEL_ST.ordered || status === SEL_ST.confirm,
          lines: (s.brand === "IAN HYLTON" && i === 0
            ? clone(SEED.selectionLines)
            : linesForBrand(s.brand)).map((l, j) => enrichLine(l, j))
        };
      }),
      orders: clone(SEED.orders).map((o, oi) => seedOrder(o, oi)),
      buyers: clone(SEED.buyers).map((b, i) => ({
        ...b,
        balances: { "HAIZHEN WANG": b.name === "Liora Amour" ? 2480 : 0, JUNLI: 0 },
        addresses: [{ name: "收货人", phone: b.phone, addr: b.city }],
        invoice: { title: b.name, tax: "" },
        substores: [],
        contact: b.contact || "店主",
        /* 注册流程：待审核=买手手机号注册后提交的申请 */
        source: b.status === "待审核" ? "手机号注册" : "平台录入",
        regAt: b.status === "待审核" ? `2026-08-0${(i % 9) + 1} 10:${String(10 + i).slice(-2)}` : "",
        reason: "",
        allowSelfSub: false,
        subAccounts: b.name === "Liora Amour"
          ? [{ name: "店员小王", phone: "13600001111", at: "2026-08-12" }]
          : []
      })).concat([{
        name: "平台签到员", phone: "13900000000", city: "上海", level: "—", status: "已通过",
        role: "checker", allowSelfSub: true,
        subAccounts: [{ name: "签到助手", phone: "13900000001", at: "2026-08-18" }],
        balances: {}, addresses: [], invoice: { title: "平台签到员", tax: "" }, substores: [],
        source: "平台录入", contact: "签到员", reason: "", regAt: ""
      }]),
      intentions: clone(SEED.intentions),
      /* 预约不再人工审核：提交即占用名额 */
      appointments: clone(SEED.appointments).map((a, i) => ({
        ...a,
        people: a.people || (i % 2 === 0 ? 2 : 1),
        status: "已通过",
        reason: ""
      })),
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
      roles: clone(SEED.roles).map(r => ({
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
      /* 平台端：设置品牌商品下单是否需要审核买手（true=需审核，买手须先提交品牌申请） */
      brandAudit: Object.fromEntries((RR.brands || []).map(b => [
        b.name, ["PRIVATE POLICY", "XIMONLEE", "self-portrait", "IAN HYLTON"].includes(b.name)
      ])),
      /* 品牌订单首付比例（定金），平台/品牌端可改，下单与设置定金取此默认值 */
      brandDeposit: Object.fromEntries((RR.brands || []).map((b, i) => [b.name, [0.3, 0.3, 0.5, 0.4][i % 4]])),
      /* 注册流程：本机最近一次提交的注册申请（用于「审核进度」页） */
      regSession: { phone: "", store: "", status: "", reason: "", at: "" },
      fairs: Object.fromEntries((RR.seasons || []).map(s => [s, { first: true, replenish: true }])),
      brandFairs: {},
      orderingFairs: [
        {
          id: "FAIR-2027PS", name: "2027 Pre-Spring 订货会", season: "2027PS",
          brands: ["HAIZHEN WANG", "JUNLI", "ANGEL CHEN"], cover: true,
          intro: "春季订货会图文介绍（展示位置待确认）", createdAt: "2026-06-01",
          bookFrom: "2026-08-01", bookTo: "2026-11-30", fairFrom: "2026-09-08", fairTo: "2026-09-12"
        },
        {
          id: "FAIR-2026SS", name: "2026 Spring/Summer 订货会", season: "2026SS",
          brands: ["HAIZHEN WANG", "JUNLI", "Ms MIN", "SUSAN FANG"], cover: true,
          intro: "夏季订货会说明", createdAt: "2025-11-12",
          bookFrom: "2025-10-01", bookTo: "2026-03-01", fairFrom: "2026-01-10", fairTo: "2026-01-18"
        }
      ],
      /* 订货会 × 品牌 × 时段接待上限 */
      fairSlots: {
        "FAIR-2027PS": {
          "HAIZHEN WANG": [
            { id: "SL-1", date: "2026-09-08", from: "08:30", to: "09:30", cap: 200, booked: 12 },
            { id: "SL-2", date: "2026-09-08", from: "09:30", to: "11:30", cap: 150, booked: 40 }
          ],
          "JUNLI": [
            { id: "SL-3", date: "2026-09-08", from: "08:30", to: "09:30", cap: 80, booked: 8 }
          ]
        }
      },
      checkins: [
        { id: "CK-1", fairId: "FAIR-2027PS", brand: "HAIZHEN WANG", store: "Liora Amour", phone: "13681383088", kind: "预约", at: "2026-08-20 10:12", slot: "08:30-09:30" },
        { id: "CK-2", fairId: "FAIR-2027PS", brand: "JUNLI", store: "现场访客", phone: "13900001111", kind: "现场", at: "2026-08-20 10:40", slot: "—" }
      ],
      brandDiscountBase: {},
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
          about: b.about || "",
          contact: b.contact || "品牌联系人",
          phone: b.phone || "13800000001"
        };
      })(),
      brandProfiles: {},
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
        /* granted | pending | denied | none —— 仅对「需审核」品牌生效，免审核品牌直接可看可下单 */
        brandAccess: { "IAN HYLTON": "granted", "PRIVATE POLICY": "pending", "XIMONLEE": "denied" },
        substores: [{ name: "Liora Amour 静安", city: "上海" }],
        role: "buyer", /* buyer | checker 签到员 */
        allowSelfSub: false
      },
      brandSession: {
        phone: "13800000001",
        brand: "HAIZHEN WANG"
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
      const merged = { ...base, ...db, ui: { ...base.ui, ...(db.ui || {}) }, buyerSession: { ...base.buyerSession, ...(db.buyerSession || {}) }, brandSession: { ...base.brandSession, ...(db.brandSession || {}) } };
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
      if (!merged.brandFairs) merged.brandFairs = {};
      if (!merged.fairSlots) merged.fairSlots = clone(base.fairSlots || {});
      if (!merged.checkins) merged.checkins = clone(base.checkins || []);
      if (!merged.brandDiscountBase) merged.brandDiscountBase = {};
      if (!merged.buyerMessages) merged.buyerMessages = clone(base.buyerMessages || []);
      if (!merged.brandAudit) merged.brandAudit = clone(base.brandAudit);
      if (!merged.brandDeposit) merged.brandDeposit = clone(base.brandDeposit);
      if (!merged.regSession) merged.regSession = clone(base.regSession);
      if (Array.isArray(merged.appointments)) {
        merged.appointments = merged.appointments.map((a) => ({
          ...a,
          status: a.status === "待审核" ? "已通过" : (a.status || "已通过"),
          reason: a.reason || ""
        }));
      }
      if (Array.isArray(merged.selections)) {
        merged.selections = merged.selections.map((s) => {
          const status = normSelStatus(s);
          return {
            ...s,
            status,
            locked: status === SEL_ST.ordered || status === SEL_ST.confirm || (status === SEL_ST.canceled)
          };
        });
      }
      if (merged.buyerSession.newOnly == null) merged.buyerSession.newOnly = false;
      /* 订单：状态归一到新流程节点，并补齐付款凭证等新字段 */
      if (Array.isArray(merged.orders)) {
        merged.orders = merged.orders.map((o, i) => {
          const status = normStatus(o.status);
          if (o.payments && o.status === status) return o;
          const seeded = seedOrder({ ...o, status }, i);
          return { ...seeded, lines: o.lines && o.lines.length ? o.lines : seeded.lines };
        });
      }
      if (Array.isArray(merged.goods)) {
        const have = new Set(merged.goods.map(g => g.sku));
        (base.goods || []).forEach(g => {
          if (!have.has(g.sku)) merged.goods.push(clone(g));
        });
        merged.goods = merged.goods.map((g, i) => ({
          ...g,
          carry: !!g.carry,
          isNew: g.isNew != null ? !!g.isNew : i % 5 === 0,
          skc: g.skc || g.sku,
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
    goodsL1Cat(cat) {
      const c = String(cat || "");
      if (/配饰/.test(c)) return "配饰";
      if (/生活/.test(c)) return "生活方式";
      return "服饰";
    },
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
        const view = orderViewStatus(o);
        if (!view) return false;
        if (f.status !== "全部" && view !== f.status && o.status !== f.status) return false;
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
    /* 商品编号可重复，按 skc（唯一）优先定位，兼容只传 sku 的老数据 */
    findGoods(key) {
      return findGoods(key);
    },
    toggleDelete(sku) {
      const g = findGoods(sku);
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
        const g = findGoods(r.sku);
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
    /* 添加新商品：商品编号(sku)可重复；每个规格(款+色)生成一条 skc，skc 必须唯一 */
    addGoods(payload) {
      if (!payload.sku || !payload.title || !payload.brand) return { ok: false, msg: "请填写品牌、款式名称、商品编号" };
      const asSizes = v => (Array.isArray(v) ? v : String(v || "S,M,L").split(/[,，\s]+/)).filter(Boolean);
      const specs = (payload.specs && payload.specs.length ? payload.specs : [{
        color: payload.color || "", skc: payload.skc || "", sizes: payload.sizes
      }]).map((s, i) => ({
        color: String(s.color || "").trim(),
        skc: String(s.skc || "").trim() || Store.nextSkc(payload.sku, s.color, i),
        sizes: asSizes(s.sizes && (Array.isArray(s.sizes) ? s.sizes.length : s.sizes) ? s.sizes : payload.sizes)
      }));
      const dupIn = specs.map(s => s.skc).filter((x, i, a) => a.indexOf(x) !== i);
      if (dupIn.length) return { ok: false, msg: `SKC 编号重复：${dupIn[0]}` };
      const clash = specs.find(s => db.goods.some(g => (g.skc || g.sku) === s.skc));
      if (clash) return { ok: false, msg: `SKC 编号已存在：${clash.skc}（商品编号可重复，SKC 需唯一）` };
      const repeated = db.goods.some(g => g.sku === payload.sku);
      specs.forEach(s => {
        db.goods.unshift({
          sku: payload.sku,
          skc: s.skc,
          brand: payload.brand,
          season: payload.season || "2026SS",
          title: payload.title,
          color: s.color,
          sizes: s.sizes.length ? s.sizes : ["S", "M", "L"],
          retail: money(payload.retail || 0),
          wholesale: money(payload.wholesale || 0),
          status: "正常",
          carry: !!payload.carry,
          cat: payload.cat || "女装",
          subcat: payload.subcat || "",
          restock: payload.restock !== false,
          hideInFirst: false,
          linesheet: payload.linesheet || "",
          shipAt: payload.shipAt || ""
        });
      });
      save(); syncLegacy();
      return {
        ok: true,
        count: specs.length,
        skcs: specs.map(s => s.skc),
        msg: `商品 ${payload.sku} 已添加 ${specs.length} 个规格（SKC：${specs.map(s => s.skc).join("、")}）${repeated ? "；该商品编号已存在，按可重复处理" : ""}`
      };
    },
    /* 默认 SKC 规则：商品编号 + 色序号，冲突则递增 */
    nextSkc(sku, color, idx) {
      const base = `${sku}-${String(idx + 1).padStart(2, "0")}`;
      let skc = base;
      let n = idx + 1;
      while (db.goods.some(g => (g.skc || g.sku) === skc)) {
        n += 1;
        skc = `${sku}-${String(n).padStart(2, "0")}`;
      }
      return skc;
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
    listOrderingSessions() {
      const rows = (db.orderingFairs || []).map(f => ({
        id: f.id || f.season,
        name: f.name || `${f.season} 订货会`,
        season: f.season
      }));
      const seen = new Set(rows.map(r => r.season));
      (RR.seasons || []).forEach(s => {
        if (seen.has(s)) return;
        rows.push({ id: "SEA-" + String(s).replace(/[^A-Za-z0-9_-]/g, "_"), name: s + " 订货会", season: s });
        seen.add(s);
      });
      return rows;
    },
    fairFlags(brand, season) {
      const bmap = brand && db.brandFairs && db.brandFairs[brand];
      if (bmap && bmap[season]) {
        return { first: bmap[season].first !== false, replenish: bmap[season].replenish !== false };
      }
      const g = db.fairs[season] || { first: true, replenish: true };
      return { first: g.first !== false, replenish: g.replenish !== false };
    },
    setBrandFair(brand, season, patch) {
      if (!brand || !season) return "缺少品牌或订货会";
      db.brandFairs = db.brandFairs || {};
      db.brandFairs[brand] = db.brandFairs[brand] || {};
      db.brandFairs[brand][season] = { ...this.fairFlags(brand, season), ...patch };
      save();
      return `${brand} · ${season} 订货会设置已更新`;
    },
    createOrderingFair(payload) {
      const name = String(payload.name || "").trim();
      if (!name) return { ok: false, msg: "请填写订货会名称" };
      const season = String(payload.season || "").trim();
      if (!season) return { ok: false, msg: "请手写填写季节" };
      const brands = Array.isArray(payload.brands) ? payload.brands.filter(Boolean) : [];
      if (!brands.length) return { ok: false, msg: "请选择参与品牌" };
      const id = uid("FAIR");
      db.orderingFairs = db.orderingFairs || [];
      db.orderingFairs.unshift({
        id,
        name,
        season,
        brands,
        bookFrom: payload.bookFrom || "",
        bookTo: payload.bookTo || "",
        fairFrom: payload.fairFrom || "",
        fairTo: payload.fairTo || "",
        cover: !!payload.cover,
        intro: payload.intro || "",
        createdAt: new Date().toISOString().slice(0, 10)
      });
      save();
      return {
        ok: true,
        msg: `已创建订货会 ${name}（${season} · ${brands.length} 个品牌）`,
        id
      };
    },
    todayStr() {
      return new Date().toISOString().slice(0, 10);
    },
    isFairBookable(fair, day) {
      if (!fair) return false;
      const d = day || Store.todayStr();
      if (fair.bookFrom && d < fair.bookFrom) return false;
      if (fair.bookTo && d > fair.bookTo) return false;
      return true;
    },
    bookableFairs() {
      return (db.orderingFairs || []).filter(f => Store.isFairBookable(f));
    },
    brandDiscountBase(brand) {
      const v = (db.brandDiscountBase || {})[brand];
      if (v === "wholesale" || v === "订货价") return "wholesale";
      const p = Store.getBrandProfile(brand);
      if (p && (p.discountBase === "wholesale" || p.discountBase === "订货价")) return "wholesale";
      return "retail";
    },
    setBrandDiscountBase(brand, mode) {
      if (!brand) return "缺少品牌";
      db.brandDiscountBase = db.brandDiscountBase || {};
      db.brandDiscountBase[brand] = mode === "wholesale" ? "wholesale" : "retail";
      db.brandProfiles = db.brandProfiles || {};
      db.brandProfiles[brand] = { ...(db.brandProfiles[brand] || {}), discountBase: db.brandDiscountBase[brand] };
      save();
      return `${brand} 折扣计算已设为按${db.brandDiscountBase[brand] === "wholesale" ? "订货价" : "零售价"}`;
    },
    lineUnitBase(line, brand) {
      const g = findGoods(line && line.sku) || {};
      const retail = parseMoney(line.retail != null ? line.retail : g.retail);
      const wholesale = parseMoney(line.wholesale != null ? line.wholesale : (line.price != null ? line.price : g.wholesale));
      return Store.brandDiscountBase(brand || g.brand) === "wholesale" ? wholesale : (retail || wholesale);
    },
    fairSlotsOf(fairId, brand) {
      db.fairSlots = db.fairSlots || {};
      const m = db.fairSlots[fairId] || {};
      if (brand) return m[brand] || [];
      return m;
    },
    saveFairSlot(fairId, brand, slot) {
      if (!fairId || !brand) return { ok: false, msg: "缺少订货会或品牌" };
      db.fairSlots = db.fairSlots || {};
      db.fairSlots[fairId] = db.fairSlots[fairId] || {};
      const list = db.fairSlots[fairId][brand] || [];
      const row = {
        id: slot.id || uid("SL"),
        date: slot.date || Store.todayStr(),
        from: slot.from || "09:00",
        to: slot.to || "10:00",
        cap: Number(slot.cap || 0),
        booked: Number(slot.booked || 0)
      };
      if (!row.cap) return { ok: false, msg: "请填写接待上限" };
      const i = list.findIndex(x => x.id === row.id);
      if (i >= 0) list[i] = { ...list[i], ...row };
      else list.push(row);
      db.fairSlots[fairId][brand] = list;
      save();
      return { ok: true, msg: "时段已保存", id: row.id };
    },
    removeFairSlot(fairId, brand, slotId) {
      const list = Store.fairSlotsOf(fairId, brand);
      db.fairSlots[fairId][brand] = list.filter(x => x.id !== slotId);
      save();
      return "已删除时段";
    },
    importFairSlots(fairId, brand, text) {
      const lines = String(text || "").split(/\r?\n/).map(s => s.trim()).filter(Boolean);
      let n = 0;
      lines.forEach(line => {
        if (/^日期/.test(line)) return;
        const parts = line.split(/[,，\t]/).map(s => s.trim());
        if (parts.length < 4) return;
        const r = Store.saveFairSlot(fairId, brand, { date: parts[0], from: parts[1], to: parts[2], cap: parts[3] });
        if (r.ok) n += 1;
      });
      return { ok: true, msg: n ? `已导入 ${n} 条时段` : "没有可导入的行（格式：日期,开始,结束,上限）" };
    },
    appointmentsByFair(fairId) {
      const fair = (db.orderingFairs || []).find(f => f.id === fairId || f.season === fairId);
      const season = fair && fair.season;
      const brands = (fair && fair.brands) || [];
      return (db.appointments || []).filter(a => {
        if (a.fairId && fair && a.fairId === fair.id) return true;
        if (season && a.season === season && (!brands.length || brands.includes(a.brand))) return true;
        return false;
      });
    },
    fairAppointSummary(fairId) {
      const fair = (db.orderingFairs || []).find(f => f.id === fairId) || {};
      const brands = fair.brands || [];
      const ap = Store.appointmentsByFair(fairId);
      return brands.map(brand => {
        const rows = ap.filter(a => a.brand === brand);
        const passed = rows.filter(a => a.status === "已通过" || a.status === "已预约");
        const people = passed.reduce((s, a) => s + Number(a.people || 1), 0);
        const slots = Store.fairSlotsOf(fairId, brand);
        const cap = slots.reduce((s, x) => s + Number(x.cap || 0), 0);
        return { brand, total: rows.length, passed: passed.length, people, cap, slots: slots.length };
      });
    },
    addCheckin(payload) {
      const buyer = (db.buyers || []).find(b => b.phone === payload.phone || b.name === payload.store);
      db.checkins = db.checkins || [];
      db.checkins.unshift({
        id: uid("CK"),
        fairId: payload.fairId || ((db.orderingFairs || [])[0] && db.orderingFairs[0].id),
        brand: payload.brand || "—",
        store: (buyer && buyer.name) || payload.store || "现场访客",
        phone: payload.phone || (buyer && buyer.phone) || "",
        kind: payload.kind === "现场" ? "现场" : "预约",
        at: new Date().toISOString().slice(0, 16).replace("T", " "),
        slot: payload.slot || "—"
      });
      const ap = (db.appointments || []).find(a => a.phone === payload.phone && a.brand === payload.brand);
      if (ap) ap.checkin = db.checkins[0].at;
      save();
      return { ok: true, msg: `已签到 ${db.checkins[0].store}（${db.checkins[0].kind}）` };
    },
    setBuyerAllowSelfSub(name, on) {
      const b = db.buyers.find(x => x.name === name);
      if (!b) return "买手不存在";
      b.allowSelfSub = !!on;
      save();
      return `${name} ${b.allowSelfSub ? "允许" : "不允许"}买手自行添加子账号`;
    },
    addBuyerSubAccount(ownerName, payload) {
      const b = db.buyers.find(x => x.name === ownerName);
      if (!b) return { ok: false, msg: "买手不存在" };
      const phone = String(payload.phone || "").trim();
      if (!/^1\d{10}$/.test(phone)) return { ok: false, msg: "请填写 11 位子账号手机号" };
      b.subAccounts = b.subAccounts || [];
      if (b.subAccounts.some(s => s.phone === phone)) return { ok: false, msg: "该手机号已是子账号" };
      b.subAccounts.unshift({ name: payload.name || "子账号", phone, at: new Date().toISOString().slice(0, 10) });
      save();
      return { ok: true, msg: `已添加子账号 ${phone}，与主账号共享订单和选款单` };
    },
    syncGoodsPriceToOrders(sku) {
      const g = findGoods(sku);
      if (!g) return { ok: false, msg: "商品不存在" };
      const closed = [ORDER_ST.done, ORDER_ST.canceled, ORDER_ST.rejected];
      let hit = 0;
      (db.orders || []).forEach(o => {
        if (closed.includes(normStatus(o.status))) return;
        let changed = false;
        (o.lines || []).forEach(l => {
          if (l.sku !== g.sku && l.sku !== g.skc && l.sku !== (g.skc || g.sku)) return;
          l.retail = parseMoney(g.retail);
          l.wholesale = parseMoney(g.wholesale);
          l.price = Store.lineUnitBase(l, o.brand);
          changed = true;
          hit += 1;
        });
        if (!changed) return;
        let amount = 0;
        (o.lines || []).forEach(l => {
          const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
          amount += qty * Number(l.price || 0) * Number(l.discount || 1);
        });
        o.amount = money(amount);
        o.deposit = money(amount * Number(o.depositRatio || Store.brandDepositRatio(o.brand)));
        o.flowLog = o.flowLog || [];
        o.flowLog.unshift({ at: new Date().toISOString().slice(0, 16).replace("T", " "), text: `商品 ${g.sku} 价格已从商品管理同步，订单金额 ¥${o.amount}` });
      });
      save(); syncLegacy();
      return { ok: true, msg: hit ? `已同步到 ${hit} 条未完成订单明细，并按当前折扣重算金额` : "没有未完成订单包含此商品" };
    },
    orderPriceWave(orderId) {
      const o = db.orders.find(x => x.id === orderId);
      if (!o) return [];
      return (o.lines || []).map(l => {
        const g = findGoods(l.sku) || {};
        const nowR = parseMoney(g.retail);
        const nowW = parseMoney(g.wholesale);
        const oldR = parseMoney(l.retail);
        const oldW = parseMoney(l.wholesale != null ? l.wholesale : l.price);
        return {
          sku: l.sku, title: l.title || g.title,
          oldRetail: oldR, nowRetail: nowR,
          oldWholesale: oldW, nowWholesale: nowW,
          changed: nowR !== oldR || nowW !== oldW
        };
      });
    },
    addOrderLine(orderId, sku) {
      const o = db.orders.find(x => x.id === orderId);
      const g = findGoods(sku);
      if (!o || !g) return { ok: false, msg: "订单或商品不存在" };
      if (orderFrozen(o.status)) return { ok: false, msg: "订单已结束，不可改商品" };
      o.lines = o.lines || [];
      if (o.lines.some(l => l.sku === g.sku || l.sku === g.skc)) return { ok: false, msg: "订单已包含该商品" };
      const sizes = Object.fromEntries((g.sizes || ["S", "M", "L"]).map((sz, i) => [sz, i === 0 ? 1 : 0]));
      o.lines.push({
        sku: g.skc || g.sku, title: g.title, sizes,
        retail: parseMoney(g.retail), wholesale: parseMoney(g.wholesale),
        price: Store.lineUnitBase({ retail: g.retail, wholesale: g.wholesale, price: g.wholesale, sku: g.sku }, o.brand),
        discount: 1, l1Cat: Store.goodsL1Cat(g.cat)
      });
      save();
      return { ok: true, msg: `已加入 ${g.title}` };
    },
    rejectSelection(selId, reason) {
      const s = db.selections.find(x => x.id === selId);
      if (!s) return { ok: false, msg: "选款单不存在" };
      const st = normSelStatus(s);
      if (st !== SEL_ST.confirm && st !== "待审核") return { ok: false, msg: "只有待确认的选款单可驳回" };
      s.status = SEL_ST.draft;
      s.locked = false;
      s.rejectReason = reason || "请修改后重新提交";
      save(); syncLegacy();
      Store.pushBuyerMessage("选款单被驳回", `选款单 ${s.id} 已退回待提交：${s.rejectReason}`);
      return { ok: true, msg: "已驳回，状态退回待提交，买手可修改后再提交" };
    },
    submitSelection(selId) {
      const s = db.selections.find(x => x.id === selId);
      if (!s) return { ok: false, msg: "选款单不存在" };
      const st = normSelStatus(s);
      if (st === SEL_ST.confirm) return { ok: false, msg: "已提交，等待平台确认" };
      if (st !== SEL_ST.draft) return { ok: false, msg: `当前状态「${st}」不可提交` };
      s.status = SEL_ST.confirm;
      s.locked = true;
      s.rejectReason = "";
      save();
      return { ok: true, msg: "已提交，等待平台确认" };
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
      if (info.phone != null && !/^1\d{10}$/.test(String(info.phone).trim())) {
        return "请填写 11 位联系手机（品牌端登录账号）";
      }
      if (info.contact != null && !String(info.contact).trim()) return "请填写联系人";
      const cats = info.cats || db.brandProfile.cats || [];
      const styles = info.styles || db.brandProfile.styles || [];
      const crowds = info.crowds || db.brandProfile.crowds || [];
      const name = info.name || db.brandProfile.name;
      Object.assign(db.brandProfile, info, {
        cats, styles, crowds,
        cat: cats[0] || info.cat || db.brandProfile.cat,
        style: styles.join(" / "),
        crowd: crowds.join(" / ")
      });
      db.brandProfiles = db.brandProfiles || {};
      db.brandProfiles[name] = { ...(db.brandProfiles[name] || {}), ...db.brandProfile };
      if (info.ratio != null) {
        db.brandDeposit = db.brandDeposit || {};
        db.brandDeposit[name] = Number(info.ratio) || 0.3;
      }
      if (typeof info.needAudit === "boolean") {
        db.brandAudit = db.brandAudit || {};
        db.brandAudit[name] = !!info.needAudit;
      }
      if (info.discountBase) {
        db.brandDiscountBase = db.brandDiscountBase || {};
        db.brandDiscountBase[name] = info.discountBase === "wholesale" ? "wholesale" : "retail";
      }
      // sync into RR.brands for buyer about
      const rb = RR.brands.find(x => x.name === name);
      if (rb) Object.assign(rb, {
        about: db.brandProfile.about, cat: db.brandProfile.cat,
        style: db.brandProfile.style, crowd: db.brandProfile.crowd,
        contact: info.contact || rb.contact, phone: info.phone || rb.phone
      });
      save();
      return "品牌资料已保存";
    },
    getBrandProfile(name) {
      db.brandProfiles = db.brandProfiles || {};
      if (name && db.brandProfiles[name]) return db.brandProfiles[name];
      if (name && db.brandProfile && db.brandProfile.name === name) return db.brandProfile;
      const rb = (RR.brands || []).find(x => x.name === name);
      if (!rb) return db.brandProfile;
      return {
        ...rb,
        cats: [rb.cat].filter(Boolean),
        styles: String(rb.style || "").split(/[/／、,，]/).map(x => x.trim()).filter(Boolean),
        crowds: String(rb.crowd || "").split(/[/／、,，]/).map(x => x.trim()).filter(Boolean),
        contact: rb.contact || "",
        phone: rb.phone || ""
      };
    },

    // ----- selections / orders -----
    genOrderFromSelection(selId) {
      const s = db.selections.find(x => x.id === selId);
      if (!s) return { ok: false, msg: "选款单不存在" };
      if (s.status === SEL_ST.ordered) return { ok: false, msg: "选款单已生成订单，不可重复生成" };
      if (s.status === SEL_ST.canceled) return { ok: false, msg: "选款单已取消" };
      if (normSelStatus(s) !== SEL_ST.confirm) {
        return { ok: false, msg: `当前状态「${normSelStatus(s)}」不可生成订单，需买手提交为待确认` };
      }

      // replenishment rule if season has no first order for this store (platform mock: check buyerSession for Liora, else allow)
      const check = Store.canOrder(s.brand, s.season, s.type === "补货单" ? "补货单" : "首单");
      if (!check.ok) return check;

      const orderId = uid("ORD");
      const amountNum = parseMoney(s.amount);
      const brandRatio = Store.brandDepositRatio(s.brand);
      const depositNum = amountNum * brandRatio;
      db.orders.unshift({
        id: orderId,
        brand: s.brand,
        season: s.season,
        store: s.store,
        type: "首单",
        amount: money(amountNum),
        deposit: money(depositNum),
        status: ORDER_ST.confirm,
        whitelist: false,
        depositRatio: brandRatio,
        payments: [],
        paidDeposit: "0.00",
        paidTotal: "0.00",
        settleDiff: "",
        ocId: "",
        rejectReason: "",
        cancelReason: "",
        invoice: null,
        voucher: null,
        substores: [],
        returns: [],
        lines: clone(s.lines || []).map(l => ({
          sku: l.sku, title: l.title, sizes: clone(l.sizes), price: parseMoney(l.price), discount: 1
        })),
        createdAt: new Date().toISOString().slice(0, 16).replace("T", " "),
        fromSelection: s.id,
        flowLog: [{ at: new Date().toISOString().slice(0, 16).replace("T", " "), text: "买手由选款单生成订单，等待平台确认" }]
      });
      s.status = SEL_ST.ordered;
      s.locked = true;
      save(); syncLegacy();
      return { ok: true, msg: `已生成订单 ${orderId}`, orderId };
    },
    canMutateSelection(s, opts) {
      const platform = !!(opts && opts.platform);
      if (!s) return { ok: false, msg: "选款单不存在" };
      const st = normSelStatus(s);
      if (st === SEL_ST.ordered) return { ok: false, msg: "选款单已生成订单，不可修改" };
      if (st === SEL_ST.canceled) return { ok: false, msg: "选款单已取消" };
      if (platform && st === SEL_ST.confirm) return { ok: true };
      if (st === SEL_ST.draft) return { ok: true };
      if (s.locked) return { ok: false, msg: "选款单已提交，需平台驳回后才能再改" };
      return { ok: true };
    },
    cancelSelection(selId) {
      const s = db.selections.find(x => x.id === selId);
      if (!s) return "选款单不存在";
      if (normSelStatus(s) === SEL_ST.ordered) return "已生成订单的选款单不可取消，需先驳回订单";
      s.status = SEL_ST.canceled;
      s.locked = true;
      save(); syncLegacy();
      return `选款单 ${selId} 已取消`;
    },
    saveSelectionLines(selId, lines, opts) {
      const s = db.selections.find(x => x.id === selId);
      const gate = Store.canMutateSelection(s, opts);
      if (!gate.ok) return gate;
      s.lines = (lines || []).map((l, i) => enrichLine(l, i));
      const q = Store.selectionQuote(s.lines, null, s.season, s.brand);
      s.pieces = q.pieces;
      s.skus = s.lines.length;
      s.amount = money(q.wholesale);
      s.retailAmount = money(q.retail);
      save(); syncLegacy();
      return { ok: true, msg: "选款单已保存", quote: q };
    },
    bumpSelectionQty(selId, sku, size, d, opts) {
      const s = db.selections.find(x => x.id === selId);
      const gate = Store.canMutateSelection(s, opts);
      if (!gate.ok) return gate;
      const line = (s.lines || []).find(x => x.sku === sku);
      if (!line) return { ok: false, msg: "款式不存在" };
      line.sizes = line.sizes || {};
      line.sizes[size] = Math.max(0, Number(line.sizes[size] || 0) + Number(d || 0));
      return Store.saveSelectionLines(selId, s.lines, opts);
    },
    removeSelectionLine(selId, sku, opts) {
      const s = db.selections.find(x => x.id === selId);
      const gate = Store.canMutateSelection(s, opts);
      if (!gate.ok) return gate;
      return Store.saveSelectionLines(selId, (s.lines || []).filter(l => l.sku !== sku), opts);
    },
    addSelectionLine(selId, sku, opts) {
      const s = db.selections.find(x => x.id === selId);
      const gate = Store.canMutateSelection(s, opts);
      if (!gate.ok) return gate;
      if ((s.lines || []).some(l => l.sku === sku)) return { ok: false, msg: "该款已在选款单中" };
      const g = findGoods(sku);
      if (!g) return { ok: false, msg: "商品不存在" };
      if (g.brand !== s.brand) return { ok: false, msg: "只能添加本品牌款式（选款单按品牌独立）" };
      const sizes = Object.fromEntries((g.sizes || ["S", "M", "L"]).map(sz => [sz, sz === (g.sampleSize || "M") || sz === "M" ? 1 : 0]));
      s.lines = s.lines || [];
      s.lines.push(enrichLine({ sku: g.sku, title: g.title, sizes, price: g.wholesale, retail: g.retail }, s.lines.length));
      return Store.saveSelectionLines(selId, s.lines, opts);
    },
    selectionQuote(lines, ruleMode, season, brandHint) {
      const brand = brandHint || ((lines && lines[0] && (findGoods(lines[0].sku) || {}).brand) || "");
      const rules = Store.getDiscountRules(season || db.ui.discountSeason, ruleMode);
      const groups = {
        服饰: { key: "cloth", pieces: 0, retail: 0, listed: 0 },
        配饰: { key: "accessory", pieces: 0, retail: 0, listed: 0 },
        生活方式: { key: "lifestyle", pieces: 0, retail: 0, listed: 0 }
      };
      (lines || []).forEach(l => {
        const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
        const type = l.goodsType || "服饰";
        const g = groups[type] || groups["服饰"];
        const retailUnit = parseMoney(l.retail != null ? l.retail : (parseMoney(l.price) / 0.45));
        const listedUnit = parseMoney(l.wholesale != null ? l.wholesale : l.price);
        g.pieces += qty;
        g.retail += qty * retailUnit;
        g.listed += qty * listedUnit;
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
          listed: g.listed,
          discount: disc,
          discountLabel: (disc * 10).toFixed(1).replace(/\.0$/, "") + "折",
          nextGap: nextStair ? Math.max(0, nextStair.amount - retail) : 0,
          nextDiscountLabel: nextStair ? (Number(nextStair.discount) * 10).toFixed(1).replace(/\.0$/, "") + "折" : ""
        };
      }).filter(t => t.pieces > 0 || t.retail > 0);
      const useWholesale = Store.brandDiscountBase(brand) === "wholesale";
      let wholesale = 0;
      types.forEach(t => { wholesale += (useWholesale ? t.listed : t.retail) * t.discount; });
      if (!types.length) {
        (lines || []).forEach(l => {
          const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
          wholesale += qty * Store.lineUnitBase(l, brand);
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
        activeStair,
        discountBase: useWholesale ? "订货价" : "零售价"
      };
    },
    draftQuote(brand) {
      const items = db.buyerSession.selections.filter(x => !brand || x.brand === brand);
      const toLine = (i, idx, forceOne) => {
        const g = findGoods(i.sku) || i;
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
      const bname = brand || (items[0] && items[0].brand) || "";
      return { items, lines, quote: Store.selectionQuote(quoteLines, null, null, bname), brand: bname };
    },
    bumpDraftQty(sku, size, d) {
      const item = db.buyerSession.selections.find(x => x.sku === sku);
      if (!item) return { ok: false, msg: "未在选款中" };
      const g = findGoods(sku);
      item.sizes = item.sizes || Object.fromEntries((g && g.sizes || ["S", "M", "L"]).map(sz => [sz, 0]));
      item.sizes[size] = Math.max(0, Number(item.sizes[size] || 0) + Number(d || 0));
      save();
      return { ok: true, msg: "数量已更新" };
    },
    /* ---------- 订单流程（对齐《订单流程图》） ---------- */
    ORDER_ST,
    SEL_ST,
    ORDER_VIEW,
    orderViewStatus,
    normSelStatus,
    orderStage(o) { return stageOf(o && o.status); },
    orderFlowNodes(o) {
      const cur = stageOf(o && o.status);
      const st = normStatus(o && o.status);
      const ended = st === ORDER_ST.rejected || st === ORDER_ST.canceled;
      return ORDER_FLOW.map((name, i) => ({
        name,
        done: !ended && i < cur,
        current: !ended && i === cur,
        owner: [ORDER_ST.depositAck, ORDER_ST.depositPay, ORDER_ST.finalPay].includes(name) ? "买手端" : "平台端"
      }));
    },
    paymentStats(o) {
      const total = parseMoney(o && o.amount);
      const deposit = parseMoney(o && o.deposit);
      const list = (o && o.payments) || [];
      const sum = (kind, status) => list
        .filter(p => (!kind || p.kind === kind) && (!status || p.status === status))
        .reduce((a, p) => a + parseMoney(p.amount), 0);
      const confirmed = sum(null, "已核对");
      return {
        total, deposit,
        depositOk: sum("定金", "已核对"),
        finalDue: Math.max(0, total - deposit),
        finalOk: sum("尾款", "已核对"),
        confirmed,
        pending: sum(null, "待核对"),
        unpaid: Math.max(0, total - confirmed),
        /* 付款差额：正=少付，负=多付（订单完成时统计） */
        diff: total - confirmed
      };
    },
    /* #52：对外只有未完成/已完成/已取消；未完成仍可并行操作 */
    orderActions(o, side) {
      const st = normStatus(o && o.status);
      const view = orderViewStatus(o);
      const platform = side !== "buyer";
      const A = [];
      if (view === ORDER_VIEW.done || view === ORDER_VIEW.canceled) {
        A.push({ act: "download:订单", label: "下载订单" });
        return A;
      }
      if (st === ORDER_ST.rejected) {
        if (!platform) A.push({ act: "go:buyer-selection", label: "回到选款单重新提交", primary: true });
        A.push({ act: "download:订单", label: "下载订单" });
        return A;
      }
      if (platform) {
        A.push({ act: "open-order-panel:modify", label: "设置折扣 / 编辑商品" });
        A.push({ act: "open-order-panel:deposit", label: "设置定金" });
        A.push({ act: "gen-oc", label: o.ocId ? "查看 OC" : "生成 OC" });
        A.push({ act: "open-order-panel:wave", label: "查看商品价格波动" });
        A.push({ act: "settle-order", label: "订单完成", primary: true });
        A.push({ act: "open-order-panel:reject", label: "订单驳回" });
        if (st === ORDER_ST.depositCheck) A.push({ act: "open-order-panel:check", label: "确认定金凭证" });
        if (st === ORDER_ST.finalPay) A.push({ act: "open-order-panel:check", label: "确认尾款凭证" });
        A.push({ act: "open-order-panel:invoice", label: "发票信息" });
      } else {
        A.push({ act: "open-order-panel:cancel", label: "取消订单" });
        if (st === ORDER_ST.depositAck) A.push({ act: "buyer-confirm-deposit", label: "确认定金", primary: true });
        else if (st === ORDER_ST.depositPay) A.push({ act: "open-order-panel:pay-deposit", label: "上传付款凭证", primary: true });
        else if (st === ORDER_ST.finalPay) A.push({ act: "open-order-panel:pay-final", label: "上传尾款凭证", primary: true });
      }
      A.push({ act: "download:订单", label: "下载订单" });
      return A;
    },
    orderPendingTips(o) {
      if (!o) return [];
      const view = orderViewStatus(o);
      if (view === ORDER_VIEW.done) return [];
      if (view === ORDER_VIEW.canceled) return ["已取消：" + (o.cancelReason || "买手主动取消")];
      if (normStatus(o.status) === ORDER_ST.rejected) return ["已驳回，内容已退回选款单"];
      return ["未完成：可订单完成或驳回订单"];
    },

    advanceOrder(orderId, action, payload = {}) {
      const o = db.orders.find(x => x.id === orderId);
      if (!o) return { ok: false, msg: "订单不存在" };
      const st = normStatus(o.status);
      const stamp = () => new Date().toISOString().slice(0, 16).replace("T", " ");
      const log = text => {
        o.flowLog = o.flowLog || [];
        o.flowLog.unshift({ at: stamp(), text });
      };
      const unlockSelection = () => {
        if (!o.fromSelection) return;
        const s = db.selections.find(x => x.id === o.fromSelection);
        if (s) { s.locked = false; s.status = SEL_ST.draft; s.rejectReason = o.rejectReason || "订单已退回选款单"; }
      };
      /* 旧动作名兼容（历史门禁脚本/页面） */
      const alias = {
        buyerConfirm: "platformConfirm", depositConfirm: "setDeposit",
        finalConfirm: "finalPass", complete: "settle", voucher: "uploadVoucher"
      };
      const act = alias[action] || action;

      if (act === "platformConfirm") {
        if (![ORDER_ST.confirm, ORDER_ST.rejected].includes(st)) return { ok: false, msg: `当前状态「${st}」不可确认订单` };
        o.status = ORDER_ST.discount;
        o.materialsOk = true;
        o.rejectReason = "";
        log("平台确认订单，进入待确认折扣");
      } else if (act === "confirmDiscount") {
        if (st !== ORDER_ST.discount) return { ok: false, msg: `当前状态「${st}」不可确认折扣` };
        o.status = ORDER_ST.deposit;
        log("平台确认折扣，进入待确认定金");
      } else if (act === "reject") {
        if ([ORDER_ST.done, ORDER_ST.canceled].includes(st)) return { ok: false, msg: "订单已结束，不可驳回" };
        o.status = ORDER_ST.rejected;
        o.rejectReason = payload.reason || "订单金额/款式需调整";
        unlockSelection();
        log(`平台驳回订单：${o.rejectReason}（买手可回到选款单修改后重新下单）`);
        Store.pushBuyerMessage("订单被驳回", `订单 ${o.id} 被驳回：${o.rejectReason}`);
      } else if (act === "cancel") {
        if ([ORDER_ST.done, ORDER_ST.canceled].includes(st)) return { ok: false, msg: "订单已结束，不可取消" };
        o.status = ORDER_ST.canceled;
        o.cancelReason = payload.reason || "买手主动取消";
        unlockSelection();
        log(`买手取消订单：${o.cancelReason}`);
      } else if (act === "setDeposit") {
        if (orderFrozen(st)) return { ok: false, msg: "订单已结束，不可设置定金" };
        const ratio = Number(payload.ratio || o.depositRatio || Store.brandDepositRatio(o.brand));
        o.depositRatio = ratio;
        o.deposit = money(parseMoney(o.amount) * ratio);
        o.status = ORDER_ST.depositAck;
        log(`平台设置首付比例 ${Math.round(ratio * 100)}%，应收定金 ¥${o.deposit}，待买手确认定金`);
        Store.pushBuyerMessage("待买手确认定金", `订单 ${o.id} 定金 ¥${o.deposit}，请在「我的订单」确认。`);
      } else if (act === "setDiscount") {
        if (orderFrozen(st)) return { ok: false, msg: "订单已结束，不可改折扣" };
        if (payload.catDiscount) {
          const cd = payload.catDiscount;
          o.catDiscount = {
            cloth: Number(cd.cloth || 0.45),
            accessory: Number(cd.accessory || 0.5),
            lifestyle: Number(cd.lifestyle || 0.55)
          };
          (o.lines || []).forEach(l => {
            const g = findGoods(l.sku);
            const l1 = Store.goodsL1Cat((g && g.cat) || l.l1Cat);
            l.l1Cat = l1;
            l.discount = l1 === "配饰" ? o.catDiscount.accessory
              : l1 === "生活方式" ? o.catDiscount.lifestyle
              : o.catDiscount.cloth;
          });
          log(`平台设置本单分类折扣 服饰${o.catDiscount.cloth}/配饰${o.catDiscount.accessory}/生活${o.catDiscount.lifestyle}`);
        } else {
          const d = Number(payload.discount || 0);
          if (!d || d <= 0 || d > 1) return { ok: false, msg: "折扣需在 0~1 之间（如 0.45）" };
          (o.lines || []).forEach(l => { l.discount = d; });
          log(`平台设置整单折扣 ${d}`);
        }
        let amount = 0;
        (o.lines || []).forEach(l => {
          const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
          amount += qty * Number(l.price || 0) * Number(l.discount || 1);
        });
        o.amount = money(amount);
        o.deposit = money(amount * Number(o.depositRatio || 0.3));
        log(`订单金额更新为 ¥${o.amount}`);
      } else if (act === "buyerConfirmDeposit") {
        if (st !== ORDER_ST.depositAck) return { ok: false, msg: `当前状态「${st}」不可确认定金` };
        o.status = ORDER_ST.depositPay;
        log("买手确认定金，待上传支付凭证");
      } else if (act === "uploadVoucher") {
        const kind = payload.kind === "尾款" ? "尾款" : "定金";
        const canDeposit = [ORDER_ST.depositPay, ORDER_ST.depositCheck].includes(st);
        const canFinal = st === ORDER_ST.finalPay;
        if (kind === "定金" && !canDeposit) return { ok: false, msg: `当前状态「${st}」无需上传定金凭证` };
        if (kind === "尾款" && !canFinal) return { ok: false, msg: `当前状态「${st}」无需上传尾款凭证` };
        const stats = Store.paymentStats(o);
        const amt = parseMoney(payload.amount) || (kind === "定金" ? parseMoney(o.deposit) : Math.max(0, stats.total - stats.confirmed));
        if (amt <= 0) return { ok: false, msg: "付款金额需大于 0" };
        o.payments = o.payments || [];
        o.payments.push({
          kind, amount: money(amt), at: payload.at || stamp().slice(0, 10),
          file: payload.file || `${kind}凭证.pdf`, status: "待核对", note: ""
        });
        o.voucher = { amount: money(amt), at: payload.at || stamp().slice(0, 10), file: `${kind}凭证.pdf` };
        if (kind === "定金") o.status = ORDER_ST.depositCheck;
        log(`买手上传${kind}付款凭证 ¥${money(amt)}，待平台确认`);
      } else if (act === "checkVoucher") {
        const list = o.payments || [];
        const idx = payload.index != null && payload.index !== "" ? Number(payload.index) : list.findIndex(p => p.status === "待核对");
        const p = list[idx];
        if (!p) return { ok: false, msg: "没有待核对的付款凭证" };
        const pass = payload.pass !== false;
        p.status = pass ? "已核对" : "不通过";
        p.note = payload.note || (pass ? "" : "凭证与金额不符，请重新上传");
        const stats = Store.paymentStats(o);
        o.paidDeposit = money(stats.depositOk);
        o.paidTotal = money(stats.confirmed);
        if (p.kind === "定金") {
          o.status = pass ? ORDER_ST.finalPay : ORDER_ST.depositPay;
        } else {
          o.status = ORDER_ST.finalPay;
        }
        log(pass
          ? `平台确认${p.kind}凭证通过 ¥${p.amount}`
          : `平台确认${p.kind}凭证不通过：${p.note}`);
        Store.pushBuyerMessage(pass ? `${p.kind}已确认` : `${p.kind}凭证需重新上传`,
          `订单 ${o.id}：${pass ? `${p.kind} ¥${p.amount} 已确认通过` : p.note}`);
      } else if (act === "genOc") {
        if (orderFrozen(st)) return { ok: false, msg: "订单已结束，不可生成 OC" };
        const oc = Store.createOc(o.id);
        o.ocId = oc.id || o.ocId;
        o.contractUploaded = true;
        log(`平台生成 OC ${o.ocId}（可下载）`);
        Store.pushBuyerMessage("OC 已生成", `订单 ${o.id} 的 OC 已生成，请支付尾款。`);
      } else if (act === "finalPass") {
        if (st !== ORDER_ST.finalPay) return { ok: false, msg: `当前状态「${st}」不可确认尾款` };
        const stats = Store.paymentStats(o);
        const rest = Math.max(0, stats.total - stats.confirmed);
        o.payments = o.payments || [];
        o.payments.forEach(p => { if (p.status === "待核对") p.status = "已核对"; });
        const after = Store.paymentStats(o);
        if (after.total - after.confirmed > 0.5) {
          o.payments.push({ kind: "尾款", amount: money(after.total - after.confirmed), at: stamp().slice(0, 10), file: "尾款凭证.pdf", status: "已核对", note: "平台代确认" });
        }
        const final = Store.paymentStats(o);
        o.paidDeposit = money(final.depositOk);
        o.paidTotal = money(final.confirmed);
        log(`平台确认尾款 ¥${money(rest)}（可继续分批或点订单完成）`);
      } else if (act === "settle") {
        if (orderFrozen(st)) return { ok: false, msg: "订单已结束" };
        const stats = Store.paymentStats(o);
        o.settleDiff = money(stats.diff);
        o.status = ORDER_ST.done;
        if (stats.diff < 0) {
          const b = db.buyers.find(x => x.name === o.store);
          if (b) {
            b.balances = b.balances || {};
            b.balances[o.brand] = (b.balances[o.brand] || 0) + Math.abs(stats.diff);
          }
        }
        log(`平台手动完成订单（系统暂不考虑发货），付款差额 ¥${o.settleDiff}`);
        Store.pushBuyerMessage("订单已完成", `订单 ${o.id} 已完成，付款差额 ¥${o.settleDiff}。`);
      } else if (act === "whitelist") {
        o.whitelist = true;
        save(); syncLegacy();
        return { ok: true, msg: "已设为白名单，允许低于起订量继续流转" };
      } else if (act === "invoice") {
        o.invoice = { title: payload.title || o.store, tax: payload.tax || "", amount: o.amount, type: payload.type || "普通发票", at: new Date().toISOString() };
      } else if (act === "substore") {
        o.substores = payload.rows || [];
      } else if (act === "return") {
        o.returns = o.returns || [];
        o.returns.push({ type: payload.type || "退货", sku: payload.sku, qty: Number(payload.qty || 1), reason: payload.reason || "", at: new Date().toISOString() });
      } else if (act === "modify") {
        if (orderFrozen(st)) return { ok: false, msg: "订单已结束，不可再改商品" };
        o.lines = payload.lines || o.lines;
        let amount = 0;
        o.lines.forEach(l => {
          const qty = Object.values(l.sizes || {}).reduce((a, b) => a + Number(b || 0), 0);
          amount += qty * Number(l.price || 0) * Number(l.discount || 1);
        });
        o.amount = money(amount);
        o.deposit = money(amount * Number(o.depositRatio || 0.3));
        log(`平台修改订单，金额调整为 ¥${o.amount}`);
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
    pushBuyerMessage(title, body) {
      db.buyerMessages = db.buyerMessages || [];
      db.buyerMessages.unshift({
        id: "m" + Date.now() + Math.floor(Math.random() * 100),
        title, body,
        time: new Date().toISOString().slice(0, 16).replace("T", " "),
        read: false
      });
      db.buyerMessages = db.buyerMessages.slice(0, 40);
      save();
    },

    /* ---------- 注册流程（对齐《注册流程图》） ---------- */
    sendSmsCode(phone) {
      if (!/^1\d{10}$/.test(String(phone || "").trim())) return { ok: false, msg: "请输入 11 位手机号" };
      db.regSession = db.regSession || {};
      db.regSession.lastCodeAt = new Date().toISOString().slice(0, 16).replace("T", " ");
      save();
      return { ok: true, code: "888888", msg: `验证码已发送至 ${phone}（原型固定 888888）` };
    },
    /* 买手填写资料注册 → 提交申请（平台端「买手审核」出现待审核记录） */
    submitBuyerRegister(payload = {}) {
      const phone = String(payload.phone || "").trim();
      const store = String(payload.store || "").trim();
      if (!store) return { ok: false, msg: "请填写店铺名" };
      if (!/^1\d{10}$/.test(phone)) return { ok: false, msg: "请输入 11 位手机号" };
      if (String(payload.code || "").trim() !== "888888") return { ok: false, msg: "验证码错误（原型固定 888888）" };
      const dup = db.buyers.find(b => b.phone === phone || b.name === store);
      if (dup && dup.status === "已通过") return { ok: false, msg: `该手机号/店铺已注册并通过审核，请直接登录` };
      const at = new Date().toISOString().slice(0, 16).replace("T", " ");
      const record = {
        name: store,
        phone,
        city: payload.city || "",
        province: String(payload.city || "").split("/")[0].trim(),
        contact: payload.contact || "",
        level: "—",
        status: "待审核",
        source: "手机号注册",
        regAt: at,
        reason: "",
        intent: payload.intent || "",
        balances: {},
        addresses: [{ name: payload.contact || "收货人", phone, addr: payload.addr || payload.city || "" }],
        invoice: { title: payload.invoiceTitle || store, tax: payload.tax || "" },
        substores: []
      };
      if (dup) Object.assign(dup, record);
      else db.buyers.unshift(record);
      db.regSession = { phone, store, status: "待审核", reason: "", at };
      save(); syncLegacy();
      return { ok: true, msg: `注册资料已提交，等待平台审核（${store}）` };
    },
    /* 审核进度：买手端按手机号查询 */
    buyerRegStatus(phone) {
      const p = String(phone || db.regSession && db.regSession.phone || "").trim();
      const b = db.buyers.find(x => x.phone === p);
      if (!b) return { found: false, phone: p };
      return { found: true, phone: p, store: b.name, status: b.status, reason: b.reason || "", at: b.regAt || "", buyer: b };
    },
    /* 登录门槛：审核通过才可进入买手端 */
    buyerLogin(phone, code) {
      const p = String(phone || "").trim();
      if (!/^1\d{10}$/.test(p)) return { ok: false, msg: "请输入 11 位手机号" };
      if (String(code || "").trim() !== "888888") return { ok: false, msg: "验证码错误（原型固定 888888）" };
      const b = db.buyers.find(x => x.phone === p);
      if (!b) return { ok: false, code: "unregistered", msg: "该手机号未注册，请先提交注册资料" };
      if (b.status === "待审核") return { ok: false, code: "pending", msg: `「${b.name}」资料审核中，通过后才能登录买手端`, buyer: b };
      if (b.status === "已拒绝") return { ok: false, code: "rejected", msg: `审核被拒绝：${b.reason || "资料不符合要求"}，请修改资料后重新提交`, buyer: b };
      if (b.status === "已关闭") return { ok: false, code: "closed", msg: "账号权限已关闭，请联系平台", buyer: b };
      /* 审核通过：切换买手会话到该账号 */
      db.buyerSession.store = b.name;
      db.buyerSession.phone = b.phone;
      db.buyerSession.city = b.city || db.buyerSession.city;
      db.buyerSession.level = b.level || "—";
      if (b.invoice) db.buyerSession.invoice = { ...b.invoice };
      if (b.addresses && b.addresses.length) db.buyerSession.addresses = clone(b.addresses);
      save(); syncLegacy();
      return { ok: true, msg: `登录成功：${b.name}`, buyer: b };
    },
    /* #4 联系手机 = 品牌端登录账号 */
    brandLogin(phone, code) {
      const p = String(phone || "").trim();
      if (!/^1\d{10}$/.test(p)) return { ok: false, msg: "请输入 11 位手机号" };
      if (String(code || "").trim() !== "888888") return { ok: false, msg: "验证码错误（原型固定 888888）" };
      const fromRr = (RR.brands || []).find(b => String(b.phone || "").trim() === p);
      const fromProf = Object.values(db.brandProfiles || {}).find(b => String(b.phone || "").trim() === p);
      const brand = fromRr || fromProf;
      if (!brand || !brand.name) return { ok: false, msg: "该手机号未开通品牌端账号" };
      db.brandSession = { phone: p, brand: brand.name };
      save();
      return { ok: true, msg: `登录成功：${brand.name}`, brand: brand.name };
    },
    setIntention(store, brand, status) {
      const i = db.intentions.find(x => x.store === store && x.brand === brand);
      if (!i) return "意向不存在";
      i.status = status;
      i.auditAt = new Date().toISOString().slice(0, 16).replace("T", " ");
      if (store === db.buyerSession.store) {
        db.buyerSession.brandAccess = db.buyerSession.brandAccess || {};
        if (status === "已通过") db.buyerSession.brandAccess[brand] = "granted";
        if (status === "已拒绝") db.buyerSession.brandAccess[brand] = "denied";
        Store.pushBuyerMessage(`品牌申请${status}`, `「${brand}」品牌申请${status}${status === "已通过" ? "，可查看并下单该品牌商品。" : "。"}`);
      }
      save(); syncLegacy();
      return `意向已${status}`;
    },
    /* 平台审核买手：通过 / 拒绝（拒绝需原因，买手可改资料重新提交） */
    setBuyerStatus(name, status, reason) {
      const b = db.buyers.find(x => x.name === name);
      if (!b) return "买手不存在";
      b.status = status;
      if (status === "已拒绝" || status === "已关闭") b.reason = reason || "资料不完整，请补充后重新提交";
      if (status === "已通过") {
        b.reason = "";
        if (!b.level || b.level === "—") b.level = "C";
      }
      b.auditAt = new Date().toISOString().slice(0, 16).replace("T", " ");
      if (db.regSession && db.regSession.phone === b.phone) {
        db.regSession.status = status;
        db.regSession.reason = b.reason || "";
      }
      if (db.buyerSession.store === b.name || db.regSession && db.regSession.phone === b.phone) {
        Store.pushBuyerMessage(`买手审核${status}`, status === "已通过"
          ? `「${b.name}」审核通过，可登录买手端并提交品牌申请。`
          : `「${b.name}」审核未通过：${b.reason}`);
      }
      save(); syncLegacy();
      return `买手「${name}」→ ${status}`;
    },
    /* ---------- 品牌是否需审核买手（平台端品牌列表设置） ---------- */
    brandNeedAudit(brand) {
      db.brandAudit = db.brandAudit || {};
      return !!db.brandAudit[brand];
    },
    setBrandAudit(brand, need) {
      db.brandAudit = db.brandAudit || {};
      db.brandAudit[brand] = !!need;
      save();
      return `「${brand}」下单${need ? "需" : "无需"}审核买手`;
    },
    /* 品牌订单首付比例（定金）：下单与「设置定金」的默认值 */
    brandDepositRatio(brand) {
      db.brandDeposit = db.brandDeposit || {};
      return Number(db.brandDeposit[brand] || 0.3);
    },
    setBrandDepositRatio(brand, ratio) {
      const v = Number(String(ratio).replace("%", "")) || 0;
      const r = v > 1 ? v / 100 : v;
      if (!brand) return "请选择品牌";
      if (r <= 0 || r > 1) return "首付比例需在 1%~100% 之间";
      db.brandDeposit = db.brandDeposit || {};
      db.brandDeposit[brand] = Number(r.toFixed(2));
      save();
      return `「${brand}」订单首付比例已设为 ${Math.round(r * 100)}%`;
    },
    /* 平台端「品牌管理 · 添加品牌」 */
    addBrand(payload) {
      const name = String(payload.name || "").trim();
      if (!name) return { ok: false, msg: "请填写品牌名称" };
      if (!String(payload.contact || "").trim()) return { ok: false, msg: "请填写联系人" };
      if (!/^1\d{10}$/.test(String(payload.phone || "").trim())) return { ok: false, msg: "请填写 11 位联系手机（品牌端登录账号）" };
      if ((RR.brands || []).some(b => b.name === name)) return { ok: false, msg: "该品牌已存在" };
      const cats = payload.cats || [payload.cat || "女装"].filter(Boolean);
      const styles = payload.styles || (payload.style ? [payload.style] : []);
      const crowds = payload.crowds || (payload.crowd ? [payload.crowd] : []);
      RR.brands.unshift({
        name,
        cat: cats[0] || "女装",
        style: styles.join(" / "),
        crowd: crowds.join(" / "),
        about: payload.about || `${name} 品牌介绍`,
        contact: payload.contact,
        phone: payload.phone,
        year: payload.year || 2015,
        site: payload.site || "",
        shipAt: payload.shipAt || "",
        abbr: payload.abbr || "",
        currency: payload.currency || "CNY",
        textColor: payload.textColor || "黑色"
      });
      db.brandAudit = db.brandAudit || {};
      db.brandAudit[name] = !!payload.needAudit;
      db.brandDeposit = db.brandDeposit || {};
      db.brandDeposit[name] = Number(payload.ratio || 0.3);
      db.brandProfiles = db.brandProfiles || {};
      db.brandProfiles[name] = {
        name, cats, styles, crowds,
        cat: cats[0], style: styles.join(" / "), crowd: crowds.join(" / "),
        about: payload.about || `${name} 品牌介绍`,
        designer: payload.designer || "",
        contact: payload.contact, phone: payload.phone,
        year: payload.year || 2015, site: payload.site || "", shipAt: payload.shipAt || "",
        abbr: payload.abbr || "", currency: payload.currency || "CNY", textColor: payload.textColor || "黑色",
        discountBase: payload.discountBase === "wholesale" ? "wholesale" : "retail"
      };
      db.brandDiscountBase = db.brandDiscountBase || {};
      db.brandDiscountBase[name] = payload.discountBase === "wholesale" ? "wholesale" : "retail";
      save(); syncLegacy();
      return { ok: true, msg: `品牌「${name}」已添加（登录手机 ${payload.phone}）`, name };
    },
    /* 预约管理：审核预约 */
    auditAppointment(index, pass, reason) {
      const a = db.appointments[Number(index)];
      if (!a) return "预约记录不存在";
      a.status = pass ? "已通过" : "已拒绝";
      a.reason = pass ? "" : (reason || "名额已满");
      a.auditAt = new Date().toISOString().slice(0, 16).replace("T", " ");
      save(); syncLegacy();
      return `预约已${a.status}`;
    },
    /* 买手能否查看/下单该品牌：免审核直接可下单；需审核则看申请状态 */
    brandOrderable(brand) {
      if (!Store.brandNeedAudit(brand)) return { ok: true, auditFree: true, msg: "免审核品牌" };
      const st = (db.buyerSession.brandAccess || {})[brand] || "none";
      if (st === "granted") return { ok: true, msg: "品牌申请已通过" };
      if (st === "pending") return { ok: false, pending: true, msg: `「${brand}」品牌申请审核中，通过后可查看商品并下单` };
      if (st === "denied") return { ok: false, denied: true, msg: `「${brand}」品牌申请被拒绝，可重新提交申请` };
      return { ok: false, msg: `「${brand}」下单需先提交品牌申请` };
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
      const at = new Date().toISOString().slice(0, 16).replace("T", " ");
      const fair = (db.orderingFairs || []).find(x => x.id === payload.fairId || `${x.name}（${x.season}）` === payload.fair || x.season === payload.season);
      if (fair && !Store.isFairBookable(fair)) return { ok: false, msg: "当前不在该订货会可预约时间内" };
      const brand = payload.brand;
      if (!brand || brand === "请选择品牌") return { ok: false, msg: "请选择品牌" };
      if (payload.fromBuyer !== false) {
        const gate = Store.brandOrderable(brand);
        if (!gate.ok) return { ok: false, needBrandApply: true, brand, msg: gate.msg || "该品牌需先申请，通过后再预约" };
      }
      const people = Number(payload.people) || 1;
      const dateStr = String(payload.date || "").replace("T", " ");
      const day = dateStr.slice(0, 10);
      let slot = null;
      if (fair && brand) {
        const slots = Store.fairSlotsOf(fair.id, brand);
        if (payload.slotId) slot = slots.find(s => s.id === payload.slotId) || null;
        if (!slot && slots.length) {
          slot = slots.find(s => s.date === day && timeInSlot(s, dateStr)) || slots.find(s => s.date === day) || null;
        }
        if (slot && Number(slot.booked || 0) + people > Number(slot.cap || 0)) {
          return { ok: false, msg: `「${brand}」${slot.date} ${slot.from}-${slot.to} 接待已满（上限 ${slot.cap} 人），无需再审预约` };
        }
      }
      if (slot) slot.booked = Number(slot.booked || 0) + people;
      db.appointments.unshift({
        brand,
        store: payload.store,
        contact: payload.contact,
        phone: payload.phone,
        date: dateStr,
        season: (fair && fair.season) || payload.season || "2026SS",
        fairId: fair && fair.id,
        slot: slot ? `${slot.from}-${slot.to}` : (payload.slot || ""),
        people,
        submitAt: at,
        status: "已通过",
        reason: ""
      });
      save(); syncLegacy();
      return { ok: true, msg: slot ? `预约已生效（${slot.date} ${slot.from}-${slot.to}）` : "预约已生效" };
    },
    /* 买手端「预约申请」：申请线下参加订货会 */
    buyerAppointments() {
      const store = db.buyerSession.store;
      return (db.appointments || []).map((a, i) => ({ ...a, index: i })).filter(a => a.store === store);
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
        const need = Store.brandNeedAudit(b.name);
        /* 免审核品牌直接可看可下单；需审核品牌按申请状态 */
        const st = need ? (access[b.name] || "none") : "granted";
        return {
          ...b,
          needAudit: need,
          access: st,
          accept: st === "granted",
          pending: st === "pending",
          denied: st === "denied"
        };
      });
    },
    applyBrandAccess(brand, note) {
      if (!brand) return { ok: false, msg: "请选择品牌" };
      if (!Store.brandNeedAudit(brand)) return { ok: false, msg: `「${brand}」无需审核，可直接选款下单` };
      db.buyerSession.brandAccess = db.buyerSession.brandAccess || {};
      const cur = db.buyerSession.brandAccess[brand] || "none";
      if (cur === "granted") return { ok: false, msg: "已有该品牌权限" };
      if (cur === "pending") return { ok: false, msg: "申请审核中，请等待平台审核" };
      db.buyerSession.brandAccess[brand] = "pending";
      db.intentions = db.intentions || [];
      const at = new Date().toISOString().slice(0, 16).replace("T", " ");
      if (!db.intentions.some(i => i.store === db.buyerSession.store && i.brand === brand && i.status === "待审核")) {
        db.intentions.unshift({
          store: db.buyerSession.store, brand, status: "待审核",
          note: note || "买手申请品牌权限", at, date: at.slice(0, 10)
        });
      }
      save(); syncLegacy();
      return { ok: true, msg: `已提交「${brand}」品牌申请，等待平台审核` };
    },
    /* 买手端「意向品牌」：申请中 / 已通过 / 已拒绝 */
    buyerIntentions() {
      const store = db.buyerSession.store;
      const access = db.buyerSession.brandAccess || {};
      const rows = (db.intentions || []).filter(i => i.store === store).map(i => ({ ...i }));
      Object.keys(access).forEach(brand => {
        if (rows.some(r => r.brand === brand)) return;
        const st = access[brand];
        rows.push({
          store, brand, date: "—",
          status: st === "granted" ? "已通过" : st === "pending" ? "待审核" : "已拒绝"
        });
      });
      return rows;
    },
    upsertDraftSelection(sku, sizes) {
      const g = findGoods(sku);
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
      const bad = skus.filter(s => !findGoods(s));
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
      const fair = this.fairFlags(brand, season);
      if (type === "首单" && !fair.first) return { ok: false, msg: `${season} 首单已关闭（商品可见不可下单）` };
      if (type === "补货单" && !fair.replenish) return { ok: false, msg: `${season} 补货已关闭（商品可见不可下单）` };
      if (type === "补货单" && !db.buyerSession.hasFirstOrderBySeason[season]) {
        return { ok: false, msg: "本季未下过首单，不允许下补货单" };
      }
      const closed = [ORDER_ST.done, ORDER_ST.canceled, ORDER_ST.rejected];
      const openRep = db.orders.find(o => o.store === db.buyerSession.store && o.brand === brand && o.type === "补货单" && !closed.includes(normStatus(o.status)));
      if (type === "补货单" && openRep) return { ok: false, msg: "上一补货单未完成，不可新开" };
      return { ok: true };
    },
    toggleHeart(sku) {
      const g = findGoods(sku);
      const key = (g && (g.skc || g.sku)) || sku;
      const list = db.buyerSession.selections;
      const idx = list.findIndex(x => x.sku === key || x.sku === sku || (g && (x.sku === g.sku || x.sku === g.skc)));
      if (idx >= 0) list.splice(idx, 1);
      else if (g) {
        const sizes = Object.fromEntries((g.sizes || ["S", "M", "L"]).map(sz => [sz, 0]));
        list.push({
          sku: key, brand: g.brand, title: g.title, season: g.season, wholesale: g.wholesale,
          retail: g.retail, color: g.color, sampleSize: g.sampleSize, code: g.code, goodsType: g.goodsType, sizes
        });
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
        const g = findGoods(i.sku) || {};
        let sizes = i.sizes || {};
        if (!Object.values(sizes).some(v => Number(v) > 0)) {
          sizes = Object.fromEntries((g.sizes || ["S", "M"]).map((sz, j) => [sz, j < 2 ? 1 : 0]));
        }
        return enrichLine({
          sku: i.sku, title: i.title || g.title, sizes, price: i.wholesale || g.wholesale, retail: g.retail,
          color: g.color, sampleSize: g.sampleSize, code: g.code, goodsType: g.goodsType
        }, idx);
      });
      const q = Store.selectionQuote(lines, null, season, brand);
      db.selections.unshift({
        id, brand, season, store: db.buyerSession.store, time: new Date().toISOString().slice(0, 16).replace("T", " "),
        amount: money(q.wholesale), retailAmount: money(q.retail), pieces: q.pieces, skus: lines.length,
        status: SEL_ST.draft, buyer: db.buyerSession.store, locked: false, lines
      });
      db.buyerSession.selections = db.buyerSession.selections.filter(x => x.brand !== brand);
      save(); syncLegacy();
      return { ok: true, msg: `已生成选款单 ${id}（待提交），确认无误后提交平台`, id };
    },
    buyerOrders(tab) {
      const store = db.buyerSession.store;
      const typeTab = db.buyerSession.orderType || "全部";
      return db.orders.filter(o => {
        const view = orderViewStatus(o);
        if (!view) return false;
        if (tab === "未完成" && view !== ORDER_VIEW.open) return false;
        if (tab === "已完成" && view !== ORDER_VIEW.done) return false;
        if (tab === "已取消" && view !== ORDER_VIEW.canceled) return false;
        if (typeTab === "首单" && o.type === "补货单") return false;
        if (typeTab === "补货单" && o.type !== "补货单") return false;
        return o.store === store;
      });
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
            if ([ORDER_ST.confirm, ORDER_ST.rejected, ORDER_ST.canceled].includes(normStatus(o.status))) return false;
          } else if (normStatus(o.status) !== f.status) return false;
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
            const g = findGoods(l.sku) || {};
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
    setBuyerOrderType(tab) { db.buyerSession.orderType = tab; save(); },
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
