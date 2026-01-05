<template>
  <div class="file-upload-container">
    <div
      class="upload-area"
      :class="{ 'drag-over': isDragOver }"
      @dragover.prevent="isDragOver = true"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="handleDropLocal"
      @click="handleClick"
    >
      <UploadIcon />
      <p class="upload-text">拖放文件到这里，或</p>
      <button class="upload-button">点击选择</button>
      <p class="upload-hint">支持单个文件最大2GB</p>
      <input
        ref="fileInput"
        type="file"
        multiple
        @change="handleFileSelect"
        style="display: none"
      />
    </div>

    <UploadQueue
      :file-tasks="fileTasks"
      @pause="pauseUpload"
      @resume="resumeUpload"
      @remove="removeFile"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useFileUpload } from '../../composables/useFileUpload';
import UploadIcon from './UploadIcon.vue';
import UploadQueue from './UploadQueue.vue';

// 使用文件上传组合式函数
const {
  files,
  handleDrop,
  uploadFile,
  cancelUpload,
  retryUpload,
  handleFileSelect: useFileUploadHandleFileSelect,
} = useFileUpload();

// 拖拽状态
const isDragOver = ref(false);

// 文件输入框引用
const fileInput = ref<HTMLInputElement | null>(null);

// 计算属性：文件任务（与UploadQueue组件兼容）
const fileTasks = computed(() => files.value);

// 处理点击上传区域
const handleClick = () => {
  fileInput.value?.click();
};

// 自动开始上传文件
const startUploadFiles = async (filesToUpload: File[]) => {
  for (const file of filesToUpload) {
    try {
      await uploadFile(file);
    } catch (error) {
      console.error('Upload failed:', error);
    }
  }
};

// 处理文件选择（使用useFileUpload的方法，然后自动开始上传）
const handleFileSelect = async (e: Event) => {
  const target = e.target as HTMLInputElement;
  const selectedFiles = Array.from(target.files || []);

  // 使用useFileUpload的handleFileSelect方法添加文件到队列
  useFileUploadHandleFileSelect(e);

  // 自动开始上传
  await startUploadFiles(selectedFiles);
};

// 处理拖拽放置
const handleDropLocal = async (event: DragEvent) => {
  // 获取拖拽的文件
  const droppedFiles = Array.from(event.dataTransfer?.files || []);

  // 调用useFileUpload的handleDrop方法添加文件到队列
  handleDrop(event);

  isDragOver.value = false;

  // 自动开始上传
  await startUploadFiles(droppedFiles);
};

// 暂停上传
const pauseUpload = (fileTask: any) => {
  cancelUpload(fileTask.id);
};

// 恢复上传
const resumeUpload = async (fileTask: any) => {
  await retryUpload(fileTask.id);
};

// 删除文件
const removeFile = (fileTask: any) => {
  const index = files.value.findIndex((f) => f.id === fileTask.id);
  if (index !== -1) {
    files.value.splice(index, 1);
  }
};
</script>

<style scoped>
.file-upload-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.upload-area {
  border: 2px dashed #ccc;
  border-radius: 8px;
  padding: 40px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:hover {
  border-color: #4caf50;
  background-color: #f9f9f9;
}

.upload-area.drag-over {
  border-color: #4caf50;
  background-color: #e8f5e9;
}

.upload-text {
  font-size: 16px;
  color: #333;
  margin-bottom: 10px;
}

.upload-button {
  background-color: #4caf50;
  color: white;
  border: none;
  padding: 10px 30px;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
  margin-bottom: 10px;
}

.upload-button:hover {
  background-color: #45a049;
}

.upload-hint {
  font-size: 12px;
  color: #999;
}
</style>
