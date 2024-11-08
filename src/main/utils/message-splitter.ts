import { Contact, Room } from 'wechaty'
import { logger } from './logger'

export class MessageSplitter {
  // 单条消息的最大长度
  private static readonly SINGLE_MESSAGE_MAX_SIZE = 500;

  /**
   * 分片发送消息
   * @param message 完整消息
   * @param sender Contact 或 Room 实例
   */
  static async splitAndSend(message: string, sender: Contact | Room): Promise<void> {
    try {
      const messages = this.splitMessage(message);
      
      for (const msg of messages) {
        // 使用类型断言处理 say 方法
        await (sender as any).say(msg);
        // 添加短暂延迟，避免消息发送太快
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      logger.error('MessageSplitter', '分片发送消息失败', error);
      throw error;
    }
  }

  /**
   * 将消息分片
   * @param message 完整消息
   * @returns 消息片段数组
   */
  private static splitMessage(message: string): string[] {
    const messages: string[] = [];
    let remainingMessage = message;

    while (remainingMessage.length > this.SINGLE_MESSAGE_MAX_SIZE) {
      // 查找合适的分割点（句号、问号、感叹号、换行符等）
      let splitIndex = this.findSplitPoint(remainingMessage);
      
      messages.push(remainingMessage.slice(0, splitIndex));
      remainingMessage = remainingMessage.slice(splitIndex);
    }

    if (remainingMessage) {
      messages.push(remainingMessage);
    }

    return messages;
  }

  /**
   * 查找合适的分割点
   * @param message 消息内容
   * @returns 分割点索引
   */
  private static findSplitPoint(message: string): number {
    const maxSize = this.SINGLE_MESSAGE_MAX_SIZE;
    if (message.length <= maxSize) {
      return message.length;
    }

    // 在最大长度范围内查找标点符号
    const punctuationMarks = ['。', '！', '？', '；', '\n', '.', '!', '?', ';'];
    let lastPunctuation = -1;

    for (let i = 0; i < maxSize; i++) {
      if (punctuationMarks.includes(message[i])) {
        lastPunctuation = i + 1; // 包含标点符号
      }
    }

    // 如果找到合适的分割点，就在标点符号后分割
    if (lastPunctuation > 0) {
      return lastPunctuation;
    }

    // 如果没找到标点符号，就在词语边界分割
    for (let i = maxSize; i > 0; i--) {
      if (this.isWordBoundary(message[i - 1], message[i])) {
        return i;
      }
    }

    // 如果都没找到，就直接在最大长度处分割
    return maxSize;
  }

  /**
   * 判断是否是词语边界
   * @param char1 前一个字符
   * @param char2 后一个字符
   */
  private static isWordBoundary(char1: string, char2: string): boolean {
    // 中文和英文之间
    const isChinese = (char: string) => /[\u4e00-\u9fa5]/.test(char);
    const isEnglish = (char: string) => /[a-zA-Z]/.test(char);
    
    if ((isChinese(char1) && isEnglish(char2)) || 
        (isEnglish(char1) && isChinese(char2))) {
      return true;
    }

    // 空格
    if (char1 === ' ' || char2 === ' ') {
      return true;
    }

    return false;
  }
} 