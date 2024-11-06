"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startBot = startBot;
const wechaty_1 = require("wechaty");
const qrcode_1 = __importDefault(require("qrcode"));
const scheduler_1 = require("../utils/scheduler");
const logger_1 = require("../utils/logger");
async function startBot(config) {
    const bot = new wechaty_1.Wechaty();
    scheduler_1.scheduleManager.setBot(bot);
    // 生成二维码
    const qrcode = await new Promise((resolve, reject) => {
        bot.on('scan', async (qrcode, status) => {
            if (status === 0) {
                try {
                    const dataUrl = await qrcode_1.default.toDataURL(qrcode);
                    resolve(dataUrl);
                }
                catch (error) {
                    reject(error);
                }
            }
        });
        // 登录成功
        bot.on('login', async (user) => {
            logger_1.logger.info('Bot', `用户 ${user} 登录成功`);
        });
        // 消息处理
        bot.on('message', async (msg) => {
            // 实现消息处理逻辑
            logger_1.logger.debug('Bot', '收到消息', msg);
        });
        bot.start().catch(reject);
    });
    return qrcode;
}
//# sourceMappingURL=index.js.map