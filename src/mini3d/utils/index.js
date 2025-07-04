/**
 * Utils 工具模块入口文件
 * 统一导出所有工具类和函数，提供完整的开发辅助功能
 * 
 * 模块说明：
 * - EventEmitter: 事件系统，实现观察者模式
 * - Sizes: 尺寸管理，响应式窗口大小适配
 * - Time: 时间管理，渲染循环和动画时间控制
 * - Resource: 资源管理，统一的资源加载系统
 * - utils: 通用工具函数，包含UUID、数据转换等
 * - CreateHistory: 历史记录管理，撤销/重做功能
 * - GC: 垃圾回收工具，内存管理和资源清理
 * 
 * 设计理念：
 * - 模块化设计，职责单一
 * - 统一的API接口
 * - 高性能和内存安全
 * - 易于扩展和维护
 */

export * from "./EventEmitter"   // 事件发射器
export * from "./Sizes"          // 尺寸管理器
export * from "./Time"           // 时间管理器
export * from "./Resource"       // 资源管理器
export * from "./utils"          // 通用工具函数
export * from "./CreateHistory"  // 历史记录管理
export * from "./GC"             // 垃圾回收工具
