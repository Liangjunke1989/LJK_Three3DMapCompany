/**
 * Shader 着色器模块入口文件
 * 导出所有自定义着色器，提供丰富的视觉特效
 * 
 * 着色器列表：
 * - DiffuseShader: 扩散着色器，实现涟漪扩散效果
 * - GradientShader: 渐变着色器，实现颜色渐变效果
 * 
 * 着色器特点：
 * - 基于WebGL/GLSL实现，高性能GPU计算
 * - 支持实时动画和参数调节
 * - 模块化设计，易于扩展和组合
 * - 适用于各种材质类型的增强
 * 
 * 技术原理：
 * - 通过修改Three.js材质的onBeforeCompile钩子
 * - 注入自定义的GLSL着色器代码
 * - 添加uniform变量控制特效参数
 * - 支持顶点和片段着色器的定制
 */

export * from "./DiffuseShader"    // 扩散着色器
export * from "./GradientShader"   // 渐变着色器
