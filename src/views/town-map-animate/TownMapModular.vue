<template>
  <div class="town-map-container">
    <canvas id="townCanvas"></canvas>
    <div class="town-nav">
      <div class="nav-title">模块化村镇3D地图</div>
      <div class="nav-buttons">
        <select v-model="selectedDataSource" @change="loadNewData" class="nav-select">
          <option value="">选择数据源</option>
          <option value="shapotou-towns">沙坡头区（镇级）</option>
          <option value="shapotou-outline">沙坡头区轮廓</option>
          <option value="/assets/testTownData/shapotou.json">沙坡头镇数据（原始）</option>
          <option value="/assets/testTownData/沙坡头区轮廓.json">沙坡头轮廓（原始）</option>
          <option value="/assets/testTownData/example.json">示例JSON</option>
          <option value="/assets/testTownData/test.geojson">测试GeoJSON</option>
          <option value="/assets/json/中华人民共和国.json">中国地图JSON</option>
          <option value="builtin">内置测试数据</option>
        </select>
        <router-link to="/three-3d-map" class="nav-btn">返回主地图</router-link>
        <button @click="resetView" class="nav-btn">重置视角</button>
      </div>
    </div>
    <div class="loading-overlay" v-if="loading">
      <div class="loading-spinner">
        <div class="spinner"></div>
        <div class="loading-text">加载村镇地图中...</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, onBeforeUnmount, nextTick } from 'vue'
import { TownModuleManager } from './modules'
import { DataLoader } from '@/utils/DataLoader'

let moduleManager = null
const loading = ref(true)
const selectedDataSource = ref('')

const resetView = () => {
  moduleManager?.modules.core?.resetCamera?.()
}

const loadNewData = async () => {
  if (!selectedDataSource.value || !moduleManager) return
  loading.value = true
  try {
    let newData
    if (selectedDataSource.value === 'builtin') {
      newData = DataLoader.getBuiltinTownData()
      console.log('加载内置数据')
    } else if (selectedDataSource.value === 'shapotou-towns') {
      newData = await DataLoader.loadShapotouTowns()
      moduleManager.modules.core?.updateMapProjection?.({
        center: [105.19, 37.51],
        scale: 80000
      })
    } else if (selectedDataSource.value === 'shapotou-outline') {
      newData = await DataLoader.loadShapotouOutline()
      moduleManager.modules.core?.updateMapProjection?.({
        center: [105.14, 37.29],
        scale: 25000
      })
    } else {
      newData = await DataLoader.loadLocalData(selectedDataSource.value)
    }
    await moduleManager.createModel(newData)
    moduleManager.addEvent()
    moduleManager.playEntranceAnimation?.()
  } catch (error) {
    console.error('数据加载失败:', error)
    alert(`数据加载失败: ${error.message}`)
    selectedDataSource.value = ''
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  const geojsonStr = sessionStorage.getItem('townMapGeoJSON')
  if (geojsonStr) {
    try {
      const geojson = JSON.parse(geojsonStr)
      const urlParams = new URLSearchParams(window.location.search)
      const adcode = urlParams.get('adcode')
      loading.value = true
      await nextTick()
      await loadGeoJsonData(geojson, adcode)
      loading.value = false
      sessionStorage.removeItem('townMapGeoJSON')
      return
    } catch (e) {
      sessionStorage.removeItem('townMapGeoJSON')
    }
  }
  try {
    moduleManager = new TownModuleManager(document.getElementById('townCanvas'), {
      geoProjectionCenter: [105.2, 37.45],
      geoProjectionScale: 50000,
      onLoadComplete: () => {
        loading.value = false
      }
    })
    await moduleManager.modules.resource.loadAssets()
    await moduleManager.createModel()
    moduleManager.addEvent()
    moduleManager.playEntranceAnimation?.()
    startRenderLoop()
  } catch (error) {
    console.error('初始化模块化村镇地图失败:', error)
    loading.value = false
  }
})

onBeforeUnmount(() => {
  moduleManager = null
})

async function loadGeoJsonData(geojson, adcode) {
  if (!moduleManager) return
  try {
    await moduleManager.createModel(geojson)
    moduleManager.addEvent()
    moduleManager.playEntranceAnimation?.()
  } catch (e) {
    console.error('加载下钻GeoJSON失败', e)
  }
}

function startRenderLoop() {
  const render = () => {
    if (moduleManager) {
      moduleManager.update(16)
    }
    requestAnimationFrame(render)
  }
  render()
}
</script>

<style lang="scss" scoped>
@import "./town-map.vue";
</style> 