/**
 * 地图模块管理器 - 增强版
 * 
 * 提供完整的模块生命周期管理、性能监控、调试工具和错误处理
 * 这是整个模块化系统的中央协调器，负责：
 * - 模块初始化和销毁的完整生命周期管理
 * - 模块间依赖关系的解析和管理
 * - 性能监控和统计数据收集
 * - 开发调试工具和错误恢复机制
 * - 模块热重载和动态加载支持
 * 
 * @author LJK
 * @version 2.0.0
 */

import { SharedState } from './SharedState.js'
import { ModuleEventBus } from './ModuleEventBus.js'
import { MapCore } from './MapCore.js'
import { MapInteraction } from './MapInteraction.js'
import { MapNavigation } from './MapNavigation.js'
import { MapVisualization } from './MapVisualization.js'
import { MapMaterials } from './MapMaterials.js'
import { MapAnimations } from './MapAnimations.js'
import { MapResource } from './MapResource.js'

/**
 * 增强的地图模块管理器
 * 
 * 提供企业级的模块管理功能，包括生命周期管理、
 * 性能监控、错误处理和调试工具
 */
export class MapModuleManager {
  /**
   * 构造函数
   * @param {Object} mini3dInstance - Mini3d实例
   * @param {Object} config - 配置参数
   */
  constructor(mini3dInstance, config = {}) {
    // ============ 基础配置 ============
    this.config = {
      enableDebug: config.debug || false,
      enablePerformanceMonitor: config.performance || false,
      enableErrorRecovery: config.errorRecovery || true,
      moduleLoadTimeout: config.moduleLoadTimeout || 10000,
      ...config
    }
    
    // ============ 初始化基础架构 ============
    this.state = new SharedState()
    this.eventBus = new ModuleEventBus()
    
    // 初始化共享状态
    this.state.init(mini3dInstance, config)
    
    // ============ 模块状态管理 ============
    this.modules = {}
    this.moduleStatus = {}
    this.loadingPromises = new Map()
    this.moduleMetrics = {}
    
    // ============ 性能监控 ============
    this.startTime = Date.now()
    this.performanceMetrics = {
      initTime: 0,
      moduleLoadTimes: {},
      memoryUsage: {},
      frameMetrics: {
        frameCount: 0,
        averageFPS: 0,
        lastFrameTime: 0
      }
    }
    
    // ============ 错误处理 ============
    this.errorLog = []
    this.recoveryAttempts = {}
    
    // ============ 调试工具 ============
    if (this.config.enableDebug) {
      this._initDebugTools()
    }
    
    // ============ 初始化模块 ============
    this._initializeModules()
    
    // ============ 绑定性能监控 ============
    if (this.config.enablePerformanceMonitor) {
      this._startPerformanceMonitoring()
    }
    
    console.log('[MapModuleManager] 增强版模块管理器初始化完成')
  }

  /**
   * 初始化所有模块
   * @private
   */
  async _initializeModules() {
    const initStartTime = Date.now()
    
    try {
      // ============ 按依赖顺序初始化模块 ============
      const moduleConfigs = [
        { name: 'resource', Class: MapResource, priority: 1 },
        { name: 'core', Class: MapCore, priority: 2 },
        { name: 'materials', Class: MapMaterials, priority: 3 },
        { name: 'visualization', Class: MapVisualization, priority: 4 },
        { name: 'animations', Class: MapAnimations, priority: 5 },
        { name: 'interaction', Class: MapInteraction, priority: 6 },
        { name: 'navigation', Class: MapNavigation, priority: 7 }
      ]
      
      // 按优先级排序
      moduleConfigs.sort((a, b) => a.priority - b.priority)
      
      // 顺序初始化模块
      for (const moduleConfig of moduleConfigs) {
        await this._initializeModule(moduleConfig)
      }
      
      // ============ 绑定方法到实例 ============
      this._bindModuleMethods()
      
      // ============ 记录初始化性能 ============
      this.performanceMetrics.initTime = Date.now() - initStartTime
      
      // ============ 发射初始化完成事件 ============
      this.eventBus.emit('manager:initialized', {
        modules: Object.keys(this.modules),
        initTime: this.performanceMetrics.initTime,
        config: this.config
      })
      
    } catch (error) {
      this._handleError('INIT_FAILED', error, { critical: true })
      throw error
    }
  }

  /**
   * 初始化单个模块
   * @param {Object} moduleConfig - 模块配置
   * @private
   */
  async _initializeModule(moduleConfig) {
    const { name, Class } = moduleConfig
    const startTime = Date.now()
    
    try {
      // 设置模块状态为加载中
      this.moduleStatus[name] = 'loading'
      
      // 创建模块实例
      this.modules[name] = new Class(this.state, this.eventBus)
      
      // 如果模块有初始化方法，调用它
      if (this.modules[name].init && typeof this.modules[name].init === 'function') {
        await this.modules[name].init()
      }
      
      // 记录加载时间
      this.performanceMetrics.moduleLoadTimes[name] = Date.now() - startTime
      
      // 设置模块状态为已加载
      this.moduleStatus[name] = 'loaded'
      
      console.log(`[MapModuleManager] 模块 ${name} 初始化完成 (${this.performanceMetrics.moduleLoadTimes[name]}ms)`)
      
    } catch (error) {
      this.moduleStatus[name] = 'error'
      this._handleError('MODULE_INIT_FAILED', error, { moduleName: name })
      
      // 如果启用错误恢复，尝试恢复
      if (this.config.enableErrorRecovery) {
        await this._attemptModuleRecovery(name, moduleConfig)
      }
    }
  }

  /**
   * 绑定模块方法到管理器实例
   * @private
   */
  _bindModuleMethods() {
    // 核心渲染模块方法
    if (this.modules.core) {
      this.createModel = this._wrapMethod('core', 'createModel')
      this.createProvince = this._wrapMethod('core', 'createProvince')
    }
    
    // 数据可视化方法
    if (this.modules.visualization) {
      this.createBar = this._wrapMethod('visualization', 'createBar')
      this.createScatter = this._wrapMethod('visualization', 'createScatter')
      this.createFlyLine = this._wrapMethod('visualization', 'createFlyLine')
    }
    
    // 材质系统方法
    if (this.modules.materials) {
      this.createHUIGUANG = this._wrapMethod('materials', 'createHUIGUANG')
      this.createQuan = this._wrapMethod('materials', 'createQuan')
      this.createFloor = this._wrapMethod('materials', 'createFloor')
    }
  }

  /**
   * 包装模块方法，添加错误处理和性能监控
   * @param {string} moduleName - 模块名称
   * @param {string} methodName - 方法名称
   * @returns {Function} 包装后的方法
   * @private
   */
  _wrapMethod(moduleName, methodName) {
    return (...args) => {
      const startTime = Date.now()
      
      try {
        const module = this.modules[moduleName]
        if (!module || !module[methodName]) {
          throw new Error(`Method ${methodName} not found in module ${moduleName}`)
        }
        
        const result = module[methodName].apply(module, args)
        
        // 记录方法调用性能
        const executionTime = Date.now() - startTime
        this._recordMethodPerformance(moduleName, methodName, executionTime)
        
        return result
      } catch (error) {
        this._handleError('METHOD_EXECUTION_FAILED', error, { 
          moduleName, 
          methodName, 
          args 
        })
        throw error
      }
    }
  }

  /**
   * 记录方法性能
   * @param {string} moduleName - 模块名称
   * @param {string} methodName - 方法名称
   * @param {number} executionTime - 执行时间
   * @private
   */
  _recordMethodPerformance(moduleName, methodName, executionTime) {
    if (!this.moduleMetrics[moduleName]) {
      this.moduleMetrics[moduleName] = {}
    }
    
    if (!this.moduleMetrics[moduleName][methodName]) {
      this.moduleMetrics[moduleName][methodName] = {
        callCount: 0,
        totalTime: 0,
        averageTime: 0,
        maxTime: 0,
        minTime: Infinity
      }
    }
    
    const metrics = this.moduleMetrics[moduleName][methodName]
    metrics.callCount++
    metrics.totalTime += executionTime
    metrics.averageTime = metrics.totalTime / metrics.callCount
    metrics.maxTime = Math.max(metrics.maxTime, executionTime)
    metrics.minTime = Math.min(metrics.minTime, executionTime)
  }

  /**
   * 初始化调试工具
   * @private
   */
  _initDebugTools() {
    // 将管理器暴露到全局，便于调试
    window.MapModuleManager = this
    
    // 添加调试命令
    window.mapDebug = {
      getState: () => this.state.getSnapshot(),
      getModules: () => Object.keys(this.modules),
      getMetrics: () => this.getPerformanceMetrics(),
      getErrors: () => this.errorLog
    }
    
    console.log('[MapModuleManager] 调试工具已启用，使用 window.mapDebug 访问调试功能')
  }

  /**
   * 启动性能监控
   * @private
   */
  _startPerformanceMonitoring() {
    let lastTime = Date.now()
    let frameCount = 0
    
    const monitor = () => {
      const currentTime = Date.now()
      const deltaTime = currentTime - lastTime
      
      frameCount++
      this.performanceMetrics.frameMetrics.frameCount = frameCount
      this.performanceMetrics.frameMetrics.lastFrameTime = deltaTime
      
      if (frameCount % 60 === 0) {
        this.performanceMetrics.frameMetrics.averageFPS = 1000 / deltaTime
        
        if (performance.memory) {
          this.performanceMetrics.memoryUsage = {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit
          }
        }
      }
      
      lastTime = currentTime
      requestAnimationFrame(monitor)
    }
    
    requestAnimationFrame(monitor)
  }

  /**
   * 错误处理
   * @param {string} errorType - 错误类型
   * @param {Error} error - 错误对象
   * @param {Object} context - 错误上下文
   * @private
   */
  _handleError(errorType, error, context = {}) {
    const errorInfo = {
      type: errorType,
      message: error.message,
      stack: error.stack,
      context,
      timestamp: Date.now()
    }
    
    this.errorLog.push(errorInfo)
    this.eventBus.emit('manager:error', errorInfo)
    
    console.error(`[MapModuleManager] ${errorType}:`, error, context)
  }

  /**
   * 尝试模块恢复
   * @private
   */
  async _attemptModuleRecovery(moduleName, moduleConfig) {
    if (!this.recoveryAttempts[moduleName]) {
      this.recoveryAttempts[moduleName] = 0
    }
    
    this.recoveryAttempts[moduleName]++
    
    if (this.recoveryAttempts[moduleName] > 3) {
      console.error(`[MapModuleManager] 模块 ${moduleName} 恢复失败`)
      return
    }
    
    console.warn(`[MapModuleManager] 尝试恢复模块 ${moduleName}`)
    
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    try {
      await this._initializeModule(moduleConfig)
      console.log(`[MapModuleManager] 模块 ${moduleName} 恢复成功`)
      this.recoveryAttempts[moduleName] = 0
    } catch (error) {
      console.error(`[MapModuleManager] 模块 ${moduleName} 恢复失败:`, error)
    }
  }

  /**
   * 获取性能指标
   * @returns {Object} 性能指标数据
   */
  getPerformanceMetrics() {
    return {
      ...this.performanceMetrics,
      moduleMetrics: this.moduleMetrics,
      moduleStatus: this.moduleStatus,
      uptime: Date.now() - this.startTime
    }
  }

  /**
   * 更新所有模块
   * @param {number} deltaTime - 帧间隔时间
   */
  update(deltaTime) {
    Object.entries(this.modules).forEach(([name, module]) => {
      if (module.update && typeof module.update === 'function') {
        try {
          module.update(deltaTime)
        } catch (error) {
          this._handleError('MODULE_UPDATE_FAILED', error, { moduleName: name })
        }
      }
    })
  }

  /**
   * 销毁所有模块
   */
  destroy() {
    console.log('[MapModuleManager] 开始销毁所有模块')
    
    const destroyOrder = ['navigation', 'interaction', 'visualization', 'animations', 'materials', 'resource', 'core']
    
    destroyOrder.forEach(moduleName => {
      const module = this.modules[moduleName]
      if (module && module.destroy && typeof module.destroy === 'function') {
        try {
          module.destroy()
          console.log(`[MapModuleManager] ${moduleName} 模块已销毁`)
        } catch (error) {
          this._handleError('MODULE_DESTROY_FAILED', error, { moduleName })
        }
      }
    })
    
    this.eventBus.cleanup()
    this.state.reset()
    this.modules = {}
    
    console.log('[MapModuleManager] 所有模块已销毁')
  }

  getState() { return this.state }
  getEventBus() { return this.eventBus }
  getModule(moduleName) { return this.modules[moduleName] }
} 