import { contextBridge, ipcRenderer } from "electron";

// 暴露给渲染进程的 API
contextBridge.exposeInMainWorld("electronAPI", {
  // 鼠标穿透控制
  setIgnoreMouse: (ignore: boolean, options?: { forward: boolean }) => {
    ipcRenderer.send("set-ignore-mouse", ignore, options);
  },

  // 窗口移动（相对位置）
  moveWindow: (deltaX: number, deltaY: number) => {
    ipcRenderer.send("move-window", deltaX, deltaY);
  },

  // 窗口移动（绝对位置）
  setWindowPosition: (x: number, y: number) => {
    ipcRenderer.send("set-window-position", x, y);
  },

  // 获取窗口位置
  getWindowPosition: (): Promise<[number, number]> => {
    return ipcRenderer.invoke("get-window-position");
  },

  // 获取屏幕尺寸
  getScreenSize: (): Promise<{ width: number; height: number }> => {
    return ipcRenderer.invoke("get-screen-size");
  },

  // ============ 设置相关 ============

  // 获取设置
  getSettings: (): Promise<any> => {
    return ipcRenderer.invoke("get-settings");
  },

  // 保存设置
  saveSettings: (settings: any): Promise<boolean> => {
    return ipcRenderer.invoke("save-settings", settings);
  },

  // 打开设置窗口
  openSettings: () => {
    ipcRenderer.send("open-settings");
  },

  // 关闭设置窗口
  closeSettings: () => {
    ipcRenderer.send("close-settings");
  },

  // 监听设置更新
  onSettingsUpdated: (callback: (settings: any) => void) => {
    ipcRenderer.on("settings-updated", (_event, settings) =>
      callback(settings)
    );
  },

  // 选择文件
  selectFile: (options?: { filters?: any[] }): Promise<string | null> => {
    return ipcRenderer.invoke("select-file", options || {});
  },

  // 打开外部链接
  openExternal: (url: string) => {
    ipcRenderer.send("open-external", url);
  },

  // 打开日志文件夹
  openLogs: () => {
    ipcRenderer.send("open-logs");
  },

  // 打开开发者工具
  openDevTools: () => {
    ipcRenderer.send("open-devtools");
  },

  // 监听系统监控
  onSystemStats: (
    callback: (stats: { cpu: number; memory: number }) => void
  ) => {
    ipcRenderer.on("system-stats", (_event, stats) => callback(stats));
  },
});

// 类型声明（供 TypeScript 使用）
export interface ElectronAPI {
  setIgnoreMouse: (ignore: boolean, options?: { forward: boolean }) => void;
  moveWindow: (deltaX: number, deltaY: number) => void;
  setWindowPosition: (x: number, y: number) => void;
  getWindowPosition: () => Promise<[number, number]>;
  getScreenSize: () => Promise<{ width: number; height: number }>;
  // 设置相关
  getSettings: () => Promise<any>;
  saveSettings: (settings: any) => Promise<boolean>;
  openSettings: () => void;
  closeSettings: () => void;
  onSettingsUpdated: (callback: (settings: any) => void) => void;
  selectFile: (options?: { filters?: any[] }) => Promise<string | null>;
  openExternal: (url: string) => void;
  openLogs: () => void;
  openDevTools: () => void;
  onSystemStats: (
    callback: (stats: { cpu: number; memory: number }) => void
  ) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
