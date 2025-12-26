import { defineStore } from "pinia";
import { ref, computed, watch } from "vue";
import { useSpeechSynthesis } from "@vueuse/core";
import type {
  PetState,
  PetMood,
  ChatMessage,
  PetConfig,
  AIConfig,
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

  // 语音合成
  const speech = useSpeechSynthesis(speechText, {
    lang: "zh-CN",
    pitch: 1,
    rate: 1,
    volume: 1,
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

  // 显示对话气泡
  const say = (text: string, duration = 5000) => {
    if (hideTimer) clearTimeout(hideTimer);

    // 更新最后交互时间
    lastInteractionTime.value = Date.now();

    currentText.value = text;
    // 添加前导空格以解决首字吞音问题
    speechText.value = " " + text;

    showBubble.value = true;
    state.value = "talking";

    // 播放语音
    if (config.value.voiceEnabled) {
      // 确保文本更新后再播放
      setTimeout(() => {
        speech.speak();
      }, 50);
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

  return {
    // 状态
    state,
    mood,
    showBubble,
    currentText,
    chatHistory,
    config,
    aiConfig,
    isSpeaking,
    // 计算属性
    isInteracting,
    // 方法
    say,
    randomChat,
    interact,
    sleep,
    setState,
    updateConfig,
    updateAIConfig,
    addMessage,
    clearHistory,
    startAutoChat,
    stopAutoChat,
  };
});
