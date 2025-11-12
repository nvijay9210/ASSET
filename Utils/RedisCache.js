const redis = require("../Config/redisConfig"); // Import the Redis client

// Set cache with TTL (Time-To-Live)
const setCache = async (key, value, ttl = 3600) => {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttl); // 'EX' sets the TTL
    console.log(`Data cached for key: ${key}`);
  } catch (err) {
    console.error("Error setting cache:", err);
  }
};

// Get cache with a fallback function
const getCache = async (key, fallbackFunction) => {
  try {
    const cachedData = await redis.get(key);
    if (cachedData) {
      console.log(`Serving data for key: ${key} from cache`);
      return JSON.parse(cachedData);
    }

    // If cache misses, fetch fresh data and cache it
    console.log(`Cache miss for key: ${key}, fetching fresh data`);
    const freshData = await fallbackFunction();
    await setCache(key, freshData);
    return freshData;
  } catch (err) {
    console.error("Error fetching cache:", err);
    throw err; // Propagate error for handling elsewhere
  }
};

function buildCacheKey(type, scope, options = {}) {
  const parts = [type, scope];

  const {
    tenant_id,
    page,
    limit,
    start_date,
    end_date,
    appointment_type,
    asset_id,
    asset_allocation_id,
    // Add more fields as needed
  } = options;

  if (tenant_id) parts.push(`tenant_id:${tenant_id}`);
  if (asset_id) parts.push(`asset_id:${asset_id}`);
  if (asset_allocation_id) parts.push(`asset_allocation_id:${asset_allocation_id}`);

  if (page !== undefined) parts.push(`page:${page}`);
  if (limit !== undefined) parts.push(`limit:${limit}`);
  if (start_date) parts.push(`start_date:${start_date}`);
  if (end_date) parts.push(`end_date:${end_date}`);
  if (appointment_type) parts.push(`appointment_type:${appointment_type}`);

  return parts.join(":");
}

module.exports = { getCache, buildCacheKey };
