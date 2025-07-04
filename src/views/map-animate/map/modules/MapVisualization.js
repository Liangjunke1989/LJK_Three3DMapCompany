import { 
  Group, 
  Vector3, 
  BoxGeometry, 
  MeshBasicMaterial, 
  Mesh, 
  PlaneGeometry, 
  DoubleSide, 
  AdditiveBlending,
  RepeatWrapping,
  SpriteMaterial,
  Sprite,
  PointsMaterial,
  NearestFilter
} from 'three'
import { DiffuseShader } from '../DiffuseShader.js'
import { FlyLine, PathLine, Particles } from '@/mini3d'
import provincesData from '../provincesData.js'
import scatterData from '../scatter.js'
import badgesData from '../badgesData.js'
import labelArrow from '@/assets/texture/label-arrow.png'
import { gsap } from 'gsap'

// 数据排序工具函数
function sortByValue(data) {
  return data.sort((a, b) => b.value - a.value)
}

/**
 * 地图数据可视化管理器
 * 
 * 专门负责地图上的各种数据可视化组件，包括：
 * - 3D柱状图系统
 * - 散点图系统  
 * - 飞线动画系统
 * - 路径动画系统
 * - 光圈特效系统
 * - 标签系统
 * - 粒子系统
 * 
 * 所有组件都支持与地图的交互联动效果
 */
export class MapVisualization {
  /**
   * 构造函数
   * @param {SharedState} sharedState - 共享状态实例
   * @param {ModuleEventBus} eventBus - 事件总线实例
   */
  constructor(sharedState, eventBus) {
    this.sharedState = sharedState
    this.eventBus = eventBus
    
    // 数据可视化组件存储数组
    this.allBar = []                    // 所有柱状图网格
    this.allBarMaterial = []            // 所有柱状图材质
    this.allGuangquan = []              // 所有光圈装饰
    this.allProvinceLabel = []          // 所有数据标签
    this.allProvinceNameLabel = []      // 所有省份名称标签
    
    // 组件组容器
    this.barGroup = null
    this.scatterGroup = null
    this.flyLineGroup = null
    this.flyLineFocusGroup = null
    this.pathLineGroup = null
    this.particles = null
    
    // 绑定事件监听
    this._bindEvents()
  }

  /**
   * 绑定事件监听器
   * 监听地图交互事件，实现组件联动效果
   * @private
   */
  _bindEvents() {
    // 监听省份悬停事件，实现组件联动上移
    this.eventBus.on('province:hover', (data) => {
      this.setBarMove(data.adcode, 'up')
      this.setGQMove(data.adcode, 'up')
      this.setLabelMove(data.adcode, 'up')
      this.setScatterMove(data.adcode, 'up')
    })
    
    // 监听省份离开事件，实现组件联动下移
    this.eventBus.on('province:leave', (data) => {
      this.setBarMove(data.adcode, 'down')
      this.setGQMove(data.adcode, 'down')
      this.setLabelMove(data.adcode, 'down')
      this.setScatterMove(data.adcode, 'down')
    })
    
    // 监听场景切换事件
    this.eventBus.on('scene:switch', (data) => {
      this.setMainMapVisible(data.visible)
    })
  }

  /**
   * 创建3D数据柱状图
   * 
   * 根据省份数据创建3D柱状图，支持：
   * - 基于数据值的高度比例计算
   * - 前三名金色渐变，其他蓝色渐变
   * - 配套的光圈装饰和辉光效果
   * - 数据标签和省份名称标签
   * - 入场动画效果
   */
  createBar() {
    const self = this
    
    // 对省份数据按数值降序排序
    let data = sortByValue(provincesData)
    
    // 创建柱状图容器组
    const barGroup = new Group()
    this.barGroup = barGroup

    // 柱状图尺寸计算参数
    const factor = 7                    // 缩放因子，影响柱子粗细
    const height = 4.0 * factor         // 最大柱子高度
    const max = data[0].value           // 获取最大数据值

    // 遍历数据创建柱状图
    data.map((item, index) => {
      // 计算柱子高度（基于数据值比例）
      let geoHeight = height * (item.value / max)
      
      // 创建柱状图材质
      let material = new MeshBasicMaterial({
        color: 0xffffff,      // 白色基础色
        transparent: true,    // 启用透明度
        opacity: 0,          // 初始完全透明（用于入场动画）
        depthTest: false,    // 禁用深度测试
        fog: false,          // 不受雾效果影响
      })
      
      // 应用扩散着色器（前三名金色，其他蓝色）
      new DiffuseShader(material, {
        uColor1: index < 3 ? 0xfbdf88 : 0x50bbfe,  // 起始颜色
        uColor2: index < 3 ? 0xfbdf88 : 0x50bbfe,  // 结束颜色
        size: geoHeight,                           // 渐变高度
        dir: "y",                                  // Y轴方向渐变
      })
      
      // 创建柱状图几何体
      const geo = new BoxGeometry(
        0.05 * factor,  // X轴尺寸
        0.05 * factor,  // Y轴尺寸
        geoHeight       // Z轴尺寸（高度）
      )
      // 将几何体向上平移，使底部与地面对齐
      geo.translate(0, 0, geoHeight / 2)
      
      // 创建柱状图网格
      const mesh = new Mesh(geo, material)
      mesh.renderOrder = 22 // 设置渲染顺序
      
      // 地理坐标投影和定位
      let [x, y] = this.sharedState.geoProjection(item.centroid)
      mesh.position.set(x, -y, this.sharedState.depth + 0.46)
      mesh.scale.set(1, 1, 0) // 初始Z轴缩放为0（用于入场动画）
      
      // 设置用户数据
      mesh.userData.name = item.name
      mesh.userData.adcode = item.adcode
      mesh.userData.position = [x, -y, this.sharedState.depth + 0.46]

      // 创建光圈装饰效果
      let guangQuan = this.createQuan()
      guangQuan.position.set(x, -y, this.sharedState.depth + 0.46)
      guangQuan.userData.name = item.name
      guangQuan.userData.adcode = item.adcode
      guangQuan.userData.position = [x, -y, this.sharedState.depth + 0.46]
      this.sharedState.gqGroup.add(guangQuan)
      
      // 创建辉光效果
      let hg = this.createHUIGUANG(geoHeight, index < 3 ? 0xfffef4 : 0x77fbf5)
      mesh.add(...hg) // 将辉光效果添加到柱状图

      // 添加到柱状图组
      barGroup.add(mesh)
      
      // 创建数据标签和省份名称标签
      let barLabel = this._createDataLabel(item, index, new Vector3(x, -y, this.sharedState.depth + 0.9 + geoHeight))
      let nameLabel = this._createNameLabel(item, index, new Vector3(x, -y - 1.5, this.sharedState.depth + 0.4))
      
      // 存储到管理数组
      this.allBar.push(mesh)
      this.allBarMaterial.push(material)
      this.allGuangquan.push(guangQuan)
      this.allProvinceLabel.push(barLabel)
      this.allProvinceNameLabel.push(nameLabel)
    })

    // 将柱状图组添加到主场景
    this.sharedState.mainSceneGroup.add(barGroup)
  }

  /**
   * 创建辉光效果
   * @param {number} h - 辉光高度
   * @param {number} color - 辉光颜色
   * @returns {Array} 返回辉光网格数组
   */
  createHUIGUANG(h, color) {
    let geometry = new PlaneGeometry(1.5, h)
    geometry.translate(0, h / 2, 0)
    const texture = this.sharedState.assets.instance.getResource("huiguang")
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    
    let material = new MeshBasicMaterial({
      color: color,
      map: texture,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,
      side: DoubleSide,
      blending: AdditiveBlending,
    })
    
    let mesh = new Mesh(geometry, material)
    mesh.renderOrder = 23
    mesh.rotateX(Math.PI / 2)
    
    let mesh2 = mesh.clone()
    let mesh3 = mesh.clone()
    mesh2.rotateY((Math.PI / 180) * 60)
    mesh3.rotateY((Math.PI / 180) * 120)
    
    return [mesh, mesh2, mesh3]
  }

  /**
   * 创建光圈效果
   * @returns {Group} 光圈组对象
   */
  createQuan() {
    const guangquan1 = this.sharedState.assets.instance.getResource("guangquan1")
    const guangquan2 = this.sharedState.assets.instance.getResource("guangquan2")
    let geometry = new PlaneGeometry(2, 2)

    let material1 = new MeshBasicMaterial({
      color: 0xffffff,
      map: guangquan1,
      alphaMap: guangquan1,
      opacity: 1,
      transparent: true,
      depthTest: false,
      fog: false,
      blending: AdditiveBlending,
    })
    
    let material2 = new MeshBasicMaterial({
      color: 0xffffff,
      map: guangquan2,
      alphaMap: guangquan2,
      opacity: 1,
      transparent: true,
      depthTest: false,
      fog: false,
      blending: AdditiveBlending,
    })
    
    let mesh1 = new Mesh(geometry, material1)
    let mesh2 = new Mesh(geometry, material2)
    mesh1.renderOrder = 24
    mesh2.renderOrder = 24

    mesh2.position.z -= 0.001
    mesh1.scale.set(0, 0, 0)
    mesh2.scale.set(0, 0, 0)
    
    const quanGroup = new Group()
    quanGroup.add(mesh1, mesh2)

    // 添加旋转动画
    this.sharedState.time.on("tick", (delta) => {
      mesh1.rotation.z += delta * 2
    })
    
    return quanGroup
  }

  /**
   * 设置柱状图联动移动效果
   * @param {string|number} adcode - 省份的行政区划代码
   * @param {string} type - 移动类型，"up"为上移，"down"为下移
   */
  setBarMove(adcode, type = "up") {
    this.allBar.map((barGroup) => {
      if (barGroup.userData.adcode === adcode) {
        gsap.to(barGroup.position, {
          duration: 0.3,
          z: type === "up" ? 
             barGroup.userData.position[2] + this.sharedState.depth / 2 + 0.3 : 
             barGroup.userData.position[2],
        })
      }
    })
  }

  /**
   * 设置光圈联动移动效果
   * @param {string|number} adcode - 省份的行政区划代码
   * @param {string} type - 移动类型，"up"为上移，"down"为下移
   */
  setGQMove(adcode, type = "up") {
    // 处理普通省份光圈
    this.allGuangquan.map((group) => {
      if (group.userData.adcode === adcode) {
        gsap.to(group.position, {
          duration: 0.3,
          z: type === "up" ? 
             group.userData.position[2] + this.sharedState.depth / 2 + 0.3 : 
             group.userData.position[2],
        })
      }
    })
    
    // 处理飞线焦点光圈（特殊情况）
    if (this.flyLineFocusGroup && this.flyLineFocusGroup.userData.adcode === adcode) {
      gsap.to(this.flyLineFocusGroup.position, {
        duration: 0.3,
        y: type === "up"
            ? this.flyLineFocusGroup.userData.position[1] + this.sharedState.depth / 2 + 0.3
            : this.flyLineFocusGroup.userData.position[1],
      })
    }
  }

  /**
   * 设置标签联动移动效果
   * @param {string|number} adcode - 省份的行政区划代码
   * @param {string} type - 移动类型，"up"为上移，"down"为下移
   */
  setLabelMove(adcode, type = "up") {
    // 合并所有类型的标签数组，统一处理
    [...this.allProvinceLabel, ...this.allProvinceNameLabel].map((label) => {
      if (label.userData.adcode === adcode) {
        gsap.to(label.position, {
          duration: 0.3,
          z: type === "up" ? 
             label.userData.position[2] + this.sharedState.depth / 2 + 0.3 : 
             label.userData.position[2],
        })
      }
    })
  }

  /**
   * 创建数据标签（人口数值和排名）
   * @param {Object} data - 省份数据
   * @param {number} index - 省份排名索引
   * @param {Vector3} position - 标签3D位置
   * @returns {Object} 3D标签对象
   * @private
   */
  _createDataLabel(data, index, position) {
    let label = this.sharedState.label3d.create("", "provinces-label-style02", true)
    
    label.init(
        `<div class="provinces-label-style02 ${index < 3 ? "yellow" : ""}">
      <div class="provinces-label-style02-wrap">
        <div class="number"><span class="value">${data.value}</span><span class="unit">万人</span></div>
        <div class="no">${index + 1}</div>
      </div>
    </div>`,
        position
    )
    
    this.sharedState.label3d.setLabelStyle(label, 0.05, "x")
    label.setParent(this.sharedState.labelGroup)
    label.userData.adcode = data.adcode
    label.userData.position = [position.x, position.y, position.z]
    return label
  }

  /**
   * 创建省份名称标签
   * @param {Object} data - 省份数据
   * @param {number} index - 省份排名索引
   * @param {Vector3} position - 标签3D位置
   * @returns {Object} 3D标签对象
   * @private
   */
  _createNameLabel(data, index, position) {
    let label = this.sharedState.label3d.create("", "provinces-name-label", true)
    
    label.init(
        `<div class="provinces-name-label"><div class="provinces-name-label-wrap">${data.name}</div></div>`,
        position
    )
    
    this.sharedState.label3d.setLabelStyle(label, 0.08, "x")
    label.setParent(this.sharedState.provinceNameGroup)
    label.userData.adcode = data.adcode
    label.userData.position = [position.x, position.y, position.z]
    return label
  }

  /**
   * 创建散点图
   * 
   * 根据城市数据创建散点图可视化，使用Sprite实现始终面向相机的2D图像
   * 支持基于数据值的大小缩放和交互联动效果
   */
  createScatter() {
    this.scatterGroup = new Group()
    this.scatterGroup.visible = false
    this.sharedState.mainSceneGroup.add(this.scatterGroup)

    // 创建散点材质
    const texture = this.sharedState.assets.instance.getResource("arrow")
    const material = new SpriteMaterial({
      map: texture,
      color: 0xffff00,
      transparent: true,
      depthTest: false,
    })

    // 获取排序后的散点数据
    let scatterAllData = sortByValue(scatterData)
    let max = scatterAllData[0].value
    
    scatterAllData.map((data) => {
      const sprite = new Sprite(material)
      sprite.renderOrder = 23
      
      // 基于数据值计算缩放比例
      let scale = 2 + (data.value / max) * 1
      sprite.scale.set(scale, scale, scale)
      
      // 地理坐标投影
      let [x, y] = this.sharedState.geoProjection([data.lng, data.lat])
      sprite.position.set(x, -y, this.sharedState.depth + 0.41)
      
      // 设置用户数据
      sprite.userData.adcode = data.adcode
      sprite.userData.position = [x, -y, this.sharedState.depth + 0.41]
      
      this.scatterGroup.add(sprite)
    })
  }

  /**
   * 设置散点图联动移动效果
   * @param {string|number} adcode - 省份的行政区划代码
   * @param {string} type - 移动类型，"up"为上移，"down"为下移
   */
  setScatterMove(adcode, type = "up") {
    this.scatterGroup.children.map((sprite) => {
      if (sprite.userData.adcode === adcode) {
        gsap.to(sprite.position, {
          duration: 0.3,
          z: type === "up" ? 
             sprite.userData.position[2] + this.sharedState.depth / 2 + 0.3 : 
             sprite.userData.position[2],
        })
      }
    })
  }

  /**
   * 创建飞线系统
   * 
   * 创建从各省份指向中心点（北京）的动态飞线效果
   * 支持纹理动画和加法混合的视觉效果
   */
  createFlyLine() {
    // 配置飞线纹理
    const texture = this.sharedState.assets.instance.getResource("flyLine")
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.generateMipmaps = false
    texture.magFilter = NearestFilter
    texture.repeat.set(0.5, 1)
    
    // 创建飞线组件
    let flyLine = new FlyLine(this.sharedState, {
      centerPoint: this.sharedState.flyLineCenter,
      data: provincesData,
      texture: texture,
      material: new MeshBasicMaterial({
        map: texture,
        alphaMap: texture,
        color: 0xfbdf88,
        transparent: true,
        fog: false,
        depthTest: false,
        blending: AdditiveBlending,
      }),
    })
    
    flyLine.setParent(this.sharedState.mainSceneGroup)
    flyLine.visible = false
    flyLine.instance.position.z = this.sharedState.depth + 0.4

    this.flyLineGroup = flyLine
    this.createFlyLineFocus()
  }

  /**
   * 创建飞线焦点效果
   * 
   * 在飞线中心点（北京）创建脉冲光圈效果
   * 使用双层光圈和错时动画实现视觉冲击力
   */
  createFlyLineFocus() {
    this.flyLineFocusGroup = new Group()
    this.flyLineFocusGroup.visible = false

    // 设置焦点位置（北京）
    let [x, y] = this.sharedState.geoProjection(this.sharedState.flyLineCenter)
    this.flyLineFocusGroup.position.set(x, -y, this.sharedState.depth + 0.47)
    this.flyLineFocusGroup.userData.name = "北京市"
    this.flyLineFocusGroup.userData.adcode = 110000
    this.flyLineFocusGroup.userData.position = [x, -y, this.sharedState.depth + 0.47]
    
    this.sharedState.mainSceneGroup.add(this.flyLineFocusGroup)
    
    // 创建双层光圈效果
    const flyLineFocus = this.sharedState.assets.instance.getResource("guangquan1")
    const geometry = new PlaneGeometry(5, 5)
    const material = new MeshBasicMaterial({
      color: 0xfbdf88,
      map: flyLineFocus,
      alphaMap: flyLineFocus,
      transparent: true,
      fog: false,
      depthTest: false,
      blending: AdditiveBlending,
    })
    
    const mesh = new Mesh(geometry, material)
    mesh.renderOrder = 30
    mesh.scale.set(0, 0, 0)
    
    const mesh2 = mesh.clone()
    mesh2.material = material.clone()
    this.flyLineFocusGroup.add(mesh, mesh2)
    
    // 第一层光圈动画
    gsap.to(mesh.material, {
      opacity: 0,
      repeat: -1,
      yoyo: false,
      duration: 1,
    })
    gsap.to(mesh.scale, {
      x: 2, y: 2, z: 2,
      repeat: -1,
      yoyo: false,
      duration: 1,
    })
    
    // 第二层光圈动画（延迟0.5秒）
    gsap.to(mesh2.material, {
      delay: 0.5,
      opacity: 0,
      repeat: -1,
      yoyo: false,
      duration: 1,
    })
    gsap.to(mesh2.scale, {
      delay: 0.5,
      x: 2, y: 2, z: 2,
      repeat: -1,
      yoyo: false,
      duration: 1,
    })
  }

  /**
   * 创建路径动画
   * 
   * 基于运输路径数据创建动态路径动画效果
   * 使用PathLine组件实现纹理流动动画
   */
  createPathAnimate() {
    // 配置路径纹理
    const texture = this.sharedState.assets.instance.getResource("pathLine")
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.repeat.set(8, 1)
    
    // 获取运输路径数据
    let transportPath = this.sharedState.assets.instance.getResource("transportPath")
    transportPath = JSON.parse(transportPath)
    
    // 数据格式转换
    for (let i = 0; i < transportPath.features.length; i++) {
      const element = transportPath.features[i]
      element.geometry.coordinates = [[element.geometry.coordinates]]
    }
    
    let data = transportPath.features.map((path) => {
      return { geometry: path.geometry }
    })
    
    // 创建路径线组件
    let pathLine = new PathLine(this.sharedState, {
      data: data,
      texture: texture,
      renderOrder: 21,
      speed: 0.5,
      material: new MeshBasicMaterial({
        map: texture,
        color: 0xffffff,
        transparent: true,
        fog: false,
        opacity: 1,
        depthTest: false,
        blending: AdditiveBlending,
      }),
    })
    
    pathLine.setParent(this.sharedState.mainSceneGroup)
    pathLine.visible = false
    pathLine.instance.position.z = this.sharedState.depth + 0.42

    this.pathLineGroup = pathLine
  }

  /**
   * 创建粒子系统
   * 
   * 创建上升的粒子效果，增强场景的动态感
   * 支持自定义粒子数量、范围和材质
   */
  createParticles() {
    this.particles = new Particles(this.sharedState, {
      num: 10,        // 粒子数量
      range: 200,     // 范围
      dir: "up",      // 上升方向
      speed: 0.1,     // 移动速度
      material: new PointsMaterial({
        map: Particles.createTexture(),
        size: 10,
        color: 0x00eeee,
        transparent: true,
        opacity: 0.3,
        depthTest: false,
        depthWrite: false,
        vertexColors: true,
        blending: AdditiveBlending,
        sizeAttenuation: true,
      }),
    })
    
    this.particles.instance.position.set(0, 0, 0)
    this.particles.instance.rotation.x = -Math.PI / 2
    this.particles.setParent(this.sharedState.scene)
    
    // 初始状态：停用和隐藏
    this.particles.enable = false
    this.particles.instance.visible = false
  }

  /**
   * 创建标牌标签
   * 
   * 创建显示工资信息的标牌标签
   * 使用CSS3D渲染实现丰富的HTML内容
   */
  createBadgeLabel() {
    const self = this
    this.sharedState.badgeGroup.visible = false
    
    badgesData.map((data) => {
      const [x, y] = this.sharedState.geoProjection(data.geometry.coordinates)
      this._createBadgeLabel(data, new Vector3(x, -y, this.sharedState.depth + 0.92))
    })
  }

  /**
   * 创建单个标牌标签
   * @param {Object} data - 标牌数据
   * @param {Vector3} position - 标签位置
   * @returns {Object} 3D标签对象
   * @private
   */
  _createBadgeLabel(data, position) {
    let label = this.sharedState.label3d.create("", "badges-label", true)
    
    label.init(
        `<div class="badges-label-wrap">
        平均工资：<span>${data.value}元</span>
        <img class="icon" src="${labelArrow}" alt="" />
      </div>`,
        position
    )
    
    this.sharedState.label3d.setLabelStyle(label, 0.1, "x")
    label.setParent(this.sharedState.badgeGroup)
    label.hide()
    label.userData.adcode = data.adcode
    label.userData.position = [position.x, position.y, position.z]
    return label
  }

  /**
   * 设置标签可见性
   * @param {string} labelGroup - 标签组名称
   * @param {boolean} bool - 可见性状态
   */
  setLabelVisible(labelGroup = "labelGroup", bool) {
    this.sharedState[labelGroup].visible = bool
    this.sharedState[labelGroup].children.map((label) => {
      bool ? label.show() : label.hide()
    })
  }

  /**
   * 创建轮廓线动画
   * 
   * 基于中国地图轮廓数据创建流动的边界线效果
   * 使用PathLine组件实现边界的动态视觉效果
   */
  createStorke() {
    // 配置轮廓纹理
    const texture = this.sharedState.assets.instance.getResource("pathLine2")
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.repeat.set(1, 1)
    
    // 获取中国轮廓数据
    let mapJsonData = this.sharedState.assets.instance.getResource("chinaStorke")
    mapJsonData = JSON.parse(mapJsonData)

    // 数据格式转换
    let data = mapJsonData.features.map((path) => {
      return { geometry: path.geometry }
    })

    // 创建轮廓线组件
    let pathLine = new PathLine(this.sharedState, {
      data: data,
      texture: texture,
      renderOrder: 21,
      speed: 0.2,
      radius: 0.2,
      segments: 256 * 10,
      radialSegments: 4,
      material: new MeshBasicMaterial({
        color: 0x2bc4dc,
        map: texture,
        alphaMap: texture,
        fog: false,
        transparent: true,
        opacity: 1,
        blending: AdditiveBlending,
      }),
    })
    
    pathLine.setParent(this.sharedState.mainSceneGroup)
    pathLine.instance.position.z = this.sharedState.depth + 0.38
    
    this.strokeGroup = pathLine
  }

  /**
   * 设置主地图组件可见性
   * @param {boolean} bool - 可见性状态
   */
  setMainMapVisible(bool) {
    // 控制各个可视化组件的显示/隐藏
    if (this.barGroup) this.barGroup.visible = bool
    if (this.scatterGroup) this.scatterGroup.visible = bool
    if (this.flyLineGroup) this.flyLineGroup.visible = bool
    if (this.flyLineFocusGroup) this.flyLineFocusGroup.visible = bool
    if (this.pathLineGroup) this.pathLineGroup.visible = bool
    if (this.strokeGroup) this.strokeGroup.visible = bool
    if (this.particles) this.particles.instance.visible = bool
    
    // 隐藏时需要额外处理标签组
    if (bool === false) {
      this.setLabelVisible("provinceNameGroup", bool)
      this.setLabelVisible("labelGroup", bool)
      this.setLabelVisible("badgeGroup", bool)
    }
  }

  /**
   * 销毁数据可视化系统
   * 清理所有相关资源和事件监听器
   */
  destroy() {
    // 移除事件监听
    this.eventBus.off('province:hover')
    this.eventBus.off('province:leave')
    this.eventBus.off('scene:switch')
    
    // 销毁组件
    if (this.flyLineGroup && this.flyLineGroup.destroy) {
      this.flyLineGroup.destroy()
    }
    if (this.pathLineGroup && this.pathLineGroup.destroy) {
      this.pathLineGroup.destroy()
    }
    if (this.strokeGroup && this.strokeGroup.destroy) {
      this.strokeGroup.destroy()
    }
    if (this.particles && this.particles.destroy) {
      this.particles.destroy()
    }
    
    // 清理数组
    this.allBar = []
    this.allBarMaterial = []
    this.allGuangquan = []
    this.allProvinceLabel = []
    this.allProvinceNameLabel = []
    
    // 清理组件引用
    this.barGroup = null
    this.scatterGroup = null
    this.flyLineGroup = null
    this.flyLineFocusGroup = null
    this.pathLineGroup = null
    this.strokeGroup = null
    this.particles = null
  }
}
