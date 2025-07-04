import {
  Fog,
  Group,
  MeshBasicMaterial,
  DirectionalLight,
  AmbientLight,
  PointLight,
  Vector3,
  LineBasicMaterial,
  Color,
  MeshStandardMaterial,
  PlaneGeometry,
  Mesh,
  Raycaster,
} from "three"
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import {
  Mini3d,
} from "@/mini3d"
import { TownMap } from "./town-map-renderer"
import { InteractionManager } from "three.interactive"
import gsap from "gsap"
import { DataLoader } from "@/utils/DataLoader"

export class TownWorld extends Mini3d {
  constructor(canvas, config = {}) {
    super(canvas, {
      camera: {
        fov: 75,
        near: 0.1,
        far: 1000,
        position: { x: 0, y: 50, z: 30 }
      },
      renderer: {
        antialias: true,
        alpha: true
      },
      controls: {
        enableDamping: true,
        dampingFactor: 0.05,
        enableZoom: true,
        enableRotate: true,
        enablePan: true
      },
      ...config
    })
    
    // 配置参数
    this.onLoadComplete = config.onLoadComplete || (() => {})
    
    // 默认投影配置
    this.projectionConfig = {
      center: config.geoProjectionCenter || [105.2, 37.45],
      scale: config.geoProjectionScale || 50000
    }
    
    // 场景基础设置（增加雾效范围）
    this.scene.fog = new Fog(0x011024, 1, 1500)
    this.scene.background = new Color(0x011024)
    
    // 相机设置（增加可见范围）
    this.camera.instance.position.set(0, 80, 50)
    this.camera.instance.near = 0.1
    this.camera.instance.far = 50000
    this.camera.instance.updateProjectionMatrix()
    
    // 交互管理器 - 用于处理3D对象交互
    this.interactionManager = new InteractionManager(
      this.renderer.instance,
      this.camera.instance,
      this.canvas
    )
    
    // 初始化场景组
    this.mainGroup = new Group()
    this.townGroup = new Group()
    
    this.mainGroup.add(this.townGroup)
    
    // 旋转到正确角度
    this.mainGroup.rotateX(-Math.PI / 2)
    this.scene.add(this.mainGroup)
    
    // 悬停状态管理
    this.hoveredObjects = []
    this.currentHoveredMesh = null
    
    // 初始化CSS2D渲染器
    this.initCSS2DRenderer()
    
    // 初始化
    this.initEnvironment()
    this.loadTownData()
    
    // 添加渲染循环钩子
    this.setupRenderLoop()
    
    // 存储引用
    this.townMeshes = []
    this.eventElements = [] // 用于交互的网格元素
    this.currentGeoData = null
    this.townLabels = [] // 存储村镇标签
    this.selectedTownMesh = null // 当前选中的村镇
  }

  // 初始化CSS2D渲染器
  initCSS2DRenderer() {
    this.css2DRenderer = new CSS2DRenderer()
    this.css2DRenderer.setSize(this.sizes.width, this.sizes.height)
    this.css2DRenderer.domElement.style.position = 'absolute'
    this.css2DRenderer.domElement.style.top = '0px'
    this.css2DRenderer.domElement.style.pointerEvents = 'none'
    this.css2DRenderer.domElement.style.zIndex = '100'
    
    // 插入到canvas的父元素中
    if (this.canvas.parentNode) {
      this.canvas.parentNode.appendChild(this.css2DRenderer.domElement)
    }
    
    // 监听窗口大小变化
    this.sizes.on('resize', () => {
      this.css2DRenderer.setSize(this.sizes.width, this.sizes.height)
    })
  }

  // 设置渲染循环
  setupRenderLoop() {
    // 监听时间更新事件，在每一帧渲染CSS2D标签
    this.time.on('tick', () => {
      if (this.css2DRenderer && this.camera && this.scene) {
        this.css2DRenderer.render(this.scene, this.camera.instance)
      }
    })
  }

  // 初始化环境光照（增强亮度和范围）
  initEnvironment() {
    // 环境光（增强亮度）
    const ambientLight = new AmbientLight(0xffffff, 3.5)
    this.scene.add(ambientLight)
    
    // 主方向光（增强亮度）
    const directionalLight = new DirectionalLight(0xffffff, 6)
    directionalLight.position.set(-30, 6, -8)
    directionalLight.castShadow = true
    directionalLight.shadow.radius = 30
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    this.scene.add(directionalLight)
    
    // 蓝色点光源（增强亮度和范围）
    const pointLight1 = new PointLight(0x0e81fb, 240, 20000)
    pointLight1.position.set(-3, 16, -3)
    this.scene.add(pointLight1)
    
    // 深蓝色点光源（增强亮度和范围）
    const pointLight2 = new PointLight(0x1f5f7a, 180, 300)
    pointLight2.position.set(-4, 8, 43)
    this.scene.add(pointLight2)
    
    // 新增辅助光源
    const auxiliaryLight1 = new PointLight(0x2bc4dc, 200, 15000)
    auxiliaryLight1.position.set(10, 20, 10)
    this.scene.add(auxiliaryLight1)
    
    const auxiliaryLight2 = new PointLight(0x4da6ff, 150, 12000)
    auxiliaryLight2.position.set(-10, 15, -10)
    this.scene.add(auxiliaryLight2)
  }

  // 添加交互事件
  addInteractionEvents() {
    // 清理之前的事件监听器
    this.eventElements.forEach(mesh => {
      this.interactionManager.remove(mesh)
    })
    this.eventElements = []
    
    // 为每个村镇网格添加交互事件
    this.townMeshes.forEach(townMesh => {
      townMesh.traverse(child => {
        if (child.isMesh) {
          // 保存原始材质颜色
          child.userData.originalEmissive = child.material[0].emissive.getHex()
          child.userData.originalEmissiveIntensity = child.material[0].emissiveIntensity
          child.userData.originalRenderOrder = child.renderOrder
          child.userData.townData = townMesh.userData.townData
          
          // 添加到交互管理器
          this.interactionManager.add(child)
          this.eventElements.push(child)
          
          // 鼠标悬停进入
          child.addEventListener('mouseover', (event) => {
            this.onMeshHover(event.target.parent, true)
            this.canvas.style.cursor = 'pointer'
            //TODO: LJK_区域上升动画效果
            // 区域上升动画效果
            gsap.to(event.target.parent.position, {
              y: 2, // 上升高度
              duration: 0.3,
              ease: "power2.out"
            })
            
            // 同时调整材质发光效果
            event.target.parent.traverse(child => {
              if(child.isMesh && child.material) {
                gsap.to(child.material[0], {
                  emissiveIntensity: 2,
                  duration: 0.3
                })
              }
            })

          })
          
          // 鼠标悬停离开
          child.addEventListener('mouseout', (event) => {
            this.onMeshHover(event.target.parent, false)
            this.canvas.style.cursor = 'default'
          })
          
          // 鼠标点击
          child.addEventListener('mousedown', (event) => {
            this.onMeshClick(event.target.parent)
          })
        }
      })
    })
    
    console.log(`添加了 ${this.eventElements.length} 个交互元素`)
  }

  // 网格悬停效果
  onMeshHover(mesh, isHover) {
    if (isHover) {
      // 防止重复处理同一个网格
      if (this.currentHoveredMesh === mesh) return
      
      // 先重置之前悬停的网格
      if (this.currentHoveredMesh) {
        this.resetMeshAppearance(this.currentHoveredMesh)
      }
      
      this.currentHoveredMesh = mesh
      this.highlightMesh(mesh)
    } else {
      // 只有当前悬停的网格才需要重置
      if (this.currentHoveredMesh === mesh) {
        this.resetMeshAppearance(mesh)
        this.currentHoveredMesh = null
      }
    }
  }

  // 高亮网格 - 增强GSAP美观效果
  highlightMesh(mesh) {
    // 多层次凸起动画效果
    const tl = gsap.timeline()
    
    // 主要凸起效果 - Z轴缩放（增加凸起高度）
    tl.to(mesh.scale, {
      duration: 0.3,
      z: 2.5,
      ease: "back.out(1.3)"
    })
    
    // 轻微的Y轴抖动效果，增加动感（增加抖动高度）
    tl.to(mesh.position, {
      duration: 0.2,
      y: 0.3,
      ease: "power2.out"
    }, "-=0.1")
    
    // 轻微旋转效果
    tl.to(mesh.rotation, {
      duration: 0.4,
      y: mesh.rotation.y + 0.02,
      ease: "power2.inOut",
      yoyo: true,
      repeat: 1
    }, "-=0.3")
    
    // 材质高亮效果 - 渐变动画
    mesh.traverse(obj => {
      if (obj.isMesh && obj.material[0]) {
        // 发光颜色渐变动画
        gsap.to(obj.material[0], {
          duration: 0.3,
          emissiveIntensity: 1.5,
          ease: "power2.out"
        })
        
        // 发光颜色变化
        const targetColor = new Color(0x0b112d)
        gsap.to(obj.material[0].emissive, {
          duration: 0.3,
          r: targetColor.r,
          g: targetColor.g,
          b: targetColor.b,
          ease: "power2.out"
        })
        
        // 提升渲染层级
        obj.renderOrder = 21
      }
    })
    
    // 添加脉冲呼吸效果（增加脉冲高度）
    const pulseEffect = () => {
      gsap.to(mesh.scale, {
        duration: 1.5,
        z: 2.8,
        ease: "power2.inOut",
        yoyo: true,
        repeat: -1
      })
    }
    
    // 延迟启动脉冲效果
    gsap.delayedCall(0.3, pulseEffect)
    
    // 显示悬停信息
    this.showHoverInfo(mesh)
    
    console.log(`悬停高亮: ${mesh.userData.townData?.name || '未知区域'}`)
  }

  // 重置网格外观
  resetMeshAppearance(mesh) {
    // 杀死所有相关的GSAP动画
    gsap.killTweensOf(mesh.scale)
    gsap.killTweensOf(mesh.position)
    gsap.killTweensOf(mesh.rotation)
    
    // 恢复原始状态的动画
    const tl = gsap.timeline()
    
    // 恢复缩放
    tl.to(mesh.scale, {
      duration: 0.3,
      z: 1,
      ease: "power2.out"
    })
    
    // 恢复位置
    tl.to(mesh.position, {
      duration: 0.3,
      y: 0,
      ease: "power2.out"
    }, "-=0.3")
    
    // 恢复旋转
    tl.to(mesh.rotation, {
      duration: 0.3,
      y: 0,
      ease: "power2.out"
    }, "-=0.3")
    
    // 恢复材质的渐变动画
    mesh.traverse(obj => {
      if (obj.isMesh && obj.material[0]) {
        // 杀死材质相关动画
        gsap.killTweensOf(obj.material[0])
        gsap.killTweensOf(obj.material[0].emissive)
        
        // 恢复发光强度
        gsap.to(obj.material[0], {
          duration: 0.3,
          emissiveIntensity: obj.userData.originalEmissiveIntensity || 0,
          ease: "power2.out"
        })
        
        // 恢复发光颜色
        const originalEmissive = obj.userData.originalEmissive || 0x000000
        gsap.to(obj.material[0].emissive, {
          duration: 0.3,
          r: ((originalEmissive >> 16) & 255) / 255,
          g: ((originalEmissive >> 8) & 255) / 255,
          b: (originalEmissive & 255) / 255,
          ease: "power2.out"
        })
        
        obj.renderOrder = obj.userData.originalRenderOrder || 9
      }
    })
    
    // 隐藏悬停信息
    this.hideHoverInfo()
  }

  // 显示悬停信息
  showHoverInfo(mesh) {
    const townData = mesh.userData.townData
    if (!townData) return
    
    // 如果已经存在信息元素，先移除
    this.hideHoverInfo()
    
    // 创建信息面板
    const infoPanel = document.createElement('div')
    infoPanel.className = 'town-hover-info'
    infoPanel.innerHTML = `
      <div class="info-title">${townData.name || '未知区域'}</div>
      <div class="info-content">
        <div class="info-item">
          <span class="label">人口:</span>
          <span class="value">${townData.population ? (townData.population / 1000).toFixed(1) + 'k' : '未知'}</span>
        </div>
        <div class="info-item">
          <span class="label">面积:</span>
          <span class="value">${townData.area || '未知'}km²</span>
        </div>
        ${townData.gdp ? `
        <div class="info-item">
          <span class="label">GDP:</span>
          <span class="value">${townData.gdp}亿元</span>
        </div>
        ` : ''}
      </div>
    `
    
    // 添加样式
    infoPanel.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(1, 16, 36, 0.95);
      border: 1px solid #2bc4dc;
      border-radius: 8px;
      padding: 15px;
      color: #fff;
      font-size: 14px;
      z-index: 1000;
      backdrop-filter: blur(10px);
      box-shadow: 0 4px 20px rgba(43, 196, 220, 0.3);
      min-width: 200px;
      animation: fadeInUp 0.3s ease-out;
    `
    
    // 添加CSS动画
    if (!document.querySelector('#hover-info-styles')) {
      const style = document.createElement('style')
      style.id = 'hover-info-styles'
      style.textContent = `
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .town-hover-info .info-title {
          color: #2bc4dc;
          font-weight: bold;
          font-size: 16px;
          margin-bottom: 10px;
          text-shadow: 0 0 8px rgba(43, 196, 220, 0.5);
        }
        
        .town-hover-info .info-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
          padding: 4px 0;
          border-bottom: 1px solid rgba(43, 196, 220, 0.1);
        }
        
        .town-hover-info .info-item:last-child {
          border-bottom: none;
          margin-bottom: 0;
        }
        
        .town-hover-info .label {
          color: #aaa;
          font-size: 12px;
        }
        
        .town-hover-info .value {
          color: #fff;
          font-weight: bold;
          font-size: 12px;
        }
      `
      document.head.appendChild(style)
    }
    
    document.body.appendChild(infoPanel)
    this.currentInfoPanel = infoPanel
  }

  // 隐藏悬停信息
  hideHoverInfo() {
    if (this.currentInfoPanel) {
      this.currentInfoPanel.remove()
      this.currentInfoPanel = null
    }
  }

  // 网格点击处理 - 单独显示该村镇地图
  onMeshClick(mesh) {
    const townData = mesh.userData.townData
    if (townData) {
      console.log(`点击了区域: ${townData.name}`)
      
      // 如果点击的是当前选中的村镇，则返回全部显示
      if (this.selectedTownMesh === mesh) {
        this.showAllTowns()
      } else {
        // 单独显示该村镇
        this.showSingleTown(mesh)
      }
    }
  }

  // 单独显示选中的村镇
  showSingleTown(mesh) {
    console.log(`单独显示村镇: ${mesh.userData.townData.name}`)
    
    this.selectedTownMesh = mesh
    
    // 创建平滑的聚焦动画
    const tl = gsap.timeline()
    
    // 隐藏其他村镇（淡出动画）
    this.townMeshes.forEach(townMesh => {
      if (townMesh !== mesh) {
        tl.to(townMesh.scale, {
          duration: 0.6,
          x: 0,
          y: 0,
          z: 0,
          ease: "power2.in"
        }, 0)
        
        // 淡化材质
        townMesh.traverse(obj => {
          if (obj.isMesh && obj.material[0]) {
            tl.to(obj.material[0], {
              duration: 0.6,
              opacity: 0,
              ease: "power2.in"
            }, 0)
          }
        })
      }
    })
    
    // 隐藏其他标签
    this.townLabels.forEach(label => {
      const labelPosition = label.position
      const meshPosition = mesh.position
      const distance = labelPosition.distanceTo(meshPosition)
      
      if (distance > 1) { // 不是当前选中的村镇的标签
        tl.to(label.element.style, {
          duration: 0.6,
          opacity: 0,
          ease: "power2.in"
        }, 0)
      }
    })
    
    // 突出显示选中的村镇
    tl.to(mesh.scale, {
      duration: 0.8,
      x: 1.2,
      y: 1.2,
      z: 3,
      ease: "back.out(1.7)"
    }, 0.2)
    
    // 材质高亮
    mesh.traverse(obj => {
      if (obj.isMesh && obj.material[0]) {
        tl.to(obj.material[0], {
          duration: 0.8,
          emissiveIntensity: 2,
          ease: "power2.out"
        }, 0.2)
        
        const targetColor = new Color(0x2bc4dc)
        tl.to(obj.material[0].emissive, {
          duration: 0.8,
          r: targetColor.r,
          g: targetColor.g,
          b: targetColor.b,
          ease: "power2.out"
        }, 0.2)
      }
    })
    
    // 相机聚焦动画
    const bbox = mesh.geometry.boundingBox
    if (bbox) {
      const center = bbox.getCenter(new Vector3())
      const size = bbox.getSize(new Vector3())
      const maxDimension = Math.max(size.x, size.y, size.z)
      
      tl.to(this.camera.instance.position, {
        duration: 1.5,
        x: center.x + maxDimension * 2,
        y: center.y + maxDimension * 3,
        z: center.z + maxDimension * 2,
        ease: "power2.out"
      }, 0.3)
      
      tl.to(this.camera.controls.target, {
        duration: 1.5,
        x: center.x,
        y: center.y,
        z: center.z,
        ease: "power2.out",
        onUpdate: () => {
          this.camera.controls.update()
        }
      }, 0.3)
    }
    
    // 显示详细信息面板
    tl.call(() => {
      this.showDetailPanel(mesh.userData.townData)
    }, null, 1.0)
  }

  // 显示所有村镇
  showAllTowns() {
    console.log('显示所有村镇')
    
    this.selectedTownMesh = null
    
    // 隐藏详细信息面板
    const existingPanel = document.querySelector('.town-detail-panel')
    if (existingPanel) {
      existingPanel.remove()
    }
    
    // 创建恢复动画
    const tl = gsap.timeline()
    
    // 恢复所有村镇显示
    this.townMeshes.forEach((townMesh, index) => {
      // 恢复缩放
      tl.to(townMesh.scale, {
        duration: 0.8,
        x: 1,
        y: 1,
        z: 1,
        ease: "back.out(1.3)",
        delay: 0.1 * index
      }, 0)
      
      // 恢复材质
      townMesh.traverse(obj => {
        if (obj.isMesh && obj.material[0]) {
          tl.to(obj.material[0], {
            duration: 0.8,
            opacity: 0.9,
            emissiveIntensity: obj.userData.originalEmissiveIntensity || 0.1,
            ease: "power2.out",
            delay: 0.1 * index
          }, 0)
          
          const originalEmissive = obj.userData.originalEmissive || 0x0a1929
          tl.to(obj.material[0].emissive, {
            duration: 0.8,
            r: ((originalEmissive >> 16) & 255) / 255,
            g: ((originalEmissive >> 8) & 255) / 255,
            b: (originalEmissive & 255) / 255,
            ease: "power2.out",
            delay: 0.1 * index
          }, 0)
        }
      })
    })
    
    // 恢复所有标签显示
    this.townLabels.forEach((label, index) => {
      tl.to(label.element.style, {
        duration: 0.6,
        opacity: 1,
        ease: "power2.out",
        delay: 0.1 * index
      }, 0.3)
    })
    
    // 恢复相机位置
    if (this.currentGeoData && this.townMapRenderer) {
      this.autoFitCamera(this.currentGeoData)
    }
  }

  // 显示详细信息面板
  showDetailPanel(townData) {
    console.log(`显示详细信息: ${townData.name}`)
    
    // 创建详细信息面板
    const detailPanel = document.createElement('div')
    detailPanel.className = 'town-detail-panel'
    detailPanel.innerHTML = `
      <div class="panel-header">
        <h2>${townData.name}</h2>
        <button class="close-btn" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
      <div class="panel-content">
        <div class="info-grid">
          <div class="info-card">
            <h3>人口信息</h3>
            <p>总人口: ${townData.population ? (townData.population / 1000).toFixed(1) + 'k' : '未知'}</p>
            <p>人口密度: ${townData.area ? Math.round(townData.population / townData.area) : '未知'}/km²</p>
          </div>
          <div class="info-card">
            <h3>地理信息</h3>
            <p>面积: ${townData.area || '未知'}km²</p>
            <p>坐标: ${townData.center ? townData.center.join(', ') : '未知'}</p>
          </div>
        </div>
      </div>
    `
    
    // 添加样式
    this.addDetailPanelStyles()
    
    // 添加到页面
    document.body.appendChild(detailPanel)
    
    // 入场动画
    gsap.from(detailPanel, {
      duration: 0.5,
      scale: 0.8,
      opacity: 0,
      ease: "back.out(1.7)"
    })
  }

  // 添加详细信息面板样式
  addDetailPanelStyles() {
    if (!document.querySelector('#detail-panel-styles')) {
      const style = document.createElement('style')
      style.id = 'detail-panel-styles'
      style.textContent = `
        .town-detail-panel {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(1, 16, 36, 0.95);
          border: 2px solid #2bc4dc;
          border-radius: 12px;
          padding: 0;
          color: #fff;
          z-index: 1000;
          backdrop-filter: blur(20px);
          box-shadow: 0 8px 32px rgba(43, 196, 220, 0.3);
          min-width: 500px;
          max-width: 80vw;
          max-height: 80vh;
          overflow: hidden;
        }
        
        .panel-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid rgba(43, 196, 220, 0.3);
          background: rgba(43, 196, 220, 0.1);
        }
        
        .panel-header h2 {
          margin: 0;
          color: #2bc4dc;
          font-size: 24px;
          text-shadow: 0 0 10px rgba(43, 196, 220, 0.5);
        }
        
        .close-btn {
          background: none;
          border: none;
          color: #2bc4dc;
          font-size: 24px;
          cursor: pointer;
          padding: 5px 10px;
          border-radius: 4px;
          transition: all 0.3s;
        }
        
        .close-btn:hover {
          background: rgba(43, 196, 220, 0.2);
        }
        
        .panel-content {
          padding: 20px;
        }
        
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
        }
        
        .info-card {
          background: rgba(43, 196, 220, 0.1);
          border: 1px solid rgba(43, 196, 220, 0.3);
          border-radius: 8px;
          padding: 15px;
        }
        
        .info-card h3 {
          margin: 0 0 10px 0;
          color: #2bc4dc;
          font-size: 16px;
        }
        
        .info-card p {
          margin: 5px 0;
          color: #ccc;
          font-size: 14px;
        }
      `
      document.head.appendChild(style)
    }
  }

  // 加载村镇数据
  async loadTownData() {
    try {
      let townData
      
      // 尝试加载外部数据文件
      const dataSources = [
        '/assets/testTownData/test.geojson',
        '/assets/testTownData/shapotou.json',
        '/assets/json/中华人民共和国.json' // 尝试加载原项目的数据
      ]
      
      for (const source of dataSources) {
        try {
          console.log(`尝试加载数据: ${source}`)
          townData = await DataLoader.loadLocalData(source)
          console.log(`成功加载数据: ${source}`)
          break
        } catch (error) {
          console.warn(`加载失败 ${source}:`, error.message)
          continue
        }
      }
      
      // 如果所有外部数据都加载失败，使用内置数据
      if (!townData) {
        console.log('使用内置测试数据')
        townData = DataLoader.getBuiltinTownData()
      }
      
      this.currentGeoData = townData
      this.createTownMap(townData)
      
      // 延迟创建其他元素
      setTimeout(() => {
        this.createFloor()
        this.createRotateBorder()
        this.playIntroAnimation()
        this.onLoadComplete()
      }, 100)
      
    } catch (error) {
      console.error('数据加载完全失败:', error)
      this.onLoadComplete()
    }
  }

  // 创建村镇地图
  createTownMap(geoData) {
    this.currentGeoData = geoData
    
    // 使用投影配置或默认值
    const mapConfig = {
      center: this.projectionConfig?.center || [105.2, 37.45],
      scale: this.projectionConfig?.scale || 15000,
      data: geoData,
      depth: 1.8,
      topMaterial: new MeshStandardMaterial({
        color: 0x061e47,
        transparent: true,
        opacity: 0.9,
        metalness: 0.2,
        roughness: 0.8,
        emissive: new Color(0x0a1929),
        emissiveIntensity: 0.1
      }),
      sideMaterial: new MeshStandardMaterial({
        color: 0x0d2951,
        transparent: true,
        opacity: 0.9,
        metalness: 0.1,
        roughness: 0.9
      }),
      lineMaterial: new LineBasicMaterial({
        color: 0x2bc4dc,
        transparent: true,
        opacity: 0.9,
        linewidth: 2
      })
    }
    
    console.log('使用地图配置:', mapConfig)
    
    this.townMapRenderer = new TownMap(this, mapConfig)
    
    this.townMapRenderer.setParent(this.townGroup)
    this.townMeshes = this.townMapRenderer.getTownMeshes()
    
    // 添加交互事件
    this.addInteractionEvents()
    
    // 创建村镇名称标签
    this.createTownLabels()
    
    // 自动适配相机位置
    this.autoFitCamera(geoData)
  }

  // 创建村镇名称标签
  createTownLabels() {
    // 清理现有标签
    this.clearTownLabels()
    
    // 为每个村镇创建标签
    this.townMeshes.forEach(townMesh => {
      const townData = townMesh.userData.townData
      if (townData && townData.name) {
        // 创建标签DOM元素
        const labelDiv = document.createElement('div')
        labelDiv.className = 'town-label'
        labelDiv.textContent = townData.name
        labelDiv.style.cssText = `
          color: #2bc4dc;
          font-size: 14px;
          font-weight: bold;
          background: rgba(1, 16, 36, 0.9);
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid #2bc4dc;
          white-space: nowrap;
          text-shadow: 0 0 4px rgba(43, 196, 220, 0.5);
          box-shadow: 0 2px 8px rgba(43, 196, 220, 0.3);
          pointer-events: none;
          user-select: none;
        `
        
        // 创建CSS2D对象
        const label = new CSS2DObject(labelDiv)
        
        // 兼容Group结构，找到第一个Mesh的boundingBox
        let bbox = null
        townMesh.traverse(child => {
          if (child.isMesh && child.geometry && child.geometry.boundingBox) {
            bbox = child.geometry.boundingBox
          }
        })
        if (bbox) {
          const center = bbox.getCenter(new Vector3())
          label.position.copy(center)
          label.position.y += 4 // 标签高度，显示在区域正上方
          // 添加到场景
          this.scene.add(label)
          this.townLabels.push(label)
        }
      }
    })
    
    console.log(`创建了 ${this.townLabels.length} 个村镇标签`)
  }

  // 清理村镇标签
  clearTownLabels() {
    this.townLabels.forEach(label => {
      this.scene.remove(label)
      if (label.element && label.element.parentNode) {
        label.element.parentNode.removeChild(label.element)
      }
    })
    this.townLabels = []
  }

  // 自动适配相机位置
  autoFitCamera(geoData) {
    try {
      const bounds = this.townMapRenderer.calculateBounds(geoData)
      
      // 计算合适的相机位置
      const maxDimension = Math.max(bounds.width, bounds.height)
      const distance = maxDimension * 1.5
      
      const cameraY = Math.max(distance, 30)
      const cameraZ = distance * 0.8
      
      // 使用动画平滑移动相机
      gsap.to(this.camera.instance.position, {
        duration: 1.5,
        x: bounds.centerX * 0.1,
        y: cameraY,
        z: cameraZ,
        ease: "power2.out"
      })
      
      // 设置相机目标点
      gsap.to(this.camera.controls.target, {
        duration: 1.5,
        x: bounds.centerX * 0.1,
        y: bounds.centerY * 0.1,
        z: 0,
        ease: "power2.out",
        onUpdate: () => {
          this.camera.controls.update()
        }
      })
      
    } catch (error) {
      console.warn('自动适配相机失败，使用默认位置:', error)
      this.camera.instance.position.set(0, 60, 40)
      this.camera.controls.target.set(0, 0, 0)
      this.camera.controls.update()
    }
  }

  // 创建底部网格效果
  createFloor() {
    // 清除已存在的地板
    if (this.floor) {
      this.scene.remove(this.floor)
      this.floor.geometry?.dispose()
      this.floor.material?.dispose()
    }
    
    const floorGeometry = new PlaneGeometry(200, 200, 32, 32)
    const floorMaterial = new MeshStandardMaterial({
      color: 0x061e47,
      transparent: true,
      opacity: 0.3,
      wireframe: true
    })
    
    const floor = new Mesh(floorGeometry, floorMaterial)
    floor.rotation.x = -Math.PI / 2
    floor.position.y = -2
    this.scene.add(floor)
    
    this.floor = floor
  }

  // 创建旋转边框
  createRotateBorder() {
    // 清除已存在的旋转边框
    if (this.rotateBorder) {
      this.scene.remove(this.rotateBorder)
      this.rotateBorder.traverse(child => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) child.material.dispose()
      })
    }
    
    const borderGroup = new Group()
    
    // 外圈边框
    const outerBorderGeometry = new PlaneGeometry(60, 60, 1, 1)
    const outerBorderMaterial = new MeshBasicMaterial({
      color: 0x2bc4dc,
      transparent: true,
      opacity: 0.2,
      wireframe: true
    })
    
    const outerBorder = new Mesh(outerBorderGeometry, outerBorderMaterial)
    outerBorder.rotation.x = -Math.PI / 2
    outerBorder.position.y = 0.1
    
    // 内圈边框
    const innerBorderGeometry = new PlaneGeometry(40, 40, 1, 1)
    const innerBorderMaterial = new MeshBasicMaterial({
      color: 0x0e81fb,
      transparent: true,
      opacity: 0.3,
      wireframe: true
    })
    
    const innerBorder = new Mesh(innerBorderGeometry, innerBorderMaterial)
    innerBorder.rotation.x = -Math.PI / 2
    innerBorder.position.y = 0.2
    
    borderGroup.add(outerBorder, innerBorder)
    this.scene.add(borderGroup)
    
    // 添加旋转动画
    this.time.on("tick", () => {
      if (outerBorder) {
        outerBorder.rotation.z += 0.002
      }
      if (innerBorder) {
        innerBorder.rotation.z -= 0.003
      }
    })
    
    this.rotateBorder = borderGroup
  }

  // 入场动画 - 使用GSAP技术增强美观度
  playIntroAnimation() {
    const tl = gsap.timeline()
    
    // 相机飞入动画
    tl.from(this.camera.instance.position, {
      duration: 2.5,
      y: 150,
      z: 80,
      ease: "power3.out"
    })
    
    // 地图区域依次浮现 - 添加旋转和缩放效果
    this.townMeshes.forEach((mesh, index) => {
      // 初始状态设置
      gsap.set(mesh.scale, { x: 0.1, y: 0.1, z: 0.1 })
      gsap.set(mesh.rotation, { y: Math.PI })
      gsap.set(mesh.position, { z: -5 })
      
      // 动画到最终状态
      tl.to(mesh.scale, {
        duration: 0.8,
        x: 1,
        y: 1, 
        z: 1,
        ease: "elastic.out(1, 0.5)",
        delay: 0.1 * index
      }, "-=2")
      
      tl.to(mesh.rotation, {
        duration: 0.8,
        y: 0,
        ease: "power2.out",
        delay: 0.1 * index
      }, "-=2")
      
      tl.to(mesh.position, {
        duration: 0.8,
        z: 0,
        ease: "back.out(1.2)",
        delay: 0.1 * index
      }, "-=2")
      
      // 材质透明度动画
      mesh.traverse(obj => {
        if (obj.isMesh && obj.material[0]) {
          gsap.set(obj.material[0], { opacity: 0 })
          tl.to(obj.material[0], {
            duration: 0.5,
            opacity: 0.9,
            ease: "power2.out",
            delay: 0.1 * index + 0.3
          }, "-=1.5")
        }
      })
    })
    
    // 边框和地面效果延迟出现
    tl.call(() => {
      this.animateFloorAndBorders()
    }, null, "-=1")
  }

  // 地面和边框动画
  animateFloorAndBorders() {
    // 地面网格动画
    if (this.floor) {
      gsap.from(this.floor.scale, {
        duration: 1.5,
        x: 0,
        y: 0,
        z: 0,
        ease: "power2.out"
      })
      
      gsap.from(this.floor.material, {
        duration: 1,
        opacity: 0,
        ease: "power2.out"
      })
    }
    
    // 旋转边框动画
    if (this.rotateBorder) {
      this.rotateBorder.children.forEach((border, index) => {
        gsap.from(border.scale, {
          duration: 1.2,
          x: 0,
          y: 0,
          z: 0,
          ease: "elastic.out(1, 0.3)",
          delay: 0.2 * index
        })
        
        gsap.from(border.material, {
          duration: 0.8,
          opacity: 0,
          ease: "power2.out",
          delay: 0.2 * index + 0.3
        })
      })
    }
  }

  // 重置相机视角
  resetCamera() {
    const targetPosition = { x: 0, y: 80, z: 50 }
    const targetLookAt = { x: 0, y: 0, z: 0 }
    
    gsap.to(this.camera.instance.position, {
      duration: 1.5,
      x: targetPosition.x,
      y: targetPosition.y,
      z: targetPosition.z,
      ease: "power2.inOut"
    })
    
    gsap.to(this.controls.target, {
      duration: 1.5,
      x: targetLookAt.x,
      y: targetLookAt.y,
      z: targetLookAt.z,
      ease: "power2.inOut",
      onUpdate: () => {
        this.controls.update()
      }
    })
  }

  /**
   * 更新地图投影参数
   * @param {Object} projectionConfig - 投影配置 {center: [lng, lat], scale: number}
   */
  updateMapProjection(projectionConfig) {
    if (!projectionConfig) return
    
    // 保存投影配置
    this.projectionConfig = {
      center: projectionConfig.center || [105.19, 37.51],
      scale: projectionConfig.scale || 50000
    }
    
    console.log('更新地图投影参数:', this.projectionConfig)
  }

  // 加载数据并创建地图（供外部调用）
  loadDataAndCreateMap(geoData) {
    try {
      console.log('重新加载地图数据...')
      
      // 清理现有内容
      if (this.townGroup) {
        this.townGroup.clear()
      }
      
      // 清理村镇标签
      this.clearTownLabels()
      
      // 清理交互事件
      this.eventElements.forEach(mesh => {
        this.interactionManager.remove(mesh)
      })
      this.eventElements = []
      this.townMeshes = []
      this.currentHoveredMesh = null
      this.selectedTownMesh = null
      
      // 创建新地图
      this.currentGeoData = geoData
      this.createTownMap(geoData)
      
      // 延迟创建其他元素
      setTimeout(() => {
        this.createFloor()
        this.createRotateBorder()
        this.playIntroAnimation()
        this.onLoadComplete()
      }, 100)
      
      console.log('地图重新加载完成')
    } catch (error) {
      console.error('重新加载地图失败:', error)
    }
  }

  // 销毁方法
  destroy() {
    // 清理悬停信息面板
    this.hideHoverInfo()
    
    // 清理村镇标签
    this.clearTownLabels()
    
    // 清理CSS2D渲染器
    if (this.css2DRenderer && this.css2DRenderer.domElement && this.css2DRenderer.domElement.parentNode) {
      this.css2DRenderer.domElement.parentNode.removeChild(this.css2DRenderer.domElement)
    }
    
    // 清理交互管理器
    if (this.interactionManager) {
      this.eventElements.forEach(mesh => {
        this.interactionManager.remove(mesh)
      })
      this.interactionManager.dispose()
    }
    
    // 清理悬停状态
    this.currentHoveredMesh = null
    this.hoveredObjects = []
    this.eventElements = []
    this.selectedTownMesh = null
    
    if (this.townGroup) {
      this.townGroup.clear()
    }
    
    this.townMeshes = []
    
    super.destroy()
  }
} 