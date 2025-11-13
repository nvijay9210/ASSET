const {assetPool} = require("../Config/db");
const { CustomError } = require("../Middleware/CustomeError");

const checkIfIdExists = async (table, field, value) => {

  if(table==='tenant') return

  const conn = await assetPool.getConnection();
  try {
    // Query using proper placeholder for column name and value
    const [result] = await conn.query(`SELECT 1 FROM ?? WHERE ?? = ? LIMIT 1`, [
      table,
      field,
      value,
    ]);

    if (result.length === 0) {
      throw new CustomError(`${field} does not exist`, 404);
    }

    return true;
  } catch (err) {
    console.error(err);
    throw new CustomError(`Error: ${err.message}`, 404);
  } finally {
    conn.release();
  }
};

const checkIfExists = async (table, field, value, tenantId) => {
  if (table !== "asset" && table!=="asset_allocation") return;
  const conn = await assetPool.getConnection();
  try {
    // Sanitize table name to prevent SQL injection
    const allowedTables = [
      "asset",
      "asset_allocation"
    ]; // Add your actual table names here
    if (!allowedTables.includes(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }

    // Query using proper placeholder for column name and value
    const [result] = await conn.query(
      `SELECT 1 FROM ?? WHERE ?? = ? AND tenant_id = ? LIMIT 1`,
      [table, field, value, tenantId]
    );

    return result.length > 0 ? true : false;
  } catch (err) {
    console.error(err);
    throw new CustomError(`Error: ${err.message}`, 500);
  } finally {
    conn.release();
  }
};

const checkIfExistsWithoutId = async (
  table,
  field,
  value,
  excludeField,
  excludeValue,
  tenantId
) => {
  const conn = await assetPool.getConnection();
  try {
    const [result] = await conn.query(
      `SELECT 1 FROM ?? WHERE ?? = ? AND ?? != ? AND tenant_id = ? LIMIT 1`,
      [table, field, value, excludeField, excludeValue, tenantId]
    );

    return result.length > 0 ? true : false;
  } catch (err) {
    console.error(err);
    throw new CustomError(`Error: ${err.message}`, 500);
  } finally {
    conn.release();
  }
};

module.exports = {
  checkIfIdExists,
  checkIfExists,
  checkIfExistsWithoutId,
};
