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
    console.log('🌸🌸🌸 请求配置:', JSON.stringify(config, null, 2))
    
    const response = await axios(config)
    console.log('🌸🌸🌸 API响应:', response.data)
    
    if (response.data?.choices?.[0]?.message?.content) {
      return response.data.choices[0].message.content
    }
    
    return '抱歉，我暂时无法回答这个问题。'
  } catch (error) {
    console.error('❌ 错误代码:', error.code)
    console.error('❌ 错误信息:', error.message)
    if (error.response) {
      console.error('❌ 响应数据:', error.response.data)
    }
    return '抱歉，服务出现了一些问题，请稍后再试。'
  }
} 