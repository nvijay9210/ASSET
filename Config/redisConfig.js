const { createClient } = require("redis");
require("dotenv").config();

// Initialize Redis Client
const redisClient = require("redis").createClient({
  url: process.env.REDIS_URL || "redis://127.0.0.1:6379",
});

let redisConnected = false;
let redisErrorShown = false;

// Event listeners for connection status
redisClient.on("connect", () => {
  redisConnected = true;
  redisErrorShown = false;
  console.log("✅ Connected to Redis");
});

redisClient.on("error", (err) => {
  redisConnected = false;
  if (!redisErrorShown) {
    console.error("❌ Redis connection error:", err.message);
    redisErrorShown = true;
  }
});

// Connect function (safe to call multiple times)
const redisconnect = async () => {
  if (!redisConnected) {
    try {
      await redisClient.connect();
      redisConnected = true;
      console.log("✅ Connected to Redis (via redisconnect)");
    } catch (err) {
      redisConnected = false;
      if (!redisErrorShown) {
        console.error("❌ Failed to connect to Redis:", err.message);
        redisErrorShown = true;
      }
    }
  }
};

// Get or set cache with fallback
const getOrSetCache = async (
  cacheKey,
  fetchFunction,
  ttlSeconds = parseInt(process.env.REDIS_EXPIRE_TIME, 10) || 3600
) => {
  if (!redisClient.isOpen) await redisconnect();

  if (!redisConnected) {
    // Fallback to direct DB call if Redis is down
    return await fetchFunction();
  }

  const cachedData = await redisClient.get(cacheKey);
  if (cachedData) {
    console.log(`⏪ Serving from Redis cache: ${cacheKey}`);
    return JSON.parse(cachedData);
  }

  const freshData = await fetchFunction(); // Your DB/service call

  if (freshData && Object.keys(freshData).length > 0) {
    await redisClient.set(cacheKey, JSON.stringify(freshData), {
      EX: ttlSeconds,
    });
    console.log(`✅ Cached data in Redis: ${cacheKey}`);
  }

  return freshData;
};

// Scan keys matching a pattern
const scanKeys = async (pattern) => {
  console.log("🔍 Starting Redis scan for pattern:", pattern);

  if (!redisClient.isOpen) {
    console.warn("🚫 Redis client is not open.");
    return [];
  }

  let cursor = '0';
  let keys = [];
  let iterations = 0;
  const MAX_ITERATIONS = 100; // Prevent infinite loops

  try {
    do {
      const reply = await redisClient.scan(cursor, {
        MATCH: pattern,
        COUNT: 100,
      });

      let nextCursor;
      let foundKeys;

      if (Array.isArray(reply)) {
        [nextCursor, foundKeys] = reply;
      } else {
        nextCursor = reply.cursor;
        foundKeys = reply.keys || [];
      }

      console.log(`📡 Cursor: ${nextCursor} (current: ${cursor})`);

      if (foundKeys.length > 0) {
        console.log(`📦 Found ${foundKeys.length} keys`);
        keys.push(...foundKeys);
      }

      if (nextCursor === cursor) {
        console.error("⚠️ Redis scan stuck in loop – cursor not advancing");
        break;
      }

      cursor = nextCursor;
      iterations++;

      if (iterations > MAX_ITERATIONS) {
        console.error("⚠️ Max scan iterations reached – breaking loop");
        break;
      }
    } while (cursor !== '0');
  } catch (err) {
    console.error("❌ Redis scan error:", err.message);
    return [];
  }

  console.log("✅ Total keys found:", keys.length);
  return keys;
};

// Invalidate all cache entries matching a pattern
const invalidateCacheByPattern = async (pattern) => {

  //Only for dev not for production

  if (!redisClient.isOpen || !redisConnected) {
    console.warn("🚫 Redis is disconnected – skipping cache invalidation.");
    return;
  }

  try {
    const keys = await scanKeys(pattern);
   
    if (keys.length > 0) {
      await redisClient.del(...keys);
      console.log(`🗑️ Deleted ${keys.length} Redis keys matching "${pattern}"`);
    } else {
      console.log(`ℹ️ No Redis keys matched pattern: "${pattern}"`);
    }
  } catch (err) {
    console.error("❌ Redis cache invalidation error:", err.message);
  }
};

// Invalidate cache entries by table name and tenant ID
const invalidateCacheByTenant = async (tableName, tenantId) => {
  const pattern = `${tableName}:${tenantId}:page:*:limit:*`;

  try {
    const keys = await scanKeys(pattern);

    if (keys.length > 0) {
      await redisClient.del(...keys);
      console.log(`🗑️ Deleted ${keys.length} cache entries for pattern: ${pattern}`);
    } else {
      console.log(`ℹ️ No cache keys matched pattern: ${pattern}`);
    }
  } catch (err) {
    console.error("❌ Redis cache invalidation error:", err.message);
  }
};

// Clear entire Redis cache (for emergency/reset)
const clearAllCache = async () => {
  try {
    await redisClient.flushDb();
    console.log("🧹 Cleared all Redis cache");
  } catch (err) {
    console.error("❌ Failed to clear Redis cache:", err.message);
  }
};

// Call this early in your app bootstrapping
redisconnect();

module.exports = {
  redisClient,
  redisconnect,
  getOrSetCache,
  invalidateCacheByTenant,
  invalidateCacheByPattern,
  clearAllCache,
};