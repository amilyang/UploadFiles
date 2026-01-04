<template>
  <div v-if="fileTasks.length > 0" class="upload-queue">
    <div class="queue-header">
      <h3>上传队列</h3>
      <span class="queue-count">{{ fileTasks.length }} 个文件</span>
    </div>

    <div class="file-list">
      <div
        v-for="fileTask in fileTasks"
        :key="fileTask.id"
        class="file-item"
        :class="`file-item-${fileTask.status}`"
      >
        <!-- 文件信息 -->
        <div class="file-info">
          <div class="file-name">
            <span class="file-name-text">{{ fileTask.name }}</span>
            <span v-if="fileTask.status === 'completed'" class="status-badge completed">✓</span>
            <span v-else-if="fileTask.status === 'failed'" class="status-badge failed">✗</span>
            <span v-else-if="fileTask.status === 'paused'" class="status-badge paused">⏸</span>
          </div>
          <div class="file-size">{{ formatFileSize(fileTask.size) }}</div>
        </div>

        <!-- 进度条 -->
        <ProgressBar
          :progress="fileTask.progress"
          :status="fileTask.status"
          :uploaded-chunks="fileTask.uploadedChunks ?? 0"
          :total-chunks="fileTask.totalChunks ?? 0"
          :upload-speed="fileTask.uploadSpeed"
        />

        <!-- 操作按钮 -->
        <div class="file-actions">
          <button
            v-if="fileTask.status === 'uploading'"
            @click="$emit('pause', fileTask)"
            class="action-button pause-button"
            title="暂停上传"
          >
            <span class="button-icon">⏸</span>
            暂停
          </button>
          <button
            v-if="fileTask.status === 'paused'"
            @click="$emit('resume', fileTask)"
            class="action-button resume-button"
            title="继续上传"
          >
            <span class="button-icon">▶</span>
            继续
          </button>
          <button
            @click="$emit('remove', fileTask)"
            class="action-button remove-button"
            title="删除文件"
          >
            <span class="button-icon">🗑</span>
            删除
          </button>
        </div>

        <!-- 错误信息 -->
        <div v-if="fileTask.error" class="error-message">
          <span class="error-icon">⚠</span>
          {{ fileTask.error }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FormatFileSize, UploadQueueEmits, UploadQueueProps } from '../../types';
import ProgressBar from './ProgressBar.vue';

/**
 * 组件 Props
 */
defineProps<UploadQueueProps>();

/**
 * 组件事件
 */
defineEmits<UploadQueueEmits>();

/**
 * 格式化文件大小
 * @param bytes - 文件字节数
 * @returns 格式化后的文件大小
 */
const formatFileSize: FormatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};
</script>

<style scoped>
.upload-queue {
  margin-top: 30px;
}

.queue-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 2px solid #e0e0e0;
}

.queue-header h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
  font-weight: 600;
}

.queue-count {
  font-size: 14px;
  color: #666;
  background-color: #f5f5f5;
  padding: 4px 12px;
  border-radius: 12px;
}

.file-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.file-item {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 20px;
  background-color: #fff;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.file-item:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.file-item-completed {
  border-color: #4caf50;
  background-color: #f9fff9;
}

.file-item-failed {
  border-color: #f44336;
  background-color: #fff9f9;
}

.file-item-paused {
  border-color: #ff9800;
  background-color: #fffbf5;
}

.file-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.file-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #333;
  flex: 1;
  min-width: 0;
}

.file-name-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  font-size: 14px;
  flex-shrink: 0;
}

.status-badge.completed {
  background-color: #4caf50;
  color: white;
}

.status-badge.failed {
  background-color: #f44336;
  color: white;
}

.status-badge.paused {
  background-color: #ff9800;
  color: white;
}

.file-size {
  color: #666;
  font-size: 14px;
  flex-shrink: 0;
  margin-left: 10px;
}

.file-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.action-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.2s ease;
}

.action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.action-button:active {
  transform: translateY(0);
}

.button-icon {
  font-size: 14px;
}

.pause-button {
  background-color: #ff9800;
  color: white;
}

.pause-button:hover {
  background-color: #f57c00;
}

.resume-button {
  background-color: #2196f3;
  color: white;
}

.resume-button:hover {
  background-color: #1976d2;
}

.remove-button {
  background-color: #f44336;
  color: white;
}

.remove-button:hover {
  background-color: #d32f2f;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #f44336;
  font-size: 13px;
  margin-top: 12px;
  padding: 8px 12px;
  background-color: #fff5f5;
  border-radius: 4px;
  border-left: 3px solid #f44336;
}

.error-icon {
  font-size: 16px;
}
</style>
