async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const q = (s) => document.querySelector(s);
  const qa = (s) => [...document.querySelectorAll(s)];
  const click = async (el) => {
    if (!el) return false;
    el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
    await sleep(180);
    return true;
  };

  const hrefs = [...document.styleSheets].map((s) => s.href || "").filter(Boolean);
  const localVendor = hrefs.some((h) => h.includes("/assets/vendor/ontime/"));
  const hotlinkIcon = hrefs.some((h) => h.includes("order.roomroom.com.cn") && h.includes("iconfont"));
  const vendorCount = hrefs.filter((h) => h.includes("/assets/vendor/ontime/")).length;

  localStorage.setItem("rr_portal", "platform");
  await click(qa("[data-portal]").find((e) => e.getAttribute("data-portal") === "platform"));
  if (q("#do-login")) {
    await click(qa("[data-role]").find((e) => e.getAttribute("data-role") === "platform"));
    await click(q("#do-login"));
  }
  await click(q('[data-go="goods-list"]') || qa("[data-go]").find((e) => e.getAttribute("data-go") === "goods-list"));
  await sleep(200);

  const nav = q("#ots_order-nav, nav.ots_order-nav, .ots_order-nav");
  const navCs = nav ? getComputedStyle(nav) : null;
  const navBg = navCs ? navCs.backgroundColor : "";
  const navH = nav ? nav.getBoundingClientRect().height : 0;
  const side = q(".public_left-container, .public_left-container.sidebar");
  const btn = q(".oto_btn, .ots_order-btn, a.oto_btn, button.ots_order-btn");
  const btnBg = btn ? getComputedStyle(btn).backgroundColor : "";
  const purpleOk = /rgb\(\s*154,\s*55,\s*254\s*\)|#9a37fe/i.test(btnBg) ||
    (btn && /9a37fe|891ff0/i.test(getComputedStyle(btn).color + btnBg));

  const icon = q(".iconfont");
  const iconFf = icon ? getComputedStyle(icon).fontFamily : "";

  const checks = [
    { name: "vendor-css", ok: localVendor && vendorCount >= 5 },
    { name: "no-hotlink-iconfont", ok: !hotlinkIcon },
    { name: "nav-exists", ok: !!nav },
    { name: "nav-dark", ok: !!nav && /rgb\(\s*0,\s*0,\s*0\s*\)|rgb\(\s*17,\s*17,\s*17\s*\)|rgb\(\s*34,\s*34,\s*34\s*\)/.test(navBg) },
    { name: "nav-height~60", ok: navH >= 50 && navH <= 72 },
    { name: "side-on-goods", ok: !!side },
    { name: "primary-purple", ok: !!btn && purpleOk },
  ];
  if (icon) {
    checks.push({ name: "iconfont-family", ok: /iconfont|ots_|icomoon|FontAwesome|icon/i.test(iconFf) || iconFf.length > 2 });
  }

  // brand-list should have no left sidebar
  await click(q('[data-go="brand-list"]') || qa("[data-go]").find((e) => e.getAttribute("data-go") === "brand-list" && e.closest("nav, .topnav")));
  await sleep(180);
  checks.push({ name: "brand-list-no-side", ok: !q(".public_left-container") });

  const miss = checks.filter((c) => !c.ok).map((c) => c.name);
  return {
    pass: miss.length === 0,
    miss,
    checks,
    meta: { vendorCount, hotlinkIcon, navBg, navH, btnBg, iconFf }
  };
}
