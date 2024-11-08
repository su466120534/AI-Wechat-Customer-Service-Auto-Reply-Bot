import axios from 'axios'
import { retry } from '../utils/retry'
import { logger } from '../utils/logger'
import { AppError, ErrorCode } from '../../shared/types/errors'

export class AitiwoService {
  private readonly BASE_URL = 'https://qiye.aitiwo.com/api/v1';
  
  constructor(private apiKey: string) {
    if (!apiKey) {
      throw new AppError('API Key 不能为空', ErrorCode.CONFIG_INVALID);
    }
  }

  async chat(message: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.BASE_URL}/chat/completions`,
        {
          messages: [{ role: 'user', content: message }],
          response_format: { type: "text" }
        },
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': this.apiKey
          },
          timeout: 30000
        }
      );

      if (response.data?.choices?.[0]?.message?.content) {
        let content = response.data.choices[0].message.content;
        content = content.replace(/[`*_~]/g, '');
        return content;
      }
      throw new AppError('AI 响应格式错误', ErrorCode.AI_RESPONSE_INVALID);
    } catch (error) {
      logger.error('Aitiwo', '聊天请求失败', error);
      throw new AppError(
        this.getErrorMessage(error),
        ErrorCode.API_REQUEST_FAILED
      );
    }
  }

  private getErrorMessage(error: any): string {
    if (error.response?.status === 401) {
      return 'API Key 无效';
    }
    if (error.code === 'ECONNABORTED') {
      return '请求超时，请检查网络连接';
    }
    if (error.code === 'ETIMEDOUT') {
      return '网络连接超时';
    }
    if (error.response?.status >= 500) {
      return 'AI 服务暂时不可用，请稍后重试';
    }
    return '请求失败，请稍后重试';
  }
} 