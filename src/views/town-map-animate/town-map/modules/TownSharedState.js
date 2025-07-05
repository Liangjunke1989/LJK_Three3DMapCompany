//共享状态，存放场景、相机、资源等全局对象
export class TownSharedState {
    constructor() {
      this.scene = null
      this.camera = null
      this.renderer = null
      this.assets = null
      this.townGroup = null
      this.depth = 1.8
      // ...其它全局状态
      this.texture = null
      this.geoJSON = null
      this.entranceAnimation = null
      this.exitAnimation = null
      this.hoverAnimation = null
      this.materials = null
      this.materials.top = null
      this.materials.side = null
      this.materials.line = null
      this.materials.hover = null
      this.materials.hover.top = null
      this.materials.hover.side = null
      this.materials.hover.line = null
      this.materials.hover.hover = null
    }
    init(mini3dInstance, config) {
      // 绑定场景、相机、渲染器等
      this.scene = mini3dInstance.scene
      this.camera = mini3dInstance.camera
      this.renderer = mini3dInstance.renderer
      this.assets = mini3dInstance.assets
      this.townGroup = mini3dInstance.townGroup
      this.depth = 1.8
      // ...其它初始化
      this.texture = null
      this.geoJSON = null
      this.entranceAnimation = null
      this.exitAnimation = null
      this.hoverAnimation = null
      this.materials = null
      this.materials.top = null
      this.materials.side = null
      this.materials.line = null
      this.materials.hover = null
      this.materials.hover.top = null
      this.materials.hover.side = null
      this.materials.hover.line = null
      this.materials.hover.hover = null
    }
  }