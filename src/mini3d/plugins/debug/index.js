/**
 * 调试工具插件
 * 提供GUI调试界面，用于实时调试和参数调节
 * 
 * 主要功能：
 * - 基于lil-gui的可视化调试界面
 * - 条件激活（URL hash或手动激活）
 * - 运行时参数调节
 * - 开发环境调试支持
 * 
 * 技术实现：
 * - 集成lil-gui库
 * - 支持开发/生产环境切换
 * - 轻量级插件设计
 * 
 * 激活方式：
 * - URL中添加 #debug 自动启用
 * - 构造函数传入 active: true
 * 
 * 应用场景：
 * - 开发阶段的参数调试
 * - 实时效果预览
 * - 性能监控
 * - 交互式参数调节
 */

import GUI from "three/examples/jsm/libs/lil-gui.module.min"

export class Debug {
  /**
   * 构造函数 - 初始化调试工具
   * @param {boolean} active - 是否激活调试模式，默认false
   */
  constructor(active = false) {
    this.active = active  // 调试模式开关
    
    // 检查URL hash，如果包含 #debug 则自动启用调试模式
    if (window.location.hash === "#debug") {
      this.active = true
    }
    
    // 如果启用调试模式，创建GUI界面
    if (this.active) {
      this.instance = new GUI()    // 创建lil-gui实例
      this.instance.close()        // 默认折叠状态
    }
  }
  
  /**
   * 更新函数
   * 预留接口，用于需要每帧更新的调试功能
   */
  update() {
    // 预留更新逻辑
  }
  
  /**
   * 销毁调试工具
   * 清理GUI资源，防止内存泄漏
   */
  destroy() {
    if (this.active) {
      // 销毁GUI实例
      this.instance.destroy()
    }
  }
}

