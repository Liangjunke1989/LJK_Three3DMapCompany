import { TextureLoader } from 'three'

/**
 * 村镇资源管理模块
 * 
 * 负责村镇资源的加载、管理
 * 包括贴图、GeoJSON等
 */
export class TownResource {
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
   * 加载资源
   */
  async loadAssets() {
    // 加载贴图、GeoJSON等
    const texture = await this.loadTexture('textures/town.png')
    // 加载GeoJSON
    const geoJSON = await this.loadGeoJSON('data/town.geojson')
  }

  /**
   * 加载贴图
   */
  async loadTexture(url) {
    // 加载贴图
    const texture = await new TextureLoader().load(url)
    // 设置贴图
    this.state.texture = texture
    return texture
  }

  /**
   * 加载GeoJSON
   */
  async loadGeoJSON(url) {
    // 加载GeoJSON
    const geoJSON = await new GeoJSONLoader().load(url)
    // 设置GeoJSON
    this.state.geoJSON = geoJSON
    return geoJSON
  }

  /**
   * 清理资源
   */
  clearAssets() {
    // 清理资源
    this.state.texture = null
    this.state.geoJSON = null
  }

  /**
   * 获取资源
   */
  getAsset(name) {
    // 获取资源
    if (name === 'texture') {
      return this.state.texture 
    } else if (name === 'geoJSON') {
      return this.state.geoJSON
    } else {
      console.error('资源不存在')
      return null
    }
  }

  
}
