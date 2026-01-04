<template>
  <div class="progress-section">
    <div class="progress-bar">
      <div class="progress-fill" :class="statusClass" :style="{ width: `${progress}%` }"></div>
    </div>
    <div class="progress-text">
      <span class="status-text">{{ statusText }}</span>
      <span v-if="showChunkInfo" class="chunk-info">
        ({{ uploadedChunks }}/{{ totalChunks }})
      </span>
      <span v-if="showSpeedInfo && uploadSpeed" class="speed-info">
        {{ speedText }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ProgressBarProps } from '../../types';

// 定义 props
const props = withDefaults(defineProps<ProgressBarProps>(), {
  progress: 0,
  status: 'pending',
  uploadedChunks: 0,
  totalChunks: 0,
  showChunkInfo: true,
  uploadSpeed: undefined,
});

// 计算状态文本
const statusText = computed(() => {
  switch (props.status) {
    case 'slicing':
      return '切片中...';
    case 'pending':
      return '等待中';
    case 'uploading':
      return `${props.progress}%`;
    case 'paused':
      return `已暂停 ${props.progress}%`;
    case 'completed':
      return '已完成';
    case 'failed':
      return '上传失败';
    default:
      return `${props.progress}%`;
  }
});

// 计算进度条样式类
const statusClass = computed(() => {
  return {
    'status-slicing': props.status === 'slicing',
    'status-uploading': props.status === 'uploading',
    'status-paused': props.status === 'paused',
    'status-completed': props.status === 'completed',
    'status-failed': props.status === 'failed',
  };
});

// 判断是否显示速度信息
const showSpeedInfo = computed(() => {
  return props.status === 'uploading' && props.uploadSpeed?.currentSpeed > 0;
});

// 格式化速度文本
const speedText = computed(() => {
  if (!props.uploadSpeed) return '';

  const { currentSpeed, averageSpeed, estimatedTime } = props.uploadSpeed;
  const speedStr = formatSpeed(currentSpeed);
  const timeStr = formatTime(estimatedTime);

  return `${speedStr} · 预计 ${timeStr}`;
});

// 格式化速度（KB/s 或 MB/s）
const formatSpeed = (speed: number): string => {
  if (speed >= 1024) {
    return `${(speed / 1024).toFixed(2)} MB/s`;
  }
  return `${speed.toFixed(2)} KB/s`;
};

// 格式化时间
const formatTime = (seconds: number): string => {
  if (seconds <= 0) return '0秒';

  if (seconds < 60) {
    return `${Math.round(seconds)}秒`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes}分${secs}秒`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}小时${minutes}分`;
  }
};
</script>

<style scoped>
.progress-section {
  margin-bottom: 15px;
}

.progress-bar {
  width: 100%;
  height: 8px;
  background-color: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
  position: relative;
}

.progress-fill {
  height: 100%;
  background-color: #4caf50;
  transition:
    width 0.3s ease,
    background-color 0.3s ease;
  border-radius: 4px;
}

/* 不同状态的进度条颜色 */
.status-slicing {
  background: linear-gradient(90deg, #ffa500, #ff8c00);
  animation: pulse 1.5s ease-in-out infinite;
}

.status-uploading {
  background: linear-gradient(90deg, #4caf50, #45a049);
}

.status-paused {
  background-color: #ff9800;
}

.status-completed {
  background: linear-gradient(90deg, #4caf50, #66bb6a);
}

.status-failed {
  background-color: #f44336;
}

/* 切片中的动画效果 */
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.progress-text {
  font-size: 12px;
  color: #666;
  display: flex;
  align-items: center;
  gap: 4px;
}

.status-text {
  font-weight: 500;
}

.chunk-info {
  color: #999;
  font-size: 11px;
}

.speed-info {
  color: #4caf50;
  font-size: 11px;
  font-weight: 500;
}
</style>
