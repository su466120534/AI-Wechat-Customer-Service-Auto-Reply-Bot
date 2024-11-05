import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()
const env = dotenv.config().parsed

function setConfig(prompt) {
  return {
    method: 'post',
    url: `${env.DIFY_KB_URL}/chat-messages`,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${env.DIFY_KB_API_KEY}`,
      'Content-Type': 'application/json',
    },
    data: {
      inputs: {},
      query: prompt,
      response_mode: 'streaming',
      user: 'wechat-bot',
    },
    responseType: 'stream',
  }
}

export async function getDifyKbReply(prompt) {
  try {
    const config = setConfig(prompt)
    const response = await axios(config)

    let fullAnswer = ''

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n\n')
        lines.forEach((line) => {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.event === 'message') {
                fullAnswer += data.answer
              }
            } catch (e) {
              // 忽略非JSON数据
            }
          }
        })
      })

      response.data.on('end', () => {
        console.log('🌸🌸🌸 完整回答:', fullAnswer)
        resolve(fullAnswer || '抱歉，我暂时无法回答这个问题。')
      })

      response.data.on('error', (err) => {
        console.error('❌ 流处理错误:', err)
        reject('抱歉，服务出现了一些问题，请稍后再试。')
      })
    })
  } catch (error) {
    console.error('❌ 错误代码:', error.code)
    console.error('❌ 错误信息:', error.message)
    if (error.response) {
      console.error('❌ 响应数据:', error.response.data)
    }
    return '抱歉，服务出现了一些问题，请稍后再试。'
  }
}
