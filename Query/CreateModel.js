const {assetPool} = require("../config/db");

const {createTableQuery}=require('./DbQuery')

const createAssetTable = async () => {
  const query =  createTableQuery.addAsset
  const conn = await assetPool.getConnection();
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
const createAssetAllocationTable = async () => {
  const query =  createTableQuery.addAssetAllocation
  const conn = await assetPool.getConnection();
  try {
    await conn.query(query);
    console.log("AssetAllocation table created successfully.");
  } catch (error) {
    console.error("Error creating AssetAllocation table:", error);
    throw new Error(
      "Database error occurred while creating the AssetAllocation table."
    );
  } finally {
    conn.release();
  }
};
const createDocumentTable = async () => {
  const query =  createTableQuery.addDocumentTable
  const conn = await assetPool.getConnection();
  try {
    await conn.query(query);
    console.log("Document table created successfully.");
  } catch (error) {
    console.error("Error creating Document table:", error);
    throw new Error(
      "Database error occurred while creating the Document table."
    );
  } finally {
    conn.release();
  }
};

module.exports = {
  createAssetTable,
  createAssetAllocationTable,
  createDocumentTable
};
