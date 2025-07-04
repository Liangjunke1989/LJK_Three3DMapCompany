<template>
  <div class="town-map-container">
    <canvas id="townCanvas"></canvas>

    <!-- 简化的导航栏 -->
    <div class="town-nav">
      <div class="nav-title">村镇级3D地图</div>
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

    <!-- 加载提示 -->
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
import { TownWorld } from './town-world'
import { DataLoader } from '@/utils/DataLoader'

let townWorld = null
const loading = ref(true)
const selectedDataSource = ref('')

const resetView = () => {
  townWorld?.resetCamera()
}

// 加载新数据
const loadNewData = async () => {
  if (!selectedDataSource.value || !townWorld) return
  
  loading.value = true
  
  try {
    let newData
    
    if (selectedDataSource.value === 'builtin') {
      newData = DataLoader.getBuiltinTownData()
      console.log('加载内置数据')
    } else if (selectedDataSource.value === 'shapotou-towns') {
      // 加载沙坡头区镇级数据并优化显示
      newData = await DataLoader.loadShapotouTowns()
      console.log('加载沙坡头区镇级数据')
      // 设置沙坡头区的地图参数
      townWorld.updateMapProjection({
        center: [105.19, 37.51],
        scale: 80000
      })
    } else if (selectedDataSource.value === 'shapotou-outline') {
      // 加载沙坡头区轮廓数据
      newData = await DataLoader.loadShapotouOutline()
      console.log('加载沙坡头区轮廓数据')
      // 设置沙坡头区的地图参数
      townWorld.updateMapProjection({
        center: [105.14, 37.29],
        scale: 25000
      })
    } else {
      newData = await DataLoader.loadLocalData(selectedDataSource.value)
      console.log(`加载外部数据: ${selectedDataSource.value}`)
    }
    
    // 重新创建地图
    townWorld.loadDataAndCreateMap(newData)
    
  } catch (error) {
    console.error('数据加载失败:', error)
    alert(`数据加载失败: ${error.message}`)
    selectedDataSource.value = '' // 重置选择
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  // 检查sessionStorage中是否有下钻传递的GeoJSON
  const geojsonStr = sessionStorage.getItem('townMapGeoJSON')
  if (geojsonStr) {
    try {
      const geojson = JSON.parse(geojsonStr)
      // 读取adcode参数
      const urlParams = new URLSearchParams(window.location.search)
      const adcode = urlParams.get('adcode')
      // 加载数据并渲染
      loading.value = true
      await nextTick()
      await loadGeoJsonData(geojson, adcode)
      loading.value = false
      // 清理sessionStorage，避免刷新重复加载
      sessionStorage.removeItem('townMapGeoJSON')
      return
    } catch (e) {
      // 解析失败，走原有流程
      sessionStorage.removeItem('townMapGeoJSON')
    }
  }
  try {
    townWorld = new TownWorld(document.getElementById('townCanvas'), {
      geoProjectionCenter: [105.2, 37.45],
      geoProjectionScale: 50000,
      onLoadComplete: () => {
        loading.value = false
      }
    })
  } catch (error) {
    console.error('初始化村镇地图失败:', error)
    loading.value = false
  }
})

onBeforeUnmount(() => {
  townWorld?.destroy()
})

// 新增方法：加载GeoJSON并渲染
async function loadGeoJsonData(geojson, adcode) {
  if (!townWorld) return
  try {
    await townWorld.loadDataAndCreateMap(geojson)
    // 可选：根据adcode高亮或定位
  } catch (e) {
    console.error('加载下钻GeoJSON失败', e)
  }
}
</script>

<style lang="scss" scoped>
.town-map-container {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: #000;
  
  #townCanvas {
    width: 100%;
    height: 100%;
    background: #011024;
  }
}

// 简化的导航栏
.town-nav {
  position: absolute;
  top: 20px;
  left: 20px;
  right: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(1, 16, 36, 0.9);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(43, 196, 220, 0.3);
  border-radius: 8px;
  padding: 15px 20px;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(43, 196, 220, 0.2);

  .nav-title {
    color: #2bc4dc;
    font-size: 18px;
    font-weight: bold;
    text-shadow: 0 0 10px rgba(43, 196, 220, 0.5);
  }

  .nav-buttons {
    display: flex;
    gap: 10px;
    align-items: center;

    .nav-select {
      padding: 8px 12px;
      background: rgba(43, 196, 220, 0.1);
      border: 1px solid #2bc4dc;
      color: #2bc4dc;
      border-radius: 4px;
      font-size: 14px;
      transition: all 0.3s;
      box-shadow: 0 0 5px rgba(43, 196, 220, 0.3);
      cursor: pointer;
      
      &:hover {
        background: rgba(43, 196, 220, 0.2);
        box-shadow: 0 6px 20px rgba(43, 196, 220, 0.4);
      }
      
      &:focus {
        outline: none;
        background: rgba(43, 196, 220, 0.15);
      }

      option {
        background: #011024;
        color: #2bc4dc;
        padding: 8px 12px;
      }
    }

    .nav-btn {
      padding: 8px 16px;
      background: rgba(43, 196, 220, 0.1);
      border: 1px solid #2bc4dc;
      color: #2bc4dc;
      border-radius: 4px;
      cursor: pointer;
      text-decoration: none;
      font-size: 14px;
      transition: all 0.3s;
      box-shadow: 0 0 5px rgba(43, 196, 220, 0.3);

      &:hover {
        background: rgba(43, 196, 220, 0.2);
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(43, 196, 220, 0.4);
      }
    }
  }
}

// 加载遮罩
.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;

  .loading-spinner {
    text-align: center;
    color: #2bc4dc;

    .spinner {
      width: 50px;
      height: 50px;
      border: 3px solid rgba(43, 196, 220, 0.3);
      border-top: 3px solid #2bc4dc;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 15px;
    }

    .loading-text {
      font-size: 14px;
    }
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 响应式设计
@media (max-width: 768px) {
  .town-nav {
    flex-direction: column;
    gap: 10px;

    .nav-buttons {
      width: 100%;
      justify-content: center;
      flex-wrap: wrap;
      
      .nav-select {
        width: 100%;
        margin-bottom: 8px;
      }
    }
  }
}

@media (max-width: 480px) {
  .town-nav {
    padding: 10px 15px;
    
    .nav-title {
      font-size: 16px;
    }
    
    .nav-buttons {
      .nav-select, .nav-btn {
        font-size: 12px;
        padding: 6px 12px;
      }
    }
  }
}
</style> 