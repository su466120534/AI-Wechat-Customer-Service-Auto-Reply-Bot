import axios from 'axios'

// 测试知识库API
async function testKbChat() {
  try {
    const config = {
      method: 'post',
      url: 'https://dash-api.302.ai/kb/chat/knowledge_base_chat',
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer sk-Mze61rH6GxEJ4ckBkOzCP5vWqFEBvCCJP8OuCRojOuGMugdT', // 使用知识库机器人的key
        'User-Agent': 'https://dash-api.302.ai',
        'Content-Type': 'application/json',
      },
      data: {
        model_name: 'gpt-4o-mini-2024-07-18',
        query: '盛迪嘉是否可以先开后台，后补对公信息', // 测试一个具体的业务问题
      },
    }

    console.log('🌸🌸🌸 正在测试知识库API...')
    console.log('请求配置:', JSON.stringify(config, null, 2))
    const response = await axios(config)
    console.log('🌸🌸🌸 API响应:', response.data)
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
testKbChat()
