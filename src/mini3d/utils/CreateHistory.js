/**
 * 历史记录管理类
 * 实现撤销/重做功能，管理应用状态的时间轴
 * 
 * 主要功能：
 * - 状态快照管理：保存、恢复应用状态
 * - 撤销操作：回退到之前的状态
 * - 重做操作：前进到后续的状态
 * - 时间轴导航：跳转到任意历史状态
 * - 状态索引管理：跟踪当前状态位置
 * 
 * 设计模式：备忘录模式（Memento Pattern）
 * 应用场景：编辑器、配置界面、交互式应用等
 */

export class createHistory {
  /**
   * 构造函数 - 初始化历史记录管理器
   */
  constructor() {
    this.past = [];         // 过去的状态数组（已执行的状态）
    this.future = [];       // 未来的状态数组（可重做的状态）
    this.present = undefined; // 当前状态
  }
  
  /**
   * 跳转到指定索引的状态
   * 重新组织过去、当前、未来的状态分布
   * 
   * @param {number} index - 目标状态在完整历史中的索引位置
   */
  gotoState(index) {
    // 构建完整的状态历史数组
    const allState = [...this.past, this.present, ...this.future];
    
    // 设置新的当前状态
    this.present = allState[index];
    
    // 重新分配过去和未来的状态
    this.past = allState.slice(0, index);              // 目标索引之前的所有状态
    this.future = allState.slice(index + 1, allState.length); // 目标索引之后的所有状态
  }
  
  /**
   * 获取当前状态在历史中的索引位置
   * @returns {number} 当前状态的索引（等于past数组的长度）
   */
  getIndex() {
    return this.past.length;
  }
  
  /**
   * 保存新的状态到历史记录
   * 当执行新操作时调用，会清空future数组（因为产生了新的分支）
   * 
   * @param {any} currentState - 要保存的当前状态
   */
  push(currentState) {
    // 如果存在当前状态，将其移动到过去的状态中
    if (this.present) {
      this.past.push(this.present);
    }
    
    // 设置新的当前状态
    this.present = currentState;
    
    // 注意：执行新操作时会隐式清空future，因为产生了新的历史分支
    // 在实际使用中，可能需要在这里添加 this.future = [];
  }
  
  /**
   * 撤销操作 - 回退到上一个状态
   * 如果存在可撤销的历史状态，则回退一步
   */
  undo() {
    // 检查是否有可撤销的历史状态
    if (this.past.length !== 0) {
      // 回退到上一个状态（当前索引减1）
      this.gotoState(this.getIndex() - 1);
    }
  }
  
  /**
   * 重做操作 - 前进到下一个状态
   * 如果存在可重做的未来状态，则前进一步
   */
  redo() {
    // 检查是否有可重做的未来状态
    if (this.future.length !== 0) {
      // 前进到下一个状态（当前索引加1）
      this.gotoState(this.getIndex() + 1);
    }
  }
}
