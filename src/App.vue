<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from "vue";
import Pet from "./components/Pet.vue";
import ChatBubble from "./components/ChatBubble.vue";
import ChatInput from "./components/ChatInput.vue";
import ContextMenu from "./components/ContextMenu.vue";
import SettingsPanel from "./components/SettingsPanel.vue";
import { usePetStore } from "./stores/pet";
import { useDrag } from "./composables/useDrag";
import { useAI } from "./composables/useAI";

const petStore = usePetStore();
const { chat } = useAI();

// 检查是否是设置页面
const isSettingsPage = computed(() => {
  return window.location.hash === "#/settings";
});

// 右键菜单
const showContextMenu = ref(false);
const contextMenuPosition = ref({ x: 0, y: 0 });

// 聊天输入框
const showChatInput = ref(false);

// 拖拽功能
const { startDrag, onDrag, endDrag, isDragging } = useDrag();

// 鼠标穿透状态管理
let isIgnoreMouse = false;

const setIgnore = (ignore: boolean) => {
  if (isIgnoreMouse !== ignore) {
    isIgnoreMouse = ignore;
    window.electronAPI?.setIgnoreMouse(ignore, { forward: true });
  }
};

// 全局鼠标移动处理
const handleGlobalMouseMove = (e: MouseEvent) => {
  // 1. 拖拽中 -> 保持交互
  if (isDragging.value) {
    setIgnore(false);
    return;
  }

  // 2. 获取鼠标下的元素
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el) return;

  // 3. 检查是否在交互区域内
  // 使用 closest 查找最近的匹配祖先元素
  // .pet-area: 宠物区域
  // .context-menu: 右键菜单
  // .chat-input-wrapper: 聊天输入框
  // .bubble-area: 对话气泡区域
  const interactiveElement = el.closest(
    ".pet-area, .context-menu, .chat-input-wrapper, .bubble-area"
  );

  if (interactiveElement) {
    setIgnore(false);
  } else {
    setIgnore(true);
  }
};

// 处理右键菜单
const handleContextMenu = (e: MouseEvent) => {
  if (isSettingsPage.value) return;
  e.preventDefault();

  // 如果正在聊天，不显示右键菜单
  if (showChatInput.value) return;

  // 右键菜单尺寸（估算）
  const menuWidth = 160;
  const menuHeight = 200;

  // 窗口尺寸
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;

  // 计算菜单位置，确保不超出窗口
  let x = e.clientX;
  let y = e.clientY;

  // 如果右侧空间不足，显示在鼠标左侧
  if (x + menuWidth > windowWidth) {
    x = Math.max(0, x - menuWidth);
  }

  // 如果底部空间不足，显示在鼠标上方
  if (y + menuHeight > windowHeight) {
    y = Math.max(0, y - menuHeight);
  }

  contextMenuPosition.value = { x, y };
  showContextMenu.value = true;
};

// 关闭右键菜单
const closeContextMenu = () => {
  showContextMenu.value = false;
};

// 打开聊天
const openChat = () => {
  showChatInput.value = true;
  // 确保鼠标不穿透
  window.electronAPI?.setIgnoreMouse(false);
};

// 处理发送消息
const handleChat = async (text: string) => {
  showChatInput.value = false;
  await chat(text);
};

// 处理点击宠物
const handlePetClick = () => {
  if (!isDragging.value) {
    petStore.interact();
  }
};

// 全局点击关闭菜单
const handleGlobalClick = () => {
  if (showContextMenu.value) {
    closeContextMenu();
  }
};

onMounted(async () => {
  // 加载保存的设置
  if (window.electronAPI?.getSettings) {
    const settings = await window.electronAPI.getSettings();
    if (settings) {
      petStore.updateConfig({
        name: settings.petName,
        personality: settings.personality,
        autoChat: settings.behavior?.autoChat,
        autoChatInterval: (settings.behavior?.autoChatInterval || 60) * 1000, // 秒转毫秒
        voiceEnabled: settings.tts?.enabled,
        scale: settings.display?.scale,
        opacity: settings.display?.opacity,
        showName: settings.display?.showName,
      });

      if (settings.ai) {
        petStore.updateAIConfig({
          provider: settings.ai.provider,
          apiKey: settings.ai.apiKey,
          baseUrl: settings.ai.baseUrl,
          model: settings.ai.model,
        });
      }
    }
  }

  // 监听设置更新
  window.electronAPI?.onSettingsUpdated?.((settings) => {
    petStore.updateConfig({
      name: settings.petName,
      personality: settings.personality,
      autoChat: settings.behavior?.autoChat,
      autoChatInterval: (settings.behavior?.autoChatInterval || 60) * 1000, // 秒转毫秒
      voiceEnabled: settings.tts?.enabled,
      scale: settings.display?.scale,
      opacity: settings.display?.opacity,
      showName: settings.display?.showName,
    });

    if (settings.ai) {
      petStore.updateAIConfig({
        provider: settings.ai.provider,
        apiKey: settings.ai.apiKey,
        baseUrl: settings.ai.baseUrl,
        model: settings.ai.model,
      });
    }
  });

  if (!isSettingsPage.value) {
    // 初始化时不设置穿透，让窗口可以接收鼠标事件
    setIgnore(false);
  }

  // 添加全局点击监听
  document.addEventListener("click", handleGlobalClick);
  // 添加全局鼠标移动监听，用于动态控制穿透
  window.addEventListener("mousemove", handleGlobalMouseMove);
});

onUnmounted(() => {
  document.removeEventListener("click", handleGlobalClick);
  window.removeEventListener("mousemove", handleGlobalMouseMove);
});
</script>

<template>
  <!-- 设置页面 -->
  <SettingsPanel v-if="isSettingsPage" />

  <!-- 宠物主界面 -->
  <div v-else class="app-container" @contextmenu="handleContextMenu">
    <!-- 对话气泡 - 放在顶部 -->
    <div class="bubble-area">
      <Transition name="bubble">
        <ChatBubble v-if="petStore.showBubble" :text="petStore.currentText" />
      </Transition>
    </div>

    <!-- 聊天输入框 -->
    <Transition name="fade">
      <ChatInput
        v-if="showChatInput"
        @send="handleChat"
        @close="showChatInput = false"
      />
    </Transition>

    <!-- 宠物主体 -->
    <div
      class="pet-area"
      :style="{ transform: `scale(${petStore.config.scale || 100}%)` }"
    >
      <Pet
        :state="petStore.state"
        :is-dragging="isDragging"
        :name="petStore.config.name"
        :show-name="petStore.config.showName"
        @mousedown="startDrag"
        @mousemove="onDrag"
        @mouseup="endDrag"
        @click="handlePetClick"
      />
    </div>

    <!-- 右键菜单 -->
    <Transition name="fade">
      <ContextMenu
        v-if="showContextMenu"
        :x="contextMenuPosition.x"
        :y="contextMenuPosition.y"
        @close="closeContextMenu"
        @chat="openChat"
      />
    </Transition>
  </div>
</template>

<style scoped>
.app-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  padding-bottom: 40px; /* 增加底部间距，避免菜单被截断 */
  background: transparent !important;
  position: relative;
  pointer-events: none; /* 默认允许穿透 */
}

.bubble-area {
  margin-bottom: 8px;
  max-height: 350px; /* 限制气泡区域最大高度 */
  overflow-y: auto;
  overflow-x: hidden;
  pointer-events: auto; /* 气泡区域可交互 */
}

/* 隐藏滚动条但保持功能 */
.bubble-area::-webkit-scrollbar {
  width: 0;
  display: none;
}

.pet-area {
  flex-shrink: 0;
  pointer-events: auto; /* 宠物区域可交互 */
  cursor: grab;
}

.pet-area:active {
  cursor: grabbing;
}

/* 气泡动画 */
.bubble-enter-active {
  animation: bubble-in 0.3s ease-out;
}

.bubble-leave-active {
  animation: bubble-out 0.2s ease-in;
}

@keyframes bubble-in {
  0% {
    transform: scale(0) translateY(10px);
    opacity: 0;
  }
  50% {
    transform: scale(1.1) translateY(0);
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

@keyframes bubble-out {
  0% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.8) translateY(-10px);
    opacity: 0;
  }
}

/* 淡入淡出 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
