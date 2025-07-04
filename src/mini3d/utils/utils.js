/**
 * 通用工具函数集合
 * 提供3D场景开发中常用的辅助功能
 * 
 * 主要功能模块：
 * - UUID生成：创建唯一标识符
 * - 包围盒计算：获取3D对象的边界信息
 * - 地图数据转换：处理GeoJSON格式数据
 * - 深度克隆：完整的对象拷贝
 * - 深度合并：智能的对象合并
 * 
 * 应用场景：
 * - 地图可视化数据处理
 * - 3D对象空间计算
 * - 状态管理和数据操作
 */

import { Box3, Vector3 } from "three"

/**
 * 生成唯一标识符（UUID）
 * 支持自定义长度和字符集基数
 * 
 * @param {number} len - 生成的ID长度，默认10位
 * @param {number} radix - 字符集基数，默认62（包含数字+大小写字母）
 * @returns {string} 生成的唯一标识符
 * 
 * @example
 * uuid()           // 生成10位随机ID
 * uuid(8)          // 生成8位随机ID  
 * uuid(12, 16)     // 生成12位16进制ID
 */
export function uuid(len = 10, radix = 62) {
  // 字符集：数字 + 大写字母 + 小写字母 (62个字符)
  var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz".split("")
  var uuid = [],
    i
  radix = radix || chars.length

  if (len) {
    // 生成指定长度的随机ID
    for (i = 0; i < len; i++) uuid[i] = chars[0 | (Math.random() * radix)]
  } else {
    // 生成符合RFC4122标准的UUID格式
    var r

    // RFC4122要求的固定字符位置
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = "-"
    uuid[14] = "4"  // 版本号

    // 填充随机数据，在i==19位置设置时钟序列的高位
    for (i = 0; i < 36; i++) {
      if (!uuid[i]) {
        r = 0 | (Math.random() * 16)
        uuid[i] = chars[i == 19 ? (r & 0x3) | 0x8 : r]
      }
    }
  }

  return uuid.join("")
}

/**
 * 获取3D对象的包围盒信息
 * 计算对象在3D空间中的边界、尺寸和中心点
 * 
 * @param {Object3D} group - Three.js的3D对象或组
 * @returns {Object} 包围盒信息对象
 * @returns {Box3} returns.box3 - Three.js包围盒对象
 * @returns {Vector3} returns.boxSize - 包围盒尺寸
 * @returns {Vector3} returns.center - 包围盒中心点
 * @returns {Vector3} [returns.size] - 几何体实际尺寸（仅当对象有geometry时）
 * 
 * @example
 * const boundInfo = getBoundBox(meshGroup)
 * console.log(boundInfo.center)    // 中心点坐标
 * console.log(boundInfo.boxSize)   // 包围盒尺寸
 */
export function getBoundBox(group) {
  // 计算实际宽高的存储向量
  var size = new Vector3()

  // 创建包围盒并计算模型对象的大小和位置
  var box3 = new Box3()
  box3.expandByObject(group) // 根据对象扩展包围盒
  
  var boxSize = new Vector3()
  box3.getSize(boxSize) // 获取包围盒尺寸
  
  var center = new Vector3()
  box3.getCenter(center) // 获取包围盒几何中心坐标
  
  // 构建返回对象
  let obj = {
    box3,        // 包围盒对象
    boxSize,     // 包围盒尺寸
    center,      // 中心点
  }
  
  // 如果对象有几何体，计算几何体的精确尺寸
  if (group.geometry) {
    group.geometry.computeBoundingBox()      // 计算几何体包围盒
    group.geometry.computeBoundingSphere()   // 计算几何体包围球
    
    const { max, min } = group.geometry.boundingBox
    size.x = max.x - min.x   // X轴尺寸
    size.y = max.y - min.y   // Y轴尺寸
    size.z = max.z - min.z   // Z轴尺寸
    obj.size = size
  }
  
  return obj
}

/**
 * 转换GeoJSON地图数据格式
 * 将Polygon类型转换为MultiPolygon类型，统一数据结构
 * 确保所有地理要素都有相同的坐标数组层级
 * 
 * @param {Object|string} data - GeoJSON数据对象或JSON字符串
 * @returns {Object} 格式化后的GeoJSON数据
 * 
 * @example
 * const mapData = transfromMapGeoJSON(geoJsonString)
 * // 所有features都统一为MultiPolygon格式
 */
export const transfromMapGeoJSON = (data) => {
  // 检查输入是否已经是对象，如果是字符串则解析
  let worldData = typeof data === 'string' ? JSON.parse(data) : data
  let features = worldData.features
  
  // 遍历所有地理要素
  for (let i = 0; i < features.length; i++) {
    const element = features[i]
    
    // 将单个Polygon转换为MultiPolygon格式
    // 这样可以统一处理单个和多个多边形的情况
    if (element.geometry.type === "Polygon") {
      element.geometry.coordinates = [element.geometry.coordinates]
    }
  }
  
  return worldData
}

/**
 * 转换路网GeoJSON数据格式
 * 将LineString类型转换为MultiLineString类型，与地图数据保持一致
 * 
 * @param {Object} roadData - 路网GeoJSON数据
 * @returns {Object} 格式化后的路网数据
 * 
 * @example
 * const roadData = transformGeoRoad(roadGeoJson)
 * // 所有线条要素都统一为MultiLineString格式
 */
export const transformGeoRoad = (roadData) => {
  let features = roadData.features
  
  for (let i = 0; i < features.length; i++) {
    const element = features[i]
    
    // 处理不同类型的线条几何体
    if (element.geometry.type === "LineString") {
      // LineString转换为与MultiLineString相同的数据结构
      element.geometry.coordinates = [[element.geometry.coordinates]]
    } else {
      // MultiLineString添加额外的数组层级
      element.geometry.coordinates = [element.geometry.coordinates]
    }
  }
  
  return roadData
}

/**
 * 深度克隆对象
 * 完整复制对象的所有属性，包括嵌套对象和数组
 * 使用Map缓存处理循环引用问题
 * 
 * @param {any} target - 要克隆的目标对象
 * @param {Map} map - 缓存Map，用于处理循环引用
 * @returns {any} 深度克隆后的新对象
 * 
 * @example
 * const original = { a: 1, b: { c: 2 } }
 * const cloned = deepClone(original)
 * cloned.b.c = 3  // 不会影响original
 */
export function deepClone(target, map = new Map()) {
  // 检查目标是否为非空对象
  if (target != null && isObject(target)) {
    // 检查是否已经克隆过，避免循环引用
    let cache = map.get(target)
    if (cache) {
      return cache
    }
    
    // 判断是数组还是对象
    const isArray = Array.isArray(target)
    let result = isArray ? [] : {}
    
    // 将新结果存入缓存
    map.set(target, result)
    
    if (isArray) {
      // 处理数组类型
      target.forEach((item, index) => {
        // 递归克隆数组元素
        result[index] = deepClone(item, map)
      })
    } else {
      // 处理对象类型
      Object.keys(target).forEach((key) => {
        if (isObject(result[key])) {
          // 递归克隆对象属性
          result[key] = deepClone(target[key], map)
        } else {
          // 直接复制基本类型
          result[key] = target[key]
        }
      })
    }
    
    return result
  } else {
    // 基本类型直接返回
    return target
  }
}

/**
 * 深度合并对象
 * 智能合并两个对象，深度处理嵌套属性
 * 
 * @param {Object} target - 目标对象
 * @param {Object} source - 源对象
 * @returns {Object} 合并后的新对象
 * 
 * @example
 * const obj1 = { a: 1, b: { c: 2 } }
 * const obj2 = { b: { d: 3 }, e: 4 }
 * const merged = deepMerge(obj1, obj2)
 * // 结果: { a: 1, b: { c: 2, d: 3 }, e: 4 }
 */
export function deepMerge(target, source) {
  // 先深度克隆目标对象，避免修改原对象
  target = deepClone(target)
  
  // 遍历源对象的所有属性
  for (let key in source) {
    if (key in target) {
      // 目标对象中已存在该属性
      if (isObject(source[key])) {
        if (!isObject(target[key])) {
          // 目标属性不是对象，直接替换
          target[key] = source[key]
        } else {
          // 两者都是对象，递归合并
          target[key] = deepMerge(target[key], source[key])
        }
      } else {
        // 源属性不是对象，直接覆盖
        target[key] = source[key]
      }
    } else {
      // 目标对象中不存在该属性，直接添加
      target[key] = source[key]
    }
  }
  
  return target
}

/**
 * 检查值是否为对象类型
 * 排除null和数组等特殊情况
 * 
 * @param {any} value - 要检查的值
 * @returns {boolean} 是否为对象
 */
function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}
