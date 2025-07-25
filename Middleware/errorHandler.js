// middleware/errorHandler.js
module.exports = (err, req, res, next) => {
  if (err.isOperational) {
    // Operational error, send as is
    return res.status(err.statusCode).json({
      status: 'fail',
      message: err.message,
    });
  }

  // If it's an unknown error, send a generic message
  console.error(err); // Log technical details for devs
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
  });
};
