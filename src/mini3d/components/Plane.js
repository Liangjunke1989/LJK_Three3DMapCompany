/**
 * 平面组件
 * 创建简单的平面几何体，常用作基础形状或装饰元素
 * 
 * 主要功能：
 * - 创建可配置的平面几何体
 * - 支持位置、缩放、旋转设置
 * - 可选的旋转动画效果
 * - 自定义材质支持
 * 
 * 技术实现：
 * - 基于Three.js的PlaneGeometry
 * - 支持实时动画更新
 * - 简单的变换控制
 * 
 * 应用场景：
 * - 地面、水面等平面表现
 * - UI面板的3D显示
 * - 装饰性平面元素
 * - 简单的几何形状展示
 */

import { Vector3, PlaneGeometry, MeshBasicMaterial, Mesh } from "three"

export class Plane {
  /**
   * 构造函数 - 初始化平面对象
   * @param {Object} dependencies - 依赖对象
   * @param {Time} dependencies.time - 时间管理器
   * @param {Object} options - 平面配置选项
   * @param {number} options.width - 平面宽度
   * @param {number} options.scale - 整体缩放比例
   * @param {Vector3} options.position - 平面位置
   * @param {boolean} options.needRotate - 是否需要旋转动画
   * @param {number} options.rotateSpeed - 旋转速度
   * @param {MeshBasicMaterial} options.material - 平面材质
   */
  constructor({ time }, options) {
    this.time = time  // 时间管理器
    
    // 合并默认配置和用户配置
    this.options = Object.assign(
      {},
      {
        width: 10,                        // 平面宽度（正方形）
        scale: 1,                         // 整体缩放
        position: new Vector3(0, 0, 0),   // 平面位置
        needRotate: false,                // 是否启用旋转动画
        rotateSpeed: 0.001,               // 旋转速度（弧度/帧）
        
        // 默认材质配置
        material: new MeshBasicMaterial({
          transparent: true,              // 启用透明度
          opacity: 1,                     // 不透明度
          depthTest: true,                // 启用深度测试
        }),
      },
      options
    )
    
    // 创建平面几何体（正方形）
    let plane = new PlaneGeometry(this.options.width, this.options.width)
    
    // 创建网格对象
    let mesh = new Mesh(plane, this.options.material)
    
    // 旋转平面使其水平放置（默认是垂直的）
    mesh.rotateX(-Math.PI / 2)
    
    // 设置位置和缩放
    mesh.position.copy(this.options.position)
    mesh.scale.set(this.options.scale, this.options.scale, this.options.scale)
    
    // 保存网格实例
    this.instance = mesh
  }
  
  /**
   * 将平面添加到父对象并启动动画
   * @param {Object3D} parent - 父级3D对象
   */
  setParent(parent) {
    // 添加到父对象
    parent.add(this.instance)
    
    // 监听时间更新事件，启动动画循环
    this.time.on("tick", () => {
      this.update()
    })
  }
  
  /**
   * 更新动画
   * 处理旋转动画等实时更新
   */
  update() {
    // 如果启用了旋转动画
    if (this.options.needRotate) {
      // 绕Z轴旋转（因为平面已经旋转到水平，Z轴旋转相当于水平旋转）
      this.instance.rotation.z += this.options.rotateSpeed
    }
  }
}
