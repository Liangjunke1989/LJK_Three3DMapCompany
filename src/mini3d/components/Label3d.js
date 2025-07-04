/**
 * 3D标签组件
 * 在3D空间中渲染HTML元素，实现文字标签的3D显示效果
 * 
 * 主要功能：
 * - HTML元素的3D空间渲染
 * - 支持CSS3DObject和CSS3DSprite两种模式
 * - 自动适配窗口尺寸变化
 * - 完整的标签生命周期管理
 * - 自定义样式和交互控制
 * 
 * 技术实现：
 * - 基于CSS3DRenderer实现HTML元素3D渲染
 * - 独立的CSS3D渲染器层叠在WebGL渲染器之上
 * - 支持CSS样式、交互事件和动画
 * - 自动同步相机视角和场景变换
 * 
 * 应用场景：
 * - 地图标注和信息提示
 * - 3D模型的文字说明
 * - 数据可视化的标签显示
 * - 交互式UI元素
 */

import { CSS3DObject, CSS3DSprite, CSS3DRenderer } from "three/examples/jsm/renderers/CSS3DRenderer"
import { uuid } from "../utils"

export class Label3d {
  /**
   * 构造函数 - 初始化3D标签系统
   * @param {Object} dependencies - 依赖对象
   * @param {Scene} dependencies.scene - Three.js场景对象
   * @param {Camera} dependencies.camera - 相机管理器
   * @param {Time} dependencies.time - 时间管理器
   * @param {Sizes} dependencies.sizes - 尺寸管理器
   * @param {HTMLCanvasElement} dependencies.canvas - WebGL画布元素
   */
  constructor({ scene, camera, time, sizes, canvas }) {
    this.scene = scene      // 3D场景
    this.camera = camera    // 相机管理器
    this.time = time        // 时间管理器
    this.sizes = sizes      // 尺寸管理器
    this.canvas = canvas    // WebGL画布
    this.parent = null      // 当前标签的父对象
    
    // 获取当前窗口尺寸
    let { width, height } = this.sizes
    
    // 创建CSS3D渲染器
    let css3dRender = new CSS3DRenderer()
    css3dRender.setSize(width, height)  // 设置渲染器尺寸
    
    // 配置CSS3D渲染器的DOM样式
    css3dRender.domElement.style.position = "absolute"    // 绝对定位
    css3dRender.domElement.style.left = "0px"            // 左对齐
    css3dRender.domElement.style.top = "0px"             // 顶部对齐
    css3dRender.domElement.style.pointerEvents = "none"  // 禁用鼠标事件（避免遮挡WebGL交互）
    css3dRender.domElement.className = "label3d-" + uuid()  // 设置唯一类名
    
    // 将CSS3D渲染器添加到画布的父容器中
    this.canvas.parentNode.appendChild(css3dRender.domElement)
    
    this.css3dRender = css3dRender
    
    // 监听时间更新事件，同步渲染
    this.time.on("tick", () => {
      this.update()
    })
    
    // 监听窗口尺寸变化事件
    this.sizes.on("resize", () => {
      this.resize()
    })
  }
  
  /**
   * 创建3D标签对象
   * @param {string} name - 标签显示内容
   * @param {string} className - CSS类名（用于自定义样式）
   * @param {boolean} isSprite - 是否创建CSS3DSprite（始终面向相机）
   * @returns {CSS3DObject|CSS3DSprite} 3D标签对象
   */
  create(name = "", className = "", isSprite = false) {
    // 创建DOM元素
    let tag = document.createElement("div")
    tag.innerHTML = name
    tag.className = className
    tag.style.visibility = "hidden"      // 初始隐藏
    tag.style.position = "absolute"      // 绝对定位
    
    // 如果没有指定CSS类，应用默认样式
    if (!className) {
      tag.style.padding = "10px"
      tag.style.color = "#fff"
      tag.style.fontSize = "12px"
      tag.style.textAlign = "center"
      tag.style.background = "rgba(0,0,0,0.6)"
      tag.style.borderRadius = "4px"
    }
    
    let label = null
    
    // 根据isSprite参数创建不同类型的3D对象
    if (!isSprite) {
      // CSS3DObject: 标签会根据3D变换旋转
      label = new CSS3DObject(tag)
    } else {
      // CSS3DSprite: 标签始终面向相机（广告牌效果）
      label = new CSS3DSprite(tag)
    }

    /**
     * 初始化并显示标签
     * @param {string} name - 显示内容
     * @param {Vector3} point - 3D空间位置
     */
    label.init = (name, point) => {
      label.element.innerHTML = name
      label.element.style.visibility = "visible"
      label.position.copy(point)
    }
    
    /**
     * 隐藏标签
     */
    label.hide = () => {
      label.element.style.visibility = "hidden"
    }
    
    /**
     * 显示标签
     */
    label.show = () => {
      label.element.style.visibility = "visible"
    }
    
    /**
     * 将标签添加到父对象
     * @param {Object3D} parent - 父级3D对象
     */
    label.setParent = (parent) => {
      this.parent = parent
      parent.add(label)
    }
    
    /**
     * 移除标签
     */
    label.remove = () => {
      this.parent.remove(label)
      // 注意：DOM元素会由CSS3DRenderer自动管理
      // console.log(this.css3dRender.domElement, label.element);
      // this.css3dRender.domElement.parentNode.remove(label.element);
    }
    
    return label
  }
  
  /**
   * 设置标签的3D变换样式
   * @param {CSS3DObject|CSS3DSprite} label - 标签对象
   * @param {number} scale - 缩放比例，默认0.1
   * @param {string} axis - 旋转轴（"x"、"y"、"z"），默认"x"
   * @param {string} pointerEvents - 鼠标事件控制（"none"禁用，"auto"启用）
   */
  setLabelStyle(label, scale = 0.1, axis = "x", pointerEvents = "none") {
    // 设置鼠标事件响应
    label.element.style.pointerEvents = pointerEvents
    
    // 设置标签缩放（控制HTML标签在3D空间中的显示尺寸）
    label.scale.set(scale, scale, scale)
    
    // 设置旋转角度（控制HTML标签的3D朝向）
    label.rotation[axis] = Math.PI / 2
  }
  
  /**
   * 更新CSS3D渲染器
   * 在每帧调用，同步CSS3D元素与WebGL场景
   */
  update() {
    this.css3dRender.render(this.scene, this.camera.instance)
  }
  
  /**
   * 销毁3D标签系统
   * 移除DOM元素，防止内存泄漏
   */
  destroy() {
    if (this.css3dRender) {
      let domElement = this.css3dRender.domElement
      // 从DOM中移除CSS3D渲染器的容器元素
      domElement.parentNode.removeChild(domElement)
    }
  }
  
  /**
   * 响应窗口尺寸变化
   * 更新CSS3D渲染器的尺寸
   */
  resize() {
    let { width, height } = this.sizes
    this.css3dRender.setSize(width, height)
  }
}
