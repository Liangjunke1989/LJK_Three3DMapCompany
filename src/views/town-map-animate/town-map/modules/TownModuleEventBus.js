//事件总线，用于模块间通信
import { EventEmitter } from "events"

/**
 * 村镇模块事件总线
 * 
 * 负责村镇模块间的事件通信
 * 包括事件的注册、触发和监听
 */
export class TownModuleEventBus extends EventEmitter {
    /**
     * 构造函数
     */
    constructor() {
        super(
            {
                maxListeners: 100,
                captureRejections: true
            }
        )
        this.setMaxListeners(100)
        this.captureRejections = true
    }

    /**
     * 注册事件
     */
    registerEvent(event, callback) {
        this.on(event, callback)
    }
    
    /**
     * 触发事件
     */
    emitEvent(event, ...args) {
        this.emit(event, ...args)
    }
    
    /**
     * 监听事件
     */
    onEvent(event, callback) {
        this.on(event, callback)
    }
    
    /**
     * 移除事件
     */
    offEvent(event, callback) {
        this.off(event, callback)
    }
    
    /**
     * 移除所有事件
     */
    offAllEvents() {
        this.removeAllListeners()
    }

    /**
     * 销毁事件总线
     */
    destroy() {
        this.offAllEvents()
    }

    /**
     * 获取事件总线
     */
    getEventBus() {
        return this
    }

    /**
     * 获取事件总线
     */
    getEventBus() {
        return this
    }
    

}