"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorCodes = exports.AppError = void 0;
exports.handleError = handleError;
const renderer_logger_1 = require("./renderer-logger");
const notification_1 = require("../components/notification");
class AppError extends Error {
    constructor(message, code, shouldNotify = true) {
        super(message);
        this.code = code;
        this.shouldNotify = shouldNotify;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function handleError(error, context = '') {
    if (error instanceof AppError) {
        if (error.shouldNotify) {
            notification_1.notification.show(error.message, 'error');
        }
        renderer_logger_1.rendererLogger.error(context, `${error.code || 'ERROR'}: ${error.message}`);
    }
    else if (error instanceof Error) {
        notification_1.notification.show('操作失败，请稍后重试', 'error');
        renderer_logger_1.rendererLogger.error(context, 'Unexpected Error', error);
    }
    else {
        notification_1.notification.show('发生未知错误', 'error');
        renderer_logger_1.rendererLogger.error(context, 'Unknown Error', { error });
    }
}
exports.ErrorCodes = {
    NETWORK_ERROR: 'NETWORK_ERROR',
    INVALID_INPUT: 'INVALID_INPUT',
    BOT_ERROR: 'BOT_ERROR',
    CONFIG_ERROR: 'CONFIG_ERROR',
    SCHEDULE_ERROR: 'SCHEDULE_ERROR'
};
//# sourceMappingURL=error-handler.js.map