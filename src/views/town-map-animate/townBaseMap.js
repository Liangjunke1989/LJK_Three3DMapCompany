/**
 * 村镇基础地图类
 * 用于创建平面地图，不进行挤出处理
 * 
 * 主要功能：
 * - 将GeoJSON数据转换为平面地图几何体
 * - 支持几何体合并优化性能
 * - 提供基础的地图渲染能力
 * - 可自定义材质和样式
 */

import {
  Mesh,                // 网格对象
  Vector2,             // 2D向量
  Color,               // 颜色
  Group,               // 组对象
  Object3D,            // 3D对象
  BufferAttribute,     // 缓冲属性
  Shape,               // 形状
  ExtrudeGeometry,     // 挤出几何体
  MeshBasicMaterial,   // 基础材质
  DoubleSide,          // 双面渲染
  ShapeGeometry,       // 形状几何体
} from "three"
import { transfromMapGeoJSON, getBoundBox } from "@/mini3d"              // 工具函数
import { Vector3 } from "yuka";                                           // 3D向量（yuka库）
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils"; // 几何体合并工具

export class TownBaseMap {
  constructor(state, eventBus) {
    this.state = state
    this.eventBus = eventBus
    this.assets = {}
  }
  create(mapData) {
    // 创建地图
    const map = new Mesh()
    map.geometry = new ShapeGeometry(mapData)
    map.material = new MeshBasicMaterial({ color: 0x000000 })
    return map
  }
  getCoordinates() {
    // 获取地图坐标
    return this.state.coordinates
  }
  setParent(parent) {
    // 设置地图父级
    parent.add(this.state.map)
  }
  destroy() {
    // 销毁地图
    this.state.map.geometry.dispose()
    this.state.map.material.dispose()
    this.state.map.dispose()
    this.state.map = null   
    this.state.coordinates = null
  }
  update(mapData) {
    // 更新地图
    this.state.map.geometry = new ShapeGeometry(mapData)
    this.state.coordinates = mapData
  }
  getMap() {
    // 获取地图
    return this.state.map
  }
  getCoordinates() {
    // 获取地图坐标
    return this.state.coordinates
  }
  getAssets() {
    // 获取地图资源
    return this.assets
  }
  setAssets(assets) {
    // 设置地图资源
    this.assets = assets
  }
  getMaterial() {
    // 获取地图材质
    return this.state.material
  }
  setMaterial(material) {
    // 设置地图材质
    this.state.material = material
  }
  getGeometry() {
    // 获取地图几何体
    return this.state.geometry
  }
  setGeometry(geometry) {
    // 设置地图几何体
    this.state.geometry = geometry
  }
 
}
        