/* Mock data aligned with live RoomRoom / OntimeOrder content */
window.RR = {
  brands: [
    { id: "hz", name: "HAIZHEN WANG", cat: "女装", year: 2012, style: "解构 / 先锋", crowd: "独立买手店" },
    { id: "jl", name: "JUNLI", cat: "女装", year: 2015, style: "都市极简", crowd: "年轻买手" },
    { id: "ac", name: "ANGEL CHEN", cat: "男女装", year: 2014, style: "东方当代", crowd: "概念店" },
    { id: "ms", name: "Ms MIN", cat: "女装", year: 2010, style: "优雅实用", crowd: "精品百货" },
    { id: "sf", name: "SUSAN FANG", cat: "女装", year: 2017, style: "梦幻材质", crowd: "独立买手" },
    { id: "rr", name: "ROOMROOM", cat: "生活方式", year: 2018, style: "生活方式精选", crowd: "全渠道" },
    { id: "go", name: "GOEN.J", cat: "女装", year: 2016, style: "浪漫结构", crowd: "买手店" },
    { id: "pr", name: "PRIVATE POLICY", cat: "男装", year: 2019, style: "街头高级", crowd: "潮流买手" }
  ],
  seasons: ["2025AW", "2026PS", "2026SS", "2026PF", "2026AW", "2027PS"],
  goods: [
    { sku: "121BZX122", brand: "HAIZHEN WANG", season: "2022SS", title: "LUNE——双v面包西服", sizes: ["XS/4", "S/6", "M/8"], retail: "6,100.00", wholesale: "2,745.00", status: "正常" },
    { sku: "121BZX122W", brand: "HAIZHEN WANG", season: "2022SS", title: "LUNE——弹力梭织双v面包西服", sizes: ["XS/4", "S/6", "M/8"], retail: "6,100.00", wholesale: "2,745.00", status: "正常" },
    { sku: "121BZX122S", brand: "HAIZHEN WANG", season: "2022SS", title: "LUNE——提花复合面料双v面包西服", sizes: ["XS/4", "S/6", "M/8"], retail: "6,100.00", wholesale: "2,745.00", status: "已删款" },
    { sku: "121BZX138", brand: "HAIZHEN WANG", season: "2022SS", title: "黑色羊毛系带西服", sizes: ["XS/4", "S/6", "M/8"], retail: "5,099.00", wholesale: "2,295.00", status: "正常" },
    { sku: "121DRX037G", brand: "HAIZHEN WANG", season: "2022SS", title: "骑制橄榄深绿色抹胸连衣裙", sizes: ["XS/4", "S/6", "M/8"], retail: "4,900.00", wholesale: "2,205.00", status: "正常" },
    { sku: "JL26SS001", brand: "JUNLI", season: "2026SS", title: "结构剪裁羊毛大衣", sizes: ["S", "M", "L"], retail: "8,800.00", wholesale: "3,960.00", status: "正常", carry: true },
    { sku: "AC26SS088", brand: "ANGEL CHEN", season: "2026SS", title: "刺绣真丝衬衫", sizes: ["XS", "S", "M"], retail: "4,200.00", wholesale: "1,890.00", status: "正常" },
    { sku: "MS26AW012", brand: "Ms MIN", season: "2025AW", title: "羊毛混纺直筒裤", sizes: ["34", "36", "38", "40"], retail: "3,600.00", wholesale: "1,620.00", status: "正常" }
  ],
  selections: [
    { id: "SEL-20260720-001", brand: "IAN HYLTON", season: "2027PS", store: "三叁设计师品牌集合店", time: "2026-07-20 11:55", amount: "83,240", pieces: 24, skus: 8, status: "待确认", buyer: "三叁" },
    { id: "SEL-20260715-014", brand: "IAN HYLTON", season: "2027PS", store: "ASSEMBLE BY REEL", time: "2026-07-15 17:23", amount: "434,920", pieces: 127, skus: 29, status: "待确认", buyer: "ASSEMBLE" },
    { id: "SEL-20260715-008", brand: "HIDEMI", season: "2027PS", store: "Ding", time: "2026-07-15 17:35", amount: "0", pieces: 0, skus: 20, status: "仅选款", buyer: "Ding" },
    { id: "SEL-20260715-040", brand: "IAN HYLTON", season: "2027PS", store: "IAN HYLTON POP-UP", time: "2026-07-15 10:40", amount: "1,027,120", pieces: 300, skus: 52, status: "已生成订单", buyer: "POP-UP" },
    { id: "SEL-20260712-055", brand: "KHIHO", season: "2026SS", store: "BeautyFM", time: "2026-07-12 13:01", amount: "3,285.51", pieces: 6, skus: 2, status: "待确认", buyer: "BeautyFM" }
  ],
  selectionLines: [
    { sku: "IH27PS001", title: "结构羊毛夹克", sizes: { S: 2, M: 4, L: 1 }, price: "3,200.00" },
    { sku: "IH27PS014", title: "阔腿西裤", sizes: { S: 1, M: 3, L: 2 }, price: "1,890.00" },
    { sku: "IH27PS022", title: "真丝衬衫", sizes: { XS: 1, S: 2, M: 2 }, price: "2,100.00" }
  ],
  orders: [
    { id: "ORD-20260320-102", brand: "HAIZHEN WANG", season: "2026SS", store: "Liora Amour", type: "首单", amount: "128,600.00", deposit: "38,580.00", status: "买手已确认待品牌确认" },
    { id: "ORD-20260319-088", brand: "JUNLI", season: "2026SS", store: "B1OCK", type: "首单", amount: "96,400.00", deposit: "28,920.00", status: "定金确认" },
    { id: "ORD-20260315-044", brand: "ANGEL CHEN", season: "2026SS", store: "Felix", type: "补货单", amount: "41,200.00", deposit: "12,360.00", status: "尾款确认" },
    { id: "ORD-20260310-021", brand: "Ms MIN", season: "2025AW", store: "山鹿素行", type: "首单", amount: "72,800.00", deposit: "21,840.00", status: "买手未确认" }
  ],
  buyers: [
    { name: "Liora Amour", city: "北京市 / 北京市", phone: "13681383088", level: "B", status: "已通过" },
    { name: "名君岛", city: "福建省 / 泉州市", phone: "18659515999", level: "—", status: "待审核" },
    { name: "B1OCK", city: "浙江省 / 杭州市", phone: "18030251878", level: "A", status: "已通过" },
    { name: "ASSEMBLE BY REEL", city: "上海市 / 上海市", phone: "18650122612", level: "—", status: "待审核" },
    { name: "BeautyFM", city: "江苏省 / 南京市", phone: "18652012070", level: "A", status: "已通过" },
    { name: "山鹿素行", city: "吉林省 / 长春市", phone: "17649841234", level: "B", status: "已通过" },
    { name: "Felix", city: "上海市 / 上海市", phone: "13636613350", level: "A", status: "已通过" },
    { name: "heco", city: "广东省 / 深圳市", phone: "13662641508", level: "—", status: "待审核" }
  ],
  intentions: [
    { store: "识季", brand: "HAIZHEN WANG", date: "2026-03-12", status: "待审核" },
    { store: "MELTINCY", brand: "JUNLI", date: "2026-03-11", status: "已通过" },
    { store: "璨琳Candlyn", brand: "Ms MIN", date: "2026-03-10", status: "已拒绝" },
    { store: "LIMMOOZ生活方式", brand: "ROOMROOM", date: "2026-03-09", status: "待审核" }
  ],
  appointments: [
    { brand: "HAIZHEN WANG", store: "Liora Amour", contact: "王女士", phone: "13681383088", date: "2026-04-08 14:00", season: "2026SS" },
    { brand: "JUNLI", store: "B1OCK", contact: "李先生", phone: "18030251878", date: "2026-04-09 10:30", season: "2026SS" },
    { brand: "ANGEL CHEN", store: "Felix", contact: "陈女士", phone: "13636613350", date: "2026-04-10 16:00", season: "2026SS" }
  ],
  roles: [
    { name: "商品管理员", scope: "本品牌", perms: "添加/修改/上传商品" },
    { name: "订单管理员", scope: "本品牌", perms: "确认订单、确认定金等" },
    { name: "品牌管理员", scope: "本品牌", perms: "商品+订单+意向审核+发票+结佣" },
    { name: "高级管理员", scope: "不限品牌", perms: "商品/订单/买手管理与意向审核" },
    { name: "财务管理员", scope: "不限品牌", perms: "财务审核与确认" }
  ]
};
