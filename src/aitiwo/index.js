import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()
const env = dotenv.config().parsed

function setConfig(prompt) {
  return {
    method: 'post',
    url: `${env.AITIWO_URL}/api/v1/chat/completions`,
    headers: {
      Accept: 'application/json',
      Authorization: env.AITIWO_API_KEY,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0',
    },
    data: {
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    },
  }
}

export async function getAitiwoReply(prompt) {
  try {
    const config = setConfig(prompt)
    const safeConfig = {
      ...config,
      headers: {
        ...config.headers,
        Authorization: '******'
      }
    }
    console.log('🌸🌸🌸 请求配置:', JSON.stringify(safeConfig, null, 2))
    
    const response = await axios({
      ...config,
      timeout: 30000
    })
    
    console.log('🌸🌸🌸 API响应:', response.data)
    
    if (response.data?.choices?.[0]?.message?.content) {
      return response.data.choices[0].message.content
    }
    
    return '抱歉，我暂时无法回答这个问题。'
  } catch (error) {
    console.error('❌ API请求失败:', {
      code: error.code,
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText
    })
    
    if (error.code === 'ECONNABORTED') {
      return '抱歉，服务响应超时，请稍后重试。'
    }
    if (error.response?.status === 504) {
      return '抱歉，服务暂时不可用，请稍后再试。'
    }
    return '抱歉，服务出现了一些问题，请稍后再试。'
  }
} 