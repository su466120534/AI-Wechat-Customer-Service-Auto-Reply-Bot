export const BOT_NAME = 'wechat-bot'
export const BOT_PUPPET = 'wechaty-puppet-wechat4u'

export const QR_STATUS = {
  WAITING: 0,    // 等待扫码
  SCANNED: 1,    // 已扫码
  CONFIRMED: 2,  // 已确认
  EXPIRED: 3,    // 已过期
} as const 