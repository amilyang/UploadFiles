# 大文件上传 - 大中型项目实现方案

## 📊 目录

1. [当前实现 vs 大中型项目对比](#当前实现-vs-大中型项目对比)
2. [大中型项目架构设计](#大中型项目架构设计)
3. [核心技术栈](#核心技术栈)
4. [性能优化策略](#性能优化策略)
5. [安全性考虑](#安全性考虑)
6. [监控与日志](#监控与日志)
7. [部署方案](#部署方案)

---

## 当前实现 vs 大中型项目对比

### 当前实现（小型项目）

```
UploadFiles/
├── server/
│   └── index.js          # 所有后端逻辑（361行）
├── src/
│   ├── views/
│   │   └── FileUpload.vue    # 所有前端逻辑（508行）
│   └── workers/
│       └── fileSliceWorker.js  # 文件切片Worker
└── package.json
```

**特点：**
- ✅ 代码集中，易于理解
- ✅ 快速开发，适合原型
- ⚠️ 单文件过大，维护困难
- ⚠️ 缺少错误监控和日志
- ⚠️ 没有用户认证和权限控制

---

## 大中型项目架构设计

### 推荐目录结构

```
large-file-upload/
├── client/                          # 前端项目
│   ├── src/
│   │   ├── components/
│   │   │   ├── upload/
│   │   │   │   ├── FileUpload.vue          # 主上传组件
│   │   │   │   ├── UploadQueue.vue         # 上传队列管理
│   │   │   │   ├── ProgressBar.vue         # 进度条组件
│   │   │   │   ├── ChunkUploader.vue       # 分片上传器
│   │   │   │   └── UploadHistory.vue       # 上传历史
│   │   │   └── common/
│   │   │       ├── ErrorBoundary.vue       # 错误边界
│   │   │       └── LoadingSpinner.vue      # 加载动画
│   │   ├── composables/
│   │   │   ├── useFileUpload.js            # 上传逻辑Hook
│   │   │   ├── useChunkManager.js          # 分片管理Hook
│   │   │   ├── useUploadQueue.js           # 队列管理Hook
│   │   │   └── useWebSocket.js             # WebSocket连接Hook
│   │   ├── services/
│   │   │   ├── uploadService.js            # 上传API服务
│   │   │   ├── authService.js              # 认证服务
│   │   │   └── websocketService.js         # WebSocket服务
│   │   ├── stores/
│   │   │   ├── uploadStore.js              # 上传状态管理
│   │   │   └── userStore.js                # 用户状态管理
│   │   ├── utils/
│   │   │   ├── hashUtils.js                # 哈希计算工具
│   │   │   ├── fileUtils.js                # 文件处理工具
│   │   │   └── storageUtils.js             # 存储工具
│   │   ├── workers/
│   │   │   ├── fileSliceWorker.js          # 文件切片Worker
│   │   │   ├── hashWorker.js               # 哈希计算Worker
│   │   │   └── uploadWorker.js             # 上传Worker池
│   │   └── main.js
│   ├── public/
│   │   └── sw.js                           # Service Worker
│   └── package.json
│
├── server/                          # 后端项目
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── uploadController.js         # 上传控制器
│   │   │   ├── authController.js           # 认证控制器
│   │   │   └── fileController.js           # 文件管理控制器
│   │   ├── services/
│   │   │   ├── uploadService.js            # 上传业务逻辑
│   │   │   ├── chunkService.js             # 分片处理服务
│   │   │   ├── mergeService.js             # 合并服务
│   │   │   ├── storageService.js           # 存储服务（OSS/S3）
│   │   │   └── cacheService.js            # 缓存服务（Redis）
│   │   ├── middleware/
│   │   │   ├── authMiddleware.js           # 认证中间件
│   │   │   ├── rateLimitMiddleware.js      # 限流中间件
│   │   │   ├── uploadMiddleware.js        # 上传中间件
│   │   │   └── errorMiddleware.js          # 错误处理中间件
│   │   ├── routes/
│   │   │   ├── uploadRoutes.js             # 上传路由
│   │   │   ├── authRoutes.js               # 认证路由
│   │   │   └── fileRoutes.js               # 文件路由
│   │   ├── models/
│   │   │   ├── File.js                     # 文件模型
│   │   │   ├── User.js                     # 用户模型
│   │   │   └── UploadRecord.js             # 上传记录模型
│   │   ├── utils/
│   │   │   ├── hashUtils.js                # 哈希工具
│   │   │   ├── fileUtils.js                # 文件工具
│   │   │   └── logger.js                   # 日志工具
│   │   ├── config/
│   │   │   ├── index.js                    # 配置文件
│   │   │   ├── uploadConfig.js             # 上传配置
│   │   │   └── storageConfig.js            # 存储配置
│   │   ├── jobs/
│   │   │   ├── cleanupJob.js               # 清理任务
│   │   │   └── mergeJob.js                 # 合并任务
│   │   └── app.js
│   ├── tests/
│   │   ├── unit/
│   │   ├── integration/
│   │   └── e2e/
│   └── package.json
│
├── shared/                          # 共享代码
│   ├── constants/
│   │   ├── uploadConstants.js            # 上传常量
│   │   └── errorCodes.js                  # 错误码
│   └── types/
│       └── uploadTypes.js                # TypeScript类型定义
│
└── docker-compose.yml               # Docker编排
```

---

## 核心技术栈

### 前端技术栈

| 技术 | 用途 | 推荐版本 |
|------|------|----------|
| **Vue 3** | 前端框架 | ^3.3.0 |
| **TypeScript** | 类型安全 | ^5.0.0 |
| **Pinia** | 状态管理 | ^2.1.0 |
| **Vue Router** | 路由管理 | ^4.2.0 |
| **Vite** | 构建工具 | ^5.0.0 |
| **SparkMD5** | 文件哈希计算 | ^3.0.2 |
| **Axios** | HTTP客户端 | ^1.6.0 |
| **Socket.io-client** | WebSocket客户端 | ^4.6.0 |
| **Workbox** | Service Worker工具 | ^7.0.0 |

### 后端技术栈

| 技术 | 用途 | 推荐版本 |
|------|------|----------|
| **Node.js** | 运行时 | ^20.0.0 |
| **Express** | Web框架 | ^4.18.0 |
| **TypeScript** | 类型安全 | ^5.0.0 |
| **MongoDB** | 主数据库 | ^7.0.0 |
| **Redis** | 缓存/队列 | ^7.0.0 |
| **Bull** | 任务队列 | ^4.12.0 |
| **Socket.io** | WebSocket服务 | ^4.6.0 |
| **AWS S3 / 阿里云OSS** | 对象存储 | - |
| **Multer** | 文件上传中间件 | ^1.4.5 |
| **Winston** | 日志管理 | ^3.11.0 |
| **Prometheus** | 监控指标 | - |

---

## 性能优化策略

### 1. 前端优化

#### 1.1 Web Worker 池化

```javascript
// workers/uploadWorkerPool.js
class UploadWorkerPool {
  constructor(maxWorkers = 4) {
    this.workers = []
    this.queue = []
    this.maxWorkers = maxWorkers
  }

  // 初始化Worker池
  init() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker('./uploadWorker.js')
      this.workers.push({
        worker,
        busy: false
      })
    }
  }

  // 获取空闲Worker
  getWorker() {
    return this.workers.find(w => !w.busy)
  }

  // 执行任务
  async execute(task) {
    const workerObj = this.getWorker()
    
    if (!workerObj) {
      // 等待空闲Worker
      return new Promise(resolve => {
        this.queue.push({ task, resolve })
      })
    }

    workerObj.busy = true
    const result = await this.runTask(workerObj.worker, task)
    workerObj.busy = false
    
    // 处理队列
    if (this.queue.length > 0) {
      const next = this.queue.shift()
      this.execute(next.task).then(next.resolve)
    }
    
    return result
  }

  runTask(worker, task) {
    return new Promise((resolve, reject) => {
      worker.onmessage = (e) => {
        if (e.data.type === 'TASK_COMPLETE') {
          resolve(e.data.result)
        }
      }
      worker.onerror = reject
      worker.postMessage(task)
    })
  }
}
```

#### 1.2 分片上传优化

```javascript
// composables/useChunkManager.js
import { ref } from 'vue'

export function useChunkManager() {
  const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB
  const MAX_RETRIES = 3
  const RETRY_DELAY = 1000

  // 智能分片大小调整
  const calculateOptimalChunkSize = (fileSize, networkSpeed) => {
    // 根据文件大小和网络速度动态调整
    if (fileSize < 100 * 1024 * 1024) {
      return 2 * 1024 * 1024 // 小文件：2MB
    } else if (fileSize < 1024 * 1024 * 1024) {
      return 5 * 1024 * 1024 // 中文件：5MB
    } else {
      return 10 * 1024 * 1024 // 大文件：10MB
    }
  }

  // 带重试的上传
  const uploadWithRetry = async (chunk, retries = MAX_RETRIES) => {
    for (let i = 0; i < retries; i++) {
      try {
        return await uploadChunk(chunk)
      } catch (error) {
        if (i === retries - 1) throw error
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * (i + 1)))
      }
    }
  }

  // 并发控制
  const uploadChunksInParallel = async (chunks, maxConcurrency = 3) => {
    const results = []
    const executing = []

    for (const chunk of chunks) {
      const promise = uploadWithRetry(chunk).then(result => {
        executing.splice(executing.indexOf(promise), 1)
        return result
      })

      results.push(promise)
      executing.push(promise)

      if (executing.length >= maxConcurrency) {
        await Promise.race(executing)
      }
    }

    return Promise.all(results)
  }

  return {
    calculateOptimalChunkSize,
    uploadWithRetry,
    uploadChunksInParallel
  }
}
```

#### 1.3 哈希计算优化

```javascript
// utils/hashUtils.js
import SparkMD5 from 'spark-md5'

export class HashCalculator {
  constructor() {
    this.worker = null
  }

  // 使用Worker计算文件哈希
  async calculateFileHash(file, chunkSize = 2 * 1024 * 1024) {
    return new Promise((resolve, reject) => {
      const spark = new SparkMD5.ArrayBuffer()
      const reader = new FileReader()
      const chunks = Math.ceil(file.size / chunkSize)
      let currentChunk = 0

      reader.onload = (e) => {
        spark.append(e.target.result)
        currentChunk++

        if (currentChunk < chunks) {
          loadNext()
        } else {
          const hash = spark.end()
          resolve(hash)
        }
      }

      reader.onerror = reject

      const loadNext = () => {
        const start = currentChunk * chunkSize
        const end = Math.min(start + chunkSize, file.size)
        reader.readAsArrayBuffer(file.slice(start, end))
      }

      loadNext()
    })
  }

  // 增量哈希计算（用于断点续传）
  async calculateChunkHash(chunk) {
    return new Promise((resolve, reject) => {
      const spark = new SparkMD5.ArrayBuffer()
      const reader = new FileReader()

      reader.onload = (e) => {
        spark.append(e.target.result)
        resolve(spark.end())
      }

      reader.onerror = reject
      reader.readAsArrayBuffer(chunk)
    })
  }
}
```

### 2. 后端优化

#### 2.1 使用 Redis 缓存上传状态

```javascript
// services/cacheService.js
import Redis from 'ioredis'

class CacheService {
  constructor() {
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD
    })
  }

  // 保存上传进度
  async saveUploadProgress(fileHash, data) {
    const key = `upload:${fileHash}`
    await this.redis.setex(key, 3600, JSON.stringify(data)) // 1小时过期
  }

  // 获取上传进度
  async getUploadProgress(fileHash) {
    const key = `upload:${fileHash}`
    const data = await this.redis.get(key)
    return data ? JSON.parse(data) : null
  }

  // 更新已上传分片
  async addUploadedChunk(fileHash, chunkIndex) {
    const key = `upload:${fileHash}:chunks`
    await this.redis.sadd(key, chunkIndex)
    await this.redis.expire(key, 3600)
  }

  // 获取已上传分片
  async getUploadedChunks(fileHash) {
    const key = `upload:${fileHash}:chunks`
    const chunks = await this.redis.smembers(key)
    return chunks.map(Number)
  }

  // 删除上传记录
  async deleteUploadRecord(fileHash) {
    await this.redis.del(`upload:${fileHash}`)
    await this.redis.del(`upload:${fileHash}:chunks`)
  }
}

export default new CacheService()
```

#### 2.2 使用 Bull 任务队列处理合并

```javascript
// jobs/mergeJob.js
import Queue from 'bull'
import path from 'path'
import fs from 'fs-extra'
import cacheService from '../services/cacheService.js'

const mergeQueue = new Queue('file-merge', {
  redis: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
  }
})

// 处理合并任务
mergeQueue.process(async (job) => {
  const { fileHash, fileName, totalChunks } = job.data

  const uploadDir = path.join(process.env.UPLOAD_DIR, fileHash)
  const tempChunkDir = path.join(uploadDir, 'temp_chunks')
  const filePath = path.join(uploadDir, fileName)

  // 按顺序合并分片
  const writeStream = fs.createWriteStream(filePath)

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(tempChunkDir, `${i}`)
    const chunkData = await fs.readFile(chunkPath)
    writeStream.write(chunkData)
    await fs.remove(chunkPath)
  }

  writeStream.end()

  // 清理临时目录和缓存
  await fs.remove(tempChunkDir)
  await cacheService.deleteUploadRecord(fileHash)

  return { success: true, filePath }
})

// 添加合并任务
export const addMergeJob = (data) => {
  return mergeQueue.add(data, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    }
  })
}

export default mergeQueue
```

#### 2.3 使用对象存储（S3/OSS）

```javascript
// services/storageService.js
import AWS from 'aws-sdk'
import fs from 'fs-extra'

class StorageService {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    })
  }

  // 上传分片到S3
  async uploadChunk(fileHash, chunkIndex, chunkData) {
    const key = `uploads/${fileHash}/chunks/${chunkIndex}`
    
    await this.s3.upload({
      Bucket: process.env.AWS_BUCKET,
      Key: key,
      Body: chunkData
    }).promise()
  }

  // 合并S3分片
  async mergeChunks(fileHash, fileName, totalChunks) {
    const parts = []
    
    for (let i = 0; i < totalChunks; i++) {
      const key = `uploads/${fileHash}/chunks/${i}`
      const head = await this.s3.headObject({
        Bucket: process.env.AWS_BUCKET,
        Key: key
      }).promise())
      
      parts.push({
        PartNumber: i + 1,
        ETag: head.ETag
      })
    }

    // 创建合并后的文件
    const result = await this.s3.completeMultipartUpload({
      Bucket: process.env.AWS_BUCKET,
      Key: `uploads/${fileHash}/${fileName}`,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts
      }
    }).promise()

    // 清理分片
    for (let i = 0; i < totalChunks; i++) {
      await this.s3.deleteObject({
        Bucket: process.env.AWS_BUCKET,
        Key: `uploads/${fileHash}/chunks/${i}`
      }).promise()
    }

    return result.Location
  }
}

export default new StorageService()
```

---

## 安全性考虑

### 1. 文件类型验证

```javascript
// middleware/uploadMiddleware.js
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
  'application/zip',
  'video/mp4',
  'video/quicktime'
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024 // 10GB

export const validateFile = (req, res, next) => {
  const { file } = req

  if (!file) {
    return res.status(400).json({ error: '没有文件' })
  }

  // 检查文件大小
  if (file.size > MAX_FILE_SIZE) {
    return res.status(400).json({ error: '文件大小超过限制' })
  }

  // 检查文件类型
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return res.status(400).json({ error: '不支持的文件类型' })
  }

  // 检查文件扩展名
  const ext = path.extname(file.originalname).toLowerCase()
  const ALLOWED_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.pdf', '.zip', '.mp4', '.mov']
  
  if (!ALLOWED_EXTS.includes(ext)) {
    return res.status(400).json({ error: '不支持的文件扩展名' })
  }

  next()
}
```

### 2. 病毒扫描

```javascript
// services/scanService.js
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export const scanFile = async (filePath) => {
  try {
    // 使用ClamAV扫描文件
    const { stdout } = await execAsync(`clamscan ${filePath}`)
    
    if (stdout.includes('FOUND')) {
      throw new Error('文件包含病毒')
    }
    
    return { clean: true }
  } catch (error) {
    throw new Error('病毒扫描失败')
  }
}
```

### 3. 访问控制

```javascript
// middleware/authMiddleware.js
import jwt from 'jsonwebtoken'

export const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]

  if (!token) {
    return res.status(401).json({ error: '未授权' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ error: '无效的令牌' })
  }
}

export const authorize = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: '权限不足' })
    }
    next()
  }
}
```

---

## 监控与日志

### 1. 日志管理

```javascript
// utils/logger.js
import winston from 'winston'

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }))
}

export default logger
```

### 2. 监控指标

```javascript
// utils/metrics.js
import client from 'prom-client'

// 上传指标
export const uploadDuration = new client.Histogram({
  name: 'upload_duration_seconds',
  help: '上传持续时间',
  labelNames: ['status', 'file_size']
})

export const activeUploads = new client.Gauge({
  name: 'active_uploads',
  help: '当前活跃的上传数'
})

export const uploadErrors = new client.Counter({
  name: 'upload_errors_total',
  help: '上传错误总数',
  labelNames: ['error_type']
})
```

---

## 部署方案

### Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  # 前端服务
  frontend:
    build: ./client
    ports:
      - "8080:80"
    depends_on:
      - backend

  # 后端服务
  backend:
    build: ./server
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/upload
      - REDIS_HOST=redis
      - REDIS_PORT=6379
    depends_on:
      - mongodb
      - redis
    volumes:
      - ./uploads:/app/uploads

  # MongoDB
  mongodb:
    image: mongo:7
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  # Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  # Nginx
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

volumes:
  mongodb_data:
  redis_data:
```

---

## 总结

### 当前实现 vs 大中型项目

| 特性 | 当前实现 | 大中型项目 |
|------|----------|------------|
| **代码组织** | 单文件 | 模块化分层 |
| **状态管理** | Reactive | Pinia |
| **并发控制** | 简单限流 | Worker池 + 任务队列 |
| **存储** | 本地文件系统 | 对象存储（S3/OSS） |
| **缓存** | 无 | Redis |
| **数据库** | 无 | MongoDB |
| **监控** | 无 | Prometheus + Grafana |
| **日志** | Console | Winston |
| **安全性** | 基础 | 完整的认证授权 |
| **部署** | 手动 | Docker + K8s |

### 迁移建议

1. **渐进式迁移**：先优化前端，再重构后端
2. **保持兼容**：API接口保持向后兼容
3. **充分测试**：每个阶段都要进行完整测试
4. **监控先行**：先建立监控，再进行优化

---

**文档版本**：1.0  
**最后更新**：2024-01-04  
**作者**：DevFront
