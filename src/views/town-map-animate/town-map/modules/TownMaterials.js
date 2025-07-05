/**
 * 村镇材质与着色器管理模块
 * 
 * 负责村镇材质和着色器的管理
 * 包括材质的创建、更新和清理
 * 支持自定义材质类型、参数等
 */
export class TownMaterials {
  /**
   * 构造函数
   * @param {TownSharedState} state - 村镇共享状态实例
   * @param {TownModuleEventBus} eventBus - 村镇模块事件总线实例
   */
  constructor(state, eventBus) {
    this.state = state
    this.eventBus = eventBus
  }

  /**
   * 创建材质
   * @param {Object} options - 材质配置参数
   */
  createMaterial(options) {
    // 创建材质
    const material = new MeshStandardMaterial(options)
    return material
  }

  /**
   * 更新材质
   * @param {Object} options - 材质配置参数
   */
  updateMaterial(options) {
    // 更新材质
    const material = this.state.materials.top
    material.color.set(options.color)
    material.opacity = options.opacity
    material.transparent = options.transparent
    material.side = options.side
    material.depthTest = options.depthTest
    material.depthWrite = options.depthWrite
    return material
  }

  /**
   * 清理材质
   */
  clearMaterial() {
    // 清理材质
    const material = this.state.materials.top
    material.dispose()  // 释放材质
    this.state.materials.top = null
    this.state.materials.side = null
    this.state.materials.line = null
  }
}
