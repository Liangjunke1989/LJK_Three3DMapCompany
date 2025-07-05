/**
 * 村镇交互事件管理模块
 * 
 * 负责村镇交互事件的注册、处理和清理
 * 支持自定义交互事件类型、触发等
 */
export class TownInteraction {
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
   * 添加交互事件
   */
  addEvent() {
    // 绑定交互事件到 townMeshes
    this.state.townMeshes.forEach(mesh => {
      mesh.on('click', () => {
        console.log('点击了村镇')
      })
    })
  }

  /**
   * 清理交互事件
   */
  clearEvent() {
    // 清理点击事件
    this.state.townMeshes.forEach(mesh => {
      mesh.off('click')
    })
    // 清理悬停事件
    this.state.townMeshes.forEach(mesh => {
      mesh.off('hover')
    })
  }

  /**
   * 添加悬停事件
   */
  hoverEvent() {
    // 添加悬停事件到 townMeshes
    this.state.townMeshes.forEach(mesh => {
      mesh.on('hover', () => {
        console.log('悬停了村镇')
      })
    })
    // 清理悬停事件
    this.state.townMeshes.forEach(mesh => {
      mesh.off('hover')
    })
  }
}
