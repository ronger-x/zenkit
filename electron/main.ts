import {
  app,
  BrowserWindow,
  ipcMain,
  Tray,
  Menu,
  screen,
  nativeImage,
  shell,
} from "electron";
import { join } from "path";
import * as os from "os";
import {
  readFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
  appendFileSync,
} from "fs";

// 禁用硬件加速可能导致的问题（可选）
// app.disableHardwareAcceleration()

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

// 用户数据路径
const userDataPath = app.getPath("userData");
const settingsPath = join(userDataPath, "settings.json");
const logsDir = join(userDataPath, "logs");

// 图标路径
const iconPath = process.env.VITE_DEV_SERVER_URL
  ? join(__dirname, "../public/icon.ico")
  : join(__dirname, "../dist/icon.ico");

// 获取本地日期字符串 (YYYY-MM-DD)
function getLocalDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const logPath = join(logsDir, `app-${getLocalDateString()}.log`);

// 获取本地时间戳（中国时区格式）
function getLocalTimestamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const ms = String(now.getMilliseconds()).padStart(3, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${ms}`;
}

// 日志函数 - 支持选项控制是否写入文件
function log(level: string, ...args: any[]) {
  const timestamp = getLocalTimestamp();
  const message = args
    .map((arg) =>
      typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
    )
    .join(" ");
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;

  // 输出到控制台
  console.log(logMessage);

  // 写入日志文件
  try {
    if (!existsSync(logsDir)) {
      mkdirSync(logsDir, { recursive: true });
    }
    appendFileSync(logPath, logMessage, "utf-8");
  } catch (e) {
    console.error("Failed to write log:", e);
  }
}

// 仅输出到控制台的日志（不写入文件）
function logConsoleOnly(level: string, ...args: any[]) {
  const timestamp = getLocalTimestamp();
  const message = args
    .map((arg) =>
      typeof arg === "object" ? JSON.stringify(arg, null, 2) : String(arg)
    )
    .join(" ");
  console.log(`[${timestamp}] [${level}] ${message}`);
}

// 获取系统信息用于启动日志
function getSystemInfo(): string {
  const os = require("os");
  return [
    `Platform: ${os.platform()} ${os.release()}`,
    `Arch: ${os.arch()}`,
    `Node: ${process.versions.node}`,
    `Electron: ${process.versions.electron}`,
    `Chrome: ${process.versions.chrome}`,
    `Memory: ${Math.round(os.totalmem() / 1024 / 1024 / 1024)}GB`,
  ].join(", ");
}

log("INFO", "=== ZenKit Starting ===");
log("INFO", "System:", getSystemInfo());
log("INFO", "User data path:", userDataPath);
log("INFO", "Log path:", logPath);

// 默认设置
const defaultSettings = {
  petName: "ZenKit",
  personality:
    "你是一只可爱的猫咪桌宠，性格活泼开朗，喜欢和主人聊天。说话要简短可爱，偶尔带点猫咪的语气词。",
  avatar: "cat", // cat, dog, rabbit, custom
  customAvatarPath: "",
  ai: {
    provider: "openai",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-3.5-turbo",
  },
  tts: {
    enabled: false,
    provider: "edge-tts",
    voice: "zh-CN-XiaoxiaoNeural",
  },
  behavior: {
    autoChat: true,
    autoChatInterval: 60, // 秒
    autoMove: false,
  },
  display: {
    alwaysOnTop: true,
    opacity: 100,
    scale: 100,
  },
  system: {
    autoStart: false,
    minimizeToTray: true,
  },
};

// 加载设置
function loadSettings() {
  log("INFO", "Loading settings from:", settingsPath);
  try {
    if (existsSync(settingsPath)) {
      log("INFO", "Settings file exists, reading...");
      const data = readFileSync(settingsPath, "utf-8");
      log("INFO", "Settings file content length:", data.length);
      const parsed = JSON.parse(data);
      log("INFO", "Settings loaded successfully");
      // 只在控制台输出配置内容，不写入日志文件
      logConsoleOnly("DEBUG", "Loaded settings:", parsed);
      return { ...defaultSettings, ...parsed };
    } else {
      log(
        "WARN",
        "Settings file does not exist, creating default settings file..."
      );
      // 自动创建默认配置文件
      const success = saveSettings(defaultSettings);
      if (success) {
        log("INFO", "Default settings file created successfully");
      } else {
        log("ERROR", "Failed to create default settings file");
      }
    }
  } catch (e) {
    log("ERROR", "Failed to load settings:", e);
    if (e instanceof Error) {
      log("ERROR", "Error stack:", e.stack);
    }
  }
  return defaultSettings;
}

// 保存设置
function saveSettings(settings: any) {
  log("INFO", "Saving settings to:", settingsPath);
  // 只在控制台输出配置内容，不写入日志文件
  logConsoleOnly("DEBUG", "Settings to save:", settings);

  try {
    const dir = userDataPath;

    if (!existsSync(dir)) {
      log("INFO", "Creating user data directory:", dir);
      mkdirSync(dir, { recursive: true });
    }

    // 检查目录权限
    try {
      const testFile = join(dir, "test-write.tmp");
      writeFileSync(testFile, "test", "utf-8");
      if (existsSync(testFile)) {
        // 删除测试文件
        const { unlinkSync } = require("fs");
        unlinkSync(testFile);
      }
    } catch (e) {
      log("ERROR", "Directory is NOT writable!", e);
      return false;
    }

    const jsonData = JSON.stringify(settings, null, 2);
    writeFileSync(settingsPath, jsonData, "utf-8");

    // 验证文件是否写入成功
    if (existsSync(settingsPath)) {
      const savedData = readFileSync(settingsPath, "utf-8");
      // 验证 JSON 格式
      try {
        JSON.parse(savedData);
        log(
          "INFO",
          "Settings saved successfully, size:",
          savedData.length,
          "bytes"
        );
      } catch (e) {
        log("ERROR", "Saved file is not valid JSON!", e);
        return false;
      }
      return true;
    } else {
      log("ERROR", "File does NOT exist after write!");
      return false;
    }
  } catch (e) {
    log("ERROR", "Save settings error:", e);
    if (e instanceof Error) {
      log("ERROR", "Error:", e.message);
    }
    return false;
  }
}

let currentSettings = loadSettings();

// 深度合并对象
function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key in source) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      result[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  return result;
}

// 窗口配置
const WINDOW_CONFIG = {
  width: 280,
  height: 550, // 增大高度以容纳更长的气泡和右键菜单
  // 初始位置：屏幕右下角
  getInitialPosition: () => {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    return {
      x: width - 340,
      y: height - 600, // 留出更多底部空间
    };
  },
};

function createWindow() {
  const { x, y } = WINDOW_CONFIG.getInitialPosition();

  mainWindow = new BrowserWindow({
    width: WINDOW_CONFIG.width,
    height: WINDOW_CONFIG.height,
    x,
    y,
    icon: iconPath,
    // ============ 桌面宠物关键配置 ============
    transparent: true, // 透明背景
    frame: false, // 无边框
    alwaysOnTop: currentSettings.display.alwaysOnTop, // 始终置顶
    skipTaskbar: true, // 不显示在任务栏
    resizable: false, // 禁止调整大小
    hasShadow: false, // 无阴影
    backgroundColor: "#00000000", // 完全透明背景
    // =========================================
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 设置窗口内容背景透明
  mainWindow.setBackgroundColor("#00000000");

  // 应用保存的透明度设置
  if (currentSettings.display?.opacity) {
    const opacity = currentSettings.display.opacity / 100;
    mainWindow.setOpacity(opacity);
  }

  // 开发环境加载 Vite dev server
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    // 开发时可以打开 DevTools
    // mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    // 生产环境加载打包后的文件
    mainWindow.loadFile(join(__dirname, "../dist/index.html"));
  }

  // 窗口关闭时清理
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// 创建设置窗口
function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 800,
    height: 680,
    title: "ZenKit 设置",
    icon: iconPath,
    resizable: false,
    minimizable: false,
    maximizable: false,
    frame: false, // 去除系统标题栏
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // 加载设置页面
  if (process.env.VITE_DEV_SERVER_URL) {
    settingsWindow.loadURL(`${process.env.VITE_DEV_SERVER_URL}#/settings`);
    // 如需调试，取消下面一行的注释
    // settingsWindow.webContents.openDevTools();
  } else {
    settingsWindow.loadFile(join(__dirname, "../dist/index.html"), {
      hash: "/settings",
    });
  }

  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });
}

// 创建系统托盘
function createTray() {
  tray = new Tray(iconPath);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: "🐱 显示宠物",
      click: () => {
        mainWindow?.show();
        mainWindow?.focus();
      },
    },
    {
      label: "📍 重置位置",
      click: () => {
        const { x, y } = WINDOW_CONFIG.getInitialPosition();
        mainWindow?.setPosition(x, y);
      },
    },
    { type: "separator" },
    {
      label: "⚙️ 设置",
      click: () => {
        createSettingsWindow();
      },
    },
    { type: "separator" },
    {
      label: "❌ 退出",
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setToolTip("ZenKit - 你的桌面宠物");
  tray.setContextMenu(contextMenu);

  // 点击托盘图标显示窗口
  tray.on("click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

// ============ IPC 通信处理 ============

// 设置鼠标穿透
ipcMain.on(
  "set-ignore-mouse",
  (_event, ignore: boolean, options?: { forward: boolean }) => {
    if (mainWindow) {
      mainWindow.setIgnoreMouseEvents(ignore, options);
    }
  }
);

// 移动窗口位置
ipcMain.on("move-window", (_event, deltaX: number, deltaY: number) => {
  if (mainWindow) {
    const [x, y] = mainWindow.getPosition();
    mainWindow.setPosition(x + deltaX, y + deltaY);
  }
});

// 获取窗口位置
ipcMain.handle("get-window-position", () => {
  if (mainWindow) {
    return mainWindow.getPosition();
  }
  return [0, 0];
});

// 获取屏幕尺寸
ipcMain.handle("get-screen-size", () => {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  return { width, height };
});

// 设置窗口位置（绝对位置）
ipcMain.on("set-window-position", (_event, x: number, y: number) => {
  if (mainWindow) {
    mainWindow.setPosition(Math.round(x), Math.round(y));
  }
});

// ============ 设置相关 IPC ============

// 获取设置
ipcMain.handle("get-settings", () => {
  log("INFO", "IPC: get-settings called");
  // 只在控制台输出配置内容，不写入日志文件
  logConsoleOnly("DEBUG", "Returning settings:", currentSettings);
  return currentSettings;
});

// 保存设置
ipcMain.handle("save-settings", (_event, settings: any) => {
  log("INFO", "IPC: save-settings called");
  // 只在控制台输出配置内容，不写入日志文件
  logConsoleOnly("DEBUG", "Received settings from renderer:", settings);

  try {
    // 深度合并设置对象
    currentSettings = deepMerge(currentSettings, settings);
    logConsoleOnly("DEBUG", "After merge, currentSettings:", currentSettings);

    const success = saveSettings(currentSettings);

    if (success) {
      log("INFO", "Settings saved successfully via IPC");

      // 应用部分设置
      if (mainWindow && currentSettings.display) {
        mainWindow.setAlwaysOnTop(currentSettings.display.alwaysOnTop);
        // 应用透明度 (30-100 转换为 0.3-1.0)
        const opacity = (currentSettings.display.opacity || 100) / 100;
        mainWindow.setOpacity(opacity);
      }

      // 通知主窗口设置已更新
      mainWindow?.webContents.send("settings-updated", currentSettings);
    } else {
      log("ERROR", "Failed to save settings via IPC");
    }

    return success;
  } catch (e) {
    log("ERROR", "Error in save-settings IPC handler:", e);
    if (e instanceof Error) {
      log("ERROR", "Error:", e.message);
    }
    return false;
  }
});

// 打开设置窗口
ipcMain.on("open-settings", () => {
  createSettingsWindow();
});

// 关闭设置窗口
ipcMain.on("close-settings", () => {
  settingsWindow?.close();
});

// 选择文件（用于自定义头像）
ipcMain.handle("select-file", async (_event, options: { filters?: any[] }) => {
  const { dialog } = await import("electron");
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: options.filters || [
      { name: "Images", extensions: ["png", "jpg", "jpeg", "gif", "webp"] },
    ],
  });
  return result.canceled ? null : result.filePaths[0];
});

// 打开外部链接
ipcMain.on("open-external", (_event, url: string) => {
  shell.openExternal(url);
});

// 打开日志文件夹
ipcMain.on("open-logs", () => {
  log("INFO", "Opening logs directory:", logsDir);
  shell.openPath(logsDir);
});

// ============ 系统监控 ============

let previousCpus = os.cpus();

function getCpuUsage() {
  const currentCpus = os.cpus();
  let idle = 0;
  let total = 0;

  for (let i = 0; i < currentCpus.length; i++) {
    const cpu = currentCpus[i];
    const prevCpu = previousCpus[i];

    // 确保 prevCpu 存在（防止 CPU 核心数变化等极端情况）
    if (prevCpu) {
      for (const type in cpu.times) {
        // @ts-ignore
        total += cpu.times[type] - prevCpu.times[type];
      }
      idle += cpu.times.idle - prevCpu.times.idle;
    }
  }

  previousCpus = currentCpus;
  return total === 0 ? 0 : (1 - idle / total) * 100;
}

// ============ App 生命周期 ============

app.whenReady().then(() => {
  // 移除顶部菜单栏
  Menu.setApplicationMenu(null);

  createWindow();
  createTray();

  // 启动系统监控
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      const cpuUsage = getCpuUsage();
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const memUsage = ((totalMem - freeMem) / totalMem) * 100;

      mainWindow.webContents.send("system-stats", {
        cpu: parseFloat(cpuUsage.toFixed(1)),
        memory: parseFloat(memUsage.toFixed(1)),
      });
    }
  }, 3000);

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// 防止多实例
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
