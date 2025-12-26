<script setup lang="ts">
import { ref, onMounted, computed, toRaw, watch, reactive } from "vue";

const settings = ref({
  petName: "ZenKit",
  personality: "你是一只可爱的猫咪桌宠，性格活泼开朗，喜欢和主人聊天。",
  avatar: "cat",
  customAvatarPath: "",
  ai: {
    provider: "openai",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-3.5-turbo",
    models: {} as Record<string, string[]>, // 保存获取到的模型列表
  },
  tts: {
    enabled: false,
    provider: "web-speech", // Changed default to web-speech
    voice: "",
    rate: 1,
    pitch: 1,
  },
  behavior: {
    autoChat: true,
    autoChatInterval: 60,
    autoMove: false,
  },
  display: {
    alwaysOnTop: true,
    opacity: 100,
    scale: 100,
    showName: true,
  },
  system: {
    autoStart: false,
    minimizeToTray: true,
  },
});

const activeTab = ref("general");
const saveMessage = ref("");
const isSaving = ref(false);
const isFetchingModels = ref(false);

const tabs = [
  { id: "general", icon: "⚙️", label: "通用" },
  { id: "ai", icon: "🤖", label: "AI 服务" },
  { id: "tts", icon: "🔊", label: "语音" },
  { id: "display", icon: "🎨", label: "外观" },
  { id: "about", icon: "ℹ️", label: "关于" },
];

const aiModels = reactive<Record<string, string[]>>({
  openai: ["gpt-3.5-turbo", "gpt-4", "gpt-4o", "gpt-4o-mini"],
  deepseek: ["deepseek-chat", "deepseek-coder"],
  ollama: ["llama3", "qwen2.5", "mistral"],
  custom: [],
});

// 从设置中加载已保存的模型列表
const loadSavedModels = () => {
  if (settings.value.ai.models) {
    for (const [provider, models] of Object.entries(settings.value.ai.models)) {
      if (Array.isArray(models) && models.length > 0) {
        aiModels[provider] = models;
      }
    }
  }
};

const currentModels = computed(
  () => aiModels[settings.value.ai.provider] || []
);

const defaultBaseUrls: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com",
  ollama: "http://localhost:11434",
  custom: "",
};

watch(
  () => settings.value.ai.provider,
  (newProvider) => {
    // 自动更新 Base URL
    if (defaultBaseUrls[newProvider] !== undefined) {
      settings.value.ai.baseUrl = defaultBaseUrls[newProvider];
    }
    // 自动选择第一个模型
    const models = aiModels[newProvider];
    if (models && models.length > 0) {
      settings.value.ai.model = models[0];
    }
  }
);

const availableVoices = ref<SpeechSynthesisVoice[]>([]);

const updateVoices = () => {
  availableVoices.value = window.speechSynthesis.getVoices();
  // 如果当前选中的声音不在列表中，且列表不为空，默认选中第一个中文声音或第一个声音
  if (settings.value.tts.voice && !availableVoices.value.find(v => v.name === settings.value.tts.voice)) {
     const zhVoice = availableVoices.value.find(v => v.lang.includes('zh'));
     if (zhVoice) {
       settings.value.tts.voice = zhVoice.name;
     } else if (availableVoices.value.length > 0) {
       settings.value.tts.voice = availableVoices.value[0].name;
     }
  }
};

const ttsVoices = computed(() => {
  return availableVoices.value.map(v => ({
    value: v.name,
    label: `${v.name} (${v.lang})`
  }));
});

const fetchModels = async () => {
  if (isFetchingModels.value) return;
  isFetchingModels.value = true;
  saveMessage.value = "⏳ 获取模型中...";
  
  try {
    const { provider, baseUrl, apiKey } = settings.value.ai;
    let url = baseUrl.replace(/\/$/, "");
    let headers: Record<string, string> = {};
    
    if (provider === 'ollama') {
       url = `${url}/api/tags`;
    } else {
       url = `${url}/models`;
       if (apiKey) {
         headers['Authorization'] = `Bearer ${apiKey}`;
       }
    }

    console.log(`Fetching models from ${url}`);
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const data = await response.json();
    let models: string[] = [];

    if (provider === 'ollama') {
      models = data.models?.map((m: any) => m.name) || [];
    } else {
      models = data.data?.map((m: any) => m.id) || [];
    }

    if (models.length > 0) {
      aiModels[provider] = models;
      // 保存模型列表到设置
      if (!settings.value.ai.models) {
        settings.value.ai.models = {};
      }
      settings.value.ai.models[provider] = models;
      
      if (!models.includes(settings.value.ai.model)) {
        settings.value.ai.model = models[0];
      }
      saveMessage.value = `✅ 已获取 ${models.length} 个模型`;
    } else {
      saveMessage.value = "⚠️ 未找到模型";
    }
  } catch (e) {
    console.error("Fetch models failed:", e);
    saveMessage.value = "❌ 获取模型失败";
  } finally {
    isFetchingModels.value = false;
    setTimeout(() => {
      if (saveMessage.value.includes("获取")) saveMessage.value = "";
    }, 3000);
  }
};

// 深度合并函数
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

onMounted(async () => {
  updateVoices();
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }

  try {
    console.log("🔧 Loading settings...");
    const saved = await window.electronAPI?.getSettings?.();
    console.log("📥 Received settings:", saved);
    if (saved) {
      // 使用深度合并
      settings.value = deepMerge(settings.value, saved);
      console.log("✅ Settings loaded:", settings.value);
      // 加载已保存的模型列表
      loadSavedModels();
    }
  } catch (e) {
    console.error("❌ Load failed:", e);
    saveMessage.value = "⚠️ 加载设置失败";
  }
});

const save = async () => {
  if (isSaving.value) return;

  console.log("📢 [FRONTEND] Save button clicked!");
  isSaving.value = true;
  saveMessage.value = "⏳ 保存中...";

  try {
    // 检查 electronAPI 是否可用
    if (!window.electronAPI) {
      console.error("❌ [FRONTEND] electronAPI is not available!");
      saveMessage.value = "❌ API 未就绪";
      return;
    }

    if (!window.electronAPI.saveSettings) {
      console.error("❌ [FRONTEND] saveSettings function is not available!");
      saveMessage.value = "❌ 保存功能不可用";
      return;
    }

    console.log("💾 [FRONTEND] Calling saveSettings...");
    // 使用 toRaw + JSON 深拷贝来创建普通对象，避免 IPC 序列化错误
    const plainSettings = JSON.parse(JSON.stringify(toRaw(settings.value)));
    const result = await window.electronAPI.saveSettings(plainSettings);
    console.log("📤 [FRONTEND] Save result:", result);

    if (result) {
      saveMessage.value = "✅ 已保存";
    } else {
      saveMessage.value = "❌ 保存失败";
    }
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : "未知错误";
    saveMessage.value = "❌ 保存失败: " + errorMsg;
    console.error("❌ Save failed:", e);
  } finally {
    isSaving.value = false;
    setTimeout(() => (saveMessage.value = ""), 3000);
  }
};

const openLogs = () => window.electronAPI?.openLogs?.();
const close = () => window.electronAPI?.closeSettings?.();
</script>

<template>
  <div class="settings">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <div class="logo">
        <span class="logo-icon">🐱</span>
        <span class="logo-text">ZenKit</span>
      </div>
      <nav class="nav">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          <span class="nav-icon">{{ tab.icon }}</span>
          <span class="nav-label">{{ tab.label }}</span>
        </button>
      </nav>
    </aside>

    <!-- 主内容区 -->
    <main class="main">
      <header class="header">
        <h1>{{ tabs.find((t) => t.id === activeTab)?.label }}</h1>
        <button class="close-btn" @click="close">✕</button>
      </header>

      <div class="content">
        <!-- 通用设置 -->
        <div v-show="activeTab === 'general'" class="section">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-icon">🏷️</span>
              <div class="setting-text">
                <div class="setting-title">宠物名字</div>
                <div class="setting-desc">给你的桌面宠物起个名字</div>
              </div>
            </div>
            <input v-model="settings.petName" class="input-text" />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-icon">💭</span>
              <div class="setting-text">
                <div class="setting-title">性格设定</div>
                <div class="setting-desc">
                  定义宠物的性格特点 (AI System Prompt)
                </div>
              </div>
            </div>
          </div>
          <textarea
            v-model="settings.personality"
            class="textarea"
            rows="3"
          ></textarea>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-icon">💬</span>
              <div class="setting-text">
                <div class="setting-title">自动聊天</div>
                <div class="setting-desc">宠物会随机说一些话</div>
              </div>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="settings.behavior.autoChat" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-item" v-if="settings.behavior.autoChat">
            <div class="setting-info">
              <span class="setting-icon">⏱️</span>
              <div class="setting-text">
                <div class="setting-title">聊天间隔 (秒)</div>
                <div class="setting-desc">自动说话的时间间隔</div>
              </div>
            </div>
            <input
              type="number"
              v-model.number="settings.behavior.autoChatInterval"
              min="10"
              max="300"
              class="input-number"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-icon">📌</span>
              <div class="setting-text">
                <div class="setting-title">窗口置顶</div>
                <div class="setting-desc">宠物始终显示在最上层</div>
              </div>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="settings.display.alwaysOnTop" />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>

        <!-- AI 设置 -->
        <div v-show="activeTab === 'ai'" class="section">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-icon">🏢</span>
              <div class="setting-text">
                <div class="setting-title">AI 服务商</div>
                <div class="setting-desc">选择 AI 对话服务提供商</div>
              </div>
            </div>
            <select v-model="settings.ai.provider" class="select">
              <option value="openai">OpenAI</option>
              <option value="deepseek">DeepSeek</option>
              <option value="ollama">Ollama (本地)</option>
              <option value="custom">自定义</option>
            </select>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-icon">🔗</span>
              <div class="setting-text">
                <div class="setting-title">API 地址</div>
                <div class="setting-desc">服务接口地址</div>
              </div>
            </div>
            <input v-model="settings.ai.baseUrl" class="input-text" />
          </div>

          <div class="setting-item" v-if="settings.ai.provider !== 'ollama'">
            <div class="setting-info">
              <span class="setting-icon">🔑</span>
              <div class="setting-text">
                <div class="setting-title">API Key</div>
                <div class="setting-desc">服务密钥</div>
              </div>
            </div>
            <input
              v-model="settings.ai.apiKey"
              type="password"
              class="input-text"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-icon">🧠</span>
              <div class="setting-text">
                <div class="setting-title">模型</div>
                <div class="setting-desc">选择 AI 模型</div>
              </div>
            </div>
            <div style="display: flex; gap: 8px; align-items: center;">
              <select v-model="settings.ai.model" class="select" style="min-width: 160px;">
                <option v-for="m in currentModels" :key="m" :value="m">
                  {{ m }}
                </option>
              </select>
              <button @click="fetchModels" :disabled="isFetchingModels" class="btn-icon" title="刷新模型列表">
                {{ isFetchingModels ? '⏳' : '🔄' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 语音设置 -->
        <div v-show="activeTab === 'tts'" class="section">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-icon">🔊</span>
              <div class="setting-text">
                <div class="setting-title">启用语音合成</div>
                <div class="setting-desc">宠物会用语音说话</div>
              </div>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="settings.tts.enabled" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <template v-if="settings.tts.enabled">
            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-icon">🎤</span>
                <div class="setting-text">
                  <div class="setting-title">语音角色</div>
                  <div class="setting-desc">选择 TTS 语音</div>
                </div>
              </div>
              <select v-model="settings.tts.voice" class="select">
                <option v-for="v in ttsVoices" :key="v.value" :value="v.value">
                  {{ v.label }}
                </option>
              </select>
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-icon">🎚️</span>
                <div class="setting-text">
                  <div class="setting-title">语速</div>
                  <div class="setting-desc">调整说话速度 ({{ settings.tts.rate?.toFixed(1) || 1 }}x)</div>
                </div>
              </div>
              <input
                type="range"
                v-model.number="settings.tts.rate"
                min="0.5"
                max="2"
                step="0.1"
                class="slider"
              />
            </div>

            <div class="setting-item">
              <div class="setting-info">
                <span class="setting-icon">🎵</span>
                <div class="setting-text">
                  <div class="setting-title">音调</div>
                  <div class="setting-desc">调整声音音调 ({{ settings.tts.pitch?.toFixed(1) || 1 }})</div>
                </div>
              </div>
              <input
                type="range"
                v-model.number="settings.tts.pitch"
                min="0.5"
                max="2"
                step="0.1"
                class="slider"
              />
            </div>
          </template>
        </div>

        <!-- 外观设置 -->
        <div v-show="activeTab === 'display'" class="section">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-icon">🏷️</span>
              <div class="setting-text">
                <div class="setting-title">显示宠物名称</div>
                <div class="setting-desc">在宠物下方显示名字</div>
              </div>
            </div>
            <label class="toggle">
              <input type="checkbox" v-model="settings.display.showName" />
              <span class="toggle-slider"></span>
            </label>
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-icon">📏</span>
              <div class="setting-text">
                <div class="setting-title">缩放比例</div>
                <div class="setting-desc">
                  调整宠物大小 ({{ settings.display.scale }}%)
                </div>
              </div>
            </div>
            <input
              type="range"
              v-model.number="settings.display.scale"
              min="50"
              max="150"
              class="slider"
            />
          </div>

          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-icon">💧</span>
              <div class="setting-text">
                <div class="setting-title">透明度</div>
                <div class="setting-desc">
                  调整窗口透明度 ({{ settings.display.opacity }}%)
                </div>
              </div>
            </div>
            <input
              type="range"
              v-model.number="settings.display.opacity"
              min="30"
              max="100"
              class="slider"
            />
          </div>
        </div>

        <!-- 关于 -->
        <div v-show="activeTab === 'about'" class="section about">
          <div class="about-logo">🐱</div>
          <h2>ZenKit</h2>
          <p class="version">v0.1.0</p>
          <p class="desc">一个可爱的 AI 桌面宠物</p>
          <p class="copyright">Made with ❤️</p>
        </div>
      </div>

      <!-- 底部保存栏 -->
      <footer class="footer" v-if="activeTab !== 'about'">
        <button class="btn-logs" @click="openLogs">📋 查看日志</button>
        <span class="save-msg">{{ saveMessage }}</span>
        <button class="btn-save" @click="save" :disabled="isSaving">
          {{ isSaving ? "保存中..." : "保存设置" }}
        </button>
      </footer>
    </main>
  </div>
</template>

<style scoped>
.settings {
  display: flex;
  height: 100vh;
  background: #1e1e2e;
  color: #cdd6f4;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui,
    sans-serif;
}

.sidebar {
  width: 180px;
  background: #181825;
  padding: 20px 0;
  display: flex;
  flex-direction: column;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px 24px;
  border-bottom: 1px solid #313244;
  margin-bottom: 12px;
}

.logo-icon {
  font-size: 28px;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #89b4fa;
}

.nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0 12px;
}

.nav button {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: none;
  border: none;
  border-radius: 8px;
  color: #6c7086;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
}

.nav button:hover {
  background: #313244;
  color: #cdd6f4;
}

.nav button.active {
  background: #313244;
  color: #89b4fa;
}

.nav-icon {
  font-size: 16px;
}

.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  -webkit-app-region: drag;
}

.header h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
}

.close-btn {
  -webkit-app-region: no-drag;
  background: none;
  border: none;
  color: #6c7086;
  font-size: 18px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f38ba8;
  color: white;
}

.content {
  flex: 1;
  padding: 0 24px 16px;
  overflow-y: auto;
  /* 隐藏滚动条但保持滚动功能 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE and Edge */
}

.content::-webkit-scrollbar {
  display: none; /* Chrome, Safari, Opera */
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: #181825;
  border-radius: 12px;
  gap: 16px;
}

.setting-info {
  display: flex;
  align-items: center;
  gap: 14px;
  flex: 1;
}

.setting-icon {
  font-size: 20px;
}

.setting-text {
  flex: 1;
}

.setting-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}

.setting-desc {
  font-size: 12px;
  color: #6c7086;
}

.input-text,
.select,
.input-number {
  padding: 8px 12px;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 8px;
  color: #cdd6f4;
  font-size: 14px;
  min-width: 200px;
}

.input-number {
  width: 80px;
  min-width: 80px;
}

.input-text:focus,
.select:focus {
  outline: none;
  border-color: #89b4fa;
}

.textarea {
  width: 100%;
  padding: 12px 16px;
  background: #181825;
  border: 1px solid #45475a;
  border-radius: 12px;
  color: #cdd6f4;
  font-size: 14px;
  resize: vertical;
  margin-bottom: 8px;
}

.textarea:focus {
  outline: none;
  border-color: #89b4fa;
}

.toggle {
  position: relative;
  width: 44px;
  height: 24px;
  cursor: pointer;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  inset: 0;
  background: #45475a;
  border-radius: 24px;
  transition: 0.3s;
}

.toggle-slider::before {
  content: "";
  position: absolute;
  width: 18px;
  height: 18px;
  left: 3px;
  bottom: 3px;
  background: white;
  border-radius: 50%;
  transition: 0.3s;
}

.toggle input:checked + .toggle-slider {
  background: #89b4fa;
}

.toggle input:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.slider {
  width: 120px;
  accent-color: #89b4fa;
}

.footer {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: #181825;
  border-top: 1px solid #313244;
}

.save-msg {
  flex: 1;
  font-size: 13px;
  color: #a6e3a1;
}

.btn-logs {
  padding: 10px 20px;
  background: #45475a;
  border: none;
  border-radius: 8px;
  color: #cdd6f4;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-logs:hover {
  background: #585b70;
}

.btn-save {
  padding: 10px 24px;
  background: #89b4fa;
  border: none;
  border-radius: 8px;
  color: #1e1e2e;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-save:hover {
  background: #b4befe;
}

.btn-save:disabled {
  background: #45475a;
  cursor: not-allowed;
  opacity: 0.7;
}

.about {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.about-logo {
  font-size: 64px;
  margin-bottom: 16px;
}

.about h2 {
  margin: 0 0 8px;
  font-size: 24px;
}

.about .version {
  color: #89b4fa;
  margin: 0 0 16px;
}

.about .desc {
  color: #6c7086;
  margin: 0 0 24px;
}

.about .copyright {
  color: #45475a;
  font-size: 12px;
}
.btn-icon {
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 8px;
  color: #cdd6f4;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
}

.btn-icon:hover:not(:disabled) {
  background: #45475a;
  border-color: #89b4fa;
}

.btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
