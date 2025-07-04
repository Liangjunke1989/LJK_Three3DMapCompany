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
import { ref, onMounted, onUnmounted } from 'vue'
import { Mini3d } from '@/mini3d'
import { MapModuleManager } from './index.js'

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
    moduleManager.createMirror()
    
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
      moduleManager.update(16)
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
      
      const fps = performanceMetrics.value.frameMetrics?.averageFPS
      if (fps && fps < 30) {
        console.warn('FPS过低:', fps)
      }
      
      const memory = performanceMetrics.value.memoryUsage
      if (memory && memory.used > memory.limit * 0.8) {
        console.warn('内存使用过高')
        const resourceModule = moduleManager.getModule('resource')
        resourceModule.cleanExpiredCache()
      }
    }
  }, 1000)
}

// ============ 高级功能启用 ============
function enableAdvancedFeatures() {
  console.log('启用高级功能')
}

// ============ 工具函数 ============
function formatMemory(bytes) {
  if (!bytes) return '0 B'
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

function showErrorNotification(message) {
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