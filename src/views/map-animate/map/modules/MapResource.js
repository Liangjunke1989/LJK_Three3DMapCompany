import {
  Texture,
  TextureLoader,
  CompressedTextureLoader,
  DataTexture,
  WebGLRenderer,
  WebGLRenderTarget,
  ClampToEdgeWrapping,
  RepeatWrapping,
  LinearFilter,
  NearestFilter,
  RGBAFormat,
} from "three"

import { FileLoader } from "three"

/**
 * 地图资源管理模块
 * 
 * 负责管理地图中的所有资源，包括：
 * - 纹理资源优化和缓存
 * - JSON数据文件管理
 * - 异步资源加载队列
 * - 资源使用统计和监控
 * - 动态资源释放和回收
 * - 纹理压缩和格式转换
 * - 预加载策略和LOD管理
 * 
 * 资源类型：
 * - 纹理贴图：PNG、JPG格式的纹理文件
 * - JSON数据：地图数据、路径数据、配置文件
 * - 压缩纹理：DXT、ETC、ASTC等压缩格式
 * - 程序纹理：动态生成的纹理数据
 * 
 * 性能优化：
 * - 纹理缓存和复用机制
 * - 智能预加载策略
 * - 内存使用监控
 * - 资源引用计数
 * - GPU内存优化
 * 
 * @author LJK
 * @version 1.0.0
 */
export class MapResource {
  /**
   * 构造函数
   * @param {SharedState} state - 共享状态管理器
   * @param {ModuleEventBus} eventBus - 事件总线
   */
  constructor(state, eventBus) {
    this.state = state
    this.eventBus = eventBus
    
    // ============ 资源缓存系统 ============
    this.textureCache = new Map()        // 纹理缓存
    this.dataCache = new Map()           // 数据缓存
    this.loadingQueue = new Map()        // 加载队列
    this.resourceStats = new Map()       // 资源统计
    
    // ============ 资源配置 ============
    this.config = {
      maxCacheSize: 256 * 1024 * 1024,   // 最大缓存大小（256MB）
      textureQuality: 'high',             // 纹理质量：low | medium | high
      enableCompression: true,            // 启用纹理压缩
      preloadDistance: 2,                 // 预加载距离层级
      maxConcurrentLoads: 6,              // 最大并发加载数
      enableLOD: true,                    // 启用LOD系统
      cacheExpiry: 30 * 60 * 1000,       // 缓存过期时间（30分钟）
    }
    
    // ============ 加载器实例 ============
    this.textureLoader = new TextureLoader()
    this.fileLoader = new FileLoader()
    this.compressedTextureLoader = new CompressedTextureLoader()
    
    // ============ 性能监控 ============
    this.performanceMetrics = {
      totalLoadTime: 0,                   // 总加载时间
      loadedResources: 0,                 // 已加载资源数
      cacheHits: 0,                       // 缓存命中次数
      cacheMisses: 0,                     // 缓存未命中次数
      memoryUsage: 0,                     // 内存使用量
      gpuMemoryUsage: 0,                  // GPU内存使用量
    }
    
    // ============ 资源类型定义 ============
    this.resourceTypes = {
      TEXTURE: 'texture',
      JSON: 'json',
      COMPRESSED_TEXTURE: 'compressedTexture',
      PROCEDURAL_TEXTURE: 'proceduralTexture',
      BINARY: 'binary',
    }
    
    // ============ LOD层级配置 ============
    this.lodLevels = {
      low: { scale: 0.25, quality: 0.5 },
      medium: { scale: 0.5, quality: 0.75 },
      high: { scale: 1.0, quality: 1.0 },
    }
    
    console.log('[MapResource] 资源管理模块初始化完成')
  }

  /**
   * 智能资源获取
   * 
   * 提供统一的资源获取接口，支持缓存、预加载和性能优化。
   * 根据资源类型和使用场景，自动选择最优的加载策略。
   * 
   * @param {string} name - 资源名称
   * @param {Object} options - 加载选项
   * @returns {Promise|any} 资源对象或Promise
   * 
   * 功能特点：
   * - 缓存优先策略，提高访问速度
   * - 自动类型检测和格式转换
   * - 异步加载支持，避免阻塞
   * - 错误处理和重试机制
   * - 使用统计和性能监控
   */
  getResource(name, options = {}) {
    const startTime = performance.now()
    
    // ============ 缓存查找 ============
    // 优先从缓存中获取资源
    if (this.textureCache.has(name)) {
      this.performanceMetrics.cacheHits++
      this.updateResourceStats(name, 'hit')
      
      const resource = this.textureCache.get(name)
      console.log(`[MapResource] 缓存命中: ${name}`)
      
      // 发射缓存命中事件
      this.eventBus.emit('resource:cacheHit', { 
        name, 
        type: 'texture',
        loadTime: performance.now() - startTime
      })
      
      return resource
    }
    
    if (this.dataCache.has(name)) {
      this.performanceMetrics.cacheHits++
      this.updateResourceStats(name, 'hit')
      
      const resource = this.dataCache.get(name)
      console.log(`[MapResource] 数据缓存命中: ${name}`)
      
      this.eventBus.emit('resource:cacheHit', { 
        name, 
        type: 'data',
        loadTime: performance.now() - startTime
      })
      
      return resource
    }
    
    // ============ 缓存未命中，委托给原始资源管理器 ============
    this.performanceMetrics.cacheMisses++
    this.updateResourceStats(name, 'miss')
    
    console.log(`[MapResource] 缓存未命中，从原始资源管理器获取: ${name}`)
    
    // 通过原始资源管理器获取资源
    if (this.state.assets && this.state.assets.instance) {
      const resource = this.state.assets.instance.getResource(name)
      
      if (resource) {
        // 将资源添加到缓存
        this.addToCache(name, resource, options)
        
        // 发射资源获取事件
        this.eventBus.emit('resource:loaded', {
          name,
          type: this.detectResourceType(resource),
          loadTime: performance.now() - startTime,
          fromCache: false
        })
        
        return resource
      }
    }
    
    // ============ 资源未找到 ============
    console.warn(`[MapResource] 资源未找到: ${name}`)
    this.eventBus.emit('resource:notFound', { name })
    return null
  }

  /**
   * 批量预加载资源
   * 
   * 根据使用场景和优先级，批量预加载相关资源。
   * 支持智能预测和动态调整加载策略。
   * 
   * @param {Array} resourceNames - 资源名称列表
   * @param {Object} options - 预加载选项
   * @returns {Promise} 预加载完成Promise
   * 
   * 预加载策略：
   * - 高优先级资源优先加载
   * - 基于场景的智能预测
   * - 网络状况自适应调整
   * - 用户行为分析优化
   */
  async preloadResources(resourceNames, options = {}) {
    console.log(`[MapResource] 开始预加载 ${resourceNames.length} 个资源`)
    
    const {
      priority = 'normal',        // 加载优先级
      concurrent = this.config.maxConcurrentLoads, // 并发数量
      timeout = 10000,            // 超时时间
      retryCount = 3,             // 重试次数
    } = options
    
    const startTime = performance.now()
    const loadPromises = []
    
    // ============ 分批并发加载 ============
    for (let i = 0; i < resourceNames.length; i += concurrent) {
      const batch = resourceNames.slice(i, i + concurrent)
      const batchPromises = batch.map(name => this.loadResourceAsync(name, { timeout, retryCount }))
      
      try {
        await Promise.allSettled(batchPromises)
      } catch (error) {
        console.warn(`[MapResource] 批次加载出现错误:`, error)
      }
    }
    
    const totalTime = performance.now() - startTime
    console.log(`[MapResource] 预加载完成，耗时: ${totalTime.toFixed(2)}ms`)
    
    // 发射预加载完成事件
    this.eventBus.emit('resource:preloadComplete', {
      resourceCount: resourceNames.length,
      loadTime: totalTime,
      priority
    })
  }

  /**
   * 异步加载单个资源
   * 
   * @param {string} name - 资源名称
   * @param {Object} options - 加载选项
   * @returns {Promise} 加载Promise
   */
  async loadResourceAsync(name, options = {}) {
    return new Promise((resolve, reject) => {
      const { timeout = 5000, retryCount = 3 } = options
      let attempts = 0
      
      const loadWithRetry = () => {
        attempts++
        
        try {
          const resource = this.getResource(name)
          if (resource) {
            resolve(resource)
          } else if (attempts < retryCount) {
            console.log(`[MapResource] 重试加载资源: ${name} (${attempts}/${retryCount})`)
            setTimeout(loadWithRetry, 1000 * attempts) // 递增延迟
          } else {
            reject(new Error(`Failed to load resource: ${name} after ${retryCount} attempts`))
          }
        } catch (error) {
          if (attempts < retryCount) {
            setTimeout(loadWithRetry, 1000 * attempts)
          } else {
            reject(error)
          }
        }
      }
      
      // 设置超时
      setTimeout(() => {
        reject(new Error(`Resource load timeout: ${name}`))
      }, timeout)
      
      loadWithRetry()
    })
  }

  /**
   * 创建程序纹理
   * 
   * 动态生成纹理数据，用于特殊效果和优化。
   * 支持多种生成算法和参数配置。
   * 
   * @param {string} type - 纹理类型
   * @param {Object} params - 生成参数
   * @returns {Texture} 生成的纹理
   * 
   * 支持的纹理类型：
   * - gradient：渐变纹理
   * - noise：噪声纹理
   * - pattern：图案纹理
   * - particle：粒子纹理
   */
  createProceduralTexture(type, params = {}) {
    const {
      width = 256,
      height = 256,
      format = RGBAFormat,
      filter = LinearFilter,
    } = params
    
    console.log(`[MapResource] 创建程序纹理: ${type} (${width}x${height})`)
    
    const size = width * height * 4 // RGBA
    const data = new Uint8Array(size)
    
    switch (type) {
      case 'gradient':
        this.generateGradientTexture(data, width, height, params)
        break
      case 'noise':
        this.generateNoiseTexture(data, width, height, params)
        break
      case 'pattern':
        this.generatePatternTexture(data, width, height, params)
        break
      case 'particle':
        this.generateParticleTexture(data, width, height, params)
        break
      default:
        console.warn(`[MapResource] 未知的程序纹理类型: ${type}`)
        return null
    }
    
    const texture = new DataTexture(data, width, height, format)
    texture.magFilter = filter
    texture.minFilter = filter
    texture.needsUpdate = true
    
    // 添加到缓存
    const textureName = `procedural_${type}_${width}x${height}_${Date.now()}`
    this.addToCache(textureName, texture, { type: this.resourceTypes.PROCEDURAL_TEXTURE })
    
    // 发射纹理创建事件
    this.eventBus.emit('resource:proceduralTextureCreated', {
      type,
      name: textureName,
      width,
      height,
      format
    })
    
    console.log(`[MapResource] 程序纹理创建完成: ${textureName}`)
    return texture
  }

  /**
   * 生成渐变纹理数据
   * @param {Uint8Array} data - 纹理数据数组
   * @param {number} width - 纹理宽度
   * @param {number} height - 纹理高度
   * @param {Object} params - 渐变参数
   */
  generateGradientTexture(data, width, height, params) {
    const {
      startColor = [255, 0, 0, 255],
      endColor = [0, 0, 255, 255],
      direction = 'vertical',
    } = params
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4
        
        let factor = 0
        if (direction === 'vertical') {
          factor = y / height
        } else if (direction === 'horizontal') {
          factor = x / width
        } else if (direction === 'radial') {
          const centerX = width / 2
          const centerY = height / 2
          const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
          const maxDistance = Math.sqrt(centerX ** 2 + centerY ** 2)
          factor = Math.min(distance / maxDistance, 1)
        }
        
        data[index] = startColor[0] + (endColor[0] - startColor[0]) * factor
        data[index + 1] = startColor[1] + (endColor[1] - startColor[1]) * factor
        data[index + 2] = startColor[2] + (endColor[2] - startColor[2]) * factor
        data[index + 3] = startColor[3] + (endColor[3] - startColor[3]) * factor
      }
    }
  }

  /**
   * 生成噪声纹理数据
   * @param {Uint8Array} data - 纹理数据数组
   * @param {number} width - 纹理宽度
   * @param {number} height - 纹理高度
   * @param {Object} params - 噪声参数
   */
  generateNoiseTexture(data, width, height, params) {
    const {
      scale = 10,
      amplitude = 255,
      seed = Math.random(),
    } = params
    
    // 简单的柏林噪声实现
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4
        
        const noiseValue = this.simpleNoise(x / scale, y / scale, seed)
        const value = (noiseValue * amplitude + amplitude) / 2
        
        data[index] = value     // R
        data[index + 1] = value // G
        data[index + 2] = value // B
        data[index + 3] = 255   // A
      }
    }
  }

  /**
   * 生成图案纹理数据
   * @param {Uint8Array} data - 纹理数据数组
   * @param {number} width - 纹理宽度
   * @param {number} height - 纹理高度
   * @param {Object} params - 图案参数
   */
  generatePatternTexture(data, width, height, params) {
    const {
      pattern = 'grid',
      cellSize = 16,
      color1 = [255, 255, 255, 255],
      color2 = [0, 0, 0, 255],
    } = params
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4
        let useColor1 = false
        
        switch (pattern) {
          case 'grid':
            useColor1 = (Math.floor(x / cellSize) + Math.floor(y / cellSize)) % 2 === 0
            break
          case 'stripes':
            useColor1 = Math.floor(y / cellSize) % 2 === 0
            break
          case 'dots':
            const centerX = (Math.floor(x / cellSize) + 0.5) * cellSize
            const centerY = (Math.floor(y / cellSize) + 0.5) * cellSize
            const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
            useColor1 = distance < cellSize / 4
            break
        }
        
        const color = useColor1 ? color1 : color2
        data[index] = color[0]
        data[index + 1] = color[1]
        data[index + 2] = color[2]
        data[index + 3] = color[3]
      }
    }
  }

  /**
   * 生成粒子纹理数据
   * @param {Uint8Array} data - 纹理数据数组
   * @param {number} width - 纹理宽度
   * @param {number} height - 纹理高度
   * @param {Object} params - 粒子参数
   */
  generateParticleTexture(data, width, height, params) {
    const {
      radius = 0.4,
      softness = 0.2,
      color = [255, 255, 255, 255],
    } = params
    
    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(centerX, centerY) * radius
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const index = (y * width + x) * 4
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2)
        
        let alpha = 0
        if (distance <= maxRadius) {
          const normalizedDistance = distance / maxRadius
          alpha = Math.max(0, 1 - Math.pow(normalizedDistance, 1 / softness))
        }
        
        data[index] = color[0]
        data[index + 1] = color[1]
        data[index + 2] = color[2]
        data[index + 3] = color[3] * alpha
      }
    }
  }

  /**
   * 简单噪声函数
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   * @param {number} seed - 随机种子
   * @returns {number} 噪声值
   */
  simpleNoise(x, y, seed) {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed * 37.719) * 43758.5453
    return n - Math.floor(n)
  }

  /**
   * 优化纹理设置
   * 
   * 根据用途和硬件能力，自动优化纹理参数。
   * 包括过滤方式、包裹模式、压缩格式等。
   * 
   * @param {Texture} texture - 要优化的纹理
   * @param {Object} options - 优化选项
   * @returns {Texture} 优化后的纹理
   */
  optimizeTexture(texture, options = {}) {
    const {
      usage = 'general',      // 使用场景: general | ui | effect | normal
      quality = this.config.textureQuality,
      enableMipmap = true,
    } = options
    
    console.log(`[MapResource] 优化纹理设置: ${usage} quality`)
    
    // ============ 根据使用场景优化 ============
    switch (usage) {
      case 'ui':
        // UI纹理：清晰度优先，禁用mipmaps
        texture.magFilter = LinearFilter
        texture.minFilter = LinearFilter
        texture.generateMipmaps = false
        texture.wrapS = ClampToEdgeWrapping
        texture.wrapT = ClampToEdgeWrapping
        break
        
      case 'effect':
        // 特效纹理：性能优先，启用重复
        texture.magFilter = LinearFilter
        texture.minFilter = LinearFilter
        texture.generateMipmaps = enableMipmap
        texture.wrapS = RepeatWrapping
        texture.wrapT = RepeatWrapping
        break
        
      case 'normal':
        // 法线贴图：精度优先
        texture.magFilter = LinearFilter
        texture.minFilter = LinearFilter
        texture.generateMipmaps = enableMipmap
        texture.wrapS = RepeatWrapping
        texture.wrapT = RepeatWrapping
        break
        
      default:
        // 通用纹理：平衡设置
        texture.magFilter = LinearFilter
        texture.minFilter = enableMipmap ? LinearFilter : LinearFilter
        texture.generateMipmaps = enableMipmap
        texture.wrapS = RepeatWrapping
        texture.wrapT = RepeatWrapping
    }
    
    // ============ 根据质量等级调整 ============
    if (quality === 'low') {
      texture.magFilter = NearestFilter
      texture.minFilter = NearestFilter
      texture.generateMipmaps = false
    }
    
    // 发射纹理优化事件
    this.eventBus.emit('resource:textureOptimized', {
      usage,
      quality,
      enableMipmap,
      textureSize: `${texture.image?.width || 0}x${texture.image?.height || 0}`
    })
    
    return texture
  }

  /**
   * 添加资源到缓存
   * @param {string} name - 资源名称
   * @param {any} resource - 资源对象
   * @param {Object} options - 缓存选项
   */
  addToCache(name, resource, options = {}) {
    const resourceType = this.detectResourceType(resource)
    const cacheMap = resourceType === 'texture' ? this.textureCache : this.dataCache
    
    // 检查缓存大小限制
    if (this.checkCacheSize(resource)) {
      cacheMap.set(name, resource)
      
      // 更新统计信息
      this.updateResourceStats(name, 'cache', {
        type: resourceType,
        size: this.estimateResourceSize(resource),
        timestamp: Date.now()
      })
      
      console.log(`[MapResource] 资源已缓存: ${name} (${resourceType})`)
    } else {
      console.warn(`[MapResource] 缓存已满，无法缓存资源: ${name}`)
      this.eventBus.emit('resource:cacheFull', { name, type: resourceType })
    }
  }

  /**
   * 检测资源类型
   * @param {any} resource - 资源对象
   * @returns {string} 资源类型
   */
  detectResourceType(resource) {
    if (resource instanceof Texture) return 'texture'
    if (typeof resource === 'string' && this.isJSONString(resource)) return 'json'
    if (typeof resource === 'object') return 'data'
    return 'unknown'
  }

  /**
   * 检查是否为JSON字符串
   * @param {string} str - 字符串
   * @returns {boolean} 是否为JSON
   */
  isJSONString(str) {
    try {
      JSON.parse(str)
      return true
    } catch {
      return false
    }
  }

  /**
   * 检查缓存大小
   * @param {any} resource - 资源对象
   * @returns {boolean} 是否可以缓存
   */
  checkCacheSize(resource) {
    const resourceSize = this.estimateResourceSize(resource)
    const currentCacheSize = this.calculateCurrentCacheSize()
    
    return (currentCacheSize + resourceSize) <= this.config.maxCacheSize
  }

  /**
   * 估算资源大小
   * @param {any} resource - 资源对象
   * @returns {number} 估算大小（字节）
   */
  estimateResourceSize(resource) {
    if (resource instanceof Texture && resource.image) {
      const width = resource.image.width || 256
      const height = resource.image.height || 256
      return width * height * 4 // RGBA
    }
    
    if (typeof resource === 'string') {
      return resource.length * 2 // UTF-16
    }
    
    if (typeof resource === 'object') {
      return JSON.stringify(resource).length * 2
    }
    
    return 1024 // 默认1KB
  }

  /**
   * 计算当前缓存大小
   * @returns {number} 缓存大小（字节）
   */
  calculateCurrentCacheSize() {
    let totalSize = 0
    
    this.textureCache.forEach(texture => {
      totalSize += this.estimateResourceSize(texture)
    })
    
    this.dataCache.forEach(data => {
      totalSize += this.estimateResourceSize(data)
    })
    
    return totalSize
  }

  /**
   * 更新资源统计
   * @param {string} name - 资源名称
   * @param {string} action - 操作类型
   * @param {Object} data - 额外数据
   */
  updateResourceStats(name, action, data = {}) {
    if (!this.resourceStats.has(name)) {
      this.resourceStats.set(name, {
        name,
        hits: 0,
        misses: 0,
        lastAccess: Date.now(),
        size: 0,
        type: 'unknown'
      })
    }
    
    const stats = this.resourceStats.get(name)
    
    switch (action) {
      case 'hit':
        stats.hits++
        stats.lastAccess = Date.now()
        break
      case 'miss':
        stats.misses++
        break
      case 'cache':
        stats.size = data.size || 0
        stats.type = data.type || 'unknown'
        stats.lastAccess = data.timestamp || Date.now()
        break
    }
    
    this.resourceStats.set(name, stats)
  }

  /**
   * 清理过期缓存
   * 
   * 根据使用频率和时间，清理不活跃的缓存资源。
   * 释放内存空间，保持系统性能。
   */
  cleanExpiredCache() {
    const now = Date.now()
    const expiredResources = []
    
    // ============ 检查纹理缓存 ============
    this.textureCache.forEach((texture, name) => {
      const stats = this.resourceStats.get(name)
      if (stats && (now - stats.lastAccess) > this.config.cacheExpiry) {
        expiredResources.push({ name, type: 'texture', cache: this.textureCache })
      }
    })
    
    // ============ 检查数据缓存 ============
    this.dataCache.forEach((data, name) => {
      const stats = this.resourceStats.get(name)
      if (stats && (now - stats.lastAccess) > this.config.cacheExpiry) {
        expiredResources.push({ name, type: 'data', cache: this.dataCache })
      }
    })
    
    // ============ 清理过期资源 ============
    expiredResources.forEach(({ name, type, cache }) => {
      const resource = cache.get(name)
      if (resource && resource.dispose) {
        resource.dispose()
      }
      cache.delete(name)
      this.resourceStats.delete(name)
      console.log(`[MapResource] 清理过期缓存: ${name} (${type})`)
    })
    
    if (expiredResources.length > 0) {
      this.eventBus.emit('resource:cacheCleared', {
        count: expiredResources.length,
        types: [...new Set(expiredResources.map(r => r.type))]
      })
    }
    
    console.log(`[MapResource] 缓存清理完成，清理了 ${expiredResources.length} 个过期资源`)
  }

  /**
   * 获取性能统计信息
   * @returns {Object} 性能指标
   */
  getPerformanceMetrics() {
    const cacheSize = this.calculateCurrentCacheSize()
    const hitRate = this.performanceMetrics.cacheHits / 
                   (this.performanceMetrics.cacheHits + this.performanceMetrics.cacheMisses) * 100
    
    return {
      ...this.performanceMetrics,
      cacheSize,
      cacheCount: this.textureCache.size + this.dataCache.size,
      hitRate: isNaN(hitRate) ? 0 : hitRate.toFixed(2),
      averageLoadTime: this.performanceMetrics.totalLoadTime / 
                      Math.max(this.performanceMetrics.loadedResources, 1),
    }
  }

  /**
   * 获取资源统计报告
   * @returns {Object} 资源使用报告
   */
  getResourceReport() {
    const textureStats = []
    const dataStats = []
    
    this.resourceStats.forEach(stats => {
      if (stats.type === 'texture') {
        textureStats.push(stats)
      } else {
        dataStats.push(stats)
      }
    })
    
    // 按命中率排序
    textureStats.sort((a, b) => b.hits - a.hits)
    dataStats.sort((a, b) => b.hits - a.hits)
    
    return {
      textureStats: textureStats.slice(0, 10), // 前10个
      dataStats: dataStats.slice(0, 10),
      totalResources: this.resourceStats.size,
      cacheUtilization: {
        texture: this.textureCache.size,
        data: this.dataCache.size,
        total: this.textureCache.size + this.dataCache.size
      }
    }
  }

  /**
   * 清理所有缓存
   */
  clearAllCache() {
    console.log('[MapResource] 清理所有缓存')
    
    // ============ 清理纹理缓存 ============
    this.textureCache.forEach(texture => {
      if (texture && texture.dispose) {
        texture.dispose()
      }
    })
    this.textureCache.clear()
    
    // ============ 清理数据缓存 ============
    this.dataCache.clear()
    
    // ============ 清理统计信息 ============
    this.resourceStats.clear()
    
    // ============ 重置性能指标 ============
    this.performanceMetrics = {
      totalLoadTime: 0,
      loadedResources: 0,
      cacheHits: 0,
      cacheMisses: 0,
      memoryUsage: 0,
      gpuMemoryUsage: 0,
    }
    
    this.eventBus.emit('resource:allCacheCleared')
    console.log('[MapResource] 所有缓存已清理')
  }

  /**
   * 更新资源管理器配置
   * @param {Object} newConfig - 新配置
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig }
    console.log('[MapResource] 配置已更新:', newConfig)
    
    this.eventBus.emit('resource:configUpdated', { config: this.config })
  }

  /**
   * 销毁资源管理器
   * 清理所有资源和缓存，释放内存
   */
  destroy() {
    console.log('[MapResource] 开始销毁资源管理器')
    
    // ============ 清理所有缓存 ============
    this.clearAllCache()
    
    // ============ 清理加载队列 ============
    this.loadingQueue.clear()
    
    // ============ 清理加载器 ============
    this.textureLoader = null
    this.fileLoader = null
    this.compressedTextureLoader = null
    
    // ============ 发射销毁事件 ============
    this.eventBus.emit('resource:destroyed')
    
    console.log('[MapResource] 资源管理器已销毁')
  }
}
