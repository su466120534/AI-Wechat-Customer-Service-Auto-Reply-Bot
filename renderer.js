"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // dist/components/loading.js
  var require_loading = __commonJS({
    "dist/components/loading.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.LoadingUI = void 0;
      var LoadingUI = class {
        constructor() {
          this.element = document.createElement("div");
          this.element.className = "loading-overlay";
          this.element.innerHTML = `
      <div class="loading-spinner"></div>
      <div class="loading-text"></div>
    `;
          document.body.appendChild(this.element);
        }
        show(text = "\u52A0\u8F7D\u4E2D...") {
          const textElement = this.element.querySelector(".loading-text");
          if (textElement) {
            textElement.textContent = text;
          }
          this.element.style.display = "flex";
        }
        hide() {
          this.element.style.display = "none";
        }
      };
      exports.LoadingUI = LoadingUI;
    }
  });

  // dist/components/notification.js
  var require_notification = __commonJS({
    "dist/components/notification.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.notification = exports.NotificationUI = void 0;
      var NotificationUI = class {
        constructor() {
          this.container = document.createElement("div");
          this.container.className = "notification-container";
          document.body.appendChild(this.container);
        }
        show(message, type = "info", duration = 3e3) {
          const notification = document.createElement("div");
          notification.className = `notification notification-${type}`;
          const icon = this.getIcon(type);
          const content = document.createElement("span");
          content.textContent = message;
          notification.appendChild(icon);
          notification.appendChild(content);
          this.container.appendChild(notification);
          setTimeout(() => notification.classList.add("show"), 10);
          setTimeout(() => {
            notification.classList.remove("show");
            setTimeout(() => {
              this.container.removeChild(notification);
            }, 300);
          }, duration);
        }
        getIcon(type) {
          const icon = document.createElement("span");
          icon.className = "notification-icon";
          switch (type) {
            case "success":
              icon.innerHTML = "\u2713";
              break;
            case "error":
              icon.innerHTML = "\u2715";
              break;
            case "warning":
              icon.innerHTML = "!";
              break;
            default:
              icon.innerHTML = "i";
          }
          return icon;
        }
      };
      exports.NotificationUI = NotificationUI;
      exports.notification = new NotificationUI();
    }
  });

  // dist/utils/renderer-logger.js
  var require_renderer_logger = __commonJS({
    "dist/utils/renderer-logger.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.rendererLogger = void 0;
      var RendererLogger = class {
        info(category, message, details) {
          this.log("info", category, message, details);
        }
        warn(category, message, details) {
          this.log("warn", category, message, details);
        }
        error(category, message, details) {
          this.log("error", category, message, details);
        }
        debug(category, message, details) {
          this.log("debug", category, message, details);
        }
        log(level, category, message, details) {
          console[level](`[${category}] ${message}`, details);
        }
      };
      exports.rendererLogger = new RendererLogger();
    }
  });

  // dist/utils/renderer-error-handler.js
  var require_renderer_error_handler = __commonJS({
    "dist/utils/renderer-error-handler.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.handleError = handleError;
      var renderer_logger_1 = require_renderer_logger();
      var notification_1 = require_notification();
      var error_handler_1 = require_error_handler();
      function handleError(error, context = "") {
        if (error instanceof error_handler_1.AppError) {
          if (error.shouldNotify) {
            notification_1.notification.show(error.message, "error");
          }
          renderer_logger_1.rendererLogger.error(context, `${error.code || "ERROR"}: ${error.message}`);
        } else if (error instanceof Error) {
          notification_1.notification.show("\u64CD\u4F5C\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5", "error");
          renderer_logger_1.rendererLogger.error(context, "Unexpected Error", error);
        } else {
          notification_1.notification.show("\u53D1\u751F\u672A\u77E5\u9519\u8BEF", "error");
          renderer_logger_1.rendererLogger.error(context, "Unknown Error", { error });
        }
      }
    }
  });

  // dist/utils/logger.js
  var require_logger = __commonJS({
    "dist/utils/logger.js"(exports) {
      "use strict";
      var __createBinding = exports && exports.__createBinding || (Object.create ? function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
          desc = { enumerable: true, get: function() {
            return m[k];
          } };
        }
        Object.defineProperty(o, k2, desc);
      } : function(o, m, k, k2) {
        if (k2 === void 0) k2 = k;
        o[k2] = m[k];
      });
      var __setModuleDefault = exports && exports.__setModuleDefault || (Object.create ? function(o, v) {
        Object.defineProperty(o, "default", { enumerable: true, value: v });
      } : function(o, v) {
        o["default"] = v;
      });
      var __importStar = exports && exports.__importStar || function(mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) {
          for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
        }
        __setModuleDefault(result, mod);
        return result;
      };
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.logger = void 0;
      var log4js = __importStar(__require("log4js"));
      var path = __importStar(__require("path"));
      var electron_1 = __require("electron");
      var LOG_DIR = path.join(electron_1.app.getPath("userData"), "logs");
      var Logger = class {
        constructor() {
          this.mainWindow = null;
          log4js.configure({
            appenders: {
              file: {
                type: "dateFile",
                filename: path.join(LOG_DIR, "app.log"),
                pattern: "yyyy-MM-dd",
                compress: true,
                keepFileExt: true,
                alwaysIncludePattern: true,
                layout: {
                  type: "pattern",
                  pattern: "[%d] [%p] %c - %m"
                }
              },
              console: {
                type: "console",
                layout: {
                  type: "pattern",
                  pattern: "%[[%d] [%p] %c%] - %m"
                }
              }
            },
            categories: {
              default: {
                appenders: ["file", "console"],
                level: "info",
                enableCallStack: true
              }
            }
          });
          this.logger = log4js.getLogger();
        }
        setMainWindow(window2) {
          this.mainWindow = window2;
        }
        createLogItem(level, category, message, details) {
          return {
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            level,
            category,
            message,
            details
          };
        }
        sendToRenderer(logItem) {
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send("new-log", logItem);
          }
        }
        info(category, message, details) {
          const logItem = this.createLogItem("info", category, message, details);
          this.logger.info(`[${category}] ${message}`);
          this.sendToRenderer(logItem);
        }
        warn(category, message, details) {
          const logItem = this.createLogItem("warn", category, message, details);
          this.logger.warn(`[${category}] ${message}`);
          this.sendToRenderer(logItem);
        }
        error(category, message, details) {
          const logItem = this.createLogItem("error", category, message, details);
          this.logger.error(`[${category}] ${message}`);
          if (details) {
            this.logger.error(details);
          }
          this.sendToRenderer(logItem);
        }
        debug(category, message, details) {
          const logItem = this.createLogItem("debug", category, message, details);
          this.logger.debug(`[${category}] ${message}`);
          this.sendToRenderer(logItem);
        }
        async getLogs(limit = 100) {
          return [];
        }
      };
      exports.logger = new Logger();
    }
  });

  // dist/utils/main-error-handler.js
  var require_main_error_handler = __commonJS({
    "dist/utils/main-error-handler.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ErrorCodes = exports.AppError = void 0;
      exports.handleError = handleError;
      var logger_1 = require_logger();
      var AppError = class extends Error {
        constructor(message, code, shouldNotify = true) {
          super(message);
          this.code = code;
          this.shouldNotify = shouldNotify;
          this.name = "AppError";
        }
      };
      exports.AppError = AppError;
      function handleError(error, context = "") {
        if (error instanceof AppError) {
          logger_1.logger.error(context, `${error.code || "ERROR"}: ${error.message}`);
        } else if (error instanceof Error) {
          logger_1.logger.error(context, "Unexpected Error", error);
        } else {
          logger_1.logger.error(context, "Unknown Error", { error });
        }
      }
      exports.ErrorCodes = {
        NETWORK_ERROR: "NETWORK_ERROR",
        INVALID_INPUT: "INVALID_INPUT",
        BOT_ERROR: "BOT_ERROR",
        CONFIG_ERROR: "CONFIG_ERROR",
        SCHEDULE_ERROR: "SCHEDULE_ERROR"
      };
    }
  });

  // dist/utils/error-handler.js
  var require_error_handler = __commonJS({
    "dist/utils/error-handler.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.handleError = exports.ErrorCodes = exports.AppError = void 0;
      var AppError = class extends Error {
        constructor(message, code, shouldNotify = true) {
          super(message);
          this.code = code;
          this.shouldNotify = shouldNotify;
          this.name = "AppError";
        }
      };
      exports.AppError = AppError;
      exports.ErrorCodes = {
        NETWORK_ERROR: "NETWORK_ERROR",
        INVALID_INPUT: "INVALID_INPUT",
        BOT_ERROR: "BOT_ERROR",
        CONFIG_ERROR: "CONFIG_ERROR",
        SCHEDULE_ERROR: "SCHEDULE_ERROR"
      };
      var isRenderer = () => {
        try {
          return typeof window !== "undefined" && window.process === void 0;
        } catch {
          return false;
        }
      };
      exports.handleError = isRenderer() ? require_renderer_error_handler().handleError : require_main_error_handler().handleError;
    }
  });

  // dist/renderer.js
  var require_renderer = __commonJS({
    "dist/renderer.js"(exports) {
      Object.defineProperty(exports, "__esModule", { value: true });
      var loading_1 = require_loading();
      var notification_1 = require_notification();
      var error_handler_1 = require_error_handler();
      var loading = new loading_1.LoadingUI();
      var aitiwoKeyInput = document.getElementById("aitiwoKey");
      var startBotButton = document.getElementById("startBot");
      var contactWhitelistTextarea = document.getElementById("contactWhitelist");
      var roomWhitelistTextarea = document.getElementById("roomWhitelist");
      var saveWhitelistButton = document.getElementById("saveWhitelist");
      var qrcodeDiv = document.getElementById("qrcode");
      var scheduleRoomInput = document.getElementById("scheduleRoom");
      var scheduleMessageInput = document.getElementById("scheduleMessage");
      var scheduleCronInput = document.getElementById("scheduleCron");
      var addScheduleButton = document.getElementById("addSchedule");
      var scheduleItemsContainer = document.getElementById("scheduleItems");
      var logsContainer = document.getElementById("logsContainer");
      var logLevelSelect = document.getElementById("logLevel");
      var clearLogsButton = document.getElementById("clearLogs");
      var exportLogsButton = document.getElementById("exportLogs");
      function initTabSwitching() {
        console.log("\u521D\u59CB\u5316\u6807\u7B7E\u9875\u5207\u6362...");
        document.querySelector(".tabs")?.addEventListener("click", (e) => {
          const target = e.target;
          const button = target.closest(".tab-btn");
          if (!button) {
            console.log("\u70B9\u51FB\u7684\u4E0D\u662F\u6807\u7B7E\u6309\u94AE");
            return;
          }
          console.log("\u70B9\u51FB\u4E86\u6807\u7B7E\u6309\u94AE:", button);
          const tabId = button.getAttribute("data-tab");
          console.log("\u76EE\u6807\u6807\u7B7E\u9875:", tabId);
          if (!tabId) {
            console.error("\u6807\u7B7E\u9875ID\u672A\u5B9A\u4E49");
            return;
          }
          document.querySelectorAll(".tab-btn").forEach((btn) => {
            btn.classList.remove("active");
            console.log("\u79FB\u9664\u6309\u94AE\u6FC0\u6D3B\u72B6\u6001:", btn.textContent);
          });
          button.classList.add("active");
          console.log("\u6DFB\u52A0\u6309\u94AE\u6FC0\u6D3B\u72B6\u6001:", button.textContent);
          document.querySelectorAll(".tab-content").forEach((content) => {
            content.classList.remove("active");
            console.log("\u79FB\u9664\u5185\u5BB9\u6FC0\u6D3B\u72B6\u6001:", content.id);
          });
          const targetContent = document.getElementById(tabId);
          if (targetContent) {
            targetContent.classList.add("active");
            console.log("\u6DFB\u52A0\u5185\u5BB9\u6FC0\u6D3B\u72B6\u6001:", tabId);
          } else {
            console.error("\u627E\u4E0D\u5230\u5BF9\u5E94\u7684\u5185\u5BB9\u533A\u57DF:", tabId);
          }
        });
      }
      document.addEventListener("DOMContentLoaded", () => {
        console.log("DOM \u52A0\u8F7D\u5B8C\u6210");
        initTabSwitching();
        console.log("\u6807\u7B7E\u9875\u5207\u6362\u521D\u59CB\u5316\u5B8C\u6210");
      });
      async function loadConfig() {
        console.log("\u5F00\u59CB\u52A0\u8F7D\u914D\u7F6E...");
        try {
          const config = await window.electronAPI.getConfig();
          console.log("\u914D\u7F6E\u52A0\u8F7D\u6210\u529F:", config);
          aitiwoKeyInput.value = config.aitiwoKey;
          contactWhitelistTextarea.value = config.contactWhitelist.join("\n");
          roomWhitelistTextarea.value = config.roomWhitelist.join("\n");
        } catch (error) {
          console.error("\u914D\u7F6E\u52A0\u8F7D\u5931\u8D25:", error);
          (0, error_handler_1.handleError)(error, "loadConfig");
        }
      }
      var saveTimeout;
      aitiwoKeyInput.addEventListener("input", () => {
        const value = aitiwoKeyInput.value.trim();
        if (value) {
          aitiwoKeyInput.classList.remove("invalid");
          aitiwoKeyInput.classList.add("valid");
        } else {
          aitiwoKeyInput.classList.remove("valid");
          aitiwoKeyInput.classList.add("invalid");
        }
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        saveTimeout = setTimeout(async () => {
          try {
            if (!value) {
              throw new error_handler_1.AppError("API Key \u4E0D\u80FD\u4E3A\u7A7A", error_handler_1.ErrorCodes.INVALID_INPUT);
            }
            loading.show("\u6B63\u5728\u9A8C\u8BC1 API Key...");
            const result = await window.electronAPI.saveAitiwoKey(value);
            if (!result.success) {
              throw new error_handler_1.AppError(result.error || "\u4FDD\u5B58\u5931\u8D25", error_handler_1.ErrorCodes.CONFIG_ERROR);
            }
            notification_1.notification.show("API Key \u8BBE\u7F6E\u6210\u529F", "success");
          } catch (error) {
            (0, error_handler_1.handleError)(error, "saveApiKey");
            aitiwoKeyInput.classList.add("invalid");
          } finally {
            loading.hide();
          }
        }, 1e3);
      });
      aitiwoKeyInput.addEventListener("blur", async () => {
        if (saveTimeout) {
          clearTimeout(saveTimeout);
        }
        const value = aitiwoKeyInput.value.trim();
        try {
          if (!value) {
            throw new error_handler_1.AppError("API Key \u4E0D\u80FD\u4E3A\u7A7A", error_handler_1.ErrorCodes.INVALID_INPUT);
          }
          loading.show("\u6B63\u5728\u9A8C\u8BC1 API Key...");
          const result = await window.electronAPI.saveAitiwoKey(value);
          if (!result.success) {
            throw new error_handler_1.AppError(result.error || "\u4FDD\u5B58\u5931\u8D25", error_handler_1.ErrorCodes.CONFIG_ERROR);
          }
          notification_1.notification.show("API Key \u8BBE\u7F6E\u6210\u529F", "success");
        } catch (error) {
          (0, error_handler_1.handleError)(error, "saveApiKey");
          aitiwoKeyInput.classList.add("invalid");
        } finally {
          loading.hide();
        }
      });
      saveWhitelistButton.addEventListener("click", async () => {
        try {
          const contacts = contactWhitelistTextarea.value.split("\n").filter((line) => line.trim());
          const rooms = roomWhitelistTextarea.value.split("\n").filter((line) => line.trim());
          const result = await window.electronAPI.saveWhitelist(contacts, rooms);
          if (!result.success) {
            throw new error_handler_1.AppError(result.error || "\u4FDD\u5B58\u5931\u8D25", error_handler_1.ErrorCodes.CONFIG_ERROR);
          }
          notification_1.notification.show("\u767D\u540D\u5355\u4FDD\u5B58\u6210\u529F", "success");
        } catch (error) {
          (0, error_handler_1.handleError)(error, "saveWhitelist");
        }
      });
      startBotButton.addEventListener("click", async () => {
        try {
          if (!aitiwoKeyInput.value.trim()) {
            throw new error_handler_1.AppError("\u8BF7\u5148\u8BBE\u7F6E API Key", error_handler_1.ErrorCodes.INVALID_INPUT);
          }
          loading.show("\u6B63\u5728\u542F\u52A8\u673A\u5668\u4EBA...");
          startBotButton.disabled = true;
          const result = await window.electronAPI.startBot();
          if (!result.success) {
            throw new error_handler_1.AppError(result.error || "\u542F\u52A8\u5931\u8D25", error_handler_1.ErrorCodes.BOT_ERROR);
          }
          notification_1.notification.show("\u673A\u5668\u4EBA\u542F\u52A8\u6210\u529F\uFF0C\u8BF7\u626B\u63CF\u4E8C\u7EF4\u7801\u767B\u5F55", "info");
        } catch (error) {
          (0, error_handler_1.handleError)(error, "startBot");
          startBotButton.disabled = false;
          startBotButton.textContent = "\u542F\u52A8\u673A\u5668\u4EBA";
        } finally {
          loading.hide();
        }
      });
      window.electronAPI.onQrcodeGenerated((qrcode) => {
        qrcodeDiv.innerHTML = `<img src="${qrcode}" alt="\u767B\u5F55\u4E8C\u7EF4\u7801">`;
        startBotButton.textContent = "\u8BF7\u626B\u7801\u767B\u5F55";
      });
      addScheduleButton.addEventListener("click", async () => {
        try {
          if (!scheduleRoomInput.value.trim()) {
            throw new error_handler_1.AppError("\u8BF7\u8F93\u5165\u7FA4\u540D\u79F0", error_handler_1.ErrorCodes.INVALID_INPUT);
          }
          if (!scheduleMessageInput.value.trim()) {
            throw new error_handler_1.AppError("\u8BF7\u8F93\u5165\u6D88\u606F\u5185\u5BB9", error_handler_1.ErrorCodes.INVALID_INPUT);
          }
          if (!scheduleCronInput.value.trim()) {
            throw new error_handler_1.AppError("\u8BF7\u8F93\u5165\u5B9A\u65F6\u89C4\u5219", error_handler_1.ErrorCodes.INVALID_INPUT);
          }
          loading.show("\u6DFB\u52A0\u5B9A\u65F6\u4EFB\u52A1...");
          const task = {
            id: Date.now().toString(),
            roomName: scheduleRoomInput.value.trim(),
            message: scheduleMessageInput.value.trim(),
            cron: scheduleCronInput.value.trim(),
            enabled: true
          };
          const result = await window.electronAPI.addScheduleTask(task);
          if (!result.success) {
            throw new error_handler_1.AppError(result.error || "\u6DFB\u52A0\u5931\u8D25", error_handler_1.ErrorCodes.SCHEDULE_ERROR);
          }
          notification_1.notification.show("\u5B9A\u65F6\u4EFB\u52A1\u6DFB\u52A0\u6210\u529F", "success");
          scheduleRoomInput.value = "";
          scheduleMessageInput.value = "";
          scheduleCronInput.value = "";
          await loadScheduleTasks();
        } catch (error) {
          (0, error_handler_1.handleError)(error, "addScheduleTask");
        } finally {
          loading.hide();
        }
      });
      async function loadScheduleTasks() {
        const tasks = await window.electronAPI.getScheduleTasks();
        scheduleItemsContainer.innerHTML = tasks.map((task) => `
    <div class="schedule-item ${task.enabled ? "" : "disabled"}" data-id="${task.id}">
      <div class="schedule-item-info">
        <div><strong>\u7FA4\u540D\u79F0:</strong> ${task.roomName}</div>
        <div><strong>\u6D88\u606F:</strong> ${task.message}</div>
        <div><strong>\u5B9A\u65F6:</strong> ${task.cron}</div>
        <div><strong>\u72B6\u6001:</strong> <span class="status-badge ${task.enabled ? "active" : "inactive"}">${task.enabled ? "\u5DF2\u542F\u7528" : "\u5DF2\u7981\u7528"}</span></div>
      </div>
      <div class="schedule-item-actions">
        <button class="btn-${task.enabled ? "warning" : "success"}" onclick="toggleTask('${task.id}', ${!task.enabled})">
          ${task.enabled ? "\u7981\u7528" : "\u542F\u7528"}
        </button>
        <button class="btn-danger" onclick="deleteTask('${task.id}')">\u5220\u9664</button>
      </div>
    </div>
  `).join("");
      }
      window.toggleTask = async function(taskId, enabled) {
        try {
          loading.show("\u66F4\u65B0\u4EFB\u52A1\u72B6\u6001...");
          const result = await window.electronAPI.toggleScheduleTask(taskId, enabled);
          if (!result.success) {
            throw new error_handler_1.AppError(result.error || "\u66F4\u65B0\u5931\u8D25", error_handler_1.ErrorCodes.SCHEDULE_ERROR);
          }
          notification_1.notification.show(`\u4EFB\u52A1\u5DF2${enabled ? "\u542F\u7528" : "\u7981\u7528"}`, "success");
          await loadScheduleTasks();
        } catch (error) {
          (0, error_handler_1.handleError)(error, "toggleTask");
        } finally {
          loading.hide();
        }
      };
      window.deleteTask = async function(taskId) {
        if (!confirm("\u786E\u5B9A\u8981\u5220\u9664\u8FD9\u4E2A\u4EFB\u52A1\u5417\uFF1F")) {
          return;
        }
        try {
          loading.show("\u5220\u9664\u4EFB\u52A1...");
          const result = await window.electronAPI.deleteScheduleTask(taskId);
          if (!result.success) {
            throw new error_handler_1.AppError(result.error || "\u5220\u9664\u5931\u8D25", error_handler_1.ErrorCodes.SCHEDULE_ERROR);
          }
          notification_1.notification.show("\u4EFB\u52A1\u5DF2\u5220\u9664", "success");
          await loadScheduleTasks();
        } catch (error) {
          (0, error_handler_1.handleError)(error, "deleteTask");
        } finally {
          loading.hide();
        }
      };
      var currentLogs = [];
      var filterLevel = "all";
      function renderLog(log) {
        const timestamp = new Date(log.timestamp).toLocaleString();
        return `
    <div class="log-item level-${log.level}" data-level="${log.level}">
      <div class="log-header">
        <span class="timestamp">${timestamp}</span>
        <span class="category">[${log.category}]</span>
        <span class="message">${log.message}</span>
      </div>
      ${log.details ? `
        <div class="log-details">
          ${typeof log.details === "string" ? log.details : JSON.stringify(log.details, null, 2)}
        </div>
      ` : ""}
    </div>
  `;
      }
      function filterLogs() {
        const filteredLogs = filterLevel === "all" ? currentLogs : currentLogs.filter((log) => log.level === filterLevel);
        logsContainer.innerHTML = filteredLogs.map(renderLog).join("");
      }
      logLevelSelect.addEventListener("change", () => {
        filterLevel = logLevelSelect.value;
        filterLogs();
      });
      clearLogsButton.addEventListener("click", () => {
        if (confirm("\u786E\u5B9A\u8981\u6E05\u9664\u6240\u6709\u65E5\u5FD7\u5417\uFF1F")) {
          currentLogs = [];
          filterLogs();
        }
      });
      exportLogsButton.addEventListener("click", async () => {
        try {
          const content = currentLogs.map((log) => {
            const timestamp = new Date(log.timestamp).toLocaleString();
            return `[${timestamp}] [${log.level.toUpperCase()}] ${log.category} - ${log.message}${log.details ? "\nDetails: " + JSON.stringify(log.details, null, 2) : ""}`;
          }).join("\n");
          const blob = new Blob([content], { type: "text/plain" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `wechat-bot-logs-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.txt`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (error) {
          (0, error_handler_1.handleError)(error, "exportLogs");
        }
      });
      logsContainer.addEventListener("click", (event) => {
        const logItem = event.target.closest(".log-item");
        if (logItem && logItem.querySelector(".log-details")) {
          logItem.classList.toggle("expanded");
        }
      });
      window.electronAPI.onNewLog((log) => {
        currentLogs.unshift(log);
        if (currentLogs.length > 1e3) {
          currentLogs.pop();
        }
        filterLogs();
      });
      loadConfig();
      loadScheduleTasks();
      console.log("\u6B63\u5728\u521D\u59CB\u5316 DOM \u5143\u7D20...");
      if (!aitiwoKeyInput)
        console.error("\u627E\u4E0D\u5230 aitiwoKey \u8F93\u5165\u6846");
      if (!startBotButton)
        console.error("\u627E\u4E0D\u5230\u542F\u52A8\u6309\u94AE");
      if (!contactWhitelistTextarea)
        console.error("\u627E\u4E0D\u5230\u8054\u7CFB\u4EBA\u767D\u540D\u5355\u8F93\u5165\u6846");
      if (!roomWhitelistTextarea)
        console.error("\u627E\u4E0D\u5230\u7FA4\u804A\u767D\u540D\u5355\u8F93\u5165\u6846");
      if (!saveWhitelistButton)
        console.error("\u627E\u4E0D\u5230\u4FDD\u5B58\u767D\u540D\u5355\u6309\u94AE");
      if (!qrcodeDiv)
        console.error("\u627E\u4E0D\u5230\u4E8C\u7EF4\u7801\u5BB9\u5668");
      if (!scheduleItemsContainer)
        console.error("\u627E\u4E0D\u5230\u5B9A\u65F6\u4EFB\u52A1\u5217\u8868\u5BB9\u5668");
      if (!logsContainer)
        console.error("\u627E\u4E0D\u5230\u65E5\u5FD7\u5BB9\u5668");
    }
  });
  require_renderer();
})();
