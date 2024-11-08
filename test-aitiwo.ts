import axios from 'axios'

async function testAitiwoAPI() {
  const API_KEY = 'api-97120b90ac5014817e281cc2e254f5d819Tin'  // 你的 API Key
  const BASE_URL = 'https://qiye.aitiwo.com/api/v1'

  console.log('开始测试 AITIWO API...')
  console.log('API Key:', API_KEY)
  console.log('Base URL:', BASE_URL)

  try {
    console.log('\n1. 发送测试请求...')
    const response = await axios.post(
      `${BASE_URL}/chat/completions`,
      {
        messages: [{ role: 'user', content: '你好，这是一条测试消息' }]
      },
      {
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': API_KEY
        }
      }
    )

    console.log('\n2. 请求成功!')
    console.log('状态码:', response.status)
    console.log('响应头:', response.headers)
    console.log('响应数据:', JSON.stringify(response.data, null, 2))

  } catch (error: any) {
    console.error('\n请求失败!')
    console.error('错误码:', error.code)
    console.error('错误信息:', error.message)
    
    if (error.response) {
      console.error('响应状态:', error.response.status)
      console.error('响应数据:', error.response.data)
      console.error('响应头:', error.response.headers)
    }

    if (error.config) {
      console.error('\n请求配置:')
      console.error('URL:', error.config.url)
      console.error('方法:', error.config.method)
      console.error('头部:', error.config.headers)
      console.error('数据:', error.config.data)
    }
  }
}

testAitiwoAPI().catch(console.error) 