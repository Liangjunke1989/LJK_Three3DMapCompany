import { ChildMap } from "../../map-china-child.js"

/**
 * 地图导航系统模块
 * 
 * 负责多层级地图的导航功能，包括：
 * - 子地图加载和切换
 * - 地图数据获取和管理
 * - 场景可见性控制
 * - 历史记录和返回功能
 * 
 * 导航特性：
 * - 支持国家→省→市的多层级钻取
 * - 基于历史记录栈的导航机制
 * - 智能的场景切换和资源管理
 * - 完整的加载状态和错误处理
 * 
 * @author LJK
 * @version 1.0.0
 */
export class MapNavigation {
  /**
   * 构造函数
   * @param {SharedState} state - 共享状态管理器
   * @param {ModuleEventBus} eventBus - 事件总线
   */
  constructor(state, eventBus) {
    this.state = state
    this.eventBus = eventBus
    
    // 监听加载子地图事件
    this.eventBus.on('map:loadChildMap', (userData) => {
      this.loadChildMap(userData)
    })
  }

  /**
   * 加载子地图（省市级地图）
   * 
   * 当用户点击省份时，加载该省份的详细地图（市县级），
   * 实现多层级地图导航功能。这是地图钻取功能的核心方法。
   * 
   * @param {Object} userData - 省份的用户数据对象
   * @param {string|number} userData.adcode - 行政区划代码
   * @param {Array} userData.center - 地理中心坐标 [经度, 纬度]
   * @param {Array} userData.centroid - 几何中心坐标 [经度, 纬度]
   * @param {number} userData.childrenNum - 子级区域数量
   * 
   * 功能流程：
   * 1. 显示加载提示
   * 2. 获取子地图数据
   * 3. 创建子地图实例
   * 4. 隐藏主地图
   * 5. 更新UI状态
   * 6. 重置相机控制
   */
  loadChildMap(userData) {
    console.log('[MapNavigation] 开始加载子地图:', userData.name)
    
    // ============ 显示加载状态 ============
    this.state.toastLoading && this.state.toastLoading.show() // 显示加载提示，提升用户体验
    
    // 发射加载开始事件
    this.eventBus.emit('navigation:loadStart', {
      userData,
      timestamp: Date.now()
    })
    
    // ============ 异步获取子地图数据 ============
    this.getChildMapData(userData, (data) => {
      try {
        // ============ 更新UI控制元素 ============
        // 显示返回按钮，允许用户返回上级地图
        if (this.state.returnBtn) {
          this.state.returnBtn.style.display = "block"
        }
        
        // ============ 清理旧的子地图实例 ============
        // 如果存在旧的子地图，先销毁以避免内存泄漏
        if (this.state.childMap) {
          this.state.childMap.destroy()
          this.state.childMap = null
        }
        
        // ============ 创建新的子地图实例 ============
        this.state.childMap = new ChildMap(this.state, {
          adcode: userData.adcode,               // 行政区划代码
          center: userData.center,               // 地理中心坐标
          centroid: userData.centroid,           // 几何中心坐标
          childrenNum: userData.childrenNum,     // 子级区域数量
          mapData: data,                         // GeoJSON地图数据
          // 父级地图的边界框大小，用于子地图的尺寸适配
          parentBoxSize: [129.00074005126953, (126.23402404785156 * 3) / 4],
        })
        
        // ============ 将子地图添加到场景 ============
        this.state.childSceneGroup.add(this.state.childMap.instance)
        
        // ============ 切换场景状态 ============
        this.setMainMapVisible(false) // 隐藏主地图
        this.state.toastLoading && this.state.toastLoading.hide() // 隐藏加载提示

        // ============ 重置相机和更新状态 ============
        this.state.camera.controls.reset()  // 重置相机控制器到默认状态
        this.state.currentScene = "childScene" // 更新当前场景标识
        this.state.setEnable && this.state.setEnable(false) // 禁用某些UI控件
        
        // 发射加载完成事件
        this.eventBus.emit('navigation:loadComplete', {
          userData,
          childMap: this.state.childMap,
          timestamp: Date.now()
        })
        
        console.log('[MapNavigation] 子地图加载完成:', userData.name)
        
      } catch (error) {
        console.error('[MapNavigation] 创建子地图失败:', error)
        
        // 隐藏加载提示
        this.state.toastLoading && this.state.toastLoading.hide()
        
        // 发射加载错误事件
        this.eventBus.emit('navigation:loadError', {
          userData,
          error: error.message,
          timestamp: Date.now()
        })
      }
    })
  }

  /**
   * 获取子地图数据
   * 
   * 从阿里云DataV地理数据服务获取指定行政区域的GeoJSON数据。
   * 根据区域是否有子级，选择不同的数据端点。
   * 
   * @param {Object} userData - 省份的用户数据对象
   * @param {string|number} userData.adcode - 行政区划代码
   * @param {number} userData.childrenNum - 子级区域数量
   * @param {Function} callback - 数据获取成功后的回调函数
   * 
   * 数据源说明：
   * - _full.json: 包含该区域及其所有子级区域的完整数据
   * - .json: 仅包含该区域边界的基础数据
   */
  getChildMapData(userData, callback) {
    // ============ 构建数据请求URL ============
    // 默认获取包含子级区域的完整数据
    let url = `https://geo.datav.aliyun.com/areas_v3/bound/${userData.adcode}_full.json`

    // 如果该区域没有子级（如直辖市的区县），则获取基础边界数据
    if (userData.childrenNum === 0) {
      url = `https://geo.datav.aliyun.com/areas_v3/bound/${userData.adcode}.json`
    }
    
    console.log('[MapNavigation] 请求地图数据:', url)
    
    // 发射数据获取开始事件
    this.eventBus.emit('data:loadStart', {
      url,
      adcode: userData.adcode,
      timestamp: Date.now()
    })
    
    // ============ 发起数据请求 ============
    fetch(url)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP ${res.status}: ${res.statusText}`)
          }
          // 将响应转换为文本格式（GeoJSON字符串）
          return res.text()
        })
        .then((res) => {
          console.log('[MapNavigation] 地图数据获取成功')
          
          // 发射数据获取成功事件
          this.eventBus.emit('data:loadSuccess', {
            url,
            adcode: userData.adcode,
            dataSize: res.length,
            timestamp: Date.now()
          })
          
          // 执行回调函数，传递获取到的数据
          callback && callback(res)
        })
        .catch((error) => {
          console.error('[MapNavigation] 获取地图数据失败:', error)
          
          // 发射数据获取错误事件
          this.eventBus.emit('data:loadError', {
            url,
            adcode: userData.adcode,
            error: error.message,
            timestamp: Date.now()
          })
          
          // 隐藏加载提示
          this.state.toastLoading && this.state.toastLoading.hide()
          
          // 这里可以显示错误提示给用户
          // 或者执行重试逻辑
        })
  }

  /**
   * 设置主地图可见性
   * 
   * 控制主地图（中国地图）及其相关组件的显示和隐藏。
   * 用于在主地图和子地图之间切换时管理场景状态。
   * 
   * @param {boolean} bool - true显示主地图，false隐藏主地图
   * 
   * 影响的组件：
   * - 中国地图几何体
   * - 主场景组（包含所有可视化组件）
   * - 各类标签组（省份名称、数据标签、信息标牌）
   */
  setMainMapVisible(bool) {
    console.log('[MapNavigation] 设置主地图可见性:', bool)
    
    // ============ 控制核心地图组件 ============
    // 通过名称查找中国地图组并设置可见性
    const chinaMapGroup = this.state.scene.getObjectByName("chinaMapGroup")
    if (chinaMapGroup) {
      chinaMapGroup.visible = bool
    }
    
    // 设置主场景组的可见性（包含所有主地图相关的可视化组件）
    if (this.state.mainSceneGroup) {
      this.state.mainSceneGroup.visible = bool
    }

    // ============ 隐藏时的特殊处理 ============
    // 当隐藏主地图时，需要额外隐藏所有标签组
    // 这样可以确保子地图场景的干净整洁
    if (bool === false) {
      this.setLabelVisible("provinceNameGroup", bool) // 隐藏省份名称标签
      this.setLabelVisible("labelGroup", bool)       // 隐藏数据标签
      this.setLabelVisible("badgeGroup", bool)       // 隐藏信息标牌
    }
    // 注意：显示主地图时，标签的显示由其他逻辑控制，不在这里处理
    
    // 发射场景可见性变化事件
    this.eventBus.emitSceneChange(
      bool ? 'childScene' : 'mainScene',
      bool ? 'mainScene' : 'childScene',
      { visible: bool }
    )
  }

  /**
   * 设置CSS3D标签的隐藏显示
   * @param {string} labelGroup - 标签组名称
   * @param {boolean} bool - 是否可见
   */
  setLabelVisible(labelGroup = "labelGroup", bool) {
    if (!this.state[labelGroup]) return
    
    this.state[labelGroup].visible = bool
    this.state[labelGroup].children.map((label) => {
      bool ? label.show() : label.hide()
    })
  }

  /**
   * 返回上一级地图
   * 
   * 实现地图导航的返回功能，支持多层级的历史记录导航。
   * 用户可以从子地图返回到父级地图，支持递归返回。
   * 
   * 功能特点：
   * - 基于历史记录栈的导航机制
   * - 自动判断返回到主地图还是上级子地图
   * - 完整的场景切换和资源清理
   * - 相机状态重置
   * 
   * 使用场景：
   * - 点击返回按钮
   * - 键盘快捷键
   * - 编程式导航
   */
  goBack() {
    console.log('[MapNavigation] 执行返回操作')
    
    // ============ 执行历史记录回退 ============
    this.state.history.undo() // 撤销到上一个历史状态
    
    // 发射导航返回事件
    this.eventBus.emitNavigation('back', {
      currentIndex: this.state.history.getIndex(),
      timestamp: Date.now()
    })
    
    // ============ 判断是否返回到根级地图 ============
    if (!this.state.history.getIndex()) {
      // 当前处于历史记录的根级（中国地图）
      
      console.log('[MapNavigation] 返回到主地图')
      
      // ============ 恢复到主场景状态 ============
      this.state.currentScene = "mainScene" // 更新场景标识

      // 隐藏返回按钮（已经在根级，无需再返回）
      if (this.state.returnBtn) {
        this.state.returnBtn.style.display = "none"
      }

      // ============ 清理子地图资源 ============
      if (this.state.childMap) {
        this.state.childMap.destroy() // 销毁子地图实例
        this.state.childMap = null    // 清空引用
      }

      // ============ 恢复主地图显示 ============
      this.setMainMapVisible(true)              // 显示主地图
      this.setLabelVisible("labelGroup", true) // 显示数据标签
      
      // 重新启用UI控件
      this.state.setEnable && this.state.setEnable(true)
      
    } else {
      // 还不是根级，需要加载上一级的子地图
      
      console.log('[MapNavigation] 返回到上级子地图')
      
      // ============ 获取上级地图数据并加载 ============
      let userData = this.state.history.present // 获取当前历史状态的数据
      this.loadChildMap(userData)         // 加载上级子地图
    }

    // ============ 重置相机控制 ============
    // 无论返回到哪一级，都重置相机到默认状态
    this.state.camera.controls.reset()
    
    console.log('[MapNavigation] 返回操作完成')
  }

  /**
   * 获取当前导航状态
   * @returns {Object} 导航状态信息
   */
  getNavigationState() {
    return {
      currentScene: this.state.currentScene,
      historyIndex: this.state.history.getIndex(),
      historyLength: this.state.history.history.length,
      canGoBack: this.state.history.getIndex() > 0,
      currentLevel: this.state.currentLevel,
      hasChildMap: !!this.state.childMap
    }
  }

  /**
   * 重置导航状态到初始状态
   */
  resetNavigation() {
    console.log('[MapNavigation] 重置导航状态')
    
    // 清理子地图
    if (this.state.childMap) {
      this.state.childMap.destroy()
      this.state.childMap = null
    }
    
    // 清理历史记录
    this.state.history.clear()
    this.state.history.push({ name: "中国" })
    
    // 恢复主场景
    this.state.currentScene = "mainScene"
    this.setMainMapVisible(true)
    
    // 隐藏返回按钮
    if (this.state.returnBtn) {
      this.state.returnBtn.style.display = "none"
    }
    
    // 重置相机
    this.state.camera.controls.reset()
    
    // 发射重置事件
    this.eventBus.emitNavigation('reset', {
      timestamp: Date.now()
    })
  }

  /**
   * 销毁导航系统
   * 清理所有资源和状态
   */
  destroy() {
    // 清理子地图
    if (this.state.childMap) {
      this.state.childMap.destroy()
      this.state.childMap = null
    }
    
    // 清理事件监听器
    this.eventBus.off('map:loadChildMap')
    
    // 恢复UI状态
    if (this.state.returnBtn) {
      this.state.returnBtn.style.display = "none"
    }
    
    // 发射销毁完成事件
    this.eventBus.emit('navigation:destroyed')

    console.log('[MapNavigation] 导航系统已销毁')
  }
}
