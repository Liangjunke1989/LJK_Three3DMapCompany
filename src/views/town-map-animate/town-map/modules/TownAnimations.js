import gsap from "gsap"
export class TownAnimations {
  constructor(state, eventBus) {
    this.state = state
    this.eventBus = eventBus
  }
  playEntranceAnimation() {
    // 获取入场动画
    const entranceAnimation = this.state.entranceAnimation
    if (!entranceAnimation) {
      console.error('入场动画不存在')
      return
    }
    // 获取入场动画的动画对象
    // 播放入场动画
    entranceAnimation.play()
    // 监听入场动画结束
    entranceAnimation.on('end', () => {
      console.log('入场动画结束')
    })
  }
  playExitAnimation() {
    // 获取出场动画
    const exitAnimation = this.state.exitAnimation
    // 播放出场动画
    exitAnimation.play()
    // 监听出场动画结束
    exitAnimation.on('end', () => {
      console.log('出场动画结束')
    })
  }
  playHoverAnimation() {
    // 获取悬停动画
    const hoverAnimation = this.state.hoverAnimation
    // 播放悬停动画
    hoverAnimation.play()
    // 监听悬停动画结束
    hoverAnimation.on('end', () => {
      console.log('悬停动画结束')
    })
  }
}
