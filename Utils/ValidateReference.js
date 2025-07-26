const { dentalPool, goldloanPool } = require('../config/db');

const dentalTableMap = {
  clinic: 'clinic',
  dentist: 'dentist',
  reception: 'receptionist',
  supplier: 'supplier',
  patient: 'patient',
};

const goldloanTableMap = {
  branch: 'branch',
};

/**
 * Checks if a reference record exists in the appropriate DB based on referenceType.
 *
 * @param {string} referenceType
 * @param {number|string} referenceId
 * @param {number|string} tenantId
 * @returns {Promise<boolean>}
 */
async function checkReferenceExists(referenceType, referenceId, tenantId) {
  const normalizedType = referenceType?.toLowerCase();

  // Determine which DB pool and table to use
  if (normalizedType in dentalTableMap) {
    const tableName = dentalTableMap[normalizedType];
    return checkInDb(dentalPool, tableName, referenceId, tenantId);
  }

  if (normalizedType in goldloanTableMap) {
    const tableName = goldloanTableMap[normalizedType];
    // If tenant_id is relevant for goldloan branches, keep it in query, else can omit tenantId param.
    return checkInDb(goldloanPool, tableName, referenceId, tenantId);
  }

  throw new Error(`Unsupported reference type: ${referenceType}`);
}

/**
 * Helper to query the DB for existence of a record.
 *
 * @param {Pool} pool
 * @param {string} tableName
 * @param {number|string} id
 * @param {number|string} tenantId
 * @returns {Promise<boolean>}
 */
async function checkInDb(pool, tableName, id, tenantId) {
  let conn;
  try {
    conn = await pool.getConnection();

    // Adjust query if tenant_id may be null or optional
    // Assumes all tables have tenant_id column; adjust if needed.
    const sql = `SELECT 1 FROM \`${tableName}\` WHERE \`${tableName}_id\` = ? AND tenant_id = ? LIMIT 1`;
    const [rows] = await conn.query(sql, [id, tenantId]);

    return rows.length > 0;
  } catch (err) {
    console.error(`Error checking existence in table ${tableName}:`, err);
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

module.exports = { checkReferenceExists };
