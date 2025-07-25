const pool = require("../config/db");

const {createTableQuery}=require('./DbQuery')

const createAssetTable = async () => {
  const query =  createTableQuery.addAsset
  const conn = await pool.getConnection();
  try {
    await conn.query(query);
    console.log("Asset table created successfully.");
  } catch (error) {
    console.error("Error creating Asset table:", error);
    throw new Error(
      "Database error occurred while creating the Asset table."
    );
  } finally {
    conn.release();
  }
};

module.exports = {
  createAssetTable
};
