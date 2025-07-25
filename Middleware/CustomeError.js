// utils/CustomError.js
class CustomError extends Error {
    constructor(message, statusCode) {
      super(message);
      this.statusCode = statusCode||500;
      this.message = message || 'Something went wrong';
      this.isOperational = true; // To differentiate operational errors from programming errors
      Error.captureStackTrace(this, this.constructor);
    }
  }
  
  module.exports = {CustomError};
  