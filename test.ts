const wechaty = require('wechaty')
const QRCode = require('qrcode')

async function test() {
  console.log('开始测试...')
  console.log('创建机器人实例...')
  
  const bot = wechaty.WechatyBuilder.build({
    name: 'test-bot',
    puppet: 'wechaty-puppet-wechat4u',
    puppetOptions: {
      uos: true
    }
  })
  
  bot
    .on('scan', async (qrcode: string, status: number) => {
      console.log('收到二维码链接:', qrcode)
      console.log('状态:', status)
      
      try {
        // 将链接转换为二维码图片
        const qrcodeImageUrl = await QRCode.toString(qrcode, {
          type: 'terminal',  // 在终端中显示二维码
          small: true       // 使用小一点的尺寸
        })
        console.log('\n', qrcodeImageUrl)
      } catch (error) {
        console.error('生成二维码图片失败:', error)
      }
    })
    .on('login', (user: any) => {
      console.log('登录成功:', user.name())
    })
    .on('message', (msg: any) => {
      console.log('收到消息:', msg.text())
    })
    .on('error', (error: Error) => {
      console.error('错误:', error)
    })

  console.log('启动机器人...')
  await bot.start()
}

test().catch(console.error) 