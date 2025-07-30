const {assetPool} = require("../config/db");

// ✅ CREATE
const createRecord = async (table, columns, values) => {
 
  if (columns.length !== values.length) throw new Error('Columns and values length mismatch');

  const columnString = columns.map(col => `\`${col}\``).join(', ');
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO \`${table}\` (${columnString}) VALUES (${placeholders})`;

  let conn;
  try {
    conn = await assetPool.getConnection();
    const [rows] = await conn.query(sql, values);
    return rows;
  } catch (error) {
    console.error("Error executing INSERT:", error);
    throw error.sqlMessage;
  } finally {
    if (conn) conn.release();
  }
};

// ✅ READ ALL
const getAllRecords = async (table, tenantColumn, tenantId, limit = 100, offset = 0) => {
  const dataSql = `SELECT * FROM \`${table}\` WHERE \`${tenantColumn}\` = ? LIMIT ? OFFSET ?`;
  const countSql = `SELECT COUNT(*) AS total FROM \`${table}\` WHERE \`${tenantColumn}\` = ?`;

  let conn;
  try {
    conn = await assetPool.getConnection();

    // 1. Get total count
    const [countResult] = await conn.query(countSql, [tenantId]);
    const total = countResult[0].total;

    // 2. Get paginated data
    const [data] = await conn.query(dataSql, [tenantId, limit, offset]);


    return { total, data };
  } catch (error) {
    console.error("Error executing SELECT ALL with count:", error);
    throw error.sqlMessage;
  } finally {
    if (conn) conn.release();
  }
};


// ✅ READ BY ID
const getRecordByIdAndTenantId = async (
  table,
  tenantColumn,
  tenantId,
  idColumn,
  idValue
) => {

  const sql = `SELECT * FROM \`${table}\` WHERE \`${tenantColumn}\` = ? AND \`${idColumn}\` = ?`;
  let conn;
  try {
    conn = await assetPool.getConnection();
    const [rows] = await conn.query(sql, [tenantId, idValue]);
    return rows[0] || null;
  } catch (error) {
    console.error("Error executing SELECT BY ID:", error);
    throw error.sqlMessage;
  } finally {
    if (conn) conn.release();
  }
};

// ✅ UPDATE
const updateRecord = async (table, updateColumns, values, conditionColumns = [], conditionValues = []) => {
  if (updateColumns.length !== values.length) throw new Error('Columns and values length mismatch');
  if (conditionColumns.length !== conditionValues.length) throw new Error('Condition columns and values length mismatch');

  const setString = updateColumns.map(col => `\`${col}\` = ?`).join(", ");
  const conditionString = conditionColumns.map(col => `\`${col}\` = ?`).join(" AND ");
  const sql = `UPDATE \`${table}\` SET ${setString} WHERE ${conditionString}`;

  let conn;
  try {
    conn = await assetPool.getConnection();
    const [rows] = await conn.query(sql, [...values, ...conditionValues]);
    return rows;
  } catch (error) {
    throw error.sqlMessage;
  } finally {
    if (conn) conn.release();
  }
};

// ✅ DELETE
const deleteRecord = async (table, conditionColumns = [], conditionValues = []) => {
  
  if (conditionColumns.length !== conditionValues.length) throw new Error('Condition columns and values length mismatch');

  const conditionString = conditionColumns.map(col => `\`${col}\` = ?`).join(" AND ");
  const sql = `DELETE FROM \`${table}\` WHERE ${conditionString}`;

  let conn;
  try {
    conn = await assetPool.getConnection();
    const result = await conn.query(sql, conditionValues);
    // console.log('res:',result[0])
    return result;
  } catch (error) {
    console.error("Error executing DELETE:", error);
    throw error.sqlMessage;
  } finally {
    if (conn) conn.release();
  }
};

// utils/ObjectHelper.js
function mapFields(data, fieldMap) {
  const columns = [];
  const values = [];
  for (const [column, mapRule] of Object.entries(fieldMap)) {
    columns.push(column);
    if (typeof mapRule === "function") {
      values.push(mapRule(data[column], data)); // transform value
    } else {
      values.push(data[mapRule]); // plain mapping
    }
  }
  return { columns, values };
}

const recordExists = async (table, conditions) => {


  const keys = Object.keys(conditions);
  const values = Object.values(conditions);
  const whereClause = keys.map(key => `\`${key}\` = ?`).join(' AND ');
  const query = `SELECT EXISTS(SELECT 1 FROM \`${table}\` WHERE ${whereClause}) AS \`exists\``;

  let conn;
  try {
    conn = await assetPool.getConnection();
    const [rows] = await conn.query(query, values);
    return rows[0].exists > 0;
  } catch (error) {
    console.error(error);
    throw new Error("Database Operation Failed in recordExists");
  } finally {
    if (conn) conn.release();
  }
};

module.exports = {
  createRecord,
  getAllRecords,
  getRecordByIdAndTenantId,
  updateRecord,
  deleteRecord,
  mapFields,
  recordExists
};

