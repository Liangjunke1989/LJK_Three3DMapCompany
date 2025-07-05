/**
 * 村镇扩散着色器类
 * 用于将村镇地图数据转换为扩散着色器
 * 
 * 主要功能：
 * - 将村镇地图数据转换为扩散着色器
 * - 支持自定义着色器
 * - 支持自定义着色器参数
 * - 支持自定义着色器渲染
 */

import {
  Mesh,                // 网格对象
  Vector2,             // 2D向量
  Vector3,             // 3D向量
  Group,               // 组对象
  Shape,               // 形状对象
  ExtrudeGeometry,     // 挤出几何体
  MeshBasicMaterial,   // 基础材质
  LineBasicMaterial,   // 线条材质
  LineLoop,            // 线圈
  BufferGeometry,      // 缓冲几何体
} from "three"  

export class TownDiffuseShader {
  constructor(state, eventBus) {
    this.state = state
    this.eventBus = eventBus
    this.assets = {}
  }
  create(mapData) {
    // 创建扩散着色器
    const shader = new ShaderMaterial({
      uniforms: {
        u_map: { value: mapData }
      }
    })
    return shader
  }
  getMap() {
    // 获取地图
    return this.state.map
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
    // 销毁扩散着色器
    this.state.map.geometry.dispose()
    this.state.map.material.dispose()
    this.state.map.dispose()
    this.state.map = null
    this.state.coordinates = null
  }
  update(mapData) {
    // 更新扩散着色器
    this.state.map.geometry = new ShapeGeometry(mapData)
    this.state.coordinates = mapData
  }
  getAssets() { 
    // 获取扩散着色器资源
    return this.assets
  }
  setAssets(assets) {
    // 设置扩散着色器资源
    this.assets = assets
  }
  getMaterial() {
    // 获取扩散着色器材质
    return this.state.material
  }
  setMaterial(material) {
    // 设置扩散着色器材质
    this.state.material = material
  }
  getGeometry() {
    // 获取扩散着色器几何体
    return this.state.geometry
  }
  setGeometry(geometry) {
    // 设置扩散着色器几何体
    this.state.geometry = geometry
  }
  getShader() {
    // 获取扩散着色器
    return this.state.shader
  }
  setShader(shader) {
    // 设置扩散着色器
    this.state.shader = shader
  }
  getUniforms() {
    // 获取扩散着色器参数
    return this.state.uniforms
  }
  setUniforms(uniforms) {
    // 设置扩散着色器参数
    this.state.uniforms = uniforms
  } 
  getVertexShader() {
    // 获取扩散着色器顶点着色器
    return this.state.vertexShader
  }
  setVertexShader(vertexShader) {
    // 设置扩散着色器顶点着色器
    this.state.vertexShader = vertexShader
  }
  getFragmentShader() {
    // 获取扩散着色器片段着色器
    return this.state.fragmentShader
  }
  setFragmentShader(fragmentShader) {
    // 设置扩散着色器片段着色器
    this.state.fragmentShader = fragmentShader
  }
  getShaderMaterial() {
    // 获取扩散着色器材质
    return this.state.shaderMaterial
  }
  setShaderMaterial(shaderMaterial) {
    // 设置扩散着色器材质
    this.state.shaderMaterial = shaderMaterial
  } 
}       
        