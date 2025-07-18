/**
 * 中国省市自治区数据配置
 * 包含各省市的地理位置信息和显示状态
 * 
 * 数据结构：
 * - name: 省市名称
 * - center: 地理中心坐标 [经度, 纬度]
 * - centroid: 几何中心坐标 [经度, 纬度]
 * - hide: 是否隐藏（用于控制显示状态）
 * - blur: 是否模糊显示（用于特殊效果）
 */

export default [
  { name: "北京市", center: [116.405285, 39.904989], centroid: [116.41995, 40.18994], hide: true },
  { name: "天津市", center: [117.190182, 39.125596], centroid: [117.347043, 39.288036], hide: true },
  { name: "河北省", center: [114.502461, 38.045474], centroid: [114.502461, 38.045474], hide: true },
  { name: "山西省", center: [112.549248, 37.857014], centroid: [112.304436, 37.618179], hide: true },
  { name: "内蒙古自治区", center: [111.670801, 40.818311], centroid: [114.077429, 44.331087], hide: true },
  { name: "辽宁省", center: [123.429096, 41.796767], centroid: [122.604994, 41.299712], hide: true },
  { name: "吉林省", center: [125.3245, 43.886841], centroid: [126.171208, 43.703954], hide: true },
  { name: "黑龙江省", center: [126.642464, 45.756967], centroid: [127.693027, 48.040465], hide: true },
  { name: "上海市", center: [121.472644, 31.231706], centroid: [121.438737, 31.072559], hide: true },
  { name: "江苏省", center: [118.767413, 32.041544], centroid: [119.486506, 32.983991], hide: false },
  { name: "浙江省", center: [120.153576, 30.287459], centroid: [120.109913, 29.181466], hide: true },
  { name: "安徽省", center: [117.283042, 31.86119], centroid: [117.226884, 31.849254], hide: false },
  { name: "福建省", center: [119.306239, 26.075302], centroid: [118.006468, 26.069925], hide: true },
  { name: "江西省", center: [115.892151, 28.676493], centroid: [115.732975, 27.636112], hide: false },
  { name: "山东省", center: [117.000923, 36.675807], centroid: [118.187759, 36.376092], blur: true },
  { name: "河南省", center: [113.665412, 34.757975], centroid: [113.619717, 33.902648], blur: true },
  { name: "湖北省", center: [114.298572, 30.584355], centroid: [112.271301, 30.987527], blur: true },
  { name: "湖南省", center: [112.982279, 28.19409], centroid: [111.711649, 27.629216], blur: true },
  { name: "广东省", center: [113.280637, 23.125178], centroid: [113.429919, 23.334643], blur: true },
  { name: "广西壮族自治区", center: [108.320004, 22.82402], centroid: [108.7944, 23.833381], hide: true },
  { name: "海南省", center: [110.33119, 20.031971], centroid: [109.754859, 19.189767], hide: true },
  { name: "重庆市", center: [106.504962, 29.533155], centroid: [107.8839, 30.067297], blur: true },
  { name: "四川省", center: [104.065735, 30.659462], centroid: [102.693453, 30.674545], hide: true },
  { name: "贵州省", center: [106.713478, 26.578343], centroid: [106.880455, 26.826368], blur: true },
  { name: "云南省", center: [102.712251, 25.040609], centroid: [101.485106, 25.008643], hide: true },
  { name: "西藏自治区", center: [91.132212, 29.660361], centroid: [88.388277, 31.56375], hide: true },
  { name: "陕西省", center: [108.948024, 34.263161], centroid: [108.887114, 35.263661], hide: true },
  { name: "甘肃省", center: [103.823557, 36.058039], centroid: [103.823557, 36.058039], hide: true },
  { name: "青海省", center: [101.778916, 36.623178], centroid: [96.043533, 35.726403], hide: true },
  { name: "宁夏回族自治区", center: [106.278179, 38.46637], centroid: [106.169866, 37.291332], hide: true },
  { name: "新疆维吾尔自治区", center: [87.617733, 43.792818], centroid: [85.294711, 41.371801], hide: true },
  { name: "台湾省", center: [121.509062, 25.044332], centroid: [120.971485, 23.749452] },
  { name: "香港特别行政区", center: [114.173355, 22.320048], centroid: [114.134357, 22.377366], hide: true },
  { name: "澳门特别行政区", center: [113.54909, 22.198951], centroid: [113.566988, 22.159307], hide: true },
]
