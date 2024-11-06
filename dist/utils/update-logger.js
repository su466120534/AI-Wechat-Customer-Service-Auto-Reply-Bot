"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateLogger = void 0;
const logger_1 = require("./logger");
exports.updateLogger = {
    info(message) {
        logger_1.logger.info('Update', message);
    },
    warn(message) {
        logger_1.logger.warn('Update', message);
    },
    error(message) {
        logger_1.logger.error('Update', message);
    },
    debug(message) {
        logger_1.logger.debug('Update', message);
    }
};
//# sourceMappingURL=update-logger.js.map