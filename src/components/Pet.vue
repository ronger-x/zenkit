<script setup lang="ts">
import { computed } from "vue";
import type { PetState } from "@/types";

interface Props {
  state: PetState;
  isDragging: boolean;
  name?: string;
  scale?: number;
  showName?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "mousedown", event: MouseEvent): void;
  (e: "mousemove", event: MouseEvent): void;
  (e: "mouseup", event: MouseEvent): void;
  (e: "click", event: MouseEvent): void;
}>();

// 根据状态选择不同的表情/动画
const petEmoji = computed(() => {
  switch (props.state) {
    case "idle":
      return "😺";
    case "happy":
      return "😸";
    case "talking":
      return "😺"; // 说话时保持普通表情，气泡由 ChatBubble 组件显示
    case "thinking":
      return "🤔";
    case "sleeping":
      return "😴";
    case "walking":
      return "🐱";
    default:
      return "😺";
  }
});

// 状态指示器颜色
const statusClass = computed(() => {
  switch (props.state) {
    case "talking":
      return "talking";
    case "thinking":
      return "thinking";
    default:
      return "idle";
  }
});
</script>

<template>
  <div
    class="pet-wrapper"
    :class="{ 'is-dragging': isDragging }"
    @mousedown="emit('mousedown', $event)"
    @mousemove="emit('mousemove', $event)"
    @mouseup="emit('mouseup', $event)"
    @click="emit('click', $event)"
  >
    <!-- 状态指示器 -->
    <div class="status-indicator" :class="statusClass"></div>

    <!-- 宠物主体 - 这里用 emoji 作为占位，后续可替换为 Live2D/图片 -->
    <div
      class="pet-sprite"
      :class="{
        floating: state === 'idle' && !isDragging,
        'scale-110': state === 'happy',
      }"
    >
      <!-- 方案1: Emoji 占位符 (开发测试用) -->
      <span class="text-8xl select-none">{{ petEmoji }}</span>

      <!-- 方案2: 静态图片 (取消注释使用) -->
      <!-- <img 
        src="@/assets/pet/idle.png" 
        alt="pet"
        class="w-32 h-32 object-contain"
        draggable="false"
      /> -->

      <!-- 方案3: GIF 动画 (取消注释使用) -->
      <!-- <img 
        :src="currentGif" 
        alt="pet"
        class="w-32 h-32 object-contain"
        draggable="false"
      /> -->
    </div>

    <!-- 宠物名字 - 简洁样式 -->
    <div v-if="props.showName !== false" class="pet-name">
      {{ props.name || "ZenKit" }}
    </div>
  </div>
</template>

<style scoped>
.pet-wrapper {
  @apply relative flex flex-col items-center cursor-grab;
  transition: transform 0.1s ease;
  pointer-events: auto; /* 确保宠物可点击 */
}

.pet-name {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 4px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.pet-wrapper.is-dragging {
  @apply cursor-grabbing;
  transform: scale(1.05);
}

.pet-wrapper:active {
  @apply cursor-grabbing;
}

.pet-sprite {
  @apply transition-all duration-300;
  filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.3));
}

.pet-sprite:hover {
  filter: drop-shadow(0 6px 10px rgba(0, 0, 0, 0.4));
}

/* 说话时的轻微摇晃动画 */
.pet-wrapper:has(.talking) .pet-sprite {
  animation: wiggle 0.3s ease-in-out infinite;
}

@keyframes wiggle {
  0%,
  100% {
    transform: rotate(-2deg);
  }
  50% {
    transform: rotate(2deg);
  }
}
</style>
