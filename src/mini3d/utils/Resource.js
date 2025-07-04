/**
 * 资源管理类
 * 统一管理3D场景中的各种资源加载
 * 
 * 主要功能：
 * - 支持多种资源类型的异步加载
 * - 统一的加载器管理和配置
 * - 加载进度监控和错误处理
 * - 资源缓存和复用机制
 * - 支持Draco压缩的GLTF模型
 * 
 * 支持的资源类型：
 * - 3D模型：GLTF、FBX、OBJ等
 * - 纹理：各种图像格式、立方体贴图、HDRI等
 * - 数据：JSON、字体文件等
 * 
 * 继承：EventEmitter - 支持加载进度和完成事件
 */

import { Loader, LoadingManager, TextureLoader } from "three"
import { EventEmitter } from "./EventEmitter"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader"
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js"

// 资源类型枚举
// 定义所有支持的加载器类型和对应的资源类型
let ResourceType = {
  GLTFLoader: "GLTF",               // GLTF/GLB 3D模型
  TextureLoader: "Texture",         // 纹理贴图
  FontLoader: "Font",               // 字体文件
  MMDLoader: "MMD",                 // MMD动画模型
  MTLLoader: "MTL",                 // 材质文件
  OBJLoader: "OBJ",                 // OBJ 3D模型
  PCDLoader: "PCD",                 // 点云数据
  FileLoader: "File",               // 通用文件（JSON等）
  ImageLoader: "Image",             // 图像文件
  ObjectLoader: "Object",           // Three.js对象
  MaterialLoader: "Material",       // Three.js材质
  CubeTextureLoader: "CubeTexture", // 立方体贴图
  RGBELoader: "RGBELoader",         // HDRI环境贴图
  FBXLoader: "FBX",                 // FBX 3D模型
}

// 提取所有支持的资源类型值
const types = Object.values(ResourceType)

export class Resource extends EventEmitter {
  /**
   * 构造函数 - 初始化资源管理器
   * @param {Object} options - 配置选项
   * @param {string} options.dracoPath - Draco解码器路径
   */
  constructor({ dracoPath } = {}) {
    // 继承EventEmitter的事件功能
    super()
    
    // Draco压缩解码器路径配置
    this.dracoPath = dracoPath || "./draco/gltf/"

    // 加载统计
    this.itemsLoaded = 0    // 已加载的资源数量
    this.itemsTotal = 0     // 总资源数量

    // 资源存储
    this.assets = []        // 加载完成的资源数组

    // 加载器注册表
    this.loaders = {}       // 存储各种类型的加载器实例

    // 初始化默认加载器
    this.initDefaultLoader()
  }

  /**
   * 初始化默认加载器
   * 自动注册常用的GLTFLoader和TextureLoader
   */
  initDefaultLoader() {
    // 注册默认的加载器
    ;[
      { loader: GLTFLoader, name: "GLTFLoader" },
      { loader: TextureLoader, name: "TextureLoader" },
    ].map((item) => this.addLoader(item.loader, item.name))
  }

  /**
   * 初始化Draco压缩支持
   * 为GLTF加载器配置Draco解码功能
   * @param {GLTFLoader} loader - GLTF加载器实例
   */
  initDraco(loader) {
    // 创建Draco解码器
    const dracoLoader = new DRACOLoader()

    // 设置解码器文件路径
    dracoLoader.setDecoderPath(this.dracoPath)

    // 预加载解码器
    dracoLoader.preload()
    
    // 将Draco解码器设置到GLTF加载器
    loader.setDRACOLoader(dracoLoader)
  }

  /**
   * 添加新的加载器
   * @param {Function} loader - 加载器构造函数
   * @param {string} loaderName - 加载器名称
   */
  addLoader(loader, loaderName = "") {
    // 验证加载器是否有效且类型已定义
    if (loader.name && ResourceType[loaderName]) {
      let hasLoader = this.loaders[loaderName]
      
      if (!hasLoader) {
        // 创建加载器实例
        let instance = new loader(this.manager)
        let name = loaderName
        
        // 确保实例继承自Three.js的Loader基类
        if (instance instanceof Loader) {
          // 如果是GLTF加载器，初始化Draco支持
          if (name === "GLTFLoader") {
            this.initDraco(instance)
          }
          
          // 注册加载器到加载器注册表
          this.loaders[ResourceType[name]] = instance
        }
      }
    } else {
      throw new Error("请配置正确的加载器")
    }
  }

  /**
   * 加载单个资源项
   * @param {Object} item - 资源项配置
   * @param {string} item.type - 资源类型
   * @param {string} item.path - 资源路径
   * @param {string} item.name - 资源名称
   * @returns {Promise} 加载结果Promise
   */
  loadItem(item) {
    return new Promise((resolve, reject) => {
      // 检查是否有对应类型的加载器
      if (!this.loaders[item.type]) {
        throw new Error(`资源${item.path}没有配置加载器`)
      }
      
      // 使用对应的加载器加载资源
      this.loaders[item.type].load(
        item.path,
        (data) => {
          // 加载成功
          this.itemsLoaded++
          
          // 发射加载进度事件
          this.emit("onProgress", item.path, this.itemsLoaded, this.itemsTotal)
          
          // 返回加载结果
          resolve({ ...item, data })
        },
        null, // 进度回调（这里使用null）
        (err) => {
          // 加载失败
          this.emit("onError", err)
          reject(err)
        }
      )
    })
  }
  
  /**
   * 批量加载所有资源
   * @param {Array} assets - 资源配置数组
   * @returns {Promise} 所有资源加载完成的Promise
   */
  loadAll(assets) {
    // 重置加载计数器
    this.itemsLoaded = 0
    this.itemsTotal = 0

    return new Promise((resolve, reject) => {
      // 验证和格式化资源配置
      let currentAssets = this.matchType(assets)
      let promise = []
      
      // 设置总资源数量
      this.itemsTotal = currentAssets.length
      
      // 为每个资源创建加载Promise
      currentAssets.map((item) => {
        let currentItem = this.loadItem(item)
        promise.push(currentItem)
      })
      
      // 等待所有资源加载完成
      Promise.all(promise)
        .then((res) => {
          // 所有资源加载成功
          this.assets = res
          this.emit("onLoad")  // 发射加载完成事件
          resolve(res)
        })
        .catch((err) => {
          // 有资源加载失败
          this.emit("onError", err)
          reject(err)
        })
    })
  }

  /**
   * 验证和格式化资源类型
   * @param {Array} assets - 原始资源配置数组
   * @returns {Array} 格式化后的资源配置数组
   */
  matchType(assets) {
    this.assets = assets
      .map((item) => {
        // 验证资源类型是否支持
        let type = types.includes(item.type) ? item.type : ""
        return {
          type: type,
          path: item.path,
          name: item.name,
          data: null,
        }
      })
      .filter((item) => {
        // 过滤掉不支持的资源类型
        if (!item.type) {
          throw new Error(`资源${item.path},type不正确`)
        }
        return item.type
      })

    return this.assets
  }

  /**
   * 根据名称获取已加载的资源
   * @param {string} name - 资源名称
   * @returns {any} 资源数据
   */
  getResource(name) {
    let current = this.assets.find((item) => {
      return item.name === name
    })
    
    if (!current) {
      throw new Error(`资源${name}不存在`)
    }
    
    return current.data
  }
  
  /**
   * 销毁资源管理器
   * 清理所有事件监听器和资源引用
   */
  destroy() {
    // 移除所有事件监听器
    this.off("onProgress")
    this.off("onLoad")
    this.off("onError")
    
    // 清空资源数组
    this.assets = []
  }
}
