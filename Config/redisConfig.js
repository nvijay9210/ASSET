// redisClient.js
const { createClient } = require("redis");
const {  writeLog } = require("../logs/logger");
require("dotenv").config();

// 🔐 Config
const REDIS_ENABLED = process.env.REDIS_ENABLED === "true"; // ✅ Control flag
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_EXPIRE_TIME = parseInt(process.env.REDIS_EXPIRE_TIME, 10) || 3600;

let redisClient = null;
let redisConnected = false;
let hasLoggedError = false;

// Create Redis client
const createRedisClient = () => {
  const client = createClient({
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT,
      tls: process.env.REDIS_TLS === "true" ? {} : undefined,
    },
    password: REDIS_PASSWORD,
  });

  client.on("connect", () => {
    redisConnected = true;
    hasLoggedError = false;
    writeLog("info", "✅ Connected to Redis");
  });

  client.on("error", (err) => {
    redisConnected = false;
    if (!hasLoggedError) {
      writeLog("warn", "❌ Redis is not connected. Feature performance may be degraded.");
      // writeLog("info", "💡 Tip: Run 'redis-server --requirepass <your-password>' if not running.");
      writeLog("info", "💡 Tip: Run 'npm run start-redis-dental' if not running.");
      hasLoggedError = true;
    }
  });

  client.on("reconnecting", () => {
    if (!hasLoggedError) {
      writeLog("warn", "🔄 Redis is reconnecting...");
      hasLoggedError = true;
    }
  });

  client.on("end", () => {
    redisConnected = false;
    writeLog("warn", "🔌 Redis connection ended");
  });

  return client;
};

// Lazy connect
const connect = async () => {
  if (!REDIS_ENABLED) return;
  if (redisConnected) return;

  if (!redisClient) {
    redisClient = createRedisClient();
  }

  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
    } catch (err) {
      writeLog("error", "❌ Redis connection failed:", err.message);
    }
  }
};

// ✅ Get or Set Cache
const getOrSetCache = async (cacheKey, fetchFunction, ttlSeconds = REDIS_EXPIRE_TIME) => {
  try {
    if (!REDIS_ENABLED) {
      return await fetchFunction(); // Just fetch directly from DB
    }
    
    if (!redisConnected) await connect();
    

    if (!redisConnected || !redisClient?.isOpen) {
      writeLog("warn", "⚠️ Redis unavailable – fetching directly from source");
      return await fetchFunction();
    }

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      writeLog("info", `⏪ Cache HIT: ${cacheKey}`);
      return JSON.parse(cached);
    }

    const freshData = await fetchFunction();
    if (freshData && (Array.isArray(freshData) || Object.keys(freshData).length > 0)) {
      await redisClient.set(cacheKey, JSON.stringify(freshData), { EX: ttlSeconds });
      writeLog("info", `✅ Cached: ${cacheKey} (TTL: ${ttlSeconds}s)`);
    }

    return freshData;
  } catch (err) {
    writeLog("warn", `⚠️ Redis GET/SET failed for ${cacheKey}: ${err.message}`);
    return await fetchFunction(); // Fallback
  }
};

// ✅ Scan keys matching a pattern
const scanKeys = async (pattern, count = 100) => {
  if (!redisClient?.isOpen || !redisConnected) {
    writeLog("warn", "🚫 Redis not connected – skipping scan");
    return [];
  }

  if (!REDIS_ENABLED) {
    return await fetchFunction(); // Just fetch directly from DB
  }
  

  const keys = [];
  let cursor = '0';
  let iterations = 0;
  const MAX_ITERATIONS = 200;

  try {
    do {
      if (iterations >= MAX_ITERATIONS) {
        writeLog("warn", "⚠️ Max scan iterations reached – breaking loop");
        break;
      }

      const reply = await redisClient.scan(cursor, { MATCH: pattern, COUNT: count });
      const [nextCursor, foundKeys] = Array.isArray(reply) ? reply : [reply.cursor, reply.keys || []];

      if (foundKeys?.length) keys.push(...foundKeys);
      cursor = nextCursor;
      iterations++;
    } while (cursor !== '0');
  } catch (err) {
    writeLog("error", "❌ Redis SCAN error:", err.message);
    return [];
  }

  writeLog("info", `🔍 Found ${keys.length} keys matching "${pattern}"`);
  return keys;
};

// ✅ Invalidate cache by pattern
const invalidateCacheByPattern = async (pattern) => {
  if (!redisClient?.isOpen || !redisConnected) {
    writeLog("warn", "🚫 Redis disconnected – skip invalidation");
    return;
  }

  try {
    const keys = await scanKeys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      writeLog("info", `🗑️ Deleted ${keys.length} keys matching "${pattern}"`);
    } else {
      writeLog("info", `ℹ️ No keys found for pattern: "${pattern}"`);
    }
  } catch (err) {
    writeLog("error", "❌ Cache invalidation failed:", err.message);
  }
};

// ✅ Invalidate cache by tenant
const invalidateCacheByTenant = async (tableName, tenantId) => {
  if (!tenantId) {
    writeLog("warn", "⚠️ Missing tenantId in invalidateCacheByTenant");
    return;
  }
  const pattern = `${tableName}:${tenantId}:*`;
  await invalidateCacheByPattern(pattern);
};

// ✅ Clear all Redis cache (Dev only)
const clearAllCache = async () => {
  const env = process.env.NODE_ENV;

  if (env === "production") {
    writeLog("warn", "🚨 clearAllCache is DISABLED in production for safety!");
    return;
  }

  if (!redisClient?.isOpen) {
    writeLog("warn", "🚫 Redis not connected – cannot clear cache");
    return;
  }

  try {
    await redisClient.flushDb();
    writeLog("info", `🧹 Redis DB cleared [${env}]`);
  } catch (err) {
    writeLog("error", "❌ Failed to clear Redis:", err.message);
  }
};

// ✅ Graceful shutdown
const closeRedis = async () => {
  if (redisClient?.isOpen) {
    writeLog("info", "🔌 Closing Redis connection...");
    await redisClient.quit();
  }
};

// Auto-connect on load
connect().catch(() => {});

module.exports = {
  redisClient: () => redisClient,
  connect,
  getOrSetCache,
  scanKeys,
  invalidateCacheByPattern,
  invalidateCacheByTenant,
  clearAllCache,
  closeRedis,
};
