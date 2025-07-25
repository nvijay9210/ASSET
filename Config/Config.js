module.exports = {
  port: process.env.PORT || 3000,
  db: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    pass: process.env.DB_PASS,
    name: process.env.DB_NAME,
  },
  photourl: process.env.PHOTO_URL,
  redisexpiretime: process.env.REDIS_EXPIRE_TIME,
  redisurl: process.env.REDIS_URL,
  // jwtSecret: process.env.JWT_SECRET,
  // logLevel: process.env.LOG_LEVEL || 'debug',
};
