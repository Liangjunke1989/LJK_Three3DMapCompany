/**
 * 标牌数据配置
 * 用于在地图上显示标牌信息的数据集合
 * 
 * 数据结构：
 * - adcode: 行政区代码
 * - value: 数值（用于显示在标牌上）
 * - geometry: 地理位置信息
 *   - type: 几何类型（Point）
 *   - coordinates: 坐标 [经度, 纬度]
 */

export default [
  {
    adcode: 150000,    // 内蒙古自治区
    value: 7621,       // 显示数值
    geometry: { type: "Point", coordinates: [111.670801, 40.818311] },  // 地理坐标
  },
  {
    adcode: 140000,    // 山西省
    value: 8787,       // 显示数值
    geometry: { type: "Point", coordinates: [112.549248, 37.857014] },  // 地理坐标
  },
  {
    adcode: 320000,    // 江苏省
    value: 9821,       // 显示数值
    geometry: { type: "Point", coordinates: [118.767413, 32.041544] },  // 地理坐标
  },
  {
    adcode: 500000,    // 重庆市
    value: 8765,       // 显示数值
    geometry: { type: "Point", coordinates: [106.504962, 29.533155] },  // 地理坐标
  },
  {
    adcode: 530000,    // 云南省
    value: 8741,       // 显示数值
    geometry: { type: "Point", coordinates: [102.712251, 25.040609] },  // 地理坐标
  },
];
