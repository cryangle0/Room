// Paste into evaluate_script as async () => { ...body... }
async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = (sel, root = document) => root.querySelector(sel);
  const qa = (sel, root = document) => [...root.querySelectorAll(sel)];
  const text = () => document.body.innerText || "";
  const hasText = (t) => text().includes(t);
  const click = async (el) => {
    if (!el) return false;
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await sleep(140);
    return true;
  };
  const goData = async (page) => {
    const el = q(`[data-go="${page}"]`);
    return click(el);
  };
  const loginBuyer = async () => {
    localStorage.setItem("rr_portal", "buyer");
    const role = qa("[data-role]").find(
      (el) => el.getAttribute("data-role") === "buyer" || /买手/.test(el.textContent || "")
    );
    if (role) await click(role);
    if (q("#do-login")) await click(q("#do-login"));
    await sleep(160);
  };
  const shellOk = () => {
    const miss = [];
    if (!q("header.oto-nav")) miss.push("header.oto-nav");
    if (!q("ul.nav_menu")) miss.push("ul.nav_menu");
    if (!q(".login_area")) miss.push(".login_area");
    ["品牌", "补货", "我的选款单", "我的订单"].forEach((l) => {
      if (!(q("ul.nav_menu") || { innerText: "" }).innerText.includes(l)) miss.push("nav:" + l);
    });
    if (
      q(
        ".ots_order-outer-container > .oto-main_container > .oto_container.order-container > .public_right-container.main .oto-main_container"
      )
    )
      miss.push("double-order-shell");
    return miss;
  };
  const check = (name, sels, texts = []) => {
    const miss = sels.filter((s) => !q(s));
    const textMiss = texts.filter((t) => !hasText(t));
    const shellMiss = shellOk();
    return { name, ok: !miss.length && !textMiss.length && !shellMiss.length, miss, textMiss, shellMiss };
  };
  const results = [];

  await loginBuyer();

  // A. every top nav page + shell
  for (const [page, name] of [
    ["buyer-home", "A1-home"],
    ["buyer-replenish", "A2-replenish"],
    ["buyer-selection", "A3-selection"],
    ["buyer-orders", "A4-orders"],
    ["buyer-profile", "A5-profile"],
    ["buyer-message", "A6-message"]
  ]) {
    await goData(page);
    const map = {
      "A1-home": [
        [".brand_list-container", ".filter_type", ".brand_list", ".item_inner", ".side_action"],
        ["分类筛选"]
      ],
      "A2-replenish": [
        [".brand_list-container", ".side_action"],
        ["我的补货单"]
      ],
      "A3-selection": [
        [".selection-container", ".selection_list", ".selection_info", ".selection_action"],
        ["选款单", "修改", "下载", "确认订单"]
      ],
      "A4-orders": [
        [".order-container", ".order_list", ".order_info", ".filter_type"],
        ["我的订单", "全部", "已完成", "未完成"]
      ],
      "A5-profile": [
        [".mine-container", ".mine_side", ".mine_info-container"],
        ["个人信息", "收货地址管理", "发票地址管理"]
      ],
      "A6-message": [[".message-container", ".message_list", ".message_info"], ["消息"]]
    };
    results.push(check(name, map[name][0], map[name][1]));
  }

  // B. every category filter
  await goData("buyer-home");
  await click(q('[data-act="cat:全部"]'));
  const cats = qa('[data-act^="cat:"]');
  let catAllOk = cats.length >= 5;
  for (const c of cats) {
    await click(c);
    if (!q(".brand_list-container")) catAllOk = false;
  }
  results.push({ name: "B1-all-cats", ok: catAllOk, count: cats.length });
  await click(q('[data-act="cat:全部"]'));

  // C. every brand on home -> goods list must have hearts/items OR note
  const brands = qa('[data-go="buyer-brand"]');
  const brandReports = [];
  let brandsOk = brands.length > 0;
  for (const b of brands) {
    const name = b.getAttribute("data-brand");
    await goData("buyer-home");
    await click(q('[data-act="cat:全部"]'));
    const link = qa('[data-go="buyer-brand"]').find((a) => a.getAttribute("data-brand") === name);
    await click(link);
    const hasStruct = !!q(".brand_info") && !!q(".sku_box") && !!q(".season_filter") && !!q(".searchCarry") && !!q(".goods_list");
    const hasItems = qa(".brand_like").length > 0 && qa(".item_inner").length > 0;
    const emptyNote = hasText("无匹配商品");
    const ok = hasStruct && (hasItems || emptyNote);
    if (!ok) brandsOk = false;
    brandReports.push({ brand: name, hasStruct, hasItems, emptyNote, ok });
  }
  results.push({ name: "C1-all-brands-goods", ok: brandsOk, brands: brandReports });

  // D. deep dive first brand with items
  await goData("buyer-home");
  await click(q('[data-act="cat:全部"]'));
  await click(qa('[data-go="buyer-brand"]')[0]);
  // seasons
  const seasons = qa('[data-act^="season:"]');
  let seasonOk = seasons.length > 0;
  for (const s of seasons) {
    await click(s);
    if (!q(".goods_list")) seasonOk = false;
  }
  results.push({ name: "D1-all-seasons", ok: seasonOk, count: seasons.length });
  // views
  await click(q('[data-view="code"]'));
  const codeOk = !!q(".code-grid-live, .item_small");
  await click(q('[data-view="image"]'));
  const imgOk = !!q(".product-grid, .goods_list .item_inner, .brand_like");
  results.push({ name: "D2-views", ok: codeOk && imgOk, codeOk, imgOk });
  // heart + drawer
  if (q("[data-heart]")) await click(q("[data-heart]"));
  await click(q("[data-toggle-cart]"));
  results.push(
    check("D3-drawer", [".selection_side-container", ".balck_bg", ".selection_side", ".side_cancel"], ["我的选款单"])
  );
  await click(q(".side_cancel, .balck_bg"));
  // brand about
  await click(q('[data-go="buyer-brand-about"]'));
  results.push(
    check("D4-brand-about", [".brand_detail-container", ".collect_link", ".brand_info"], ["品牌介绍", "LOOKBOOK"])
  );
  await click(qa('[data-act^="buyer-brand-tab:"]').find((a) => a.getAttribute("data-act").includes("look")));
  results.push({ name: "D5-lookbook-tab", ok: hasText("LOOK") || hasText("暂无") || !!q(".lookbook-container") });
  await click(q('[data-act="go:buyer-brand"]') || q("a.oto_btn"));
  // goods detail
  if (!q(".goods_list")) {
    await goData("buyer-home");
    await click(q('[data-act="cat:全部"]'));
    await click(qa('[data-go="buyer-brand"]')[0]);
  }
  await click(q('[data-go="buyer-detail"]'));
  results.push(
    check(
      "D6-goods-detail",
      [".goods_detail-container", ".goods_detail", ".goods_info", ".size_list", ".goods_gallery"],
      ["订货价", "建议零售价", "加入选款单"]
    )
  );

  // E. selection edit
  await goData("buyer-selection");
  await click(q('[data-go="buyer-selection-edit"]'));
  results.push({
    name: "E1-selection-edit",
    ok: !!q("[data-line-qty], .style-sum-card, .detail-sticky") || hasText("选款"),
    hasLineQty: qa("[data-line-qty]").length
  });

  // F. all order tabs + detail
  await goData("buyer-orders");
  const tabs = qa("[data-order-tab]");
  let tabOk = tabs.length >= 3;
  for (const t of tabs) {
    await click(t);
    if (!q(".order_list")) tabOk = false;
  }
  results.push({ name: "F1-order-tabs", ok: tabOk, count: tabs.length });
  await goData("buyer-orders");
  await click(q('[data-go="buyer-order-detail"]'));
  results.push(
    check(
      "F2-order-detail",
      [".order_detail-container", ".order_info", ".order_action", ".order_progress", ".timeline"],
      ["订单详情", "订单进度"]
    )
  );

  // G. mine tabs
  await goData("buyer-profile");
  await click(q('[data-act="buyer-mine-tab:addr"]'));
  results.push({ name: "G1-mine-addr", ok: hasText("收货") });
  await click(q('[data-act="buyer-mine-tab:inv"]'));
  results.push({ name: "G2-mine-inv", ok: hasText("发票") || hasText("税号") });
  await click(q('[data-act="buyer-mine-tab:info"]'));
  results.push({ name: "G3-mine-info", ok: hasText("登录信息") && hasText("店铺信息") });

  // H. nav active for all 4
  let navOk = true;
  for (const p of ["buyer-home", "buyer-replenish", "buyer-selection", "buyer-orders"]) {
    await goData(p);
    if (!q("ul.nav_menu li.active")) navOk = false;
  }
  results.push({ name: "H1-nav-active", ok: navOk });

  const failed = results.filter((r) => !r.ok);
  return {
    pass: failed.length === 0,
    total: results.length,
    passed: results.filter((r) => r.ok).length,
    failed: failed.map((r) => r.name),
    results
  };
}
