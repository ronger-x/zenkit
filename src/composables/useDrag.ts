import { ref, onMounted, onUnmounted } from "vue";

/**
 * 拖拽窗口的组合式函数
 * 通过 Electron IPC 移动整个窗口
 */
export function useDrag() {
  const isDragging = ref(false);
  const startPosition = ref({ x: 0, y: 0 });

  // 开始拖拽
  const startDrag = (event: MouseEvent) => {
    // 只响应左键
    if (event.button !== 0) return;

    isDragging.value = true;
    startPosition.value = {
      x: event.screenX,
      y: event.screenY,
    };

    // 添加全局事件监听
    document.addEventListener("mousemove", onDrag);
    document.addEventListener("mouseup", endDrag);
  };

  // 拖拽中
  const onDrag = (event: MouseEvent) => {
    if (!isDragging.value) return;

    const deltaX = event.screenX - startPosition.value.x;
    const deltaY = event.screenY - startPosition.value.y;

    // 移动窗口
    window.electronAPI?.moveWindow(deltaX, deltaY);

    // 更新起始位置
    startPosition.value = {
      x: event.screenX,
      y: event.screenY,
    };
  };

  // 结束拖拽
  const endDrag = () => {
    isDragging.value = false;

    // 移除全局事件监听
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", endDrag);
  };

  // 组件卸载时清理
  onUnmounted(() => {
    document.removeEventListener("mousemove", onDrag);
    document.removeEventListener("mouseup", endDrag);
  });

  return {
    isDragging,
    startDrag,
    onDrag,
    endDrag,
  };
}
