/**
 * 粒子系统组件
 * 创建动态的3D粒子效果，用于增强场景的视觉表现
 * 
 * 主要功能：
 * - 大量粒子的高性能渲染
 * - 可配置的粒子运动方向和速度
 * - 自定义粒子材质和颜色
 * - 循环动画系统
 * - GPU加速的顶点计算
 * 
 * 技术特点：
 * - 基于THREE.Points实现，性能优异
 * - 使用BufferGeometry优化内存使用
 * - 支持粒子颜色随机化
 * - 自动生成粒子纹理
 * - 支持加法混合实现发光效果
 * 
 * 应用场景：
 * - 雪花、雨点等天气效果
 * - 烟雾、火花等特效
 * - 装饰性背景粒子
 * - 数据可视化中的动态元素
 */

import { PointsMaterial, AdditiveBlending, BufferGeometry, BufferAttribute, Points, CanvasTexture } from "three"

export class Particles {
  /**
   * 构造函数 - 初始化粒子系统
   * @param {Object} dependencies - 依赖对象
   * @param {Time} dependencies.time - 时间管理器，用于动画更新
   * @param {Object} config - 粒子系统配置参数
   * @param {number} config.num - 粒子数量，默认100
   * @param {number} config.range - 粒子分布范围，默认500
   * @param {number} config.speed - 粒子运动速度，默认0.01
   * @param {number} config.renderOrder - 渲染顺序，默认99
   * @param {string} config.dir - 运动方向，"up"向上或"down"向下
   * @param {PointsMaterial} config.material - 粒子材质配置
   */
  constructor({ time }, config = {}) {
    this.instance = null    // 粒子系统实例
    this.time = time        // 时间管理器
    this.enable = true      // 动画启用开关
    
    // 合并默认配置和用户配置
    this.config = Object.assign(
      {
        num: 100,           // 粒子数量
        range: 500,         // 分布范围（立方体边长）
        speed: 0.01,        // 运动速度
        renderOrder: 99,    // 渲染顺序（高值后渲染）
        dir: "up",          // 运动方向：up-上升，down-下降
        
        // 默认粒子材质配置
        material: new PointsMaterial({
          map: Particles.createTexture(),    // 使用自生成的圆形纹理
          size: 20,                          // 粒子大小
          color: 0xffffff,                   // 基础颜色（白色）
          transparent: true,                 // 启用透明度
          opacity: 1.0,                      // 不透明度
          depthTest: false,                  // 禁用深度测试
          vertexColors: true,                // 启用顶点颜色
          blending: AdditiveBlending,        // 加法混合，实现发光效果
          sizeAttenuation: true,             // 粒子大小随距离衰减
        }),
      },
      config
    )

    // 创建粒子系统
    this.create()
  }
  
  /**
   * 创建粒子系统的几何体和材质
   * 生成随机分布的粒子位置、颜色和速度属性
   */
  create() {
    const { range, speed, dir, material, num, renderOrder } = this.config
    
    // 粒子属性数组
    const position = []     // 位置数组 [x, y, z, x, y, z, ...]
    const colors = []       // 颜色数组 [r, g, b, r, g, b, ...]
    const velocities = []   // 速度数组 [vx, vy, vz, vx, vy, vz, ...]
    
    // 生成每个粒子的属性
    for (let i = 0; i < num; i++) {
      // 生成随机初始位置（在range立方体范围内）
      position.push(
        Math.random() * range - range / 2,  // X坐标：-range/2 到 +range/2
        Math.random() * range - range / 2,  // Y坐标：-range/2 到 +range/2
        Math.random() * range - range / 2   // Z坐标：-range/2 到 +range/2
      )
      
      // 确定运动方向向量
      let dirVec = dir === "up" ? 1 : -1
      
      // 生成随机速度向量（主要在指定方向上运动）
      velocities.push(
        Math.random() * dirVec,              // X方向速度（随机摆动）
        (0.1 + Math.random()) * dirVec,      // Y方向速度（主运动方向）
        0.1 + Math.random() * dirVec         // Z方向速度（随机摆动）
      )
      
      // 生成随机颜色（基于材质颜色的亮度变化）
      const color = material.color.clone()
      let hsl = {}
      color.getHSL(hsl)  // 获取HSL颜色值
      color.setHSL(hsl.h, hsl.s, hsl.l * Math.random())  // 随机化亮度
      colors.push(color.r, color.g, color.b)
    }
    
    // 创建BufferGeometry并设置属性
    const geometry = new BufferGeometry()
    
    // 设置顶点位置属性
    geometry.setAttribute("position", new BufferAttribute(new Float32Array(position), 3))
    // 设置速度属性（自定义属性，用于动画计算）
    geometry.setAttribute("velocities", new BufferAttribute(new Float32Array(velocities), 3))
    // 设置顶点颜色属性
    geometry.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3))

    // 创建粒子系统实例
    this.instance = new Points(geometry, material)
    console.log(geometry)
    this.instance.renderOrder = renderOrder
  }
  
  /**
   * 静态方法：生成粒子纹理
   * 创建一个径向渐变的圆形纹理，用作粒子贴图
   * @returns {CanvasTexture} 生成的纹理对象
   */
  static createTexture() {
    // 创建Canvas元素
    let canvas = document.createElement("canvas")
    canvas.width = 1024
    canvas.height = 1024
    
    let context = canvas.getContext("2d")
    
    // 创建径向渐变（从中心到边缘）
    let gradient = context.createRadialGradient(512, 512, 0, 512, 512, 512)
    gradient.addColorStop(0, "rgba(255,255,255,1)")  // 中心：不透明白色
    gradient.addColorStop(1, "rgba(255,255,255,0)")  // 边缘：透明白色
    
    // 绘制渐变圆形
    context.fillStyle = gradient
    context.fillRect(0, 0, 1024, 1024)
    
    // 转换为Three.js纹理
    const texture = new CanvasTexture(canvas)
    return texture
  }
  
  /**
   * 粒子动画更新函数
   * 在每帧调用，更新粒子位置和循环逻辑
   * @param {number} delta - 帧间时间差（秒）
   * @param {number} elapsedTime - 累计时间（秒）
   */
  update(delta, elapsedTime) {
    if (!this.instance) return false
    
    const { range, speed, dir } = this.config
    
    // 运动方向向量
    let dirVec = dir === "up" ? 1 : -1
    
    // 获取几何体属性
    let position = this.instance.geometry.getAttribute("position")
    let velocities = this.instance.geometry.getAttribute("velocities")
    const count = position.count
    
    // 更新每个粒子
    for (let i = 0; i < count; i++) {
      // 获取当前粒子的位置
      let pos_x = position.getX(i)
      let pos_y = position.getY(i)
      let pos_z = position.getZ(i)
      
      // 获取粒子的速度
      let vel_x = velocities.getX(i)
      let vel_y = velocities.getY(i)
      let vel_z = velocities.getZ(i)
      
      // 更新位置：XY方向摆动，Z方向主运动
      pos_x += Math.sin(vel_x * elapsedTime) * delta  // X方向正弦波摆动
      // pos_y += Math.sin(vel_y * elapsedTime) * delta;  // Y方向摆动（注释掉）
      pos_z += speed * dirVec                         // Z方向匀速运动
      
      // 边界检查和循环：粒子超出范围时重置到对面
      if (pos_z > range / 2 && dirVec === 1) {
        pos_z = -range / 2  // 上升粒子超出上边界，重置到底部
      }
      if (pos_z < -range / 2 && dirVec == -1) {
        pos_z = range / 2   // 下降粒子超出下边界，重置到顶部
      }
      
      // 更新几何体属性
      position.setX(i, pos_x)
      // position.setY(i, pos_y);  // Y坐标保持不变
      position.setZ(i, pos_z)
      
      // 更新速度属性
      velocities.setX(i, vel_x)
      velocities.setY(i, vel_y)
    }
    
    // 标记属性需要更新到GPU
    position.needsUpdate = true
    velocities.needsUpdate = true
  }
  
  /**
   * 将粒子系统添加到父对象并启动动画
   * @param {Object3D} parent - 父级3D对象（如Scene、Group等）
   */
  setParent(parent) {
    // 添加到场景
    parent.add(this.instance)
    
    // 监听时间更新事件，启动动画循环
    this.time.on("tick", (delta, elapsedTime) => {
      if (this.enable) {
        this.update(delta, elapsedTime)
      }
    })
  }
}
