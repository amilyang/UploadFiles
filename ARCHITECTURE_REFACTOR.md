# 项目架构文档

## 概述

本项目已按照大中型项目的架构设计标准进行重构，采用前后端分离架构，前端使用 Vue 3 + TypeScript + Pinia，后端使用 Node.js + Express。

## 前端架构

### 目录结构

```
src/
├── assets/              # 静态资源
├── components/          # Vue组件
│   └── upload/         # 上传相关组件
│       ├── FileUpload.vue
│       ├── UploadIcon.vue
│       ├── ProgressBar.vue
│       └── UploadQueue.vue
├── composables/        # 组合式函数（业务逻辑复用）
│   ├── useFileUpload.ts    # 文件上传核心逻辑
│   └── useChunkManager.ts  # 分片管理逻辑
├── services/           # API服务层
│   └── uploadService.ts    # 上传相关API调用
├── stores/             # Pinia状态管理
│   ├── uploadStore.ts      # 上传状态管理
│   └── userStore.ts        # 用户状态管理
├── types/              # TypeScript类型定义
├── utils/              # 工具函数
│   └── concurrencyLimiter.ts  # 并发控制
├── workers/            # Web Worker
│   └── fileSliceWorker.ts    # 文件切片Worker
├── router/             # 路由配置
├── App.vue             # 根组件
└── main.ts             # 应用入口
```

### 核心设计模式

#### 1. 组合式函数（Composables）

**useFileUpload.ts**
- 职责：封装文件上传的完整流程
- 功能：文件选择、拖放处理、哈希计算、分片上传、并发控制
- 优势：逻辑复用、测试友好、关注点分离

**useChunkManager.ts**
- 职责：管理文件分片的上传逻辑
- 功能：智能分片大小调整、重试机制、并发控制
- 优势：独立的分片管理策略，易于优化

#### 2. 服务层（Services）

**uploadService.ts**
- 职责：封装所有与后端API的交互
- 功能：文件验证、分片上传、文件合并
- 优势：统一的API调用管理，便于维护和测试

#### 3. 状态管理（Pinia Stores）

**uploadStore.ts**
- 职责：管理全局上传状态
- 功能：文件列表、上传进度、上传状态
- 优势：跨组件状态共享、响应式更新

**userStore.ts**
- 职责：管理用户认证和权限
- 功能：登录、注册、权限检查
- 优势：统一的用户状态管理

## 后端架构

### 目录结构

```
server/
├── config/             # 配置管理
│   └── index.js        # 统一配置导出
├── controllers/        # 控制器层
│   └── upload.controller.js  # 上传控制器（multer配置）
├── services/           # 业务逻辑层
│   └── upload.service.js     # 上传业务逻辑
├── middleware/         # 中间件
│   ├── errorHandler.js       # 错误处理
│   └── requestLogger.js     # 请求日志
├── routes/             # 路由层
│   ├── upload.routes.js     # 上传路由
│   └── health.routes.js    # 健康检查路由
├── utils/              # 工具函数
├── .env.example        # 环境变量示例
└── index.js            # 应用入口
```

### 核心设计模式

#### 1. MVC架构

**Controllers（控制器）**
- 职责：处理HTTP请求和响应
- 示例：upload.controller.js 配置multer文件上传

**Services（服务层）**
- 职责：实现核心业务逻辑
- 示例：upload.service.js 处理文件验证、分片保存、文件合并

**Routes（路由）**
- 职责：定义API端点
- 示例：upload.routes.js 定义上传相关路由

#### 2. 中间件模式

**errorHandler.js**
- 职责：统一错误处理
- 功能：捕获错误、记录日志、返回标准错误响应

**requestLogger.js**
- 职责：请求日志记录
- 功能：记录请求方法、URL、响应时间

#### 3. 配置管理

**config/index.js**
- 职责：集中管理所有配置
- 功能：服务器配置、上传配置、日志配置、CORS配置
- 优势：配置集中管理、环境变量支持、配置验证

## 技术栈

### 前端
- **框架**：Vue 3（Composition API）
- **语言**：TypeScript
- **状态管理**：Pinia
- **构建工具**：Vite
- **代码规范**：ESLint + Prettier
- **并发控制**：自定义ConcurrencyLimiter
- **文件处理**：Web Worker

### 后端
- **运行时**：Node.js
- **框架**：Express
- **文件上传**：Multer
- **文件系统**：fs-extra
- **配置管理**：dotenv
- **代码规范**：ESLint + Prettier

## 核心功能实现

### 1. 文件上传流程

```
用户选择文件
    ↓
计算文件哈希（Web Worker）
    ↓
文件切片（Web Worker）
    ↓
验证文件（断点续传/秒传）
    ↓
分片上传（并发控制）
    ↓
文件合并
    ↓
完成
```

### 2. 断点续传

- 前端：记录已上传分片索引
- 后端：保存上传记录（record.json）
- 恢复：验证接口返回已上传分片列表

### 3. 秒传

- 前端：发送文件哈希
- 后端：检查文件是否已存在
- 秒传：文件已存在则直接返回成功

### 4. 并发控制

- 前端：ConcurrencyLimiter限制并发上传数量
- 后端：配置MAX_CONCURRENT_UPLOADS

### 5. 错误处理

- 前端：try-catch捕获错误，显示错误信息
- 后端：统一错误处理中间件

## 性能优化

### 1. Web Worker
- 哈希计算在Worker中执行，不阻塞主线程
- 文件切片在Worker中执行，提升响应速度

### 2. 智能分片
- 根据文件大小动态调整分片大小
- 小文件：2MB，中等文件：5MB，大文件：10MB

### 3. 并发上传
- 默认3个并发上传
- 可配置并发数量

### 4. 断点续传
- 支持中断后继续上传
- 避免重复上传已完成的分片

### 5. 秒传
- 相同文件秒传，节省带宽和时间

## 安全性

### 1. 文件验证
- 文件大小限制（2GB）
- 文件类型验证（可扩展）
- 文件哈希验证

### 2. 错误处理
- 统一错误处理
- 敏感信息不泄露
- 错误日志记录

### 3. CORS配置
- 可配置的CORS策略
- 支持跨域请求

## 扩展性

### 1. 模块化设计
- 前端：composables、services、stores分离
- 后端：controllers、services、middleware分离

### 2. 配置化
- 所有配置集中在config/index.js
- 支持环境变量

### 3. 插件化
- 中间件可扩展
- 路由可扩展

### 4. 服务层抽象
- 业务逻辑独立
- 易于测试和维护

## 待优化项

1. **日志系统**：集成Winston日志库
2. **Web Worker池化**：优化Worker创建和销毁
3. **认证授权**：添加JWT认证和权限控制
4. **单元测试**：添加单元测试和集成测试
5. **监控告警**：添加性能监控和错误告警
6. **数据库**：集成数据库存储文件元数据
7. **缓存**：使用Redis缓存上传状态
8. **CDN**：集成CDN加速文件上传和下载

## 开发指南

### 前端开发

1. 安装依赖：`npm install`
2. 启动开发服务器：`npm run dev`
3. 代码格式化：`npm run format`
4. 代码检查：`npm run lint`

### 后端开发

1. 安装依赖：`npm install`
2. 配置环境变量：复制`.env.example`到`.env`
3. 启动服务器：`npm run dev:backend`
4. 代码格式化：`npm run format`

### 代码规范

- 使用TypeScript编写类型安全的代码
- 遵循ESLint和Prettier配置
- 编写清晰的注释
- 遵循单一职责原则
- 编写可测试的代码

## 总结

本项目已按照大中型项目的架构设计标准进行重构，采用了现代化的技术栈和最佳实践。项目具有良好的可维护性、可扩展性和可测试性，为后续的功能迭代和性能优化打下了坚实的基础。
