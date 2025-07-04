LJK_Three3DMap

这是一个基于 Vue 3 + Three.js 的交互式3D中国地图可视化系统，具有丰富的视觉效果和层级钻取功能。

🏗️ 核心架构
1. Mini3d 引擎 (src/mini3d/)
自定义Three.js封装，提供完整的3D场景管理
集成 d3-geo 地理投影功能
事件系统和时间管理
模块化组件系统
2. World 主世界类 (src/views/map-animate/map.js)
1366行的核心场景管理器
光照系统（环境光、方向光、点光源）
复杂的GSAP动画时间线
交互管理（鼠标悬停、点击钻取）
3. 地图系统
BaseMap: 基础2D地图渲染
ExtrudeMap: 3D立体地图拉伸效果
ChildMap: 支持省市级别的层级钻取
✨ 主要功能特性
🗺️ 多层级地图钻取
中国 → 省 → 市 → 区县 四级地图切换
智能的返回上级功能
历史记录管理
🎨 丰富的视觉效果
Apply to README.md
}
🎭 组件系统
FlyLine: 飞线动画组件
Grid: 网格特效
Label3d: 3D标签系统
Particles: 粒子系统
PathLine: 路径动画
ToastLoading: 加载提示
📊 数据系统
完整的中国地图GeoJSON数据
省份统计数据
散点图数据
标牌数据
测试城镇数据（沙坡头区各镇）
🚀 技术亮点
1. 地理投影转换
Apply to README.md
}
2. 复杂动画时间线
Apply to README.md
相机动画、地图出现、柱状图动画等
3. 交互系统
使用 three.interactive 进行鼠标交互
悬停高亮效果
点击钻取功能
智能的事件管理

🎪 项目特色
视觉效果丰富: 柱状图、飞线、粒子、倒影等多种效果
交互体验优秀: 平滑的相机动画和层级切换
性能优化: 合理的渲染层级和材质管理
数据可视化: 支持多种数据展示方式
可扩展性强: 模块化的组件系统

🛠️ 开发技术栈
Vue 3 + Vue Router (前端框架)
Three.js 0.155 (3D渲染)
d3-geo (地理投影)
GSAP (动画库)
three.interactive (交互管理)