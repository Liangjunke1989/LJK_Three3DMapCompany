/**
 * Mini3D 框架主入口文件
 * 统一导出所有模块，提供完整的3D渲染框架功能
 * 
 * 模块组织：
 * - core: 核心渲染模块（Camera、Renderer、Mini3d主类）
 * - utils: 工具模块（事件系统、资源管理、时间管理等）
 * - plugins: 插件模块（调试工具等）
 * - components: 组件模块（粒子、飞线、标签等3D组件）
 * - shader: 着色器模块（扩散、渐变等特效着色器）
 */

export * from "./core"       // 核心渲染模块
export * from "./utils"      // 工具函数模块
export * from "./plugins"    // 插件扩展模块
export * from "./components" // 3D组件模块
export * from "./shader"     // 着色器模块
