/**
 * 统一数据加载器 - 支持JSON和GeoJSON格式
 */
export class DataLoader {
  /**
   * 加载本地数据文件
   * @param {string} filePath - 文件路径
   * @returns {Promise<Object>} - 解析后的数据
   */
  static async loadLocalData(filePath) {
    try {
      console.log(`开始加载数据文件: ${filePath}`)
      const response = await fetch(filePath)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
      
      const text = await response.text()
      if (!text.trim()) {
        throw new Error('文件内容为空')
      }
      
      let data
      try {
        data = JSON.parse(text)
      } catch (parseError) {
        throw new Error(`JSON解析失败: ${parseError.message}`)
      }
      
      console.log(`数据类型: ${data.type || 'unknown'}, 特征数量: ${data.features?.length || 'unknown'}`)
      return this.normalizeGeoData(data)
    } catch (error) {
      console.error(`数据加载失败 [${filePath}]:`, error.message)
      throw error
    }
  }

  /**
   * 从URL加载数据
   * @param {string} url - 数据URL
   * @returns {Promise<Object>} - 解析后的数据
   */
  static async loadFromUrl(url) {
    return this.loadLocalData(url)
  }

  /**
   * 加载内置测试数据
   * @returns {Object} - 标准化的GeoJSON数据
   */
  static getBuiltinTownData() {
    const data = {
      "type": "FeatureCollection",
      "features": [
        {
          "type": "Feature",
          "properties": {
            "name": "文昌镇",
            "adcode": "640502001",
            "center": [105.189, 37.503],
            "centroid": [105.189, 37.503],
            "childrenNum": 15,
            "level": "town",
            "population": 25000,
            "area": 125.5,
            "gdp": 8.5,
            "villages": [
              { name: "文昌村", population: 3200, type: "中心村" },
              { name: "东河村", population: 2800, type: "普通村" },
              { name: "西山村", population: 2100, type: "山区村" },
              { name: "南街村", population: 3800, type: "集镇村" },
              { name: "北园村", population: 2400, type: "普通村" }
            ]
          },
          "geometry": {
            "type": "MultiPolygon",
            "coordinates": [
              [
                [
                  [105.15, 37.52],
                  [105.25, 37.52],
                  [105.25, 37.48],
                  [105.20, 37.46],
                  [105.15, 37.48],
                  [105.15, 37.52]
                ]
              ]
            ]
          }
        },
        {
          "type": "Feature",
          "properties": {
            "name": "东园镇",
            "adcode": "640502002",
            "center": [105.245, 37.485],
            "centroid": [105.245, 37.485],
            "childrenNum": 12,
            "level": "town",
            "population": 18000,
            "area": 98.2,
            "gdp": 6.8,
            "villages": [
              { name: "东园村", population: 2500, type: "中心村" },
              { name: "新村", population: 2200, type: "普通村" },
              { name: "老村", population: 1800, type: "历史村" },
              { name: "河滨村", population: 3100, type: "水利村" }
            ]
          },
          "geometry": {
            "type": "MultiPolygon",
            "coordinates": [
              [
                [
                  [105.22, 37.50],
                  [105.28, 37.50],
                  [105.28, 37.46],
                  [105.22, 37.46],
                  [105.22, 37.50]
                ]
              ]
            ]
          }
        },
        {
          "type": "Feature",
          "properties": {
            "name": "兴仁镇",
            "adcode": "640502003",
            "center": [105.165, 37.445],
            "centroid": [105.165, 37.445],
            "childrenNum": 18,
            "level": "town",
            "population": 32000,
            "area": 156.8,
            "gdp": 12.3,
            "villages": [
              { name: "兴仁村", population: 4200, type: "中心村" },
              { name: "富民村", population: 3600, type: "富裕村" },
              { name: "农业村", population: 2900, type: "农业村" },
              { name: "工业村", population: 5100, type: "工业村" },
              { name: "商贸村", population: 3800, type: "商贸村" },
              { name: "生态村", population: 2200, type: "生态村" }
            ]
          },
          "geometry": {
            "type": "MultiPolygon",
            "coordinates": [
              [
                [
                  [105.13, 37.47],
                  [105.20, 37.47],
                  [105.20, 37.42],
                  [105.13, 37.42],
                  [105.13, 37.47]
                ]
              ]
            ]
          }
        }
      ]
    }

    return this.normalizeGeoData(data)
  }

  /**
   * 获取村级数据（模拟层级钻取）
   * @param {string} townName - 镇名称
   * @returns {Object} - 村级GeoJSON数据
   */
  static getVillageData(townName) {
    const villageDataMap = {
      "文昌镇": {
        "type": "FeatureCollection",
        "features": [
          {
            "type": "Feature",
            "properties": {
              "name": "文昌村",
              "parentTown": "文昌镇",
              "population": 3200,
              "area": 25.5,
              "type": "中心村",
              "level": "village",
              "households": 820,
              "income": 15000
            },
            "geometry": {
              "type": "MultiPolygon", 
              "coordinates": [
                [
                  [
                    [105.17, 37.51],
                    [105.20, 37.51],
                    [105.20, 37.49],
                    [105.17, 37.49],
                    [105.17, 37.51]
                  ]
                ]
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "东河村",
              "parentTown": "文昌镇",
              "population": 2800,
              "area": 22.8,
              "type": "普通村",
              "level": "village",
              "households": 710,
              "income": 12500
            },
            "geometry": {
              "type": "MultiPolygon",
              "coordinates": [
                [
                  [
                    [105.20, 37.51],
                    [105.23, 37.51],
                    [105.23, 37.49],
                    [105.20, 37.49],
                    [105.20, 37.51]
                  ]
                ]
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "西山村",
              "parentTown": "文昌镇",
              "population": 2100,
              "area": 35.2,
              "type": "山区村",
              "level": "village",
              "households": 530,
              "income": 10800
            },
            "geometry": {
              "type": "MultiPolygon",
              "coordinates": [
                [
                  [
                    [105.15, 37.51],
                    [105.17, 37.51],
                    [105.17, 37.48],
                    [105.15, 37.48],
                    [105.15, 37.51]
                  ]
                ]
              ]
            }
          }
        ]
      },
      "东园镇": {
        "type": "FeatureCollection",
        "features": [
          {
            "type": "Feature",
            "properties": {
              "name": "东园村",
              "parentTown": "东园镇",
              "population": 2500,
              "area": 18.6,
              "type": "中心村",
              "level": "village",
              "households": 630,
              "income": 14200
            },
            "geometry": {
              "type": "MultiPolygon",
              "coordinates": [
                [
                  [
                    [105.24, 37.49],
                    [105.26, 37.49],
                    [105.26, 37.47],
                    [105.24, 37.47],
                    [105.24, 37.49]
                  ]
                ]
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "河滨村",
              "parentTown": "东园镇",
              "population": 3100,
              "area": 28.4,
              "type": "水利村",
              "level": "village",
              "households": 780,
              "income": 16800
            },
            "geometry": {
              "type": "MultiPolygon",
              "coordinates": [
                [
                  [
                    [105.26, 37.49],
                    [105.28, 37.49],
                    [105.28, 37.47],
                    [105.26, 37.47],
                    [105.26, 37.49]
                  ]
                ]
              ]
            }
          }
        ]
      },
      "兴仁镇": {
        "type": "FeatureCollection", 
        "features": [
          {
            "type": "Feature",
            "properties": {
              "name": "兴仁村",
              "parentTown": "兴仁镇",
              "population": 4200,
              "area": 32.1,
              "type": "中心村",
              "level": "village",
              "households": 1050,
              "income": 18500
            },
            "geometry": {
              "type": "MultiPolygon",
              "coordinates": [
                [
                  [
                    [105.15, 37.46],
                    [105.17, 37.46],
                    [105.17, 37.44],
                    [105.15, 37.44],
                    [105.15, 37.46]
                  ]
                ]
              ]
            }
          },
          {
            "type": "Feature",
            "properties": {
              "name": "工业村",
              "parentTown": "兴仁镇",
              "population": 5100,
              "area": 28.9,
              "type": "工业村",
              "level": "village",
              "households": 1280,
              "income": 22300
            },
            "geometry": {
              "type": "MultiPolygon",
              "coordinates": [
                [
                  [
                    [105.17, 37.46],
                    [105.19, 37.46],
                    [105.19, 37.44],
                    [105.17, 37.44],
                    [105.17, 37.46]
                  ]
                ]
              ]
            }
          }
        ]
      }
    }

    const data = villageDataMap[townName] || villageDataMap["文昌镇"]
    return this.normalizeGeoData(data)
  }

  /**
   * 标准化地理数据格式
   * @param {Object} data - 原始数据
   * @returns {Object} - 标准化后的GeoJSON数据
   */
  static normalizeGeoData(data) {
    console.log('开始标准化数据格式...')
    let result
    
    // 如果已经是标准GeoJSON格式
    if (data.type === "FeatureCollection" && data.features) {
      result = this.ensurePolygonFormat(data)
    } 
    // 如果是数组格式
    else if (Array.isArray(data)) {
      result = {
        type: "FeatureCollection",
        features: data.map(item => this.convertToFeature(item))
      }
    } 
    // 如果是单个Feature
    else if (data.type === "Feature") {
      result = {
        type: "FeatureCollection",
        features: [data]
      }
    }
    // 如果是原项目的省份数据格式（包含features属性但结构不同）
    else if (data.features && Array.isArray(data.features)) {
      result = {
        type: "FeatureCollection",
        features: data.features.map(item => this.convertToFeature(item))
      }
    }
    // 如果是对象但不是标准格式，尝试转换
    else if (typeof data === 'object' && data !== null) {
      result = {
        type: "FeatureCollection",
        features: [this.convertToFeature(data)]
      }
    }
    else {
      throw new Error(`不支持的数据格式: ${typeof data}`)
    }

    // 确保所有 features 都有必要的属性
    result.features = result.features.map((feature, index) => {
      // 确保有properties
      if (!feature.properties) {
        feature.properties = {}
      }
      
      // 确保有name
      if (!feature.properties.name) {
        feature.properties.name = `区域${index + 1}`
      }
      
      // 确保有centroid
      if (!feature.properties.centroid) {
        feature.properties.centroid = this.calculateCentroid(feature.geometry)
      }
      
      // 确保有center（兼容性）
      if (!feature.properties.center && feature.properties.centroid) {
        feature.properties.center = feature.properties.centroid
      }
      
      // 设置默认的人口数据
      if (!feature.properties.population) {
        feature.properties.population = Math.floor(Math.random() * 50000) + 10000
      }
      
      return feature
    })

    console.log(`标准化完成，共处理 ${result.features.length} 个地理要素`)
    return result
  }

  /**
   * 计算几何体的质心
   * @param {Object} geometry - GeoJSON几何体
   * @returns {Array} - [longitude, latitude]
   */
  static calculateCentroid(geometry) {
    if (geometry.type === "MultiPolygon") {
      // 获取第一个多边形的第一个环
      const coords = geometry.coordinates[0][0]
      
      let x = 0, y = 0
      for (let i = 0; i < coords.length - 1; i++) {
        x += coords[i][0]
        y += coords[i][1]
      }
      
      return [
        x / (coords.length - 1),
        y / (coords.length - 1)
      ]
    } else if (geometry.type === "Polygon") {
      // 处理单个多边形
      const coords = geometry.coordinates[0]
      
      let x = 0, y = 0
      for (let i = 0; i < coords.length - 1; i++) {
        x += coords[i][0]
        y += coords[i][1]
      }
      
      return [
        x / (coords.length - 1),
        y / (coords.length - 1)
      ]
    }
    
    // 默认返回
    return [0, 0]
  }

  /**
   * 确保所有Polygon都是MultiPolygon格式
   * @param {Object} geoData - GeoJSON数据
   * @returns {Object} - 标准化后的GeoJSON数据
   */
  static ensurePolygonFormat(geoData) {
    const features = geoData.features.map(feature => {
      if (feature.geometry.type === "Polygon") {
        feature.geometry.type = "MultiPolygon"
        feature.geometry.coordinates = [feature.geometry.coordinates]
      }
      return feature
    })

    return {
      ...geoData,
      features
    }
  }

  /**
   * 转换数据项为GeoJSON Feature
   * @param {Object} item - 数据项
   * @returns {Object} - GeoJSON Feature
   */
  static convertToFeature(item) {
    // 如果已经是Feature格式，直接返回
    if (item.type === "Feature") {
      return item
    }
    
    // 从各种可能的字段中提取名称
    const name = item.name || 
                 item.properties?.name || 
                 item.NAME || 
                 item.properties?.NAME ||
                 "未知区域"
    
    // 提取或构造properties
    let properties = {
      name: name,
      ...(item.properties || {}),
      // 从顶级字段复制到properties中
      ...(item.adcode && { adcode: item.adcode }),
      ...(item.center && { center: item.center }),
      ...(item.centroid && { centroid: item.centroid }),
      ...(item.population && { population: item.population }),
      ...(item.area && { area: item.area })
    }
    
    // 提取几何体
    let geometry = item.geometry
    
    // 如果没有几何体，尝试从其他字段构造
    if (!geometry) {
      // 如果有坐标信息，尝试构造简单的几何体
      if (item.center || item.centroid) {
        const coord = item.center || item.centroid
        geometry = {
          type: "Point",
          coordinates: coord
        }
      } else {
        // 默认几何体
        geometry = {
          type: "MultiPolygon",
          coordinates: [[[[105, 37], [106, 37], [106, 38], [105, 38], [105, 37]]]]
        }
      }
    }
    
    return {
      type: "Feature",
      properties: properties,
      geometry: geometry
    }
  }

  /**
   * 加载沙坡头区镇级数据
   * @returns {Promise<Object>} - 标准化的GeoJSON数据
   */
  static async loadShapotouTowns() {
    try {
      const data = await this.loadLocalData('/assets/testTownData/shapotou.json')
      console.log('沙坡头区镇级数据加载完成')
      return data
    } catch (error) {
      console.error('沙坡头区镇级数据加载失败:', error)
      throw error
    }
  }

  /**
   * 加载沙坡头区轮廓数据
   * @returns {Promise<Object>} - 标准化的GeoJSON数据
   */
  static async loadShapotouOutline() {
    try {
      const data = await this.loadLocalData('/assets/testTownData/沙坡头区轮廓.json')
      console.log('沙坡头区轮廓数据加载完成')
      return data
    } catch (error) {
      console.error('沙坡头区轮廓数据加载失败:', error)
      throw error
    }
  }
} 