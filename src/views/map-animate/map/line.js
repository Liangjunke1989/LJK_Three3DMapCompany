/**
 * 地图线条类
 * 用于创建地图边界线条和各种类型的线条效果
 * 
 * 主要功能：
 * - 支持多种线条类型（LineLoop、Line2、Line3）
 * - 将GeoJSON数据转换为3D线条
 * - 支持自定义材质和样式
 * - 可创建管道式3D线条效果
 */

import {
  LineBasicMaterial,   // 基础线条材质
  Mesh,                // 网格对象
  Group,               // 组对象
  LineLoop,            // 闭合线条
  Vector3,             // 3D向量
  BufferGeometry,      // 缓冲几何体
  CatmullRomCurve3,    // 3D Catmull-Rom曲线
  TubeGeometry,        // 管道几何体
} from "three";
import { Line2 } from "three/examples/jsm/lines/Line2.js";           // 粗线条
import { LineGeometry } from "three/examples/jsm/lines/LineGeometry.js"; // 线条几何体
import { transfromMapGeoJSON, getBoundBox } from "@/mini3d";        // 工具函数

export class Line {
  /**
   * 构造函数
   * @param {Object} dependencies - 依赖对象
   * @param {Function} dependencies.geoProjection - 地理投影函数
   * @param {Object} config - 配置参数
   */
  constructor({ geoProjection }, config = {}) {
    this.geoProjection = geoProjection;
    
    // 合并配置参数
    this.config = Object.assign(
      {
        visibelProvince: "",                              // 可见省份（排除指定省份）
        center: [0, 0],                                   // 投影中心
        position: new Vector3(0, 0, 0),                   // 线条组位置
        data: "",                                         // 地图数据
        material: new LineBasicMaterial({ color: 0xffffff }), // 线条材质
        type: "LineLoop",                                 // 线条类型：LineLoop | Line2 | Line3
        renderOrder: 1,                                   // 渲染顺序
      },
      config
    );
    
    // 转换地图数据并创建线条组
    let mapData = transfromMapGeoJSON(this.config.data);
    let lineGroup = this.create(mapData);
    this.lineGroup = lineGroup;
    this.lineGroup.position.copy(this.config.position);
  }

  create(data) {
    const { type, visibelProvince } = this.config;
    let features = data.features;
    let lineGroup = new Group();
    for (let i = 0; i < features.length; i++) {
      const element = features[i];
      let group = new Group();
      group.name = "meshLineGroup" + i;
      if (element.properties.name === visibelProvince) {
        continue;
      }
      element.geometry.coordinates.forEach((coords) => {
        const points = [];
        let line = null;

        if (type === "Line2") {
          coords[0].forEach((item) => {
            const [x, y] = this.geoProjection(item);
            points.push(x, -y, 0);
          });
          line = this.createLine2(points);
        } else if (type === "Line3") {
          coords[0].forEach((item) => {
            const [x, y] = this.geoProjection(item);
            points.push(new Vector3(x, -y, 0));
          });
          line = this.createLine3(points);
        } else {
          coords[0].forEach((item) => {
            const [x, y] = this.geoProjection(item);
            points.push(new Vector3(x, -y, 0));
            line = this.createLine(points);
          });
        }
        // 将线条插入到组中
        group.add(line);
      });
      lineGroup.add(group);
    }
    return lineGroup;
  }
  createLine3(points) {
    const tubeRadius = 0.2;
    const tubeSegments = 256 * 10;
    const tubeRadialSegments = 4;
    const closed = false;

    const { material, renderOrder } = this.config;

    const curve = new CatmullRomCurve3(points);
    const tubeGeometry = new TubeGeometry(
      curve,
      tubeSegments,
      tubeRadius,
      tubeRadialSegments,
      closed
    );
    const line = new Mesh(tubeGeometry, material);
    line.name = "mapLine3";
    line.renderOrder = renderOrder;
    return line;
  }
  createLine2(points) {
    const { material, renderOrder } = this.config;
    const geometry = new LineGeometry();
    geometry.setPositions(points);
    let line = new Line2(geometry, material);
    line.name = "mapLine2";
    line.renderOrder = renderOrder;
    line.computeLineDistances();
    return line;
  }
  createLine(points) {
    const { material, renderOrder, type } = this.config;
    const geometry = new BufferGeometry();
    geometry.setFromPoints(points);
    let line = new LineLoop(geometry, material);
    line.renderOrder = renderOrder;
    line.name = "mapLine";
    return line;
  }

  setParent(parent) {
    parent.add(this.lineGroup);
  }
}
