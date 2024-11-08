import { BrowserWindow } from 'electron'
import { logger } from '../utils/logger'
import { AppError, ErrorCode } from '../../shared/types/errors'
import { Config } from '../../shared/types/config'
import ConfigManager from '../config'
import { retry } from '../utils/retry'

const { WechatyBuilder } = require('wechaty')

export async function startBot(config: Config, mainWindow: BrowserWindow): Promise<string> {
  try {
    logger.info('Bot', '开始创建机器人实例...');
    
    // 检查是否已登录
    const botStatus = ConfigManager.getBotStatus();
    if (botStatus.isLoggedIn) {
      logger.info('Bot', '检测到已登录状态');
      mainWindow.webContents.send('bot-event', 'login', {
        userName: botStatus.userName
      });
      return '';
    }
    
    const bot = WechatyBuilder.build({
      name: 'wechat-bot',
      puppet: 'wechaty-puppet-wechat4u',
      puppetOptions: {
        uos: true
      }
    });

    // 添加断线重连处理
    bot.on('error', async (error: Error) => {
      logger.error('Bot', '机器人发生错误', error);
      mainWindow.webContents.send('bot-event', 'error', {
        message: error.message
      });

      // 如果是网络错误，尝试重连
      if (error.message.includes('DISCONNECTED') || error.message.includes('TIMEOUT')) {
        try {
          logger.info('Bot', '尝试重新连接...');
          mainWindow.webContents.send('bot-event', 'status', {
            message: '正在重新连接...'
          });
          
          await retry(
            () => bot.start(),
            {
              maxAttempts: 3,
              delay: 5000,
              shouldRetry: (err) => {
                return err.message.includes('DISCONNECTED') || 
                       err.message.includes('TIMEOUT');
              }
            }
          );

          logger.info('Bot', '重连成功');
          mainWindow.webContents.send('bot-event', 'status', {
            message: '重连成功'
          });
        } catch (reconnectError) {
          logger.error('Bot', '重连失败', reconnectError);
          mainWindow.webContents.send('bot-event', 'error', {
            message: '重连失败，请手动重启机器人'
          });
        }
      }
    });

    return new Promise<string>((resolve, reject) => {
      bot.on('scan', async (qrcode: string, status: number) => {
        logger.info('Bot', `收到二维码，状态: ${status}`);
        resolve(qrcode);
      });

      bot.on('login', async (user: any) => {
        logger.info('Bot', `用户登录成功: ${user.name()}`);
        // 保存登录状态
        ConfigManager.updateBotStatus({
          isLoggedIn: true,
          userName: user.name()
        });
        mainWindow.webContents.send('bot-event', 'login', {
          userName: user.name()
        });
      });

      bot.on('logout', async (user: any) => {
        logger.info('Bot', `用户登出: ${user.name()}`);
        // 清除登录状态
        ConfigManager.handleLogout();
        mainWindow.webContents.send('bot-event', 'logout', {
          userName: user.name()
        });
      });

      bot.start()
        .then(() => {
          logger.info('Bot', '机器人启动成功');
          // 通知主窗口
          mainWindow.webContents.send('bot-event', 'status', { 
            message: '机器人启动成功' 
          });
        })
        .catch((error: Error) => {
          logger.error('Bot', '启动机器人失败', error);
          throw new AppError('启动机器人失败', ErrorCode.BOT_INIT_FAILED);
        });
    });
  } catch (error) {
    logger.error('Bot', '创建机器人实例失败', error);
    throw new AppError('创建机器人失败', ErrorCode.BOT_INIT_FAILED);
  }
} 