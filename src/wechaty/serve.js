import { getGptReply } from '../openai/index.js'
import { getKimiReply } from '../kimi/index.js'
import { getXunfeiReply } from '../xunfei/index.js'
import { getDeepSeekFreeReply } from '../deepseek-free/index.js'
import { get302AiReply } from '../302ai/index.js'
import { get302AiKbReply } from '../302ai-kb/index.js'
import { getDifyReply } from '../dify/index.js'
import { getOllamaReply } from '../ollama/index.js'
import { getDifyKbReply } from '../dify-kb/index.js'
import { getAitiwoReply } from '../aitiwo/index.js'

/**
 * 获取ai服务
 * @param serviceType 服务类型 'GPT' | 'Kimi'
 * @returns {Promise<void>}
 */
export function getServe(serviceType) {
  switch (serviceType) {
    case 'ChatGPT':
      return getGptReply
    case 'Kimi':
      return getKimiReply
    case 'Xunfei':
      return getXunfeiReply
    case 'deepseek-free':
      return getDeepSeekFreeReply
    case '302AI':
      return get302AiReply
    case '302AI-KB':
      return get302AiKbReply
    case 'dify':
      return getDifyReply
    case 'ollama':
      return getOllamaReply
    case 'dify-kb':
      return getDifyKbReply
    case 'aitiwo':
      return getAitiwoReply
    default:
      return getGptReply
  }
}
