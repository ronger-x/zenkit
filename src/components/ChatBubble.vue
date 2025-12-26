<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface Props {
  text: string;
}

const props = defineProps<Props>();

// 配置 marked
marked.setOptions({
  breaks: true,  // 支持 GFM 换行
  gfm: true,     // 启用 GitHub Flavored Markdown
});

/**
 * 使用 marked 渲染 Markdown，并用 DOMPurify 净化 HTML
 */
const renderedText = computed(() => {
  const rawHtml = marked.parse(props.text, { async: false }) as string;
  // 使用 DOMPurify 净化 HTML，防止 XSS 攻击
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'del', 'code', 'pre', 'a', 'ul', 'ol', 'li', 'blockquote', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
    ALLOWED_ATTR: ['href', 'target', 'class'],
  });
});
</script>

<template>
  <div class="chat-bubble">
    <div class="bubble-content" v-html="renderedText"></div>
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

/* Markdown 样式 */
.bubble-content :deep(strong) {
  font-weight: 600;
}

.bubble-content :deep(em) {
  font-style: italic;
}

.bubble-content :deep(del) {
  text-decoration: line-through;
  opacity: 0.7;
}

.bubble-content :deep(.inline-code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 1px 4px;
  border-radius: 3px;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
}

.bubble-content :deep(.code-block) {
  background: rgba(0, 0, 0, 0.06);
  padding: 8px;
  border-radius: 6px;
  margin: 8px 0;
  overflow-x: auto;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 11px;
  white-space: pre-wrap;
}

.bubble-content :deep(.code-block code) {
  background: none;
  padding: 0;
}

.bubble-content :deep(.md-link) {
  color: #3b82f6;
  text-decoration: underline;
}

.bubble-content :deep(.md-heading) {
  display: block;
  margin: 8px 0 4px 0;
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
