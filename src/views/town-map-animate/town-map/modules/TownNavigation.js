export class TownNavigation {
  constructor(state, eventBus) {
    this.state = state
    this.eventBus = eventBus
  }
  goBack() {
    // 获取上一级地图
    const previousMap = this.state.previousMap
    // 切换到上一级地图
    this.state.currentMap = previousMap
    // 更新地图
    this.state.updateMap(previousMap || this.state.currentMap)
    // 返回上一级地图
  }
  goForward() {
    // 获取当前地图
    const currentMap = this.state.currentMap
    // 获取下一级地图
    const nextMap = currentMap.nextMap
    if (!nextMap) {
      console.error('没有下一级地图')
      return
    }
    // 获取下一级地图的子地图
    const childMap = nextMap.childMap
    if (!childMap) {
      console.error('没有子地图')
      return
    }
    // 切换到下一级地图
    this.state.currentMap = childMap
    // 更新地图   
    this.state.updateMap(childMap || this.state.currentMap)
  }
  goTo(map) {
        // 切换到指定地图
    this.state.currentMap = map
    // 更新地图
    this.state.updateMap(map || this.state.currentMap || this.state.previousMap || this.state.nextMap || this.state.childMap  )
  }
}
