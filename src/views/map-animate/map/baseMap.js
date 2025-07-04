/**
 * 基础地图类
 * 用于创建平面地图，不进行挤出处理
 * 
 * 主要功能：
 * - 将GeoJSON数据转换为平面地图几何体
 * - 支持几何体合并优化性能
 * - 提供基础的地图渲染能力
 * - 可自定义材质和样式
 */

import {
  Mesh,                // 网格对象
  Vector2,             // 2D向量
  Color,               // 颜色
  Group,               // 组对象
  Object3D,            // 3D对象
  BufferAttribute,     // 缓冲属性
  Shape,               // 形状
  ExtrudeGeometry,     // 挤出几何体
  MeshBasicMaterial,   // 基础材质
  DoubleSide,          // 双面渲染
  ShapeGeometry,       // 形状几何体
} from "three";
import { transfromMapGeoJSON, getBoundBox } from "@/mini3d";              // 工具函数
import { Vector3 } from "yuka";                                           // 3D向量（yuka库）
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils"; // 几何体合并工具

export class BaseMap {
  /**
   * 构造函数
   * @param {Object} dependencies - 依赖对象
   * @param {Function} dependencies.geoProjection - 地理投影函数
   * @param {Object} config - 配置参数
   */
  constructor({ geoProjection }, config = {}) {
    this.geoProjection = geoProjection;  // 地理投影函数
    this.mapGroup = new Group();         // 地图组对象
    this.coordinates = [];               // 坐标数据
    
    // 合并配置参数
    this.config = Object.assign(
      {
        position: new Vector3(0, 0, 0),     // 地图位置
        center: new Vector2(0, 0),          // 投影中心
        data: "",                           // 地图数据
        renderOrder: 1,                     // 渲染顺序
        merge: false,                       // 是否合并几何体
        material: new MeshBasicMaterial({   // 地图材质
          color: 0x18263b,
          transparent: true,
          opacity: 1,
        }),
      },
      config
    );
    
    // 设置地图组位置
    this.mapGroup.position.copy(this.config.position);
    
    // 转换地图数据并创建地图
    let mapData = transfromMapGeoJSON(this.config.data);
    this.create(mapData);
  }

  create(mapData) {
    // let proviceInfos = []
    let { merge } = this.config;
    let shapes = [];
    mapData.features.forEach((feature) => {
      const group = new Object3D();
      // 获取属性中的名称，中心点，质心
      let { name, center = [], centroid = [] } = feature.properties;
      this.coordinates.push({ name, center, centroid });

      // proviceInfos.push({ name, center, centroid, value: "" })
      feature.geometry.coordinates.forEach((multiPolygon) => {
        multiPolygon.forEach((polygon) => {
          // 绘制shape
          const shape = new Shape();
          for (let i = 0; i < polygon.length; i++) {
            if (!polygon[i][0] || !polygon[i][1]) {
              return false;
            }
            const [x, y] = this.geoProjection(polygon[i]);
            if (i === 0) {
              shape.moveTo(x, -y);
            }
            shape.lineTo(x, -y);
          }

          const geometry = new ShapeGeometry(shape);
          if (merge) {
            shapes.push(geometry);
          } else {
            const mesh = new Mesh(geometry, this.config.material);
            mesh.renderOrder = this.config.renderOrder;
            group.add(mesh);
          }
        });
      });
      if (!merge) {
        this.mapGroup.add(group);
      }
    });
    if (merge) {
      let geometry = mergeGeometries(shapes);
      const mesh = new Mesh(geometry, this.config.material);
      mesh.renderOrder = this.config.renderOrder;
      this.mapGroup.add(mesh);
    }
  }

  getCoordinates() {
    return this.coordinates;
  }
  setParent(parent) {
    parent.add(this.mapGroup);
  }
}
