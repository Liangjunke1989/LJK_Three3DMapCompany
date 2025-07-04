/**
 * 时间管理类
 * 管理3D场景的时间循环和帧率控制
 * 
 * 主要功能：
 * - 基于requestAnimationFrame的高性能渲染循环
 * - 提供delta时间（帧间时间差）用于动画计算
 * - 提供累计运行时间用于时间相关效果
 * - 集成THREE.Clock获得高精度时间计算
 * - 支持暂停和恢复时间循环
 * 
 * 继承：EventEmitter - 支持事件发射
 * 性能：使用requestAnimationFrame确保最优帧率
 */

import { EventEmitter } from "./EventEmitter"
import * as THREE from "three"

export class Time extends EventEmitter {
  /**
   * 构造函数 - 初始化时间管理器
   */
  constructor() {
    // 继承EventEmitter的事件功能
    super()

    // 时间戳相关属性
    this.start = Date.now()      // 开始时间戳
    this.current = this.start    // 当前时间戳
    this.elapsed = 0             // 累计运行时间（毫秒）
    this.delta = 16              // 帧间时间差（毫秒），默认约60fps
    
    // THREE.js高精度时钟
    this.clock = new THREE.Clock()
    
    // 启动渲染循环
    this.timer = window.requestAnimationFrame(() => {
      this.tick()
    })
  }
  
  /**
   * 渲染循环核心函数
   * 每帧调用，计算时间相关参数并发射tick事件
   */
  tick() {
    // 获取当前时间戳
    const currentTime = Date.now()
    
    // 计算帧间时间差（毫秒）
    this.delta = currentTime - this.current
    
    // 更新当前时间
    this.current = currentTime
    
    // 计算累计运行时间
    this.elapsed = this.current - this.start
    
    // 使用THREE.Clock获得高精度时间
    const delta = this.clock.getDelta()           // 帧间时间差（秒）
    const elapsedTime = this.clock.getElapsedTime() // 累计时间（秒）
    
    // 发射tick事件，传递时间参数给监听器
    this.emit("tick", delta, elapsedTime)
    
    // 检查是否需要停止循环
    if (this.stop) {
      window.cancelAnimationFrame(this.timer)
      return false
    }
    
    // 请求下一帧
    this.timer = window.requestAnimationFrame(() => {
      this.tick()
    })
  }
  
  /**
   * 销毁时间管理器
   * 停止渲染循环并清理事件监听器
   */
  destroy() {
    // 设置停止标志，下一帧时停止循环
    this.stop = true
    
    // 移除所有tick事件监听器
    this.off("tick")
  }
}
