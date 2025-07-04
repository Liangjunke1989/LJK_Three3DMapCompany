/**
 * 散点图数据配置
 * 用于在地图上显示散点图效果的数据集合
 * 
 * 数据结构：
 * - s: 散点大小级别（1-6，数值越大散点越大）
 * - value: 数值（用于显示或计算）
 * - lng: 经度坐标
 * - lat: 纬度坐标
 * - province: 所属省份名称
 * - adcode: 行政区代码
 * 
 * 用途：
 * - 在地图上显示数据点分布
 * - 根据数值大小显示不同大小的散点
 * - 支持hover交互显示详细信息
 * - 可配合动画效果实现数据可视化
 */

export default [
  {
    s: 4,                          // 散点大小级别
    value: 24,                     // 数值
    lng: 102.567724,               // 经度
    lat: 29.940219,                // 纬度
    province: "四川省",             // 所属省份
    adcode: 510000,                // 行政区代码
  },
  {
    s: 1,                          // 散点大小级别
    value: 68,                     // 数值
    lng: 89.119392,                // 经度
    lat: 45.376082,                // 纬度
    province: "新疆维吾尔自治区",   // 所属省份
    adcode: 650000,                // 行政区代码
  },
  {
    s: 2,
    value: 68,
    lng: 125.734456,
    lat: 45.311052,
    province: "吉林省",
    adcode: 220000,
  },
  {
    s: 2,
    value: 68,
    lng: 106.343056,
    lat: 26.451602,
    province: "贵州省",
    adcode: 520000,
  },
  {
    s: 3,
    value: 10,
    lng: 121.288287,
    lat: 41.793672,
    province: "辽宁省",
    adcode: 210000,
  },
  {
    s: 2,
    value: 24,
    lng: 110.000685,
    lat: 39.401933,
    province: "内蒙古自治区",
    adcode: 150000,
  },
  {
    s: 1,
    value: 24,
    lng: 106.019359,
    lat: 23.725817,
    province: "云南省",
    adcode: 530000,
  },
  {
    s: 4,
    value: 10,
    lng: 105.762469,
    lat: 31.207529,
    province: "四川省",
    adcode: 510000,
  },
  {
    s: 2,
    value: 68,
    lng: 131.885665,
    lat: 46.3968,
    province: "黑龙江省",
    adcode: 230000,
  },
  {
    s: 2,
    value: 99,
    lng: 80.451482,
    lat: 34.098914,
    province: "西藏自治区",
    adcode: 540000,
  },
  {
    s: 3,
    value: 56,
    lng: 116.758467,
    lat: 40.422062,
    province: "北京市",
    adcode: 110000,
  },
  {
    s: 4,
    value: 24,
    lng: 118.047202,
    lat: 34.108716,
    province: "江苏省",
    adcode: 320000,
  },
  {
    s: 3,
    value: 68,
    lng: 115.28116,
    lat: 31.030701,
    province: "湖北省",
    adcode: 420000,
  },
  {
    s: 3,
    value: 24,
    lng: 90.811741,
    lat: 40.286935,
    province: "新疆维吾尔自治区",
    adcode: 650000,
  },
  {
    lng: 97.847928,
    lat: 36.63359,
    s: 1,
    value: 24,
    province: "青海省",
    adcode: 630000,
  },
  {
    lng: 111.241497,
    lat: 27.634283,
    s: 4,
    value: 67,
    province: "湖南省",
    adcode: 430000,
  },
  {
    lng: 92.07031,
    lat: 31.067068,
    s: 6,
    value: 20,
    province: "西藏自治区",
    adcode: 540000,
  },
];
