import {
  Group,
  Vector3,
  PlaneGeometry,
  MeshBasicMaterial,
  Mesh,
  RepeatWrapping,
  AdditiveBlending,
  NearestFilter,
} from "three"

import { 
  PathLine,
  FlyLine 
} from "@/mini3d"

import gsap from "gsap"

/**
 * 地图动画系统模块
 * 
 * 负责管理地图中的各种动画效果，包括：
 * - 路径流动动画（运输路径轨迹）
 * - 轮廓流动动画（地图边界效果）
 * - 飞线焦点动画（GSAP重复动画）
 * - 入场动画系统（复杂时间线动画）
 * - 组件联动动画（省份交互动画）
 * - 材质动画系统（纹理流动效果）
 * 
 * 动画特性：
 * - 基于GSAP时间线编排
 * - 高性能GPU动画
 * - 流体路径动画效果
 * - 复杂的入场动画序列
 * - 组件间同步动画
 * 
 * @author LJK
 * @version 1.0.0
 */
export class MapAnimations {
  /**
   * 构造函数
   * @param {SharedState} state - 共享状态管理器
   * @param {ModuleEventBus} eventBus - 事件总线
   */
  constructor(state, eventBus) {
    this.state = state
    this.eventBus = eventBus
    
    // 动画实例缓存
    this.animationInstances = new Map()
    
    // 活跃的时间线动画
    this.activeTimelines = []
    
    // 动画配置缓存
    this.animationConfigs = new Map()
  }

  /**
   * 创建路径流动动画
   * 
   * 创建运输路径的流动动画效果，展示物流运输轨迹。
   * 使用PathLine组件实现管道式3D路径，配合纹理流动形成动态效果。
   * 
   * @returns {PathLine} 路径动画实例
   * 
   * 功能特点：
   * - 基于真实运输路径数据
   * - 流动纹理动画效果
   * - 3D管道渲染
   * - 可控制的流动速度
   * - 支持多条路径同时动画
   * 
   * 使用场景：
   * - 物流运输可视化
   * - 交通流量展示
   * - 数据流向演示
   */
  createPathAnimate() {
    console.log('[MapAnimations] 开始创建路径流动动画')
    
    // ============ 配置路径纹理 ============
    // 获取路径流动纹理资源
    const texture = this.state.assets.instance.getResource("pathLine")
    // 设置纹理重复模式，支持流动效果
    texture.wrapS = texture.wrapT = RepeatWrapping
    // 设置纹理重复次数：横向8次重复，纵向1次，形成线条流动效果
    texture.repeat.set(8, 1)
    
    // ============ 处理路径数据 ============
    // 获取运输路径的GeoJSON数据
    let transportPath = this.state.assets.instance.getResource("transportPath")
    transportPath = JSON.parse(transportPath) // 解析JSON数据
    
    // 数据格式转换：将原始坐标数据包装为标准的几何体格式
    // 原始格式: coordinates: [x,y]
    // 目标格式: coordinates: [[[x,y]]]（PathLine组件所需的格式）
    for (let i = 0; i < transportPath.features.length; i++) {
      const element = transportPath.features[i]
      element.geometry.coordinates = [[element.geometry.coordinates]]
    }
    
    // ============ 转换为PathLine所需的数据格式 ============
    // 格式: [{geometry: {type: 'LineString', coordinates: [[[x,y]]] }}]
    let data = transportPath.features.map((path) => {
      return {
        geometry: path.geometry,
      }
    })
    
    // ============ 创建路径动画实例 ============
    let pathLine = new PathLine(this.state, {
      data: data,                    // 路径数据
      texture: texture,              // 流动纹理
      renderOrder: 21,               // 渲染优先级
      speed: 0.5,                   // 流动速度
      material: new MeshBasicMaterial({
        map: texture,                // 纹理贴图
        color: 0xffffff,            // 白色基础色
        transparent: true,           // 启用透明度
        fog: false,                 // 不受雾效果影响
        opacity: 1,                 // 完全不透明
        depthTest: false,           // 禁用深度测试，确保正确显示
        blending: AdditiveBlending, // 加法混合，实现发光效果
      }),
    })
    
    // ============ 设置路径动画属性 ============
    // 设置父级为主场景组
    pathLine.setParent(this.state.mainSceneGroup)
    // 初始隐藏，由其他逻辑控制显示时机
    pathLine.visible = false
    // 设置Z轴位置，略高于地图表面
    pathLine.instance.position.z = this.state.depth + 0.42

    // ============ 保存动画实例引用 ============
    this.state.pathLineGroup = pathLine
    this.animationInstances.set('pathAnimate', pathLine)
    
    // 发射路径动画创建事件
    this.eventBus.emit('animations:pathAnimateCreated', {
      pathCount: data.length,
      speed: 0.5,
      renderOrder: 21
    })

    console.log('[MapAnimations] 路径流动动画创建完成')
    return pathLine
  }

  /**
   * 创建轮廓流动动画
   * 
   * 创建中国地图边界的流动动画效果，用于突出显示国家轮廓。
   * 使用PathLine组件渲染3D管道式边界线，配合流动纹理实现动态边界效果。
   * 
   * @returns {PathLine} 轮廓动画实例
   * 
   * 功能特点：
   * - 基于中国地图轮廓数据
   * - 3D管道式渲染
   * - 青蓝色流动效果
   * - 高密度分段，流畅曲线
   * - 透明度混合，柔和视觉
   * 
   * 技术参数：
   * - 管道半径：0.2
   * - 分段数量：2560（高精度）
   * - 径向分段：4（圆形截面）
   * - 流动速度：0.2（较慢，便于观察）
   */
  createStorke() {
    console.log('[MapAnimations] 开始创建轮廓流动动画')
    
    // ============ 配置轮廓纹理 ============
    // 获取轮廓流动纹理资源
    const texture = this.state.assets.instance.getResource("pathLine2")
    // 设置纹理重复模式
    texture.wrapS = texture.wrapT = RepeatWrapping
    // 设置纹理重复次数：1:1比例，适合轮廓线条
    texture.repeat.set(1, 1)
    
    // ============ 加载轮廓数据 ============
    // 获取中国地图轮廓的GeoJSON数据
    let mapJsonData = this.state.assets.instance.getResource("chinaStorke")
    mapJsonData = JSON.parse(mapJsonData) // 解析JSON数据

    // ============ 转换轮廓数据格式 ============
    // 格式: [{geometry: {type: 'MultiLineString', coordinates: [[[x,y]]] }}]
    let data = mapJsonData.features.map((path) => {
      return {
        geometry: path.geometry,
      }
    })

    // ============ 创建轮廓动画实例 ============
    let pathLine = new PathLine(this.state, {
      data: data,                    // 轮廓数据
      texture: texture,              // 流动纹理
      renderOrder: 21,               // 渲染优先级
      speed: 0.2,                   // 较慢的流动速度
      radius: 0.2,                  // 管道半径
      segments: 256 * 10,           // 高密度分段数量（2560）
      radialSegments: 4,            // 径向分段数，形成圆形截面
      material: new MeshBasicMaterial({
        color: 0x2bc4dc,            // 青蓝色
        map: texture,                // 纹理贴图
        alphaMap: texture,          // 透明度贴图（使用相同纹理）
        fog: false,                 // 不受雾效果影响
        transparent: true,           // 启用透明度
        opacity: 1,                 // 完全不透明
        blending: AdditiveBlending, // 加法混合，实现发光效果
      }),
    })
    
    // ============ 设置轮廓动画属性 ============
    // 设置父级为主场景组
    pathLine.setParent(this.state.mainSceneGroup)
    // 设置Z轴位置，略高于地图和路径动画
    pathLine.instance.position.z = this.state.depth + 0.38

    // ============ 保存动画实例引用 ============
    this.state.strokeLineGroup = pathLine
    this.animationInstances.set('strokeAnimate', pathLine)
    
    // 发射轮廓动画创建事件
    this.eventBus.emit('animations:strokeAnimateCreated', {
      segmentCount: 256 * 10,
      speed: 0.2,
      radius: 0.2,
      color: 0x2bc4dc
    })

    console.log('[MapAnimations] 轮廓流动动画创建完成')
    return pathLine
  }

  /**
   * 创建飞线焦点动画
   * 
   * 在飞线中心点创建脉冲式光圈动画，用于突出显示数据流的汇聚点。
   * 使用GSAP创建循环的缩放和透明度动画，形成雷达扫描般的视觉效果。
   * 
   * @returns {Group} 飞线焦点动画组
   * 
   * 动画特点：
   * - 双层光圈设计，增强视觉层次
   * - 循环脉冲动画，无限重复
   * - 错位时间延迟，形成波浪效果
   * - 透明度渐变，从1到0的淡出
   * - 缩放动画，从0到2倍的放大
   * 
   * GSAP动画配置：
   * - 持续时间：1秒
   * - 重复次数：无限（-1）
   * - 缓动函数：默认
   * - 延迟：第二层延迟0.5秒
   */
  createFlyLineFocus() {
    console.log('[MapAnimations] 开始创建飞线焦点动画')
    
    // ============ 创建焦点动画组 ============
    this.state.flyLineFocusGroup = new Group()
    this.state.flyLineFocusGroup.visible = false // 初始隐藏

    // ============ 计算焦点位置 ============
    // 使用地理投影将飞线中心坐标转换为3D空间坐标
    let [x, y] = this.state.geoProjection(this.state.flyLineCenter)
    this.state.flyLineFocusGroup.position.set(x, -y, this.state.depth + 0.47)
    
    // ============ 设置焦点元数据 ============
    this.state.flyLineFocusGroup.userData.name = "北京市"  // 设置光圈的名字
    this.state.flyLineFocusGroup.userData.adcode = 110000  // 设置光圈的行政区代码
    this.state.flyLineFocusGroup.userData.position = [x, -y, this.state.depth + 0.47] // 保存位置信息

    // 将焦点组添加到主场景组
    this.state.mainSceneGroup.add(this.state.flyLineFocusGroup)
    
    // ============ 获取焦点光圈纹理 ============
    const flyLineFocus = this.state.assets.instance.getResource("guangquan1")
    const geometry = new PlaneGeometry(5, 5) // 5x5的光圈平面
    
    // ============ 创建光圈材质 ============
    const material = new MeshBasicMaterial({
      color: 0xfbdf88,            // 金黄色
      map: flyLineFocus,          // 光圈纹理
      alphaMap: flyLineFocus,     // 透明度贴图
      transparent: true,          // 启用透明度
      fog: false,                 // 不受雾效果影响
      depthTest: false,           // 禁用深度测试
      blending: AdditiveBlending, // 加法混合，实现发光效果
    })
    
    // ============ 创建双层光圈网格 ============
    const mesh = new Mesh(geometry, material)
    mesh.renderOrder = 30       // 高渲染优先级
    mesh.scale.set(0, 0, 0)    // 初始缩放为0
    
    const mesh2 = mesh.clone()  // 克隆第二层光圈
    mesh2.material = material.clone() // 克隆材质，独立控制
    
    // 将两层光圈添加到焦点组
    this.state.flyLineFocusGroup.add(mesh, mesh2)
    
    // ============ 创建第一层光圈脉冲动画 ============
    // 透明度动画：从初始值渐变到0
    const tl1 = gsap.to(mesh.material, {
      opacity: 0,                 // 目标透明度为0（完全透明）
      repeat: -1,                 // 无限重复
      yoyo: false,               // 不使用悠悠球效果（不往返）
      duration: 1,               // 动画持续时间1秒
    })
    
    // 缩放动画：从0放大到2倍
    const tl2 = gsap.to(mesh.scale, {
      x: 2, y: 2, z: 2,         // XYZ轴都放大到2倍
      repeat: -1,                 // 无限重复
      yoyo: false,               // 不使用悠悠球效果
      duration: 1,               // 动画持续时间1秒
    })
    
    // ============ 创建第二层光圈脉冲动画（错位） ============
    // 透明度动画：延迟0.5秒开始，形成错位效果
    const tl3 = gsap.to(mesh2.material, {
      delay: 0.5,                // 延迟0.5秒开始
      opacity: 0,                 // 目标透明度为0
      repeat: -1,                 // 无限重复
      yoyo: false,               // 不使用悠悠球效果
      duration: 1,               // 动画持续时间1秒
    })
    
    // 缩放动画：延迟0.5秒开始
    const tl4 = gsap.to(mesh2.scale, {
      delay: 0.5,                // 延迟0.5秒开始
      x: 2, y: 2, z: 2,         // XYZ轴都放大到2倍
      repeat: -1,                 // 无限重复
      yoyo: false,               // 不使用悠悠球效果
      duration: 1,               // 动画持续时间1秒
    })
    
    // ============ 保存动画时间线引用 ============
    this.activeTimelines.push(tl1, tl2, tl3, tl4)
    this.animationInstances.set('flyLineFocus', this.state.flyLineFocusGroup)
    
    // 发射飞线焦点动画创建事件
    this.eventBus.emit('animations:flyLineFocusCreated', {
      layerCount: 2,
      duration: 1,
      delay: 0.5,
      position: [x, y, this.state.depth + 0.47]
    })

    console.log('[MapAnimations] 飞线焦点动画创建完成')
    return this.state.flyLineFocusGroup
  }

  /**
   * 播放入场动画
   * 
   * 创建复杂的入场动画序列，使用GSAP时间线编排多个动画效果。
   * 包含相机动画、地图显示、材质变化等多个阶段的协调动画。
   * 
   * @returns {gsap.core.Timeline} GSAP时间线实例
   * 
   * 动画序列：
   * 1. 相机移动动画（2.5秒，延迟2秒）
   * 2. 背景光圈旋转（5秒，与相机动画重叠）
   * 3. 地图聚焦显示（1秒，3.5秒后开始）
   * 4. 地图材质透明度变化（4秒后开始）
   * 5. 其他组件入场（5秒后开始）
   * 
   * 技术特点：
   * - 时间线标签管理，精确控制时序
   * - 缓动函数，自然的动画效果
   * - 事件回调，动画状态通知
   * - 相机状态保存，支持后续交互
   */
  playEntranceAnimation() {
    console.log('[MapAnimations] 开始播放入场动画')
    
    // ============ 创建主时间线 ============
    let tl = gsap.timeline()

    // ============ 添加时间标签 ============
    // 时间标签用于精确控制动画的开始时机
    tl.addLabel("focusMap", 3.5)      // 地图聚焦阶段
    tl.addLabel("focusMapOpacity", 4.0) // 地图透明度阶段
    tl.addLabel("bar", 5.0)           // 组件显示阶段

    // ============ 主相机入场动画 ============
    tl.add(
      gsap.to(this.state.camera.instance.position, {
        duration: 2.5,               // 动画持续时间
        delay: 2,                    // 延迟2秒开始
        // 目标相机位置（俯视角度，适合观察整个地图）
        x: 3.134497983573052,
        y: 126.8312346165316,
        z: 78.77649752477839,
        ease: "circ.out",           // 圆形缓出，自然的减速效果
        onComplete: () => {
          // 动画完成后保存相机状态，为后续交互做准备
          this.state.camera.controls.saveState()
        },
      })
    )

    // ============ 背景光圈旋转动画 ============
    // 在相机动画进行的同时，背景光圈开始旋转
    if (this.state.quan) {
      tl.add(
        gsap.to(this.state.quan.rotation, {
          duration: 5,              // 持续5秒
          z: -2 * Math.PI,         // 完整旋转一圈（逆时针）
        }),
        "-=2"                      // 相对于上一个动画提前2秒开始
      )
    }

    // ============ 地图聚焦显示动画 ============
    if (this.state.focusMapGroup) {
      // 地图位置动画：从下方移动到正确位置
      tl.add(
        gsap.to(this.state.focusMapGroup.position, {
          duration: 1,              // 快速移动
          x: 0, y: 0, z: 0,        // 目标位置
        }),
        "focusMap"                 // 在focusMap标签时开始
      )

      // 地图缩放动画：从压扁状态恢复到正常
      tl.add(
        gsap.to(this.state.focusMapGroup.scale, {
          duration: 1,              // 与位置动画同步
          x: 1, y: 1, z: 1,        // 恢复到正常比例
          ease: "circ.out",        // 圆形缓出效果
        }),
        "focusMap"                 // 与位置动画同时开始
      )
    }

    // ============ 地图材质透明度动画 ============
    // 在地图位置动画完成后，逐渐显示地图材质
    if (this.state.focusMapTopMaterial && this.state.focusMapSideMaterial) {
      tl.add(
        gsap.to(this.state.focusMapTopMaterial, {
          duration: 1,
          opacity: 1,               // 顶面材质从透明变为不透明
        }),
        "focusMapOpacity"
      )
      
      tl.add(
        gsap.to(this.state.focusMapSideMaterial, {
          duration: 1,
          opacity: 1,               // 侧面材质从透明变为不透明
        }),
        "focusMapOpacity"
      )
      
      // 省份轮廓线也逐渐显示
      if (this.state.provinceLineMaterial) {
        tl.add(
          gsap.to(this.state.provinceLineMaterial, {
            duration: 1,
            opacity: 1,             // 轮廓线从透明变为不透明
          }),
          "focusMapOpacity"
        )
      }
    }

    // ============ 旋转边框入场动画 ============
    if (this.state.rotateBorder1 && this.state.rotateBorder2) {
      tl.add(
        gsap.to(this.state.rotateBorder1.scale, {
          duration: 1,
          x: 1, y: 1, z: 1,        // 恢复到正常比例
          ease: "back.out(1.7)",    // 回弹效果
        }),
        "bar"
      )
      
      tl.add(
        gsap.to(this.state.rotateBorder2.scale, {
          duration: 1,
          x: 1, y: 1, z: 1,        // 恢复到正常比例
          ease: "back.out(1.7)",    // 回弹效果
        }),
        "bar"
      )
    }

    // ============ 保存时间线引用 ============
    this.activeTimelines.push(tl)
    this.animationInstances.set('entranceAnimation', tl)

    // ============ 发射动画事件 ============
    // 发射动画开始事件
    this.eventBus.emitAnimation('start', {
      type: 'entrance',
      duration: tl.duration(),
      timeline: tl
    })

    // ============ 动画完成回调 ============
    tl.call(() => {
      // 发射动画完成事件
      this.eventBus.emitAnimation('complete', {
        type: 'entrance',
        duration: tl.duration()
      })
      console.log('[MapAnimations] 入场动画播放完成')
    })

    console.log(`[MapAnimations] 入场动画已启动，总时长: ${tl.duration()}秒`)
    return tl
  }

  /**
   * 创建组件联动动画
   * 
   * 为地图组件创建统一的联动动画效果，当省份被悬停或点击时，
   * 相关组件会产生协调的动画响应。
   * 
   * @param {string} componentType - 组件类型（bar、label、scatter等）
   * @param {Object} targetElement - 目标元素
   * @param {string} animationType - 动画类型（up、down、hover等）
   * @param {Object} options - 动画选项
   */
  createComponentAnimation(componentType, targetElement, animationType, options = {}) {
    const defaultOptions = {
      duration: 0.3,               // 默认动画时长
      ease: "power2.out",          // 默认缓动函数
      delay: 0,                    // 默认延迟
    }
    
    const config = Object.assign({}, defaultOptions, options)
    
    let animation = null
    
    switch (componentType) {
      case 'bar':
        // 柱状图上下移动动画
        animation = gsap.to(targetElement.position, {
          duration: config.duration,
          z: animationType === "up" ? 
             targetElement.userData.position[2] + this.state.depth / 2 + 0.3 : 
             targetElement.userData.position[2],
          ease: config.ease,
        })
        break
        
      case 'label':
        // 标签缩放和移动动画
        const targetScale = animationType === "up" ? 1.2 : 1
        const targetZ = animationType === "up" ? 
                       targetElement.userData.position[2] + 0.5 : 
                       targetElement.userData.position[2]
        
        animation = gsap.timeline()
          .to(targetElement.scale, {
            duration: config.duration,
            x: targetScale, y: targetScale, z: targetScale,
            ease: config.ease,
          })
          .to(targetElement.position, {
            duration: config.duration,
            z: targetZ,
            ease: config.ease,
          }, "<") // 与缩放动画同时开始
        break
        
      default:
        console.warn(`[MapAnimations] 未知的组件类型: ${componentType}`)
        return null
    }
    
    // 保存动画引用
    if (animation) {
      this.activeTimelines.push(animation)
      
      // 发射组件动画事件
      this.eventBus.emit('animations:componentAnimated', {
        componentType,
        animationType,
        duration: config.duration
      })
    }
    
    return animation
  }

  /**
   * 停止指定类型的动画
   * 
   * @param {string} animationType - 动画类型
   */
  stopAnimation(animationType) {
    const animation = this.animationInstances.get(animationType)
    if (animation && animation.kill) {
      animation.kill()
      this.animationInstances.delete(animationType)
      console.log(`[MapAnimations] 已停止动画: ${animationType}`)
    }
  }

  /**
   * 暂停所有动画
   */
  pauseAllAnimations() {
    this.activeTimelines.forEach(timeline => {
      if (timeline.pause) {
        timeline.pause()
      }
    })
    console.log('[MapAnimations] 已暂停所有动画')
  }

  /**
   * 恢复所有动画
   */
  resumeAllAnimations() {
    this.activeTimelines.forEach(timeline => {
      if (timeline.resume) {
        timeline.resume()
      }
    })
    console.log('[MapAnimations] 已恢复所有动画')
  }

  /**
   * 获取动画统计信息
   * @returns {Object} 动画统计数据
   */
  getAnimationStats() {
    return {
      totalAnimations: this.animationInstances.size,
      activeTimelines: this.activeTimelines.length,
      animationTypes: Array.from(this.animationInstances.keys()),
      totalDuration: this.activeTimelines.reduce((total, timeline) => {
        return total + (timeline.duration ? timeline.duration() : 0)
      }, 0)
    }
  }

  /**
   * 更新动画系统
   * 在每帧更新中调用，处理动态动画效果
   * 
   * @param {number} deltaTime - 帧间隔时间
   */
  update(deltaTime) {
    // 清理已完成的时间线
    this.activeTimelines = this.activeTimelines.filter(timeline => {
      return timeline.isActive && timeline.isActive()
    })
    
    // 发射更新事件
    this.eventBus.emit('animations:updated', { 
      deltaTime,
      activeCount: this.activeTimelines.length
    })
  }

  /**
   * 销毁动画系统
   * 清理所有动画资源，防止内存泄漏
   */
  destroy() {
    console.log('[MapAnimations] 开始销毁动画系统')
    
    // ============ 停止并清理所有时间线动画 ============
    this.activeTimelines.forEach(timeline => {
      if (timeline.kill) {
        timeline.kill()
      }
    })
    this.activeTimelines = []
    
    // ============ 清理动画实例 ============
    this.animationInstances.forEach((instance, key) => {
      if (instance && instance.destroy) {
        instance.destroy()
      }
    })
    this.animationInstances.clear()
    
    // ============ 清理动画配置缓存 ============
    this.animationConfigs.clear()
    
    // ============ 清理路径动画组 ============
    if (this.state.pathLineGroup) {
      this.state.pathLineGroup.destroy && this.state.pathLineGroup.destroy()
      this.state.pathLineGroup = null
    }
    
    // ============ 清理轮廓动画组 ============
    if (this.state.strokeLineGroup) {
      this.state.strokeLineGroup.destroy && this.state.strokeLineGroup.destroy()
      this.state.strokeLineGroup = null
    }
    
    // ============ 清理飞线焦点动画组 ============
    if (this.state.flyLineFocusGroup) {
      // 清理组内的所有子对象
      this.state.flyLineFocusGroup.children.forEach(child => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) child.material.dispose()
      })
      this.state.flyLineFocusGroup.parent && this.state.flyLineFocusGroup.parent.remove(this.state.flyLineFocusGroup)
      this.state.flyLineFocusGroup = null
    }
    
    // 发射销毁完成事件
    this.eventBus.emit('animations:destroyed')

    console.log('[MapAnimations] 动画系统已销毁')
  }
}
