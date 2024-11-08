import { Message, Room, Contact } from 'wechaty'
import { logger } from '../utils/logger'
import { AitiwoService } from '../services/aitiwo'
import { Config } from '../../shared/types/config'
import { MessageSplitter } from '../utils/message-splitter'
import { AppError, ErrorCode } from '../../shared/types/errors'

export class MessageHandler {
  private config: Config;
  private aitiwoService: AitiwoService;

  constructor(config: Config) {
    this.config = config;
    this.aitiwoService = new AitiwoService(config.aitiwoKey);
  }

  async handleMessage(msg: Message): Promise<void> {
    try {
      // 过滤自己发送的消息
      if (msg.self()) {
        return;
      }

      const contact = msg.talker();
      const room = msg.room();
      const text = msg.text();
      const messageType = (msg as any).type();
      const isText = messageType === 7; // 文本消息类型

      // 如果不是文本消息，直接返回
      if (!isText) {
        return;
      }

      // 处理群消息或私聊消息
      if (room) {
        await this.handleRoomMessage(room, contact, text, msg);
      } else {
        await this.handlePrivateMessage(contact, text);
      }
    } catch (error) {
      logger.error('Bot', '处理消息失败', error);
    }
  }

  private async handleRoomMessage(room: Room, sender: Contact, text: string, message: Message): Promise<void> {
    try {
      const topic = await room.topic();
      
      // 检查群聊白名单
      if (!this.config.roomWhitelist.includes(topic)) {
        logger.debug('Bot', `群聊 ${topic} 不在白名单中，忽略消息`);
        return;
      }

      // 检查是否@机器人
      const isMentioned = await (message as any).mentionSelf();
      if (!isMentioned) {
        return;
      }

      // 获取消息内容（去除@部分）
      const question = await this.extractQuestion(message);
      if (!question.trim()) {
        logger.debug('Bot', '消息内容为空');
        return;
      }

      logger.info('Bot', `收到群聊消息: ${question}，来自: ${topic}`);
      
      // 构建回复前缀
      const senderName = await sender.name();
      const replyPrefix = `@${senderName}\n`;
      
      // 获取 AI 回复
      const aiResponse = await this.aitiwoService.chat(question);
      const fullResponse = replyPrefix + aiResponse;

      // 使用分片发送
      await MessageSplitter.splitAndSend(fullResponse, room);

    } catch (error) {
      logger.error('Bot', '处理群消��失败', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('处理群消息失败', ErrorCode.BOT_MESSAGE_FAILED);
    }
  }

  private async handlePrivateMessage(contact: Contact, text: string): Promise<void> {
    try {
      const name = await contact.name();
      
      // 检查联系人白名单
      if (!this.config.contactWhitelist.includes(name)) {
        logger.debug('Bot', `联系人 ${name} 不在白名单中，忽略消息`);
        return;
      }

      logger.info('Bot', `收到私聊消息: ${text}，来自: ${name}`);
      
      const response = await this.aitiwoService.chat(text);
      await MessageSplitter.splitAndSend(response, contact);

    } catch (error) {
      logger.error('Bot', '处理私聊消息失败', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('处理私聊消息失败', ErrorCode.BOT_MESSAGE_FAILED);
    }
  }

  private async extractQuestion(message: Message): Promise<string> {
    try {
      // 尝试使用 mentionText 方法
      const mentionText = await (message as any).mentionText();
      if (mentionText) {
        return mentionText.trim();
      }

      // 如果 mentionText 不可用，手动处理
      let text = message.text().trim();
      
      // 移除所有@提及
      const mentions = await (message as any).mentionList();
      if (Array.isArray(mentions)) {
        for (const mention of mentions) {
          const name = await mention.name();
          text = text.replace(`@${name}`, '').trim();
        }
      }

      return text;
    } catch (error) {
      logger.error('Bot', '提取问题失败', error);
      return message.text().trim();
    }
  }
} 