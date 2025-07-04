/**
 * 路径线组件
 * 根据地理数据创建平滑的3D路径线，用于展示路线、轨迹等信息
 * 
 * 主要功能：
 * - 基于Catmull-Rom曲线的平滑路径生成
 * - 支持多条路径的批量创建
 * - 动态纹理流动效果
 * - 地理坐标投影支持
 * - 可配置的管道样式
 * 
 * 技术实现：
 * - 使用CatmullRomCurve3创建平滑曲线
 * - TubeGeometry沿曲线生成管道几何体
 * - 纹理UV动画实现流动效果
 * - 地理坐标转换为3D世界坐标
 * 
 * 应用场景：
 * - 交通路线可视化
 * - 物流轨迹展示
 * - 历史路径回放
 * - 数据流向展示
 */

import { Group, Vector3, CatmullRomCurve3, MeshBasicMaterial, AdditiveBlending, Mesh, TubeGeometry } from "three"

export class PathLine {
  /**
   * 构造函数 - 初始化路径线系统
   * @param {Object} dependencies - 依赖对象
   * @param {Time} dependencies.time - 时间管理器
   * @param {Function} dependencies.geoProjection - 地理坐标投影函数
   * @param {Object} options - 路径线配置选项
   * @param {number} options.speed - 纹理流动速度
   * @param {Texture} options.texture - 流动纹理贴图
   * @param {number} options.radius - 管道半径
   * @param {number} options.segments - 曲线分段数
   * @param {number} options.radialSegments - 径向分段数
   * @param {Array} options.data - 路径数据数组
   * @param {number} options.renderOrder - 渲染顺序
   * @param {MeshBasicMaterial} options.material - 路径材质
   */
  constructor({ time, geoProjection }, options) {
    this.time = time                    // 时间管理器
    this.geoProjection = geoProjection  // 地理坐标投影函数
    this.instance = new Group()         // 路径线组容器
    this.run = true                     // 动画运行状态
    
    // 默认配置选项
    let defaultOptions = {
      speed: 0.003,                     // 纹理流动速度
      texture: null,                    // 流动纹理（需外部提供）
      radius: 0.1,                      // 管道半径
      segments: 32,                     // 曲线段数
      radialSegments: 8,                // 径向段数
      data: [],                         // 路径数据
      renderOrder: 1,                   // 渲染顺序
      
      // 默认材质配置
      material: new MeshBasicMaterial({
        color: 0xffffff,                // 白色
        transparent: true,              // 透明度
        fog: false,                     // 禁用雾效
        depthTest: false,               // 禁用深度测试
        blending: AdditiveBlending,     // 加法混合
      }),
    }
    
    this.options = Object.assign({}, defaultOptions, options)
    
    // 初始化路径线
    this.init()
  }
  
  /**
   * 初始化路径线系统
   * 根据数据创建所有路径线
   */
  init() {
    const { material, texture, segments, radius, radialSegments, data, speed, renderOrder } = this.options

    // 遍历路径数据，为每条路径创建3D线条
    data.map((path) => {
      let pathPoint = []
      
      // 将路径的地理坐标转换为3D坐标点数组
      path.geometry.coordinates.map((coord) => {
        coord[0].forEach((item) => {
          // 地理坐标投影转换
          let [x, y] = this.geoProjection(item)
          pathPoint.push(new Vector3(x, -y, 0))
        })
      })
      
      // 使用Catmull-Rom曲线创建平滑路径
      // Catmull-Rom曲线会通过所有控制点，生成平滑的插值曲线
      const curve = new CatmullRomCurve3(pathPoint)
      
      // 沿曲线创建管道几何体
      const tubeGeometry = new TubeGeometry(curve, segments, radius, radialSegments, false)
      
      // 创建路径网格对象
      const mesh = new Mesh(tubeGeometry, material)
      mesh.position.set(0, 0, 0)      // 重置位置
      mesh.renderOrder = renderOrder   // 设置渲染顺序
      
      // 添加到路径组
      this.instance.add(mesh)
    })

    // 启动纹理动画
    this.time.on("tick", (delta) => {
      if (this.run) {
        // 通过修改纹理偏移实现流动效果
        texture.offset.x += speed * delta
      }
    })
  }

  /**
   * 获取路径线组实例
   * @returns {Group} 路径线组对象
   */
  getInstance() {
    return this.instance
  }
  
  /**
   * 将路径线添加到父对象
   * @param {Object3D} parent - 父级3D对象
   */
  setParent(parent) {
    parent.add(this.instance)
  }
  
  /**
   * 设置路径线的显示/隐藏状态
   * @param {boolean} bool - true显示，false隐藏
   */
  set visible(bool) {
    this.instance.visible = bool  // 控制可见性
    this.run = bool               // 控制动画状态
  }
}
