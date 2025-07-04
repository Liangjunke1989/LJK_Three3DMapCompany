import gsap from "gsap"

/**
 * 地图交互系统模块
 * 
 * 负责处理地图的所有用户交互功能，包括：
 * - 鼠标悬停和点击事件处理
 * - 省份高亮和联动效果
 * - 可视化组件的交互动画
 * - 鼠标样式和状态管理
 * 
 * 交互特性：
 * - 多组件联动（柱状图、光圈、标签、散点图）
 * - 平滑的动画过渡效果
 * - 防重复点击的状态控制
 * - 场景可见性智能检测
 * 
 * @author LJK
 * @version 1.0.0
 */
export class MapInteraction {
  /**
   * 构造函数
   * @param {SharedState} state - 共享状态管理器
   * @param {ModuleEventBus} eventBus - 事件总线
   */
  constructor(state, eventBus) {
    this.state = state
    this.eventBus = eventBus
    
    // 存储当前悬停的对象数组，支持多对象同时悬停
    this.objectsHover = []
  }

  /**
   * 添加地图交互事件系统
   * 
   * 该方法为省份地图建立完整的鼠标交互功能，包括：
   * 1. 鼠标悬停高亮效果
   * 2. 省份点击钻取功能
   * 3. 相关组件联动动画
   * 4. 鼠标样式状态管理
   * 
   * 交互效果包括：
   * - 省份区域高亮和缩放
   * - 柱状图、光圈、标签、散点图的联动
   * - 材质发光效果变化
   * - 渲染层级调整
   * 
   * 技术要点：
   * - 使用InteractionManager统一管理交互
   * - GSAP实现平滑的动画过渡
   * - 防重复点击的状态控制
   * - 多层级导航的历史记录管理
   */
  addEvent() {
    // ============ 为所有省份网格添加交互事件 ============
    this.state.eventElement.map((mesh) => {
      // 将网格添加到交互管理器中，启用鼠标事件检测
      this.state.interactionManager.add(mesh)
      
      // ============ 鼠标按下事件（省份点击钻取） ============
      mesh.addEventListener("mousedown", (event) => {
        // 防重复点击检查和场景可见性检查
        if (this.state.clicked || !this.state.mainSceneGroup.visible) return false
        
        this.state.clicked = true  // 设置点击状态，防止重复触发
        
        // 获取点击的省份用户数据
        let userData = event.target.parent.userData
        
        // 发射点击事件
        this.eventBus.emitMapInteraction('click', {
          province: userData,
          target: event.target
        })
        
        // 将当前省份信息推入历史记录，支持返回功能
        this.state.history.push(userData)

        // 触发加载子地图的事件
        this.eventBus.emit('map:loadChildMap', userData)
      })
      
      // ============ 鼠标抬起事件 ============
      mesh.addEventListener("mouseup", (ev) => {
        // 重置点击状态，允许下次点击
        this.state.clicked = false
      })
      
      // ============ 鼠标悬停进入事件 ============
      mesh.addEventListener("mouseover", (event) => {
        // 将悬停对象添加到悬停数组中（如果不存在）
        if (!this.objectsHover.includes(event.target.parent)) {
          this.objectsHover.push(event.target.parent)
        }

        // 只有在主场景可见时才显示指针样式
        if (this.state.mainSceneGroup.visible) {
          document.body.style.cursor = "pointer"
        }
        
        // 发射悬停事件
        this.eventBus.emitMapInteraction('hover', {
          province: event.target.parent.userData,
          target: event.target,
          action: 'enter'
        })
        
        // 激活悬停效果
        this.activateHoverEffect(event.target.parent)
      })
      
      // ============ 鼠标悬停离开事件 ============
      mesh.addEventListener("mouseout", (event) => {
        // 从悬停数组中移除该对象
        this.objectsHover = this.objectsHover.filter((n) => n.userData.name !== event.target.parent.userData.name)
        
        // 如果还有其他悬停对象，保持最后一个的状态
        if (this.objectsHover.length > 0) {
          const mesh = this.objectsHover[this.objectsHover.length - 1]
          // 重新激活最后一个悬停对象的效果
          this.activateHoverEffect(mesh)
        }
        
        // 发射悬停离开事件
        this.eventBus.emitMapInteraction('hover', {
          province: event.target.parent.userData,
          target: event.target,
          action: 'leave'
        })
        
        // 重置省份状态
        this.resetProvinceState(event.target.parent)
        
        // 恢复默认鼠标样式
        document.body.style.cursor = "default"
      })
    })

    console.log('[MapInteraction] 交互事件已添加')
  }

  /**
   * 重置省份状态
   * 将悬停或选中的省份恢复到默认状态
   * 
   * @param {THREE.Group} mesh - 要重置的省份网格组
   */
  resetProvinceState(mesh) {
    // ============ 省份缩放重置动画 ============
    gsap.to(mesh.scale, {
      duration: 0.3,  // 动画持续时间
      z: 1,           // Z轴缩放恢复到1（正常高度）
      onComplete: () => {
        // 动画完成后重置材质属性
        mesh.traverse((obj) => {
          if (obj.isMesh) {
            // 恢复材质的发光颜色到原始状态
            obj.material[0].emissive.setHex(mesh.userData.materialEmissiveHex)
            obj.material[0].emissiveIntensity = 1  // 恢复发光强度
            obj.renderOrder = 9                    // 恢复渲染顺序
          }
        })
      },
    })
    
    // ============ 联动组件状态重置 ============
    // 重置该省份对应的所有相关可视化组件
    this.setBarMove(mesh.userData.adcode, "down")      // 柱状图下移
    this.setGQMove(mesh.userData.adcode, "down")       // 光圈下移
    this.setLabelMove(mesh.userData.adcode, "down")    // 标签下移
    this.setScatterMove(mesh.userData.adcode, "down")  // 散点图下移

    // 发射组件重置事件
    this.eventBus.emitComponentAction('reset', 'province', {
      adcode: mesh.userData.adcode,
      name: mesh.userData.name
    })
  }
  
  /**
   * 省份悬停激活状态
   * 将鼠标悬停的省份设置为高亮激活状态
   * 
   * @param {THREE.Group} mesh - 要激活的省份网格组
   */
  activateHoverEffect(mesh) {
    // ============ 省份突出显示动画 ============
    gsap.to(mesh.scale, {
      duration: 0.3,  // 动画持续时间
      z: 1.5,         // Z轴缩放到1.5倍，产生突出效果
    })
    
    // ============ 联动组件高亮效果 ============
    // 激活该省份对应的所有相关可视化组件
    this.setBarMove(mesh.userData.adcode)      // 柱状图上移
    this.setGQMove(mesh.userData.adcode)       // 光圈上移
    this.setLabelMove(mesh.userData.adcode)    // 标签上移
    this.setScatterMove(mesh.userData.adcode)  // 散点图上移

    // ============ 材质高亮效果 ============
    mesh.traverse((obj) => {
      if (obj.isMesh) {
        // 设置高亮的发光颜色（深蓝色）
        obj.material[0].emissive.setHex(0x0b112d)
        obj.material[0].emissiveIntensity = 1.5  // 增强发光强度
        obj.renderOrder = 21                     // 提升渲染顺序，确保在最前面显示
      }
    })

    // 发射组件激活事件
    this.eventBus.emitComponentAction('activate', 'province', {
      adcode: mesh.userData.adcode,
      name: mesh.userData.name
    })
  }

  /**
   * 设置柱状图联动移动效果
   * 
   * 当省份被悬停或点击时，对应的柱状图会产生上移效果，
   * 增强用户交互的视觉反馈，实现地图与数据可视化的联动。
   * 
   * @param {string|number} adcode - 省份的行政区划代码，用于匹配对应的柱状图
   * @param {string} type - 移动类型，"up"表示上移（悬停状态），"down"表示下移（恢复状态）
   * 
   * 技术实现：
   * - 使用GSAP实现平滑的位置过渡动画
   * - 通过adcode精确匹配对应的省份柱状图
   * - 上移距离 = 原始位置 + 地图深度/2 + 额外偏移(0.3)
   */
  setBarMove(adcode, type = "up") {
    // 遍历所有柱状图，找到匹配的省份
    this.state.allBar.map((barGroup) => {
      // 通过行政区划代码匹配对应的柱状图
      if (barGroup.userData.adcode === adcode) {
        // 使用GSAP创建平滑的位置过渡动画
        gsap.to(barGroup.position, {
          duration: 0.3, // 动画持续时间
          // 根据类型计算目标Z坐标：上移时增加高度偏移，下移时恢复原位置
          z: type === "up" ? 
             barGroup.userData.position[2] + this.state.depth / 2 + 0.3 : // 上移：原位置 + 地图深度一半 + 额外偏移
             barGroup.userData.position[2], // 下移：恢复到原始位置
        })
      }
    })

    // 发射柱状图移动事件
    this.eventBus.emitComponentAction('move', 'bar', {
      adcode,
      type,
      direction: type === "up" ? "up" : "down"
    })
  }

  /**
   * 设置光圈联动移动效果
   * 
   * 管理省份对应的光圈装饰效果和飞线焦点的联动动画。
   * 包括普通省份的光圈效果和特殊的飞线中心点（北京）的光圈效果。
   * 
   * @param {string|number} adcode - 省份的行政区划代码
   * @param {string} type - 移动类型，"up"为上移，"down"为下移
   * 
   * 功能包括：
   * - 省份光圈的垂直移动动画
   * - 飞线焦点光圈的特殊处理（Y轴移动而非Z轴）
   * - 统一的动画时长和偏移量计算
   */
  setGQMove(adcode, type = "up") {
    // ============ 处理普通省份光圈 ============
    this.state.allGuangquan.map((group) => {
      // 匹配对应省份的光圈组
      if (group.userData.adcode === adcode) {
        gsap.to(group.position, {
          duration: 0.3, // 动画持续时间
          // Z轴移动：上移时增加高度，下移时恢复原位置
          z: type === "up" ? 
             group.userData.position[2] + this.state.depth / 2 + 0.3 : 
             group.userData.position[2],
        })
      }
    })
    
    // ============ 处理飞线焦点光圈（特殊情况） ============
    // 如果当前操作的是飞线中心点（通常是北京，adcode为110000）
    if (this.state.flyLineFocusGroup && this.state.flyLineFocusGroup.userData.adcode === adcode) {
      console.log('[MapInteraction] 飞线焦点光圈联动:', this.state.flyLineFocusGroup.userData.adcode)
      gsap.to(this.state.flyLineFocusGroup.position, {
        duration: 0.3,
        // 注意：飞线焦点使用Y轴移动而非Z轴，因为坐标系统不同
        y: type === "up"
            ? this.state.flyLineFocusGroup.userData.position[1] + this.state.depth / 2 + 0.3
            : this.state.flyLineFocusGroup.userData.position[1],
      })
    }

    // 发射光圈移动事件
    this.eventBus.emitComponentAction('move', 'guangquan', {
      adcode,
      type,
      direction: type === "up" ? "up" : "down"
    })
  }

  /**
   * 设置标签联动移动效果
   * 
   * 管理省份对应的所有标签（数据标签和名称标签）的联动动画。
   * 当省份被交互时，相关标签会上移以保持与省份的相对位置关系。
   * 
   * @param {string|number} adcode - 省份的行政区划代码
   * @param {string} type - 移动类型，"up"为上移，"down"为下移
   * 
   * 处理的标签类型：
   * - allProvinceLabel: 省份数据标签（人口、排名等信息）
   * - allProvinceNameLabel: 省份名称标签
   */
  setLabelMove(adcode, type = "up") {
    // 合并所有类型的标签数组，统一处理
    const allLabels = [...this.state.allProvinceLabel, ...this.state.allProvinceNameLabel]
    
    allLabels.map((label) => {
      // 匹配对应省份的标签
      if (label.userData.adcode === adcode) {
        gsap.to(label.position, {
          duration: 0.3, // 动画持续时间
          // Z轴移动：保持与省份的相对位置关系
          z: type === "up" ? 
             label.userData.position[2] + this.state.depth / 2 + 0.3 : 
             label.userData.position[2],
        })
      }
    })

    // 发射标签移动事件
    this.eventBus.emitComponentAction('move', 'label', {
      adcode,
      type,
      direction: type === "up" ? "up" : "down"
    })
  }

  /**
   * 设置散点图联动移动效果
   * 
   * 管理省份内城市散点的联动动画效果。
   * 当省份被交互时，该省份内的所有城市散点会同步上移。
   * 
   * @param {string|number} adcode - 省份的行政区划代码
   * @param {string} type - 移动类型，"up"为上移，"down"为下移
   * 
   * 技术特点：
   * - 处理的是Sprite对象（始终面向相机的2D图像）
   * - 通过省份adcode匹配该省份内的所有城市散点
   * - 保持散点与省份地图的高度一致性
   */
  setScatterMove(adcode, type = "up") {
    // 检查散点图组是否存在
    if (!this.state.scatterGroup) return

    // 遍历散点图组中的所有散点精灵
    this.state.scatterGroup.children.map((sprite) => {
      // 匹配属于该省份的散点
      if (sprite.userData.adcode === adcode) {
        gsap.to(sprite.position, {
          duration: 0.3, // 动画持续时间
          // Z轴移动：与省份地图保持一致的高度变化
          z: type === "up" ? 
             sprite.userData.position[2] + this.state.depth / 2 + 0.3 : 
             sprite.userData.position[2],
        })
      }
    })

    // 发射散点图移动事件
    this.eventBus.emitComponentAction('move', 'scatter', {
      adcode,
      type,
      direction: type === "up" ? "up" : "down"
    })
  }

  /**
   * 更新交互系统
   * 在每帧更新交互检测和状态
   */
  update() {
    // 更新交互管理器
    if (this.state.interactionManager) {
      this.state.interactionManager.update()
    }
  }

  /**
   * 销毁交互系统
   * 清理所有事件监听器和引用
   */
  destroy() {
    // 清理悬停对象数组
    this.objectsHover = []
    
    // 恢复默认鼠标样式
    document.body.style.cursor = "default"
    
    // 清理事件元素的监听器
    if (this.state.eventElement) {
      this.state.eventElement.forEach(element => {
        if (this.state.interactionManager) {
          this.state.interactionManager.remove(element)
        }
      })
    }

    // 发射销毁完成事件
    this.eventBus.emit('interaction:destroyed')

    console.log('[MapInteraction] 交互系统已销毁')
  }
}
