# 🧪 模块化地图系统浏览器测试指南

## 📋 测试准备

✅ **开发服务器已启动** - Vite服务器运行在 `http://localhost:5173`  
✅ **新路由已配置** - 模块测试页面路径：`/module-test`  
✅ **所有模块文件已创建完成**

## 🚀 开始测试

### 1. 访问测试页面

在浏览器中打开以下URL：
```
http://localhost:5173/#/module-test
```

### 2. 预期看到的界面

- **黑色画布背景** - 3D渲染区域
- **左侧控制面板** - 包含以下按钮：
  - 显示柱状图
  - 显示散点图  
  - 显示飞线
  - 镜面反射
  - 播放动画
  - 返回主地图（子地图模式下显示）

- **右侧信息面板** - 悬停省份时显示省份信息
- **左下角性能面板** - 显示FPS、内存使用等性能指标

### 3. 功能测试清单

#### ✅ 基础渲染测试
- [ ] 页面正常加载，无控制台错误
- [ ] 黑色3D画布显示正常
- [ ] 看到"初始化中..."加载提示

#### ✅ 地图创建测试  
- [ ] 2秒后加载提示消失
- [ ] 显示中国地图3D模型
- [ ] 地图具有立体感（挤出效果）
- [ ] 省份边界线可见

#### ✅ 交互功能测试
- [ ] 鼠标悬停省份时高亮显示
- [ ] 右侧信息面板显示省份信息
- [ ] 鼠标离开后高亮消失
- [ ] 点击省份触发相关事件

#### ✅ 数据可视化测试
- [ ] 点击"显示柱状图" - 各省份显示3D数据柱
- [ ] 点击"显示散点图" - 城市位置显示散点
- [ ] 点击"显示飞线" - 显示从各省指向北京的飞线动画

#### ✅ 视觉特效测试
- [ ] 点击"镜面反射" - 地面显示反射效果
- [ ] 点击"播放动画" - 播放入场动画序列
- [ ] 柱状图具有辉光效果
- [ ] 省份位置有光圈装饰

#### ✅ 性能监控测试
- [ ] 左下角显示FPS信息
- [ ] 显示内存使用情况
- [ ] FPS保持在30以上

## 🔧 调试工具使用

### 浏览器控制台调试

打开浏览器开发者工具，在控制台中输入：

```javascript
// 获取模块管理器实例
window.mapDebug.manager

// 查看所有模块
window.mapDebug.getModules()

// 查看性能指标
window.mapDebug.getMetrics()

// 获取状态快照
window.mapDebug.getSnapshot()

// 查看事件统计
window.mapDebug.getEventStats()

// 快速功能测试
window.mapDebug.quickTest()
```

### 手动功能测试

```javascript
// 获取特定模块
const vizModule = window.mapDebug.manager.getModule('visualization')
const materialsModule = window.mapDebug.manager.getModule('materials')

// 手动创建可视化组件
vizModule.createBar()        // 创建柱状图
vizModule.createScatter()    // 创建散点图
vizModule.createFlyLine()    // 创建飞线

// 手动创建特效
materialsModule.createFloor()   // 地面装饰
materialsModule.createMirror()  // 镜面反射
```

## 📊 预期测试结果

### 成功标准

1. **无控制台错误** - 没有JavaScript错误或警告
2. **流畅交互** - 鼠标交互响应灵敏
3. **稳定性能** - FPS保持在30以上
4. **功能完整** - 所有按钮功能正常工作
5. **视觉效果** - 特效和动画正常显示

### 预期日志输出

控制台应该显示以下关键日志：

```
[MapModuleManager] 增强版模块管理器初始化完成
[MapModuleManager] 模块 resource 初始化完成
[MapModuleManager] 模块 core 初始化完成
[MapMaterials] 地面装饰效果已创建
[MapMaterials] 镜面反射效果已创建
地图初始化完成
```

## 🐛 常见问题排除

### 问题1: 页面空白或加载失败
**解决方案**: 
- 检查控制台错误信息
- 确认所有模块文件路径正确
- 重新启动开发服务器

### 问题2: 3D内容不显示
**解决方案**:
- 确认WebGL支持正常
- 检查canvas元素是否创建
- 查看Mini3d相关错误

### 问题3: 交互功能无响应
**解决方案**:
- 检查事件系统是否正常初始化
- 确认交互模块加载成功
- 查看鼠标事件绑定情况

### 问题4: 性能过低
**解决方案**:
- 降低粒子数量
- 禁用镜面反射
- 减少可视化组件数量

## 🎯 高级测试

### 压力测试
```javascript
// 测试大量数据可视化
for(let i = 0; i < 10; i++) {
  vizModule.createBar()
  vizModule.createScatter()
}
```

### 内存泄漏测试
```javascript
// 重复创建和销毁组件
setInterval(() => {
  vizModule.createBar()
  setTimeout(() => {
    // 清理组件
    vizModule.barGroup.visible = false
  }, 1000)
}, 2000)
```

### 错误恢复测试
```javascript
// 模拟模块错误
window.mapDebug.manager.getModule('core').createModel = function() {
  throw new Error('模拟错误')
}
```

## ✅ 测试报告模板

测试完成后，请填写以下报告：

```
模块化地图系统测试报告
======================

测试时间: [填写时间]
测试环境: [浏览器版本]
测试结果: [通过/失败]

基础功能测试:
- 页面加载: ✅/❌
- 地图渲染: ✅/❌  
- 交互功能: ✅/❌
- 数据可视化: ✅/❌
- 视觉特效: ✅/❌

性能指标:
- 平均FPS: [数值]
- 内存使用: [数值]MB
- 初始化时间: [数值]ms

发现问题:
1. [问题描述]
2. [问题描述]

建议改进:
1. [改进建议]
2. [改进建议]
```

---

🎉 **准备好了！现在可以开始测试新的模块化地图系统了！** 