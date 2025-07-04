/**
 * 地图挤出类
 * 用于将GeoJSON地图数据转换为3D挤出几何体
 * 
 * 主要功能：
 * - 将平面地图数据转换为具有深度的3D地图
 * - 支持自定义材质和挤出深度
 * - 生成地图轮廓线
 * - 处理地理坐标投影
 */

import {
  Mesh,                // 网格对象
  Vector2,             // 2D向量
  Vector3,             // 3D向量
  Group,               // 组对象
  Shape,               // 形状对象
  ExtrudeGeometry,     // 挤出几何体
  MeshBasicMaterial,   // 基础材质
  LineBasicMaterial,   // 线条材质
  LineLoop,            // 线圈
  BufferGeometry,      // 缓冲几何体
} from "three"
import { geoMercator } from "d3-geo"              // 地理投影
import { transfromMapGeoJSON } from "@/mini3d"    // 地图数据转换工具

export class ExtrudeMap {
  /**
   * 构造函数
   * @param {Object} dependencies - 依赖对象
   * @param {Object} config - 配置参数
   */
  constructor({ assets, time, geoProjection }, config = {}) {
    this.mapGroup = new Group()  // 地图组对象
    this.assets = assets         // 资源管理器
    this.time = time            // 时间管理器
    this.coordinates = []       // 坐标数据数组
    
    // 默认配置参数
    this.config = Object.assign(
      {
        position: new Vector3(0, 0, 0),        // 地图位置
        center: new Vector2(0, 0),             // 投影中心
        data: "",                              // 地图数据
        renderOrder: 1,                        // 渲染顺序
        topFaceMaterial: new MeshBasicMaterial({  // 地图顶面材质
          color: 0x18263b,
          transparent: true,
          opacity: 1,
        }),
        sideMaterial: new MeshBasicMaterial({     // 地图侧面材质
          color: 0x07152b,
          transparent: true,
          opacity: 1,
        }),
        lineMaterial: new LineBasicMaterial({ color: 0x2bc4dc }), // 线条材质
        depth: 0.1,                            // 挤出深度
      },
      config
    )
    
    // 设置地图组位置
    this.mapGroup.position.copy(this.config.position)

    // 转换地图数据并创建3D地图
    let mapData = transfromMapGeoJSON(this.config.data)
    this.create(mapData)
  }

  create(mapData) {
    let linesGroup = new Group()
    mapData.features.forEach((feature, groupIndex) => {
      // 获取属性中的名称，中心点，质心
      let { name, center = [], centroid = [], adcode } = feature.properties
      this.coordinates.push({
        name,
        center,
        centroid: feature.properties.centroid || feature.properties.center,
        adcode,
        enName: "",
        value: 0,
      })
      // 组
      const group = new Group()
      group.name = "meshGroup" + groupIndex
      // group.userData.index = groupIndex;
      // group.userData.name = name;
      // group.userData.adcode = adcode;
      group.userData = {
        index: groupIndex,
        name,
        center,
        centroid: feature.properties.centroid || feature.properties.center,
        adcode,
        childrenNum: feature.properties.childrenNum,
      }
      // 存材质的默认发光颜色
      group.userData.materialEmissiveHex = this.config.topFaceMaterial.emissive.getHex()
      // 线组
      let lineGroup = new Group()
      lineGroup.name = "lineGroup" + groupIndex
      lineGroup.userData.index = groupIndex
      lineGroup.userData.adcode = adcode
      // 拉伸设置
      const extrudeSettings = {
        depth: this.config.depth,
        bevelEnabled: true,
        bevelSegments: 1,
        bevelThickness: 0.1,
      }
      let materials = [this.config.topFaceMaterial.clone(), this.config.sideMaterial]
      feature.geometry.coordinates.forEach((multiPolygon) => {
        multiPolygon.forEach((polygon, index) => {
          // 绘制shape
          const shape = new Shape()
          for (let i = 0; i < polygon.length; i++) {
            if (!polygon[i][0] || !polygon[i][1]) {
              return false
            }
            const [x, y] = this.geoProjection(polygon[i])
            if (i === 0) {
              shape.moveTo(x, -y)
            }
            shape.lineTo(x, -y)
          }

          const geometry = new ExtrudeGeometry(shape, extrudeSettings)
          const mesh = new Mesh(geometry, materials)
          mesh.userData.depth = this.config.depth
          mesh.userData.name = name
          mesh.userData.adcode = adcode
          mesh.userData.materialEmissiveHex = this.config.topFaceMaterial.emissive.getHex()

          mesh.renderOrder = this.config.renderOrder
          group.add(mesh)
        })
        const points = []
        let line = null
        multiPolygon[0].forEach((item) => {
          const [x, y] = this.geoProjection(item)
          points.push(new Vector3(x, -y, 0))
          line = this.createLine(points)
        })
        lineGroup.add(line)
      })
      linesGroup.add(lineGroup)
      lineGroup.position.set(0, 0, this.config.depth + 0.11)
      group.add(lineGroup)
      this.mapGroup.add(group)
    })
  }
  createLine(points) {
    const geometry = new BufferGeometry()
    geometry.setFromPoints(points)
    let line = new LineLoop(geometry, this.config.lineMaterial)
    line.renderOrder = 2
    line.name = "mapLine"
    return line
  }
  geoProjection = (args) => {
    let { center } = this.config
    return geoMercator().center(center).scale(120).translate([0, 0])(args)
  }
  getCoordinates() {
    return this.coordinates
  }
  setParent(parent) {
    parent.add(this.mapGroup)
  }
}
