import axios from 'axios'
import dotenv from 'dotenv'

dotenv.config()
const env = dotenv.config().parsed

// 测试 Aitiwo API
async function testAitiwoChat() {
  try {
    const config = {
      method: 'post',
      url: 'https://qiye.aitiwo.com/api/v1/chat/completions',
      headers: {
        Accept: 'application/json',
        Authorization: 'api-97120b90ac5014817e281cc2e254f5d819Tin',
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0',
      },
      data: {
        messages: [
          {
            role: 'user',
            content: '你好，请介绍一下你自己',
          },
        ],
      },
    }

    console.log('🌸🌸🌸 正在测试 Aitiwo API...')
    console.log('请求配置:', JSON.stringify(config, null, 2))

    const response = await axios(config)
    console.log('🌸🌸🌸 状态码:', response.status)
    console.log('🌸🌸🌸 响应头:', response.headers)
    console.log('🌸🌸🌸 响应数据:', response.data)
    
    // 添加这部分来显示实际的回答内容
    if (response.data?.choices?.[0]?.message?.content) {
      console.log('🌸🌸🌸 AI回答:', response.data.choices[0].message.content)
    }

  } catch (error) {
    console.error('❌ 错误代码:', error.code)
    console.error('❌ 错误信息:', error.message)
    if (error.response) {
      console.error('❌ 响应状态:', error.response.status)
      console.error('❌ 响应头:', error.response.headers)
      console.error('❌ 响应数据:', error.response.data)
    } else if (error.request) {
      console.error('❌ 请求发送成功但没有收到响应')
      console.error(error.request)
    } else {
      console.error('❌ 请求配置错误:', error.config)
    }
  }
}

// 运行测试
testAitiwoChat() 