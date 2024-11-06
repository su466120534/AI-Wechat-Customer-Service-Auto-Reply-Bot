"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rendererLogger = void 0;
class RendererLogger {
    info(category, message, details) {
        this.log('info', category, message, details);
    }
    warn(category, message, details) {
        this.log('warn', category, message, details);
    }
    error(category, message, details) {
        this.log('error', category, message, details);
    }
    debug(category, message, details) {
        this.log('debug', category, message, details);
    }
    log(level, category, message, details) {
        // 在渲染进程中，只需要通过 console 输出日志
        console[level](`[${category}] ${message}`, details);
    }
}
exports.rendererLogger = new RendererLogger();
//# sourceMappingURL=renderer-logger.js.map