# 地图模块化系统使用指南

## 📖 目录

- [快速开始](#快速开始)
- [核心概念](#核心概念)
- [模块详解](#模块详解)
- [API参考](#api参考)
- [最佳实践](#最佳实践)
- [完整使用案例](#完整使用案例)
- [故障排除](#故障排除)
- [性能优化](#性能优化)

## 🚀 快速开始

### 基础安装和设置

```javascript
import { MapModuleManager } from './modules/index.js'

// 创建Mini3d实例
const mini3d = new Mini3d(canvas)

// 创建模块管理器
const moduleManager = new MapModuleManager(mini3d, {
  geoProjectionCenter: [108.55, 34.32],  // 地图投影中心
  debug: true,                           // 启用调试模式
  performance: true,                     // 启用性能监控
  errorRecovery: true,                   // 启用错误恢复
  setEnable: (enabled) => {              // UI状态回调
    console.log('UI状态:', enabled)
  }
})

// 获取模块实例
const coreModule = moduleManager.getModule('core')
const visualizationModule = moduleManager.getModule('visualization')
```

### 基本地图创建

```javascript
// 1. 创建地图核心模型
moduleManager.createModel()

// 2. 创建数据可视化组件
moduleManager.createBar()           // 3D柱状图
moduleManager.createScatter()       // 散点图
moduleManager.createFlyLine()       // 飞线动画

// 3. 创建特效材质
moduleManager.createFloor()         // 地面装饰
moduleManager.createMirror()        // 镜面反射
moduleManager.createParticles()     // 粒子系统

// 4. 添加交互事件
const interactionModule = moduleManager.getModule('interaction')
interactionModule.addEvent()
```

## 🧩 核心概念

### 1. 模块化架构

系统采用**模块化设计**，每个模块负责特定功能：

```
MapModuleManager (管理器)
├── SharedState (共享状态)
├── ModuleEventBus (事件总线)
├── MapCore (核心渲染)
├── MapVisualization (数据可视化)
├── MapMaterials (材质特效)
├── MapAnimations (动画系统)
├── MapInteraction (交互系统)
├── MapNavigation (导航系统)
└── MapResource (资源管理)
```

### 2. 事件驱动通信

模块间通过**事件总线**进行解耦通信：

```javascript
const eventBus = moduleManager.getEventBus()

// 监听事件
eventBus.on('map:hover', (data) => {
  console.log('省份悬停:', data.province.name)
})

// 发射事件
eventBus.emit('map:click', { 
  province: { name: '北京', adcode: 110000 } 
})
```

### 3. 共享状态管理

所有模块共享状态数据：

```javascript
const state = moduleManager.getState()

// 访问共享数据
console.log('当前场景:', state.currentScene)
console.log('地图深度:', state.depth)
console.log('选中省份:', state.selectedProvince)

// 获取状态快照
const snapshot = state.getSnapshot()
```

## 📚 模块详解

### MapCore - 核心渲染模块

负责地图的基础渲染功能：

```javascript
const coreModule = moduleManager.getModule('core')

// 创建地图主模型
coreModule.createModel()

// 创建省份几何体
const { province } = coreModule.createProvince()

// 计算UV坐标
coreModule.calcUv2(geometry, width, height, minX, minY)

// 创建省份材质
const [topMaterial, sideMaterial] = coreModule.createProvinceMaterial()
```

### MapVisualization - 数据可视化模块

提供丰富的数据可视化组件：

```javascript
const vizModule = moduleManager.getModule('visualization')

// 3D柱状图系统
vizModule.createBar()                // 创建数据柱状图
vizModule.setBarMove(adcode, 'up')   // 柱状图联动移动

// 散点图系统
vizModule.createScatter()            // 创建散点图
vizModule.setScatterMove(adcode, 'up') // 散点联动移动

// 飞线动画系统
vizModule.createFlyLine()            // 创建飞线
vizModule.createFlyLineFocus()       // 创建飞线焦点

// 路径动画系统
vizModule.createPathAnimate()        // 创建路径动画
vizModule.createStorke()             // 创建轮廓动画

// 标签系统
vizModule.createBadgeLabel()         // 创建标牌标签
vizModule.setLabelVisible('labelGroup', true) // 控制标签可见性
```

### MapMaterials - 材质特效模块

管理各种视觉特效材质：

```javascript
const materialsModule = moduleManager.getModule('materials')

// 辉光效果（用于柱状图）
const glowMeshes = materialsModule.createHUIGUANG(10, 0xfbdf88)
barMesh.add(...glowMeshes)

// 光圈效果（用于省份装饰）
const lightCircle = materialsModule.createQuan()
provinceMesh.add(lightCircle)

// 环境特效
materialsModule.createFloor()        // 地面装饰
materialsModule.createGridRipple()   // 网格波纹
materialsModule.createMirror()       // 镜面反射
materialsModule.createRotateBorder() // 旋转边框
materialsModule.createParticles()    // 粒子系统
materialsModule.createWatermark()    // 水印效果
```

### MapAnimations - 动画系统模块

提供各种动画效果：

```javascript
const animationsModule = moduleManager.getModule('animations')

// 入场动画序列
const timeline = animationsModule.playEntranceAnimation()

// 路径和轮廓动画
animationsModule.createPathAnimate()  // 路径流动动画
animationsModule.createStorke()       // 轮廓流动动画

// 飞线焦点动画
animationsModule.createFlyLineFocus() // 脉冲光圈动画

// 动画控制
animationsModule.pauseAllAnimations()  // 暂停所有动画
animationsModule.resumeAllAnimations() // 恢复所有动画

// 获取动画统计
const stats = animationsModule.getAnimationStats()
```

### MapInteraction - 交互系统模块

处理用户交互和组件联动：

```javascript
const interactionModule = moduleManager.getModule('interaction')

// 添加地图交互事件
interactionModule.addEvent()

// 组件联动移动效果
interactionModule.setBarMove(adcode, 'up')      // 柱状图联动
interactionModule.setGQMove(adcode, 'up')       // 光圈联动
interactionModule.setLabelMove(adcode, 'up')    // 标签联动
interactionModule.setScatterMove(adcode, 'up')  // 散点图联动
```

### MapNavigation - 导航系统模块

管理多层级地图导航：

```javascript
const navigationModule = moduleManager.getModule('navigation')

// 加载子地图（省→市）
navigationModule.loadChildMap({
  adcode: 440000,
  name: '广东省',
  center: [113.3, 23.1],
  centroid: [113.4, 23.4],
  childrenNum: 21
})

// 返回上一级地图
navigationModule.goBack()

// 控制主地图显示
navigationModule.setMainMapVisible(true)

// 获取子地图数据
navigationModule.getChildMapData(userData, (data) => {
  console.log('子地图数据已加载')
})
```

### MapResource - 资源管理模块

智能资源管理和性能优化：

```javascript
const resourceModule = moduleManager.getModule('resource')

// 智能资源获取（自动缓存）
const texture = resourceModule.getResource('pathLine')
const mapData = resourceModule.getResource('china')

// 批量预加载
await resourceModule.preloadResources([
  'china', 'pathLine', 'flyLine', 'topNormal'
], {
  priority: 'high',
  concurrent: 4,
  timeout: 8000
})

// 创建程序生成纹理
const gradientTexture = resourceModule.createProceduralTexture('gradient', {
  width: 256,
  height: 256,
  direction: 'radial',
  startColor: [255, 255, 0, 255],
  endColor: [255, 0, 0, 0]
})

// 纹理优化
resourceModule.optimizeTexture(texture, {
  usage: 'effect',
  quality: 'high',
  enableMipmap: true
})

// 性能监控
const metrics = resourceModule.getPerformanceMetrics()
console.log('缓存命中率:', metrics.hitRate + '%')

// 清理过期缓存
resourceModule.cleanExpiredCache()
```

## 📖 API参考

### MapModuleManager API

```javascript
class MapModuleManager {
  constructor(mini3dInstance, config = {})
  
  // 模块访问
  getModule(moduleName: string): Module
  getState(): SharedState
  getEventBus(): ModuleEventBus
  
  // 性能监控
  getPerformanceMetrics(): Object
  
  // 生命周期
  update(deltaTime: number): void
  destroy(): void
  
  // 调试工具（debug模式下可用）
  getSnapshot(): Object
}
```

### SharedState API

```javascript
class SharedState {
  // 地图配置
  geoProjectionCenter: [number, number]
  flyLineCenter: [number, number]
  depth: number
  pointCenter: [number, number]
  
  // 场景状态
  currentScene: 'mainScene' | 'childScene'
  clicked: boolean
  currentLevel: 'china' | 'province' | 'city'
  selectedProvince: Object | null
  
  // 方法
  init(mini3dInstance, config): void
  reset(): void
  getSnapshot(): Object
}
```

### ModuleEventBus API

```javascript
class ModuleEventBus extends EventEmitter {
  // 事件常量
  EVENTS: {
    MAP_HOVER: 'map:hover',
    MAP_CLICK: 'map:click',
    SCENE_CHANGE: 'scene:change',
    // ... 更多事件类型
  }
  
  // 便捷方法
  emitMapInteraction(type, data): void
  emitSceneChange(fromScene, toScene, data): void
  emitComponentAction(action, componentType, data): void
  emitAnimation(type, animationData): void
  emitNavigation(action, navigationData): void
  
  // 批量管理
  registerListeners(listeners): void
  unregisterListeners(listeners): void
  
  // 命名空间
  createNamespace(namespace): Object
  
  // 统计和调试
  getListenerStats(): Object
  cleanup(): void
}
```

## 💡 最佳实践

### 1. 模块初始化顺序

```javascript
// 推荐的初始化顺序
async function initializeMap() {
  // 1. 创建管理器
  const moduleManager = new MapModuleManager(mini3d, config)
  
  // 2. 等待资源预加载
  await moduleManager.preloadResources(['china', 'pathLine', 'topNormal'])
  
  // 3. 创建核心地图
  moduleManager.createModel()
  
  // 4. 创建可视化组件
  moduleManager.createBar()
  moduleManager.createScatter()
  
  // 5. 创建特效材质
  moduleManager.createFloor()
  moduleManager.createMirror()
  
  // 6. 添加交互
  const interactionModule = moduleManager.getModule('interaction')
  interactionModule.addEvent()
  
  // 7. 播放入场动画
  const animationsModule = moduleManager.getModule('animations')
  animationsModule.playEntranceAnimation()
}
```

### 2. 事件处理模式

```javascript
// 集中式事件监听
const eventBus = moduleManager.getEventBus()

const eventHandlers = {
  'map:hover': (data) => {
    console.log('省份悬停:', data.province.name)
    // 更新UI显示
    updateProvinceInfo(data.province)
  },
  
  'map:click': (data) => {
    console.log('省份点击:', data.province.name)
    // 可能触发导航
    if (data.province.childrenNum > 0) {
      navigationModule.loadChildMap(data.province)
    }
  },
  
  'scene:change': (data) => {
    console.log('场景切换:', data.fromScene, '→', data.toScene)
    // 更新UI状态
    updateSceneUI(data.toScene)
  },
  
  'animation:complete': (data) => {
    console.log('动画完成:', data.type)
    // 可能启用用户交互
    if (data.type === 'entrance') {
      enableUserInteraction()
    }
  }
}

// 批量注册事件监听器
eventBus.registerListeners(eventHandlers)

// 组件销毁时清理
onUnmounted(() => {
  eventBus.unregisterListeners(eventHandlers)
})
```

### 3. 性能监控和优化

```javascript
// 启用性能监控
const moduleManager = new MapModuleManager(mini3d, {
  performance: true,
  debug: true
})

// 定期检查性能
setInterval(() => {
  const metrics = moduleManager.getPerformanceMetrics()
  
  // 检查FPS
  if (metrics.frameMetrics.averageFPS < 30) {
    console.warn('FPS过低，考虑优化')
    // 可以降低特效质量
    reduceEffectQuality()
  }
  
  // 检查内存使用
  if (metrics.memoryUsage.used > metrics.memoryUsage.limit * 0.8) {
    console.warn('内存使用过高')
    // 清理缓存
    resourceModule.cleanExpiredCache()
  }
}, 5000)
```

### 4. 错误处理和恢复

```javascript
// 全局错误处理
const eventBus = moduleManager.getEventBus()

eventBus.on('manager:error', (errorInfo) => {
  console.error('模块错误:', errorInfo)
  
  // 根据错误类型处理
  switch (errorInfo.type) {
    case 'MODULE_INIT_FAILED':
      showErrorMessage(`模块 ${errorInfo.context.moduleName} 初始化失败`)
      break
      
    case 'METHOD_EXECUTION_FAILED':
      showErrorMessage(`操作失败: ${errorInfo.context.methodName}`)
      break
      
    case 'RESOURCE_LOAD_FAILED':
      showErrorMessage('资源加载失败，请检查网络连接')
      break
  }
})

// 启用自动错误恢复
const moduleManager = new MapModuleManager(mini3d, {
  errorRecovery: true
})
```

## 🔧 完整使用案例

这里提供一个完整的Vue组件使用案例：

```vue
<template>
  <div class="map-container">
    <canvas ref="canvasRef" id="map-canvas"></canvas>
    
    <!-- UI控制面板 -->
    <div class="control-panel">
      <button @click="showBars" :class="{ active: showBarChart }">
        显示柱状图
      </button>
      <button @click="showScatter" :class="{ active: showScatterPlot }">
        显示散点图
      </button>
      <button @click="showFlyLines" :class="{ active: showFlyLineChart }">
        显示飞线
      </button>
      <button @click="toggleMirror" :class="{ active: mirrorEnabled }">
        镜面反射
      </button>
      <button @click="playAnimation">
        播放动画
      </button>
      <button @click="goBackToMain" v-show="!isMainScene">
        返回主地图
      </button>
    </div>
    
    <!-- 省份信息面板 -->
    <div class="info-panel" v-show="hoveredProvince">
      <h3>{{ hoveredProvince?.name }}</h3>
      <p>人口: {{ hoveredProvince?.value }}万人</p>
      <p>排名: 第{{ hoveredProvince?.rank }}位</p>
    </div>
    
    <!-- 性能监控面板 -->
    <div class="performance-panel" v-show="debugMode">
      <h4>性能监控</h4>
      <p>FPS: {{ performanceMetrics.frameMetrics?.averageFPS?.toFixed(1) }}</p>
      <p>内存: {{ formatMemory(performanceMetrics.memoryUsage?.used) }}</p>
      <p>模块数: {{ Object.keys(moduleStatus).length }}</p>
    </div>
    
    <!-- 加载状态 -->
    <div class="loading-overlay" v-show="isLoading">
      <div class="loading-spinner"></div>
      <p>{{ loadingMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { Mini3d } from '@/mini3d'
import { MapModuleManager } from './modules/index.js'

// ============ 响应式数据 ============
const canvasRef = ref()
const isLoading = ref(true)
const loadingMessage = ref('初始化中...')
const debugMode = ref(true)

// 地图状态
const isMainScene = ref(true)
const hoveredProvince = ref(null)
const selectedProvince = ref(null)

// UI控制状态
const showBarChart = ref(false)
const showScatterPlot = ref(false)
const showFlyLineChart = ref(false)
const mirrorEnabled = ref(false)

// 性能监控
const performanceMetrics = ref({})
const moduleStatus = ref({})

// ============ 核心实例 ============
let mini3d = null
let moduleManager = null
let animationId = null

// ============ 生命周期钩子 ============
onMounted(async () => {
  await initializeMap()
})

onUnmounted(() => {
  cleanup()
})

// ============ 地图初始化 ============
async function initializeMap() {
  try {
    // 1. 创建Mini3d实例
    loadingMessage.value = '创建3D引擎...'
    mini3d = new Mini3d(canvasRef.value)
    
    // 2. 创建模块管理器
    loadingMessage.value = '初始化模块...'
    moduleManager = new MapModuleManager(mini3d, {
      geoProjectionCenter: [108.55, 34.32],
      debug: debugMode.value,
      performance: true,
      errorRecovery: true,
      setEnable: (enabled) => {
        console.log('UI状态更新:', enabled)
      }
    })
    
    // 3. 注册事件监听器
    registerEventListeners()
    
    // 4. 预加载关键资源
    loadingMessage.value = '加载资源...'
    const resourceModule = moduleManager.getModule('resource')
    await resourceModule.preloadResources([
      'china', 'pathLine', 'flyLine', 'topNormal', 'huiguang', 'guangquan1'
    ], {
      priority: 'high',
      timeout: 10000
    })
    
    // 5. 创建核心地图
    loadingMessage.value = '创建地图...'
    moduleManager.createModel()
    
    // 6. 创建环境效果
    loadingMessage.value = '创建特效...'
    moduleManager.createFloor()
    moduleManager.createGridRipple()
    moduleManager.createMirror()
    moduleManager.createRotateBorder()
    moduleManager.createParticles()
    
    // 7. 添加交互
    const interactionModule = moduleManager.getModule('interaction')
    interactionModule.addEvent()
    
    // 8. 播放入场动画
    loadingMessage.value = '播放动画...'
    const animationsModule = moduleManager.getModule('animations')
    animationsModule.playEntranceAnimation()
    
    // 9. 启动渲染循环
    startRenderLoop()
    
    // 10. 启动性能监控
    startPerformanceMonitoring()
    
    // 11. 完成初始化
    setTimeout(() => {
      isLoading.value = false
      console.log('地图初始化完成')
    }, 2000)
    
  } catch (error) {
    console.error('地图初始化失败:', error)
    loadingMessage.value = '初始化失败: ' + error.message
  }
}

// ============ 事件监听器注册 ============
function registerEventListeners() {
  const eventBus = moduleManager.getEventBus()
  
  // 地图交互事件
  eventBus.on('map:hover', (data) => {
    hoveredProvince.value = data.province
  })
  
  eventBus.on('map:leave', () => {
    hoveredProvince.value = null
  })
  
  eventBus.on('map:click', (data) => {
    selectedProvince.value = data.province
    console.log('选中省份:', data.province.name)
  })
  
  // 场景切换事件
  eventBus.on('scene:change', (data) => {
    isMainScene.value = data.toScene === 'mainScene'
    console.log('场景切换:', data.fromScene, '→', data.toScene)
  })
  
  // 导航事件
  eventBus.on('navigation:loadComplete', (data) => {
    console.log('子地图加载完成:', data.userData.name)
    loadingMessage.value = ''
    isLoading.value = false
  })
  
  // 动画事件
  eventBus.on('animation:complete', (data) => {
    console.log('动画完成:', data.type)
    if (data.type === 'entrance') {
      // 入场动画完成，可以启用某些功能
      enableAdvancedFeatures()
    }
  })
  
  // 错误处理
  eventBus.on('manager:error', (errorInfo) => {
    console.error('系统错误:', errorInfo)
    showErrorNotification(errorInfo.message)
  })
}

// ============ UI控制方法 ============
function showBars() {
  showBarChart.value = !showBarChart.value
  if (showBarChart.value) {
    moduleManager.createBar()
  } else {
    // 隐藏柱状图的逻辑
    const vizModule = moduleManager.getModule('visualization')
    if (vizModule.barGroup) {
      vizModule.barGroup.visible = false
    }
  }
}

function showScatter() {
  showScatterPlot.value = !showScatterPlot.value
  if (showScatterPlot.value) {
    moduleManager.createScatter()
    const vizModule = moduleManager.getModule('visualization')
    vizModule.scatterGroup.visible = true
  } else {
    const vizModule = moduleManager.getModule('visualization')
    if (vizModule.scatterGroup) {
      vizModule.scatterGroup.visible = false
    }
  }
}

function showFlyLines() {
  showFlyLineChart.value = !showFlyLineChart.value
  if (showFlyLineChart.value) {
    moduleManager.createFlyLine()
    const vizModule = moduleManager.getModule('visualization')
    vizModule.flyLineGroup.visible = true
    vizModule.flyLineFocusGroup.visible = true
  } else {
    const vizModule = moduleManager.getModule('visualization')
    if (vizModule.flyLineGroup) {
      vizModule.flyLineGroup.visible = false
      vizModule.flyLineFocusGroup.visible = false
    }
  }
}

function toggleMirror() {
  mirrorEnabled.value = !mirrorEnabled.value
  const state = moduleManager.getState()
  if (state.groundMirror) {
    state.groundMirror.visible = mirrorEnabled.value
  }
}

function playAnimation() {
  const animationsModule = moduleManager.getModule('animations')
  animationsModule.playEntranceAnimation()
}

function goBackToMain() {
  const navigationModule = moduleManager.getModule('navigation')
  navigationModule.goBack()
}

// ============ 渲染循环 ============
function startRenderLoop() {
  const render = () => {
    if (moduleManager) {
      moduleManager.update(16) // 假设60FPS
    }
    animationId = requestAnimationFrame(render)
  }
  render()
}

// ============ 性能监控 ============
function startPerformanceMonitoring() {
  setInterval(() => {
    if (moduleManager) {
      performanceMetrics.value = moduleManager.getPerformanceMetrics()
      
      // 检查性能警告
      const fps = performanceMetrics.value.frameMetrics?.averageFPS
      if (fps && fps < 30) {
        console.warn('FPS过低:', fps)
      }
      
      // 检查内存使用
      const memory = performanceMetrics.value.memoryUsage
      if (memory && memory.used > memory.limit * 0.8) {
        console.warn('内存使用过高')
        // 自动清理缓存
        const resourceModule = moduleManager.getModule('resource')
        resourceModule.cleanExpiredCache()
      }
    }
  }, 1000)
}

// ============ 高级功能启用 ============
function enableAdvancedFeatures() {
  // 入场动画完成后启用的功能
  console.log('启用高级功能')
  
  // 可以启用某些UI控件
  // 可以开始定期数据更新
  // 可以启用自动演示模式等
}

// ============ 工具函数 ============
function formatMemory(bytes) {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

function showErrorNotification(message) {
  // 实现错误通知显示
  console.error('错误通知:', message)
}

// ============ 清理资源 ============
function cleanup() {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  
  if (moduleManager) {
    moduleManager.destroy()
    moduleManager = null
  }
  
  if (mini3d) {
    mini3d.destroy()
    mini3d = null
  }
}
</script>

<style scoped>
.map-container {
  position: relative;
  width: 100%;
  height: 100vh;
  background: #000;
}

#map-canvas {
  width: 100%;
  height: 100%;
}

.control-panel {
  position: absolute;
  top: 20px;
  left: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.control-panel button {
  padding: 10px 15px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: 1px solid #333;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s;
}

.control-panel button:hover {
  background: rgba(255, 255, 255, 0.1);
}

.control-panel button.active {
  background: rgba(0, 255, 255, 0.3);
  border-color: #00ffff;
}

.info-panel {
  position: absolute;
  top: 20px;
  right: 20px;
  padding: 15px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  border-radius: 8px;
  min-width: 200px;
}

.performance-panel {
  position: absolute;
  bottom: 20px;
  left: 20px;
  padding: 10px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border-radius: 4px;
  font-size: 12px;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: white;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #333;
  border-top: 3px solid #00ffff;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>
```

## 🐛 故障排除

### 常见问题和解决方案

#### 1. 模块初始化失败

```javascript
// 检查模块状态
const moduleStatus = moduleManager.getModuleStatus()
console.log('模块状态:', moduleStatus)

// 查看错误日志
const errors = moduleManager.getPerformanceMetrics().errorLog
console.log('错误日志:', errors)
```

#### 2. 资源加载失败

```javascript
// 检查资源加载状态
const resourceModule = moduleManager.getModule('resource')
const report = resourceModule.getResourceReport()
console.log('资源报告:', report)

// 手动重试加载
try {
  await resourceModule.preloadResources(['china'], { retry: 3 })
} catch (error) {
  console.error('资源加载重试失败:', error)
}
```

#### 3. 性能问题

```javascript
// 检查性能指标
const metrics = moduleManager.getPerformanceMetrics()
if (metrics.frameMetrics.averageFPS < 30) {
  // 降低特效质量
  const materialsModule = moduleManager.getModule('materials')
  materialsModule.particles.instance.visible = false
  
  // 清理缓存
  resourceModule.cleanExpiredCache()
}
```

#### 4. 调试技巧

```javascript
// 启用调试模式
const moduleManager = new MapModuleManager(mini3d, { debug: true })

// 使用调试工具
window.mapDebug.getState()      // 获取状态
window.mapDebug.getModules()    // 获取模块列表
window.mapDebug.getMetrics()    // 获取性能指标
window.mapDebug.getErrors()     // 获取错误日志
```

## ⚡ 性能优化

### 1. 资源优化

```javascript
// 预加载策略
const preloadStrategy = {
  critical: ['china', 'topNormal'],           // 关键资源
  important: ['pathLine', 'flyLine'],        // 重要资源
  optional: ['guangquan1', 'huiguang']       // 可选资源
}

// 分阶段加载
await resourceModule.preloadResources(preloadStrategy.critical, { priority: 'high' })
await resourceModule.preloadResources(preloadStrategy.important, { priority: 'normal' })
setTimeout(() => {
  resourceModule.preloadResources(preloadStrategy.optional, { priority: 'low' })
}, 5000)
```

### 2. 渲染优化

```javascript
// LOD (Level of Detail) 控制
const camera = moduleManager.getState().camera
const distance = camera.position.distanceTo(target)

if (distance > 100) {
  // 远距离：降低细节
  materialsModule.particles.instance.visible = false
  vizModule.scatterGroup.visible = false
} else {
  // 近距离：显示全部细节
  materialsModule.particles.instance.visible = true
  vizModule.scatterGroup.visible = true
}
```

### 3. 内存管理

```javascript
// 定期清理
setInterval(() => {
  const metrics = moduleManager.getPerformanceMetrics()
  
  if (metrics.memoryUsage.used > metrics.memoryUsage.limit * 0.7) {
    resourceModule.cleanExpiredCache()
    console.log('自动清理缓存完成')
  }
}, 30000) // 每30秒检查一次
```

这个使用指南提供了完整的模块化系统使用方法，包括基础用法、高级功能、最佳实践和完整的Vue组件案例。开发者可以根据这个指南快速上手并充分利用模块化架构的优势。 