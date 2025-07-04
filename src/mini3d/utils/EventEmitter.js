/**
 * 事件发射器类
 * 实现观察者模式，提供事件的注册、触发和移除功能
 * 
 * 主要功能：
 * - 支持事件的订阅和取消订阅
 * - 支持一次性事件监听
 * - 使用Map和Set数据结构优化性能
 * - 避免重复监听器的问题
 * 
 * 设计模式：观察者模式
 * 性能优化：使用现代JS集合数据结构
 */

export class EventEmitter {
  /**
   * 构造函数 - 初始化事件容器
   */
  constructor() {
    // 使用Map存储事件名到回调函数集合的映射
    // Map<string, Set<Function>>
    this.events = new Map()
  }

  /**
   * 注册事件监听器
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    // 获取该事件对应的回调函数集合
    let callbacks = this.events.get(event)

    // 如果该事件还没有监听器，创建新的Set集合
    if (!callbacks) {
      callbacks = new Set()
      this.events.set(event, callbacks)
    }
    
    // 将回调函数添加到集合中
    // Set会自动避免重复添加相同的函数
    callbacks.add(callback)
  }

  /**
   * 移除事件监听器
   * @param {string} event - 事件名称
   * @param {Function} [callback] - 要移除的回调函数，如果不提供则移除该事件的所有监听器
   */
  off(event, callback) {
    // 获取该事件的回调函数集合
    const callbacks = this.events.get(event)
    
    if (callbacks) {
      if (callback) {
        // 移除指定的回调函数
        callbacks.delete(callback)
      } else {
        // 如果没有指定回调函数，移除整个事件
        this.events.delete(event)
      }
    }
  }

  /**
   * 触发事件，执行所有注册的监听器
   * @param {string} event - 事件名称
   * @param {...any} args - 传递给监听器的参数
   */
  emit(event, ...args) {
    // 获取该事件的所有回调函数
    const callbacks = this.events.get(event)
    
    if (callbacks) {
      // 遍历并执行所有回调函数
      callbacks.forEach((callback) => {
        // 使用展开运算符传递参数
        callback(...args)
      })
    }
  }

  /**
   * 注册一次性事件监听器
   * 监听器执行一次后自动移除
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  once(event, callback) {
    // 创建包装函数，执行原回调后自动移除监听器
    const onceWrapper = (...args) => {
      // 执行原始回调函数
      callback(...args)
      // 自动移除这个一次性监听器
      this.off(event, onceWrapper)
    }
    
    // 注册包装后的监听器
    this.on(event, onceWrapper)
  }
}
