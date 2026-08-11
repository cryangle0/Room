async () => {
  /* 注册流程（图1）+ 订单流程（图2）门禁 */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];
  const text = () => document.body.innerText || "";
  const has = (t) => text().includes(t);
  const click = async (el) => {
    if (!el) return false;
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await sleep(200);
    return true;
  };
  const byAct = (a) => qa("[data-act]").find((e) => e.getAttribute("data-act") === a);
  const byActPrefix = (a) => qa("[data-act]").find((e) => (e.getAttribute("data-act") || "").startsWith(a));
  const byGo = (p) => qa("[data-go]").find((e) => e.getAttribute("data-go") === p);
  const navGo = (p) => qa("[data-go]").find((e) => e.getAttribute("data-go") === p && e.closest("nav, .topnav, .ots_order-nav, .proto-bar, .mine_side")) || byGo(p);
  /* 平台端左侧菜单需先点顶部分组入口 */
  const GROUP_ENTRY = { "order-list": "order-selection", "order-detail": "order-selection", "buyer-list": "buyer-list", "intent-list": "intent-list", "brand-list": "brand-list" };
  const goto = async (p) => {
    if (!byGo(p) && GROUP_ENTRY[p] && GROUP_ENTRY[p] !== p) await click(byGo(GROUP_ENTRY[p]));
    return click(navGo(p));
  };
  const setF = (name, val) => { const el = q(`[data-field="${name}"]`); if (el) { el.value = val; return true; } return false; };
  const items = [];
  const add = (id, title, checks) => {
    const miss = checks.filter((c) => !c.ok).map((c) => c.name);
    items.push({ id, title, ok: miss.length === 0, miss });
  };
  const ST = Store.ORDER_ST;

  /* 干净初始态 */
  localStorage.removeItem("rr_biz_v5");
  localStorage.removeItem("rr_biz_v6");
  Store.reset();
  await sleep(80);

  const goLogin = async (role) => {
    const bar = qa("[data-portal]").find((e) => e.getAttribute("data-portal") === role);
    if (bar) await click(bar);
    await click(byGo("login"));
    const roleBtn = qa("[data-role]").find((e) => e.getAttribute("data-role") === role);
    if (roleBtn) await click(roleBtn);
  };

  /* ---------------- 图1：注册流程 ---------------- */
  await goLogin("buyer");
  add("R1", "登录页：买手端手机号+验证码 + 注册/进度入口", [
    { name: "phone-field", ok: !!q('[data-field="loginPhone"]') },
    { name: "code-field", ok: !!q('[data-field="loginCode"]') },
    { name: "register-entry", ok: !!byGo("register") },
    { name: "status-entry", ok: !!byGo("register-status") }
  ]);

  await click(byGo("register"));
  const regFields = ["regPhone", "regCode", "regStore", "regContact", "regCity"].every((n) => !!q(`[data-field="${n}"]`));
  setF("regPhone", "13900001234");
  setF("regCode", "000000");
  setF("regStore", "GATE 买手店");
  setF("regContact", "门禁");
  await click(byAct("submit-register"));
  const badCode = has("验证码错误") || (Store.db.regSession || {}).status !== "待审核";
  setF("regCode", "888888");
  await click(byAct("submit-register"));
  const reg = Store.buyerRegStatus("13900001234");
  add("R2", "买手填写资料注册 → 提交申请", [
    { name: "fields", ok: regFields },
    { name: "code-validated", ok: badCode },
    { name: "submitted", ok: reg.found && reg.status === "待审核" },
    { name: "goto-status-page", ok: has("注册审核进度") }
  ]);

  /* 待审核不可登录 */
  await goLogin("buyer");
  setF("loginPhone", "13900001234");
  setF("loginCode", "888888");
  await click(q("#do-login"));
  add("R3", "待审核买手登录被拦截", [
    { name: "blocked", ok: has("审核中") || has("注册审核进度") },
    { name: "not-in-portal", ok: !has("品牌列表") || has("注册审核进度") }
  ]);

  /* 平台端审核：先拒绝（带原因） */
  const bar = qa("[data-portal]").find((e) => e.getAttribute("data-portal") === "platform");
  await click(bar);
  await goto("buyer-list");
  const pendingVisible = has("GATE 买手店");
  await click(byAct("reject-buyer:GATE 买手店"));
  setF("rejectReason", "门店照片不清晰");
  await click(byAct("submit-reject-buyer"));
  const afterReject = Store.buyerRegStatus("13900001234");
  add("R4", "平台审核买手 · 拒绝分支带原因", [
    { name: "list-shows-pending", ok: pendingVisible },
    { name: "rejected", ok: afterReject.status === "已拒绝" },
    { name: "reason", ok: (afterReject.reason || "").includes("门店照片") }
  ]);

  /* 拒绝后买手端可查看原因并重新提交（入口：原型条「登录/注册」→ 查询审核进度） */
  await click(qa("[data-portal]").find((e) => e.getAttribute("data-portal") === "buyer"));
  await click(byGo("login"));
  await click(byGo("register-status"));
  setF("queryPhone", "13900001234");
  await click(byAct("query-reg"));
  add("R5", "买手端审核进度显示拒绝原因 + 可改资料重提", [
    { name: "reason-shown", ok: has("门店照片不清晰") },
    { name: "resubmit-entry", ok: !!byGo("register") }
  ]);

  /* 平台通过 → 买手可登录 */
  Store.setBuyerStatus("GATE 买手店", "已通过");
  await click(byGo("login"));
  await click(byGo("register-status"));
  setF("queryPhone", "13900001234");
  await click(byAct("query-reg"));
  await click(byActPrefix("login-as-buyer:"));
  add("R6", "审核通过 → 登录买手端", [
    { name: "approved", ok: Store.buyerRegStatus("13900001234").status === "已通过" },
    { name: "logged-in", ok: Store.db.buyerSession.store === "GATE 买手店" },
    { name: "buyer-home", ok: has("分类筛选") }
  ]);

  /* 需审核品牌门槛 + 提交品牌申请 + 平台审核 */
  const auditBrand = Object.keys(Store.db.brandAudit).find((b) => Store.db.brandAudit[b]);
  const freeBrand = Object.keys(Store.db.brandAudit).find((b) => !Store.db.brandAudit[b]);
  Store.db.buyerSession.brandAccess = {};
  Store.persist();
  await click(byGo("buyer-home"));
  /* 需审核品牌卡片不进商品页，仅能去意向申请 */
  const gateCard = qa("[data-go]").find((e) => e.getAttribute("data-brand") === auditBrand);
  const blockedGoods = !!gateCard && gateCard.getAttribute("data-go") === "buyer-intent";
  await click(byAct(`apply-brand:${auditBrand}`));
  const pendingNow = (Store.db.buyerSession.brandAccess || {})[auditBrand] === "pending";
  await click(navGo("buyer-intent"));
  const intentPage = has("意向品牌") && has("我的品牌申请") && has(auditBrand);
  add("R7", "需审核品牌：拦截 + 提交品牌申请", [
    { name: "goods-blocked", ok: blockedGoods },
    { name: "apply-pending", ok: pendingNow },
    { name: "intent-page", ok: intentPage }
  ]);

  await click(qa("[data-portal]").find((e) => e.getAttribute("data-portal") === "platform"));
  await goto("intent-list");
  const intentAudit = has("意向申请") && has("审核买手提交的品牌申请");
  Store.setIntention("GATE 买手店", auditBrand, "已通过");
  await click(qa("[data-portal]").find((e) => e.getAttribute("data-portal") === "buyer"));
  const goodsOk = () => !q(".brand-gate") && qa(".goods_list .item_inner").length > 0;
  await click(byGo("buyer-home"));
  await click(qa("[data-go]").find((e) => e.getAttribute("data-brand") === auditBrand));
  const grantedGoods = goodsOk();
  await click(byGo("buyer-home"));
  await click(qa("[data-go]").find((e) => e.getAttribute("data-brand") === freeBrand));
  const freeGoods = goodsOk();
  add("R8", "审核通过/免审核品牌可查看商品", [
    { name: "platform-intent-page", ok: intentAudit },
    { name: "granted-goods", ok: grantedGoods },
    { name: "audit-free-goods", ok: freeGoods }
  ]);

  /* ---------------- 图2：订单流程 ---------------- */
  await click(qa("[data-portal]").find((e) => e.getAttribute("data-portal") === "platform"));
  await goto("order-list");
  const statusOptions = [...qa("select")].some((s) => [...s.options].some((o) => o.text === ST.depositCheck));
  add("O1", "订单列表状态取值＝流程节点", [
    { name: "status-select", ok: statusOptions },
    { name: "flow-tip", ok: has("待平台确认") || has("待核对") || has("待设置定金") }
  ]);

  /* 平台确认订单 → 设置定金 */
  const oid = Store.db.orders.find((o) => o.status === ST.confirm).id;
  Store.setOrderFilter({ brand: "全部", season: "全部", type: "全部", status: "全部", store: "", id: oid });
  await goto("order-list");
  await click(qa('[data-go="order-detail"]').find((e) => e.getAttribute("data-oid") === oid));
  const detailFlow = !!q(".flow-steps") && has("当前节点可执行操作");
  await click(byAct("platform-confirm-order"));
  const afterConfirm = Store.db.orders.find((o) => o.id === oid).status;
  setF("depRatio", "30%");
  await click(byAct("confirm-deposit"));
  const afterDeposit = Store.db.orders.find((o) => o.id === oid);
  add("O2", "平台确认订单 → 设置定金", [
    { name: "flow-steps", ok: detailFlow },
    { name: "confirmed", ok: afterConfirm === ST.deposit },
    { name: "deposit-set", ok: afterDeposit.status === ST.depositAck && Store.parseMoney(afterDeposit.deposit) > 0 }
  ]);

  /* 买手确认定金 → 上传凭证 */
  Store.db.buyerSession.store = afterDeposit.store;
  Store.persist();
  await click(qa("[data-portal]").find((e) => e.getAttribute("data-portal") === "buyer"));
  await click(navGo("buyer-orders"));
  await click(qa('[data-go="buyer-order-detail"]').find((e) => e.getAttribute("data-oid") === oid));
  const buyerFlow = !!q(".flow-steps");
  await click(byAct("buyer-confirm-deposit"));
  const afterAck = Store.db.orders.find((o) => o.id === oid).status;
  await click(byAct("open-order-panel:pay-deposit"));
  const payPanel = has("上传定金付款凭证");
  await click(byAct("submit-pay"));
  const afterPay = Store.db.orders.find((o) => o.id === oid);
  add("O3", "买手确认定金 → 上传定金凭证", [
    { name: "buyer-flow-steps", ok: buyerFlow },
    { name: "deposit-ack", ok: afterAck === ST.depositPay },
    { name: "pay-panel", ok: payPanel },
    { name: "voucher-uploaded", ok: afterPay.status === ST.depositCheck && (afterPay.payments || []).some((p) => p.kind === "定金" && p.status === "待核对") }
  ]);

  /* 平台核对：先不通过 → 退回；再通过 → 生成 OC */
  await click(qa("[data-portal]").find((e) => e.getAttribute("data-portal") === "platform"));
  await goto("order-list");
  await click(qa('[data-go="order-detail"]').find((e) => e.getAttribute("data-oid") === oid));
  await click(byAct("open-order-panel:check"));
  setF("checkNote", "金额不符");
  await click(byActPrefix("check-pay:") && qa("[data-act]").find((e) => /^check-pay:\d+:fail$/.test(e.getAttribute("data-act") || "")));
  const afterFail = Store.db.orders.find((o) => o.id === oid).status;
  Store.advanceOrder(oid, "uploadVoucher", { kind: "定金" });
  await goto("order-list");
  await click(qa('[data-go="order-detail"]').find((e) => e.getAttribute("data-oid") === oid));
  await click(qa("[data-act]").find((e) => /^check-pay:\d+:pass$/.test(e.getAttribute("data-act") || "")));
  const afterPass = Store.db.orders.find((o) => o.id === oid).status;
  await click(byAct("gen-oc"));
  const afterOc = Store.db.orders.find((o) => o.id === oid);
  add("O4", "核对定金凭证（不通过退回 / 通过）→ 生成 OC", [
    { name: "fail-return", ok: afterFail === ST.depositPay },
    { name: "pass-to-oc", ok: afterPass === ST.oc },
    { name: "oc-generated", ok: afterOc.status === ST.finalPay && !!afterOc.ocId }
  ]);

  /* 买手分批支付尾款 */
  const stats = Store.paymentStats(Store.db.orders.find((o) => o.id === oid));
  const half = Math.round(stats.unpaid / 2);
  const r1 = Store.advanceOrder(oid, "uploadVoucher", { kind: "尾款", amount: String(half) });
  Store.advanceOrder(oid, "checkVoucher", { pass: true });
  const midStatus = Store.db.orders.find((o) => o.id === oid).status;
  Store.advanceOrder(oid, "uploadVoucher", { kind: "尾款" });
  Store.advanceOrder(oid, "checkVoucher", { pass: true });
  const afterFinal = Store.db.orders.find((o) => o.id === oid);
  add("O5", "尾款支持分批次 + 核对", [
    { name: "part1", ok: r1.ok && midStatus === ST.finalPay },
    { name: "settled-node", ok: afterFinal.status === ST.settle },
    { name: "payments", ok: (afterFinal.payments || []).filter((p) => p.kind === "尾款").length >= 2 }
  ]);

  /* 平台手动完成 + 差额统计 */
  await goto("order-list");
  await click(qa('[data-go="order-detail"]').find((e) => e.getAttribute("data-oid") === oid));
  await click(byAct("settle-order"));
  const done = Store.db.orders.find((o) => o.id === oid);
  add("O6", "运营手动点击订单完成 + 统计付款差额", [
    { name: "done", ok: done.status === ST.done },
    { name: "diff", ok: done.settleDiff !== "" && Math.abs(Store.parseMoney(done.settleDiff)) < 1 },
    { name: "diff-visible", ok: has("付款差额") }
  ]);

  /* 驳回：选款单解锁 */
  const rej = Store.db.orders.find((o) => o.status === ST.confirm && o.id !== oid) || Store.db.orders.find((o) => o.status === ST.confirm);
  let rejOk = false, unlockOk = true;
  if (rej) {
    const r = Store.advanceOrder(rej.id, "reject", { reason: "起订额不足" });
    rejOk = r.ok && Store.db.orders.find((o) => o.id === rej.id).status === ST.rejected;
    if (rej.fromSelection) {
      const s = Store.db.selections.find((x) => x.id === rej.fromSelection);
      unlockOk = !!s && !s.locked;
    }
  }
  add("O7", "平台驳回订单 → 选款单解锁可重下", [
    { name: "rejected", ok: rejOk },
    { name: "selection-unlocked", ok: unlockOk }
  ]);

  /* 买手取消订单（仅待平台确认） */
  const cancelTarget = Store.db.orders.find((o) => o.status === ST.confirm);
  let cancelOk = false, guardOk = false;
  if (cancelTarget) {
    cancelOk = Store.advanceOrder(cancelTarget.id, "cancel", { reason: "计划调整" }).ok
      && Store.db.orders.find((o) => o.id === cancelTarget.id).status === ST.canceled;
  }
  const late = Store.db.orders.find((o) => o.status === ST.finalPay || o.status === ST.oc);
  if (late) guardOk = !Store.advanceOrder(late.id, "cancel").ok;
  add("O8", "买手取消订单 + 流程守卫", [
    { name: "canceled", ok: cancelOk },
    { name: "guard-after-confirm", ok: guardOk }
  ]);

  /* 平台端命名 + 品牌是否需审核开关 */
  await goto("brand-list");
  const navText = [...qa(".topnav .nav-links a")].map((a) => a.textContent.trim());
  const toggle = byActPrefix("brand-audit:");
  const brandName = toggle ? toggle.getAttribute("data-act").split(":")[1] : "";
  const before = Store.brandNeedAudit(brandName);
  await click(toggle);
  add("P1", "平台端「品牌管理」命名 + 下单需审核买手开关", [
    { name: "top-nav-renamed", ok: navText.includes("品牌管理") && !navText.includes("我的店铺") },
    { name: "side-brand-list", ok: has("品牌列表") },
    { name: "audit-toggle", ok: !!toggle && Store.brandNeedAudit(brandName) !== before }
  ]);

  /* 业务流程图页 */
  await click(byGo("flow-map"));
  await click(byAct("flow-tab:register"));
  const regChart = has("注册流程图") && has("审核买手") && has("提交品牌申请");
  await click(byAct("flow-tab:order"));
  const ordChart = has("订单流程图") && has("核对尾款凭证") && has("统计付款差额");
  add("P2", "业务流程图页（注册/订单）", [
    { name: "register-chart", ok: regChart },
    { name: "order-chart", ok: ordChart },
    { name: "nodes-linkable", ok: qa(".fnode.linkable").length > 5 }
  ]);

  /* ---------------- 思维导图补充功能点 ---------------- */
  await click(qa("[data-portal]").find((e) => e.getAttribute("data-portal") === "platform"));
  await goto("brand-list");
  const ratioCol = has("订单首付比例");
  await click(byGo("brand-add"));
  setF("nbName", "GATE BRAND");
  setF("nbRatio", "50%");
  await click(byAct("add-brand"));
  const brandAdded = (Store.db.brandDeposit || {})["GATE BRAND"] === 0.5 && has("GATE BRAND");
  await click(byGo("brand-pay"));
  setF("depBrand", "JUNLI");
  setF("depBrandRatio", "40%");
  await click(byAct("save-brand-ratio"));
  const ratioSaved = Store.brandDepositRatio("JUNLI") === 0.4;
  add("P3", "品牌管理：添加品牌 + 订单首付比例（定金）", [
    { name: "ratio-column", ok: ratioCol },
    { name: "brand-added", ok: brandAdded },
    { name: "ratio-saved", ok: ratioSaved }
  ]);

  /* 新单默认取品牌首付比例 */
  const freeSel = Store.db.selections.find((s) => !s.locked && s.brand === "JUNLI");
  let newOrderRatio = true;
  if (freeSel) {
    const r = Store.genOrderFromSelection(freeSel.id);
    const o = r.ok && Store.db.orders.find((x) => x.id === r.orderId);
    newOrderRatio = !!o && Number(o.depositRatio) === 0.4;
  }

  await click(byGo("appoint-list"));
  const appointStatus = has("预约列表") && has("待审核");
  await click(byGo("appoint-audit"));
  const rejBtn = byActPrefix("reject-appoint:");
  await click(rejBtn);
  setF("appointReason", "该场次名额已满");
  await click(byAct("submit-reject-appoint"));
  const apRejected = (Store.db.appointments || []).some((a) => a.status === "已拒绝" && (a.reason || "").includes("名额已满"));
  await click(byActPrefix("approve-appoint:"));
  const apApproved = (Store.db.appointments || []).some((a) => a.status === "已通过");
  add("P4", "预约管理：预约列表 + 审核预约（通过 / 拒绝带原因）", [
    { name: "appoint-list", ok: appointStatus },
    { name: "reject-with-reason", ok: apRejected },
    { name: "approve", ok: apApproved },
    { name: "new-order-uses-brand-ratio", ok: newOrderRatio }
  ]);

  /* 买手端预约申请 */
  await click(qa("[data-portal]").find((e) => e.getAttribute("data-portal") === "buyer"));
  await click(navGo("buyer-appoint-apply"));
  const applyPage = has("预约申请") && has("我的预约");
  setF("apBrand", "JUNLI");
  setF("apPeople", "3");
  setF("apPhone", "13900001234");
  const beforeN = Store.db.appointments.length;
  await click(byAct("submit-buyer-appoint"));
  const mine = Store.buyerAppointments();
  add("B1", "买手端：预约申请（线下参加订货会）+ 我的预约状态", [
    { name: "page", ok: applyPage },
    { name: "submitted", ok: Store.db.appointments.length === beforeN + 1 },
    { name: "pending-status", ok: mine.some((a) => a.brand === "JUNLI" && a.status === "待审核" && Number(a.people) === 3) }
  ]);

  /* 覆盖核对页：思维导图逐项对照 */
  await click(byGo("coverage"));
  add("P5", "覆盖核对页含思维导图逐项对照", [
    { name: "mind-table", ok: has("功能点思维导图逐项对照") },
    { name: "platform-rows", ok: has("设置品牌订单首付比例") && has("审核预约") },
    { name: "buyer-rows", ok: has("预约申请（申请线下参加订货会）") }
  ]);

  const miss = items.filter((i) => !i.ok);
  return {
    pass: miss.length === 0,
    passed: items.filter((i) => i.ok).length,
    total: items.length,
    miss: miss.map((i) => i.id + ":" + i.miss.join(",")),
    items
  };
}
