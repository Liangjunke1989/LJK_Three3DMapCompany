/**
 * 子地图类（ChildMap）
 *
 * 用于省/市级地图的3D可视化、交互、标签、点标记等功能。
 * 支持地图区域的点击下钻、悬停高亮、标签自适应缩放、点信息弹窗等。
 *
 * 主要功能：
 * - 3D地图区域挤出与材质渲染
 * - 区域标签、点标记、信息弹窗的自动布局
 * - 区域与点的交互事件（点击、悬停、弹窗）
 * - 子地图自适应缩放与居中
 * - 资源与交互管理
 *
 * 技术要点：
 * - three.js Group、Mesh、Sprite、材质等
 * - d3-geo地理投影
 * - gsap动画
 * - 组件化分组与事件解绑
 */

import { Group, RepeatWrapping, LineBasicMaterial, Vector3, SpriteMaterial, Sprite, Color } from "three"
import { ExtrudeMap } from "./map/extrudeMap"       // 地图挤出工具
import { getBoundBox, emptyObject } from "@/mini3d" // 工具函数
import { geoMercator } from "d3-geo"                // 地理投影
import { gsap } from "gsap"                         // 动画库

export class ChildMap {
  /**
   * 构造函数
   * @param {Object} parent - 父级地图实例（主地图）
   * @param {Object} options - 配置项（包含adcode、中心点、地图数据等）
   */
  constructor(parent, options) {
    this.parent = parent                    // 父级地图实例
    this.instance = new Group()            // 子地图的根组
    this.instance.rotateX(-Math.PI / 2)    // 旋转到水平面
    this.instance.position.set(0, 0.2, 0)  // 设置微小高度，避免z冲突
    
    // 默认配置选项
    let defaultOptions = {
      adcode: 10000,                    // 行政区代码
      center: [0, 0],                   // 中心点坐标
      centroid: [0, 0],                 // 质心坐标
      childrenNum: 0,                   // 子区域数量
      parentBoxSize: [1, 1],            // 上级地图的尺寸
      mapData: {},                      // 地图数据（GeoJSON）
      geoProjectionCenter: [0, 0],      // 地理投影中心
      geoProjectionScale: 120,          // 地理投影缩放
      geoProjectionTranslate: [0, 0],   // 地理投影平移
    }
    this.options = Object.assign({}, defaultOptions, options)
    
    // 状态变量
    this.clicked = false         // 是否点击了（防止多次触发）
    this.scale = 1              // 当前缩放值
    this.boundBox = {}          // 地图的边界框信息
    this.areaData = []          // 区域数据（每个城市/区）
    
    // 标签和UI组件
    this.allAreaLabel = []      // 区域标签数组
    this.areaLabelGroup = new Group()  // 区域标签组
    this.areaPointGroup = new Group()  // 区域点组
    this.allInfoLabel = []      // 信息标签数组（弹窗）
    this.infoLabelGroup = new Group()  // 信息标签组
    
    // 将各个组添加到实例中
    this.instance.add(this.areaLabelGroup, this.areaPointGroup, this.infoLabelGroup)
    
    // 事件相关元素
    this.eventElement = []      // 可交互的地图区域Mesh
    this.pointEventElement = [] // 可交互的点元素
    
    // 初始化子地图
    this.init()
  }
  /**
   * 初始化子地图
   * 顺序：创建地图模型、添加标签、设置交互事件
   */
  init() {
    this.createModel()  // 创建地图模型
    this.addLabel()     // 添加区域标签和点
    
    // 如果有子区域，添加地图区域事件（如省下钻到市）
    if (this.options.childrenNum) {
      this.addEvent()
    }
    // 添加点标记事件（如弹窗）
    this.addPointEvent()
  }
  /**
   * 创建地图模型（挤出3D区域）
   */
  createModel() {
    let { map } = this.createMap()
    this.setScale(map)           // 缩放到合适大小
    map.setParent(this.instance) // 添加到场景
  }
  /**
   * 创建地图挤出模型
   * @returns {Object} map - ExtrudeMap实例
   */
  createMap() {
    // 读取地图数据
    let mapJsonData = this.options.mapData
    // 贴图资源
    let topNormal = this.parent.assets.instance.getResource("topNormal")
    topNormal.wrapS = topNormal.wrapT = RepeatWrapping

    // 地图边界线材质
    this.mapLineMaterial = new LineBasicMaterial({
      color: 0x2bc4dc,
      opacity: 0,
      transparent: true,
      fog: false,
    })
    // 省份顶面和侧面材质
    let [top, side] = this.parent.createProvinceMaterial()
    let topMaterial = top.clone()
    topMaterial.opacity = 1
    let sideMaterial = side.clone()
    sideMaterial.opacity = 1
    // 创建挤出地图
    let map = new ExtrudeMap(this.parent, {
      center: this.options.center,
      position: new Vector3(0, 0, 0.06),
      data: mapJsonData,
      depth: this.parent.depth,
      topFaceMaterial: topMaterial,
      sideMaterial: sideMaterial,
      lineMaterial: this.parent.mapLineMaterial,
      renderOrder: 9,
    })
    this.areaData = map.coordinates // 区域数据

    // 计算边界框，设置uv，收集可交互Mesh
    let { boxSize, box3 } = getBoundBox(map.mapGroup)
    map.mapGroup.children.map((group, index) => {
      group.children.map((mesh) => {
        if (mesh.type === "Mesh") {
          mesh.userData.type = "map"
          this.eventElement.push(mesh)
          this.parent.calcUv2(mesh.geometry, boxSize.x, boxSize.y, box3.min.x, box3.min.y)
        }
      })
    })

    return {
      map,
    }
  }

  /**
   * 添加地图区域交互事件（点击下钻、悬停高亮）
   */
  async addEvent() {
    let objectsHover = []

    // 悬停恢复
    const reset = (mesh) => {
      gsap.to(mesh.scale, {
        duration: 0.3,
        z: 1,
        onComplete: () => {
          mesh.traverse((obj) => {
            if (obj.isMesh) {
              obj.material[0].emissive.setHex(mesh.userData.materialEmissiveHex)
              obj.material[0].emissiveIntensity = 1
              obj.renderOrder = 9
            }
          })
        },
      })
      this.setLabelMove(mesh.userData.adcode, "down")
      this.setPointMove(mesh.userData.adcode, "down")
    }
    // 悬停高亮
    const move = (mesh) => {
      gsap.to(mesh.scale, {
        duration: 0.3,
        z: 1.5,
      })
      this.setLabelMove(mesh.userData.adcode)
      this.setPointMove(mesh.userData.adcode)
      mesh.traverse((obj) => {
        if (obj.isMesh) {
          obj.material[0].emissive.setHex(0x0b112d)
          obj.material[0].emissiveIntensity = 1.5
          obj.renderOrder = 21
        }
      })
    }
    // 循环为每个Mesh添加事件
    this.eventElement.map((mesh) => {
      this.parent.interactionManager.add(mesh)
      mesh.addEventListener("mousedown", async (event) => {
        if (this.clicked) return false
        this.clicked = true
        let userData = event.target.parent.userData
        // 沙坡头区adcode=640502，进入村镇级下钻
        if (userData.adcode === 640502) {
          const centroid = userData.centroid || userData.center || [105.19, 37.51]
          if (typeof this.drillToTown === 'function') {
            await this.drillToTown(userData.adcode, centroid)
          } else if (typeof ChildTownMap === 'function') {
            const townDrill = new ChildTownMap(this.parent, {
              adcode: userData.adcode,
              center: centroid,
              mapData: {},
              parentBoxSize: this.boundBox.boxSize ? [this.boundBox.boxSize.x, this.boundBox.boxSize.y] : [100, 100],
              geoProjectionCenter: centroid,
              geoProjectionScale: 80000,
              geoProjectionTranslate: [500, 400],
            })
            await townDrill.drillToTown(userData.adcode, centroid)
          }
          return
        }
        this.parent.history.push(userData)
        this.parent.loadChildMap(userData)
      })
      mesh.addEventListener("mouseup", (ev) => {
        this.clicked = false
      })
      mesh.addEventListener("mouseover", (event) => {
        if (!objectsHover.includes(event.target.parent)) {
          objectsHover.push(event.target.parent)
        }
        document.body.style.cursor = "pointer"
        move(event.target.parent)
      })
      mesh.addEventListener("mouseout", (event) => {
        objectsHover = objectsHover.filter((n) => n.userData.name !== event.target.parent.userData.name)
        if (objectsHover.length > 0) {
          const mesh = objectsHover[objectsHover.length - 1]
        }
        document.body.style.cursor = "default"
        reset(event.target.parent)
      })
    })
  }
  /**
   * 添加点标记交互事件（弹窗、悬停高亮）
   */
  addPointEvent() {
    let objectsHover = []
    this.pointEventElement.map((mesh) => {
      this.parent.interactionManager.add(mesh)
      mesh.addEventListener("mousedown", (event) => {
        if (this.clicked) return false
        this.clicked = true
        let userData = event.target.userData
        this.allInfoLabel.map((label, index) => {
          label.hide()
          if (userData.index === index) {
            label.show()
          }
        })
      })
      mesh.addEventListener("mouseup", (ev) => {
        this.clicked = false
      })
      mesh.addEventListener("mouseover", (event) => {
        if (!objectsHover.includes(event.target.parent)) {
          objectsHover.push(event.target.parent)
        }
        document.body.style.cursor = "pointer"
        let sprite = event.target
        sprite.material = this.pointHoverMaterial.clone()
      })
      mesh.addEventListener("mouseout", (event) => {
        objectsHover = objectsHover.filter((n) => n.userData.name !== event.target.parent.userData.name)
        if (objectsHover.length > 0) {
          const mesh = objectsHover[objectsHover.length - 1]
        }
        document.body.style.cursor = "default"
        let sprite = event.target
        sprite.material = this.pointDefaultMaterial.clone()
      })
    })
  }
  /**
   * 设置区域标签的动画移动（悬停上浮/还原）
   */
  setLabelMove(adcode, type = "up") {
    ;[...this.allAreaLabel].map((label) => {
      if (label.userData.adcode === adcode) {
        gsap.to(label.position, {
          duration: 0.3,
          z: type === "up" ? label.userData.position[2] + 3 / this.scale : label.userData.position[2],
        })
      }
    })
  }
  /**
   * 设置点的动画移动（悬停上浮/还原）
   */
  setPointMove(adcode, type = "up") {
    this.areaPointGroup.children.map((point) => {
      if (point.userData.adcode === adcode) {
        gsap.to(point.position, {
          duration: 0.3,
          z: type === "up" ? point.userData.position[2] + 3 / this.scale : point.userData.position[2],
        })
      }
    })
  }
  /**
   * 添加区域标签、点标记、信息弹窗
   */
  addLabel() {
    // 点贴图
    const texture = this.parent.assets.instance.getResource("point")
    const material = new SpriteMaterial({
      map: texture,
      color: 0xffffff,
      transparent: true,
      depthTest: false,
    })
    this.pointDefaultMaterial = material
    this.pointHoverMaterial = material.clone()
    this.pointHoverMaterial.color = new Color(0x00ffff)
    const sprite = new Sprite(material)
    sprite.renderOrder = 23
    // 为每个区域生成标签、点、弹窗
    this.areaData.map((item, index) => {
      let [x, y] = this.geoProjection(item.centroid)
      // 区域名称标签
      let nameLabel = this.labelNameStyle(item, index, new Vector3(x, -y, 0))
      this.allAreaLabel.push(nameLabel)
      // 信息弹窗
      let infoLabel = this.infoLabel(item, index, new Vector3(x, -y, 0))
      this.allInfoLabel.push(infoLabel)
      // 点标记
      let areaPoint = sprite.clone()
      sprite.material = material.clone()
      areaPoint.position.set(x, -y, 0)
      areaPoint.userData.adcode = item.adcode
      areaPoint.userData.type = "point"
      areaPoint.userData.name = item.name
      areaPoint.userData.position = [x, -y, 0]
      areaPoint.userData.index = index
      this.areaPointGroup.add(areaPoint)
    })
    // 缩放自适应
    this.setNameScale()
    this.setInfoScale()
    this.setPointScale()
  }
  /**
   * 生成信息弹窗（3D标签）
   */
  infoLabel(data, index, position) {
    let label3d = this.parent.label3d
    let label = label3d.create("", "info-point", true)
    label.init(
      ` <div class="info-point-wrap">
      <div class="info-point-wrap-inner">
        <div class="info-point-line">
          <div class="line"></div>
          <div class="line"></div>
          <div class="line"></div>
        </div>
        <div class="info-point-content">
          <div class="content-item"><span class="label">名称</span><span class="value">${data.name}</span></div>
          <div class="content-item"><span class="label">PM2.5</span><span class="value">100ug/m²</span></div>
          <div class="content-item"><span class="label">等级</span><span class="value">良好</span></div>
        </div>
      </div>
    </div>
  `,
      position
    )
    label3d.setLabelStyle(label, 0.06 / this.scale, "x")
    label.setParent(this.infoLabelGroup)
    label.hide()
    return label
  }
  /**
   * 生成区域名称标签（3D标签）
   */
  labelNameStyle(data, index, position) {
    let label3d = this.parent.label3d
    let label = label3d.create("", "area-name-label", true)
    label.init(`<div class="area-name-label-wrap">${data.name}</div>`, position)
    label3d.setLabelStyle(label, 0.08 / this.scale, "x")
    label.setParent(this.areaLabelGroup)
    label.userData.adcode = data.adcode
    label.userData.position = [position.x, position.y, position.z]
    return label
  }
  /**
   * 计算子地图缩放比例，使其适配父级地图区域
   */
  calculateScale(parentBoxSize, boxSize) {
    let xScale = parentBoxSize[0] / boxSize[0]
    let yScale = parentBoxSize[1] / boxSize[1]
    let scale = Math.min(xScale, yScale)
    return scale
  }
  /**
   * 设置子地图缩放与居中
   */
  setScale(map) {
    let { parentBoxSize } = this.options
    let boundBox = getBoundBox(map.mapGroup)
    let scale = this.calculateScale(parentBoxSize, [boundBox.boxSize.x, boundBox.boxSize.y])
    // 子地图缩放到主地图大小
    map.mapGroup.scale.set(scale, scale, 1)
    let boundBox1 = getBoundBox(map.mapGroup)
    // 放大后，中心坐标有偏移，反向移动
    map.mapGroup.position.x = -boundBox1.center.x
    map.mapGroup.position.y = -boundBox1.center.y
    this.scale = scale
    this.boundBox = boundBox1
  }
  /**
   * 区域名称标签缩放与居中
   */
  setNameScale() {
    this.areaLabelGroup.scale.set(this.scale, this.scale, this.scale)
    this.areaLabelGroup.position.x = -this.boundBox.center.x
    this.areaLabelGroup.position.y = -this.boundBox.center.y
    this.allAreaLabel.map((label) => {
      let z = (this.parent.depth + 0.4) / this.scale
      label.position.z = z
      label.position.y -= 1.5 / this.scale
      label.userData.position = [label.position.x, label.position.y, label.position.z]
    })
  }
  /**
   * 点标记缩放与居中
   */
  setPointScale() {
    this.areaPointGroup.scale.set(this.scale, this.scale, this.scale)
    this.areaPointGroup.position.x = -this.boundBox.center.x
    this.areaPointGroup.position.y = -this.boundBox.center.y
    this.areaPointGroup.children.map((point) => {
      let z = (this.parent.depth + 1.4) / this.scale
      point.position.z = z
      point.userData.position[2] = z
      point.scale.set(5 / this.scale, 5 / this.scale, 5 / this.scale)
      point.userData.position = [point.position.x, point.position.y, point.position.z]
      this.pointEventElement.push(point)
    })
  }
  /**
   * 信息弹窗缩放与居中
   */
  setInfoScale() {
    this.infoLabelGroup.scale.set(this.scale, this.scale, this.scale)
    this.infoLabelGroup.position.x = -this.boundBox.center.x
    this.infoLabelGroup.position.y = -this.boundBox.center.y
    this.infoLabelGroup.children.map((point) => {
      let z = (this.parent.depth + 10) / this.scale
      point.position.z = z
      point.scale.set(0.06 / this.scale, 0.06 / this.scale, 0.06 / this.scale)
    })
  }
  /**
   * 经纬度投影到平面坐标
   */
  geoProjection = (args) => {
    let { geoProjectionScale, geoProjectionTranslate, center } = this.options
    return geoMercator().center(center).scale(geoProjectionScale).translate(geoProjectionTranslate)(args)
  }
  /**
   * 添加到父级Group
   */
  setParent(parent) {
    parent.add(this.instance)
  }
  /**
   * 销毁子地图，解绑事件，清理资源
   */
  destroy() {
    ;[...this.allAreaLabel, ...this.allInfoLabel].map((label) => {
      label.remove()
    })
    this.removeElement(".area-name-label")
    this.removeElement(".info-point")
    ;[...this.eventElement, ...this.pointEventElement].map((mesh) => {
      this.parent.interactionManager.remove(mesh)
    })
    emptyObject(this.instance)
  }
  /**
   * 移除DOM元素
   */
  removeElement(elementClassName) {
    var elements = document.querySelectorAll(elementClassName)
    for (let i = 0; i < elements.length; i++) {
      const element = elements[i]
      const parent = element.parentNode
      parent.removeChild(element)
    }
  }
}

//todo: LJK_村镇级地图
/**
 * 村镇级地图
 * 1. 弹窗选择数据（文件选择或默认）
 * 2. 跳转到/town-map路由，并传递adcode参数
 * 3. 目标页面加载geojson数据，并渲染地图
 * 4. 可选：隐藏当前地图  
 */
export class ChildTownMap extends ChildMap {
  constructor(parent, options) {
    super(parent, options)
    this.adcode = options.adcode
    this.centroid = options.centroid
    this.mapData = options.mapData
    this.parentBoxSize = options.parentBoxSize
    this.geoProjectionCenter = options.geoProjectionCenter
    this.geoProjectionScale = options.geoProjectionScale
    this.geoProjectionTranslate = options.geoProjectionTranslate
    // 其它初始化
    this.drillToTown = this.drillToTown.bind(this)
    this.askForTownData = this.askForTownData.bind(this)
    this.setScale = this.setScale.bind(this)
    this.setNameScale = this.setNameScale.bind(this)
    this.setInfoScale = this.setInfoScale.bind(this)
    this.setPointScale = this.setPointScale.bind(this)
    this.geoProjection = this.geoProjection.bind(this)
    this.setParent = this.setParent.bind(this)
    this.destroy = this.destroy.bind(this)
    this.removeElement = this.removeElement.bind(this)
    this.calculateScale = this.calculateScale.bind(this)
    this.createModel = this.createModel.bind(this)
    this.createMap = this.createMap.bind(this)
    this.addEvent = this.addEvent.bind(this)
    this.addLabel = this.addLabel.bind(this)
    this.addPointEvent = this.addPointEvent.bind(this)
    this.setLabelMove = this.setLabelMove.bind(this)
    this.setPointMove = this.setPointMove.bind(this)
    this.infoLabel = this.infoLabel.bind(this)
    this.labelNameStyle = this.labelNameStyle.bind(this)
    this.init = this.init.bind(this)
  }

  // 重写下钻方法
  async drillToTown(adcode, centroid) {
    const geoData = await this.askForTownData()
    if (!geoData) return
    // ...路由跳转逻辑
    // 1. 弹窗选择数据（文件选择或默认）
    const result = await this.askForTownData()
    if (!result) return null
    // 2. 跳转到/town-map路由，并传递adcode参数
    let router = null
    if (typeof this.parent?.$router === 'object') {
      router = this.parent.$router
    } else if (window?.app?.config?.globalProperties?.$router) {
      router = window.app.config.globalProperties.$router
    } else if (window.$vueRouter) {
      router = window.$vueRouter
    }
    if (router) {
      router.push({
        path: '/town-map',
        query: { adcode: adcode }
      })  
      // 可选：如需传递geojson，可用全局store或sessionStorage
      sessionStorage.setItem('townMapGeoJSON', JSON.stringify(geoData))
      return
    }
    // 兼容：如果没有router，仍然可以直接渲染（降级方案）
    const townMap = new ChildTownMap(this.parent, {
      adcode,
      center: centroid,
      mapData: geoData,
      parentBoxSize: this.boundBox.boxSize ? [this.boundBox.boxSize.x, this.boundBox.boxSize.y] : [100, 100],
      geoProjectionCenter: centroid,
      geoProjectionScale: 80000,
      geoProjectionTranslate: [500, 400],
    })
    this.parent.scene.add(townMap.instance)
    // 可选：隐藏当前地图 
    this.parent.hide()
    // 村镇级地图加载完成后，调用村镇级地图的show方法，显示村镇级地图
    townMap.show()
    // 村镇级地图加载完成后，调用村镇级地图的addEvent方法，添加事件
    townMap.addEvent()
    // 村镇级地图加载完成后，调用村镇级地图的addLabel方法，添加标签
    townMap.addLabel()
    // 村镇级地图加载完成后，调用村镇级地图的addPointEvent方法，添加点标记事件
    townMap.addPointEvent()
    // 村镇级地图加载完成后，调用村镇级地图的setScale方法，设置缩放
    townMap.setScale()
    // 村镇级地图加载完成后，调用村镇级地图的setNameScale方法，设置名称标签缩放
    townMap.setNameScale()
    // 村镇级地图加载完成后，调用村镇级地图的setInfoScale方法，设置信息弹窗缩放
    townMap.setInfoScale()
    // 村镇级地图加载完成后，调用村镇级地图的setPointScale方法，设置点标记缩放
    townMap.setPointScale()
    // 村镇级地图加载完成后，调用村镇级地图的geoProjection方法，设置经纬度投影
    townMap.geoProjection()
    // 村镇级地图加载完成后，调用村镇级地图的setParent方法，添加到父级Group
    townMap.setParent(this.parent)
    // 村镇级地图加载完成后，调用村镇级地图的destroy方法，销毁子地图，解绑事件，清理资源
    townMap.destroy() 
  }

  // 弹窗选择数据
  async askForTownData() {
    function isValidGeoJSON(data) {
      if (!(data && data.type === 'FeatureCollection' && Array.isArray(data.features))) return false;
      // 检查每个feature的geometry和coordinates
      return data.features.every(f =>
        f && f.type === 'Feature' &&
        f.geometry && Array.isArray(f.geometry.coordinates)
      );
    }
    return new Promise((resolve) => {
      // 创建弹窗
      const modal = document.createElement('div')
      modal.style.cssText = 'position:fixed;top:30%;left:50%;transform:translate(-50%,-50%);background:#fff;padding:24px 32px;z-index:9999;border-radius:8px;box-shadow:0 4px 24px #0002;'
      modal.innerHTML = `
        <div style="font-size:18px;margin-bottom:12px;">请选择村镇级数据源</div>
        <button id="town-default-btn" style="margin-right:16px;">使用默认测试数据</button>
        <input type="file" id="town-file-input" accept=".json,.geojson" style="display:inline-block;">
        <button id="town-cancel-btn" style="margin-left:16px;">取消</button>
      `
      document.body.appendChild(modal)

      // 默认按钮
      modal.querySelector('#town-default-btn').onclick = async () => {
        const res = await fetch('/assets/testTownData/shapotou.json')
        const data = await res.json()
        if (!isValidGeoJSON(data)) {
          alert('默认数据格式错误或GeoJSON内部结构不完整，无法加载！')
          return
        }
        document.body.removeChild(modal)
        resolve(data)
      }
      // 文件选择
      modal.querySelector('#town-file-input').onchange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (evt) => {
          try {
            const data = JSON.parse(evt.target.result)
            if (!isValidGeoJSON(data)) {
              alert('文件不是标准GeoJSON（FeatureCollection）或内部结构不完整！')
              return
            }
            document.body.removeChild(modal)
            resolve(data)
          } catch (err) {
            alert('文件格式错误')
          }
        }
        reader.readAsText(file)
      }
      // 取消
      modal.querySelector('#town-cancel-btn').onclick = () => {
        document.body.removeChild(modal)
        resolve(null)
      }
    })
  }
}
