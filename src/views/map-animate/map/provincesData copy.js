/**
 * 省份数据配置副本（福建省城市数据）
 * 用于展示福建省各地级市的详细信息
 * 
 * 数据结构：
 * - name: 城市名称
 * - enName: 英文名称
 * - value: 数值（用于柱状图高度和数据展示）
 * - adcode: 行政区代码（国家标准）
 * - center: 地理中心坐标 [经度, 纬度]
 * - centroid: 几何中心坐标 [经度, 纬度]
 * 
 * 用途：
 * - 作为省级钻取地图的数据源
 * - 生成城市级柱状图
 * - 显示城市标签和数值
 * - 支持城市级数据可视化
 */

export default [
  {
    name: "福州市",                          // 城市名称
    enName: "fuzhou",                       // 英文名称
    value: 98,                              // 数值（用于柱状图）
    adcode: 350100,                         // 行政区代码
    center: [119.306239, 26.075302],        // 地理中心坐标
    centroid: [119.200519, 26.047886],      // 几何中心坐标
  },
  {
    name: "厦门市",                          // 城市名称
    enName: "xiamen",                       // 英文名称
    value: 43,                              // 数值（用于柱状图）
    adcode: 350200,                         // 行政区代码
    center: [118.11022, 24.490474],         // 地理中心坐标
    centroid: [118.123854, 24.676398],      // 几何中心坐标
  },
  {
    name: "莆田市",
    enName: "putian",
    value: 76,
    adcode: 350300,
    center: [119.007558, 25.431011],
    centroid: [118.894712, 25.445304],
  },
  {
    name: "三明市",
    enName: "sanming",
    value: 48,
    adcode: 350400,
    center: [117.635001, 26.265444],
    centroid: [117.400007, 26.298093],
  },
  {
    name: "泉州市",
    enName: "quanzhou",
    value: 32,
    adcode: 350500,
    center: [118.589421, 24.908853],
    centroid: [118.267651, 25.202187],
  },
  {
    name: "漳州市",
    enName: "zhangzhou",
    value: 25,
    adcode: 350600,
    center: [117.661801, 24.510897],
    centroid: [117.458578, 24.330766],
  },
  {
    name: "南平市",
    enName: "nanping",
    value: 55,
    adcode: 350700,
    center: [118.178459, 26.635627],
    centroid: [118.147051, 27.338631],
  },
  {
    name: "龙岩市",
    enName: "longyan",
    value: 38,
    adcode: 350800,
    center: [117.02978, 25.091603],
    centroid: [116.74379, 25.291574],
  },
  {
    name: "宁德市",
    enName: "ningde",
    value: 16,
    adcode: 350900,
    center: [119.527082, 26.65924],
    centroid: [119.489399, 26.971518],
  },
];
