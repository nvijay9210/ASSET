const { assetPool } = require("../Config/db");


// ✅ CREATE
const createRecord = async (table, columns, values, conn = null) => {
  if (columns.length !== values.length) throw new Error("Columns and values length mismatch");

  const columnString = columns.map(col => `\`${col}\``).join(", ");
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT INTO \`${table}\` (${columnString}) VALUES (${placeholders})`;

  let localConn = conn;
  try {
    if (!localConn) localConn = await assetPool.getConnection();
    const [rows] = await localConn.query(sql, values);
    return rows;
  } finally {
    if (!conn && localConn) localConn.release(); // only release if not transaction
  }
};

// ✅ READ ALL
const getAllRecords = async (table, tenantColumn, tenantId, limit = 100, offset = 0, conn = null) => {
  const dataSql = `SELECT * FROM \`${table}\` WHERE \`${tenantColumn}\` = ? LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) AS total FROM \`${table}\` WHERE \`${tenantColumn}\` = ?`;

  let localConn = conn;
  try {
    if (!localConn) localConn = await assetPool.getConnection();

    const [countResult] = await localConn.query(countSql, [tenantId]);
    const total = countResult[0].total;

    const [data] = await localConn.query(dataSql, [tenantId, limit, offset]);

    return { total, data };
  } finally {
    if (!conn && localConn) localConn.release();
  }
};

// ✅ READ BY ID
const getRecordByIdAndTenantId = async (table, tenantColumn, tenantId, idColumn, idValue, conn = null) => {
  const sql = `SELECT * FROM \`${table}\` WHERE \`${tenantColumn}\` = ? AND \`${idColumn}\` = ?`;

  let localConn = conn;
  try {
    if (!localConn) localConn = await assetPool.getConnection();
    const [rows] = await localConn.query(sql, [tenantId, idValue]);
    return rows[0] || null;
  } finally {
    if (!conn && localConn) localConn.release();
  }
};

// ✅ UPDATE
const updateRecord = async (table, updateColumns, values, conditionColumns = [], conditionValues = [], conn = null) => {
  if (updateColumns.length !== values.length) throw new Error("Columns and values length mismatch");
  if (conditionColumns.length !== conditionValues.length) throw new Error("Condition columns and values length mismatch");

  const setString = updateColumns.map(col => `\`${col}\` = ?`).join(", ");
  const conditionString = conditionColumns.map(col => `\`${col}\` = ?`).join(" AND ");
  const sql = `UPDATE \`${table}\` SET ${setString} WHERE ${conditionString}`;

  let localConn = conn;
  try {
    if (!localConn) localConn = await assetPool.getConnection();
    const [rows] = await localConn.query(sql, [...values, ...conditionValues]);
    return rows;
  } finally {
    if (!conn && localConn) localConn.release();
  }
};

// ✅ DELETE
const deleteRecord = async (table, conditionColumns = [], conditionValues = [], conn = null) => {
  if (conditionColumns.length !== conditionValues.length) throw new Error("Condition columns and values length mismatch");

  const conditionString = conditionColumns.map(col => `\`${col}\` = ?`).join(" AND ");
  const sql = `DELETE FROM \`${table}\` WHERE ${conditionString}`;

  let localConn = conn;
  try {
    if (!localConn) localConn = await assetPool.getConnection();
    const result = await localConn.query(sql, conditionValues);
    return result;
  } finally {
    if (!conn && localConn) localConn.release();
  }
};

// ✅ Check if record exists
const recordExists = async (table, conditions, conn = null) => {
  const keys = Object.keys(conditions);
  const values = Object.values(conditions);
  const whereClause = keys.map(key => `\`${key}\` = ?`).join(" AND ");
  const query = `SELECT EXISTS(SELECT 1 FROM \`${table}\` WHERE ${whereClause}) AS \`exists\``;

  let localConn = conn;
  try {
    if (!localConn) localConn = await assetPool.getConnection();
    const [rows] = await localConn.query(query, values);
    return rows[0].exists > 0;
  } finally {
    if (!conn && localConn) localConn.release();
  }
};

// ✅ Field mapper
function mapFields(data, fieldMap) {
  const columns = [];
  const values = [];
  for (const [column, mapRule] of Object.entries(fieldMap)) {
    columns.push(column);
    if (typeof mapRule === "function") {
      values.push(mapRule(data[column], data));
    } else {
      values.push(data[mapRule]);
    }
  }
  return { columns, values };
}

// ✅ Transaction wrapper
async function withTransaction(callback) {
  let conn;
  try {
    conn = await assetPool.getConnection();
    await conn.beginTransaction();

    const result = await callback(conn);

    await conn.commit();
    return result;
  } catch (err) {
    if (conn) await conn.rollback();
    throw err;
  } finally {
    if (conn) conn.release();
  }
}

module.exports = {
  createRecord,
  getAllRecords,
  getRecordByIdAndTenantId,
  updateRecord,
  deleteRecord,
  mapFields,
  recordExists,
  withTransaction
};
