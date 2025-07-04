/**
 * 扩散着色器类
 * 用于创建涟漪扩散效果的着色器
 * 
 * 主要功能：
 * - 创建从中心向外扩散的涟漪效果
 * - 支持自定义扩散颜色、速度和宽度
 * - 可以选择扩散方向（XY平面或XZ平面）
 * - 基于时间的动态循环扩散
 */

import { Color } from "three";

export class DiffuseShader {
  /**
   * 构造函数
   * @param {Object} options - 配置参数
   * @param {Material} options.material - 目标材质
   * @param {Time} options.time - 时间管理器
   * @param {number} options.size - 扩散范围大小
   * @param {number} options.diffuseColor - 扩散颜色
   * @param {number} options.diffuseSpeed - 扩散速度
   * @param {number} options.diffuseWidth - 扩散圆环宽度
   * @param {number} options.diffuseDir - 扩散方向（1.0=XY平面, 2.0=XZ平面）
   */
  constructor({
    material,
    time,
    size,
    diffuseColor,
    diffuseSpeed,
    diffuseWidth,
    diffuseDir,
  }) {
    this.time = time;
    
    // 默认配置参数
    let defaultOptions = {
      size: 100,              // 扩散范围大小
      diffuseSpeed: 15.0,     // 扩散速度
      diffuseColor: 0x8e9b9e, // 扩散颜色
      diffuseWidth: 10.0,     // 扩散圆环宽度
      diffuseDir: 1.0,        // 扩散方向：1.0=XY平面, 2.0=XZ平面
    };
    
    // 合并配置参数
    this.options = Object.assign({}, defaultOptions, {
      material,
      size,
      diffuseColor,
      diffuseSpeed,
      diffuseWidth,
      diffuseDir,
    });
    
    // 初始化着色器
    this.init();
  }
  init() {
    let pointShader = null;
    let {
      material,
      size,
      diffuseColor,
      diffuseSpeed,
      diffuseWidth,
      diffuseDir,
    } = this.options;
    // 扩散执行的最大时间
    let maxTime = size / diffuseSpeed;

    material.onBeforeCompile = (shader) => {
      pointShader = shader;
      shader.uniforms = {
        ...shader.uniforms,
        uTime: {
          value: 0.0,
        },
        uSpeed: {
          value: diffuseSpeed,
        },
        uWidth: {
          value: diffuseWidth,
        },
        uColor: {
          value: new Color(diffuseColor),
        },
        uDir: {
          value: diffuseDir, // 1.0-xy,2.0-xz
        },
      };
      shader.vertexShader = shader.vertexShader.replace(
        "void main() {",
        /* glsl */ `
            varying vec3 vPosition;
            void main(){
              vPosition = position;
          `
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "void main() {",
        /* glsl */ `
            uniform float uTime;
            uniform float uSpeed;
            uniform float uWidth;
            uniform vec3 uColor;
            uniform float uDir;
            varying vec3 vPosition;
            
            void main(){
          `
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <opaque_fragment>",
        /* glsl */ `
            #ifdef OPAQUE
            diffuseColor.a = 1.0;
            #endif
            
            #ifdef USE_TRANSMISSION
            diffuseColor.a *= material.transmissionAlpha;
            #endif
            
            float r = uTime * uSpeed;
            //光环宽度
            float w = 0.0; 
            if(w>uWidth){
              w = uWidth;
            }else{
              w = uTime * 5.0;
            }
            //几何中心点
            vec2 center = vec2(0.0, 0.0); 
            // 距离圆心的距离

            float rDistance = distance(vPosition.xz, center);
            if(uDir==2.0){
              rDistance = distance(vPosition.xy, center);
            }
            if(rDistance > r && rDistance < r + 2.0 * w) {
              float per = 0.0;
              if(rDistance < r + w) {
                per = (rDistance - r) / w;
                outgoingLight = mix(outgoingLight, uColor, per);
                // 获取0->透明度的插值
                float alphaV = mix(0.0,diffuseColor.a,per);
                gl_FragColor = vec4(outgoingLight,  alphaV);
              } else {
                per = (rDistance - r - w) / w;
                outgoingLight = mix(uColor, outgoingLight, per);
                // 获取0->透明度的插值
                float alphaV = mix(diffuseColor.a,0.0,per);
                gl_FragColor = vec4(outgoingLight,  alphaV);
              }
            } else {
              gl_FragColor = vec4(outgoingLight, 0.0);
            }
          `
      );
    };

    this.time.on("tick", (deltaTime) => {
      if (pointShader) {
        pointShader.uniforms.uTime.value += deltaTime;
        if (pointShader.uniforms.uTime.value > maxTime) {
          pointShader.uniforms.uTime.value = 0;
        }
      }
    });
  }
}
