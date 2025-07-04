/**
 * 渐变着色器类
 * 为Three.js材质添加方向性颜色渐变效果
 * 
 * 主要功能：
 * - 支持X、Y、Z三个方向的颜色渐变
 * - 可自定义渐变的起始和结束颜色
 * - 可调节渐变范围和强度
 * - 实时修改渐变参数
 * 
 * 技术实现：
 * - 修改材质的onBeforeCompile钩子
 * - 注入自定义的GLSL片段着色器代码
 * - 添加uniform变量控制渐变参数
 * - 基于世界坐标计算渐变插值
 * 
 * 应用场景：
 * - 建筑物的高度渐变显示
 * - 地形的海拔颜色映射
 * - 数据可视化的值域颜色编码
 * - 装饰性的渐变效果
 */

import { Color } from "three"

export class GradientShader {
  /**
   * 构造函数 - 初始化渐变着色器
   * @param {Material} material - 要应用渐变效果的Three.js材质
   * @param {Object} config - 渐变配置参数
   * @param {number} config.uColor1 - 渐变起始颜色（十六进制）
   * @param {number} config.uColor2 - 渐变结束颜色（十六进制）
   * @param {number} config.size - 渐变范围大小
   * @param {string} config.dir - 渐变方向（"x"、"y"、"z"）
   */
  constructor(material, config) {
    this.shader = null    // 着色器对象引用
    
    // 默认配置参数
    this.config = Object.assign(
      {
        uColor1: 0x2a6f72,    // 起始颜色（深青色）
        uColor2: 0x0d2025,    // 结束颜色（深灰色）
        size: 15.0,           // 渐变范围
        dir: "x",             // 渐变方向
      },
      config
    )
    
    // 初始化着色器
    this.init(material)
  }
  
  /**
   * 初始化着色器
   * 修改材质的着色器代码以实现渐变效果
   * @param {Material} material - 目标材质
   */
  init(material) {
    let { uColor1, uColor2, dir, size } = this.config
    
    // 方向映射：将字符串方向转换为数值
    let dirMap = { x: 1.0, y: 2.0, z: 3.0 }

    // 修改材质的编译前钩子
    material.onBeforeCompile = (shader) => {
      // 保存着色器引用
      this.shader = shader
      
      // 添加自定义uniform变量
      shader.uniforms = {
        ...shader.uniforms,
        uColor1: { value: new Color(uColor1) },    // 起始颜色
        uColor2: { value: new Color(uColor2) },    // 结束颜色
        uDir: { value: dirMap[dir] },              // 渐变方向
        uSize: { value: size },                    // 渐变范围
      }
      
      // 修改顶点着色器：添加变量传递
      shader.vertexShader = shader.vertexShader.replace(
        "void main() {",
        `
                attribute float alpha;
                varying vec3 vPosition;
                varying float vAlpha;
                void main() {
                  vAlpha = alpha;
                  vPosition = position;
              `
      )
      
      // 修改片段着色器：添加变量声明
      shader.fragmentShader = shader.fragmentShader.replace(
        "void main() {",
        `
                varying vec3 vPosition;
                varying float vAlpha;
                uniform vec3 uColor1;
                uniform vec3 uColor2;
                uniform float uDir;
                uniform float uSize;
              
                void main() {
              `
      )
      
      // 修改片段着色器：添加渐变计算逻辑
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <output_fragment>",
        /* glsl */ `
              #ifdef OPAQUE
              diffuseColor.a = 1.0;
              #endif
              
              // https://github.com/mrdoob/three.js/pull/22425
              #ifdef USE_TRANSMISSION
              diffuseColor.a *= transmissionAlpha + 0.1;
              #endif
              
              // 计算渐变颜色
              vec3 gradient = vec3(0.0,0.0,0.0);
              
              // 根据方向计算渐变插值
              if(uDir==1.0){
                // X方向渐变：基于X坐标位置
                gradient = mix(uColor1, uColor2, vPosition.x/ uSize); 
              }else if(uDir==2.0){
                // Z方向渐变：基于Z坐标位置
                gradient = mix(uColor1, uColor2, vPosition.z/ uSize); 
              }else if(uDir==3.0){
                // Y方向渐变：基于Y坐标位置
                gradient = mix(uColor1, uColor2, vPosition.y/ uSize); 
              }
              
              // 应用渐变颜色到最终输出
              outgoingLight = outgoingLight*gradient;
              
              // 设置最终颜色输出
              gl_FragColor = vec4( outgoingLight, diffuseColor.a  );
              `
      )
    }
  }
}
