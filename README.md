# ZenKit 🐱

一个可爱的桌面宠物应用，基于 Electron + Vue3 + TypeScript 开发。

## ✨ 功能特性

- 🖼️ **透明悬浮窗口** - 宠物漂浮在桌面上，不遮挡工作
- 🖱️ **自由拖拽** - 可以把宠物拖到屏幕任意位置
- 👆 **点击穿透** - 点击透明区域不会拦截，点击宠物才会响应
- 💬 **对话气泡** - 宠物会说话，有随机对话和互动响应
- 🤖 **AI 对话** - 支持接入 OpenAI/DeepSeek/Ollama 进行智能对话
- 📌 **系统托盘** - 最小化到托盘，右键菜单快速操作

## 🚀 快速开始

### 环境要求

- Node.js 18+
- npm / pnpm / yarn

### 安装依赖

```bash
cd zenkit
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建打包

```bash
npm run electron:build
```

打包后的安装程序在 `release/` 目录下。

## 📁 项目结构

```
zenkit/
├── electron/               # Electron 主进程
│   ├── main.ts            # 主进程入口（窗口管理、托盘）
│   └── preload.ts         # 预加载脚本（IPC 通信）
├── src/                   # Vue 前端
│   ├── main.ts           # Vue 入口
│   ├── App.vue           # 根组件
│   ├── components/       # UI 组件
│   │   ├── Pet.vue       # 宠物主体
│   │   ├── ChatBubble.vue    # 对话气泡
│   │   └── ContextMenu.vue   # 右键菜单
│   ├── composables/      # 组合式函数
│   │   ├── useDrag.ts    # 拖拽功能
│   │   ├── useAI.ts      # AI 对话
│   │   └── useAutoMove.ts    # 自动移动
│   ├── stores/           # Pinia 状态管理
│   │   └── pet.ts        # 宠物状态
│   ├── types/            # TypeScript 类型
│   └── styles/           # 全局样式
├── public/               # 静态资源
└── package.json
```

## 🎮 使用说明

| 操作         | 效果          |
| ------------ | ------------- |
| **左键拖拽** | 移动宠物位置  |
| **左键点击** | 宠物互动响应  |
| **右键点击** | 打开菜单      |
| **托盘图标** | 显示/隐藏宠物 |

## 🔧 配置 AI 对话

1. 右键点击宠物，选择"设置"打开设置面板
2. 在 AI 服务标签页中配置：
   - **服务商**：选择 OpenAI / DeepSeek / Ollama 等
   - **API 地址**：会根据服务商自动填充
   - **API Key**：填入你的 API 密钥（Ollama 不需要）
   - **模型**：选择要使用的模型

### 配置文件位置

设置会自动保存到：

- **Windows**: `%APPDATA%\zenkit\settings.json`
- **macOS**: `~/Library/Application Support/zenkit/settings.json`
- **Linux**: `~/.config/zenkit/settings.json`

如果使用本地 Ollama：

```bash
# 安装并运行 Ollama
ollama run llama3
```

## 🎨 自定义宠物形象

### 方案 1: 使用静态图片

在 `Pet.vue` 中取消注释图片方案：

```vue
<img src="@/assets/pet/idle.png" alt="pet" class="w-32 h-32 object-contain" />
```

### 方案 2: 使用 GIF 动画

放入不同状态的 GIF 文件：

- `idle.gif` - 待机动画
- `walk.gif` - 走路动画
- `talk.gif` - 说话动画

### 方案 3: 使用 Live2D

安装 Live2D 库：

```bash
npm install pixi.js pixi-live2d-display
```

详细接入方式参考 [pixi-live2d-display 文档](https://github.com/guansss/pixi-live2d-display)。

## 📝 开发计划

- [x] 基础窗口（透明、置顶、拖拽）
- [x] 对话气泡
- [x] 系统托盘
- [x] AI 对话接口
- [ ] Live2D 模型支持
- [ ] 语音识别 (STT)
- [ ] 语音合成 (TTS)
- [ ] 口型同步
- [ ] 设置面板
- [ ] 自动巡逻/移动

## 📜 License

MIT License

---

Made with ❤️ by ZenKit Team
