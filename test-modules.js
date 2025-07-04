#!/usr/bin/env node

/**
 * 模块化系统测试脚本
 * 
 * 用于验证新创建的模块化地图系统是否工作正常
 */

console.log('🧪 模块化系统测试开始...\n')

// 测试模块导入
async function testModuleImports() {
  console.log('📦 测试模块导入...')
  
  try {
    // 测试基础模块导入
    console.log('  ✓ 测试 SharedState 模块...')
    const { SharedState } = await import('./src/views/map-animate/map/modules/SharedState.js')
    console.log('  ✓ SharedState 导入成功')
    
    console.log('  ✓ 测试 ModuleEventBus 模块...')
    const { ModuleEventBus } = await import('./src/views/map-animate/map/modules/ModuleEventBus.js')
    console.log('  ✓ ModuleEventBus 导入成功')
    
    console.log('  ✓ 测试 MapCore 模块...')
    const { MapCore } = await import('./src/views/map-animate/map/modules/MapCore.js')
    console.log('  ✓ MapCore 导入成功')
    
    console.log('  ✓ 测试 MapVisualization 模块...')
    const { MapVisualization } = await import('./src/views/map-animate/map/modules/MapVisualization.js')
    console.log('  ✓ MapVisualization 导入成功')
    
    console.log('  ✓ 测试 MapMaterials 模块...')
    const { MapMaterials } = await import('./src/views/map-animate/map/modules/MapMaterials.js')
    console.log('  ✓ MapMaterials 导入成功')
    
    console.log('  ✓ 测试 MapResource 模块...')
    const { MapResource } = await import('./src/views/map-animate/map/modules/MapResource.js')
    console.log('  ✓ MapResource 导入成功')
    
    console.log('  ✓ 测试主模块管理器...')
    const moduleIndex = await import('./src/views/map-animate/map/modules/index.js')
    console.log('  ✓ 主模块管理器导入成功')
    
    console.log('✅ 所有模块导入测试通过!\n')
    return true
    
  } catch (error) {
    console.error('❌ 模块导入测试失败:', error.message)
    return false
  }
}

// 测试基础类实例化
async function testModuleInstantiation() {
  console.log('🏗️  测试模块实例化...')
  
  try {
    const { SharedState } = await import('./src/views/map-animate/map/modules/SharedState.js')
    const { ModuleEventBus } = await import('./src/views/map-animate/map/modules/ModuleEventBus.js')
    
    // 创建基础实例
    const sharedState = new SharedState()
    console.log('  ✓ SharedState 实例创建成功')
    
    const eventBus = new ModuleEventBus()
    console.log('  ✓ ModuleEventBus 实例创建成功')
    
    // 测试事件系统
    let testEventReceived = false
    eventBus.on('test:event', (data) => {
      testEventReceived = true
      console.log('  ✓ 测试事件接收成功:', data.message)
    })
    
    eventBus.emit('test:event', { message: '模块测试消息' })
    
    if (!testEventReceived) {
      throw new Error('事件系统测试失败')
    }
    
    console.log('✅ 模块实例化测试通过!\n')
    return true
    
  } catch (error) {
    console.error('❌ 模块实例化测试失败:', error.message)
    return false
  }
}

// 测试路由配置
async function testRouterConfig() {
  console.log('🛣️  测试路由配置...')
  
  try {
    // 检查路由文件是否正确配置
    const fs = await import('fs')
    const routerContent = fs.default.readFileSync('./src/router/index.js', 'utf-8')
    
    if (routerContent.includes('MapModuleTest') && routerContent.includes('/module-test')) {
      console.log('  ✓ 新模块测试路由配置正确')
    } else {
      throw new Error('路由配置缺失')
    }
    
    console.log('✅ 路由配置测试通过!\n')
    return true
    
  } catch (error) {
    console.error('❌ 路由配置测试失败:', error.message)
    return false
  }
}

// 主测试函数
async function runTests() {
  const results = []
  
  results.push(await testModuleImports())
  results.push(await testModuleInstantiation())
  results.push(await testRouterConfig())
  
  const passedTests = results.filter(result => result).length
  const totalTests = results.length
  
  console.log('📊 测试结果总结:')
  console.log(`  ✅ 通过: ${passedTests}/${totalTests}`)
  console.log(`  ❌ 失败: ${totalTests - passedTests}/${totalTests}`)
  
  if (passedTests === totalTests) {
    console.log('\n🎉 所有测试通过! 模块化系统就绪.')
    console.log('\n📝 下一步:')
    console.log('  1. 运行 npm run dev 启动开发服务器')
    console.log('  2. 访问 http://localhost:5173/#/module-test 查看新的模块化测试页面')
    console.log('  3. 打开浏览器开发者工具查看详细日志')
  } else {
    console.log('\n⚠️  部分测试失败，请检查模块配置')
  }
}

// 运行测试
runTests().catch(error => {
  console.error('💥 测试运行失败:', error)
}) 