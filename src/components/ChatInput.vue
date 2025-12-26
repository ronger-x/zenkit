<script setup lang="ts">
import { ref, nextTick, onMounted, watch } from "vue";
import { useSpeechRecognition } from "@vueuse/core";

const emit = defineEmits<{
  (e: "send", text: string): void;
  (e: "close"): void;
}>();

const input = ref("");
const textareaRef = ref<HTMLTextAreaElement | null>(null);

// 语音识别
const { isListening, result, start, stop, isSupported } = useSpeechRecognition({
  lang: "zh-CN",
  continuous: false,
});

// 监听语音结果
watch(result, (val) => {
  if (val) {
    input.value = val;
  }
});

const toggleSpeech = () => {
  if (isListening.value) {
    stop();
  } else {
    start();
    input.value = ""; // 清空输入框准备接收语音
  }
};

const send = () => {
  if (!input.value.trim()) return;
  emit("send", input.value);
  input.value = "";
};

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send();
  } else if (e.key === "Escape") {
    emit("close");
  }
};

onMounted(() => {
  nextTick(() => {
    textareaRef.value?.focus();
  });
});
</script>

<template>
  <div class="chat-input-wrapper" @click.stop>
    <div class="chat-input-container">
      <textarea
        ref="textareaRef"
        v-model="input"
        :placeholder="isListening ? '正在听你说...' : '和我说点什么吧...'"
        rows="3"
        @keydown="handleKeydown"
      ></textarea>
      <div class="actions">
        <div class="left-actions">
          <button class="close-btn" @click="$emit('close')" title="关闭">
            ×
          </button>
          <button
            v-if="isSupported"
            class="mic-btn"
            :class="{ listening: isListening }"
            @click="toggleSpeech"
            :title="isListening ? '停止录音' : '开始录音'"
          >
            {{ isListening ? "🔴" : "🎤" }}
          </button>
        </div>
        <button class="send-btn" @click="send" :disabled="!input.trim()">
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ... existing styles ... */
.chat-input-wrapper {
  position: absolute;
  bottom: 100px; /* 调整到宠物上方 */
  left: 50%;
  transform: translateX(-50%);
  width: 220px;
  z-index: 100;
  animation: slide-up 0.2s ease-out;
  pointer-events: auto; /* 确保输入框可交互 */
}

.chat-input-container {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  padding: 10px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
}

textarea {
  width: 100%;
  border: none;
  background: transparent;
  resize: none;
  font-size: 13px;
  line-height: 1.4;
  color: #333;
  outline: none;
  font-family: inherit;
  margin-bottom: 8px;
}

textarea::placeholder {
  color: #999;
}

.actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.close-btn {
  background: none;
  border: none;
  color: #999;
  font-size: 18px;
  cursor: pointer;
  padding: 0 5px;
  line-height: 1;
}

.close-btn:hover {
  color: #666;
}

.mic-btn {
  background: none;
  border: none;
  font-size: 16px;
  cursor: pointer;
  padding: 4px;
  border-radius: 50%;
  transition: all 0.2s;
}

.mic-btn:hover {
  background: rgba(0, 0, 0, 0.05);
}

.mic-btn.listening {
  animation: pulse 1.5s infinite;
}

.send-btn {
  background: #89b4fa;
  color: white;
  border: none;
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;
}

.send-btn:hover {
  background: #74a2f0;
}

.send-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translate(-50%, 10px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

@keyframes pulse {
  0% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.4);
  }
  70% {
    transform: scale(1.1);
    box-shadow: 0 0 0 6px rgba(255, 0, 0, 0);
  }
  100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 0, 0, 0);
  }
}
</style>
