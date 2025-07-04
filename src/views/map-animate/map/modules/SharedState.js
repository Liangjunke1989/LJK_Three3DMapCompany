/**
 * 共享状态管理类
 * 
 * 负责管理所有模块间共享的状态数据，包括：
 * - 地图数据和配置信息
 * - 当前场景状态
 * - 交互状态和选中项
 * - 组件引用和材质对象
 * 
 * 采用单例模式，确保所有模块访问同一份状态数据
 * 
 * @author LJK
 * @version 1.0.0
 */
export class SharedState {
  constructor() {
    // ============ 地图基础配置 ============
    this.geoProjectionCenter = [108.55, 34.32]  // 地理投影中心坐标
    this.flyLineCenter = [116.41995, 40.18994]  // 飞线中心坐标（北京）
    this.depth = 5                              // 地图挤出深度
    this.pointCenter = [108.55, 34.32]          // 地图中心点坐标
    
    // ============ 场景状态管理 ============
    this.currentScene = "mainScene"  // 当前场景：mainScene | childScene
    this.clicked = false             // 点击状态锁，防止重复点击
    
    // ============ 地图数据状态 ============
    this.mapData = null              // 当前地图的GeoJSON数据
    this.currentLevel = 'china'      // 当前地图层级：china | province | city
    this.selectedProvince = null     // 当前选中的省份信息
    this.selectedAdcode = null       // 当前选中的行政区划代码
    
    // ============ 组件对象引用 ============
    this.sceneGroup = null           // 根场景组
    this.mainSceneGroup = null       // 主场景组
    this.childSceneGroup = null      // 子场景组
    this.labelGroup = null           // 标签组
    this.gqGroup = null              // 光圈组
    this.provinceNameGroup = null    // 省份名称组
    this.badgeGroup = null           // 标牌组
    
    // ============ 地图核心对象 ============
    this.provinceMesh = null         // 省份网格对象
    this.focusMapGroup = null        // 聚焦地图组
    this.focusMapSideMaterial = null // 地图侧面材质
    this.provinceLineMaterial = null // 省份轮廓线材质
    
    // ============ 可视化组件数组 ============
    this.allBar = []                 // 所有柱状图对象
    this.allBarMaterial = []         // 所有柱状图材质
    this.allProvinceLabel = []       // 所有省份数据标签
    this.allProvinceNameLabel = []   // 所有省份名称标签
    this.allGuangquan = []           // 所有光圈效果
    this.allScatter = []             // 所有散点图对象
    this.allFlyLine = []             // 所有飞线对象
    this.allBadgeLabel = []          // 所有标牌标签
    
    // ============ 特效组件 ============
    this.quan = null                 // 背景光圈
    this.rotateBorder1 = null        // 旋转边框1
    this.rotateBorder2 = null        // 旋转边框2
    this.particles = null            // 粒子系统
    this.mirror = null               // 镜面反射
    this.gridRipple = null           // 网格波纹
    
    // ============ 外部组件引用 ============
    this.toastLoading = null         // 加载提示组件
    this.label3d = null              // 3D标签管理器
    this.history = null              // 历史记录管理器
    this.assets = null               // 资源管理器
    this.childMap = null             // 子地图实例
    this.interactionManager = null   // 交互管理器
    
    // ============ DOM元素引用 ============
    this.returnBtn = null            // 返回按钮DOM元素
    this.canvas = null               // 画布元素
    
    // ============ 配置回调函数 ============
    this.setEnable = null            // UI状态控制回调
    
    // ============ Three.js核心对象引用 ============
    this.scene = null                // Three.js场景对象
    this.camera = null               // 相机对象
    this.renderer = null             // 渲染器对象
    this.debug = null                // 调试工具
  }
  
  /**
   * 初始化共享状态
   * @param {Object} mini3dInstance - Mini3d实例，包含scene、camera、renderer等
   * @param {Object} config - 配置参数
   */
  init(mini3dInstance, config = {}) {
    // 注入Mini3d核心对象
    this.scene = mini3dInstance.scene
    this.camera = mini3dInstance.camera
    this.renderer = mini3dInstance.renderer
    this.debug = mini3dInstance.debug
    this.canvas = mini3dInstance.canvas
    
    // 注入Mini3d的其他组件
    this.assets = mini3dInstance.assets || mini3dInstance.resource
    this.time = mini3dInstance.time
    this.sizes = mini3dInstance.sizes
    this.geoProjection = mini3dInstance.geoProjection
    
    // 安全检查：确保必要的组件都已注入
    if (!this.assets) {
      console.warn('[SharedState] 警告: assets 未找到，创建占位符')
      this.assets = {
        instance: {
          getResource: (name) => {
            console.warn(`[SharedState] 尝试获取资源 "${name}" 但 assets 未初始化`)
            return null
          }
        }
      }
    }
    
    // 应用配置参数
    if (config.geoProjectionCenter) {
      this.geoProjectionCenter = config.geoProjectionCenter
      this.pointCenter = config.geoProjectionCenter
    }
    
    if (config.setEnable) {
      this.setEnable = config.setEnable
    }
    
    console.log('[SharedState] 初始化完成')
    console.log('- assets:', this.assets ? '✓' : '✗')
    console.log('- time:', this.time ? '✓' : '✗')
    console.log('- sizes:', this.sizes ? '✓' : '✗')
    console.log('- scene:', this.scene ? '✓' : '✗')
  }
  
  /**
   * 重置状态到初始值
   * 用于场景切换或重新初始化时清理状态
   */
  reset() {
    this.currentScene = "mainScene"
    this.clicked = false
    this.selectedProvince = null
    this.selectedAdcode = null
    this.mapData = null
    
    // 清空组件数组
    this.allBar.length = 0
    this.allBarMaterial.length = 0
    this.allProvinceLabel.length = 0
    this.allProvinceNameLabel.length = 0
    this.allGuangquan.length = 0
    this.allScatter.length = 0
    this.allFlyLine.length = 0
    this.allBadgeLabel.length = 0
  }
  
  /**
   * 获取当前状态的快照
   * 用于调试或状态检查
   */
  getSnapshot() {
    return {
      currentScene: this.currentScene,
      currentLevel: this.currentLevel,
      selectedProvince: this.selectedProvince,
      selectedAdcode: this.selectedAdcode,
      componentCounts: {
        bars: this.allBar.length,
        labels: this.allProvinceLabel.length,
        scatter: this.allScatter.length,
        flyLines: this.allFlyLine.length
      }
    }
  }
} 