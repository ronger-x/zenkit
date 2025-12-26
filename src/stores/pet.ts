import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useSpeechSynthesis } from "@vueuse/core";
import removeMarkdown from "remove-markdown";
import type {
  PetState,
  PetMood,
  ChatMessage,
  PetConfig,
  AIConfig,
  TTSConfig,
} from "@/types";

// 随机对话内容
const RANDOM_CHATS = [
  "今天天气真不错呢~",
  "主人在忙什么呀？",
  "休息一下吧，喝杯水~",
  "我好无聊啊...",
  "摸摸我嘛~",
  "主人最棒了！",
  "想吃小鱼干...",
  "陪我玩一会儿吧~",
  "你知道吗？猫咪每天要睡16小时哦！",
  "呼噜呼噜~ 🐱",
];

/**
 * 清理 Markdown 格式，用于 TTS 朗读
 * 使用 remove-markdown 库处理，并对代码块做特殊处理
 */
function stripMarkdownForTTS(text: string): string {
  // 先处理代码块，替换为语音提示
  const textWithCodeReplaced = text.replace(/```[\s\S]*?```/g, '，代码块省略，');
  // 使用 remove-markdown 处理其他格式
  return removeMarkdown(textWithCodeReplaced, {
    stripListLeaders: true,
    listUnicodeChar: '',
    gfm: true,
    useImgAltText: false,
  }).trim();
}

export const usePetStore = defineStore("pet", () => {
  // ========== 状态 ==========
  const state = ref<PetState>("idle");
  const mood = ref<PetMood>("normal");
  const showBubble = ref(false);
  const currentText = ref("");
  const speechText = ref(""); // 专门用于语音合成的文本
  const chatHistory = ref<ChatMessage[]>([]);
  const lastInteractionTime = ref(Date.now());
  const isSpeaking = ref(false); // 正在播放语音
  let hideTimer: ReturnType<typeof setTimeout> | null = null;

  // TTS 配置
  const ttsConfig = ref<TTSConfig>({
    provider: "web-speech",
    voice: "",
    rate: 1,
    pitch: 1,
  });

  const availableVoices = ref<SpeechSynthesisVoice[]>([]);
  const updateVoices = () => {
    availableVoices.value = window.speechSynthesis.getVoices();
  };
  if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
      updateVoices();
  }
  
  // 使用 computed 来获取当前语音
  const currentVoice = computed(() => {
    const voice = availableVoices.value.find(v => v.name === ttsConfig.value.voice);
    return voice as SpeechSynthesisVoice;
  });

  // 语音合成 - 确保 pitch 和 rate 有有效的默认值
  const speech = useSpeechSynthesis(speechText, {
    lang: "zh-CN",
    pitch: computed(() => ttsConfig.value.pitch || 1),
    rate: computed(() => ttsConfig.value.rate || 1),
    volume: 1,
    voice: currentVoice,
  });

  // 监听语音状态，语音结束 2 秒后隐藏气泡
  watch(speech.isPlaying, (playing) => {
    isSpeaking.value = playing;
    if (!playing && config.value.voiceEnabled && showBubble.value) {
      // 语音播放结束，等待 2 秒后隐藏气泡
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        showBubble.value = false;
        // 如果当前是思考状态，不要重置为 idle
        if (state.value !== "thinking") {
          state.value = "idle";
        }
      }, 2000);
    }
  });

  // 配置
  const config = ref<PetConfig>({
    name: "ZenKit",
    personality:
      "你是一只可爱的猫咪桌宠，性格活泼开朗，喜欢和主人聊天。说话要简短可爱，偶尔带点猫咪的语气词。",
    voiceEnabled: false,
    autoChat: true,
    autoChatInterval: 60000, // 1分钟
    scale: 100,
    opacity: 100,
    showName: true,
  });

  // AI 配置
  const aiConfig = ref<AIConfig>({
    provider: "openai",
    apiKey: "",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-3.5-turbo",
  });

  // ========== 计算属性 ==========
  const isInteracting = computed(
    () => state.value === "talking" || state.value === "thinking"
  );

  // ========== 方法 ==========

  // 更新 AI 配置
  const updateAIConfig = (newConfig: Partial<AIConfig>) => {
    aiConfig.value = { ...aiConfig.value, ...newConfig };
  };

  // 更新气泡文本（用于流式输出）
  const updateBubble = (text: string) => {
    if (hideTimer) clearTimeout(hideTimer);
    showBubble.value = true;
    currentText.value = text;
    state.value = "talking";
    lastInteractionTime.value = Date.now();
  };

  // 显示对话气泡
  const say = (text: string, duration = 5000) => {
    if (hideTimer) clearTimeout(hideTimer);

    // 更新最后交互时间
    lastInteractionTime.value = Date.now();

    currentText.value = text;
    // 清理 Markdown 格式后再用于 TTS，添加前导空格以解决首字吞音问题
    speechText.value = " " + stripMarkdownForTTS(text);

    showBubble.value = true;
    state.value = "talking";

    // 播放语音
    console.log("🔊 TTS Check - voiceEnabled:", config.value.voiceEnabled, "text:", text.slice(0, 20));
    if (config.value.voiceEnabled) {
      console.log("🔊 TTS Starting - speechText:", speechText.value.slice(0, 20), "voice:", ttsConfig.value.voice);
      // 停止之前的语音
      if (speech.isPlaying.value) {
        window.speechSynthesis.cancel();
      }
      
      // 确保文本更新后再播放
      setTimeout(() => {
        console.log("🔊 TTS speak() called");
        speech.speak();
      }, 100);
      // 语音模式下，气泡的隐藏由 watch(speech.isPlaying) 控制
      // 这里不设置 hideTimer，避免语音未播完就隐藏
    } else {
      // 自动隐藏气泡（非语音模式下使用传入的 duration）
      hideTimer = setTimeout(() => {
        showBubble.value = false;
        // 如果当前是思考状态，不要重置为 idle
        if (state.value !== "thinking") {
          state.value = "idle";
        }
      }, duration);
    }
  };

  // 随机说话
  const randomChat = () => {
    const randomIndex = Math.floor(Math.random() * RANDOM_CHATS.length);
    say(RANDOM_CHATS[randomIndex]);
  };

  // 用户交互（点击宠物）
  const interact = () => {
    if (state.value === "sleeping") {
      say("喵~ 别吵我睡觉啦...");
      return;
    }

    // 随机选择一种互动响应
    const responses = ["喵~", "干嘛戳我！", "嘿嘿~", "主人好~", "🐱💕"];
    const randomIndex = Math.floor(Math.random() * responses.length);
    say(responses[randomIndex], 3000);

    // 短暂变成开心状态
    mood.value = "happy";
    setTimeout(() => {
      mood.value = "normal";
    }, 3000);
  };

  // 休息/睡觉
  const sleep = () => {
    state.value = "sleeping";
    say("晚安~ zzZ", 3000);

    // 5秒后自动醒来（演示用）
    setTimeout(() => {
      if (state.value === "sleeping") {
        state.value = "idle";
        say("睡了个好觉！", 3000);
      }
    }, 5000);
  };

  // 设置状态
  const setState = (newState: PetState) => {
    state.value = newState;
  };

  // 更新配置
  const updateConfig = (newConfig: Partial<PetConfig>) => {
    const oldAutoChat = config.value.autoChat;
    const oldInterval = config.value.autoChatInterval;

    config.value = { ...config.value, ...newConfig };

    // 如果自动聊天设置变化，重启定时器
    if (
      newConfig.autoChat !== undefined ||
      newConfig.autoChatInterval !== undefined
    ) {
      if (
        config.value.autoChat !== oldAutoChat ||
        config.value.autoChatInterval !== oldInterval
      ) {
        stopAutoChat();
        if (config.value.autoChat) {
          startAutoChat();
        }
      }
    }
  };

  // 添加聊天记录
  const addMessage = (role: "user" | "assistant", content: string) => {
    chatHistory.value.push({
      id: Date.now().toString(),
      role,
      content,
      timestamp: Date.now(),
    });
  };

  // 清空聊天记录
  const clearHistory = () => {
    chatHistory.value = [];
  };

  // ========== 自动行为 ==========
  let autoChatTimer: ReturnType<typeof setInterval> | null = null;

  const startAutoChat = () => {
    if (autoChatTimer) return;

    // 检查间隔设置，如果小于 1000，假设是秒，转换为毫秒
    // 这样兼容 SettingsPanel 传过来的秒数
    const interval =
      config.value.autoChatInterval < 1000
        ? config.value.autoChatInterval * 1000
        : config.value.autoChatInterval;

    autoChatTimer = setInterval(() => {
      if (!config.value.autoChat) return;

      // 只有在空闲状态下才自动说话
      if (state.value !== "idle") return;

      // 如果气泡正在显示或语音正在播放，不触发自动聊天
      if (showBubble.value || isSpeaking.value) return;

      // 检查距离上次交互是否已经过了足够的时间
      // 避免打断用户的连续操作
      const timeSinceLastInteraction = Date.now() - lastInteractionTime.value;
      if (timeSinceLastInteraction < interval) return;

      // 30% 概率自动说话
      if (Math.random() < 0.3) {
        randomChat();
      }
    }, 5000); // 每 5 秒检查一次，而不是直接用 interval
  };

  const stopAutoChat = () => {
    if (autoChatTimer) {
      clearInterval(autoChatTimer);
      autoChatTimer = null;
    }
  };

  // 启动自动聊天
  startAutoChat();

  // ========== 系统监控 ==========
  window.electronAPI?.onSystemStats?.((stats) => {
    // 只有在空闲状态下才响应系统状态
    if (state.value !== "idle" && state.value !== "walking") return;

    if (stats.cpu > 80) {
      // CPU 过高
      if (Math.random() < 0.1) {
        // 降低触发频率
        say("电脑好烫啊... 🥵");
        mood.value = "sad";
      }
    } else if (stats.memory > 90) {
      // 内存过高
      if (Math.random() < 0.1) {
        say("脑子要炸了... 😵");
        mood.value = "sad";
      }
    }
  });

  // ========== 设置同步 ==========
  const applySettings = (settings: any) => {
    console.log("📦 Applying settings:", settings);
    if (settings.petName) config.value.name = settings.petName;
    if (settings.personality) config.value.personality = settings.personality;
    if (settings.behavior) {
        config.value.autoChat = settings.behavior.autoChat;
        config.value.autoChatInterval = settings.behavior.autoChatInterval;
    }
    if (settings.ai) {
        aiConfig.value = settings.ai;
    }
    if (settings.tts) {
        // 合并 TTS 设置，保留默认的 pitch 和 rate
        ttsConfig.value = {
          provider: settings.tts.provider || ttsConfig.value.provider,
          voice: settings.tts.voice || ttsConfig.value.voice,
          rate: typeof settings.tts.rate === 'number' ? settings.tts.rate : ttsConfig.value.rate,
          pitch: typeof settings.tts.pitch === 'number' ? settings.tts.pitch : ttsConfig.value.pitch,
          enabled: settings.tts.enabled,
        };
        config.value.voiceEnabled = settings.tts.enabled === true;
        console.log("🔊 TTS settings applied - voiceEnabled:", config.value.voiceEnabled, "ttsConfig:", ttsConfig.value);
    }
    if (settings.display) {
        config.value.scale = settings.display.scale;
        config.value.opacity = settings.display.opacity;
        config.value.showName = settings.display.showName;
    }
  };

  const loadSettings = async () => {
    if (window.electronAPI?.getSettings) {
      try {
        const settings = await window.electronAPI.getSettings();
        if (settings) {
          applySettings(settings);
        }
      } catch (e) {
        console.error("Failed to load settings in store:", e);
      }
    }
  };

  if (window.electronAPI?.onSettingsUpdated) {
    window.electronAPI.onSettingsUpdated((settings) => {
      applySettings(settings);
    });
  }

  loadSettings();

  // 更新 TTS 配置
  const updateTTSConfig = (newConfig: Partial<TTSConfig>) => {
    ttsConfig.value = { ...ttsConfig.value, ...newConfig };
  };

  return {
    // 状态
    state,
    mood,
    showBubble,
    currentText,
    chatHistory,
    config,
    aiConfig,
    ttsConfig,
    availableVoices,
    isSpeaking,
    // 计算属性
    isInteracting,
    // 方法
    say,
    updateBubble,
    randomChat,
    interact,
    sleep,
    setState,
    updateConfig,
    updateAIConfig,
    updateTTSConfig,
    addMessage,
    clearHistory,
    startAutoChat,
    stopAutoChat,
  };
});
