/**
 * 渲染器管理类
 * 负责创建和管理WebGL渲染器，处理场景渲染
 * 
 * 主要功能：
 * - 创建WebGL渲染器并配置基本参数
 * - 支持后处理管线（postprocessing）
 * - 自动适配设备像素比和窗口尺寸
 * - 管理渲染循环和资源释放
 */

import { SRGBColorSpace, WebGLRenderer } from "three"

export class Renderer {
  /**
   * 构造函数 - 初始化渲染器系统
   * @param {Object} dependencies - 依赖对象
   * @param {HTMLCanvasElement} dependencies.canvas - 画布元素
   * @param {Sizes} dependencies.sizes - 尺寸管理器
   * @param {Scene} dependencies.scene - 3D场景
   * @param {Camera} dependencies.camera - 相机对象
   * @param {boolean} dependencies.postprocessing - 是否启用后处理
   * @param {EffectComposer} dependencies.composer - 后处理合成器
   */
  constructor({ canvas, sizes, scene, camera, postprocessing, composer }) {
    this.canvas = canvas                    // 画布DOM元素
    this.sizes = sizes                      // 尺寸管理器
    this.scene = scene                      // 3D场景
    this.camera = camera                    // 相机对象
    this.postprocessing = postprocessing    // 后处理开关
    this.composer = composer                // 后处理合成器
    
    // 初始化渲染器实例
    this.setInstance()
  }
  
  /**
   * 创建WebGL渲染器实例
   * 配置渲染器的基本参数和特性
   */
  setInstance() {
    // 创建WebGL渲染器
    this.instance = new WebGLRenderer({
      alpha: true,        // 启用透明度支持，允许背景透明
      antialias: true,    // 启用抗锯齿，提升渲染质量
      canvas: this.canvas // 指定渲染目标画布
    })

    // 设置渲染器尺寸
    this.instance.setSize(this.sizes.width, this.sizes.height)
    
    // 设置设备像素比，适配高DPI显示器
    this.instance.setPixelRatio(this.sizes.pixelRatio)
  }

  /**
   * 响应窗口尺寸变化
   * 更新渲染器的画布尺寸和设备像素比
   */
  resize() {
    // 更新渲染尺寸
    this.instance.setSize(this.sizes.width, this.sizes.height)
    
    // 更新设备像素比
    this.instance.setPixelRatio(this.sizes.pixelRatio)
  }
  
  /**
   * 执行渲染
   * 根据是否启用后处理选择不同的渲染路径
   */
  update() {
    if (this.postprocessing && this.composer) {
      // 使用后处理管线渲染
      // 通过EffectComposer执行多Pass渲染流程
      this.composer.render()
    } else {
      // 标准渲染流程
      // 直接渲染场景到画布
      this.instance.render(this.scene, this.camera.instance)
    }
  }
  
  /**
   * 销毁渲染器并释放资源
   * 清理WebGL上下文，防止内存泄漏
   */
  destroy() {
    // 释放渲染器资源
    this.instance.dispose()
    
    // 强制释放WebGL上下文
    // 这对于单页应用中的组件卸载很重要
    this.instance.forceContextLoss()
  }
}
