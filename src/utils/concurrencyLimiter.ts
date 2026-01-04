/*
 * @Author: e0042176 e0042176@ceic.com
 * @Date: 2026-01-04 08:48:41
 * @LastEditors: e0042176 e0042176@ceic.com
 * @LastEditTime: 2026-01-04 08:53:19
 * @FilePath: \UploadFiles\src\utils\concurrencyLimiter.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koro1FileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
/**
 * 并发限流器
 * 用于控制并发任务的数量，避免同时发起过多请求
 */

import type { WaitingTask, LimiterStatus } from '../types';

export class ConcurrencyLimiter {
  private maxConcurrency: number;
  private runningCount: number;
  private waitingQueue: Map<string, WaitingTask>;

  constructor(maxConcurrency: number = 3) {
    this.maxConcurrency = maxConcurrency;
    this.runningCount = 0;
    this.waitingQueue = new Map(); // 使用 Map 存储等待的任务，key 为 taskId
  }

  /**
   * 执行任务
   * @param taskId - 任务ID，用于标识和移除任务
   * @param task - 要执行的任务函数
   */
  async execute<T>(taskId: string, task: () => Promise<T>): Promise<T> {
    // 如果任务已在运行或已完成，直接返回
    if (this.waitingQueue.has(taskId)) {
      console.log(`任务 ${taskId} 已在队列中`);
      return Promise.reject(new Error(`任务 ${taskId} 已在队列中`));
    }

    // 如果当前并发数已达到上限，将任务加入等待队列
    if (this.runningCount >= this.maxConcurrency) {
      return new Promise<T>((resolve, reject) => {
        this.waitingQueue.set(taskId, { task, resolve, reject });
      });
    }

    // 执行任务
    return this.runTask(taskId, task);
  }

  /**
   * 运行任务
   * @param taskId - 任务ID
   * @param task - 任务函数
   */
  private async runTask<T>(taskId: string, task: () => Promise<T>): Promise<T> {
    this.runningCount++;

    try {
      const result = await task();
      return result;
    } catch (error) {
      throw error;
    } finally {
      this.runningCount--;
      this.processNextTask();
    }
  }

  /**
   * 处理下一个等待的任务
   */
  private processNextTask(): void {
    if (this.waitingQueue.size > 0 && this.runningCount < this.maxConcurrency) {
      // 获取队列中的第一个任务
      const [taskId, { task, resolve, reject }] = this.waitingQueue.entries().next().value;
      this.waitingQueue.delete(taskId);

      // 执行任务
      this.runTask(taskId, task).then(resolve).catch(reject);
    }
  }

  /**
   * 从等待队列中移除指定任务
   * @param taskId - 任务ID
   */
  removeWaitingTaskById(taskId: string): void {
    if (this.waitingQueue.has(taskId)) {
      const { reject } = this.waitingQueue.get(taskId)!;
      this.waitingQueue.delete(taskId);
      // 拒绝该任务的 Promise，防止后续执行
      reject(new Error('任务已取消'));
      console.log(`任务 ${taskId} 已从等待队列中移除`);
    }
  }

  /**
   * 获取当前状态
   */
  getStatus(): LimiterStatus {
    return {
      runningCount: this.runningCount,
      waitingCount: this.waitingQueue.size,
      maxConcurrency: this.maxConcurrency,
    };
  }
}
