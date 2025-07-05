/**
 * 资源管理类
 * 负责加载和管理3D地图需要的所有资源
 * 包括纹理贴图、JSON数据文件等
 */
import { TextureLoader } from "three"
import { GeoJSONLoader } from "three"
import { TownSharedState } from "./town-shared-state"
import { TownModuleEventBus } from "./town-module-event-bus"
import { TownMap } from "./town-map/TestOriginCode/test_town-map-renderer"
import { TownChildMap } from "./town-child"
import { TownLabelManager } from "./town-label-manager"
import { TownLabel } from "./town-label"
import { TownLabelRenderer } from "./town-label-renderer"
import { TownCore } from "./town-core"
import { TownMapRenderer } from "./town-map-renderer"
import { TownInteraction } from "./town-interaction"
import { TownNavigation } from "./town-navigation"
import { TownVisualization } from "./town-visualization"
import { TownMaterials } from "./town-materials"
import { TownAnimations } from "./town-animations"
import { TownResource } from "./town-resource"
import { TownMapModuleManager } from "./town-map-module-manager"


export class TownAssets {
  constructor(state, eventBus) {
    this.state = state
    this.eventBus = eventBus
    this.assets = {}    
  }
  loadAssets() {
    // 加载资源
    this.assets = {
      texture: null,
      geoJSON: null
    }
  }
}