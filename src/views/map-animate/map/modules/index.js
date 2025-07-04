/**
 * 地图模块统一导出文件
 * 
 * 这里统一导出所有地图相关的模块，提供清晰的模块化架构。
 * 每个模块负责特定的功能领域，通过依赖注入实现解耦。
 * 
 * 模块架构：
 * - SharedState: 共享状态管理，所有模块共享的数据中心
 * - ModuleEventBus: 事件总线，模块间通信的桥梁
 * - MapCore: 核心渲染模块，负责地图几何体和材质
 * - MapInteraction: 交互系统模块，处理用户交互事件
 * - MapNavigation: 导航系统模块，管理多层级地图切换
 * - MapVisualization: 数据可视化模块，创建各种图表组件
 * - MapMaterials: 材质系统模块，管理着色器和特效
 * - MapAnimations: 动画系统模块，处理各种动画效果
 * - MapResource: 资源管理模块，处理纹理和模型加载
 * 
 * @author LJK
 * @version 1.0.0
 */

// ============ 基础架构模块 ============
export { SharedState } from './SharedState.js'
export { ModuleEventBus } from './ModuleEventBus.js'

// ============ 核心功能模块 ============
export { MapCore } from './MapCore.js'
export { MapInteraction } from './MapInteraction.js'
export { MapNavigation } from './MapNavigation.js'

// 内部导入，用于模块管理器
import { SharedState } from './SharedState.js'
import { ModuleEventBus } from './ModuleEventBus.js'
import { MapCore } from './MapCore.js'
import { MapInteraction } from './MapInteraction.js'
import { MapNavigation } from './MapNavigation.js'
import { MapMaterials } from './MapMaterials.js'
import { MapAnimations } from './MapAnimations.js'
import { MapResource } from './MapResource.js'
import { MapVisualization } from './MapVisualization.js'

// ============ 功能扩展模块 ============
export { MapMaterials } from './MapMaterials.js'
export { MapAnimations } from './MapAnimations.js'
export { MapResource } from './MapResource.js'
export { MapVisualization } from './MapVisualization.js'

/**
 * 模块管理器类
 * 
 * 负责协调和管理所有地图模块的生命周期，
 * 提供统一的初始化、更新和销毁接口。
 */
export class MapModuleManager {
  /**
   * 构造函数
   * @param {Object} mini3dInstance - Mini3d实例
   * @param {Object} config - 配置参数
   */
  constructor(mini3dInstance, config = {}) {
    // ============ 初始化基础架构 ============
    this.state = new SharedState()
    this.eventBus = new ModuleEventBus()
    
    // 初始化共享状态
    this.state.init(mini3dInstance, config)
    
    // ============ 初始化功能模块 ============
    this.modules = {
      core: new MapCore(this.state, this.eventBus),
      interaction: new MapInteraction(this.state, this.eventBus),
      navigation: new MapNavigation(this.state, this.eventBus),
      materials: new MapMaterials(this.state, this.eventBus),
      animations: new MapAnimations(this.state, this.eventBus),
      resource: new MapResource(this.state, this.eventBus),
      visualization: new MapVisualization(this.state, this.eventBus),
    }
    
    // ============ 绑定方法到实例 ============
    // 将模块方法暴露到管理器实例上，方便外部调用
    this.createModel = this.modules.core.createModel.bind(this.modules.core)
    this.createProvince = this.modules.core.createProvince.bind(this.modules.core)
    this.addEvent = this.modules.interaction.addEvent.bind(this.modules.interaction)
    this.goBack = this.modules.navigation.goBack.bind(this.modules.navigation)
    
    // 材质系统方法绑定 - 只绑定存在的方法
    this.createHUIGUANG = this.modules.materials.createHUIGUANG?.bind(this.modules.materials)
    this.createQuan = this.modules.materials.createQuan?.bind(this.modules.materials)
    
    // 安全的方法绑定 - 使用可选链操作符防止 undefined 错误
    // 动画系统方法绑定
    this.createPathAnimate = this.modules.animations.createPathAnimate?.bind(this.modules.animations)
    this.createStorke = this.modules.animations.createStorke?.bind(this.modules.animations)
    this.createFlyLineFocus = this.modules.animations.createFlyLineFocus?.bind(this.modules.animations)
    this.playEntranceAnimation = this.modules.animations.playEntranceAnimation?.bind(this.modules.animations)
    
    // 资源管理系统方法绑定
    this.getResource = this.modules.resource.getResource?.bind(this.modules.resource)
    this.preloadResources = this.modules.resource.preloadResources?.bind(this.modules.resource)
    this.createProceduralTexture = this.modules.resource.createProceduralTexture?.bind(this.modules.resource)
    this.optimizeTexture = this.modules.resource.optimizeTexture?.bind(this.modules.resource)
    this.cleanExpiredCache = this.modules.resource.cleanExpiredCache?.bind(this.modules.resource)
    
    // 数据可视化系统方法绑定
    this.createBar = this.modules.visualization.createBar?.bind(this.modules.visualization)
    this.createScatter = this.modules.visualization.createScatter?.bind(this.modules.visualization)
    this.createFlyLine = this.modules.visualization.createFlyLine?.bind(this.modules.visualization)
    this.createBadgeLabel = this.modules.visualization.createBadgeLabel?.bind(this.modules.visualization)
    this.setLabelVisible = this.modules.visualization.setLabelVisible?.bind(this.modules.visualization)
    
    console.log('[MapModuleManager] 模块管理器初始化完成')
  }
  
  /**
   * 获取共享状态
   * @returns {SharedState} 共享状态实例
   */
  getState() {
    return this.state
  }
  
  /**
   * 获取事件总线
   * @returns {ModuleEventBus} 事件总线实例
   */
  getEventBus() {
    return this.eventBus
  }
  
  /**
   * 获取指定模块
   * @param {string} moduleName - 模块名称
   * @returns {Object} 模块实例
   */
  getModule(moduleName) {
    return this.modules[moduleName]
  }
  
  /**
   * 获取当前状态快照
   * @returns {Object} 状态快照
   */
  getSnapshot() {
    return {
      state: this.state.getSnapshot(),
      eventBusStats: this.eventBus.getListenerStats(),
      modules: Object.keys(this.modules),
      timestamp: Date.now()
    }
  }
  
  /**
   * 更新所有模块
   * @param {number} deltaTime - 帧间隔时间
   */
  update(deltaTime) {
    // 更新各个模块
    Object.values(this.modules).forEach(module => {
      if (module.update && typeof module.update === 'function') {
        module.update(deltaTime)
      }
    })
  }
  
  /**
   * 销毁所有模块
   */
  destroy() {
    console.log('[MapModuleManager] 开始销毁所有模块')
    
    // 按照依赖关系逆序销毁模块
    const destroyOrder = ['navigation', 'interaction', 'visualization', 'animations', 'materials', 'resource', 'core']
    
    destroyOrder.forEach(moduleName => {
      const module = this.modules[moduleName]
      if (module && module.destroy && typeof module.destroy === 'function') {
        try {
          module.destroy()
          console.log(`[MapModuleManager] ${moduleName} 模块已销毁`)
        } catch (error) {
          console.error(`[MapModuleManager] 销毁 ${moduleName} 模块时出错:`, error)
        }
      }
    })
    
    // 清理事件总线
    this.eventBus.cleanup()
    
    // 重置共享状态
    this.state.reset()
    
    // 清空模块引用
    this.modules = {}
    
    console.log('[MapModuleManager] 所有模块已销毁')
  }
}
