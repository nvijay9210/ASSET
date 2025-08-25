const { createClient } = require("redis");
require("dotenv").config();

// 🔐 Config
const REDIS_HOST = process.env.REDIS_HOST || "127.0.0.1";
const REDIS_PORT = parseInt(process.env.REDIS_PORT) || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
const REDIS_EXPIRE_TIME = parseInt(process.env.REDIS_EXPIRE_TIME, 10) || 3600;

let redisClient = null;
let redisConnected = false;
let hasLoggedError = false; // ✅ Track if error was already logged

// Create Redis client
const createRedisClient = () => {
  const client = createClient({
    socket: {
      host: REDIS_HOST,
      port: REDIS_PORT,
      tls: process.env.REDIS_TLS === "true" ? {} : undefined, // Enable TLS for cloud
    },
    password: REDIS_PASSWORD,
  });

  client.on("connect", () => {
    redisConnected = true;
    hasLoggedError = false; // ✅ Reset on successful connect
    console.log("✅ Connected to Redis");
  });

  client.on("error", (err) => {
    redisConnected = false;
    if (!hasLoggedError) {
      console.error("❌ Redis is not connected. Feature performance may be degraded.");
      console.error("💡 Tip: Run 'redis-server --requirepass <your-password>' if not running.");
      hasLoggedError = true;
    }
  });

  client.on("reconnecting", () => {
    if (!hasLoggedError) {
      console.warn("🔄 Redis is reconnecting...");
      hasLoggedError = true;
    }
  });

  client.on("end", () => {
    redisConnected = false;
    console.warn("🔌 Redis connection ended");
  });

  return client;
};

// Lazy connect
const connect = async () => {
  if (redisConnected) return;

  if (!redisClient) {
    redisClient = createRedisClient();
  }

  if (!redisClient.isOpen) {
    try {
      await redisClient.connect();
    } catch (err) {
      // Error already handled by 'error' event
    }
  }
};

// ✅ Get or Set Cache
const getOrSetCache = async (cacheKey, fetchFunction, ttlSeconds = REDIS_EXPIRE_TIME) => {
  try {
    if (!redisConnected) await connect();

    if (!redisConnected || !redisClient?.isOpen) {
      console.warn("⚠️ Redis unavailable – fetching directly from source");
      return await fetchFunction();
    }

    const cached = await redisClient.get(cacheKey);
    if (cached) {
      console.log(`⏪ Cache HIT: ${cacheKey}`);
      return JSON.parse(cached);
    }

    const freshData = await fetchFunction();
    if (freshData && (Array.isArray(freshData) || Object.keys(freshData).length > 0)) {
      await redisClient.set(cacheKey, JSON.stringify(freshData), { EX: ttlSeconds });
      console.log(`✅ Cached: ${cacheKey} (TTL: ${ttlSeconds}s)`);
    }

    return freshData;
  } catch (err) {
    console.warn(`⚠️ Redis GET/SET failed for ${cacheKey}:`, err.message);
    return await fetchFunction(); // Fallback
  }
};

// ✅ Scan keys matching a pattern
const scanKeys = async (pattern, count = 100) => {
  if (!redisClient?.isOpen || !redisConnected) {
    console.warn("🚫 Redis not connected – skipping scan");
    return [];
  }

  const keys = [];
  let cursor = '0';
  let iterations = 0;
  const MAX_ITERATIONS = 200;

  try {
    do {
      if (iterations >= MAX_ITERATIONS) {
        console.error("⚠️ Max scan iterations reached – breaking loop");
        break;
      }

      const reply = await redisClient.scan(cursor, { MATCH: pattern, COUNT: count });
      const [nextCursor, foundKeys] = Array.isArray(reply) ? reply : [reply.cursor, reply.keys || []];

      if (foundKeys?.length) keys.push(...foundKeys);
      cursor = nextCursor;
      iterations++;
    } while (cursor !== '0');
  } catch (err) {
    console.error("❌ Redis SCAN error:", err.message);
    return [];
  }

  console.log(`🔍 Found ${keys.length} keys matching "${pattern}"`);
  return keys;
};

// ✅ Invalidate cache by pattern (e.g., "orders:TEN001:*")
const invalidateCacheByPattern = async (pattern) => {
  if (!redisClient?.isOpen || !redisConnected) {
    console.warn("🚫 Redis disconnected – skip invalidation");
    return;
  }

  try {
    const keys = await scanKeys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
      console.log(`🗑️ Deleted ${keys.length} keys matching "${pattern}"`);
    } else {
      console.log(`ℹ️ No keys found for pattern: "${pattern}"`);
    }
  } catch (err) {
    console.error("❌ Cache invalidation failed:", err.message);
  }
};

// ✅ Invalidate cache by tenant (e.g., orders:TEN001:*)
const invalidateCacheByTenant = async (tableName, tenantId) => {
  if (!tenantId) {
    console.warn("⚠️ Missing tenantId in invalidateCacheByTenant");
    return;
  }
  const pattern = `${tableName}:${tenantId}:*`;
  await invalidateCacheByPattern(pattern);
};

// ✅ Clear all Redis cache (Dev only)
const clearAllCache = async () => {
  const env = process.env.NODE_ENV;

  if (env === "production") {
    console.warn("🚨 clearAllCache is DISABLED in production for safety!");
    return;
  }

  if (!redisClient?.isOpen) {
    console.warn("🚫 Redis not connected – cannot clear cache");
    return;
  }

  try {
    await redisClient.flushDb();
    console.log(`🧹 Redis DB cleared [${env}]`);
  } catch (err) {
    console.error("❌ Failed to clear Redis:", err.message);
  }
};

// ✅ Graceful shutdown
const closeRedis = async () => {
  if (redisClient?.isOpen) {
    console.log("🔌 Closing Redis connection...");
    await redisClient.quit();
  }
};

// Auto-connect on load
connect().catch(() => {}); // Errors handled by event listener

// ✅ Export all functions
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