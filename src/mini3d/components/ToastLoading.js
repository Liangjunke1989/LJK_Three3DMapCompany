/**
 * 加载提示组件
 * 创建全屏加载动画，用于显示3D场景或资源的加载状态
 * 
 * 主要功能：
 * - 全屏加载遮罩层
 * - 动态加载动画效果
 * - 显示/隐藏控制
 * - DOM元素的生命周期管理
 * 
 * 技术实现：
 * - 纯DOM/CSS实现
 * - 动态创建和销毁DOM元素
 * - CSS类样式控制动画效果
 * 
 * 应用场景：
 * - 3D场景初始化加载
 * - 资源文件加载提示
 * - 异步操作等待提示
 * - 用户体验优化
 */

export class ToastLoading {
  /**
   * 构造函数 - 初始化加载提示组件
   */
  constructor() {
    this.toastNode = null;  // 加载提示DOM节点
    this.init();            // 初始化DOM结构
  }
  
  /**
   * 初始化加载提示的DOM结构
   * 创建加载动画的HTML和CSS样式
   */
  init() {
    // 如果已经存在，不重复创建
    if (this.toastNode) {
      return false;
    }
    
    // 创建加载提示的容器元素
    this.toastNode = document.createElement("div");
    this.toastNode.classList.add("fixed-loading");  // 添加CSS类名
    this.toastNode.id = "fixed-loading";             // 设置ID
    
    // 设置加载动画的HTML结构
    this.toastNode.innerHTML = `
    <div class="page-loading-container">
      <div class="page-loading"></div>
    </div>
  `;

    // 初始状态为隐藏
    this.toastNode.style.visibility = "hidden";
    
    // 添加到页面body中
    document.body.appendChild(this.toastNode);
  }
  
  /**
   * 显示加载提示
   * 将加载动画设置为可见状态
   */
  show() {
    this.toastNode.style.visibility = "visible";
  }
  
  /**
   * 隐藏加载提示
   * 将加载动画设置为隐藏状态
   */
  hide() {
    if (this.toastNode) {
      this.toastNode.style.visibility = "hidden";
    }
  }
  
  /**
   * 销毁加载提示组件
   * 从DOM中移除元素，防止内存泄漏
   */
  destroy() {
    if (this.toastNode) {
      // 从页面中移除DOM元素
      document.body.removeChild(this.toastNode);
    }
  }
}
