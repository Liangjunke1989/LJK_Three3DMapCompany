/**
 * 3D地图可视化核心文件
 *
 * 主要功能：
 * - 中国地图3D可视化展示
 * - 省市区域交互和钻取
 * - 各种数据可视化效果（柱状图、飞线、散点图、标牌等）
 * - 地图场景切换和动画效果
 * - 粒子特效和材质渲染
 *
 * 技术架构：
 * - 继承自Mini3d框架，提供基础3D渲染能力
 * - 使用GSAP进行复杂动画编排
 * - 基于Three.js的WebGL硬件加速渲染
 * - 集成d3-geo地理投影系统
 * - 支持多层级地图钻取和历史导航
 *
 * @author LJK
 * @version 1.0.0
 */

import {
  Fog,                    // 雾效果 - 用于营造景深效果
  Group,                  // 组对象 - 用于场景层级管理
  MeshBasicMaterial,      // 基础材质 - 不受光照影响的材质
  DirectionalLight,       // 方向光 - 模拟太阳光的平行光源
  DirectionalLightHelper, // 方向光助手 - 调试用
  AmbientLight,          // 环境光 - 提供整体基础照明
  PointLight,            // 点光源 - 从一点向四周发射的光源
  Vector3,               // 3D向量 - 表示3D空间中的位置、方向
  PointLightHelper,      // 点光源助手 - 调试用
  LineBasicMaterial,     // 线条基础材质 - 用于地图轮廓线
  Color,                 // 颜色对象 - 处理颜色相关操作
  MeshStandardMaterial,  // 标准材质 - 支持PBR光照的高级材质
  PlaneGeometry,         // 平面几何体 - 创建平面网格
  PointsMaterial,        // 点材质 - 用于粒子系统
  Mesh,                  // 网格对象 - 几何体+材质的渲染对象
  DoubleSide,            // 双面渲染 - 正反面都可见
  RepeatWrapping,        // 重复包裹 - 纹理重复模式
  SRGBColorSpace,        // sRGB颜色空间 - 标准颜色空间
  AdditiveBlending,      // 加法混合 - 实现发光效果
  NearestFilter,         // 最近邻过滤 - 像素化纹理效果
  BoxGeometry,           // 立方体几何体 - 用于柱状图
  SpriteMaterial,        // 精灵材质 - 始终面向相机的材质
  Sprite,                // 精灵对象 - 2D图像在3D空间中的表示
} from "three"

import {
  Mini3d,          // 3D引擎核心 - 自研框架基类
  Debug,           // 调试工具 - 开发环境调试面板
  Particles,       // 粒子系统 - GPU加速的粒子效果
  FlyLine,         // 飞线效果 - 贝塞尔曲线动画
  PathLine,        // 路径线条 - 基于路径的管道几何体
  Label3d,         // 3D标签 - CSS3D渲染的HTML标签
  ToastLoading,    // 加载提示 - 页面加载状态提示
  Plane,           // 平面组件 - 带旋转动画的平面
  GradientShader,  // 渐变着色器 - 自定义渐变效果
  getBoundBox,     // 获取边界框 - 计算几何体边界信息
  createHistory,   // 历史记录 - 实现撤销重做功能
} from "@/mini3d"

import stats from "three/examples/jsm/libs/stats.module"     // 性能监控工具
import { Assets } from "./map/assets"                      // 资源管理器 - 统一管理纹理和数据
import { ExtrudeMap } from "./map/extrudeMap"              // 地图挤出器 - GeoJSON转3D几何体
import { DiffuseShader } from "./map/DiffuseShader"        // 扩散着色器 - 波纹扩散效果
import labelArrow from "@/assets/texture/label-arrow.png"  // 标签箭头图标
import provincesData from "./map/provincesData"            // 省份数据 - 包含坐标和统计数据
import scatterData from "./map/scatter"                   // 散点图数据 - 城市级别数据点
import badgesData from "./map/badgesData"                 // 标牌数据 - 信息标牌内容
import { Reflector } from "./map/Reflector.js"           // 反射器 - 实时镜面反射效果
import { InteractionManager } from "three.interactive"    // 交互管理器 - 处理鼠标事件
import { ChildMap } from "./map-china-child"              // 子地图类 - 省市级地图渲染
import gsap from "gsap"                                   // 动画库 - 专业级动画引擎

/**
 * 按数值字段对数据数组进行降序排序
 * 用于对省份数据、散点数据等按数值大小排序，便于可视化展示
 *
 * @param {Array} data - 待排序的数据数组，每个元素需包含value字段
 * @returns {Array} 排序后的数据数组（降序）
 *
 * @example
 * const data = [
 *   { name: "北京", value: 50 },
 *   { name: "上海", value: 80 },
 *   { name: "广州", value: 30 }
 * ]
 * const sorted = sortByValue(data)
 * // 结果: [{ name: "上海", value: 80 }, { name: "北京", value: 50 }, { name: "广州", value: 30 }]
 */
function sortByValue(data) {
  data.sort((a, b) => b.value - a.value)
  return data
}

// 获取项目基础URL，用于构建资源路径
let base_url = import.meta.env.BASE_URL

/**
 * 3D地图世界类
 *
 * 这是整个3D地图可视化系统的核心类，继承自Mini3d框架。
 * 负责管理整个3D地图场景，包括：
 *
 * 核心功能：
 * - 3D地图模型渲染（基于GeoJSON数据）
 * - 多层级地图导航（国家→省→市）
 * - 数据可视化组件（柱状图、飞线、散点图等）
 * - 视觉特效系统（光效、粒子、动画等）
 * - 交互管理（鼠标悬停、点击、历史导航）
 *
 * 技术特性：
 * - WebGL硬件加速渲染
 * - GSAP专业动画系统
 * - 地理投影坐标转换
 * - 组件化模块设计
 * - 完善的资源管理
 *
 * @extends Mini3d
 */
export class World extends Mini3d {
  /**
   * 构造函数 - 初始化3D地图世界
   *
   * 该构造函数完成以下核心初始化工作：
   * 1. 继承Mini3d基础功能（场景、相机、渲染器等）
   * 2. 配置地图投影参数和场景效果
   * 3. 初始化交互管理和历史记录系统
   * 4. 异步加载资源并构建完整的地图场景
   * 5. 创建复杂的入场动画序列
   *
   * @param {HTMLCanvasElement} canvas - WebGL渲染的画布元素
   * @param {Object} config - 配置参数对象
   * @param {Array<number>} config.geoProjectionCenter - 地理投影中心坐标 [经度, 纬度]
   * @param {Function} config.setEnable - 控制UI按钮状态的回调函数
   *
   * @example
   * const canvas = document.getElementById('canvas')
   * const world = new World(canvas, {
   *   geoProjectionCenter: [108.55, 34.32],
   *   setEnable: (enabled) => console.log('UI enabled:', enabled)
   * })
   */
  constructor(canvas, config) {
    // 调用父类构造函数，初始化基础3D引擎
    super(canvas, config)

    // ============ 地理投影配置 ============
    // 中国地图的地理中心点坐标（经度，纬度）
    // 用于地理坐标到屏幕坐标的墨卡托投影转换
    this.pointCenter = [108.55, 34.32]

    // 飞线效果的中心坐标（北京市坐标）
    // 所有飞线都从这个点出发到各个省份
    this.flyLineCenter = [116.41995, 40.18994]

    // 地图挤出深度（Z轴高度），影响地图的立体感
    this.depth = 5

    // ============ 场景视觉效果配置 ============
    // 设置场景雾效果，创建远景虚化效果，增强空间层次感
    // 参数：雾颜色(深蓝色)、近距离、远距离
    this.scene.fog = new Fog(0x011024, 1, 500)

    // 设置场景背景色为深蓝色，营造科技感的视觉氛围
    this.scene.background = new Color(0x011024)

    // ============ 相机初始化配置 ============
    // 设置相机初始位置（俯视角度），用于入场动画的起始状态
    this.camera.instance.position.set(
      0.00002366776247217723,   // X轴位置
      225.1025284992283,        // Y轴位置（高度）
      0.0002238648924037432     // Z轴位置
    )
    this.camera.instance.near = 1      // 近裁剪面距离
    this.camera.instance.far = 10000   // 远裁剪面距离
    this.camera.instance.updateProjectionMatrix() // 更新投影矩阵

    // ============ 交互系统初始化 ============
    // 初始化交互管理器，处理鼠标点击、悬停等用户交互
    this.interactionManager = new InteractionManager(
      this.renderer.instance,  // WebGL渲染器实例
      this.camera.instance,    // 相机实例
      this.canvas              // 画布元素
    )

    // ============ 基础设置初始化 ============
    this.initSetting()        // 初始化渲染器设置
    this.initEnvironment()    // 初始化光照环境

    // ============ UI组件初始化 ============
    this.toastLoading = new ToastLoading() // 初始化加载提示组件

    // ============ 历史记录系统初始化 ============
    // 创建历史记录管理器，用于多层级地图导航的前进后退功能
    this.history = new createHistory()
    this.history.push({ name: "中国" }) // 设置初始历史状态

    // ============ DOM元素引用 ============
    this.returnBtn = document.querySelector(".return-btn") // 获取返回按钮DOM元素

    // ============ 状态变量初始化 ============
    this.clicked = false         // 点击状态标记，防止重复点击导致的问题
    this.currentScene = "mainScene" // 当前场景状态：mainScene(主场景) | childScene(子场景)

    // ============ 资源异步加载和场景构建 ============
    // 创建资源管理器实例，传入加载完成的回调函数
    this.assets = new Assets(() => {
      // ============ 场景组织结构初始化 ============
      // 创建场景层级结构，便于管理不同类型的3D对象
      this.sceneGroup = new Group()       // 根场景组，包含所有子场景
      this.mainSceneGroup = new Group()   // 主场景组，包含中国地图及其组件
      this.childSceneGroup = new Group()  // 子场景组，包含省市级地图
      this.labelGroup = new Group()       // 数据标签组，包含各种数据标签
      this.gqGroup = new Group()          // 光圈效果组，包含各种光圈动画
      this.provinceNameGroup = new Group() // 省份名称标签组
      this.badgeGroup = new Group()       // 信息标牌组，包含详细信息展示

      // 创建3D标签管理器，用于渲染HTML标签到3D场景
      this.label3d = new Label3d(this)

      // 将主场景组绕X轴旋转-90度，使地图从垂直状态旋转到水平XY平面
      // 这样地图就能平铺显示，符合常见的地图展示习惯
      this.mainSceneGroup.rotateX(-Math.PI / 2)

      // 构建场景层级结构，建立父子关系
      this.mainSceneGroup.add(this.labelGroup, this.gqGroup, this.provinceNameGroup, this.badgeGroup)
      this.sceneGroup.add(this.mainSceneGroup, this.childSceneGroup)
      this.scene.add(this.sceneGroup)

      // ============ 地图组件创建序列 ============
      // 按照依赖关系和显示优先级依次创建各个组件
      this.createFloor()        // 创建底图背景和环境装饰
      this.createRotateBorder() // 创建旋转边框装饰效果
      this.createModel()        // 创建核心地图3D模型
      this.addEvent()          // 添加鼠标交互事件处理
      this.createBar()         // 创建数据柱状图可视化
      this.createParticles()   // 创建环境粒子特效
      this.createFlyLine()     // 创建飞线动画效果
      this.createScatter()     // 创建散点图数据展示
      this.createBadgeLabel()  // 创建信息标牌
      this.createPathAnimate() // 创建路径动画轨迹
      this.createStorke()      // 创建地图轮廓描边动画

      // 开发环境下可启用水印功能（当前已注释）
      // if (import.meta.env.MODE === "staging") {
      //   this.createWatermark()
      // }

      // ============ 复杂入场动画时间线系统 ============
      // 使用GSAP Timeline创建精心编排的入场动画序列
      let tl = gsap.timeline()

      // 定义关键动画时间节点，便于同步多个动画
      tl.addLabel("focusMap", 3.5)      // 地图聚焦阶段开始时间点
      tl.addLabel("focusMapOpacity", 4.0) // 地图透明度变化阶段开始时间点
      tl.addLabel("bar", 5.0)           // 柱状图显示阶段开始时间点

      // ============ 主相机动画：从俯视切换到斜视角度 ============
      tl.add(
        gsap.to(this.camera.instance.position, {
          duration: 2.5,              // 动画持续时间
          delay: 2,                   // 延迟开始时间
          x: 3.134497983573052,       // 目标X坐标
          y: 126.8312346165316,       // 目标Y坐标（相机高度）
          z: 78.77649752477839,       // 目标Z坐标
          ease: "circ.out",           // 缓动函数，圆形缓出效果
          onComplete: () => {
            // 动画完成后保存相机状态，用于后续的控制器操作
            this.camera.controls.saveState()
          },
        })
      )

      // ============ 背景光圈旋转动画 ============
      tl.add(
        gsap.to(this.quan.rotation, {
          duration: 5,               // 旋转持续时间
          z: -2 * Math.PI,          // 旋转角度（负一圈）
        }),
        "-=2" // 相对于上一个动画提前2秒开始，实现动画重叠
      )

      // ============ 地图聚焦动画 - 位置归零 ============
      tl.add(
        gsap.to(this.focusMapGroup.position, {
          duration: 1,
          x: 0, y: 0, z: 0,         // 位置归零，地图回到中心
        }),
        "focusMap" // 在指定时间标签处开始
      )

      // ============ 地图聚焦动画 - 缩放到正常大小 ============
      tl.add(
        gsap.to(this.focusMapGroup.scale, {
          duration: 1,
          x: 1, y: 1, z: 1,         // 缩放到正常大小
          ease: "circ.out",         // 圆形缓出效果
        }),
        "focusMap" // 与位置动画同时进行
      )

      // ============ 省份网格材质透明度动画 ============
      // 遍历省份地图组中的所有网格对象，为其添加透明度动画
      this.provinceMesh.mapGroup.traverse((obj) => {
        if (obj.isMesh) {
          // 顶面材质透明度渐现动画
          tl.add(
            gsap.to(obj.material[0], {
              duration: 1,
              opacity: 1,             // 从透明到不透明
              ease: "circ.out",
            }),
            "focusMapOpacity"
          )
          // 网格位置归零动画（如果有偏移的话）
          tl.add(
            gsap.to(obj.position, {
              duration: 1,
              x: 0, y: 0, z: 0,
              ease: "circ.out",
            }),
            "focusMapOpacity"
          )
        }
      })

      // ============ 地图侧面材质透明度动画 ============
      tl.add(
        gsap.to(this.focusMapSideMaterial, {
          duration: 1,
          opacity: 1,                 // 侧面材质渐现
          ease: "circ.out",
          onComplete: () => {
            // 材质动画完成后创建镜面反射和网格扩散效果
            this.createMirror()       // 创建地面镜面反射
            this.createGridRipple()   // 创建网格扩散动画
          },
        }),
        "focusMapOpacity"
      )

      // ============ 地图轮廓线透明度动画 ============
      tl.add(
        gsap.to(this.provinceLineMaterial, {
          duration: 0.5,
          delay: 0.3,                 // 稍微延迟显示
          opacity: 1,                 // 轮廓线渐现
        }),
        "focusMapOpacity"
      )

      // ============ 旋转边框装饰缩放动画 ============
      // 第一个旋转边框缩放动画
      tl.add(
        gsap.to(this.rotateBorder1.scale, {
          delay: 0.3,
          duration: 1,
          x: 1, y: 1, z: 1,         // 从0缩放到正常大小
          ease: "circ.out",
        }),
        "focusMapOpacity"
      )
      // 第二个旋转边框缩放动画
      tl.add(
        gsap.to(this.rotateBorder2.scale, {
          duration: 1,
          delay: 0.5,                // 第二个边框稍晚出现
          x: 1, y: 1, z: 1,
          ease: "circ.out",
        }),
        "focusMapOpacity"
      )

      // ============ 柱状图缩放动画 ============
      // 为每个柱状图添加依次出现的缩放动画
      this.allBar.map((item, index) => {
        tl.add(
          gsap.to(item.scale, {
            duration: 1,
            delay: 0.05 * index,      // 每个柱子依次延迟出现
            x: 1, y: 1, z: 1,
            ease: "circ.out",
          }),
          "bar"
        )
      })

      // ============ 柱状图材质透明度动画 ============
      this.allBarMaterial.map((item, index) => {
        tl.add(
          gsap.to(item, {
            duration: 0.5,
            delay: 0.05 * index,      // 与缩放动画同步
            opacity: 1,               // 材质渐现
            ease: "circ.out",
          }),
          "bar"
        )
      })

      // ============ 省份数据标签动画 ============
      this.allProvinceLabel.map((item, index) => {
        let element = item.element.querySelector(".provinces-label-style02-wrap")
        let number = item.element.querySelector(".number .value")
        let numberVal = Number(number.innerText)
        let numberAnimate = { score: 0 } // 数字动画对象

        // 标签DOM元素的位移和透明度动画
        tl.add(
          gsap.to(element, {
            duration: 0.5,
            delay: 0.05 * index,
            translateY: 0,            // 从下方移动到原位置
            opacity: 1,               // 渐现
            ease: "circ.out",
          }),
          "bar"
        )

        // 数字递增动画效果
        let text = gsap.to(numberAnimate, {
          duration: 0.5,
          delay: 0.05 * index,
          score: numberVal,           // 从0递增到目标数值
          onUpdate: showScore,        // 每帧更新数字显示
        })

        // 数字更新函数
        function showScore() {
          number.innerText = numberAnimate.score.toFixed(0)
        }
        tl.add(text, "bar")
      })

      // ============ 省份名称标签动画 ============
      this.allProvinceNameLabel.map((item, index) => {
        let element = item.element.querySelector(".provinces-name-label-wrap")

        tl.add(
          gsap.to(element, {
            duration: 0.5,
            delay: 0.05 * index,      // 依次出现
            translateY: 0,            // 位移动画
            opacity: 1,               // 透明度动画
            ease: "circ.out",
          }),
          "bar"
        )
      })

      // ============ 光圈效果缩放动画 ============
      this.allGuangquan.map((item, index) => {
        // 双层光圈的第一层缩放动画
        tl.add(
          gsap.to(item.children[0].scale, {
            duration: 0.5,
            delay: 0.05 * index,
            x: 1, y: 1, z: 1,
            ease: "circ.out",
          }),
          "bar"
        )
        // 双层光圈的第二层缩放动画
        tl.add(
          gsap.to(item.children[1].scale, {
            duration: 0.5,
            delay: 0.05 * index,
            x: 1, y: 1, z: 1,
            ease: "circ.out",
          }),
          "bar"
        )
      })
    })
  }

  /**
   * 初始化环境灯光系统
   *
   * 设置场景的多层次光照系统，营造专业的3D视觉效果：
   * 1. 环境光 - 提供整体基础照明，避免过暗的阴影区域
   * 2. 方向光 - 模拟主光源（如太阳光），提供阴影和立体感
   * 3. 点光源 - 营造科技感的局部照明效果
   *
   * 光照策略：
   * - 使用多种光源类型组合，实现层次丰富的照明效果
   * - 配置阴影系统，增强3D物体的立体感
   * - 使用有色光源，营造科技感和氛围感
   */
  initEnvironment() {
    // ============ 环境光设置 ============
    // 创建白色环境光，提供整体的基础照明
    // 环境光是无方向性的光源，均匀照亮场景中的所有物体
    let sun = new AmbientLight(
      0xffffff,  // 白色光
      2          // 光强度
    )
    this.scene.add(sun)

    // ============ 方向光设置 ============
    // 创建方向光，模拟太阳光，提供主要照明和阴影效果
    let directionalLight = new DirectionalLight(
      0xffffff,  // 白色光
      4          // 光强度
    )
    directionalLight.position.set(-30, 6, -8)          // 设置光源位置
    directionalLight.castShadow = true                 // 启用阴影投射
    directionalLight.shadow.radius = 20               // 阴影边缘模糊半径
    directionalLight.shadow.mapSize.width = 1024      // 阴影贴图宽度（影响阴影质量）
    directionalLight.shadow.mapSize.height = 1024     // 阴影贴图高度
    this.scene.add(directionalLight)

    // ============ 科技感蓝色点光源 ============
    // 创建蓝色点光源，为地图添加科技感的蓝色光照氛围
    this.createPointLight({
      color: "#0e81fb",   // 科技蓝色
      intensity: 160,     // 光强度
      distance: 10000,    // 光照影响距离
      x: -3,             // X坐标
      y: 16,             // Y坐标（高度）
      z: -3,             // Z坐标
    })

    // ============ 暖色调辅助点光源 ============
    // 创建暖蓝色点光源，提供辅助照明，丰富光照层次
    this.createPointLight({
      color: "#1f5f7a",   // 暖蓝色
      intensity: 100,     // 光强度
      distance: 100,      // 较短的照射距离，提供局部照明
      x: -4,             // X坐标
      y: 8,              // Y坐标
      z: 43,             // Z坐标
    })
  }

  /**
   * 创建点光源
   *
   * 点光源是从一个点向四周均匀发射光线的光源，类似现实中的电灯泡。
   * 可以配置颜色、强度、照射距离和衰减特性。
   *
   * @param {Object} pointParams - 点光源配置参数对象
   * @param {string} pointParams.color - 光源颜色（CSS颜色值或十六进制）
   * @param {number} pointParams.intensity - 光源强度（影响亮度）
   * @param {number} pointParams.distance - 光照影响距离（超出此距离光照强度为0）
   * @param {number} pointParams.x - 光源X轴坐标
   * @param {number} pointParams.y - 光源Y轴坐标
   * @param {number} pointParams.z - 光源Z轴坐标
   *
   * @example
   * this.createPointLight({
   *   color: "#ff0000",     // 红色光源
   *   intensity: 100,       // 中等强度
   *   distance: 1000,       // 1000单位的照射距离
   *   x: 0, y: 10, z: 0    // 位于场景中央上方
   * })
   */
  createPointLight(pointParams) {
    // 创建点光源对象
    // 参数：颜色、强度、距离、衰减系数（固定为1表示真实的物理衰减）
    const pointLight = new PointLight(
      0x1d5e5e,                // 基础颜色（会被参数颜色覆盖）
      pointParams.intensity,   // 光强度
      pointParams.distance,    // 照射距离
      1                        // 衰减系数，1表示真实的平方反比衰减
    )

    // 设置光源在3D空间中的位置
    pointLight.position.set(
      pointParams.x,
      pointParams.y,
      pointParams.z
    )

    // 将光源添加到场景中
    this.scene.add(pointLight)
  }

  /**
   * 初始化基础设置
   *
   * 执行渲染器和其他基础组件的初始化设置。
   * 目前主要负责触发渲染器的尺寸适配。
   */
  initSetting() {
    // 触发渲染器尺寸重新计算，确保适配当前窗口大小
    this.renderer.resize()
  }

  /**
   * 创建地图3D模型
   *
   * 这是地图可视化的核心方法，负责：
   * 1. 创建地图的组织结构（Group层级）
   * 2. 生成省份的3D挤出几何体
   * 3. 配置聚焦动画的初始状态
   * 4. 建立场景层级关系
   *
   * 技术要点：
   * - 使用Group组织地图对象，便于统一变换
   * - 聚焦组用于实现地图的入场动画效果
   * - 初始状态设置为缩放为0，动画时恢复到正常大小
   */
  /**
   * 创建地图3D模型
   * 
   * 这是地图可视化的核心方法，负责：
   * 1. 创建地图的组织结构（Group层级）
   * 2. 生成省份的3D挤出几何体
   * 3. 配置聚焦动画的初始状态
   * 4. 建立场景层级关系
   * 
   * 技术要点：
   * - 使用Group组织地图对象，便于统一变换
   * - 聚焦组用于实现地图的入场动画效果
   * - 初始状态设置为缩放为0，动画时恢复到正常大小
   */
  createModel() {
    // ============ 创建地图容器组 ============
    // 创建中国地图的主容器组，包含所有地图相关的3D对象
    let mapGroup = new Group()
    mapGroup.name = "chinaMapGroup" // 设置组名称，便于调试和查找
    
    // ============ 创建聚焦动画组 ============
    // 创建专门用于聚焦动画的组，包装实际的地图对象
    let focusMapGroup = new Group()
    this.focusMapGroup = focusMapGroup // 保存引用，供动画使用
    
    // ============ 创建省份3D几何体 ============
    // 调用createProvince方法生成基于GeoJSON数据的3D省份地图
    let { province } = this.createProvince()
    this.provinceMesh = province // 保存省份网格引用
    
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
    this.mainSceneGroup.add(mapGroup)
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
    // ============ 加载地图数据和纹理资源 ============
    // 获取中国地图的GeoJSON数据
    let mapJsonData = this.assets.instance.getResource("china")
    // 获取法线贴图，用于增强地图表面的细节和立体感
    let topNormal = this.assets.instance.getResource("topNormal")

    // 设置法线贴图的包裹模式为重复，适应不同大小的几何体
    topNormal.wrapS = topNormal.wrapT = RepeatWrapping

    // ============ 创建省份轮廓线材质 ============
    // 省份边界线的材质，初始透明度为0，后续通过动画显示
    this.provinceLineMaterial = new LineBasicMaterial({
      color: 0x2bc4dc,    // 青蓝色轮廓线
      opacity: 0,         // 初始透明（入场动画需要）
      transparent: true,  // 启用透明度
      fog: false,         // 不受雾效果影响
    })
    
    // ============ 创建省份顶面和侧面材质 ============
    // 调用材质创建方法，返回顶面和侧面材质
    let [topMaterial, sideMaterial] = this.createProvinceMaterial()

    // 保存材质引用，供动画系统使用
    this.focusMapTopMaterial = topMaterial
    this.focusMapSideMaterial = sideMaterial
    
    // ============ 创建3D挤出地图实例 ============
    // 使用ExtrudeMap类将GeoJSON数据转换为3D挤出几何体
    let province = new ExtrudeMap(this, {
      center: this.pointCenter,              // 地理投影中心点
      position: new Vector3(0, 0, 0.06),     // 地图在3D空间中的位置
      data: mapJsonData,                     // GeoJSON地图数据
      depth: this.depth,                     // 挤出深度
      topFaceMaterial: topMaterial,          // 顶面材质
      sideMaterial: sideMaterial,            // 侧面材质
      lineMaterial: this.provinceLineMaterial, // 轮廓线材质
      renderOrder: 9,                        // 渲染顺序
    })
    
    // ============ 添加侧面材质动画 ============
    // 监听时间更新事件，让侧面纹理产生流动效果
    this.time.on("tick", () => {
      sideMaterial.map.offset.y += 0.002 // Y轴偏移量递增，产生向上流动效果
    })
    
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
    this.eventElement = []
    
    // 遍历省份地图组中的所有子对象
    province.mapGroup.children.map((group, index) => {
      group.children.map((mesh) => {
        // 筛选出网格类型的对象
        if (mesh.type === "Mesh") {
          // 添加到交互元素数组中，供事件系统使用
          this.eventElement.push(mesh)

          // 为每个网格计算UV2坐标，用于纹理映射和特效
          this.calcUv2(mesh.geometry, boxSize.x, boxSize.y, box3.min.x, box3.min.y)
        }
      })
    })

    // 返回省份地图实例
    return {
      province,
    }
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
    // ============ 悬停状态管理 ============
    // 存储当前悬停的对象数组，支持多对象同时悬停
    let objectsHover = []

    /**
     * 重置省份状态
     * 将悬停或选中的省份恢复到默认状态
     * 
     * @param {THREE.Group} mesh - 要重置的省份网格组
     */
    const reset = (mesh) => {
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
    }
    
    /**
     * 省份悬停激活状态
     * 将鼠标悬停的省份设置为高亮激活状态
     * 
     * @param {THREE.Group} mesh - 要激活的省份网格组
     */
    const move = (mesh) => {
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
    }

    // ============ 为所有省份网格添加交互事件 ============
    this.eventElement.map((mesh) => {
      // 将网格添加到交互管理器中，启用鼠标事件检测
      this.interactionManager.add(mesh)
      
      // ============ 鼠标按下事件（省份点击钻取） ============
      mesh.addEventListener("mousedown", (event) => {
        // 防重复点击检查和场景可见性检查
        if (this.clicked || !this.mainSceneGroup.visible) return false
        
        this.clicked = true  // 设置点击状态，防止重复触发
        
        // 获取点击的省份用户数据
        let userData = event.target.parent.userData
        
        // 将当前省份信息推入历史记录，支持返回功能
        this.history.push(userData)

        // 加载子地图（省市级地图）
        this.loadChildMap(userData)
      })
      
      // ============ 鼠标抬起事件 ============
      mesh.addEventListener("mouseup", (ev) => {
        // 重置点击状态，允许下次点击
        this.clicked = false
      })
      
      // ============ 鼠标悬停进入事件 ============
      mesh.addEventListener("mouseover", (event) => {
        // 将悬停对象添加到悬停数组中（如果不存在）
        if (!objectsHover.includes(event.target.parent)) {
          objectsHover.push(event.target.parent)
        }

        // 只有在主场景可见时才显示指针样式
        if (this.mainSceneGroup.visible) {
          document.body.style.cursor = "pointer"
        }
        
        // 激活悬停效果
        move(event.target.parent)
      })
      
      // ============ 鼠标悬停离开事件 ============
      mesh.addEventListener("mouseout", (event) => {
        // 从悬停数组中移除该对象
        objectsHover = objectsHover.filter((n) => n.userData.name !== event.target.parent.userData.name)
        
        // 如果还有其他悬停对象，保持最后一个的状态（当前代码中未完整实现）
        if (objectsHover.length > 0) {
          const mesh = objectsHover[objectsHover.length - 1]
          // 注意：这里可能需要重新激活最后一个悬停对象的效果
        }
        
        // 重置省份状态
        reset(event.target.parent)
        
        // 恢复默认鼠标样式
        document.body.style.cursor = "default"
      })
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
    this.allBar.map((barGroup) => {
      // 通过行政区划代码匹配对应的柱状图
      if (barGroup.userData.adcode === adcode) {
        // 使用GSAP创建平滑的位置过渡动画
        gsap.to(barGroup.position, {
          duration: 0.3, // 动画持续时间
          // 根据类型计算目标Z坐标：上移时增加高度偏移，下移时恢复原位置
          z: type === "up" ? 
             barGroup.userData.position[2] + this.depth / 2 + 0.3 : // 上移：原位置 + 地图深度一半 + 额外偏移
             barGroup.userData.position[2], // 下移：恢复到原始位置
        })
      }
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
    this.allGuangquan.map((group) => {
      // 匹配对应省份的光圈组
      if (group.userData.adcode === adcode) {
        gsap.to(group.position, {
          duration: 0.3, // 动画持续时间
          // Z轴移动：上移时增加高度，下移时恢复原位置
          z: type === "up" ? 
             group.userData.position[2] + this.depth / 2 + 0.3 : 
             group.userData.position[2],
        })
      }
    })
    
    // ============ 处理飞线焦点光圈（特殊情况） ============
    // 如果当前操作的是飞线中心点（通常是北京，adcode为110000）
    if (this.flyLineFocusGroup.userData.adcode === adcode) {
      console.log(this.flyLineFocusGroup.userData.adcode) // 调试输出
      gsap.to(this.flyLineFocusGroup.position, {
        duration: 0.3,
        // 注意：飞线焦点使用Y轴移动而非Z轴，因为坐标系统不同
        y: type === "up"
            ? this.flyLineFocusGroup.userData.position[1] + this.depth / 2 + 0.3
            : this.flyLineFocusGroup.userData.position[1],
      })
    }
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
    ;[...this.allProvinceLabel, ...this.allProvinceNameLabel].map((label) => {
      // 匹配对应省份的标签
      if (label.userData.adcode === adcode) {
        gsap.to(label.position, {
          duration: 0.3, // 动画持续时间
          // Z轴移动：保持与省份的相对位置关系
          z: type === "up" ? 
             label.userData.position[2] + this.depth / 2 + 0.3 : 
             label.userData.position[2],
        })
      }
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
    // 遍历散点图组中的所有散点精灵
    this.scatterGroup.children.map((sprite) => {
      // 匹配属于该省份的散点
      if (sprite.userData.adcode === adcode) {
        gsap.to(sprite.position, {
          duration: 0.3, // 动画持续时间
          // Z轴移动：与省份地图保持一致的高度变化
          z: type === "up" ? 
             sprite.userData.position[2] + this.depth / 2 + 0.3 : 
             sprite.userData.position[2],
        })
      }
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
    // ============ 显示加载状态 ============
    this.toastLoading.show() // 显示加载提示，提升用户体验
    
    // ============ 异步获取子地图数据 ============
    this.getChildMapData(userData, (data) => {
      // ============ 更新UI控制元素 ============
      // 显示返回按钮，允许用户返回上级地图
      this.returnBtn.style.display = "block"
      
      // ============ 清理旧的子地图实例 ============
      // 如果存在旧的子地图，先销毁以避免内存泄漏
      this.childMap && this.childMap.destroy()
      
      // ============ 创建新的子地图实例 ============
      this.childMap = new ChildMap(this, {
        adcode: userData.adcode,               // 行政区划代码
        center: userData.center,               // 地理中心坐标
        centroid: userData.centroid,           // 几何中心坐标
        childrenNum: userData.childrenNum,     // 子级区域数量
        mapData: data,                         // GeoJSON地图数据
        // 父级地图的边界框大小，用于子地图的尺寸适配
        parentBoxSize: [129.00074005126953, (126.23402404785156 * 3) / 4],
      })
      
      // ============ 将子地图添加到场景 ============
      this.childSceneGroup.add(this.childMap.instance)
      
      // ============ 切换场景状态 ============
      this.setMainMapVisible(false) // 隐藏主地图
      this.toastLoading.hide()      // 隐藏加载提示

      // ============ 重置相机和更新状态 ============
      this.camera.controls.reset()  // 重置相机控制器到默认状态
      this.currentScene = "childScene" // 更新当前场景标识
      this.config.setEnable(false)  // 禁用某些UI控件（具体功能由外部配置决定）
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
    
    // ============ 发起数据请求 ============
    fetch(url)
        .then((res) => {
          // 将响应转换为文本格式（GeoJSON字符串）
          return res.text()
        })
        .then((res) => {
          // 执行回调函数，传递获取到的数据
          callback && callback(res)
        })
        .catch((error) => {
          console.error('获取地图数据失败:', error)
          // 这里可以添加错误处理逻辑
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
    // ============ 控制核心地图组件 ============
    // 通过名称查找中国地图组并设置可见性
    this.scene.getObjectByName("chinaMapGroup").visible = bool
    // 设置主场景组的可见性（包含所有主地图相关的可视化组件）
    this.mainSceneGroup.visible = bool

    // ============ 隐藏时的特殊处理 ============
    // 当隐藏主地图时，需要额外隐藏所有标签组
    // 这样可以确保子地图场景的干净整洁
    if (bool === false) {
      this.setLabelVisible("provinceNameGroup", bool) // 隐藏省份名称标签
      this.setLabelVisible("labelGroup", bool)       // 隐藏数据标签
      this.setLabelVisible("badgeGroup", bool)       // 隐藏信息标牌
    }
    // 注意：显示主地图时，标签的显示由其他逻辑控制，不在这里处理
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
    // ============ 执行历史记录回退 ============
    this.history.undo() // 撤销到上一个历史状态
    
    // ============ 判断是否返回到根级地图 ============
    if (!this.history.getIndex()) {
      // 当前处于历史记录的根级（中国地图）
      
      // ============ 恢复到主场景状态 ============
      this.currentScene = "mainScene" // 更新场景标识

      // 隐藏返回按钮（已经在根级，无需再返回）
      this.returnBtn.style.display = "none"

      // ============ 清理子地图资源 ============
      this.childMap && this.childMap.destroy() // 销毁子地图实例
      this.childMap = null                      // 清空引用

      // ============ 恢复主地图显示 ============
      this.setMainMapVisible(true)              // 显示主地图
      this.setLabelVisible("labelGroup", true) // 显示数据标签
    } else {
      // 还不是根级，需要加载上一级的子地图
      
      // ============ 获取上级地图数据并加载 ============
      let userData = this.history.present // 获取当前历史状态的数据
      this.loadChildMap(userData)         // 加载上级子地图
    }

    // ============ 重置相机控制 ============
    // 无论返回到哪一级，都重置相机到默认状态
    this.camera.controls.reset()
  }

  /**
   * 计算几何体的UV2坐标
   * 
   * 为地图几何体计算第二套UV坐标，用于特效纹理映射和材质处理。
   * UV坐标将3D空间中的顶点位置映射到2D纹理空间（0-1范围）。
   * 
   * @param {THREE.BufferGeometry} geometry - 要计算UV坐标的几何体
   * @param {number} width - 地图边界框的宽度
   * @param {number} height - 地图边界框的高度
   * @param {number} minX - 地图边界框的最小X坐标
   * @param {number} minY - 地图边界框的最小Y坐标
   * 
   * 技术原理：
   * - 将3D世界坐标标准化到[0,1]范围的UV坐标
   * - 公式：u = (x - minX) / width, v = (y - minY) / height
   * - UV坐标用于纹理映射、特效渲染等
   * 
   * 用途：
   * - 支持复杂的材质效果（如渐变、扩散、光影）
   * - 为着色器提供标准化的坐标系统
   * - 实现基于位置的视觉效果
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
    let topNormal = this.assets.instance.getResource("topNormal")
    topNormal.wrapS = topNormal.wrapT = RepeatWrapping // 设置重复包裹模式
    
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
    let sideMap = this.assets.instance.getResource("side")
    sideMap.wrapS = RepeatWrapping  // 水平方向重复
    sideMap.wrapT = RepeatWrapping  // 垂直方向重复
    sideMap.repeat.set(1, 0.2)      // 设置重复次数：水平1次，垂直0.2次（拉伸效果）
    sideMap.offset.y += 0.01        // Y轴偏移，为后续动画做准备
    
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
   * 创建3D数据柱状图
   * 
   * 基于省份人口数据创建3D柱状图可视化效果，每个省份对应一个柱子。
   * 柱子高度与数据值成正比，并包含丰富的视觉效果和交互元素。
   * 
   * 功能特性：
   * - 数据驱动的高度映射
   * - 前三名特殊颜色标识（金色）
   * - 渐变材质和辉光效果
   * - 光圈装饰动画
   * - 3D数据标签和省份名称标签
   * - 支持交互联动
   * 
   * 技术实现：
   * - 使用BoxGeometry创建立方体柱子
   * - GradientShader实现渐变材质
   * - CSS3D标签渲染数据信息
   * - 地理投影坐标定位
   */
  createBar() {
    // ============ 初始化变量和数据处理 ============
    let self = this // 保存this引用，供内部函数使用
    // 对省份数据按数值降序排序（可选择性过滤前15个）
    let data = sortByValue(provincesData) //.filter((item, index) => index < 15);
    
    // 创建柱状图容器组
    const barGroup = new Group()
    this.barGroup = barGroup

    // ============ 柱状图尺寸计算参数 ============
    const factor = 7                    // 缩放因子，影响柱子粗细
    const height = 4.0 * factor         // 最大柱子高度
    const max = data[0].value           // 获取最大数据值（已排序，第一个是最大值）

    // ============ 初始化存储数组 ============
    // 这些数组用于统一管理所有柱状图相关元素，便于后续动画控制
    this.allBar = []                    // 存储所有柱状图网格
    this.allBarMaterial = []            // 存储所有柱状图材质
    this.allGuangquan = []              // 存储所有光圈装饰
    this.allProvinceLabel = []          // 存储所有数据标签
    this.allProvinceNameLabel = []      // 存储所有省份名称标签
    
    // ============ 遍历数据创建柱状图 ============
    data.map((item, index) => {
      // ============ 计算柱子高度 ============
      // 根据数据值与最大值的比例计算实际高度
      let geoHeight = height * (item.value / max)
      
      // ============ 创建柱状图材质 ============
      let material = new MeshBasicMaterial({
        color: 0xffffff,      // 白色基础色（会被渐变覆盖）
        transparent: true,    // 启用透明度
        opacity: 0,          // 初始完全透明（用于入场动画）
        depthTest: false,    // 禁用深度测试，避免渲染问题
        fog: false,          // 不受雾效果影响
      })
      
      // ============ 应用渐变着色器 ============
      // 前三名使用金色渐变，其他使用蓝色渐变
      new GradientShader(material, {
        uColor1: index < 3 ? 0xfbdf88 : 0x50bbfe,  // 起始颜色：金色或蓝色
        uColor2: index < 3 ? 0xfbdf88 : 0x50bbfe,  // 结束颜色：金色或蓝色
        size: geoHeight,                           // 渐变高度
        dir: "y",                                  // Y轴方向渐变
      })
      
      // ============ 创建柱状图几何体 ============
      const geo = new BoxGeometry(
        0.05 * factor,  // X轴尺寸
        0.05 * factor,  // Y轴尺寸
        geoHeight       // Z轴尺寸（高度）
      )
      // 将几何体向上平移，使底部与地面对齐
      geo.translate(0, 0, geoHeight / 2)
      
      // ============ 创建柱状图网格 ============
      const mesh = new Mesh(geo, material)
      mesh.renderOrder = 22 // 设置渲染顺序，确保正确的层级显示
      let areaBar = mesh
      
      // ============ 地理坐标投影和定位 ============
      // 将地理坐标转换为3D空间坐标
      let [x, y] = this.geoProjection(item.centroid)
      areaBar.position.set(x, -y, this.depth + 0.46) // 设置位置
      areaBar.scale.set(1, 1, 0)                     // 初始Z轴缩放为0（用于入场动画）
      
      // ============ 设置用户数据 ============
      // 存储省份信息，供交互系统使用
      areaBar.userData.name = item.name
      areaBar.userData.adcode = item.adcode
      areaBar.userData.position = [x, -y, this.depth + 0.46]

      // ============ 创建光圈装饰效果 ============
      let guangQuan = this.createQuan()
      guangQuan.position.set(x, -y, this.depth + 0.46)
      guangQuan.userData.name = item.name
      guangQuan.userData.adcode = item.adcode
      guangQuan.userData.position = [x, -y, this.depth + 0.46]
      this.gqGroup.add(guangQuan) // 添加到光圈组
      
      // ============ 创建辉光效果 ============
      // 根据排名选择不同的辉光颜色
      let hg = this.createHUIGUANG(geoHeight, index < 3 ? 0xfffef4 : 0x77fbf5)
      areaBar.add(...hg) // 将辉光效果添加到柱状图

      // ============ 添加到场景和存储数组 ============
      barGroup.add(areaBar) // 添加到柱状图组
      
      // ============ 创建数据标签和省份名称标签 ============
      let barLabel = labelStyle04(item, index, new Vector3(x, -y, this.depth + 0.9 + geoHeight))
      let nameLabel = labelNameStyle(item, index, new Vector3(x, -y - 1.5, this.depth + 0.4))
      
      // ============ 存储到管理数组 ============
      this.allBar.push(areaBar)              // 柱状图网格
      this.allBarMaterial.push(material)     // 材质
      this.allGuangquan.push(guangQuan)      // 光圈
      this.allProvinceLabel.push(barLabel)   // 数据标签
      this.allProvinceNameLabel.push(nameLabel) // 名称标签
    })

    // ============ 将柱状图组添加到主场景 ============
    this.mainSceneGroup.add(barGroup)
    
    // ============ 数据标签创建函数 ============
    /**
     * 创建省份数据标签（人口数值和排名）
     * 
     * @param {Object} data - 省份数据
     * @param {number} index - 省份排名索引
     * @param {THREE.Vector3} position - 标签3D位置
     * @returns {Object} 3D标签对象
     */
    function labelStyle04(data, index, position) {
      // 创建3D标签实例
      let label = self.label3d.create("", "provinces-label-style02", true)
      
      // 初始化标签HTML内容
      label.init(
          `<div class="provinces-label-style02 ${index < 3 ? "yellow" : ""}">
      <div class="provinces-label-style02-wrap">
        <div class="number"><span class="value">${data.value}</span><span class="unit">万人</span></div>
        <div class="no">${index + 1}</div>
      </div>
    </div>`,
          position
      )
      
      // 设置标签样式和缩放
      self.label3d.setLabelStyle(label, 0.05, "x")
      // 设置父级容器
      label.setParent(self.labelGroup)
      // 存储用户数据
      label.userData.adcode = data.adcode
      label.userData.position = [position.x, position.y, position.z]
      return label
    }
    
    // ============ 省份名称标签创建函数 ============
    /**
     * 创建省份名称标签
     * 
     * @param {Object} data - 省份数据
     * @param {number} index - 省份排名索引
     * @param {THREE.Vector3} position - 标签3D位置
     * @returns {Object} 3D标签对象
     */
    function labelNameStyle(data, index, position) {
      // 创建3D标签实例
      let label = self.label3d.create("", "provinces-name-label", true)
      
      // 初始化标签HTML内容
      label.init(
          `<div class="provinces-name-label"><div class="provinces-name-label-wrap">${data.name}</div></div>`,
          position
      )
      
      // 设置标签样式和缩放
      self.label3d.setLabelStyle(label, 0.08, "x")
      // 设置父级容器
      label.setParent(self.provinceNameGroup)
      // 存储用户数据
      label.userData.adcode = data.adcode
      label.userData.position = [position.x, position.y, position.z]
      return label
    }
  }
  createHUIGUANG(h, color) {
    let geometry = new PlaneGeometry(1.5, h)
    geometry.translate(0, h / 2, 0)
    const texture = this.assets.instance.getResource("huiguang")
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    let material = new MeshBasicMaterial({
      color: color,
      map: texture,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,

      side: DoubleSide,
      blending: AdditiveBlending,
    })
    let mesh = new Mesh(geometry, material)
    mesh.renderOrder = 23
    mesh.rotateX(Math.PI / 2)
    let mesh2 = mesh.clone()
    let mesh3 = mesh.clone()
    mesh2.rotateY((Math.PI / 180) * 60)
    mesh3.rotateY((Math.PI / 180) * 120)
    return [mesh, mesh2, mesh3]
  }
  createQuan() {
    const guangquan1 = this.assets.instance.getResource("guangquan1")
    const guangquan2 = this.assets.instance.getResource("guangquan2")
    let geometry = new PlaneGeometry(2, 2)

    let material1 = new MeshBasicMaterial({
      color: 0xffffff,
      map: guangquan1,
      alphaMap: guangquan1,
      opacity: 1,
      transparent: true,
      depthTest: false,
      fog: false,
      blending: AdditiveBlending,
    })
    let material2 = new MeshBasicMaterial({
      color: 0xffffff,
      map: guangquan2,
      alphaMap: guangquan2,
      opacity: 1,
      transparent: true,
      depthTest: false,
      fog: false,
      blending: AdditiveBlending,
    })
    let mesh1 = new Mesh(geometry, material1)
    let mesh2 = new Mesh(geometry, material2)
    mesh1.renderOrder = 24
    mesh2.renderOrder = 24

    mesh2.position.z -= 0.001
    mesh1.scale.set(0, 0, 0)
    mesh2.scale.set(0, 0, 0)
    this.quanGroup = new Group()
    this.quanGroup.add(mesh1, mesh2)

    this.time.on("tick", (delta) => {
      mesh1.rotation.z += delta * 2
    })
    return this.quanGroup
  }
  /**
   * 设置css3d标签的隐藏显示
   * @param {*} labelGroup
   * @param {*} bool
   */
  setLabelVisible(labelGroup = "labelGroup", bool) {
    this[labelGroup].visible = bool
    this[labelGroup].children.map((label) => {
      bool ? label.show() : label.hide()
    })
  }

  createFloor() {
    let geometry = new PlaneGeometry(200, 200)
    const texture = this.assets.instance.getResource("gaoguang1")
    texture.colorSpace = SRGBColorSpace
    texture.wrapS = RepeatWrapping
    texture.wrapT = RepeatWrapping
    texture.repeat.set(1, 1)
    let material = new MeshBasicMaterial({
      map: texture,
      opacity: 1,
      transparent: true,
      blending: AdditiveBlending,
    })
    let mesh = new Mesh(geometry, material)
    mesh.rotateX(-Math.PI / 2)
    mesh.position.set(0, 0.05, 0)
    this.scene.add(mesh)

    const quanTexture = this.assets.instance.getResource("quan")

    let quan = new Mesh(
        new PlaneGeometry(250, 250),
        new MeshBasicMaterial({
          map: quanTexture,
          opacity: 1,
          transparent: true,
          blending: AdditiveBlending,
          depthTest: false,
        })
    )
    quan.rotateX(-Math.PI / 2)
    quan.position.set(0, this.depth + 2.05, 0)
    this.quan = quan
    this.scene.add(quan)
  }

  createGridRipple() {
    let geometry = new PlaneGeometry(300, 300)
    const texture = this.assets.instance.getResource("grid")
    const alphaMap = this.assets.instance.getResource("gridBlack")
    texture.wrapS = texture.wrapT = alphaMap.wrapS = alphaMap.wrapT = RepeatWrapping
    texture.repeat.set(40, 40)
    alphaMap.repeat.set(40, 40)
    let material = new MeshBasicMaterial({
      map: texture,
      color: 0x00ffff,
      transparent: true,
      opacity: 0.5,
      alphaMap: alphaMap,
      blending: AdditiveBlending,
    })

    let mesh = new Mesh(geometry, material)
    mesh.rotateX(-Math.PI / 2)
    let [x, y] = this.geoProjection(this.pointCenter)
    mesh.position.set(x, -y, 0.01)
    const mesh2 = mesh.clone()
    mesh2.material = material.clone()
    mesh2.material.opacity = 0.1
    this.scene.add(mesh, mesh2)
    new DiffuseShader({
      material,
      time: this.time,
      size: 300,
      diffuseColor: 0x079fe6,
      diffuseSpeed: 30,
      diffuseWidth: 20,
      diffuseDir: 2.0,
    })
  }
  createMirror() {
    const geometry = new PlaneGeometry(200, 200)
    const groundMirror = new Reflector(geometry, {
      clipBias: 0.003,
      textureWidth: this.sizes.width,
      textureHeight: this.sizes.height,
      color: 0xb5b5b5,
      multisample: 1,
    })
    groundMirror.material.transparent = true
    groundMirror.material.opacity = 0.2
    groundMirror.position.y = -0.01
    groundMirror.rotateX(-Math.PI / 2)
    this.groundMirror = groundMirror
    this.groundMirror.visible = false
    this.scene.add(groundMirror)
  }

  createRotateBorder() {
    //
    let max = 100
    let rotationBorder1 = this.assets.instance.getResource("rotationBorder1")
    let rotationBorder2 = this.assets.instance.getResource("rotationBorder2")
    let plane01 = new Plane(this, {
      width: max * 1.178,
      needRotate: true,
      rotateSpeed: 0.001,
      material: new MeshBasicMaterial({
        map: rotationBorder1,
        color: 0x48afff,
        transparent: true,
        opacity: 0.2,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
      position: new Vector3(0, 0.07, 0),
    })
    plane01.instance.renderOrder = 6
    plane01.instance.scale.set(0, 0, 0)
    plane01.setParent(this.scene)
    //
    let plane02 = new Plane(this, {
      width: max * 1.116,
      needRotate: true,
      rotateSpeed: -0.004,
      material: new MeshBasicMaterial({
        map: rotationBorder2,
        color: 0x48afff,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
      position: new Vector3(0, 0.06, 0),
    })
    plane02.instance.renderOrder = 6
    plane02.instance.scale.set(0, 0, 0)
    plane02.setParent(this.scene)
    this.rotateBorder1 = plane01.instance
    this.rotateBorder2 = plane02.instance
  }

  // 创建粒子
  createParticles() {
    this.particles = new Particles(this, {
      num: 10, // 粒子数量
      range: 200, // 范围
      dir: "up",
      speed: 0.1,
      material: new PointsMaterial({
        map: Particles.createTexture(),
        size: 10,
        color: 0x00eeee,
        transparent: true,
        opacity: 0.3,
        depthTest: false,
        depthWrite: false,
        vertexColors: true,
        blending: AdditiveBlending,
        sizeAttenuation: true,
      }),
    })
    this.particles.instance.position.set(0, 0, 0)
    this.particles.instance.rotation.x = -Math.PI / 2
    this.particles.setParent(this.scene)
    // 停用,隐藏
    this.particles.enable = false
    this.particles.instance.visible = false
  }

  // 创建散点图
  createScatter() {
    this.scatterGroup = new Group()
    this.scatterGroup.visible = false

    this.mainSceneGroup.add(this.scatterGroup)
    // 贴图
    const texture = this.assets.instance.getResource("arrow")
    const material = new SpriteMaterial({
      map: texture,
      color: 0xffff00,
      transparent: true,
      depthTest: false,
    })

    let scatterAllData = sortByValue(scatterData)
    let max = scatterAllData[0].value
    scatterAllData.map((data) => {
      const sprite = new Sprite(material)
      sprite.renderOrder = 23
      let scale = 2 + (data.value / max) * 1
      sprite.scale.set(scale, scale, scale)
      let [x, y] = this.geoProjection([data.lng, data.lat])
      sprite.position.set(x, -y, this.depth + 0.41)
      sprite.userData.adcode = data.adcode
      sprite.userData.position = [x, -y, this.depth + 0.41]
      this.scatterGroup.add(sprite)
    })
  }
  // 创建标牌
  createBadgeLabel() {
    const self = this
    self.badgeGroup.visible = false
    badgesData.map((data) => {
      const [x, y] = this.geoProjection(data.geometry.coordinates)
      labelNameStyle(data, new Vector3(x, -y, this.depth + 0.92))
    })
    function labelNameStyle(data, position) {
      let label = self.label3d.create("", "badges-label", true)
      label.init(
          `<div class="badges-label-wrap">
        平均工资：<span>${data.value}元</span>
        <img class="icon" src="${labelArrow}" alt="" />
      </div>`,
          position
      )
      self.label3d.setLabelStyle(label, 0.1, "x")
      label.setParent(self.badgeGroup)
      label.hide()
      label.userData.adcode = data.adcode
      label.userData.position = [position.x, position.y, position.z]
      return label
    }
  }
  // 创建飞线
  createFlyLine() {
    // 贴图
    const texture = this.assets.instance.getResource("flyLine")
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.generateMipmaps = false
    texture.magFilter = NearestFilter
    texture.repeat.set(0.5, 1)
    // 飞线
    let flyLine = new FlyLine(this, {
      centerPoint: this.flyLineCenter,
      data: provincesData,
      texture: texture,
      material: new MeshBasicMaterial({
        map: texture,
        alphaMap: texture,
        color: 0xfbdf88,
        transparent: true,
        fog: false,
        depthTest: false,
        blending: AdditiveBlending,
      }),
    })
    flyLine.setParent(this.mainSceneGroup)
    flyLine.visible = false
    flyLine.instance.position.z = this.depth + 0.4

    this.flyLineGroup = flyLine

    this.createFlyLineFocus()
  }
  createFlyLineFocus() {
    this.flyLineFocusGroup = new Group()
    this.flyLineFocusGroup.visible = false

    let [x, y] = this.geoProjection(this.flyLineCenter)
    this.flyLineFocusGroup.position.set(x, -y, this.depth + 0.47)
    this.flyLineFocusGroup.userData.name = "北京市" // 设置光圈的名字
    this.flyLineFocusGroup.userData.adcode = 110000 //设置光圈的adcode
    this.flyLineFocusGroup.userData.position = [x, -y, this.depth + 0.47] //设置光圈的位置
    this.mainSceneGroup.add(this.flyLineFocusGroup)
    const flyLineFocus = this.assets.instance.getResource("guangquan1")
    const geometry = new PlaneGeometry(5, 5)
    const material = new MeshBasicMaterial({
      color: 0xfbdf88,
      map: flyLineFocus,
      alphaMap: flyLineFocus,
      transparent: true,
      fog: false,
      depthTest: false,
      blending: AdditiveBlending,
    })
    const mesh = new Mesh(geometry, material)
    mesh.renderOrder = 30
    mesh.scale.set(0, 0, 0)
    const mesh2 = mesh.clone()
    mesh2.material = material.clone()
    this.flyLineFocusGroup.add(mesh, mesh2)
    gsap.to(mesh.material, {
      opacity: 0,
      repeat: -1,
      yoyo: false,
      duration: 1,
    })
    gsap.to(mesh.scale, {
      x: 2,
      y: 2,
      z: 2,
      repeat: -1,
      yoyo: false,
      duration: 1,
    })
    gsap.to(mesh2.material, {
      delay: 0.5,
      opacity: 0,
      repeat: -1,
      yoyo: false,
      duration: 1,
    })
    gsap.to(mesh2.scale, {
      delay: 0.5,
      x: 2,
      y: 2,
      z: 2,
      repeat: -1,
      yoyo: false,
      duration: 1,
    })
  }
  // 创建路径动画
  createPathAnimate() {
    // 贴图
    const texture = this.assets.instance.getResource("pathLine")
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.repeat.set(8, 1)
    // 路径
    let transportPath = this.assets.instance.getResource("transportPath")
    transportPath = JSON.parse(transportPath)
    for (let i = 0; i < transportPath.features.length; i++) {
      const element = transportPath.features[i]
      element.geometry.coordinates = [[element.geometry.coordinates]]
    }
    // 数据
    // 格式 [{geometry: {type: 'LineString', coordinates: [[[x,y]]] }}]
    let data = transportPath.features.map((path) => {
      return {
        geometry: path.geometry,
      }
    })
    let pathLine = new PathLine(this, {
      data: data,
      texture: texture,
      renderOrder: 21,
      speed: 0.5,
      material: new MeshBasicMaterial({
        map: texture,
        color: 0xffffff,
        transparent: true,
        fog: false,
        opacity: 1,
        depthTest: false,
        blending: AdditiveBlending,
      }),
    })
    // 设置父级
    pathLine.setParent(this.mainSceneGroup)
    // 隐藏
    pathLine.visible = false
    // 位置
    pathLine.instance.position.z = this.depth + 0.42

    this.pathLineGroup = pathLine
  }

  // 创建轮廓
  createStorke() {
    // 贴图
    const texture = this.assets.instance.getResource("pathLine2")
    texture.wrapS = texture.wrapT = RepeatWrapping
    texture.repeat.set(1, 1)
    // 路径
    let mapJsonData = this.assets.instance.getResource("chinaStorke")
    mapJsonData = JSON.parse(mapJsonData)

    // 数据
    // 格式 [{geometry: {type: '', coordinates: [[[x,y]]] }}]
    let data = mapJsonData.features.map((path) => {
      return {
        geometry: path.geometry,
      }
    })

    let pathLine = new PathLine(this, {
      data: data,
      texture: texture,
      renderOrder: 21,
      speed: 0.2,
      radius: 0.2,
      segments: 256 * 10,
      radialSegments: 4,
      material: new MeshBasicMaterial({
        color: 0x2bc4dc,
        map: texture,
        alphaMap: texture,
        fog: false,
        transparent: true,
        opacity: 1,
        blending: AdditiveBlending,
      }),
    })
    // 设置父级
    pathLine.setParent(this.mainSceneGroup)

    // 位置]
    pathLine.instance.position.z = this.depth + 0.38
  }
  createWatermark() {
    let watermark = this.assets.instance.getResource("watermark")
    watermark.wrapS = RepeatWrapping
    watermark.wrapT = RepeatWrapping
    watermark.repeat.set(50, 50)
    watermark.rotation = Math.PI / 5
    let geometry = new PlaneGeometry(100, 100, 1)
    let material = new MeshBasicMaterial({
      // color: 0xffffff,
      map: watermark,
      // side: DoubleSide,
      transparent: true,
      opacity: 0.15,
    })
    let mesh = new Mesh(geometry, material)
    mesh.position.x -= 10
    mesh.position.y -= 10
    mesh.position.z -= 10
    mesh.renderOrder = 999
    this.camera.instance.add(mesh)
  }
  /**
   * 更新方法 - 渲染循环的核心
   * 
   * 在每一帧渲染时被调用，负责更新所有需要实时更新的组件和系统。
   * 这是整个3D地图应用的心跳方法，确保动画、交互、性能监控等正常运行。
   * 
   * 更新内容：
   * - 调用父类的更新逻辑（Mini3d的基础更新）
   * - 性能监控统计更新
   * - 交互管理器状态更新
   * 
   * 性能考虑：
   * - 该方法在每帧都被调用（通常60FPS），性能至关重要
   * - 使用条件检查避免null对象调用
   * - 所有耗时操作应当避免在此方法中执行
   */
  update() {
    // ============ 调用父类更新逻辑 ============
    // 执行Mini3d框架的基础更新逻辑，包括：
    // - 时间系统更新
    // - 相机控制器更新  
    // - 渲染器状态更新
    // - 场景图形渲染
    super.update()
    
    // ============ 性能监控更新 ============
    // 更新性能统计信息（FPS、渲染时间、内存使用等）
    // 仅在开发环境或调试模式下启用
    this.stats && this.stats.update()
    
    // ============ 交互管理器更新 ============
    // 更新鼠标交互检测和处理逻辑
    // 包括射线检测、悬停状态管理、点击事件处理等
    this.interactionManager && this.interactionManager.update()
  }

  /**
   * 销毁方法 - 资源清理和内存管理
   * 
   * 当地图组件被卸载时调用，负责清理所有资源，防止内存泄漏。
   * 这是应用生命周期管理的关键方法，确保资源的正确释放。
   * 
   * 清理内容：
   * - 调用父类的销毁逻辑
   * - 3D标签系统清理
   * - 性能监控DOM元素移除
   * - WebGL资源释放
   * - UI组件销毁
   * - 子地图实例清理
   * 
   * 重要性：
   * - 防止内存泄漏
   * - 清理事件监听器
   * - 释放GPU资源
   * - 移除DOM元素
   */
  destroy() {
    // ============ 调用父类销毁逻辑 ============
    // 执行Mini3d框架的基础清理，包括：
    // - 停止渲染循环
    // - 清理事件监听器
    // - 释放基础WebGL资源
    // - 销毁时间系统
    super.destroy()
    
    // ============ 3D标签系统清理 ============
    // 销毁所有CSS3D标签，清理DOM元素和相关事件
    this.label3d && this.label3d.destroy()
    
    // ============ 性能监控DOM清理 ============
    // 移除性能统计面板的DOM元素，避免DOM污染
    this.stats && this.stats.dom && document.body.removeChild(this.stats.dom)
    
    // ============ WebGL资源释放 ============
    // 释放地面镜面反射器的WebGL资源（纹理、帧缓冲等）
    this.groundMirror && this.groundMirror.dispose()
    
    // ============ UI组件销毁 ============
    // 销毁加载提示组件，清理相关DOM和动画
    this.toastLoading && this.toastLoading.destroy()
    
    // ============ 子地图清理 ============
    // 如果存在子地图实例，进行递归销毁
    // 包括子地图的所有几何体、材质、纹理等资源
    this.childMap && this.childMap.destroy()
    
    // 注意：
    // 1. 使用&&操作符确保对象存在再调用方法，避免空指针异常
    // 2. 销毁顺序从复杂组件到基础组件，确保依赖关系正确
    // 3. 某些资源（如纹理、几何体）可能需要手动调用dispose方法
    // 4. 事件监听器的清理由各个组件内部负责
  }
}
