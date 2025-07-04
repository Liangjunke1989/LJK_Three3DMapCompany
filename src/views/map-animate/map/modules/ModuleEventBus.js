import { EventEmitter } from "@/mini3d"

/**
 * 模块间事件通信总线
 * 
 * 基于EventEmitter实现的发布-订阅模式事件系统，
 * 用于解耦各个模块间的通信，提供统一的事件接口。
 * 
 * 主要事件类型：
 * - 地图交互事件：hover、click、select等
 * - 场景切换事件：sceneChange、mapLoad等  
 * - 组件状态事件：componentVisible、componentUpdate等
 * - 动画事件：animationStart、animationComplete等
 * 
 * @extends EventEmitter
 * @author LJK
 * @version 1.0.0
 */
export class ModuleEventBus extends EventEmitter {
  constructor() {
    super()
    
    // ============ 事件类型常量定义 ============
    this.EVENTS = {
      // 地图交互事件
      MAP_HOVER: 'map:hover',           // 地图悬停事件
      MAP_CLICK: 'map:click',           // 地图点击事件  
      MAP_SELECT: 'map:select',         // 地图选中事件
      MAP_RESET: 'map:reset',           // 地图重置事件
      
      // 场景管理事件
      SCENE_CHANGE: 'scene:change',     // 场景切换事件
      MAP_LOAD: 'map:load',             // 地图加载事件
      MAP_READY: 'map:ready',           // 地图准备完成事件
      CHILD_MAP_LOAD: 'childMap:load',  // 子地图加载事件
      
      // 组件状态事件
      COMPONENT_SHOW: 'component:show', // 组件显示事件
      COMPONENT_HIDE: 'component:hide', // 组件隐藏事件
      COMPONENT_UPDATE: 'component:update', // 组件更新事件
      COMPONENT_MOVE: 'component:move', // 组件移动事件
      
      // 动画事件
      ANIMATION_START: 'animation:start', // 动画开始事件
      ANIMATION_COMPLETE: 'animation:complete', // 动画完成事件
      ANIMATION_TIMELINE: 'animation:timeline', // 时间线动画事件
      
      // 数据事件
      DATA_LOAD: 'data:load',           // 数据加载事件
      DATA_UPDATE: 'data:update',       // 数据更新事件
      DATA_ERROR: 'data:error',         // 数据错误事件
      
      // 资源事件
      RESOURCE_LOAD: 'resource:load',   // 资源加载事件
      RESOURCE_READY: 'resource:ready', // 资源准备完成事件
      RESOURCE_ERROR: 'resource:error', // 资源错误事件
      
      // 导航事件
      NAVIGATION_FORWARD: 'nav:forward', // 导航前进事件
      NAVIGATION_BACK: 'nav:back',       // 导航后退事件
      NAVIGATION_RESET: 'nav:reset',     // 导航重置事件
    }
  }
  
  /**
   * 发射地图交互事件
   * @param {string} type - 事件类型：hover | click | select | reset
   * @param {Object} data - 事件数据
   */
  emitMapInteraction(type, data) {
    const eventName = `map:${type}`
    this.emit(eventName, {
      type,
      timestamp: Date.now(),
      ...data
    })
  }
  
  /**
   * 发射场景切换事件
   * @param {string} fromScene - 切换前场景
   * @param {string} toScene - 切换后场景
   * @param {Object} data - 附加数据
   */
  emitSceneChange(fromScene, toScene, data = {}) {
    this.emit(this.EVENTS.SCENE_CHANGE, {
      fromScene,
      toScene,
      timestamp: Date.now(),
      ...data
    })
  }
  
  /**
   * 发射组件状态事件
   * @param {string} action - 动作类型：show | hide | update | move
   * @param {string} componentType - 组件类型
   * @param {Object} data - 组件数据
   */
  emitComponentAction(action, componentType, data) {
    const eventName = `component:${action}`
    this.emit(eventName, {
      componentType,
      action,
      timestamp: Date.now(),
      ...data
    })
  }
  
  /**
   * 发射动画事件
   * @param {string} type - 动画类型：start | complete | timeline
   * @param {Object} animationData - 动画相关数据
   */
  emitAnimation(type, animationData) {
    const eventName = `animation:${type}`
    this.emit(eventName, {
      type,
      timestamp: Date.now(),
      ...animationData
    })
  }
  
  /**
   * 发射导航事件
   * @param {string} action - 导航动作：forward | back | reset
   * @param {Object} navigationData - 导航数据
   */
  emitNavigation(action, navigationData) {
    const eventName = `nav:${action}`
    this.emit(eventName, {
      action,
      timestamp: Date.now(),
      ...navigationData
    })
  }
  
  /**
   * 批量注册事件监听器
   * @param {Object} listeners - 事件监听器对象，key为事件名，value为处理函数
   */
  registerListeners(listeners) {
    Object.entries(listeners).forEach(([eventName, handler]) => {
      this.on(eventName, handler)
    })
  }
  
  /**
   * 批量移除事件监听器
   * @param {Object} listeners - 事件监听器对象
   */
  unregisterListeners(listeners) {
    Object.entries(listeners).forEach(([eventName, handler]) => {
      this.off(eventName, handler)
    })
  }
  
  /**
   * 创建带命名空间的事件发射器
   * @param {string} namespace - 命名空间
   * @returns {Object} 带命名空间的事件方法
   */
  createNamespace(namespace) {
    return {
      emit: (eventName, data) => {
        this.emit(`${namespace}:${eventName}`, data)
      },
      on: (eventName, handler) => {
        this.on(`${namespace}:${eventName}`, handler)
      },
      off: (eventName, handler) => {
        this.off(`${namespace}:${eventName}`, handler)
      },
      once: (eventName, handler) => {
        this.once(`${namespace}:${eventName}`, handler)
      }
    }
  }
  
  /**
   * 获取当前所有活跃的事件监听器统计
   * @returns {Object} 事件监听器统计信息
   */
  getListenerStats() {
    const stats = {}
    const events = this.eventNames()
    
    events.forEach(eventName => {
      stats[eventName] = this.listenerCount(eventName)
    })
    
    return {
      totalEvents: events.length,
      totalListeners: Object.values(stats).reduce((sum, count) => sum + count, 0),
      eventDetails: stats
    }
  }
  
  /**
   * 清理所有事件监听器
   * 用于组件销毁时避免内存泄漏
   */
  cleanup() {
    this.removeAllListeners()
  }
} 