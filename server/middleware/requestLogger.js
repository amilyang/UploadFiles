/**
 * 请求日志中间件
 * 记录所有HTTP请求的详细信息
 */

export const requestLogger = (req, res, next) => {
  const start = Date.now();

  // 记录请求开始
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // 监听响应完成事件
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.url} - ${statusCode} - ${duration}ms`
    );
  });

  next();
};
