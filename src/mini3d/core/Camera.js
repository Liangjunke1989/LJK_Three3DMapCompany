/**
 * 相机管理类
 * 负责创建和管理3D场景中的透视相机和控制器
 * 
 * 主要功能：
 * - 创建透视相机并设置基本参数
 * - 集成轨道控制器(OrbitControls)提供交互功能
 * - 响应窗口尺寸变化自动调整相机参数
 * - 管理相机的更新和销毁
 */

import { PerspectiveCamera } from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls"

export class Camera {
  /**
   * 构造函数 - 初始化相机系统
   * @param {Object} dependencies - 依赖对象
   * @param {Sizes} dependencies.sizes - 尺寸管理器
   * @param {Scene} dependencies.scene - 3D场景
   * @param {HTMLCanvasElement} dependencies.canvas - 画布元素
   */
  constructor({ sizes, scene, canvas }) {
    this.sizes = sizes       // 尺寸管理器，用于获取画布尺寸
    this.scene = scene       // 3D场景对象
    this.canvas = canvas     // 画布DOM元素
    
    // 初始化相机和控制器
    this.setInstance()
    this.setControls()
  }
  
  /**
   * 创建透视相机实例
   * 设置相机的基本参数并添加到场景中
   */
  setInstance() {
    // 计算相机宽高比
    let aspect = this.sizes.width / this.sizes.height
    
    // 创建透视相机
    // 参数：视野角度(45°), 宽高比, 近裁剪面(0.1), 远裁剪面(2000)
    this.instance = new PerspectiveCamera(45, aspect, 0.1, 2000)
    
    // 设置相机初始位置
    this.instance.position.set(10, 10, 10)

    // 将相机添加到场景中
    this.scene.add(this.instance)
  }
  
  /**
   * 设置轨道控制器
   * 提供鼠标/触摸交互功能，如旋转、缩放、平移
   */
  setControls() {
    // 创建轨道控制器，绑定相机和画布
    this.controls = new OrbitControls(this.instance, this.canvas)
    
    // 启用阻尼效果，使相机运动更平滑
    this.controls.enableDamping = true
    
    // 初始更新控制器
    this.controls.update()
  }
  
  /**
   * 响应窗口尺寸变化
   * 更新相机的宽高比和投影矩阵
   */
  resize() {
    // 更新相机宽高比
    this.instance.aspect = this.sizes.width / this.sizes.height
    
    // 更新投影矩阵，使新的宽高比生效
    this.instance.updateProjectionMatrix()
  }
  
  /**
   * 每帧更新函数
   * 更新轨道控制器，处理用户交互
   */
  update() {
    // 更新控制器状态，处理阻尼效果
    this.controls.update()
  }
  
  /**
   * 销毁相机系统
   * 释放控制器资源，防止内存泄漏
   */
  destroy() {
    // 销毁轨道控制器，移除事件监听器
    this.controls.dispose()
  }
}
