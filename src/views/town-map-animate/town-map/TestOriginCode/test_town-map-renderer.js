/**
 * 村镇地图渲染器
 * 负责将GeoJSON数据转换为3D网格
 * 支持自定义材质、挤出深度、边界线等
 */
import {
  Mesh,
  Vector3,
  Group,
  Shape,
  ExtrudeGeometry,
  LineBasicMaterial,
  LineLoop,
  BufferGeometry,
} from "three"
import { geoMercator } from "d3-geo"
import { transfromMapGeoJSON } from "@/mini3d"

/**
 * 村镇地图渲染器
 * 负责将GeoJSON数据转换为3D网格
 * 支持自定义材质、挤出深度、边界线等
 */
export class TownMap {
  constructor(parent, config = {}) {
    this.parent = parent
    this.mapGroup = new Group()
    this.townMeshes = []
    this.coordinates = []
    
    this.config = Object.assign({
      center: [0, 0],
      data: {},
      depth: 1,
      topMaterial: null,
      sideMaterial: null,
      lineMaterial: null,
      renderOrder: 1
    }, config)
    
    this.create()
  }

  create() {
    const mapData = transfromMapGeoJSON(this.config.data)
    
    mapData.features.forEach((feature, index) => {
      const { name, center = [], centroid = [], adcode, population, area, gdp, childrenNum } = feature.properties
      
      // 存储坐标信息
      this.coordinates.push({
        name,
        center,
        centroid: centroid || center,
        adcode,
        population,
        area,
        gdp,
        childrenNum
      })
      
      // 创建村镇组
      const townGroup = new Group()
      townGroup.name = `town_${name}`
      townGroup.userData = {
        index,
        name,
        center,
        centroid: centroid || center,
        adcode,
        townData: feature.properties
      }
      
      // 拉伸设置
      const extrudeSettings = {
        depth: this.config.depth,
        bevelEnabled: true,
        bevelSegments: 2,
        bevelThickness: 0.1,
        bevelSize: 0.05
      }
      
      // 材质数组
      const materials = [
        this.config.topMaterial.clone(),
        this.config.sideMaterial.clone()
      ]
      
      // 根据人口数量调整颜色
      if (population) {
        const intensity = Math.min(population / 35000, 1) // 最大3.5万人
        const hue = 0.6 - intensity * 0.4 // 从蓝色到红色
        materials[0].color.setHSL(hue, 0.8, 0.6)
        materials[1].color.setHSL(hue, 0.8, 0.4)
      }
      
      // 处理几何体
      feature.geometry.coordinates.forEach((multiPolygon) => {
        multiPolygon.forEach((polygon) => {
          // 创建形状
          const shape = new Shape()
          
          for (let i = 0; i < polygon.length; i++) {
            if (!polygon[i][0] || !polygon[i][1]) continue
            
            const [x, y] = this.geoProjection(polygon[i])
            if (i === 0) {
              shape.moveTo(x, -y)
            } else {
              shape.lineTo(x, -y)
            }
          }
          
          // 创建拉伸几何体
          const geometry = new ExtrudeGeometry(shape, extrudeSettings)
          const mesh = new Mesh(geometry, materials)
          
          // 设置用户数据
          mesh.userData = {
            name,
            adcode,
            townData: feature.properties,
            materialEmissiveHex: materials[0].emissive.getHex()
          }
          
          mesh.renderOrder = this.config.renderOrder
          townGroup.add(mesh)
          
          // 创建边界线
          if (this.config.lineMaterial) {
            const linePoints = []
            polygon.forEach(point => {
              const [x, y] = this.geoProjection(point)
              linePoints.push(new Vector3(x, -y, this.config.depth + 0.05))
            })
            
            const lineGeometry = new BufferGeometry()
            lineGeometry.setFromPoints(linePoints)
            const line = new LineLoop(lineGeometry, this.config.lineMaterial.clone())
            line.renderOrder = this.config.renderOrder + 1
            townGroup.add(line)
          }
        })
      })
      
      this.mapGroup.add(townGroup)
      this.townMeshes.push(townGroup)
    })
  }

  // 地理投影
  geoProjection = (coordinates) => {
    return geoMercator()
      .center(this.config.center)
      .scale(this.config.scale || 15000) // 调整为合适的缩放比例
      .translate([0, 0])(coordinates)
  }

  // 计算地图边界框
  calculateBounds(geoData) {
    let minX = Infinity, maxX = -Infinity
    let minY = Infinity, maxY = -Infinity
    
    geoData.features.forEach(feature => {
      feature.geometry.coordinates.forEach(multiPolygon => {
        multiPolygon.forEach(polygon => {
          polygon.forEach(point => {
            const [x, y] = this.geoProjection(point)
            minX = Math.min(minX, x)
            maxX = Math.max(maxX, x)
            minY = Math.min(minY, y)
            maxY = Math.max(maxY, y)
          })
        })
      })
    })
    
    return {
      minX, maxX, minY, maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    }
  }

  // 获取地理投影函数
  getGeoProjection() {
    return this.geoProjection
  }

  // 获取村镇网格
  getTownMeshes() {
    return this.townMeshes
  }

  // 获取坐标数据
  getCoordinates() {
    return this.coordinates
  }

  // 设置父级
  setParent(parent) {
    parent.add(this.mapGroup)
  }

  // 销毁
  destroy() {
    this.mapGroup.clear()
    this.townMeshes = []
    this.coordinates = []
  }
} 