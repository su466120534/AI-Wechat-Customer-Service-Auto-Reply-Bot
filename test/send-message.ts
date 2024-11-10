import { botInstance } from '../src/main/index';

// 简单的日志函数
function log(level: string, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const dataStr = data ? JSON.stringify(data, null, 2) : '';
    
    const colors = {
        INFO: '\x1b[32m',
        ERROR: '\x1b[31m',
        WARN: '\x1b[33m',
        RESET: '\x1b[0m'
    };

    console.log(`${colors[level as keyof typeof colors]}[${timestamp}] [${level}] ${message}${dataStr ? '\n' + dataStr : ''}${colors.RESET}`);
}

// 简单的延时函数
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function sendTestMessage() {
    try {
        // 等待一下确保主应用的 botInstance 已经初始化
        await delay(1000);

        if (!botInstance) {
            log('ERROR', '机器人实例未初始化，请确保主应用已启动并登录');
            return;
        }

        const targetRoom = "AI测试";
        const message = "这是一条测试消息 - " + new Date().toLocaleString();

        // 获取所有群聊
        log('INFO', '开始获取群聊列表...');
        const rooms = await botInstance.Room.findAll();
        log('INFO', `找到 ${rooms.length} 个群聊`);
        
        // 列出所有群名
        for (const room of rooms) {
            const topic = await room.topic();
            log('INFO', `群名: ${topic}`);
        }

        // 尝试查找特定群聊
        log('INFO', `开始查找目标群聊: ${targetRoom}`);
        const room = await botInstance.Room.find({ topic: targetRoom });
        
        if (!room) {
            log('ERROR', `找不到群聊: ${targetRoom}`);
            return;
        }

        // 发送消息
        log('INFO', '准备发送消息', { message });
        await room.say(message);
        log('INFO', `消息发送成功: ${message}`);

    } catch (error) {
        log('ERROR', '发送消息失败', {
            error: error instanceof Error ? {
                message: error.message,
                stack: error.stack
            } : error
        });
    }
}

// 执行测试
sendTestMessage().catch(error => {
    log('ERROR', '测试执行失败', {
        error: error instanceof Error ? {
            message: error.message,
            stack: error.stack
        } : error
    });
    process.exit(1);
});