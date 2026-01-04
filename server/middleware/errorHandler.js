/**
 * 统一错误处理中间件
 * 捕获并处理所有应用错误
 */

export const errorHandler = (err, req, res, next) => {
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
  });

  // 根据错误类型返回不同的状态码
  let statusCode = 500;
  let message = '服务器内部错误';

  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
  } else if (err.name === 'UnauthorizedError') {
    statusCode = 401;
    message = '未授权访问';
  } else if (err.name === 'NotFoundError') {
    statusCode = 404;
    message = '资源不存在';
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
