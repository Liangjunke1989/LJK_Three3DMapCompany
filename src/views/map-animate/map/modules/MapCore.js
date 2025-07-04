/**
 * 地图核心渲染模块
 * 
 * 负责地图的核心渲染功能，包括：
 * - 地图3D模型创建
 * - 省份几何体生成
 * - 材质创建和着色器处理
 * - UV坐标计算
 * 
 * @author LJK
 * @version 1.0.0
 */

import {
  Group,
  Vector3,
  LineBasicMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  DoubleSide,
  Color,
  SRGBColorSpace,
} from "three"
import { ExtrudeMap } from "../extrudeMap.js"
import { getBoundBox } from "@/mini3d"

/**
 * 地图核心渲染模块
 * 
 * 负责地图的核心渲染功能，包括：
 * - 3D地图模型创建和管理
 * - 省份几何体生成和处理
 * - 材质系统和着色器管理
 * - UV坐标计算和纹理映射
 * - 渲染循环和资源清理
 * 
 * 技术特点：
 * - 基于GeoJSON数据的3D地图生成
 * - 自定义GLSL着色器渲染
 * - 高性能的几何体处理
 * - 完善的资源生命周期管理
 * 
 * @author LJK
 * @version 1.0.0
 */
export class MapCore {
  /**
   * 构造函数
   * @param {SharedState} state - 共享状态管理器
   * @param {ModuleEventBus} eventBus - 事件总线
   */
  constructor(state, eventBus) {
    this.state = state
    this.eventBus = eventBus
  }

  /**
   * 创建地图主模型
   * 
   * 创建中国地图的主容器组和核心3D模型结构，
   * 为后续的地图渲染和动画系统提供基础框架。
   * 
   * 功能包括：
   * - 创建地图容器组织结构
   * - 生成省份3D几何体
   * - 设置入场动画的初始状态
   * - 建立场景层级关系
   * 
   * 技术要点：
   * - 使用Group对象管理场景层级
   * - 预设动画状态（位置、缩放）
   * - 保持代码的模块化和可维护性
   */
  createModel() {
    // ============ 创建地图容器组 ============
    // 创建中国地图的主容器组，包含所有地图相关的3D对象
    let mapGroup = new Group()
    mapGroup.name = "chinaMapGroup" // 设置组名称，便于调试和查找
    
    // ============ 创建聚焦动画组 ============
    // 创建专门用于聚焦动画的组，包装实际的地图对象
    let focusMapGroup = new Group()
    this.state.focusMapGroup = focusMapGroup // 保存引用，供动画使用
    
    // ============ 创建省份3D几何体 ============
    // 调用createProvince方法生成基于GeoJSON数据的3D省份地图
    let { province } = this.createProvince()
    this.state.provinceMesh = province // 保存省份网格引用
    
    // 将省份地图添加到聚焦组中
    province.setParent(focusMapGroup)

    // ============ 设置聚焦组的初始状态 ============
    // 设置初始位置：Z轴下沉，为入场动画做准备
    focusMapGroup.position.set(0, 0, -5)
    
    // 设置初始缩放：Z轴缩放为0（完全压扁），入场动画时恢复到1
    focusMapGroup.scale.set(1, 1, 0)

    // ============ 构建场景层级结构 ============
    // 将聚焦组添加到地图主组
    mapGroup.add(focusMapGroup)
    
    // 稍微抬高整个地图组，避免与地面重叠
    mapGroup.position.set(0, 0.2, 0)
    
    // 将地图主组添加到主场景组中
    this.state.mainSceneGroup.add(mapGroup)

    // ============ 发射地图创建完成事件 ============
    this.eventBus.emit('map:modelCreated', {
      mapGroup,
      focusMapGroup,
      province
    })
  }

  /**
   * 创建省份地图3D几何体
   * 
   * 该方法是地图渲染的核心，负责：
   * 1. 加载中国地图GeoJSON数据
   * 2. 创建省份的3D挤出几何体
   * 3. 配置地图的材质和动画效果
   * 4. 设置交互事件的目标元素
   * 
   * 技术细节：
   * - 使用ExtrudeMap类将GeoJSON转换为3D挤出几何体
   * - 创建顶面和侧面的不同材质效果
   * - 添加法线贴图增强立体感
   * - 计算UV2坐标用于纹理映射
   * - 收集可交互的网格元素
   * 
   * @returns {Object} 包含province实例的对象
   */
  createProvince() {
    // ============ 检查资源系统是否可用 ============
    if (!this.state.assets || !this.state.assets.instance) {
      console.warn('[MapCore] 资源系统未初始化，使用占位符数据')
      throw new Error('资源系统未初始化，请先初始化资源管理器')
    }
    
    // ============ 加载地图数据和纹理资源 ============
    // 获取中国地图的GeoJSON数据
    let mapJsonData = this.state.assets.instance.getResource("china")
    if (!mapJsonData) {
      throw new Error('无法加载中国地图数据，请检查资源配置')
    }
    
    // 获取法线贴图，用于增强地图表面的细节和立体感
    let topNormal = this.state.assets.instance.getResource("topNormal")
    if (!topNormal) {
      console.warn('[MapCore] 法线贴图未找到，使用默认配置')
      // 创建一个基本的纹理对象作为占位符
      topNormal = { 
        wrapS: null, 
        wrapT: null 
      }
    }

    // 设置法线贴图的包裹模式为重复，适应不同大小的几何体
    topNormal.wrapS = topNormal.wrapT = RepeatWrapping

    // ============ 创建省份轮廓线材质 ============
    // 省份边界线的材质，初始透明度为0，后续通过动画显示
    this.state.provinceLineMaterial = new LineBasicMaterial({
      color: 0x2bc4dc,    // 青蓝色轮廓线
      opacity: 0,         // 初始透明（入场动画需要）
      transparent: true,  // 启用透明度
      fog: false,         // 不受雾效果影响
    })
    
    // ============ 创建省份顶面和侧面材质 ============
    // 调用材质创建方法，返回顶面和侧面材质
    let [topMaterial, sideMaterial] = this.createProvinceMaterial()

    // 保存材质引用，供动画系统使用
    this.state.focusMapTopMaterial = topMaterial
    this.state.focusMapSideMaterial = sideMaterial
    
    // ============ 创建3D挤出地图实例 ============
    // 使用ExtrudeMap类将GeoJSON数据转换为3D挤出几何体
    let province = new ExtrudeMap(this.state, {
      center: this.state.pointCenter,              // 地理投影中心点
      position: new Vector3(0, 0, 0.06),          // 地图在3D空间中的位置
      data: mapJsonData,                          // GeoJSON地图数据
      depth: this.state.depth,                    // 挤出深度
      topFaceMaterial: topMaterial,               // 顶面材质
      sideMaterial: sideMaterial,                 // 侧面材质
      lineMaterial: this.state.provinceLineMaterial, // 轮廓线材质
      renderOrder: 9,                             // 渲染顺序
    })
    
    // ============ 添加侧面材质动画 ============
    // 监听时间更新事件，让侧面纹理产生流动效果
    if (this.state.time && sideMaterial.map && sideMaterial.map.offset) {
      this.state.time.on("tick", () => {
        sideMaterial.map.offset.y += 0.002 // Y轴偏移量递增，产生向上流动效果
      })
    }
    
    // ============ 创建备用面材质（当前未使用） ============
    let faceMaterial = new MeshStandardMaterial({
      color: 0x061e47,      // 深蓝色
      map: topNormal,       // 使用法线贴图作为漫反射贴图
      transparent: true,    // 启用透明度
      normalMap: topNormal, // 法线贴图
      opacity: 1,           // 完全不透明
    })

    // ============ 计算地图边界框信息 ============
    // 获取整个地图的边界框信息，用于UV坐标计算和相机控制
    let { boxSize, box3 } = getBoundBox(province.mapGroup)

    // ============ 收集交互元素和计算UV坐标 ============
    // 初始化交互元素数组，用于存储可点击的省份网格
    this.state.eventElement = []
    
    // 遍历省份地图组中的所有子对象
    province.mapGroup.children.map((group, index) => {
      group.children.map((mesh) => {
        // 筛选出网格类型的对象
        if (mesh.type === "Mesh") {
          // 添加到交互元素数组中，供事件系统使用
          this.state.eventElement.push(mesh)

          // 为每个网格计算UV2坐标，用于纹理映射和特效
          this.calcUv2(mesh.geometry, boxSize.x, boxSize.y, box3.min.x, box3.min.y)
        }
      })
    })

    // ============ 发射省份创建完成事件 ============
    this.eventBus.emit('map:provinceCreated', {
      province,
      eventElements: this.state.eventElement
    })

    // 返回省份地图实例
    return { province }
  }

  /**
   * 计算几何体的UV2坐标
   * 
   * 为地图几何体计算第二套UV坐标（UV2），主要用于：
   * - 复杂的纹理映射和特效渲染
   * - 扩散着色器的坐标参考
   * - 光照贴图和阴影贴图
   * - 自定义着色器的坐标系统
   * 
   * UV坐标说明：
   * - U坐标：水平方向（X轴），范围0-1
   * - V坐标：垂直方向（Y轴），范围0-1
   * - 通过将世界坐标标准化到0-1范围实现
   * 
   * @param {THREE.BufferGeometry} geometry - 要计算UV2的几何体
   * @param {number} width - 几何体的宽度（用于标准化）
   * @param {number} height - 几何体的高度（用于标准化）
   * @param {number} minX - 几何体的最小X坐标
   * @param {number} minY - 几何体的最小Y坐标
   */
  calcUv2(geometry, width, height, minX, minY) {
    // ============ 获取几何体属性 ============
    // 获取顶点位置属性（包含所有顶点的XYZ坐标）
    const positionAttribute = geometry.attributes.position
    // 获取UV纹理坐标属性（用于纹理映射）
    const uvAttribute = geometry.attributes.uv

    // ============ 获取要处理的顶点数量 ============
    // 从几何体的第一个组获取顶点数量
    // groups用于将几何体分成多个渲染批次，每个批次可以使用不同的材质
    const count = geometry.groups[0].count
    
    // ============ 遍历所有顶点计算UV坐标 ============
    for (let i = 0; i < count; i++) {
      // 获取当前顶点的世界坐标
      const x = positionAttribute.getX(i) // 顶点的X坐标
      const y = positionAttribute.getY(i) // 顶点的Y坐标

      // ============ 坐标标准化计算 ============
      // 将世界坐标转换为标准化的UV坐标（0-1范围）
      // U坐标：水平方向的标准化位置
      const u = (x - minX) / width
      // V坐标：垂直方向的标准化位置
      const v = (y - minY) / height

      // ============ 设置UV坐标 ============
      // 将计算出的UV坐标存储到几何体的UV属性中
      uvAttribute.setXY(i, u, v)
    }

    // ============ 更新几何体状态 ============
    // 标记UV属性需要更新到GPU
    uvAttribute.needsUpdate = true
    // 重新计算顶点法线，确保光照计算正确
    geometry.computeVertexNormals()
  }

  /**
   * 创建省份地图材质
   * 
   * 创建地图的顶面和侧面材质，实现专业的3D地图视觉效果。
   * 包含法线贴图、自定义着色器和渐变效果。
   * 
   * @returns {Array} 返回[顶面材质, 侧面材质]数组
   * 
   * 材质特性：
   * - 顶面：使用标准PBR材质，支持法线贴图和光照
   * - 侧面：使用自定义着色器，实现垂直渐变和流动效果
   * - 初始透明：配合入场动画逐渐显示
   * 
   * 技术亮点：
   * - 自定义GLSL着色器编程
   * - 实时渐变颜色混合
   * - 纹理动画和UV偏移
   * - PBR光照模型
   */
  createProvinceMaterial() {
    // ============ 创建顶面材质 ============
    // 获取法线贴图资源，用于增强表面细节
    let topNormal = this.state.assets?.instance?.getResource("topNormal")
    if (!topNormal) {
      console.warn('[MapCore] 创建默认法线贴图')
      topNormal = { wrapS: null, wrapT: null }
    }
    
    // 设置重复包裹模式（如果纹理存在）
    if (topNormal.wrapS !== undefined) {
      topNormal.wrapS = topNormal.wrapT = RepeatWrapping
    }
    
    // 创建顶面的标准PBR材质
    let topMaterial = new MeshStandardMaterial({
      color: 0x061e47,       // 深蓝色基础颜色
      emissive: 0x000000,    // 自发光颜色（初始为黑色，无自发光）
      map: topNormal,        // 漫反射贴图
      transparent: true,     // 启用透明度
      normalMap: topNormal,  // 法线贴图，增强表面凹凸细节
      opacity: 0,           // 初始完全透明（用于入场动画）
    })

    // ============ 创建侧面材质纹理配置 ============
    // 获取侧面纹理贴图
    let sideMap = this.state.assets?.instance?.getResource("side")
    if (!sideMap) {
      console.warn('[MapCore] 侧面纹理未找到，使用默认配置')
      sideMap = { 
        wrapS: null, 
        wrapT: null, 
        repeat: { set: () => {} },
        offset: { y: 0 }
      }
    } else {
      sideMap.wrapS = RepeatWrapping  // 水平方向重复
      sideMap.wrapT = RepeatWrapping  // 垂直方向重复
      sideMap.repeat.set(1, 0.2)      // 设置重复次数：水平1次，垂直0.2次（拉伸效果）
      sideMap.offset.y += 0.01        // Y轴偏移，为后续动画做准备
    }
    
    // ============ 创建侧面基础材质 ============
    let sideMaterial = new MeshStandardMaterial({
      // color: 0x62c3d1,    // 原始青色（已注释）
      color: 0xffffff,       // 白色基础色（为着色器渐变做准备）
      map: sideMap,          // 侧面纹理贴图
      fog: false,            // 不受雾效果影响
      transparent: true,     // 启用透明度
      opacity: 0,           // 初始完全透明
      side: DoubleSide,     // 双面渲染（内外都可见）
    })

    // ============ 自定义着色器编程 ============
    // 通过onBeforeCompile钩子注入自定义GLSL代码
    sideMaterial.onBeforeCompile = (shader) => {
      // ============ 添加自定义uniform变量 ============
      shader.uniforms = {
        ...shader.uniforms,  // 保留原有uniform
        // 添加渐变色彩控制uniform
        uColor1: { value: new Color(0x30b3ff) }, // 渐变起始颜色（浅蓝色）
        uColor2: { value: new Color(0x30b3ff) }, // 渐变结束颜色（浅蓝色）
      }
      
      // ============ 修改顶点着色器 ============
      // 在顶点着色器中添加自定义属性和varying变量
      shader.vertexShader = shader.vertexShader.replace(
          "void main() {",
          `
        attribute float alpha;    // 自定义透明度属性
        varying vec3 vPosition;   // 传递位置信息到片元着色器
        varying float vAlpha;     // 传递透明度信息到片元着色器
        void main() {
          vAlpha = alpha;         // 传递透明度
          vPosition = position;   // 传递顶点位置
      `
      )
      
      // ============ 修改片元着色器头部 ============
      // 添加varying变量和uniform声明
      shader.fragmentShader = shader.fragmentShader.replace(
          "void main() {",
          `
        varying vec3 vPosition;   // 接收顶点位置
        varying float vAlpha;     // 接收透明度
        uniform vec3 uColor1;     // 渐变颜色1
        uniform vec3 uColor2;     // 渐变颜色2
      
        void main() {
      `
      )
      
      // ============ 修改片元着色器核心渲染逻辑 ============
      // 替换最终颜色输出部分，实现垂直渐变效果
      shader.fragmentShader = shader.fragmentShader.replace(
          "#include <opaque_fragment>",
          /* glsl */ `
      #ifdef OPAQUE
      diffuseColor.a = 1.0;
      #endif
      
      // Three.js transmission feature support
      // 参考：https://github.com/mrdoob/three.js/pull/22425
      #ifdef USE_TRANSMISSION
      diffuseColor.a *= transmissionAlpha + 0.1;
      #endif
      
      // ============ 核心渐变计算 ============
      // 基于Z轴位置计算渐变因子，实现垂直方向的颜色过渡
      // vPosition.z/1.2 将Z坐标标准化为渐变因子
      vec3 gradient = mix(uColor1, uColor2, vPosition.z/1.2);
      
      // 将渐变色应用到最终输出光照
      outgoingLight = outgoingLight * gradient;
      
      // 输出最终颜色
      gl_FragColor = vec4( outgoingLight, diffuseColor.a );
      `
      )
    }
    
    // ============ 返回材质数组 ============
    // 返回顶面材质和侧面材质，供ExtrudeMap使用
    return [topMaterial, sideMaterial]
  }

  /**
   * 更新方法 - 地图核心渲染更新
   * 
   * 在每一帧渲染时被调用，负责更新地图核心组件。
   * 这是地图渲染系统的核心更新逻辑。
   * 
   * 更新内容：
   * - 地图几何体状态检查
   * - 材质动画更新
   * - 纹理坐标动画更新
   * 
   * @param {number} deltaTime - 帧间隔时间
   */
  update(deltaTime) {
    // ============ 地图核心组件更新 ============
    // 这里可以添加地图特有的更新逻辑
    // 比如：
    // - 纹理动画更新
    // - 几何体变形动画
    // - 材质参数动态调整
    // - LOD层级细节管理

    // 发射更新事件，通知其他模块
    this.eventBus.emit('map:coreUpdated', { deltaTime })
  }

  /**
   * 销毁地图核心组件
   * 
   * 清理地图核心渲染相关的所有资源，防止内存泄漏。
   * 包括几何体、材质、纹理等WebGL资源的释放。
   */
  destroy() {
    // ============ 清理省份网格资源 ============
    if (this.state.provinceMesh) {
      this.state.provinceMesh.destroy && this.state.provinceMesh.destroy()
      this.state.provinceMesh = null
    }

    // ============ 清理材质资源 ============
    if (this.state.focusMapTopMaterial) {
      this.state.focusMapTopMaterial.dispose()
      this.state.focusMapTopMaterial = null
    }

    if (this.state.focusMapSideMaterial) {
      this.state.focusMapSideMaterial.dispose()
      this.state.focusMapSideMaterial = null
    }

    if (this.state.provinceLineMaterial) {
      this.state.provinceLineMaterial.dispose()
      this.state.provinceLineMaterial = null
    }

    // ============ 清理几何体资源 ============
    if (this.state.eventElement) {
      this.state.eventElement.forEach(element => {
        if (element.geometry) {
          element.geometry.dispose()
        }
        if (element.material) {
          if (Array.isArray(element.material)) {
            element.material.forEach(mat => mat.dispose())
          } else {
            element.material.dispose()
          }
        }
      })
      this.state.eventElement = []
    }

    // ============ 清理场景组引用 ============
    this.state.focusMapGroup = null

    // ============ 发射销毁完成事件 ============
    this.eventBus.emit('map:coreDestroyed')

    console.log('[MapCore] 地图核心组件已销毁')
  }
}
