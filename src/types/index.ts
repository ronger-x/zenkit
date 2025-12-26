// 宠物状态类型
export type PetState =
  | "idle" // 待机
  | "happy" // 开心
  | "talking" // 说话中
  | "thinking" // 思考中
  | "sleeping" // 睡觉
  | "walking"; // 走路

// 宠物情绪类型
export type PetMood = "normal" | "happy" | "sad" | "excited" | "sleepy";

// 对话消息
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

// 宠物配置
export interface PetConfig {
  name: string;
  personality: string; // 性格描述（给 AI 用的 System Prompt）
  voiceEnabled: boolean;
  autoChat: boolean; // 是否自动随机说话
  autoChatInterval: number; // 自动说话间隔（毫秒）
  scale?: number; // 缩放比例 (50-150)
  opacity?: number; // 透明度 (30-100)
  showName?: boolean; // 是否显示宠物名称
}

// AI 服务配置
export interface AIConfig {
  provider: "openai" | "deepseek" | "ollama" | "custom";
  apiKey?: string;
  baseUrl?: string;
  model: string;
}

// TTS 配置
export interface TTSConfig {
  provider: "edge-tts" | "azure" | "elevenlabs" | "local";
  voice: string;
  rate: number;
  pitch: number;
}

// Electron API 类型（从 preload 暴露）
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
  // 系统监控
  onSystemStats: (callback: (stats: SystemStats) => void) => void;
}

export interface SystemStats {
  cpu: number;
  memory: number;
}

// 全局 Window 扩展
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
