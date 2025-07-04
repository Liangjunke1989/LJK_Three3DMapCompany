/**
 * 地图材质系统模块
 */
export class MapMaterials {
  constructor(state, eventBus) {
    this.state = state
    this.eventBus = eventBus
  }

  destroy() {
    console.log('[MapMaterials] 系统已销毁')
  }
} 