<script setup lang="ts">
interface Props {
  text: string;
}

defineProps<Props>();
</script>

<template>
  <div class="chat-bubble">
    <div class="bubble-content">
      {{ text }}
    </div>
    <div class="bubble-arrow"></div>
  </div>
</template>

<style scoped>
.chat-bubble {
  position: relative;
  max-width: 240px;
}

.bubble-content {
  background: white;
  border-radius: 16px;
  padding: 12px 16px;
  font-size: 13px;
  line-height: 1.5;
  color: #333;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  word-wrap: break-word;
  text-align: left;
  max-height: 300px;
  overflow-y: auto;
}

/* 美化滚动条 */
.bubble-content::-webkit-scrollbar {
  width: 4px;
}

.bubble-content::-webkit-scrollbar-track {
  background: transparent;
}

.bubble-content::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 2px;
}

.bubble-content::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.bubble-arrow {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-top: 10px solid white;
  filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.1));
}
</style>
