/**
 * Mini3D 框架核心类
 * 基于Three.js的轻量级3D渲染框架主类
 * 
 * 主要功能：
 * - 继承EventEmitter提供事件通信能力
 * - 集成Three.js的核心组件（Scene、Camera、Renderer）
 * - 提供地理投影功能支持地图可视化
 * - 管理框架完整生命周期
 * - 统一的渲染循环和资源管理
 */

import { AxesHelper, Scene, Mesh } from "three"
import { EventEmitter, Sizes, Time } from "../utils"
import { Renderer } from "./Renderer"
import { Camera } from "./Camera"
import { geoMercator } from "d3-geo"      // 地理投影库

export class Mini3d extends EventEmitter {
  /**
   * 构造函数 - 初始化3D框架
   * @param {HTMLCanvasElement} canvas - 画布DOM元素
   * @param {Object} config - 配置参数
   * @param {Array} config.geoProjectionCenter - 地理投影中心坐标 [经度, 纬度]
   * @param {number} config.geoProjectionScale - 地理投影缩放系数
   * @param {Array} config.geoProjectionTranslate - 地理投影平移偏移 [x, y]
   */
  constructor(canvas, config = {}) {
    super()
    
    // 保存画布引用
    this.canvas = canvas
    
    // 创建Three.js核心对象
    this.scene = new Scene()                    // 3D场景
    this.sizes = new Sizes(this)               // 尺寸管理器
    this.time = new Time(this)                 // 时间管理器
    this.camera = new Camera(this)             // 相机管理器
    this.renderer = new Renderer(this)         // 渲染器管理器
    
    // 地理投影配置参数
    let defaultConfig = {
      geoProjectionCenter: [0, 0],      // 投影中心坐标（经纬度）
      geoProjectionScale: 120,          // 投影缩放系数
      geoProjectionTranslate: [0, 0],   // 投影平移偏移
    }
    this.config = Object.assign({}, defaultConfig, config)
    
    // 监听尺寸变化事件
    this.sizes.on("resize", () => {
      this.resize()
    })
    
    // 监听时间更新事件，启动渲染循环
    this.time.on("tick", (delta) => {
      this.update(delta)
    })
  }
  
  /**
   * 设置坐标轴助手
   * 用于开发调试，显示XYZ三轴坐标系
   * @param {number} size - 坐标轴长度，默认250
   * @returns {boolean} 是否成功添加
   */
  setAxesHelper(size = 250) {
    if (!size) {
      return false
    }
    let axes = new AxesHelper(size)
    this.scene.add(axes)
  }
  
  /**
   * 地理坐标投影函数
   * 将经纬度坐标转换为3D世界坐标
   * 使用墨卡托投影算法
   * @param {Array} args - 地理坐标 [经度, 纬度]
   * @returns {Array} 投影后的平面坐标 [x, y]
   */
  geoProjection = (args) => {
    let { geoProjectionCenter, geoProjectionScale, geoProjectionTranslate } = this.config
    return geoMercator()
      .center(geoProjectionCenter)      // 设置投影中心
      .scale(geoProjectionScale)        // 设置投影缩放
      .translate(geoProjectionTranslate) // 设置投影平移
      (args)
  }
  
  /**
   * 响应窗口大小变化
   * 更新相机和渲染器的尺寸参数
   */
  resize() {
    this.camera.resize()
    this.renderer.resize()
  }
  
  /**
   * 渲染循环更新函数
   * 每帧调用，更新相机控制器和渲染器
   * @param {number} delta - 帧间时间差（秒）
   */
  update(delta) {
    this.camera.update(delta)
    this.renderer.update(delta)
  }

  /**
   * 销毁框架并释放所有资源
   * 包括：
   * - 停止所有管理器
   * - 释放几何体和材质资源
   * - 移除DOM元素
   */
  destroy() {
    // 销毁各个管理器
    this.sizes.destroy()
    this.time.destroy()
    this.camera.destroy()
    this.renderer.destroy()
    
    // 遍历场景中的所有对象，释放资源
    this.scene.traverse((child) => {
      if (child instanceof Mesh) {
        // 释放几何体资源
        child.geometry.dispose()
        
        // 释放材质资源
        for (const key in child.material) {
          const value = child.material[key]
          if (value && typeof value.dispose === "function") {
            value.dispose()
          }
        }
      }
    })
    
    // 从DOM中移除画布元素
    this.canvas.parentNode.removeChild(this.canvas)
  }
}
