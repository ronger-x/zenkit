<script setup lang="ts">
import { usePetStore } from "@/stores/pet";

interface Props {
  x: number;
  y: number;
}

defineProps<Props>();

const emit = defineEmits<{
  (e: "close"): void;
  (e: "chat"): void;
}>();

const petStore = usePetStore();

// 菜单项
const menuItems = [
  {
    icon: "👋",
    label: "打招呼",
    action: () => {
      petStore.say("你好呀！今天过得怎么样？");
      emit("close");
    },
  },
  {
    icon: "💬",
    label: "和我说说话",
    action: () => {
      emit("chat");
      emit("close");
    },
  },
  {
    icon: "🎲",
    label: "随机聊天",
    action: () => {
      petStore.randomChat();
      emit("close");
    },
  },
  {
    icon: "😴",
    label: "休息一下",
    action: () => {
      petStore.sleep();
      emit("close");
    },
  },
  { divider: true },
  {
    icon: "📍",
    label: "重置位置",
    action: async () => {
      const screen = await window.electronAPI?.getScreenSize();
      if (screen) {
        window.electronAPI?.setWindowPosition(
          screen.width - 250,
          screen.height - 300
        );
      }
      emit("close");
    },
  },
  {
    icon: "⚙️",
    label: "设置",
    action: () => {
      window.electronAPI?.openSettings?.();
      emit("close");
    },
  },
];

const handleItemClick = (item: (typeof menuItems)[0]) => {
  if ("action" in item && item.action) {
    item.action();
  }
};
</script>

<template>
  <div
    class="context-menu"
    :style="{ left: `${x}px`, top: `${y}px` }"
    @click.stop
  >
    <template v-for="(item, index) in menuItems" :key="index">
      <div v-if="'divider' in item" class="menu-divider"></div>
      <div v-else class="context-menu-item" @click="handleItemClick(item)">
        <span class="mr-2">{{ item.icon }}</span>
        {{ item.label }}
      </div>
    </template>
  </div>
</template>

<style scoped>
.context-menu {
  @apply absolute bg-white rounded-xl shadow-2xl py-2;
  @apply border border-gray-200/50 backdrop-blur-sm;
  min-width: 160px;
  z-index: 1000;
  animation: menu-in 0.15s ease-out;
  pointer-events: auto; /* 确保菜单可点击 */
}

@keyframes menu-in {
  0% {
    opacity: 0;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.context-menu-item {
  @apply px-4 py-2.5 text-sm text-gray-700 cursor-pointer;
  @apply flex items-center;
  @apply transition-all duration-150;
}

.context-menu-item:hover {
  @apply bg-blue-50 text-blue-600;
}

.context-menu-item:active {
  @apply bg-blue-100;
}

.menu-divider {
  @apply my-1 mx-3 border-t border-gray-200;
}
</style>
