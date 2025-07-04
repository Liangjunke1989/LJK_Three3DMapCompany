/**
 * 飞线组件
 * 创建3D空间中的动态连线效果，常用于地图可视化中表示数据流向
 * 
 * 主要功能：
 * - 基于贝塞尔曲线的3D连线
 * - 动态纹理流动效果
 * - 批量管理多条飞线
 * - 可配置的弧形高度和样式
 * - 地理坐标投影支持
 * 
 * 技术实现：
 * - 使用QuadraticBezierCurve3创建曲线路径
 * - TubeGeometry沿曲线生成管道几何体
 * - 纹理UV动画实现流动效果
 * - 加法混合实现发光效果
 * 
 * 应用场景：
 * - 地图上的航线、迁移路径
 * - 数据流向可视化
 * - 网络连接图
 * - 物流路径展示
 */

import { Group, Vector3, QuadraticBezierCurve3, MeshBasicMaterial, AdditiveBlending, Mesh, TubeGeometry } from "three"

export class FlyLine {
  /**
   * 构造函数 - 初始化飞线系统
   * @param {Object} dependencies - 依赖对象
   * @param {Time} dependencies.time - 时间管理器，用于纹理动画
   * @param {Function} dependencies.geoProjection - 地理坐标投影函数
   * @param {Object} options - 飞线配置选项
   * @param {Array} options.centerPoint - 中心点坐标 [经度, 纬度]
   * @param {number} options.middleHeight - 飞线弧形的最高点高度
   * @param {number} options.speed - 纹理流动速度
   * @param {Texture} options.texture - 流动纹理贴图
   * @param {number} options.radius - 管道半径
   * @param {number} options.segments - 曲线分段数（影响平滑度）
   * @param {number} options.radialSegments - 径向分段数（影响圆度）
   * @param {Array} options.data - 目标点数据数组
   * @param {MeshBasicMaterial} options.material - 飞线材质
   */
  constructor({ time, geoProjection }, options) {
    this.time = time                    // 时间管理器
    this.geoProjection = geoProjection  // 地理坐标投影函数
    this.instance = new Group()         // 飞线组容器
    
    // 默认配置选项
    let defaultOptions = {
      centerPoint: [0, 0],              // 中心点坐标（经纬度）
      middleHeight: 15,                 // 飞线弧形高度
      speed: 0.003,                     // 纹理流动速度
      texture: null,                    // 流动纹理（需外部提供）
      radius: 0.1,                      // 管道半径
      segments: 32,                     // 曲线段数（越高越平滑）
      radialSegments: 8,                // 径向段数（圆管的边数）
      data: [],                         // 连线目标点数据
      
      // 默认材质配置
      material: new MeshBasicMaterial({
        color: 0xfbdf88,                // 金黄色
        transparent: true,              // 启用透明度
        fog: false,                     // 禁用雾效
        opacity: 1,                     // 不透明度
        depthTest: false,               // 禁用深度测试
        blending: AdditiveBlending,     // 加法混合，实现发光效果
      }),
    }
    
    this.options = Object.assign({}, defaultOptions, options)
    
    // 初始化飞线
    this.init()
  }
  
  /**
   * 初始化飞线系统
   * 根据数据创建从中心点到各目标点的飞线
   */
  init() {
    const { centerPoint, material, texture, segments, radius, radialSegments, data, speed, middleHeight } = this.options

    // 将中心点地理坐标转换为3D世界坐标
    let [centerX, centerY] = this.geoProjection(centerPoint)
    let centerPointVec = new Vector3(centerX, -centerY, 0)

    // 为每个目标点创建飞线
    data.map((city) => {
      // 将目标点地理坐标转换为3D世界坐标
      let [x, y] = this.geoProjection(city.centroid)
      let point = new Vector3(x, -y, 0)
      
      // 计算弧形中点位置
      const center = new Vector3()
      center.addVectors(centerPointVec, point).multiplyScalar(0.5)  // 取两点中点
      center.setZ(middleHeight)  // 设置弧形高度
      
      // 创建二次贝塞尔曲线（起点 -> 弧顶 -> 终点）
      const curve = new QuadraticBezierCurve3(centerPointVec, center, point)
      
      // 沿曲线创建管道几何体
      const tubeGeometry = new TubeGeometry(curve, segments, radius, radialSegments, false)
      
      // 创建飞线网格对象
      const mesh = new Mesh(tubeGeometry, material)
      mesh.position.set(0, 0, 0)     // 重置位置
      mesh.renderOrder = 21           // 设置渲染顺序（较高值后渲染）
      
      // 添加到飞线组
      this.instance.add(mesh)
    })

    // 启动纹理动画
    this.time.on("tick", () => {
      if (this.run) {
        // 通过移动纹理UV偏移实现流动效果
        texture.offset.x -= speed
      }
    })
  }

  /**
   * 获取飞线组实例
   * @returns {Group} 飞线组对象
   */
  getInstance() {
    return this.instance
  }
  
  /**
   * 将飞线添加到父对象
   * @param {Object3D} parent - 父级3D对象（如Scene、Group等）
   */
  setParent(parent) {
    parent.add(this.instance)
  }
  
  /**
   * 设置飞线的显示/隐藏状态
   * @param {boolean} bool - true显示，false隐藏
   */
  set visible(bool) {
    this.instance.visible = bool  // 控制整个飞线组的可见性
    this.run = bool               // 控制纹理动画的运行状态
  }
}
