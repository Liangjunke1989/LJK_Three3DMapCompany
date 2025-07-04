/**
 * 网格地面组件
 * 创建带有装饰效果的3D地面网格，提升场景的空间感和科技感
 * 
 * 主要功能：
 * - 基础网格线的显示
 * - 自定义形状阵列装饰（如+号形状）
 * - 点阵列装饰效果
 * - 可选的扩散动画效果
 * - 多种混合模式支持
 * 
 * 技术特点：
 * - 使用BufferGeometryUtils优化性能
 * - 几何体合并减少绘制调用
 * - 支持着色器特效
 * - 分层渲染控制
 * 
 * 应用场景：
 * - 科技风地面装饰
 * - 数据可视化背景
 * - 游戏场景地面
 * - 展示空间的基础网格
 */

import {
  Mesh,                    // 网格对象
  DoubleSide,             // 双面材质
  Vector2,                // 2D向量
  Shape,                  // 形状对象
  ShapeGeometry,          // 形状几何体
  MeshBasicMaterial,      // 基础材质
  GridHelper,             // 网格助手
  Group,                  // 组对象
  BufferGeometry,         // 缓冲几何体
  BufferAttribute,        // 缓冲属性
  PointsMaterial,         // 点材质
  Points,                 // 点对象
  AdditiveBlending,       // 加法混合
  NormalBlending,         // 正常混合
  MultiplyBlending,       // 乘法混合
  Vector3,                // 3D向量
} from "three"
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils"  // 几何体合并工具
import { DiffuseShader } from "../shader/DiffuseShader"  // 扩散着色器

export class Grid {
  /**
   * 构造函数 - 初始化网格地面
   * @param {Object} dependencies - 依赖对象
   * @param {Scene} dependencies.scene - 3D场景
   * @param {Time} dependencies.time - 时间管理器
   * @param {Object} options - 网格配置选项
   * @param {Vector3} options.position - 网格位置
   * @param {number} options.gridSize - 网格总尺寸
   * @param {number} options.gridDivision - 网格分割数
   * @param {number} options.gridColor - 网格线颜色
   * @param {number} options.shapeSize - 装饰形状大小
   * @param {number} options.shapeColor - 装饰形状颜色
   * @param {number} options.pointSize - 点的大小
   * @param {number} options.pointColor - 点的颜色
   * @param {Object} options.pointLayout - 点阵列布局 {row, col}
   * @param {number} options.pointBlending - 点的混合模式
   * @param {boolean} options.diffuse - 是否启用扩散效果
   * @param {number} options.diffuseSpeed - 扩散速度
   * @param {number} options.diffuseColor - 扩散颜色
   * @param {number} options.diffuseWidth - 扩散宽度
   */
  constructor({ scene, time }, options) {
    this.scene = scene      // 3D场景
    this.time = time        // 时间管理器
    this.instance = null    // 网格组实例
    
    // 默认配置选项
    let defaultOptions = {
      position: new Vector3(0, 0, 0),    // 网格位置
      gridSize: 100,                     // 网格总尺寸
      gridDivision: 20,                  // 网格分割数（线条数量）
      gridColor: 0x28373a,               // 网格线颜色（深青色）
      shapeSize: 1,                      // 装饰形状大小
      shapeColor: 0x8e9b9e,              // 装饰形状颜色（灰色）
      pointSize: 0.2,                    // 点的大小
      pointColor: 0x28373a,              // 点的颜色
      pointLayout: {                     // 点阵列布局
        row: 200,                        // 行数
        col: 200,                        // 列数
      },
      pointBlending: NormalBlending,     // 点的混合模式
      diffuse: false,                    // 是否启用扩散效果
      diffuseSpeed: 15.0,                // 扩散动画速度
      diffuseColor: 0x8e9b9e,            // 扩散效果颜色
      diffuseWidth: 10.0,                // 扩散范围宽度
    }
    
    this.options = Object.assign({}, defaultOptions, options)
    
    // 初始化网格
    this.init()
  }
  
  /**
   * 初始化网格系统
   * 创建网格线、装饰形状和点阵列，并组合为完整的地面网格
   */
  init() {
    let group = new Group()
    group.name = "Grid"
    
    // 创建各个组件
    let grid = this.createGridHelp()    // 基础网格线
    let shapes = this.createShapes()    // 装饰形状阵列
    let points = this.createPoint()     // 点阵列
    
    // 添加到组中
    group.add(grid, shapes, points)
    
    // 设置组的位置
    group.position.copy(this.options.position)
    
    this.instance = group
    this.scene.add(group)
  }
  
  /**
   * 创建装饰形状阵列
   * 在网格交点处放置+号形状，增强视觉效果
   * @returns {Mesh} 合并后的形状网格
   */
  createShapes() {
    let { gridSize, gridDivision, shapeSize, shapeColor } = this.options
    
    // 计算形状间距
    let shapeSpace = gridSize / gridDivision
    let range = gridSize / 2
    
    // 创建形状材质
    let shapeMaterial = new MeshBasicMaterial({ 
      color: shapeColor, 
      side: DoubleSide    // 双面显示
    })
    
    let shapeGeometrys = []
    
    // 在网格交点处创建形状
    for (let i = 0; i < gridDivision + 1; i++) {
      for (let j = 0; j < gridDivision + 1; j++) {
        // 创建+号形状几何体
        let shapeGeometry = this.createPlus(shapeSize)
        
        // 移动到对应的网格交点位置
        shapeGeometry.translate(
          -range + i * shapeSpace,   // X位置
          -range + j * shapeSpace,   // Y位置
          0                          // Z位置（在地面上）
        )
        
        shapeGeometrys.push(shapeGeometry)
      }
    }

    // 合并所有形状几何体以优化性能
    let geometry = mergeGeometries(shapeGeometrys)
    let shapeMesh = new Mesh(geometry, shapeMaterial)
    
    shapeMesh.renderOrder = -1              // 设置渲染顺序（负值先渲染）
    shapeMesh.rotateX(-Math.PI / 2)         // 旋转90度使其平躺在地面
    shapeMesh.position.y += 0.01            // 稍微抬高避免Z-fighting
    
    return shapeMesh
  }
  
  /**
   * 创建基础网格助手
   * 使用Three.js内置的GridHelper创建网格线
   * @returns {GridHelper} 网格助手对象
   */
  createGridHelp() {
    let { gridSize, gridDivision, gridColor } = this.options
    
    // 创建网格助手（尺寸，分割数，中心线颜色，网格线颜色）
    let gridHelp = new GridHelper(gridSize, gridDivision, gridColor, gridColor)
    
    return gridHelp
  }
  
  /**
   * 创建点阵列装饰
   * 在地面创建规律分布的点阵，增强科技感
   * @returns {Points} 点对象
   */
  createPoint() {
    let { gridSize, pointSize, pointColor, pointBlending, pointLayout, diffuse } = this.options
    
    const rows = pointLayout.row    // 行数
    const cols = pointLayout.col    // 列数
    
    // 创建位置数组
    const positions = new Float32Array(rows * cols * 3)
    
    // 生成点阵位置
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        // 计算每个点的3D坐标
        let x = (i / (rows - 1)) * gridSize - gridSize / 2   // X坐标：从-gridSize/2到+gridSize/2
        let y = 0                                             // Y坐标：在地面上
        let z = (j / (cols - 1)) * gridSize - gridSize / 2   // Z坐标：从-gridSize/2到+gridSize/2
        
        let index = (i * cols + j) * 3
        positions[index] = x
        positions[index + 1] = y
        positions[index + 2] = z
      }
    }
    
    // 创建BufferGeometry并设置位置属性
    var geometry = new BufferGeometry()
    geometry.setAttribute("position", new BufferAttribute(positions, 3))

    // 创建点材质
    let material = new PointsMaterial({
      size: pointSize,              // 点的大小
      sizeAttenuation: true,        // 点大小随距离衰减
      color: pointColor,            // 点的颜色
      blending: pointBlending,      // 混合模式
    })
    
    // 创建点对象
    const particles = new Points(geometry, material)
    
    // 如果启用扩散效果，应用扩散着色器
    if (diffuse) {
      this.diffuseShader(material)
    }
    
    return particles
  }

  /**
   * 应用扩散着色器效果
   * 为点阵列添加涟漪扩散动画
   * @param {PointsMaterial} material - 点材质
   */
  diffuseShader(material) {
    let { gridSize, diffuseColor, diffuseSpeed, diffuseWidth } = this.options
    
    // 创建并应用扩散着色器
    new DiffuseShader({ 
      material, 
      time: this.time, 
      size: gridSize, 
      diffuseColor, 
      diffuseSpeed, 
      diffuseWidth 
    })
    
    return false
  }
  
  /**
   * 创建+号形状几何体
   * 生成十字形状的2D几何体
   * @param {number} shapeSize - 形状大小
   * @returns {ShapeGeometry} 形状几何体
   */
  createPlus(shapeSize = 50) {
    // 计算+号的尺寸参数
    let w = shapeSize / 6 / 3    // 横臂宽度
    let h = shapeSize / 3        // 横臂长度
    
    // 定义+号的顶点坐标（按逆时针顺序）
    let points = [
      new Vector2(-h, -w),    // 左下
      new Vector2(-w, -w),    // 中下左
      new Vector2(-w, -h),    // 下左
      new Vector2(w, -h),     // 下右
      new Vector2(w, -h),     // 下右（重复点）
      new Vector2(w, -w),     // 中下右
      new Vector2(h, -w),     // 右下
      new Vector2(h, w),      // 右上
      new Vector2(w, w),      // 中上右
      new Vector2(w, h),      // 上右
      new Vector2(-w, h),     // 上左
      new Vector2(-w, w),     // 中上左
      new Vector2(-h, w),     // 左上
    ]
    
    // 创建形状对象
    let shape = new Shape(points)
    
    // 创建形状几何体（24个分段保证平滑度）
    let shapeGeometry = new ShapeGeometry(shape, 24)
    
    return shapeGeometry
  }
}
