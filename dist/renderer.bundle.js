"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __commonJS = (cb, mod) => function __require() {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  };

  // dist/renderer/components/loading.js
  var require_loading = __commonJS({
    "dist/renderer/components/loading.js"(exports) {
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

  // dist/renderer/components/notification.js
  var require_notification = __commonJS({
    "dist/renderer/components/notification.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.notification = exports.Notification = void 0;
      var Notification = class {
        constructor() {
          this.timeout = null;
          this.container = document.createElement("div");
          this.container.className = "notification-container";
          document.body.appendChild(this.container);
        }
        show(message, type = "success", duration = 3e3) {
          if (this.timeout) {
            clearTimeout(this.timeout);
          }
          const notification = document.createElement("div");
          notification.className = `notification ${type}`;
          notification.textContent = message;
          this.container.appendChild(notification);
          requestAnimationFrame(() => {
            notification.classList.add("show");
          });
          this.timeout = setTimeout(() => {
            notification.classList.remove("show");
            setTimeout(() => {
              this.container.removeChild(notification);
            }, 300);
          }, duration);
        }
      };
      exports.Notification = Notification;
      exports.notification = new Notification();
    }
  });

  // dist/renderer/modules/schedule.js
  var require_schedule = __commonJS({
    "dist/renderer/modules/schedule.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ScheduleManager = void 0;
      var notification_1 = require_notification();
      var loading_1 = require_loading();
      var ScheduleManager = class {
        constructor(container) {
          this.container = container;
          this.loading = new loading_1.LoadingUI();
          this.scheduleRoomInput = document.getElementById("scheduleRoom");
          this.scheduleMessageInput = document.getElementById("scheduleMessage");
          this.scheduleCronInput = document.getElementById("scheduleCron");
          this.addScheduleButton = document.getElementById("addSchedule");
          this.bindEvents();
        }
        bindEvents() {
          this.addScheduleButton.addEventListener("click", () => this.handleAddTask());
        }
        async handleAddTask() {
          try {
            if (!this.scheduleRoomInput.value.trim()) {
              throw new Error("\u8BF7\u8F93\u5165\u7FA4\u540D\u79F0");
            }
            if (!this.scheduleMessageInput.value.trim()) {
              throw new Error("\u8BF7\u8F93\u5165\u6D88\u606F\u5185\u5BB9");
            }
            if (!this.scheduleCronInput.value.trim()) {
              throw new Error("\u8BF7\u8F93\u5165\u5B9A\u65F6\u89C4\u5219");
            }
            this.loading.show("\u6DFB\u52A0\u5B9A\u65F6\u4EFB\u52A1...");
            const task = {
              id: Date.now().toString(),
              roomName: this.scheduleRoomInput.value.trim(),
              message: this.scheduleMessageInput.value.trim(),
              cron: this.scheduleCronInput.value.trim(),
              enabled: true
            };
            const result = await window.electronAPI.addScheduleTask(task);
            if (!result.success) {
              throw new Error(result.error || "\u6DFB\u52A0\u5931\u8D25");
            }
            notification_1.notification.show("\u5B9A\u65F6\u4EFB\u52A1\u6DFB\u52A0\u6210\u529F", "success");
            this.clearInputs();
            await this.loadTasks();
          } catch (error) {
            notification_1.notification.show(error instanceof Error ? error.message : "\u6DFB\u52A0\u5931\u8D25", "error");
          } finally {
            this.loading.hide();
          }
        }
        clearInputs() {
          this.scheduleRoomInput.value = "";
          this.scheduleMessageInput.value = "";
          this.scheduleCronInput.value = "";
        }
        async loadTasks() {
          const tasks = await window.electronAPI.getScheduleTasks();
          this.container.innerHTML = tasks.map((task) => this.renderTask(task)).join("");
        }
        renderTask(task) {
          return `
      <div class="schedule-item ${task.enabled ? "" : "disabled"}" data-id="${task.id}">
        <div class="schedule-item-info">
          <div><strong>\u7FA4\u540D\u79F0:</strong> ${task.roomName}</div>
          <div><strong>\u6D88\u606F:</strong> ${task.message}</div>
          <div><strong>\u5B9A\u65F6:</strong> ${task.cron}</div>
          <div><strong>\u72B6\u6001:</strong> <span class="status-badge ${task.enabled ? "active" : "inactive"}">${task.enabled ? "\u5DF2\u542F\u7528" : "\u5DF2\u7981\u7528"}</span></div>
        </div>
        <div class="schedule-item-actions">
          <button class="btn-${task.enabled ? "warning" : "success"}" onclick="window.scheduleManager.toggleTask('${task.id}', ${!task.enabled})">
            ${task.enabled ? "\u7981\u7528" : "\u542F\u7528"}
          </button>
          <button class="btn-danger" onclick="window.scheduleManager.deleteTask('${task.id}')">\u5220\u9664</button>
        </div>
      </div>
    `;
        }
        async toggleTask(taskId, enabled) {
          try {
            this.loading.show("\u66F4\u65B0\u4EFB\u52A1\u72B6\u6001...");
            const result = await window.electronAPI.toggleScheduleTask(taskId, enabled);
            if (!result.success) {
              throw new Error(result.error || "\u66F4\u65B0\u5931\u8D25");
            }
            notification_1.notification.show(`\u4EFB\u52A1\u5DF2${enabled ? "\u542F\u7528" : "\u7981\u7528"}`, "success");
            await this.loadTasks();
          } catch (error) {
            notification_1.notification.show(error instanceof Error ? error.message : "\u66F4\u65B0\u5931\u8D25", "error");
          } finally {
            this.loading.hide();
          }
        }
        async deleteTask(taskId) {
          if (!confirm("\u786E\u5B9A\u8981\u5220\u9664\u8FD9\u4E2A\u4EFB\u52A1\u5417\uFF1F")) {
            return;
          }
          try {
            this.loading.show("\u5220\u9664\u4EFB\u52A1...");
            const result = await window.electronAPI.deleteScheduleTask(taskId);
            if (!result.success) {
              throw new Error(result.error || "\u5220\u9664\u5931\u8D25");
            }
            notification_1.notification.show("\u4EFB\u52A1\u5DF2\u5220\u9664", "success");
            await this.loadTasks();
          } catch (error) {
            notification_1.notification.show(error instanceof Error ? error.message : "\u5220\u9664\u5931\u8D25", "error");
          } finally {
            this.loading.hide();
          }
        }
      };
      exports.ScheduleManager = ScheduleManager;
    }
  });

  // dist/renderer/modules/bot-status.js
  var require_bot_status = __commonJS({
    "dist/renderer/modules/bot-status.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.BotStatus = void 0;
      var BotStatus = class {
        constructor() {
          this.statusIcon = document.querySelector(".status-icon");
          this.statusMessage = document.querySelector(".status-message");
          this.startButton = document.getElementById("startBot");
          this.connectionStatus = document.querySelector(".connection-status");
        }
        updateStatus(status, message) {
          if (!this.statusIcon || !this.statusMessage || !this.startButton)
            return;
          switch (status) {
            case "running":
              this.statusIcon.className = "status-icon running";
              this.statusMessage.textContent = message || "\u673A\u5668\u4EBA\u8FD0\u884C\u4E2D";
              this.startButton.disabled = true;
              this.startButton.textContent = "\u673A\u5668\u4EBA\u8FD0\u884C\u4E2D";
              break;
            case "stopped":
              this.statusIcon.className = "status-icon";
              this.statusMessage.textContent = message || "\u673A\u5668\u4EBA\u5DF2\u505C\u6B62";
              this.startButton.disabled = false;
              this.startButton.textContent = "\u542F\u52A8\u673A\u5668\u4EBA";
              break;
            case "waiting":
              this.statusIcon.className = "status-icon waiting";
              this.statusMessage.textContent = message || "\u6B63\u5728\u7B49\u5F85...";
              this.startButton.disabled = true;
              this.startButton.textContent = "\u8BF7\u7A0D\u5019...";
              break;
            case "error":
              this.statusIcon.className = "status-icon error";
              this.statusMessage.textContent = message || "\u673A\u5668\u4EBA\u53D1\u751F\u9519\u8BEF";
              this.startButton.disabled = false;
              this.startButton.textContent = "\u91CD\u65B0\u542F\u52A8";
              break;
          }
        }
        updateConnectionStatus(status, message) {
          if (!this.connectionStatus)
            return;
          this.connectionStatus.className = `connection-status ${status}`;
          this.connectionStatus.textContent = message;
          if (status === "reconnected") {
            setTimeout(() => {
              this.connectionStatus.className = "connection-status";
            }, 3e3);
          }
        }
        getErrorMessage(error) {
          if (error.includes("DISCONNECTED")) {
            return "\u7F51\u7EDC\u8FDE\u63A5\u65AD\u5F00\uFF0C\u6B63\u5728\u5C1D\u8BD5\u91CD\u65B0\u8FDE\u63A5";
          }
          if (error.includes("TIMEOUT")) {
            return "\u7F51\u7EDC\u8FDE\u63A5\u8D85\u65F6\uFF0C\u6B63\u5728\u5C1D\u8BD5\u91CD\u65B0\u8FDE\u63A5";
          }
          if (error.includes("ECONNREFUSED")) {
            return "\u65E0\u6CD5\u8FDE\u63A5\u5230\u670D\u52A1\u5668\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u8FDE\u63A5";
          }
          if (error.includes("API Key")) {
            return "API Key \u65E0\u6548\uFF0C\u8BF7\u68C0\u67E5\u914D\u7F6E";
          }
          if (error.includes("\u8BF7\u6C42\u8D85\u65F6")) {
            return "AI \u670D\u52A1\u54CD\u5E94\u8D85\u65F6\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5";
          }
          if (error.includes("\u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528")) {
            return "AI \u670D\u52A1\u6682\u65F6\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5";
          }
          return error || "\u53D1\u751F\u672A\u77E5\u9519\u8BEF\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5";
        }
      };
      exports.BotStatus = BotStatus;
    }
  });

  // dist/renderer/modules/qrcode.js
  var require_qrcode = __commonJS({
    "dist/renderer/modules/qrcode.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.QRCodeManager = void 0;
      var QRCodeManager = class {
        constructor(container) {
          this.container = container;
        }
        show(message) {
          this.container.textContent = message;
          this.container.classList.add("show");
        }
        hide() {
          this.container.classList.remove("show");
          this.container.textContent = "";
        }
      };
      exports.QRCodeManager = QRCodeManager;
    }
  });

  // dist/renderer/modules/config-manager.js
  var require_config_manager = __commonJS({
    "dist/renderer/modules/config-manager.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.ConfigManager = void 0;
      var notification_1 = require_notification();
      var ConfigManager = class {
        constructor() {
          this.saveTimeout = null;
          this.aitiwoKeyInput = document.getElementById("aitiwoKey");
          this.contactWhitelistTextarea = document.getElementById("contactWhitelist");
          this.roomWhitelistTextarea = document.getElementById("roomWhitelist");
          this.importWhitelistButton = document.getElementById("importWhitelist");
          this.exportWhitelistButton = document.getElementById("exportWhitelist");
          this.bindEvents();
          this.loadConfig();
        }
        bindEvents() {
          this.contactWhitelistTextarea.addEventListener("input", () => this.handleWhitelistChange());
          this.roomWhitelistTextarea.addEventListener("input", () => this.handleWhitelistChange());
          this.importWhitelistButton.addEventListener("click", () => this.handleImportWhitelist());
          this.exportWhitelistButton.addEventListener("click", () => this.handleExportWhitelist());
        }
        async loadConfig() {
          try {
            const config = await window.electronAPI.getConfig();
            this.contactWhitelistTextarea.value = config.contactWhitelist.join("\n");
            this.roomWhitelistTextarea.value = config.roomWhitelist.join("\n");
            this.aitiwoKeyInput.value = config.aitiwoKey;
          } catch (error) {
            notification_1.notification.show("\u52A0\u8F7D\u914D\u7F6E\u5931\u8D25", "error");
          }
        }
        handleWhitelistChange() {
          if (this.saveTimeout) {
            clearTimeout(this.saveTimeout);
          }
          this.saveTimeout = setTimeout(async () => {
            try {
              const contacts = this.contactWhitelistTextarea.value.split("\n").map((line) => line.trim()).filter(Boolean);
              const rooms = this.roomWhitelistTextarea.value.split("\n").map((line) => line.trim()).filter(Boolean);
              const result = await window.electronAPI.saveWhitelist({ contacts, rooms });
              if (result.success) {
                notification_1.notification.show("\u767D\u540D\u5355\u5DF2\u81EA\u52A8\u4FDD\u5B58", "success", 2e3);
              } else {
                throw new Error(result.error || "\u4FDD\u5B58\u5931\u8D25");
              }
            } catch (error) {
              notification_1.notification.show(error instanceof Error ? error.message : "\u4FDD\u5B58\u5931\u8D25", "error");
            }
          }, 500);
        }
        async handleImportWhitelist() {
          try {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json";
            input.onchange = async (e) => {
              const file = e.target.files?.[0];
              if (!file)
                return;
              const reader = new FileReader();
              reader.onload = async (e2) => {
                try {
                  const data = JSON.parse(e2.target?.result);
                  if (!Array.isArray(data.contacts) || !Array.isArray(data.rooms)) {
                    throw new Error("\u65E0\u6548\u7684\u767D\u540D\u5355\u6570\u636E\u683C\u5F0F");
                  }
                  this.contactWhitelistTextarea.value = data.contacts.join("\n");
                  this.roomWhitelistTextarea.value = data.rooms.join("\n");
                  const result = await window.electronAPI.importWhitelist(data);
                  if (result.success) {
                    notification_1.notification.show("\u767D\u540D\u5355\u5BFC\u5165\u6210\u529F", "success");
                    await this.loadConfig();
                  } else {
                    throw new Error(result.error || "\u5BFC\u5165\u5931\u8D25");
                  }
                } catch (error) {
                  notification_1.notification.show(error instanceof Error ? error.message : "\u5BFC\u5165\u5931\u8D25", "error");
                }
              };
              reader.readAsText(file);
            };
            input.click();
          } catch (error) {
            notification_1.notification.show(error instanceof Error ? error.message : "\u5BFC\u5165\u5931\u8D25", "error");
          }
        }
        async handleExportWhitelist() {
          try {
            const result = await window.electronAPI.exportWhitelist();
            if (!result.success) {
              throw new Error(result.error || "\u5BFC\u51FA\u5931\u8D25");
            }
            const data = JSON.stringify(result.data, null, 2);
            const blob = new Blob([data], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `whitelist-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            notification_1.notification.show("\u767D\u540D\u5355\u5BFC\u51FA\u6210\u529F", "success");
          } catch (error) {
            notification_1.notification.show(error instanceof Error ? error.message : "\u5BFC\u51FA\u5931\u8D25", "error");
          }
        }
        updateWhitelistStatus() {
          const contacts = this.contactWhitelistTextarea.value.split("\n").filter(Boolean).length;
          const rooms = this.roomWhitelistTextarea.value.split("\n").filter(Boolean).length;
          const statusEl = document.querySelector(".whitelist-status");
          if (statusEl) {
            statusEl.textContent = `\u5F53\u524D\u914D\u7F6E\uFF1A${contacts} \u4E2A\u8054\u7CFB\u4EBA\uFF0C${rooms} \u4E2A\u7FA4\u7EC4`;
          }
        }
      };
      exports.ConfigManager = ConfigManager;
    }
  });

  // dist/renderer/utils/renderer-logger.js
  var require_renderer_logger = __commonJS({
    "dist/renderer/utils/renderer-logger.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.rendererLogger = exports.RendererLogger = void 0;
      var RendererLogger = class {
        constructor(config) {
          this.logs = [];
          this.config = {
            level: "info",
            enableConsole: true,
            maxLogItems: 1e3
          };
          this.subscribers = [];
          if (config) {
            this.config = { ...this.config, ...config };
          }
        }
        shouldLog(level) {
          const levels = ["debug", "info", "warn", "error", "success"];
          return levels.indexOf(level) >= levels.indexOf(this.config.level);
        }
        createLogItem(level, category, message, details) {
          return {
            level,
            category,
            message,
            timestamp: (/* @__PURE__ */ new Date()).toISOString(),
            details
          };
        }
        addLogItem(item) {
          this.logs.push(item);
          if (this.logs.length > (this.config.maxLogItems || 1e3)) {
            this.logs.shift();
          }
          if (this.config.enableConsole) {
            const consoleMethod = this.getConsoleMethod(item.level);
            consoleMethod(`[${item.category}] ${item.message}`, item.details);
          }
          this.subscribers.forEach((subscriber) => subscriber(item));
        }
        debug(category, message, details) {
          if (this.shouldLog("debug")) {
            this.addLogItem(this.createLogItem("debug", category, message, details));
          }
        }
        info(category, message, details) {
          if (this.shouldLog("info")) {
            this.addLogItem(this.createLogItem("info", category, message, details));
          }
        }
        warning(category, message, details) {
          if (this.shouldLog("warning")) {
            this.addLogItem(this.createLogItem("warning", category, message, details));
          }
        }
        warn(category, message, details) {
          this.warning(category, message, details);
        }
        error(category, message, details) {
          if (this.shouldLog("error")) {
            this.addLogItem(this.createLogItem("error", category, message, details));
          }
        }
        success(category, message, details) {
          if (this.shouldLog("success")) {
            this.addLogItem(this.createLogItem("success", category, message, details));
          }
        }
        setLevel(level) {
          this.config.level = level;
        }
        getLevel() {
          return this.config.level;
        }
        getLogs(filter) {
          let filteredLogs = this.logs;
          if (filter) {
            filteredLogs = this.logs.filter((log) => {
              if (filter.level && log.level !== filter.level)
                return false;
              if (filter.category && log.category !== filter.category)
                return false;
              if (filter.startTime && log.timestamp < filter.startTime)
                return false;
              if (filter.endTime && log.timestamp > filter.endTime)
                return false;
              return true;
            });
          }
          return filteredLogs;
        }
        clearLogs() {
          this.logs = [];
        }
        getConsoleMethod(level) {
          const methodMap = {
            debug: "debug",
            info: "info",
            warn: "warn",
            warning: "warn",
            error: "error",
            success: "log"
          };
          const method = console[methodMap[level]].bind(console);
          return method;
        }
        subscribe(callback) {
          this.subscribers.push(callback);
          return () => {
            this.subscribers = this.subscribers.filter((cb) => cb !== callback);
          };
        }
      };
      exports.RendererLogger = RendererLogger;
      exports.rendererLogger = new RendererLogger();
    }
  });

  // dist/renderer/components/log-viewer.js
  var require_log_viewer = __commonJS({
    "dist/renderer/components/log-viewer.js"(exports) {
      "use strict";
      Object.defineProperty(exports, "__esModule", { value: true });
      exports.LogViewer = void 0;
      var renderer_logger_1 = require_renderer_logger();
      var LogViewer = class {
        constructor(containerId) {
          this.container = document.getElementById(containerId);
          if (!this.container) {
            console.error(`Container element with id "${containerId}" not found`);
            throw new Error(`Container element with id "${containerId}" not found`);
          }
          this.initializeUI();
          this.bindEvents();
          renderer_logger_1.rendererLogger.subscribe(this.addLog.bind(this));
        }
        initializeUI() {
          this.container.innerHTML = `
      <div class="log-viewer">
        <div class="log-filters">
          <form class="filter-form">
            <select class="level-select">
              <option value="">\u6240\u6709\u7EA7\u522B</option>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
              <option value="success">Success</option>
            </select>
            <input type="text" class="category-input" placeholder="\u5206\u7C7B\u8FC7\u6EE4">
            <input type="datetime-local" class="start-time">
            <input type="datetime-local" class="end-time">
            <button type="button" class="export-btn">\u5BFC\u51FA\u65E5\u5FD7</button>
            <button type="button" class="clear-btn">\u6E05\u7A7A\u65E5\u5FD7</button>
          </form>
        </div>
        <div class="log-list"></div>
      </div>
    `;
          this.filterForm = this.container.querySelector(".filter-form");
          this.logList = this.container.querySelector(".log-list");
          this.levelSelect = this.container.querySelector(".level-select");
          this.categoryInput = this.container.querySelector(".category-input");
          this.startTimeInput = this.container.querySelector(".start-time");
          this.endTimeInput = this.container.querySelector(".end-time");
          this.addStyles();
        }
        addStyles() {
          const style = document.createElement("style");
          style.textContent = `
      .log-viewer {
        display: flex;
        flex-direction: column;
        height: 100%;
      }
      
      .log-filters {
        padding: 10px;
        background: #f5f5f5;
        border-bottom: 1px solid #ddd;
      }
      
      .filter-form {
        display: flex;
        gap: 10px;
        align-items: center;
      }
      
      .log-list {
        flex: 1;
        overflow-y: auto;
        padding: 10px;
        font-family: monospace;
      }
      
      .log-item {
        padding: 4px 8px;
        margin: 2px 0;
        border-radius: 4px;
        font-size: 13px;
      }
      
      .log-item.debug { color: #666; }
      .log-item.info { color: #0066cc; }
      .log-item.warn { color: #ff9900; background: #fff9e6; }
      .log-item.error { color: #cc0000; background: #ffe6e6; }
      .log-item.success { color: #006600; background: #e6ffe6; }
    `;
          document.head.appendChild(style);
        }
        bindEvents() {
          this.filterForm.addEventListener("change", () => this.updateLogs());
          this.categoryInput.addEventListener("input", () => this.updateLogs());
          this.container.querySelector(".export-btn")?.addEventListener("click", () => this.exportLogs());
          this.container.querySelector(".clear-btn")?.addEventListener("click", () => this.clearLogs());
        }
        updateLogs() {
          const logs = renderer_logger_1.rendererLogger.getLogs({
            level: this.levelSelect.value || void 0,
            category: this.categoryInput.value || void 0,
            startTime: this.startTimeInput.value || void 0,
            endTime: this.endTimeInput.value || void 0
          });
          this.renderLogs(logs);
        }
        renderLogs(logs) {
          this.logList.innerHTML = logs.map((log) => `
      <div class="log-item ${log.level}">
        <span class="timestamp">${new Date(log.timestamp).toLocaleString()}</span>
        [${log.category}] ${log.message}
        ${log.details ? `<pre>${JSON.stringify(log.details, null, 2)}</pre>` : ""}
      </div>
    `).join("");
          this.logList.scrollTop = this.logList.scrollHeight;
        }
        async exportLogs() {
          const logs = renderer_logger_1.rendererLogger.getLogs({
            level: this.levelSelect.value || void 0,
            category: this.categoryInput.value || void 0,
            startTime: this.startTimeInput.value || void 0,
            endTime: this.endTimeInput.value || void 0
          });
          const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `logs-${(/* @__PURE__ */ new Date()).toISOString()}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
        clearLogs() {
          if (confirm("\u786E\u5B9A\u8981\u6E05\u7A7A\u6240\u6709\u65E5\u5FD7\u5417\uFF1F")) {
            renderer_logger_1.rendererLogger.clearLogs();
            this.updateLogs();
          }
        }
        // 公共方法：添加新日志时调用
        addLog(log) {
          const logs = renderer_logger_1.rendererLogger.getLogs();
          this.renderLogs(logs);
        }
      };
      exports.LogViewer = LogViewer;
    }
  });

  // dist/renderer/index.js
  var require_renderer = __commonJS({
    "dist/renderer/index.js"(exports) {
      Object.defineProperty(exports, "__esModule", { value: true });
      var loading_1 = require_loading();
      var schedule_1 = require_schedule();
      var bot_status_1 = require_bot_status();
      var qrcode_1 = require_qrcode();
      var config_manager_1 = require_config_manager();
      var log_viewer_1 = require_log_viewer();
      var renderer_logger_1 = require_renderer_logger();
      var loading = new loading_1.LoadingUI();
      var App = class {
        constructor() {
          this.logger = renderer_logger_1.rendererLogger;
          this.scheduleManager = new schedule_1.ScheduleManager(document.getElementById("scheduleItems"));
          this.botStatus = new bot_status_1.BotStatus();
          this.qrcodeManager = new qrcode_1.QRCodeManager(document.getElementById("qrcode"));
          this.configManager = new config_manager_1.ConfigManager();
          this.logViewer = new log_viewer_1.LogViewer("logViewer");
          window.scheduleManager = this.scheduleManager;
          this.bindEvents();
        }
        bindEvents() {
          const startBotButton = document.getElementById("startBot");
          startBotButton.addEventListener("click", () => this.handleStartBot());
          this.initBotEventListeners();
        }
        async handleStartBot() {
          try {
            this.logger.info("bot", "\u6B63\u5728\u542F\u52A8\u673A\u5668\u4EBA...");
            this.botStatus.updateStatus("waiting", "\u6B63\u5728\u542F\u52A8\u673A\u5668\u4EBA...");
            const result = await window.electronAPI.startBot();
            if (result.success) {
              const message = result.message || "\u673A\u5668\u4EBA\u542F\u52A8\u6210\u529F";
              this.logger.info("bot", message);
              this.botStatus.updateStatus("waiting", message);
            } else {
              throw new Error(result.error || "\u542F\u52A8\u5931\u8D25");
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "\u672A\u77E5\u9519\u8BEF";
            this.logger.error("bot", `\u542F\u52A8\u5931\u8D25: ${errorMessage}`);
            this.botStatus.updateStatus("error", `\u542F\u52A8\u5931\u8D25: ${errorMessage}`);
          }
        }
        initBotEventListeners() {
          window.electronAPI.onQrcodeGenerated((qrcode) => {
            this.qrcodeManager.show(qrcode);
          });
          window.electronAPI.onBotEvent((event, data) => {
            switch (event) {
              case "login":
                this.handleLoginEvent(data);
                break;
              case "logout":
                this.handleLogoutEvent(data);
                break;
              case "message":
                this.handleMessageEvent(data);
                break;
              case "error":
                this.handleErrorEvent(data);
                break;
              case "status":
                this.handleStatusEvent(data);
                break;
            }
          });
        }
        handleLoginEvent(data) {
          this.qrcodeManager.hide();
          this.logger.info("bot", `\u5FAE\u4FE1\u767B\u5F55\u6210\u529F: ${data.userName}`);
          this.botStatus.updateStatus("running", "\u673A\u5668\u4EBA\u5DF2\u767B\u5F55\u5E76\u8FD0\u884C\u4E2D");
        }
        handleLogoutEvent(data) {
          this.logger.warning("bot", `\u7528\u6237\u5DF2\u767B\u51FA: ${data.userName}`);
          this.botStatus.updateStatus("stopped", "\u673A\u5668\u4EBA\u5DF2\u767B\u51FA");
        }
        handleMessageEvent(data) {
          this.logger.info("bot", `\u6536\u5230\u65B0\u6D88\u606F: ${data.text}`);
        }
        handleErrorEvent(data) {
          this.logger.error("bot", data.message || "\u53D1\u751F\u9519\u8BEF");
          this.botStatus.updateStatus("error", data.message);
        }
        handleStatusEvent(data) {
          if (data.message.includes("\u91CD\u65B0\u8FDE\u63A5")) {
            this.botStatus.updateConnectionStatus("connecting", "\u6B63\u5728\u91CD\u65B0\u8FDE\u63A5...");
            this.logger.warning("bot", "\u68C0\u6D4B\u5230\u8FDE\u63A5\u65AD\u5F00\uFF0C\u6B63\u5728\u5C1D\u8BD5\u91CD\u65B0\u8FDE\u63A5");
          } else if (data.message.includes("\u91CD\u8FDE\u6210\u529F")) {
            this.botStatus.updateConnectionStatus("reconnected", "\u8FDE\u63A5\u5DF2\u6062\u590D");
            this.logger.success("bot", "\u8FDE\u63A5\u5DF2\u6062\u590D");
          }
        }
        initTabSwitching() {
          document.querySelector(".tabs")?.addEventListener("click", (e) => {
            const target = e.target;
            const button = target.closest(".tab-btn");
            if (!button)
              return;
            const tabId = button.getAttribute("data-tab");
            if (!tabId)
              return;
            document.querySelectorAll(".tab-btn").forEach((btn) => {
              btn.classList.remove("active");
            });
            button.classList.add("active");
            document.querySelectorAll(".tab-content").forEach((content) => {
              content.classList.remove("active");
            });
            const targetContent = document.getElementById(tabId);
            if (targetContent) {
              targetContent.classList.add("active");
            }
          });
        }
        init() {
          document.addEventListener("DOMContentLoaded", () => {
            this.initTabSwitching();
            this.configManager.loadConfig();
            this.scheduleManager.loadTasks();
          });
        }
      };
      var app = new App();
      app.init();
    }
  });
  require_renderer();
})();
