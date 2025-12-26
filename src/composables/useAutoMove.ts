import { ref, onMounted, onUnmounted } from "vue";

/**
 * 自动移动/巡逻功能的组合式函数
 * 让宠物在屏幕上自动移动
 */
export function useAutoMove() {
  const isMoving = ref(false);
  const isPaused = ref(false);

  let moveInterval: ReturnType<typeof setInterval> | null = null;
  let currentDirection = { x: 1, y: 0 };
  let screenBounds = { width: 0, height: 0 };
  let position = { x: 0, y: 0 };

  // 移动速度（像素/帧）
  const SPEED = 2;
  // 更新间隔（毫秒）
  const UPDATE_INTERVAL = 50;
  // 窗口尺寸
  const WINDOW_SIZE = { width: 200, height: 250 };

  /**
   * 初始化屏幕边界
   */
  const initBounds = async () => {
    const screen = await window.electronAPI?.getScreenSize();
    if (screen) {
      screenBounds = screen;
    }
    const pos = await window.electronAPI?.getWindowPosition();
    if (pos) {
      position = { x: pos[0], y: pos[1] };
    }
  };

  /**
   * 随机改变方向
   */
  const changeDirection = () => {
    const directions = [
      { x: 1, y: 0 }, // 右
      { x: -1, y: 0 }, // 左
      { x: 0, y: 1 }, // 下
      { x: 0, y: -1 }, // 上
      { x: 1, y: 1 }, // 右下
      { x: 1, y: -1 }, // 右上
      { x: -1, y: 1 }, // 左下
      { x: -1, y: -1 }, // 左上
    ];
    currentDirection =
      directions[Math.floor(Math.random() * directions.length)];
  };

  /**
   * 移动一步
   */
  const moveStep = () => {
    if (isPaused.value) return;

    // 计算新位置
    let newX = position.x + currentDirection.x * SPEED;
    let newY = position.y + currentDirection.y * SPEED;

    // 边界检测和反弹
    if (newX < 0) {
      newX = 0;
      currentDirection.x = Math.abs(currentDirection.x);
    }
    if (newX > screenBounds.width - WINDOW_SIZE.width) {
      newX = screenBounds.width - WINDOW_SIZE.width;
      currentDirection.x = -Math.abs(currentDirection.x);
    }
    if (newY < 0) {
      newY = 0;
      currentDirection.y = Math.abs(currentDirection.y);
    }
    if (newY > screenBounds.height - WINDOW_SIZE.height) {
      newY = screenBounds.height - WINDOW_SIZE.height;
      currentDirection.y = -Math.abs(currentDirection.y);
    }

    // 更新位置
    position = { x: newX, y: newY };
    window.electronAPI?.setWindowPosition(newX, newY);
  };

  /**
   * 开始自动移动
   */
  const startMoving = async () => {
    if (isMoving.value) return;

    await initBounds();
    isMoving.value = true;
    changeDirection();

    moveInterval = setInterval(() => {
      moveStep();

      // 随机改变方向（5% 概率）
      if (Math.random() < 0.05) {
        changeDirection();
      }
    }, UPDATE_INTERVAL);

    // 一段时间后停止
    setTimeout(() => {
      stopMoving();
    }, 5000 + Math.random() * 10000); // 5-15秒后停止
  };

  /**
   * 停止自动移动
   */
  const stopMoving = () => {
    if (moveInterval) {
      clearInterval(moveInterval);
      moveInterval = null;
    }
    isMoving.value = false;
  };

  /**
   * 暂停/恢复移动
   */
  const togglePause = () => {
    isPaused.value = !isPaused.value;
  };

  // 组件卸载时清理
  onUnmounted(() => {
    stopMoving();
  });

  return {
    isMoving,
    isPaused,
    startMoving,
    stopMoving,
    togglePause,
  };
}
