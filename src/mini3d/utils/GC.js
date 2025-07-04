/**
 * 垃圾回收（Garbage Collection）工具模块
 * 提供Three.js对象的内存管理和资源清理功能
 * 
 * 主要功能：
 * - 材质资源的安全释放
 * - 几何体资源的清理
 * - 纹理资源的销毁
 * - 递归对象树的完整清理
 * - 防止WebGL内存泄漏
 * 
 * 重要性：
 * - WebGL有严格的内存限制
 * - Three.js对象需要手动释放GPU资源
 * - 防止长时间运行导致的内存溢出
 * - 提升应用性能和稳定性
 */

/**
 * 材质资源销毁函数
 * 安全地释放材质及其相关的纹理资源
 * 
 * @param {Material|Material[]} material - 要销毁的材质或材质数组
 */
const materialDispose = (material) => {
  if (material instanceof Array) {
    // 如果是材质数组，递归处理每个材质
    material.forEach(materialDispose)
  } else {
    // 处理单个材质
    
    // 释放材质的贴图纹理（如diffuseMap、normalMap等）
    if (material.map) {
      material.map.dispose()
    }
    
    // 释放材质本身的GPU资源
    material.dispose()
  }
}

/**
 * 递归销毁3D对象及其所有资源
 * 深度清理对象的几何体、材质、纹理等GPU资源
 * 
 * @param {Object3D} obj - 要销毁的Three.js 3D对象
 */
const deallocate = (obj) => {
  // 释放几何体资源
  if (obj.geometry) {
    obj.geometry.dispose()
  }
  
  // 释放材质资源
  if (obj.material) {
    materialDispose(obj.material)
  }
  
  // 释放纹理资源（如果对象直接持有纹理）
  if (obj.texture) {
    obj.texture.dispose()
  }
  
  // 递归处理子对象
  if (obj.children) {
    obj.children.forEach(deallocate)
  }
}

/**
 * 清空对象容器并销毁所有子对象
 * 用于安全地清理场景、组或其他容器对象
 * 
 * @param {Object3D} obj - 要清空的容器对象（如Scene、Group等）
 * 
 * @example
 * // 清空场景中的所有对象
 * emptyObject(scene)
 * 
 * // 清空某个组中的所有子对象
 * emptyObject(meshGroup)
 */
const emptyObject = (obj) => {
  // 检查对象是否有children属性
  if (obj && obj.children) {
    // 循环移除并销毁所有子对象
    // 使用while循环是因为remove操作会改变children数组的长度
    while (obj.children.length) {
      // 获取第一个子对象
      const childObj = obj.children[0]
      
      // 从父对象中移除子对象
      obj.remove(childObj)
      
      // 递归销毁子对象的所有资源
      deallocate(childObj)
    }
  }
}

// 导出清理函数供外部使用
export { emptyObject, deallocate }
