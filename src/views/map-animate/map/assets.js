/**
 * 资源管理类
 * 负责加载和管理3D地图需要的所有资源
 * 包括纹理贴图、JSON数据文件等
 */

import { Resource } from "@/mini3d"
import { FileLoader } from "three"

// 纹理贴图资源导入
import side from "@/assets/texture/side2.png"                          // 地图侧面贴图
import topNormal from "@/assets/texture/top_surface_normal_map2.jpg"    // 地图顶面法线贴图
import rotationBorder1 from "@/assets/texture/rotationBorder1.png"     // 旋转边框1
import rotationBorder2 from "@/assets/texture/rotationBorder3.png"     // 旋转边框2
import guangquan1 from "@/assets/texture/guangquan01.png"              // 光圈1
import guangquan2 from "@/assets/texture/guangquan02.png"              // 光圈2
import quan from "@/assets/texture/quan.png"                           // 光圈
import huiguang from "@/assets/texture/huiguang.png"                   // 辉光
import grid from "@/assets/texture/grid.png"                           // 网格贴图
import gridBlack from "@/assets/texture/gridBlack.png"                 // 黑色网格贴图
import gaoguang1 from "@/assets/texture/gaoguang1.png"                 // 高光1
import flyLine from "@/assets/texture/flyLine2.png"                    // 飞线贴图
import arrow from "@/assets/texture/arrow.png"                         // 箭头贴图
import pathLine from "@/assets/texture/pathLine2.png"                  // 路径线贴图
import pathLine2 from "@/assets/texture/pathLine4.png"                 // 路径线贴图2
import point from "@/assets/texture/point1.png"                        // 点标记贴图

export class Assets {
  /**
   * 构造函数
   * @param {Function} onLoadCallback - 资源加载完成回调函数
   */
  constructor(onLoadCallback = null) {
    this.onLoadCallback = onLoadCallback
    this.init()
  }
  
  /**
   * 初始化资源管理器
   * 配置加载器、设置事件监听、开始加载资源
   */
  init() {
    // 创建资源管理实例
    this.instance = new Resource()
    
    // 添加文件加载器，用于加载JSON等文件
    this.instance.addLoader(FileLoader, "FileLoader")
    
    // 监听资源加载进度
    this.instance.on("onProgress", (path, itemsLoaded, itemsTotal) => {
      let progress = (itemsLoaded / itemsTotal) * 100
      let bfb = progress.toFixed(2) + "%!"
      // console.log(bfb, path, itemsLoaded, itemsTotal)
    })
    
    // 监听资源加载完成事件
    this.instance.on("onLoad", () => {
      // console.log("资源加载完成")
      this.onLoadCallback && this.onLoadCallback()
    })
    
    // 获取基础URL
    let base_url = import.meta.env.BASE_URL
    
    // 定义需要加载的资源列表
    let assets = [
      // 纹理贴图资源
      { type: "Texture", name: "grid", path: grid },                      // 网格贴图
      { type: "Texture", name: "pathLine", path: pathLine2 },             // 路径线贴图
      { type: "Texture", name: "pathLine2", path: pathLine },             // 路径线贴图2
      { type: "Texture", name: "flyLine", path: flyLine },                // 飞线贴图
      { type: "Texture", name: "arrow", path: arrow },                    // 箭头贴图
      { type: "Texture", name: "gridBlack", path: gridBlack },            // 黑色网格贴图
      { type: "Texture", name: "quan", path: quan },                      // 光圈贴图
      { type: "Texture", name: "gaoguang1", path: gaoguang1 },            // 高光贴图
      { type: "Texture", name: "huiguang", path: huiguang },              // 辉光贴图
      { type: "Texture", name: "rotationBorder1", path: rotationBorder1 }, // 旋转边框1
      { type: "Texture", name: "rotationBorder2", path: rotationBorder2 }, // 旋转边框2
      { type: "Texture", name: "guangquan1", path: guangquan1 },          // 光圈1
      { type: "Texture", name: "guangquan2", path: guangquan2 },          // 光圈2
      { type: "Texture", name: "side", path: side },                      // 侧面贴图
      { type: "Texture", name: "topNormal", path: topNormal },            // 顶面法线贴图
      { type: "Texture", name: "point", path: point },                    // 点标记贴图

      // JSON数据文件
      {
        type: "File",
        name: "chinaStorke",
        path: base_url + "assets/json/中华人民共和国-轮廓.json",
      },
      {
        type: "File",
        name: "china",
        path: base_url + "assets/json/中华人民共和国.json",
      },
      {
        type: "File",
        name: "transportPath",
        path: base_url + "assets/json/运输路径.json",
      },
    ]
    
    // 开始加载所有资源
    this.instance.loadAll(assets)
  }
}
