/**
 * 尺寸管理类
 * 负责监听和管理窗口尺寸变化，为3D场景提供响应式支持
 * 
 * 主要功能：
 * - 获取和管理窗口宽高尺寸
 * - 自动适配设备像素比（支持高DPI显示器）
 * - 监听窗口尺寸变化事件
 * - 提供事件通知机制
 * 
 * 继承：EventEmitter - 支持事件发射
 * 响应式：自动适配不同设备和窗口大小
 */

import { EventEmitter } from "./EventEmitter"

export class Sizes extends EventEmitter {
  /**
   * 构造函数 - 初始化尺寸管理器
   * @param {Object} dependencies - 依赖对象
   * @param {HTMLCanvasElement} dependencies.canvas - 画布元素
   */
  constructor({ canvas }) {
    // 继承EventEmitter的事件功能
    super()
    
    this.canvas = canvas     // 画布DOM元素
    this.pixelRatio = 0      // 设备像素比
    
    // 初始化尺寸参数
    this.init()
    
    // 监听窗口尺寸变化事件
    window.addEventListener("resize", () => {
      this.init()              // 重新计算尺寸
      this.emit("resize")      // 发射resize事件通知其他组件
    })
  }
  
  /**
   * 初始化和更新尺寸参数
   * 计算当前窗口的宽高和设备像素比
   */
  init() {
    // 获取窗口的内部宽度和高度
    this.width = window.innerWidth
    this.height = window.innerHeight
    
    // 设置设备像素比，限制最大值为2以避免性能问题
    // Math.min确保在超高DPI设备上不会过度消耗性能
    this.pixelRatio = this.pixelRatio || Math.min(window.devicePixelRatio, 2)
  }
  
  /**
   * 销毁尺寸管理器
   * 移除事件监听器，防止内存泄漏
   */
  destroy() {
    // 移除resize事件的所有监听器
    this.off("resize")
  }
}
