# map-china-child.js 技术说明文档

## 一、文件定位

`src/views/map-animate/map-china-child.js` 主要用于**省/市级3D地图的可视化与交互**，是主地图下钻、区域高亮、标签弹窗等功能的核心实现。

---

## 二、核心功能

- 省/市级地图的3D挤出与材质渲染
- 区域名称标签、点标记、信息弹窗的自动布局
- 区域Mesh与点的交互（点击下钻、悬停高亮、弹窗）
- 子地图自适应缩放与居中
- 资源与交互事件管理

---

## 三、主要类与API

### 1. `ChildMap` 类

#### 构造方法
```js
new ChildMap(parent, options)
```
- `parent`：主地图实例，需包含 `assets`、`interactionManager`、`label3d`、`createProvinceMaterial` 等接口
- `options`：配置对象，常用字段：
  - `adcode`：行政区划代码
  - `center`：地图中心点经纬度
  - `mapData`：GeoJSON格式的地图数据
  - `parentBoxSize`：父级地图包围盒尺寸
  - `geoProjectionCenter`、`geoProjectionScale`、`geoProjectionTranslate`：地理投影参数

#### 主要方法
- `init()`：初始化子地图（自动调用）
- `createModel()`：创建3D地图模型
- `addLabel()`：添加区域名称、点标记、信息弹窗
- `addEvent()`：为区域Mesh添加交互事件（点击、悬停）
- `addPointEvent()`：为点标记添加弹窗事件
- `setScale(map)`：自适应缩放与居中
- `destroy()`：销毁子地图，解绑所有事件与资源

#### 交互说明
- **点击区域**：触发下钻，加载下一级子地图
- **悬停区域**：区域高亮、标签/点上浮
- **点击点标记**：弹出信息窗
- **悬停点标记**：点高亮

---

## 四、典型用法

```js
import { ChildMap } from './map-china-child'

const childMap = new ChildMap(parentMapInstance, {
  adcode: 440100,
  center: [113.27, 23.13],
  mapData: geojsonData,
  parentBoxSize: [100, 80],
  geoProjectionCenter: [113.27, 23.13],
  geoProjectionScale: 1200,
  geoProjectionTranslate: [500, 400],
})
scene.add(childMap.instance)
```

---

## 五、扩展建议

- **自定义标签内容**：可扩展 `labelNameStyle`、`infoLabel` 方法，支持更多属性展示
- **自定义交互**：可在 `addEvent`、`addPointEvent` 方法中扩展事件类型
- **多级下钻**：结合主地图的 `loadChildMap` 实现多级行政区划下钻
- **样式美化**：可自定义Sprite贴图、标签CSS、弹窗内容

---

## 六、依赖说明
- three.js（Group、Mesh、Sprite、材质等）
- d3-geo（地理投影）
- gsap（动画）
- 依赖主地图的资源管理、交互管理、标签管理等接口

---

## 七、常见问题
- **缩放异常**：请确保 `parentBoxSize` 与 `mapData` 匹配
- **交互无效**：需保证 `interactionManager` 正常工作
- **标签/弹窗不显示**：检查 `label3d` 组件与CSS样式

---

## 八、源码注释
源码已详细注释，便于二次开发与定制。

---

如需更高级的定制或遇到特殊问题，欢迎随时联系开发者或查阅源码注释！ 