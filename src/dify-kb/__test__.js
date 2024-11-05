import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()
const env = dotenv.config().parsed

// 测试 Dify 知识库 API
async function testDifyKbChat() {
  try {
    const config = {
      method: 'post',
      url: 'https://api.dify.ai/v1/chat-messages',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${env.DIFY_KB_API_KEY}`,
        'Content-Type': 'application/json',
      },
      data: {
        inputs: {},
        query: '你好，请介绍一下你自己',
        response_mode: 'streaming',
        user: 'test-user',
      },
      responseType: 'stream',
    }

    console.log('🌸🌸🌸 正在测试 Dify 知识库API...')
    console.log('请求配置:', JSON.stringify(config, null, 2))

    const response = await axios(config)

    let fullAnswer = ''

    // 处理流式响应
    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n\n')
      lines.forEach((line) => {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6))
            console.log('🌸🌸🌸 事件类型:', data.event)

            // 只处理消息事件
            if (data.event === 'message') {
              console.log('🌸🌸🌸 收到回答:', data.answer)
              fullAnswer += data.answer
            }
          } catch (e) {
            // 忽略非JSON数据
          }
        }
      })
    })

    response.data.on('end', () => {
      console.log('🌸🌸🌸 响应结束')
      console.log('🌸🌸🌸 完整回答:', fullAnswer)
    })

    // 添加错误处理
    response.data.on('error', (err) => {
      console.error('❌ 流处理错误:', err)
    })
  } catch (error) {
    console.error('❌ 错误代码:', error.code)
    console.error('❌ 错误信息:', error.message)
    if (error.response) {
      console.error('❌ 响应数据:', error.response.data)
      console.error('❌ 响应状态:', error.response.status)
    }
  }
}

// 运行测试
testDifyKbChat()
