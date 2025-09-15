const {  writeLog } = require("../logs/logger");


module.exports = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational || false;

  if (isOperational) {
    // Operational error (CustomError)
    writeLog('warn', err.message, req); // log as warning
    return res.status(statusCode).json({
      status: 'fail',
      message: err.message,
    });
  }

  // Programming or unknown error
  writeLog('error', err, req); // log full error with stack trace

  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
  });
};
