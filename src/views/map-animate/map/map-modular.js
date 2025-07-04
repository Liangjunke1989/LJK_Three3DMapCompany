/**
 * 模块化地图系统 - 使用示例
 * 
 * 这个文件展示了如何使用新的模块化架构来重构原有的map.js文件。
 * 通过依赖注入和事件驱动的方式，实现了高度解耦的模块化设计。
 * 
 * 主要改进：
 * - 代码组织：从2000+行的巨型文件拆分为多个专职模块
 * - 可维护性：每个模块职责单一，便于理解和修改
 * - 可测试性：模块独立，易于单元测试
 * - 可扩展性：新功能可以作为独立模块添加
 * - 团队协作：不同开发者可以并行开发不同模块
 * 
 * @author LJK
 * @version 2.0.0
 */

import {
  Fog,
  Group,
  Color,
  Vector3,
  AmbientLight,
  DirectionalLight,
} from "three"

import {
  Mini3d,
  Debug,
  Particles,
  FlyLine,
  PathLine,
  Label3d,
  ToastLoading,
  Plane,
  createHistory,
} from "@/mini3d"

import { Assets } from "./assets"
import { InteractionManager } from "three.interactive"
import gsap from "gsap"

// ============ 导入模块化组件 ============
import { 
  MapModuleManager,
  SharedState,
  ModuleEventBus 
} from "./modules"

/**
 * 模块化的3D地图世界类
 * 
 * 重构后的地图类，采用模块化架构设计，
 * 将原本的巨型类拆分为多个专业模块。
 * 
 * 架构优势：
 * - 职责分离：每个模块专注于特定功能领域
 * - 松耦合：模块间通过事件总线通信
 * - 高内聚：模块内部功能紧密相关
 * - 易扩展：新功能作为新模块添加
 * - 易测试：模块可独立测试
 * 
 * @extends Mini3d
 */
export class ModularWorld extends Mini3d {
  /**
   * 构造函数 - 初始化模块化3D地图世界
   * 
   * 相比原始的构造函数，这里的重点是：
   * 1. 初始化模块管理器，将复杂逻辑委托给专业模块
   * 2. 配置基础的场景环境（雾效、灯光等）
   * 3. 建立事件监听，响应模块间的通信
   * 4. 启动资源加载和场景构建流程
   * 
   * @param {HTMLCanvasElement} canvas - WebGL渲染的画布元素
   * @param {Object} config - 配置参数对象
   */
  constructor(canvas, config) {
    // 调用父类构造函数，初始化基础3D引擎
    super(canvas, config)

    // ============ 基础场景配置 ============
    this.setupSceneEnvironment()
    
    // ============ 初始化模块管理器 ============
    this.moduleManager = new MapModuleManager(this, config)
    
    // ============ 获取模块引用 ============
    this.state = this.moduleManager.getState()
    this.eventBus = this.moduleManager.getEventBus()
    
    // ============ 设置事件监听 ============
    this.setupEventListeners()
    
    // ============ 初始化UI组件 ============
    this.initializeUIComponents()
    
    // ============ 初始化历史记录系统 ============
    this.initializeHistorySystem()
    
    // ============ 启动资源加载 ============
    this.startResourceLoading()
  }

  /**
   * 设置场景环境
   * 配置雾效、背景色、相机等基础场景参数
   */
  setupSceneEnvironment() {
    // 设置场景雾效果，创建远景虚化效果
    this.scene.fog = new Fog(0x011024, 1, 500)
    
    // 设置场景背景色为深蓝色，营造科技感
    this.scene.background = new Color(0x011024)
    
    // 配置相机初始位置
    this.camera.instance.position.set(
      0.00002366776247217723,
      225.1025284992283,
      0.0002238648924037432
    )
    this.camera.instance.near = 1
    this.camera.instance.far = 10000
    this.camera.instance.updateProjectionMatrix()
    
    // 初始化交互管理器
    this.state.interactionManager = new InteractionManager(
      this.renderer.instance,
      this.camera.instance,
      this.canvas
    )
    
    // 初始化基础设置和环境光照
    this.initSetting()
    this.initEnvironment()
  }

  /**
   * 设置事件监听器
   * 监听模块间的关键事件，协调整体功能
   */
  setupEventListeners() {
    // ============ 监听地图核心事件 ============
    this.eventBus.on('map:modelCreated', (data) => {
      console.log('[ModularWorld] 地图模型创建完成')
      // 可以在这里添加后续处理逻辑
    })

    this.eventBus.on('map:provinceCreated', (data) => {
      console.log('[ModularWorld] 省份创建完成，开始添加交互事件')
      // 省份创建完成后，添加交互事件
      this.moduleManager.getModule('interaction').addEvent()
    })

    // ============ 监听交互事件 ============
    this.eventBus.on('map:hover', (data) => {
      // 处理悬停事件，可以添加自定义逻辑
      console.log('[ModularWorld] 省份悬停:', data.province.name)
    })

    this.eventBus.on('map:click', (data) => {
      // 处理点击事件
      console.log('[ModularWorld] 省份点击:', data.province.name)
    })

    // ============ 监听导航事件 ============
    this.eventBus.on('navigation:loadComplete', (data) => {
      console.log('[ModularWorld] 子地图加载完成:', data.userData.name)
    })

    this.eventBus.on('navigation:loadError', (data) => {
      console.error('[ModularWorld] 子地图加载失败:', data.error)
      // 这里可以显示用户友好的错误提示
    })

    // ============ 监听组件动画事件 ============
    this.eventBus.on('component:move', (data) => {
      // 组件移动动画完成
      // console.log(`[ModularWorld] ${data.componentType} 组件移动:`, data.direction)
    })
  }

  /**
   * 初始化UI组件
   */
  initializeUIComponents() {
    this.state.toastLoading = new ToastLoading()
    this.state.returnBtn = document.querySelector(".return-btn")
    
    // 为返回按钮添加点击事件
    if (this.state.returnBtn) {
      this.state.returnBtn.addEventListener('click', () => {
        this.moduleManager.getModule('navigation').goBack()
      })
    }
  }

  /**
   * 初始化历史记录系统
   */
  initializeHistorySystem() {
    this.state.history = new createHistory()
    this.state.history.push({ name: "中国" })
  }

  /**
   * 启动资源加载
   * 当资源加载完成后，开始构建场景
   */
  startResourceLoading() {
    this.state.assets = new Assets(() => {
      console.log('[ModularWorld] 资源加载完成，开始构建场景')
      this.buildScene()
    })
  }

  /**
   * 构建场景
   * 创建场景组织结构和各种3D组件
   */
  buildScene() {
    // ============ 创建场景层级结构 ============
    this.createSceneGroups()
    
    // ============ 使用模块创建核心地图 ============
    this.moduleManager.createModel()
    
    // ============ 创建其他组件 ============
    // 注意：这些组件还需要进一步模块化
    this.createFloor()
    this.createRotateBorder()
    // this.createBar()          // 将来迁移到MapVisualization模块
    // this.createParticles()    // 将来迁移到MapResource模块
    // this.createFlyLine()      // 将来迁移到MapVisualization模块
    // this.createScatter()      // 将来迁移到MapVisualization模块
    // this.createBadgeLabel()   // 将来迁移到MapVisualization模块
    // this.createPathAnimate()  // 将来迁移到MapAnimations模块
    // this.createStorke()       // 将来迁移到MapAnimations模块
    
    // ============ 启动入场动画 ============
    this.playEntranceAnimation()
  }

  /**
   * 创建场景层级结构
   */
  createSceneGroups() {
    this.state.sceneGroup = new Group()
    this.state.mainSceneGroup = new Group()
    this.state.childSceneGroup = new Group()
    this.state.labelGroup = new Group()
    this.state.gqGroup = new Group()
    this.state.provinceNameGroup = new Group()
    this.state.badgeGroup = new Group()

    // 创建3D标签管理器
    this.state.label3d = new Label3d(this)

    // 建立场景层级关系
    this.state.mainSceneGroup.rotateX(-Math.PI / 2)
    this.state.mainSceneGroup.add(
      this.state.labelGroup, 
      this.state.gqGroup, 
      this.state.provinceNameGroup, 
      this.state.badgeGroup
    )
    this.state.sceneGroup.add(this.state.mainSceneGroup, this.state.childSceneGroup)
    this.scene.add(this.state.sceneGroup)
  }

  /**
   * 播放入场动画
   * 使用GSAP创建复杂的入场动画序列
   */
  playEntranceAnimation() {
    console.log('[ModularWorld] 开始播放入场动画')
    
    let tl = gsap.timeline()

    // 添加动画时间标签
    tl.addLabel("focusMap", 3.5)
    tl.addLabel("focusMapOpacity", 4.0)
    tl.addLabel("bar", 5.0)

    // 主相机动画
    tl.add(
      gsap.to(this.camera.instance.position, {
        duration: 2.5,
        delay: 2,
        x: 3.134497983573052,
        y: 126.8312346165316,
        z: 78.77649752477839,
        ease: "circ.out",
        onComplete: () => {
          this.camera.controls.saveState()
        },
      })
    )

    // 背景光圈旋转动画
    if (this.state.quan) {
      tl.add(
        gsap.to(this.state.quan.rotation, {
          duration: 5,
          z: -2 * Math.PI,
        }),
        "-=2"
      )
    }

    // 地图聚焦动画
    if (this.state.focusMapGroup) {
      tl.add(
        gsap.to(this.state.focusMapGroup.position, {
          duration: 1,
          x: 0, y: 0, z: 0,
        }),
        "focusMap"
      )

      tl.add(
        gsap.to(this.state.focusMapGroup.scale, {
          duration: 1,
          x: 1, y: 1, z: 1,
          ease: "circ.out",
        }),
        "focusMap"
      )
    }

    // 发射动画开始事件
    this.eventBus.emitAnimation('start', {
      type: 'entrance',
      duration: tl.duration()
    })

    // 动画完成回调
    tl.call(() => {
      this.eventBus.emitAnimation('complete', {
        type: 'entrance'
      })
      console.log('[ModularWorld] 入场动画播放完成')
    })
  }

  /**
   * 初始化环境灯光系统
   */
  initEnvironment() {
    // 环境光
    let sun = new AmbientLight(0xffffff, 2)
    this.scene.add(sun)
    
    // 方向光
    let directionalLight = new DirectionalLight(0xffffff, 0.5)
    directionalLight.position.set(10, 10, 5)
    this.scene.add(directionalLight)
  }

  /**
   * 初始化渲染器设置
   */
  initSetting() {
    this.renderer.instance.shadowMap.enabled = true
    this.renderer.instance.shadowMap.type = 2 // PCFSoftShadowMap
  }

  /**
   * 创建地面装饰
   * 这些方法将来会迁移到MapResource模块
   */
  createFloor() {
    // 临时保留原有实现
    // 将来迁移到MapResource模块
    console.log('[ModularWorld] 创建地面装饰')
  }

  createRotateBorder() {
    // 临时保留原有实现
    // 将来迁移到MapResource模块
    console.log('[ModularWorld] 创建旋转边框')
  }

  /**
   * 更新方法 - 渲染循环的核心
   */
  update() {
    // 调用父类更新逻辑
    super.update()
    
    // 更新模块管理器
    this.moduleManager.update(this.time.delta)
    
    // 更新性能监控
    this.stats && this.stats.update()
  }

  /**
   * 销毁方法 - 资源清理和内存管理
   */
  destroy() {
    console.log('[ModularWorld] 开始销毁模块化地图世界')
    
    // 销毁模块管理器（会自动销毁所有模块）
    this.moduleManager.destroy()
    
    // 清理UI组件
    if (this.state.toastLoading) {
      this.state.toastLoading.destroy()
    }
    
    // 调用父类销毁逻辑
    super.destroy()
    
    console.log('[ModularWorld] 模块化地图世界已销毁')
  }

  /**
   * 获取模块管理器
   * 提供给外部访问模块的接口
   */
  getModuleManager() {
    return this.moduleManager
  }

  /**
   * 获取当前状态快照
   * 用于调试和状态检查
   */
  getSnapshot() {
    return {
      moduleManager: this.moduleManager.getSnapshot(),
      camera: {
        position: this.camera.instance.position.toArray(),
        rotation: this.camera.instance.rotation.toArray()
      },
      scene: {
        children: this.scene.children.length,
        visible: this.scene.visible
      }
    }
  }
} 