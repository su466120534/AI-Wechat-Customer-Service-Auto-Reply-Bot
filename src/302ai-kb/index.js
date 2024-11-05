import axios from 'axios'

function setConfig(prompt) {
  return {
    method: 'post',
    url: 'https://dash-api.302.ai/kb/chat/knowledge_base_chat',
    headers: {
      Accept: 'application/json',
      Authorization: 'Bearer sk-Mze61rH6GxEJ4ckBkOzCP5vWqFEBvCCJP8OuCRojOuGMugdT',
      'User-Agent': 'https://dash-api.302.ai',
      'Content-Type': 'application/json',
    },
    data: {
      model_name: 'gpt-4o-mini-2024-07-18',
      query: prompt,
    },
    responseType: 'stream',
  }
}

// 简化优化函数，只保留基础清理
function optimizeAnswer(text) {
  return text
    .replace(/#{1,6}\s/g, '')
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/\n+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export async function get302AiKbReply(prompt) {
  try {
    const config = setConfig(prompt)
    const response = await axios(config)

    let fullAnswer = ''

    return new Promise((resolve, reject) => {
      response.data.on('data', (chunk) => {
        const lines = chunk.toString().split('\n')
        lines.forEach((line) => {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              if (data.code === 0 && data.data && data.data.answer) {
                fullAnswer += data.data.answer
              }
            } catch (e) {
              // 忽略非JSON数据
            }
          }
        })
      })

      response.data.on('end', () => {
        console.log('🌸🌸🌸 原始回答:', fullAnswer)
        // 优化回答格式
        const optimizedAnswer = optimizeAnswer(fullAnswer)
        console.log('🌸🌸🌸 优化后的回答:', optimizedAnswer)
        resolve(optimizedAnswer || '抱歉，我暂时无法回答这个问题。')
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
