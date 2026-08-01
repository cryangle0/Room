async () => {
  const hrefs = [...document.styleSheets]
    .map(s => s.href || "")
    .filter(Boolean);
  const localVendor = hrefs.some(h => h.includes("/assets/vendor/ontime/"));
  const hotlinkIcon = hrefs.some(h => h.includes("order.roomroom.com.cn") && h.includes("iconfont"));
  return {
    pass: localVendor && !hotlinkIcon,
    localVendor,
    hotlinkIcon,
    hrefs
  };
}
